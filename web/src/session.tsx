import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError } from './api';
import type { Session } from './types';

type Phase = 'loading' | 'ready' | 'anonymous';

interface SessionApi {
  phase: Phase;
  session: Session | null;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<Session | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await api.session();
      setSession(next);
      setPhase('ready');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setPhase('anonymous');
        return;
      }
      setSession(null);
      setPhase('anonymous');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await api.login(email, password);
    setSession(next);
    setPhase('ready');
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const next = await api.signup(email, password);
    setSession(next);
    setPhase('ready');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setSession(null);
      setPhase('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ phase, session, refresh, signIn, signUp, signOut }),
    [phase, session, refresh, signIn, signUp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
