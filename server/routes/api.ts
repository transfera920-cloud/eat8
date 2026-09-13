import { Router } from 'express';
import { adminRouter } from './admin.js';
import { getCategories, getSiteSettings } from '../db.js';
import { searchPostHikeFeast } from '../maps.js';

export const apiRouter = Router();

// Mount Admin Routes
apiRouter.use('/admin', adminRouter);

// Public GET /api/categories - Only active categories for frontend
apiRouter.get('/categories', async (_req, res) => {
  try {
    const categories = await getCategories(true);
    return res.json({ ok: true, categories });
  } catch (err) {
    console.error('Public get categories error:', err);
    return res.status(500).json({ ok: false, error: '無法讀取分類' });
  }
});

// Public GET /api/settings - Public site settings for frontend
apiRouter.get('/settings', async (_req, res) => {
  try {
    const settings = await getSiteSettings();
    return res.json({ ok: true, settings });
  } catch (err) {
    console.error('Public get settings error:', err);
    return res.status(500).json({ ok: false, error: '無法讀取前台文字設定' });
  }
});

// Public GET /api/maps-config - Informs client about Google Maps status
apiRouter.get('/maps-config', (_req, res) => {
  const hasServerKey = Boolean(process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY.trim() !== '');
  const clientKey = process.env.VITE_GOOGLE_MAPS_API_KEY || '';
  return res.json({
    ok: true,
    hasServerKey,
    hasClientKey: Boolean(clientKey && clientKey.trim() !== ''),
    clientApiKey: clientKey,
  });
});

// Public POST /api/search - Execute real Google Maps search
apiRouter.post('/search', async (req, res) => {
  const { trailhead, query, maxDrivingMinutes } = req.body;

  // Validation
  if (!trailhead || typeof trailhead !== 'string' || trailhead.trim() === '') {
    return res.status(400).json({ ok: false, error: '請手動輸入登山口名稱' });
  }

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ ok: false, error: '請選擇或輸入欲搜尋之慶功宴類別或關鍵字' });
  }

  const minutes = Number(maxDrivingMinutes);
  if (isNaN(minutes) || minutes <= 0) {
    return res.status(400).json({ ok: false, error: '車程時間必須大於 0 分鐘' });
  }

  try {
    const searchRes = await searchPostHikeFeast(trailhead.trim(), query.trim(), minutes);
    if (!searchRes.ok) {
      return res.status(400).json(searchRes);
    }
    return res.json(searchRes);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Search error:', msg);
    return res.status(500).json({
      ok: false,
      error: `伺服器處理搜尋時發生錯誤：${msg}`,
    });
  }
});

// Explicit JSON 404 for any unmatched /api route
apiRouter.all('*', (_req, res) => {
  res.status(404).json({ ok: false, error: 'API 路徑不存在' });
});
