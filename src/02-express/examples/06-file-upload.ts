/**
 * 文件上傳處理示例
 *
 * 本示例展示：
 * 1. 使用 multer 處理文件上傳
 * 2. 單文件和多文件上傳
 * 3. 文件類型驗證
 * 4. 文件大小限制
 * 5. 自定義文件名
 * 6. 文件存儲（本地和內存）
 * 7. 圖片處理（sharp）
 * 8. 文件下載和刪除
 */

import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import sharp from 'sharp';

const app = express();
app.use(express.json());

// ==================== 配置 ====================

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const THUMBNAIL_DIR = path.join(__dirname, 'uploads', 'thumbnails');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 確保上傳目錄存在
async function ensureUploadDirs() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
}

ensureUploadDirs();

// ==================== 類型定義 ====================

interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: Date;
  thumbnailPath?: string;
}

// ==================== 文件存儲 ====================

const fileDatabase: UploadedFile[] = [];

// ==================== Multer 配置 ====================

/**
 * 磁盤存儲配置
 */
const diskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：時間戳-隨機字符串-原始文件名
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const safeFileName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${safeFileName}-${uniqueSuffix}${ext}`);
  }
});

/**
 * 內存存儲配置（用於臨時處理）
 */
const memoryStorage = multer.memoryStorage();

/**
 * 文件過濾器 - 只允許圖片
 */
const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

/**
 * 文件過濾器 - 只允許文檔
 */
const documentFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only document files (PDF, DOC, DOCX, XLS, XLSX, TXT) are allowed'));
  }
};

/**
 * Multer 實例 - 單個圖片上傳
 */
const uploadSingleImage = multer({
  storage: diskStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
}).single('image');

/**
 * Multer 實例 - 多個圖片上傳
 */
const uploadMultipleImages = multer({
  storage: diskStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10  // 最多 10 個文件
  }
}).array('images', 10);

/**
 * Multer 實例 - 多個不同字段的文件上傳
 */
const uploadMultipleFields = multer({
  storage: diskStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'gallery', maxCount: 5 },
  { name: 'documents', maxCount: 3 }
]);

/**
 * Multer 實例 - 任意字段的文件上傳
 */
const uploadAny = multer({
  storage: diskStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
}).any();

/**
 * Multer 實例 - 內存存儲（用於圖片處理）
 */
const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
}).single('image');

// ==================== 工具函數 ====================

/**
 * 生成縮略圖
 */
async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  width: number = 200,
  height: number = 200
): Promise<void> {
  await sharp(inputPath)
    .resize(width, height, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toFile(outputPath);
}

/**
 * 壓縮圖片
 */
async function compressImage(
  inputPath: string,
  outputPath: string,
  quality: number = 80
): Promise<void> {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
    await image.jpeg({ quality }).toFile(outputPath);
  } else if (metadata.format === 'png') {
    await image.png({ quality }).toFile(outputPath);
  } else if (metadata.format === 'webp') {
    await image.webp({ quality }).toFile(outputPath);
  } else {
    // 其他格式轉為 JPEG
    await image.jpeg({ quality }).toFile(outputPath);
  }
}

/**
 * 獲取圖片信息
 */
async function getImageInfo(filePath: string) {
  const metadata = await sharp(filePath).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    space: metadata.space,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha
  };
}

/**
 * 保存文件信息到數據庫
 */
function saveFileToDatabase(file: Express.Multer.File, thumbnailPath?: string): UploadedFile {
  const fileRecord: UploadedFile = {
    id: crypto.randomBytes(16).toString('hex'),
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    uploadedAt: new Date(),
    ...(thumbnailPath && { thumbnailPath })
  };

  fileDatabase.push(fileRecord);
  return fileRecord;
}

/**
 * 從數據庫查找文件
 */
function findFileById(id: string): UploadedFile | undefined {
  return fileDatabase.find(f => f.id === id);
}

/**
 * 刪除文件
 */
async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
}

// ==================== Multer 錯誤處理包裝器 ====================

/**
 * 包裝 multer 中間件以處理錯誤
 */
function handleMulterError(uploadMiddleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        // Multer 錯誤
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds the limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
            }
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'TOO_MANY_FILES',
              message: 'Too many files uploaded'
            }
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'UNEXPECTED_FIELD',
              message: 'Unexpected field name'
            }
          });
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message
          }
        });
      } else if (err) {
        // 其他錯誤（如文件類型錯誤）
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: err.message
          }
        });
      }

      next();
    });
  };
}

// ==================== 路由 ====================

/**
 * POST /upload/single - 單個文件上傳
 */
app.post('/upload/single', handleMulterError(uploadSingleImage), async (req: Request, res: Response) => {
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

    // 生成縮略圖
    const thumbnailFilename = `thumb_${req.file.filename}`;
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);
    await generateThumbnail(req.file.path, thumbnailPath);

    // 保存文件信息
    const fileRecord = saveFileToDatabase(req.file, thumbnailPath);

    // 獲取圖片信息
    const imageInfo = await getImageInfo(req.file.path);

    res.status(201).json({
      success: true,
      data: {
        file: fileRecord,
        imageInfo
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * POST /upload/multiple - 多個文件上傳
 */
app.post('/upload/multiple', handleMulterError(uploadMultipleImages), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files uploaded'
        }
      });
    }

    const uploadedFiles: UploadedFile[] = [];

    // 處理每個文件
    for (const file of req.files) {
      // 生成縮略圖
      const thumbnailFilename = `thumb_${file.filename}`;
      const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);
      await generateThumbnail(file.path, thumbnailPath);

      // 保存文件信息
      const fileRecord = saveFileToDatabase(file, thumbnailPath);
      uploadedFiles.push(fileRecord);
    }

    res.status(201).json({
      success: true,
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * POST /upload/fields - 多個字段的文件上傳
 */
app.post('/upload/fields', handleMulterError(uploadMultipleFields), async (req: Request, res: Response) => {
  try {
    if (!req.files) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files uploaded'
        }
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const result: any = {};

    // 處理 avatar
    if (files.avatar && files.avatar.length > 0) {
      const file = files.avatar[0];
      const thumbnailFilename = `thumb_${file.filename}`;
      const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);
      await generateThumbnail(file.path, thumbnailPath);
      result.avatar = saveFileToDatabase(file, thumbnailPath);
    }

    // 處理 gallery
    if (files.gallery && files.gallery.length > 0) {
      result.gallery = [];
      for (const file of files.gallery) {
        const thumbnailFilename = `thumb_${file.filename}`;
        const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);
        await generateThumbnail(file.path, thumbnailPath);
        result.gallery.push(saveFileToDatabase(file, thumbnailPath));
      }
    }

    // 處理 documents
    if (files.documents && files.documents.length > 0) {
      result.documents = files.documents.map(file => saveFileToDatabase(file));
    }

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * POST /upload/process - 上傳並處理圖片（使用內存存儲）
 */
app.post('/upload/process', handleMulterError(uploadToMemory), async (req: Request, res: Response) => {
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

    const { width, height, quality = 80 } = req.query;

    // 生成文件名
    const filename = `processed-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
    const outputPath = path.join(UPLOAD_DIR, filename);

    let image = sharp(req.file.buffer);

    // 調整大小
    if (width || height) {
      image = image.resize(
        width ? parseInt(width as string) : undefined,
        height ? parseInt(height as string) : undefined,
        {
          fit: 'inside',
          withoutEnlargement: true
        }
      );
    }

    // 轉換為 JPEG 並保存
    await image
      .jpeg({ quality: parseInt(quality as string) })
      .toFile(outputPath);

    // 獲取文件信息
    const stats = await fs.stat(outputPath);

    const fileRecord: UploadedFile = {
      id: crypto.randomBytes(16).toString('hex'),
      originalName: req.file.originalname,
      filename,
      mimetype: 'image/jpeg',
      size: stats.size,
      path: outputPath,
      uploadedAt: new Date()
    };

    fileDatabase.push(fileRecord);

    const imageInfo = await getImageInfo(outputPath);

    res.status(201).json({
      success: true,
      data: {
        file: fileRecord,
        imageInfo
      }
    });
  } catch (error: any) {
    console.error('Processing error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * GET /files - 獲取所有文件列表
 */
app.get('/files', (req: Request, res: Response) => {
  const files = fileDatabase.map(f => ({
    id: f.id,
    originalName: f.originalName,
    filename: f.filename,
    mimetype: f.mimetype,
    size: f.size,
    uploadedAt: f.uploadedAt,
    downloadUrl: `/files/${f.id}/download`,
    ...(f.thumbnailPath && { thumbnailUrl: `/files/${f.id}/thumbnail` })
  }));

  res.json({
    success: true,
    data: {
      files,
      count: files.length
    }
  });
});

/**
 * GET /files/:id - 獲取文件信息
 */
app.get('/files/:id', (req: Request, res: Response) => {
  const file = findFileById(req.params.id);

  if (!file) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'File not found'
      }
    });
  }

  res.json({
    success: true,
    data: {
      ...file,
      downloadUrl: `/files/${file.id}/download`,
      ...(file.thumbnailPath && { thumbnailUrl: `/files/${file.id}/thumbnail` })
    }
  });
});

/**
 * GET /files/:id/download - 下載文件
 */
app.get('/files/:id/download', async (req: Request, res: Response) => {
  try {
    const file = findFileById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // 檢查文件是否存在
    try {
      await fs.access(file.path);
    } catch {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found on disk'
        }
      });
    }

    // 設置響應頭
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);

    // 發送文件
    res.sendFile(file.path);
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * GET /files/:id/thumbnail - 獲取縮略圖
 */
app.get('/files/:id/thumbnail', async (req: Request, res: Response) => {
  try {
    const file = findFileById(req.params.id);

    if (!file || !file.thumbnailPath) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'THUMBNAIL_NOT_FOUND',
          message: 'Thumbnail not found'
        }
      });
    }

    // 檢查縮略圖是否存在
    try {
      await fs.access(file.thumbnailPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: {
          code: 'THUMBNAIL_NOT_FOUND',
          message: 'Thumbnail not found on disk'
        }
      });
    }

    // 發送縮略圖
    res.sendFile(file.thumbnailPath);
  } catch (error: any) {
    console.error('Thumbnail error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'THUMBNAIL_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * DELETE /files/:id - 刪除文件
 */
app.delete('/files/:id', async (req: Request, res: Response) => {
  try {
    const fileIndex = fileDatabase.findIndex(f => f.id === req.params.id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    const file = fileDatabase[fileIndex];

    // 刪除文件
    await deleteFile(file.path);

    // 刪除縮略圖
    if (file.thumbnailPath) {
      await deleteFile(file.thumbnailPath);
    }

    // 從數據庫移除
    fileDatabase.splice(fileIndex, 1);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: error.message
      }
    });
  }
});

// ==================== 錯誤處理 ====================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// ==================== 啟動服務器 ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
  console.log(`Thumbnail directory: ${THUMBNAIL_DIR}`);
  console.log('\nAPI Endpoints:');
  console.log('  POST   /upload/single - 單個文件上傳');
  console.log('  POST   /upload/multiple - 多個文件上傳');
  console.log('  POST   /upload/fields - 多個字段的文件上傳');
  console.log('  POST   /upload/process - 上傳並處理圖片');
  console.log('  GET    /files - 獲取所有文件列表');
  console.log('  GET    /files/:id - 獲取文件信息');
  console.log('  GET    /files/:id/download - 下載文件');
  console.log('  GET    /files/:id/thumbnail - 獲取縮略圖');
  console.log('  DELETE /files/:id - 刪除文件');
  console.log('\nExample usage:');
  console.log('  curl -F "image=@path/to/image.jpg" http://localhost:3000/upload/single');
  console.log('  curl -F "images=@image1.jpg" -F "images=@image2.jpg" http://localhost:3000/upload/multiple');
});

export default app;
