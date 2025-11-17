/**
 * Prisma 事務處理示例
 *
 * 事務（Transaction）確保一組數據庫操作要麼全部成功，要麼全部失敗。
 * 這對於維護數據一致性非常重要。
 *
 * Prisma 提供三種事務處理方式：
 * 1. 嵌套寫入（Nested writes）- 隱式事務
 * 2. $transaction API - 順序事務
 * 3. 交互式事務（Interactive transactions）- 靈活控制
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

// ============================================
// 1. 嵌套寫入（Nested Writes）
// 隱式事務 - Prisma 自動處理
// ============================================

/**
 * 嵌套寫入示例
 * 創建用戶、Profile 和文章，作為單個事務執行
 */
async function nestedWriteTransaction() {
  console.log('\n--- 嵌套寫入事務 ---')

  try {
    const user = await prisma.user.create({
      data: {
        email: 'nested@example.com',
        name: 'Nested User',
        password: 'hashed_password',
        // 同時創建 Profile
        profile: {
          create: {
            firstName: 'Nested',
            lastName: 'User',
            city: 'Taipei',
          },
        },
        // 同時創建多篇文章
        posts: {
          create: [
            {
              title: '第一篇文章',
              slug: 'first-post-nested',
              content: '內容...',
              published: true,
            },
            {
              title: '第二篇文章',
              slug: 'second-post-nested',
              content: '內容...',
              published: false,
            },
          ],
        },
      },
      include: {
        profile: true,
        posts: true,
      },
    })

    console.log('✓ 事務成功：創建用戶、Profile 和文章')
    console.log(`用戶 ID: ${user.id}, 文章數: ${user.posts.length}`)

    return user
  } catch (error) {
    console.error('✗ 事務失敗：所有操作已回滾')
    throw error
  }
}

/**
 * 嵌套更新示例
 */
async function nestedUpdateTransaction(userId: number) {
  console.log('\n--- 嵌套更新事務 ---')

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Updated Name',
        profile: {
          update: {
            city: 'Taichung',
          },
        },
        posts: {
          updateMany: {
            where: {
              published: false,
            },
            data: {
              published: true,
              publishedAt: new Date(),
            },
          },
        },
      },
      include: {
        profile: true,
        posts: true,
      },
    })

    console.log('✓ 更新事務成功')
    return user
  } catch (error) {
    console.error('✗ 更新事務失敗')
    throw error
  }
}

// ============================================
// 2. $transaction API - 順序事務
// 執行多個獨立操作作為一個事務
// ============================================

/**
 * 基礎順序事務
 * 轉賬示例：從 A 用戶轉錢到 B 用戶
 */
async function basicSequentialTransaction(
  fromUserId: number,
  toUserId: number,
  amount: number
) {
  console.log('\n--- 基礎順序事務（轉賬示例）---')

  try {
    // 將多個操作包裝在一個數組中
    const result = await prisma.$transaction([
      // 操作 1：減少 A 用戶的餘額
      prisma.user.update({
        where: { id: fromUserId },
        data: {
          // 假設有 balance 字段
          // balance: { decrement: amount },
        },
      }),
      // 操作 2：增加 B 用戶的餘額
      prisma.user.update({
        where: { id: toUserId },
        data: {
          // balance: { increment: amount },
        },
      }),
    ])

    console.log('✓ 轉賬成功')
    return result
  } catch (error) {
    console.error('✗ 轉賬失敗：所有操作已回滾')
    throw error
  }
}

/**
 * 複雜的順序事務
 * 創建訂單、扣減庫存、記錄日誌
 */
async function createOrderTransaction(
  userId: number,
  productId: number,
  quantity: number
) {
  console.log('\n--- 創建訂單事務 ---')

  try {
    const [order, product, log] = await prisma.$transaction([
      // 創建訂單（假設有 Order 模型）
      prisma.$executeRaw`
        INSERT INTO orders (user_id, product_id, quantity, status)
        VALUES (${userId}, ${productId}, ${quantity}, 'pending')
      `,

      // 扣減庫存
      prisma.$executeRaw`
        UPDATE products
        SET stock = stock - ${quantity}
        WHERE id = ${productId} AND stock >= ${quantity}
      `,

      // 記錄審計日誌
      prisma.auditLog.create({
        data: {
          action: 'CREATE_ORDER',
          tableName: 'orders',
          userId: userId,
          newData: {
            productId,
            quantity,
          },
        },
      }),
    ])

    console.log('✓ 訂單創建成功，庫存已扣減')
    return { order, product, log }
  } catch (error) {
    console.error('✗ 訂單創建失敗：庫存不足或其他錯誤')
    throw error
  }
}

/**
 * 批量操作事務
 * 發布多篇文章並通知所有關注者
 */
async function publishPostsTransaction(postIds: number[]) {
  console.log('\n--- 批量發布文章事務 ---')

  const now = new Date()

  try {
    const operations = [
      // 更新所有文章狀態
      prisma.post.updateMany({
        where: {
          id: { in: postIds },
        },
        data: {
          published: true,
          publishedAt: now,
        },
      }),

      // 增加作者的文章計數（假設有統計字段）
      // ... 其他相關操作

      // 創建通知（假設獲取了關注者列表）
      // 這裡簡化處理
      prisma.auditLog.create({
        data: {
          action: 'PUBLISH_POSTS',
          tableName: 'posts',
          newData: {
            postIds,
            publishedAt: now,
          },
        },
      }),
    ]

    const result = await prisma.$transaction(operations)

    console.log(`✓ 成功發布 ${postIds.length} 篇文章`)
    return result
  } catch (error) {
    console.error('✗ 批量發布失敗')
    throw error
  }
}

// ============================================
// 3. 交互式事務（Interactive Transactions）
// 最靈活的事務方式，支持條件邏輯和錯誤處理
// ============================================

/**
 * 交互式事務基礎示例
 */
async function interactiveTransactionBasic() {
  console.log('\n--- 交互式事務基礎示例 ---')

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 在事務中執行多個操作
      // tx 是一個特殊的 Prisma Client 實例

      // 創建用戶
      const user = await tx.user.create({
        data: {
          email: 'interactive@example.com',
          name: 'Interactive User',
          password: 'hashed_password',
        },
      })

      // 創建 Profile
      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          firstName: 'Interactive',
          lastName: 'User',
          city: 'Taipei',
        },
      })

      // 創建文章
      const post = await tx.post.create({
        data: {
          title: '交互式事務測試',
          slug: 'interactive-transaction-test',
          content: '內容...',
          authorId: user.id,
        },
      })

      // 返回結果
      return { user, profile, post }
    })

    console.log('✓ 交互式事務成功')
    console.log(`創建用戶 ID: ${result.user.id}`)

    return result
  } catch (error) {
    console.error('✗ 交互式事務失敗')
    throw error
  }
}

/**
 * 帶條件邏輯的交互式事務
 * 點贊功能：如果已點贊則取消，否則添加點贊
 */
async function toggleLikeTransaction(userId: number, postId: number) {
  console.log('\n--- 點贊切換事務 ---')

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 檢查是否已點贊
      const existingLike = await tx.like.findUnique({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      })

      if (existingLike) {
        // 已點贊，則取消點贊
        await tx.like.delete({
          where: {
            id: existingLike.id,
          },
        })

        console.log('✓ 取消點贊')
        return { action: 'unliked', like: null }
      } else {
        // 未點贊，則添加點贊
        const like = await tx.like.create({
          data: {
            userId,
            postId,
          },
        })

        console.log('✓ 添加點贊')
        return { action: 'liked', like }
      }
    })

    return result
  } catch (error) {
    console.error('✗ 點贊操作失敗')
    throw error
  }
}

/**
 * 複雜業務邏輯事務
 * 用戶發布文章：檢查權限、驗證數據、創建記錄、更新統計
 */
async function publishPostWithBusinessLogic(
  userId: number,
  postData: {
    title: string
    slug: string
    content: string
    categoryId?: number
    tagIds?: number[]
  }
) {
  console.log('\n--- 發布文章業務邏輯事務 ---')

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. 檢查用戶權限
        const user = await tx.user.findUnique({
          where: { id: userId },
        })

        if (!user) {
          throw new Error('用戶不存在')
        }

        if (!user.isActive) {
          throw new Error('用戶已被禁用')
        }

        // 2. 檢查 slug 是否已存在
        const existingPost = await tx.post.findUnique({
          where: { slug: postData.slug },
        })

        if (existingPost) {
          throw new Error('Slug 已存在')
        }

        // 3. 檢查分類是否存在（如果提供了）
        if (postData.categoryId) {
          const category = await tx.category.findUnique({
            where: { id: postData.categoryId },
          })

          if (!category) {
            throw new Error('分類不存在')
          }
        }

        // 4. 創建文章
        const post = await tx.post.create({
          data: {
            title: postData.title,
            slug: postData.slug,
            content: postData.content,
            published: true,
            publishedAt: new Date(),
            authorId: userId,
            categoryId: postData.categoryId,
            // 關聯標籤
            tags: postData.tagIds
              ? {
                  create: postData.tagIds.map((tagId) => ({
                    tag: { connect: { id: tagId } },
                  })),
                }
              : undefined,
          },
          include: {
            author: true,
            category: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        })

        // 5. 創建審計日誌
        await tx.auditLog.create({
          data: {
            action: 'PUBLISH_POST',
            tableName: 'posts',
            recordId: post.id,
            userId: userId,
            newData: {
              postId: post.id,
              title: post.title,
            },
          },
        })

        // 6. 更新用戶統計（如果有統計表）
        // await tx.userStats.update(...)

        console.log('✓ 文章發布成功')
        return post
      },
      {
        maxWait: 5000, // 最大等待時間（毫秒）
        timeout: 10000, // 事務超時時間（毫秒）
      }
    )

    return result
  } catch (error) {
    console.error('✗ 文章發布失敗：', error)
    throw error
  }
}

/**
 * 重試邏輯事務
 * 處理並發衝突時自動重試
 */
async function transactionWithRetry<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n嘗試第 ${attempt} 次...`)

      const result = await prisma.$transaction(operation, {
        timeout: 10000,
      })

      console.log('✓ 事務成功')
      return result
    } catch (error: any) {
      lastError = error
      console.error(`✗ 第 ${attempt} 次嘗試失敗：`, error.message)

      // 如果是並發衝突錯誤，則重試
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2028')
      ) {
        if (attempt < maxRetries) {
          // 等待一段時間後重試（指數退避）
          const delay = Math.pow(2, attempt) * 100
          console.log(`等待 ${delay}ms 後重試...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      // 其他錯誤，直接拋出
      throw error
    }
  }

  throw new Error(`事務失敗，已重試 ${maxRetries} 次：${lastError.message}`)
}

/**
 * 使用重試邏輯的示例
 */
async function incrementViewCountWithRetry(postId: number) {
  console.log('\n--- 帶重試的瀏覽計數更新 ---')

  return transactionWithRetry(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      throw new Error('文章不存在')
    }

    // 更新瀏覽次數
    const updatedPost = await tx.post.update({
      where: { id: postId },
      data: {
        viewCount: post.viewCount + 1,
      },
    })

    return updatedPost
  })
}

/**
 * 長時間運行的事務
 * 批量數據處理示例
 */
async function batchProcessTransaction(limit: number = 100) {
  console.log('\n--- 批量處理事務 ---')

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 獲取需要處理的記錄
        const posts = await tx.post.findMany({
          where: {
            published: true,
            // 某些條件
          },
          take: limit,
        })

        console.log(`處理 ${posts.length} 篇文章`)

        // 批量更新
        const updates = posts.map((post) =>
          tx.post.update({
            where: { id: post.id },
            data: {
              // 更新邏輯
              updatedAt: new Date(),
            },
          })
        )

        await Promise.all(updates)

        console.log('✓ 批量處理完成')
        return posts.length
      },
      {
        timeout: 30000, // 30 秒超時
      }
    )

    return result
  } catch (error) {
    console.error('✗ 批量處理失敗')
    throw error
  }
}

// ============================================
// 錯誤處理和回滾
// ============================================

/**
 * 手動回滾事務
 * 通過拋出錯誤來觸發回滾
 */
async function manualRollback() {
  console.log('\n--- 手動回滾事務 ---')

  try {
    await prisma.$transaction(async (tx) => {
      // 創建用戶
      const user = await tx.user.create({
        data: {
          email: 'rollback@example.com',
          name: 'Rollback Test',
          password: 'password',
        },
      })

      console.log(`創建用戶 ID: ${user.id}`)

      // 某些業務邏輯檢查
      const shouldRollback = true

      if (shouldRollback) {
        // 拋出錯誤來觸發回滾
        throw new Error('業務邏輯錯誤，回滾事務')
      }

      // 這裡的代碼不會執行
      await tx.profile.create({
        data: {
          userId: user.id,
          firstName: 'Test',
          city: 'Taipei',
        },
      })

      return user
    })
  } catch (error: any) {
    console.log('✓ 事務已回滾：', error.message)
    // 驗證數據未被保存
    const user = await prisma.user.findUnique({
      where: { email: 'rollback@example.com' },
    })
    console.log('用戶是否存在：', user !== null)
  }
}

/**
 * 處理特定錯誤
 */
async function handleSpecificErrors(email: string) {
  console.log('\n--- 處理特定錯誤 ---')

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: 'Test',
          password: 'password',
        },
      })

      return user
    })

    console.log('✓ 用戶創建成功')
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // 唯一約束違反
      if (error.code === 'P2002') {
        console.error('✗ 郵箱已存在')
      }
      // 外鍵約束違反
      else if (error.code === 'P2003') {
        console.error('✗ 關聯記錄不存在')
      }
      // 記錄未找到
      else if (error.code === 'P2025') {
        console.error('✗ 記錄不存在')
      } else {
        console.error('✗ 數據庫錯誤：', error.code, error.message)
      }
    } else {
      console.error('✗ 未知錯誤：', error)
    }
  }
}

// ============================================
// 最佳實踐和注意事項
// ============================================

/**
 * 事務最佳實踐示例
 */
async function transactionBestPractices() {
  console.log('\n--- 事務最佳實踐 ---')

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // ✓ 好的做法：
        // 1. 將讀取操作放在最前面
        const user = await tx.user.findUnique({
          where: { id: 1 },
        })

        if (!user) {
          throw new Error('用戶不存在')
        }

        // 2. 執行驗證邏輯
        if (!user.isActive) {
          throw new Error('用戶未激活')
        }

        // 3. 執行寫入操作
        const post = await tx.post.create({
          data: {
            title: 'New Post',
            slug: 'new-post',
            content: 'Content',
            authorId: user.id,
          },
        })

        // 4. 執行相關更新
        await tx.auditLog.create({
          data: {
            action: 'CREATE_POST',
            tableName: 'posts',
            recordId: post.id,
            userId: user.id,
          },
        })

        // 5. 返回有意義的結果
        return {
          success: true,
          post,
        }
      },
      {
        // 設置合理的超時時間
        timeout: 10000,
        // 設置最大等待時間
        maxWait: 5000,
        // 設置隔離級別（如果需要）
        // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    )

    return result
  } catch (error) {
    // ✓ 好的做法：詳細的錯誤處理
    console.error('事務失敗：', error)
    // 可以記錄日誌、發送通知等
    throw error
  }
}

// ============================================
// 主函數
// ============================================

async function main() {
  try {
    console.log('='.repeat(50))
    console.log('Prisma 事務處理示例')
    console.log('='.repeat(50))

    // 嵌套寫入
    // await nestedWriteTransaction()

    // 順序事務
    // await basicSequentialTransaction(1, 2, 100)
    // await publishPostsTransaction([1, 2, 3])

    // 交互式事務
    // await interactiveTransactionBasic()
    // await toggleLikeTransaction(1, 1)
    // await publishPostWithBusinessLogic(1, {
    //   title: 'Test Post',
    //   slug: 'test-post',
    //   content: 'Content...',
    // })

    // 錯誤處理
    // await manualRollback()
    // await handleSpecificErrors('test@example.com')

    // 重試邏輯
    // await incrementViewCountWithRetry(1)

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
  nestedWriteTransaction,
  basicSequentialTransaction,
  interactiveTransactionBasic,
  toggleLikeTransaction,
  publishPostWithBusinessLogic,
  transactionWithRetry,
  manualRollback,
}
