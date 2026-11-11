export type Status = 'not_started' | 'in_progress' | 'blocked' | 'done';

export const STATUSES: Status[] = ['not_started', 'in_progress', 'blocked', 'done'];

export const STATUS_LABELS: Record<Status, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

export interface McpSummary {
  prefix: string;
  createdAt: string | null;
}

export interface Me {
  id: string;
  email: string;
  createdAt: string;
  mcp: McpSummary | null;
}

export interface Session {
  user: Me;
  appOrigin: string;
  mcpUrl: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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

export interface ProjectDetail {
  project: Omit<ProjectSummary, 'totalItems' | 'doneItems'>;
  items: Item[];
}

export interface ShareState {
  url: string | null;
}

export interface CredentialReveal {
  token: string;
  prefix: string;
  createdAt: string;
  url: string;
}
