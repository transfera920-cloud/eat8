import type { FeastPlace, SearchResponse, TrailheadInfo } from '../src/types/index.js';

interface GeocodeResponse {
  status: string;
  error_message?: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    place_id: string;
  }>;
}

interface PlacesNewResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string; languageCode?: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    priceLevel?: string;
    primaryTypeDisplayName?: { text: string };
    regularOpeningHours?: { openNow?: boolean };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

interface RouteMatrixElement {
  originIndex: number;
  destinationIndex: number;
  status?: {
    code?: number;
    message?: string;
  };
  condition?: string;
  distanceMeters?: number;
  duration?: string; // e.g. "1234s"
}

export async function searchPostHikeFeast(
  trailhead: string,
  query: string,
  maxDrivingMinutes: number
): Promise<SearchResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return {
      ok: false,
      error: '伺服器端環境變數 GOOGLE_MAPS_API_KEY 尚未設定。請在正式部署平台（如 Google Cloud Run）設定此環境變數以啟用真實 Google Maps 搜尋。',
    };
  }

  // 1. Geocoding API: resolve trailhead to coordinates
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    trailhead
  )}&key=${apiKey}&language=zh-TW`;

  let trailheadInfo: TrailheadInfo;
  try {
    const geoRes = await fetch(geocodeUrl);
    const geoData = (await geoRes.json()) as GeocodeResponse;

    if (geoData.status !== 'OK' || !geoData.results || geoData.results.length === 0) {
      return {
        ok: false,
        error: `無法於 Google Maps 定位登山口「${trailhead}」(${geoData.status}: ${geoData.error_message || '查無此地點'})，請嘗試輸入更詳細的登山口名稱。`,
      };
    }

    const firstResult = geoData.results[0];
    trailheadInfo = {
      name: trailhead,
      address: firstResult.formatted_address,
      lat: firstResult.geometry.location.lat,
      lng: firstResult.geometry.location.lng,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Geocoding API 請求失敗：${msg}`,
    };
  }

  // 2. Places API (New): Text Search near trailhead
  const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
  let candidatePlaces: NonNullable<PlacesNewResponse['places']> = [];

  try {
    const placesRes = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.regularOpeningHours,places.priceLevel,places.primaryTypeDisplayName',
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: {
              latitude: trailheadInfo.lat,
              longitude: trailheadInfo.lng,
            },
            radius: 50000.0, // 50km radius search
          },
        },
        languageCode: 'zh-TW',
        maxResultCount: 20,
      }),
    });

    const placesData = (await placesRes.json()) as PlacesNewResponse;

    if (placesData.error) {
      return {
        ok: false,
        error: `Places API (New) 錯誤 (${placesData.error.code}): ${placesData.error.message}`,
      };
    }

    candidatePlaces = (placesData.places || []).filter(
      p => p.location && p.location.latitude && p.location.longitude
    );

    if (candidatePlaces.length === 0) {
      return {
        ok: true,
        trailhead: trailheadInfo,
        results: [],
        message: `在登山口「${trailhead}」半徑 50 公里內未搜尋到符合「${query}」的店家。`,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Places API (New) 請求失敗：${msg}`,
    };
  }

  // 3. Routes API: computeRouteMatrix to get real driving durations
  const routesUrl = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
  const destinations = candidatePlaces.map(p => ({
    waypoint: {
      location: {
        latLng: {
          latitude: p.location!.latitude,
          longitude: p.location!.longitude,
        },
      },
    },
  }));

  try {
    const routesRes = await fetch(routesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,status,condition,distanceMeters,duration',
      },
      body: JSON.stringify({
        origins: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: trailheadInfo.lat,
                  longitude: trailheadInfo.lng,
                },
              },
            },
          },
        ],
        destinations,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });

    if (!routesRes.ok) {
      const errText = await routesRes.text();
      return {
        ok: false,
        error: `Routes API 呼叫失敗 (${routesRes.status}): ${errText}`,
      };
    }

    const routeElements = (await routesRes.json()) as RouteMatrixElement[];

    // Map destination index to driving duration and distance
    const drivingDataMap = new Map<number, { durationSec: number; distanceMeters: number }>();
    for (const elem of routeElements) {
      if (elem.duration && elem.condition === 'ROUTE_EXISTS') {
        const seconds = parseInt(elem.duration.replace('s', ''), 10);
        drivingDataMap.set(elem.destinationIndex, {
          durationSec: isNaN(seconds) ? 0 : seconds,
          distanceMeters: elem.distanceMeters || 0,
        });
      }
    }

    // Filter by max driving minutes and construct final response
    const finalResults: FeastPlace[] = [];

    candidatePlaces.forEach((place, index) => {
      const driveInfo = drivingDataMap.get(index);
      if (!driveInfo) return; // Skip if no reachable driving route exists

      const drivingMinutes = Math.ceil(driveInfo.durationSec / 60);

      // Filter: only keep results where drivingMinutes <= maxDrivingMinutes
      if (drivingMinutes > maxDrivingMinutes) {
        return;
      }

      const googleMapsUri =
        place.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          place.displayName?.text || query
        )}&query_place_id=${place.id}`;

      finalResults.push({
        id: place.id,
        name: place.displayName?.text || '未命名店家',
        address: place.formattedAddress || '無地址資訊',
        lat: place.location!.latitude,
        lng: place.location!.longitude,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        googleMapsUri,
        priceLevel: place.priceLevel,
        primaryType: place.primaryTypeDisplayName?.text,
        openNow: place.regularOpeningHours?.openNow,
        drivingMinutes,
        distanceMeters: driveInfo.distanceMeters,
        distanceText: `${(driveInfo.distanceMeters / 1000).toFixed(1)} 公里`,
        durationText: `${drivingMinutes} 分鐘`,
      });
    });

    // Sort by driving duration ascending (closest first)
    finalResults.sort((a, b) => a.drivingMinutes - b.drivingMinutes);

    return {
      ok: true,
      trailhead: trailheadInfo,
      results: finalResults,
      message:
        finalResults.length === 0
          ? `在「${trailhead}」附近搜尋「${query}」，所有找到的店家車程皆大於 ${maxDrivingMinutes} 分鐘。請嘗試拉長車程時間。`
          : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Routes API 路線計算失敗：${msg}`,
    };
  }
}
