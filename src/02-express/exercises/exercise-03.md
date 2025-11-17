# Exercise 03: 文件管理 API

## 目標

構建一個完整的文件管理系統，支持文件上傳、下載、組織、分享等功能，類似 Dropbox 或 Google Drive。

## 需求

### 1. 文件上傳

#### 1.1 單文件上傳

- 端點：`POST /api/files/upload`
- 認證：需要登錄
- 請求：multipart/form-data
- 字段：
  - `file`: 文件（必填）
  - `folderId`: 文件夾 ID（可選，默認根目錄）
  - `description`: 文件描述（可選）
- 功能要求：
  - 支持多種文件類型
  - 文件大小限制（可配置，默認 50MB）
  - 自動檢測文件類型
  - 生成唯一文件名
  - 計算文件 MD5 哈希（防重複）
  - 如果文件已存在（相同哈希），直接引用
  - 更新用戶存儲空間使用量

#### 1.2 多文件上傳

- 端點：`POST /api/files/upload-multiple`
- 認證：需要登錄
- 功能要求：
  - 同時上傳多個文件（最多 20 個）
  - 批量驗證
  - 返回所有文件的上傳結果

#### 1.3 大文件分塊上傳

- 端點：`POST /api/files/upload-chunk`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "uploadId": "string (上傳會話ID)",
    "chunkIndex": "number (分塊索引)",
    "totalChunks": "number (總分塊數)",
    "chunkData": "binary (分塊數據)"
  }
  ```
- 功能要求：
  - 支持文件分塊上傳
  - 上傳進度追蹤
  - 斷點續傳
  - 完成後自動合併分塊

#### 1.4 完成分塊上傳

- 端點：`POST /api/files/upload-complete`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "uploadId": "string",
    "fileName": "string",
    "folderId": "number (可選)"
  }
  ```
- 功能要求：
  - 驗證所有分塊已上傳
  - 合併文件
  - 創建文件記錄

### 2. 文件管理

#### 2.1 獲取文件列表

- 端點：`GET /api/files`
- 認證：需要登錄
- 查詢參數：
  - `folderId`: 文件夾 ID（可選，默認根目錄）
  - `page`: 頁碼
  - `limit`: 每頁數量
  - `sort`: 排序字段（name, size, createdAt, type）
  - `order`: 排序順序（asc, desc）
  - `type`: 文件類型過濾（image, video, audio, document）
  - `search`: 搜索關鍵詞
- 功能要求：
  - 只返回用戶自己的文件
  - 支持分頁
  - 支持排序和過濾
  - 返回文件元數據

#### 2.2 獲取文件詳情

- 端點：`GET /api/files/:id`
- 認證：需要登錄
- 功能要求：
  - 返回完整文件信息
  - 包含分享鏈接（如果已分享）
  - 包含文件版本歷史
  - 只有文件所有者或有權限的用戶可訪問

#### 2.3 下載文件

- 端點：`GET /api/files/:id/download`
- 認證：需要登錄或有效的分享令牌
- 功能要求：
  - 驗證用戶權限
  - 支持範圍請求（Range header）用於斷點續傳
  - 設置正確的 Content-Type
  - 記錄下載次數

#### 2.4 預覽文件

- 端點：`GET /api/files/:id/preview`
- 認證：需要登錄或有效的分享令牌
- 功能要求：
  - 圖片：返回縮略圖
  - 視頻：返回視頻流（支持 streaming）
  - 文檔：返回在線預覽版本
  - 其他：返回文件圖標

#### 2.5 重命名文件

- 端點：`PATCH /api/files/:id/rename`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "newName": "string"
  }
  ```
- 功能要求：
  - 只有所有者可以重命名
  - 驗證文件名（不允許特殊字符）
  - 保持文件擴展名

#### 2.6 移動文件

- 端點：`PATCH /api/files/:id/move`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "targetFolderId": "number"
  }
  ```
- 功能要求：
  - 只有所有者可以移動
  - 驗證目標文件夾存在
  - 驗證目標文件夾權限

#### 2.7 複製文件

- 端點：`POST /api/files/:id/copy`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "targetFolderId": "number (可選)"
  }
  ```
- 功能要求：
  - 創建文件副本
  - 不複製物理文件（引用相同存儲）
  - 更新用戶存儲使用量

#### 2.8 刪除文件

- 端點：`DELETE /api/files/:id`
- 認證：需要登錄
- 功能要求：
  - 只有所有者可以刪除
  - 實現軟刪除（移到回收站）
  - 更新用戶存儲使用量

#### 2.9 永久刪除文件

- 端點：`DELETE /api/files/:id/permanent`
- 認證：需要登錄
- 功能要求：
  - 從回收站永久刪除
  - 如果沒有其他引用，刪除物理文件
  - 釋放存儲空間

#### 2.10 恢復文件

- 端點：`POST /api/files/:id/restore`
- 認證：需要登錄
- 功能要求：
  - 從回收站恢復文件
  - 恢復到原位置

### 3. 文件夾管理

#### 3.1 創建文件夾

- 端點：`POST /api/folders`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "name": "string",
    "parentId": "number (可選，默認根目錄)",
    "color": "string (可選，文件夾顏色)"
  }
  ```

#### 3.2 獲取文件夾內容

- 端點：`GET /api/folders/:id`
- 認證：需要登錄
- 功能要求：
  - 返回文件夾信息
  - 返回子文件夾列表
  - 返回文件列表
  - 支持分頁

#### 3.3 重命名文件夾

- 端點：`PATCH /api/folders/:id/rename`
- 認證：需要登錄

#### 3.4 移動文件夾

- 端點：`PATCH /api/folders/:id/move`
- 認證：需要登錄
- 功能要求：
  - 不能移動到自己的子文件夾
  - 遞歸移動所有內容

#### 3.5 刪除文件夾

- 端點：`DELETE /api/folders/:id`
- 認證：需要登錄
- 功能要求：
  - 遞歸刪除所有內容
  - 移到回收站

#### 3.6 獲取文件夾路徑

- 端點：`GET /api/folders/:id/path`
- 認證：需要登錄
- 功能要求：
  - 返回從根目錄到當前文件夾的完整路徑
  - 麵包屑導航

### 4. 文件分享

#### 4.1 創建分享鏈接

- 端點：`POST /api/files/:id/share`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "password": "string (可選，訪問密碼)",
    "expiresAt": "date (可選，過期時間)",
    "maxDownloads": "number (可選，最大下載次數)",
    "permission": "view | download (默認：view)"
  }
  ```
- 功能要求：
  - 生成唯一的分享令牌
  - 支持密碼保護
  - 支持過期時間
  - 支持下載次數限制

#### 4.2 訪問分享文件

- 端點：`GET /api/share/:token`
- 查詢參數：
  - `password`: 訪問密碼（如果需要）
- 功能要求：
  - 驗證分享令牌
  - 檢查是否過期
  - 驗證密碼（如果有）
  - 檢查下載次數限制
  - 記錄訪問日誌

#### 4.3 下載分享文件

- 端點：`GET /api/share/:token/download`
- 查詢參數：
  - `password`: 訪問密碼
- 功能要求：
  - 所有驗證同上
  - 增加下載計數
  - 檢查下載次數限制

#### 4.4 取消分享

- 端點：`DELETE /api/files/:id/share`
- 認證：需要登錄
- 功能要求：
  - 刪除分享鏈接
  - 使所有令牌失效

#### 4.5 獲取我的分享列表

- 端點：`GET /api/shares`
- 認證：需要登錄
- 功能要求：
  - 返回用戶創建的所有分享
  - 包含訪問統計

### 5. 文件版本

#### 5.1 獲取文件版本歷史

- 端點：`GET /api/files/:id/versions`
- 認證：需要登錄
- 功能要求：
  - 返回所有版本
  - 包含版本大小和創建時間

#### 5.2 上傳新版本

- 端點：`POST /api/files/:id/versions`
- 認證：需要登錄
- 功能要求：
  - 保存舊版本
  - 更新當前版本
  - 限制版本數量（如最多 10 個）

#### 5.3 恢復到指定版本

- 端點：`POST /api/files/:id/versions/:versionId/restore`
- 認證：需要登錄
- 功能要求：
  - 恢復到指定版本
  - 將當前版本也保存為歷史版本

#### 5.4 刪除版本

- 端點：`DELETE /api/files/:id/versions/:versionId`
- 認證：需要登錄
- 功能要求：
  - 不能刪除當前版本
  - 釋放存儲空間

### 6. 搜索功能

#### 6.1 搜索文件

- 端點：`GET /api/search`
- 認證：需要登錄
- 查詢參數：
  - `q`: 搜索關鍵詞
  - `type`: 文件類型
  - `minSize`: 最小文件大小
  - `maxSize`: 最大文件大小
  - `dateFrom`: 開始日期
  - `dateTo`: 結束日期
- 功能要求：
  - 搜索文件名和描述
  - 支持高級過濾
  - 按相關性排序

### 7. 存儲管理

#### 7.1 獲取存儲統計

- 端點：`GET /api/storage/stats`
- 認證：需要登錄
- 功能要求：
  - 總存儲空間
  - 已使用空間
  - 可用空間
  - 按文件類型分類的使用情況
  - 最大的文件

#### 7.2 清理回收站

- 端點：`POST /api/storage/clean-trash`
- 認證：需要登錄
- 功能要求：
  - 永久刪除回收站中的所有文件
  - 釋放存儲空間

### 8. 回收站

#### 8.1 獲取回收站內容

- 端點：`GET /api/trash`
- 認證：需要登錄
- 功能要求：
  - 返回已刪除的文件和文件夾
  - 支持分頁

#### 8.2 清空回收站

- 端點：`DELETE /api/trash`
- 認證：需要登錄

### 9. 文件標籤

#### 9.1 為文件添加標籤

- 端點：`POST /api/files/:id/tags`
- 認證：需要登錄
- 請求體：
  ```json
  {
    "tags": ["string[]"]
  }
  ```

#### 9.2 移除文件標籤

- 端點：`DELETE /api/files/:id/tags/:tag`
- 認證：需要登錄

#### 9.3 按標籤搜索

- 端點：`GET /api/tags/:tag/files`
- 認證：需要登錄

## 數據模型

### File

```typescript
interface File {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  hash: string; // MD5
  storagePath: string;
  folderId?: number;
  ownerId: number;
  description?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  downloads: number;
  views: number;
  currentVersionId: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### FileVersion

```typescript
interface FileVersion {
  id: number;
  fileId: number;
  versionNumber: number;
  size: number;
  storagePath: string;
  createdAt: Date;
  createdBy: number;
}
```

### Folder

```typescript
interface Folder {
  id: number;
  name: string;
  parentId?: number;
  ownerId: number;
  color?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Share

```typescript
interface Share {
  id: number;
  fileId: number;
  token: string;
  password?: string;
  expiresAt?: Date;
  maxDownloads?: number;
  downloads: number;
  views: number;
  permission: 'view' | 'download';
  createdBy: number;
  createdAt: Date;
}
```

### FileTag

```typescript
interface FileTag {
  fileId: number;
  tag: string;
}
```

### UploadSession

```typescript
interface UploadSession {
  id: string;
  userId: number;
  fileName: string;
  totalChunks: number;
  uploadedChunks: number[];
  createdAt: Date;
  expiresAt: Date;
}
```

## 技術要求

### 依賴包

```json
{
  "express": "^4.18.0",
  "multer": "^1.4.5-lts.1",
  "sharp": "^0.32.0",
  "crypto": "built-in",
  "@types/express": "^4.17.0",
  "@types/multer": "^1.4.7"
}
```

### 配置

```typescript
const CONFIG = {
  UPLOAD_DIR: './uploads',
  THUMBNAIL_DIR: './uploads/thumbnails',
  CHUNK_DIR: './uploads/chunks',
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_STORAGE_PER_USER: 5 * 1024 * 1024 * 1024, // 5GB
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VERSIONS: 10,
  TRASH_RETENTION_DAYS: 30
};
```

## 測試場景

```bash
# 上傳文件
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer USER_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "folderId=1"

# 下載文件
curl http://localhost:3000/api/files/1/download \
  -H "Authorization: Bearer USER_TOKEN" \
  -o downloaded-file.pdf

# 創建分享鏈接
curl -X POST http://localhost:3000/api/files/1/share \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "secret",
    "expiresAt": "2024-12-31T23:59:59Z",
    "permission": "download"
  }'

# 訪問分享文件
curl "http://localhost:3000/api/share/SHARE_TOKEN?password=secret"

# 獲取存儲統計
curl http://localhost:3000/api/storage/stats \
  -H "Authorization: Bearer USER_TOKEN"
```

## 評分標準

- **功能完整性（40%）**
  - 文件上傳下載
  - 文件夾管理
  - 分享功能
  - 版本控制

- **文件處理（20%）**
  - 大文件處理
  - 分塊上傳
  - 斷點續傳
  - 縮略圖生成

- **安全性（15%）**
  - 權限驗證
  - 文件訪問控制
  - 分享密碼保護

- **存儲優化（15%）**
  - 文件去重
  - 存儲空間管理
  - 版本限制

- **代碼質量（10%）**
  - 代碼組織
  - 錯誤處理
  - TypeScript 類型

## 提示

1. 先實現基本的文件上傳下載
2. 添加文件夾管理功能
3. 實現分享功能
4. 添加版本控制
5. 實現大文件分塊上傳
6. 優化存儲（去重、壓縮）

## 擴展挑戰

1. 實現文件預覽（在線查看 PDF、Office 文檔）
2. 添加視頻轉碼和流媒體支持
3. 實現協作功能（多人編輯）
4. 添加文件同步（類似 Dropbox）
5. 實現全文搜索（搜索文件內容）
6. 添加文件加密存儲
7. 實現雲存儲對接（S3、OSS）
8. 添加文件審計日誌
9. 實現配額管理
10. 添加 WebDAV 支持
