/**
 * Prisma 基礎 CRUD 操作示例
 *
 * CRUD 代表：
 * - Create（創建）
 * - Read（讀取）
 * - Update（更新）
 * - Delete（刪除）
 *
 * 這個文件展示了如何使用 Prisma Client 執行基本的數據庫操作
 */

import { PrismaClient, Prisma } from '@prisma/client'

// 創建 Prisma Client 實例
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'], // 啟用日誌
})

// ============================================
// CREATE 操作 - 創建數據
// ============================================

/**
 * 創建單個用戶
 */
async function createUser() {
  console.log('\n--- 創建單個用戶 ---')

  const user = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      password: 'hashed_password_here', // 實際應用中應該使用加密後的密碼
      role: 'USER',
    },
  })

  console.log('創建的用戶：', user)
  return user
}

/**
 * 創建用戶並關聯 Profile
 * 使用嵌套創建（nested create）
 */
async function createUserWithProfile() {
  console.log('\n--- 創建用戶並關聯 Profile ---')

  const user = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob',
      password: 'hashed_password',
      profile: {
        create: {
          firstName: 'Bob',
          lastName: 'Smith',
          phone: '+886-912-345-678',
          city: 'Taipei',
          country: 'Taiwan',
        },
      },
    },
    include: {
      profile: true, // 包含關聯的 profile 數據
    },
  })

  console.log('創建的用戶及 Profile：', JSON.stringify(user, null, 2))
  return user
}

/**
 * 批量創建多個用戶
 */
async function createManyUsers() {
  console.log('\n--- 批量創建用戶 ---')

  const result = await prisma.user.createMany({
    data: [
      {
        email: 'charlie@example.com',
        name: 'Charlie',
        password: 'hashed_password',
      },
      {
        email: 'david@example.com',
        name: 'David',
        password: 'hashed_password',
      },
      {
        email: 'eve@example.com',
        name: 'Eve',
        password: 'hashed_password',
      },
    ],
    skipDuplicates: true, // 跳過重複的記錄（基於唯一約束）
  })

  console.log(`成功創建 ${result.count} 個用戶`)
  return result
}

/**
 * 創建文章
 */
async function createPost(authorId: number) {
  console.log('\n--- 創建文章 ---')

  const post = await prisma.post.create({
    data: {
      title: '我的第一篇文章',
      slug: 'my-first-post',
      content: '這是文章的完整內容...',
      excerpt: '這是文章的摘要',
      published: true,
      publishedAt: new Date(),
      author: {
        connect: { id: authorId }, // 連接到已存在的用戶
      },
      tags: {
        create: [
          { tag: { create: { name: 'JavaScript', slug: 'javascript' } } },
          { tag: { create: { name: 'TypeScript', slug: 'typescript' } } },
        ],
      },
    },
    include: {
      author: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  console.log('創建的文章：', JSON.stringify(post, null, 2))
  return post
}

// ============================================
// READ 操作 - 讀取數據
// ============================================

/**
 * 查詢單個用戶 - 通過 ID
 */
async function findUserById(id: number) {
  console.log('\n--- 通過 ID 查詢用戶 ---')

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      posts: true,
    },
  })

  if (user) {
    console.log('找到的用戶：', user)
  } else {
    console.log('用戶不存在')
  }

  return user
}

/**
 * 查詢單個用戶 - 通過郵箱
 */
async function findUserByEmail(email: string) {
  console.log('\n--- 通過郵箱查詢用戶 ---')

  const user = await prisma.user.findUnique({
    where: { email },
  })

  return user
}

/**
 * 查詢第一個匹配的用戶
 */
async function findFirstUser() {
  console.log('\n--- 查詢第一個用戶 ---')

  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc', // 按創建時間降序排列
    },
  })

  console.log('找到的用戶：', user)
  return user
}

/**
 * 查詢多個用戶 - 帶過濾條件
 */
async function findManyUsers() {
  console.log('\n--- 查詢多個用戶 ---')

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: 'USER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      // 不包含 password
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10, // 限制返回 10 條記錄
    skip: 0,  // 跳過前 0 條記錄（用於分頁）
  })

  console.log(`找到 ${users.length} 個用戶`)
  console.log(users)
  return users
}

/**
 * 分頁查詢
 */
async function paginateUsers(page: number = 1, pageSize: number = 10) {
  console.log(`\n--- 分頁查詢（第 ${page} 頁，每頁 ${pageSize} 條）---`)

  const skip = (page - 1) * pageSize

  // 同時獲取數據和總數
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ])

  const totalPages = Math.ceil(total / pageSize)

  console.log(`總共 ${total} 條記錄，共 ${totalPages} 頁`)
  console.log(`當前頁：${users.length} 條記錄`)

  return {
    data: users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  }
}

/**
 * 複雜查詢 - 使用多個過濾條件
 */
async function complexQuery() {
  console.log('\n--- 複雜查詢 ---')

  const posts = await prisma.post.findMany({
    where: {
      AND: [
        { published: true },
        {
          OR: [
            { title: { contains: 'JavaScript' } },
            { content: { contains: 'TypeScript' } },
          ],
        },
        { viewCount: { gte: 100 } }, // 瀏覽次數 >= 100
      ],
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
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
    orderBy: [
      { viewCount: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  console.log(`找到 ${posts.length} 篇文章`)
  return posts
}

/**
 * 搜索功能 - 模糊查詢
 */
async function searchPosts(keyword: string) {
  console.log(`\n--- 搜索文章：${keyword} ---`)

  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } }, // 不區分大小寫
        { content: { contains: keyword, mode: 'insensitive' } },
      ],
      published: true,
    },
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
  })

  console.log(`找到 ${posts.length} 篇匹配的文章`)
  return posts
}

/**
 * 聚合查詢 - 統計數據
 */
async function aggregateData() {
  console.log('\n--- 聚合查詢 ---')

  // 統計文章數據
  const postStats = await prisma.post.aggregate({
    _count: true,
    _avg: {
      viewCount: true,
    },
    _max: {
      viewCount: true,
    },
    _min: {
      viewCount: true,
    },
    _sum: {
      viewCount: true,
    },
  })

  console.log('文章統計：', postStats)

  // 分組統計 - 按作者統計文章數
  const postsByAuthor = await prisma.post.groupBy({
    by: ['authorId'],
    _count: {
      id: true,
    },
    _avg: {
      viewCount: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  })

  console.log('各作者的文章數：', postsByAuthor)

  return { postStats, postsByAuthor }
}

// ============================================
// UPDATE 操作 - 更新數據
// ============================================

/**
 * 更新單個用戶
 */
async function updateUser(id: number) {
  console.log('\n--- 更新用戶 ---')

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: 'Alice Updated',
      bio: '這是更新後的個人簡介',
    },
  })

  console.log('更新後的用戶：', user)
  return user
}

/**
 * 更新或創建（Upsert）
 * 如果記錄存在則更新，不存在則創建
 */
async function upsertUser(email: string) {
  console.log('\n--- Upsert 用戶 ---')

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Updated Name',
      updatedAt: new Date(),
    },
    create: {
      email,
      name: 'New User',
      password: 'hashed_password',
    },
  })

  console.log('Upsert 結果：', user)
  return user
}

/**
 * 批量更新
 */
async function updateManyUsers() {
  console.log('\n--- 批量更新用戶 ---')

  const result = await prisma.user.updateMany({
    where: {
      role: 'USER',
      isActive: false,
    },
    data: {
      isActive: true,
    },
  })

  console.log(`更新了 ${result.count} 個用戶`)
  return result
}

/**
 * 增量更新 - 增加數值
 */
async function incrementViewCount(postId: number) {
  console.log('\n--- 增加文章瀏覽次數 ---')

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      viewCount: {
        increment: 1, // 瀏覽次數 +1
      },
    },
  })

  console.log(`文章瀏覽次數：${post.viewCount}`)
  return post
}

/**
 * 更新嵌套關係
 */
async function updateUserWithProfile(userId: number) {
  console.log('\n--- 更新用戶及 Profile ---')

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: 'Updated Name',
      profile: {
        upsert: {
          create: {
            firstName: 'New',
            lastName: 'User',
            city: 'Taipei',
          },
          update: {
            city: 'Taichung',
          },
        },
      },
    },
    include: {
      profile: true,
    },
  })

  console.log('更新結果：', user)
  return user
}

// ============================================
// DELETE 操作 - 刪除數據
// ============================================

/**
 * 刪除單個用戶
 */
async function deleteUser(id: number) {
  console.log('\n--- 刪除用戶 ---')

  try {
    const user = await prisma.user.delete({
      where: { id },
    })

    console.log('已刪除用戶：', user)
    return user
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        console.log('用戶不存在')
      }
    }
    throw error
  }
}

/**
 * 批量刪除
 */
async function deleteManyUsers() {
  console.log('\n--- 批量刪除用戶 ---')

  const result = await prisma.user.deleteMany({
    where: {
      isActive: false,
      createdAt: {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 天前
      },
    },
  })

  console.log(`刪除了 ${result.count} 個用戶`)
  return result
}

/**
 * 軟刪除（邏輯刪除）
 * 不實際刪除記錄，而是標記為已刪除
 */
async function softDeleteUser(id: number) {
  console.log('\n--- 軟刪除用戶 ---')

  const user = await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      // 可以添加 deletedAt 字段記錄刪除時間
    },
  })

  console.log('已軟刪除用戶：', user)
  return user
}

// ============================================
// 其他常用操作
// ============================================

/**
 * 計數
 */
async function countUsers() {
  console.log('\n--- 計數用戶 ---')

  const total = await prisma.user.count()
  const activeUsers = await prisma.user.count({
    where: { isActive: true },
  })

  console.log(`總用戶數：${total}`)
  console.log(`活躍用戶數：${activeUsers}`)

  return { total, activeUsers }
}

/**
 * 檢查記錄是否存在
 */
async function checkUserExists(email: string): Promise<boolean> {
  console.log(`\n--- 檢查用戶是否存在：${email} ---`)

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  const exists = user !== null
  console.log(`用戶${exists ? '存在' : '不存在'}`)

  return exists
}

/**
 * 原始查詢（Raw Query）
 * 當 Prisma API 無法滿足需求時使用
 */
async function rawQuery() {
  console.log('\n--- 原始 SQL 查詢 ---')

  // 查詢
  const users = await prisma.$queryRaw<Array<any>>`
    SELECT * FROM users WHERE is_active = true LIMIT 5
  `

  console.log('查詢結果：', users)

  // 執行（非查詢語句）
  const result = await prisma.$executeRaw`
    UPDATE posts SET view_count = view_count + 1 WHERE id = 1
  `

  console.log(`影響的行數：${result}`)

  return users
}

// ============================================
// 主函數 - 執行示例
// ============================================

async function main() {
  try {
    console.log('='.repeat(50))
    console.log('Prisma 基礎 CRUD 操作示例')
    console.log('='.repeat(50))

    // 創建操作
    // await createUser()
    // await createUserWithProfile()
    // await createManyUsers()

    // 讀取操作
    // await findUserById(1)
    // await findUserByEmail('alice@example.com')
    // await findFirstUser()
    // await findManyUsers()
    // await paginateUsers(1, 5)
    // await complexQuery()
    // await searchPosts('JavaScript')
    // await aggregateData()

    // 更新操作
    // await updateUser(1)
    // await upsertUser('test@example.com')
    // await updateManyUsers()
    // await incrementViewCount(1)

    // 刪除操作
    // await deleteUser(1)
    // await deleteManyUsers()
    // await softDeleteUser(1)

    // 其他操作
    // await countUsers()
    // await checkUserExists('alice@example.com')

    console.log('\n操作完成！')
  } catch (error) {
    console.error('錯誤：', error)
    throw error
  }
}

// 執行主函數
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // 斷開數據庫連接
    await prisma.$disconnect()
  })

// ============================================
// 類型安全示例
// ============================================

/**
 * Prisma 提供完整的 TypeScript 類型支持
 */
async function typeSafetyExample() {
  // 類型安全的查詢
  const user = await prisma.user.findUnique({
    where: { id: 1 },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })

  if (user) {
    // TypeScript 知道 user 的類型
    console.log(user.email) // ✓ 正確
    // console.log(user.password) // ✗ 錯誤：password 沒有被 select
  }

  // 使用 Prisma 生成的類型
  type UserCreateInput = Prisma.UserCreateInput
  type UserWhereInput = Prisma.UserWhereInput
  type UserInclude = Prisma.UserInclude

  const createData: UserCreateInput = {
    email: 'typed@example.com',
    name: 'Typed User',
    password: 'password',
  }

  const whereClause: UserWhereInput = {
    isActive: true,
    email: { contains: '@example.com' },
  }
}

// 導出函數供其他模塊使用
export {
  createUser,
  createUserWithProfile,
  createManyUsers,
  createPost,
  findUserById,
  findUserByEmail,
  findManyUsers,
  paginateUsers,
  searchPosts,
  updateUser,
  upsertUser,
  deleteUser,
  countUsers,
  checkUserExists,
}
