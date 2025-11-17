/**
 * Todo API 類型定義
 */

export interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoDto {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateTodoDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface TodoQuery {
  completed?: string;
  priority?: 'low' | 'medium' | 'high';
  sort?: 'createdAt' | 'updatedAt' | 'priority';
  order?: 'asc' | 'desc';
}

// Re-export shared API response type
export type { ApiResponse } from '../../../../common/types/api.js';
