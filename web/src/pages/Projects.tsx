import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../api';
import { countsLabel, formatRelative } from '../format';
import { Link, useRouter } from '../router';
import { useProjectList } from '../shell';
import { Banner, Button, Field, SkeletonRows, TextInput, useToast } from '../ui';

export function ProjectsPage() {
  const { projects, loading, reload } = useProjectList();
  const { navigate } = useRouter();
  const { show } = useToast();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  // An empty workspace opens the form, because naming the first project is the
  // only thing there is to do.
  useEffect(() => {
    if (!loading && projects.length === 0) setOpen(true);
  }, [loading, projects.length]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFields({});
    setFormError('');
    try {
      const result = await api.createProject(title.trim(), description.trim());
      setTitle('');
      setDescription('');
      setOpen(false);
      await reload();
      show('Project created');
      navigate(`/projects/${result.project.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setFields(error.fields);
        setFormError(Object.keys(error.fields).length > 0 ? '' : error.message);
      } else {
        setFormError('Could not create the project. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    setLoadError('');
    try {
      await reload();
    } catch {
      setLoadError('Could not load your projects.');
    }
  }

  const isEmpty = !loading && projects.length === 0;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Projects</h1>
        </div>
        {open && !isEmpty ? (
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : open ? null : (
          <Button onClick={() => setOpen(true)}>New project</Button>
        )}
      </div>

      {loadError ? <Banner message={loadError} onRetry={() => void retry()} /> : null}

      {loading && projects.length === 0 ? (
        <div style={{ marginTop: 26 }}>
          <SkeletonRows rows={3} />
        </div>
      ) : null}

      {open ? (
        <form
          onSubmit={onCreate}
          noValidate
          style={{
            padding: '22px 0 26px',
            borderBottom: '1px solid var(--rule)',
            marginTop: 8,
          }}
        >
          <h2>New project</h2>
          {isEmpty ? (
            <p className="sub" style={{ margin: '-4px 0 20px', maxWidth: '58ch' }}>
              Name the first one. A project holds one client's deliverables, their dates, and a single link
              you can share.
            </p>
          ) : null}
          <Field label="Project name" error={fields.title} htmlFor="project-title">
            <TextInput
              id="project-title"
              ref={titleRef}
              value={title}
              invalid={Boolean(fields.title)}
              placeholder="Acme brand refresh"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field
            label="Internal note"
            hint="Only you see this. It never appears on the client link."
            error={fields.description}
            htmlFor="project-description"
          >
            <textarea
              id="project-description"
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          {formError ? (
            <p style={{ color: 'var(--danger)', fontSize: 13.5, marginTop: 0 }} role="alert">
              {formError}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </Button>
        </form>
      ) : null}

      {projects.length > 0 ? (
        <div className="project-list">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="project-row">
              <div className="project-row-head">
                <span className="project-title">{project.title}</span>
                <span className="project-meta">
                  {countsLabel(project.totalItems, project.doneItems)} ·{' '}
                  {formatRelative(project.updatedAt)}
                </span>
              </div>
              {project.description ? <p className="project-desc">{project.description}</p> : null}
            </Link>
          ))}
        </div>
      ) : null}

      {projects.length > 0 ? (
        <p className="footnote">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'} in this workspace. No client
          ever signs in.
        </p>
      ) : null}
    </>
  );
}
