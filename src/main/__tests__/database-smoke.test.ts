import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { setdbPath, executeQuery, fetchAll } from 'sqlite-electron';
import { runMigrations } from '@/main/services/database/kysely-database';

describe('sqlite-electron smoke test', () => {
  it('executes real sqlite-electron queries end-to-end', async () => {
    await runMigrations();

    const dbPath = path.join(process.cwd(), '.catalyst', 'smoke_direct.db');
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await setdbPath(dbPath, false, true);

    await executeQuery('CREATE TABLE IF NOT EXISTS smoke_entries (id TEXT PRIMARY KEY, value TEXT)');

    const entryId = `direct-${Date.now()}`;
    await executeQuery('INSERT INTO smoke_entries (id, value) VALUES (?, ?)', [entryId, 'ok']);

    const rows: any = await fetchAll('SELECT value FROM smoke_entries WHERE id = ?', [entryId]);
    const value =
      Array.isArray(rows) && rows.length
        ? rows[0]?.value ?? rows[0]?.VALUE
        : rows?.result?.[0]?.value ?? rows?.rows?.[0]?.value;

    expect(value).toBe('ok');

    await executeQuery('DELETE FROM smoke_entries WHERE id = ?', [entryId]);
  });
});
