export interface Category {
  id: string | number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SiteSettings {
  site_title: string;
  site_subtitle: string;
  seo_title: string;
  seo_description: string;
  search_button_text: string;
  trailhead_placeholder: string;
  custom_search_placeholder: string;
  driving_time_label: string;
  [key: string]: string;
}

export interface TrailheadInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface FeastPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  priceLevel?: string;
  primaryType?: string;
  openNow?: boolean;
  drivingMinutes: number;
  distanceMeters: number;
  distanceText: string;
  durationText: string;
}

export interface SearchResponse {
  ok: boolean;
  trailhead?: TrailheadInfo;
  results?: FeastPlace[];
  error?: string;
  message?: string;
}

export interface AdminUser {
  id: string | number;
  username: string;
  created_at?: string;
}
