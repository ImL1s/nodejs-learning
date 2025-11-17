# Blog API

完整的博客 API，支持用戶認證、文章管理和評論功能。

## 功能特性

- 用戶註冊和登錄（JWT 認證）
- 文章 CRUD 操作
- 評論系統
- 分頁支持
- 輸入驗證
- 錯誤處理
- PostgreSQL 數據庫
- TypeScript 支持
- 完整的測試覆蓋

## 技術棧

- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Validation**: express-validator
- **Testing**: Jest + Supertest
- **Logging**: Winston

## 項目結構

```
blog-api/
├── src/
│   ├── config/           # 配置文件
│   │   ├── database.ts
│   │   └── logger.ts
│   ├── controllers/      # 控制器
│   │   ├── auth.controller.ts
│   │   ├── post.controller.ts
│   │   └── comment.controller.ts
│   ├── middlewares/      # 中間件
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/          # 數據模型
│   │   ├── user.model.ts
│   │   ├── post.model.ts
│   │   └── comment.model.ts
│   ├── routes/          # 路由
│   │   ├── auth.routes.ts
│   │   ├── post.routes.ts
│   │   └── comment.routes.ts
│   ├── services/        # 業務邏輯
│   │   └── auth.service.ts
│   ├── types/           # TypeScript 類型定義
│   │   └── index.ts
│   ├── utils/           # 工具函數
│   │   └── helpers.ts
│   ├── app.ts           # Express 應用
│   └── server.ts        # 服務器入口
├── tests/               # 測試文件
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/                # 文檔
```

## 安裝

```bash
# 安裝依賴
npm install

# 配置環境變量
cp .env.example .env
# 編輯 .env 文件，配置數據庫連接等信息
```

## 環境變量

```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blog_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
```

## 數據庫設置

```bash
# 創建數據庫
createdb blog_db

# 應用會自動創建表格
npm run dev
```

## 運行

```bash
# 開發模式
npm run dev

# 生產模式
npm run build
npm start
```

## API 端點

### 認證

#### 註冊用戶
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "bio": "Optional bio"
}
```

#### 登錄
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### 獲取當前用戶
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 文章

#### 獲取所有文章
```http
GET /api/posts?page=1&limit=20
```

#### 獲取單個文章
```http
GET /api/posts/:id
```

#### 創建文章
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My First Post",
  "content": "Post content here...",
  "excerpt": "Short description",
  "published": true
}
```

#### 更新文章
```http
PUT /api/posts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content"
}
```

#### 刪除文章
```http
DELETE /api/posts/:id
Authorization: Bearer <token>
```

#### 獲取用戶文章
```http
GET /api/posts/user/:userId?page=1&limit=20
```

### 評論

#### 獲取文章評論
```http
GET /api/comments/post/:postId?page=1&limit=50
```

#### 創建評論
```http
POST /api/comments/post/:postId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great post!"
}
```

#### 更新評論
```http
PUT /api/comments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated comment"
}
```

#### 刪除評論
```http
DELETE /api/comments/:id
Authorization: Bearer <token>
```

## 測試

```bash
# 運行所有測試
npm test

# 運行特定測試
npm run test:unit
npm run test:integration
npm run test:e2e

# 生成測試覆蓋率報告
npm run test:coverage

# 監視模式
npm run test:watch
```

## 錯誤處理

API 使用統一的錯誤響應格式：

```json
{
  "success": false,
  "error": "Error message here"
}
```

常見的 HTTP 狀態碼：

- `200` - 成功
- `201` - 創建成功
- `204` - 刪除成功（無內容）
- `400` - 請求錯誤（驗證失敗）
- `401` - 未認證
- `403` - 無權限
- `404` - 資源未找到
- `500` - 服務器錯誤

## 認證

API 使用 JWT（JSON Web Token）進行認證。

1. 註冊或登錄獲取 token
2. 在請求頭中包含 token：
   ```
   Authorization: Bearer <your-token>
   ```

Token 默認有效期為 7 天。

## 開發指南

### 添加新功能

1. 在 `models/` 中創建數據模型
2. 在 `services/` 中添加業務邏輯
3. 在 `controllers/` 中創建控制器
4. 在 `routes/` 中定義路由
5. 在 `app.ts` 中註冊路由
6. 添加相應的測試

### 代碼規範

- 使用 TypeScript 嚴格模式
- 遵循 ESLint 規則
- 所有函數都應有類型註解
- 公共 API 應有適當的驗證
- 錯誤應使用自定義錯誤類

### 提交代碼

```bash
# 運行 linter
npm run lint

# 運行測試
npm test

# 格式化代碼
npm run format
```

## 部署

### Docker 部署

```dockerfile
# 即將添加
```

### 環境要求

- Node.js >= 18.x
- PostgreSQL >= 13.x
- npm >= 9.x

## 性能優化

- 使用連接池管理數據庫連接
- 實現適當的索引
- 支持分頁查詢
- 使用 JWT 無狀態認證

## 安全性

- 密碼使用 bcrypt 加密
- JWT token 認證
- 輸入驗證和清理
- SQL 注入防護（參數化查詢）
- HTTPS 支持（生產環境）

## 待辦事項

- [ ] 添加 Docker 支持
- [ ] 實現文章標籤系統
- [ ] 添加文件上傳功能
- [ ] 實現郵件通知
- [ ] 添加 Redis 緩存
- [ ] 實現 API 限流
- [ ] 添加 Swagger 文檔
- [ ] 實現全文搜索

## 許可證

MIT

## 聯繫方式

如有問題或建議，請提交 issue 或 pull request。
