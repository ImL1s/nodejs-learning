/**
 * Todo API E2E Tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { Server } from 'http';

describe('Todo API E2E Tests', () => {
  let server: Server;

  beforeAll(() => {
    server = app.listen(0); // Random port
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /api/todos', () => {
    it('should return all todos', async () => {
      const response = await request(app).get('/api/todos');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter todos by completion status', async () => {
      const response = await request(app).get('/api/todos').query({ completed: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'This is a test todo',
      };

      const response = await request(app).post('/api/todos').send(todoData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(todoData.title);
      expect(response.body.data.completed).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/api/todos').send({});

      expect(response.status).toBe(400);
    });

    it('should validate title length', async () => {
      const response = await request(app).post('/api/todos').send({
        title: 'ab', // Too short
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/todos/:id', () => {
    let todoId: number;

    beforeAll(async () => {
      const response = await request(app).post('/api/todos').send({
        title: 'Todo for GET test',
        description: 'Description',
      });
      todoId = response.body.data.id;
    });

    it('should get todo by id', async () => {
      const response = await request(app).get(`/api/todos/${todoId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(todoId);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).get('/api/todos/999999');

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app).get('/api/todos/invalid');

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/todos/:id', () => {
    let todoId: number;

    beforeAll(async () => {
      const response = await request(app).post('/api/todos').send({
        title: 'Todo for PUT test',
        description: 'Original description',
      });
      todoId = response.body.data.id;
    });

    it('should update todo', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const response = await request(app).put(`/api/todos/${todoId}`).send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('should update partial fields', async () => {
      const response = await request(app).put(`/api/todos/${todoId}`).send({
        completed: true,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.completed).toBe(true);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).put('/api/todos/999999').send({
        title: 'Updated',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete a todo', async () => {
      // Create a todo
      const createResponse = await request(app).post('/api/todos').send({
        title: 'Todo to delete',
      });

      const todoId = createResponse.body.data.id;

      // Delete it
      const deleteResponse = await request(app).delete(`/api/todos/${todoId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      const getResponse = await request(app).get(`/api/todos/${todoId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).delete('/api/todos/999999');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/todos/:id/toggle', () => {
    let todoId: number;

    beforeAll(async () => {
      const response = await request(app).post('/api/todos').send({
        title: 'Todo for toggle test',
      });
      todoId = response.body.data.id;
    });

    it('should toggle todo completion status', async () => {
      // First toggle
      const response1 = await request(app).patch(`/api/todos/${todoId}/toggle`);

      expect(response1.status).toBe(200);
      expect(response1.body.data.completed).toBe(true);

      // Toggle back
      const response2 = await request(app).patch(`/api/todos/${todoId}/toggle`);

      expect(response2.status).toBe(200);
      expect(response2.body.data.completed).toBe(false);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).patch('/api/todos/999999/toggle');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/todos/stats', () => {
    beforeAll(async () => {
      // Create some test todos
      await request(app).post('/api/todos').send({ title: 'Completed Todo 1' });
      await request(app).post('/api/todos').send({ title: 'Pending Todo 1' });
    });

    it('should return todo statistics', async () => {
      const response = await request(app).get('/api/todos/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('completed');
      expect(response.body.data).toHaveProperty('pending');
      expect(typeof response.body.data.total).toBe('number');
    });
  });

  describe('Complete Workflow', () => {
    it('should handle a complete todo lifecycle', async () => {
      // 1. Create a todo
      const createResponse = await request(app).post('/api/todos').send({
        title: 'Complete Workflow Todo',
        description: 'Testing complete workflow',
      });

      expect(createResponse.status).toBe(201);
      const todoId = createResponse.body.data.id;

      // 2. Get the todo
      const getResponse = await request(app).get(`/api/todos/${todoId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.completed).toBe(false);

      // 3. Update the todo
      const updateResponse = await request(app).put(`/api/todos/${todoId}`).send({
        title: 'Updated Workflow Todo',
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.title).toBe('Updated Workflow Todo');

      // 4. Toggle completion
      const toggleResponse = await request(app).patch(`/api/todos/${todoId}/toggle`);

      expect(toggleResponse.status).toBe(200);
      expect(toggleResponse.body.data.completed).toBe(true);

      // 5. Delete the todo
      const deleteResponse = await request(app).delete(`/api/todos/${todoId}`);

      expect(deleteResponse.status).toBe(200);

      // 6. Verify deletion
      const verifyResponse = await request(app).get(`/api/todos/${todoId}`);

      expect(verifyResponse.status).toBe(404);
    });
  });
});
