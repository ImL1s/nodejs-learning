/**
 * Post Routes
 */

import { Router } from 'express';
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getUserPosts,
} from '../controllers/post.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
import {
  validatePostCreate,
  validatePostUpdate,
  validateUuidParam,
  validatePagination,
} from '../middlewares/validation.middleware';

const router = Router();

// Public routes
router.get('/', validatePagination, getAllPosts);
router.get('/:id', validateUuidParam('id'), getPostById);
router.get('/user/:userId', validateUuidParam('userId'), validatePagination, getUserPosts);

// Protected routes
router.post('/', authenticate, validatePostCreate, createPost);
router.put('/:id', authenticate, validateUuidParam('id'), validatePostUpdate, updatePost);
router.delete('/:id', authenticate, validateUuidParam('id'), deletePost);

export default router;
