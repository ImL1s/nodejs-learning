/**
 * 環境變量配置和驗證
 *
 * 使用 zod 進行環境變量驗證，確保生產環境安全
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// 加載環境變量
dotenv.config();

/**
 * 環境變量 Schema
 */
const envSchema = z.object({
  // 基本配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),

  // JWT 配置
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS 配置
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),

  // Bcrypt
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(31).default(12),

  // 數據庫（可選，用於需要數據庫的項目）
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),

  // Redis（可選）
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  REDIS_PASSWORD: z.string().optional(),
});

/**
 * 環境變量類型
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 驗證環境變量
 */
function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);

    // 生產環境額外檢查
    if (env.NODE_ENV === 'production') {
      // 檢查 JWT 密鑰長度
      if (env.JWT_SECRET.length < 64) {
        console.warn('⚠️  WARNING: JWT_SECRET should be at least 64 characters in production');
      }

      // 檢查是否使用默認值
      if (env.JWT_SECRET.includes('GENERATE')) {
        throw new Error('FATAL: JWT_SECRET must be set in production');
      }
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      console.error(error.format());
      process.exit(1);
    }
    throw error;
  }
}

/**
 * 導出驗證後的環境變量
 */
export const env = validateEnv();

/**
 * 安全配置
 */
export const SECURITY_CONFIG = {
  bcrypt: {
    rounds: env.BCRYPT_ROUNDS,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  cors: {
    origins: env.ALLOWED_ORIGINS.split(','),
  },
} as const;
