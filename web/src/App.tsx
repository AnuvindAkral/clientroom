import { matchProject, useRouter } from './router';
import { useSession } from './session';
import { AppShell } from './shell';
import { AuthPage } from './pages/Auth';
import { ProjectsPage } from './pages/Projects';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { SettingsPage } from './pages/Settings';
import { Button } from './ui';

function NotFound() {
  const { navigate } = useRouter();
  return (
    <div className="notfound">
      <div>
        <h1>Not here</h1>
        <p>That address does not match anything in this workspace.</p>
        <Button onClick={() => navigate('/')}>Back to projects</Button>
      </div>
    </div>
  );
}

function Booting() {
  return (
    <div className="notfound" aria-busy="true">
      <div style={{ width: 220 }}>
        <div className="skeleton" style={{ height: 10, width: 90, margin: '0 auto 14px' }} />
        <div className="skeleton" style={{ height: 26, width: '100%' }} />
      </div>
    </div>
  );
}

export function App() {
  const { phase } = useSession();
  const { pathname } = useRouter();

  if (phase === 'loading') return <Booting />;

  if (phase === 'anonymous') {
    if (pathname === '/signup') return <AuthPage mode="signup" />;
    return <AuthPage mode="login" />;
  }

  if (pathname === '/') {
    return (
      <AppShell>
        <ProjectsPage />
      </AppShell>
    );
  }

  const projectId = matchProject(pathname);
  if (projectId) {
    return (
      <AppShell>
        <ProjectDetailPage projectId={projectId} />
      </AppShell>
    );
  }

  if (pathname === '/settings/claude') {
    return (
      <AppShell>
        <SettingsPage />
      </AppShell>
    );
  }

  return <NotFound />;
}
