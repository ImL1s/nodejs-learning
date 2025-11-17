/**
 * E2E Tests for Posts
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';

describe('Post E2E Tests', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Register and login a user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'blogger',
        email: 'blogger@example.com',
        password: 'password123',
      });

    authToken = response.body.data.token;
    userId = response.body.data.user.id;
  });

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'My First Post',
        content: 'This is the content of my first post.',
        published: true,
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(postData.title);
      expect(response.body.data).toHaveProperty('slug');
    });

    it('should reject post creation without auth', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({
          title: 'Unauthorized Post',
          content: 'Content',
        });

      expect(response.status).toBe(401);
    });

    it('should validate post title', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          content: 'Content',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/posts', () => {
    beforeEach(async () => {
      // Create some posts
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post 1',
          content: 'Content 1',
          published: true,
        });

      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post 2',
          content: 'Content 2',
          published: true,
        });
    });

    it('should get all posts', async () => {
      const response = await request(app).get('/api/posts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/posts')
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/posts/:id', () => {
    let postId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post',
          content: 'Test Content',
          published: true,
        });

      postId = response.body.data.id;
    });

    it('should get post by id', async () => {
      const response = await request(app).get(`/api/posts/${postId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(postId);
      expect(response.body.data.author).toBeDefined();
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/posts/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/posts/:id', () => {
    let postId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Original Title',
          content: 'Original Content',
        });

      postId = response.body.data.id;
    });

    it('should update own post', async () => {
      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          content: 'Updated Content',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Title');
    });

    it('should not allow updating others posts', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123',
        });

      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Hacked Title',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    let postId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post to Delete',
          content: 'Content',
        });

      postId = response.body.data.id;
    });

    it('should delete own post', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await request(app).get(`/api/posts/${postId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should not allow deleting others posts', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'hacker',
          email: 'hacker@example.com',
          password: 'password123',
        });

      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });
});
