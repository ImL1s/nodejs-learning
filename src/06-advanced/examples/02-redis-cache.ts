/**
 * Redis 緩存實現
 * 演示如何使用 Redis 提升應用性能
 *
 * 安裝依賴:
 * npm install redis @types/redis ioredis
 */

import Redis from 'ioredis';
import { promisify } from 'util';

// ==================== 類型定義 ====================

/**
 * 緩存配置選項
 */
interface CacheOptions {
  ttl?: number; // 過期時間（秒）
  prefix?: string; // 鍵前綴
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}

/**
 * 緩存統計信息
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
}

/**
 * 分佈式鎖選項
 */
interface LockOptions {
  timeout?: number; // 鎖超時時間（毫秒）
  retries?: number; // 重試次數
  retryDelay?: number; // 重試延遲（毫秒）
}

// ==================== Redis 緩存管理器 ====================

/**
 * Redis 緩存管理器類
 * 提供完整的緩存操作和高級功能
 */
export class RedisCacheManager {
  private client: Redis;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(
    redisUrl: string = 'redis://localhost:6379',
    private options: CacheOptions = {}
  ) {
    this.client = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false
    });

    this.client.on('connect', () => {
      console.log('✅ Redis 已連接');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis 錯誤:', err);
    });

    this.client.on('close', () => {
      console.log('📴 Redis 連接已關閉');
    });

    // 設置默認選項
    this.options = {
      ttl: 3600, // 默認 1 小時
      prefix: 'cache:',
      serialize: JSON.stringify,
      deserialize: JSON.parse,
      ...options
    };
  }

  /**
   * 生成完整的鍵名
   */
  private getKey(key: string): string {
    return `${this.options.prefix}${key}`;
  }

  /**
   * 獲取緩存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.client.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return this.options.deserialize!(value) as T;
    } catch (error) {
      console.error(`獲取緩存失敗 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 設置緩存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const serialized = this.options.serialize!(value);
      const expiry = ttl || this.options.ttl!;

      if (expiry > 0) {
        await this.client.setex(fullKey, expiry, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      return true;
    } catch (error) {
      console.error(`設置緩存失敗 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 刪除緩存
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const result = await this.client.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error(`刪除緩存失敗 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 批量刪除緩存（支持模式匹配）
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.getKey(pattern);
      const keys = await this.client.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(...keys);
      return result;
    } catch (error) {
      console.error(`批量刪除緩存失敗 [${pattern}]:`, error);
      return 0;
    }
  }

  /**
   * 檢查鍵是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error(`檢查鍵存在失敗 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 設置過期時間
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const result = await this.client.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      console.error(`設置過期時間失敗 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 獲取剩餘過期時間
   */
  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.client.ttl(fullKey);
    } catch (error) {
      console.error(`獲取 TTL 失敗 [${key}]:`, error);
      return -1;
    }
  }

  /**
   * 獲取或設置緩存（Cache-Aside 模式）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 嘗試從緩存獲取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 緩存未命中，調用工廠函數獲取數據
    const value = await factory();

    // 存入緩存
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * 原子遞增
   */
  async increment(key: string, delta: number = 1): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.client.incrby(fullKey, delta);
    } catch (error) {
      console.error(`遞增失敗 [${key}]:`, error);
      throw error;
    }
  }

  /**
   * 原子遞減
   */
  async decrement(key: string, delta: number = 1): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.client.decrby(fullKey, delta);
    } catch (error) {
      console.error(`遞減失敗 [${key}]:`, error);
      throw error;
    }
  }

  /**
   * 獲取統計信息
   */
  async getStats(): Promise<CacheStats> {
    const keys = await this.client.keys(this.getKey('*'));
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      keys: keys.length
    };
  }

  /**
   * 清空統計
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * 清空所有緩存
   */
  async flush(): Promise<void> {
    await this.deletePattern('*');
  }

  /**
   * 關閉連接
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /**
   * 獲取 Redis 客戶端（用於高級操作）
   */
  getClient(): Redis {
    return this.client;
  }
}

// ==================== 分佈式鎖 ====================

/**
 * Redis 分佈式鎖實現
 * 用於分佈式環境下的資源同步
 */
export class RedisLock {
  private client: Redis;

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.client = new Redis(redisUrl);
  }

  /**
   * 獲取鎖
   */
  async acquire(
    lockKey: string,
    options: LockOptions = {}
  ): Promise<string | null> {
    const {
      timeout = 10000,
      retries = 3,
      retryDelay = 100
    } = options;

    const lockValue = `${Date.now()}-${Math.random()}`;
    const expiry = Math.ceil(timeout / 1000);

    for (let i = 0; i < retries; i++) {
      try {
        // 使用 SET NX EX 命令獲取鎖
        const result = await this.client.set(
          lockKey,
          lockValue,
          'EX',
          expiry,
          'NX'
        );

        if (result === 'OK') {
          return lockValue;
        }

        // 等待後重試
        if (i < retries - 1) {
          await this.sleep(retryDelay);
        }
      } catch (error) {
        console.error(`獲取鎖失敗 [${lockKey}]:`, error);
      }
    }

    return null;
  }

  /**
   * 釋放鎖
   */
  async release(lockKey: string, lockValue: string): Promise<boolean> {
    try {
      // 使用 Lua 腳本確保原子性
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      console.error(`釋放鎖失敗 [${lockKey}]:`, error);
      return false;
    }
  }

  /**
   * 使用鎖執行操作
   */
  async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    options?: LockOptions
  ): Promise<T> {
    const lockValue = await this.acquire(lockKey, options);

    if (!lockValue) {
      throw new Error(`無法獲取鎖: ${lockKey}`);
    }

    try {
      return await fn();
    } finally {
      await this.release(lockKey, lockValue);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

// ==================== 使用示例 ====================

/**
 * 基本緩存操作示例
 */
async function basicCacheExample() {
  console.log('\n=== 基本緩存操作 ===\n');

  const cache = new RedisCacheManager();

  // 設置緩存
  await cache.set('user:1', { id: 1, name: 'Alice', email: 'alice@example.com' }, 60);
  console.log('✅ 設置用戶緩存');

  // 獲取緩存
  const user = await cache.get<any>('user:1');
  console.log('📦 獲取用戶:', user);

  // 檢查存在
  const exists = await cache.exists('user:1');
  console.log('🔍 鍵存在:', exists);

  // 獲取 TTL
  const ttl = await cache.ttl('user:1');
  console.log('⏰ 剩餘時間:', ttl, '秒');

  // 刪除緩存
  await cache.delete('user:1');
  console.log('🗑️  刪除用戶緩存');

  await cache.disconnect();
}

/**
 * Cache-Aside 模式示例
 */
async function cacheAsideExample() {
  console.log('\n=== Cache-Aside 模式 ===\n');

  const cache = new RedisCacheManager();

  // 模擬數據庫查詢
  const fetchUserFromDB = async (userId: number) => {
    console.log('🔄 從數據庫加載用戶...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id: userId,
      name: 'Bob',
      email: 'bob@example.com',
      createdAt: new Date()
    };
  };

  // 第一次調用 - 緩存未命中
  console.time('第一次查詢');
  const user1 = await cache.getOrSet(
    'user:2',
    () => fetchUserFromDB(2),
    300
  );
  console.timeEnd('第一次查詢');
  console.log('用戶:', user1);

  // 第二次調用 - 緩存命中
  console.time('第二次查詢');
  const user2 = await cache.getOrSet(
    'user:2',
    () => fetchUserFromDB(2),
    300
  );
  console.timeEnd('第二次查詢');
  console.log('用戶:', user2);

  // 顯示統計
  const stats = await cache.getStats();
  console.log('📊 緩存統計:', stats);

  await cache.disconnect();
}

/**
 * 計數器示例
 */
async function counterExample() {
  console.log('\n=== 計數器示例 ===\n');

  const cache = new RedisCacheManager();

  // 頁面訪問計數
  const pageKey = 'page:views:home';

  for (let i = 0; i < 5; i++) {
    const count = await cache.increment(pageKey);
    console.log(`👁️  頁面訪問次數: ${count}`);
  }

  // 限流示例
  const rateLimitKey = 'ratelimit:user:123';
  await cache.set(rateLimitKey, 0, 60); // 60 秒窗口

  for (let i = 0; i < 3; i++) {
    const count = await cache.increment(rateLimitKey);
    if (count > 10) {
      console.log('⛔ 超過速率限制');
    } else {
      console.log(`✅ 請求 ${count}/10`);
    }
  }

  await cache.disconnect();
}

/**
 * 分佈式鎖示例
 */
async function distributedLockExample() {
  console.log('\n=== 分佈式鎖示例 ===\n');

  const lock = new RedisLock();

  // 模擬並發操作
  const processOrder = async (orderId: number) => {
    const lockKey = `lock:order:${orderId}`;

    try {
      await lock.withLock(
        lockKey,
        async () => {
          console.log(`🔒 處理訂單 ${orderId}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`✅ 訂單 ${orderId} 處理完成`);
        },
        { timeout: 5000, retries: 3 }
      );
    } catch (error) {
      console.error(`❌ 處理訂單 ${orderId} 失敗:`, error);
    }
  };

  // 並發處理同一訂單
  await Promise.all([
    processOrder(1001),
    processOrder(1001),
    processOrder(1001)
  ]);

  await lock.disconnect();
}

/**
 * 批量操作示例
 */
async function batchOperationsExample() {
  console.log('\n=== 批量操作示例 ===\n');

  const cache = new RedisCacheManager();

  // 批量設置用戶數據
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' }
  ];

  for (const user of users) {
    await cache.set(`user:${user.id}`, user, 300);
  }
  console.log('✅ 批量設置用戶數據');

  // 批量刪除
  const deleted = await cache.deletePattern('user:*');
  console.log(`🗑️  刪除了 ${deleted} 個鍵`);

  await cache.disconnect();
}

// ==================== 最佳實踐和常見陷阱 ====================

/**
 * 🎯 最佳實踐:
 *
 * 1. 鍵命名規範
 *    - 使用有意義的前綴: user:1, session:abc, cache:page:home
 *    - 使用冒號分隔命名空間
 *    - 保持鍵名簡短但有描述性
 *
 * 2. 過期時間策略
 *    - 根據數據特性設置合理的 TTL
 *    - 熱數據短 TTL，冷數據長 TTL
 *    - 使用隨機 TTL 避免緩存雪崩
 *
 * 3. 緩存更新策略
 *    - Cache-Aside: 應用負責緩存管理
 *    - Write-Through: 寫入時同時更新緩存
 *    - Write-Behind: 異步寫入數據庫
 *
 * 4. 連接管理
 *    - 使用連接池
 *    - 實現重連機制
 *    - 優雅關閉連接
 *
 * 5. 錯誤處理
 *    - Redis 故障不應影響應用
 *    - 實現降級策略
 *    - 記錄錯誤日誌
 *
 * 6. 性能優化
 *    - 使用 Pipeline 批量操作
 *    - 避免使用 KEYS 命令（用 SCAN 替代）
 *    - 合理使用數據結構（Hash, Set, Sorted Set）
 *
 * ⚠️ 常見陷阱:
 *
 * 1. 緩存穿透
 *    - 查詢不存在的數據導致直接訪問數據庫
 *    - 解決：緩存空值或使用布隆過濾器
 *
 * 2. 緩存擊穿
 *    - 熱點數據過期，大量請求訪問數據庫
 *    - 解決：使用分佈式鎖或永不過期策略
 *
 * 3. 緩存雪崩
 *    - 大量緩存同時過期
 *    - 解決：隨機過期時間、緩存預熱
 *
 * 4. 大 Key 問題
 *    - 存儲過大的值影響性能
 *    - 解決：拆分數據、壓縮、清理
 *
 * 5. 熱 Key 問題
 *    - 單個 Key 訪問量過大
 *    - 解決：本地緩存、數據分片
 *
 * 6. 內存管理
 *    - 沒有設置 maxmemory
 *    - 沒有配置淘汰策略
 *    - 解決：設置內存限制和 LRU 策略
 */

// 運行示例
if (require.main === module) {
  (async () => {
    try {
      await basicCacheExample();
      await cacheAsideExample();
      await counterExample();
      await distributedLockExample();
      await batchOperationsExample();
    } catch (error) {
      console.error('示例執行失敗:', error);
    }
  })();
}

export { Redis };
