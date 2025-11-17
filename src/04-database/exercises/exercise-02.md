# 練習 02：實現用戶和文章關聯

## 目標

基於練習 01 的數據庫設計，實現完整的用戶和文章管理功能，包括 CRUD 操作、關聯查詢和業務邏輯。

## 前置要求

- 完成練習 01 的數據庫設計
- 熟悉 Prisma Client 基礎操作
- 了解 TypeScript 和 async/await

## 任務概覽

你需要創建一個 TypeScript 模塊，實現以下功能：

1. 用戶管理
2. 文章管理
3. 評論系統
4. 點贊功能
5. 標籤管理
6. 統計和分析

---

## 任務 1：用戶管理模塊

創建文件：`src/services/user.service.ts`

### 1.1 實現用戶註冊

```typescript
/**
 * 註冊新用戶
 * @param data - 用戶註冊數據
 * @returns 創建的用戶（不包含密碼）
 */
async function registerUser(data: {
  email: string
  username: string
  password: string
  displayName?: string
}) {
  // TODO: 實現以下功能
  // 1. 檢查郵箱和用戶名是否已存在
  // 2. 對密碼進行哈希處理（使用 bcrypt）
  // 3. 創建用戶和默認的 UserProfile
  // 4. 返回用戶信息（不包含密碼）
}
```

**要求**：
- 檢查郵箱和用戶名的唯一性
- 使用 bcrypt 對密碼進行哈希
- 同時創建 UserProfile（使用嵌套創建）
- 處理可能的錯誤（如重複註冊）

### 1.2 實現用戶登錄

```typescript
/**
 * 用戶登錄
 * @param email - 郵箱
 * @param password - 密碼
 * @returns 用戶信息和認證令牌（可選）
 */
async function loginUser(email: string, password: string) {
  // TODO: 實現以下功能
  // 1. 查找用戶
  // 2. 驗證密碼
  // 3. 檢查用戶是否激活
  // 4. 返回用戶信息
}
```

**要求**：
- 查詢用戶時包含 profile
- 使用 bcrypt 驗證密碼
- 如果用戶未激活，拋出錯誤
- 返回用戶信息（不包含密碼）

### 1.3 更新用戶資料

```typescript
/**
 * 更新用戶資料
 * @param userId - 用戶 ID
 * @param data - 要更新的數據
 */
async function updateUserProfile(
  userId: number,
  data: {
    displayName?: string
    avatar?: string
    bio?: string
    profile?: {
      firstName?: string
      lastName?: string
      phone?: string
      city?: string
      country?: string
    }
  }
) {
  // TODO: 實現用戶資料更新
  // 包括用戶基本信息和 UserProfile 的更新
}
```

**要求**：
- 使用嵌套更新同時更新 User 和 UserProfile
- 返回更新後的完整用戶信息

### 1.4 獲取用戶詳情

```typescript
/**
 * 獲取用戶詳情
 * @param userId - 用戶 ID
 * @returns 用戶詳細信息，包括統計數據
 */
async function getUserDetails(userId: number) {
  // TODO: 查詢用戶信息，包括：
  // - 基本信息
  // - Profile
  // - 文章數量
  // - 評論數量
  // - 最近的 5 篇文章
}
```

**要求**：
- 使用 `include` 包含關聯數據
- 使用 `_count` 獲取統計數據
- 對文章進行排序和限制數量

---

## 任務 2：文章管理模塊

創建文件：`src/services/post.service.ts`

### 2.1 創建文章

```typescript
/**
 * 創建新文章
 * @param authorId - 作者 ID
 * @param data - 文章數據
 */
async function createPost(
  authorId: number,
  data: {
    title: string
    slug: string
    content: string
    excerpt?: string
    coverImage?: string
    categoryId?: number
    tagIds?: number[]
    published?: boolean
  }
) {
  // TODO: 實現以下功能
  // 1. 檢查 slug 是否已存在
  // 2. 如果提供了 categoryId，驗證分類是否存在
  // 3. 創建文章
  // 4. 關聯標籤（如果提供了 tagIds）
  // 5. 如果 published 為 true，設置 publishedAt
}
```

**要求**：
- 驗證數據完整性
- 使用嵌套創建關聯標籤
- 使用事務確保數據一致性
- 返回完整的文章信息（包含作者、分類、標籤）

### 2.2 更新文章

```typescript
/**
 * 更新文章
 * @param postId - 文章 ID
 * @param authorId - 作者 ID（用於權限檢查）
 * @param data - 更新的數據
 */
async function updatePost(
  postId: number,
  authorId: number,
  data: {
    title?: string
    content?: string
    excerpt?: string
    coverImage?: string
    categoryId?: number
    tagIds?: number[]
    published?: boolean
  }
) {
  // TODO: 實現以下功能
  // 1. 檢查文章是否存在
  // 2. 驗證作者權限
  // 3. 更新文章數據
  // 4. 如果提供了 tagIds，更新標籤關聯
  // 5. 如果從未發布變為發布，設置 publishedAt
}
```

**要求**：
- 檢查作者權限（只能編輯自己的文章）
- 如果更新標籤，先刪除舊的關聯，再創建新的
- 使用事務處理

### 2.3 刪除文章

```typescript
/**
 * 刪除文章
 * @param postId - 文章 ID
 * @param authorId - 作者 ID（用於權限檢查）
 */
async function deletePost(postId: number, authorId: number) {
  // TODO: 實現以下功能
  // 1. 檢查文章是否存在
  // 2. 驗證作者權限
  // 3. 刪除文章（級聯刪除評論、點贊、標籤關聯）
}
```

**要求**：
- 檢查權限
- 由於設置了級聯刪除，評論和點贊會自動刪除

### 2.4 獲取文章詳情

```typescript
/**
 * 獲取文章詳情
 * @param postId - 文章 ID
 * @param incrementView - 是否增加瀏覽次數
 */
async function getPostDetails(postId: number, incrementView = true) {
  // TODO: 實現以下功能
  // 1. 查詢文章詳情，包括：
  //    - 作者信息（姓名、頭像）
  //    - 分類
  //    - 標籤
  //    - 評論數量
  //    - 點贊數量
  // 2. 如果 incrementView 為 true，增加瀏覽次數
  // 3. 返回完整的文章信息
}
```

**要求**：
- 使用 `include` 和 `select` 優化查詢
- 使用 `_count` 獲取評論和點贊數量
- 如果需要增加瀏覽次數，使用原子操作（`increment`）

### 2.5 查詢文章列表

```typescript
/**
 * 查詢文章列表（帶分頁和過濾）
 * @param options - 查詢選項
 */
async function getPostList(options: {
  page?: number
  pageSize?: number
  categoryId?: number
  tagId?: number
  authorId?: number
  published?: boolean
  search?: string
  orderBy?: 'latest' | 'popular' | 'mostLiked'
}) {
  // TODO: 實現以下功能
  // 1. 構建查詢條件（where）
  // 2. 實現搜索（標題或內容包含關鍵字）
  // 3. 實現分頁
  // 4. 實現排序（最新、最熱門、最多點贊）
  // 5. 返回文章列表和分頁信息
}
```

**要求**：
- 支持多條件過濾
- 實現模糊搜索（使用 `contains`）
- 計算總頁數
- 包含作者、分類、標籤、統計信息

---

## 任務 3：評論系統

創建文件：`src/services/comment.service.ts`

### 3.1 創建評論

```typescript
/**
 * 創建評論
 * @param data - 評論數據
 */
async function createComment(data: {
  content: string
  authorId: number
  postId: number
  parentId?: number
}) {
  // TODO: 實現以下功能
  // 1. 驗證文章是否存在
  // 2. 如果是回覆（有 parentId），驗證父評論是否存在
  // 3. 創建評論
  // 4. 返回評論信息（包含作者信息）
}
```

**要求**：
- 驗證關聯記錄是否存在
- 返回包含作者信息的評論

### 3.2 獲取文章的評論列表

```typescript
/**
 * 獲取文章的評論列表（樹形結構）
 * @param postId - 文章 ID
 */
async function getPostComments(postId: number) {
  // TODO: 實現以下功能
  // 1. 查詢所有頂級評論（parentId 為 null）
  // 2. 每個評論包含其回覆（replies）
  // 3. 按創建時間排序
  // 4. 包含作者信息
}
```

**要求**：
- 使用嵌套查詢獲取回覆
- 正確構建樹形結構
- 包含作者的姓名和頭像

### 3.3 刪除評論

```typescript
/**
 * 刪除評論
 * @param commentId - 評論 ID
 * @param userId - 用戶 ID（用於權限檢查）
 */
async function deleteComment(commentId: number, userId: number) {
  // TODO: 實現以下功能
  // 1. 查詢評論
  // 2. 檢查權限（只能刪除自己的評論）
  // 3. 刪除評論（級聯刪除所有回覆）
}
```

**要求**：
- 檢查作者權限
- 級聯刪除所有子評論

---

## 任務 4：點贊功能

創建文件：`src/services/like.service.ts`

### 4.1 切換點贊

```typescript
/**
 * 切換點贊狀態
 * @param userId - 用戶 ID
 * @param postId - 文章 ID
 * @returns 是否點贊（true: 已點贊，false: 已取消點贊）
 */
async function toggleLike(userId: number, postId: number) {
  // TODO: 實現以下功能
  // 1. 檢查是否已點贊
  // 2. 如果已點贊，則刪除點贊記錄
  // 3. 如果未點贊，則創建點贊記錄
  // 4. 使用事務確保操作的原子性
}
```

**要求**：
- 使用交互式事務
- 正確處理並發情況
- 返回最終的點贊狀態

### 4.2 檢查用戶是否點贊了文章

```typescript
/**
 * 檢查用戶是否點贊了文章
 * @param userId - 用戶 ID
 * @param postId - 文章 ID
 */
async function hasUserLikedPost(userId: number, postId: number) {
  // TODO: 查詢點贊記錄是否存在
}
```

### 4.3 獲取文章的點贊列表

```typescript
/**
 * 獲取文章的點贊列表
 * @param postId - 文章 ID
 * @param page - 頁碼
 * @param pageSize - 每頁數量
 */
async function getPostLikes(
  postId: number,
  page = 1,
  pageSize = 20
) {
  // TODO: 查詢點贊列表，包含用戶信息，支持分頁
}
```

---

## 任務 5：標籤管理

創建文件：`src/services/tag.service.ts`

### 5.1 創建標籤

```typescript
/**
 * 創建或獲取標籤
 * @param name - 標籤名稱
 */
async function createOrGetTag(name: string) {
  // TODO: 使用 upsert 創建或獲取標籤
  // 自動生成 slug（將名稱轉為小寫，替換空格為連字符）
}
```

**要求**：
- 使用 `upsert` 避免重複
- 自動生成 slug

### 5.2 獲取熱門標籤

```typescript
/**
 * 獲取熱門標籤（按文章數量排序）
 * @param limit - 返回數量
 */
async function getPopularTags(limit = 20) {
  // TODO: 實現以下功能
  // 1. 查詢所有標籤
  // 2. 包含每個標籤的文章數量
  // 3. 按文章數量降序排列
  // 4. 限制返回數量
}
```

**要求**：
- 使用 `_count` 獲取文章數量
- 正確排序

### 5.3 獲取標籤的文章列表

```typescript
/**
 * 獲取標籤下的所有文章
 * @param tagSlug - 標籤 slug
 * @param page - 頁碼
 * @param pageSize - 每頁數量
 */
async function getTagPosts(
  tagSlug: string,
  page = 1,
  pageSize = 10
) {
  // TODO: 查詢標籤下的文章，支持分頁
}
```

---

## 任務 6：統計和分析

創建文件：`src/services/analytics.service.ts`

### 6.1 獲取用戶統計

```typescript
/**
 * 獲取用戶的統計信息
 * @param userId - 用戶 ID
 */
async function getUserStats(userId: number) {
  // TODO: 返回以下統計信息
  // - 總文章數
  // - 已發布文章數
  // - 草稿數
  // - 總瀏覽量
  // - 總評論數
  // - 總點贊數
}
```

**要求**：
- 使用聚合查詢（`aggregate`）
- 使用 `_count` 和 `_sum`

### 6.2 獲取熱門文章

```typescript
/**
 * 獲取熱門文章
 * @param limit - 返回數量
 * @param days - 最近多少天（可選）
 */
async function getPopularPosts(limit = 10, days?: number) {
  // TODO: 查詢熱門文章
  // - 按瀏覽量降序
  // - 可選：只查詢最近 N 天的文章
  // - 包含作者、分類、統計信息
}
```

### 6.3 獲取平台統計

```typescript
/**
 * 獲取平台整體統計
 */
async function getPlatformStats() {
  // TODO: 返回以下統計信息
  // - 總用戶數
  // - 總文章數
  // - 總評論數
  // - 總點贊數
  // - 今日新增用戶
  // - 今日新增文章
}
```

---

## 測試要求

創建文件：`src/tests/integration.test.ts`

### 測試場景

編寫測試覆蓋以下場景：

1. **用戶註冊和登錄流程**
   ```typescript
   // 1. 註冊新用戶
   // 2. 嘗試重複註冊（應該失敗）
   // 3. 登錄
   // 4. 使用錯誤密碼登錄（應該失敗）
   ```

2. **文章發布流程**
   ```typescript
   // 1. 創建草稿
   // 2. 更新文章內容
   // 3. 添加標籤
   // 4. 發布文章
   // 5. 查看文章詳情（瀏覽次數應該增加）
   ```

3. **評論和互動流程**
   ```typescript
   // 1. 用戶 A 發表評論
   // 2. 用戶 B 回覆評論
   // 3. 用戶 C 點贊文章
   // 4. 用戶 C 再次點贊（應該取消點贊）
   ```

4. **查詢和過濾**
   ```typescript
   // 1. 搜索文章
   // 2. 按分類過濾
   // 3. 按標籤過濾
   // 4. 測試分頁
   ```

5. **權限檢查**
   ```typescript
   // 1. 嘗試編輯別人的文章（應該失敗）
   // 2. 嘗試刪除別人的評論（應該失敗）
   ```

---

## 評分標準

### 功能完整性（40 分）

- ✅ 所有必需的函數都已實現
- ✅ 功能符合需求說明
- ✅ 邊界情況處理正確

### 代碼質量（30 分）

- ✅ 代碼結構清晰
- ✅ 命名規範
- ✅ 適當的註釋
- ✅ 錯誤處理完善
- ✅ TypeScript 類型使用正確

### 數據庫操作（20 分）

- ✅ 正確使用 Prisma API
- ✅ 查詢優化（避免 N+1 問題）
- ✅ 適當使用事務
- ✅ 索引利用合理

### 測試覆蓋（10 分）

- ✅ 測試場景全面
- ✅ 測試用例通過
- ✅ 邊界情況測試

---

## 提示

### 1. 密碼哈希

安裝並使用 bcrypt：

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

```typescript
import bcrypt from 'bcrypt'

// 哈希密碼 - 使用至少 12 輪以確保安全性
const BCRYPT_ROUNDS = 12; // 生產環境建議 12-14
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)

// 驗證密碼
const isValid = await bcrypt.compare(password, hashedPassword)
```

### 2. 生成 Slug

```typescript
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}
```

### 3. 錯誤處理

創建自定義錯誤類：

```typescript
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message)
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404)
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}
```

### 4. 事務使用示例

```typescript
await prisma.$transaction(async (tx) => {
  // 所有操作使用 tx 而不是 prisma
  const user = await tx.user.findUnique({ where: { id: 1 } })
  await tx.post.create({ data: { ... } })
})
```

### 5. 查詢優化

```typescript
// ❌ 不好：N+1 問題
const posts = await prisma.post.findMany()
for (const post of posts) {
  const author = await prisma.user.findUnique({
    where: { id: post.authorId }
  })
}

// ✅ 好：使用 include
const posts = await prisma.post.findMany({
  include: {
    author: true
  }
})
```

---

## 提交清單

完成後提交以下內容：

- [ ] `src/services/user.service.ts`
- [ ] `src/services/post.service.ts`
- [ ] `src/services/comment.service.ts`
- [ ] `src/services/like.service.ts`
- [ ] `src/services/tag.service.ts`
- [ ] `src/services/analytics.service.ts`
- [ ] `src/tests/integration.test.ts`
- [ ] README.md（說明如何運行和測試）

---

## 擴展挑戰

完成基礎任務後，嘗試以下擴展：

### 1. 實現文章草稿自動保存

每 30 秒自動保存草稿到數據庫。

### 2. 實現文章版本控制

每次編輯文章時保存歷史版本，支持查看和恢復。

### 3. 實現全文搜索

使用 PostgreSQL 的全文搜索功能或集成 Elasticsearch。

### 4. 實現緩存層

使用 Redis 緩存熱門文章和用戶信息。

### 5. 實現 API 速率限制

防止 API 濫用。

### 6. 實現文章推薦系統

基於用戶閱讀歷史推薦相關文章。

---

祝你編碼愉快！記住，代碼質量和可維護性比快速完成更重要。
