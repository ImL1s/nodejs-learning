/**
 * 驗證中間件
 */

import { Request, Response, NextFunction } from 'express';
import { CreateTodoDto, UpdateTodoDto } from '../types';

/**
 * 驗證創建 todo 請求
 */
export const validateCreateTodo = (req: Request, res: Response, next: NextFunction) => {
  const { title, priority }: CreateTodoDto = req.body;

  // 驗證 title
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Title is required and must be a non-empty string',
    });
  }

  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Title must not exceed 200 characters',
    });
  }

  // 驗證 priority（可選）
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({
      success: false,
      error: 'Priority must be one of: low, medium, high',
    });
  }

  next();
};

/**
 * 驗證更新 todo 請求
 */
export const validateUpdateTodo = (req: Request, res: Response, next: NextFunction) => {
  const { title, description, completed, priority }: UpdateTodoDto = req.body;

  // 至少要有一個字段
  if (title === undefined && description === undefined && completed === undefined && priority === undefined) {
    return res.status(400).json({
      success: false,
      error: 'At least one field must be provided',
    });
  }

  // 驗證 title（如果提供）
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title must be a non-empty string',
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Title must not exceed 200 characters',
      });
    }
  }

  // 驗證 completed（如果提供）
  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Completed must be a boolean',
    });
  }

  // 驗證 priority（如果提供）
  if (priority !== undefined && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({
      success: false,
      error: 'Priority must be one of: low, medium, high',
    });
  }

  next();
};
