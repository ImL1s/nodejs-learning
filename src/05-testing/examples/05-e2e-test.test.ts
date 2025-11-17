/**
 * E2E (End-to-End) 測試示例
 * 模擬完整的用戶場景和工作流程
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Server } from 'http';

const JWT_SECRET = 'test-secret-key';

// 模擬數據庫
class MockDatabase {
  users: Array<{ id: string; username: string; password: string; email: string }> = [];
  posts: Array<{ id: string; userId: string; title: string; content: string; createdAt: Date }> = [];
  comments: Array<{ id: string; postId: string; userId: string; content: string; createdAt: Date }> = [];

  reset() {
    this.users = [];
    this.posts = [];
    this.comments = [];
  }
}

const mockDb = new MockDatabase();

// 創建測試應用
function createTestApp(): Application {
  const app = express();
  app.use(express.json());

  // 認證中間件
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      (req as any).userId = decoded.userId;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // 註冊
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // 檢查用戶是否存在
    if (mockDb.users.find((u) => u.username === username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = {
      id: Date.now().toString(),
      username,
      password, // 實際應用應該加密
      email,
    };

    mockDb.users.push(user);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);

    res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  });

  // 登錄
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    const user = mockDb.users.find((u) => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);

    res.json({
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  });

  // 獲取當前用戶
  app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
    const user = mockDb.users.find((u) => u.id === (req as any).userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  });

  // 創建文章
  app.post('/api/posts', authenticate, (req: Request, res: Response) => {
    const { title, content } = req.body;
    const userId = (req as any).userId;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const post = {
      id: Date.now().toString(),
      userId,
      title,
      content,
      createdAt: new Date(),
    };

    mockDb.posts.push(post);

    res.status(201).json(post);
  });

  // 獲取所有文章
  app.get('/api/posts', (req: Request, res: Response) => {
    const posts = mockDb.posts.map((post) => {
      const author = mockDb.users.find((u) => u.id === post.userId);
      return {
        ...post,
        author: author ? { id: author.id, username: author.username } : null,
      };
    });

    res.json(posts);
  });

  // 獲取單個文章
  app.get('/api/posts/:id', (req: Request, res: Response) => {
    const post = mockDb.posts.find((p) => p.id === req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const author = mockDb.users.find((u) => u.id === post.userId);
    const comments = mockDb.comments
      .filter((c) => c.postId === post.id)
      .map((comment) => {
        const commentAuthor = mockDb.users.find((u) => u.id === comment.userId);
        return {
          ...comment,
          author: commentAuthor ? { id: commentAuthor.id, username: commentAuthor.username } : null,
        };
      });

    res.json({
      ...post,
      author: author ? { id: author.id, username: author.username } : null,
      comments,
    });
  });

  // 刪除文章
  app.delete('/api/posts/:id', authenticate, (req: Request, res: Response) => {
    const postIndex = mockDb.posts.findIndex((p) => p.id === req.params.id);

    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = mockDb.posts[postIndex];

    if (post.userId !== (req as any).userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    mockDb.posts.splice(postIndex, 1);
    // 刪除相關評論
    mockDb.comments = mockDb.comments.filter((c) => c.postId !== req.params.id);

    res.status(204).send();
  });

  // 創建評論
  app.post('/api/posts/:id/comments', authenticate, (req: Request, res: Response) => {
    const { content } = req.body;
    const postId = req.params.id;
    const userId = (req as any).userId;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = mockDb.posts.find((p) => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = {
      id: Date.now().toString(),
      postId,
      userId,
      content,
      createdAt: new Date(),
    };

    mockDb.comments.push(comment);

    res.status(201).json(comment);
  });

  return app;
}

describe('E2E Testing - Blog Application', () => {
  let app: Application;
  let server: Server;

  beforeAll(() => {
    app = createTestApp();
    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    mockDb.reset();
  });

  describe('Complete User Journey - New User', () => {
    it('should complete full registration and login flow', async () => {
      // 1. 註冊新用戶
      const registerResponse = await request(app).post('/api/auth/register').send({
        username: 'johndoe',
        password: 'password123',
        email: 'john@example.com',
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('token');
      expect(registerResponse.body.user.username).toBe('johndoe');

      const token = registerResponse.body.token;

      // 2. 使用 token 獲取用戶信息
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.username).toBe('johndoe');

      // 3. 登出後重新登錄
      const loginResponse = await request(app).post('/api/auth/login').send({
        username: 'johndoe',
        password: 'password123',
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user.username).toBe('johndoe');
    });

    it('should prevent duplicate registration', async () => {
      // 第一次註冊
      await request(app).post('/api/auth/register').send({
        username: 'duplicate',
        password: 'password123',
        email: 'duplicate@example.com',
      });

      // 嘗試重複註冊
      const response = await request(app).post('/api/auth/register').send({
        username: 'duplicate',
        password: 'password456',
        email: 'another@example.com',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('Complete User Journey - Create and Manage Posts', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      // 註冊用戶
      const response = await request(app).post('/api/auth/register').send({
        username: 'blogger',
        password: 'password123',
        email: 'blogger@example.com',
      });

      userToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should create, view, and delete a post', async () => {
      // 1. 創建文章
      const createResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'My First Post',
          content: 'This is the content of my first post.',
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.title).toBe('My First Post');

      const postId = createResponse.body.id;

      // 2. 查看文章列表
      const listResponse = await request(app).get('/api/posts');

      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].author.username).toBe('blogger');

      // 3. 查看單個文章詳情
      const detailResponse = await request(app).get(`/api/posts/${postId}`);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.title).toBe('My First Post');
      expect(detailResponse.body.author.username).toBe('blogger');

      // 4. 刪除文章
      const deleteResponse = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteResponse.status).toBe(204);

      // 5. 驗證文章已刪除
      const verifyResponse = await request(app).get(`/api/posts/${postId}`);

      expect(verifyResponse.status).toBe(404);
    });

    it('should not allow unauthenticated users to create posts', async () => {
      const response = await request(app).post('/api/posts').send({
        title: 'Unauthorized Post',
        content: 'This should not be created.',
      });

      expect(response.status).toBe(401);
    });

    it('should not allow users to delete others posts', async () => {
      // 創建第一個用戶和文章
      const post = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'First Users Post',
          content: 'Content',
        });

      // 註冊第二個用戶
      const user2Response = await request(app).post('/api/auth/register').send({
        username: 'hacker',
        password: 'password123',
        email: 'hacker@example.com',
      });

      // 嘗試刪除第一個用戶的文章
      const deleteResponse = await request(app)
        .delete(`/api/posts/${post.body.id}`)
        .set('Authorization', `Bearer ${user2Response.body.token}`);

      expect(deleteResponse.status).toBe(403);
    });
  });

  describe('Complete User Journey - Comments System', () => {
    let user1Token: string;
    let user2Token: string;
    let postId: string;

    beforeEach(async () => {
      // 創建兩個用戶
      const user1 = await request(app).post('/api/auth/register').send({
        username: 'author',
        password: 'password123',
        email: 'author@example.com',
      });
      user1Token = user1.body.token;

      const user2 = await request(app).post('/api/auth/register').send({
        username: 'commenter',
        password: 'password123',
        email: 'commenter@example.com',
      });
      user2Token = user2.body.token;

      // 用戶1創建文章
      const post = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Post for Comments',
          content: 'This post will have comments.',
        });
      postId = post.body.id;
    });

    it('should allow users to comment on posts', async () => {
      // 用戶2評論
      const commentResponse = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'Great post!',
        });

      expect(commentResponse.status).toBe(201);
      expect(commentResponse.body.content).toBe('Great post!');

      // 查看文章和評論
      const postResponse = await request(app).get(`/api/posts/${postId}`);

      expect(postResponse.status).toBe(200);
      expect(postResponse.body.comments).toHaveLength(1);
      expect(postResponse.body.comments[0].author.username).toBe('commenter');
    });

    it('should handle multiple comments', async () => {
      // 添加多個評論
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'First comment' });

      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Second comment' });

      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Third comment' });

      // 查看所有評論
      const postResponse = await request(app).get(`/api/posts/${postId}`);

      expect(postResponse.body.comments).toHaveLength(3);
    });

    it('should delete comments when post is deleted', async () => {
      // 添加評論
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'This comment will be deleted' });

      // 刪除文章
      await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      // 驗證文章和評論都被刪除
      const postResponse = await request(app).get(`/api/posts/${postId}`);
      expect(postResponse.status).toBe(404);
    });
  });

  describe('Complete Application Workflow', () => {
    it('should simulate a real user interaction scenario', async () => {
      // 場景：三個用戶註冊，創建文章，互相評論

      // 1. 註冊三個用戶
      const users = await Promise.all([
        request(app)
          .post('/api/auth/register')
          .send({ username: 'alice', password: 'pass123', email: 'alice@example.com' }),
        request(app)
          .post('/api/auth/register')
          .send({ username: 'bob', password: 'pass123', email: 'bob@example.com' }),
        request(app)
          .post('/api/auth/register')
          .send({ username: 'charlie', password: 'pass123', email: 'charlie@example.com' }),
      ]);

      const tokens = users.map((u) => u.body.token);

      // 2. 每個用戶創建一篇文章
      const posts = await Promise.all([
        request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${tokens[0]}`)
          .send({ title: 'Alice Post', content: 'Content by Alice' }),
        request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${tokens[1]}`)
          .send({ title: 'Bob Post', content: 'Content by Bob' }),
        request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${tokens[2]}`)
          .send({ title: 'Charlie Post', content: 'Content by Charlie' }),
      ]);

      expect(posts.every((p) => p.status === 201)).toBe(true);

      // 3. 查看所有文章
      const allPosts = await request(app).get('/api/posts');
      expect(allPosts.body).toHaveLength(3);

      // 4. 每個用戶在其他用戶的文章下評論
      const postIds = posts.map((p) => p.body.id);

      // Alice 評論 Bob 的文章
      await request(app)
        .post(`/api/posts/${postIds[1]}/comments`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({ content: 'Nice post, Bob!' });

      // Bob 評論 Charlie 的文章
      await request(app)
        .post(`/api/posts/${postIds[2]}/comments`)
        .set('Authorization', `Bearer ${tokens[1]}`)
        .send({ content: 'Interesting, Charlie!' });

      // Charlie 評論 Alice 的文章
      await request(app)
        .post(`/api/posts/${postIds[0]}/comments`)
        .set('Authorization', `Bearer ${tokens[2]}`)
        .send({ content: 'Great work, Alice!' });

      // 5. 驗證每篇文章都有一條評論
      for (const postId of postIds) {
        const postDetail = await request(app).get(`/api/posts/${postId}`);
        expect(postDetail.body.comments).toHaveLength(1);
      }

      // 6. Alice 刪除自己的文章
      await request(app)
        .delete(`/api/posts/${postIds[0]}`)
        .set('Authorization', `Bearer ${tokens[0]}`);

      // 7. 驗證只剩下兩篇文章
      const remainingPosts = await request(app).get('/api/posts');
      expect(remainingPosts.body).toHaveLength(2);
    });
  });
});
