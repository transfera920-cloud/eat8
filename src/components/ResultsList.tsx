import React, { useEffect, useRef } from 'react';
import { Star, Clock, ExternalLink, MapPin, Tag } from 'lucide-react';
import type { FeastPlace, TrailheadInfo } from '../types/index.js';

interface ResultsListProps {
  trailhead?: TrailheadInfo | null;
  places: FeastPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace: (placeId: string) => void;
  maxDrivingMinutes: number;
}

export const ResultsList: React.FC<ResultsListProps> = ({
  trailhead,
  places,
  selectedPlaceId,
  onSelectPlace,
  maxDrivingMinutes,
}) => {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll to selected place in list when chosen from map
  useEffect(() => {
    if (selectedPlaceId && itemRefs.current[selectedPlaceId]) {
      itemRefs.current[selectedPlaceId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedPlaceId]);

  if (places.length === 0) {
    return (
      <div id="results-empty" className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
        <p className="text-slate-300 font-medium text-sm">尚無搜尋結果</p>
        <p className="text-xs text-slate-500">
          請在上方手動輸入登山口並點選「搜尋慶功宴餐廳」。系統將透過 Google Maps Platform 即時計算實際車程。
        </p>
      </div>
    );
  }

  return (
    <div id="results-list-container" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>Google Maps 搜尋結果</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium border border-amber-500/30">
              共 {places.length} 間
            </span>
          </h3>
          {trailhead && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>起點：{trailhead.name}（實際行車時間 ≤ {maxDrivingMinutes} 分鐘）</span>
            </p>
          )}
        </div>
        <span className="text-[11px] text-slate-500">
          依 Google Routes API 道路行車時間由近至遠排序
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {places.map((place, idx) => {
          const isSelected = place.id === selectedPlaceId;
          return (
            <div
              key={place.id}
              ref={(el) => {
                itemRefs.current[place.id] = el;
              }}
              id={`place-card-${place.id}`}
              onClick={() => onSelectPlace(place.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-500 shadow-md shadow-amber-950/30 ring-1 ring-amber-500'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100 leading-snug">
                        {place.name}
                      </h4>
                      {place.primaryType && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>{place.primaryType}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 車程徽章 */}
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-1 rounded-md">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {place.drivingMinutes} 分鐘
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      約 {place.distanceText}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 pl-8 leading-relaxed line-clamp-2">
                  {place.address}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between pl-8 text-xs">
                <div>
                  {place.rating !== undefined ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-slate-200">{place.rating}</span>
                      {place.userRatingCount !== undefined && (
                        <span className="text-slate-500 text-[11px]">
                          ({place.userRatingCount})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-600 text-[11px]">無評分資料</span>
                  )}
                </div>

                {/* 在 Google 地圖中查看 */}
                <a
                  id={`btn-open-gmaps-${place.id}`}
                  href={place.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                >
                  <span>在 Google 地圖中查看</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
