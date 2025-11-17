/**
 * Authentication Service
 */

import userModel from '../models/user.model';
import { generateToken } from '../middlewares/auth.middleware';
import {
  UserCreateDto,
  LoginDto,
  AuthResponseDto,
  UserResponseDto,
  ValidationError,
  AuthenticationError,
} from '../types';
import { sanitizeUser } from '../utils/helpers';

export class AuthService {
  async register(userData: UserCreateDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUserByEmail = await userModel.findByEmail(userData.email);
    if (existingUserByEmail) {
      throw new ValidationError('Email already in use');
    }

    const existingUserByUsername = await userModel.findByUsername(userData.username);
    if (existingUserByUsername) {
      throw new ValidationError('Username already taken');
    }

    // Create user
    const user = await userModel.create(userData);

    // Generate token
    const token = generateToken(user.id, user.email);

    // Return sanitized user and token
    const userResponse = sanitizeUser(user) as UserResponseDto;

    return {
      user: userResponse,
      token,
    };
  }

  async login(loginData: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await userModel.findByEmail(loginData.email);

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await userModel.verifyPassword(user, loginData.password);

    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Return sanitized user and token
    const userResponse = sanitizeUser(user) as UserResponseDto;

    return {
      user: userResponse,
      token,
    };
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await userModel.findById(userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return sanitizeUser(user) as UserResponseDto;
  }
}

export default new AuthService();
