# Blog API 文檔

完整的 Blog API 文檔，包含用戶認證、文章管理和評論系統的所有端點。

## 目錄

- [基本信息](#基本信息)
- [認證](#認證)
- [響應格式](#響應格式)
- [HTTP 狀態碼](#http-狀態碼)
- [認證端點](#認證端點)
- [文章端點](#文章端點)
- [評論端點](#評論端點)
- [使用示例](#使用示例)
- [錯誤處理](#錯誤處理)
- [數據模型](#數據模型)

## 基本信息

- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **版本**: 1.0.0
- **認證方式**: JWT (JSON Web Token)

## 認證

大多數端點需要 JWT 認證。在請求頭中包含 token：

```
Authorization: Bearer <your_jwt_token>
```

### 獲取 Token

通過註冊或登錄端點獲取 JWT token：
- `POST /api/auth/register`
- `POST /api/auth/login`

## 響應格式

所有 API 響應都使用統一的 JSON 格式：

### 成功響應
```json
{
  "success": true,
  "data": {}
}
```

### 錯誤響應
```json
{
  "success": false,
  "error": "Error message"
}
```

## HTTP 狀態碼

- `200` - OK: 請求成功
- `201` - Created: 資源創建成功
- `400` - Bad Request: 請求參數錯誤或驗證失敗
- `401` - Unauthorized: 未認證或 token 無效
- `403` - Forbidden: 無權限訪問資源
- `404` - Not Found: 資源不存在
- `409` - Conflict: 資源衝突（如用戶名已存在）
- `500` - Internal Server Error: 服務器內部錯誤

---

## 認證端點

### 1. 用戶註冊

創建新用戶帳戶。

**端點**: `POST /api/auth/register`

**請求體**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "bio": "Software developer"
}
```

**字段說明**:
- `username` (required): 用戶名，3-50 個字符，只能包含字母、數字和下劃線
- `email` (required): 電子郵件地址，必須是有效格式
- `password` (required): 密碼，至少 8 個字符
- `bio` (optional): 個人簡介

**示例請求**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "bio": "Software developer"
  }'
```

**成功響應** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "bio": "Software developer",
      "avatarUrl": null,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**錯誤響應** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

**錯誤響應** (409 Conflict):
```json
{
  "success": false,
  "error": "Email already in use"
}
```

---

### 2. 用戶登錄

使用電子郵件和密碼登錄。

**端點**: `POST /api/auth/login`

**請求體**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**字段說明**:
- `email` (required): 註冊的電子郵件地址
- `password` (required): 用戶密碼

**示例請求**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "bio": "Software developer",
      "avatarUrl": null,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**錯誤響應** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### 3. 獲取當前用戶信息

獲取已登錄用戶的詳細信息。

**端點**: `GET /api/auth/me`

**認證**: Required

**示例請求**:
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "bio": "Software developer",
    "avatarUrl": null,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

**錯誤響應** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Authentication required"
}
```

---

## 文章端點

### 4. 獲取所有文章

獲取所有已發布的文章列表，支持分頁。

**端點**: `GET /api/posts`

**查詢參數**:
- `page` (optional): 頁碼，默認為 1
- `limit` (optional): 每頁數量，默認為 10，最大 100

**示例請求**:
```bash
curl -X GET "http://localhost:3000/api/posts?page=1&limit=10"
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "title": "Getting Started with Node.js",
      "content": "Node.js is a powerful runtime...",
      "excerpt": "Learn the basics of Node.js",
      "slug": "getting-started-with-nodejs",
      "published": true,
      "publishedAt": "2024-01-01T12:00:00.000Z",
      "author": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "email": "john@example.com",
        "bio": "Software developer",
        "avatarUrl": null
      },
      "commentsCount": 5,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 5. 獲取單個文章

根據 ID 獲取特定文章的詳細信息。

**端點**: `GET /api/posts/:id`

**路徑參數**:
- `id` (required): 文章 ID (UUID)

**示例請求**:
```bash
curl -X GET http://localhost:3000/api/posts/660e8400-e29b-41d4-a716-446655440000
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "title": "Getting Started with Node.js",
    "content": "Node.js is a powerful runtime for building scalable applications...",
    "excerpt": "Learn the basics of Node.js",
    "slug": "getting-started-with-nodejs",
    "published": true,
    "publishedAt": "2024-01-01T12:00:00.000Z",
    "author": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "bio": "Software developer",
      "avatarUrl": null
    },
    "commentsCount": 5,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**錯誤響應** (404 Not Found):
```json
{
  "success": false,
  "error": "Post not found"
}
```

---

### 6. 獲取用戶的文章

獲取特定用戶發布的所有文章。

**端點**: `GET /api/posts/user/:userId`

**路徑參數**:
- `userId` (required): 用戶 ID (UUID)

**查詢參數**:
- `page` (optional): 頁碼
- `limit` (optional): 每頁數量

**示例請求**:
```bash
curl -X GET http://localhost:3000/api/posts/user/550e8400-e29b-41d4-a716-446655440000
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "title": "Getting Started with Node.js",
      "excerpt": "Learn the basics of Node.js",
      "slug": "getting-started-with-nodejs",
      "published": true,
      "publishedAt": "2024-01-01T12:00:00.000Z",
      "commentsCount": 5,
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

### 7. 創建文章

創建新文章（需要認證）。

**端點**: `POST /api/posts`

**認證**: Required

**請求體**:
```json
{
  "title": "My First Blog Post",
  "content": "This is the full content of my blog post...",
  "excerpt": "A brief summary of the post",
  "published": true
}
```

**字段說明**:
- `title` (required): 文章標題，最多 255 個字符
- `content` (required): 文章內容
- `excerpt` (optional): 文章摘要
- `published` (optional): 是否發布，默認為 false

**示例請求**:
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Blog Post",
    "content": "This is the full content of my blog post...",
    "excerpt": "A brief summary",
    "published": true
  }'
```

**成功響應** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "title": "My First Blog Post",
    "content": "This is the full content of my blog post...",
    "excerpt": "A brief summary",
    "slug": "my-first-blog-post",
    "published": true,
    "publishedAt": "2024-01-02T10:00:00.000Z",
    "author": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-02T10:00:00.000Z",
    "updatedAt": "2024-01-02T10:00:00.000Z"
  }
}
```

**錯誤響應** (400 Bad Request):
```json
{
  "success": false,
  "error": "Title and content are required"
}
```

**錯誤響應** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Authentication required"
}
```

---

### 8. 更新文章

更新現有文章（需要認證，只能更新自己的文章）。

**端點**: `PUT /api/posts/:id`

**認證**: Required

**路徑參數**:
- `id` (required): 文章 ID

**請求體**:
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "published": true
}
```

**字段說明**:
- `title` (optional): 新標題
- `content` (optional): 新內容
- `excerpt` (optional): 新摘要
- `published` (optional): 發布狀態

**示例請求**:
```bash
curl -X PUT http://localhost:3000/api/posts/770e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "published": true
  }'
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "title": "Updated Title",
    "content": "This is the full content...",
    "slug": "updated-title",
    "published": true,
    "updatedAt": "2024-01-02T15:00:00.000Z"
  }
}
```

**錯誤響應** (403 Forbidden):
```json
{
  "success": false,
  "error": "You can only edit your own posts"
}
```

**錯誤響應** (404 Not Found):
```json
{
  "success": false,
  "error": "Post not found"
}
```

---

### 9. 刪除文章

刪除文章（需要認證，只能刪除自己的文章）。

**端點**: `DELETE /api/posts/:id`

**認證**: Required

**路徑參數**:
- `id` (required): 文章 ID

**示例請求**:
```bash
curl -X DELETE http://localhost:3000/api/posts/770e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

**錯誤響應** (403 Forbidden):
```json
{
  "success": false,
  "error": "You can only delete your own posts"
}
```

---

## 評論端點

### 10. 獲取文章的評論

獲取特定文章的所有評論。

**端點**: `GET /api/comments/post/:postId`

**路徑參數**:
- `postId` (required): 文章 ID

**查詢參數**:
- `page` (optional): 頁碼
- `limit` (optional): 每頁數量

**示例請求**:
```bash
curl -X GET http://localhost:3000/api/comments/post/660e8400-e29b-41d4-a716-446655440000
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "content": "Great article! Very helpful.",
      "author": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "email": "john@example.com",
        "avatarUrl": null
      },
      "createdAt": "2024-01-01T14:00:00.000Z",
      "updatedAt": "2024-01-01T14:00:00.000Z"
    }
  ]
}
```

---

### 11. 創建評論

為文章添加評論（需要認證）。

**端點**: `POST /api/comments/post/:postId`

**認證**: Required

**路徑參數**:
- `postId` (required): 文章 ID

**請求體**:
```json
{
  "content": "This is a great article!"
}
```

**字段說明**:
- `content` (required): 評論內容，至少 1 個字符

**示例請求**:
```bash
curl -X POST http://localhost:3000/api/comments/post/660e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a great article!"
  }'
```

**成功響應** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "content": "This is a great article!",
    "author": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-02T16:00:00.000Z",
    "updatedAt": "2024-01-02T16:00:00.000Z"
  }
}
```

**錯誤響應** (400 Bad Request):
```json
{
  "success": false,
  "error": "Comment content is required"
}
```

**錯誤響應** (404 Not Found):
```json
{
  "success": false,
  "error": "Post not found"
}
```

---

### 12. 更新評論

更新現有評論（需要認證，只能更新自己的評論）。

**端點**: `PUT /api/comments/:id`

**認證**: Required

**路徑參數**:
- `id` (required): 評論 ID

**請求體**:
```json
{
  "content": "Updated comment content"
}
```

**示例請求**:
```bash
curl -X PUT http://localhost:3000/api/comments/990e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated comment content"
  }'
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "content": "Updated comment content",
    "updatedAt": "2024-01-02T17:00:00.000Z"
  }
}
```

**錯誤響應** (403 Forbidden):
```json
{
  "success": false,
  "error": "You can only edit your own comments"
}
```

---

### 13. 刪除評論

刪除評論（需要認證，只能刪除自己的評論）。

**端點**: `DELETE /api/comments/:id`

**認證**: Required

**路徑參數**:
- `id` (required): 評論 ID

**示例請求**:
```bash
curl -X DELETE http://localhost:3000/api/comments/990e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**錯誤響應** (403 Forbidden):
```json
{
  "success": false,
  "error": "You can only delete your own comments"
}
```

---

## 使用示例

### JavaScript/Node.js

```javascript
// 註冊用戶
async function register(username, email, password) {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await response.json();
  return data;
}

// 登錄
async function login(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  return data;
}

// 創建文章
async function createPost(token, title, content) {
  const response = await fetch('http://localhost:3000/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ title, content, published: true }),
  });
  const data = await response.json();
  return data;
}

// 獲取所有文章
async function getPosts(page = 1, limit = 10) {
  const response = await fetch(
    `http://localhost:3000/api/posts?page=${page}&limit=${limit}`
  );
  const data = await response.json();
  return data;
}

// 添加評論
async function addComment(token, postId, content) {
  const response = await fetch(
    `http://localhost:3000/api/comments/post/${postId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    }
  );
  const data = await response.json();
  return data;
}
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3000'

# 註冊
def register(username, email, password):
    response = requests.post(
        f'{BASE_URL}/api/auth/register',
        json={
            'username': username,
            'email': email,
            'password': password
        }
    )
    return response.json()

# 登錄
def login(email, password):
    response = requests.post(
        f'{BASE_URL}/api/auth/login',
        json={
            'email': email,
            'password': password
        }
    )
    return response.json()

# 創建文章
def create_post(token, title, content):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    response = requests.post(
        f'{BASE_URL}/api/posts',
        json={
            'title': title,
            'content': content,
            'published': True
        },
        headers=headers
    )
    return response.json()

# 獲取文章
def get_posts(page=1, limit=10):
    response = requests.get(
        f'{BASE_URL}/api/posts',
        params={'page': page, 'limit': limit}
    )
    return response.json()
```

### cURL 完整工作流程

```bash
# 1. 註冊用戶
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'

# 2. 登錄（保存返回的 token）
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }' | jq -r '.data.token')

# 3. 創建文章
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is my first blog post!",
    "published": true
  }'

# 4. 獲取所有文章
curl http://localhost:3000/api/posts

# 5. 獲取當前用戶信息
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 6. 添加評論（使用文章 ID）
curl -X POST http://localhost:3000/api/comments/post/POST_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great post!"
  }'

# 7. 更新文章
curl -X PUT http://localhost:3000/api/posts/POST_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'

# 8. 刪除評論
curl -X DELETE http://localhost:3000/api/comments/COMMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 錯誤處理

### 常見錯誤碼

#### 400 Bad Request
請求參數無效或驗證失敗。

**原因**:
- 缺少必填字段
- 字段格式錯誤
- 驗證規則失敗

**示例**:
```json
{
  "success": false,
  "error": "Title and content are required"
}
```

#### 401 Unauthorized
未認證或 token 無效。

**原因**:
- 缺少 Authorization header
- Token 過期
- Token 格式錯誤

**示例**:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 403 Forbidden
已認證但無權限訪問資源。

**原因**:
- 嘗試修改其他用戶的資源
- 權限不足

**示例**:
```json
{
  "success": false,
  "error": "You can only edit your own posts"
}
```

#### 404 Not Found
請求的資源不存在。

**原因**:
- 使用了無效的 ID
- 資源已被刪除

**示例**:
```json
{
  "success": false,
  "error": "Post not found"
}
```

#### 409 Conflict
資源衝突。

**原因**:
- 用戶名或電子郵件已存在
- 唯一性約束違反

**示例**:
```json
{
  "success": false,
  "error": "Email already in use"
}
```

#### 500 Internal Server Error
服務器內部錯誤。

**原因**:
- 數據庫連接失敗
- 未處理的異常

**示例**:
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 數據模型

### User 對象

```typescript
interface User {
  id: string;              // UUID
  username: string;        // 3-50 字符
  email: string;           // 電子郵件地址
  bio?: string;            // 個人簡介（可選）
  avatarUrl?: string;      // 頭像 URL（可選）
  createdAt: Date;        // 創建時間
  updatedAt: Date;        // 更新時間
}
```

### Post 對象

```typescript
interface Post {
  id: string;              // UUID
  userId: string;          // 作者 ID
  title: string;           // 標題（最多 255 字符）
  content: string;         // 文章內容
  excerpt?: string;        // 摘要（可選）
  slug: string;            // URL 友好的標識符
  published: boolean;      // 發布狀態
  publishedAt?: Date;      // 發布時間
  createdAt: Date;        // 創建時間
  updatedAt: Date;        // 更新時間
}
```

### Comment 對象

```typescript
interface Comment {
  id: string;              // UUID
  postId: string;          // 文章 ID
  userId: string;          // 評論者 ID
  content: string;         // 評論內容
  createdAt: Date;        // 創建時間
  updatedAt: Date;        // 更新時間
}
```

### 響應對象

```typescript
interface PostResponse {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  published: boolean;
  publishedAt?: Date;
  author: UserResponse;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CommentResponse {
  id: string;
  content: string;
  author: UserResponse;
  createdAt: Date;
  updatedAt: Date;
}

interface UserResponse {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 驗證規則

### 用戶註冊
- `username`: 必填，3-50 字符，只能包含字母、數字和下劃線
- `email`: 必填，有效的電子郵件格式
- `password`: 必填，至少 8 個字符
- `bio`: 可選，最多 500 字符

### 文章創建/更新
- `title`: 必填（創建時），最多 255 字符
- `content`: 必填（創建時）
- `excerpt`: 可選，最多 500 字符
- `published`: 可選，布爾值

### 評論創建/更新
- `content`: 必填，至少 1 個字符，最多 2000 字符

---

## 安全性

### JWT Token
- Token 有效期：15 分鐘（可配置）
- 在請求頭中發送：`Authorization: Bearer <token>`
- Token 包含用戶 ID 和電子郵件

### 密碼安全
- 使用 bcrypt 加密，12 輪鹽值
- 最小長度：8 個字符
- 建議使用強密碼策略

### 速率限制
- 每 15 分鐘最多 100 個請求（可配置）
- 超過限制返回 429 Too Many Requests

### CORS
- 配置允許的來源
- 生產環境需要設置 `ALLOWED_ORIGINS` 環境變量

---

## 最佳實踐

### 1. 錯誤處理
始終檢查響應的 `success` 字段：

```javascript
const response = await fetch('/api/posts');
const result = await response.json();

if (!result.success) {
  console.error('Error:', result.error);
  return;
}

console.log('Data:', result.data);
```

### 2. Token 管理
安全地存儲和管理 JWT token：

```javascript
// 存儲 token
localStorage.setItem('token', data.token);

// 在請求中使用
const token = localStorage.getItem('token');
fetch('/api/posts', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 登出時清除
localStorage.removeItem('token');
```

### 3. 分頁處理
處理分頁數據：

```javascript
async function getAllPosts() {
  let page = 1;
  let allPosts = [];
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`/api/posts?page=${page}&limit=50`);
    const result = await response.json();

    allPosts = allPosts.concat(result.data);
    hasMore = page < result.pagination.totalPages;
    page++;
  }

  return allPosts;
}
```

### 4. 錯誤重試
實施請求重試機制：

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## 性能考慮

- 平均響應時間：10-100ms
- 支持高並發請求
- 數據庫查詢已優化並添加索引
- 使用連接池管理數據庫連接

---

## 版本歷史

### v1.0.0 (2024-01-01)
- 初始版本
- 用戶認證（註冊、登錄）
- 文章 CRUD 操作
- 評論系統
- JWT 認證
- 分頁支持

---

## 支持

如有問題或建議，請查看：
- [項目 README](../README.md)
- [最佳實踐指南](../../../docs/BEST_PRACTICES.md)
- [安全指南](../../../docs/SECURITY.md)
