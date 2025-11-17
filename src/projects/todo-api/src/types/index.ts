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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
