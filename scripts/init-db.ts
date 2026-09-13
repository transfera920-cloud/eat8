import 'dotenv/config';
import { initDatabase, getAdminByUsername, getCategories, getSiteSettings } from '../server/db.js';

async function main() {
  console.log('=== 開始執行下山慶功宴系統 資料庫初始化檢驗 ===');
  console.log('環境:', process.env.NODE_ENV || 'development');
  console.log('資料庫模式:', process.env.DATABASE_URL ? 'PostgreSQL (Cloud Database)' : 'Local Durable DB (data/db.json)');

  try {
    await initDatabase();

    const admin = await getAdminByUsername('yy661003');
    if (!admin) {
      throw new Error('管理員帳號 yy661003 初始化失敗！');
    }
    console.log('✓ 管理員帳號 yy661003 驗證成功 (Password Hash 已建立)');

    const categories = await getCategories(false);
    console.log(`✓ 分類資料驗證成功，目前共有 ${categories.length} 個分類:`);
    categories.forEach(c => console.log(`  - [${c.sort_order}] ${c.name} (${c.is_active ? '啟用' : '停用'})`));

    const settings = await getSiteSettings();
    console.log('✓ 網站設定驗證成功:');
    console.log(`  - 網站標題: ${settings.site_title}`);
    console.log(`  - SEO 標題: ${settings.seo_title}`);

    console.log('=== 資料庫初始化與驗證全部完成 ===');
    process.exit(0);
  } catch (err) {
    console.error('✗ 資料庫初始化發生錯誤:', err);
    process.exit(1);
  }
}

main();
