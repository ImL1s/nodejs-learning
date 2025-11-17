/**
 * Streams 流處理
 * Node.js 流式數據處理
 *
 * 安裝依賴:
 * npm install @types/node
 */

import {
  Readable,
  Writable,
  Transform,
  Duplex,
  pipeline,
  finished
} from 'stream';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const pipelineAsync = promisify(pipeline);
const finishedAsync = promisify(finished);

// ==================== 類型定義 ====================

/**
 * 數據塊接口
 */
interface DataChunk {
  id: number;
  data: any;
  timestamp: Date;
}

/**
 * 流統計信息
 */
interface StreamStats {
  bytesRead: number;
  bytesWritten: number;
  chunksProcessed: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Transform 選項
 */
interface TransformOptions {
  highWaterMark?: number;
  objectMode?: boolean;
  encoding?: BufferEncoding;
}

// ==================== 自定義可讀流 ====================

/**
 * 數字生成器流
 * 生成指定範圍的數字序列
 */
export class NumberGeneratorStream extends Readable {
  private current: number;

  constructor(
    private start: number,
    private end: number,
    options?: TransformOptions
  ) {
    super({ ...options, objectMode: true });
    this.current = start;
  }

  _read(): void {
    if (this.current <= this.end) {
      // 推送數據到流
      this.push({ value: this.current, timestamp: new Date() });
      this.current++;
    } else {
      // 結束流
      this.push(null);
    }
  }
}

/**
 * 數組流
 * 將數組轉換為流
 */
export class ArrayStream<T> extends Readable {
  private index = 0;

  constructor(private array: T[], options?: TransformOptions) {
    super({ ...options, objectMode: true });
  }

  _read(): void {
    if (this.index < this.array.length) {
      this.push(this.array[this.index]);
      this.index++;
    } else {
      this.push(null);
    }
  }
}

/**
 * 延遲流
 * 按照指定延遲發送數據
 */
export class DelayedStream extends Readable {
  private index = 0;

  constructor(
    private data: any[],
    private delayMs: number,
    options?: TransformOptions
  ) {
    super({ ...options, objectMode: true });
  }

  _read(): void {
    if (this.index < this.data.length) {
      const item = this.data[this.index];
      this.index++;

      setTimeout(() => {
        this.push(item);
        if (this.index >= this.data.length) {
          this.push(null);
        }
      }, this.delayMs);
    }
  }
}

// ==================== 自定義可寫流 ====================

/**
 * 控制台寫入流
 * 將數據寫入控制台
 */
export class ConsoleStream extends Writable {
  private count = 0;

  constructor(private prefix: string = '', options?: TransformOptions) {
    super({ ...options, objectMode: true });
  }

  _write(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    try {
      this.count++;
      console.log(`${this.prefix}[${this.count}]`, chunk);
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    console.log(`${this.prefix}完成，共處理 ${this.count} 條數據`);
    callback();
  }
}

/**
 * 累加器流
 * 收集所有數據到數組
 */
export class CollectorStream<T> extends Writable {
  public data: T[] = [];

  constructor(options?: TransformOptions) {
    super({ ...options, objectMode: true });
  }

  _write(
    chunk: T,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.data.push(chunk);
    callback();
  }

  getData(): T[] {
    return this.data;
  }
}

// ==================== 自定義轉換流 ====================

/**
 * 映射轉換流
 * 對每個數據塊應用轉換函數
 */
export class MapStream<T, R> extends Transform {
  constructor(
    private mapFn: (chunk: T, index: number) => R,
    options?: TransformOptions
  ) {
    super({ ...options, objectMode: true });
    this.index = 0;
  }

  private index: number;

  _transform(
    chunk: T,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ): void {
    try {
      const result = this.mapFn(chunk, this.index++);
      callback(null, result);
    } catch (error) {
      callback(error as Error);
    }
  }
}

/**
 * 過濾轉換流
 * 只通過滿足條件的數據
 */
export class FilterStream<T> extends Transform {
  constructor(
    private filterFn: (chunk: T, index: number) => boolean,
    options?: TransformOptions
  ) {
    super({ ...options, objectMode: true });
    this.index = 0;
  }

  private index: number;

  _transform(
    chunk: T,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ): void {
    try {
      if (this.filterFn(chunk, this.index++)) {
        callback(null, chunk);
      } else {
        callback();
      }
    } catch (error) {
      callback(error as Error);
    }
  }
}

/**
 * 批處理轉換流
 * 將數據分批處理
 */
export class BatchStream<T> extends Transform {
  private batch: T[] = [];

  constructor(private batchSize: number, options?: TransformOptions) {
    super({ ...options, objectMode: true });
  }

  _transform(
    chunk: T,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ): void {
    this.batch.push(chunk);

    if (this.batch.length >= this.batchSize) {
      callback(null, [...this.batch]);
      this.batch = [];
    } else {
      callback();
    }
  }

  _flush(callback: (error?: Error | null, data?: any) => void): void {
    if (this.batch.length > 0) {
      callback(null, this.batch);
    } else {
      callback();
    }
  }
}

/**
 * 限流轉換流
 * 控制數據流速
 */
export class ThrottleStream extends Transform {
  private lastTime = Date.now();

  constructor(
    private delayMs: number,
    options?: TransformOptions
  ) {
    super({ ...options, objectMode: true });
  }

  _transform(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ): void {
    const now = Date.now();
    const timeSinceLastChunk = now - this.lastTime;

    if (timeSinceLastChunk >= this.delayMs) {
      this.lastTime = now;
      callback(null, chunk);
    } else {
      setTimeout(() => {
        this.lastTime = Date.now();
        callback(null, chunk);
      }, this.delayMs - timeSinceLastChunk);
    }
  }
}

/**
 * JSON 解析流
 * 解析 JSON 行
 */
export class JSONParseStream extends Transform {
  constructor(options?: TransformOptions) {
    super({ ...options, objectMode: true });
  }

  _transform(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ): void {
    try {
      const data = JSON.parse(chunk.toString());
      callback(null, data);
    } catch (error) {
      callback(error as Error);
    }
  }
}

/**
 * JSON 序列化流
 * 將對象序列化為 JSON
 */
export class JSONStringifyStream extends Transform {
  private isFirst = true;

  constructor(private pretty: boolean = false, options?: TransformOptions) {
    super({ ...options, objectMode: true });
  }

  _transform(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ): void {
    try {
      const json = this.pretty
        ? JSON.stringify(chunk, null, 2)
        : JSON.stringify(chunk);

      const prefix = this.isFirst ? '' : ',\n';
      this.isFirst = false;

      callback(null, prefix + json);
    } catch (error) {
      callback(error as Error);
    }
  }

  _flush(callback: (error?: Error | null, data?: any) => void): void {
    callback();
  }
}

// ==================== 流工具函數 ====================

/**
 * 將流轉換為數組
 */
export async function streamToArray<T>(stream: Readable): Promise<T[]> {
  const chunks: T[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: T) => chunks.push(chunk));
    stream.on('end', () => resolve(chunks));
    stream.on('error', reject);
  });
}

/**
 * 將數組轉換為流
 */
export function arrayToStream<T>(array: T[]): Readable {
  return new ArrayStream(array);
}

/**
 * 流計數器
 */
export function createCounter(): Transform {
  let count = 0;

  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      count++;
      this.push(chunk);
      callback();
    },
    flush(callback) {
      console.log(`📊 總共處理了 ${count} 條數據`);
      callback();
    }
  });
}

/**
 * 流分割器
 * 按條件分割流到多個輸出
 */
export class StreamSplitter<T> extends Writable {
  constructor(
    private predicate: (chunk: T) => boolean,
    private trueStream: Writable,
    private falseStream: Writable,
    options?: TransformOptions
  ) {
    super({ ...options, objectMode: true });
  }

  _write(
    chunk: T,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    const targetStream = this.predicate(chunk) ? this.trueStream : this.falseStream;
    targetStream.write(chunk, encoding, callback);
  }

  _final(callback: (error?: Error | null) => void): void {
    Promise.all([
      new Promise(resolve => this.trueStream.end(resolve)),
      new Promise(resolve => this.falseStream.end(resolve))
    ]).then(() => callback()).catch(callback);
  }
}

// ==================== 使用示例 ====================

/**
 * 基本流操作示例
 */
async function basicStreamExample() {
  console.log('\n=== 基本流操作 ===\n');

  // 創建數字生成器
  const numberStream = new NumberGeneratorStream(1, 10);

  // 創建轉換流：數字乘以 2
  const doubleStream = new MapStream<any, number>(
    (chunk) => chunk.value * 2
  );

  // 創建過濾流：只保留偶數
  const evenFilter = new FilterStream<number>(
    (num) => num % 2 === 0
  );

  // 創建控制台輸出流
  const consoleStream = new ConsoleStream('結果: ');

  // 組合流
  await pipelineAsync(
    numberStream,
    doubleStream,
    evenFilter,
    consoleStream
  );

  console.log('✅ 流處理完成\n');
}

/**
 * 批處理示例
 */
async function batchProcessingExample() {
  console.log('\n=== 批處理示例 ===\n');

  const data = Array.from({ length: 15 }, (_, i) => i + 1);
  const arrayStream = new ArrayStream(data);

  // 每 5 個數字一批
  const batchStream = new BatchStream(5);

  const collector = new CollectorStream<number[]>();

  await pipelineAsync(
    arrayStream,
    batchStream,
    collector
  );

  console.log('批處理結果:', collector.getData());
  console.log('✅ 批處理完成\n');
}

/**
 * 文件處理示例
 */
async function fileProcessingExample() {
  console.log('\n=== 文件處理示例 ===\n');

  // 創建示例文件
  const fs = require('fs').promises;
  const testFile = '/tmp/test-stream.txt';
  const compressedFile = '/tmp/test-stream.txt.gz';

  await fs.writeFile(testFile, 'Hello World!\n'.repeat(1000));

  // 壓縮文件
  console.log('📦 壓縮文件...');
  await pipelineAsync(
    createReadStream(testFile),
    createGzip(),
    createWriteStream(compressedFile)
  );
  console.log('✅ 壓縮完成');

  // 解壓文件
  console.log('📂 解壓文件...');
  await pipelineAsync(
    createReadStream(compressedFile),
    createGunzip(),
    createWriteStream('/tmp/test-stream-decompressed.txt')
  );
  console.log('✅ 解壓完成');

  // 檢查文件大小
  const originalStats = await fs.stat(testFile);
  const compressedStats = await fs.stat(compressedFile);

  console.log(`\n原文件大小: ${originalStats.size} bytes`);
  console.log(`壓縮後大小: ${compressedStats.size} bytes`);
  console.log(`壓縮率: ${(100 - compressedStats.size / originalStats.size * 100).toFixed(2)}%\n`);
}

/**
 * 流統計示例
 */
async function streamStatsExample() {
  console.log('\n=== 流統計示例 ===\n');

  class StatsStream extends Transform {
    private stats: StreamStats = {
      bytesRead: 0,
      bytesWritten: 0,
      chunksProcessed: 0,
      startTime: new Date()
    };

    constructor(options?: TransformOptions) {
      super({ ...options, objectMode: true });
    }

    _transform(
      chunk: any,
      encoding: BufferEncoding,
      callback: (error?: Error | null, data?: any) => void
    ): void {
      this.stats.chunksProcessed++;
      this.stats.bytesRead += Buffer.byteLength(JSON.stringify(chunk));
      callback(null, chunk);
    }

    _final(callback: (error?: Error | null) => void): void {
      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();

      console.log('📊 流統計:');
      console.log(`  處理數據塊: ${this.stats.chunksProcessed}`);
      console.log(`  讀取字節: ${this.stats.bytesRead}`);
      console.log(`  處理時間: ${this.stats.duration}ms`);
      console.log(`  速度: ${(this.stats.bytesRead / this.stats.duration * 1000).toFixed(2)} bytes/s\n`);

      callback();
    }
  }

  const data = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    value: Math.random(),
    timestamp: new Date()
  }));

  await pipelineAsync(
    new ArrayStream(data),
    new StatsStream(),
    new CollectorStream()
  );
}

/**
 * 錯誤處理示例
 */
async function errorHandlingExample() {
  console.log('\n=== 錯誤處理示例 ===\n');

  class ErrorProneStream extends Transform {
    private count = 0;

    constructor(options?: TransformOptions) {
      super({ ...options, objectMode: true });
    }

    _transform(
      chunk: any,
      encoding: BufferEncoding,
      callback: (error?: Error | null, data?: any) => void
    ): void {
      this.count++;

      // 模擬錯誤
      if (this.count === 5) {
        callback(new Error('處理第 5 個數據時出錯'));
        return;
      }

      callback(null, chunk);
    }
  }

  try {
    await pipelineAsync(
      new NumberGeneratorStream(1, 10),
      new ErrorProneStream(),
      new ConsoleStream()
    );
  } catch (error) {
    console.error('❌ 捕獲到錯誤:', (error as Error).message);
  }

  console.log('');
}

/**
 * 背壓處理示例
 */
async function backpressureExample() {
  console.log('\n=== 背壓處理示例 ===\n');

  class SlowWriteStream extends Writable {
    private count = 0;

    constructor(options?: TransformOptions) {
      super({ ...options, objectMode: true, highWaterMark: 5 });
    }

    _write(
      chunk: any,
      encoding: BufferEncoding,
      callback: (error?: Error | null) => void
    ): void {
      this.count++;
      console.log(`處理數據 ${this.count}...`);

      // 模擬慢速處理
      setTimeout(() => {
        console.log(`完成數據 ${this.count}`);
        callback();
      }, 100);
    }
  }

  const fastReader = new NumberGeneratorStream(1, 20);
  const slowWriter = new SlowWriteStream();

  console.log('開始處理（注意背壓控制）...\n');

  await pipelineAsync(fastReader, slowWriter);

  console.log('\n✅ 處理完成（自動處理了背壓）\n');
}

// ==================== 最佳實踐和常見陷阱 ====================

/**
 * 🎯 最佳實踐:
 *
 * 1. 使用 pipeline() 而不是 pipe()
 *    - pipeline() 自動處理錯誤和清理
 *    - pipe() 需要手動處理錯誤
 *
 * 2. 正確處理背壓
 *    - 監聽 drain 事件
 *    - 尊重 write() 返回值
 *    - 設置合理的 highWaterMark
 *
 * 3. 錯誤處理
 *    - 始終監聽 error 事件
 *    - 使用 pipeline() 統一處理錯誤
 *    - 實現錯誤恢復機制
 *
 * 4. 內存管理
 *    - 使用流處理大文件
 *    - 避免在內存中積累大量數據
 *    - 設置適當的 highWaterMark
 *
 * 5. 對象模式
 *    - 處理 JavaScript 對象時啟用 objectMode
 *    - 注意對象模式下 highWaterMark 是對象數量
 *
 * 6. 流組合
 *    - 使用 pipeline() 組合多個流
 *    - 創建可重用的流組件
 *    - 利用 Transform 實現中間處理
 *
 * ⚠️ 常見陷阱:
 *
 * 1. 忘記處理背壓
 *    - 快速讀取 + 慢速寫入 = 內存溢出
 *    - 必須監聽 drain 事件
 *
 * 2. 錯誤處理不當
 *    - 未監聽 error 事件導致進程崩潰
 *    - 流中的錯誤不會自動傳播
 *
 * 3. 流未正確結束
 *    - 忘記調用 end()
 *    - 忘記 push(null)
 *    - 導致流永遠不會完成
 *
 * 4. 內存洩漏
 *    - 未清理事件監聽器
 *    - 流引用未釋放
 *    - 未調用 destroy()
 *
 * 5. 數據類型混淆
 *    - 混用 Buffer 和字符串
 *    - 對象模式和非對象模式不匹配
 *
 * 6. 同步操作
 *    - 在 _transform 中使用同步阻塞操作
 *    - 應該使用異步操作
 */

/**
 * 💡 性能優化技巧:
 *
 * 1. 調整 highWaterMark
 * const stream = new Readable({ highWaterMark: 64 * 1024 }); // 64KB
 *
 * 2. 使用 pipeline 而不是多個 pipe
 * // 好
 * pipeline(source, transform, destination, callback);
 * // 不好
 * source.pipe(transform).pipe(destination);
 *
 * 3. 實現流池化
 * const pool = new StreamPool({ max: 10 });
 *
 * 4. 批量處理
 * const batch = new BatchStream(100); // 每 100 個處理一次
 *
 * 5. 並行處理
 * const parallel = new ParallelStream({ concurrency: 4 });
 */

// 運行示例
if (require.main === module) {
  (async () => {
    try {
      await basicStreamExample();
      await batchProcessingExample();
      await fileProcessingExample();
      await streamStatsExample();
      await errorHandlingExample();
      await backpressureExample();
    } catch (error) {
      console.error('示例執行失敗:', error);
    }
  })();
}
