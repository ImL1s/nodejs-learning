# Node.js 性能優化指南

## 目錄
- [事件循環優化](#事件循環優化)
- [內存管理](#內存管理)
- [異步優化](#異步優化)
- [數據庫優化](#數據庫優化)
- [緩存策略](#緩存策略)
- [集群與負載均衡](#集群與負載均衡)
- [流處理](#流處理)
- [性能監控](#性能監控)
- [常見性能問題](#常見性能問題)
- [性能工具](#性能工具)

## 事件循環優化

### 1. 避免阻塞事件循環

```javascript
// ❌ 錯誤：阻塞事件循環
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

app.get('/slow', (req, res) => {
  const result = fibonacci(40); // 阻塞！
  res.json({ result });
});

// ✅ 方案1：使用 Worker Threads
const { Worker } = require('worker_threads');

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./workers/fibonacci.js', { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

app.get('/fast', async (req, res) => {
  const result = await runWorker({ n: 40 });
  res.json({ result });
});

// fibonacci.js (worker)
const { parentPort, workerData } = require('worker_threads');

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

parentPort.postMessage(fibonacci(workerData.n));
```

```javascript
// ✅ 方案2：分批處理大量數據
async function processLargeArray(items) {
  const batchSize = 100;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // 處理批次
    const batchResults = batch.map(item => processItem(item));
    results.push(...batchResults);

    // 讓出事件循環
    if (i + batchSize < items.length) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  return results;
}
```

### 2. 合理使用 setImmediate vs setTimeout

```javascript
// setImmediate - 在當前事件循環結束後執行
setImmediate(() => {
  console.log('執行在 I/O 事件之後');
});

// process.nextTick - 在當前操作完成後立即執行（優先級最高）
process.nextTick(() => {
  console.log('最先執行');
});

// setTimeout - 在指定延遲後執行
setTimeout(() => {
  console.log('延遲執行');
}, 0);

// 輸出順序：最先執行 -> 執行在 I/O 事件之後 -> 延遲執行

// ✅ 最佳實踐：分解長時間運行的任務
async function processHugeDataset(data) {
  const chunks = chunkArray(data, 1000);

  for (const chunk of chunks) {
    await processChunk(chunk);

    // 使用 setImmediate 讓出控制權
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

## 內存管理

### 1. 避免內存泄漏

```javascript
// ❌ 常見內存泄漏：全局變量
let cache = {}; // 永遠不會被清理

app.get('/data/:id', async (req, res) => {
  if (!cache[req.params.id]) {
    cache[req.params.id] = await fetchData(req.params.id);
  }
  res.json(cache[req.params.id]);
});

// ✅ 使用有限制的緩存
const LRU = require('lru-cache');

const cache = new LRU({
  max: 500, // 最多500個條目
  maxAge: 1000 * 60 * 5, // 5分鐘過期
  updateAgeOnGet: true
});

app.get('/data/:id', async (req, res) => {
  let data = cache.get(req.params.id);

  if (!data) {
    data = await fetchData(req.params.id);
    cache.set(req.params.id, data);
  }

  res.json(data);
});
```

```javascript
// ❌ 事件監聽器未清理
class DataProcessor {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    // 每次創建實例都添加新的監聽器
    eventEmitter.on('data', (data) => {
      this.process(data);
    });
  }

  process(data) {
    // 處理數據
  }
}

// ✅ 正確清理事件監聽器
class DataProcessor {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.handler = this.process.bind(this);
    eventEmitter.on('data', this.handler);
  }

  process(data) {
    // 處理數據
  }

  destroy() {
    this.eventEmitter.removeListener('data', this.handler);
    this.eventEmitter = null;
    this.handler = null;
  }
}
```

### 2. 內存監控

```javascript
// 監控內存使用
function logMemoryUsage() {
  const used = process.memoryUsage();
  const messages = [];

  for (let key in used) {
    messages.push(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }

  console.log('Memory usage:', messages.join(', '));
}

// 定期監控
setInterval(logMemoryUsage, 30000); // 每30秒記錄一次

// 內存警告
const memoryThreshold = 500 * 1024 * 1024; // 500MB

function checkMemory() {
  const usage = process.memoryUsage();

  if (usage.heapUsed > memoryThreshold) {
    console.warn('Memory usage high!', {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      threshold: `${Math.round(memoryThreshold / 1024 / 1024)} MB`
    });

    // 觸發垃圾回收（需要 --expose-gc 標誌）
    if (global.gc) {
      global.gc();
      console.log('Garbage collection triggered');
    }
  }
}

setInterval(checkMemory, 60000); // 每分鐘檢查一次
```

### 3. 對象池模式

```javascript
// 對象池減少 GC 壓力
class ObjectPool {
  constructor(factory, resetFn, initialSize = 10) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.pool = [];

    // 預創建對象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire() {
    return this.pool.length > 0
      ? this.pool.pop()
      : this.factory();
  }

  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  size() {
    return this.pool.length;
  }
}

// 使用示例：Buffer 池
const bufferPool = new ObjectPool(
  () => Buffer.allocUnsafe(1024), // 創建
  (buffer) => buffer.fill(0),      // 重置
  100                               // 初始大小
);

function processData(data) {
  const buffer = bufferPool.acquire();

  try {
    // 使用 buffer 處理數據
    buffer.write(data);
    return buffer.toString();
  } finally {
    bufferPool.release(buffer);
  }
}
```

## 異步優化

### 1. 並發控制

```javascript
// ❌ 無限並發（可能耗盡資源）
async function fetchAllUsers(userIds) {
  const promises = userIds.map(id => fetchUser(id));
  return await Promise.all(promises); // 如果有10000個ID會怎樣？
}

// ✅ 控制並發數量
async function fetchAllUsersWithLimit(userIds, concurrency = 5) {
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

// ✅ 使用 p-limit 庫
const pLimit = require('p-limit');

async function fetchAllUsersOptimized(userIds) {
  const limit = pLimit(10); // 最多10個並發

  const promises = userIds.map(id =>
    limit(() => fetchUser(id))
  );

  return await Promise.all(promises);
}
```

### 2. 批處理請求

```javascript
// DataLoader 模式 - 批處理和緩存
class DataLoader {
  constructor(batchLoadFn, options = {}) {
    this.batchLoadFn = batchLoadFn;
    this.cache = options.cache !== false ? new Map() : null;
    this.batch = [];
    this.batchPromise = null;
  }

  load(key) {
    // 檢查緩存
    if (this.cache) {
      const cached = this.cache.get(key);
      if (cached) return Promise.resolve(cached);
    }

    // 返回或創建批處理 Promise
    return this.getBatchPromise(key);
  }

  getBatchPromise(key) {
    const batchPromise = new Promise((resolve, reject) => {
      this.batch.push({ key, resolve, reject });

      // 在下一個 tick 執行批處理
      if (!this.batchPromise) {
        this.batchPromise = new Promise(batchResolve => {
          process.nextTick(() => {
            batchResolve();
            this.runBatch();
          });
        });
      }
    });

    return batchPromise;
  }

  async runBatch() {
    const batch = this.batch;
    this.batch = [];
    this.batchPromise = null;

    try {
      const keys = batch.map(item => item.key);
      const results = await this.batchLoadFn(keys);

      batch.forEach((item, index) => {
        const result = results[index];

        // 緩存結果
        if (this.cache) {
          this.cache.set(item.key, result);
        }

        item.resolve(result);
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }
  }
}

// 使用示例
const userLoader = new DataLoader(async (userIds) => {
  console.log('批量加載用戶:', userIds);
  return await db.users.findAll({
    where: { id: { [Op.in]: userIds } }
  });
});

// 這些請求會被批處理成一個數據庫查詢
const [user1, user2, user3] = await Promise.all([
  userLoader.load(1),
  userLoader.load(2),
  userLoader.load(3)
]);
```

### 3. 異步迭代器

```javascript
// 使用異步迭代器處理大數據集
async function* fetchUsersInBatches(batchSize = 100) {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const users = await db.users.findAll({
      limit: batchSize,
      offset
    });

    if (users.length === 0) {
      hasMore = false;
    } else {
      yield users;
      offset += batchSize;
    }
  }
}

// 使用
async function processAllUsers() {
  for await (const batch of fetchUsersInBatches(100)) {
    await processBatch(batch);
    console.log(`Processed ${batch.length} users`);
  }
}
```

## 數據庫優化

### 1. 連接池配置

```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: 'postgres',
  pool: {
    max: 20,        // 最大連接數
    min: 5,         // 最小連接數
    acquire: 30000, // 獲取連接超時時間
    idle: 10000,    // 連接空閒時間
    evict: 1000     // 檢查空閒連接的間隔
  },
  logging: false,   // 生產環境關閉 SQL 日誌
  benchmark: true   // 記錄查詢執行時間
});

// 監控連接池
setInterval(() => {
  console.log('Connection pool status:', {
    size: sequelize.connectionManager.pool.size,
    available: sequelize.connectionManager.pool.available,
    using: sequelize.connectionManager.pool.using,
    waiting: sequelize.connectionManager.pool.waiting
  });
}, 60000);
```

### 2. 查詢優化

```javascript
// ❌ N+1 查詢問題
async function getPostsWithAuthors() {
  const posts = await Post.findAll();

  // 對每個 post 都執行一次查詢！
  for (const post of posts) {
    post.author = await User.findByPk(post.userId);
  }

  return posts;
}

// ✅ 使用 JOIN 或 include
async function getPostsWithAuthorsOptimized() {
  return await Post.findAll({
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'name', 'email'] // 只選擇需要的字段
    }]
  });
}

// ✅ 使用 DataLoader
const userLoader = new DataLoader(async (userIds) => {
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } }
  });

  // 創建映射以保持順序
  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id));
});

async function getPostsWithAuthorsDataLoader() {
  const posts = await Post.findAll();

  // 批處理所有用戶查詢
  for (const post of posts) {
    post.author = await userLoader.load(post.userId);
  }

  return posts;
}
```

### 3. 索引優化

```javascript
// 定義模型時添加索引
const User = sequelize.define('user', {
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned')
  },
  createdAt: {
    type: DataTypes.DATE
  }
}, {
  indexes: [
    // 單列索引
    {
      fields: ['email']
    },
    // 複合索引
    {
      fields: ['status', 'createdAt'],
      name: 'user_status_created_idx'
    },
    // 部分索引
    {
      fields: ['username'],
      where: {
        status: 'active'
      },
      name: 'active_users_idx'
    }
  ]
});

// 查詢時利用索引
const activeUsers = await User.findAll({
  where: {
    status: 'active',
    createdAt: {
      [Op.gte]: new Date('2024-01-01')
    }
  },
  // 使用 EXPLAIN 分析查詢計劃
  logging: console.log
});
```

### 4. 分頁優化

```javascript
// ❌ OFFSET 分頁（大偏移量很慢）
async function getPosts(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  return await Post.findAndCountAll({
    limit: pageSize,
    offset, // 大的 offset 會變慢
    order: [['createdAt', 'DESC']]
  });
}

// ✅ 游標分頁（性能更好）
async function getPostsCursor(cursor = null, limit = 20) {
  const where = cursor
    ? {
        createdAt: {
          [Op.lt]: new Date(cursor)
        }
      }
    : {};

  const posts = await Post.findAll({
    where,
    limit: limit + 1, // 多取一個判斷是否有下一頁
    order: [['createdAt', 'DESC']]
  });

  const hasMore = posts.length > limit;
  const results = hasMore ? posts.slice(0, -1) : posts;
  const nextCursor = hasMore
    ? results[results.length - 1].createdAt.toISOString()
    : null;

  return {
    data: results,
    pagination: {
      nextCursor,
      hasMore
    }
  };
}
```

## 緩存策略

### 1. 內存緩存

```javascript
const NodeCache = require('node-cache');

// 創建緩存實例
const cache = new NodeCache({
  stdTTL: 300,        // 默認 TTL 5分鐘
  checkperiod: 60,    // 每60秒檢查過期
  useClones: false,   // 不克隆對象（更快但要小心修改）
  deleteOnExpire: true
});

// 緩存裝飾器
function cacheResult(ttl = 300) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      // 檢查緩存
      const cached = cache.get(cacheKey);
      if (cached !== undefined) {
        console.log('Cache hit:', cacheKey);
        return cached;
      }

      // 執行原方法
      const result = await originalMethod.apply(this, args);

      // 存入緩存
      cache.set(cacheKey, result, ttl);
      console.log('Cache miss:', cacheKey);

      return result;
    };

    return descriptor;
  };
}

// 使用示例
class UserService {
  @cacheResult(600) // 緩存10分鐘
  async getUser(userId) {
    return await db.users.findByPk(userId);
  }

  async updateUser(userId, data) {
    const user = await db.users.update(data, {
      where: { id: userId }
    });

    // 清除緩存
    cache.del(`getUser:${JSON.stringify([userId])}`);

    return user;
  }
}
```

### 2. Redis 緩存

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

// 緩存包裝器
class CacheManager {
  constructor(redisClient, defaultTTL = 300) {
    this.redis = redisClient;
    this.defaultTTL = defaultTTL;
  }

  async get(key) {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttl = this.defaultTTL) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key) {
    await this.redis.del(key);
  }

  async delPattern(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // 緩存穿透防護
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    // 嘗試從緩存獲取
    let value = await this.get(key);

    if (value !== null) {
      return value;
    }

    // 緩存未命中，獲取數據
    value = await fetchFn();

    // 如果數據為 null，設置短期緩存防止緩存穿透
    if (value === null) {
      await this.set(key, null, 60); // 1分鐘
    } else {
      await this.set(key, value, ttl);
    }

    return value;
  }
}

const cacheManager = new CacheManager(redis, 600);

// 使用示例
async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  return await cacheManager.getOrSet(
    cacheKey,
    async () => {
      const user = await db.users.findByPk(userId);
      return user;
    },
    3600 // 1小時
  );
}
```

### 3. 多層緩存

```javascript
class MultiLevelCache {
  constructor(l1Cache, l2Cache) {
    this.l1 = l1Cache; // 內存緩存（快，小容量）
    this.l2 = l2Cache; // Redis 緩存（較慢，大容量）
  }

  async get(key) {
    // L1 緩存
    let value = this.l1.get(key);
    if (value !== undefined) {
      console.log('L1 cache hit');
      return value;
    }

    // L2 緩存
    value = await this.l2.get(key);
    if (value !== null) {
      console.log('L2 cache hit');
      // 回填到 L1
      this.l1.set(key, value);
      return value;
    }

    console.log('Cache miss');
    return null;
  }

  async set(key, value, ttl) {
    // 同時寫入兩層緩存
    this.l1.set(key, value, ttl);
    await this.l2.set(key, value, ttl);
  }

  async del(key) {
    this.l1.del(key);
    await this.l2.del(key);
  }
}

// 使用
const multiCache = new MultiLevelCache(
  new NodeCache({ stdTTL: 60, max: 1000 }),
  new CacheManager(redis)
);
```

## 集群與負載均衡

### 1. Cluster 模塊

```javascript
const cluster = require('cluster');
const os = require('os');
const express = require('express');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;

  console.log(`Master process ${process.pid} is running`);
  console.log(`Forking ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // 監聽 worker 事件
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker...');
    cluster.fork(); // 重啟 worker
  });

  // 優雅關閉
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');

    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }

    setTimeout(() => {
      console.log('Forcing shutdown');
      process.exit(0);
    }, 10000);
  });

} else {
  // Worker 進程
  const app = express();
  const PORT = process.env.PORT || 3000;

  // 你的應用邏輯
  app.get('/', (req, res) => {
    res.json({
      message: 'Hello from worker',
      pid: process.pid,
      worker: cluster.worker.id
    });
  });

  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} started on port ${PORT}`);
  });

  // 優雅關閉
  process.on('SIGTERM', () => {
    console.log(`Worker ${process.pid} received SIGTERM`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}
```

### 2. PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'myapp',
    script: './server.js',
    instances: 'max', // 使用所有 CPU 核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 性能配置
    max_memory_restart: '500M', // 內存超過 500MB 重啟
    min_uptime: '10s',          // 最小運行時間
    max_restarts: 10,           // 最大重啟次數
    autorestart: true,          // 自動重啟
    watch: false,               // 生產環境不監聽文件變化
    // 日誌配置
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    // 高級配置
    listen_timeout: 10000,
    kill_timeout: 5000,
    wait_ready: true,
    // 健康檢查
    health_check: {
      endpoint: '/health',
      interval: 30000,
      timeout: 5000
    }
  }]
};
```

## 流處理

### 1. 使用 Stream 處理大文件

```javascript
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');

// ❌ 錯誤：將整個文件讀入內存
async function compressFileBad(inputPath, outputPath) {
  const content = await fs.promises.readFile(inputPath); // 可能導致內存不足
  const compressed = zlib.gzipSync(content);
  await fs.promises.writeFile(outputPath, compressed);
}

// ✅ 正確：使用流
function compressFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    const gzip = zlib.createGzip({ level: 9 });
    const output = fs.createWriteStream(outputPath);

    pipeline(input, gzip, output, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ✅ 處理 CSV 文件示例
const csv = require('csv-parser');
const { Transform } = require('stream');

async function processLargeCSV(inputPath, outputPath) {
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  // 自定義轉換流
  const transformer = new Transform({
    objectMode: true,
    transform(row, encoding, callback) {
      // 處理每一行
      const processed = {
        ...row,
        processed: true,
        timestamp: new Date().toISOString()
      };

      callback(null, JSON.stringify(processed) + '\n');
    }
  });

  return new Promise((resolve, reject) => {
    pipeline(
      input,
      csv(),
      transformer,
      output,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
```

### 2. HTTP 流響應

```javascript
// 流式傳輸大文件
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'files', filename);

  // 檢查文件是否存在
  fs.stat(filepath, (err, stats) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 設置響應頭
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // 創建讀取流並傳輸
    const fileStream = fs.createReadStream(filepath);

    fileStream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });

    fileStream.pipe(res);
  });
});

// 支持範圍請求（Range Requests）
app.get('/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'videos', filename);

  fs.stat(filepath, (err, stats) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }

    const range = req.headers.range;
    const fileSize = stats.size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });

      fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });

      fs.createReadStream(filepath).pipe(res);
    }
  });
});
```

## 性能監控

### 1. 應用性能監控（APM）

```javascript
// 使用 prom-client 暴露 Prometheus 指標
const promClient = require('prom-client');

// 創建 Registry
const register = new promClient.Registry();

// 默認指標
promClient.collectDefaultMetrics({ register });

// 自定義指標
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);

// 監控中間件
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });

  next();
});

// 指標端點
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 2. 性能分析

```javascript
// 使用 clinic.js 進行性能分析
// npm install -g clinic

// package.json
{
  "scripts": {
    "clinic:doctor": "clinic doctor -- node server.js",
    "clinic:flame": "clinic flame -- node server.js",
    "clinic:bubbleprof": "clinic bubbleprof -- node server.js"
  }
}

// 自定義性能計時
const { performance, PerformanceObserver } = require('perf_hooks');

// 創建性能觀察器
const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

obs.observe({ entryTypes: ['measure'] });

// 使用示例
async function processRequest(req, res) {
  performance.mark('start-processing');

  // 數據庫查詢
  performance.mark('start-db');
  const data = await db.query('SELECT * FROM users');
  performance.mark('end-db');
  performance.measure('Database Query', 'start-db', 'end-db');

  // 業務處理
  performance.mark('start-business');
  const result = await businessLogic(data);
  performance.mark('end-business');
  performance.measure('Business Logic', 'start-business', 'end-business');

  performance.mark('end-processing');
  performance.measure('Total Processing', 'start-processing', 'end-processing');

  res.json(result);
}
```

## 常見性能問題

### 1. JSON 序列化優化

```javascript
// ❌ 慢：默認 JSON.stringify
const data = { /* 大對象 */ };
const json = JSON.stringify(data);

// ✅ 快：使用 fast-json-stringify
const fastJson = require('fast-json-stringify');

const stringify = fastJson({
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string' },
    posts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' }
        }
      }
    }
  }
});

const json = stringify(data); // 快 2-3 倍
```

### 2. 正則表達式優化

```javascript
// ❌ 危險：ReDoS 攻擊
const emailRegex = /^([a-zA-Z0-9]+)+@[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/;
const maliciousInput = 'a'.repeat(50) + 'X'; // 導致指數級回溯
emailRegex.test(maliciousInput); // 可能掛起

// ✅ 安全：避免嵌套量詞
const safeEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ✅ 使用專門的庫
const validator = require('validator');
validator.isEmail(email);

// ✅ 設置超時
function safeRegexTest(regex, str, timeout = 100) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort, workerData } = require('worker_threads');
      const result = new RegExp(workerData.pattern).test(workerData.str);
      parentPort.postMessage(result);
    `, {
      eval: true,
      workerData: { pattern: regex.source, str }
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Regex timeout'));
    }, timeout);

    worker.on('message', (result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}
```

## 性能工具

### 推薦工具

```bash
# 性能分析
npm install -g clinic
npm install -g autocannon  # HTTP 基準測試

# 監控
npm install prom-client
npm install express-status-monitor

# 優化
npm install compression     # Gzip 壓縮
npm install helmet         # 安全頭
npm install lru-cache      # LRU 緩存

# 分析
npm install why-is-node-running  # 調試進程不退出
npm install node-inspect           # 調試工具
```

### 性能測試腳本

```javascript
// benchmark.js
const autocannon = require('autocannon');

async function runBenchmark() {
  const result = await autocannon({
    url: 'http://localhost:3000',
    connections: 100,     // 並發連接數
    duration: 30,         // 測試持續時間（秒）
    pipelining: 10,       // 管道化請求數
    requests: [
      {
        method: 'GET',
        path: '/api/users'
      },
      {
        method: 'POST',
        path: '/api/posts',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Post',
          content: 'Test content'
        })
      }
    ]
  });

  console.log('Benchmark Results:');
  console.log(`Requests/sec: ${result.requests.average}`);
  console.log(`Latency: ${result.latency.mean}ms`);
  console.log(`Throughput: ${result.throughput.average} bytes/sec`);
}

runBenchmark();
```

## 參考資源

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Clinic.js Documentation](https://clinicjs.org/documentation/)
- [Prometheus Node.js Client](https://github.com/siimon/prom-client)
- [Node.js Performance Optimization](https://blog.logrocket.com/node-js-performance-optimization/)
