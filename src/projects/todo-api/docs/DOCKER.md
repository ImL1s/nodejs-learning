# Docker 部署指南

本指南介紹如何使用 Docker 部署 Todo API。

## 前置需求

- Docker (>= 20.10)
- Docker Compose (>= 2.0)

## 快速開始

### 使用 Docker Compose（推薦）

```bash
# 構建並啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down

# 停止並刪除數據
docker-compose down -v
```

API 將在 http://localhost:80 上運行（通過 Nginx）
直接訪問 API: http://localhost:3000

### 使用 Docker

```bash
# 構建鏡像
docker build -t todo-api .

# 運行容器
docker run -d \
  --name todo-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  todo-api

# 查看日誌
docker logs -f todo-api

# 停止容器
docker stop todo-api

# 刪除容器
docker rm todo-api
```

## Docker Compose 配置說明

### 服務

#### 1. todo-api
- **端口**: 3000
- **環境**: production
- **健康檢查**: 每 30 秒檢查一次
- **重啟策略**: unless-stopped

#### 2. nginx（可選）
- **端口**: 80
- **作用**: 反向代理和負載均衡
- **功能**:
  - Gzip 壓縮
  - 訪問日誌
  - 請求轉發

### 環境變量

在 `docker-compose.yml` 中配置：

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - LOG_LEVEL=info
```

或使用 `.env` 文件：

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

## Dockerfile 說明

### 多階段構建

我們使用多階段構建來優化鏡像大小：

1. **構建階段** (builder):
   - 安裝所有依賴
   - 編譯 TypeScript

2. **生產階段**:
   - 只安裝生產依賴
   - 複製編譯後的文件
   - 創建非 root 用戶
   - 配置健康檢查

### 鏡像優化

- 基於 Alpine Linux（更小的體積）
- 只包含生產依賴
- 使用非 root 用戶運行
- .dockerignore 排除不必要的文件

## 常用命令

### 查看服務狀態

```bash
docker-compose ps
```

### 查看日誌

```bash
# 所有服務
docker-compose logs -f

# 特定服務
docker-compose logs -f todo-api

# 最近 100 行
docker-compose logs --tail=100 todo-api
```

### 重啟服務

```bash
# 重啟所有服務
docker-compose restart

# 重啟特定服務
docker-compose restart todo-api
```

### 更新應用

```bash
# 拉取最新代碼
git pull

# 重新構建並啟動
docker-compose up -d --build
```

### 進入容器

```bash
# 進入 todo-api 容器
docker-compose exec todo-api sh

# 或使用 docker
docker exec -it todo-api sh
```

### 清理

```bash
# 停止並刪除容器
docker-compose down

# 刪除容器和卷
docker-compose down -v

# 刪除鏡像
docker rmi todo-api

# 清理未使用的資源
docker system prune -a
```

## 生產環境部署

### 1. 使用環境變量文件

創建 `.env.production`:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
```

使用它啟動：

```bash
docker-compose --env-file .env.production up -d
```

### 2. 使用 Docker Secrets（Swarm）

```bash
# 創建 secret
echo "production-secret" | docker secret create api_secret -

# 在 docker-compose.yml 中使用
secrets:
  - api_secret
```

### 3. 健康檢查

服務包含健康檢查配置：

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "..."]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 10s
```

檢查健康狀態：

```bash
docker-compose ps
docker inspect todo-api | grep -A 10 Health
```

### 4. 資源限制

在 `docker-compose.yml` 中添加：

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

### 5. 日誌管理

配置日誌驅動：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Nginx 配置

### 啟用 HTTPS

修改 `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... 其他配置
}
```

### 負載均衡

```nginx
upstream todo-api {
    server todo-api-1:3000;
    server todo-api-2:3000;
    server todo-api-3:3000;
}
```

### 速率限制

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20;
    proxy_pass http://todo-api;
}
```

## 監控和調試

### 查看資源使用

```bash
docker stats todo-api
```

### 查看進程

```bash
docker-compose top
```

### 導出日誌

```bash
docker-compose logs > logs.txt
```

### 性能分析

```bash
# 進入容器
docker-compose exec todo-api sh

# 使用 Node.js 性能工具
node --prof dist/server.js
```

## 備份和恢復

### 備份數據

```bash
# 如果使用數據卷
docker run --rm \
  -v todo-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/todo-backup.tar.gz /data
```

### 恢復數據

```bash
docker run --rm \
  -v todo-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/todo-backup.tar.gz -C /
```

## 故障排查

### 容器無法啟動

```bash
# 查看詳細錯誤
docker-compose logs todo-api

# 檢查配置
docker-compose config

# 驗證 Dockerfile
docker build --no-cache -t todo-api .
```

### 端口被佔用

```bash
# 查找佔用端口的進程
lsof -i :3000

# 或使用其他端口
docker run -p 8080:3000 todo-api
```

### 內存不足

```bash
# 清理未使用的鏡像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理系統
docker system prune -a
```

## 最佳實踐

1. **使用多階段構建**減小鏡像大小
2. **使用非 root 用戶**運行應用
3. **配置健康檢查**監控服務狀態
4. **使用 .dockerignore**排除不必要的文件
5. **設置資源限制**防止資源耗盡
6. **配置日誌輪轉**避免磁盤空間不足
7. **使用環境變量**管理配置
8. **定期更新基礎鏡像**獲取安全補丁

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build Docker image
        run: docker build -t todo-api .

      - name: Run tests
        run: docker run todo-api npm test

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker tag todo-api username/todo-api:latest
          docker push username/todo-api:latest
```

## 相關資源

- [Docker 官方文檔](https://docs.docker.com/)
- [Docker Compose 文檔](https://docs.docker.com/compose/)
- [Node.js Docker 最佳實踐](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
