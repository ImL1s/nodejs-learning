# 常見問題解答 (FAQ)

本文檔回答了在使用 Node.js 學習專案時最常遇到的問題。

## 目錄

- [環境設置](#環境設置)
- [依賴安裝](#依賴安裝)
- [運行項目](#運行項目)
- [數據庫問題](#數據庫問題)
- [認證問題](#認證問題)
- [TypeScript 相關](#typescript-相關)
- [測試相關](#測試相關)
- [部署相關](#部署相關)
- [性能問題](#性能問題)

---

## 環境設置

### Q: 需要什麼版本的 Node.js？

**A:** 本專案需要 Node.js 18.0.0 或更高版本。

檢查您的 Node.js 版本：
```bash
node --version
```

如果版本過低，請從 [nodejs.org](https://nodejs.org/) 下載最新的 LTS 版本。

推薦使用 nvm（Node Version Manager）來管理多個 Node.js 版本：
```bash
# 安裝 nvm 後
nvm install 20
nvm use 20
```

---

### Q: 如何設置環境變量？

**A:** 本專案使用 `.env` 文件來管理環境變量。

1. 複製示例文件：
```bash
# For todo-api
cp src/projects/todo-api/.env.example src/projects/todo-api/.env

# For blog-api
cp src/projects/blog-api/.env.example src/projects/blog-api/.env
```

2. 編輯 `.env` 文件，設置您的值：
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-generated-secret-key
```

3. **重要**：生成安全的密鑰：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### Q: 為什麼會看到 "JWT_SECRET must be set" 錯誤？

**A:** 這是安全檢查。在生產環境中，必須設置環境變量。

**解決方案：**
1. 創建 `.env` 文件
2. 生成強密鑰：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
3. 在 `.env` 中設置：
```env
JWT_SECRET=<你生成的密鑰>
```

---

## 依賴安裝

### Q: npm install 失敗怎麼辦？

**A:** 嘗試以下解決方案：

1. **清除 npm 緩存**：
```bash
npm cache clean --force
```

2. **刪除 node_modules 並重新安裝**：
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **檢查 Node.js 版本**：
```bash
node --version  # 應該 >= 18.0.0
```

4. **使用 npm 最新版本**：
```bash
npm install -g npm@latest
```

5. **檢查網絡連接**：
```bash
npm config set registry https://registry.npmjs.org/
```

---

### Q: 為什麼有些包安裝失敗？

**A:** 常見原因：

1. **Node.js 版本不兼容**
   - 確保使用 Node.js 18+

2. **權限問題**（Unix/Linux/Mac）：
```bash
# 不要使用 sudo
# 改為設置正確的 npm 權限
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

3. **網絡問題**：
```bash
# 使用淘寶鏡像（中國用戶）
npm config set registry https://registry.npmmirror.com
```

---

## 運行項目

### Q: 如何運行示例文件？

**A:** 使用 tsx（TypeScript execute）：

```bash
# 運行單個示例
npm run dev src/01-basics/examples/01-http-hello-world.ts

# 或者直接使用 tsx
npx tsx src/01-basics/examples/01-http-hello-world.ts
```

---

### Q: 為什麼運行時出現 "Cannot find module" 錯誤？

**A:** 可能的原因和解決方案：

1. **未安裝依賴**：
```bash
npm install
```

2. **TypeScript 路徑別名問題**：
   - 檢查 `tsconfig.json` 中的 `paths` 配置
   - 確保路徑正確

3. **ES Modules vs CommonJS**：
   - 本專案使用 ES Modules
   - 確保 `package.json` 中有 `"type": "module"`
   - 使用 `.js` 擴展名導入：
```typescript
// ✅ 正確
import { foo } from './utils.js';

// ❌ 錯誤
import { foo } from './utils';
```

---

### Q: 端口已被占用怎麼辦？

**A:**

**Linux/Mac：**
```bash
# 查找占用端口的進程
lsof -i :3000

# 終止進程
kill -9 <PID>
```

**Windows：**
```cmd
# 查找占用端口的進程
netstat -ano | findstr :3000

# 終止進程
taskkill /PID <PID> /F
```

**或者更改端口：**
```bash
# 在 .env 文件中
PORT=3001
```

---

## 數據庫問題

### Q: 如何設置 PostgreSQL？

**A:**

**選項 1：使用 Docker（推薦）：**
```bash
# 啟動 PostgreSQL 容器
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=blog_db \
  -p 5432:5432 \
  -d postgres:15

# 檢查容器狀態
docker ps
```

**選項 2：本地安裝：**
- **Mac**: `brew install postgresql@15`
- **Ubuntu**: `sudo apt-get install postgresql-15`
- **Windows**: 從 [postgresql.org](https://www.postgresql.org/download/) 下載

**設置數據庫：**
```bash
# 連接到 PostgreSQL
psql -U postgres

# 創建數據庫
CREATE DATABASE blog_db;

# 退出
\q
```

---

### Q: 連接數據庫失敗怎麼辦？

**A:** 檢查以下幾點：

1. **數據庫服務是否運行**：
```bash
# Docker
docker ps

# 本地安裝（Mac）
brew services list

# Linux
sudo systemctl status postgresql
```

2. **檢查連接配置**（.env）：
```env
DB_HOST=localhost      # Docker: localhost, 遠程: IP 地址
DB_PORT=5432          # PostgreSQL 默認端口
DB_NAME=blog_db       # 數據庫名稱
DB_USER=postgres      # 用戶名
DB_PASSWORD=postgres  # 密碼
```

3. **測試連接**：
```bash
# 使用 psql
psql -h localhost -p 5432 -U postgres -d blog_db
```

4. **常見錯誤**：
   - `ECONNREFUSED`: 數據庫未運行
   - `password authentication failed`: 密碼錯誤
   - `database does not exist`: 需要創建數據庫

---

### Q: 如何重置數據庫？

**A:**

```bash
# 方法 1：刪除並重新創建數據庫
psql -U postgres -c "DROP DATABASE IF EXISTS blog_db;"
psql -U postgres -c "CREATE DATABASE blog_db;"

# 方法 2：運行遷移腳本
npm run db:migrate  # 如果項目有遷移腳本

# 方法 3：使用 Docker 重新創建容器
docker stop postgres-dev
docker rm postgres-dev
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=blog_db \
  -p 5432:5432 \
  -d postgres:15
```

---

## 認證問題

### Q: JWT Token 過期後怎麼辦？

**A:**

Token 過期是正常的安全機制。默認有效期為 15 分鐘。

**解決方案：**

1. **重新登錄**：
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

2. **調整 Token 有效期**（僅開發環境）：
```env
# .env
JWT_EXPIRES_IN=1h  # 1 小時
```

3. **實現 Refresh Token**（生產環境推薦）：
   - 查看 `src/02-express/examples/05-jwt-auth.ts` 的 refresh token 示例

---

### Q: 為什麼會收到 "Invalid token" 錯誤？

**A:** 可能的原因：

1. **Token 格式錯誤**：
   - 確保使用 `Bearer <token>` 格式
   - 示例：`Authorization: Bearer eyJhbGciOiJIUzI1...`

2. **Token 被篡改**：
   - Token 包含簽名，任何修改都會導致驗證失敗

3. **JWT_SECRET 不匹配**：
   - 確保服務器重啟後使用相同的 JWT_SECRET

4. **Token 已過期**：
   - 重新登錄獲取新 token

**調試方法：**
```javascript
// 使用 jwt.decode 查看 token 內容（不驗證）
const jwt = require('jsonwebtoken');
const decoded = jwt.decode('your-token-here');
console.log(decoded);
```

---

### Q: 如何保護 API 端點？

**A:** 使用認證中間件：

```typescript
import { authenticate } from './middlewares/auth.middleware';

// 保護單個路由
app.get('/api/protected', authenticate, (req, res) => {
  // 只有認證用戶可以訪問
});

// 保護路由組
app.use('/api/admin', authenticate);
```

查看示例：`src/02-express/examples/05-jwt-auth.ts`

---

## TypeScript 相關

### Q: 為什麼會看到 TypeScript 類型錯誤？

**A:**

1. **檢查 TypeScript 版本**：
```bash
npx tsc --version  # 應該 >= 5.3.0
```

2. **重新生成類型定義**：
```bash
npm run build
```

3. **安裝缺失的類型定義**：
```bash
# 示例
npm install -D @types/express @types/node
```

---

### Q: 如何解決 "Cannot find module" 類型錯誤？

**A:**

1. **使用 .js 擴展名**（ES Modules）：
```typescript
// ✅ 正確
import { router } from './routes.js';

// ❌ 錯誤
import { router } from './routes';
```

2. **檢查 tsconfig.json**：
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

---

### Q: 為什麼 IDE 顯示類型錯誤但代碼能運行？

**A:**

1. **重啟 TypeScript 服務器**（VSCode）：
   - 按 `Cmd/Ctrl + Shift + P`
   - 選擇 "TypeScript: Restart TS Server"

2. **清除構建緩存**：
```bash
rm -rf dist
npm run build
```

3. **檢查 IDE 使用的 TypeScript 版本**：
   - VSCode: 應使用工作區的 TypeScript 版本

---

## 測試相關

### Q: 如何運行測試？

**A:**

```bash
# 運行所有測試
npm test

# 運行特定測試文件
npm test -- path/to/test.test.ts

# 監視模式（自動重新運行）
npm run test:watch

# 生成覆蓋率報告
npm run test:coverage
```

---

### Q: 測試失敗怎麼調試？

**A:**

1. **查看詳細錯誤信息**：
```bash
npm test -- --verbose
```

2. **單獨運行失敗的測試**：
```bash
npm test -- --testNamePattern="test description"
```

3. **使用 console.log 調試**：
```typescript
it('should work', () => {
  console.log('Debug info:', someVariable);
  expect(result).toBe(expected);
});
```

4. **使用調試器**：
   - VSCode: 在測試文件中設置斷點，按 F5

---

### Q: 測試數據庫應該如何設置？

**A:**

**推薦方式：使用測試數據庫**

1. **創建測試環境配置**（.env.test）：
```env
NODE_ENV=test
DB_NAME=blog_db_test
DB_HOST=localhost
DB_PORT=5432
```

2. **在測試前後清理數據**：
```typescript
beforeEach(async () => {
  // 清空表
  await db.query('TRUNCATE TABLE users CASCADE');
});

afterAll(async () => {
  // 關閉連接
  await db.close();
});
```

3. **使用內存數據庫**（開發環境）：
   - SQLite: `:memory:`
   - 或使用 mock 數據

---

## 部署相關

### Q: 如何部署到生產環境？

**A:**

1. **構建 TypeScript 代碼**：
```bash
npm run build
```

2. **設置生產環境變量**：
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<64-字符強密鑰>
DB_HOST=<生產數據庫地址>
# ... 其他配置
```

3. **使用進程管理器**（PM2 推薦）：
```bash
# 安裝 PM2
npm install -g pm2

# 啟動應用
pm2 start dist/server.js --name blog-api

# 查看狀態
pm2 status

# 查看日誌
pm2 logs blog-api
```

4. **使用 Docker**：
```bash
# 構建鏡像
docker build -t blog-api .

# 運行容器
docker run -d \
  --name blog-api \
  -p 3000:3000 \
  --env-file .env.production \
  blog-api
```

---

### Q: 如何設置 HTTPS？

**A:**

**選項 1：使用 Nginx 反向代理（推薦）：**

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**選項 2：在 Node.js 中直接使用 HTTPS：**

```typescript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(443);
```

---

## 性能問題

### Q: API 響應太慢怎麼辦？

**A:**

1. **添加日誌記錄**：
```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
  });
  next();
});
```

2. **檢查數據庫查詢**：
```sql
-- PostgreSQL 查詢計劃
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = '...';

-- 添加索引
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

3. **使用連接池**：
   - 本專案已配置，檢查 `src/projects/blog-api/src/config/database.ts`

4. **添加緩存**（Redis）：
   - 查看示例：`src/06-advanced/examples/02-redis-cache.ts`

---

### Q: 如何監控應用性能？

**A:**

1. **使用 PM2 監控**：
```bash
pm2 monit
```

2. **添加健康檢查端點**：
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

3. **使用 APM 工具**：
   - New Relic
   - Datadog
   - PM2 Plus

---

### Q: 內存泄漏怎麼檢測？

**A:**

1. **使用 Node.js 內建工具**：
```bash
node --inspect dist/server.js
# 在 Chrome 中打開 chrome://inspect
```

2. **監控內存使用**：
```typescript
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory:', {
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`
  });
}, 60000); // 每分鐘
```

3. **使用 clinic.js**：
```bash
npm install -g clinic
clinic doctor -- node dist/server.js
```

---

## 更多幫助

如果您的問題未在此列出，請：

1. 查看 [故障排除指南](./TROUBLESHOOTING.md)
2. 查看 [最佳實踐](./BEST_PRACTICES.md)
3. 查看 [安全指南](./SECURITY.md)
4. 在 GitHub Issues 中提問
5. 查看項目 README 文件

---

**最後更新**: 2024-01-01
