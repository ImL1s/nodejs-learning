/**
 * Node.js 集群模式
 * 利用多核 CPU 提升應用性能
 *
 * 安裝依賴:
 * npm install express @types/express
 */

import cluster from 'cluster';
import os from 'os';
import process from 'process';
import express, { Request, Response } from 'express';
import http from 'http';
import { EventEmitter } from 'events';

// ==================== 類型定義 ====================

/**
 * 集群配置選項
 */
interface ClusterOptions {
  workers?: number; // Worker 數量
  restartDelay?: number; // 重啟延遲（毫秒）
  maxRestarts?: number; // 最大重啟次數
  gracefulShutdownTimeout?: number; // 優雅關閉超時
}

/**
 * Worker 信息
 */
interface WorkerInfo {
  id: number;
  pid: number;
  state: 'online' | 'listening' | 'disconnected' | 'dead';
  restarts: number;
  memory: number;
  cpu: number;
  uptime: number;
  requests: number;
}

/**
 * 集群統計信息
 */
interface ClusterStats {
  workers: WorkerInfo[];
  totalWorkers: number;
  activeWorkers: number;
  totalRequests: number;
  avgResponseTime: number;
  uptime: number;
}

/**
 * Worker 消息類型
 */
interface WorkerMessage {
  type: 'request' | 'health' | 'shutdown' | 'stats';
  data?: any;
}

// ==================== 集群管理器 ====================

/**
 * 集群管理器類
 * 管理 Worker 進程的生命週期
 */
class ClusterManager extends EventEmitter {
  private options: Required<ClusterOptions>;
  private workerRestarts: Map<number, number> = new Map();
  private startTime: Date = new Date();

  constructor(options: ClusterOptions = {}) {
    super();

    this.options = {
      workers: options.workers || os.cpus().length,
      restartDelay: options.restartDelay || 1000,
      maxRestarts: options.maxRestarts || 10,
      gracefulShutdownTimeout: options.gracefulShutdownTimeout || 10000
    };
  }

  /**
   * 啟動集群
   */
  start(): void {
    if (!cluster.isPrimary) {
      throw new Error('只能在主進程中啟動集群');
    }

    console.log(`🚀 主進程 ${process.pid} 正在啟動...`);
    console.log(`💻 CPU 核心數: ${os.cpus().length}`);
    console.log(`👥 創建 ${this.options.workers} 個 Worker\n`);

    // 創建 Worker
    for (let i = 0; i < this.options.workers; i++) {
      this.createWorker();
    }

    // 設置事件監聽
    this.setupEventListeners();

    // 設置優雅關閉
    this.setupGracefulShutdown();

    this.emit('cluster:started', { workers: this.options.workers });
  }

  /**
   * 創建 Worker
   */
  private createWorker(): cluster.Worker {
    const worker = cluster.fork();

    // 監聽 Worker 消息
    worker.on('message', (message: WorkerMessage) => {
      this.handleWorkerMessage(worker, message);
    });

    console.log(`✅ Worker ${worker.id} (PID: ${worker.process.pid}) 已啟動`);

    return worker;
  }

  /**
   * 設置事件監聽
   */
  private setupEventListeners(): void {
    // Worker 上線
    cluster.on('online', (worker) => {
      console.log(`🟢 Worker ${worker.id} 已上線`);
      this.emit('worker:online', { workerId: worker.id, pid: worker.process.pid });
    });

    // Worker 監聽端口
    cluster.on('listening', (worker, address) => {
      console.log(
        `👂 Worker ${worker.id} 正在監聽 ${address.address}:${address.port}`
      );
      this.emit('worker:listening', {
        workerId: worker.id,
        address: address.address,
        port: address.port
      });
    });

    // Worker 退出
    cluster.on('exit', (worker, code, signal) => {
      const workerId = worker.id;
      const restartCount = this.workerRestarts.get(workerId) || 0;

      if (signal) {
        console.log(`⚠️  Worker ${workerId} 被信號 ${signal} 終止`);
      } else if (code !== 0) {
        console.log(`❌ Worker ${workerId} 異常退出，代碼: ${code}`);
      } else {
        console.log(`📴 Worker ${workerId} 正常退出`);
      }

      this.emit('worker:exit', {
        workerId,
        code,
        signal,
        restartCount
      });

      // 重啟 Worker
      if (restartCount < this.options.maxRestarts) {
        console.log(
          `🔄 ${this.options.restartDelay}ms 後重啟 Worker (${restartCount + 1}/${this.options.maxRestarts})`
        );

        setTimeout(() => {
          const newWorker = this.createWorker();
          this.workerRestarts.set(newWorker.id, restartCount + 1);
        }, this.options.restartDelay);
      } else {
        console.error(
          `⛔ Worker ${workerId} 重啟次數過多，不再重啟`
        );
        this.emit('worker:max-restarts', { workerId });
      }
    });

    // Worker 斷開連接
    cluster.on('disconnect', (worker) => {
      console.log(`🔌 Worker ${worker.id} 已斷開連接`);
      this.emit('worker:disconnect', { workerId: worker.id });
    });
  }

  /**
   * 處理 Worker 消息
   */
  private handleWorkerMessage(
    worker: cluster.Worker,
    message: WorkerMessage
  ): void {
    switch (message.type) {
      case 'health':
        this.emit('worker:health', {
          workerId: worker.id,
          ...message.data
        });
        break;

      case 'stats':
        this.emit('worker:stats', {
          workerId: worker.id,
          ...message.data
        });
        break;

      default:
        this.emit('worker:message', {
          workerId: worker.id,
          message
        });
    }
  }

  /**
   * 設置優雅關閉
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n📴 收到 ${signal} 信號，開始優雅關閉...`);

      this.emit('cluster:shutdown', { signal });

      // 停止接受新連接
      for (const id in cluster.workers) {
        const worker = cluster.workers[id];
        if (worker) {
          worker.send({ type: 'shutdown' });
          worker.disconnect();
        }
      }

      // 等待所有 Worker 關閉
      const timeout = setTimeout(() => {
        console.log('⏰ 關閉超時，強制終止所有 Worker');
        for (const id in cluster.workers) {
          cluster.workers[id]?.kill();
        }
      }, this.options.gracefulShutdownTimeout);

      // 等待所有 Worker 退出
      await new Promise<void>((resolve) => {
        const checkWorkers = setInterval(() => {
          if (Object.keys(cluster.workers || {}).length === 0) {
            clearInterval(checkWorkers);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });

      console.log('✅ 所有 Worker 已關閉');
      this.emit('cluster:stopped');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * 獲取集群統計
   */
  getStats(): ClusterStats {
    const workers: WorkerInfo[] = [];
    let totalRequests = 0;

    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker) {
        const info: WorkerInfo = {
          id: worker.id,
          pid: worker.process.pid || 0,
          state: worker.state,
          restarts: this.workerRestarts.get(worker.id) || 0,
          memory: 0,
          cpu: 0,
          uptime: 0,
          requests: 0
        };
        workers.push(info);
      }
    }

    return {
      workers,
      totalWorkers: workers.length,
      activeWorkers: workers.filter(w => w.state === 'listening').length,
      totalRequests,
      avgResponseTime: 0,
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  /**
   * 重啟所有 Worker（零停機時間）
   */
  async restartAllWorkers(): Promise<void> {
    console.log('🔄 開始滾動重啟所有 Worker...');

    const workerIds = Object.keys(cluster.workers || {}).map(Number);

    for (const id of workerIds) {
      const oldWorker = cluster.workers?.[id];
      if (!oldWorker) continue;

      // 創建新 Worker
      const newWorker = this.createWorker();

      // 等待新 Worker 就緒
      await new Promise<void>((resolve) => {
        newWorker.once('listening', () => {
          console.log(`✅ 新 Worker ${newWorker.id} 就緒`);
          resolve();
        });
      });

      // 優雅關閉舊 Worker
      oldWorker.send({ type: 'shutdown' });
      oldWorker.disconnect();

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.log(`⏰ Worker ${id} 關閉超時，強制終止`);
          oldWorker.kill();
          resolve();
        }, this.options.gracefulShutdownTimeout);

        oldWorker.once('exit', () => {
          clearTimeout(timeout);
          console.log(`📴 舊 Worker ${id} 已關閉`);
          resolve();
        });
      });

      // 等待一段時間再處理下一個
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ 所有 Worker 重啟完成');
  }
}

// ==================== Worker 應用 ====================

/**
 * 創建 Worker 應用
 */
function createWorkerApp() {
  const app = express();
  const port = process.env.PORT || 3000;

  // 請求計數器
  let requestCount = 0;

  // 中間件
  app.use(express.json());

  // 添加 Worker 信息到響應頭
  app.use((req: Request, res: Response, next) => {
    requestCount++;
    res.setHeader('X-Worker-ID', cluster.worker?.id || 'unknown');
    res.setHeader('X-Worker-PID', process.pid);
    next();
  });

  // 路由
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Hello from cluster!',
      worker: {
        id: cluster.worker?.id,
        pid: process.pid
      },
      requests: requestCount
    });
  });

  // CPU 密集型任務
  app.get('/cpu-intensive', (req: Request, res: Response) => {
    const start = Date.now();

    // 計算斐波那契數列
    function fibonacci(n: number): number {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    }

    const result = fibonacci(40);
    const duration = Date.now() - start;

    res.json({
      result,
      duration: `${duration}ms`,
      worker: {
        id: cluster.worker?.id,
        pid: process.pid
      }
    });
  });

  // 健康檢查
  app.get('/health', (req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();

    res.json({
      status: 'healthy',
      worker: {
        id: cluster.worker?.id,
        pid: process.pid
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
      },
      uptime: process.uptime(),
      requests: requestCount
    });
  });

  // 模擬錯誤
  app.get('/error', (req: Request, res: Response) => {
    throw new Error('模擬錯誤');
  });

  // 模擬崩潰
  app.get('/crash', (req: Request, res: Response) => {
    res.json({ message: 'Worker 即將崩潰...' });
    setTimeout(() => {
      process.exit(1);
    }, 100);
  });

  // 統計信息
  app.get('/stats', (req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.json({
      worker: {
        id: cluster.worker?.id,
        pid: process.pid
      },
      requests: requestCount,
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime()
    });
  });

  // 錯誤處理
  app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error(`❌ Worker ${cluster.worker?.id} 錯誤:`, err);
    res.status(500).json({
      error: err.message,
      worker: {
        id: cluster.worker?.id,
        pid: process.pid
      }
    });
  });

  // 啟動服務器
  const server = app.listen(port, () => {
    console.log(
      `🚀 Worker ${cluster.worker?.id} (PID: ${process.pid}) 監聽端口 ${port}`
    );
  });

  // 監聽主進程消息
  process.on('message', (message: WorkerMessage) => {
    if (message.type === 'shutdown') {
      console.log(`📴 Worker ${cluster.worker?.id} 收到關閉信號`);

      // 優雅關閉
      server.close(() => {
        console.log(`✅ Worker ${cluster.worker?.id} HTTP 服務器已關閉`);
        process.exit(0);
      });

      // 超時強制關閉
      setTimeout(() => {
        console.log(`⏰ Worker ${cluster.worker?.id} 關閉超時，強制退出`);
        process.exit(1);
      }, 5000);
    }
  });

  // 處理未捕獲的異常
  process.on('uncaughtException', (error) => {
    console.error(`💥 Worker ${cluster.worker?.id} 未捕獲異常:`, error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(`💥 Worker ${cluster.worker?.id} 未處理的 Promise 拒絕:`, reason);
    process.exit(1);
  });

  return server;
}

// ==================== 使用示例 ====================

/**
 * 基本集群示例
 */
function basicClusterExample() {
  if (cluster.isPrimary) {
    const manager = new ClusterManager({
      workers: 4,
      restartDelay: 1000,
      maxRestarts: 5
    });

    // 監聽事件
    manager.on('cluster:started', (data) => {
      console.log(`\n🎉 集群已啟動，共 ${data.workers} 個 Worker\n`);
    });

    manager.on('worker:exit', (data) => {
      console.log(`\n⚠️  Worker ${data.workerId} 已退出，重啟次數: ${data.restartCount}\n`);
    });

    manager.start();

    // 定期輸出統計
    setInterval(() => {
      const stats = manager.getStats();
      console.log('\n📊 集群統計:');
      console.log(`  總 Worker 數: ${stats.totalWorkers}`);
      console.log(`  活躍 Worker: ${stats.activeWorkers}`);
      console.log(`  運行時間: ${Math.round(stats.uptime / 1000)}s\n`);
    }, 30000);

    // 測試滾動重啟（5 分鐘後）
    // setTimeout(() => {
    //   console.log('\n🔄 測試滾動重啟...\n');
    //   manager.restartAllWorkers();
    // }, 5 * 60 * 1000);

  } else {
    // Worker 進程
    createWorkerApp();
  }
}

// ==================== 最佳實踐和常見陷阱 ====================

/**
 * 🎯 最佳實踐:
 *
 * 1. Worker 數量
 *    - 通常設置為 CPU 核心數
 *    - CPU 密集型: workers = cores
 *    - I/O 密集型: workers = cores * 2
 *
 * 2. 優雅關閉
 *    - 停止接受新請求
 *    - 完成處理中的請求
 *    - 關閉數據庫連接
 *    - 設置合理的超時時間
 *
 * 3. 健康檢查
 *    - 實現 /health 端點
 *    - 監控內存使用
 *    - 監控 CPU 使用
 *    - 及時重啟不健康的 Worker
 *
 * 4. 進程間通信
 *    - 使用 worker.send() 發送消息
 *    - 監聽 process.on('message') 接收消息
 *    - 定義清晰的消息協議
 *
 * 5. 錯誤處理
 *    - 捕獲 uncaughtException
 *    - 捕獲 unhandledRejection
 *    - Worker 崩潰後自動重啟
 *    - 限制重啟次數
 *
 * 6. 零停機部署
 *    - 滾動重啟 Worker
 *    - 新 Worker 就緒後再關閉舊 Worker
 *    - 使用負載均衡器配合
 *
 * 7. 監控和日誌
 *    - 記錄每個 Worker 的狀態
 *    - 統計請求數和響應時間
 *    - 使用 PM2 或自定義管理器
 *
 * ⚠️ 常見陷阱:
 *
 * 1. 狀態共享
 *    - Worker 之間不共享內存
 *    - 不能使用內存存儲 session
 *    - 解決：使用 Redis 等外部存儲
 *
 * 2. 端口衝突
 *    - 多個 Worker 監聽同一端口
 *    - Node.js 會自動處理（使用 SO_REUSEADDR）
 *    - 但要注意某些情況下可能失效
 *
 * 3. 文件描述符限制
 *    - 每個進程都有文件描述符限制
 *    - Worker 過多可能耗盡系統資源
 *    - 使用 ulimit -n 查看和調整
 *
 * 4. 內存倍增
 *    - 每個 Worker 都加載完整代碼
 *    - 4 個 Worker = 內存使用 * 4
 *    - 監控總內存使用
 *
 * 5. 不優雅的關閉
 *    - 直接 kill 進程導致請求丟失
 *    - 數據庫連接未正確關閉
 *    - 必須實現優雅關閉
 *
 * 6. 過度重啟
 *    - Worker 崩潰 -> 重啟 -> 再崩潰
 *    - 導致系統不穩定
 *    - 必須限制重啟次數
 *
 * 7. 調試困難
 *    - 多進程調試複雜
 *    - 日誌混在一起
 *    - 解決：給每個 Worker 添加標識
 */

/**
 * 💡 進階技巧:
 *
 * 1. 使用 PM2 管理集群
 * pm2 start app.js -i max  // 自動創建最大數量的 Worker
 * pm2 reload app           // 零停機重啟
 * pm2 logs                 // 查看所有日誌
 *
 * 2. 使用 Nginx 負載均衡
 * upstream nodejs {
 *   server localhost:3000;
 *   server localhost:3001;
 *   server localhost:3002;
 *   server localhost:3003;
 * }
 *
 * 3. 使用 Redis 共享 Session
 * const RedisStore = require('connect-redis')(session);
 * app.use(session({
 *   store: new RedisStore({ client: redisClient })
 * }));
 *
 * 4. Worker 專業化
 * if (cluster.worker.id === 1) {
 *   // Worker 1 處理 API 請求
 * } else {
 *   // 其他 Worker 處理後台任務
 * }
 *
 * 5. 動態調整 Worker 數量
 * function scaleWorkers(targetCount) {
 *   const current = Object.keys(cluster.workers).length;
 *   if (current < targetCount) {
 *     for (let i = current; i < targetCount; i++) {
 *       cluster.fork();
 *     }
 *   } else {
 *     // 關閉多餘的 Worker
 *   }
 * }
 */

/**
 * 🔧 與 PM2 對比:
 *
 * 自定義集群管理:
 * ✅ 完全控制
 * ✅ 靈活的重啟策略
 * ✅ 自定義監控
 * ❌ 需要自己實現
 * ❌ 需要處理邊緣情況
 *
 * PM2:
 * ✅ 開箱即用
 * ✅ 豐富的功能
 * ✅ 監控和日誌
 * ✅ 零配置負載均衡
 * ❌ 黑盒操作
 * ❌ 定制困難
 *
 * 建議：
 * - 開發環境：不使用集群
 * - 生產環境（小型）：使用 PM2
 * - 生產環境（大型）：使用 Kubernetes + Docker
 */

// 運行示例
if (require.main === module) {
  basicClusterExample();
}

export { ClusterManager, createWorkerApp };
