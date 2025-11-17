# 🚀 Node.js 現代化學習專案

> 從零基礎到進階 - 使用 TypeScript 的完整 Node.js 學習路線

## ✨ 專案特色

- ✅ **TypeScript** - 類型安全，現代化開發體驗
- ✅ **ES Modules** - 使用最新的模組系統
- ✅ **Express & Fastify** - 學習主流 Web 框架
- ✅ **實戰導向** - 每個章節都有完整範例和練習
- ✅ **最佳實踐** - 遵循業界標準和設計模式
- ✅ **完整測試** - 包含測試示範和 TDD 實踐

## 📚 學習路線

### [01. Node.js 基礎核心](src/01-basics/)
學習 Node.js 核心概念、HTTP 模組、文件系統、異步編程

**主要內容**:
- HTTP 伺服器開發
- 文件系統操作 (fs)
- URL 和路由處理
- Callbacks → Promises → Async/Await

### [02. Express.js 現代框架](src/02-express/)
掌握最流行的 Node.js Web 框架

**主要內容**:
- 中間件系統
- 路由管理
- RESTful API 設計
- 錯誤處理

### [03. Fastify 高性能框架](src/03-fastify/)
學習高性能的替代方案

**主要內容**:
- Schema 驗證
- 插件系統
- 性能優化

### [04. 數據庫與 ORM](src/04-database/)
數據持久化和 Prisma ORM

**主要內容**:
- PostgreSQL 基礎
- Prisma ORM
- 數據建模
- 查詢優化

### [05. 測試與質量保證](src/05-testing/)
確保代碼質量

**主要內容**:
- 單元測試 (Vitest)
- 整合測試
- TDD/BDD 實踐

### [06. 進階主題](src/06-advanced/)
微服務、GraphQL、WebSocket 等

**主要內容**:
- WebSocket 實時通信
- GraphQL API
- 微服務架構
- 性能優化

## 🚀 快速開始

### 環境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安裝依賴

```bash
# 安裝所有依賴
npm install

# 或使用 pnpm (推薦)
pnpm install
```

### 運行範例

```bash
# 使用開發模式運行任何範例（支持熱重載）
npm run dev -- src/01-basics/examples/01-http-hello-world.ts

# 或直接使用 tsx
npx tsx src/01-basics/examples/01-http-hello-world.ts
```

### 構建專案

```bash
# TypeScript 編譯
npm run build

# 運行編譯後的代碼
npm start
```

### 代碼檢查和格式化

```bash
# ESLint 檢查
npm run lint

# 自動修復
npm run lint:fix

# Prettier 格式化
npm run format
```

### 運行測試

```bash
# 運行所有測試
npm test

# 查看測試覆蓋率
npm run test:coverage
```

## 📖 學習建議

### 建議學習順序

1. **基礎階段** (2-3 週)
   - 完成 `01-basics` 所有範例
   - 理解異步編程
   - 熟悉 TypeScript 基礎

2. **框架階段** (3-4 週)
   - 學習 `02-express`
   - 完成練習項目
   - 建立 RESTful API

3. **進階階段** (4-6 週)
   - 數據庫整合
   - 測試實踐
   - 進階主題探索

詳細的學習路線圖請參考：[完整學習路線](docs/LEARNING_PATH.md)

### 每日學習建議

- **理論學習**: 30 分鐘
- **實踐編碼**: 1-2 小時
- **複習總結**: 30 分鐘

## 📁 專案結構

```
nodejs-learning/
├── src/                    # 源代碼
│   ├── 01-basics/         # 基礎章節
│   │   ├── examples/      # 範例代碼
│   │   ├── exercises/     # 練習題
│   │   └── solutions/     # 參考答案
│   ├── 02-express/        # Express 章節
│   ├── 03-fastify/        # Fastify 章節
│   ├── 04-database/       # 數據庫章節
│   ├── 05-testing/        # 測試章節
│   └── 06-advanced/       # 進階章節
├── docs/                   # 文檔
│   └── LEARNING_PATH.md   # 學習路線圖
├── dist/                   # 編譯輸出（自動生成）
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠 技術棧

### 核心技術
- **Node.js** 18+
- **TypeScript** 5.3+
- **ES Modules**

### Web 框架
- **Express.js** 4.18+
- **Fastify** 4.25+

### 開發工具
- **tsx** - TypeScript 執行器
- **ESLint** - 代碼檢查
- **Prettier** - 代碼格式化
- **Vitest** - 測試框架

### 數據庫（後續章節）
- **PostgreSQL**
- **Prisma ORM**

## 📝 範例代碼

### Hello World (Modern TypeScript)

```typescript
import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>Hello, Modern Node.js!</h1>');
});

server.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
```

### Express API

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/users', (req, res) => {
  res.json({ users: ['Alice', 'Bob'] });
});

app.listen(4000, () => {
  console.log('🚀 API running on http://localhost:4000');
});
```

## 🎯 學習目標檢核表

- [ ] 能夠創建 HTTP 伺服器
- [ ] 理解異步編程模式
- [ ] 熟練使用 fs 模組
- [ ] 能夠設計 RESTful API
- [ ] 掌握中間件概念
- [ ] 會整合數據庫
- [ ] 能夠編寫測試
- [ ] 理解微服務架構

## 📚 學習資源

### 官方文檔
- [Node.js 官方文檔](https://nodejs.org/docs/)
- [TypeScript 文檔](https://www.typescriptlang.org/docs/)
- [Express.js 文檔](https://expressjs.com/)

### 推薦閱讀
- [Node.js 最佳實踐](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 🌟 舊版本

舊的 JavaScript 版本代碼仍保留在 `01/` 目錄下，供參考對比。

---

**開始你的 Node.js 學習之旅吧！** 🚀

從 [學習路線 01](src/01-basics/) 開始 →
