/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import logger from '../config/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }

  // Handle database errors
  if (err.name === 'QueryFailedError') {
    res.status(500).json({
      success: false,
      error: 'Database error',
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
};
