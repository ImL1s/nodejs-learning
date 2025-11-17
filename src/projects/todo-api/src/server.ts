/**
 * Todo API - 伺服器啟動
 */

import app from './app';

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Todo API 運行在 http://${HOST}:${PORT}`);
  console.log(`📖 訪問 http://${HOST}:${PORT}/ 查看 API 文檔`);
  console.log('\n🧪 測試命令:');
  console.log(`   curl http://${HOST}:${PORT}/api/todos`);
  console.log(`   curl -X POST http://${HOST}:${PORT}/api/todos -H "Content-Type: application/json" -d '{"title":"學習 Node.js","priority":"high"}'`);
});
