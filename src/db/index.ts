import Database from 'better-sqlite3';
import { mkdirSync, existsSync, accessSync, constants } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { MIGRATIONS } from './schema.js';

export type Db = Database.Database;

let instance: Db | null = null;

function open(path: string): Db {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
    if (existsSync(path)) {
      accessSync(path, constants.R_OK | constants.W_OK);
    }
  }

  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  return db;
}

function migrate(db: Db): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    const run = db.transaction(() => {
      db.exec(migration.sql);
      db.pragma(`user_version = ${migration.version}`);
    });
    run();
    logger.info('database migrated', { version: migration.version });
  }
}

export function getDb(): Db {
  if (instance) return instance;
  const db = open(config.databasePath);
  migrate(db);
  instance = db;
  return db;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export function pingDb(): boolean {
  try {
    const row = getDb().prepare('SELECT 1 AS ok').get() as { ok?: number } | undefined;
    return row?.ok === 1;
  } catch {
    return false;
  }
}

/** Test helper. Creates an isolated in-memory database. */
export function useTestDb(): Db {
  instance = open(':memory:');
  migrate(instance);
  return instance;
}
