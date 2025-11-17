# Node.js 部署指南

## 目錄
- [生產環境準備](#生產環境準備)
- [環境變量管理](#環境變量管理)
- [進程管理](#進程管理)
- [反向代理配置](#反向代理配置)
- [Docker 部署](#docker-部署)
- [容器編排](#容器編排)
- [CI/CD 流程](#cicd-流程)
- [雲平台部署](#雲平台部署)
- [監控與日誌](#監控與日誌)
- [故障恢復](#故障恢復)

## 生產環境準備

### 1. 生產環境檢查清單

```javascript
// check-production-readiness.js
const checks = {
  environment: () => {
    console.log('✓ 檢查環境變量');
    const required = [
      'NODE_ENV',
      'PORT',
      'DB_HOST',
      'DB_PASSWORD',
      'JWT_SECRET',
      'REDIS_HOST'
    ];

    const missing = required.filter(env => !process.env[env]);

    if (missing.length > 0) {
      console.error('✗ 缺少環境變量:', missing);
      return false;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('✗ NODE_ENV 必須設置為 production');
      return false;
    }

    return true;
  },

  dependencies: () => {
    console.log('✓ 檢查依賴');
    const package = require('./package.json');

    // 檢查是否有未使用的開發依賴
    if (package.devDependencies) {
      console.warn('⚠ 建議在生產環境不安裝 devDependencies');
    }

    return true;
  },

  security: () => {
    console.log('✓ 檢查安全配置');

    // 檢查是否存在敏感文件
    const fs = require('fs');
    const sensitiveFiles = ['.env', '.env.local', 'credentials.json'];

    const found = sensitiveFiles.filter(file =>
      fs.existsSync(file)
    );

    if (found.length > 0) {
      console.error('✗ 發現敏感文件:', found);
      console.error('  這些文件不應部署到生產環境');
      return false;
    }

    return true;
  },

  database: async () => {
    console.log('✓ 檢查數據庫連接');

    try {
      const { sequelize } = require('./models');
      await sequelize.authenticate();
      console.log('  數據庫連接成功');
      return true;
    } catch (error) {
      console.error('✗ 數據庫連接失敗:', error.message);
      return false;
    }
  },

  redis: async () => {
    console.log('✓ 檢查 Redis 連接');

    try {
      const redis = require('./config/redis');
      await redis.ping();
      console.log('  Redis 連接成功');
      return true;
    } catch (error) {
      console.error('✗ Redis 連接失敗:', error.message);
      return false;
    }
  }
};

async function runChecks() {
  console.log('開始生產環境就緒檢查...\n');

  const results = await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      try {
        return await check();
      } catch (error) {
        console.error(`✗ ${name} 檢查失敗:`, error);
        return false;
      }
    })
  );

  const allPassed = results.every(r => r === true);

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✓ 所有檢查通過，可以部署');
    process.exit(0);
  } else {
    console.log('✗ 部分檢查失敗，請修復後再部署');
    process.exit(1);
  }
}

if (require.main === module) {
  runChecks();
}
```

### 2. package.json 配置

```json
{
  "name": "myapp",
  "version": "1.0.0",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "npm run clean && npm run compile",
    "test": "jest --coverage",
    "lint": "eslint .",
    "preproduction": "npm run test && npm run lint",
    "production": "NODE_ENV=production node server.js",
    "check-readiness": "node scripts/check-production-readiness.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

## 環境變量管理

### 1. .env 文件結構

```bash
# .env.production
# 應用配置
NODE_ENV=production
PORT=3000
APP_NAME=MyApp
APP_URL=https://myapp.com

# 數據庫
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_NAME=myapp_prod
DB_USER=myapp_user
DB_PASSWORD=<strong_password>
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20

# Redis
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<redis_password>
REDIS_TLS=true

# 安全
JWT_SECRET=<long_random_string>
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=<32_byte_hex_string>
SESSION_SECRET=<session_secret>

# API 密鑰
AWS_ACCESS_KEY_ID=<aws_key>
AWS_SECRET_ACCESS_KEY=<aws_secret>
AWS_REGION=us-east-1
S3_BUCKET=myapp-uploads

# 郵件服務
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASSWORD=<app_password>

# 監控
SENTRY_DSN=<sentry_dsn>
LOG_LEVEL=info
```

### 2. 環境變量加載

```javascript
// config/env.js
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const env = process.env.NODE_ENV || 'development';

  // 按優先級加載環境變量
  const envFiles = [
    `.env.${env}.local`,
    `.env.${env}`,
    '.env.local',
    '.env'
  ];

  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);

    if (fs.existsSync(filePath)) {
      console.log(`Loading environment from ${file}`);
      dotenv.config({ path: filePath });
      break;
    }
  }

  // 驗證必需的環境變量
  validateEnv();
}

function validateEnv() {
  const required = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PASSWORD',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // 驗證環境變量格式
  if (isNaN(process.env.PORT)) {
    throw new Error('PORT must be a number');
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
}

// 導出配置對象
function getConfig() {
  return {
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT, 10),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',

    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      pool: {
        min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
        max: parseInt(process.env.DB_POOL_MAX, 10) || 10
      }
    },

    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT, 10),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true'
    },

    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN
    }
  };
}

module.exports = { loadEnv, getConfig };
```

## 進程管理

### 1. PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'myapp',
      script: './server.js',

      // 實例配置
      instances: 'max',      // 或指定數量如 4
      exec_mode: 'cluster',  // cluster 或 fork

      // 環境變量
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // 性能配置
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      watch: false,

      // 日誌配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/myapp/error.log',
      out_file: '/var/log/myapp/out.log',
      merge_logs: true,
      log_type: 'json',

      // 優雅關閉
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,

      // Cron 重啟（可選）
      cron_restart: '0 0 * * *', // 每天午夜重啟

      // 環境特定配置
      node_args: '--max-old-space-size=4096',

      // 進程管理
      post_update: ['npm install', 'npm run build'],
      pre_stop: ['node scripts/cleanup.js']
    }
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: 'prod-server.example.com',
      ref: 'origin/main',
      repo: 'git@github.com:user/repo.git',
      path: '/var/www/myapp',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    },
    staging: {
      user: 'deploy',
      host: 'staging-server.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:user/repo.git',
      path: '/var/www/myapp-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
```

### 2. PM2 命令

```bash
# 啟動應用
pm2 start ecosystem.config.js --env production

# 重啟應用（零停機）
pm2 reload myapp

# 停止應用
pm2 stop myapp

# 刪除應用
pm2 delete myapp

# 查看日誌
pm2 logs myapp
pm2 logs myapp --lines 100

# 監控
pm2 monit

# 查看狀態
pm2 status
pm2 show myapp

# 保存當前進程列表
pm2 save

# 開機自啟
pm2 startup
pm2 save

# 更新 PM2
pm2 update
```

### 3. 優雅關閉

```javascript
// server.js
const express = require('express');
const app = express();

let server;
let isShuttingDown = false;

// 啟動服務器
function startServer() {
  server = app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);

    // 通知 PM2 應用已就緒
    if (process.send) {
      process.send('ready');
    }
  });

  // 設置超時
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

// 優雅關閉
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`\n${signal} received, starting graceful shutdown...`);

  // 1. 停止接受新連接
  server.close(() => {
    console.log('HTTP server closed');
  });

  // 2. 關閉數據庫連接
  try {
    await database.close();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }

  // 3. 關閉 Redis 連接
  try {
    await redis.quit();
    console.log('Redis connections closed');
  } catch (error) {
    console.error('Error closing Redis:', error);
  }

  // 4. 完成當前請求處理
  setTimeout(() => {
    console.log('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000); // 10秒超時

  console.log('Graceful shutdown completed');
  process.exit(0);
}

// 監聽信號
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕獲異常處理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();
```

## 反向代理配置

### 1. Nginx 配置

```nginx
# /etc/nginx/sites-available/myapp
upstream myapp {
    # 負載均衡策略
    least_conn;  # 或 ip_hash, round_robin

    # 後端服務器
    server 127.0.0.1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 weight=1 max_fails=3 fail_timeout=30s;

    # 保持連接
    keepalive 64;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name myapp.com www.myapp.com;

    # ACME 挑戰（Let's Encrypt）
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 服務器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name myapp.com www.myapp.com;

    # SSL 證書
    ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # 安全頭
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日誌
    access_log /var/log/nginx/myapp.access.log;
    error_log /var/log/nginx/myapp.error.log;

    # Gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 客戶端請求限制
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # 靜態文件
    location /static/ {
        alias /var/www/myapp/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias /var/www/myapp/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # API 代理
    location /api/ {
        proxy_pass http://myapp;
        proxy_http_version 1.1;

        # 請求頭
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # 超時設置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 緩衝設置
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;

        # 重試邏輯
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_next_upstream_tries 3;
    }

    # WebSocket 支持
    location /ws/ {
        proxy_pass http://myapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # 健康檢查
    location /health {
        proxy_pass http://myapp/health;
        access_log off;
    }

    # 主應用
    location / {
        proxy_pass http://myapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # 超時
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 2. 速率限制

```nginx
# /etc/nginx/nginx.conf
http {
    # 定義限制區域
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # 連接數限制
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    server {
        # ...

        # 一般請求限制
        location / {
            limit_req zone=general burst=20 nodelay;
            limit_conn conn_limit 10;
            # ...
        }

        # API 限制
        location /api/ {
            limit_req zone=api burst=10 nodelay;
            # ...
        }

        # 登錄端點嚴格限制
        location /api/auth/login {
            limit_req zone=login burst=3 nodelay;
            # ...
        }
    }
}
```

## Docker 部署

### 1. Dockerfile

```dockerfile
# 多階段構建
FROM node:18-alpine AS builder

# 設置工作目錄
WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝依賴（僅生產依賴）
RUN npm ci --only=production && \
    npm cache clean --force

# 複製源代碼
COPY . .

# 構建應用（如果需要）
# RUN npm run build

# 生產階段
FROM node:18-alpine

# 安全：創建非 root 用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 設置工作目錄
WORKDIR /app

# 從 builder 複製依賴和代碼
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# 切換到非 root 用戶
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node healthcheck.js

# 啟動命令
CMD ["node", "server.js"]
```

### 2. .dockerignore

```
node_modules
npm-debug.log
.env
.env.*
.git
.gitignore
README.md
.vscode
.idea
coverage
.nyc_output
dist
logs
*.log
.DS_Store
```

### 3. docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: myapp:latest
    container_name: myapp
    restart: unless-stopped
    env_file: .env.production
    environment:
      - NODE_ENV=production
      - PORT=3000
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
    networks:
      - app-network
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M

  db:
    image: postgres:15-alpine
    container_name: myapp-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=myapp_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: myapp-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    container_name: myapp-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./static:/var/www/static:ro
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

### 4. Docker 命令

```bash
# 構建鏡像
docker build -t myapp:latest .

# 運行容器
docker run -d -p 3000:3000 --name myapp myapp:latest

# 使用 docker-compose
docker-compose up -d

# 查看日誌
docker-compose logs -f app

# 重啟服務
docker-compose restart app

# 停止服務
docker-compose down

# 停止並刪除卷
docker-compose down -v

# 進入容器
docker exec -it myapp sh

# 查看資源使用
docker stats myapp
```

## 容器編排

### 1. Kubernetes 部署

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: myapp-secrets
              key: db-password
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
type: Opaque
stringData:
  db-password: <your-password>
  jwt-secret: <your-secret>
```

### 2. Kubernetes 擴展

```yaml
# hpa.yaml - 水平 Pod 自動伸縮
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
```

## CI/CD 流程

### 1. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches:
      - main

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /var/www/myapp
            docker-compose pull
            docker-compose up -d
            docker-compose exec -T app npm run migrate

      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 雲平台部署

### 1. Heroku 部署

```json
// package.json
{
  "scripts": {
    "start": "node server.js",
    "heroku-postbuild": "npm run build"
  },
  "engines": {
    "node": "18.x",
    "npm": "8.x"
  }
}
```

```
# Procfile
web: node server.js
worker: node worker.js
release: node scripts/migrate.js
```

```bash
# 部署命令
heroku create myapp
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
heroku config:set NODE_ENV=production
git push heroku main
heroku logs --tail
```

### 2. AWS Elastic Beanstalk

```yaml
# .ebextensions/nodecommand.config
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
    NodeVersion: "18.x"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
```

### 3. Google Cloud Run

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/myapp:$COMMIT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/myapp:$COMMIT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'myapp'
      - '--image=gcr.io/$PROJECT_ID/myapp:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
```

## 監控與日誌

### 1. 健康檢查

```javascript
// healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);

  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error('ERROR:', err);
  process.exit(1);
});

request.end();
```

```javascript
// server.js - 健康檢查端點
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok'
  };

  try {
    // 檢查數據庫
    await db.sequelize.authenticate();
    health.database = 'ok';

    // 檢查 Redis
    await redis.ping();
    health.redis = 'ok';

    res.status(200).json(health);
  } catch (error) {
    health.status = 'error';
    health.error = error.message;
    res.status(503).json(health);
  }
});

app.get('/ready', (req, res) => {
  // 檢查應用是否準備好處理請求
  if (app.isReady) {
    res.status(200).send('OK');
  } else {
    res.status(503).send('Not Ready');
  }
});
```

## 故障恢復

### 1. 備份策略

```bash
#!/bin/bash
# scripts/backup.sh

# 配置
BACKUP_DIR="/var/backups/myapp"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="myapp"
DB_USER="myapp_user"

# 創建備份目錄
mkdir -p $BACKUP_DIR

# 備份數據庫
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 備份上傳文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/myapp/uploads

# 上傳到 S3
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://myapp-backups/
aws s3 cp $BACKUP_DIR/uploads_$DATE.tar.gz s3://myapp-backups/

# 清理舊備份（保留30天）
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 2. 災難恢復

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file>"
  exit 1
fi

# 從 S3 下載備份
aws s3 cp s3://myapp-backups/$BACKUP_FILE /tmp/

# 恢復數據庫
gunzip < /tmp/$BACKUP_FILE | psql -U myapp_user myapp

echo "Restore completed"
```

## 參考資源

- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/production-deployment/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
