# Node.js 常見設計模式指南

## 目錄
- [創建型模式](#創建型模式)
- [結構型模式](#結構型模式)
- [行為型模式](#行為型模式)
- [異步模式](#異步模式)
- [架構模式](#架構模式)
- [中間件模式](#中間件模式)
- [錯誤處理模式](#錯誤處理模式)
- [數據訪問模式](#數據訪問模式)
- [實際應用](#實際應用)

## 創建型模式

### 1. 單例模式（Singleton）

```javascript
// 數據庫連接單例
class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.connection = null;
    Database.instance = this;
  }

  async connect() {
    if (this.connection) {
      return this.connection;
    }

    this.connection = await createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    return this.connection;
  }

  async query(sql, params) {
    const conn = await this.connect();
    return conn.query(sql, params);
  }
}

// 使用
const db1 = new Database();
const db2 = new Database();
console.log(db1 === db2); // true

// 或使用模塊緩存
// database.js
let instance = null;

async function getDatabase() {
  if (!instance) {
    instance = await createConnection(config);
  }
  return instance;
}

module.exports = getDatabase;
```

### 2. 工廠模式（Factory）

```javascript
// 簡單工廠
class UserFactory {
  static createUser(type, data) {
    switch (type) {
      case 'admin':
        return new AdminUser(data);
      case 'regular':
        return new RegularUser(data);
      case 'guest':
        return new GuestUser(data);
      default:
        throw new Error(`未知的用戶類型: ${type}`);
    }
  }
}

class AdminUser {
  constructor(data) {
    this.name = data.name;
    this.email = data.email;
    this.role = 'admin';
    this.permissions = ['read', 'write', 'delete', 'admin'];
  }

  can(permission) {
    return this.permissions.includes(permission);
  }
}

class RegularUser {
  constructor(data) {
    this.name = data.name;
    this.email = data.email;
    this.role = 'user';
    this.permissions = ['read', 'write'];
  }

  can(permission) {
    return this.permissions.includes(permission);
  }
}

class GuestUser {
  constructor(data) {
    this.name = 'Guest';
    this.role = 'guest';
    this.permissions = ['read'];
  }

  can(permission) {
    return this.permissions.includes(permission);
  }
}

// 使用
const admin = UserFactory.createUser('admin', {
  name: 'John',
  email: 'john@example.com'
});

// 抽象工廠
class DatabaseFactory {
  static createDatabase(type) {
    switch (type) {
      case 'mysql':
        return new MySQLDatabase();
      case 'postgres':
        return new PostgreSQLDatabase();
      case 'mongodb':
        return new MongoDatabase();
      default:
        throw new Error(`不支持的數據庫類型: ${type}`);
    }
  }
}

// 使用
const db = DatabaseFactory.createDatabase(process.env.DB_TYPE);
await db.connect();
```

### 3. 建造者模式（Builder）

```javascript
// HTTP 請求構建器
class RequestBuilder {
  constructor(url) {
    this.url = url;
    this.method = 'GET';
    this.headers = {};
    this.queryParams = {};
    this.body = null;
    this.timeout = 30000;
  }

  setMethod(method) {
    this.method = method;
    return this;
  }

  setHeader(key, value) {
    this.headers[key] = value;
    return this;
  }

  setHeaders(headers) {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  setQueryParam(key, value) {
    this.queryParams[key] = value;
    return this;
  }

  setQueryParams(params) {
    this.queryParams = { ...this.queryParams, ...params };
    return this;
  }

  setBody(body) {
    this.body = body;
    return this;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
    return this;
  }

  async send() {
    const url = new URL(this.url);

    // 添加查詢參數
    Object.entries(this.queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const options = {
      method: this.method,
      headers: this.headers,
      timeout: this.timeout
    };

    if (this.body) {
      options.body = JSON.stringify(this.body);
      options.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url.toString(), options);
    return response.json();
  }
}

// 使用
const response = await new RequestBuilder('https://api.example.com/users')
  .setMethod('POST')
  .setHeader('Authorization', 'Bearer token')
  .setQueryParam('limit', 10)
  .setBody({ name: 'John', email: 'john@example.com' })
  .setTimeout(5000)
  .send();

// 查詢構建器
class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.selectFields = ['*'];
    this.whereConditions = [];
    this.orderByFields = [];
    this.limitValue = null;
    this.offsetValue = null;
  }

  select(...fields) {
    this.selectFields = fields;
    return this;
  }

  where(field, operator, value) {
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this.orderByFields.push({ field, direction });
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  offset(value) {
    this.offsetValue = value;
    return this;
  }

  build() {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.table}`;

    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions
        .map(c => `${c.field} ${c.operator} ?`)
        .join(' AND ');
      sql += ` WHERE ${conditions}`;
    }

    if (this.orderByFields.length > 0) {
      const orderBy = this.orderByFields
        .map(o => `${o.field} ${o.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }

    if (this.limitValue) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    const values = this.whereConditions.map(c => c.value);

    return { sql, values };
  }
}

// 使用
const { sql, values } = new QueryBuilder('users')
  .select('id', 'name', 'email')
  .where('status', '=', 'active')
  .where('age', '>', 18)
  .orderBy('created_at', 'DESC')
  .limit(10)
  .offset(0)
  .build();

console.log(sql);
// SELECT id, name, email FROM users WHERE status = ? AND age > ? ORDER BY created_at DESC LIMIT 10 OFFSET 0
```

## 結構型模式

### 1. 適配器模式（Adapter）

```javascript
// 舊的支付接口
class OldPaymentService {
  processPayment(amount, cardNumber) {
    console.log(`處理支付: $${amount}`);
    return { success: true, transactionId: '12345' };
  }
}

// 新的支付接口
class NewPaymentGateway {
  charge(paymentDetails) {
    console.log(`收費: $${paymentDetails.amount}`);
    return {
      status: 'success',
      id: 'txn_67890',
      timestamp: new Date()
    };
  }
}

// 適配器
class PaymentAdapter {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  processPayment(amount, cardNumber) {
    // 適配新接口
    if (this.paymentService instanceof NewPaymentGateway) {
      const result = this.paymentService.charge({
        amount,
        card: cardNumber,
        currency: 'USD'
      });

      return {
        success: result.status === 'success',
        transactionId: result.id
      };
    }

    // 使用舊接口
    return this.paymentService.processPayment(amount, cardNumber);
  }
}

// 使用
const oldService = new OldPaymentService();
const adapter1 = new PaymentAdapter(oldService);

const newGateway = new NewPaymentGateway();
const adapter2 = new PaymentAdapter(newGateway);

// 兩者使用相同的接口
adapter1.processPayment(100, '4111-1111-1111-1111');
adapter2.processPayment(100, '4111-1111-1111-1111');
```

### 2. 裝飾器模式（Decorator）

```javascript
// 基礎日誌記錄器
class Logger {
  log(message) {
    console.log(message);
  }
}

// 時間戳裝飾器
class TimestampDecorator {
  constructor(logger) {
    this.logger = logger;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    this.logger.log(`[${timestamp}] ${message}`);
  }
}

// 級別裝飾器
class LevelDecorator {
  constructor(logger, level = 'INFO') {
    this.logger = logger;
    this.level = level;
  }

  log(message) {
    this.logger.log(`[${this.level}] ${message}`);
  }
}

// 顏色裝飾器
class ColorDecorator {
  constructor(logger, color = '\x1b[0m') {
    this.logger = logger;
    this.color = color;
  }

  log(message) {
    this.logger.log(`${this.color}${message}\x1b[0m`);
  }
}

// 使用 - 疊加多個裝飾器
let logger = new Logger();
logger = new TimestampDecorator(logger);
logger = new LevelDecorator(logger, 'ERROR');
logger = new ColorDecorator(logger, '\x1b[31m'); // 紅色

logger.log('這是一個錯誤'); // [2024-01-01T12:00:00.000Z] [ERROR] 這是一個錯誤

// 方法裝飾器（使用 TypeScript 裝飾器語法）
function measureTime(target, propertyKey, descriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args) {
    const start = Date.now();
    const result = await originalMethod.apply(this, args);
    const duration = Date.now() - start;

    console.log(`${propertyKey} 執行時間: ${duration}ms`);
    return result;
  };

  return descriptor;
}

function cache(ttl = 60000) {
  const cache = new Map();

  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const key = JSON.stringify(args);
      const cached = cache.get(key);

      if (cached && Date.now() - cached.timestamp < ttl) {
        console.log('從緩存返回');
        return cached.value;
      }

      const result = await originalMethod.apply(this, args);

      cache.set(key, {
        value: result,
        timestamp: Date.now()
      });

      return result;
    };

    return descriptor;
  };
}

// 使用裝飾器
class UserService {
  @measureTime
  @cache(5000)
  async getUser(userId) {
    // 模擬數據庫查詢
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: userId, name: 'John' };
  }
}
```

### 3. 代理模式（Proxy）

```javascript
// 虛擬代理 - 延遲初始化
class DatabaseProxy {
  constructor() {
    this.database = null;
  }

  async getConnection() {
    if (!this.database) {
      console.log('初始化數據庫連接...');
      this.database = await createDatabaseConnection();
    }
    return this.database;
  }

  async query(sql) {
    const db = await this.getConnection();
    return db.query(sql);
  }
}

// 保護代理 - 訪問控制
class ProtectedResource {
  constructor(resource, user) {
    this.resource = resource;
    this.user = user;
  }

  read() {
    if (this.user.hasPermission('read')) {
      return this.resource.read();
    }
    throw new Error('沒有讀取權限');
  }

  write(data) {
    if (this.user.hasPermission('write')) {
      return this.resource.write(data);
    }
    throw new Error('沒有寫入權限');
  }

  delete() {
    if (this.user.hasPermission('delete')) {
      return this.resource.delete();
    }
    throw new Error('沒有刪除權限');
  }
}

// 緩存代理
class CachedAPI {
  constructor(api) {
    this.api = api;
    this.cache = new Map();
  }

  async get(endpoint) {
    if (this.cache.has(endpoint)) {
      console.log('從緩存返回');
      return this.cache.get(endpoint);
    }

    const data = await this.api.get(endpoint);
    this.cache.set(endpoint, data);
    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}

// 使用 ES6 Proxy
const validator = {
  set(target, property, value) {
    if (property === 'age') {
      if (typeof value !== 'number') {
        throw new TypeError('年齡必須是數字');
      }
      if (value < 0 || value > 120) {
        throw new RangeError('年齡必須在 0-120 之間');
      }
    }

    if (property === 'email') {
      if (!value.includes('@')) {
        throw new TypeError('無效的郵箱地址');
      }
    }

    target[property] = value;
    return true;
  }
};

const user = new Proxy({}, validator);

user.age = 30;     // OK
user.email = 'john@example.com';  // OK
// user.age = -1;  // 拋出 RangeError
// user.email = 'invalid';  // 拋出 TypeError
```

## 行為型模式

### 1. 觀察者模式（Observer）

```javascript
// 事件發射器
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };

    this.on(event, onceWrapper);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;

    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, ...args) {
    if (!this.events[event]) return false;

    this.events[event].forEach(listener => {
      listener(...args);
    });

    return true;
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }
}

// 使用示例
class UserService extends EventEmitter {
  async createUser(userData) {
    const user = await db.users.create(userData);

    // 發出事件
    this.emit('user:created', user);

    return user;
  }

  async deleteUser(userId) {
    await db.users.destroy({ where: { id: userId } });

    this.emit('user:deleted', userId);
  }
}

const userService = new UserService();

// 訂閱事件
userService.on('user:created', (user) => {
  console.log('新用戶創建:', user.email);
  emailService.sendWelcome(user.email);
});

userService.on('user:created', (user) => {
  analytics.track('User Created', { userId: user.id });
});

userService.on('user:deleted', (userId) => {
  console.log('用戶已刪除:', userId);
  cacheService.invalidate(`user:${userId}`);
});
```

### 2. 策略模式（Strategy）

```javascript
// 支付策略
class PaymentStrategy {
  pay(amount) {
    throw new Error('必須實現 pay 方法');
  }
}

class CreditCardStrategy extends PaymentStrategy {
  constructor(cardNumber, cvv) {
    super();
    this.cardNumber = cardNumber;
    this.cvv = cvv;
  }

  pay(amount) {
    console.log(`使用信用卡支付 $${amount}`);
    // 信用卡支付邏輯
    return { success: true, method: 'credit_card' };
  }
}

class PayPalStrategy extends PaymentStrategy {
  constructor(email) {
    super();
    this.email = email;
  }

  pay(amount) {
    console.log(`使用 PayPal 支付 $${amount}`);
    // PayPal 支付邏輯
    return { success: true, method: 'paypal' };
  }
}

class CryptoStrategy extends PaymentStrategy {
  constructor(walletAddress) {
    super();
    this.walletAddress = walletAddress;
  }

  pay(amount) {
    console.log(`使用加密貨幣支付 $${amount}`);
    // 加密貨幣支付邏輯
    return { success: true, method: 'crypto' };
  }
}

// 支付處理器
class PaymentProcessor {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  processPayment(amount) {
    return this.strategy.pay(amount);
  }
}

// 使用
const processor = new PaymentProcessor(
  new CreditCardStrategy('4111-1111-1111-1111', '123')
);
processor.processPayment(100);

// 切換策略
processor.setStrategy(new PayPalStrategy('user@example.com'));
processor.processPayment(50);

// 排序策略
class SortStrategy {
  sort(data) {
    throw new Error('必須實現 sort 方法');
  }
}

class BubbleSort extends SortStrategy {
  sort(data) {
    console.log('使用冒泡排序');
    // 冒泡排序實現
    return data.sort((a, b) => a - b);
  }
}

class QuickSort extends SortStrategy {
  sort(data) {
    console.log('使用快速排序');
    // 快速排序實現
    return data.sort((a, b) => a - b);
  }
}

class Sorter {
  constructor(strategy) {
    this.strategy = strategy;
  }

  sort(data) {
    return this.strategy.sort(data);
  }
}

// 根據數據大小選擇策略
function createSorter(dataSize) {
  if (dataSize < 100) {
    return new Sorter(new BubbleSort());
  } else {
    return new Sorter(new QuickSort());
  }
}
```

### 3. 責任鏈模式（Chain of Responsibility）

```javascript
// 中間件鏈
class Handler {
  constructor() {
    this.nextHandler = null;
  }

  setNext(handler) {
    this.nextHandler = handler;
    return handler;
  }

  async handle(request) {
    if (this.nextHandler) {
      return this.nextHandler.handle(request);
    }
    return request;
  }
}

// 身份驗證處理器
class AuthHandler extends Handler {
  async handle(request) {
    console.log('檢查身份驗證...');

    if (!request.headers.authorization) {
      throw new Error('未授權');
    }

    const token = request.headers.authorization.split(' ')[1];
    request.user = await verifyToken(token);

    return super.handle(request);
  }
}

// 權限檢查處理器
class PermissionHandler extends Handler {
  constructor(requiredPermission) {
    super();
    this.requiredPermission = requiredPermission;
  }

  async handle(request) {
    console.log('檢查權限...');

    if (!request.user.permissions.includes(this.requiredPermission)) {
      throw new Error('權限不足');
    }

    return super.handle(request);
  }
}

// 速率限制處理器
class RateLimitHandler extends Handler {
  constructor(limit, window) {
    super();
    this.limit = limit;
    this.window = window;
    this.requests = new Map();
  }

  async handle(request) {
    console.log('檢查速率限制...');

    const userId = request.user.id;
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // 清除過期的請求
    const validRequests = userRequests.filter(
      time => now - time < this.window
    );

    if (validRequests.length >= this.limit) {
      throw new Error('請求過於頻繁');
    }

    validRequests.push(now);
    this.requests.set(userId, validRequests);

    return super.handle(request);
  }
}

// 日誌處理器
class LogHandler extends Handler {
  async handle(request) {
    console.log('記錄請求:', {
      method: request.method,
      path: request.path,
      user: request.user?.id
    });

    return super.handle(request);
  }
}

// 構建處理鏈
const authHandler = new AuthHandler();
const permissionHandler = new PermissionHandler('admin');
const rateLimitHandler = new RateLimitHandler(10, 60000); // 10次/分鐘
const logHandler = new LogHandler();

authHandler
  .setNext(permissionHandler)
  .setNext(rateLimitHandler)
  .setNext(logHandler);

// 使用
async function processRequest(request) {
  try {
    await authHandler.handle(request);
    // 處理請求...
  } catch (error) {
    console.error('請求處理失敗:', error.message);
  }
}
```

## 異步模式

### 1. Promise 鏈模式

```javascript
// Promise 鏈
function processUser(userId) {
  return getUser(userId)
    .then(user => validateUser(user))
    .then(user => enrichUserData(user))
    .then(user => saveUser(user))
    .then(user => sendNotification(user))
    .catch(error => {
      console.error('處理失敗:', error);
      throw error;
    });
}

// async/await 更清晰
async function processUser(userId) {
  try {
    const user = await getUser(userId);
    const validated = await validateUser(user);
    const enriched = await enrichUserData(validated);
    const saved = await saveUser(enriched);
    await sendNotification(saved);
    return saved;
  } catch (error) {
    console.error('處理失敗:', error);
    throw error;
  }
}
```

### 2. 並行執行模式

```javascript
// Promise.all - 並行執行，全部成功
async function fetchAllData(userId) {
  const [user, posts, comments] = await Promise.all([
    fetchUser(userId),
    fetchPosts(userId),
    fetchComments(userId)
  ]);

  return { user, posts, comments };
}

// Promise.allSettled - 並行執行，允許部分失敗
async function fetchAllDataSafe(userId) {
  const results = await Promise.allSettled([
    fetchUser(userId),
    fetchPosts(userId),
    fetchComments(userId)
  ]);

  const [userResult, postsResult, commentsResult] = results;

  return {
    user: userResult.status === 'fulfilled' ? userResult.value : null,
    posts: postsResult.status === 'fulfilled' ? postsResult.value : [],
    comments: commentsResult.status === 'fulfilled' ? commentsResult.value : []
  };
}

// Promise.race - 返回最快完成的
async function fetchWithFallback(url) {
  return Promise.race([
    fetch(url),
    fetch(url + '/fallback'),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('超時')), 5000)
    )
  ]);
}

// Promise.any - 返回第一個成功的
async function fetchFromMirrors(mirrors) {
  return Promise.any(
    mirrors.map(mirror => fetch(mirror))
  ).catch(() => {
    throw new Error('所有鏡像都失敗了');
  });
}
```

### 3. 回調轉 Promise

```javascript
const { promisify } = require('util');
const fs = require('fs');

// 使用 promisify
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function processFile(inputPath, outputPath) {
  const content = await readFileAsync(inputPath, 'utf8');
  const processed = processContent(content);
  await writeFileAsync(outputPath, processed);
}

// 手動轉換
function callbackToPromise(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  };
}

// 使用
const readFile = callbackToPromise(fs.readFile);
const data = await readFile('file.txt', 'utf8');
```

## 架構模式

### 1. MVC 模式

```javascript
// Model
class UserModel {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    return this.db.users.findByPk(id);
  }

  async create(data) {
    return this.db.users.create(data);
  }

  async update(id, data) {
    return this.db.users.update(data, { where: { id } });
  }

  async delete(id) {
    return this.db.users.destroy({ where: { id } });
  }
}

// Controller
class UserController {
  constructor(userModel) {
    this.userModel = userModel;
  }

  async getUser(req, res) {
    try {
      const user = await this.userModel.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ error: '用戶不存在' });
      }

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createUser(req, res) {
    try {
      const user = await this.userModel.create(req.body);
      res.status(201).json({ user });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

// View (使用模板引擎)
// users/show.ejs
// <h1><%= user.name %></h1>
// <p><%= user.email %></p>

// 路由
const userModel = new UserModel(db);
const userController = new UserController(userModel);

app.get('/users/:id', (req, res) => userController.getUser(req, res));
app.post('/users', (req, res) => userController.createUser(req, res));
```

### 2. 分層架構

```javascript
// 表示層（Routes）
// routes/users.js
const express = require('express');
const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const user = await userController.getUser(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// 控制層（Controllers）
// controllers/userController.js
class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getUser(userId) {
    return this.userService.getUserById(userId);
  }

  async createUser(userData) {
    return this.userService.createUser(userData);
  }
}

// 業務邏輯層（Services）
// services/userService.js
class UserService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }

  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('用戶不存在');
    }

    return user;
  }

  async createUser(userData) {
    // 驗證
    this.validateUserData(userData);

    // 創建用戶
    const user = await this.userRepository.create(userData);

    // 發送歡迎郵件
    await this.emailService.sendWelcome(user.email);

    return user;
  }

  validateUserData(userData) {
    if (!userData.email) {
      throw new ValidationError('郵箱是必需的');
    }
    // 更多驗證...
  }
}

// 數據訪問層（Repositories）
// repositories/userRepository.js
class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    return this.db.users.findByPk(id);
  }

  async create(data) {
    return this.db.users.create(data);
  }

  async update(id, data) {
    return this.db.users.update(data, { where: { id } });
  }

  async delete(id) {
    return this.db.users.destroy({ where: { id } });
  }

  async findByEmail(email) {
    return this.db.users.findOne({ where: { email } });
  }
}
```

### 3. 依賴注入容器

```javascript
// container.js
class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  // 註冊服務
  register(name, definition, options = {}) {
    this.services.set(name, {
      definition,
      singleton: options.singleton || false
    });
  }

  // 解析服務
  resolve(name) {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`服務 ${name} 未註冊`);
    }

    // 單例模式
    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, this.createInstance(service.definition));
      }
      return this.singletons.get(name);
    }

    // 每次創建新實例
    return this.createInstance(service.definition);
  }

  createInstance(Definition) {
    if (typeof Definition === 'function') {
      // 自動解析構造函數的依賴
      return new Definition(this);
    }
    return Definition;
  }
}

// 使用示例
const container = new Container();

// 註冊服務
container.register('database', Database, { singleton: true });
container.register('userRepository', UserRepository);
container.register('emailService', EmailService, { singleton: true });
container.register('userService', UserService);
container.register('userController', UserController);

// 解析服務
const userController = container.resolve('userController');

// 在服務中使用容器
class UserService {
  constructor(container) {
    this.userRepository = container.resolve('userRepository');
    this.emailService = container.resolve('emailService');
  }
}
```

## 中間件模式

### 1. Express 中間件

```javascript
// 日誌中間件
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });

  next();
}

// 錯誤處理中間件
function errorHandler(err, req, res, next) {
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

// 異步中間件包裝器
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 使用
app.use(requestLogger);

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  res.json(user);
}));

app.use(errorHandler);
```

### 2. 自定義中間件系統

```javascript
class MiddlewareManager {
  constructor() {
    this.middlewares = [];
  }

  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(context) {
    let index = 0;

    const next = async () => {
      if (index >= this.middlewares.length) {
        return;
      }

      const middleware = this.middlewares[index++];
      await middleware(context, next);
    };

    await next();
  }
}

// 使用
const manager = new MiddlewareManager();

manager.use(async (ctx, next) => {
  console.log('中間件 1 - 前');
  await next();
  console.log('中間件 1 - 後');
});

manager.use(async (ctx, next) => {
  console.log('中間件 2 - 前');
  await next();
  console.log('中間件 2 - 後');
});

manager.use(async (ctx, next) => {
  console.log('中間件 3');
  ctx.result = '處理完成';
});

const context = {};
await manager.execute(context);
// 輸出:
// 中間件 1 - 前
// 中間件 2 - 前
// 中間件 3
// 中間件 2 - 後
// 中間件 1 - 後
```

## 錯誤處理模式

### 1. Try-Catch 包裝器

```javascript
// Result 模式
class Result {
  constructor(success, value, error) {
    this.success = success;
    this.value = value;
    this.error = error;
  }

  static ok(value) {
    return new Result(true, value, null);
  }

  static fail(error) {
    return new Result(false, null, error);
  }

  isSuccess() {
    return this.success;
  }

  isFailure() {
    return !this.success;
  }

  getValue() {
    if (this.isFailure()) {
      throw new Error('Cannot get value of failed result');
    }
    return this.value;
  }

  getError() {
    return this.error;
  }
}

// 使用
async function getUser(userId) {
  try {
    const user = await db.users.findByPk(userId);

    if (!user) {
      return Result.fail(new NotFoundError('用戶不存在'));
    }

    return Result.ok(user);
  } catch (error) {
    return Result.fail(error);
  }
}

// 調用
const result = await getUser(123);

if (result.isSuccess()) {
  const user = result.getValue();
  console.log(user);
} else {
  console.error(result.getError());
}
```

### 2. Either 模式

```javascript
class Either {
  constructor(value) {
    this.value = value;
  }

  static left(value) {
    return new Left(value);
  }

  static right(value) {
    return new Right(value);
  }

  static of(value) {
    return Either.right(value);
  }
}

class Left extends Either {
  map() {
    return this;
  }

  flatMap() {
    return this;
  }

  getOrElse(defaultValue) {
    return defaultValue;
  }

  fold(leftFn, rightFn) {
    return leftFn(this.value);
  }
}

class Right extends Either {
  map(fn) {
    return Either.right(fn(this.value));
  }

  flatMap(fn) {
    return fn(this.value);
  }

  getOrElse() {
    return this.value;
  }

  fold(leftFn, rightFn) {
    return rightFn(this.value);
  }
}

// 使用
function divide(a, b) {
  if (b === 0) {
    return Either.left('除數不能為 0');
  }
  return Either.right(a / b);
}

divide(10, 2)
  .map(x => x * 2)
  .map(x => x + 1)
  .fold(
    error => console.error('錯誤:', error),
    result => console.log('結果:', result)
  );
// 輸出: 結果: 11
```

## 數據訪問模式

### 1. Repository 模式

詳見分層架構部分的 UserRepository 示例。

### 2. Active Record 模式

```javascript
class User {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
  }

  async save() {
    if (this.id) {
      // 更新
      await db.users.update(this.toJSON(), {
        where: { id: this.id }
      });
    } else {
      // 創建
      const result = await db.users.create(this.toJSON());
      this.id = result.id;
    }
    return this;
  }

  async delete() {
    await db.users.destroy({ where: { id: this.id } });
  }

  static async findById(id) {
    const data = await db.users.findByPk(id);
    return data ? new User(data) : null;
  }

  static async findAll() {
    const results = await db.users.findAll();
    return results.map(data => new User(data));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email
    };
  }
}

// 使用
const user = new User({ name: 'John', email: 'john@example.com' });
await user.save();

user.name = 'Jane';
await user.save();

await user.delete();
```

## 實際應用

### 完整的 RESTful API 示例

```javascript
// app.js
const express = require('express');
const app = express();

// 初始化依賴注入容器
const container = new Container();
container.register('database', Database, { singleton: true });
container.register('userRepository', UserRepository);
container.register('userService', UserService);
container.register('userController', UserController);

// 中間件
app.use(express.json());
app.use(requestLogger);

// 路由
const userController = container.resolve('userController');

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userController.getUser(req.params.id);
  res.json({ success: true, data: user });
}));

app.post('/users', asyncHandler(async (req, res) => {
  const user = await userController.createUser(req.body);
  res.status(201).json({ success: true, data: user });
}));

app.put('/users/:id', asyncHandler(async (req, res) => {
  const user = await userController.updateUser(req.params.id, req.body);
  res.json({ success: true, data: user });
}));

app.delete('/users/:id', asyncHandler(async (req, res) => {
  await userController.deleteUser(req.params.id);
  res.status(204).send();
}));

// 錯誤處理
app.use(errorHandler);

// 啟動服務器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服務器運行在端口 ${PORT}`);
});
```

## 參考資源

- [Node.js Design Patterns](https://www.nodejsdesignpatterns.com/)
- [JavaScript Design Patterns](https://www.patterns.dev/)
- [Refactoring Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Learning JavaScript Design Patterns](https://addyosmani.com/resources/essentialjsdesignpatterns/book/)
