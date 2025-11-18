# 故障排除指南

本指南幫助您診斷和解決使用 Node.js 學習專案時遇到的常見問題。

## 目錄

- [快速診斷](#快速診斷)
- [環境問題](#環境問題)
- [依賴問題](#依賴問題)
- [運行時錯誤](#運行時錯誤)
- [數據庫問題](#數據庫問題)
- [認證錯誤](#認證錯誤)
- [TypeScript 錯誤](#typescript-錯誤)
- [網絡問題](#網絡問題)
- [性能問題](#性能問題)
- [調試技巧](#調試技巧)

---

## 快速診斷

遇到問題時，首先運行這些檢查：

```bash
# 1. 檢查 Node.js 版本
node --version
# 應該輸出 v18.x.x 或更高

# 2. 檢查 npm 版本
npm --version

# 3. 檢查是否安裝了依賴
ls node_modules
# 如果目錄為空，運行: npm install

# 4. 檢查環境變量
cat .env  # Unix/Mac
type .env  # Windows

# 5. 嘗試清理並重新安裝
rm -rf node_modules package-lock.json
npm install
```

---

## 環境問題

### 錯誤: "node: command not found"

**症狀：**
```bash
$ node --version
bash: node: command not found
```

**原因：** Node.js 未安裝或未添加到 PATH

**解決方案：**

1. **安裝 Node.js**：
   - 訪問 https://nodejs.org/
   - 下載並安裝 LTS 版本

2. **使用 nvm（推薦）**：
```bash
# Mac/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重啟終端後
nvm install 20
nvm use 20
nvm alias default 20
```

3. **檢查 PATH**：
```bash
# Mac/Linux
echo $PATH | grep node

# 如果找不到，添加到 ~/.bashrc 或 ~/.zshrc
export PATH="/usr/local/bin:$PATH"
```

---

### 錯誤: "unsupported engine"

**症狀：**
```
npm ERR! engine Unsupported engine
npm ERR! engine Not compatible with your version of node/npm
```

**原因：** Node.js 或 npm 版本太舊

**解決方案：**

1. **檢查要求**：
```bash
# 查看 package.json 的 engines 字段
cat package.json | grep -A 3 "engines"
```

2. **升級 Node.js**：
```bash
# 使用 nvm
nvm install 20
nvm use 20

# 或下載最新版本
# https://nodejs.org/
```

3. **升級 npm**：
```bash
npm install -g npm@latest
```

---

### 錯誤: 環境變量未定義

**症狀：**
```
Error: JWT_SECRET must be set in production environment
```

**診斷：**
```bash
# 檢查 .env 文件是否存在
ls -la .env

# 查看內容
cat .env

# 檢查環境變量是否加載
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
```

**解決方案：**

1. **創建 .env 文件**：
```bash
cp .env.example .env
```

2. **生成安全的密鑰**：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

3. **確保 dotenv 正確加載**：
```typescript
import dotenv from 'dotenv';
dotenv.config(); // 應該在所有導入之前
```

---

## 依賴問題

### 錯誤: npm install 失敗

**症狀：**
```
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path /path/to/package.json
```

**診斷：**
```bash
# 檢查當前目錄
pwd

# 列出文件
ls -la

# 驗證 package.json 存在且有效
cat package.json | head -5
```

**解決方案：**

1. **確保在正確的目錄**：
```bash
cd /path/to/project
```

2. **驗證 package.json 語法**：
```bash
node -e "require('./package.json')"
```

3. **清除緩存並重試**：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

### 錯誤: "Cannot find module 'xxx'"

**症狀：**
```
Error: Cannot find module 'express'
    at Function.Module._resolveFilename
```

**診斷：**
```bash
# 檢查模塊是否已安裝
npm list express

# 檢查 node_modules 目錄
ls node_modules/ | grep express
```

**解決方案：**

1. **安裝缺失的模塊**：
```bash
npm install express
```

2. **重新安裝所有依賴**：
```bash
npm install
```

3. **檢查 TypeScript 路徑**：
```typescript
// ✅ 使用 .js 擴展名（ES Modules）
import express from 'express';
import { router } from './routes.js';

// ❌ 錯誤
import { router } from './routes';
```

---

### 錯誤: 依賴版本衝突

**症狀：**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**診斷：**
```bash
# 查看衝突詳情
npm install --legacy-peer-deps

# 或使用
npm install --force
```

**解決方案：**

1. **使用 --legacy-peer-deps**（臨時）：
```bash
npm install --legacy-peer-deps
```

2. **更新衝突的包**：
```bash
npm update
```

3. **檢查並修復 package.json**：
```json
{
  "dependencies": {
    "conflicting-package": "^latest-compatible-version"
  }
}
```

---

## 運行時錯誤

### 錯誤: "Address already in use"

**症狀：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**診斷：**
```bash
# 查找占用端口的進程
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

**解決方案：**

1. **終止占用端口的進程**：
```bash
# Linux/Mac
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

2. **更改應用端口**：
```env
# .env
PORT=3001
```

3. **使用不同的端口號**：
```typescript
const PORT = process.env.PORT || 3001;
```

---

### 錯誤: "ERR_MODULE_NOT_FOUND"

**症狀：**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/path/to/file'
```

**診斷：**
```bash
# 檢查文件是否存在
ls -la src/path/to/file.js

# 檢查 package.json 類型
grep '"type"' package.json
```

**解決方案：**

1. **使用正確的擴展名**（ES Modules）：
```typescript
// ✅ 正確
import { router } from './routes.js';

// ❌ 錯誤（在 ES Modules 中）
import { router } from './routes';
```

2. **檢查 package.json**：
```json
{
  "type": "module"  // 確保存在
}
```

3. **檢查 tsconfig.json**：
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node"
  }
}
```

---

### 錯誤: "CORS policy" 錯誤

**症狀：**
```
Access to fetch at 'http://localhost:3000/api/posts' from origin 'http://localhost:3001'
has been blocked by CORS policy
```

**診斷：**
```bash
# 檢查是否啟用了 CORS
grep -r "cors" src/

# 查看允許的來源
cat .env | grep ALLOWED_ORIGINS
```

**解決方案：**

1. **安裝並配置 CORS**：
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

2. **設置環境變量**：
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

3. **開發環境允許所有來源**（僅用於開發）：
```typescript
if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: '*' }));
}
```

---

## 數據庫問題

### 錯誤: "connect ECONNREFUSED"

**症狀：**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**診斷：**
```bash
# 檢查 PostgreSQL 是否運行
# Docker
docker ps | grep postgres

# 本地安裝（Mac）
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# 測試連接
psql -h localhost -p 5432 -U postgres -d blog_db
```

**解決方案：**

1. **啟動 PostgreSQL**：
```bash
# Docker
docker start postgres-dev
# 或創建新容器
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=blog_db \
  -p 5432:5432 \
  -d postgres:15

# 本地安裝（Mac）
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

2. **檢查連接配置**：
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blog_db
DB_USER=postgres
DB_PASSWORD=postgres
```

---

### 錯誤: "password authentication failed"

**症狀：**
```
error: password authentication failed for user "postgres"
```

**診斷：**
```bash
# 嘗試手動連接
psql -h localhost -p 5432 -U postgres

# 檢查環境變量
echo $DB_PASSWORD
```

**解決方案：**

1. **重置密碼**（Docker）：
```bash
docker exec -it postgres-dev psql -U postgres
ALTER USER postgres WITH PASSWORD 'newpassword';
\q
```

2. **檢查 .env 配置**：
```env
DB_PASSWORD=正確的密碼
```

3. **使用正確的用戶**：
```bash
# 查看所有用戶
psql -U postgres -c "\du"
```

---

### 錯誤: "database does not exist"

**症狀：**
```
error: database "blog_db" does not exist
```

**診斷：**
```bash
# 列出所有數據庫
psql -U postgres -c "\l"
```

**解決方案：**

1. **創建數據庫**：
```bash
# 方法 1: 使用 psql
psql -U postgres -c "CREATE DATABASE blog_db;"

# 方法 2: 通過交互式終端
psql -U postgres
CREATE DATABASE blog_db;
\q
```

2. **運行初始化腳本**（如果提供）：
```bash
npm run db:migrate
```

---

### 錯誤: "relation does not exist"

**症狀：**
```
error: relation "users" does not exist
```

**原因：** 數據表未創建

**解決方案：**

1. **運行數據庫初始化**：
```typescript
// 通常在 server.ts 中
await db.initializeTables();
```

2. **手動創建表**：
```sql
psql -U postgres -d blog_db

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

3. **運行遷移腳本**：
```bash
npm run db:migrate
```

---

## 認證錯誤

### 錯誤: "Invalid token"

**症狀：**
```json
{
  "success": false,
  "error": "Invalid token"
}
```

**診斷：**
```javascript
// 解碼 token 查看內容（不驗證）
const jwt = require('jsonwebtoken');
const token = 'your-token-here';
console.log(jwt.decode(token));
```

**原因和解決方案：**

1. **Token 格式錯誤**：
```bash
# ✅ 正確
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ 錯誤
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. **Token 已過期**：
```bash
# 重新登錄獲取新 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

3. **JWT_SECRET 不匹配**：
```bash
# 確保 .env 中的 JWT_SECRET 沒有改變
cat .env | grep JWT_SECRET
```

---

### 錯誤: "Token expired"

**症狀：**
```json
{
  "success": false,
  "error": "Token has expired"
}
```

**解決方案：**

1. **重新登錄**（短期）：
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

2. **調整 Token 有效期**（開發環境）：
```env
JWT_EXPIRES_IN=1h  # 從 15m 改為 1h
```

3. **實現 Refresh Token**（生產環境）：
   - 參考: `src/02-express/examples/05-jwt-auth.ts`

---

### 錯誤: "Authentication required"

**症狀：**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**原因：** 請求未包含認證信息

**解決方案：**

1. **添加 Authorization header**：
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

2. **在 JavaScript 中**：
```javascript
fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## TypeScript 錯誤

### 錯誤: "Cannot use import statement outside a module"

**症狀：**
```
SyntaxError: Cannot use import statement outside a module
```

**原因：** 沒有正確配置 ES Modules

**解決方案：**

1. **添加 "type": "module" 到 package.json**：
```json
{
  "type": "module"
}
```

2. **使用 tsx 運行 TypeScript**：
```bash
npx tsx src/server.ts
```

3. **或使用 ts-node（如果已配置）**：
```bash
ts-node --esm src/server.ts
```

---

### 錯誤: TypeScript 編譯失敗

**症狀：**
```
error TS2307: Cannot find module 'xxx' or its corresponding type declarations
```

**診斷：**
```bash
# 檢查 TypeScript 版本
npx tsc --version

# 檢查 tsconfig.json
cat tsconfig.json
```

**解決方案：**

1. **安裝類型定義**：
```bash
npm install -D @types/express @types/node
```

2. **清理並重新構建**：
```bash
rm -rf dist
npm run build
```

3. **檢查 tsconfig.json**：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true
  }
}
```

---

### 錯誤: 類型不匹配

**症狀：**
```
Type 'string | undefined' is not assignable to type 'string'
```

**解決方案：**

1. **使用類型守衛**：
```typescript
if (typeof value === 'string') {
  // 現在 TypeScript 知道 value 是 string
}
```

2. **使用非空斷言**（確定不為 null）：
```typescript
const value = process.env.PORT!;  // 使用 ! 斷言非空
```

3. **提供默認值**：
```typescript
const port = process.env.PORT || '3000';
```

4. **使用可選鏈**：
```typescript
const email = user?.email ?? 'default@example.com';
```

---

## 網絡問題

### 錯誤: "ETIMEDOUT" 或 "ENOTFOUND"

**症狀：**
```
Error: getaddrinfo ENOTFOUND api.example.com
```

**診斷：**
```bash
# 測試 DNS 解析
nslookup api.example.com

# 測試網絡連接
ping api.example.com

# 檢查代理設置
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

**解決方案：**

1. **檢查網絡連接**：
```bash
# 測試基本連通性
ping 8.8.8.8
```

2. **配置 npm 代理**（如果在公司網絡）：
```bash
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

3. **使用鏡像源**（中國用戶）：
```bash
npm config set registry https://registry.npmmirror.com
```

---

## 性能問題

### 問題: 應用響應緩慢

**診斷：**

1. **添加性能日誌**：
```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {  // 慢於 1 秒
      console.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  next();
});
```

2. **檢查數據庫查詢**：
```sql
-- 啟用查詢日誌
ALTER DATABASE blog_db SET log_statement = 'all';

-- 查看慢查詢
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = '...';
```

3. **監控資源使用**：
```typescript
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    heap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
  });
}, 30000);
```

**解決方案：**

1. **添加數據庫索引**：
```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);
```

2. **使用連接池**（已在項目中配置）：
```typescript
// 檢查 src/projects/blog-api/src/config/database.ts
max: 20,  // 最大連接數
```

3. **實施緩存**：
   - 參考: `src/06-advanced/examples/02-redis-cache.ts`

---

### 問題: 內存使用過高

**診斷：**
```bash
# 監控內存
node --inspect dist/server.js
# 在 Chrome 打開 chrome://inspect

# 或使用 PM2
pm2 monit
```

**解決方案：**

1. **修復內存泄漏**：
```typescript
// ❌ 常見錯誤：未清理事件監聽器
setInterval(() => {
  eventEmitter.on('data', handler);  // 每次都添加新的監聽器
}, 1000);

// ✅ 正確
eventEmitter.on('data', handler);  // 只添加一次
```

2. **限制並發請求**：
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

3. **使用流處理大文件**：
```typescript
// ❌ 將整個文件加載到內存
const content = fs.readFileSync('large-file.txt');

// ✅ 使用流
const stream = fs.createReadStream('large-file.txt');
stream.pipe(response);
```

---

## 調試技巧

### 使用 console.log 調試

```typescript
// 基本調試
console.log('Value:', value);

// 格式化對象
console.log('User:', JSON.stringify(user, null, 2));

// 帶時間戳
console.log(new Date().toISOString(), 'Event occurred');

// 使用不同級別
console.error('Error:', error);
console.warn('Warning:', warning);
console.info('Info:', info);
```

---

### 使用 VSCode 調試器

1. **創建 .vscode/launch.json**：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/server.ts",
      "runtimeArgs": ["-r", "tsx"],
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

2. **設置斷點並按 F5 啟動調試**

---

### 使用 Node.js 調試工具

```bash
# 啟動調試模式
node --inspect dist/server.js

# 或使用 tsx
npx tsx --inspect src/server.ts

# 在 Chrome 中打開
# chrome://inspect
```

---

### 日誌最佳實踐

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 使用結構化日誌
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  timestamp: new Date()
});
```

---

## 獲取幫助

如果以上方法都無法解決您的問題：

1. **收集診斷信息**：
```bash
# 創建診斷報告
node -e "console.log(JSON.stringify({
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  env: process.env.NODE_ENV
}, null, 2))" > diagnostic.txt
```

2. **查看日誌**：
```bash
# 應用日誌
pm2 logs

# 系統日誌（Linux）
journalctl -u nodejs-app

# Docker 日誌
docker logs container-name
```

3. **參考其他文檔**：
   - [FAQ](./FAQ.md)
   - [最佳實踐](./BEST_PRACTICES.md)
   - [安全指南](./SECURITY.md)

4. **提交 Issue**：
   - 包含錯誤消息
   - 包含診斷信息
   - 包含重現步驟
   - 包含相關日誌

---

**最後更新**: 2024-01-01
