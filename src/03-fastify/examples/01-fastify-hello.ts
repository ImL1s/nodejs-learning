/**
 * Fastify 範例 1: Hello World
 *
 * 學習目標：
 * - 理解 Fastify 的基本用法
 * - 對比 Express 和 Fastify 的差異
 * - 掌握 Fastify 的類型支持
 */

import Fastify from 'fastify';

const fastify = Fastify({
  logger: true, // 啟用日誌
});

// 基本路由
fastify.get('/', async (request, reply) => {
  return {
    message: '🚀 歡迎使用 Fastify!',
    framework: 'Fastify',
    version: '4.x',
    features: [
      '⚡ 高性能 - 比 Express 快約 2-3 倍',
      '🔒 內建 Schema 驗證',
      '📝 優秀的 TypeScript 支持',
      '🧩 強大的插件系統',
    ],
    endpoints: [
      { path: '/', method: 'GET', description: '首頁' },
      { path: '/hello/:name', method: 'GET', description: '打招呼' },
      { path: '/api/users', method: 'GET', description: '獲取用戶列表' },
      { path: '/api/echo', method: 'POST', description: '回聲測試' },
    ],
  };
});

// 路徑參數示例
fastify.get('/hello/:name', async (request, reply) => {
  const { name } = request.params as { name: string };

  return {
    message: `你好, ${name}!`,
    timestamp: new Date().toISOString(),
  };
});

// 獲取用戶列表
fastify.get('/api/users', async (request, reply) => {
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
  ];

  return {
    success: true,
    count: users.length,
    data: users,
  };
});

// POST 請求示例 - 帶 Schema 驗證
fastify.post(
  '/api/echo',
  {
    schema: {
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            echo: { type: 'string' },
            length: { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const { message } = request.body as { message: string };

    return {
      success: true,
      echo: message,
      length: message.length,
      timestamp: new Date().toISOString(),
    };
  }
);

// 錯誤處理
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.message,
    statusCode: error.statusCode || 500,
  });
});

// 啟動伺服器
const start = async () => {
  try {
    await fastify.listen({ port: 5000, host: '127.0.0.1' });
    console.log('🚀 Fastify 伺服器運行在 http://127.0.0.1:5000');
    console.log('\n📖 可用端點:');
    console.log('   GET  /');
    console.log('   GET  /hello/:name');
    console.log('   GET  /api/users');
    console.log('   POST /api/echo');
    console.log('\n🧪 測試 POST 請求:');
    console.log(
      '   curl -X POST http://127.0.0.1:5000/api/echo -H "Content-Type: application/json" -d \'{"message":"Hello"}\''
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
