import type { Status } from './lib/status.js';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  mcpTokenPrefix: string | null;
  mcpTokenCreatedAt: string | null;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  totalItems: number;
  doneItems: number;
}

export interface Item {
  id: string;
  projectId: string;
  title: string;
  status: Status;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithItems {
  project: Project;
  items: Item[];
}

export interface ShareLink {
  id: string;
  projectId: string;
  createdAt: string;
  revoked: boolean;
  expiresAt: string | null;
}
