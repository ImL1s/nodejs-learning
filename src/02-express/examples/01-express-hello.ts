/**
 * 範例 1: Express.js Hello World
 *
 * 學習目標：
 * - 創建基本的 Express 應用
 * - 理解 req 和 res 對象
 * - 設置基本路由
 * - 使用內建中間件
 */

import express from 'express';

const app = express();
const PORT = 4000;

// 內建中間件：解析 JSON 請求體
app.use(express.json());

// 內建中間件：解析 URL 編碼的請求體
app.use(express.urlencoded({ extended: true }));

// 基本路由
app.get('/', (req, res) => {
  res.json({
    message: '🎉 歡迎使用 Express.js!',
    timestamp: new Date().toISOString(),
    endpoints: [
      { path: '/', method: 'GET', description: '首頁' },
      { path: '/about', method: 'GET', description: '關於頁面' },
      { path: '/api/users', method: 'GET', description: '獲取用戶列表' },
      { path: '/api/echo', method: 'POST', description: '回聲測試' },
    ],
  });
});

// 關於頁面
app.get('/about', (req, res) => {
  res.json({
    name: 'Node.js Learning Project',
    version: '2.0.0',
    framework: 'Express.js',
    language: 'TypeScript',
  });
});

// API 路由：獲取用戶列表
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
  ];

  res.json({
    success: true,
    data: users,
    count: users.length,
  });
});

// POST 請求示範：回聲測試
app.post('/api/echo', (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required',
    });
  }

  res.json({
    success: true,
    echo: message,
    length: message.length,
    timestamp: new Date().toISOString(),
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Express 伺服器運行在 http://localhost:${PORT}`);
  console.log(`📖 訪問 http://localhost:${PORT}/ 查看可用端點`);
  console.log(`\n💡 測試 POST 請求：`);
  console.log(
    `   curl -X POST http://localhost:${PORT}/api/echo -H "Content-Type: application/json" -d '{"message":"Hello"}'`
  );
});
