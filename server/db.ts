import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import type { Category, SiteSettings } from '../src/types/index.js';

const { Pool } = pg;

export interface DBAdminUser {
  id: string | number;
  username: string;
  password_hash: string;
  created_at?: string;
  updated_at?: string;
}

export interface DBSession {
  token: string;
  username: string;
  expires_at: string;
  created_at?: string;
}

const DEFAULT_CATEGORIES = [
  { name: '餐廳', sort_order: 1, is_active: true },
  { name: '火鍋', sort_order: 2, is_active: true },
  { name: '麵店', sort_order: 3, is_active: true },
  { name: '便利商店', sort_order: 4, is_active: true },
  { name: '速食', sort_order: 5, is_active: true },
  { name: '自訂', sort_order: 6, is_active: true },
];

const DEFAULT_SETTINGS: SiteSettings = {
  site_title: '下山慶功宴搜尋系統',
  site_subtitle: '登山下山後，以登山口為起點，快速依真實行車時間搜尋周邊慶功宴美食',
  seo_title: '下山慶功宴搜尋系統｜登山口附近美食與餐廳推薦',
  seo_description: '專為山友設計的下山慶功宴搜尋系統。輸入登山口與理想車程，透過 Google Maps Platform 搜尋周邊實際美食並依實際行車時間精確篩選。',
  search_button_text: '搜尋慶功宴餐廳',
  trailhead_placeholder: '手動輸入登山口（例如：玉山登山口、合歡山松雪樓）',
  custom_search_placeholder: '輸入關鍵字（例如：熱炒、牛肉麵、羊肉爐）',
  driving_time_label: '最大可接受車程時間',
};

// Check if PostgreSQL DATABASE_URL is provided
const isPostgres = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));

let pool: pg.Pool | null = null;
if (isPostgres) {
  const connectionString = process.env.DATABASE_URL;
  const isProd = process.env.NODE_ENV === 'production';
  const ssl = connectionString?.includes('sslmode=disable')
    ? false
    : { rejectUnauthorized: false };

  pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('localhost') ? false : ssl,
  });
}

// Fallback JSON file storage for development / preview when DATABASE_URL is not provided
const dataDir = path.resolve(process.cwd(), 'data');
const dbFilePath = path.join(dataDir, 'db.json');

interface FileDB {
  admin_users: DBAdminUser[];
  categories: Category[];
  site_settings: Record<string, string>;
  sessions: DBSession[];
}

function loadFileDB(): FileDB {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    const initialData: FileDB = {
      admin_users: [],
      categories: [],
      site_settings: { ...DEFAULT_SETTINGS },
      sessions: [],
    };
    fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse file db, returning fresh state:', err);
    return {
      admin_users: [],
      categories: [],
      site_settings: { ...DEFAULT_SETTINGS },
      sessions: [],
    };
  }
}

function saveFileDB(data: FileDB) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const tempPath = `${dbFilePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, dbFilePath);
}

/**
 * Initialize database schema and seeds.
 * CRITICAL: Uses CREATE TABLE IF NOT EXISTS. Never drops existing tables or data!
 */
export async function initDatabase() {
  if (pool) {
    console.log('[DB] Connecting to PostgreSQL database...');
    // Create tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(128) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // One-time Admin initialization: checks if 'yy661003' exists
    const adminCheck = await pool.query('SELECT id FROM admin_users WHERE username = $1', ['yy661003']);
    if (adminCheck.rows.length === 0) {
      console.log('[DB] Performing one-time admin initialization for yy661003...');
      const passwordHash = bcrypt.hashSync('yyy661003', 10);
      await pool.query(
        'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
        ['yy661003', passwordHash]
      );
      console.log('[DB] Admin user yy661003 initialized with bcrypt hash.');
    } else {
      console.log('[DB] Admin user yy661003 already exists. Keeping existing credentials.');
    }

    // Default categories check
    const catCheck = await pool.query('SELECT COUNT(*) as cnt FROM categories');
    if (parseInt(catCheck.rows[0].cnt, 10) === 0) {
      console.log('[DB] Initializing default categories...');
      for (const cat of DEFAULT_CATEGORIES) {
        await pool.query(
          'INSERT INTO categories (name, sort_order, is_active) VALUES ($1, $2, $3)',
          [cat.name, cat.sort_order, cat.is_active]
        );
      }
    }

    // Default settings check
    for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
      await pool.query(
        'INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
        [key, val]
      );
    }
  } else {
    console.log('[DB] PostgreSQL DATABASE_URL not set. Running local durable JSON database at data/db.json.');
    const db = loadFileDB();

    // Check admin
    const existingAdmin = db.admin_users.find(u => u.username === 'yy661003');
    if (!existingAdmin) {
      console.log('[DB] Performing one-time admin initialization for yy661003 (file db)...');
      const passwordHash = bcrypt.hashSync('yyy661003', 10);
      db.admin_users.push({
        id: 1,
        username: 'yy661003',
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Check categories
    if (db.categories.length === 0) {
      console.log('[DB] Initializing default categories (file db)...');
      db.categories = DEFAULT_CATEGORIES.map((c, i) => ({
        id: i + 1,
        name: c.name,
        sort_order: c.sort_order,
        is_active: c.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    // Check settings
    for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
      if (!db.site_settings[key]) {
        db.site_settings[key] = val;
      }
    }

    saveFileDB(db);
  }
}

// Database helper functions

export async function getAdminByUsername(username: string): Promise<DBAdminUser | null> {
  if (pool) {
    const res = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    return res.rows[0] || null;
  } else {
    const db = loadFileDB();
    return db.admin_users.find(u => u.username === username) || null;
  }
}

export async function updateAdminPassword(username: string, newPasswordHash: string): Promise<boolean> {
  if (pool) {
    const res = await pool.query(
      'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
      [newPasswordHash, username]
    );
    return (res.rowCount ?? 0) > 0;
  } else {
    const db = loadFileDB();
    const user = db.admin_users.find(u => u.username === username);
    if (!user) return false;
    user.password_hash = newPasswordHash;
    user.updated_at = new Date().toISOString();
    saveFileDB(db);
    return true;
  }
}

export async function createSession(token: string, username: string, expiresAt: Date) {
  if (pool) {
    await pool.query(
      'INSERT INTO sessions (token, username, expires_at) VALUES ($1, $2, $3)',
      [token, username, expiresAt]
    );
  } else {
    const db = loadFileDB();
    // Clean old
    db.sessions = db.sessions.filter(s => new Date(s.expires_at) > new Date());
    db.sessions.push({
      token,
      username,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });
    saveFileDB(db);
  }
}

export async function getSession(token: string): Promise<DBSession | null> {
  if (pool) {
    const res = await pool.query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );
    return res.rows[0] || null;
  } else {
    const db = loadFileDB();
    const session = db.sessions.find(s => s.token === token);
    if (!session) return null;
    if (new Date(session.expires_at) <= new Date()) {
      return null;
    }
    return session;
  }
}

export async function deleteSession(token: string) {
  if (pool) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  } else {
    const db = loadFileDB();
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveFileDB(db);
  }
}

export async function getCategories(onlyActive = false): Promise<Category[]> {
  if (pool) {
    const query = onlyActive
      ? 'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC'
      : 'SELECT * FROM categories ORDER BY sort_order ASC, id ASC';
    const res = await pool.query(query);
    return res.rows;
  } else {
    const db = loadFileDB();
    let cats = db.categories;
    if (onlyActive) {
      cats = cats.filter(c => c.is_active);
    }
    return [...cats].sort((a, b) => a.sort_order - b.sort_order || Number(a.id) - Number(b.id));
  }
}

export async function createCategory(name: string, sort_order: number, is_active: boolean): Promise<Category> {
  if (pool) {
    const res = await pool.query(
      'INSERT INTO categories (name, sort_order, is_active) VALUES ($1, $2, $3) RETURNING *',
      [name, sort_order, is_active]
    );
    return res.rows[0];
  } else {
    const db = loadFileDB();
    const newId = db.categories.length > 0 ? Math.max(...db.categories.map(c => Number(c.id))) + 1 : 1;
    const newCat: Category = {
      id: newId,
      name,
      sort_order,
      is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.categories.push(newCat);
    saveFileDB(db);
    return newCat;
  }
}

export async function updateCategory(
  id: string | number,
  data: { name?: string; sort_order?: number; is_active?: boolean }
): Promise<Category | null> {
  if (pool) {
    const existingRes = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) return null;
    const existing = existingRes.rows[0];

    const name = data.name !== undefined ? data.name : existing.name;
    const sort_order = data.sort_order !== undefined ? data.sort_order : existing.sort_order;
    const is_active = data.is_active !== undefined ? data.is_active : existing.is_active;

    const res = await pool.query(
      'UPDATE categories SET name = $1, sort_order = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, sort_order, is_active, id]
    );
    return res.rows[0] || null;
  } else {
    const db = loadFileDB();
    const cat = db.categories.find(c => String(c.id) === String(id));
    if (!cat) return null;
    if (data.name !== undefined) cat.name = data.name;
    if (data.sort_order !== undefined) cat.sort_order = data.sort_order;
    if (data.is_active !== undefined) cat.is_active = data.is_active;
    cat.updated_at = new Date().toISOString();
    saveFileDB(db);
    return cat;
  }
}

export async function deleteCategory(id: string | number): Promise<boolean> {
  if (pool) {
    const res = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  } else {
    const db = loadFileDB();
    const initialLen = db.categories.length;
    db.categories = db.categories.filter(c => String(c.id) !== String(id));
    if (db.categories.length !== initialLen) {
      saveFileDB(db);
      return true;
    }
    return false;
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (pool) {
    const res = await pool.query('SELECT key, value FROM site_settings');
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of res.rows) {
      settings[row.key] = row.value;
    }
    return settings as unknown as SiteSettings;
  } else {
    const db = loadFileDB();
    return { ...DEFAULT_SETTINGS, ...db.site_settings };
  }
}

export async function updateSiteSettings(settings: Record<string, string>): Promise<SiteSettings> {
  if (pool) {
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }
    return getSiteSettings();
  } else {
    const db = loadFileDB();
    for (const [key, value] of Object.entries(settings)) {
      db.site_settings[key] = value;
    }
    saveFileDB(db);
    return { ...DEFAULT_SETTINGS, ...db.site_settings };
  }
}
