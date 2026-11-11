export const STATUSES = ['not_started', 'in_progress', 'blocked', 'done'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

const SYNONYMS: Record<string, Status> = {
  not_started: 'not_started',
  notstarted: 'not_started',
  todo: 'not_started',
  to_do: 'not_started',
  pending: 'not_started',
  open: 'not_started',
  new: 'not_started',
  in_progress: 'in_progress',
  inprogress: 'in_progress',
  doing: 'in_progress',
  started: 'in_progress',
  active: 'in_progress',
  wip: 'in_progress',
  blocked: 'blocked',
  on_hold: 'blocked',
  onhold: 'blocked',
  waiting: 'blocked',
  stuck: 'blocked',
  done: 'done',
  complete: 'done',
  completed: 'done',
  finished: 'done',
  shipped: 'done',
  closed: 'done',
};

/**
 * Accepts the canonical set plus the words a person or a model is likely to
 * use. Returns null when the value cannot be interpreted, so callers can
 * reject it with the allowed list.
 */
export function normalizeStatus(input: string): Status | null {
  const key = input
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return SYNONYMS[key] ?? null;
}

export const isStatus = (value: string): value is Status =>
  (STATUSES as readonly string[]).includes(value);
