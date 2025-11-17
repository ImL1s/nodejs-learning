# Todo API 文檔

完整的 Todo List API 文檔，包含所有端點的詳細說明。

## 基本信息

- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **版本**: 1.0.0

## 響應格式

所有 API 響應都使用統一的 JSON 格式：

### 成功響應
```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
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
- `204` - No Content: 請求成功但無內容返回
- `400` - Bad Request: 請求參數錯誤
- `404` - Not Found: 資源不存在
- `500` - Internal Server Error: 服務器內部錯誤

## API 端點

### 1. 獲取所有 Todos

獲取所有 todo 項目列表，支持過濾。

**端點**: `GET /api/todos`

**查詢參數**:
- `completed` (optional): 過濾完成狀態 (`true` 或 `false`)

**示例請求**:
```bash
curl -X GET http://localhost:3000/api/todos
```

**示例請求（過濾已完成）**:
```bash
curl -X GET "http://localhost:3000/api/todos?completed=true"
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "title": "Learn TypeScript",
      "description": "Study TypeScript fundamentals",
      "completed": false,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "title": "Build Todo API",
      "description": "Create a REST API for todos",
      "completed": true,
      "createdAt": "2024-01-02T10:00:00.000Z",
      "updatedAt": "2024-01-02T15:30:00.000Z"
    }
  ]
}
```

---

### 2. 獲取單個 Todo

根據 ID 獲取特定的 todo 項目。

**端點**: `GET /api/todos/:id`

**路徑參數**:
- `id` (required): Todo 項目的 ID

**示例請求**:
```bash
curl -X GET http://localhost:3000/api/todos/1
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Learn TypeScript",
    "description": "Study TypeScript fundamentals",
    "completed": false,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

**錯誤響應** (404 Not Found):
```json
{
  "success": false,
  "error": "Todo not found"
}
```

**錯誤響應** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid ID"
}
```

---

### 3. 創建 Todo

創建一個新的 todo 項目。

**端點**: `POST /api/todos`

**請求體**:
```json
{
  "title": "Todo title",
  "description": "Optional description"
}
```

**字段說明**:
- `title` (required): Todo 標題，3-200 個字符
- `description` (optional): Todo 描述，最多 1000 個字符

**示例請求**:
```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Node.js",
    "description": "Master Node.js backend development"
  }'
```

**成功響應** (201 Created):
```json
{
  "success": true,
  "message": "Todo created successfully",
  "data": {
    "id": 3,
    "title": "Learn Node.js",
    "description": "Master Node.js backend development",
    "completed": false,
    "createdAt": "2024-01-03T10:00:00.000Z",
    "updatedAt": "2024-01-03T10:00:00.000Z"
  }
}
```

**錯誤響應** (400 Bad Request):
```json
{
  "success": false,
  "error": "Title is required and must be between 3 and 200 characters"
}
```

---

### 4. 更新 Todo

更新現有的 todo 項目。

**端點**: `PUT /api/todos/:id`

**路徑參數**:
- `id` (required): Todo 項目的 ID

**請求體**:
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "completed": true
}
```

**字段說明**:
- `title` (optional): 新標題
- `description` (optional): 新描述
- `completed` (optional): 完成狀態

**示例請求**:
```bash
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Master TypeScript",
    "completed": true
  }'
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "message": "Todo updated successfully",
  "data": {
    "id": 1,
    "title": "Master TypeScript",
    "description": "Study TypeScript fundamentals",
    "completed": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-03T11:00:00.000Z"
  }
}
```

**錯誤響應** (404 Not Found):
```json
{
  "success": false,
  "error": "Todo not found"
}
```

---

### 5. 刪除 Todo

刪除指定的 todo 項目。

**端點**: `DELETE /api/todos/:id`

**路徑參數**:
- `id` (required): Todo 項目的 ID

**示例請求**:
```bash
curl -X DELETE http://localhost:3000/api/todos/1
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "message": "Todo deleted successfully"
}
```

**錯誤響應** (404 Not Found):
```json
{
  "success": false,
  "error": "Todo not found"
}
```

---

### 6. 切換完成狀態

快速切換 todo 的完成狀態。

**端點**: `PATCH /api/todos/:id/toggle`

**路徑參數**:
- `id` (required): Todo 項目的 ID

**示例請求**:
```bash
curl -X PATCH http://localhost:3000/api/todos/1/toggle
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "message": "Todo toggled successfully",
  "data": {
    "id": 1,
    "title": "Learn TypeScript",
    "description": "Study TypeScript fundamentals",
    "completed": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-03T12:00:00.000Z"
  }
}
```

---

### 7. 獲取統計信息

獲取 todos 的統計信息。

**端點**: `GET /api/todos/stats`

**示例請求**:
```bash
curl -X GET http://localhost:3000/api/todos/stats
```

**成功響應** (200 OK):
```json
{
  "success": true,
  "data": {
    "total": 10,
    "completed": 6,
    "pending": 4,
    "completionRate": 60
  }
}
```

---

## 使用示例

### JavaScript/Node.js

```javascript
// 使用 fetch
async function getTodos() {
  const response = await fetch('http://localhost:3000/api/todos');
  const data = await response.json();
  console.log(data);
}

// 創建 todo
async function createTodo(title, description) {
  const response = await fetch('http://localhost:3000/api/todos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, description }),
  });
  const data = await response.json();
  return data;
}
```

### Python

```python
import requests

# 獲取所有 todos
response = requests.get('http://localhost:3000/api/todos')
todos = response.json()

# 創建 todo
new_todo = {
    'title': 'Learn Python',
    'description': 'Master Python programming'
}
response = requests.post(
    'http://localhost:3000/api/todos',
    json=new_todo
)
result = response.json()
```

### cURL 完整示例

```bash
# 創建 todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Task 1", "description": "Do something"}'

# 獲取所有 todos
curl http://localhost:3000/api/todos

# 更新 todo
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# 切換狀態
curl -X PATCH http://localhost:3000/api/todos/1/toggle

# 刪除 todo
curl -X DELETE http://localhost:3000/api/todos/1

# 獲取統計
curl http://localhost:3000/api/todos/stats
```

## 錯誤處理

API 使用標準 HTTP 狀態碼來表示錯誤類型：

- **400 Bad Request**: 請求參數無效
  - 缺少必填字段
  - 字段格式錯誤
  - 驗證失敗

- **404 Not Found**: 資源不存在
  - Todo ID 不存在
  - 路由不存在

- **500 Internal Server Error**: 服務器錯誤
  - 數據庫錯誤
  - 未預期的錯誤

## 數據模型

### Todo 對象

```typescript
interface Todo {
  id: number;              // 唯一標識符
  title: string;           // 標題 (3-200 字符)
  description?: string;    // 描述 (可選，最多 1000 字符)
  completed: boolean;      // 完成狀態
  createdAt: Date;        // 創建時間
  updatedAt: Date;        // 更新時間
}
```

## 驗證規則

### 創建 Todo
- `title`: 必填，3-200 個字符
- `description`: 可選，最多 1000 個字符

### 更新 Todo
- `title`: 可選，3-200 個字符
- `description`: 可選，最多 1000 個字符
- `completed`: 可選，布爾值

## 最佳實踐

1. **錯誤處理**: 始終檢查響應的 `success` 字段
2. **驗證**: 在發送請求前驗證數據
3. **超時**: 設置合理的請求超時時間
4. **重試**: 對失敗的請求實施重試機制
5. **日誌**: 記錄 API 調用以便調試

## 性能考慮

- API 響應時間通常在 10-50ms
- 支持並發請求
- 無請求速率限制（開發環境）

## 版本歷史

- **v1.0.0** (2024-01-01): 初始版本
  - 基本 CRUD 操作
  - 統計功能
  - 過濾功能
