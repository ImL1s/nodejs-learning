/**
 * Database Configuration
 */

import { Pool, PoolConfig } from 'pg';
import { DatabaseConfig } from '../types';
import { QueryParam } from '../../../../common/types/database.js';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'blog_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(config);

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: QueryParam[]) {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async initializeTables(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          bio TEXT,
          avatar_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Posts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          slug VARCHAR(300) UNIQUE NOT NULL,
          published BOOLEAN DEFAULT false,
          published_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Comments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)');

      await client.query('COMMIT');
      console.log('Database tables initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error initializing database:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Database.getInstance();
