import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import Database from 'better-sqlite3';
import {
  createDatabaseAtPath,
  runMigrationsAtPath,
} from '@/main/services/core/database/kysely-database';

interface DatabaseRow {
  value: string;
  [key: string]: unknown;
}

describe('better-sqlite3 smoke test', () => {
  it('executes real better-sqlite3 queries end-to-end', async () => {
    const dbPath = path.join(process.cwd(), '.catalyst', 'smoke_direct.db');
    const db = await createDatabaseAtPath(dbPath);
    await runMigrationsAtPath(dbPath);

    // Direct better-sqlite3 test
    const sqliteDb = new Database(dbPath);
    sqliteDb.exec('CREATE TABLE IF NOT EXISTS smoke_entries (id TEXT PRIMARY KEY, value TEXT)');

    const entryId = `direct-${Date.now()}`;
    const stmt = sqliteDb.prepare('INSERT INTO smoke_entries (id, value) VALUES (?, ?)');
    stmt.run(entryId, 'ok');

    const selectStmt = sqliteDb.prepare('SELECT value FROM smoke_entries WHERE id = ?');
    const rows = selectStmt.get(entryId) as DatabaseRow;

    expect(rows.value).toBe('ok');

    const deleteStmt = sqliteDb.prepare('DELETE FROM smoke_entries WHERE id = ?');
    deleteStmt.run(entryId);

    sqliteDb.close();
  });
});
