import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { Link, useRouter } from './router';
import { useSession } from './session';
import { Button } from './ui';
import type { ProjectSummary } from './types';

interface ProjectListApi {
  projects: ProjectSummary[];
  loading: boolean;
  reload: () => Promise<void>;
}

const ProjectListContext = createContext<ProjectListApi | null>(null);

export function useProjectList(): ProjectListApi {
  const value = useContext(ProjectListContext);
  if (!value) throw new Error('useProjectList must be used inside AppShell');
  return value;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  const { session, signOut } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const result = await api.listProjects();
      setProjects(result.projects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Coming back to the tab after Claude edited something should show the
  // change without a manual refresh.
  useEffect(() => {
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const value = useMemo(() => ({ projects, loading, reload }), [projects, loading, reload]);

  const activeMatch = /^\/projects\/([^/]+)/.exec(pathname);
  const activeId = activeMatch?.[1] ? decodeURIComponent(activeMatch[1]) : null;

  return (
    <ProjectListContext.Provider value={value}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="shell">
        <nav className="rail" aria-label="Projects">
          <Link to="/" className="wordmark" aria-label="Clientroom home">
            Clientroom
          </Link>

          <p className="rail-label">Projects</p>
          <div className="rail-list">
            {loading && projects.length === 0 ? (
              <span className="rail-empty">Loading…</span>
            ) : projects.length === 0 ? (
              <span className="rail-empty">No projects yet.</span>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="rail-link"
                  aria-current={project.id === activeId ? 'page' : undefined}
                >
                  <span>{project.title}</span>
                </Link>
              ))
            )}
          </div>

          <div className="rail-foot">
            <Link
              to="/settings/claude"
              className="rail-link"
              aria-current={pathname === '/settings/claude' ? 'page' : undefined}
            >
              <span>Connect Claude</span>
            </Link>
            <div className="rail-foot-user">
              <span className="eyebrow">{session?.user.email}</span>
              <Button variant="ghost" size="small" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        </nav>

        <main className="main" id="main">
          <div className="main-inner">{children}</div>
        </main>
      </div>
    </ProjectListContext.Provider>
  );
}
