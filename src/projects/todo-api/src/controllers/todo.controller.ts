/**
 * Todo 控制器
 */

import { Request, Response } from 'express';
import todoModel from '../models/todo.model';
import { CreateTodoDto, UpdateTodoDto, TodoQuery } from '../types';

/**
 * 獲取所有 todos
 */
export const getAllTodos = (req: Request, res: Response) => {
  const query: TodoQuery = req.query;
  const todos = todoModel.findAll(query);

  res.json({
    success: true,
    count: todos.length,
    data: todos,
  });
};

/**
 * 根據 ID 獲取 todo
 */
export const getTodoById = (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
    });
  }

  const todo = todoModel.findById(id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      error: 'Todo not found',
    });
  }

  res.json({
    success: true,
    data: todo,
  });
};

/**
 * 創建新 todo
 */
export const createTodo = (req: Request, res: Response) => {
  const data: CreateTodoDto = req.body;
  const todo = todoModel.create(data);

  res.status(201).json({
    success: true,
    message: 'Todo created successfully',
    data: todo,
  });
};

/**
 * 更新 todo
 */
export const updateTodo = (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data: UpdateTodoDto = req.body;

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
    });
  }

  const todo = todoModel.update(id, data);

  if (!todo) {
    return res.status(404).json({
      success: false,
      error: 'Todo not found',
    });
  }

  res.json({
    success: true,
    message: 'Todo updated successfully',
    data: todo,
  });
};

/**
 * 刪除 todo
 */
export const deleteTodo = (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
    });
  }

  const deleted = todoModel.delete(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Todo not found',
    });
  }

  res.json({
    success: true,
    message: 'Todo deleted successfully',
  });
};

/**
 * 切換完成狀態
 */
export const toggleTodo = (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
    });
  }

  const todo = todoModel.toggleComplete(id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      error: 'Todo not found',
    });
  }

  res.json({
    success: true,
    message: 'Todo toggled successfully',
    data: todo,
  });
};

/**
 * 獲取統計信息
 */
export const getTodoStats = (req: Request, res: Response) => {
  const stats = todoModel.getStats();

  res.json({
    success: true,
    data: stats,
  });
};
