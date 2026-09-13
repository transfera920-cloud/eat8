import React from 'react';
import { Mountain, Shield } from 'lucide-react';

interface NavbarProps {
  siteTitle: string;
  isAdminView: boolean;
  onToggleAdmin: () => void;
  adminUser: { username: string } | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  siteTitle,
  isAdminView,
  onToggleAdmin,
  adminUser,
  onLogout,
}) => {
  return (
    <header id="main-header" className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a
          id="brand-logo-link"
          href="/"
          onClick={(e) => {
            if (isAdminView) {
              e.preventDefault();
              onToggleAdmin();
            }
          }}
          className="flex items-center gap-2.5 text-slate-100 hover:text-amber-400 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-900/20">
            <Mountain className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block leading-tight">
              {siteTitle || '下山慶功宴搜尋系統'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide block">
              Trailhead Post-Hike Feast Search
            </span>
          </div>
        </a>

        <div className="flex items-center gap-3">
          {adminUser && isAdminView ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">已登入: <strong className="text-amber-400">{adminUser.username}</strong></span>
              <button
                id="btn-admin-logout"
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                登出
              </button>
            </div>
          ) : null}

          <button
            id="btn-toggle-admin"
            type="button"
            onClick={onToggleAdmin}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isAdminView
                ? 'bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isAdminView ? '返回前台搜尋' : '後台管理'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
