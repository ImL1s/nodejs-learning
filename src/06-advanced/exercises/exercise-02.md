# 練習 2: 性能優化挑戰

## 📋 目標

對一個性能較差的 Node.js 應用進行全面優化，將其響應時間降低 80% 以上，吞吐量提升 5 倍以上。

## 🎯 初始應用

### 應用描述

一個博客 API 服務，包含以下功能：

- 用戶註冊/登錄
- 發布/編輯/刪除文章
- 文章列表（分頁、搜索、標籤過濾）
- 文章詳情（含評論）
- 點贊/收藏
- 用戶關注
- 實時統計（閱讀量、點贊數）

### 性能問題（需要你診斷和修復）

應用存在多個性能瓶頸：

1. **數據庫查詢問題**
   - N+1 查詢問題
   - 缺少索引
   - 全表掃描
   - 沒有使用查詢緩存

2. **內存問題**
   - 內存洩漏
   - 大對象常駐內存
   - 緩存策略不當

3. **I/O 問題**
   - 同步文件操作
   - 未使用流處理大文件
   - 阻塞事件循環

4. **並發問題**
   - 沒有連接池
   - 沒有請求限流
   - 無並發控制

5. **代碼問題**
   - 過度使用中間件
   - 未使用集群模式
   - 錯誤處理不當

## 📁 初始代碼結構

```
blog-api/
├── src/
│   ├── app.ts                 # 應用入口
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── article.model.ts
│   │   └── comment.model.ts
│   ├── controllers/
│   │   ├── user.controller.ts
│   │   ├── article.controller.ts
│   │   └── comment.controller.ts
│   ├── routes/
│   │   └── index.ts
│   └── middlewares/
│       └── auth.middleware.ts
├── tests/
│   └── performance.test.ts
└── package.json
```

## 🔍 問題代碼示例

### 問題 1: N+1 查詢

```typescript
// ❌ 有問題的代碼
async function getArticlesWithAuthors() {
  const articles = await Article.find().limit(20);

  // N+1 問題：對每篇文章都查詢作者
  for (const article of articles) {
    article.author = await User.findById(article.authorId);
  }

  return articles;
}
```

### 問題 2: 缺少緩存

```typescript
// ❌ 有問題的代碼
app.get('/articles/:id', async (req, res) => {
  // 每次都從數據庫查詢
  const article = await Article.findById(req.params.id);

  // 每次都重新計算統計數據
  const stats = {
    likes: await Like.countDocuments({ articleId: article.id }),
    comments: await Comment.countDocuments({ articleId: article.id }),
    views: await View.countDocuments({ articleId: article.id })
  };

  res.json({ article, stats });
});
```

### 問題 3: 同步操作阻塞

```typescript
// ❌ 有問題的代碼
app.post('/upload', (req, res) => {
  const file = req.files.image;

  // 同步讀取文件
  const data = fs.readFileSync(file.path);

  // 同步處理圖片
  const processed = processImageSync(data);

  // 同步寫入文件
  fs.writeFileSync(`/uploads/${file.name}`, processed);

  res.json({ success: true });
});
```

### 問題 4: 內存洩漏

```typescript
// ❌ 有問題的代碼
const cache = new Map();

app.get('/trending', async (req, res) => {
  const cacheKey = `trending:${req.query.page}`;

  // 緩存永不過期，無限增長
  if (!cache.has(cacheKey)) {
    const articles = await Article.find()
      .sort({ views: -1 })
      .limit(20)
      .skip((req.query.page - 1) * 20);

    cache.set(cacheKey, articles);
  }

  res.json(cache.get(cacheKey));
});
```

### 問題 5: 缺少索引

```typescript
// ❌ 有問題的代碼
const ArticleSchema = new Schema({
  title: String,
  content: String,
  authorId: String,      // 缺少索引
  tags: [String],        // 缺少索引
  createdAt: Date,       // 缺少索引
  status: String         // 缺少索引
});

// 這個查詢會很慢
Article.find({
  authorId: userId,
  status: 'published',
  tags: { $in: ['nodejs', 'javascript'] }
}).sort({ createdAt: -1 });
```

## 🎯 優化任務

### 任務 1: 數據庫優化（30 分）

#### 1.1 解決 N+1 查詢問題

- [ ] 使用 `populate()` 或 JOIN 預加載關聯數據
- [ ] 使用 DataLoader 批量加載
- [ ] 減少數據庫查詢次數

#### 1.2 添加數據庫索引

- [ ] 為常用查詢字段添加索引
- [ ] 創建複合索引
- [ ] 使用 `explain()` 分析查詢計劃

#### 1.3 優化查詢

- [ ] 只選擇需要的字段（`select()`）
- [ ] 使用分頁限制結果集大小
- [ ] 避免全表掃描

#### 1.4 使用連接池

- [ ] 配置數據庫連接池
- [ ] 調整池大小
- [ ] 監控連接狀態

### 任務 2: 緩存優化（25 分）

#### 2.1 實現多層緩存

- [ ] Redis 緩存熱數據
- [ ] 內存緩存（LRU）
- [ ] CDN 緩存靜態資源

#### 2.2 緩存策略

- [ ] 設置合理的 TTL
- [ ] 實現緩存預熱
- [ ] 處理緩存失效

#### 2.3 查詢結果緩存

- [ ] 緩存文章列表
- [ ] 緩存用戶信息
- [ ] 緩存統計數據

#### 2.4 防止緩存問題

- [ ] 防止緩存穿透
- [ ] 防止緩存擊穿
- [ ] 防止緩存雪崩

### 任務 3: 代碼優化（20 分）

#### 3.1 異步操作優化

- [ ] 所有 I/O 操作使用異步
- [ ] 使用 Promise.all() 並行處理
- [ ] 避免阻塞事件循環

#### 3.2 使用流處理

- [ ] 文件上傳使用流
- [ ] 大數據導出使用流
- [ ] 減少內存佔用

#### 3.3 代碼優化

- [ ] 減少不必要的中間件
- [ ] 優化正則表達式
- [ ] 避免重複計算

### 任務 4: 架構優化（15 分）

#### 4.1 使用集群模式

- [ ] 啟用多進程
- [ ] 配置負載均衡
- [ ] 實現零停機重啟

#### 4.2 請求限流

- [ ] 實現 API 限流
- [ ] 防止 DDoS 攻擊
- [ ] 保護系統穩定性

#### 4.3 優雅降級

- [ ] Redis 故障降級
- [ ] 數據庫故障降級
- [ ] 部分功能降級

### 任務 5: 監控和分析（10 分）

#### 5.1 性能監控

- [ ] 添加響應時間監控
- [ ] 監控內存使用
- [ ] 監控 CPU 使用

#### 5.2 性能分析

- [ ] 使用 Chrome DevTools
- [ ] 使用 clinic.js
- [ ] 分析火焰圖

#### 5.3 日誌優化

- [ ] 結構化日誌
- [ ] 異步日誌寫入
- [ ] 合理的日誌級別

## 🧪 性能測試要求

### 測試工具

使用以下工具進行性能測試：

- **Artillery** - 負載測試
- **Apache Bench (ab)** - 簡單基準測試
- **clinic.js** - Node.js 性能分析
- **Chrome DevTools** - 性能剖析

### 測試場景

#### 場景 1: 文章列表

```yaml
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 100  # 每秒 100 個請求

scenarios:
  - name: "獲取文章列表"
    flow:
      - get:
          url: "/articles?page=1&limit=20"
```

#### 場景 2: 文章詳情

```yaml
scenarios:
  - name: "獲取文章詳情"
    flow:
      - get:
          url: "/articles/{{ articleId }}"
```

#### 場景 3: 混合場景

```yaml
scenarios:
  - name: "真實用戶行為"
    flow:
      - get:
          url: "/articles"
      - think: 2
      - get:
          url: "/articles/{{ randomArticleId }}"
      - think: 5
      - post:
          url: "/articles/{{ randomArticleId }}/like"
```

### 性能基準

#### 優化前（目標）

- 平均響應時間: 500-1000ms
- 95th 百分位: > 2000ms
- 吞吐量: 20 req/s
- 內存使用: 500-800MB
- CPU 使用: 70-90%

#### 優化後（目標）

- 平均響應時間: < 100ms
- 95th 百分位: < 200ms
- 吞吐量: > 100 req/s
- 內存使用: < 200MB
- CPU 使用: < 50%

## 📊 評分標準

### 性能提升（50 分）

- [ ] 響應時間降低 > 80%（20 分）
- [ ] 吞吐量提升 > 5 倍（20 分）
- [ ] 內存使用降低 > 50%（10 分）

### 優化方案（30 分）

- [ ] 數據庫優化（10 分）
- [ ] 緩存實現（10 分）
- [ ] 代碼優化（10 分）

### 代碼質量（10 分）

- [ ] 代碼可讀性（5 分）
- [ ] 錯誤處理（5 分）

### 文檔報告（10 分）

- [ ] 性能分析報告（5 分）
- [ ] 優化方案說明（5 分）

## 💡 優化提示

### 1. 數據庫優化示例

```typescript
// ✅ 優化後的代碼
async function getArticlesWithAuthors() {
  // 使用 populate 一次性加載關聯數據
  const articles = await Article
    .find()
    .populate('author', 'name avatar')  // 只選擇需要的字段
    .select('title summary createdAt')  // 只選擇需要的字段
    .limit(20)
    .lean();  // 返回純 JavaScript 對象，更快

  return articles;
}

// 添加索引
ArticleSchema.index({ authorId: 1, status: 1, createdAt: -1 });
ArticleSchema.index({ tags: 1 });
```

### 2. Redis 緩存示例

```typescript
// ✅ 優化後的代碼
import { RedisCacheManager } from './cache';

const cache = new RedisCacheManager();

app.get('/articles/:id', async (req, res) => {
  const cacheKey = `article:${req.params.id}`;

  // 嘗試從緩存獲取
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // 緩存未命中，從數據庫查詢
  const article = await Article
    .findById(req.params.id)
    .populate('author', 'name avatar')
    .lean();

  // 統計數據使用 Redis 計數器
  const stats = {
    likes: await redis.get(`article:${article.id}:likes`) || 0,
    comments: await redis.get(`article:${article.id}:comments`) || 0,
    views: await redis.incr(`article:${article.id}:views`)
  };

  const result = { article, stats };

  // 緩存結果，5 分鐘過期
  await cache.set(cacheKey, result, 300);

  res.json(result);
});
```

### 3. 流處理示例

```typescript
// ✅ 優化後的代碼
import { pipeline } from 'stream/promises';
import sharp from 'sharp';

app.post('/upload', async (req, res) => {
  try {
    const file = req.files.image;
    const outputPath = `/uploads/${Date.now()}-${file.name}`;

    // 使用流處理，不會佔用大量內存
    await pipeline(
      fs.createReadStream(file.path),
      sharp().resize(800, 600),
      fs.createWriteStream(outputPath)
    );

    res.json({ success: true, path: outputPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. LRU 緩存示例

```typescript
// ✅ 優化後的代碼
import LRU from 'lru-cache';

const cache = new LRU({
  max: 500,           // 最多 500 個條目
  maxAge: 1000 * 60 * 5,  // 5 分鐘過期
  updateAgeOnGet: true
});

app.get('/trending', async (req, res) => {
  const cacheKey = `trending:${req.query.page}`;

  let articles = cache.get(cacheKey);

  if (!articles) {
    articles = await Article
      .find()
      .sort({ views: -1 })
      .limit(20)
      .skip((req.query.page - 1) * 20)
      .lean();

    cache.set(cacheKey, articles);
  }

  res.json(articles);
});
```

### 5. 集群模式示例

```typescript
// ✅ 優化後的代碼
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // 自動重啟
  });
} else {
  // Worker 進程運行應用
  startApp();
}
```

### 6. 請求限流示例

```typescript
// ✅ 優化後的代碼
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 限制 100 個請求
  message: '請求過於頻繁，請稍後再試'
});

app.use('/api/', limiter);
```

## 🔧 性能分析工具

### 1. clinic.js

```bash
# 安裝
npm install -g clinic

# 性能分析
clinic doctor -- node app.js

# 火焰圖
clinic flame -- node app.js

# 氣泡圖
clinic bubbleprof -- node app.js
```

### 2. Artillery 負載測試

```bash
# 安裝
npm install -g artillery

# 運行測試
artillery run artillery.yml

# 快速測試
artillery quick --count 100 --num 1000 http://localhost:3000/articles
```

### 3. Apache Bench

```bash
# 100 並發，總共 10000 請求
ab -n 10000 -c 100 http://localhost:3000/articles

# 帶 Keep-Alive
ab -n 10000 -c 100 -k http://localhost:3000/articles
```

### 4. Node.js 內置分析

```bash
# CPU 分析
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# 內存分析
node --inspect app.js
# 然後在 Chrome DevTools 中連接
```

## 📈 性能報告模板

創建一個 `PERFORMANCE_REPORT.md` 文件，包含：

```markdown
# 性能優化報告

## 1. 優化前性能基準

- 平均響應時間: XXms
- 95th 百分位: XXms
- 吞吐量: XX req/s
- 內存使用: XXMB
- CPU 使用: XX%

## 2. 發現的問題

### 問題 1: N+1 查詢
- 描述: ...
- 影響: ...
- 證據: ...

### 問題 2: ...

## 3. 優化方案

### 方案 1: 添加數據庫索引
- 具體措施: ...
- 預期效果: ...
- 實際效果: ...

### 方案 2: ...

## 4. 優化後性能

- 平均響應時間: XXms (降低 XX%)
- 95th 百分位: XXms (降低 XX%)
- 吞吐量: XX req/s (提升 XX%)
- 內存使用: XXMB (降低 XX%)
- CPU 使用: XX% (降低 XX%)

## 5. 性能對比圖表

[插入圖表]

## 6. 結論和建議

...
```

## 🚀 挑戰任務

1. **自動化性能測試**
   - 集成到 CI/CD 流程
   - 性能回歸測試
   - 自動生成報告

2. **實時性能監控**
   - 集成 Prometheus + Grafana
   - 實時監控儀表板
   - 告警機制

3. **壓力測試**
   - 找出系統極限
   - 測試在高負載下的穩定性
   - 分析系統瓶頸

4. **多區域部署優化**
   - CDN 加速
   - 數據庫讀寫分離
   - 多區域緩存同步

## 📚 參考資料

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [clinic.js 文檔](https://clinicjs.org/)
- [Artillery 文檔](https://www.artillery.io/docs)
- [Redis 最佳實踐](https://redis.io/docs/manual/patterns/)
- [MongoDB 性能優化](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)

## 🎓 學習目標

完成這個練習後，你將掌握：

1. ✅ 性能分析方法
2. ✅ 數據庫優化技巧
3. ✅ 緩存策略設計
4. ✅ 代碼性能優化
5. ✅ 系統架構優化
6. ✅ 性能測試和監控
7. ✅ 問題診斷和解決

祝你優化順利！記住：測量、分析、優化、驗證。
