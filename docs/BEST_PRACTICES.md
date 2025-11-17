# Node.js 最佳實踐指南

## 目錄
- [代碼結構與組織](#代碼結構與組織)
- [錯誤處理](#錯誤處理)
- [異步編程](#異步編程)
- [模塊化設計](#模塊化設計)
- [配置管理](#配置管理)
- [日誌記錄](#日誌記錄)
- [常見錯誤](#常見錯誤)
- [推薦工具](#推薦工具)

## 代碼結構與組織

### 1. 項目結構最佳實踐

```
project/
├── src/
│   ├── controllers/    # 控制器層
│   ├── services/       # 業務邏輯層
│   ├── models/         # 數據模型
│   ├── routes/         # 路由定義
│   ├── middleware/     # 中間件
│   ├── utils/          # 工具函數
│   └── config/         # 配置文件
├── tests/              # 測試文件
├── docs/               # 文檔
├── scripts/            # 腳本文件
├── .env.example        # 環境變量示例
├── package.json
└── README.md
```

### 2. 單一職責原則

**不好的做法：**
```javascript
// ❌ 一個函數做太多事情
function processUser(userData) {
  // 驗證
  if (!userData.email) throw new Error('Email required');

  // 數據庫操作
  const user = db.createUser(userData);

  // 發送郵件
  emailService.sendWelcome(user.email);

  // 日誌記錄
  logger.info(`User created: ${user.id}`);

  return user;
}
```

**好的做法：**
```javascript
// ✅ 每個函數職責單一
class UserService {
  async createUser(userData) {
    const validatedData = this.validateUserData(userData);
    const user = await this.saveUser(validatedData);
    await this.sendWelcomeEmail(user);
    this.logUserCreation(user);
    return user;
  }

  validateUserData(userData) {
    if (!userData.email) {
      throw new ValidationError('Email required');
    }
    if (!userData.name) {
      throw new ValidationError('Name required');
    }
    return userData;
  }

  async saveUser(userData) {
    return await db.users.create(userData);
  }

  async sendWelcomeEmail(user) {
    await emailService.send({
      to: user.email,
      template: 'welcome',
      data: { name: user.name }
    });
  }

  logUserCreation(user) {
    logger.info('User created', { userId: user.id, email: user.email });
  }
}
```

## 錯誤處理

### 1. 使用自定義錯誤類

```javascript
// 定義自定義錯誤類
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

// 使用示例
async function getUser(userId) {
  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const user = await db.users.findById(userId);

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}
```

### 2. 全局錯誤處理中間件（Express）

```javascript
// errorHandler.js
const errorHandler = (err, req, res, next) => {
  // 記錄錯誤
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // 默認錯誤響應
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  // 開發環境返回詳細錯誤信息
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      error: {
        message: err.message,
        stack: err.stack,
        timestamp: err.timestamp
      }
    });
  }

  // 生產環境只返回必要信息
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      timestamp: err.timestamp || new Date().toISOString()
    }
  });
};

// 未捕獲的異步錯誤處理
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 使用示例
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  res.json({ success: true, data: user });
}));

app.use(errorHandler);
```

### 3. Promise 錯誤處理

```javascript
// ❌ 不好的做法：忘記處理錯誤
async function badExample() {
  const data = await fetchData(); // 如果失敗會導致未處理的 rejection
  return data;
}

// ✅ 好的做法：正確處理錯誤
async function goodExample() {
  try {
    const data = await fetchData();
    return { success: true, data };
  } catch (error) {
    logger.error('Failed to fetch data:', error);
    return { success: false, error: error.message };
  }
}

// ✅ 更好的做法：統一錯誤處理
async function betterExample() {
  const data = await fetchData(); // 讓上層處理錯誤
  return data;
}
```

## 異步編程

### 1. 避免回調地獄

**不好的做法：**
```javascript
// ❌ 回調地獄
function processOrder(orderId, callback) {
  getOrder(orderId, (err, order) => {
    if (err) return callback(err);

    getUser(order.userId, (err, user) => {
      if (err) return callback(err);

      processPayment(order.amount, user.paymentMethod, (err, payment) => {
        if (err) return callback(err);

        updateInventory(order.items, (err, inventory) => {
          if (err) return callback(err);

          sendConfirmation(user.email, order, (err) => {
            if (err) return callback(err);
            callback(null, { order, payment, inventory });
          });
        });
      });
    });
  });
}
```

**好的做法：**
```javascript
// ✅ 使用 async/await
async function processOrder(orderId) {
  const order = await getOrder(orderId);
  const user = await getUser(order.userId);
  const payment = await processPayment(order.amount, user.paymentMethod);
  const inventory = await updateInventory(order.items);
  await sendConfirmation(user.email, order);

  return { order, payment, inventory };
}
```

### 2. 並發控制

```javascript
// ❌ 串行執行（慢）
async function fetchUserDataSerial(userIds) {
  const users = [];
  for (const id of userIds) {
    const user = await fetchUser(id); // 等待每個請求完成
    users.push(user);
  }
  return users;
}

// ✅ 並行執行（快）
async function fetchUserDataParallel(userIds) {
  const promises = userIds.map(id => fetchUser(id));
  return await Promise.all(promises);
}

// ✅ 控制並發數量（避免過載）
async function fetchUserDataConcurrent(userIds, concurrency = 5) {
  const results = [];

  for (let i = 0; i < userIds.length; i += concurrency) {
    const batch = userIds.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(id => fetchUser(id))
    );
    results.push(...batchResults);
  }

  return results;
}

// ✅ 使用 p-limit 庫（推薦）
const pLimit = require('p-limit');

async function fetchUserDataWithLimit(userIds) {
  const limit = pLimit(5); // 最多5個並發

  const promises = userIds.map(id =>
    limit(() => fetchUser(id))
  );

  return await Promise.all(promises);
}
```

### 3. 錯誤處理與重試

```javascript
// 實現帶重試的異步函數
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  const { retryDelay = 1000, retryBackoff = 2 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        logger.error(`Failed after ${maxRetries} retries:`, error);
        throw error;
      }

      const delay = retryDelay * Math.pow(retryBackoff, attempt);
      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Promise.allSettled 處理部分失敗
async function fetchMultipleResources(urls) {
  const results = await Promise.allSettled(
    urls.map(url => fetch(url))
  );

  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  const failed = results
    .filter(r => r.status === 'rejected')
    .map((r, i) => ({ url: urls[i], error: r.reason }));

  if (failed.length > 0) {
    logger.warn('Some requests failed:', failed);
  }

  return successful;
}
```

## 模塊化設計

### 1. 模塊導出最佳實踐

```javascript
// ❌ 不好的做法：混用導出
module.exports = function main() { /* ... */ };
module.exports.helper = function() { /* ... */ };
exports.another = function() { /* ... */ };

// ✅ 好的做法：使用命名導出
// utils.js
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function parseDate(dateString) {
  return new Date(dateString);
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}

module.exports = {
  formatDate,
  parseDate,
  isValidDate
};

// ✅ 或使用 ES6 模塊語法
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function parseDate(dateString) {
  return new Date(dateString);
}

export function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}
```

### 2. 依賴注入

```javascript
// ✅ 使用依賴注入提高可測試性
class UserService {
  constructor({ database, emailService, logger }) {
    this.db = database;
    this.emailService = emailService;
    this.logger = logger;
  }

  async createUser(userData) {
    try {
      const user = await this.db.users.create(userData);
      await this.emailService.sendWelcome(user.email);
      this.logger.info('User created', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', { error, userData });
      throw error;
    }
  }
}

// 初始化
const userService = new UserService({
  database: require('./database'),
  emailService: require('./services/email'),
  logger: require('./utils/logger')
});

// 測試時可以注入 mock 對象
const testUserService = new UserService({
  database: mockDatabase,
  emailService: mockEmailService,
  logger: mockLogger
});
```

## 配置管理

### 1. 環境變量管理

```javascript
// config/index.js
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'myapp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10
    }
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 3600
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@example.com'
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log'
  }
};

// 驗證必需的配置
const requiredEnvVars = [
  'DB_PASSWORD',
  'JWT_SECRET',
  'EMAIL_PASSWORD'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = config;
```

### 2. .env 文件示例

```bash
# .env.example
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@example.com

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

## 日誌記錄

### 1. 結構化日誌

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'myapp' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// 開發環境添加控制台輸出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 使用示例
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip: req.ip
});

logger.error('Payment failed', {
  orderId: order.id,
  amount: order.amount,
  error: error.message,
  stack: error.stack
});

module.exports = logger;
```

## 常見錯誤

### 1. 未處理的 Promise Rejection

```javascript
// ❌ 錯誤：未處理的 rejection
async function riskyOperation() {
  throw new Error('Something went wrong');
}

riskyOperation(); // UnhandledPromiseRejectionWarning

// ✅ 正確：處理錯誤
riskyOperation().catch(err => {
  logger.error('Operation failed:', err);
});

// ✅ 全局處理
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  // 在生產環境中，考慮優雅關閉
  process.exit(1);
});
```

### 2. 內存泄漏

```javascript
// ❌ 錯誤：事件監聽器未清理
class DataProcessor {
  constructor(eventEmitter) {
    eventEmitter.on('data', this.processData.bind(this));
  }

  processData(data) {
    // 處理數據
  }
}

// ✅ 正確：清理事件監聽器
class DataProcessor {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.handler = this.processData.bind(this);
    eventEmitter.on('data', this.handler);
  }

  processData(data) {
    // 處理數據
  }

  destroy() {
    this.eventEmitter.removeListener('data', this.handler);
  }
}
```

### 3. 阻塞事件循環

```javascript
// ❌ 錯誤：同步阻塞操作
const fs = require('fs');
const data = fs.readFileSync('huge-file.txt'); // 阻塞！

// ✅ 正確：使用異步操作
const fs = require('fs').promises;
const data = await fs.readFile('huge-file.txt');

// ❌ 錯誤：長時間的同步計算
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
const result = fibonacci(40); // 阻塞事件循環！

// ✅ 正確：使用 Worker Threads
const { Worker } = require('worker_threads');

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./fibonacci-worker.js', { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

const result = await runWorker({ n: 40 });
```

## 推薦工具

### 代碼質量工具
- **ESLint** - JavaScript 代碼檢查
- **Prettier** - 代碼格式化
- **Husky** - Git hooks 管理
- **lint-staged** - 對暫存文件運行 linters

### 測試工具
- **Jest** - 測試框架
- **Supertest** - HTTP 接口測試
- **nock** - HTTP 請求 mock
- **sinon** - 函數 spy/stub/mock

### 監控與調試
- **winston** - 日誌記錄
- **pino** - 高性能日誌庫
- **node-inspector** - 調試工具
- **clinic.js** - 性能分析

### 開發工具
- **nodemon** - 自動重啟
- **dotenv** - 環境變量管理
- **pm2** - 進程管理器
- **nvm** - Node 版本管理

### 文檔工具
- **JSDoc** - API 文檔生成
- **Swagger/OpenAPI** - API 文檔規範
- **TypeDoc** - TypeScript 文檔

## 參考資源

- [Node.js 官方文檔](https://nodejs.org/docs/)
- [Node.js 最佳實踐](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
