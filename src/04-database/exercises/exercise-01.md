# 練習 01：設計博客數據庫

## 目標

設計並實現一個完整的博客系統數據庫架構，包含用戶、文章、評論、分類和標籤等功能。

## 背景

你需要為一個博客平台設計數據庫架構。這個平台需要支持以下功能：

1. 用戶註冊和登錄
2. 發布和管理文章
3. 文章分類和標籤
4. 評論系統（支持嵌套回覆）
5. 點贊功能
6. 用戶個人資料

## 任務要求

### 任務 1：設計數據模型

創建一個 `prisma/schema.prisma` 文件，定義以下模型：

#### 1.1 用戶模型（User）

需要的字段：
- `id`：主鍵
- `email`：唯一、必填
- `username`：唯一、必填
- `password`：必填（實際應用中存儲哈希值）
- `displayName`：顯示名稱
- `avatar`：頭像 URL
- `bio`：個人簡介
- `role`：角色（USER、ADMIN、MODERATOR）
- `isActive`：是否激活
- `emailVerified`：郵箱是否已驗證
- `createdAt`：創建時間
- `updatedAt`：更新時間

#### 1.2 用戶資料模型（UserProfile）

與 User 一對一關係，包含：
- 真實姓名
- 出生日期
- 電話號碼
- 地址信息（城市、國家、郵編）
- 社交媒體鏈接（網站、Twitter、GitHub、LinkedIn）
- 偏好設置（語言、時區）

#### 1.3 文章模型（Post）

需要的字段：
- `id`：主鍵
- `title`：標題
- `slug`：URL 友好的標識符（唯一）
- `content`：文章內容（TEXT 類型）
- `excerpt`：摘要
- `coverImage`：封面圖片
- `published`：是否已發布
- `publishedAt`：發布時間
- `viewCount`：瀏覽次數
- `authorId`：作者外鍵
- `categoryId`：分類外鍵（可選）
- `createdAt`：創建時間
- `updatedAt`：更新時間

#### 1.4 分類模型（Category）

- `id`：主鍵
- `name`：分類名稱（唯一）
- `slug`：URL 標識符
- `description`：描述
- `color`：顏色標記
- `icon`：圖標
- `order`：排序順序

#### 1.5 標籤模型（Tag）

- `id`：主鍵
- `name`：標籤名稱（唯一）
- `slug`：URL 標識符
- `createdAt`：創建時間

#### 1.6 文章-標籤關聯模型（PostTag）

多對多中間表：
- `postId`：文章外鍵
- `tagId`：標籤外鍵
- `assignedAt`：分配時間
- 複合主鍵：`[postId, tagId]`

#### 1.7 評論模型（Comment）

支持嵌套回覆：
- `id`：主鍵
- `content`：評論內容
- `authorId`：作者外鍵
- `postId`：文章外鍵
- `parentId`：父評論外鍵（用於嵌套回覆）
- `isApproved`：是否已審核
- `createdAt`：創建時間
- `updatedAt`：更新時間

#### 1.8 點贊模型（Like）

- `id`：主鍵
- `userId`：用戶外鍵
- `postId`：文章外鍵
- `createdAt`：創建時間
- 唯一約束：`[userId, postId]`（一個用戶只能對同一篇文章點贊一次）

### 任務 2：添加索引和約束

為以下字段添加適當的索引：

1. 用戶表：
   - `email`（唯一索引）
   - `username`（唯一索引）

2. 文章表：
   - `slug`（唯一索引）
   - `authorId`（索引）
   - `categoryId`（索引）
   - 複合索引：`[published, createdAt]`

3. 評論表：
   - `postId`（索引）
   - `authorId`（索引）
   - `parentId`（索引）

4. 點贊表：
   - 複合唯一索引：`[userId, postId]`

### 任務 3：定義關聯關係

確保正確設置以下關聯：

1. **一對一**：User ←→ UserProfile
2. **一對多**：
   - User → Posts
   - User → Comments
   - User → Likes
   - Post → Comments
   - Post → Likes
   - Category → Posts
   - Comment → Replies（自關聯）
3. **多對多**：Post ←→ Tag（通過 PostTag）

### 任務 4：設置刪除策略

為所有外鍵設置適當的刪除策略（`onDelete`）：

- User 刪除時：
  - 級聯刪除其所有 Posts、Comments、Likes
  - 級聯刪除 UserProfile

- Post 刪除時：
  - 級聯刪除所有 Comments、Likes、PostTag 關聯

- Category 刪除時：
  - 將關聯的 Post 的 categoryId 設為 NULL（`SetNull`）

- Comment 刪除時：
  - 級聯刪除所有子評論（replies）

### 任務 5：添加默認值

為以下字段設置默認值：

- `User.role`：默認為 `USER`
- `User.isActive`：默認為 `true`
- `User.emailVerified`：默認為 `false`
- `Post.published`：默認為 `false`
- `Post.viewCount`：默認為 `0`
- `Comment.isApproved`：默認為 `true`
- 所有 `createdAt`：默認為 `now()`
- 所有 `updatedAt`：自動更新（`@updatedAt`）

## 實現步驟

### 步驟 1：創建 Schema 文件

```bash
# 初始化 Prisma（如果還沒有）
npx prisma init --datasource-provider sqlite
```

### 步驟 2：編寫 Schema

在 `prisma/schema.prisma` 中定義所有模型。

參考範例：
```prisma
model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  username      String    @unique
  password      String
  displayName   String?
  // ... 其他字段

  // 關聯
  profile       UserProfile?
  posts         Post[]
  comments      Comment[]
  likes         Like[]

  @@index([email])
  @@map("users")
}
```

### 步驟 3：創建遷移

```bash
# 創建並應用遷移
npx prisma migrate dev --name init

# 打開 Prisma Studio 查看數據庫
npx prisma studio
```

### 步驟 4：生成 Prisma Client

```bash
npx prisma generate
```

## 驗證要求

完成後，你的 schema 應該能夠：

1. ✅ 成功執行遷移，無錯誤
2. ✅ 在 Prisma Studio 中看到所有表
3. ✅ 所有關聯關係正確顯示
4. ✅ 所有索引和約束正確創建
5. ✅ TypeScript 類型正確生成

## 測試你的設計

創建一個測試文件 `test-schema.ts`：

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSchema() {
  // 測試創建用戶及關聯數據
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashed_password',
      displayName: 'Test User',
      profile: {
        create: {
          firstName: 'Test',
          lastName: 'User',
          city: 'Taipei',
        },
      },
      posts: {
        create: {
          title: 'My First Post',
          slug: 'my-first-post',
          content: 'Content here...',
          published: true,
          publishedAt: new Date(),
        },
      },
    },
    include: {
      profile: true,
      posts: true,
    },
  })

  console.log('創建成功：', user)

  // 測試查詢
  const posts = await prisma.post.findMany({
    where: {
      published: true,
    },
    include: {
      author: {
        select: {
          displayName: true,
          avatar: true,
        },
      },
      category: true,
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  })

  console.log('文章列表：', posts)
}

testSchema()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## 擴展挑戰

完成基礎任務後，嘗試以下擴展：

### 挑戰 1：添加草稿系統

為文章添加狀態字段：
- `DRAFT`：草稿
- `PUBLISHED`：已發布
- `ARCHIVED`：已歸檔

### 挑戰 2：添加閱讀歷史

創建一個 `ReadingHistory` 模型，記錄用戶的閱讀記錄：
- 用戶 ID
- 文章 ID
- 閱讀時間
- 閱讀進度（百分比）

### 挑戰 3：添加收藏功能

創建一個 `Bookmark` 模型，允許用戶收藏文章。

### 挑戰 4：添加關注系統

創建一個 `Follow` 模型，實現用戶之間的關注關係（多對多自關聯）。

### 挑戰 5：添加通知系統

創建一個 `Notification` 模型，支持以下通知類型：
- 新評論
- 新點贊
- 新關注者
- 被提及（@mention）

### 挑戰 6：添加媒體管理

創建 `Media` 模型，管理上傳的圖片和文件：
- 文件名
- 文件路徑
- 文件類型
- 文件大小
- 上傳者
- 關聯到文章或評論

## 評分標準

- **Schema 設計**（40 分）：
  - 所有必需的模型都已定義
  - 字段類型正確
  - 關聯關係正確

- **索引和約束**（20 分）：
  - 適當的索引
  - 正確的唯一約束
  - 合理的刪除策略

- **數據完整性**（20 分）：
  - 默認值設置合理
  - 必填/可選字段區分正確
  - 外鍵約束正確

- **代碼質量**（20 分）：
  - 命名規範
  - 註釋清晰
  - 遷移成功執行

## 提示

1. 使用 `@map` 和 `@@map` 將模型和字段映射到自定義的數據庫名稱
2. 使用 `@db.Text` 為長文本字段指定正確的數據庫類型
3. 考慮使用枚舉（`enum`）來限制某些字段的值
4. 為經常查詢的字段組合創建複合索引
5. 使用 Prisma Studio 驗證你的數據結構

## 參考資料

- [Prisma Schema 參考](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [關聯關係](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [索引](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes)

## 提交

完成後，確保提交以下文件：

1. `prisma/schema.prisma` - 你的 schema 定義
2. `prisma/migrations/` - 遷移文件
3. `test-schema.ts` - 測試代碼
4. 截圖顯示 Prisma Studio 中的表結構

祝你好運！
