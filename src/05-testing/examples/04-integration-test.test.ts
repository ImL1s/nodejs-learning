/**
 * 整合測試示例
 * 測試多個組件/模塊的協作
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';

// 模擬數據庫連接
class Database {
  private connected: boolean = false;
  private data: Map<string, any> = new Map();

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true;
        console.log('Database connected');
        resolve();
      }, 100);
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = false;
        this.data.clear();
        console.log('Database disconnected');
        resolve();
      }, 50);
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query(sql: string): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    // 模擬查詢
    return Array.from(this.data.values());
  }

  async insert(table: string, data: any): Promise<any> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    const id = `${table}_${Date.now()}`;
    const record = { id, ...data };
    this.data.set(id, record);
    return record;
  }

  async findById(id: string): Promise<any | null> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    return this.data.get(id) || null;
  }

  async update(id: string, data: any): Promise<any | null> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    const existing = this.data.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...data };
    this.data.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    return this.data.delete(id);
  }
}

// 用戶服務
class UserService {
  constructor(private db: Database) {}

  async createUser(name: string, email: string): Promise<any> {
    if (!name || !email) {
      throw new Error('Name and email are required');
    }

    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }

    return this.db.insert('users', { name, email, createdAt: new Date() });
  }

  async getUser(id: string): Promise<any | null> {
    return this.db.findById(id);
  }

  async updateUser(id: string, data: Partial<{ name: string; email: string }>): Promise<any | null> {
    const user = await this.db.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return this.db.update(id, data);
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = await this.db.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return this.db.delete(id);
  }
}

// 文章服務
class PostService {
  constructor(
    private db: Database,
    private userService: UserService
  ) {}

  async createPost(userId: string, title: string, content: string): Promise<any> {
    // 驗證用戶存在
    const user = await this.userService.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!title || !content) {
      throw new Error('Title and content are required');
    }

    return this.db.insert('posts', {
      userId,
      title,
      content,
      createdAt: new Date(),
    });
  }

  async getPost(id: string): Promise<any | null> {
    return this.db.findById(id);
  }

  async getPostWithAuthor(id: string): Promise<any | null> {
    const post = await this.db.findById(id);
    if (!post) return null;

    const author = await this.userService.getUser(post.userId);
    return {
      ...post,
      author,
    };
  }
}

// 通知服務
class NotificationService {
  private notifications: Array<{ userId: string; message: string; timestamp: Date }> = [];

  async sendNotification(userId: string, message: string): Promise<void> {
    this.notifications.push({
      userId,
      message,
      timestamp: new Date(),
    });
    console.log(`Notification sent to ${userId}: ${message}`);
  }

  getNotifications(userId: string): Array<any> {
    return this.notifications.filter((n) => n.userId === userId);
  }

  clearNotifications(): void {
    this.notifications = [];
  }
}

// 博客應用 - 整合所有服務
class BlogApplication {
  constructor(
    private userService: UserService,
    private postService: PostService,
    private notificationService: NotificationService
  ) {}

  async registerUser(name: string, email: string): Promise<any> {
    const user = await this.userService.createUser(name, email);
    await this.notificationService.sendNotification(user.id, 'Welcome to our blog!');
    return user;
  }

  async createPostWithNotification(userId: string, title: string, content: string): Promise<any> {
    const post = await this.postService.createPost(userId, title, content);
    await this.notificationService.sendNotification(userId, `Your post "${title}" has been published!`);
    return post;
  }

  async getPostDetails(postId: string): Promise<any | null> {
    return this.postService.getPostWithAuthor(postId);
  }

  async deleteUserAndPosts(userId: string): Promise<void> {
    // 這裡應該刪除用戶的所有文章，簡化演示
    await this.userService.deleteUser(userId);
    await this.notificationService.sendNotification(userId, 'Your account has been deleted');
  }
}

describe('Integration Testing Examples', () => {
  let db: Database;
  let userService: UserService;
  let postService: PostService;
  let notificationService: NotificationService;
  let blogApp: BlogApplication;

  // 在所有測試前連接數據庫
  beforeAll(async () => {
    db = new Database();
    await db.connect();
  });

  // 在所有測試後斷開數據庫
  afterAll(async () => {
    await db.disconnect();
  });

  // 在每個測試前初始化服務
  beforeEach(() => {
    userService = new UserService(db);
    postService = new PostService(db, userService);
    notificationService = new NotificationService();
    blogApp = new BlogApplication(userService, postService, notificationService);
  });

  // 在每個測試後清理通知
  afterEach(() => {
    notificationService.clearNotifications();
  });

  describe('Database Integration', () => {
    it('should connect to database', () => {
      expect(db.isConnected()).toBe(true);
    });

    it('should perform CRUD operations', async () => {
      // Create
      const user = await db.insert('users', { name: 'Test User', email: 'test@example.com' });
      expect(user).toHaveProperty('id');

      // Read
      const found = await db.findById(user.id);
      expect(found).toEqual(user);

      // Update
      const updated = await db.update(user.id, { name: 'Updated User' });
      expect(updated?.name).toBe('Updated User');

      // Delete
      const deleted = await db.delete(user.id);
      expect(deleted).toBe(true);

      const notFound = await db.findById(user.id);
      expect(notFound).toBeNull();
    });
  });

  describe('UserService Integration', () => {
    it('should create user with database', async () => {
      const user = await userService.createUser('John Doe', 'john@example.com');

      expect(user).toHaveProperty('id');
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');

      // 驗證數據已保存到數據庫
      const retrieved = await db.findById(user.id);
      expect(retrieved).toEqual(user);
    });

    it('should update user in database', async () => {
      const user = await userService.createUser('Jane Doe', 'jane@example.com');
      const updated = await userService.updateUser(user.id, { name: 'Jane Smith' });

      expect(updated?.name).toBe('Jane Smith');

      // 驗證更新已保存
      const retrieved = await db.findById(user.id);
      expect(retrieved?.name).toBe('Jane Smith');
    });

    it('should delete user from database', async () => {
      const user = await userService.createUser('Bob Brown', 'bob@example.com');
      await userService.deleteUser(user.id);

      const retrieved = await db.findById(user.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('PostService Integration', () => {
    it('should create post with valid user', async () => {
      const user = await userService.createUser('Alice Johnson', 'alice@example.com');
      const post = await postService.createPost(user.id, 'My First Post', 'Hello World!');

      expect(post).toHaveProperty('id');
      expect(post.userId).toBe(user.id);
      expect(post.title).toBe('My First Post');
    });

    it('should fail to create post with invalid user', async () => {
      await expect(
        postService.createPost('invalid-user-id', 'Test Post', 'Content')
      ).rejects.toThrow('User not found');
    });

    it('should get post with author information', async () => {
      const user = await userService.createUser('Charlie Davis', 'charlie@example.com');
      const post = await postService.createPost(user.id, 'Integration Test', 'Testing integration');

      const postWithAuthor = await postService.getPostWithAuthor(post.id);

      expect(postWithAuthor).toHaveProperty('author');
      expect(postWithAuthor?.author.id).toBe(user.id);
      expect(postWithAuthor?.author.name).toBe('Charlie Davis');
    });
  });

  describe('BlogApplication Integration', () => {
    it('should register user and send welcome notification', async () => {
      const user = await blogApp.registerUser('David Evans', 'david@example.com');

      expect(user).toHaveProperty('id');

      const notifications = notificationService.getNotifications(user.id);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toContain('Welcome');
    });

    it('should create post and send notification', async () => {
      const user = await blogApp.registerUser('Emma Wilson', 'emma@example.com');
      const post = await blogApp.createPostWithNotification(
        user.id,
        'My Journey',
        'This is my story...'
      );

      expect(post).toHaveProperty('id');

      const notifications = notificationService.getNotifications(user.id);
      expect(notifications).toHaveLength(2); // Welcome + Post published
      expect(notifications[1].message).toContain('published');
    });

    it('should get complete post details with author', async () => {
      const user = await blogApp.registerUser('Frank Miller', 'frank@example.com');
      const post = await blogApp.createPostWithNotification(
        user.id,
        'Test Post',
        'Test Content'
      );

      const details = await blogApp.getPostDetails(post.id);

      expect(details).toHaveProperty('author');
      expect(details?.author.name).toBe('Frank Miller');
      expect(details?.title).toBe('Test Post');
    });

    it('should handle complete user lifecycle', async () => {
      // 註冊用戶
      const user = await blogApp.registerUser('Grace Lee', 'grace@example.com');
      expect(user).toHaveProperty('id');

      // 創建文章
      const post1 = await blogApp.createPostWithNotification(
        user.id,
        'First Post',
        'Content 1'
      );
      const post2 = await blogApp.createPostWithNotification(
        user.id,
        'Second Post',
        'Content 2'
      );

      expect(post1).toHaveProperty('id');
      expect(post2).toHaveProperty('id');

      // 檢查通知
      const notifications = notificationService.getNotifications(user.id);
      expect(notifications.length).toBeGreaterThanOrEqual(3); // Welcome + 2 posts

      // 刪除用戶
      await blogApp.deleteUserAndPosts(user.id);

      // 驗證用戶已刪除
      const deletedUser = await userService.getUser(user.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database disconnection', async () => {
      await db.disconnect();

      await expect(userService.createUser('Test', 'test@example.com')).rejects.toThrow(
        'Database not connected'
      );

      // 重新連接
      await db.connect();
    });

    it('should rollback on validation errors', async () => {
      await expect(userService.createUser('', 'invalid')).rejects.toThrow();

      // 驗證沒有創建任何數據
      const allData = await db.query('SELECT * FROM users');
      expect(allData.filter((u) => u.email === 'invalid')).toHaveLength(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent user creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        blogApp.registerUser(`User ${i}`, `user${i}@example.com`)
      );

      const users = await Promise.all(promises);

      expect(users).toHaveLength(5);
      users.forEach((user, i) => {
        expect(user.name).toBe(`User ${i}`);
      });
    });

    it('should handle concurrent post creation', async () => {
      const user = await blogApp.registerUser('Concurrent User', 'concurrent@example.com');

      const promises = Array.from({ length: 3 }, (_, i) =>
        blogApp.createPostWithNotification(user.id, `Post ${i}`, `Content ${i}`)
      );

      const posts = await Promise.all(promises);

      expect(posts).toHaveLength(3);
      posts.forEach((post) => {
        expect(post.userId).toBe(user.id);
      });
    });
  });
});

// 性能測試
describe('Performance Integration Tests', () => {
  let db: Database;
  let userService: UserService;

  beforeAll(async () => {
    db = new Database();
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(() => {
    userService = new UserService(db);
  });

  it('should create 100 users in reasonable time', async () => {
    const startTime = Date.now();

    const promises = Array.from({ length: 100 }, (_, i) =>
      userService.createUser(`User ${i}`, `user${i}@example.com`)
    );

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 應該在 5 秒內完成
  });
});
