const SHORT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const LONG = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `2026-11-12` becomes `12 Nov`. Empty input returns an empty string. */
export function formatDue(value: string | null): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return SHORT.format(date);
}

/** ISO timestamp becomes `12 Nov 2026`. */
export function formatLong(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return LONG.format(date);
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  if (diff < 45_000) return 'just now';
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDue(iso.slice(0, 10));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'done') return false;
  return dueDate < todayIso();
}

export function countsLabel(total: number, done: number): string {
  if (total === 0) return 'No deliverables';
  const noun = total === 1 ? 'deliverable' : 'deliverables';
  return `${total} ${noun} · ${done} done`;
}
