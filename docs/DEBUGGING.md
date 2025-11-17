# Node.js 調試技巧指南

## 目錄
- [調試工具](#調試工具)
- [console 調試](#console-調試)
- [使用 debugger](#使用-debugger)
- [Chrome DevTools](#chrome-devtools)
- [VS Code 調試](#vs-code-調試)
- [日誌調試](#日誌調試)
- [性能調試](#性能調試)
- [內存調試](#內存調試)
- [異步調試](#異步調試)
- [生產環境調試](#生產環境調試)
- [常見問題排查](#常見問題排查)

## 調試工具

### 1. 內置調試工具

```bash
# 使用 inspect 模式啟動
node --inspect server.js

# 使用 inspect-brk 在第一行暫停
node --inspect-brk server.js

# 指定調試端口
node --inspect=9229 server.js

# 遠程調試
node --inspect=0.0.0.0:9229 server.js
```

### 2. 推薦的調試工具

```json
{
  "devDependencies": {
    "debug": "^4.3.4",           // 調試日誌
    "why-is-node-running": "^2.2.2",  // 找出進程不退出的原因
    "wtfnode": "^0.9.1",         // 分析活動句柄
    "node-inspect": "^2.0.0",    // 命令行調試器
    "ndb": "^1.1.5",             // 改進的調試體驗
    "clinic": "^13.0.0",         // 性能分析
    "0x": "^5.6.0"               // 火焰圖生成
  }
}
```

## console 調試

### 1. console 方法詳解

```javascript
// 基本輸出
console.log('普通日誌');
console.info('信息日誌');
console.warn('警告日誌');
console.error('錯誤日誌');

// 格式化輸出
const user = { name: 'John', age: 30 };
console.log('用戶: %s, 年齡: %d', user.name, user.age);

// 對象檢查
console.dir(user, { depth: null, colors: true });

// 表格輸出
const users = [
  { name: 'John', age: 30, role: 'admin' },
  { name: 'Jane', age: 25, role: 'user' },
  { name: 'Bob', age: 35, role: 'moderator' }
];
console.table(users);
console.table(users, ['name', 'age']); // 只顯示特定列

// 計時
console.time('操作耗時');
// ... 執行操作
console.timeEnd('操作耗時');

// 計數
for (let i = 0; i < 5; i++) {
  console.count('循環次數');
}
console.countReset('循環次數');

// 斷言
console.assert(1 === 1, '1 應該等於 1');
console.assert(1 === 2, '1 不等於 2'); // 輸出錯誤

// 分組
console.group('用戶信息');
console.log('姓名: John');
console.log('年齡: 30');
console.groupEnd();

console.group('嵌套分組');
console.group('子分組');
console.log('嵌套內容');
console.groupEnd();
console.groupEnd();

// 堆棧跟蹤
console.trace('跟蹤調用堆棧');

// 清空控制台
console.clear();
```

### 2. 自定義 console 包裝器

```javascript
// logger.js
const util = require('util');

class Logger {
  constructor(namespace) {
    this.namespace = namespace;
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
  }

  formatMessage(level, color, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `${color}[${timestamp}] [${level}] [${this.namespace}]${this.colors.reset}`;

    const formatted = args.map(arg =>
      typeof arg === 'object' ? util.inspect(arg, { depth: null, colors: true }) : arg
    ).join(' ');

    return `${prefix} ${formatted}`;
  }

  debug(...args) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(this.formatMessage('DEBUG', this.colors.cyan, ...args));
    }
  }

  info(...args) {
    console.log(this.formatMessage('INFO', this.colors.green, ...args));
  }

  warn(...args) {
    console.warn(this.formatMessage('WARN', this.colors.yellow, ...args));
  }

  error(...args) {
    console.error(this.formatMessage('ERROR', this.colors.red, ...args));
  }

  // 帶條件的日誌
  logIf(condition, ...args) {
    if (condition) {
      this.info(...args);
    }
  }

  // 記錄執行時間
  async time(label, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`${label} 執行時間: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} 失敗 (${duration}ms):`, error);
      throw error;
    }
  }
}

// 使用示例
const logger = new Logger('UserService');

logger.debug('調試信息', { userId: 123 });
logger.info('用戶已登錄', { email: 'user@example.com' });
logger.warn('會話即將過期');
logger.error('數據庫連接失敗', new Error('Connection timeout'));

// 使用計時功能
const result = await logger.time('獲取用戶數據', async () => {
  return await db.users.findAll();
});

module.exports = Logger;
```

## 使用 debugger

### 1. debugger 語句

```javascript
function calculateTotal(items) {
  let total = 0;

  debugger; // 執行到這裡會暫停

  for (const item of items) {
    total += item.price * item.quantity;
    debugger; // 每次循環都會暫停
  }

  return total;
}

// 運行：node --inspect-brk app.js
// 然後在 Chrome 打開 chrome://inspect
```

### 2. 條件斷點

```javascript
function processItems(items) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // 只在特定條件下暫停
    if (item.price > 1000) {
      debugger; // 只有價格 > 1000 時才暫停
    }

    processItem(item);
  }
}
```

## Chrome DevTools

### 1. 連接 Chrome DevTools

```bash
# 啟動應用
node --inspect server.js

# 在 Chrome 中打開
chrome://inspect
```

### 2. 使用 DevTools 功能

```javascript
// 在 Chrome DevTools 中可以使用的功能：

// 1. 斷點調試
// - 在 Sources 面板設置斷點
// - 條件斷點：右鍵點擊行號
// - 日誌點：輸出日誌而不暫停

// 2. 調用堆棧
function a() {
  b();
}

function b() {
  c();
}

function c() {
  debugger; // 在這裡可以看到完整的調用堆棧
}

a();

// 3. 監視表達式
// 在 Watch 面板添加表達式，實時查看值

// 4. 作用域變量
// 在 Scope 面板查看當前作用域的所有變量

// 5. Console 面板
// 可以在斷點處執行任意 JavaScript 代碼
```

### 3. 性能分析

```javascript
// 使用 Chrome DevTools 的 Performance 面板

// 記錄性能配置文件
console.profile('MyProfile');

// 執行要分析的代碼
function expensiveOperation() {
  const arr = [];
  for (let i = 0; i < 1000000; i++) {
    arr.push(Math.random());
  }
  return arr.sort();
}

expensiveOperation();

console.profileEnd('MyProfile');

// 在 DevTools 的 JavaScript Profiler 面板查看結果
```

## VS Code 調試

### 1. launch.json 配置

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "啟動程序",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/server.js",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "myapp:*"
      }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "附加到進程",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "運行當前文件",
      "program": "${file}",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest 當前文件",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${fileBasenameNoExtension}", "--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest 所有測試",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "調試 Express",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "restart": true,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 2. 使用 VS Code 斷點

```javascript
// 在 VS Code 中：
// 1. 點擊行號左側設置斷點
// 2. 右鍵設置條件斷點或日誌點
// 3. F5 開始調試
// 4. F10 單步跳過
// 5. F11 單步進入
// 6. Shift+F11 單步退出
// 7. F5 繼續執行

async function getUserData(userId) {
  // 設置斷點在這一行
  const user = await db.users.findByPk(userId);

  // 條件斷點：userId === 123
  if (user) {
    const posts = await user.getPosts();
    return { user, posts };
  }

  return null;
}
```

### 3. logpoints（日誌點）

```javascript
// 不需要修改代碼，在斷點處右鍵選擇 "Add Logpoint"

function processOrder(order) {
  // Logpoint: 用戶 ID: {order.userId}, 金額: {order.amount}
  const user = getUser(order.userId);

  // Logpoint: 用戶: {user.name}
  validateOrder(order);

  // Logpoint: 訂單驗證通過
  return saveOrder(order);
}
```

## 日誌調試

### 1. debug 模塊

```javascript
// 安裝：npm install debug
const debug = require('debug');

// 創建不同命名空間的調試器
const debugHTTP = debug('myapp:http');
const debugDB = debug('myapp:db');
const debugAuth = debug('myapp:auth');

// 使用
debugHTTP('收到 GET 請求: %s', req.url);
debugDB('查詢用戶: %d', userId);
debugAuth('用戶登錄: %s', email);

// 可以在對象上添加更多信息
debugHTTP('請求詳情', {
  method: req.method,
  url: req.url,
  headers: req.headers
});

// 運行時啟用調試：
// DEBUG=myapp:* node server.js
// DEBUG=myapp:http,myapp:db node server.js
// DEBUG=myapp:* DEBUG_COLORS=false node server.js
```

### 2. Winston 日誌

```javascript
const winston = require('winston');
const { format } = winston;

// 創建自定義格式
const customFormat = format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// 創建日誌記錄器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'myapp' },
  transports: [
    // 錯誤日誌
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // 所有日誌
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// 開發環境添加控制台輸出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      customFormat
    )
  }));
}

// 使用示例
logger.info('服務器啟動', { port: 3000 });
logger.warn('連接池已滿', { poolSize: 10 });
logger.error('數據庫錯誤', {
  error: error.message,
  stack: error.stack,
  query: query
});

// 分析日誌
logger.profile('數據庫查詢');
// ... 執行查詢
logger.profile('數據庫查詢'); // 自動記錄耗時

module.exports = logger;
```

### 3. 結構化日誌

```javascript
// 創建帶上下文的日誌記錄器
class ContextLogger {
  constructor(context) {
    this.context = context;
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data
    };

    console.log(JSON.stringify(logEntry));
  }

  info(message, data) {
    this.log('info', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  child(additionalContext) {
    return new ContextLogger({
      ...this.context,
      ...additionalContext
    });
  }
}

// 使用示例
const logger = new ContextLogger({ service: 'api', version: '1.0' });

app.use((req, res, next) => {
  // 為每個請求創建子日誌記錄器
  req.logger = logger.child({
    requestId: generateId(),
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  req.logger.info('請求開始');
  next();
});

// 在路由中使用
app.get('/users/:id', async (req, res) => {
  req.logger.info('獲取用戶', { userId: req.params.id });

  try {
    const user = await db.users.findByPk(req.params.id);
    req.logger.info('用戶找到', { userId: user.id });
    res.json(user);
  } catch (error) {
    req.logger.error('獲取用戶失敗', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 性能調試

### 1. 使用 perf_hooks

```javascript
const { performance, PerformanceObserver } = require('perf_hooks');

// 設置性能觀察器
const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  });
});

obs.observe({ entryTypes: ['measure'], buffered: true });

// 性能測量包裝器
class PerformanceTracker {
  static measure(name, fn) {
    return async function(...args) {
      performance.mark(`${name}-start`);

      try {
        const result = await fn.apply(this, args);
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        return result;
      } catch (error) {
        performance.mark(`${name}-end`);
        performance.measure(`${name} (error)`, `${name}-start`, `${name}-end`);
        throw error;
      }
    };
  }
}

// 使用示例
class UserService {
  async getUser(userId) {
    performance.mark('getUser-start');

    const user = await db.users.findByPk(userId);

    performance.mark('getUser-end');
    performance.measure('getUser', 'getUser-start', 'getUser-end');

    return user;
  }

  // 使用裝飾器
  @PerformanceTracker.measure('createUser')
  async createUser(userData) {
    return await db.users.create(userData);
  }
}
```

### 2. Clinic.js 診斷

```bash
# 安裝
npm install -g clinic

# Doctor - 診斷性能問題
clinic doctor -- node server.js

# Flame - CPU 火焰圖
clinic flame -- node server.js

# Bubbleprof - 異步操作分析
clinic bubbleprof -- node server.js

# Heap Profiler - 內存分析
clinic heapprofiler -- node server.js

# 運行後訪問應用觸發操作，然後 Ctrl+C 停止
# 自動打開 HTML 報告
```

### 3. 0x 火焰圖

```bash
# 安裝
npm install -g 0x

# 生成火焰圖
0x server.js

# 自定義選項
0x --output-dir ./profiles server.js

# 運行後訪問應用，然後 Ctrl+C
# 自動打開火焰圖 HTML
```

## 內存調試

### 1. 檢測內存泄漏

```javascript
// memwatch-next（已廢棄，使用 heapdump）
const heapdump = require('heapdump');
const path = require('path');

// 定期生成堆快照
let snapshotCount = 0;

function takeSnapshot() {
  const filename = path.join(__dirname, `heap-${Date.now()}.heapsnapshot`);
  heapdump.writeSnapshot(filename, (err, filename) => {
    if (err) {
      console.error('堆快照失敗:', err);
    } else {
      console.log('堆快照已保存:', filename);
      snapshotCount++;
    }
  });
}

// 定期拍攝快照
setInterval(takeSnapshot, 60000); // 每分鐘

// 也可以通過 API 觸發
app.get('/snapshot', (req, res) => {
  takeSnapshot();
  res.send('快照已觸發');
});

// 在 Chrome DevTools Memory 面板加載和比較快照
```

### 2. 監控內存使用

```javascript
const v8 = require('v8');

function logMemoryUsage() {
  const usage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();

  console.log({
    // process.memoryUsage()
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,           // 總內存
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,  // 堆總大小
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,    // 堆使用量
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,    // C++ 對象

    // v8.getHeapStatistics()
    totalHeapSize: `${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB`,
    usedHeapSize: `${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB`,
    heapLimit: `${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`
  });
}

// 定期監控
setInterval(logMemoryUsage, 10000);

// 內存警告
const MEMORY_THRESHOLD = 0.9; // 90%

function checkMemoryPressure() {
  const usage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();

  const heapUsagePercent = usage.heapUsed / heapStats.heap_size_limit;

  if (heapUsagePercent > MEMORY_THRESHOLD) {
    console.warn('內存使用率過高!', {
      usage: `${(heapUsagePercent * 100).toFixed(2)}%`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapLimit: `${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`
    });

    // 觸發垃圾回收（需要 --expose-gc）
    if (global.gc) {
      console.log('觸發垃圾回收...');
      global.gc();
    }
  }
}

setInterval(checkMemoryPressure, 30000);
```

### 3. 查找內存泄漏

```javascript
const whyIsNodeRunning = require('why-is-node-running');

// 在應用應該退出但沒有退出時調用
setTimeout(() => {
  whyIsNodeRunning();
}, 5000);

// 使用 wtfnode
const wtf = require('wtfnode');

process.on('SIGINT', () => {
  wtf.dump();
  process.exit();
});
```

## 異步調試

### 1. async_hooks 追蹤

```javascript
const async_hooks = require('async_hooks');
const fs = require('fs');

// 存儲異步操作信息
const asyncOps = new Map();

// 創建異步鉤子
const hook = async_hooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    const info = {
      type,
      triggerAsyncId,
      stack: new Error().stack
    };
    asyncOps.set(asyncId, info);
  },

  before(asyncId) {
    const info = asyncOps.get(asyncId);
    if (info) {
      console.log(`執行 ${info.type} (${asyncId})`);
    }
  },

  after(asyncId) {
    // 清理
  },

  destroy(asyncId) {
    asyncOps.delete(asyncId);
  }
});

// 啟用鉤子
hook.enable();

// 使用示例
async function testAsync() {
  await new Promise(resolve => setTimeout(resolve, 100));
  await fs.promises.readFile('package.json');
}

testAsync();
```

### 2. Promise 調試

```javascript
// 啟用長堆棧跟蹤
process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的 Promise 拒絕:', {
    reason,
    promise,
    stack: reason instanceof Error ? reason.stack : new Error().stack
  });
});

process.on('uncaughtException', (error) => {
  console.error('未捕獲的異常:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Promise 包裝器用於調試
class DebugPromise extends Promise {
  constructor(executor) {
    const stack = new Error().stack;

    super((resolve, reject) => {
      executor(
        (value) => {
          console.log('Promise resolved:', { value, stack });
          resolve(value);
        },
        (error) => {
          console.error('Promise rejected:', { error, stack });
          reject(error);
        }
      );
    });
  }
}

// 使用
const promise = new DebugPromise((resolve, reject) => {
  setTimeout(() => resolve('完成'), 1000);
});
```

## 生產環境調試

### 1. 遠程調試

```javascript
// 安全的遠程調試設置
if (process.env.ENABLE_REMOTE_DEBUG === 'true') {
  const inspector = require('inspector');

  // 只在特定條件下啟用
  if (process.env.DEBUG_TOKEN === getAuthToken()) {
    inspector.open(9229, '127.0.0.1', false); // 只綁定到 localhost
    console.log('調試器已啟用');
  }
}

// 通過 SSH 隧道連接
// ssh -L 9229:localhost:9229 user@server
```

### 2. APM 集成

```javascript
// 使用 New Relic
require('newrelic');

// 使用 Sentry
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app })
  ]
});

// 請求處理器
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// 路由
app.get('/', (req, res) => {
  // Sentry 自動追蹤此請求
  res.send('Hello');
});

// 錯誤處理器
app.use(Sentry.Handlers.errorHandler());

// 自定義錯誤捕獲
try {
  doSomething();
} catch (error) {
  Sentry.captureException(error, {
    tags: { section: 'user-service' },
    extra: { userId: 123 }
  });
}
```

## 常見問題排查

### 1. 進程不退出

```javascript
// 使用 why-is-node-running
const whyIsNodeRunning = require('why-is-node-running');

// 應用應該退出的地方
setTimeout(() => {
  whyIsNodeRunning(); // 顯示所有活動句柄
}, 5000);

// 常見原因：
// 1. 未關閉的服務器
// 2. 活動的定時器
// 3. 未關閉的數據庫連接
// 4. 未關閉的文件句柄
// 5. 活動的事件監聽器
```

### 2. 高 CPU 使用率

```javascript
// 生成 CPU 配置文件
const profiler = require('v8-profiler-next');

profiler.startProfiling('CPU Profile', true);

setTimeout(() => {
  const profile = profiler.stopProfiling();
  profile.export((error, result) => {
    fs.writeFileSync('cpu-profile.cpuprofile', result);
    profile.delete();
  });
}, 30000); // 30秒後停止

// 在 Chrome DevTools 的 JavaScript Profiler 面板加載 .cpuprofile 文件
```

### 3. 慢查詢調試

```javascript
// Sequelize 慢查詢日誌
const sequelize = new Sequelize({
  // ...
  benchmark: true,
  logging: (sql, timing) => {
    if (timing > 1000) { // 超過 1 秒
      logger.warn('慢查詢', {
        sql,
        timing: `${timing}ms`
      });
    }
  }
});

// MongoDB 慢查詢
mongoose.set('debug', (collectionName, method, query, doc) => {
  const start = Date.now();

  return function() {
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn('慢查詢', {
        collection: collectionName,
        method,
        query,
        duration: `${duration}ms`
      });
    }
  };
});
```

### 4. 請求超時調試

```javascript
// Express 請求計時中間件
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (duration > 5000) {
      logger.warn('慢請求', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }
  });

  next();
});

// 超時處理
const timeout = require('connect-timeout');

app.use(timeout('30s'));

app.use((req, res, next) => {
  if (!req.timedout) next();
});

app.use((err, req, res, next) => {
  if (req.timedout) {
    logger.error('請求超時', {
      method: req.method,
      url: req.url
    });
    res.status(408).send('請求超時');
  } else {
    next(err);
  }
});
```

## 參考資源

- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [VS Code Debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Clinic.js Documentation](https://clinicjs.org/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Debug Module](https://github.com/debug-js/debug)
