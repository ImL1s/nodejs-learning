/**
 * 範例 6: URL 解析和查詢參數處理
 *
 * 學習目標：
 * - 理解 URL 的組成部分
 * - 使用 URL API 解析 URL
 * - 處理查詢參數
 * - 構建動態響應
 */

import http from 'node:http';
import { URL } from 'node:url';

const PORT = 3003;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

// 模擬用戶數據庫
const users = [
  { id: 1, name: 'Alice', role: 'admin', age: 28 },
  { id: 2, name: 'Bob', role: 'user', age: 32 },
  { id: 3, name: 'Charlie', role: 'user', age: 25 },
  { id: 4, name: 'David', role: 'admin', age: 35 },
  { id: 5, name: 'Eve', role: 'user', age: 29 },
];

const server = http.createServer((req, res) => {
  // 解析完整的 URL
  const url = new URL(req.url || '/', BASE_URL);
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  console.log(`📥 ${req.method} ${pathname}`);
  console.log(`🔍 Query Params:`, Object.fromEntries(searchParams));

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 路由處理
  if (pathname === '/') {
    // 首頁 - 顯示 API 文檔
    res.writeHead(200);
    res.end(
      JSON.stringify(
        {
          message: 'URL 解析示範 API',
          endpoints: [
            {
              path: '/api/users',
              description: '獲取用戶列表',
              queryParams: {
                role: '按角色過濾 (admin/user)',
                minAge: '最小年齡',
                maxAge: '最大年齡',
                sort: '排序欄位 (name/age)',
                order: '排序順序 (asc/desc)',
              },
              example: '/api/users?role=admin&minAge=30&sort=age&order=desc',
            },
            {
              path: '/api/users/:id',
              description: '獲取單個用戶',
              example: '/api/users/1',
            },
            {
              path: '/api/search',
              description: '搜索用戶',
              queryParams: {
                q: '搜索關鍵字',
              },
              example: '/api/search?q=alice',
            },
          ],
        },
        null,
        2
      )
    );
  } else if (pathname === '/api/users') {
    // 獲取用戶列表 - 支持多種查詢參數
    let filteredUsers = [...users];

    // 按角色過濾
    const role = searchParams.get('role');
    if (role) {
      filteredUsers = filteredUsers.filter((u) => u.role === role);
    }

    // 按年齡範圍過濾
    const minAge = searchParams.get('minAge');
    if (minAge) {
      filteredUsers = filteredUsers.filter((u) => u.age >= parseInt(minAge));
    }

    const maxAge = searchParams.get('maxAge');
    if (maxAge) {
      filteredUsers = filteredUsers.filter((u) => u.age <= parseInt(maxAge));
    }

    // 排序
    const sort = searchParams.get('sort') || 'id';
    const order = searchParams.get('order') || 'asc';

    filteredUsers.sort((a, b) => {
      const aVal = a[sort as keyof typeof a];
      const bVal = b[sort as keyof typeof b];

      if (order === 'desc') {
        return aVal > bVal ? -1 : 1;
      }
      return aVal > bVal ? 1 : -1;
    });

    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: true,
        filters: {
          role,
          minAge,
          maxAge,
          sort,
          order,
        },
        count: filteredUsers.length,
        total: users.length,
        data: filteredUsers,
      })
    );
  } else if (pathname.startsWith('/api/users/')) {
    // 獲取單個用戶 - 路徑參數
    const id = parseInt(pathname.split('/').pop() || '0');
    const user = users.find((u) => u.id === id);

    if (!user) {
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: 'User not found' }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({ success: true, data: user }));
  } else if (pathname === '/api/search') {
    // 搜索功能
    const query = searchParams.get('q');

    if (!query) {
      res.writeHead(400);
      res.end(
        JSON.stringify({
          success: false,
          error: 'Query parameter "q" is required',
        })
      );
      return;
    }

    const results = users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));

    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: true,
        query,
        count: results.length,
        data: results,
      })
    );
  } else {
    // 404
    res.writeHead(404);
    res.end(
      JSON.stringify({
        success: false,
        error: 'Not Found',
        path: pathname,
      })
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 伺服器運行在 http://${HOST}:${PORT}/`);
  console.log(`\n📖 試試這些 URL：`);
  console.log(`   http://${HOST}:${PORT}/`);
  console.log(`   http://${HOST}:${PORT}/api/users`);
  console.log(`   http://${HOST}:${PORT}/api/users?role=admin`);
  console.log(`   http://${HOST}:${PORT}/api/users?minAge=30&sort=age&order=desc`);
  console.log(`   http://${HOST}:${PORT}/api/users/1`);
  console.log(`   http://${HOST}:${PORT}/api/search?q=alice`);
});
