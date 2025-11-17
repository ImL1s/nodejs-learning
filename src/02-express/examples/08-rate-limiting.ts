/**
 * 速率限制進階示例
 *
 * 本示例展示：
 * 1. 基於 IP 的速率限制
 * 2. 基於用戶的速率限制
 * 3. 不同端點的不同限制策略
 * 4. 滑動窗口算法
 * 5. 固定窗口算法
 * 6. Token Bucket 算法
 * 7. 自定義限制規則
 * 8. 限制超出時的響應
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import slowDown from 'express-slow-down';

const app = express();
app.use(express.json());

// ==================== 類型定義 ====================

interface RateLimitStore {
  incr(key: string): Promise<{ totalHits: number; resetTime?: Date }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  resetAll?(): Promise<void>;
}

interface TokenBucketEntry {
  tokens: number;
  lastRefill: number;
}

// ==================== 自定義內存存儲 ====================

/**
 * 自定義內存存儲（用於滑動窗口）
 */
class SlidingWindowStore implements RateLimitStore {
  private hits: Map<string, number[]> = new Map();
  private windowMs: number;
  private max: number;

  constructor(windowMs: number, max: number) {
    this.windowMs = windowMs;
    this.max = max;
  }

  async incr(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // 獲取該 key 的所有請求時間戳
    let timestamps = this.hits.get(key) || [];

    // 過濾掉過期的時間戳
    timestamps = timestamps.filter(t => t > windowStart);

    // 添加當前請求
    timestamps.push(now);

    // 更新存儲
    this.hits.set(key, timestamps);

    // 計算下次重置時間（最早的時間戳 + 窗口大小）
    const resetTime = new Date(timestamps[0] + this.windowMs);

    return {
      totalHits: timestamps.length,
      resetTime
    };
  }

  async decrement(key: string): Promise<void> {
    const timestamps = this.hits.get(key);
    if (timestamps && timestamps.length > 0) {
      timestamps.pop();
      if (timestamps.length === 0) {
        this.hits.delete(key);
      }
    }
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  async resetAll(): Promise<void> {
    this.hits.clear();
  }

  // 定期清理過期數據
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      for (const [key, timestamps] of this.hits.entries()) {
        const validTimestamps = timestamps.filter(t => t > windowStart);
        if (validTimestamps.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, validTimestamps);
        }
      }
    }, this.windowMs);
  }
}

// ==================== Token Bucket 實現 ====================

/**
 * Token Bucket 速率限制器
 */
class TokenBucket {
  private buckets: Map<string, TokenBucketEntry> = new Map();
  private capacity: number;
  private refillRate: number; // tokens per second
  private refillInterval: number; // milliseconds

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = 1000; // 每秒補充

    // 啟動定期補充
    this.startRefill();
  }

  /**
   * 嘗試消費 token
   */
  tryConsume(key: string, tokens: number = 1): boolean {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: Date.now()
      };
      this.buckets.set(key, bucket);
    }

    // 補充 tokens
    this.refillBucket(bucket);

    // 檢查是否有足夠的 tokens
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * 補充 bucket 的 tokens
   */
  private refillBucket(bucket: TokenBucketEntry): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / this.refillInterval) * this.refillRate;

    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * 定期清理空的 buckets
   */
  private startRefill(): void {
    setInterval(() => {
      for (const [key, bucket] of this.buckets.entries()) {
        this.refillBucket(bucket);
        // 如果 bucket 已滿且長時間未使用，則刪除
        if (bucket.tokens === this.capacity && Date.now() - bucket.lastRefill > 60000) {
          this.buckets.delete(key);
        }
      }
    }, this.refillInterval);
  }

  /**
   * 獲取剩餘 tokens
   */
  getRemainingTokens(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.capacity;

    this.refillBucket(bucket);
    return Math.floor(bucket.tokens);
  }
}

// ==================== 基礎速率限制配置 ====================

/**
 * 全局速率限制 - 每 15 分鐘 100 個請求
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false, // 禁用 X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        retryAfter: res.getHeader('RateLimit-Reset')
      }
    });
  }
});

/**
 * 嚴格的速率限制 - 用於敏感操作（登錄、註冊等）
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 每 15 分鐘只允許 5 次請求
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts, please try again later.'
    }
  }
});

/**
 * API 端點速率限制 - 每分鐘 60 個請求
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    error: {
      code: 'API_RATE_LIMIT_EXCEEDED',
      message: 'API rate limit exceeded. Maximum 60 requests per minute.'
    }
  }
});

/**
 * 創建端點速率限制 - 每小時 10 個請求
 */
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: {
      code: 'CREATE_RATE_LIMIT_EXCEEDED',
      message: 'Too many items created, please try again later.'
    }
  }
});

// ==================== 滑動窗口速率限制 ====================

/**
 * 滑動窗口速率限制器
 */
const slidingWindowStore = new SlidingWindowStore(60 * 1000, 30); // 1分鐘內最多30個請求
slidingWindowStore.startCleanup();

const slidingWindowLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  store: slidingWindowStore as any,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded with sliding window algorithm'
    }
  }
});

// ==================== 速度減慢中間件 ====================

/**
 * 速度減慢 - 當請求頻繁時逐漸增加延遲
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // 超過 50 個請求後開始延遲
  delayMs: (hits) => hits * 100, // 每個請求增加 100ms 延遲
  maxDelayMs: 5000 // 最大延遲 5 秒
});

// ==================== Token Bucket 中間件 ====================

const tokenBucket = new TokenBucket(10, 2); // 容量 10，每秒補充 2 個

/**
 * Token Bucket 速率限制中間件
 */
function tokenBucketLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';

  if (tokenBucket.tryConsume(key)) {
    const remaining = tokenBucket.getRemainingTokens(key);
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    next();
  } else {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Token bucket exhausted. Please try again later.'
      }
    });
  }
}

// ==================== 基於用戶的速率限制 ====================

/**
 * 基於用戶 ID 的速率限制
 */
const userBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // 認證用戶有更高的限制
  keyGenerator: (req: Request) => {
    // 使用用戶 ID 作為 key（如果已認證）
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
  skip: (req: Request) => {
    // 管理員不受限制
    return (req as any).user?.role === 'admin';
  },
  message: {
    success: false,
    error: {
      code: 'USER_RATE_LIMIT_EXCEEDED',
      message: 'You have exceeded your rate limit.'
    }
  }
});

// ==================== 動態速率限制 ====================

/**
 * 動態速率限制 - 根據端點和用戶類型調整限制
 */
function dynamicRateLimiter(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const endpoint = req.path;

  let maxRequests = 60; // 默認：每分鐘 60 個請求
  let windowMs = 60 * 1000;

  // 根據用戶角色調整限制
  if (user) {
    if (user.role === 'premium') {
      maxRequests = 200;
    } else if (user.role === 'admin') {
      return next(); // 管理員不受限制
    }
  }

  // 根據端點調整限制
  if (endpoint.startsWith('/api/search')) {
    maxRequests = Math.floor(maxRequests / 2); // 搜索端點限制更嚴格
  }

  const limiter = rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator: (req: Request) => {
      return user ? `user:${user.id}` : `ip:${req.ip}`;
    }
  });

  limiter(req, res, next);
}

// ==================== 自定義速率限制處理器 ====================

/**
 * 記錄速率限制事件
 */
function logRateLimitEvent(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (res.statusCode === 429) {
      console.log(`[Rate Limit] IP: ${req.ip}, Path: ${req.path}, Time: ${new Date().toISOString()}`);
    }
    return originalJson(body);
  };

  next();
}

// ==================== 路由 ====================

app.use(logRateLimitEvent);

/**
 * GET / - 首頁（全局限制）
 */
app.get('/', globalLimiter, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to Rate Limiting API',
    documentation: '/api/docs'
  });
});

/**
 * POST /auth/login - 登錄（嚴格限制）
 */
app.post('/auth/login', strictLimiter, (req: Request, res: Response) => {
  const { username, password } = req.body;

  // 模擬登錄邏輯
  if (username === 'admin' && password === 'password') {
    res.json({
      success: true,
      data: {
        token: 'fake-jwt-token',
        user: { id: 1, username: 'admin', role: 'admin' }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      }
    });
  }
});

/**
 * POST /auth/register - 註冊（嚴格限制）
 */
app.post('/auth/register', strictLimiter, (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: 'User registered successfully'
  });
});

/**
 * GET /api/data - API 數據（API 限制）
 */
app.get('/api/data', apiLimiter, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      items: [1, 2, 3, 4, 5]
    }
  });
});

/**
 * POST /api/items - 創建項目（創建限制）
 */
app.post('/api/items', createLimiter, (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: 'Item created successfully'
  });
});

/**
 * GET /api/sliding - 滑動窗口限制
 */
app.get('/api/sliding', slidingWindowLimiter, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'This endpoint uses sliding window rate limiting',
    algorithm: 'sliding-window'
  });
});

/**
 * GET /api/token-bucket - Token Bucket 限制
 */
app.get('/api/token-bucket', tokenBucketLimiter, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'This endpoint uses token bucket rate limiting',
    algorithm: 'token-bucket'
  });
});

/**
 * GET /api/slow - 速度減慢
 */
app.get('/api/slow', speedLimiter, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'This endpoint gradually slows down when overused',
    algorithm: 'speed-limiter'
  });
});

/**
 * GET /api/user-based - 基於用戶的限制
 */
app.get('/api/user-based', userBasedLimiter, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'This endpoint uses user-based rate limiting',
    algorithm: 'user-based'
  });
});

/**
 * GET /api/dynamic - 動態速率限制
 */
app.get('/api/dynamic', dynamicRateLimiter, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'This endpoint uses dynamic rate limiting',
    algorithm: 'dynamic'
  });
});

/**
 * GET /api/search - 搜索（動態限制，更嚴格）
 */
app.get('/api/search', dynamicRateLimiter, (req: Request, res: Response) => {
  const { query } = req.query;
  res.json({
    success: true,
    data: {
      query,
      results: []
    }
  });
});

/**
 * GET /api/unlimited - 無限制端點（用於測試）
 */
app.get('/api/unlimited', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'This endpoint has no rate limiting'
  });
});

/**
 * GET /api/rate-limit-status - 查看速率限制狀態
 */
app.get('/api/rate-limit-status', (req: Request, res: Response) => {
  const rateLimitInfo = {
    limit: res.getHeader('RateLimit-Limit'),
    remaining: res.getHeader('RateLimit-Remaining'),
    reset: res.getHeader('RateLimit-Reset')
  };

  res.json({
    success: true,
    data: {
      rateLimit: rateLimitInfo,
      endpoints: {
        '/': 'Global limit: 100 requests per 15 minutes',
        '/auth/login': 'Strict limit: 5 requests per 15 minutes',
        '/auth/register': 'Strict limit: 5 requests per 15 minutes',
        '/api/data': 'API limit: 60 requests per minute',
        '/api/items': 'Create limit: 10 requests per hour',
        '/api/sliding': 'Sliding window: 30 requests per minute',
        '/api/token-bucket': 'Token bucket: 10 tokens, refill 2/second',
        '/api/slow': 'Speed limiter: Slows down after 50 requests',
        '/api/user-based': 'User-based: 200 requests per 15 minutes',
        '/api/dynamic': 'Dynamic: Varies by user and endpoint',
        '/api/unlimited': 'No rate limiting'
      }
    }
  });
});

// ==================== 錯誤處理 ====================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// ==================== 啟動服務器 ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('\n=== Rate Limiting API ===');
  console.log('\nEndpoints with different rate limiting strategies:');
  console.log('\nGlobal Rate Limiting:');
  console.log('  GET  / - 100 requests per 15 minutes');
  console.log('\nStrict Rate Limiting (Auth):');
  console.log('  POST /auth/login - 5 requests per 15 minutes');
  console.log('  POST /auth/register - 5 requests per 15 minutes');
  console.log('\nAPI Rate Limiting:');
  console.log('  GET  /api/data - 60 requests per minute');
  console.log('  POST /api/items - 10 requests per hour');
  console.log('\nAdvanced Algorithms:');
  console.log('  GET  /api/sliding - Sliding window (30/min)');
  console.log('  GET  /api/token-bucket - Token bucket (10 tokens, refill 2/sec)');
  console.log('  GET  /api/slow - Speed limiter (delays after 50 requests)');
  console.log('  GET  /api/user-based - User-based limiting');
  console.log('  GET  /api/dynamic - Dynamic limiting');
  console.log('  GET  /api/search - Search (stricter dynamic limit)');
  console.log('\nUtility Endpoints:');
  console.log('  GET  /api/unlimited - No rate limiting');
  console.log('  GET  /api/rate-limit-status - View rate limit status');
  console.log('\nRate Limit Headers:');
  console.log('  RateLimit-Limit - Total number of requests allowed');
  console.log('  RateLimit-Remaining - Number of requests remaining');
  console.log('  RateLimit-Reset - Time when the rate limit resets');
  console.log('\nExample usage:');
  console.log('  # Test global rate limit');
  console.log('  for i in {1..10}; do curl http://localhost:3000/; done');
  console.log('\n  # Test strict rate limit');
  console.log('  for i in {1..10}; do curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d \'{"username":"test","password":"test"}\'; done');
  console.log('\n  # Check rate limit status');
  console.log('  curl -v http://localhost:3000/api/rate-limit-status');
});

export default app;
