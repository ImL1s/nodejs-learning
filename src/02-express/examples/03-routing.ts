/**
 * 範例 3: Express 路由管理
 *
 * 學習目標：
 * - 使用 Router 組織路由
 * - 路由參數和查詢參數
 * - 路由分組和模組化
 * - RESTful 路由設計
 */

import express, { Router, Request, Response } from 'express';

const app = express();
const PORT = 4002;

app.use(express.json());

// ===== 用戶路由模組 =====
const usersRouter = Router();

// 模擬數據庫
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
];

// GET /api/users - 獲取所有用戶
usersRouter.get('/', (req: Request, res: Response) => {
  const { role, search } = req.query;

  let filteredUsers = users;

  // 根據角色過濾
  if (role) {
    filteredUsers = filteredUsers.filter((u) => u.role === role);
  }

  // 根據名稱搜索
  if (search) {
    const searchTerm = (search as string).toLowerCase();
    filteredUsers = filteredUsers.filter((u) => u.name.toLowerCase().includes(searchTerm));
  }

  res.json({
    success: true,
    data: filteredUsers,
    count: filteredUsers.length,
    total: users.length,
  });
});

// GET /api/users/:id - 獲取單個用戶
usersRouter.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.json({
    success: true,
    data: user,
  });
});

// POST /api/users - 創建新用戶
usersRouter.post('/', (req: Request, res: Response) => {
  const { name, email, role = 'user' } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required',
    });
  }

  const newUser = {
    id: users.length + 1,
    name,
    email,
    role,
  };

  users.push(newUser);

  res.status(201).json({
    success: true,
    data: newUser,
    message: 'User created successfully',
  });
});

// PUT /api/users/:id - 更新用戶
usersRouter.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex((u) => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  const { name, email, role } = req.body;

  users[userIndex] = {
    ...users[userIndex],
    ...(name && { name }),
    ...(email && { email }),
    ...(role && { role }),
  };

  res.json({
    success: true,
    data: users[userIndex],
    message: 'User updated successfully',
  });
});

// DELETE /api/users/:id - 刪除用戶
usersRouter.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex((u) => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  const deletedUser = users.splice(userIndex, 1)[0];

  res.json({
    success: true,
    data: deletedUser,
    message: 'User deleted successfully',
  });
});

// ===== 文章路由模組 =====
const postsRouter = Router();

const posts = [
  { id: 1, title: 'Node.js 入門', authorId: 1, content: 'Node.js 是...' },
  { id: 2, title: 'TypeScript 指南', authorId: 2, content: 'TypeScript 是...' },
];

postsRouter.get('/', (req: Request, res: Response) => {
  res.json({ success: true, data: posts });
});

postsRouter.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);

  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  res.json({ success: true, data: post });
});

// ===== 掛載路由 =====
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);

// 根路由
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Express 路由管理示範',
    apiVersion: '1.0.0',
    endpoints: {
      users: {
        'GET /api/users': '獲取所有用戶（支持 ?role=admin&search=alice）',
        'GET /api/users/:id': '獲取單個用戶',
        'POST /api/users': '創建新用戶',
        'PUT /api/users/:id': '更新用戶',
        'DELETE /api/users/:id': '刪除用戶',
      },
      posts: {
        'GET /api/posts': '獲取所有文章',
        'GET /api/posts/:id': '獲取單篇文章',
      },
    },
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

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);
  console.log(`\n📚 可用的 API 端點：`);
  console.log(`   GET    /api/users          - 獲取所有用戶`);
  console.log(`   GET    /api/users/:id      - 獲取單個用戶`);
  console.log(`   POST   /api/users          - 創建新用戶`);
  console.log(`   PUT    /api/users/:id      - 更新用戶`);
  console.log(`   DELETE /api/users/:id      - 刪除用戶`);
  console.log(`   GET    /api/posts          - 獲取所有文章`);
  console.log(`   GET    /api/posts/:id      - 獲取單篇文章`);
  console.log(`\n🧪 測試命令：`);
  console.log(`   # 獲取所有用戶`);
  console.log(`   curl http://localhost:${PORT}/api/users`);
  console.log(`\n   # 創建新用戶`);
  console.log(
    `   curl -X POST http://localhost:${PORT}/api/users -H "Content-Type: application/json" -d '{"name":"David","email":"david@example.com"}'`
  );
  console.log(`\n   # 搜索用戶`);
  console.log(`   curl "http://localhost:${PORT}/api/users?search=alice"`);
});
