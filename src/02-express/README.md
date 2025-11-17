# 學習路線 02：Express.js 現代 Web 框架

## 📚 學習目標

- 理解 Express.js 的核心概念
- 掌握中間件（Middleware）機制
- 學習路由和控制器模式
- 處理請求和響應
- 錯誤處理最佳實踐
- RESTful API 設計

## 📖 章節內容

### 1. Express 基礎
- **範例 1**: Hello World (`examples/01-express-hello.ts`)
- **範例 2**: 中間件基礎 (`examples/02-middleware.ts`)
- **範例 3**: 路由管理 (`examples/03-routing.ts`)

### 2. RESTful API
- **範例 4**: CRUD 操作 (`examples/04-rest-api.ts`)
- **範例 5**: 請求驗證 (`examples/05-validation.ts`)
- **範例 6**: 錯誤處理 (`examples/06-error-handling.ts`)

### 3. 進階主題
- **範例 7**: 文件上傳 (`examples/07-file-upload.ts`)
- **範例 8**: 認證與授權 (`examples/08-auth.ts`)
- **範例 9**: API 文檔 (`examples/09-api-docs.ts`)

## 🎯 練習題

1. 建立一個完整的 Todo List API
2. 實作用戶註冊和登入系統
3. 建立帶有分頁的商品列表 API

## 🚀 運行範例

```bash
npm run dev -- src/02-express/examples/01-express-hello.ts
```

## 💡 重要概念

### 中間件（Middleware）
Express 的核心概念，用於處理請求-響應循環中的邏輯。

### 路由（Routing）
組織和管理不同 URL 端點的方式。

### MVC 模式
Model-View-Controller 架構模式（本教程專注於 API，主要是 MC）。
