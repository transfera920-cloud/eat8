import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  getAdminByUsername,
  createSession,
  getSession,
  deleteSession,
  updateAdminPassword,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSiteSettings,
  updateSiteSettings,
} from '../db.js';

export const adminRouter = Router();

// Middleware: Authenticate Admin Session via HttpOnly Cookie
export async function requireAdminAuth(req: any, res: any, next: any) {
  const token = req.cookies?.feast_admin_session;
  if (!token) {
    return res.status(401).json({ ok: false, error: '未登入或 Session 已過期' });
  }

  const session = await getSession(token);
  if (!session) {
    res.clearCookie('feast_admin_session');
    return res.status(401).json({ ok: false, error: 'Session 無效或已過期，請重新登入' });
  }

  req.adminUser = { username: session.username };
  next();
}

// POST /api/admin/login
adminRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: '請輸入帳號與密碼' });
  }

  try {
    const admin = await getAdminByUsername(username);
    if (!admin) {
      return res.status(401).json({ ok: false, error: '帳號或密碼錯誤' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: '帳號或密碼錯誤' });
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await createSession(token, username, expiresAt);

    // Set HttpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('feast_admin_session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return res.json({
      ok: true,
      user: { username: admin.username },
    });
  } catch (err: unknown) {
    console.error('Admin login error:', err);
    return res.status(500).json({ ok: false, error: '登入伺服器錯誤' });
  }
});

// POST /api/admin/logout
adminRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.feast_admin_session;
  if (token) {
    await deleteSession(token);
  }
  res.clearCookie('feast_admin_session', { path: '/' });
  return res.json({ ok: true });
});

// GET /api/admin/me
adminRouter.get('/me', requireAdminAuth, (req: any, res) => {
  return res.json({ ok: true, user: req.adminUser });
});

// POST /api/admin/change-password
adminRouter.post('/change-password', requireAdminAuth, async (req: any, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ ok: false, error: '請提供舊密碼與新密碼' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ ok: false, error: '新密碼長度至少需 6 個字元' });
  }

  const username = req.adminUser.username;
  const admin = await getAdminByUsername(username);
  if (!admin) {
    return res.status(404).json({ ok: false, error: '使用者不存在' });
  }

  const isMatch = bcrypt.compareSync(oldPassword, admin.password_hash);
  if (!isMatch) {
    return res.status(400).json({ ok: false, error: '舊密碼不正確' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await updateAdminPassword(username, newHash);

  return res.json({ ok: true, message: '密碼更新成功' });
});

// GET /api/admin/categories - Fetch all categories including inactive ones
adminRouter.get('/categories', requireAdminAuth, async (_req, res) => {
  try {
    const categories = await getCategories(false);
    return res.json({ ok: true, categories });
  } catch (err) {
    console.error('Admin get categories error:', err);
    return res.status(500).json({ ok: false, error: '讀取分類資料失敗' });
  }
});

// POST /api/admin/categories - Create category
adminRouter.post('/categories', requireAdminAuth, async (req, res) => {
  const { name, sort_order, is_active } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ ok: false, error: '分類名稱不可為空' });
  }

  try {
    const category = await createCategory(
      name.trim(),
      Number(sort_order) || 0,
      is_active !== undefined ? Boolean(is_active) : true
    );
    return res.json({ ok: true, category });
  } catch (err) {
    console.error('Admin create category error:', err);
    return res.status(500).json({ ok: false, error: '新增分類失敗' });
  }
});

// PUT /api/admin/categories/:id - Update category
adminRouter.put('/categories/:id', requireAdminAuth, async (req, res) => {
  const id = req.params.id;
  const { name, sort_order, is_active } = req.body;

  try {
    const updated = await updateCategory(id, {
      name: name !== undefined ? name.trim() : undefined,
      sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
    });

    if (!updated) {
      return res.status(404).json({ ok: false, error: '分類不存在' });
    }

    return res.json({ ok: true, category: updated });
  } catch (err) {
    console.error('Admin update category error:', err);
    return res.status(500).json({ ok: false, error: '更新分類失敗' });
  }
});

// DELETE /api/admin/categories/:id - Delete category
adminRouter.delete('/categories/:id', requireAdminAuth, async (req, res) => {
  const id = req.params.id;
  try {
    const success = await deleteCategory(id);
    if (!success) {
      return res.status(404).json({ ok: false, error: '分類不存在或已刪除' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin delete category error:', err);
    return res.status(500).json({ ok: false, error: '刪除分類失敗' });
  }
});

// GET /api/admin/settings - Fetch settings
adminRouter.get('/settings', requireAdminAuth, async (_req, res) => {
  try {
    const settings = await getSiteSettings();
    return res.json({ ok: true, settings });
  } catch (err) {
    console.error('Admin get settings error:', err);
    return res.status(500).json({ ok: false, error: '讀取前台文字失敗' });
  }
});

// PUT /api/admin/settings - Update settings
adminRouter.put('/settings', requireAdminAuth, async (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ ok: false, error: '無效的設定資料' });
  }

  try {
    const updated = await updateSiteSettings(settings);
    return res.json({ ok: true, settings: updated });
  } catch (err) {
    console.error('Admin update settings error:', err);
    return res.status(500).json({ ok: false, error: '更新前台文字失敗' });
  }
});
