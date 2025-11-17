# 練習 1: 實現實時通知系統

## 📋 目標

實現一個完整的實時通知系統，支持多種通知類型、用戶訂閱管理、通知歷史記錄和已讀狀態跟蹤。

## 🎯 功能需求

### 核心功能

1. **實時推送**
   - 使用 Socket.io 實現實時通知推送
   - 支持單用戶推送和群組推送
   - 支持廣播通知

2. **通知類型**
   - 系統通知（系統維護、更新等）
   - 用戶通知（私信、提醒等）
   - 業務通知（訂單、支付等）
   - 社交通知（點贊、評論、關注等）

3. **訂閱管理**
   - 用戶可以訂閱/取消訂閱特定類型的通知
   - 用戶可以設置通知偏好（推送、郵件、短信）
   - 用戶可以設置免打擾時間段

4. **通知歷史**
   - 保存所有通知記錄
   - 支持分頁查詢
   - 支持按類型、時間範圍過濾

5. **已讀狀態**
   - 跟蹤每條通知的已讀狀態
   - 顯示未讀通知數量
   - 支持批量標記為已讀

### 進階功能

1. **通知優先級**
   - 緊急、高、中、低優先級
   - 高優先級通知優先推送
   - 支持優先級隊列

2. **通知模板**
   - 支持自定義通知模板
   - 支持變量替換
   - 支持多語言

3. **通知聚合**
   - 相同類型的通知自動聚合
   - 例如："小明和其他 5 人點贊了你的動態"

4. **通知緩存**
   - 使用 Redis 緩存未讀通知
   - 減少數據庫查詢
   - 實現高性能

5. **通知限流**
   - 防止通知轟炸
   - 限制每個用戶的通知頻率
   - 合併短時間內的相似通知

## 📁 項目結構

```
notification-system/
├── src/
│   ├── server.ts              # 服務器入口
│   ├── socket/
│   │   ├── notification.ts    # Socket.io 通知處理
│   │   └── auth.ts            # Socket 認證中間件
│   ├── services/
│   │   ├── notification.service.ts   # 通知業務邏輯
│   │   ├── subscription.service.ts   # 訂閱管理
│   │   ├── template.service.ts       # 模板管理
│   │   └── cache.service.ts          # Redis 緩存
│   ├── models/
│   │   ├── notification.model.ts     # 通知模型
│   │   ├── subscription.model.ts     # 訂閱模型
│   │   └── user.model.ts             # 用戶模型
│   ├── controllers/
│   │   └── notification.controller.ts
│   ├── routes/
│   │   └── notification.routes.ts
│   └── types/
│       └── notification.types.ts
├── tests/
│   ├── notification.test.ts
│   └── socket.test.ts
└── package.json
```

## 🔨 實現步驟

### 第一步：定義數據模型

```typescript
// notification.types.ts

export enum NotificationType {
  SYSTEM = 'system',
  USER = 'user',
  BUSINESS = 'business',
  SOCIAL = 'social'
}

export enum NotificationPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  content: string;
  data?: any;
  userId: string;
  groupId?: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface NotificationSubscription {
  userId: string;
  type: NotificationType;
  channels: ('push' | 'email' | 'sms')[];
  enabled: boolean;
  doNotDisturbStart?: string; // HH:mm 格式
  doNotDisturbEnd?: string;
}
```

### 第二步：實現通知服務

創建 `notification.service.ts`，實現以下功能：

1. 創建通知
2. 發送通知（單用戶/群組/廣播）
3. 標記已讀/批量標記已讀
4. 獲取通知列表
5. 獲取未讀數量
6. 刪除通知

```typescript
class NotificationService {
  async createNotification(data: CreateNotificationDto): Promise<Notification>;
  async sendToUser(userId: string, notification: Notification): Promise<void>;
  async sendToGroup(groupId: string, notification: Notification): Promise<void>;
  async broadcast(notification: Notification): Promise<void>;
  async markAsRead(userId: string, notificationId: string): Promise<void>;
  async markAllAsRead(userId: string): Promise<void>;
  async getNotifications(userId: string, options: PaginationOptions): Promise<Notification[]>;
  async getUnreadCount(userId: string): Promise<number>;
  async deleteNotification(userId: string, notificationId: string): Promise<void>;
}
```

### 第三步：實現 Socket.io 集成

創建 `notification.socket.ts`：

1. 用戶連接時加入專屬房間
2. 監聽用戶訂閱事件
3. 實時推送通知
4. 處理已讀狀態同步

```typescript
io.use(authMiddleware); // 認證中間件

io.on('connection', (socket) => {
  const userId = socket.data.userId;

  // 加入用戶房間
  socket.join(`user:${userId}`);

  // 發送未讀數量
  socket.on('get-unread-count', async () => {
    const count = await notificationService.getUnreadCount(userId);
    socket.emit('unread-count', count);
  });

  // 標記已讀
  socket.on('mark-as-read', async (notificationId) => {
    await notificationService.markAsRead(userId, notificationId);
    socket.emit('notification-read', notificationId);
  });

  // 獲取通知列表
  socket.on('get-notifications', async (options) => {
    const notifications = await notificationService.getNotifications(userId, options);
    socket.emit('notifications', notifications);
  });
});
```

### 第四步：實現訂閱管理

創建 `subscription.service.ts`：

1. 訂閱/取消訂閱
2. 獲取用戶訂閱設置
3. 檢查是否在免打擾時段
4. 檢查用戶是否訂閱某類型通知

### 第五步：實現 Redis 緩存

創建 `cache.service.ts`：

1. 緩存未讀通知列表
2. 緩存未讀數量
3. 緩存用戶訂閱設置
4. 實現緩存失效策略

### 第六步：實現通知限流

1. 使用 Redis 計數器限制通知頻率
2. 合併短時間內的相似通知
3. 實現優先級隊列

### 第七步：實現 REST API

創建以下 API 端點：

- `GET /notifications` - 獲取通知列表
- `GET /notifications/unread-count` - 獲取未讀數量
- `POST /notifications` - 創建通知（管理員）
- `PUT /notifications/:id/read` - 標記已讀
- `PUT /notifications/read-all` - 全部標記已讀
- `DELETE /notifications/:id` - 刪除通知
- `GET /subscriptions` - 獲取訂閱設置
- `PUT /subscriptions` - 更新訂閱設置

## 🧪 測試要求

### 單元測試

1. 通知服務測試
   - 創建通知
   - 發送通知
   - 標記已讀
   - 查詢通知

2. 訂閱服務測試
   - 訂閱管理
   - 免打擾判斷
   - 通知過濾

3. 緩存服務測試
   - 緩存讀寫
   - 緩存失效
   - 緩存更新

### 集成測試

1. Socket.io 連接測試
2. 實時推送測試
3. 並發用戶測試
4. 限流測試

### 性能測試

1. 1000+ 並發連接
2. 每秒 100+ 通知推送
3. 緩存命中率 > 90%
4. 平均響應時間 < 100ms

## 📊 評分標準

### 功能完整性（40 分）

- [ ] 實現所有核心功能（20 分）
- [ ] 實現至少 3 個進階功能（20 分）

### 代碼質量（30 分）

- [ ] TypeScript 類型定義完整（10 分）
- [ ] 錯誤處理完善（10 分）
- [ ] 代碼結構清晰，符合 SOLID 原則（10 分）

### 性能優化（20 分）

- [ ] 使用 Redis 緩存（10 分）
- [ ] 實現通知限流和聚合（5 分）
- [ ] 優化數據庫查詢（5 分）

### 測試覆蓋（10 分）

- [ ] 單元測試覆蓋率 > 80%（5 分）
- [ ] 集成測試完整（5 分）

## 💡 提示

### Redis 緩存策略

```typescript
// 緩存未讀通知 ID 列表
const unreadKey = `notifications:unread:${userId}`;
await redis.lpush(unreadKey, notificationId);
await redis.expire(unreadKey, 3600); // 1 小時過期

// 緩存未讀數量
const countKey = `notifications:count:${userId}`;
await redis.incr(countKey);
await redis.expire(countKey, 3600);
```

### 通知聚合

```typescript
// 短時間內的相似通知聚合
const aggregateKey = `notifications:aggregate:${userId}:${type}`;
const recentNotifications = await redis.lrange(aggregateKey, 0, -1);

if (recentNotifications.length >= 3) {
  // 聚合為一條通知
  const aggregatedNotification = {
    title: `你有 ${recentNotifications.length} 條新的${type}通知`,
    content: '點擊查看詳情'
  };
}
```

### 優先級隊列

```typescript
// 使用 Redis Sorted Set 實現優先級隊列
const queueKey = 'notifications:queue';
const priority = getPriorityScore(notification.priority);
await redis.zadd(queueKey, priority, JSON.stringify(notification));

// 獲取最高優先級的通知
const notifications = await redis.zrevrange(queueKey, 0, 9);
```

### Socket.io 房間管理

```typescript
// 用戶房間
socket.join(`user:${userId}`);

// 群組房間
socket.join(`group:${groupId}`);

// 類型訂閱房間
socket.join(`type:${notificationType}`);

// 發送通知
io.to(`user:${userId}`).emit('notification', notification);
io.to(`group:${groupId}`).emit('notification', notification);
```

## 🚀 挑戰任務

1. **離線通知**
   - 用戶離線時保存通知
   - 用戶上線時推送累積的通知
   - 限制推送數量避免轟炸

2. **通知模板引擎**
   - 支持 Handlebars 或 EJS 模板
   - 支持條件判斷和循環
   - 支持自定義輔助函數

3. **多設備同步**
   - 一個用戶多個設備在線
   - 任一設備標記已讀，其他設備同步
   - 使用 Redis Pub/Sub 實現

4. **通知分析**
   - 統計各類型通知的發送量
   - 統計通知的打開率
   - 統計用戶活躍度

5. **郵件/短信集成**
   - 集成郵件服務（SendGrid、SES）
   - 集成短信服務（Twilio、阿里雲）
   - 根據用戶偏好選擇通知渠道

## 📚 參考資料

- [Socket.io 文檔](https://socket.io/docs/)
- [Redis 文檔](https://redis.io/documentation)
- [Node.js Events](https://nodejs.org/api/events.html)
- [Bull Queue](https://github.com/OptimalBits/bull) - 優先級隊列
- [node-schedule](https://github.com/node-schedule/node-schedule) - 定時任務

## 🎓 學習目標

完成這個練習後，你將掌握：

1. ✅ Socket.io 實時通信
2. ✅ Redis 緩存策略
3. ✅ 事件驅動架構
4. ✅ 消息隊列設計
5. ✅ 高併發處理
6. ✅ 性能優化技巧
7. ✅ 分佈式系統設計

祝你編碼愉快！如有問題，請查看示例代碼或提問。
