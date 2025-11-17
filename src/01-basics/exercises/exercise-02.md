# 練習 2: 文件列表 API

## 🎯 目標

使用 fs 模組創建一個 API，列出指定目錄下的所有文件和目錄。

## 📝 需求

1. 創建 HTTP 伺服器
2. 實現 `/api/files` 端點
3. 接受查詢參數 `?path=/some/path`
4. 返回 JSON 格式的文件列表，包括：
   - 文件/目錄名稱
   - 類型（file 或 directory）
   - 大小（僅文件）
   - 修改時間

## 💡 提示

- 使用 `fs.promises.readdir()` 讀取目錄
- 使用 `fs.promises.stat()` 獲取文件信息
- 使用 `Promise.all()` 並行獲取所有文件信息
- 處理錯誤情況（目錄不存在等）

## ✅ 檢查點

- [ ] 成功讀取並列出文件
- [ ] 區分文件和目錄
- [ ] 顯示文件大小和修改時間
- [ ] 正確處理錯誤情況
- [ ] 返回格式化的 JSON

## 🚀 測試

```bash
# 列出當前目錄
curl "http://localhost:3000/api/files?path=."

# 列出指定目錄
curl "http://localhost:3000/api/files?path=./src"
```

## 📚 相關範例

參考 `src/01-basics/examples/04-fs-read.ts` 和 `05-fs-async.ts`
