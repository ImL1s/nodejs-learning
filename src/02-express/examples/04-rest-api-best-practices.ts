/**
 * RESTful API 最佳實踐示例
 *
 * 本示例展示：
 * 1. 資源導向的路由設計
 * 2. 統一的錯誤處理
 * 3. 統一的響應格式
 * 4. 請求驗證
 * 5. HATEOAS 超媒體鏈接
 * 6. 分頁、過濾和排序
 */

import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// ==================== 類型定義 ====================

interface User {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  links?: {
    self: string;
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
}

interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: string;
}

// ==================== 錯誤類定義 ====================

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

// ==================== 模擬數據庫 ====================

let users: User[] = [
  {
    id: 1,
    username: 'john_doe',
    email: 'john@example.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    username: 'jane_smith',
    email: 'jane@example.com',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 3,
    username: 'bob_wilson',
    email: 'bob@example.com',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

let nextUserId = 4;

// ==================== 工具函數 ====================

/**
 * 生成 HATEOAS 鏈接
 */
function generateLinks(
  baseUrl: string,
  page: number,
  limit: number,
  total: number
): ApiResponse['links'] {
  const totalPages = Math.ceil(total / limit);

  return {
    self: `${baseUrl}?page=${page}&limit=${limit}`,
    first: `${baseUrl}?page=1&limit=${limit}`,
    last: `${baseUrl}?page=${totalPages}&limit=${limit}`,
    ...(page > 1 && { prev: `${baseUrl}?page=${page - 1}&limit=${limit}` }),
    ...(page < totalPages && { next: `${baseUrl}?page=${page + 1}&limit=${limit}` })
  };
}

/**
 * 成功響應包裝器
 */
function successResponse<T>(
  data: T,
  meta?: ApiResponse['meta'],
  links?: ApiResponse['links']
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
    ...(links && { links })
  };
}

/**
 * 錯誤響應包裝器
 */
function errorResponse(error: ApiError): ApiResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details })
    }
  };
}

/**
 * 分頁處理
 */
function paginate<T>(
  items: T[],
  page: number,
  limit: number
): { items: T[]; total: number; totalPages: number } {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    totalPages: Math.ceil(items.length / limit)
  };
}

/**
 * 過濾和排序
 */
function filterAndSort(
  items: User[],
  filter?: string,
  sort?: string,
  order: 'asc' | 'desc' = 'asc'
): User[] {
  let result = [...items];

  // 應用過濾
  if (filter) {
    const lowerFilter = filter.toLowerCase();
    result = result.filter(user =>
      user.username.toLowerCase().includes(lowerFilter) ||
      user.email.toLowerCase().includes(lowerFilter)
    );
  }

  // 應用排序
  if (sort) {
    result.sort((a, b) => {
      let aValue: any = a[sort as keyof User];
      let bValue: any = b[sort as keyof User];

      // 處理日期比較
      if (aValue instanceof Date) {
        aValue = aValue.getTime();
        bValue = (bValue as Date).getTime();
      }

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  return result;
}

// ==================== 驗證中間件 ====================

/**
 * 驗證創建用戶的請求體
 */
function validateCreateUser(req: Request, res: Response, next: NextFunction) {
  const { username, email } = req.body;
  const errors: any = {};

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    errors.username = 'Username is required and must be a non-empty string';
  } else if (username.length < 3 || username.length > 20) {
    errors.username = 'Username must be between 3 and 20 characters';
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.username = 'Username can only contain letters, numbers, and underscores';
  }

  if (!email || typeof email !== 'string') {
    errors.email = 'Email is required and must be a string';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email must be a valid email address';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  next();
}

/**
 * 驗證更新用戶的請求體
 */
function validateUpdateUser(req: Request, res: Response, next: NextFunction) {
  const { username, email } = req.body;
  const errors: any = {};

  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim().length === 0) {
      errors.username = 'Username must be a non-empty string';
    } else if (username.length < 3 || username.length > 20) {
      errors.username = 'Username must be between 3 and 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }
  }

  if (email !== undefined) {
    if (typeof email !== 'string') {
      errors.email = 'Email must be a string';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email must be a valid email address';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  // 至少需要一個字段
  if (username === undefined && email === undefined) {
    throw new ValidationError('At least one field (username or email) must be provided');
  }

  next();
}

/**
 * 驗證查詢參數
 */
function validateQueryParams(req: Request, res: Response, next: NextFunction) {
  const { page, limit, sort, order } = req.query;
  const errors: any = {};

  if (page !== undefined) {
    const pageNum = Number(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.page = 'Page must be a positive integer';
    }
  }

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.limit = 'Limit must be between 1 and 100';
    }
  }

  if (sort !== undefined && !['id', 'username', 'email', 'createdAt', 'updatedAt'].includes(sort as string)) {
    errors.sort = 'Sort field must be one of: id, username, email, createdAt, updatedAt';
  }

  if (order !== undefined && !['asc', 'desc'].includes(order as string)) {
    errors.order = 'Order must be either "asc" or "desc"';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Invalid query parameters', errors);
  }

  next();
}

// ==================== 異步錯誤處理包裝器 ====================

/**
 * 包裝異步路由處理器以捕獲錯誤
 */
function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ==================== API 路由 ====================

/**
 * GET /api/users - 獲取用戶列表（帶分頁、過濾、排序）
 */
app.get('/api/users', validateQueryParams, asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    sort = 'id',
    order = 'asc',
    filter
  } = req.query as QueryParams;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  // 應用過濾和排序
  let filteredUsers = filterAndSort(
    users,
    filter as string | undefined,
    sort,
    order
  );

  // 應用分頁
  const { items, total, totalPages } = paginate(filteredUsers, pageNum, limitNum);

  // 生成 HATEOAS 鏈接
  const links = generateLinks('/api/users', pageNum, limitNum, total);

  res.json(successResponse(
    items,
    {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    },
    links
  ));
}));

/**
 * GET /api/users/:id - 獲取單個用戶
 */
app.get('/api/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    throw new ValidationError('User ID must be a number');
  }

  const user = users.find(u => u.id === userId);

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json(successResponse(user));
}));

/**
 * POST /api/users - 創建新用戶
 */
app.post('/api/users', validateCreateUser, asyncHandler(async (req: Request, res: Response) => {
  const { username, email } = req.body;

  // 檢查用戶名是否已存在
  if (users.some(u => u.username === username)) {
    throw new ConflictError('Username already exists');
  }

  // 檢查郵箱是否已存在
  if (users.some(u => u.email === email)) {
    throw new ConflictError('Email already exists');
  }

  const newUser: User = {
    id: nextUserId++,
    username,
    email,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  users.push(newUser);

  // 返回 201 Created 並設置 Location 頭
  res.status(201)
    .location(`/api/users/${newUser.id}`)
    .json(successResponse(newUser));
}));

/**
 * PUT /api/users/:id - 更新用戶（完整更新）
 */
app.put('/api/users/:id', validateUpdateUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    throw new ValidationError('User ID must be a number');
  }

  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    throw new NotFoundError('User');
  }

  const { username, email } = req.body;

  // 檢查用戶名是否與其他用戶衝突
  if (username && users.some(u => u.username === username && u.id !== userId)) {
    throw new ConflictError('Username already exists');
  }

  // 檢查郵箱是否與其他用戶衝突
  if (email && users.some(u => u.email === email && u.id !== userId)) {
    throw new ConflictError('Email already exists');
  }

  users[userIndex] = {
    ...users[userIndex],
    username: username || users[userIndex].username,
    email: email || users[userIndex].email,
    updatedAt: new Date()
  };

  res.json(successResponse(users[userIndex]));
}));

/**
 * PATCH /api/users/:id - 部分更新用戶
 */
app.patch('/api/users/:id', validateUpdateUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    throw new ValidationError('User ID must be a number');
  }

  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    throw new NotFoundError('User');
  }

  const { username, email } = req.body;
  const updates: Partial<User> = {};

  if (username !== undefined) {
    // 檢查用戶名是否與其他用戶衝突
    if (users.some(u => u.username === username && u.id !== userId)) {
      throw new ConflictError('Username already exists');
    }
    updates.username = username;
  }

  if (email !== undefined) {
    // 檢查郵箱是否與其他用戶衝突
    if (users.some(u => u.email === email && u.id !== userId)) {
      throw new ConflictError('Email already exists');
    }
    updates.email = email;
  }

  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date()
  };

  res.json(successResponse(users[userIndex]));
}));

/**
 * DELETE /api/users/:id - 刪除用戶
 */
app.delete('/api/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    throw new ValidationError('User ID must be a number');
  }

  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    throw new NotFoundError('User');
  }

  users.splice(userIndex, 1);

  // 返回 204 No Content
  res.status(204).send();
}));

// ==================== 錯誤處理中間件 ====================

/**
 * 404 錯誤處理
 */
app.use((req: Request, res: Response) => {
  res.status(404).json(errorResponse(
    new NotFoundError('Route')
  ));
});

/**
 * 全局錯誤處理
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json(errorResponse(err));
  } else {
    // 未預期的錯誤
    res.status(500).json(errorResponse(
      new ApiError(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred')
    ));
  }
});

// ==================== 啟動服務器 ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('\nAPI Endpoints:');
  console.log('  GET    /api/users - 獲取用戶列表');
  console.log('  GET    /api/users/:id - 獲取單個用戶');
  console.log('  POST   /api/users - 創建新用戶');
  console.log('  PUT    /api/users/:id - 更新用戶');
  console.log('  PATCH  /api/users/:id - 部分更新用戶');
  console.log('  DELETE /api/users/:id - 刪除用戶');
  console.log('\nExample usage:');
  console.log('  curl http://localhost:3000/api/users?page=1&limit=5&sort=username&order=asc');
  console.log('  curl http://localhost:3000/api/users/1');
  console.log('  curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d \'{"username":"test_user","email":"test@example.com"}\'');
});

export default app;
