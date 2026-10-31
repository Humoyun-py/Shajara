import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResultDTO, LoginInput, RegisterInput, UserDTO } from '@avlod/shared';
import { api, refreshSession, setAccessToken, setSessionListener } from '../../lib/api';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: UserDTO | null;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  /** Replace the session after a password change (server returns a fresh one). */
  applySession(auth: AuthResultDTO | null): void;
  setUser(user: UserDTO): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<UserDTO | null>(null);
  const queryClient = useQueryClient();

  const applySession = useCallback((auth: AuthResultDTO | null) => {
    setAccessToken(auth?.accessToken ?? null);
    setUserState(auth?.user ?? null);
    setStatus(auth ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    setSessionListener(applySession);
    // Restore a session from the refresh cookie on first load.
    void refreshSession().then((r) => {
      if (!r) applySession(null);
    });
    return () => setSessionListener(null);
  }, [applySession]);

  // Refresh shortly before the access token expires, so long sessions stay seamless.
  useEffect(() => {
    if (status !== 'authenticated') return;
    const id = window.setInterval(() => void refreshSession(), 12 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async login(input) {
        applySession(await api.post<AuthResultDTO>('/auth/login', input, { noRetry: true }));
      },
      async register(input) {
        applySession(await api.post<AuthResultDTO>('/auth/register', input, { noRetry: true }));
      },
      async logout() {
        try {
          await api.post('/auth/logout', undefined, { noRetry: true });
        } finally {
          applySession(null);
          queryClient.clear();
        }
      },
      applySession: (auth) => applySession(auth),
      setUser: (u) => setUserState(u),
    }),
    [status, user, applySession, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
