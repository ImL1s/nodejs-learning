/**
 * Auth Middleware Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, optionalAuth, generateToken } from '../../src/middlewares/auth.middleware';
import { SECURITY_CONFIG } from '../../../../common/config/env.js';

// Mock jwt
vi.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token successfully', async () => {
      // Arrange
      const mockToken = 'valid.jwt.token';
      const mockPayload = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      // Act
      await authenticate(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, SECURITY_CONFIG.jwt.secret);
      expect(mockRequest.user).toEqual({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without Authorization header', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await authenticate(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should reject request with malformed Authorization header', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      // Act
      await authenticate(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should reject request with missing Bearer prefix', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'valid.jwt.token',
      };

      // Act
      await authenticate(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      // Arrange
      const mockToken = 'expired.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw expiredError;
      });

      // Act
      await authenticate(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      // Arrange
      const mockToken = 'invalid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const invalidError = new jwt.JsonWebTokenError('invalid token');
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw invalidError;
      });

      // Act
      await authenticate(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const mockToken = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const unexpectedError = new Error('Unexpected error');
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw unexpectedError;
      });

      // Act
      await authenticate(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if valid token is provided', async () => {
      // Arrange
      const mockToken = 'valid.jwt.token';
      const mockPayload = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      // Act
      await optionalAuth(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toEqual({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user if no Authorization header', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await optionalAuth(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user if token is invalid', async () => {
      // Arrange
      const mockToken = 'invalid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      // Act
      await optionalAuth(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user if token is expired', async () => {
      // Arrange
      const mockToken = 'expired.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw expiredError;
      });

      // Act
      await optionalAuth(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should ignore malformed Authorization header', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      // Act
      await optionalAuth(mockRequest as any, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token with user data', () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const email = 'test@example.com';
      const mockToken = 'generated.jwt.token';

      vi.mocked(jwt.sign).mockReturnValue(mockToken as any);

      // Act
      const result = generateToken(userId, email);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, email },
        SECURITY_CONFIG.jwt.secret,
        { expiresIn: SECURITY_CONFIG.jwt.expiresIn }
      );
      expect(result).toBe(mockToken);
    });

    it('should include correct payload structure', () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const email = 'user@example.com';

      vi.mocked(jwt.sign).mockImplementation((payload: any) => {
        expect(payload).toEqual({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
        });
        return 'token' as any;
      });

      // Act
      generateToken(userId, email);

      // Assert - verified in mock implementation
    });

    it('should use configured expiration time', () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const email = 'test@example.com';

      vi.mocked(jwt.sign).mockImplementation((payload, secret, options: any) => {
        expect(options.expiresIn).toBe(SECURITY_CONFIG.jwt.expiresIn);
        return 'token' as any;
      });

      // Act
      generateToken(userId, email);

      // Assert - verified in mock implementation
    });
  });
});
