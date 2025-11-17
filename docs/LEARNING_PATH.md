# 📚 Node.js 完整學習路線圖

本文檔提供了從零基礎到進階的完整 Node.js 學習路徑。

## 🎯 學習目標設定

### 初級 (1-2 個月)
- 理解 Node.js 運行環境
- 掌握 JavaScript/TypeScript 基礎
- 熟悉核心模組 (fs, http, path, url)
- 能夠創建簡單的 HTTP 伺服器

### 中級 (3-4 個月)
- 掌握 Express.js 框架
- 理解中間件和路由系統
- 能夠構建 RESTful API
- 學會使用數據庫 (PostgreSQL/MongoDB)
- 理解認證和授權

### 高級 (5-6 個月以上)
- 掌握微服務架構
- 使用 GraphQL
- WebSocket 實時通信
- 性能優化和擴展
- Docker 容器化
- CI/CD 實踐

## 📖 詳細學習路線

### 階段 1: Node.js 基礎 (2-3 週)

**位置**: `src/01-basics/`

**學習內容**:
1. Node.js 環境和 npm 包管理
2. JavaScript ES6+ 特性
3. TypeScript 基礎
4. 核心模組學習
   - HTTP 模組
   - 文件系統 (fs)
   - Path 和 URL
   - Events 和 Streams

**實戰項目**:
- 靜態文件伺服器
- 簡單的 CLI 工具
- 文件處理腳本

**檢驗標準**:
- [ ] 能夠獨立創建 HTTP 伺服器
- [ ] 理解異步編程和 Promise
- [ ] 會使用 fs 模組處理文件
- [ ] 理解 Node.js 事件循環

### 階段 2: Express.js 框架 (3-4 週)

**位置**: `src/02-express/`

**學習內容**:
1. Express 基礎概念
2. 中間件系統
3. 路由管理和模組化
4. 請求驗證
5. 錯誤處理
6. RESTful API 設計原則

**實戰項目**:
- Todo List API
- 博客系統 API
- 用戶管理系統

**檢驗標準**:
- [ ] 能夠設計和實現 RESTful API
- [ ] 理解並能編寫中間件
- [ ] 會組織大型應用的路由結構
- [ ] 能夠處理各種錯誤情況

### 階段 3: 數據庫整合 (3-4 週)

**位置**: `src/04-database/`

**學習內容**:
1. SQL vs NoSQL
2. PostgreSQL 基礎
3. Prisma ORM
4. 數據模型設計
5. 查詢優化
6. 事務處理

**實戰項目**:
- 電商產品管理系統
- 社交媒體 API

**檢驗標準**:
- [ ] 能夠設計規範化的數據庫
- [ ] 熟練使用 Prisma ORM
- [ ] 理解 ACID 特性
- [ ] 會優化數據庫查詢

### 階段 4: 認證與安全 (2-3 週)

**學習內容**:
1. JWT (JSON Web Tokens)
2. OAuth 2.0
3. 密碼加密 (bcrypt)
4. CORS 處理
5. 安全最佳實踐
6. Rate Limiting

**實戰項目**:
- 完整的用戶認證系統
- OAuth 社交登入

**檢驗標準**:
- [ ] 能夠實現 JWT 認證
- [ ] 理解常見安全漏洞
- [ ] 會配置 CORS
- [ ] 能夠保護 API 端點

### 階段 5: 測試與質量保證 (2-3 週)

**位置**: `src/05-testing/`

**學習內容**:
1. 單元測試 (Vitest)
2. 整合測試
3. API 測試
4. 測試覆蓋率
5. TDD/BDD 開發模式

**實戰項目**:
- 為現有項目編寫測試
- TDD 實踐新功能

**檢驗標準**:
- [ ] 能夠編寫單元測試
- [ ] 理解測試金字塔
- [ ] 達到 80%+ 測試覆蓋率
- [ ] 會使用 TDD 開發

### 階段 6: 進階主題 (4-6 週)

**位置**: `src/06-advanced/`

**學習內容**:
1. WebSocket 實時通信
2. GraphQL API
3. 微服務架構
4. 消息隊列 (Redis/RabbitMQ)
5. 緩存策略
6. 性能優化

**實戰項目**:
- 實時聊天應用
- GraphQL API
- 微服務架構項目

**檢驗標準**:
- [ ] 能夠實現 WebSocket 通信
- [ ] 理解 GraphQL 優勢
- [ ] 會設計微服務架構
- [ ] 能夠優化應用性能

### 階段 7: DevOps 和部署 (2-3 週)

**學習內容**:
1. Docker 容器化
2. CI/CD (GitHub Actions)
3. 雲端部署 (AWS/Vercel/Railway)
4. 監控和日誌
5. 環境配置管理

**實戰項目**:
- 容器化應用
- 設置 CI/CD 流程
- 部署到生產環境

**檢驗標準**:
- [ ] 能夠編寫 Dockerfile
- [ ] 會配置 CI/CD
- [ ] 能夠部署到雲端
- [ ] 理解監控的重要性

## 🎓 學習建議

### 每日學習計劃
- **平日**: 1-2 小時
- **週末**: 3-4 小時

### 學習方法
1. **理論學習** (30%)
   - 閱讀官方文檔
   - 觀看教學影片
   - 閱讀技術文章

2. **實踐編碼** (50%)
   - 完成範例代碼
   - 做練習題
   - 構建小項目

3. **複習總結** (20%)
   - 記錄學習筆記
   - 總結重點知識
   - 分享學習心得

### 資源推薦

**官方文檔**:
- [Node.js 官方文檔](https://nodejs.org/docs/)
- [Express.js 文檔](https://expressjs.com/)
- [TypeScript 文檔](https://www.typescriptlang.org/docs/)

**書籍**:
- "Node.js 設計模式"
- "JavaScript 高級程序設計"

**社群**:
- Stack Overflow
- Node.js Discord
- Reddit r/node

## 🏆 里程碑項目

完成每個階段後，建議完成以下綜合項目：

### 初級項目
- [ ] 個人博客 API
- [ ] Todo List 全棧應用
- [ ] 天氣查詢應用

### 中級項目
- [ ] 電商平台 API
- [ ] 社交媒體 API
- [ ] 內容管理系統 (CMS)

### 高級項目
- [ ] 實時聊天應用
- [ ] 微服務架構的電商系統
- [ ] 開源項目貢獻

## 📊 進度追踪

建議使用以下工具追踪學習進度：
- GitHub Projects
- Notion
- Trello

定期（每週/每月）檢視學習進度，調整學習計劃。

## 💪 保持動力

- 加入學習社群
- 參與開源項目
- 寫技術博客
- 教導他人
- 設定可達成的小目標

## 🎯 下一步

準備好了嗎？從 [學習路線 01: Node.js 基礎](../src/01-basics/README.md) 開始你的旅程！
