/**
 * 範例 2: Express 中間件詳解
 *
 * 學習目標：
 * - 理解中間件的執行順序
 * - 創建自定義中間件
 * - 使用第三方中間件
 * - 錯誤處理中間件
 */

import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = 4001;

// 1. 應用級中間件：請求日誌
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // 監聽響應完成事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next(); // 必須調用 next() 才能繼續到下一個中間件
};

// 2. 自定義中間件：添加請求 ID
const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  // 擴展 Request 對象（實際項目中應該使用 TypeScript 聲明文件）
  (req as any).requestId = Math.random().toString(36).substring(7);
  next();
};

// 3. 自定義中間件：API 速率限制（簡化版）
const rateLimiter = (() => {
  const requests = new Map<string, number[]>();
  const WINDOW_MS = 60000; // 1 分鐘
  const MAX_REQUESTS = 10;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    // 獲取該 IP 的請求記錄
    let timestamps = requests.get(ip) || [];

    // 移除過期的請求記錄
    timestamps = timestamps.filter((time) => now - time < WINDOW_MS);

    if (timestamps.length >= MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: WINDOW_MS / 1000,
      });
    }

    // 記錄新請求
    timestamps.push(now);
    requests.set(ip, timestamps);

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', (MAX_REQUESTS - timestamps.length).toString());

    next();
  };
})();

// 4. 路由級中間件：認證檢查（簡化版）
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Token is required',
    });
  }

  // 簡化的 token 驗證
  if (token !== 'Bearer secret-token') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Invalid token',
    });
  }

  next();
};

// 應用中間件
app.use(express.json());
app.use(requestLogger);
app.use(addRequestId);
app.use(rateLimiter);

// 公開路由
app.get('/', (req, res) => {
  res.json({
    message: 'Express 中間件示範',
    requestId: (req as any).requestId,
    middleware: [
      'requestLogger - 記錄所有請求',
      'addRequestId - 為每個請求添加唯一 ID',
      'rateLimiter - 限制請求頻率',
    ],
  });
});

// 受保護的路由（需要認證）
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: '這是受保護的資源',
    requestId: (req as any).requestId,
    data: {
      secret: 'Top Secret Data',
    },
  });
});

// 測試速率限制的路由
app.get('/api/test-rate-limit', (req, res) => {
  res.json({
    success: true,
    message: '請快速刷新此頁面以測試速率限制',
    requestId: (req as any).requestId,
  });
});

// 錯誤處理中間件（必須有 4 個參數）
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ 錯誤:', err);

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message,
    requestId: (req as any).requestId,
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);
  console.log(`\n📝 中間件執行順序：`);
  console.log('   1. requestLogger - 記錄請求');
  console.log('   2. addRequestId - 添加請求 ID');
  console.log('   3. rateLimiter - 速率限制');
  console.log('   4. 路由處理器');
  console.log('   5. 錯誤處理中間件（如果有錯誤）');
  console.log(`\n🧪 測試受保護路由：`);
  console.log(
    `   curl http://localhost:${PORT}/api/protected -H "Authorization: Bearer secret-token"`
  );
  console.log(`\n🧪 測試速率限制：`);
  console.log(`   快速刷新 http://localhost:${PORT}/api/test-rate-limit 10次以上`);
});
