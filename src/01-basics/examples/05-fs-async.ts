/**
 * 範例 5: 使用 Promise 和 Async/Await 處理文件系統
 *
 * 學習目標：
 * - 使用 fs/promises API（推薦方式）
 * - 理解 async/await 語法
 * - 優雅地處理錯誤
 * - 避免回調地獄（Callback Hell）
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 讀取目錄並返回文件信息
 */
async function analyzeDirectory(dirPath: string) {
  try {
    console.log(`\n📁 分析目錄: ${dirPath}\n`);

    // 讀取目錄內容
    const files = await fs.readdir(dirPath);

    // 獲取每個文件的詳細信息
    const fileInfos = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        return {
          name: file,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          size: stats.size,
          modified: stats.mtime,
        };
      })
    );

    // 分類和顯示
    const directories = fileInfos.filter((f) => f.isDirectory);
    const regularFiles = fileInfos.filter((f) => f.isFile);

    console.log(`📊 統計信息：`);
    console.log(`   總共: ${fileInfos.length} 項`);
    console.log(`   目錄: ${directories.length} 個`);
    console.log(`   文件: ${regularFiles.length} 個\n`);

    if (directories.length > 0) {
      console.log('📁 目錄列表：');
      directories.forEach((dir) => {
        console.log(`   📂 ${dir.name}/`);
      });
      console.log();
    }

    if (regularFiles.length > 0) {
      console.log('📄 文件列表：');
      regularFiles.forEach((file) => {
        const sizeKB = (file.size / 1024).toFixed(2);
        console.log(`   📝 ${file.name} (${sizeKB} KB)`);
      });
      console.log();
    }

    return fileInfos;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ 錯誤: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 遞歸讀取目錄（只到一層）
 */
async function readDirectoryRecursive(dirPath: string, indent = '') {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      console.log(`${indent}📁 ${file}/`);
      // 只遞歸一層，避免輸出過多
      if (indent === '') {
        const subFiles = await fs.readdir(filePath);
        subFiles.forEach((subFile) => {
          console.log(`${indent}  └─ ${subFile}`);
        });
      }
    } else {
      console.log(`${indent}📄 ${file}`);
    }
  }
}

/**
 * 讀取並顯示文件內容的前幾行
 */
async function previewFile(filePath: string, maxLines = 10) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const preview = lines.slice(0, maxLines);

    console.log(`\n📖 文件預覽: ${path.basename(filePath)}`);
    console.log('─'.repeat(50));
    preview.forEach((line, index) => {
      console.log(`${(index + 1).toString().padStart(3)}: ${line}`);
    });

    if (lines.length > maxLines) {
      console.log(`... (還有 ${lines.length - maxLines} 行)`);
    }
    console.log('─'.repeat(50));
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ 無法讀取文件: ${error.message}`);
    }
  }
}

// 主程序
async function main() {
  console.log('🚀 現代化文件系統操作示範\n');

  // 1. 分析當前目錄
  await analyzeDirectory(__dirname);

  // 2. 遞歸顯示目錄結構
  console.log('🌲 目錄樹狀結構：');
  await readDirectoryRecursive(path.join(__dirname, '..'));

  // 3. 預覽當前文件
  await previewFile(__filename, 15);

  console.log('\n✅ 所有操作完成！');
  console.log('\n💡 重點提示：');
  console.log('   - 使用 fs/promises 替代回調方式');
  console.log('   - async/await 讓代碼更易讀');
  console.log('   - Promise.all() 可以並行執行多個異步操作');
}

// 執行主程序並處理未捕獲的錯誤
main().catch((error) => {
  console.error('❌ 程序執行失敗:', error);
  process.exit(1);
});
