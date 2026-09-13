import React, { useState } from 'react';
import { Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (user: { username: string }) => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('請輸入管理員帳號與密碼');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || '登入失敗，請檢查帳號密碼');
        return;
      }

      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`連線錯誤：${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="admin-login-modal" className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/80">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">管理後台登入</h2>
            <p className="text-xs text-slate-400">僅限系統管理員登入</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-lg flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="admin-username" className="block text-xs font-semibold text-slate-300">
            管理員帳號
          </label>
          <div className="relative">
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="請輸入管理員帳號"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 pl-9"
              autoComplete="username"
            />
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-300">
            密碼
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 pl-9"
              autoComplete="current-password"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>
        </div>

        <button
          id="btn-admin-submit-login"
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg shadow-md shadow-amber-950/40 text-sm transition-all disabled:opacity-50"
        >
          {isLoading ? '驗證中...' : '登入後台'}
        </button>
      </form>
    </div>
  );
};
