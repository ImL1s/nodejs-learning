/**
 * Todo API - Express 應用配置
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import todoRoutes from './routes/todo.routes';
import { SECURITY_CONFIG } from '../../../common/config/env.js';

const app: Application = express();

// 安全中間件
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.use(cors({
  origin: SECURITY_CONFIG.cors.origins,
  credentials: true,
}));

// 速率限制
const limiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimit.windowMs,
  max: SECURITY_CONFIG.rateLimit.max,
  message: '請求過於頻繁，請稍後再試',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 請求解析中間件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

  // 在生產環境中不洩露錯誤詳情
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(isProduction ? {} : { message: err.message, stack: err.stack }),
  });
});

export default app;
