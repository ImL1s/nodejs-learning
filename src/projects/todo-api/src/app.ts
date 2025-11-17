/**
 * Todo API - Express 應用配置
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import todoRoutes from './routes/todo.routes';

const app: Application = express();

// 中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 請求日誌中間件
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 根路由
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '📝 Todo List API',
    version: '1.0.0',
    endpoints: {
      'GET /api/todos': '獲取所有 todos',
      'GET /api/todos/:id': '獲取單個 todo',
      'POST /api/todos': '創建新 todo',
      'PUT /api/todos/:id': '更新 todo',
      'DELETE /api/todos/:id': '刪除 todo',
      'PATCH /api/todos/:id/toggle': '切換完成狀態',
    },
  });
});

// API 路由
app.use('/api/todos', todoRoutes);

// 404 處理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// 錯誤處理中間件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

export default app;
