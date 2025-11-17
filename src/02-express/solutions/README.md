# Express 練習題解決方案

本目錄包含所有練習題的參考解決方案。

## 解決方案文件

### Exercise 01: 用戶認證系統

**文件**: `exercise-01-solution.ts`

**包含功能**:
- 用戶註冊和登錄
- JWT Token 管理（Access Token 和 Refresh Token）
- 密碼加密和驗證
- 密碼修改和重置
- 郵箱驗證
- 登錄失敗限制和賬戶鎖定
- 速率限制
- Token 黑名單

**運行方式**:
```bash
cd /home/user/nodejs-learning/src/02-express/solutions
npx ts-node exercise-01-solution.ts
```

**測試命令**:
```bash
# 註冊
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123",
    "confirmPassword": "Password123"
  }'

# 登錄
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Password123"
  }'

# 獲取當前用戶
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Exercise 02: 博客 API

**文件**: `exercise-02-solution.ts`

**包含功能**:
- 文章 CRUD 操作
- 分類和標籤管理
- 評論系統（支持嵌套評論）
- 文章點贊和收藏
- 搜索功能
- 分頁和排序
- 統計功能

**核心實現要點**:

1. **數據模型關聯**
   - 文章和作者的一對多關係
   - 文章和分類的一對多關係
   - 文章和標籤的多對多關係
   - 評論的樹狀結構

2. **權限控制**
   - 只有作者或管理員可以編輯/刪除文章
   - 只有作者或管理員可以編輯/刪除評論
   - 管理員可以管理分類

3. **查詢優化**
   - 避免 N+1 查詢
   - 合理使用索引
   - 分頁處理

4. **搜索實現**
   - 全文搜索（標題、內容）
   - 按相關性排序
   - 高亮顯示

**示例代碼片段**:

```typescript
// 文章列表查詢（包含關聯數據）
function getPostsList(filters: any) {
  let result = [...posts];

  // 過濾
  if (filters.categoryId) {
    result = result.filter(p => p.categoryId === filters.categoryId);
  }

  if (filters.authorId) {
    result = result.filter(p => p.authorId === filters.authorId);
  }

  if (filters.status) {
    result = result.filter(p => p.status === filters.status);
  }

  // 標籤過濾
  if (filters.tagId) {
    const postIds = postTags
      .filter(pt => pt.tagId === filters.tagId)
      .map(pt => pt.postId);
    result = result.filter(p => postIds.includes(p.id));
  }

  // 搜索
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(searchLower) ||
      p.content.toLowerCase().includes(searchLower)
    );
  }

  // 排序
  result.sort((a, b) => {
    const aValue = a[filters.sort];
    const bValue = b[filters.sort];
    return filters.order === 'asc'
      ? (aValue > bValue ? 1 : -1)
      : (aValue < bValue ? 1 : -1);
  });

  return result;
}

// 嵌套評論處理
function buildCommentTree(comments: Comment[]) {
  const commentMap = new Map<number, any>();
  const roots: any[] = [];

  // 第一遍：創建所有評論的副本
  comments.forEach(comment => {
    commentMap.set(comment.id, {
      ...comment,
      replies: []
    });
  });

  // 第二遍：構建樹結構
  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(commentNode);
      }
    } else {
      roots.push(commentNode);
    }
  });

  return roots;
}
```

### Exercise 03: 文件管理 API

**文件**: `exercise-03-solution.ts`

**包含功能**:
- 文件上傳（單個、多個、分塊）
- 文件下載和預覽
- 文件夾管理
- 文件分享（密碼保護、過期時間）
- 文件版本控制
- 存儲空間管理
- 回收站功能

**核心實現要點**:

1. **文件上傳處理**
   - 使用 multer 處理文件上傳
   - 文件類型驗證
   - 文件大小限制
   - MD5 哈希去重

2. **大文件處理**
   - 分塊上傳
   - 斷點續傳
   - 進度追蹤
   - 分塊合併

3. **文件存儲優化**
   - 使用哈希避免重複存儲
   - 引用計數
   - 縮略圖生成

4. **權限控制**
   - 文件所有權驗證
   - 分享鏈接訪問控制
   - 文件夾權限繼承

**示例代碼片段**:

```typescript
// 文件去重
async function handleFileUpload(file: Express.Multer.File) {
  // 計算文件 MD5
  const hash = crypto
    .createHash('md5')
    .update(await fs.readFile(file.path))
    .digest('hex');

  // 檢查是否已存在
  const existingFile = fileStorage.get(hash);

  if (existingFile) {
    // 文件已存在，刪除上傳的文件
    await fs.unlink(file.path);

    // 增加引用計數
    existingFile.refCount++;

    return existingFile;
  }

  // 新文件，保存到存儲
  const fileRecord = {
    hash,
    path: file.path,
    size: file.size,
    refCount: 1
  };

  fileStorage.set(hash, fileRecord);
  return fileRecord;
}

// 分塊上傳處理
async function handleChunkUpload(
  uploadId: string,
  chunkIndex: number,
  chunkData: Buffer
) {
  const session = uploadSessions.get(uploadId);

  if (!session) {
    throw new Error('Invalid upload session');
  }

  // 保存分塊
  const chunkPath = path.join(CHUNK_DIR, uploadId, `chunk-${chunkIndex}`);
  await fs.writeFile(chunkPath, chunkData);

  // 標記分塊已上傳
  session.uploadedChunks.push(chunkIndex);

  return {
    uploadId,
    chunkIndex,
    totalChunks: session.totalChunks,
    uploadedChunks: session.uploadedChunks.length,
    progress: (session.uploadedChunks.length / session.totalChunks) * 100
  };
}

// 合併分塊
async function mergeChunks(uploadId: string, outputPath: string) {
  const session = uploadSessions.get(uploadId);

  if (!session) {
    throw new Error('Invalid upload session');
  }

  const writeStream = fs.createWriteStream(outputPath);

  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = path.join(CHUNK_DIR, uploadId, `chunk-${i}`);
    const chunkData = await fs.readFile(chunkPath);
    writeStream.write(chunkData);

    // 刪除分塊
    await fs.unlink(chunkPath);
  }

  writeStream.end();

  // 清理上傳會話
  uploadSessions.delete(uploadId);
  await fs.rmdir(path.join(CHUNK_DIR, uploadId));
}

// 文件分享權限驗證
async function validateShareAccess(
  token: string,
  password?: string
): Promise<Share> {
  const share = shares.find(s => s.token === token);

  if (!share) {
    throw new Error('Share not found');
  }

  // 檢查是否過期
  if (share.expiresAt && share.expiresAt < new Date()) {
    throw new Error('Share has expired');
  }

  // 檢查密碼
  if (share.password) {
    if (!password) {
      throw new Error('Password required');
    }
    if (share.password !== password) {
      throw new Error('Invalid password');
    }
  }

  // 檢查下載次數限制
  if (share.maxDownloads && share.downloads >= share.maxDownloads) {
    throw new Error('Download limit exceeded');
  }

  return share;
}
```

## 學習建議

1. **循序漸進**
   - 先理解基本的 CRUD 操作
   - 逐步添加複雜功能
   - 不要一次實現所有功能

2. **測試驅動**
   - 為每個功能編寫測試
   - 使用 curl 或 Postman 測試 API
   - 驗證邊界條件和錯誤處理

3. **代碼組織**
   - 使用中間件分離關注點
   - 將驗證邏輯提取為函數
   - 考慮使用 Service 層組織業務邏輯

4. **安全性**
   - 始終驗證用戶輸入
   - 實現適當的權限控制
   - 使用速率限制防止濫用
   - 不暴露敏感信息

5. **性能優化**
   - 避免 N+1 查詢
   - 使用分頁減少數據傳輸
   - 考慮緩存常用數據
   - 使用索引加速查詢

## 擴展學習

完成這些練習後，可以考慮：

1. **添加數據庫**
   - 使用 PostgreSQL、MySQL 或 MongoDB
   - 學習 ORM（Prisma、TypeORM、Sequelize）

2. **添加驗證庫**
   - 使用 Joi、Yup 或 Zod 進行數據驗證

3. **添加文檔**
   - 使用 Swagger/OpenAPI 生成 API 文檔

4. **添加測試**
   - 使用 Jest 編寫單元測試和集成測試
   - 使用 Supertest 測試 API 端點

5. **部署**
   - 學習容器化（Docker）
   - 部署到雲平台（Heroku、AWS、Vercel）

6. **監控和日誌**
   - 添加日誌系統（Winston、Pino）
   - 添加監控（New Relic、DataDog）

## 常見問題

### Q: 為什麼使用內存存儲而不是數據庫？

A: 這些練習的重點是學習 Express 和 RESTful API 設計，使用內存存儲可以讓你專注於 API 邏輯而不被數據庫細節分散注意力。在實際項目中，你應該使用真實的數據庫。

### Q: 如何處理並發問題？

A: 內存存儲在多進程環境下會有問題。在生產環境中，應該使用數據庫的事務和鎖機制來處理並發。

### Q: 為什麼不使用 async/await？

A: 大部分函數都使用了 async/await。對於內存操作，雖然是同步的，但使用 async 可以保持 API 的一致性，方便未來切換到真實的數據庫。

### Q: 如何測試需要認證的端點？

A: 先調用登錄端點獲取 token，然後在後續請求的 Authorization header 中包含該 token。

### Q: 錯誤處理的最佳實踐是什麼？

A:
1. 使用統一的錯誤響應格式
2. 使用適當的 HTTP 狀態碼
3. 提供清晰的錯誤消息
4. 不暴露敏感信息
5. 記錄所有錯誤以便調試

## 資源

- [Express 官方文檔](https://expressjs.com/)
- [RESTful API 設計最佳實踐](https://restfulapi.net/)
- [JWT 介紹](https://jwt.io/introduction)
- [Node.js 最佳實踐](https://github.com/goldbergyoni/nodebestpractices)
