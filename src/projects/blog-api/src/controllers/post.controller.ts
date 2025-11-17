/**
 * Post Controller
 */

import { Request, Response, NextFunction } from 'express';
import postModel from '../models/post.model';
import userModel from '../models/user.model';
import commentModel from '../models/comment.model';
import {
  AuthRequest,
  PostCreateDto,
  PostUpdateDto,
  NotFoundError,
  AuthorizationError,
} from '../types';
import { sanitizeUser } from '../utils/helpers';

export const createPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const postData: PostCreateDto = req.body;
    const post = await postModel.create(req.user.userId, postData);

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const posts = await postModel.findAll(limit, offset, true);
    const total = await postModel.count(true);

    // Get author info for each post
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const author = await userModel.findById(post.userId);
        const commentsCount = await commentModel.countByPostId(post.id);

        return {
          ...post,
          author: author ? sanitizeUser(author) : null,
          commentsCount,
        };
      })
    );

    res.json({
      success: true,
      data: postsWithAuthors,
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

export const getPostById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await postModel.findById(id);

    if (!post) {
      throw new NotFoundError('Post');
    }

    const author = await userModel.findById(post.userId);
    const comments = await commentModel.findByPostId(post.id);

    // Get comment authors
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const commentAuthor = await userModel.findById(comment.userId);
        return {
          ...comment,
          author: commentAuthor ? sanitizeUser(commentAuthor) : null,
        };
      })
    );

    res.json({
      success: true,
      data: {
        ...post,
        author: author ? sanitizeUser(author) : null,
        comments: commentsWithAuthors,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;
    const post = await postModel.findById(id);

    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.userId !== req.user.userId) {
      throw new AuthorizationError('Not authorized to update this post');
    }

    const postData: PostUpdateDto = req.body;
    const updatedPost = await postModel.update(id, postData);

    res.json({
      success: true,
      data: updatedPost,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;
    const post = await postModel.findById(id);

    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.userId !== req.user.userId) {
      throw new AuthorizationError('Not authorized to delete this post');
    }

    await postModel.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getUserPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const posts = await postModel.findByUserId(userId, limit, offset);
    const total = await postModel.countByUserId(userId);

    res.json({
      success: true,
      data: posts,
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
