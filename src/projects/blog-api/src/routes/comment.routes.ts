/**
 * Comment Routes
 */

import { Router } from 'express';
import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  validateCommentCreate,
  validateCommentUpdate,
  validateUuidParam,
  validatePagination,
} from '../middlewares/validation.middleware';

const router = Router();

// Public routes
router.get(
  '/post/:postId',
  validateUuidParam('postId'),
  validatePagination,
  getPostComments
);

// Protected routes
router.post(
  '/post/:postId',
  authenticate,
  validateUuidParam('postId'),
  validateCommentCreate,
  createComment
);
router.put('/:id', authenticate, validateUuidParam('id'), validateCommentUpdate, updateComment);
router.delete('/:id', authenticate, validateUuidParam('id'), deleteComment);

export default router;
