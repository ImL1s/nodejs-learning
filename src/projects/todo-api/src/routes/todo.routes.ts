/**
 * Todo 路由
 */

import { Router } from 'express';
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  getTodoStats,
} from '../controllers/todo.controller';
import { validateCreateTodo, validateUpdateTodo } from '../middlewares/validation';

const router = Router();

// 統計信息
router.get('/stats', getTodoStats);

// CRUD 操作
router.get('/', getAllTodos);
router.get('/:id', getTodoById);
router.post('/', validateCreateTodo, createTodo);
router.put('/:id', validateUpdateTodo, updateTodo);
router.delete('/:id', deleteTodo);

// 切換完成狀態
router.patch('/:id/toggle', toggleTodo);

export default router;
