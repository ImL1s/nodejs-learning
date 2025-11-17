# 實戰項目：Todo List API

## 📚 項目簡介

這是一個完整的 RESTful Todo List API，使用 Express.js 和 TypeScript 構建。

## 🎯 學習目標

- 應用 Express.js 構建完整 API
- 實踐 RESTful API 設計原則
- 使用中間件處理驗證和錯誤
- 編寫測試用例
- 使用內存數據庫（可擴展為真實數據庫）

## ✨ 功能特性

- ✅ CRUD 操作（創建、讀取、更新、刪除）
- ✅ 數據驗證
- ✅ 錯誤處理
- ✅ 過濾和排序
- ✅ 完整的類型支持
- ✅ 完整的測試覆蓋
- ✅ Docker 支持
- ✅ API 文檔

## 📁 項目結構

```
todo-api/
├── src/
│   ├── app.ts              # Express 應用配置
│   ├── server.ts           # 伺服器啟動
│   ├── types/              # 類型定義
│   ├── models/             # 數據模型
│   ├── routes/             # 路由
│   ├── controllers/        # 控制器
│   ├── middlewares/        # 中間件
│   └── utils/              # 工具函數
├── tests/                  # 測試文件
│   ├── unit/              # 單元測試
│   ├── integration/       # 整合測試
│   └── e2e/               # E2E 測試
├── docs/                   # 文檔
│   ├── API.md             # API 文檔
│   └── DOCKER.md          # Docker 部署指南
├── Dockerfile              # Docker 配置
├── docker-compose.yml      # Docker Compose 配置
└── jest.config.js          # Jest 測試配置
```

## 🚀 快速開始

### 本地開發

```bash
# 安裝依賴
npm install

# 運行開發伺服器
npm run dev

# 運行測試
npm test

# 運行測試並查看覆蓋率
npm run test:coverage

# 構建項目
npm run build

# 運行生產版本
npm start
```

### 使用 Docker

```bash
# 使用 Docker Compose（推薦）
docker-compose up -d

# 或使用 Docker
docker build -t todo-api .
docker run -p 3000:3000 todo-api
```

詳細的 Docker 部署指南請查看 [docs/DOCKER.md](./docs/DOCKER.md)

## 📖 API 端點

### Todo 操作

```
GET    /api/todos           - 獲取所有 todos
GET    /api/todos/:id       - 獲取單個 todo
POST   /api/todos           - 創建新 todo
PUT    /api/todos/:id       - 更新 todo
DELETE /api/todos/:id       - 刪除 todo
PATCH  /api/todos/:id/toggle - 切換完成狀態
```

### 查詢參數

```
GET /api/todos?completed=true    - 過濾已完成
GET /api/todos?priority=high     - 按優先級過濾
GET /api/todos?sort=createdAt    - 排序
```

## 🧪 API 使用示例

完整的 API 文檔請查看 [docs/API.md](./docs/API.md)

```bash
# 創建 todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"學習 Node.js","description":"完成 Node.js 課程"}'

# 獲取所有 todos
curl http://localhost:3000/api/todos

# 獲取單個 todo
curl http://localhost:3000/api/todos/1

# 更新 todo
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"深入學習 Node.js","completed":true}'

# 切換完成狀態
curl -X PATCH http://localhost:3000/api/todos/1/toggle

# 刪除 todo
curl -X DELETE http://localhost:3000/api/todos/1

# 獲取統計信息
curl http://localhost:3000/api/todos/stats
```

## 🧪 測試

### 運行測試

```bash
# 運行所有測試
npm test

# 運行單元測試
npm run test:unit

# 運行 E2E 測試
npm run test:e2e

# 運行測試並生成覆蓋率報告
npm run test:coverage

# 監視模式
npm run test:watch
```

### 測試結構

- **單元測試** (`tests/unit/`): 測試單個函數和組件
- **整合測試** (`tests/integration/`): 測試多個組件的協作
- **E2E 測試** (`tests/e2e/`): 測試完整的 API 流程

### 覆蓋率目標

- 語句覆蓋率: >= 70%
- 分支覆蓋率: >= 70%
- 函數覆蓋率: >= 70%
- 行覆蓋率: >= 70%

## 📖 文檔

- [API 文檔](./docs/API.md) - 完整的 API 端點說明
- [Docker 部署指南](./docs/DOCKER.md) - Docker 部署和配置說明

## 🛠️ 技術棧

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx

## 💡 擴展建議

1. **添加數據庫**：整合 PostgreSQL + Prisma
2. **用戶認證**：添加 JWT 認證
3. **標籤系統**：為 todos 添加標籤功能
4. **截止日期**：添加 due date 功能
5. **分頁**：實現分頁功能
6. **搜索**：添加全文搜索
7. **Redis 緩存**：提升性能
8. **WebSocket**：實時更新

## 🚀 部署

### Docker 部署（推薦）

```bash
# 使用 Docker Compose
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down
```

### 傳統部署

```bash
# 構建
npm run build

# 使用 PM2 運行
pm2 start dist/server.js --name todo-api

# 查看狀態
pm2 status

# 查看日誌
pm2 logs todo-api
```

## 🔍 健康檢查

API 提供健康檢查端點：

```bash
curl http://localhost:3000/
```

響應：
```json
{
  "message": "📝 Todo List API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

## 📚 相關章節

- [Express 基礎](../../02-express/)
- [測試實踐](../../05-testing/)
- [Docker 容器化](../../06-advanced/)
