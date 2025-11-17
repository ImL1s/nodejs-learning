/**
 * Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../types';

// Validation result handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    throw new ValidationError(errorMessages.join(', '));
  }

  next();
};

// User Validation
export const validateUserRegistration = [
  body('username')
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage('Password must contain at least one letter and one number'),

  body('bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),

  handleValidationErrors,
];

export const validateUserLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),

  body('password').isString().notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

export const validateUserUpdate = [
  body('username')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  body('bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),

  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL'),

  handleValidationErrors,
];

// Post Validation
export const validatePostCreate = [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),

  body('content')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content is required'),

  body('excerpt')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must not exceed 500 characters'),

  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean'),

  handleValidationErrors,
];

export const validatePostUpdate = [
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),

  body('content')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content must not be empty'),

  body('excerpt')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must not exceed 500 characters'),

  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean'),

  handleValidationErrors,
];

// Comment Validation
export const validateCommentCreate = [
  body('content')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),

  handleValidationErrors,
];

export const validateCommentUpdate = [
  body('content')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),

  handleValidationErrors,
];

// Parameter Validation
export const validateUuidParam = (paramName: string = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),

  handleValidationErrors,
];

// Query Validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors,
];
