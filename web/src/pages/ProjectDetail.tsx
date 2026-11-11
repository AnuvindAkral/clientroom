import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { api, ApiError } from '../api';
import { countsLabel, formatLong, isOverdue } from '../format';
import { useRouter } from '../router';
import { useProjectList } from '../shell';
import {
  Banner,
  Button,
  EmptyState,
  SkeletonRows,
  StatusSelect,
  TextInput,
  useCopy,
  useEscape,
  useToast,
} from '../ui';
import type { Item, ProjectDetail, Status } from '../types';

function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.dueDate === null && b.dueDate === null) return a.createdAt.localeCompare(b.createdAt);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

/* ---------------- editable project title ---------------- */

function EditableTitle({ value, onSave }: { value: string; onSave: (next: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === value) {
      setDraft(value);
      return;
    }
    void onSave(next);
  }

  return (
    <div className="title-row">
      <h1>
        {editing ? (
          <input
            className="inline-input"
            value={draft}
            autoFocus
            aria-label="Project name"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setDraft(value);
                setEditing(false);
              }
            }}
          />
        ) : (
          value
        )}
      </h1>
      {!editing ? (
        <Button variant="ghost" size="small" onClick={() => setEditing(true)}>
          Rename
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------- deliverable row ---------------- */

function DeliverableRow({
  item,
  onPatch,
  onDelete,
}: {
  item: Item;
  onPatch: (patch: { title?: string; status?: Status; due_date?: string | null }) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(item.title);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setDraft(item.title);
  }, [item.title]);

  function commitTitle() {
    const next = draft.trim();
    if (!next) {
      setDraft(item.title);
      return;
    }
    if (next !== item.title) onPatch({ title: next });
  }

  const overdue = isOverdue(item.dueDate, item.status);

  return (
    <div className="row">
      <input
        className="inline-input row-title"
        value={draft}
        aria-label={`Deliverable title: ${item.title}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            setDraft(item.title);
            event.currentTarget.blur();
          }
        }}
      />

      <StatusSelect
        value={item.status}
        label={`Status for ${item.title}`}
        onChange={(next) => onPatch({ status: next })}
      />

      <input
        type="date"
        className={`date-input${overdue ? ' overdue' : ''}`}
        value={item.dueDate ?? ''}
        aria-label={`Due date for ${item.title}`}
        onChange={(event) => onPatch({ due_date: event.target.value || null })}
      />

      <div className="row-actions">
        {confirming ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button variant="danger" size="small" onClick={onDelete}>
              Delete
            </Button>
            <Button variant="ghost" size="small" onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="small"
            aria-label={`Delete ${item.title}`}
            onClick={() => setConfirming(true)}
          >
            ✕
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------------- add row ---------------- */

function AddRow({ onAdd }: { onAdd: (input: { title: string; status: Status; due_date: string | null }) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('not_started');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = title.trim();
    if (!next) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const ok = await onAdd({ title: next, status, due_date: due || null });
    setBusy(false);
    if (ok) {
      setTitle('');
      setStatus('not_started');
      setDue('');
      inputRef.current?.focus();
    }
  }

  if (!open) {
    return (
      <div style={{ padding: '16px 0' }}>
        <Button variant="secondary" size="small" onClick={() => setOpen(true)}>
          + Add deliverable
        </Button>
      </div>
    );
  }

  return (
    <form className="add-row" onSubmit={submit}>
      <TextInput
        ref={inputRef}
        className="add-title"
        placeholder="What is being delivered?"
        aria-label="New deliverable title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setTitle('');
            setOpen(false);
          }
        }}
      />
      <StatusSelect value={status} label="New deliverable status" onChange={setStatus} />
      <input
        type="date"
        className="date-input"
        aria-label="New deliverable due date"
        value={due}
        onChange={(event) => setDue(event.target.value)}
        style={{ borderColor: 'var(--rule-strong)', background: 'var(--surface)', padding: '9px 8px' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <Button type="submit" size="small" disabled={busy}>
          {busy ? 'Adding…' : 'Add'}
        </Button>
        <Button variant="ghost" size="small" onClick={() => setOpen(false)}>
          Done
        </Button>
      </div>
    </form>
  );
}

/* ---------------- share panel ---------------- */

function SharePanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const copy = useCopy();
  const { show } = useToast();

  useEscape(true, onClose);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getShare(projectId);
      setUrl(result.share?.url ?? null);
    } catch {
      setError('Could not load the client link.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setError('');
    try {
      const result = await api.createShare(projectId);
      setUrl(result.share.url);
      show('Client link created');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the link.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError('');
    try {
      await api.revokeShare(projectId);
      setUrl(null);
      setConfirming(false);
      show('Link revoked');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-label="Client link">
      <div className="panel-head">
        <h2 style={{ margin: 0 }}>Client link</h2>
        <Button variant="ghost" size="small" onClick={onClose} aria-label="Close client link panel">
          Close
        </Button>
      </div>

      {error ? <Banner message={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <p>Loading…</p>
      ) : url ? (
        <>
          <p>
            Anyone with this link can read the deliverables on this project. They cannot edit, and
            they do not need an account.
          </p>
          <div className="copy-row">
            <input className="input" readOnly value={url} aria-label="Client link URL" onFocus={(e) => e.currentTarget.select()} />
            <Button size="small" onClick={() => void copy(url, 'Link copied')}>
              Copy
            </Button>
            <a className="btn secondary small" href={url} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
          <p className="panel-note" style={{ marginTop: 16 }}>
            Revoking takes effect immediately. You can create a new link at any time.
          </p>
          <div className="panel-actions">
            {confirming ? (
              <>
                <span style={{ alignSelf: 'center', fontSize: 13.5, color: 'var(--danger)' }}>
                  Revoke this link? The client will lose access.
                </span>
                <Button variant="danger" size="small" disabled={busy} onClick={() => void revoke()}>
                  Revoke link
                </Button>
                <Button variant="ghost" size="small" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="danger" size="small" onClick={() => setConfirming(true)}>
                Revoke link
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            Create a read-only link for this client. Opening it needs no account. Revoking it stops
            access on the next page load.
          </p>
          <Button onClick={() => void create()} disabled={busy}>
            {busy ? 'Creating…' : 'Create client link'}
          </Button>
        </>
      )}
    </section>
  );
}

/* ---------------- page ---------------- */

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [shareOpen, setShareOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const { reload: reloadList } = useProjectList();
  const { show } = useToast();
  const { navigate } = useRouter();

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const result = await api.getProject(projectId);
      setDetail(result);
      setDescriptionDraft(result.project.description);
      setPhase('ready');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setPhase('missing');
      else setPhase('error');
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProject(patch: { title?: string; description?: string }) {
    if (!detail) return;
    const previous = detail;
    setDetail({
      ...detail,
      project: { ...detail.project, ...patch, updatedAt: new Date().toISOString() },
    });
    try {
      const result = await api.updateProject(projectId, patch);
      setDetail((current) =>
        current ? { ...current, project: result.project } : current,
      );
      await reloadList();
      show('Saved');
    } catch (error) {
      setDetail(previous);
      show(error instanceof ApiError ? error.message : 'Could not save.', 'error');
    }
  }

  async function patchItem(
    item: Item,
    patch: { title?: string; status?: Status; due_date?: string | null },
  ) {
    if (!detail) return;
    const previous = detail;
    const optimistic: Item = {
      ...item,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.due_date !== undefined ? { dueDate: patch.due_date } : {}),
    };
    setDetail({
      ...detail,
      items: sortItems(detail.items.map((row) => (row.id === item.id ? optimistic : row))),
    });
    try {
      const result = await api.updateItem(item.id, patch);
      setDetail((current) =>
        current
          ? {
              ...current,
              items: sortItems(current.items.map((row) => (row.id === item.id ? result.item : row))),
            }
          : current,
      );
      await reloadList();
    } catch (error) {
      setDetail(previous);
      show(error instanceof ApiError ? error.message : 'Could not save the change.', 'error');
    }
  }

  async function removeItem(item: Item) {
    if (!detail) return;
    const previous = detail;
    setDetail({ ...detail, items: detail.items.filter((row) => row.id !== item.id) });
    try {
      await api.deleteItem(item.id);
      await reloadList();
      show('Deliverable deleted');
    } catch (error) {
      setDetail(previous);
      show(error instanceof ApiError ? error.message : 'Could not delete.', 'error');
    }
  }

  async function addItem(input: { title: string; status: Status; due_date: string | null }): Promise<boolean> {
    if (!detail) return false;
    try {
      const result = await api.createItem(projectId, input);
      setDetail((current) =>
        current ? { ...current, items: sortItems([...current.items, result.item]) } : current,
      );
      await reloadList();
      return true;
    } catch (error) {
      show(error instanceof ApiError ? error.message : 'Could not add the deliverable.', 'error');
      return false;
    }
  }

  if (phase === 'loading') {
    return (
      <>
        <div className="page-head">
          <div style={{ width: '100%' }}>
            <div className="skeleton" style={{ width: 90, height: 10 }} />
            <div className="skeleton" style={{ width: 320, height: 30, marginTop: 12 }} />
          </div>
        </div>
        <div style={{ marginTop: 30 }}>
          <SkeletonRows rows={4} />
        </div>
      </>
    );
  }

  if (phase === 'missing') {
    return (
      <EmptyState
        title="That project is not here"
        body="It may have been removed, or the link is wrong. Pick a project from the list."
        action={
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to projects
          </Button>
        }
      />
    );
  }

  if (phase === 'error' || !detail) {
    return <Banner message="Could not load this project." onRetry={() => void load()} />;
  }

  const { project, items } = detail;
  const done = items.filter((item) => item.status === 'done').length;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">
            {countsLabel(items.length, done)} · updated {formatLong(project.updatedAt)}
          </span>
          <EditableTitle value={project.title} onSave={(next) => saveProject({ title: next })} />
        </div>
        <Button onClick={() => setShareOpen((open) => !open)} aria-expanded={shareOpen}>
          {shareOpen ? 'Hide link' : 'Client link'}
        </Button>
      </div>

      {shareOpen ? <SharePanel projectId={projectId} onClose={() => setShareOpen(false)} /> : null}

      {descriptionOpen ? (
        <div style={{ marginTop: 20, maxWidth: 620 }}>
          <label className="eyebrow" htmlFor="project-note" style={{ display: 'block', marginBottom: 6 }}>
            Internal note
          </label>
          <textarea
            id="project-note"
            className="textarea"
            autoFocus
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            onBlur={() => {
              setDescriptionOpen(false);
              if (descriptionDraft.trim() !== project.description) {
                void saveProject({ description: descriptionDraft.trim() });
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setDescriptionDraft(project.description);
                setDescriptionOpen(false);
              }
            }}
          />
          <p className="panel-note">Saved when you click away. Never shown on the client link.</p>
        </div>
      ) : (
        <p className="sub" style={{ marginTop: 14 }}>
          {project.description ? (
            <>
              {project.description}{' '}
              <button
                type="button"
                className="btn ghost small"
                onClick={() => setDescriptionOpen(true)}
              >
                Edit note
              </button>
            </>
          ) : (
            <>
              No internal note.{' '}
              <button
                type="button"
                className="btn ghost small"
                onClick={() => setDescriptionOpen(true)}
              >
                Add one
              </button>
            </>
          )}
        </p>
      )}

      <div className="table">
        <div className="table-head" aria-hidden="true">
          <span>Deliverable</span>
          <span>Status</span>
          <span>Due</span>
          <span />
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="Nothing listed yet"
            body="Add what this client is waiting on. Status and dates can change as the work moves."
          />
        ) : (
          items.map((item) => (
            <DeliverableRow
              key={item.id}
              item={item}
              onPatch={(patch) => void patchItem(item, patch)}
              onDelete={() => void removeItem(item)}
            />
          ))
        )}

        <AddRow onAdd={addItem} />
      </div>

      {items.some((item) => isOverdue(item.dueDate, item.status)) ? (
        <p className="footnote">
          An overdue date is marked in red until the deliverable is marked done.
        </p>
      ) : null}
    </>
  );
}
