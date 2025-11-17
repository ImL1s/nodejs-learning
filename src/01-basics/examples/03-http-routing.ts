/**
 * 範例 3: 簡單的路由系統
 *
 * 學習目標：
 * - 理解基本的路由概念
 * - 處理不同的 HTTP 方法（GET, POST）
 * - 解析 URL 和查詢參數
 */

import http from 'node:http';
import { parse } from 'node:url';

const PORT = 3002;
const HOST = '127.0.0.1';

// 簡單的路由處理器類型
type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

// 路由映射
const routes: Record<string, RouteHandler> = {
  '/': handleHome,
  '/about': handleAbout,
  '/api/users': handleUsers,
};

function handleHome(req: http.IncomingMessage, res: http.ServerResponse) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <h1>首頁</h1>
    <ul>
      <li><a href="/about">關於我們</a></li>
      <li><a href="/api/users?limit=5">用戶 API</a></li>
    </ul>
  `);
}

function handleAbout(req: http.IncomingMessage, res: http.ServerResponse) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <h1>關於我們</h1>
    <p>這是一個 Node.js 路由示範</p>
    <a href="/">返回首頁</a>
  `);
}

function handleUsers(req: http.IncomingMessage, res: http.ServerResponse) {
  const parsedUrl = parse(req.url || '', true);
  const limit = parseInt(parsedUrl.query.limit as string) || 10;

  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    { id: 4, name: 'David', email: 'david@example.com' },
    { id: 5, name: 'Eve', email: 'eve@example.com' },
  ];

  const limitedUsers = users.slice(0, limit);

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify(
      {
        total: users.length,
        limit: limit,
        data: limitedUsers,
      },
      null,
      2
    )
  );
}

const server = http.createServer((req, res) => {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';

  console.log(`📥 ${req.method} ${pathname}`);

  // 查找對應的路由處理器
  const handler = routes[pathname];

  if (handler) {
    handler(req, res);
  } else {
    // 404 處理
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error: 'Not Found',
        message: `路徑 ${pathname} 不存在`,
        availableRoutes: Object.keys(routes),
      })
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 伺服器運行在 http://${HOST}:${PORT}/`);
  console.log('可用路由:', Object.keys(routes));
});
