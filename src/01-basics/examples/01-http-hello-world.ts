/**
 * 範例 1: HTTP Hello World Server
 *
 * 學習目標：
 * - 理解如何創建一個基本的 HTTP 伺服器
 * - 了解 request 和 response 對象
 * - 設置正確的 Content-Type 響應頭
 */

import http from 'node:http';

// 設定伺服器配置
const PORT = 3000;
const HOST = '127.0.0.1';

// 創建 HTTP 伺服器
const server = http.createServer((req, res) => {
  console.log(`📥 收到請求: ${req.method} ${req.url}`);

  // 設置響應頭 - 指定內容類型和字符編碼
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
  });

  // 發送響應內容
  res.end(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8">
      <title>Node.js Hello World</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f0f0f0;
        }
        .card {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2c3e50; }
        p { color: #7f8c8d; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🎉 Hello, Node.js!</h1>
        <p>這是一個使用 TypeScript 編寫的現代化 Node.js HTTP 伺服器</p>
        <p>計算結果: 1 + 2 + 3 = ${1 + 2 + 3}</p>
      </div>
    </body>
    </html>
  `);
});

// 啟動伺服器並監聽指定端口
server.listen(PORT, HOST, () => {
  console.log(`🚀 伺服器運行在 http://${HOST}:${PORT}/`);
  console.log('按 Ctrl+C 停止伺服器');
});

// 優雅地處理關閉
process.on('SIGTERM', () => {
  console.log('\n👋 正在關閉伺服器...');
  server.close(() => {
    console.log('✅ 伺服器已關閉');
    process.exit(0);
  });
});
