# Exercise 02 解決方案大綱：博客 API

## 核心實現思路

### 1. 數據結構設計

```typescript
// 用戶
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

// 文章
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

// 分類
interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 標籤
interface Tag {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

// 評論
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

// 多對多關係
interface PostTag {
  postId: number;
  tagId: number;
}

interface PostLike {
  userId: number;
  postId: number;
  createdAt: Date;
}

interface PostFavorite {
  userId: number;
  postId: number;
  createdAt: Date;
}
```

### 2. 關鍵功能實現

#### 2.1 生成 Slug

```typescript
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-')      // 空格轉為連字符
    .replace(/-+/g, '-')       // 多個連字符轉為單個
    .trim();
}

// 確保 slug 唯一
function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
```

#### 2.2 獲取文章列表（帶關聯數據）

```typescript
app.get('/api/posts', async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    sort = 'createdAt',
    order = 'desc',
    category,
    tag,
    author,
    status,
    search
  } = req.query;

  let result = [...posts];

  // 狀態過濾（只有作者和管理員可以看到草稿）
  if (!req.user || req.user.role !== 'admin') {
    result = result.filter(p => {
      if (p.status === 'published') return true;
      if (req.user && p.authorId === req.user.userId) return true;
      return false;
    });
  } else if (status) {
    result = result.filter(p => p.status === status);
  }

  // 分類過濾
  if (category) {
    result = result.filter(p => p.categoryId === Number(category));
  }

  // 標籤過濾
  if (tag) {
    const postIds = postTags
      .filter(pt => pt.tagId === Number(tag))
      .map(pt => pt.postId);
    result = result.filter(p => postIds.includes(p.id));
  }

  // 作者過濾
  if (author) {
    result = result.filter(p => p.authorId === Number(author));
  }

  // 搜索
  if (search) {
    const searchLower = (search as string).toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(searchLower) ||
      p.content.toLowerCase().includes(searchLower) ||
      (p.excerpt && p.excerpt.toLowerCase().includes(searchLower))
    );
  }

  // 排序
  result.sort((a, b) => {
    const aValue = a[sort as keyof Post];
    const bValue = b[sort as keyof Post];
    if (order === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // 分頁
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedPosts = result.slice(startIndex, endIndex);

  // 添加關聯數據
  const postsWithData = paginatedPosts.map(post => {
    const author = users.find(u => u.id === post.authorId);
    const category = categories.find(c => c.id === post.categoryId);
    const postTagIds = postTags
      .filter(pt => pt.postId === post.id)
      .map(pt => pt.tagId);
    const postTags = tags.filter(t => postTagIds.includes(t.id));

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || post.content.substring(0, 200) + '...',
      coverImage: post.coverImage,
      author: author ? {
        id: author.id,
        username: author.username,
        avatar: author.avatar
      } : null,
      category: category ? {
        id: category.id,
        name: category.name,
        slug: category.slug
      } : null,
      tags: postTags.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug
      })),
      status: post.status,
      views: post.views,
      likes: post.likes,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt
    };
  });

  res.json({
    success: true,
    data: postsWithData,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: result.length,
      totalPages: Math.ceil(result.length / limitNum)
    }
  });
});
```

#### 2.3 創建文章

```typescript
app.post('/api/posts', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, content, excerpt, categoryId, tagIds, coverImage, status } = req.body;

    // 驗證
    if (!title || !content || !categoryId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title, content, and categoryId are required'
        }
      });
    }

    if (title.length < 1 || title.length > 200) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TITLE',
          message: 'Title must be between 1 and 200 characters'
        }
      });
    }

    if (content.length < 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONTENT_TOO_SHORT',
          message: 'Content must be at least 50 characters'
        }
      });
    }

    // 驗證分類存在
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    // 驗證標籤存在
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        const tag = tags.find(t => t.id === tagId);
        if (!tag) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'TAG_NOT_FOUND',
              message: `Tag with id ${tagId} not found`
            }
          });
        }
      }
    }

    // 生成 slug
    const baseSlug = generateSlug(title);
    const existingSlugs = posts.map(p => p.slug);
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    // 生成摘要（如果沒有提供）
    const finalExcerpt = excerpt || content.substring(0, 200);

    // 創建文章
    const newPost: Post = {
      id: posts.length + 1,
      title,
      slug,
      content,
      excerpt: finalExcerpt,
      coverImage,
      authorId: req.user!.userId,
      categoryId,
      status: status || 'draft',
      views: 0,
      likes: 0,
      publishedAt: status === 'published' ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    posts.push(newPost);

    // 添加標籤關聯
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        postTags.push({
          postId: newPost.id,
          tagId
        });
      }
    }

    // 返回完整數據
    const author = users.find(u => u.id === newPost.authorId);
    const postTagIds = postTags
      .filter(pt => pt.postId === newPost.id)
      .map(pt => pt.tagId);
    const postTagsData = tags.filter(t => postTagIds.includes(t.id));

    res.status(201).json({
      success: true,
      data: {
        ...newPost,
        author: author ? {
          id: author.id,
          username: author.username,
          avatar: author.avatar
        } : null,
        category,
        tags: postTagsData
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_POST_FAILED',
        message: 'Failed to create post'
      }
    });
  }
});
```

#### 2.4 嵌套評論實現

```typescript
// 構建評論樹
function buildCommentTree(comments: Comment[]): any[] {
  const commentMap = new Map<number, any>();
  const roots: any[] = [];

  // 添加作者信息
  const commentsWithAuthor = comments.map(comment => {
    const author = users.find(u => u.id === comment.authorId);
    return {
      ...comment,
      author: author ? {
        id: author.id,
        username: author.username,
        avatar: author.avatar
      } : null,
      replies: []
    };
  });

  // 創建映射
  commentsWithAuthor.forEach(comment => {
    commentMap.set(comment.id, comment);
  });

  // 構建樹
  commentsWithAuthor.forEach(comment => {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(comment);
      }
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

// 獲取文章評論
app.get('/api/posts/:postId/comments', async (req: Request, res: Response) => {
  const postId = Number(req.params.postId);

  const post = posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'POST_NOT_FOUND',
        message: 'Post not found'
      }
    });
  }

  const postComments = comments.filter(c => c.postId === postId);
  const commentTree = buildCommentTree(postComments);

  res.json({
    success: true,
    data: {
      comments: commentTree,
      total: postComments.length
    }
  });
});
```

#### 2.5 點贊功能

```typescript
// 點贊文章
app.post('/api/posts/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  const postId = Number(req.params.id);
  const userId = req.user!.userId;

  const post = posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'POST_NOT_FOUND',
        message: 'Post not found'
      }
    });
  }

  // 檢查是否已經點贊
  const existingLike = postLikes.find(
    pl => pl.postId === postId && pl.userId === userId
  );

  if (existingLike) {
    // 取消點贊
    const index = postLikes.indexOf(existingLike);
    postLikes.splice(index, 1);
    post.likes--;

    return res.json({
      success: true,
      data: {
        liked: false,
        likes: post.likes
      }
    });
  } else {
    // 添加點贊
    postLikes.push({
      userId,
      postId,
      createdAt: new Date()
    });
    post.likes++;

    return res.json({
      success: true,
      data: {
        liked: true,
        likes: post.likes
      }
    });
  }
});
```

### 3. 權限控制中間件

```typescript
// 檢查是否為文章作者或管理員
function checkPostOwnership(req: AuthRequest, res: Response, next: NextFunction) {
  const postId = Number(req.params.id);
  const post = posts.find(p => p.id === postId);

  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'POST_NOT_FOUND',
        message: 'Post not found'
      }
    });
  }

  const user = users.find(u => u.id === req.user!.userId);

  if (post.authorId !== req.user!.userId && user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to modify this post'
      }
    });
  }

  next();
}

// 使用
app.put('/api/posts/:id', authenticate, checkPostOwnership, updatePostHandler);
app.delete('/api/posts/:id', authenticate, checkPostOwnership, deletePostHandler);
```

### 4. 搜索實現

```typescript
app.get('/api/search', async (req: Request, res: Response) => {
  const { q, type = 'posts', page = 1, limit = 10 } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Search query is required'
      }
    });
  }

  const searchLower = q.toLowerCase();
  let results: any[] = [];

  if (type === 'posts') {
    results = posts
      .filter(p => p.status === 'published')
      .filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.content.toLowerCase().includes(searchLower) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(searchLower))
      )
      .map(p => {
        // 高亮顯示
        const titleHighlight = highlightText(p.title, q);
        const contentHighlight = highlightText(
          p.content.substring(0, 300),
          q
        );

        return {
          type: 'post',
          id: p.id,
          title: titleHighlight,
          excerpt: contentHighlight,
          slug: p.slug
        };
      });
  } else if (type === 'tags') {
    results = tags
      .filter(t => t.name.toLowerCase().includes(searchLower))
      .map(t => ({
        type: 'tag',
        id: t.id,
        name: t.name,
        slug: t.slug
      }));
  }

  // 分頁
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedResults = results.slice(startIndex, startIndex + limitNum);

  res.json({
    success: true,
    data: {
      query: q,
      results: paginatedResults,
      total: results.length
    },
    meta: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(results.length / limitNum)
    }
  });
});

// 高亮函數
function highlightText(text: string, query: string): string {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
```

## 完整實現建議

1. **先實現基礎功能**
   - 文章 CRUD
   - 分類和標籤管理

2. **添加關聯**
   - 文章-分類關聯
   - 文章-標籤多對多關聯

3. **實現評論系統**
   - 基本評論
   - 嵌套評論

4. **添加互動功能**
   - 點贊
   - 收藏

5. **實現搜索和統計**

6. **優化和重構**
   - 提取中間件
   - 優化查詢
   - 添加緩存

## 測試建議

使用以下命令測試各個功能：

```bash
# 創建分類
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Technology"}'

# 創建文章
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is a long content...",
    "categoryId": 1,
    "tagIds": [1, 2],
    "status": "published"
  }'

# 搜索文章
curl "http://localhost:3000/api/search?q=typescript&type=posts"

# 點贊文章
curl -X POST http://localhost:3000/api/posts/1/like \
  -H "Authorization: Bearer TOKEN"
```
