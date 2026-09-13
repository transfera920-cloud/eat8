import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api.js';
import { initDatabase } from './server/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust first proxy (Cloud Run, Nginx, Cloudflare)
  app.set('trust proxy', 1);

  // Basic middlewares
  app.use(express.json());
  app.use(cookieParser());

  // Initialize Database (Schema creation & one-time admin seed)
  try {
    await initDatabase();
    console.log('[Server] Database initialized successfully.');
  } catch (err) {
    console.error('[Server] Database initialization failed:', err);
  }

  // Health check route
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount all API routes BEFORE any static or SPA fallback
  app.use('/api', apiRouter);

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware mounted in development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA wildcard fallback for all non-API GET requests
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Server] Serving production static files from dist.');
  }

  // Global error handler: guarantees JSON response for API or server errors, never HTML
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        ok: false,
        error: err.message || '伺服器內部錯誤',
      });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] 下山慶功宴搜尋系統 running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
