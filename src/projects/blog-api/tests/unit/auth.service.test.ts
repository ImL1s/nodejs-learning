/**
 * Auth Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import userModel from '../../src/models/user.model';
import { generateToken } from '../../src/middlewares/auth.middleware';
import { sanitizeUser } from '../../src/utils/helpers';
import { ValidationError, AuthenticationError } from '../../src/types';

// Mock dependencies
vi.mock('../../src/models/user.model');
vi.mock('../../src/middlewares/auth.middleware');
vi.mock('../../src/utils/helpers');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('register', () => {
    const mockUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123',
      bio: 'Test user bio',
    };

    const mockCreatedUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      email: 'test@example.com',
      password: '$2b$12$hashedpassword',
      bio: 'Test user bio',
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockSanitizedUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      email: 'test@example.com',
      bio: 'Test user bio',
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should successfully register a new user', async () => {
      // Arrange
      vi.mocked(userModel.findByEmail).mockResolvedValue(null);
      vi.mocked(userModel.findByUsername).mockResolvedValue(null);
      vi.mocked(userModel.create).mockResolvedValue(mockCreatedUser);
      vi.mocked(generateToken).mockReturnValue('mock-jwt-token');
      vi.mocked(sanitizeUser).mockReturnValue(mockSanitizedUser);

      // Act
      const result = await authService.register(mockUserData);

      // Assert
      expect(userModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userModel.findByUsername).toHaveBeenCalledWith('testuser');
      expect(userModel.create).toHaveBeenCalledWith(mockUserData);
      expect(generateToken).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'test@example.com'
      );
      expect(result).toEqual({
        user: mockSanitizedUser,
        token: 'mock-jwt-token',
      });
    });

    it('should throw ValidationError if email already exists', async () => {
      // Arrange
      vi.mocked(userModel.findByEmail).mockResolvedValue(mockCreatedUser);

      // Act & Assert
      await expect(authService.register(mockUserData)).rejects.toThrow(
        ValidationError
      );
      await expect(authService.register(mockUserData)).rejects.toThrow(
        'Email already in use'
      );

      expect(userModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userModel.findByUsername).not.toHaveBeenCalled();
      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if username already taken', async () => {
      // Arrange
      vi.mocked(userModel.findByEmail).mockResolvedValue(null);
      vi.mocked(userModel.findByUsername).mockResolvedValue(mockCreatedUser);

      // Act & Assert
      await expect(authService.register(mockUserData)).rejects.toThrow(
        ValidationError
      );
      await expect(authService.register(mockUserData)).rejects.toThrow(
        'Username already taken'
      );

      expect(userModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userModel.findByUsername).toHaveBeenCalledWith('testuser');
      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('should sanitize user data before returning', async () => {
      // Arrange
      vi.mocked(userModel.findByEmail).mockResolvedValue(null);
      vi.mocked(userModel.findByUsername).mockResolvedValue(null);
      vi.mocked(userModel.create).mockResolvedValue(mockCreatedUser);
      vi.mocked(generateToken).mockReturnValue('mock-jwt-token');
      vi.mocked(sanitizeUser).mockReturnValue(mockSanitizedUser);

      // Act
      await authService.register(mockUserData);

      // Assert
      expect(sanitizeUser).toHaveBeenCalledWith(mockCreatedUser);
    });
  });

  describe('login', () => {
    const mockLoginData = {
      email: 'test@example.com',
      password: 'SecurePass123',
    };

    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      email: 'test@example.com',
      password: '$2b$12$hashedpassword',
      bio: 'Test user bio',
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockSanitizedUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      email: 'test@example.com',
      bio: 'Test user bio',
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      vi.mocked(userModel.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(userModel.verifyPassword).mockResolvedValue(true);
      vi.mocked(generateToken).mockReturnValue('mock-jwt-token');
      vi.mocked(sanitizeUser).mockReturnValue(mockSanitizedUser);

      // Act
      const result = await authService.login(mockLoginData);

      // Assert
      expect(userModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userModel.verifyPassword).toHaveBeenCalledWith(
        mockUser,
        'SecurePass123'
      );
      expect(generateToken).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'test@example.com'
      );
      expect(result).toEqual({
        user: mockSanitizedUser,
        token: 'mock-jwt-token',
      });
    });

    it('should throw AuthenticationError if user not found', async () => {
      // Arrange
      vi.mocked(userModel.findByEmail).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(mockLoginData)).rejects.toThrow(
        AuthenticationError
      );
      await expect(authService.login(mockLoginData)).rejects.toThrow(
        'Invalid credentials'
      );

      expect(userModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userModel.verifyPassword).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError if password is invalid', async () => {
      // Arrange
      vi.mocked(userModel.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(userModel.verifyPassword).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(mockLoginData)).rejects.toThrow(
        AuthenticationError
      );
      await expect(authService.login(mockLoginData)).rejects.toThrow(
        'Invalid credentials'
      );

      expect(userModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userModel.verifyPassword).toHaveBeenCalledWith(
        mockUser,
        'SecurePass123'
      );
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('should not reveal whether email or password is wrong', async () => {
      // Arrange - User not found
      vi.mocked(userModel.findByEmail).mockResolvedValue(null);

      // Act & Assert
      const error1 = authService.login(mockLoginData);
      await expect(error1).rejects.toThrow('Invalid credentials');

      // Arrange - Wrong password
      vi.mocked(userModel.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(userModel.verifyPassword).mockResolvedValue(false);

      // Act & Assert
      const error2 = authService.login(mockLoginData);
      await expect(error2).rejects.toThrow('Invalid credentials');

      // Both errors should have the same message (security best practice)
    });
  });

  describe('getCurrentUser', () => {
    const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

    const mockUser = {
      id: mockUserId,
      username: 'testuser',
      email: 'test@example.com',
      password: '$2b$12$hashedpassword',
      bio: 'Test user bio',
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockSanitizedUser = {
      id: mockUserId,
      username: 'testuser',
      email: 'test@example.com',
      bio: 'Test user bio',
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should return sanitized user data for valid user ID', async () => {
      // Arrange
      vi.mocked(userModel.findById).mockResolvedValue(mockUser);
      vi.mocked(sanitizeUser).mockReturnValue(mockSanitizedUser);

      // Act
      const result = await authService.getCurrentUser(mockUserId);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(sanitizeUser).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockSanitizedUser);
    });

    it('should throw AuthenticationError if user not found', async () => {
      // Arrange
      vi.mocked(userModel.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getCurrentUser(mockUserId)).rejects.toThrow(
        AuthenticationError
      );
      await expect(authService.getCurrentUser(mockUserId)).rejects.toThrow(
        'User not found'
      );

      expect(userModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(sanitizeUser).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      vi.mocked(userModel.findById).mockRejectedValue(dbError);

      // Act & Assert
      await expect(authService.getCurrentUser(mockUserId)).rejects.toThrow(
        'Database connection failed'
      );

      expect(userModel.findById).toHaveBeenCalledWith(mockUserId);
    });
  });
});
