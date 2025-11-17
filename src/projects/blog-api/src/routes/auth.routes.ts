/**
 * Authentication Routes
 */

import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  validateUserRegistration,
  validateUserLogin,
} from '../middlewares/validation.middleware';

const router = Router();

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);

// Protected routes
router.get('/me', authenticate, getCurrentUser);

export default router;
