/**
 * Prisma 關聯查詢示例
 *
 * 這個文件展示了如何處理不同類型的數據關聯：
 * - 一對一關係（One-to-One）
 * - 一對多關係（One-to-Many）
 * - 多對多關係（Many-to-Many）
 *
 * 以及各種高級關聯查詢技巧
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

// ============================================
// 一對一關係（One-to-One）
// User ←→ Profile
// ============================================

/**
 * 創建用戶及其 Profile（一對一）
 */
async function createUserWithOneToOne() {
  console.log('\n--- 一對一：創建用戶及 Profile ---')

  const user = await prisma.user.create({
    data: {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashed_password',
      // 嵌套創建關聯的 Profile
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+886-912-345-678',
          address: '123 Main St',
          city: 'Taipei',
          country: 'Taiwan',
          website: 'https://johndoe.com',
          github: 'johndoe',
        },
      },
    },
    // 包含關聯數據
    include: {
      profile: true,
    },
  })

  console.log('創建的用戶及 Profile：', JSON.stringify(user, null, 2))
  return user
}

/**
 * 查詢用戶及其 Profile
 */
async function getUserWithProfile(userId: number) {
  console.log('\n--- 一對一：查詢用戶及 Profile ---')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  })

  return user
}

/**
 * 更新用戶的 Profile
 */
async function updateUserProfile(userId: number) {
  console.log('\n--- 一對一：更新 Profile ---')

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      profile: {
        update: {
          city: 'Taichung',
          phone: '+886-922-222-222',
        },
      },
    },
    include: {
      profile: true,
    },
  })

  console.log('更新後的用戶：', user)
  return user
}

/**
 * 為已存在的用戶創建 Profile
 */
async function addProfileToExistingUser(userId: number) {
  console.log('\n--- 一對一：為已存在的用戶添加 Profile ---')

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      profile: {
        create: {
          firstName: 'New',
          lastName: 'Profile',
          city: 'Taipei',
        },
      },
    },
    include: {
      profile: true,
    },
  })

  return user
}

// ============================================
// 一對多關係（One-to-Many）
// User → Posts
// Post → Comments
// ============================================

/**
 * 創建用戶及多篇文章（一對多）
 */
async function createUserWithPosts() {
  console.log('\n--- 一對多：創建用戶及多篇文章 ---')

  const user = await prisma.user.create({
    data: {
      email: 'author@example.com',
      name: 'Author',
      password: 'hashed_password',
      // 嵌套創建多篇文章
      posts: {
        create: [
          {
            title: '第一篇文章',
            slug: 'first-post',
            content: '這是第一篇文章的內容',
            excerpt: '第一篇文章摘要',
            published: true,
            publishedAt: new Date(),
          },
          {
            title: '第二篇文章',
            slug: 'second-post',
            content: '這是第二篇文章的內容',
            excerpt: '第二篇文章摘要',
            published: false,
          },
        ],
      },
    },
    include: {
      posts: true,
    },
  })

  console.log(`創建的用戶有 ${user.posts.length} 篇文章`)
  return user
}

/**
 * 查詢用戶及其所有文章
 */
async function getUserWithPosts(userId: number) {
  console.log('\n--- 一對多：查詢用戶及其所有文章 ---')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      posts: {
        // 可以對關聯數據進行過濾、排序
        where: {
          published: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // 只取前 10 篇
      },
    },
  })

  if (user) {
    console.log(`用戶 ${user.name} 有 ${user.posts.length} 篇已發布的文章`)
  }

  return user
}

/**
 * 為已存在的用戶創建文章
 */
async function addPostToUser(userId: number) {
  console.log('\n--- 一對多：為用戶添加文章 ---')

  const post = await prisma.post.create({
    data: {
      title: '新文章',
      slug: 'new-post',
      content: '文章內容',
      // 連接到已存在的用戶
      author: {
        connect: { id: userId },
      },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  console.log('創建的文章：', post)
  return post
}

/**
 * 創建文章及其評論（嵌套的一對多）
 */
async function createPostWithComments(authorId: number) {
  console.log('\n--- 一對多：創建文章及評論 ---')

  const post = await prisma.post.create({
    data: {
      title: '熱門文章',
      slug: 'popular-post',
      content: '這是一篇很受歡迎的文章',
      published: true,
      publishedAt: new Date(),
      author: {
        connect: { id: authorId },
      },
      // 嵌套創建評論
      comments: {
        create: [
          {
            content: '很棒的文章！',
            author: {
              connect: { id: authorId },
            },
          },
          {
            content: '學到了很多！',
            author: {
              connect: { id: authorId },
            },
          },
        ],
      },
    },
    include: {
      author: true,
      comments: {
        include: {
          author: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  console.log(`創建的文章有 ${post.comments.length} 條評論`)
  return post
}

/**
 * 查詢文章及其所有評論（包含嵌套評論）
 */
async function getPostWithNestedComments(postId: number) {
  console.log('\n--- 一對多：查詢文章及嵌套評論 ---')

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      comments: {
        where: {
          parentId: null, // 只取頂級評論
        },
        include: {
          author: {
            select: {
              name: true,
              avatar: true,
            },
          },
          // 嵌套查詢回覆
          replies: {
            include: {
              author: {
                select: {
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  return post
}

// ============================================
// 多對多關係（Many-to-Many）
// Post ←→ Tag（通過 PostTag 中間表）
// ============================================

/**
 * 創建文章及標籤（多對多）
 */
async function createPostWithTags(authorId: number) {
  console.log('\n--- 多對多：創建文章及標籤 ---')

  const post = await prisma.post.create({
    data: {
      title: 'TypeScript 完全指南',
      slug: 'typescript-guide',
      content: '詳細的 TypeScript 教程...',
      published: true,
      publishedAt: new Date(),
      author: {
        connect: { id: authorId },
      },
      // 連接已存在的標籤或創建新標籤
      tags: {
        create: [
          {
            tag: {
              connectOrCreate: {
                where: { slug: 'typescript' },
                create: {
                  name: 'TypeScript',
                  slug: 'typescript',
                },
              },
            },
          },
          {
            tag: {
              connectOrCreate: {
                where: { slug: 'javascript' },
                create: {
                  name: 'JavaScript',
                  slug: 'javascript',
                },
              },
            },
          },
          {
            tag: {
              connectOrCreate: {
                where: { slug: 'programming' },
                create: {
                  name: 'Programming',
                  slug: 'programming',
                },
              },
            },
          },
        ],
      },
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  console.log(`文章有 ${post.tags.length} 個標籤`)
  return post
}

/**
 * 查詢文章及其所有標籤
 */
async function getPostWithTags(postId: number) {
  console.log('\n--- 多對多：查詢文章及標籤 ---')

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  if (post) {
    const tagNames = post.tags.map((pt) => pt.tag.name).join(', ')
    console.log(`文章標籤：${tagNames}`)
  }

  return post
}

/**
 * 查詢標籤及其所有文章
 */
async function getTagWithPosts(tagSlug: string) {
  console.log('\n--- 多對多：查詢標籤及其文章 ---')

  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
    include: {
      posts: {
        include: {
          post: {
            include: {
              author: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (tag) {
    console.log(`標籤 "${tag.name}" 有 ${tag.posts.length} 篇文章`)
  }

  return tag
}

/**
 * 為文章添加標籤
 */
async function addTagsToPost(postId: number, tagIds: number[]) {
  console.log('\n--- 多對多：為文章添加標籤 ---')

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      tags: {
        create: tagIds.map((tagId) => ({
          tag: {
            connect: { id: tagId },
          },
        })),
      },
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  return post
}

/**
 * 移除文章的標籤
 */
async function removeTagFromPost(postId: number, tagId: number) {
  console.log('\n--- 多對多：移除文章的標籤 ---')

  await prisma.postTag.delete({
    where: {
      postId_tagId: {
        postId,
        tagId,
      },
    },
  })

  console.log(`已從文章 ${postId} 移除標籤 ${tagId}`)
}

/**
 * 替換文章的所有標籤
 */
async function replacePostTags(postId: number, tagIds: number[]) {
  console.log('\n--- 多對多：替換文章的標籤 ---')

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      tags: {
        // 先刪除所有現有標籤
        deleteMany: {},
        // 再創建新標籤
        create: tagIds.map((tagId) => ({
          tag: {
            connect: { id: tagId },
          },
        })),
      },
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  return post
}

// ============================================
// 高級關聯查詢
// ============================================

/**
 * 深度嵌套查詢
 * 查詢用戶 → 文章 → 評論 → 作者
 */
async function deepNestedQuery(userId: number) {
  console.log('\n--- 深度嵌套查詢 ---')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      posts: {
        where: {
          published: true,
        },
        include: {
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          category: true,
        },
      },
    },
  })

  return user
}

/**
 * 使用 select 選擇特定字段
 * 優化查詢性能，只獲取需要的數據
 */
async function selectiveQuery(postId: number) {
  console.log('\n--- 選擇性查詢 ---')

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      createdAt: true,
      // 只選擇作者的特定字段
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      // 計數關聯記錄
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  })

  return post
}

/**
 * 關聯過濾
 * 查詢至少有 5 篇已發布文章的用戶
 */
async function filterByRelation() {
  console.log('\n--- 關聯過濾 ---')

  const users = await prisma.user.findMany({
    where: {
      posts: {
        some: {
          published: true,
          viewCount: {
            gte: 100,
          },
        },
      },
    },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })

  console.log(`找到 ${users.length} 個有熱門文章的用戶`)
  return users
}

/**
 * 關聯排序
 * 按文章數量排序用戶
 */
async function orderByRelationCount() {
  console.log('\n--- 按關聯數量排序 ---')

  // 注意：這需要使用聚合查詢或原始查詢
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })

  // 在應用層排序
  users.sort((a, b) => b._count.posts - a._count.posts)

  users.forEach((user) => {
    console.log(`${user.name}: ${user._count.posts} 篇文章`)
  })

  return users
}

/**
 * 查詢沒有關聯記錄的項目
 * 例如：沒有文章的用戶
 */
async function findUsersWithoutPosts() {
  console.log('\n--- 查詢沒有文章的用戶 ---')

  const users = await prisma.user.findMany({
    where: {
      posts: {
        none: {},
      },
    },
  })

  console.log(`找到 ${users.length} 個沒有文章的用戶`)
  return users
}

/**
 * 查詢所有關聯都滿足條件的項目
 * 例如：所有文章都已發布的用戶
 */
async function findUsersWithAllPublishedPosts() {
  console.log('\n--- 查詢所有文章都已發布的用戶 ---')

  const users = await prisma.user.findMany({
    where: {
      posts: {
        every: {
          published: true,
        },
      },
    },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })

  return users
}

/**
 * 連接操作（Connect）
 * 將已存在的記錄關聯起來
 */
async function connectExistingRecords() {
  console.log('\n--- 連接已存在的記錄 ---')

  // 為文章設置分類
  const post = await prisma.post.update({
    where: { id: 1 },
    data: {
      category: {
        connect: { id: 1 },
      },
    },
  })

  // 連接多條記錄（多對多）
  const postWithTags = await prisma.post.update({
    where: { id: 1 },
    data: {
      tags: {
        create: [
          { tag: { connect: { id: 1 } } },
          { tag: { connect: { id: 2 } } },
        ],
      },
    },
  })

  return postWithTags
}

/**
 * 斷開連接（Disconnect）
 */
async function disconnectRelations() {
  console.log('\n--- 斷開關聯 ---')

  // 移除文章的分類
  const post = await prisma.post.update({
    where: { id: 1 },
    data: {
      category: {
        disconnect: true,
      },
    },
  })

  return post
}

/**
 * 複雜的關聯查詢示例
 * 查詢熱門文章（瀏覽量高、評論多、點贊多）
 */
async function findPopularPosts() {
  console.log('\n--- 查詢熱門文章 ---')

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      viewCount: {
        gte: 1000,
      },
      comments: {
        some: {},
      },
      likes: {
        some: {},
      },
    },
    include: {
      author: {
        select: {
          name: true,
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
    orderBy: [
      { viewCount: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 10,
  })

  posts.forEach((post) => {
    console.log(
      `${post.title} - ${post.viewCount} views, ${post._count.comments} comments, ${post._count.likes} likes`
    )
  })

  return posts
}

/**
 * 相關文章推薦
 * 基於標籤查找相關文章
 */
async function findRelatedPosts(postId: number) {
  console.log('\n--- 查找相關文章 ---')

  // 先獲取當前文章的標籤
  const currentPost = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  if (!currentPost) return []

  const tagIds = currentPost.tags.map((pt) => pt.tag.id)

  // 查找有相同標籤的其他文章
  const relatedPosts = await prisma.post.findMany({
    where: {
      id: {
        not: postId, // 排除當前文章
      },
      published: true,
      tags: {
        some: {
          tagId: {
            in: tagIds,
          },
        },
      },
    },
    include: {
      author: {
        select: {
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    take: 5,
  })

  console.log(`找到 ${relatedPosts.length} 篇相關文章`)
  return relatedPosts
}

// ============================================
// 主函數
// ============================================

async function main() {
  try {
    console.log('='.repeat(50))
    console.log('Prisma 關聯查詢示例')
    console.log('='.repeat(50))

    // 一對一關係
    // await createUserWithOneToOne()
    // await getUserWithProfile(1)
    // await updateUserProfile(1)

    // 一對多關係
    // await createUserWithPosts()
    // await getUserWithPosts(1)
    // await createPostWithComments(1)
    // await getPostWithNestedComments(1)

    // 多對多關係
    // await createPostWithTags(1)
    // await getPostWithTags(1)
    // await getTagWithPosts('typescript')

    // 高級查詢
    // await deepNestedQuery(1)
    // await selectiveQuery(1)
    // await filterByRelation()
    // await findPopularPosts()
    // await findRelatedPosts(1)

    console.log('\n操作完成！')
  } catch (error) {
    console.error('錯誤：', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

// 導出函數
export {
  createUserWithOneToOne,
  getUserWithProfile,
  createUserWithPosts,
  getUserWithPosts,
  createPostWithTags,
  getPostWithTags,
  getTagWithPosts,
  findPopularPosts,
  findRelatedPosts,
}
