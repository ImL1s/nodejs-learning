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
└── tests/                  # 測試文件
```

## 🚀 快速開始

```bash
# 運行伺服器
npm run dev -- src/projects/todo-api/src/server.ts

# 運行測試
npm test src/projects/todo-api
```

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

## 🧪 測試示例

```bash
# 創建 todo
curl -X POST http://localhost:4000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"學習 Node.js","priority":"high"}'

# 獲取所有 todos
curl http://localhost:4000/api/todos

# 更新 todo
curl -X PUT http://localhost:4000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"深入學習 Node.js","completed":true}'

# 刪除 todo
curl -X DELETE http://localhost:4000/api/todos/1
```

## 💡 擴展建議

1. **添加數據庫**：整合 PostgreSQL + Prisma
2. **用戶認證**：添加 JWT 認證
3. **標籤系統**：為 todos 添加標籤功能
4. **截止日期**：添加 due date 功能
5. **分頁**：實現分頁功能
6. **搜索**：添加全文搜索

## 📚 相關章節

- [Express 基礎](../../02-express/)
- [測試實踐](../../05-testing/)
