import { API_BASE_URL, USE_MOCKS } from './config';
import type { ApiFailure, ApiSuccess, PageMeta } from './types';

/**
 * Typed API client for the Flyover backend.
 * - Unwraps the `{ success, data, meta }` envelope.
 * - Sends `Authorization: Bearer <accessToken>`.
 * - On 401, rotates tokens once via POST /auth/refresh (single-flight) and retries.
 * - Can be switched to an in-browser mock backend with NEXT_PUBLIC_USE_MOCKS=true.
 *
 * NOTE: tokens are kept in localStorage for this MVP because the backend returns the refresh
 * token in JSON. Before launch the backend should move the refresh token into an HttpOnly,
 * Secure, SameSite cookie (see docs/BACKEND_GAPS.md) and this store should drop it.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
  /** Field-level messages from zod `flatten()` on VALIDATION_ERROR responses. */
  get fieldErrors(): Record<string, string> {
    const d = this.details as { fieldErrors?: Record<string, string[]> } | undefined;
    const out: Record<string, string> = {};
    if (d?.fieldErrors) for (const [k, v] of Object.entries(d.fieldErrors)) if (v?.[0]) out[k] = v[0];
    return out;
  }
}

export interface Session {
  accessToken: string;
  refreshToken: string;
}

const KEY = 'flyover.session';
let memory: Session | null = null;

export const sessionStore = {
  get(): Session | null {
    if (memory) return memory;
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(KEY);
      memory = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      memory = null;
    }
    return memory;
  },
  set(s: Session | null) {
    memory = s;
    if (typeof window === 'undefined') return;
    try {
      if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
      else window.localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable — session lives in memory only */
    }
  },
};

type Transport = (
  method: string,
  path: string,
  body: unknown,
  headers: Record<string, string>,
) => Promise<{ status: number; json: unknown }>;

const httpTransport: Transport = async (method, path, body, headers) => {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach Flyover. Check your connection and try again.');
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
};

let transport: Transport = httpTransport;
let mockReady: Promise<void> | null = null;
async function ensureTransport() {
  if (!USE_MOCKS) return;
  if (!mockReady)
    mockReady = import('./mock/server').then((m) => {
      transport = m.mockTransport;
    });
  await mockReady;
}

let refreshing: Promise<boolean> | null = null;
async function refreshTokens(): Promise<boolean> {
  const s = sessionStore.get();
  if (!s?.refreshToken) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const { status, json } = await transport('POST', '/auth/refresh', { refreshToken: s.refreshToken }, {});
        const ok = json as ApiSuccess<Session> | null;
        if (status === 200 && ok?.success) {
          sessionStore.set({ accessToken: ok.data.accessToken, refreshToken: ok.data.refreshToken });
          return true;
        }
      } catch {
        /* fall through */
      }
      sessionStore.set(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('flyover:session-expired'));
      return false;
    })().finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  }
  return refreshing;
}

export interface RequestOptions {
  auth?: boolean;
  query?: Record<string, string | number | undefined | null>;
}

function qs(query?: RequestOptions['query']) {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<{ data: T; meta?: PageMeta }> {
  await ensureTransport();
  const useAuth = opts.auth !== false;
  const url = path + qs(opts.query);

  const send = () => {
    const headers: Record<string, string> = {};
    const s = sessionStore.get();
    if (useAuth && s?.accessToken) headers.Authorization = `Bearer ${s.accessToken}`;
    return transport(method, url, body, headers);
  };

  let { status, json } = await send();
  if (status === 401 && useAuth && sessionStore.get()?.refreshToken) {
    if (await refreshTokens()) ({ status, json } = await send());
  }

  const env = json as ApiSuccess<T> | ApiFailure | null;
  if (env && env.success === true) return { data: env.data, meta: env.meta };
  if (env && env.success === false)
    throw new ApiError(status, env.error.code, env.error.message, env.error.details);
  if (status === 429) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.');
  throw new ApiError(status, 'UNEXPECTED_RESPONSE', `Unexpected response from server (HTTP ${status}).`);
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts).then((r) => r.data),
  getPage: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, body ?? {}, opts).then((r) => r.data),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, body ?? {}, opts).then((r) => r.data),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, body ?? {}, opts).then((r) => r.data),
  del: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, undefined, opts).then((r) => r.data),
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}
