import type {
  CredentialReveal,
  Item,
  ProjectDetail,
  ProjectSummary,
  Session,
  ShareState,
  Status,
} from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields ?? {};
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const error = (body ?? {}) as ErrorBody;
    throw new ApiError(
      response.status,
      error.error?.code ?? 'error',
      error.error?.message ?? 'Something went wrong. Try again.',
      error.error?.fields,
    );
  }

  return body as T;
}

const json = (value: unknown): string => JSON.stringify(value);

export const api = {
  session: () => request<Session>('/api/me'),

  signup: (email: string, password: string) =>
    request<Session>('/api/auth/signup', { method: 'POST', body: json({ email, password }) }),

  login: (email: string, password: string) =>
    request<Session>('/api/auth/login', { method: 'POST', body: json({ email, password }) }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  listProjects: () => request<{ projects: ProjectSummary[] }>('/api/projects'),

  createProject: (title: string, description: string) =>
    request<{ project: ProjectSummary }>('/api/projects', {
      method: 'POST',
      body: json({ title, description }),
    }),

  getProject: (id: string) => request<ProjectDetail>(`/api/projects/${encodeURIComponent(id)}`),

  updateProject: (id: string, patch: { title?: string; description?: string }) =>
    request<{ project: ProjectDetail['project'] }>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: json(patch),
    }),

  createItem: (
    projectId: string,
    input: { title: string; status?: Status; due_date?: string | null },
  ) =>
    request<{ item: Item }>(`/api/projects/${encodeURIComponent(projectId)}/items`, {
      method: 'POST',
      body: json(input),
    }),

  updateItem: (
    id: string,
    patch: { title?: string; status?: Status; due_date?: string | null },
  ) =>
    request<{ item: Item }>(`/api/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: json(patch),
    }),

  deleteItem: (id: string) =>
    request<void>(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getShare: (projectId: string) =>
    request<{ share: ShareState | null }>(`/api/projects/${encodeURIComponent(projectId)}/share`),

  createShare: (projectId: string) =>
    request<{ share: ShareState }>(`/api/projects/${encodeURIComponent(projectId)}/share`, {
      method: 'POST',
    }),

  revokeShare: (projectId: string) =>
    request<void>(`/api/projects/${encodeURIComponent(projectId)}/share`, { method: 'DELETE' }),

  createCredential: () =>
    request<{ credential: CredentialReveal; notice: string }>('/api/mcp-credential', {
      method: 'POST',
    }),

  regenerateCredential: () =>
    request<{ credential: CredentialReveal; notice: string }>('/api/mcp-credential/regenerate', {
      method: 'POST',
    }),

  revokeCredential: () => request<void>('/api/mcp-credential', { method: 'DELETE' }),
};
