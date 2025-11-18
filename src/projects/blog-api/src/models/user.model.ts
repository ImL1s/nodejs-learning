/**
 * User Model
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import db from '../config/database';
import { User, UserCreateDto, UserUpdateDto } from '../types';
import { SECURITY_CONFIG } from '../../../../common/config/env.js';
import { DatabaseRow, QueryParam } from '../../../../common/types/database.js';

export class UserModel {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  async create(userData: UserCreateDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, SECURITY_CONFIG.bcrypt.rounds);

    const query = `
      INSERT INTO users (username, email, password, bio)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [userData.username, userData.email, hashedPassword, userData.bio || null];

    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await this.pool.query(query, [username]);

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<User[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    const result = await this.pool.query(query, [limit, offset]);

    return result.rows.map(this.mapRow);
  }

  async update(id: string, userData: UserUpdateDto): Promise<User | null> {
    const fields: string[] = [];
    const values: QueryParam[] = [];
    let paramIndex = 1;

    if (userData.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      values.push(userData.username);
    }

    if (userData.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(userData.email);
    }

    if (userData.bio !== undefined) {
      fields.push(`bio = $${paramIndex++}`);
      values.push(userData.bio);
    }

    if (userData.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(userData.avatarUrl);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) FROM users';
    const result = await this.pool.query(query);

    return parseInt(result.rows[0].count, 10);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  private mapRow(row: DatabaseRow): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new UserModel();
