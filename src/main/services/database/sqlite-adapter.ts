import { ISqliteOperations } from './sqlite-interface';
import { setdbPath, executeQuery, fetchOne, fetchAll } from 'sqlite-electron';

export class SqliteAdapter implements ISqliteOperations {
  async setPath(dbPath: string): Promise<void> {
    await setdbPath(dbPath);
  }

  async executeQuery<T = unknown>(sql: string, params: any[] = []): Promise<T> {
    return await executeQuery(sql, params);
  }

  async fetchOne<T = Record<string, unknown>>(sql: string, params: any[] = []): Promise<T | null> {
    const result = await fetchOne(sql, params);
    return result || null;
  }

  async fetchAll<T = Record<string, unknown>>(sql: string, params: any[] = []): Promise<T[]> {
    return await fetchAll(sql, params);
  }
}