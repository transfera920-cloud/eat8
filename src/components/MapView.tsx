import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { ExternalLink, Navigation, Star, MapPin } from 'lucide-react';
import type { FeastPlace, TrailheadInfo } from '../types/index.js';

interface MapViewProps {
  apiKey: string;
  trailhead?: TrailheadInfo | null;
  places: FeastPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace: (placeId: string) => void;
}

// Controller component to smoothly pan and zoom to selected place or trailhead
const MapController: React.FC<{
  trailhead?: TrailheadInfo | null;
  selectedPlace?: FeastPlace | null;
  places: FeastPlace[];
}> = ({ trailhead, selectedPlace, places }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedPlace) {
      map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      map.setZoom(15);
      return;
    }

    // If places exist, fit bounds to include trailhead and places
    if (trailhead && window.google?.maps?.LatLngBounds) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: trailhead.lat, lng: trailhead.lng });
      places.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    } else if (trailhead) {
      map.panTo({ lat: trailhead.lat, lng: trailhead.lng });
      map.setZoom(12);
    }
  }, [map, selectedPlace, trailhead, places]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  apiKey,
  trailhead,
  places,
  selectedPlaceId,
  onSelectPlace,
}) => {
  const [activeInfoWindowId, setActiveInfoWindowId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPlaceId) {
      setActiveInfoWindowId(selectedPlaceId);
    }
  }, [selectedPlaceId]);

  const defaultCenter = trailhead
    ? { lat: trailhead.lat, lng: trailhead.lng }
    : places.length > 0
    ? { lat: places[0].lat, lng: places[0].lng }
    : { lat: 23.973875, lng: 120.982024 }; // Taiwan center

  const selectedPlace = places.find(p => p.id === selectedPlaceId) || null;
  const activePlace = places.find(p => p.id === activeInfoWindowId) || null;

  if (!apiKey || apiKey.trim() === '') {
    return (
      <div
        id="map-container-fallback"
        className="w-full h-80 sm:h-96 rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-500">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h4 className="text-base font-semibold text-slate-200">Google Maps 地圖展示</h4>
          <p className="text-xs text-slate-400 mt-1">
            後端已透過伺服器金鑰取得真實資料。若要在瀏覽器中渲染動態 Google Map，需在環境變數設定{' '}
            <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code>
            （並建議於 Google Cloud Console 限制 HTTP Referrer）。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="map-wrapper"
      className="w-full h-80 sm:h-[420px] rounded-xl overflow-hidden border border-slate-800 shadow-xl shadow-slate-950/50 relative"
    >
      <APIProvider apiKey={apiKey}>
        <Map
          id="post-hike-feast-map"
          style={{ width: '100%', height: '100%' }}
          defaultCenter={defaultCenter}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <MapController trailhead={trailhead} selectedPlace={selectedPlace} places={places} />

          {/* 登山口起點標記 */}
          {trailhead && (
            <AdvancedMarker
              position={{ lat: trailhead.lat, lng: trailhead.lng }}
              title={`起點登山口：${trailhead.name}`}
            >
              <Pin
                background="#10b981"
                borderColor="#064e3b"
                glyphColor="#ffffff"
                scale={1.2}
              />
            </AdvancedMarker>
          )}

          {/* 慶功宴店家標記 */}
          {places.map((place, idx) => {
            const isSelected = place.id === selectedPlaceId;
            return (
              <AdvancedMarker
                key={place.id}
                position={{ lat: place.lat, lng: place.lng }}
                title={place.name}
                onClick={() => {
                  onSelectPlace(place.id);
                  setActiveInfoWindowId(place.id);
                }}
              >
                <Pin
                  background={isSelected ? '#f59e0b' : '#3b82f6'}
                  borderColor={isSelected ? '#78350f' : '#1e3a8a'}
                  glyphColor="#ffffff"
                  glyphText={String(idx + 1)}
                  scale={isSelected ? 1.3 : 1.0}
                />
              </AdvancedMarker>
            );
          })}

          {/* 店家彈出視窗 */}
          {activePlace && (
            <InfoWindow
              position={{ lat: activePlace.lat, lng: activePlace.lng }}
              onCloseClick={() => setActiveInfoWindowId(null)}
              headerContent={<span className="font-bold text-slate-900 text-sm">{activePlace.name}</span>}
            >
              <div className="p-1 space-y-2 text-xs text-slate-700 max-w-xs">
                <p className="text-slate-600 line-clamp-2">{activePlace.address}</p>

                <div className="flex items-center gap-3 text-xs pt-1 border-t border-slate-200">
                  <span className="font-semibold text-amber-600 flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    車程約 {activePlace.drivingMinutes} 分鐘
                  </span>
                  {activePlace.rating !== undefined && (
                    <span className="flex items-center gap-1 text-slate-800">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {activePlace.rating} ({activePlace.userRatingCount || 0})
                    </span>
                  )}
                </div>

                <a
                  href={activePlace.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-1"
                >
                  <span>在 Google 地圖中查看</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};
