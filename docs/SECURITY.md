# Node.js 安全最佳實踐指南

## 目錄
- [輸入驗證](#輸入驗證)
- [身份驗證與授權](#身份驗證與授權)
- [數據加密](#數據加密)
- [依賴安全](#依賴安全)
- [SQL/NoSQL 注入防護](#sqlnosql-注入防護)
- [XSS 和 CSRF 防護](#xss-和-csrf-防護)
- [速率限制與 DDoS 防護](#速率限制與-ddos-防護)
- [安全頭設置](#安全頭設置)
- [敏感數據處理](#敏感數據處理)
- [常見安全漏洞](#常見安全漏洞)
- [安全工具](#安全工具)

## 輸入驗證

### 1. 使用驗證庫

```javascript
// 使用 Joi 進行數據驗證
const Joi = require('joi');

// 定義驗證模式
const userSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),

  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.pattern.base': '密碼必須包含至少8個字符，包括大小寫字母、數字和特殊字符'
    }),

  age: Joi.number()
    .integer()
    .min(18)
    .max(120),

  website: Joi.string()
    .uri(),

  birthdate: Joi.date()
    .max('now')
});

// 驗證中間件
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // 返回所有錯誤
      stripUnknown: true // 移除未知字段
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        errors
      });
    }

    req.validatedData = value;
    next();
  };
};

// 使用示例
app.post('/api/users', validateRequest(userSchema), async (req, res) => {
  const user = await createUser(req.validatedData);
  res.json({ success: true, data: user });
});
```

### 2. 文件上傳驗證

```javascript
const multer = require('multer');
const path = require('path');

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.original));
  }
});

// 文件過濾器
const fileFilter = (req, file, cb) => {
  // 允許的文件類型
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('只允許上傳 JPEG, PNG, GIF 或 PDF 文件'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 限制
    files: 5 // 最多5個文件
  }
});

// 使用示例
app.post('/api/upload', upload.array('photos', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '請選擇要上傳的文件' });
  }

  res.json({
    success: true,
    files: req.files.map(f => ({
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype
    }))
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件太大，最大允許 5MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: '最多只能上傳 5 個文件' });
    }
  }
  next(err);
});
```

### 3. 路徑遍歷防護

```javascript
const path = require('path');
const fs = require('fs').promises;

// ❌ 危險：未驗證的路徑
app.get('/download', async (req, res) => {
  const filename = req.query.file;
  const filePath = `./uploads/${filename}`; // 可能訪問 ../../../etc/passwd
  res.sendFile(filePath);
});

// ✅ 安全：驗證路徑
app.get('/download', async (req, res) => {
  const filename = req.query.file;

  // 移除路徑遍歷字符
  const sanitizedFilename = path.basename(filename);

  // 構建安全路徑
  const uploadsDir = path.resolve('./uploads');
  const filePath = path.join(uploadsDir, sanitizedFilename);

  // 驗證文件在允許的目錄內
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(403).json({ error: '訪問被拒絕' });
  }

  // 檢查文件是否存在
  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    res.status(404).json({ error: '文件不存在' });
  }
});
```

## 身份驗證與授權

### 1. JWT 身份驗證

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// 配置
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// 生成令牌
function generateTokens(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'myapp',
    audience: 'myapp-users'
  });

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

// 驗證令牌中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '未提供身份驗證令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'myapp',
      audience: 'myapp-users'
    });

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已過期' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: '無效的令牌' });
    }
    return res.status(500).json({ error: '令牌驗證失敗' });
  }
};

// 登錄端點
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // 查找用戶
  const user = await db.users.findOne({ where: { email } });

  if (!user) {
    // 使用通用錯誤消息防止用戶枚舉
    return res.status(401).json({ error: '郵箱或密碼錯誤' });
  }

  // 驗證密碼
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    // 記錄失敗嘗試
    await logFailedLogin(user.id, req.ip);
    return res.status(401).json({ error: '郵箱或密碼錯誤' });
  }

  // 檢查賬戶是否被鎖定
  if (user.isLocked) {
    return res.status(403).json({ error: '賬戶已被鎖定，請聯繫管理員' });
  }

  // 生成令牌
  const tokens = generateTokens(user);

  // 保存刷新令牌（可選，用於撤銷）
  await db.refreshTokens.create({
    userId: user.id,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      ...tokens
    }
  });
});

// 刷新令牌端點
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: '未提供刷新令牌' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(403).json({ error: '無效的令牌類型' });
    }

    // 檢查令牌是否在數據庫中（未被撤銷）
    const tokenRecord = await db.refreshTokens.findOne({
      where: { token: refreshToken, userId: decoded.userId }
    });

    if (!tokenRecord) {
      return res.status(403).json({ error: '令牌已被撤銷' });
    }

    // 獲取用戶信息
    const user = await db.users.findByPk(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 生成新令牌
    const tokens = generateTokens(user);

    // 刪除舊令牌，保存新令牌
    await tokenRecord.destroy();
    await db.refreshTokens.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.json({ success: true, data: tokens });
  } catch (error) {
    res.status(403).json({ error: '無效或過期的刷新令牌' });
  }
});
```

### 2. 基於角色的訪問控制（RBAC）

```javascript
// 角色定義
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
  GUEST: 'guest'
};

// 權限定義
const PERMISSIONS = {
  // 用戶管理
  'users:read': [ROLES.ADMIN, ROLES.MODERATOR],
  'users:create': [ROLES.ADMIN],
  'users:update': [ROLES.ADMIN],
  'users:delete': [ROLES.ADMIN],

  // 文章管理
  'posts:read': [ROLES.ADMIN, ROLES.MODERATOR, ROLES.USER, ROLES.GUEST],
  'posts:create': [ROLES.ADMIN, ROLES.USER],
  'posts:update': [ROLES.ADMIN, ROLES.MODERATOR],
  'posts:delete': [ROLES.ADMIN, ROLES.MODERATOR],

  // 評論管理
  'comments:create': [ROLES.ADMIN, ROLES.USER],
  'comments:delete': [ROLES.ADMIN, ROLES.MODERATOR]
};

// 檢查權限中間件
const requirePermission = (permission) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({ error: '未授權' });
    }

    const allowedRoles = PERMISSIONS[permission];

    if (!allowedRoles || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: '權限不足',
        required: permission
      });
    }

    next();
  };
};

// 檢查角色中間件
const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        error: '權限不足',
        required: roles
      });
    }

    next();
  };
};

// 使用示例
app.get('/api/users',
  authenticateToken,
  requirePermission('users:read'),
  async (req, res) => {
    const users = await db.users.findAll();
    res.json({ success: true, data: users });
  }
);

app.delete('/api/users/:id',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    await db.users.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  }
);

// 資源所有權檢查
const requireOwnership = (resourceGetter) => {
  return async (req, res, next) => {
    try {
      const resource = await resourceGetter(req);

      if (!resource) {
        return res.status(404).json({ error: '資源不存在' });
      }

      // 管理員可以訪問所有資源
      if (req.user.role === ROLES.ADMIN) {
        req.resource = resource;
        return next();
      }

      // 檢查所有權
      if (resource.userId !== req.user.userId) {
        return res.status(403).json({ error: '只能操作自己的資源' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// 使用示例
app.put('/api/posts/:id',
  authenticateToken,
  requireOwnership(async (req) => {
    return await db.posts.findByPk(req.params.id);
  }),
  async (req, res) => {
    await req.resource.update(req.body);
    res.json({ success: true, data: req.resource });
  }
);
```

## 數據加密

### 1. 密碼加密

```javascript
const bcrypt = require('bcrypt');

// 加密密碼
async function hashPassword(password) {
  const saltRounds = 12; // 增加 salt 輪數提高安全性
  return await bcrypt.hash(password, saltRounds);
}

// 驗證密碼
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// 註冊用戶
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  // 檢查密碼強度
  if (password.length < 8) {
    return res.status(400).json({ error: '密碼至少需要8個字符' });
  }

  // 檢查用戶是否已存在
  const existingUser = await db.users.findOne({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: '該郵箱已被註冊' });
  }

  // 加密密碼
  const passwordHash = await hashPassword(password);

  // 創建用戶
  const user = await db.users.create({
    email,
    name,
    passwordHash // 永遠不要存儲明文密碼！
  });

  // 不要在響應中返回密碼哈希
  const { passwordHash: _, ...userWithoutPassword } = user.toJSON();

  res.status(201).json({
    success: true,
    data: userWithoutPassword
  });
});
```

### 2. 數據加密/解密

```javascript
const crypto = require('crypto');

// 加密配置
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// 加密函數
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // 返回 iv + authTag + encrypted
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

// 解密函數
function decrypt(encryptedData) {
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(
    encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
    'hex'
  );
  const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// 使用示例：加密敏感數據
async function saveUserPaymentMethod(userId, cardNumber) {
  const encryptedCardNumber = encrypt(cardNumber);

  await db.paymentMethods.create({
    userId,
    cardNumber: encryptedCardNumber, // 存儲加密後的數據
    lastFourDigits: cardNumber.slice(-4) // 存儲後4位用於顯示
  });
}

// 讀取時解密
async function getUserPaymentMethod(userId) {
  const paymentMethod = await db.paymentMethods.findOne({
    where: { userId }
  });

  if (!paymentMethod) return null;

  return {
    ...paymentMethod.toJSON(),
    cardNumber: decrypt(paymentMethod.cardNumber)
  };
}
```

### 3. HTTPS 配置

```javascript
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();

// 讀取 SSL 證書
const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem'),
  ca: fs.readFileSync('path/to/ca-certificate.pem'), // 可選

  // 安全配置
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES256-GCM-SHA384'
  ].join(':'),
  honorCipherOrder: true
};

// 創建 HTTPS 服務器
const httpsServer = https.createServer(options, app);

httpsServer.listen(443, () => {
  console.log('HTTPS Server running on port 443');
});

// HTTP 重定向到 HTTPS
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(301, {
    Location: `https://${req.headers.host}${req.url}`
  });
  res.end();
}).listen(80);
```

## 依賴安全

### 1. 定期審計依賴

```bash
# 檢查已知漏洞
npm audit

# 自動修復漏洞
npm audit fix

# 強制修復（可能有破壞性更改）
npm audit fix --force

# 查看詳細報告
npm audit --json
```

### 2. package.json 安全配置

```json
{
  "name": "myapp",
  "version": "1.0.0",
  "scripts": {
    "preinstall": "npx npm-force-resolutions",
    "audit": "npm audit --audit-level=high",
    "audit:fix": "npm audit fix"
  },
  "resolutions": {
    "vulnerable-package": "^2.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### 3. 使用安全工具

```javascript
// .snyk 文件 - Snyk 配置
// version: v1.22.0
// ignore:
//   SNYK-JS-LODASH-567746:
//     - '*':
//         reason: 'No upgrade available'
//         expires: '2024-12-31'

// 使用 Snyk 測試
// npm install -g snyk
// snyk test
// snyk monitor
```

## SQL/NoSQL 注入防護

### 1. SQL 注入防護

```javascript
const { Sequelize, DataTypes } = require('sequelize');

// ❌ 危險：字符串拼接
app.get('/users', async (req, res) => {
  const { name } = req.query;
  const query = `SELECT * FROM users WHERE name = '${name}'`; // SQL 注入風險！
  const users = await sequelize.query(query);
  res.json(users);
});

// ✅ 安全：使用參數化查詢
app.get('/users', async (req, res) => {
  const { name } = req.query;

  // 方法1：使用佔位符
  const users = await sequelize.query(
    'SELECT * FROM users WHERE name = ?',
    {
      replacements: [name],
      type: Sequelize.QueryTypes.SELECT
    }
  );

  // 方法2：使用命名參數
  const users2 = await sequelize.query(
    'SELECT * FROM users WHERE name = :name',
    {
      replacements: { name },
      type: Sequelize.QueryTypes.SELECT
    }
  );

  // 方法3：使用 ORM
  const users3 = await User.findAll({
    where: { name }
  });

  res.json(users);
});
```

### 2. NoSQL 注入防護（MongoDB）

```javascript
const mongoose = require('mongoose');

// ❌ 危險：直接使用用戶輸入
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // 如果 username 是 { $gt: "" }，將匹配所有用戶！
  const user = await User.findOne({ username, password });

  if (user) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: '登錄失敗' });
  }
});

// ✅ 安全：驗證和清理輸入
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // 確保輸入是字符串
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: '無效的輸入' });
  }

  // 使用嚴格模式查詢
  const user = await User.findOne({
    username: { $eq: username } // 明確使用 $eq 操作符
  }).select('+password'); // 密碼字段默認不查詢

  if (!user) {
    return res.status(401).json({ error: '用戶名或密碼錯誤' });
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(401).json({ error: '用戶名或密碼錯誤' });
  }

  res.json({ success: true });
});

// 使用 express-mongo-sanitize 自動清理
const mongoSanitize = require('express-mongo-sanitize');

app.use(mongoSanitize({
  replaceWith: '_', // 替換 $ 和 . 字符
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key}`);
  }
}));
```

## XSS 和 CSRF 防護

### 1. XSS 防護

```javascript
const helmet = require('helmet');
const xss = require('xss-clean');
const DOMPurify = require('isomorphic-dompurify');

// 使用 Helmet 設置安全頭
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  xssFilter: true,
  noSniff: true,
  ieNoOpen: true
}));

// XSS 清理中間件
app.use(xss());

// 清理 HTML 輸入
function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
}

// 使用示例
app.post('/api/posts', async (req, res) => {
  const { title, content } = req.body;

  const post = await db.posts.create({
    title: sanitizeHtml(title),
    content: sanitizeHtml(content),
    userId: req.user.id
  });

  res.json({ success: true, data: post });
});

// 在模板中轉義輸出（使用 EJS 示例）
// <%= userInput %> - 自動轉義
// <%- userInput %> - 不轉義（危險，除非已清理）
```

### 2. CSRF 防護

```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// 設置 cookie 解析器
app.use(cookieParser());

// CSRF 保護中間件
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// 對需要保護的路由應用中間件
app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/submit', csrfProtection, (req, res) => {
  res.json({ success: true });
});

// API 可以使用雙重提交 Cookie 模式
const doubleCsrf = require('csrf-csrf');

const {
  generateToken,
  validateRequest,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token']
});

app.use(doubleCsrfProtection);

// 生成令牌端點
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
});
```

## 速率限制與 DDoS 防護

### 1. 速率限制

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// 全局速率限制
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 最多 100 個請求
  message: '請求過於頻繁，請稍後再試',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: '請求過於頻繁',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// 登錄端點嚴格限制
const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:login:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 15 分鐘內最多嘗試 5 次
  skipSuccessfulRequests: true, // 成功的請求不計數
  keyGenerator: (req) => {
    // 基於 IP 和用戶名限制
    return `${req.ip}-${req.body.email}`;
  }
});

// API 速率限制
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: 60, // 每分鐘 60 個請求
  keyGenerator: (req) => {
    // 認證用戶基於用戶 ID，未認證基於 IP
    return req.user?.id || req.ip;
  }
});

// 應用限制器
app.use('/api/', globalLimiter);
app.post('/api/auth/login', loginLimiter, loginHandler);
app.use('/api/', apiLimiter);
```

### 2. DDoS 防護

```javascript
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const slowDown = require('express-slow-down');

// 速度限制（漸進式延遲）
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50, // 前 50 個請求正常
  delayMs: 500 // 之後每個請求延遲 500ms
});

// HTTP 參數污染防護
app.use(hpp({
  whitelist: ['filter', 'sort'] // 允許重複的參數
}));

// 請求體大小限制
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 連接超時
const timeout = require('connect-timeout');
app.use(timeout('30s'));

// 慢速攻擊防護
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: '請求超時' });
  });
  next();
});
```

## 安全頭設置

```javascript
const helmet = require('helmet');

app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'trusted-cdn.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'api.example.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },

  // HSTS - 強制 HTTPS
  hsts: {
    maxAge: 31536000, // 1 年
    includeSubDomains: true,
    preload: true
  },

  // 防止點擊劫持
  frameguard: {
    action: 'deny'
  },

  // 禁用客戶端緩存
  noCache: false,

  // XSS 過濾器
  xssFilter: true,

  // 防止 MIME 類型嗅探
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // 權限策略
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  }
}));

// 自定義安全頭
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

## 敏感數據處理

### 1. 環境變量管理

```javascript
// ❌ 不要硬編碼敏感信息
const API_KEY = 'sk_live_abc123xyz';
const DB_PASSWORD = 'mypassword123';

// ✅ 使用環境變量
require('dotenv').config();

const config = {
  apiKey: process.env.API_KEY,
  dbPassword: process.env.DB_PASSWORD,
  jwtSecret: process.env.JWT_SECRET
};

// 驗證必需的環境變量
const requiredEnvVars = ['API_KEY', 'DB_PASSWORD', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}
```

### 2. 安全日誌記錄

```javascript
const winston = require('winston');

// 敏感字段過濾器
const sensitiveFields = ['password', 'token', 'apiKey', 'ssn', 'creditCard'];

function maskSensitiveData(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const masked = { ...data };

  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***REDACTED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

// 創建日誌記錄器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format((info) => {
      // 過濾敏感數據
      if (info.data) {
        info.data = maskSensitiveData(info.data);
      }
      return info;
    })(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// 使用示例
logger.info('User login attempt', {
  data: {
    email: 'user@example.com',
    password: 'secret123', // 將被遮蔽
    ip: req.ip
  }
});
```

### 3. 數據脫敏

```javascript
// 脫敏函數
function maskEmail(email) {
  const [name, domain] = email.split('@');
  const maskedName = name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  return `${maskedName}@${domain}`;
}

function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function maskCardNumber(cardNumber) {
  return cardNumber.replace(/(\d{4})\d{8}(\d{4})/, '$1********$2');
}

// API 響應中使用
app.get('/api/users/:id', async (req, res) => {
  const user = await db.users.findByPk(req.params.id);

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      // 不包含密碼等敏感信息
    }
  });
});
```

## 常見安全漏洞

### 1. 不安全的反序列化

```javascript
// ❌ 危險：eval 和 Function 構造器
const userInput = req.body.code;
eval(userInput); // 極度危險！

// ❌ 危險：不安全的 JSON 解析
const data = JSON.parse(req.body.data); // 可能觸發 prototype pollution

// ✅ 安全：使用安全的解析器
const safeJsonParse = require('secure-json-parse');
const data = safeJsonParse.parse(req.body.data);
```

### 2. 原型污染防護

```javascript
// 防止原型污染的輔助函數
function sanitizeObject(obj) {
  const sanitized = {};

  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    sanitized[key] = obj[key];
  }

  return sanitized;
}

// 使用中間件防護
app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
});
```

### 3. 服務器端請求偽造（SSRF）防護

```javascript
const axios = require('axios');
const isPrivateIp = require('private-ip');
const { URL } = require('url');

// SSRF 防護函數
async function safeFetch(urlString) {
  try {
    const url = new URL(urlString);

    // 只允許 HTTP 和 HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('只允許 HTTP/HTTPS 協議');
    }

    // 檢查是否為私有 IP
    if (isPrivateIp(url.hostname)) {
      throw new Error('不允許訪問內部網絡');
    }

    // 禁止訪問本地地址
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHosts.includes(url.hostname)) {
      throw new Error('不允許訪問本地地址');
    }

    // 白名單檢查（推薦）
    const allowedDomains = ['api.example.com', 'cdn.example.com'];
    if (!allowedDomains.some(domain => url.hostname.endsWith(domain))) {
      throw new Error('域名不在白名單中');
    }

    // 執行請求
    const response = await axios.get(urlString, {
      timeout: 5000,
      maxRedirects: 0 // 禁止重定向
    });

    return response.data;
  } catch (error) {
    throw new Error(`SSRF 防護：${error.message}`);
  }
}
```

## 安全工具

### 推薦的 NPM 包

```json
{
  "dependencies": {
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.0.0",
    "express-mongo-sanitize": "^2.2.0",
    "xss-clean": "^0.1.1",
    "hpp": "^0.2.3",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "joi": "^17.9.0",
    "dotenv": "^16.0.0",
    "winston": "^3.8.0",
    "csurf": "^1.11.0"
  },
  "devDependencies": {
    "snyk": "^1.1000.0",
    "npm-audit-resolver": "^3.0.0",
    "eslint-plugin-security": "^1.7.0"
  }
}
```

### 安全檢查清單

```markdown
## 部署前安全檢查清單

### 認證與授權
- [ ] 使用強密碼策略
- [ ] 實施多因素認證（MFA）
- [ ] JWT 令牌正確配置
- [ ] 會話管理安全
- [ ] 正確實施 RBAC

### 數據保護
- [ ] 敏感數據加密存儲
- [ ] HTTPS 強制使用
- [ ] 數據庫連接加密
- [ ] 備份數據加密

### 輸入驗證
- [ ] 所有輸入經過驗證
- [ ] 參數化查詢防止注入
- [ ] 文件上傳限制和驗證
- [ ] XSS 防護

### 錯誤處理
- [ ] 不暴露敏感錯誤信息
- [ ] 統一錯誤處理
- [ ] 日誌記錄完善
- [ ] 敏感數據不記錄日誌

### 依賴管理
- [ ] 依賴定期更新
- [ ] 無已知漏洞
- [ ] 使用鎖定文件
- [ ] 定期安全審計

### 網絡安全
- [ ] CSRF 保護
- [ ] 速率限制
- [ ] CORS 正確配置
- [ ] 安全頭設置

### 配置安全
- [ ] 環境變量管理
- [ ] 無硬編碼密鑰
- [ ] 生產環境禁用調試
- [ ] 最小權限原則

### 監控
- [ ] 安全事件監控
- [ ] 異常活動告警
- [ ] 日誌定期審查
- [ ] 漏洞掃描
```

## 參考資源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
