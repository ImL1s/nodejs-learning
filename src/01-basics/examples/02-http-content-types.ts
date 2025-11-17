/**
 * 範例 2: 處理不同的內容類型
 *
 * 學習目標：
 * - 了解不同的 Content-Type
 * - 學習如何返回 JSON、HTML、純文本
 * - 理解 MIME 類型的重要性
 */

import http from 'node:http';

const PORT = 3001;
const HOST = '127.0.0.1';

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  console.log(`📥 請求路徑: ${url}`);

  // 根據不同路徑返回不同類型的內容
  switch (url) {
    case '/':
      // 返回 HTML
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
          <meta charset="UTF-8">
          <title>Content Types Demo</title>
          <style>
            body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
            a { display: block; margin: 10px 0; padding: 10px; background: #3498db;
                color: white; text-decoration: none; border-radius: 5px; text-align: center; }
            a:hover { background: #2980b9; }
          </style>
        </head>
        <body>
          <h1>Content Type 示範</h1>
          <p>點擊以下鏈接查看不同的內容類型：</p>
          <a href="/json">📊 JSON 格式</a>
          <a href="/text">📝 純文本</a>
          <a href="/html-tag">🏷️ HTML 標籤（顯示為純文本）</a>
        </body>
        </html>
      `);
      break;

    case '/json':
      // 返回 JSON
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      const data = {
        message: '這是 JSON 格式的響應',
        timestamp: new Date().toISOString(),
        data: {
          users: ['Alice', 'Bob', 'Charlie'],
          count: 3,
        },
      };
      res.end(JSON.stringify(data, null, 2));
      break;

    case '/text':
      // 返回純文本
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('這是純文本格式的響應\n沒有任何 HTML 渲染');
      break;

    case '/html-tag':
      // 返回純文本，但內容包含 HTML 標籤（不會被渲染）
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('<h1>這個 HTML 標籤不會被渲染</h1>\n因為 Content-Type 是 text/plain');
      break;

    default:
      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          error: 'Not Found',
          message: `路徑 ${url} 不存在`,
        })
      );
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 伺服器運行在 http://${HOST}:${PORT}/`);
  console.log('📖 訪問首頁查看所有示範');
});
