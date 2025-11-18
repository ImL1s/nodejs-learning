/**
 * Comment Controller
 */

import { Request, Response, NextFunction } from 'express';
import commentModel from '../models/comment.model';
import postModel from '../models/post.model';
import userModel from '../models/user.model';
import {
  AuthRequest,
  CommentCreateDto,
  CommentUpdateDto,
  NotFoundError,
  AuthorizationError,
} from '../types';
import { sanitizeUser } from '../utils/helpers';

export const createComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { postId } = req.params;

    // Check if post exists
    const post = await postModel.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const commentData: CommentCreateDto = req.body;
    const comment = await commentModel.create(postId, req.user.userId, commentData);

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPostComments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = (page - 1) * limit;

    // Check if post exists
    const post = await postModel.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    // Use JOIN query to fetch comments with authors in a single query (fixes N+1 problem)
    const commentsData = await commentModel.findByPostIdWithAuthors(postId, limit, offset);
    const total = await commentModel.countByPostId(postId);

    const commentsWithAuthors = commentsData.map(({ comment, author }) => ({
      ...comment,
      author: author ? sanitizeUser(author) : null,
    }));

    res.json({
      success: true,
      data: commentsWithAuthors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;
    const comment = await commentModel.findById(id);

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.userId !== req.user.userId) {
      throw new AuthorizationError('Not authorized to update this comment');
    }

    const commentData: CommentUpdateDto = req.body;
    const updatedComment = await commentModel.update(id, commentData);

    res.json({
      success: true,
      data: updatedComment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;
    const comment = await commentModel.findById(id);

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.userId !== req.user.userId) {
      throw new AuthorizationError('Not authorized to delete this comment');
    }

    await commentModel.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
