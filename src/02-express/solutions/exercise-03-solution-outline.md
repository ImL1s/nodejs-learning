# Exercise 03 解決方案大綱：文件管理 API

## 核心實現思路

### 1. Multer 配置

```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CHUNK_DIR = path.join(__dirname, 'uploads', 'chunks');
const THUMBNAIL_DIR = path.join(__dirname, 'uploads', 'thumbnails');

// 確保目錄存在
async function ensureDirectories() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(CHUNK_DIR, { recursive: true });
  await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
}

// 磁盤存儲配置
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// 文件過濾器
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允許的文件類型
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});
```

### 2. 文件上傳和去重

```typescript
// 計算文件哈希
async function calculateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return crypto
    .createHash('md5')
    .update(fileBuffer)
    .digest('hex');
}

// 文件存儲（去重）
const fileStorage = new Map<string, {
  hash: string;
  path: string;
  size: number;
  refCount: number;
}>();

// 處理文件上傳
app.post('/api/files/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const folderId = req.body.folderId ? Number(req.body.folderId) : null;
    const description = req.body.description;

    // 計算文件哈希
    const hash = await calculateFileHash(req.file.path);

    // 檢查是否已存在
    let storageRecord = fileStorage.get(hash);

    if (storageRecord) {
      // 文件已存在，刪除剛上傳的文件
      await fs.unlink(req.file.path);
      storageRecord.refCount++;
    } else {
      // 新文件
      storageRecord = {
        hash,
        path: req.file.path,
        size: req.file.size,
        refCount: 1
      };
      fileStorage.set(hash, storageRecord);
    }

    // 創建文件記錄
    const newFile: FileRecord = {
      id: files.length + 1,
      name: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      hash,
      storagePath: storageRecord.path,
      folderId,
      ownerId: req.user!.userId,
      description,
      isDeleted: false,
      downloads: 0,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    files.push(newFile);

    // 更新用戶存儲使用量
    updateUserStorage(req.user!.userId, req.file.size);

    // 如果是圖片，生成縮略圖
    if (req.file.mimetype.startsWith('image/')) {
      await generateThumbnail(storageRecord.path, newFile.id);
    }

    res.status(201).json({
      success: true,
      data: newFile
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error.message
      }
    });
  }
});

// 更新用戶存儲
function updateUserStorage(userId: number, sizeDelta: number) {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.storageUsed = (user.storageUsed || 0) + sizeDelta;
  }
}
```

### 3. 分塊上傳實現

```typescript
// 上傳會話
interface UploadSession {
  id: string;
  userId: number;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  createdAt: Date;
  expiresAt: Date;
}

const uploadSessions = new Map<string, UploadSession>();

// 初始化上傳會話
app.post('/api/files/upload-init', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, fileSize, chunkSize = 5 * 1024 * 1024 } = req.body;

    if (!fileName || !fileSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'fileName and fileSize are required'
        }
      });
    }

    // 檢查存儲空間
    const user = users.find(u => u.id === req.user!.userId);
    if (user && (user.storageUsed || 0) + fileSize > user.storageLimit) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'STORAGE_LIMIT_EXCEEDED',
          message: 'Storage limit exceeded'
        }
      });
    }

    const uploadId = crypto.randomBytes(16).toString('hex');
    const totalChunks = Math.ceil(fileSize / chunkSize);

    const session: UploadSession = {
      id: uploadId,
      userId: req.user!.userId,
      fileName,
      fileSize,
      chunkSize,
      totalChunks,
      uploadedChunks: new Set(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小時過期
    };

    uploadSessions.set(uploadId, session);

    // 創建分塊目錄
    const chunkDir = path.join(CHUNK_DIR, uploadId);
    await fs.mkdir(chunkDir, { recursive: true });

    res.json({
      success: true,
      data: {
        uploadId,
        chunkSize,
        totalChunks
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INIT_FAILED',
        message: error.message
      }
    });
  }
});

// 上傳分塊
app.post('/api/files/upload-chunk', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { uploadId, chunkIndex } = req.body;
    const chunkData = req.body.chunkData; // 在實際應用中應該是 Buffer

    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'uploadId and chunkIndex are required'
        }
      });
    }

    const session = uploadSessions.get(uploadId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Upload session not found or expired'
        }
      });
    }

    if (session.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to upload to this session'
        }
      });
    }

    // 保存分塊
    const chunkPath = path.join(CHUNK_DIR, uploadId, `chunk-${chunkIndex}`);
    await fs.writeFile(chunkPath, chunkData);

    // 標記分塊已上傳
    session.uploadedChunks.add(chunkIndex);

    const progress = (session.uploadedChunks.size / session.totalChunks) * 100;

    res.json({
      success: true,
      data: {
        uploadId,
        chunkIndex,
        uploadedChunks: session.uploadedChunks.size,
        totalChunks: session.totalChunks,
        progress: progress.toFixed(2)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CHUNK_UPLOAD_FAILED',
        message: error.message
      }
    });
  }
});

// 完成上傳（合併分塊）
app.post('/api/files/upload-complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { uploadId, folderId } = req.body;

    const session = uploadSessions.get(uploadId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Upload session not found'
        }
      });
    }

    // 檢查所有分塊是否已上傳
    if (session.uploadedChunks.size !== session.totalChunks) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INCOMPLETE_UPLOAD',
          message: `Only ${session.uploadedChunks.size} of ${session.totalChunks} chunks uploaded`
        }
      });
    }

    // 合併分塊
    const finalPath = path.join(UPLOAD_DIR, `${Date.now()}-${session.fileName}`);
    const writeStream = createWriteStream(finalPath);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(CHUNK_DIR, uploadId, `chunk-${i}`);
      const chunkData = await fs.readFile(chunkPath);
      writeStream.write(chunkData);
    }

    writeStream.end();

    // 等待寫入完成
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // 計算哈希
    const hash = await calculateFileHash(finalPath);

    // 檢查去重
    let storageRecord = fileStorage.get(hash);

    if (storageRecord) {
      await fs.unlink(finalPath);
      storageRecord.refCount++;
    } else {
      storageRecord = {
        hash,
        path: finalPath,
        size: session.fileSize,
        refCount: 1
      };
      fileStorage.set(hash, storageRecord);
    }

    // 創建文件記錄
    const newFile: FileRecord = {
      id: files.length + 1,
      name: session.fileName,
      originalName: session.fileName,
      mimeType: 'application/octet-stream', // 需要根據文件擴展名確定
      size: session.fileSize,
      hash,
      storagePath: storageRecord.path,
      folderId: folderId || null,
      ownerId: req.user!.userId,
      isDeleted: false,
      downloads: 0,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    files.push(newFile);

    // 更新存儲使用量
    updateUserStorage(req.user!.userId, session.fileSize);

    // 清理分塊和會話
    const chunkDir = path.join(CHUNK_DIR, uploadId);
    await fs.rm(chunkDir, { recursive: true, force: true });
    uploadSessions.delete(uploadId);

    res.json({
      success: true,
      data: newFile
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPLETE_FAILED',
        message: error.message
      }
    });
  }
});
```

### 4. 文件下載（支持斷點續傳）

```typescript
app.get('/api/files/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = Number(req.params.id);
    const file = files.find(f => f.id === fileId && !f.isDeleted);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // 權限檢查
    if (file.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to download this file'
        }
      });
    }

    // 檢查文件是否存在
    try {
      await fs.access(file.storagePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND_ON_DISK',
          message: 'File not found on disk'
        }
      });
    }

    const stat = await fs.stat(file.storagePath);
    const fileSize = stat.size;

    // 處理範圍請求（斷點續傳）
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const fileStream = createReadStream(file.storagePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`
      });

      fileStream.pipe(res);
    } else {
      // 完整文件下載
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`
      });

      const fileStream = createReadStream(file.storagePath);
      fileStream.pipe(res);
    }

    // 增加下載次數
    file.downloads++;

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: error.message
      }
    });
  }
});
```

### 5. 文件分享功能

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

const shares: Share[] = [];

// 創建分享鏈接
app.post('/api/files/:id/share', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = Number(req.params.id);
    const { password, expiresAt, maxDownloads, permission = 'view' } = req.body;

    const file = files.find(f => f.id === fileId && !f.isDeleted);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    if (file.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to share this file'
        }
      });
    }

    // 生成分享 token
    const token = crypto.randomBytes(16).toString('hex');

    const share: Share = {
      id: shares.length + 1,
      fileId,
      token,
      password,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxDownloads,
      downloads: 0,
      views: 0,
      permission,
      createdBy: req.user!.userId,
      createdAt: new Date()
    };

    shares.push(share);

    const shareUrl = `${req.protocol}://${req.get('host')}/api/share/${token}`;

    res.status(201).json({
      success: true,
      data: {
        share,
        url: shareUrl
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SHARE_FAILED',
        message: error.message
      }
    });
  }
});

// 訪問分享文件
app.get('/api/share/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const share = shares.find(s => s.token === token);

    if (!share) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SHARE_NOT_FOUND',
          message: 'Share not found'
        }
      });
    }

    // 檢查是否過期
    if (share.expiresAt && share.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: {
          code: 'SHARE_EXPIRED',
          message: 'This share has expired'
        }
      });
    }

    // 檢查密碼
    if (share.password) {
      if (!password || password !== share.password) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'PASSWORD_REQUIRED',
            message: 'Password required to access this share'
          }
        });
      }
    }

    const file = files.find(f => f.id === share.fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // 增加訪問次數
    share.views++;

    res.json({
      success: true,
      data: {
        file: {
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          createdAt: file.createdAt
        },
        share: {
          permission: share.permission,
          expiresAt: share.expiresAt,
          remainingDownloads: share.maxDownloads
            ? share.maxDownloads - share.downloads
            : null
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SHARE_ACCESS_FAILED',
        message: error.message
      }
    });
  }
});

// 下載分享文件
app.get('/api/share/:token/download', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const share = shares.find(s => s.token === token);

    if (!share) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SHARE_NOT_FOUND',
          message: 'Share not found'
        }
      });
    }

    // 所有驗證...（同上）

    // 檢查權限
    if (share.permission !== 'download') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'This share does not allow downloads'
        }
      });
    }

    // 檢查下載次數限制
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DOWNLOAD_LIMIT_EXCEEDED',
          message: 'Download limit exceeded'
        }
      });
    }

    const file = files.find(f => f.id === share.fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // 增加下載次數
    share.downloads++;
    file.downloads++;

    // 發送文件（同上）
    res.sendFile(file.storagePath);

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: error.message
      }
    });
  }
});
```

### 6. 文件夾管理

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

const folders: Folder[] = [];

// 創建文件夾
app.post('/api/folders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, parentId, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Folder name is required'
        }
      });
    }

    // 如果有父文件夾，驗證存在且屬於當前用戶
    if (parentId) {
      const parent = folders.find(f =>
        f.id === parentId &&
        f.ownerId === req.user!.userId &&
        !f.isDeleted
      );

      if (!parent) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent folder not found'
          }
        });
      }
    }

    const newFolder: Folder = {
      id: folders.length + 1,
      name,
      parentId: parentId || undefined,
      ownerId: req.user!.userId,
      color,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    folders.push(newFolder);

    res.status(201).json({
      success: true,
      data: newFolder
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_FOLDER_FAILED',
        message: error.message
      }
    });
  }
});

// 獲取文件夾路徑（麵包屑）
app.get('/api/folders/:id/path', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const folderId = Number(req.params.id);

    const folder = folders.find(f =>
      f.id === folderId &&
      f.ownerId === req.user!.userId &&
      !f.isDeleted
    );

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: 'Folder not found'
        }
      });
    }

    // 構建路徑
    const path: Folder[] = [folder];
    let current = folder;

    while (current.parentId) {
      const parent = folders.find(f => f.id === current.parentId);
      if (!parent) break;
      path.unshift(parent);
      current = parent;
    }

    res.json({
      success: true,
      data: {
        path: path.map(f => ({
          id: f.id,
          name: f.name
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PATH_FAILED',
        message: error.message
      }
    });
  }
});
```

### 7. 存儲管理

```typescript
// 獲取存儲統計
app.get('/api/storage/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const userFiles = files.filter(f =>
      f.ownerId === userId &&
      !f.isDeleted
    );

    const totalSize = userFiles.reduce((sum, f) => sum + f.size, 0);

    // 按文件類型分類
    const byType: Record<string, { count: number; size: number }> = {};

    userFiles.forEach(file => {
      const category = getFileCategory(file.mimeType);
      if (!byType[category]) {
        byType[category] = { count: 0, size: 0 };
      }
      byType[category].count++;
      byType[category].size += file.size;
    });

    // 最大的文件
    const largestFiles = [...userFiles]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        mimeType: f.mimeType
      }));

    res.json({
      success: true,
      data: {
        totalSize,
        totalFiles: userFiles.length,
        storageLimit: user.storageLimit,
        storageUsed: user.storageUsed || 0,
        storageAvailable: user.storageLimit - (user.storageUsed || 0),
        byType,
        largestFiles
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATS_FAILED',
        message: error.message
      }
    });
  }
});

function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document'))
    return 'documents';
  return 'others';
}
```

## 完整實現建議

1. **基礎設置**
   - 配置 multer
   - 創建必要的目錄
   - 設置文件類型限制

2. **基礎功能**
   - 單文件上傳
   - 文件下載
   - 文件列表

3. **高級功能**
   - 文件去重
   - 分塊上傳
   - 斷點續傳

4. **組織功能**
   - 文件夾管理
   - 文件移動/複製

5. **分享功能**
   - 分享鏈接
   - 權限控制
   - 過期時間

6. **優化功能**
   - 存儲管理
   - 回收站
   - 版本控制

## 測試建議

```bash
# 上傳文件
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@document.pdf" \
  -F "folderId=1"

# 下載文件
curl http://localhost:3000/api/files/1/download \
  -H "Authorization: Bearer TOKEN" \
  -o downloaded.pdf

# 創建分享鏈接
curl -X POST http://localhost:3000/api/files/1/share \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "secret123",
    "expiresAt": "2024-12-31",
    "permission": "download"
  }'

# 獲取存儲統計
curl http://localhost:3000/api/storage/stats \
  -H "Authorization: Bearer TOKEN"
```
