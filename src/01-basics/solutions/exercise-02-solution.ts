/**
 * 練習 2 解答: 文件列表 API
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';

const PORT = 3000;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified: string;
  path: string;
}

async function getFilesInfo(dirPath: string): Promise<FileInfo[]> {
  try {
    const files = await fs.readdir(dirPath);

    const fileInfos = await Promise.all(
      files.map(async (file): Promise<FileInfo> => {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        return {
          name: file,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.isFile() ? stats.size : undefined,
          modified: stats.mtime.toISOString(),
          path: filePath,
        };
      })
    );

    // 排序：目錄在前，文件在後
    return fileInfos.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });
  } catch (error) {
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', BASE_URL);
  const pathname = url.pathname;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (pathname === '/') {
    // API 文檔
    res.writeHead(200);
    res.end(
      JSON.stringify(
        {
          message: '文件列表 API',
          version: '1.0.0',
          endpoints: {
            'GET /api/files': {
              description: '列出指定目錄的文件和目錄',
              queryParams: {
                path: '目錄路徑（默認為當前目錄）',
              },
              example: '/api/files?path=./src',
            },
          },
          examples: [
            '/api/files',
            '/api/files?path=.',
            '/api/files?path=./src',
            '/api/files?path=./src/01-basics',
          ],
        },
        null,
        2
      )
    );
    return;
  }

  if (pathname === '/api/files') {
    try {
      // 獲取查詢參數
      const requestedPath = url.searchParams.get('path') || '.';

      // 解析為絕對路徑
      const absolutePath = path.resolve(requestedPath);

      console.log(`📂 讀取目錄: ${absolutePath}`);

      // 檢查路徑是否存在
      const stats = await fs.stat(absolutePath);

      if (!stats.isDirectory()) {
        res.writeHead(400);
        res.end(
          JSON.stringify({
            success: false,
            error: 'Path is not a directory',
            path: absolutePath,
          })
        );
        return;
      }

      // 獲取文件信息
      const filesInfo = await getFilesInfo(absolutePath);

      // 統計信息
      const totalFiles = filesInfo.filter((f) => f.type === 'file').length;
      const totalDirs = filesInfo.filter((f) => f.type === 'directory').length;
      const totalSize = filesInfo
        .filter((f) => f.type === 'file')
        .reduce((sum, f) => sum + (f.size || 0), 0);

      res.writeHead(200);
      res.end(
        JSON.stringify(
          {
            success: true,
            path: absolutePath,
            stats: {
              totalFiles,
              totalDirectories: totalDirs,
              totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
              totalSizeBytes: totalSize,
            },
            data: filesInfo,
          },
          null,
          2
        )
      );
    } catch (error: any) {
      console.error('❌ 錯誤:', error.message);

      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end(
          JSON.stringify({
            success: false,
            error: 'Directory not found',
            message: error.message,
          })
        );
      } else if (error.code === 'EACCES') {
        res.writeHead(403);
        res.end(
          JSON.stringify({
            success: false,
            error: 'Permission denied',
            message: error.message,
          })
        );
      } else {
        res.writeHead(500);
        res.end(
          JSON.stringify({
            success: false,
            error: 'Internal server error',
            message: error.message,
          })
        );
      }
    }
    return;
  }

  // 404
  res.writeHead(404);
  res.end(
    JSON.stringify({
      success: false,
      error: 'Not Found',
      path: pathname,
      message: 'Available endpoints: /, /api/files',
    })
  );
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 伺服器運行在 http://${HOST}:${PORT}/`);
  console.log(`\n📖 試試這些 URL：`);
  console.log(`   http://${HOST}:${PORT}/`);
  console.log(`   http://${HOST}:${PORT}/api/files`);
  console.log(`   http://${HOST}:${PORT}/api/files?path=./src`);
  console.log(`   http://${HOST}:${PORT}/api/files?path=./src/01-basics`);
  console.log(`\n🧪 或使用 curl 測試：`);
  console.log(`   curl "http://${HOST}:${PORT}/api/files?path=./src"`);
});
