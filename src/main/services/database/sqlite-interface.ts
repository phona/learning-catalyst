export interface ISqliteOperations {
  setPath(dbPath: string): Promise<void>;
  executeQuery<T = unknown>(sql: string, params?: any[]): Promise<T>;
  fetchOne<T = Record<string, unknown>>(sql: string, params?: any[]): Promise<T | null>;
  fetchAll<T = Record<string, unknown>>(sql: string, params?: any[]): Promise<T[]>;
}