/**
 * JWT 認證完整實現
 *
 * 本示例展示：
 * 1. 用戶註冊和登錄
 * 2. JWT Token 生成和驗證
 * 3. Access Token 和 Refresh Token 機制
 * 4. 密碼加密（bcrypt）
 * 5. 認證中間件
 * 6. Token 黑名單（登出功能）
 * 7. 角色基礎訪問控制（RBAC）
 */

import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());

// ==================== 配置 ====================

// ⚠️ SECURITY WARNING: 這些是示例用的配置
// 在生產環境中，必須：
// 1. 使用環境變量存儲所有密鑰
// 2. JWT_SECRET 至少 64 個字符
// 3. BCRYPT_ROUNDS 至少 12
// 4. 生成密鑰：node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

// 檢查生產環境
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('❌ FATAL: JWT_SECRET must be set in production environment');
}

const CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || (() => {
    console.warn('⚠️  WARNING: Using insecure default JWT_SECRET. Set JWT_SECRET environment variable!');
    return 'INSECURE-EXAMPLE-KEY-DO-NOT-USE-IN-PRODUCTION';
  })(),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (() => {
    console.warn('⚠️  WARNING: Using insecure default JWT_REFRESH_SECRET. Set JWT_REFRESH_SECRET environment variable!');
    return 'INSECURE-EXAMPLE-REFRESH-KEY-DO-NOT-USE-IN-PRODUCTION';
  })(),
  JWT_EXPIRES_IN: '15m',  // Access token 有效期 15 分鐘
  JWT_REFRESH_EXPIRES_IN: '7d',  // Refresh token 有效期 7 天
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
};

// ==================== 類型定義 ====================

type UserRole = 'user' | 'admin' | 'moderator';

interface User {
  id: number;
  username: string;
  email: string;
  password: string;  // 加密後的密碼
  role: UserRole;
  createdAt: Date;
}

interface TokenPayload {
  userId: number;
  username: string;
  role: UserRole;
}

interface AuthRequest extends Request {
  user?: TokenPayload;
}

interface RefreshToken {
  token: string;
  userId: number;
  expiresAt: Date;
}

// ==================== 數據存儲 ====================

// 模擬用戶數據庫
const users: User[] = [];
let nextUserId = 1;

// Refresh tokens 存儲
const refreshTokens: RefreshToken[] = [];

// Token 黑名單（用於登出）
const tokenBlacklist = new Set<string>();

// ==================== 工具函數 ====================

/**
 * 生成 Access Token
 */
function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, CONFIG.JWT_SECRET, {
    expiresIn: CONFIG.JWT_EXPIRES_IN
  });
}

/**
 * 生成 Refresh Token
 */
function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, CONFIG.JWT_REFRESH_SECRET, {
    expiresIn: CONFIG.JWT_REFRESH_EXPIRES_IN
  });
}

/**
 * 驗證 Access Token
 */
function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, CONFIG.JWT_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * 驗證 Refresh Token
 */
function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, CONFIG.JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * 保存 Refresh Token
 */
function saveRefreshToken(token: string, userId: number): void {
  const decoded = jwt.decode(token) as any;
  refreshTokens.push({
    token,
    userId,
    expiresAt: new Date(decoded.exp * 1000)
  });
}

/**
 * 檢查 Refresh Token 是否存在
 */
function isRefreshTokenValid(token: string): boolean {
  const refreshToken = refreshTokens.find(rt => rt.token === token);
  if (!refreshToken) {
    return false;
  }

  // 檢查是否過期
  if (refreshToken.expiresAt < new Date()) {
    // 移除過期的 token
    const index = refreshTokens.indexOf(refreshToken);
    refreshTokens.splice(index, 1);
    return false;
  }

  return true;
}

/**
 * 移除 Refresh Token
 */
function removeRefreshToken(token: string): void {
  const index = refreshTokens.findIndex(rt => rt.token === token);
  if (index !== -1) {
    refreshTokens.splice(index, 1);
  }
}

/**
 * 移除用戶的所有 Refresh Tokens
 */
function removeAllUserRefreshTokens(userId: number): void {
  for (let i = refreshTokens.length - 1; i >= 0; i--) {
    if (refreshTokens[i].userId === userId) {
      refreshTokens.splice(i, 1);
    }
  }
}

/**
 * 清理過期的 Refresh Tokens
 */
function cleanupExpiredRefreshTokens(): void {
  const now = new Date();
  for (let i = refreshTokens.length - 1; i >= 0; i--) {
    if (refreshTokens[i].expiresAt < now) {
      refreshTokens.splice(i, 1);
    }
  }
}

// 定期清理過期的 refresh tokens（每小時）
setInterval(cleanupExpiredRefreshTokens, 60 * 60 * 1000);

// ==================== 認證中間件 ====================

/**
 * 認證中間件 - 驗證 JWT Token
 */
function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // 從 Authorization header 獲取 token
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided'
        }
      });
      return;
    }

    // 格式: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Token format should be: Bearer <token>'
        }
      });
      return;
    }

    const token = parts[1];

    // 檢查 token 是否在黑名單中
    if (tokenBlacklist.has(token)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked'
        }
      });
      return;
    }

    // 驗證 token
    const payload = verifyAccessToken(token);

    // 將用戶信息附加到請求對象
    req.user = payload;

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: error.message || 'Authentication failed'
      }
    });
  }
}

/**
 * 可選認證中間件 - 如果有 token 則驗證，沒有則繼續
 */
function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  try {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      if (!tokenBlacklist.has(token)) {
        const payload = verifyAccessToken(token);
        req.user = payload;
      }
    }
  } catch (error) {
    // 忽略錯誤，繼續執行
  }

  next();
}

/**
 * 授權中間件 - 檢查用戶角色
 */
function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'You must be authenticated to access this resource'
        }
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
      return;
    }

    next();
  };
}

// ==================== 路由處理器 ====================

/**
 * POST /auth/register - 用戶註冊
 */
app.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // 驗證輸入
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username, email, and password are required'
        }
      });
      return;
    }

    // 驗證用戶名格式
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
        }
      });
      return;
    }

    // 驗證郵箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      });
      return;
    }

    // 驗證密碼強度
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long'
        }
      });
      return;
    }

    // 檢查用戶名是否已存在
    if (users.find(u => u.username === username)) {
      res.status(409).json({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username already exists'
        }
      });
      return;
    }

    // 檢查郵箱是否已存在
    if (users.find(u => u.email === email)) {
      res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already exists'
        }
      });
      return;
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS);

    // 創建新用戶
    const newUser: User = {
      id: nextUserId++,
      username,
      email,
      password: hashedPassword,
      role: 'user',  // 默認角色為普通用戶
      createdAt: new Date()
    };

    users.push(newUser);

    // 生成 tokens
    const tokenPayload: TokenPayload = {
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // 保存 refresh token
    saveRefreshToken(refreshToken, newUser.id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Registration failed'
      }
    });
  }
});

/**
 * POST /auth/login - 用戶登錄
 */
app.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // 驗證輸入
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required'
        }
      });
      return;
    }

    // 查找用戶
    const user = users.find(u => u.username === username);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
      return;
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
      return;
    }

    // 生成 tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // 保存 refresh token
    saveRefreshToken(refreshToken, user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Login failed'
      }
    });
  }
});

/**
 * POST /auth/refresh - 刷新 Access Token
 */
app.post('/auth/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
      return;
    }

    // 檢查 refresh token 是否有效
    if (!isRefreshTokenValid(refreshToken)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
      return;
    }

    // 驗證 refresh token
    const payload = verifyRefreshToken(refreshToken);

    // 生成新的 access token
    const newAccessToken = generateAccessToken(payload);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: error.message || 'Failed to refresh token'
      }
    });
  }
});

/**
 * POST /auth/logout - 登出
 */
app.post('/auth/logout', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    // 將 access token 加入黑名單
    tokenBlacklist.add(token);

    // 移除用戶的所有 refresh tokens
    if (req.user) {
      removeAllUserRefreshTokens(req.user.userId);
    }

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Logout failed'
      }
    });
  }
});

/**
 * GET /auth/me - 獲取當前用戶信息
 */
app.get('/auth/me', authenticate, (req: AuthRequest, res: Response) => {
  const user = users.find(u => u.id === req.user!.userId);

  if (!user) {
    res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

/**
 * GET /api/public - 公開端點
 */
app.get('/api/public', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'This is a public endpoint accessible to everyone'
    }
  });
});

/**
 * GET /api/protected - 受保護端點（需要認證）
 */
app.get('/api/protected', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'This is a protected endpoint',
      user: req.user
    }
  });
});

/**
 * GET /api/admin - 管理員端點（需要 admin 角色）
 */
app.get('/api/admin', authenticate, authorize('admin'), (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'This is an admin-only endpoint',
      user: req.user
    }
  });
});

/**
 * GET /api/moderator - 管理員或版主端點
 */
app.get('/api/moderator', authenticate, authorize('admin', 'moderator'), (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'This endpoint is accessible to admins and moderators',
      user: req.user
    }
  });
});

/**
 * GET /api/users - 獲取所有用戶（僅管理員）
 */
app.get('/api/users', authenticate, authorize('admin'), (req: AuthRequest, res: Response) => {
  const userList = users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt
  }));

  res.json({
    success: true,
    data: userList
  });
});

// ==================== 錯誤處理 ====================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// ==================== 啟動服務器 ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('\n=== JWT Authentication API ===');
  console.log('\nPublic Endpoints:');
  console.log('  POST /auth/register - 註冊新用戶');
  console.log('  POST /auth/login - 登錄');
  console.log('  POST /auth/refresh - 刷新 access token');
  console.log('  GET  /api/public - 公開端點');
  console.log('\nProtected Endpoints:');
  console.log('  POST /auth/logout - 登出（需要認證）');
  console.log('  GET  /auth/me - 獲取當前用戶信息（需要認證）');
  console.log('  GET  /api/protected - 受保護端點（需要認證）');
  console.log('  GET  /api/admin - 管理員端點（需要 admin 角色）');
  console.log('  GET  /api/moderator - 版主端點（需要 admin 或 moderator 角色）');
  console.log('  GET  /api/users - 獲取所有用戶（需要 admin 角色）');
  console.log('\nExample usage:');
  console.log('  # 註冊');
  console.log('  curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d \'{"username":"testuser","email":"test@example.com","password":"password123"}\'');
  console.log('\n  # 登錄');
  console.log('  curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d \'{"username":"testuser","password":"password123"}\'');
  console.log('\n  # 訪問受保護端點');
  console.log('  curl http://localhost:3000/api/protected -H "Authorization: Bearer YOUR_ACCESS_TOKEN"');
});

export default app;
