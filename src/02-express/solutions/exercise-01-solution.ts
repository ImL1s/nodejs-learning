/**
 * Exercise 01 Solution: 用戶認證系統
 *
 * 這是一個完整的用戶認證系統實現，包含：
 * - 用戶註冊和登錄
 * - JWT Token 管理
 * - 密碼管理（修改、重置）
 * - 郵箱驗證
 * - 登錄失敗限制
 */

import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(express.json());

// ==================== 配置 ====================

const CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  BCRYPT_ROUNDS: 10,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME: 15 * 60 * 1000, // 15 minutes
  RESET_TOKEN_EXPIRES: 30 * 60 * 1000, // 30 minutes
  VERIFICATION_TOKEN_EXPIRES: 24 * 60 * 60 * 1000 // 24 hours
};

// ==================== 類型定義 ====================

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TokenPayload {
  userId: number;
  username: string;
}

interface RefreshToken {
  token: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
}

interface AuthRequest extends Request {
  user?: TokenPayload;
}

// ==================== 數據存儲 ====================

const users: User[] = [];
const refreshTokens: RefreshToken[] = [];
const tokenBlacklist = new Set<string>();
let nextUserId = 1;

// ==================== 工具函數 ====================

/**
 * 驗證密碼強度
 */
function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  return { valid: true };
}

/**
 * 生成隨機 token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 檢查用戶是否被鎖定
 */
function isLocked(user: User): boolean {
  return !!(user.lockUntil && user.lockUntil > new Date());
}

/**
 * 增加登錄嘗試次數
 */
async function incrementLoginAttempts(user: User): Promise<void> {
  user.loginAttempts += 1;

  if (user.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + CONFIG.LOCK_TIME);
  }

  user.updatedAt = new Date();
}

/**
 * 重置登錄嘗試
 */
function resetLoginAttempts(user: User): void {
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.updatedAt = new Date();
}

/**
 * 生成 JWT token
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
  const token = jwt.sign(payload, CONFIG.JWT_REFRESH_SECRET, {
    expiresIn: CONFIG.JWT_REFRESH_EXPIRES_IN
  });

  const decoded = jwt.decode(token) as any;
  refreshTokens.push({
    token,
    userId: payload.userId,
    expiresAt: new Date(decoded.exp * 1000),
    createdAt: new Date()
  });

  return token;
}

/**
 * 驗證 Access Token
 */
function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, CONFIG.JWT_SECRET) as TokenPayload;
}

/**
 * 驗證 Refresh Token
 */
function verifyRefreshToken(token: string): TokenPayload {
  const isValid = refreshTokens.some(rt => rt.token === token && rt.expiresAt > new Date());
  if (!isValid) {
    throw new Error('Invalid or expired refresh token');
  }
  return jwt.verify(token, CONFIG.JWT_REFRESH_SECRET) as TokenPayload;
}

/**
 * 發送郵件（模擬）
 */
function sendEmail(to: string, subject: string, content: string): void {
  console.log('\n========== EMAIL ==========');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${content}`);
  console.log('===========================\n');
}

// ==================== 中間件 ====================

/**
 * 認證中間件
 */
function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
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

    const payload = verifyAccessToken(token);
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

// ==================== 速率限制 ====================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts, please try again later'
    }
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts'
    }
  }
});

// ==================== 路由處理器 ====================

/**
 * POST /api/auth/register - 用戶註冊
 */
app.post('/api/auth/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // 驗證輸入
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required'
        }
      });
    }

    // 驗證用戶名格式
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
        }
      });
    }

    // 驗證郵箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      });
    }

    // 驗證密碼強度
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message
        }
      });
    }

    // 確認密碼匹配
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_MISMATCH',
          message: 'Passwords do not match'
        }
      });
    }

    // 檢查用戶名是否已存在
    if (users.find(u => u.username === username)) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username already exists'
        }
      });
    }

    // 檢查郵箱是否已存在
    if (users.find(u => u.email === email)) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already exists'
        }
      });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS);

    // 生成郵箱驗證 token
    const verificationToken = generateToken();

    // 創建新用戶
    const newUser: User = {
      id: nextUserId++,
      username,
      email,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      loginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.push(newUser);

    // 發送驗證郵件
    const verificationLink = `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`;
    sendEmail(
      email,
      'Verify your email address',
      `Please click the following link to verify your email:\n${verificationLink}`
    );

    // 生成 tokens
    const tokenPayload: TokenPayload = {
      userId: newUser.id,
      username: newUser.username
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          emailVerified: newUser.emailVerified
        },
        accessToken,
        refreshToken,
        message: 'Registration successful. Please verify your email.'
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
 * POST /api/auth/login - 用戶登錄
 */
app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required'
        }
      });
    }

    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }

    // 檢查是否被鎖定
    if (isLocked(user)) {
      const lockTime = user.lockUntil!.getTime() - Date.now();
      const minutes = Math.ceil(lockTime / 60000);
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is locked. Please try again in ${minutes} minutes.`
        }
      });
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await incrementLoginAttempts(user);
      const remainingAttempts = CONFIG.MAX_LOGIN_ATTEMPTS - user.loginAttempts;

      if (remainingAttempts > 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
            remainingAttempts
          }
        });
      } else {
        return res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Too many failed attempts. Account locked for ${CONFIG.LOCK_TIME / 60000} minutes.`
          }
        });
      }
    }

    // 重置登錄嘗試
    resetLoginAttempts(user);

    // 更新最後登錄信息
    user.lastLogin = new Date();
    user.lastLoginIp = req.ip;

    // 生成 tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      username: user.username
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin
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
 * POST /api/auth/refresh - 刷新 Token
 */
app.post('/api/auth/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(payload);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error: any) {
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
 * POST /api/auth/logout - 登出
 */
app.post('/api/auth/logout', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    tokenBlacklist.add(token);

    // 移除用戶的所有 refresh tokens
    for (let i = refreshTokens.length - 1; i >= 0; i--) {
      if (refreshTokens[i].userId === req.user!.userId) {
        refreshTokens.splice(i, 1);
      }
    }

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (error: any) {
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
 * GET /api/auth/me - 獲取當前用戶
 */
app.get('/api/auth/me', authenticate, (req: AuthRequest, res: Response) => {
  const user = users.find(u => u.id === req.user!.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }
  });
});

/**
 * PATCH /api/auth/profile - 更新用戶資料
 */
app.patch('/api/auth/profile', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, lastName } = req.body;
    const user = users.find(u => u.id === req.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // 驗證郵箱
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email format'
          }
        });
      }

      // 檢查郵箱是否被其他用戶使用
      if (users.find(u => u.email === email && u.id !== user.id)) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already in use'
          }
        });
      }

      user.email = email;
      user.emailVerified = false; // 需要重新驗證
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    user.updatedAt = new Date();

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update profile'
      }
    });
  }
});

/**
 * POST /api/auth/change-password - 修改密碼
 */
app.post('/api/auth/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required'
        }
      });
    }

    const user = users.find(u => u.id === req.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // 驗證當前密碼
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }

    // 驗證新密碼
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message
        }
      });
    }

    // 確認新密碼匹配
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_MISMATCH',
          message: 'New passwords do not match'
        }
      });
    }

    // 更新密碼
    user.password = await bcrypt.hash(newPassword, CONFIG.BCRYPT_ROUNDS);
    user.updatedAt = new Date();

    // 使所有 tokens 失效
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];
    tokenBlacklist.add(token);

    // 移除所有 refresh tokens
    for (let i = refreshTokens.length - 1; i >= 0; i--) {
      if (refreshTokens[i].userId === user.id) {
        refreshTokens.splice(i, 1);
      }
    }

    res.json({
      success: true,
      data: {
        message: 'Password changed successfully. Please log in again.'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CHANGE_PASSWORD_FAILED',
        message: 'Failed to change password'
      }
    });
  }
});

/**
 * POST /api/auth/forgot-password - 忘記密碼
 */
app.post('/api/auth/forgot-password', authLimiter, (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required'
        }
      });
    }

    const user = users.find(u => u.email === email);

    // 總是返回成功消息，防止郵箱枚舉攻擊
    if (user) {
      const resetToken = generateToken();
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + CONFIG.RESET_TOKEN_EXPIRES);
      user.updatedAt = new Date();

      const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
      sendEmail(
        email,
        'Password Reset Request',
        `Click the following link to reset your password:\n${resetLink}\n\nThis link will expire in 30 minutes.`
      );
    }

    res.json({
      success: true,
      data: {
        message: 'If an account exists with that email, a password reset link has been sent.'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FORGOT_PASSWORD_FAILED',
        message: 'Failed to process request'
      }
    });
  }
});

/**
 * POST /api/auth/reset-password - 重置密碼
 */
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmNewPassword } = req.body;

    if (!token || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required'
        }
      });
    }

    const user = users.find(u =>
      u.passwordResetToken === token &&
      u.passwordResetExpires &&
      u.passwordResetExpires > new Date()
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token'
        }
      });
    }

    // 驗證新密碼
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message
        }
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_MISMATCH',
          message: 'Passwords do not match'
        }
      });
    }

    // 更新密碼
    user.password = await bcrypt.hash(newPassword, CONFIG.BCRYPT_ROUNDS);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.updatedAt = new Date();

    // 清除所有 refresh tokens
    for (let i = refreshTokens.length - 1; i >= 0; i--) {
      if (refreshTokens[i].userId === user.id) {
        refreshTokens.splice(i, 1);
      }
    }

    res.json({
      success: true,
      data: {
        message: 'Password reset successfully. Please log in with your new password.'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_PASSWORD_FAILED',
        message: 'Failed to reset password'
      }
    });
  }
});

/**
 * POST /api/auth/verify-email - 驗證郵箱
 */
app.post('/api/auth/verify-email', (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token is required'
        }
      });
    }

    const user = users.find(u => u.emailVerificationToken === token);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid verification token'
        }
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.updatedAt = new Date();

    res.json({
      success: true,
      data: {
        message: 'Email verified successfully'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: 'Failed to verify email'
      }
    });
  }
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
  console.log('\n=== User Authentication System ===');
  console.log('\nEndpoints:');
  console.log('  POST /api/auth/register - 註冊新用戶');
  console.log('  POST /api/auth/login - 登錄');
  console.log('  POST /api/auth/refresh - 刷新 token');
  console.log('  POST /api/auth/logout - 登出');
  console.log('  GET  /api/auth/me - 獲取當前用戶');
  console.log('  PATCH /api/auth/profile - 更新用戶資料');
  console.log('  POST /api/auth/change-password - 修改密碼');
  console.log('  POST /api/auth/forgot-password - 忘記密碼');
  console.log('  POST /api/auth/reset-password - 重置密碼');
  console.log('  POST /api/auth/verify-email - 驗證郵箱');
});

export default app;
