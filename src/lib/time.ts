export const nowIso = (): string => new Date().toISOString();

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Accepts only real calendar dates in YYYY-MM-DD form. */
export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatShortDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function isOverdue(dueDate: string | null, status: string, today = new Date()): boolean {
  if (!dueDate || status === 'done') return false;
  return dueDate < today.toISOString().slice(0, 10);
}
