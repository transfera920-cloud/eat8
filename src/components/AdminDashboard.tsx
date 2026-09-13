import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  ListOrdered,
  KeyRound,
  Save,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { Category, SiteSettings } from '../types/index.js';

interface AdminDashboardProps {
  onRefreshPublicData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onRefreshPublicData }) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'texts' | 'password'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatOrder, setNewCatOrder] = useState('10');
  const [newCatActive, setNewCatActive] = useState(true);

  // Editing Category State
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState<number>(0);
  const [editActive, setEditActive] = useState(true);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Safe authenticated fetch helper for admin actions
  const adminFetch = async (url: string, options: RequestInit = {}) => {
    const token = sessionStorage.getItem('feast_admin_token');
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { res, data };
  };

  // Fetch all categories (including inactive ones)
  const fetchAdminCategories = async () => {
    try {
      const { res, data } = await adminFetch('/api/admin/categories');
      if (res.ok && data?.ok) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Fetch admin settings
  const fetchAdminSettings = async () => {
    try {
      const { res, data } = await adminFetch('/api/admin/settings');
      if (res.ok && data?.ok) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchAdminCategories();
    fetchAdminSettings();
  }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showMsg('error', '請填寫分類名稱');
      return;
    }

    setIsLoading(true);
    try {
      const { res, data } = await adminFetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          sort_order: parseInt(newCatOrder, 10) || 0,
          is_active: newCatActive,
        }),
      });
      if (res.ok && data?.ok) {
        setNewCatName('');
        setNewCatOrder('10');
        setNewCatActive(true);
        showMsg('success', `成功新增分類「${data.category.name}」`);
        await fetchAdminCategories();
        onRefreshPublicData();
      } else {
        showMsg('error', data?.error || `新增失敗 (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Start Editing
  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditOrder(cat.sort_order);
    setEditActive(cat.is_active);
  };

  // Save Edit
  const handleSaveEdit = async (id: string | number) => {
    if (!editName.trim()) {
      showMsg('error', '分類名稱不可為空');
      return;
    }

    setIsLoading(true);
    try {
      const { res, data } = await adminFetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          sort_order: editOrder,
          is_active: editActive,
        }),
      });
      if (res.ok && data?.ok) {
        setEditingId(null);
        showMsg('success', '分類更新成功');
        await fetchAdminCategories();
        onRefreshPublicData();
      } else {
        showMsg('error', data?.error || `更新失敗 (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Toggle Active
  const handleToggleActive = async (cat: Category) => {
    try {
      const { res, data } = await adminFetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      if (res.ok && data?.ok) {
        await fetchAdminCategories();
        onRefreshPublicData();
        showMsg('success', `已${!cat.is_active ? '啟用' : '停用'}分類「${cat.name}」`);
      } else {
        showMsg('error', data?.error || `操作失敗 (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg('error', msg);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string | number, name: string) => {
    if (!confirm(`確定要刪除分類「${name}」嗎？刪除後前台將不再顯示此選項。`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { res, data } = await adminFetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok && data?.ok) {
        showMsg('success', `已成功刪除分類「${name}」`);
        await fetchAdminCategories();
        onRefreshPublicData();
      } else {
        showMsg('error', data?.error || `刪除失敗 (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsLoading(true);
    try {
      const { res, data } = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok && data?.ok) {
        showMsg('success', '前台文字設定已成功儲存至資料庫');
        setSettings(data.settings);
        onRefreshPublicData();
      } else {
        showMsg('error', data?.error || `儲存設定失敗 (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg('error', '新密碼與確認密碼不相符');
      return;
    }
    if (newPassword.length < 6) {
      showMsg('error', '新密碼長度需至少 6 個字元');
      return;
    }

    setIsLoading(true);
    try {
      const { res, data } = await adminFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (res.ok && data?.ok) {
        showMsg('success', '管理員密碼更新成功！請妥善保管。');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showMsg('error', data?.error || `密碼變更失敗 (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="admin-dashboard" className="space-y-6">
      {/* 訊息提示 */}
      {message && (
        <div
          id="admin-alert-box"
          className={`p-4 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 標籤切換 */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>分類管理 (CRUD)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('texts')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'texts'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>前台文字與 SEO 管理</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'password'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>管理員密碼安全</span>
        </button>
      </div>

      {/* 1. 分類管理 (CRUD) */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* 新增分類表單 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-amber-500" />
              <span>新增搜尋分類</span>
            </h3>
            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">分類名稱</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="例如：熱炒、牛肉麵、羊肉爐"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">排序序號 (小至大)</label>
                <input
                  type="number"
                  value={newCatOrder}
                  onChange={(e) => setNewCatOrder(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增</span>
                </button>
              </div>
            </form>
          </div>

          {/* 分類清單 Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">
                目前資料庫分類清單（前台依序顯示啟用分類）
              </h3>
              <span className="text-xs text-slate-400">共 {categories.length} 個</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">排序</th>
                    <th className="px-4 py-3">分類名稱</th>
                    <th className="px-4 py-3">狀態</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {categories.map((cat) => {
                    const isEditing = editingId === cat.id;
                    return (
                      <tr key={cat.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editOrder}
                              onChange={(e) => setEditOrder(parseInt(e.target.value, 10) || 0)}
                              className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            cat.sort_order
                          )}
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                            />
                          ) : (
                            cat.name
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isEditing ? (
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editActive}
                                onChange={(e) => setEditActive(e.target.checked)}
                                className="rounded text-amber-500 focus:ring-amber-500"
                              />
                              <span>{editActive ? '啟用中' : '已停用'}</span>
                            </label>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(cat)}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                cat.is_active
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-750'
                              }`}
                            >
                              {cat.is_active ? '啟用中' : '已停用'}
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(cat.id)}
                                  disabled={isLoading}
                                  className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                                  title="儲存"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  title="取消"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(cat)}
                                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                  title="編輯"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300"
                                  title="刪除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. 前台文字與 SEO 管理 */}
      {activeTab === 'texts' && settings && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100">前台顯示文字與 SEO 關鍵設定</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              修改後將立即寫入持久化資料庫，前台重整即生效。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">網站標題 (Site Title)</label>
              <input
                type="text"
                value={settings.site_title || ''}
                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">副標題說明</label>
              <input
                type="text"
                value={settings.site_subtitle || ''}
                onChange={(e) => setSettings({ ...settings, site_subtitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300">SEO 標題 (Meta Title)</label>
              <input
                type="text"
                value={settings.seo_title || ''}
                onChange={(e) => setSettings({ ...settings, seo_title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300">SEO 說明 (Meta Description)</label>
              <textarea
                rows={3}
                value={settings.seo_description || ''}
                onChange={(e) => setSettings({ ...settings, seo_description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">搜尋按鈕文字</label>
              <input
                type="text"
                value={settings.search_button_text || ''}
                onChange={(e) => setSettings({ ...settings, search_button_text: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">車程時間標籤文字</label>
              <input
                type="text"
                value={settings.driving_time_label || ''}
                onChange={(e) => setSettings({ ...settings, driving_time_label: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">登山口輸入框提示 (Placeholder)</label>
              <input
                type="text"
                value={settings.trailhead_placeholder || ''}
                onChange={(e) => setSettings({ ...settings, trailhead_placeholder: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">自訂關鍵字輸入框提示 (Placeholder)</label>
              <input
                type="text"
                value={settings.custom_search_placeholder || ''}
                onChange={(e) => setSettings({ ...settings, custom_search_placeholder: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-5 rounded-lg text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>儲存文字設定</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. 密碼管理 */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100">更新管理員密碼</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              密碼將透過伺服器端安全 bcrypt 進行雜湊運算，絕不明文儲存。
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">目前密碼</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="請輸入目前密碼"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">新密碼</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 個字元"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">確認新密碼</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次輸入新密碼"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              確認變更密碼
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
