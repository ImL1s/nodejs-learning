/**
 * API 測試示例
 * 使用 supertest 測試 Express/Fastify API 端點
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express, { Application, Request, Response } from 'express';
import { Server } from 'http';

// 示例 API 應用
function createApp(): Application {
  const app = express();
  app.use(express.json());

  // 用戶數據存儲
  const users = new Map<string, { id: string; name: string; email: string }>();

  // 健康檢查
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 獲取所有用戶
  app.get('/api/users', (req: Request, res: Response) => {
    res.json({ success: true, data: Array.from(users.values()) });
  });

  // 獲取單個用戶
  app.get('/api/users/:id', (req: Request, res: Response) => {
    const user = users.get(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  });

  // 創建用戶
  app.post('/api/users', (req: Request, res: Response) => {
    const { name, email } = req.body;

    // 驗證
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const id = Date.now().toString();
    const user = { id, name, email };
    users.set(id, user);

    res.status(201).json({ success: true, data: user });
  });

  // 更新用戶
  app.put('/api/users/:id', (req: Request, res: Response) => {
    const user = users.get(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { name, email } = req.body;
    const updatedUser = { ...user, name: name || user.name, email: email || user.email };
    users.set(req.params.id, updatedUser);

    res.json({ success: true, data: updatedUser });
  });

  // 刪除用戶
  app.delete('/api/users/:id', (req: Request, res: Response) => {
    if (!users.has(req.params.id)) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    users.delete(req.params.id);
    res.status(204).send();
  });

  return app;
}

describe('API Testing Examples', () => {
  let app: Application;
  let server: Server;

  beforeAll(() => {
    app = createApp();
    server = app.listen(0); // 隨機端口
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const response = await request(app).post('/api/users').send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: userData.name,
        email: userData.email,
      });
      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app).post('/api/users').send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 if email is invalid', async () => {
      const response = await request(app).post('/api/users').send({
        name: 'Test User',
        email: 'invalid-email',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('should set correct content-type header', async () => {
      const response = await request(app).post('/api/users').send({
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a specific user', async () => {
      // 先創建一個用戶
      const createResponse = await request(app).post('/api/users').send({
        name: 'Alice Smith',
        email: 'alice@example.com',
      });

      const userId = createResponse.body.data.id;

      // 獲取該用戶
      const response = await request(app).get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: userId,
        name: 'Alice Smith',
        email: 'alice@example.com',
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/users/999999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update an existing user', async () => {
      // 創建用戶
      const createResponse = await request(app).post('/api/users').send({
        name: 'Bob Johnson',
        email: 'bob@example.com',
      });

      const userId = createResponse.body.data.id;

      // 更新用戶
      const updateResponse = await request(app).put(`/api/users/${userId}`).send({
        name: 'Robert Johnson',
        email: 'robert@example.com',
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data).toMatchObject({
        id: userId,
        name: 'Robert Johnson',
        email: 'robert@example.com',
      });
    });

    it('should return 404 when updating non-existent user', async () => {
      const response = await request(app).put('/api/users/999999').send({
        name: 'Nobody',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete an existing user', async () => {
      // 創建用戶
      const createResponse = await request(app).post('/api/users').send({
        name: 'Charlie Brown',
        email: 'charlie@example.com',
      });

      const userId = createResponse.body.data.id;

      // 刪除用戶
      const deleteResponse = await request(app).delete(`/api/users/${userId}`);

      expect(deleteResponse.status).toBe(204);

      // 驗證用戶已被刪除
      const getResponse = await request(app).get(`/api/users/${userId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent user', async () => {
      const response = await request(app).delete('/api/users/999999');

      expect(response.status).toBe(404);
    });
  });

  // 測試請求頭
  describe('Request Headers', () => {
    it('should accept JSON content-type', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ name: 'Test', email: 'test@example.com' }));

      expect(response.status).toBe(201);
    });
  });

  // 測試錯誤情況
  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });
});

// 並發測試
describe('Concurrent API Requests', () => {
  let app: Application;
  let server: Server;

  beforeAll(() => {
    app = createApp();
    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should handle multiple concurrent requests', async () => {
    const requests = Array.from({ length: 10 }, (_, i) =>
      request(app).post('/api/users').send({
        name: `User ${i}`,
        email: `user${i}@example.com`,
      })
    );

    const responses = await Promise.all(requests);

    responses.forEach((response) => {
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    // 驗證所有用戶都被創建
    const getAllResponse = await request(app).get('/api/users');
    expect(getAllResponse.body.data.length).toBeGreaterThanOrEqual(10);
  });
});
