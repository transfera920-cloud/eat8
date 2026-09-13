import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { SearchForm } from './components/SearchForm.js';
import { MapView } from './components/MapView.js';
import { ResultsList } from './components/ResultsList.js';
import { AdminLogin } from './components/AdminLogin.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { SeoFooter } from './components/SeoFooter.js';
import type { Category, SiteSettings, FeastPlace, TrailheadInfo } from './types/index.js';
import { AlertCircle, Compass, Key } from 'lucide-react';

export function App() {
  // Public data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    site_title: '下山慶功宴搜尋系統',
    site_subtitle: '輸入登山口，以 Google Maps 真實路線計算，快速尋找最順路的下山美食',
    seo_title: '下山慶功宴搜尋系統｜登山口附近美食與餐廳推薦',
    seo_description: '專為登山客打造的下山慶功宴搜尋系統。手動輸入登山口，以真實 Google Maps 路線車程時間尋找周邊餐廳、火鍋與美食。',
    search_button_text: '搜尋慶功宴餐廳',
    trailhead_placeholder: '手動輸入起點登山口（例如：玉山登山口、合歡山松雪樓）',
    custom_search_placeholder: '輸入關鍵字（例如：熱炒、牛肉麵、羊肉爐）',
    driving_time_label: '最大允許車程時間',
  });

  // Maps configuration state
  const [mapsConfig, setMapsConfig] = useState<{
    hasServerKey: boolean;
    hasClientKey: boolean;
    clientApiKey: string;
  }>({
    hasServerKey: false,
    hasClientKey: false,
    clientApiKey: '',
  });
  const [customClientApiKey, setCustomClientApiKey] = useState<string>('');
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  // Admin state
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<{ username: string } | null>(null);

  // Search state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [trailheadInfo, setTrailheadInfo] = useState<TrailheadInfo | null>(null);
  const [places, setPlaces] = useState<FeastPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [currentMaxMinutes, setCurrentMaxMinutes] = useState<number>(30);

  // Load public categories from server
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (res.ok && data?.ok && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  // Load public site settings from server
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (res.ok && data?.ok && data.settings) {
        setSettings(data.settings);
        if (data.settings.site_title) {
          document.title = data.settings.seo_title || data.settings.site_title;
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  // Check admin session
  const checkAdminAuth = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('feast_admin_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/admin/me', { headers });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (res.ok && data?.ok && data?.user) {
        setAdminUser(data.user);
      } else {
        setAdminUser(null);
        if (token && res.status === 401) {
          sessionStorage.removeItem('feast_admin_token');
        }
      }
    } catch {
      setAdminUser(null);
    }
  }, []);

  // Load maps config
  const loadMapsConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/maps-config');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (res.ok && data?.ok) {
        setMapsConfig(data);
      }
    } catch (err) {
      console.error('Failed to load maps config:', err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadSettings();
    checkAdminAuth();
    loadMapsConfig();

    // Check if URL contains /admin or #admin
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      setIsAdminView(true);
    }
  }, [loadCategories, loadSettings, checkAdminAuth, loadMapsConfig]);

  // Handle Search Submission
  const handleSearch = async (params: {
    trailhead: string;
    query: string;
    maxDrivingMinutes: number;
  }) => {
    setIsLoading(true);
    setSearchError(null);
    setSearchNotice(null);
    setCurrentMaxMinutes(params.maxDrivingMinutes);
    setSelectedPlaceId(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        setSearchError(data?.error || `搜尋失敗（HTTP ${res.status}），請確認登山口名稱或網路連線`);
        setPlaces([]);
        setTrailheadInfo(null);
        return;
      }

      setTrailheadInfo(data.trailhead || null);
      setPlaces(data.results || []);

      if (data.message) {
        setSearchNotice(data.message);
      }

      if (data.results && data.results.length > 0) {
        setSelectedPlaceId(data.results[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSearchError(`搜尋請求失敗：${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem('feast_admin_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch('/api/admin/logout', { method: 'POST', headers });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      sessionStorage.removeItem('feast_admin_token');
      setAdminUser(null);
      setIsAdminView(false);
    }
  };

  const effectiveClientApiKey = customClientApiKey.trim() || mapsConfig.clientApiKey;

  return (
    <div id="app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 導覽列 */}
      <Navbar
        siteTitle={settings.site_title}
        isAdminView={isAdminView}
        onToggleAdmin={() => setIsAdminView(!isAdminView)}
        adminUser={adminUser}
        onLogout={handleLogout}
      />

      {/* 伺服器 Google Maps Key 狀態提示（若尚未設定則提供清楚指示） */}
      {!mapsConfig.hasServerKey && (
        <div id="server-key-alert" className="bg-amber-950/70 border-b border-amber-800/80 px-4 py-2.5 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>提示：</strong>伺服器端尚未設定環境變數{' '}
                <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                  GOOGLE_MAPS_API_KEY
                </code>
                。在正式部署平台（如 Google Cloud Run）設定後，系統即會進行真實 Google Places 與 Routes 運算。
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 主要內容區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {isAdminView ? (
          /* 後台視圖 */
          adminUser ? (
            <AdminDashboard
              onRefreshPublicData={() => {
                loadCategories();
                loadSettings();
              }}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={(user) => setAdminUser(user)}
              onCancel={() => setIsAdminView(false)}
            />
          )
        ) : (
          /* 前台視圖：搜尋核心架構 */
          <div className="space-y-6">
            {/* 標題與簡短說明 (嚴格控制長度，不大量留白、不大量介紹) */}
            <div id="hero-heading" className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
                <span>{settings.site_title || '下山慶功宴搜尋系統'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono border border-slate-700">
                  Google Maps 道路行車實測
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                {settings.site_subtitle ||
                  '輸入登山口，以 Google Maps 真實路線計算，快速尋找最順路的下山美食'}
              </p>
            </div>

            {/* 1. 搜尋表單 (登山口 ↓ 搜尋類別＋自訂搜尋 ↓ 車程時間 ↓ 搜尋按鈕) */}
            <SearchForm
              categories={categories}
              settings={settings}
              onSearch={handleSearch}
              isLoading={isLoading}
              error={searchError}
            />

            {/* 搜尋通知 (例如：超出最大時間) */}
            {searchNotice && (
              <div id="search-notice" className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-300 flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{searchNotice}</span>
              </div>
            )}

            {/* 2. Google 地圖 (搜尋後或初始展示) */}
            <div id="map-section" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Google 地圖互動視圖
                </h3>
                <button
                  type="button"
                  onClick={() => setShowKeyPrompt(!showKeyPrompt)}
                  className="text-[11px] text-slate-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  <Key className="w-3 h-3" />
                  <span>{effectiveClientApiKey ? '前端地圖金鑰已設定' : '設定前端地圖金鑰'}</span>
                </button>
              </div>

              {showKeyPrompt && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                  <p className="text-slate-300">
                    若要在前端瀏覽器中互動檢視 Google 地圖圖資，可輸入您的 Maps JavaScript API Key：
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customClientApiKey}
                      onChange={(e) => setCustomClientApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPrompt(false)}
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded text-xs"
                    >
                      套用
                    </button>
                  </div>
                </div>
              )}

              <MapView
                apiKey={effectiveClientApiKey}
                trailhead={trailheadInfo}
                places={places}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={(id) => setSelectedPlaceId(id)}
              />
            </div>

            {/* 3. 搜尋結果清單 (與地圖即時連動) */}
            <div id="results-section">
              <ResultsList
                trailhead={trailheadInfo}
                places={places}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={(id) => setSelectedPlaceId(id)}
                maxDrivingMinutes={currentMaxMinutes}
              />
            </div>
          </div>
        )}
      </main>

      {/* SEO 頁尾 */}
      <SeoFooter settings={settings} />
    </div>
  );
}

export default App;
