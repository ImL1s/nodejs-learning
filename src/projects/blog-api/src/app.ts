/**
 * Express Application
 */

import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import commentRoutes from './routes/comment.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import logger from './config/logger';
import { env, SECURITY_CONFIG } from '../../../common/config/env.js';

// Load environment variables
dotenv.config();

const app: Application = express();

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.use(cors({
  origin: SECURITY_CONFIG.cors.origins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimit.windowMs,
  max: SECURITY_CONFIG.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API information
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Blog API',
    version: '1.0.0',
    description: 'Complete blog API with users, posts, and comments',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user (requires auth)',
      },
      posts: {
        'GET /api/posts': 'Get all posts',
        'GET /api/posts/:id': 'Get post by ID',
        'GET /api/posts/user/:userId': 'Get user posts',
        'POST /api/posts': 'Create post (requires auth)',
        'PUT /api/posts/:id': 'Update post (requires auth)',
        'DELETE /api/posts/:id': 'Delete post (requires auth)',
      },
      comments: {
        'GET /api/comments/post/:postId': 'Get post comments',
        'POST /api/comments/post/:postId': 'Create comment (requires auth)',
        'PUT /api/comments/:id': 'Update comment (requires auth)',
        'DELETE /api/comments/:id': 'Delete comment (requires auth)',
      },
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
