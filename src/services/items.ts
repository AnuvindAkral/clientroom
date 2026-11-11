import type { Item } from '../types.js';
import type { Status } from '../lib/status.js';
import { getDb } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';
import { toItem, touchProject } from './projects.js';

interface ItemRow {
  id: string;
  project_id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export function getOwnedItem(userId: string, itemId: string): Item | null {
  const row = getDb()
    .prepare(
      `SELECT i.* FROM items i
         JOIN projects p ON p.id = i.project_id
        WHERE i.id = ? AND p.user_id = ?`,
    )
    .get(itemId, userId) as ItemRow | undefined;
  return row ? toItem(row) : null;
}

export function createItem(
  userId: string,
  projectId: string,
  input: { title: string; status: Status; dueDate: string | null },
): Item | null {
  const db = getDb();
  const owns = db
    .prepare('SELECT 1 AS ok FROM projects WHERE id = ? AND user_id = ?')
    .get(projectId, userId) as { ok?: number } | undefined;
  if (!owns) return null;

  const id = newId();
  const timestamp = nowIso();
  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO items (id, project_id, title, status, due_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, projectId, input.title, input.status, input.dueDate, timestamp, timestamp);
    touchProject(projectId);
  });
  run();

  return {
    id,
    projectId,
    title: input.title,
    status: input.status,
    dueDate: input.dueDate,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateItem(
  userId: string,
  itemId: string,
  patch: { title?: string; status?: Status; dueDate?: string | null },
): Item | null {
  const existing = getOwnedItem(userId, itemId);
  if (!existing) return null;

  const next = {
    title: patch.title ?? existing.title,
    status: patch.status ?? existing.status,
    dueDate: patch.dueDate === undefined ? existing.dueDate : patch.dueDate,
  };
  const updatedAt = nowIso();

  const run = getDb().transaction(() => {
    getDb()
      .prepare('UPDATE items SET title = ?, status = ?, due_date = ?, updated_at = ? WHERE id = ?')
      .run(next.title, next.status, next.dueDate, updatedAt, itemId);
    touchProject(existing.projectId);
  });
  run();

  return { ...existing, ...next, updatedAt };
}

export function deleteItem(userId: string, itemId: string): boolean {
  const existing = getOwnedItem(userId, itemId);
  if (!existing) return false;
  const run = getDb().transaction(() => {
    getDb().prepare('DELETE FROM items WHERE id = ?').run(itemId);
    touchProject(existing.projectId);
  });
  run();
  return true;
}
