# 練習 1: 建立簡單的文件伺服器

## 🎯 目標

創建一個 HTTP 伺服器，能夠提供靜態 HTML 文件。

## 📝 需求

1. 創建一個 HTTP 伺服器，監聽 3000 端口
2. 當訪問 `/` 時，返回一個 HTML 頁面，包含：
   - 標題 "我的第一個 Node.js 伺服器"
   - 當前時間
   - 一個歡迎訊息
3. 當訪問 `/about` 時，返回關於頁面
4. 其他路徑返回 404 錯誤

## 💡 提示

- 使用 `http.createServer()`
- 使用 `req.url` 來判斷路徑
- 使用 `res.writeHead()` 設置響應頭
- 使用 `res.end()` 結束響應

## ✅ 檢查點

- [ ] 伺服器成功啟動並監聽 3000 端口
- [ ] 訪問 `/` 顯示正確的 HTML 頁面
- [ ] 訪問 `/about` 顯示關於頁面
- [ ] 訪問其他路徑顯示 404 錯誤
- [ ] 代碼使用 TypeScript 編寫
- [ ] 使用 ES Modules (import/export)

## 🚀 運行方式

```bash
npx tsx src/01-basics/exercises/solutions/exercise-01-solution.ts
```

## 📚 相關範例

參考 `src/01-basics/examples/01-http-hello-world.ts`
