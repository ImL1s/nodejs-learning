/**
 * Post Model
 */

import { Pool } from 'pg';
import db from '../config/database';
import { Post, PostCreateDto, PostUpdateDto } from '../types';
import { generateUniqueSlug } from '../utils/helpers';
import { DatabaseRow, QueryParam } from '../../../../common/types/database.js';

export class PostModel {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  async create(userId: string, postData: PostCreateDto): Promise<Post> {
    const slug = generateUniqueSlug(postData.title);
    const publishedAt = postData.published ? new Date() : null;

    const query = `
      INSERT INTO posts (user_id, title, content, excerpt, slug, published, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      userId,
      postData.title,
      postData.content,
      postData.excerpt || null,
      slug,
      postData.published || false,
      publishedAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<Post | null> {
    const query = 'SELECT * FROM posts WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Post | null> {
    const query = 'SELECT * FROM posts WHERE slug = $1';
    const result = await this.pool.query(query, [slug]);

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(
    limit: number = 50,
    offset: number = 0,
    publishedOnly: boolean = false
  ): Promise<Post[]> {
    let query = 'SELECT * FROM posts';

    if (publishedOnly) {
      query += ' WHERE published = true';
    }

    query += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';

    const result = await this.pool.query(query, [limit, offset]);
    return result.rows.map(this.mapRow);
  }

  /**
   * Find all posts with authors and comments count in a single query (fixes N+1 problem)
   */
  async findAllWithAuthorsAndComments(
    limit: number = 50,
    offset: number = 0,
    publishedOnly: boolean = false
  ): Promise<Array<{ post: Post; author: any; commentsCount: number }>> {
    const query = `
      SELECT
        posts.*,
        users.id as author_id,
        users.username as author_username,
        users.email as author_email,
        users.bio as author_bio,
        users.avatar_url as author_avatar_url,
        users.created_at as author_created_at,
        users.updated_at as author_updated_at,
        COUNT(comments.id) as comments_count
      FROM posts
      LEFT JOIN users ON posts.user_id = users.id
      LEFT JOIN comments ON posts.id = comments.post_id
      WHERE ($1 = false OR posts.published = true)
      GROUP BY posts.id, users.id
      ORDER BY posts.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [publishedOnly, limit, offset]);

    return result.rows.map(row => ({
      post: this.mapRow(row),
      author: row.author_id ? {
        id: row.author_id,
        username: row.author_username,
        email: row.author_email,
        bio: row.author_bio,
        avatarUrl: row.author_avatar_url,
        createdAt: row.author_created_at,
        updatedAt: row.author_updated_at,
      } : null,
      commentsCount: parseInt(row.comments_count, 10),
    }));
  }

  async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Post[]> {
    const query = `
      SELECT * FROM posts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows.map(this.mapRow);
  }

  async update(id: string, postData: PostUpdateDto): Promise<Post | null> {
    const fields: string[] = [];
    const values: QueryParam[] = [];
    let paramIndex = 1;

    if (postData.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(postData.title);

      // Update slug if title changes
      fields.push(`slug = $${paramIndex++}`);
      values.push(generateUniqueSlug(postData.title));
    }

    if (postData.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(postData.content);
    }

    if (postData.excerpt !== undefined) {
      fields.push(`excerpt = $${paramIndex++}`);
      values.push(postData.excerpt);
    }

    if (postData.published !== undefined) {
      fields.push(`published = $${paramIndex++}`);
      values.push(postData.published);

      // Set published_at when publishing
      if (postData.published) {
        fields.push(`published_at = $${paramIndex++}`);
        values.push(new Date());
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE posts
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM posts WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  async count(publishedOnly: boolean = false): Promise<number> {
    let query = 'SELECT COUNT(*) FROM posts';

    if (publishedOnly) {
      query += ' WHERE published = true';
    }

    const result = await this.pool.query(query);
    return parseInt(result.rows[0].count, 10);
  }

  async countByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM posts WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);

    return parseInt(result.rows[0].count, 10);
  }

  private mapRow(row: DatabaseRow): Post {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      slug: row.slug,
      published: row.published,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new PostModel();
