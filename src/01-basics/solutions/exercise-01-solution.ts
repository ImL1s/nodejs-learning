/**
 * 練習 1 解答: 簡單的文件伺服器
 */

import http from 'node:http';

const PORT = 3000;
const HOST = '127.0.0.1';

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  console.log(`📥 ${req.method} ${url}`);

  // 設置響應頭
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  if (url === '/') {
    // 首頁
    const now = new Date().toLocaleString('zh-TW');
    res.end(`
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>我的第一個 Node.js 伺服器</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 {
            margin: 0 0 20px 0;
            font-size: 2.5em;
          }
          .time {
            font-size: 1.2em;
            margin: 20px 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
          }
          .welcome {
            font-size: 1.1em;
            line-height: 1.6;
            margin: 20px 0;
          }
          a {
            color: #ffd700;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 5px;
            transition: all 0.3s;
          }
          a:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 我的第一個 Node.js 伺服器</h1>
          <div class="time">
            ⏰ 當前時間: ${now}
          </div>
          <div class="welcome">
            <p>🎉 歡迎來到 Node.js 的世界！</p>
            <p>這是您使用原生 HTTP 模組創建的第一個伺服器。</p>
            <p>繼續探索，您將學會更多強大的功能！</p>
          </div>
          <a href="/about">📖 關於頁面</a>
        </div>
      </body>
      </html>
    `);
  } else if (url === '/about') {
    // 關於頁面
    res.end(`
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>關於 - Node.js 伺服器</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 { margin: 0 0 20px 0; }
          .info {
            margin: 20px 0;
            line-height: 1.8;
          }
          .tech-stack {
            background: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .tech-stack ul {
            list-style: none;
            padding: 0;
          }
          .tech-stack li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          }
          .tech-stack li:last-child {
            border-bottom: none;
          }
          a {
            color: #ffd700;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📖 關於本專案</h1>
          <div class="info">
            <p><strong>專案名稱:</strong> Node.js 現代化學習專案</p>
            <p><strong>版本:</strong> 2.0.0</p>
            <p><strong>作者:</strong> Node.js 學習者</p>
          </div>
          <div class="tech-stack">
            <h2>🛠 技術棧</h2>
            <ul>
              <li>✅ Node.js 18+</li>
              <li>✅ TypeScript 5.3+</li>
              <li>✅ ES Modules</li>
              <li>✅ HTTP 原生模組</li>
            </ul>
          </div>
          <div class="info">
            <p>這是一個從基礎到進階的完整 Node.js 學習路線專案。</p>
            <p>通過實際範例和練習，幫助您掌握現代 Node.js 開發技能。</p>
          </div>
          <a href="/">← 返回首頁</a>
        </div>
      </body>
      </html>
    `);
  } else {
    // 404 頁面
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - 頁面未找到</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #434343 0%, #000000 100%);
            color: white;
            text-align: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 60px 40px;
            border-radius: 20px;
          }
          h1 {
            font-size: 6em;
            margin: 0;
          }
          p {
            font-size: 1.5em;
            margin: 20px 0;
          }
          a {
            color: #ffd700;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            margin-top: 30px;
            padding: 15px 30px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            font-size: 1.2em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>404</h1>
          <p>😕 頁面未找到</p>
          <p style="font-size: 1em; opacity: 0.8;">路徑: ${url}</p>
          <a href="/">返回首頁</a>
        </div>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 伺服器運行在 http://${HOST}:${PORT}/`);
  console.log(`📖 可用路徑:`);
  console.log(`   / - 首頁`);
  console.log(`   /about - 關於頁面`);
  console.log(`\n按 Ctrl+C 停止伺服器`);
});
