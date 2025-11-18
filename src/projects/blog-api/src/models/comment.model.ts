/**
 * Comment Model
 */

import { Pool } from 'pg';
import db from '../config/database';
import { Comment, CommentCreateDto, CommentUpdateDto } from '../types';
import { DatabaseRow } from '../../../../common/types/database.js';

export class CommentModel {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  async create(postId: string, userId: string, commentData: CommentCreateDto): Promise<Comment> {
    const query = `
      INSERT INTO comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [postId, userId, commentData.content];

    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<Comment | null> {
    const query = 'SELECT * FROM comments WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findByPostId(postId: string, limit: number = 100, offset: number = 0): Promise<Comment[]> {
    const query = `
      SELECT * FROM comments
      WHERE post_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [postId, limit, offset]);
    return result.rows.map(this.mapRow);
  }

  async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Comment[]> {
    const query = `
      SELECT * FROM comments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows.map(this.mapRow);
  }

  async update(id: string, commentData: CommentUpdateDto): Promise<Comment | null> {
    const query = `
      UPDATE comments
      SET content = $1, updated_at = $2
      WHERE id = $3
      RETURNING *
    `;

    const values = [commentData.content, new Date(), id];

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM comments WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  async countByPostId(postId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM comments WHERE post_id = $1';
    const result = await this.pool.query(query, [postId]);

    return parseInt(result.rows[0].count, 10);
  }

  async countByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM comments WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);

    return parseInt(result.rows[0].count, 10);
  }

  async deleteByPostId(postId: string): Promise<number> {
    const query = 'DELETE FROM comments WHERE post_id = $1';
    const result = await this.pool.query(query, [postId]);

    return result.rowCount ?? 0;
  }

  private mapRow(row: DatabaseRow): Comment {
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new CommentModel();
