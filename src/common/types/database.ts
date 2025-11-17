/**
 * 共享數據庫類型定義
 *
 * 這些類型用於數據庫操作，避免使用 any
 */

/**
 * SQL 查詢參數類型
 * 支持所有常見的 PostgreSQL 數據類型
 */
export type QueryParam = string | number | boolean | Date | null | Buffer;

/**
 * 數據庫行類型
 * 用於從數據庫返回的原始行數據
 */
export interface DatabaseRow {
  [key: string]: QueryParam;
}

/**
 * 數據庫查詢結果
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number | null;
  command: string;
}
