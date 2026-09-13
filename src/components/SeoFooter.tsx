import React from 'react';
import { Mountain, Compass, ShieldCheck } from 'lucide-react';
import type { SiteSettings } from '../types/index.js';

interface SeoFooterProps {
  settings: SiteSettings;
}

export const SeoFooter: React.FC<SeoFooterProps> = ({ settings }) => {
  return (
    <footer id="main-footer" className="mt-12 border-t border-slate-800/80 bg-slate-950/60 py-8 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* SEO Semantic Info Section */}
        <section id="seo-info-block" aria-labelledby="seo-info-heading" className="border-b border-slate-800/60 pb-6">
          <h2 id="seo-info-heading" className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            關於下山慶功宴搜尋系統
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
            {settings.seo_description ||
              '下山慶功宴搜尋系統專為台灣登山客、戶外愛好者打造。在結束百岳、中級山健行後，只需手動輸入起點登山口，即可透過 Google Maps Platform 核心運算即時查詢附近熱門餐廳、火鍋店、牛肉麵、熱炒與便利商店，並根據實際道路車程時間篩選最順路的慶功宴地點。'}
          </p>
        </section>

        {/* Brand & Technical Badges */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Mountain className="w-4 h-4 text-amber-500" />
            <span className="font-semibold">{settings.site_title || '下山慶功宴搜尋系統'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">Post-Hike Celebration Feast Finder</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              Google Maps Platform Real-time API
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              PostgreSQL & Session Auth
            </span>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-600 pt-2">
          © {new Date().getFullYear()} {settings.site_title || '下山慶功宴搜尋系統'}. 依據實際道路行車數據計算，祝山友平安下山、歡喜慶功！
        </div>
      </div>
    </footer>
  );
};
