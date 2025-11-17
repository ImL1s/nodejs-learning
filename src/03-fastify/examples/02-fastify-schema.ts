/**
 * Fastify 範例 2: Schema 驗證
 *
 * 學習目標：
 * - 使用 JSON Schema 進行請求驗證
 * - 定義響應 Schema
 * - 自動生成 API 文檔
 * - 提升性能（序列化）
 */

import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

// 定義可重用的 Schema
const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0, maximum: 150 },
    role: { type: 'string', enum: ['admin', 'user', 'guest'] },
  },
} as const;

const errorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: { type: 'string' },
    statusCode: { type: 'number' },
  },
} as const;

// 模擬數據庫
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', age: 28, role: 'admin' as const },
  { id: 2, name: 'Bob', email: 'bob@example.com', age: 32, role: 'user' as const },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 25, role: 'user' as const },
];

let nextId = 4;

// 獲取所有用戶
fastify.get(
  '/api/users',
  {
    schema: {
      description: '獲取所有用戶',
      tags: ['users'],
      querystring: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['admin', 'user', 'guest'] },
          minAge: { type: 'number', minimum: 0 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            count: { type: 'number' },
            data: {
              type: 'array',
              items: userSchema,
            },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const { role, minAge } = request.query as { role?: string; minAge?: number };

    let filteredUsers = users;

    if (role) {
      filteredUsers = filteredUsers.filter((u) => u.role === role);
    }

    if (minAge !== undefined) {
      filteredUsers = filteredUsers.filter((u) => u.age >= minAge);
    }

    return {
      success: true,
      count: filteredUsers.length,
      data: filteredUsers,
    };
  }
);

// 獲取單個用戶
fastify.get<{
  Params: { id: string };
}>(
  '/api/users/:id',
  {
    schema: {
      description: '根據 ID 獲取用戶',
      tags: ['users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: userSchema,
          },
        },
        404: errorSchema,
      },
    },
  },
  async (request, reply) => {
    const id = parseInt(request.params.id);
    const user = users.find((u) => u.id === id);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
        statusCode: 404,
      });
    }

    return {
      success: true,
      data: user,
    };
  }
);

// 創建用戶
fastify.post<{
  Body: { name: string; email: string; age: number; role: 'admin' | 'user' | 'guest' };
}>(
  '/api/users',
  {
    schema: {
      description: '創建新用戶',
      tags: ['users'],
      body: {
        type: 'object',
        required: ['name', 'email', 'age', 'role'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 0, maximum: 150 },
          role: { type: 'string', enum: ['admin', 'user', 'guest'] },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: userSchema,
          },
        },
        400: errorSchema,
      },
    },
  },
  async (request, reply) => {
    const { name, email, age, role } = request.body;

    // 檢查郵箱是否已存在
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return reply.status(400).send({
        success: false,
        error: 'Email already exists',
        statusCode: 400,
      });
    }

    const newUser = {
      id: nextId++,
      name,
      email,
      age,
      role,
    };

    users.push(newUser);

    return reply.status(201).send({
      success: true,
      message: 'User created successfully',
      data: newUser,
    });
  }
);

// 更新用戶
fastify.put<{
  Params: { id: string };
  Body: Partial<{ name: string; email: string; age: number; role: string }>;
}>(
  '/api/users/:id',
  {
    schema: {
      description: '更新用戶信息',
      tags: ['users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 0, maximum: 150 },
          role: { type: 'string', enum: ['admin', 'user', 'guest'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: userSchema,
          },
        },
        404: errorSchema,
      },
    },
  },
  async (request, reply) => {
    const id = parseInt(request.params.id);
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
        statusCode: 404,
      });
    }

    users[userIndex] = {
      ...users[userIndex],
      ...request.body,
    };

    return {
      success: true,
      message: 'User updated successfully',
      data: users[userIndex],
    };
  }
);

// 刪除用戶
fastify.delete<{
  Params: { id: string };
}>(
  '/api/users/:id',
  {
    schema: {
      description: '刪除用戶',
      tags: ['users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        404: errorSchema,
      },
    },
  },
  async (request, reply) => {
    const id = parseInt(request.params.id);
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
        statusCode: 404,
      });
    }

    users.splice(userIndex, 1);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
);

// 啟動伺服器
const start = async () => {
  try {
    await fastify.listen({ port: 5001, host: '127.0.0.1' });

    console.log('🚀 Fastify 伺服器運行在 http://127.0.0.1:5001');
    console.log('\n📚 CRUD API 端點:');
    console.log('   GET    /api/users          - 獲取所有用戶');
    console.log('   GET    /api/users/:id      - 獲取單個用戶');
    console.log('   POST   /api/users          - 創建用戶');
    console.log('   PUT    /api/users/:id      - 更新用戶');
    console.log('   DELETE /api/users/:id      - 刪除用戶');
    console.log('\n🧪 測試命令:');
    console.log('   # 創建用戶');
    console.log(
      '   curl -X POST http://127.0.0.1:5001/api/users -H "Content-Type: application/json" -d \'{"name":"David","email":"david@example.com","age":30,"role":"user"}\''
    );
    console.log('\n   # 查詢管理員');
    console.log('   curl "http://127.0.0.1:5001/api/users?role=admin"');
    console.log('\n   # 年齡過濾');
    console.log('   curl "http://127.0.0.1:5001/api/users?minAge=30"');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
