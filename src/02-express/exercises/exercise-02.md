# Exercise 02: 實現博客 API

## 目標

構建一個功能完整的博客 API，支持文章管理、分類、標籤、評論等功能。

## 需求

### 1. 文章管理

#### 1.1 獲取文章列表

- 端點：`GET /api/posts`
- 查詢參數：
  - `page`: 頁碼（默認：1）
  - `limit`: 每頁數量（默認：10，最大：100）
  - `sort`: 排序字段（createdAt, updatedAt, title, views）
  - `order`: 排序順序（asc, desc，默認：desc）
  - `category`: 分類 ID 過濾
  - `tag`: 標籤 ID 過濾
  - `author`: 作者 ID 過濾
  - `status`: 狀態過濾（draft, published）
  - `search`: 搜索關鍵詞（搜索標題和內容）
- 功能要求：
  - 支持分頁
  - 支持多種排序方式
  - 支持過濾和搜索
  - 返回文章摘要（不返回完整內容）
  - 包含作者、分類、標籤信息

#### 1.2 獲取單篇文章

- 端點：`GET /api/posts/:id`
- 功能要求：
  - 返回完整文章內容
  - 包含作者信息
  - 包含分類和標籤
  - 包含評論列表（支持分頁）
  - 增加瀏覽次數
  - 未發布的文章只有作者和管理員可見

#### 1.3 創建文章

- 端點：`POST /api/posts`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "title": "string (必填，1-200字符)",
    "content": "string (必填，最少50字符)",
    "excerpt": "string (可選，文章摘要)",
    "categoryId": "number (必填)",
    "tagIds": "number[] (可選)",
    "coverImage": "string (可選，圖片URL)",
    "status": "draft | published (默認：draft)"
  }
  ```
- 功能要求：
  - 驗證所有必填字段
  - 自動設置作者為當前登錄用戶
  - 如果沒有提供摘要，自動生成（前200字符）
  - 生成 SEO 友好的 slug
  - 設置發布時間（如果狀態為 published）

#### 1.4 更新文章

- 端點：`PUT /api/posts/:id`
- 認證：需要登錄且為文章作者或管理員
- 請求體：同創建文章
- 功能要求：
  - 只有作者或管理員可以更新
  - 更新 updatedAt 時間戳
  - 如果從 draft 改為 published，設置 publishedAt

#### 1.5 刪除文章

- 端點：`DELETE /api/posts/:id`
- 認證：需要登錄且為文章作者或管理員
- 功能要求：
  - 只有作者或管理員可以刪除
  - 同時刪除相關的評論
  - 可選：實現軟刪除

### 2. 分類管理

#### 2.1 獲取所有分類

- 端點：`GET /api/categories`
- 功能要求：
  - 返回所有分類
  - 包含每個分類的文章數量

#### 2.2 獲取單個分類

- 端點：`GET /api/categories/:id`
- 功能要求：
  - 返回分類信息
  - 包含該分類的文章列表（支持分頁）

#### 2.3 創建分類

- 端點：`POST /api/categories`
- 認證：需要管理員權限
- 請求體：
  ```json
  {
    "name": "string (必填，唯一)",
    "slug": "string (可選，自動生成)",
    "description": "string (可選)"
  }
  ```

#### 2.4 更新分類

- 端點：`PUT /api/categories/:id`
- 認證：需要管理員權限

#### 2.5 刪除分類

- 端點：`DELETE /api/categories/:id`
- 認證：需要管理員權限
- 功能要求：
  - 不能刪除包含文章的分類
  - 或者：將該分類的文章移動到默認分類

### 3. 標籤管理

#### 3.1 獲取所有標籤

- 端點：`GET /api/tags`
- 功能要求：
  - 返回所有標籤
  - 包含每個標籤的使用次數
  - 支持按使用次數排序

#### 3.2 獲取單個標籤

- 端點：`GET /api/tags/:id`
- 功能要求：
  - 返回標籤信息
  - 包含該標籤的文章列表（支持分頁）

#### 3.3 創建標籤

- 端點：`POST /api/tags`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "name": "string (必填，唯一)",
    "slug": "string (可選，自動生成)"
  }
  ```

#### 3.4 更新標籤

- 端點：`PUT /api/tags/:id`
- 認證：需要管理員權限

#### 3.5 刪除標籤

- 端點：`DELETE /api/tags/:id`
- 認證：需要管理員權限
- 功能要求：
  - 刪除標籤時移除所有文章的關聯

### 4. 評論管理

#### 4.1 獲取文章的評論

- 端點：`GET /api/posts/:postId/comments`
- 查詢參數：
  - `page`: 頁碼
  - `limit`: 每頁數量
- 功能要求：
  - 支持分頁
  - 按時間倒序排列
  - 支持嵌套評論（回復）

#### 4.2 創建評論

- 端點：`POST /api/posts/:postId/comments`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "content": "string (必填，1-1000字符)",
    "parentId": "number (可選，回復的評論ID)"
  }
  ```
- 功能要求：
  - 驗證文章存在
  - 如果是回復，驗證父評論存在
  - 自動設置作者為當前登錄用戶

#### 4.3 更新評論

- 端點：`PUT /api/comments/:id`
- 認證：需要登錄且為評論作者或管理員
- 請求體：
  ```json
  {
    "content": "string"
  }
  ```

#### 4.4 刪除評論

- 端點：`DELETE /api/comments/:id`
- 認證：需要登錄且為評論作者或管理員
- 功能要求：
  - 刪除評論時同時刪除所有子評論
  - 或者：只標記為已刪除，保留結構

#### 4.5 點贊評論

- 端點：`POST /api/comments/:id/like`
- 認證：需要登錄
- 功能要求：
  - 用戶只能點贊一次
  - 再次點擊取消點贊

### 5. 文章互動

#### 5.1 點贊文章

- 端點：`POST /api/posts/:id/like`
- 認證：需要登錄
- 功能要求：
  - 用戶只能點贊一次
  - 再次點擊取消點贊
  - 更新文章的點贊數

#### 5.2 收藏文章

- 端點：`POST /api/posts/:id/favorite`
- 認證：需要登錄
- 功能要求：
  - 添加到用戶的收藏列表
  - 再次點擊取消收藏

#### 5.3 獲取用戶收藏

- 端點：`GET /api/users/favorites`
- 認證：需要登錄
- 功能要求：
  - 返回當前用戶的收藏列表
  - 支持分頁

### 6. 搜索功能

#### 6.1 搜索文章

- 端點：`GET /api/search`
- 查詢參數：
  - `q`: 搜索關鍵詞
  - `type`: 搜索類型（posts, users, tags）
  - `page`: 頁碼
  - `limit`: 每頁數量
- 功能要求：
  - 支持全文搜索（標題、內容、摘要）
  - 支持高亮顯示匹配內容
  - 按相關性排序

### 7. 統計功能

#### 7.1 獲取博客統計

- 端點：`GET /api/stats`
- 功能要求：
  - 總文章數
  - 總評論數
  - 總訪問量
  - 熱門文章（按瀏覽量）
  - 熱門標籤（按使用次數）
  - 最新文章

#### 7.2 獲取用戶統計

- 端點：`GET /api/users/:id/stats`
- 功能要求：
  - 用戶的文章數
  - 用戶的評論數
  - 用戶獲得的點贊數
  - 用戶的收藏數

## 數據模型

### User

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  bio?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Post

```typescript
interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  authorId: number;
  categoryId: number;
  status: 'draft' | 'published';
  views: number;
  likes: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Category

```typescript
interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Tag

```typescript
interface Tag {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Comment

```typescript
interface Comment {
  id: number;
  content: string;
  postId: number;
  authorId: number;
  parentId?: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### PostTag (多對多關係)

```typescript
interface PostTag {
  postId: number;
  tagId: number;
}
```

### PostLike

```typescript
interface PostLike {
  userId: number;
  postId: number;
  createdAt: Date;
}
```

### PostFavorite

```typescript
interface PostFavorite {
  userId: number;
  postId: number;
  createdAt: Date;
}
```

### CommentLike

```typescript
interface CommentLike {
  userId: number;
  commentId: number;
  createdAt: Date;
}
```

## 技術要求

1. **RESTful 設計**
   - 使用適當的 HTTP 方法
   - 使用適當的 HTTP 狀態碼
   - 統一的響應格式

2. **認證和授權**
   - 使用 JWT 認證
   - 實現角色基礎的訪問控制
   - 保護需要認證的端點

3. **驗證**
   - 驗證所有輸入
   - 使用中間件進行驗證
   - 返回清晰的驗證錯誤

4. **分頁**
   - 所有列表端點支持分頁
   - 返回分頁元數據

5. **錯誤處理**
   - 統一的錯誤處理
   - 清晰的錯誤消息
   - 適當的狀態碼

6. **性能**
   - 使用索引優化查詢
   - 避免 N+1 查詢問題
   - 考慮緩存策略

## 測試場景

```bash
# 創建分類
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Technology", "description": "Tech articles"}'

# 創建標籤
curl -X POST http://localhost:3000/api/tags \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "JavaScript"}'

# 創建文章
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with TypeScript",
    "content": "TypeScript is a typed superset of JavaScript...",
    "categoryId": 1,
    "tagIds": [1, 2],
    "status": "published"
  }'

# 獲取文章列表
curl "http://localhost:3000/api/posts?page=1&limit=10&category=1&sort=createdAt&order=desc"

# 搜索文章
curl "http://localhost:3000/api/search?q=typescript&type=posts"

# 創建評論
curl -X POST http://localhost:3000/api/posts/1/comments \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Great article!"}'

# 點贊文章
curl -X POST http://localhost:3000/api/posts/1/like \
  -H "Authorization: Bearer USER_TOKEN"

# 收藏文章
curl -X POST http://localhost:3000/api/posts/1/favorite \
  -H "Authorization: Bearer USER_TOKEN"

# 獲取統計
curl http://localhost:3000/api/stats
```

## 評分標準

- **功能完整性（40%）**
  - 實現所有必需端點
  - 功能正確運作

- **API 設計（20%）**
  - RESTful 設計原則
  - 統一的響應格式
  - 適當的狀態碼

- **數據關係（15%）**
  - 正確處理多對多關係
  - 關聯數據的正確返回
  - 級聯操作正確實現

- **代碼質量（15%）**
  - 代碼組織良好
  - 適當的註釋
  - TypeScript 類型完整

- **錯誤處理（10%）**
  - 完善的錯誤處理
  - 清晰的錯誤消息
  - 適當的日誌記錄

## 提示

1. 先實現基礎的 CRUD 操作
2. 然後添加關聯關係（分類、標籤）
3. 實現評論功能
4. 添加互動功能（點贊、收藏）
5. 實現搜索和統計功能
6. 最後優化性能和添加緩存

## 擴展挑戰

1. 實現文章版本控制
2. 添加文章草稿自動保存
3. 實現文章定時發布
4. 添加 Markdown 支持
5. 實現圖片上傳和管理
6. 添加 RSS 訂閱
7. 實現文章推薦算法
8. 添加全文搜索引擎（Elasticsearch）
9. 實現評論審核系統
10. 添加文章閱讀進度追蹤
