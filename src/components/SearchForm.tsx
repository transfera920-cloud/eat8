import React, { useState } from 'react';
import { Search, MapPin, Clock, UtensilsCrossed, AlertCircle } from 'lucide-react';
import type { Category, SiteSettings } from '../types/index.js';

interface SearchFormProps {
  categories: Category[];
  settings: SiteSettings;
  onSearch: (params: { trailhead: string; query: string; maxDrivingMinutes: number }) => void;
  isLoading: boolean;
  error?: string | null;
}

const PRESET_MINUTES = [10, 20, 30, 40, 60];

export const SearchForm: React.FC<SearchFormProps> = ({
  categories,
  settings,
  onSearch,
  isLoading,
  error,
}) => {
  const [trailhead, setTrailhead] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    categories.length > 0 ? categories[0].name : '餐廳'
  );
  const [customKeyword, setCustomKeyword] = useState('');
  const [drivingMinutes, setDrivingMinutes] = useState<number>(30);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update selected category when categories first load
  React.useEffect(() => {
    if (categories.length > 0 && !categories.some(c => c.name === selectedCategory)) {
      setSelectedCategory(categories[0].name);
    }
  }, [categories, selectedCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTrailhead = trailhead.trim();
    if (!trimmedTrailhead) {
      setValidationError('請手動輸入起點登山口（例如：玉山登山口、合歡山松雪樓）');
      return;
    }

    // Determine query: if selected "自訂" or custom keyword is typed
    let finalQuery = selectedCategory;
    if (selectedCategory === '自訂' || customKeyword.trim() !== '') {
      if (!customKeyword.trim()) {
        setValidationError('已選擇「自訂」或填寫自訂搜尋，請輸入欲搜尋之關鍵字');
        return;
      }
      finalQuery = customKeyword.trim();
    }

    // Determine driving minutes: if custom input is filled, use it
    let finalMinutes = drivingMinutes;
    if (customMinutesInput.trim() !== '') {
      const parsed = parseInt(customMinutesInput.trim(), 10);
      if (isNaN(parsed) || parsed <= 0) {
        setValidationError('自訂車程時間請填寫大於 0 的正整數（分鐘）');
        return;
      }
      finalMinutes = parsed;
    }

    onSearch({
      trailhead: trimmedTrailhead,
      query: finalQuery,
      maxDrivingMinutes: finalMinutes,
    });
  };

  return (
    <div id="search-form-container" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl shadow-slate-950/40">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. 登山口 (手動輸入，完全不限制、不推薦、不設預設) */}
        <div id="field-trailhead" className="space-y-1.5">
          <label htmlFor="input-trailhead" className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>登山口（搜尋起點）</span>
          </label>
          <div className="relative">
            <input
              id="input-trailhead"
              type="text"
              value={trailhead}
              onChange={(e) => setTrailhead(e.target.value)}
              placeholder={settings.trailhead_placeholder || '手動輸入登山口（例如：玉山登山口、合歡山松雪樓）'}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm transition-colors"
              autoComplete="off"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            系統將以此登山口文字作為 Google Maps 搜尋與路線起點，精確計算實際行車時間。
          </p>
        </div>

        {/* 2. 搜尋類別＋自訂搜尋 (同時存在) */}
        <div id="field-categories" className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            <UtensilsCrossed className="w-4 h-4 text-amber-500" />
            <span>搜尋類別與自訂關鍵字</span>
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 下拉選單 (來自後端資料庫) */}
            <div>
              <label htmlFor="select-category" className="block text-xs text-slate-400 mb-1">
                分類選單（後台管理）
              </label>
              <select
                id="select-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm transition-colors"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 自訂搜尋欄位 */}
            <div>
              <label htmlFor="input-custom-keyword" className="block text-xs text-slate-400 mb-1">
                自訂搜尋關鍵字
              </label>
              <input
                id="input-custom-keyword"
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder={settings.custom_search_placeholder || '輸入關鍵字（例如：熱炒、牛肉麵、羊肉爐）'}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm transition-colors"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {selectedCategory === '自訂' || customKeyword.trim() !== ''
              ? `將使用自訂關鍵字「${customKeyword || '(尚未輸入)'}」進行搜尋`
              : `目前選擇類別「${selectedCategory}」，若右側輸入關鍵字則以自訂關鍵字為準`}
          </p>
        </div>

        {/* 3. 車程時間 (10, 20, 30, 40, 60 分鐘與自訂) */}
        <div id="field-driving-time" className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{settings.driving_time_label || '最大允許車程時間'}</span>
          </label>
          
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_MINUTES.map((min) => {
              const isSelected = drivingMinutes === min && customMinutesInput.trim() === '';
              return (
                <button
                  key={min}
                  type="button"
                  onClick={() => {
                    setDrivingMinutes(min);
                    setCustomMinutesInput('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 ring-1 ring-amber-400'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {min} 分鐘
                </button>
              );
            })}

            {/* 自訂分鐘數 */}
            <div className="flex items-center gap-1.5 ml-1">
              <input
                id="input-custom-minutes"
                type="number"
                min="1"
                max="300"
                value={customMinutesInput}
                onChange={(e) => {
                  setCustomMinutesInput(e.target.value);
                }}
                placeholder="自訂"
                className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
              <span className="text-xs text-slate-400">分鐘</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Google Maps Routes API 將以實際行車路徑計算時間，自動排除超過此限制之店家。
          </p>
        </div>

        {/* 錯誤提示 */}
        {(validationError || error) && (
          <div id="search-form-alert" className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {validationError || error}
            </div>
          </div>
        )}

        {/* 4. 搜尋按鈕 */}
        <div>
          <button
            id="btn-submit-search"
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>正在向 Google Maps Platform 搜尋與計算車程...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>{settings.search_button_text || '搜尋慶功宴餐廳'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
