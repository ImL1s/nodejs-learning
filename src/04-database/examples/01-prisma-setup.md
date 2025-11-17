# Prisma 設置指南

## 什麼是 Prisma？

Prisma 是一個現代化的 TypeScript/JavaScript ORM（Object-Relational Mapping），它提供了：
- **類型安全**：自動生成的 TypeScript 類型
- **直觀的 API**：簡潔易用的數據庫操作
- **遷移工具**：管理數據庫架構變更
- **多數據庫支持**：PostgreSQL、MySQL、SQLite、SQL Server、MongoDB 等

## 安裝步驟

### 1. 初始化項目

```bash
# 創建項目目錄
mkdir my-prisma-project
cd my-prisma-project

# 初始化 package.json
npm init -y

# 安裝 TypeScript 相關依賴
npm install -D typescript ts-node @types/node nodemon

# 初始化 TypeScript 配置
npx tsc --init
```

### 2. 安裝 Prisma

```bash
# 安裝 Prisma CLI 作為開發依賴
npm install -D prisma

# 安裝 Prisma Client
npm install @prisma/client

# 初始化 Prisma（會創建 prisma 目錄和 schema.prisma 文件）
npx prisma init
```

執行 `npx prisma init` 後會創建：
- `prisma/schema.prisma` - 數據庫架構定義文件
- `.env` - 環境變量文件（包含數據庫連接字符串）

### 3. 配置數據庫連接

編輯 `.env` 文件，設置數據庫連接字符串：

```env
# PostgreSQL 示例
DATABASE_URL="postgresql://username:password@localhost:5432/mydb?schema=public"

# MySQL 示例
DATABASE_URL="mysql://username:password@localhost:3306/mydb"

# SQLite 示例（適合開發和學習）
DATABASE_URL="file:./dev.db"
```

### 4. 定義數據模型

編輯 `prisma/schema.prisma`：

```prisma
// 數據源配置
datasource db {
  provider = "sqlite"  // 可以是 postgresql, mysql, sqlite 等
  url      = env("DATABASE_URL")
}

// 客戶端生成器
generator client {
  provider = "prisma-client-js"
}

// 定義數據模型
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 5. 創建和應用遷移

```bash
# 創建第一個遷移（會創建數據庫表）
npx prisma migrate dev --name init

# 這個命令會：
# 1. 根據 schema.prisma 生成 SQL 遷移文件
# 2. 執行遷移，創建數據庫表
# 3. 生成 Prisma Client
```

### 6. 生成 Prisma Client

```bash
# 手動生成/更新 Prisma Client
npx prisma generate

# Prisma Client 會根據你的 schema 自動生成類型安全的 API
```

## 項目結構

```
my-prisma-project/
├── prisma/
│   ├── schema.prisma           # 數據庫架構定義
│   ├── migrations/             # 遷移歷史記錄
│   │   └── 20231117000000_init/
│   │       └── migration.sql
│   └── dev.db                  # SQLite 數據庫文件（如果使用 SQLite）
├── src/
│   └── index.ts                # 應用程序代碼
├── node_modules/
├── .env                        # 環境變量
├── package.json
└── tsconfig.json
```

## 使用 Prisma Client

創建 `src/index.ts`：

```typescript
import { PrismaClient } from '@prisma/client'

// 創建 Prisma Client 實例
const prisma = new PrismaClient()

async function main() {
  // 創建用戶
  const user = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
    },
  })
  console.log('Created user:', user)

  // 查詢所有用戶
  const users = await prisma.user.findMany()
  console.log('All users:', users)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // 斷開數據庫連接
    await prisma.$disconnect()
  })
```

### 運行代碼

```bash
# 使用 ts-node 直接運行
npx ts-node src/index.ts

# 或配置 package.json scripts
npm run dev
```

## 常用 Prisma 命令

```bash
# 數據庫遷移
npx prisma migrate dev          # 創建並應用遷移（開發環境）
npx prisma migrate deploy       # 應用遷移（生產環境）
npx prisma migrate reset        # 重置數據庫

# Prisma Client
npx prisma generate             # 生成 Prisma Client

# 數據庫管理
npx prisma db push              # 同步 schema 到數據庫（不創建遷移）
npx prisma db pull              # 從數據庫生成 schema
npx prisma db seed              # 運行種子腳本

# 可視化工具
npx prisma studio               # 打開 Prisma Studio（數據庫 GUI）

# 格式化
npx prisma format               # 格式化 schema.prisma
```

## Prisma Studio

Prisma Studio 是一個可視化數據庫管理工具：

```bash
npx prisma studio
```

瀏覽器會自動打開 `http://localhost:5555`，你可以：
- 查看所有數據表
- 添加、編輯、刪除記錄
- 瀏覽關聯數據

## 最佳實踐

### 1. 單例模式（Singleton）

在生產環境中，應該使用單例模式避免創建多個 Prisma Client 實例：

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = global.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
```

### 2. 錯誤處理

```typescript
import { Prisma } from '@prisma/client'

try {
  await prisma.user.create({
    data: { email: 'duplicate@example.com' }
  })
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 是唯一約束違反錯誤
    if (error.code === 'P2002') {
      console.log('Email 已存在')
    }
  }
  throw error
}
```

### 3. 日誌配置

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
})

// 監聽查詢事件
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Duration: ' + e.duration + 'ms')
})
```

### 4. 環境變量管理

使用 `.env` 文件管理不同環境的配置：

```env
# .env.development
DATABASE_URL="file:./dev.db"
NODE_ENV="development"

# .env.production
DATABASE_URL="postgresql://user:pass@prod-server:5432/proddb"
NODE_ENV="production"
```

## 下一步

- 學習 Schema 設計：`02-schema-design.prisma`
- 實踐基礎 CRUD 操作：`03-basic-crud.ts`
- 掌握關聯查詢：`04-relations.ts`
- 了解事務處理：`05-transactions.ts`

## 參考資源

- [Prisma 官方文檔](https://www.prisma.io/docs)
- [Prisma Schema 參考](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
