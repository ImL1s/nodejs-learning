/**
 * Todo Controller Unit Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  getTodoStats,
} from '../../src/controllers/todo.controller';

describe('Todo Controller Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    mockRequest = {};
    responseObject = {
      statusCode: 200,
      body: null,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockImplementation((data: any) => {
        responseObject.body = data;
        return mockResponse;
      }) as any,
    };
  });

  describe('getAllTodos', () => {
    it('should return all todos', () => {
      mockRequest.query = {};

      getAllTodos(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.body).toHaveProperty('success', true);
      expect(responseObject.body).toHaveProperty('data');
      expect(Array.isArray(responseObject.body.data)).toBe(true);
    });

    it('should filter completed todos', () => {
      mockRequest.query = { completed: 'true' };

      getAllTodos(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.body.success).toBe(true);
    });
  });

  describe('getTodoById', () => {
    it('should return todo by id', () => {
      mockRequest.params = { id: '1' };

      getTodoById(mockRequest as Request, mockResponse as Response);

      expect(responseObject.body).toHaveProperty('success');
    });

    it('should return 400 for invalid id', () => {
      mockRequest.params = { id: 'invalid' };

      getTodoById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject.body.success).toBe(false);
    });

    it('should return 404 for non-existent todo', () => {
      mockRequest.params = { id: '999999' };

      getTodoById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createTodo', () => {
    it('should create a new todo', () => {
      mockRequest.body = {
        title: 'Test Todo',
        description: 'Test Description',
      };

      createTodo(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject.body.success).toBe(true);
      expect(responseObject.body.data).toHaveProperty('title', 'Test Todo');
    });
  });

  describe('updateTodo', () => {
    it('should update an existing todo', () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { title: 'Updated Title' };

      updateTodo(mockRequest as Request, mockResponse as Response);

      expect(responseObject.body).toHaveProperty('success');
    });

    it('should return 400 for invalid id', () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.body = { title: 'Updated' };

      updateTodo(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteTodo', () => {
    it('should delete a todo', () => {
      mockRequest.params = { id: '1' };

      deleteTodo(mockRequest as Request, mockResponse as Response);

      expect(responseObject.body).toHaveProperty('success');
    });

    it('should return 400 for invalid id', () => {
      mockRequest.params = { id: 'invalid' };

      deleteTodo(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('toggleTodo', () => {
    it('should toggle todo completion status', () => {
      mockRequest.params = { id: '1' };

      toggleTodo(mockRequest as Request, mockResponse as Response);

      expect(responseObject.body).toHaveProperty('success');
    });
  });

  describe('getTodoStats', () => {
    it('should return todo statistics', () => {
      mockRequest = {};

      getTodoStats(mockRequest as Request, mockResponse as Response);

      expect(responseObject.body.success).toBe(true);
      expect(responseObject.body.data).toHaveProperty('total');
      expect(responseObject.body.data).toHaveProperty('completed');
      expect(responseObject.body.data).toHaveProperty('pending');
    });
  });
});
