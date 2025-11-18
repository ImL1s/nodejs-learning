/**
 * Comment Controller Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
} from '../../src/controllers/comment.controller';
import commentModel from '../../src/models/comment.model';
import postModel from '../../src/models/post.model';
import userModel from '../../src/models/user.model';
import { AuthRequest, NotFoundError, AuthorizationError } from '../../src/types';

// Mock models
vi.mock('../../src/models/comment.model');
vi.mock('../../src/models/post.model');
vi.mock('../../src/models/user.model');
vi.mock('../../src/utils/helpers', () => ({
  sanitizeUser: vi.fn((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
  })),
}));

describe('Comment Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockUser = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
  };

  const mockPost = {
    id: '660e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Post',
    content: 'Test content',
    slug: 'test-post',
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockComment = {
    id: '770e8400-e29b-41d4-a716-446655440000',
    postId: '660e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    content: 'Test comment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthor = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRequest = {
      user: mockUser,
      params: {},
      body: {},
      query: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      // Arrange
      mockRequest.params = { postId: mockPost.id };
      mockRequest.body = { content: 'Test comment' };

      vi.mocked(postModel.findById).mockResolvedValue(mockPost as any);
      vi.mocked(commentModel.create).mockResolvedValue(mockComment as any);

      // Act
      await createComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(postModel.findById).toHaveBeenCalledWith(mockPost.id);
      expect(commentModel.create).toHaveBeenCalledWith(
        mockPost.id,
        mockUser.userId,
        { content: 'Test comment' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockComment,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if post does not exist', async () => {
      // Arrange
      mockRequest.params = { postId: 'nonexistent-id' };
      mockRequest.body = { content: 'Test comment' };

      vi.mocked(postModel.findById).mockResolvedValue(null);

      // Act
      await createComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(postModel.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(commentModel.create).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should throw error if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.params = { postId: mockPost.id };
      mockRequest.body = { content: 'Test comment' };

      // Act
      await createComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(commentModel.create).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockRequest.params = { postId: mockPost.id };
      mockRequest.body = { content: 'Test comment' };

      const dbError = new Error('Database error');
      vi.mocked(postModel.findById).mockRejectedValue(dbError);

      // Act
      await createComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  describe('getPostComments', () => {
    it('should get all comments for a post with pagination', async () => {
      // Arrange
      mockRequest.params = { postId: mockPost.id };
      mockRequest.query = { page: '1', limit: '10' };

      const mockComments = [mockComment];

      vi.mocked(postModel.findById).mockResolvedValue(mockPost as any);
      vi.mocked(commentModel.findByPostId).mockResolvedValue(mockComments as any);
      vi.mocked(commentModel.countByPostId).mockResolvedValue(1);
      vi.mocked(userModel.findById).mockResolvedValue(mockAuthor as any);

      // Act
      await getPostComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(postModel.findById).toHaveBeenCalledWith(mockPost.id);
      expect(commentModel.findByPostId).toHaveBeenCalledWith(mockPost.id, 10, 0);
      expect(commentModel.countByPostId).toHaveBeenCalledWith(mockPost.id);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            ...mockComment,
            author: expect.objectContaining({
              id: mockAuthor.id,
              username: mockAuthor.username,
              email: mockAuthor.email,
            }),
          }),
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should use default pagination values', async () => {
      // Arrange
      mockRequest.params = { postId: mockPost.id };
      mockRequest.query = {};

      vi.mocked(postModel.findById).mockResolvedValue(mockPost as any);
      vi.mocked(commentModel.findByPostId).mockResolvedValue([]);
      vi.mocked(commentModel.countByPostId).mockResolvedValue(0);

      // Act
      await getPostComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(commentModel.findByPostId).toHaveBeenCalledWith(mockPost.id, 50, 0);
    });

    it('should throw NotFoundError if post does not exist', async () => {
      // Arrange
      mockRequest.params = { postId: 'nonexistent-id' };

      vi.mocked(postModel.findById).mockResolvedValue(null);

      // Act
      await getPostComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(commentModel.findByPostId).not.toHaveBeenCalled();
    });

    it('should handle null author gracefully', async () => {
      // Arrange
      mockRequest.params = { postId: mockPost.id };

      vi.mocked(postModel.findById).mockResolvedValue(mockPost as any);
      vi.mocked(commentModel.findByPostId).mockResolvedValue([mockComment] as any);
      vi.mocked(commentModel.countByPostId).mockResolvedValue(1);
      vi.mocked(userModel.findById).mockResolvedValue(null);

      // Act
      await getPostComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              author: null,
            }),
          ]),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      // Arrange
      mockRequest.params = { postId: mockPost.id };
      mockRequest.query = { page: '2', limit: '5' };

      vi.mocked(postModel.findById).mockResolvedValue(mockPost as any);
      vi.mocked(commentModel.findByPostId).mockResolvedValue([]);
      vi.mocked(commentModel.countByPostId).mockResolvedValue(12);

      // Act
      await getPostComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(commentModel.findByPostId).toHaveBeenCalledWith(mockPost.id, 5, 5);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            page: 2,
            limit: 5,
            total: 12,
            totalPages: 3,
          },
        })
      );
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      // Arrange
      mockRequest.params = { id: mockComment.id };
      mockRequest.body = { content: 'Updated content' };

      const updatedComment = { ...mockComment, content: 'Updated content' };

      vi.mocked(commentModel.findById).mockResolvedValue(mockComment as any);
      vi.mocked(commentModel.update).mockResolvedValue(updatedComment as any);

      // Act
      await updateComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(commentModel.findById).toHaveBeenCalledWith(mockComment.id);
      expect(commentModel.update).toHaveBeenCalledWith(mockComment.id, {
        content: 'Updated content',
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedComment,
      });
    });

    it('should throw NotFoundError if comment does not exist', async () => {
      // Arrange
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = { content: 'Updated content' };

      vi.mocked(commentModel.findById).mockResolvedValue(null);

      // Act
      await updateComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(commentModel.update).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError if user is not the comment author', async () => {
      // Arrange
      mockRequest.params = { id: mockComment.id };
      mockRequest.body = { content: 'Updated content' };

      const otherUserComment = {
        ...mockComment,
        userId: 'different-user-id',
      };

      vi.mocked(commentModel.findById).mockResolvedValue(otherUserComment as any);

      // Act
      await updateComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(commentModel.update).not.toHaveBeenCalled();
    });

    it('should throw error if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.params = { id: mockComment.id };
      mockRequest.body = { content: 'Updated content' };

      // Act
      await updateComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(commentModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      // Arrange
      mockRequest.params = { id: mockComment.id };

      vi.mocked(commentModel.findById).mockResolvedValue(mockComment as any);
      vi.mocked(commentModel.delete).mockResolvedValue(true);

      // Act
      await deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(commentModel.findById).toHaveBeenCalledWith(mockComment.id);
      expect(commentModel.delete).toHaveBeenCalledWith(mockComment.id);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should throw NotFoundError if comment does not exist', async () => {
      // Arrange
      mockRequest.params = { id: 'nonexistent-id' };

      vi.mocked(commentModel.findById).mockResolvedValue(null);

      // Act
      await deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(commentModel.delete).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError if user is not the comment author', async () => {
      // Arrange
      mockRequest.params = { id: mockComment.id };

      const otherUserComment = {
        ...mockComment,
        userId: 'different-user-id',
      };

      vi.mocked(commentModel.findById).mockResolvedValue(otherUserComment as any);

      // Act
      await deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(commentModel.delete).not.toHaveBeenCalled();
    });

    it('should throw error if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.params = { id: mockComment.id };

      // Act
      await deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(commentModel.findById).not.toHaveBeenCalled();
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      mockRequest.params = { id: mockComment.id };

      const dbError = new Error('Database error');
      vi.mocked(commentModel.findById).mockResolvedValue(mockComment as any);
      vi.mocked(commentModel.delete).mockRejectedValue(dbError);

      // Act
      await deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });
});
