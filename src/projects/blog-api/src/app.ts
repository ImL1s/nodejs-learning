/**
 * Express Application
 */

import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import commentRoutes from './routes/comment.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import logger from './config/logger';

// Load environment variables
dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
