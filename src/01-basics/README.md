# 學習路線 01：Node.js 基礎核心

## 📚 學習目標

- 理解 Node.js 的核心概念和事件循環
- 掌握 HTTP 模組的基本使用
- 學習文件系統 (fs) 操作
- 理解 URL 處理和路由概念
- 掌握異步編程（Callbacks → Promises → Async/Await）

## 📖 章節內容

### 1. HTTP 模組
- **範例 1**: Hello World Server (`examples/01-http-hello-world.ts`)
- **範例 2**: 處理不同內容類型 (`examples/02-http-content-types.ts`)
- **範例 3**: 簡單路由系統 (`examples/03-http-routing.ts`)

### 2. 文件系統 (fs) 模組
- **範例 4**: 讀取文件和目錄 (`examples/04-fs-read.ts`)
- **範例 5**: Promise 和 Async/Await (`examples/05-fs-async.ts`)
- **範例 6**: 文件監控 (`examples/06-fs-watch.ts`)

### 3. URL 處理
- **範例 7**: URL 解析 (`examples/07-url-parsing.ts`)
- **範例 8**: Query 參數處理 (`examples/08-url-query.ts`)

## 🎯 練習題

每個章節都有配套練習，位於 `exercises/` 目錄下。
參考答案位於 `solutions/` 目錄下。

## 🚀 運行範例

```bash
# 運行任何範例
npm run dev -- src/01-basics/examples/01-http-hello-world.ts

# 或使用 tsx 直接運行
npx tsx src/01-basics/examples/01-http-hello-world.ts
```

## 💡 重要概念

### Event Loop（事件循環）
Node.js 是單線程的，但通過事件循環實現非阻塞 I/O。

### 異步編程演進
1. **Callbacks**（回調）- 傳統方式
2. **Promises**（承諾）- ES6+
3. **Async/Await**（異步等待）- ES2017+，推薦使用

### 模組系統
本專案使用 **ES Modules (ESM)**，這是 JavaScript 的標準模組系統。

## 📚 延伸閱讀

- [Node.js 官方文檔](https://nodejs.org/docs/)
- [MDN - JavaScript 異步編程](https://developer.mozilla.org/zh-TW/docs/Learn/JavaScript/Asynchronous)
