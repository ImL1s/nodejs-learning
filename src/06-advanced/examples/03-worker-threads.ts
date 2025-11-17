/**
 * Worker Threads 多線程
 * Node.js 的多線程編程實現
 *
 * 安裝依賴:
 * npm install @types/node
 */

import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
  MessageChannel,
  MessagePort
} from 'worker_threads';
import { cpus } from 'os';
import path from 'path';
import { EventEmitter } from 'events';

// ==================== 類型定義 ====================

/**
 * Worker 任務接口
 */
interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve?: (value: R) => void;
  reject?: (error: Error) => void;
}

/**
 * Worker 消息類型
 */
interface WorkerMessage<T = any> {
  type: 'task' | 'result' | 'error' | 'progress';
  taskId?: string;
  data?: T;
  error?: string;
  progress?: number;
}

/**
 * Worker Pool 配置
 */
interface WorkerPoolOptions {
  minWorkers?: number;
  maxWorkers?: number;
  workerScript?: string;
  idleTimeout?: number;
}

/**
 * Worker 統計信息
 */
interface WorkerStats {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
}

// ==================== Worker Pool 實現 ====================

/**
 * Worker Pool 類
 * 管理一組 Worker 線程，提供任務隊列和負載均衡
 */
export class WorkerPool extends EventEmitter {
  private workers: Map<number, Worker> = new Map();
  private availableWorkers: Set<number> = new Set();
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private stats = {
    completedTasks: 0,
    failedTasks: 0,
    totalTaskTime: 0
  };
  private workerIdCounter = 0;

  constructor(private options: WorkerPoolOptions = {}) {
    super();
    this.options = {
      minWorkers: 2,
      maxWorkers: cpus().length,
      idleTimeout: 30000,
      ...options
    };

    // 創建最小數量的 Worker
    for (let i = 0; i < this.options.minWorkers!; i++) {
      this.createWorker();
    }
  }

  /**
   * 創建新的 Worker
   */
  private createWorker(): number {
    const workerId = this.workerIdCounter++;
    const workerScript = this.options.workerScript || __filename;

    const worker = new Worker(workerScript, {
      workerData: { workerId }
    });

    worker.on('message', (message: WorkerMessage) => {
      this.handleWorkerMessage(workerId, message);
    });

    worker.on('error', (error) => {
      console.error(`❌ Worker ${workerId} 錯誤:`, error);
      this.emit('worker-error', { workerId, error });
      this.removeWorker(workerId);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Worker ${workerId} 異常退出，代碼: ${code}`);
      }
      this.removeWorker(workerId);
    });

    this.workers.set(workerId, worker);
    this.availableWorkers.add(workerId);

    console.log(`✅ Worker ${workerId} 已創建`);
    return workerId;
  }

  /**
   * 移除 Worker
   */
  private async removeWorker(workerId: number): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      await worker.terminate();
      this.workers.delete(workerId);
      this.availableWorkers.delete(workerId);
      console.log(`🗑️  Worker ${workerId} 已移除`);
    }
  }

  /**
   * 處理 Worker 消息
   */
  private handleWorkerMessage(workerId: number, message: WorkerMessage): void {
    const { type, taskId, data, error, progress } = message;

    switch (type) {
      case 'result':
        if (taskId) {
          const task = this.activeTasks.get(taskId);
          if (task) {
            const taskTime = Date.now() - parseInt(taskId.split('-')[0]);
            this.stats.completedTasks++;
            this.stats.totalTaskTime += taskTime;

            task.resolve?.(data);
            this.activeTasks.delete(taskId);
            this.availableWorkers.add(workerId);
            this.processNextTask();
          }
        }
        break;

      case 'error':
        if (taskId) {
          const task = this.activeTasks.get(taskId);
          if (task) {
            this.stats.failedTasks++;
            task.reject?.(new Error(error || '未知錯誤'));
            this.activeTasks.delete(taskId);
            this.availableWorkers.add(workerId);
            this.processNextTask();
          }
        }
        break;

      case 'progress':
        if (taskId) {
          this.emit('task-progress', { taskId, progress });
        }
        break;
    }
  }

  /**
   * 執行任務
   */
  execute<T = any, R = any>(type: string, data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        data,
        resolve,
        reject
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * 處理下一個任務
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    // 檢查是否有可用的 Worker
    if (this.availableWorkers.size === 0) {
      // 如果還沒達到最大 Worker 數，創建新的
      if (this.workers.size < this.options.maxWorkers!) {
        this.createWorker();
      }
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    const workerId = Array.from(this.availableWorkers)[0];
    this.availableWorkers.delete(workerId);
    this.activeTasks.set(task.id, task);

    const worker = this.workers.get(workerId);
    worker?.postMessage({
      type: 'task',
      taskId: task.id,
      taskType: task.type,
      data: task.data
    });
  }

  /**
   * 獲取統計信息
   */
  getStats(): WorkerStats {
    const avgTime = this.stats.completedTasks > 0
      ? this.stats.totalTaskTime / this.stats.completedTasks
      : 0;

    return {
      totalWorkers: this.workers.size,
      activeWorkers: this.workers.size - this.availableWorkers.size,
      idleWorkers: this.availableWorkers.size,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      averageTaskTime: Math.round(avgTime)
    };
  }

  /**
   * 關閉 Worker Pool
   */
  async terminate(): Promise<void> {
    const terminatePromises = Array.from(this.workers.keys()).map(
      workerId => this.removeWorker(workerId)
    );
    await Promise.all(terminatePromises);
    console.log('📴 Worker Pool 已關閉');
  }
}

// ==================== Worker 線程處理器 ====================

/**
 * Worker 線程的消息處理
 * 這段代碼在 Worker 線程中運行
 */
if (!isMainThread && parentPort) {
  const workerId = workerData.workerId;

  console.log(`🧵 Worker ${workerId} 已啟動`);

  parentPort.on('message', async (message: WorkerMessage) => {
    const { type, taskId, taskType, data } = message;

    if (type === 'task' && taskId) {
      try {
        // 根據任務類型處理任務
        const result = await processTask(taskType!, data);

        parentPort!.postMessage({
          type: 'result',
          taskId,
          data: result
        });
      } catch (error) {
        parentPort!.postMessage({
          type: 'error',
          taskId,
          error: error instanceof Error ? error.message : '未知錯誤'
        });
      }
    }
  });

  /**
   * 處理具體任務
   */
  async function processTask(taskType: string, data: any): Promise<any> {
    switch (taskType) {
      case 'fibonacci':
        return calculateFibonacci(data.n);

      case 'prime':
        return findPrimes(data.max);

      case 'hash':
        return hashPassword(data.password);

      case 'image':
        return processImage(data.imageData);

      case 'heavy':
        return heavyComputation(data.iterations);

      default:
        throw new Error(`未知任務類型: ${taskType}`);
    }
  }

  /**
   * 計算斐波那契數列
   */
  function calculateFibonacci(n: number): number {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  /**
   * 查找質數
   */
  function findPrimes(max: number): number[] {
    const primes: number[] = [];
    for (let i = 2; i <= max; i++) {
      let isPrime = true;
      for (let j = 2; j <= Math.sqrt(i); j++) {
        if (i % j === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) primes.push(i);

      // 報告進度
      if (i % 1000 === 0) {
        parentPort!.postMessage({
          type: 'progress',
          taskId: 'current',
          progress: (i / max) * 100
        });
      }
    }
    return primes;
  }

  /**
   * 密碼哈希（模擬）
   */
  function hashPassword(password: string): string {
    // 實際應用中使用 bcrypt 或 argon2
    let hash = 0;
    for (let i = 0; i < 10000; i++) {
      for (let j = 0; j < password.length; j++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(j);
        hash = hash & hash;
      }
    }
    return hash.toString(16);
  }

  /**
   * 圖片處理（模擬）
   */
  function processImage(imageData: any): any {
    // 模擬圖片處理
    return {
      processed: true,
      size: imageData.length,
      timestamp: Date.now()
    };
  }

  /**
   * 重計算任務
   */
  function heavyComputation(iterations: number): number {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i);
    }
    return result;
  }
}

// ==================== 專用 Worker 包裝器 ====================

/**
 * 專用 Worker 類
 * 用於創建單一用途的 Worker
 */
export class DedicatedWorker<T = any, R = any> {
  private worker: Worker;
  private messageId = 0;
  private pendingMessages: Map<number, {
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(workerScript: string, workerData?: any) {
    this.worker = new Worker(workerScript, { workerData });

    this.worker.on('message', ({ id, result, error }) => {
      const pending = this.pendingMessages.get(id);
      if (pending) {
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
        this.pendingMessages.delete(id);
      }
    });

    this.worker.on('error', (error) => {
      console.error('Worker 錯誤:', error);
    });
  }

  /**
   * 發送消息給 Worker
   */
  async execute(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingMessages.set(id, { resolve, reject });
      this.worker.postMessage({ id, data });
    });
  }

  /**
   * 終止 Worker
   */
  async terminate(): Promise<void> {
    await this.worker.terminate();
  }
}

// ==================== MessageChannel 示例 ====================

/**
 * 使用 MessageChannel 實現 Worker 間通信
 */
export class WorkerMessenger {
  private worker1: Worker;
  private worker2: Worker;

  constructor(script1: string, script2: string) {
    const { port1, port2 } = new MessageChannel();

    this.worker1 = new Worker(script1);
    this.worker2 = new Worker(script2);

    // 將端口傳遞給 Worker
    this.worker1.postMessage({ port: port1 }, [port1]);
    this.worker2.postMessage({ port: port2 }, [port2]);
  }

  async terminate(): Promise<void> {
    await Promise.all([
      this.worker1.terminate(),
      this.worker2.terminate()
    ]);
  }
}

// ==================== 使用示例 ====================

/**
 * Worker Pool 示例
 */
async function workerPoolExample() {
  console.log('\n=== Worker Pool 示例 ===\n');

  const pool = new WorkerPool({
    minWorkers: 2,
    maxWorkers: 4
  });

  // 監聽進度事件
  pool.on('task-progress', ({ taskId, progress }) => {
    console.log(`📊 任務 ${taskId} 進度: ${progress.toFixed(2)}%`);
  });

  try {
    // 並發執行多個任務
    console.log('開始執行任務...\n');

    const tasks = [
      pool.execute('fibonacci', { n: 40 }),
      pool.execute('fibonacci', { n: 41 }),
      pool.execute('fibonacci', { n: 42 }),
      pool.execute('prime', { max: 10000 }),
      pool.execute('hash', { password: 'secret123' }),
      pool.execute('heavy', { iterations: 10000000 })
    ];

    const results = await Promise.all(tasks);

    console.log('\n結果:');
    console.log('Fibonacci(40):', results[0]);
    console.log('Fibonacci(41):', results[1]);
    console.log('Fibonacci(42):', results[2]);
    console.log('質數數量:', results[3].length);
    console.log('密碼哈希:', results[4]);
    console.log('重計算結果:', results[5]);

    // 顯示統計
    const stats = pool.getStats();
    console.log('\n📈 統計信息:');
    console.log(`  總 Worker 數: ${stats.totalWorkers}`);
    console.log(`  活躍 Worker: ${stats.activeWorkers}`);
    console.log(`  空閒 Worker: ${stats.idleWorkers}`);
    console.log(`  完成任務數: ${stats.completedTasks}`);
    console.log(`  失敗任務數: ${stats.failedTasks}`);
    console.log(`  平均任務時間: ${stats.averageTaskTime}ms`);

  } finally {
    await pool.terminate();
  }
}

/**
 * 性能對比示例
 */
async function performanceComparisonExample() {
  console.log('\n=== 性能對比：單線程 vs 多線程 ===\n');

  const iterations = 10000000;

  // 單線程計算
  console.time('單線程');
  let singleThreadResult = 0;
  for (let i = 0; i < iterations; i++) {
    singleThreadResult += Math.sqrt(i) * Math.sin(i);
  }
  console.timeEnd('單線程');
  console.log('結果:', singleThreadResult);

  // 多線程計算
  const pool = new WorkerPool({ minWorkers: 4, maxWorkers: 4 });

  console.time('多線程');
  const chunkSize = iterations / 4;
  const tasks = Array.from({ length: 4 }, (_, i) =>
    pool.execute('heavy', { iterations: chunkSize })
  );
  const results = await Promise.all(tasks);
  const multiThreadResult = results.reduce((sum, r) => sum + r, 0);
  console.timeEnd('多線程');
  console.log('結果:', multiThreadResult);

  await pool.terminate();
}

// ==================== 最佳實踐和常見陷阱 ====================

/**
 * 🎯 最佳實踐:
 *
 * 1. 合理使用場景
 *    - CPU 密集型任務（加密、壓縮、計算）
 *    - 圖片/視頻處理
 *    - 大數據處理
 *    ❌ 不適合 I/O 密集型任務（數據庫查詢、文件讀寫）
 *
 * 2. Worker Pool 管理
 *    - 限制最大 Worker 數量（通常為 CPU 核心數）
 *    - 實現空閒 Worker 回收機制
 *    - 優雅關閉 Worker
 *
 * 3. 數據傳遞
 *    - 小數據：使用結構化克隆
 *    - 大數據：使用 Transferable Objects (ArrayBuffer)
 *    - 共享數據：使用 SharedArrayBuffer
 *
 * 4. 錯誤處理
 *    - 監聽 error 和 exit 事件
 *    - 實現任務超時機制
 *    - Worker 崩潰後重啟
 *
 * 5. 通信模式
 *    - Request-Response: 一問一答
 *    - Pub-Sub: 發布訂閱
 *    - MessageChannel: Worker 間通信
 *
 * 6. 監控和調試
 *    - 記錄 Worker 狀態
 *    - 統計任務執行時間
 *    - 使用 Chrome DevTools 調試
 *
 * ⚠️ 常見陷阱:
 *
 * 1. 過度使用
 *    - Worker 創建有開銷，不要為小任務創建 Worker
 *    - 創建過多 Worker 反而降低性能
 *
 * 2. 數據序列化
 *    - 大對象序列化開銷大
 *    - 不能傳遞函數、Symbol
 *    - 循環引用會報錯
 *
 * 3. 內存洩漏
 *    - 忘記終止 Worker
 *    - Worker 內部內存洩漏
 *    - 消息監聽器未清理
 *
 * 4. 共享狀態
 *    - Worker 之間不共享內存（除了 SharedArrayBuffer）
 *    - 不能直接訪問主線程變量
 *    - 需要明確的消息傳遞
 *
 * 5. 調試困難
 *    - Worker 錯誤堆棧不完整
 *    - 難以追蹤跨線程問題
 *    - 需要額外的日誌記錄
 *
 * 6. 兼容性
 *    - Node.js 10.5+ 才支持
 *    - 某些模塊在 Worker 中不可用
 *    - SharedArrayBuffer 需要特殊配置
 */

/**
 * 💡 性能優化技巧:
 *
 * 1. 使用 Transferable Objects
 * const buffer = new ArrayBuffer(1024);
 * worker.postMessage({ buffer }, [buffer]); // 轉移所有權，零拷貝
 *
 * 2. 使用 SharedArrayBuffer（需要 CORS 設置）
 * const shared = new SharedArrayBuffer(1024);
 * const view = new Int32Array(shared);
 * worker.postMessage({ shared }); // 共享內存
 *
 * 3. Worker Pool 預熱
 * await Promise.all(
 *   workers.map(w => w.postMessage({ type: 'warmup' }))
 * );
 *
 * 4. 任務批處理
 * // 批量處理多個小任務，減少消息開銷
 * worker.postMessage({ tasks: [task1, task2, task3] });
 */

// 運行示例
if (require.main === module && isMainThread) {
  (async () => {
    try {
      await workerPoolExample();
      await performanceComparisonExample();
    } catch (error) {
      console.error('示例執行失敗:', error);
    }
  })();
}
