import type { ApiErrorBody, AuthResultDTO, PageMeta } from '@avlod/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** The access token lives only in memory; the refresh token is an HttpOnly cookie the browser manages. */
let accessToken: string | null = null;
let onSessionChange: ((auth: AuthResultDTO | null) => void) | null = null;

export function setSessionListener(fn: typeof onSessionChange) {
  onSessionChange = fn;
}
export function setAccessToken(token: string | null) {
  accessToken = token;
}

let refreshing: Promise<AuthResultDTO | null> | null = null;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';

/** Single-flight refresh: concurrent 401s share one rotation request. */
export function refreshSession(): Promise<AuthResultDTO | null> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        accessToken = null;
        onSessionChange?.(null);
        return null;
      }
      const body = (await res.json()) as { data: AuthResultDTO };
      accessToken = body.data.accessToken;
      onSessionChange?.(body.data);
      return body.data;
    } catch {
      return null;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  form?: FormData;
  signal?: AbortSignal;
  /** Skip the automatic refresh-and-retry on 401 (used by auth endpoints). */
  noRetry?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(`/api/v1${path}`, apiBaseUrl || window.location.origin);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return apiBaseUrl ? url.toString() : url.pathname + url.search;
}

async function raw<T>(
  path: string,
  opts: RequestOptions,
  retried = false,
): Promise<{ data: T; meta?: PageMeta }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body,
      credentials: 'include',
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(
      0,
      'NETWORK',
      "Server bilan aloqa yo'q. Internet yoki API holatini tekshiring.",
    );
  }
  if (res.status === 401 && !opts.noRetry && !retried) {
    const refreshed = await refreshSession();
    if (refreshed) return raw<T>(path, opts, true);
  }
  if (res.status === 204) return { data: undefined as T };
  const json = (await res.json().catch(() => null)) as
    ({ data: T; meta?: PageMeta } & Partial<ApiErrorBody>) | null;
  if (!res.ok || !json) {
    const err = json?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? `So'rov bajarilmadi (${res.status}).`,
      err?.details,
    );
  }
  return json;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    raw<T>(path, { query, signal }).then((r) => r.data),
  page: <T>(path: string, query?: Query) => raw<T>(path, { query }),
  post: <T>(path: string, body?: unknown, opts?: Partial<RequestOptions>) =>
    raw<T>(path, { method: 'POST', body, ...opts }).then((r) => r.data),
  patch: <T>(path: string, body?: unknown) =>
    raw<T>(path, { method: 'PATCH', body }).then((r) => r.data),
  delete: <T = void>(path: string, opts?: { query?: Query; body?: unknown }) =>
    raw<T>(path, { method: 'DELETE', ...opts }).then((r) => r.data),
  upload: <T>(path: string, form: FormData) =>
    raw<T>(path, { method: 'POST', form }).then((r) => r.data),
};

/** Field errors from a Zod `flatten()` payload, for forms. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError)) return {};
  const d = e.details as { fieldErrors?: Record<string, string[]> } | undefined;
  return Object.fromEntries(Object.entries(d?.fieldErrors ?? {}).map(([k, v]) => [k, v[0] ?? '']));
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Noma'lum xatolik.");
