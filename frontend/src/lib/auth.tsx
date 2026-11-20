'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './endpoints';
import { sessionStore, ApiError } from './api-client';
import type { Me, RegisterInput, Role } from './types';

type Status = 'loading' | 'authenticated' | 'anonymous';
interface AuthCtx {
  status: Status;
  user: Me | null;
  login: (email: string, password: string) => Promise<Me>;
  register: (b: RegisterInput) => Promise<Me>;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
}
const Ctx = createContext<AuthCtx | null>(null);

export const roleHome: Record<Role, string> = { AFFILIATE: '/affiliate', BUSINESS: '/business', ADMIN: '/admin' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // Avoid hydration mismatch: the server never knows about the browser session.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hasSession = mounted && !!sessionStore.get();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: hasSession,
    retry: (n, e) => !(e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) && n < 2,
    staleTime: 60_000,
  });

  useEffect(() => {
    const onExpired = () => {
      qc.clear();
      qc.setQueryData(['me'], null);
    };
    window.addEventListener('flyover:session-expired', onExpired);
    return () => window.removeEventListener('flyover:session-expired', onExpired);
  }, [qc]);

  const login = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      const u = await authApi.me();
      qc.setQueryData(['me'], u);
      return u;
    },
    [qc],
  );

  const register = useCallback(
    async (b: RegisterInput) => {
      await authApi.register(b);
      return login(b.email, b.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* token may already be invalid — local session is cleared regardless */
    }
    qc.clear();
    qc.setQueryData(['me'], null);
  }, [qc]);

  const value = useMemo<AuthCtx>(() => {
    const session = mounted ? sessionStore.get() : null;
    let status: Status;
    if (!mounted) status = 'loading';
    else if (!session) status = 'anonymous';
    else if (me.data) status = 'authenticated';
    else if (me.isError || me.data === null) status = 'anonymous';
    else status = 'loading';
    return { status, user: me.data ?? null, login, register, logout, refresh: () => me.refetch() };
  }, [me, mounted, login, register, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}

/** Convenience: the current user, asserted present (use inside guarded routes only). */
export function useMe(): Me {
  const { user } = useAuth();
  if (!user) throw new Error('useMe used outside an authenticated route');
  return user;
}
