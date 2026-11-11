import type { Item, Project, ShareLink } from '../types.js';
import { getDb } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';
import { generateShareToken, decryptShareToken, encryptShareToken, sha256 } from '../lib/tokens.js';
import { getProject } from './projects.js';

interface ShareRow {
  id: string;
  project_id: string;
  token_hash: string;
  token_enc: string;
  created_at: string;
  revoked: number;
  expires_at: string | null;
}

interface PublicRow {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  revoked: number;
  expires_at: string | null;
}

const toShare = (row: ShareRow): ShareLink => ({
  id: row.id,
  projectId: row.project_id,
  createdAt: row.created_at,
  revoked: row.revoked === 1,
  expiresAt: row.expires_at,
});

export function getActiveShareLink(userId: string, projectId: string): ShareLink | null {
  const row = getDb()
    .prepare(
      `SELECT s.* FROM share_links s
         JOIN projects p ON p.id = s.project_id
        WHERE s.project_id = ? AND p.user_id = ? AND s.revoked = 0
        ORDER BY s.created_at DESC LIMIT 1`,
    )
    .get(projectId, userId) as ShareRow | undefined;
  return row ? toShare(row) : null;
}

/**
 * Creates a new link and revokes any previous live link for the same project,
 * so a project has at most one usable link at a time.
 */
export function createShareLink(
  userId: string,
  projectId: string,
): { link: ShareLink; rawToken: string } | null {
  const project = getProject(userId, projectId);
  if (!project) return null;

  const db = getDb();
  const token = generateShareToken();
  const id = newId();
  const createdAt = nowIso();

  const run = db.transaction(() => {
    db.prepare('UPDATE share_links SET revoked = 1 WHERE project_id = ? AND revoked = 0').run(
      projectId,
    );
    db.prepare(
      'INSERT INTO share_links (id, project_id, token_hash, token_enc, created_at, revoked) VALUES (?, ?, ?, ?, ?, 0)',
    ).run(id, projectId, token.hash, encryptShareToken(token.raw), createdAt);
  });
  run();

  return {
    rawToken: token.raw,
    link: { id, projectId, createdAt, revoked: false, expiresAt: null },
  };
}

export function getActiveShareUrl(userId: string, projectId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT s.* FROM share_links s
         JOIN projects p ON p.id = s.project_id
        WHERE s.project_id = ? AND p.user_id = ? AND s.revoked = 0
        ORDER BY s.created_at DESC LIMIT 1`,
    )
    .get(projectId, userId) as ShareRow | undefined;
  if (!row) return null;
  const raw = decryptShareToken(row.token_enc);
  return raw ? `/s/${raw}` : null;
}

export function revokeShareLink(userId: string, projectId: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE share_links SET revoked = 1
        WHERE project_id = ? AND revoked = 0
          AND project_id IN (SELECT id FROM projects WHERE id = ? AND user_id = ?)`,
    )
    .run(projectId, projectId, userId);
  return result.changes > 0;
}

export type ShareResolution =
  | { state: 'ok'; project: Pick<Project, 'id' | 'title' | 'status' | 'updatedAt'>; items: Item[] }
  | { state: 'revoked' }
  | { state: 'not_found' };

/**
 * Public resolution. The description is deliberately excluded so internal
 * notes can never reach a client.
 */
export function resolveShareToken(rawToken: string): ShareResolution {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.id, p.title, p.description, p.status, p.created_at, p.updated_at,
              s.revoked, s.expires_at
         FROM share_links s
         JOIN projects p ON p.id = s.project_id
        WHERE s.token_hash = ?`,
    )
    .get(sha256(rawToken)) as PublicRow | undefined;

  if (!row) return { state: 'not_found' };
  if (row.revoked === 1) return { state: 'revoked' };
  if (row.expires_at && row.expires_at <= nowIso()) return { state: 'revoked' };

  const items = db
    .prepare(
      `SELECT * FROM items WHERE project_id = ?
        ORDER BY due_date IS NULL, due_date ASC, created_at ASC`,
    )
    .all(row.id) as Array<{
    id: string;
    project_id: string;
    title: string;
    status: string;
    due_date: string | null;
    created_at: string;
    updated_at: string;
  }>;

  return {
    state: 'ok',
    project: {
      id: row.id,
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
    },
    items: items.map((item) => ({
      id: item.id,
      projectId: item.project_id,
      title: item.title,
      status: item.status as Item['status'],
      dueDate: item.due_date,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  };
}
