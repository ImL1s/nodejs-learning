# Exercise 01: 構建用戶認證系統

## 目標

構建一個完整的用戶認證系統，包含註冊、登錄、登出、密碼管理等功能。

## 需求

### 1. 用戶註冊

- 端點：`POST /api/auth/register`
- 請求體：
  ```json
  {
    "username": "string (3-20字符，僅字母數字下劃線)",
    "email": "string (有效的郵箱格式)",
    "password": "string (至少8字符，包含大小寫字母和數字)",
    "confirmPassword": "string (必須與password相同)"
  }
  ```
- 功能要求：
  - 驗證所有輸入字段
  - 檢查用戶名和郵箱是否已存在
  - 密碼強度驗證（至少8字符，包含大小寫字母和數字）
  - 使用 bcrypt 加密密碼
  - 返回 JWT token 和用戶信息（不含密碼）

### 2. 用戶登錄

- 端點：`POST /api/auth/login`
- 請求體：
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- 功能要求：
  - 驗證用戶名和密碼
  - 失敗次數限制（5次失敗後鎖定15分鐘）
  - 返回 access token 和 refresh token
  - 記錄登錄時間和 IP 地址

### 3. 刷新 Token

- 端點：`POST /api/auth/refresh`
- 請求體：
  ```json
  {
    "refreshToken": "string"
  }
  ```
- 功能要求：
  - 驗證 refresh token
  - 生成新的 access token
  - 可選：實現 refresh token 輪換

### 4. 用戶登出

- 端點：`POST /api/auth/logout`
- 認證：需要 Bearer Token
- 功能要求：
  - 將 token 加入黑名單
  - 清除用戶的所有 refresh tokens

### 5. 獲取當前用戶

- 端點：`GET /api/auth/me`
- 認證：需要 Bearer Token
- 功能要求：
  - 返回當前登錄用戶的信息
  - 不返回密碼

### 6. 更新用戶資料

- 端點：`PATCH /api/auth/profile`
- 認證：需要 Bearer Token
- 請求體：
  ```json
  {
    "email": "string (可選)",
    "firstName": "string (可選)",
    "lastName": "string (可選)"
  }
  ```
- 功能要求：
  - 只能更新自己的資料
  - 驗證郵箱格式
  - 檢查郵箱是否被其他用戶使用

### 7. 修改密碼

- 端點：`POST /api/auth/change-password`
- 認證：需要 Bearer Token
- 請求體：
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string",
    "confirmNewPassword": "string"
  }
  ```
- 功能要求：
  - 驗證當前密碼
  - 驗證新密碼強度
  - 確認新密碼匹配
  - 更新密碼並使所有舊 token 失效

### 8. 忘記密碼

- 端點：`POST /api/auth/forgot-password`
- 請求體：
  ```json
  {
    "email": "string"
  }
  ```
- 功能要求：
  - 生成密碼重置 token（有效期30分鐘）
  - 模擬發送郵件（console.log）
  - 防止郵箱枚舉攻擊（總是返回成功消息）

### 9. 重置密碼

- 端點：`POST /api/auth/reset-password`
- 請求體：
  ```json
  {
    "token": "string",
    "newPassword": "string",
    "confirmNewPassword": "string"
  }
  ```
- 功能要求：
  - 驗證重置 token
  - 檢查 token 是否過期
  - 驗證新密碼
  - 重置密碼並清除重置 token

### 10. 郵箱驗證

- 端點：`POST /api/auth/verify-email`
- 請求體：
  ```json
  {
    "token": "string"
  }
  ```
- 功能要求：
  - 驗證郵箱驗證 token
  - 標記郵箱為已驗證
  - 可選：只有驗證後的用戶才能使用某些功能

## 技術要求

### 依賴包

```json
{
  "express": "^4.18.0",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "@types/express": "^4.17.0",
  "@types/jsonwebtoken": "^9.0.0",
  "@types/bcryptjs": "^2.4.0"
}
```

### 數據模型

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  password: string; // 加密後的密碼
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RefreshToken {
  token: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
}
```

### 環境變量

```
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15m
```

## 安全要求

1. **密碼安全**
   - 使用 bcrypt 加密（至少 10 輪）
   - 密碼強度驗證
   - 不在任何響應中返回密碼

2. **Token 安全**
   - Access token 短期有效（15分鐘）
   - Refresh token 長期有效（7天）
   - 實現 token 黑名單
   - Token 應包含最少必要信息

3. **速率限制**
   - 登錄端點：每15分鐘5次請求
   - 註冊端點：每小時3次請求
   - 密碼重置：每小時3次請求

4. **輸入驗證**
   - 驗證所有用戶輸入
   - 防止 SQL 注入（雖然使用內存存儲）
   - 防止 XSS 攻擊

5. **錯誤處理**
   - 不暴露敏感信息
   - 使用通用錯誤消息（如"用戶名或密碼錯誤"）
   - 記錄所有安全相關事件

## 測試場景

### 1. 成功場景

```bash
# 註冊新用戶
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

# 獲取當前用戶（使用返回的 token）
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 修改密碼
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Password123",
    "newPassword": "NewPassword123",
    "confirmNewPassword": "NewPassword123"
  }'

# 登出
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. 錯誤場景

```bash
# 重複用戶名
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "another@example.com",
    "password": "Password123",
    "confirmPassword": "Password123"
  }'
# 預期：409 Conflict

# 弱密碼
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser2",
    "email": "test2@example.com",
    "password": "weak",
    "confirmPassword": "weak"
  }'
# 預期：400 Bad Request

# 錯誤的密碼
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "WrongPassword"
  }'
# 預期：401 Unauthorized

# 無效的 token
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid_token"
# 預期：401 Unauthorized
```

## 評分標準

- **功能完整性（40%）**
  - 所有端點都正確實現
  - 正確處理各種輸入情況

- **安全性（30%）**
  - 密碼正確加密
  - Token 正確實現
  - 輸入驗證完整
  - 實現速率限制

- **代碼質量（20%）**
  - 代碼結構清晰
  - 適當的註釋
  - 錯誤處理完善
  - 使用 TypeScript 類型

- **錯誤處理（10%）**
  - 統一的錯誤響應格式
  - 適當的 HTTP 狀態碼
  - 清晰的錯誤消息

## 提示

1. 先實現基本的註冊和登錄功能
2. 然後添加 token 刷新機制
3. 實現密碼管理功能
4. 最後添加安全特性（速率限制、登錄嘗試限制等）
5. 使用中間件來組織代碼
6. 將驗證邏輯提取為可重用函數
7. 考慮使用類來組織相關功能（如 AuthService、TokenService）

## 擴展挑戰

如果完成了基本要求，可以嘗試以下擴展：

1. 實現雙因素認證（2FA）
2. 添加 OAuth 登錄（Google、GitHub）
3. 實現會話管理（查看活動會話、遠程登出）
4. 添加用戶角色和權限系統
5. 實現郵件服務（使用 nodemailer）
6. 添加密碼歷史（防止重用舊密碼）
7. 實現賬戶鎖定策略
8. 添加登錄歷史記錄
9. 實現設備管理（記住設備、可信設備）
10. 添加安全事件通知
