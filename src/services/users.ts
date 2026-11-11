import type { User } from '../types.js';
import { getDb } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';
import { conflict } from '../lib/errors.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  mcp_token_hash: string | null;
  mcp_token_prefix: string | null;
  mcp_token_created_at: string | null;
  created_at: string;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  createdAt: row.created_at,
  mcpTokenPrefix: row.mcp_token_prefix,
  mcpTokenCreatedAt: row.mcp_token_created_at,
});

export function createUser(email: string, passwordHash: string): User {
  const db = getDb();
  const id = newId();
  const createdAt = nowIso();
  try {
    db.prepare(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    ).run(id, email, passwordHash, createdAt);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: users.email')) {
      throw conflict('That email already has an account.', {
        email: 'That email already has an account.',
      });
    }
    throw error;
  }
  return { id, email, createdAt, mcpTokenPrefix: null, mcpTokenCreatedAt: null };
}

export function findUserByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | UserRow
    | undefined;
  if (!row) return null;
  return { ...toUser(row), passwordHash: row.password_hash };
}

export function findUserById(id: string): User | null {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function setMcpCredential(userId: string, hash: string, prefix: string): string {
  const createdAt = nowIso();
  getDb()
    .prepare(
      'UPDATE users SET mcp_token_hash = ?, mcp_token_prefix = ?, mcp_token_created_at = ? WHERE id = ?',
    )
    .run(hash, prefix, createdAt, userId);
  return createdAt;
}

export function clearMcpCredential(userId: string): void {
  getDb()
    .prepare(
      'UPDATE users SET mcp_token_hash = NULL, mcp_token_prefix = NULL, mcp_token_created_at = NULL WHERE id = ?',
    )
    .run(userId);
}

export function findUserByMcpTokenHash(hash: string): User | null {
  const row = getDb().prepare('SELECT * FROM users WHERE mcp_token_hash = ?').get(hash) as
    | UserRow
    | undefined;
  return row ? toUser(row) : null;
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  return row.count;
}
