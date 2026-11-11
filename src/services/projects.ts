import type { Item, Project, ProjectSummary, ProjectWithItems } from '../types.js';
import type { Status } from '../lib/status.js';
import { getDb } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  project_id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export const toProject = (row: ProjectRow): Project => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toItem = (row: ItemRow): Item => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  status: row.status as Status,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function listProjects(userId: string): ProjectSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM items i WHERE i.project_id = p.id) AS total_items,
              (SELECT COUNT(*) FROM items i WHERE i.project_id = p.id AND i.status = 'done') AS done_items
         FROM projects p
        WHERE p.user_id = ?
        ORDER BY p.updated_at DESC`,
    )
    .all(userId) as Array<ProjectRow & { total_items: number; done_items: number }>;

  return rows.map((row) => ({
    ...toProject(row),
    totalItems: row.total_items,
    doneItems: row.done_items,
  }));
}

export function createProject(userId: string, title: string, description: string): Project {
  const id = newId();
  const timestamp = nowIso();
  getDb()
    .prepare(
      `INSERT INTO projects (id, user_id, title, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    )
    .run(id, userId, title, description, timestamp, timestamp);
  return {
    id,
    title,
    description,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getProject(userId: string, projectId: string): Project | null {
  const row = getDb()
    .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(projectId, userId) as ProjectRow | undefined;
  return row ? toProject(row) : null;
}

export function getProjectWithItems(userId: string, projectId: string): ProjectWithItems | null {
  const project = getProject(userId, projectId);
  if (!project) return null;
  const rows = getDb()
    .prepare(
      `SELECT i.* FROM items i
         JOIN projects p ON p.id = i.project_id
        WHERE i.project_id = ? AND p.user_id = ?
        ORDER BY i.due_date IS NULL, i.due_date ASC, i.created_at ASC`,
    )
    .all(projectId, userId) as ItemRow[];
  return { project, items: rows.map(toItem) };
}

export function updateProject(
  userId: string,
  projectId: string,
  patch: { title?: string; description?: string },
): Project | null {
  const existing = getProject(userId, projectId);
  if (!existing) return null;
  const title = patch.title ?? existing.title;
  const description = patch.description ?? existing.description;
  const updatedAt = nowIso();
  getDb()
    .prepare('UPDATE projects SET title = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(title, description, updatedAt, projectId, userId);
  return { ...existing, title, description, updatedAt };
}

export function touchProject(projectId: string): void {
  getDb().prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(nowIso(), projectId);
}

export function listItemsForProject(projectId: string): Item[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM items WHERE project_id = ?
        ORDER BY due_date IS NULL, due_date ASC, created_at ASC`,
    )
    .all(projectId) as ItemRow[];
  return rows.map(toItem);
}
