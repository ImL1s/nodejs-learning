/**
 * Authentication Controller
 */

import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { AuthRequest, UserCreateDto, LoginDto } from '../types';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userData: UserCreateDto = req.body;
    const result = await authService.register(userData);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loginData: LoginDto = req.body;
    const result = await authService.login(loginData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const user = await authService.getCurrentUser(req.user.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
