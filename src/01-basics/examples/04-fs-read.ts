/**
 * 範例 4: 文件系統 - 讀取文件和目錄
 *
 * 學習目標：
 * - 使用 fs 模組讀取文件
 * - 讀取目錄內容
 * - 獲取文件/目錄統計信息
 * - 理解同步 vs 異步操作
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM 中獲取當前文件路徑的方法
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📁 文件系統讀取示範\n');

// 1. 讀取當前文件（自己）
console.log('1️⃣ 讀取當前文件內容：');
fs.readFile(__filename, 'utf-8', (err, data) => {
  if (err) {
    console.error('❌ 讀取失敗:', err);
    return;
  }
  const lines = data.split('\n');
  console.log(`✅ 成功讀取 ${lines.length} 行\n`);
});

// 2. 讀取目錄內容
const examplesDir = __dirname;
console.log('2️⃣ 讀取範例目錄內容：');
fs.readdir(examplesDir, (err, files) => {
  if (err) {
    console.error('❌ 讀取目錄失敗:', err);
    return;
  }
  console.log(`✅ 找到 ${files.length} 個文件/目錄：`);
  files.forEach((file) => {
    console.log(`   - ${file}`);
  });
  console.log();
});

// 3. 獲取文件統計信息
console.log('3️⃣ 獲取文件統計信息：');
const targetDir = path.join(__dirname, '..');

fs.readdir(targetDir, (err, files) => {
  if (err) {
    console.error('❌ 讀取失敗:', err);
    return;
  }

  console.log(`📊 分析 ${targetDir} 目錄：\n`);

  files.forEach((file) => {
    const filePath = path.join(targetDir, file);

    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error(`❌ 無法獲取 ${file} 的信息`);
        return;
      }

      const type = stats.isDirectory() ? '📁 目錄' : '📄 文件';
      const size = stats.isFile() ? `(${stats.size} bytes)` : '';

      console.log(`${type}: ${file} ${size}`);
    });
  });
});

// 4. 同步讀取示範（不推薦在生產環境使用）
console.log('\n4️⃣ 同步讀取示範（阻塞）：');
try {
  const syncData = fs.readFileSync(__filename, 'utf-8');
  const lines = syncData.split('\n').length;
  console.log(`✅ 同步讀取成功，共 ${lines} 行`);
  console.log('⚠️  注意：同步操作會阻塞程序執行，實際應用中應避免使用\n');
} catch (err) {
  console.error('❌ 同步讀取失敗:', err);
}

console.log('💡 提示：觀察異步操作的執行順序！');
