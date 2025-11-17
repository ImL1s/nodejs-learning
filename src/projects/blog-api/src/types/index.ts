/**
 * Type definitions for Blog API
 */

import { Request } from 'express';

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateDto {
  username: string;
  email: string;
  password: string;
  bio?: string;
}

export interface UserUpdateDto {
  username?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserResponseDto {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Post Types
export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostCreateDto {
  title: string;
  content: string;
  excerpt?: string;
  published?: boolean;
}

export interface PostUpdateDto {
  title?: string;
  content?: string;
  excerpt?: string;
  published?: boolean;
}

export interface PostResponseDto {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  published: boolean;
  publishedAt?: Date;
  author: UserResponseDto;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Comment Types
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentCreateDto {
  content: string;
}

export interface CommentUpdateDto {
  content: string;
}

export interface CommentResponseDto {
  id: string;
  content: string;
  author: UserResponseDto;
  createdAt: Date;
  updatedAt: Date;
}

// Authentication Types
export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  token: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

// Express Request Extensions
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

// Pagination Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Response Types - use shared types
export type { ApiResponse, PaginatedResponse as SharedPaginatedResponse } from '../../../../common/types/api.js';

// Database Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized') {
    super(message, 403);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
