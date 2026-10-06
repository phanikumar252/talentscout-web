import type { ApiErrorBody } from '@/types/api';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');
const DEFAULT_TIMEOUT_MS = 20_000;

/** Typed API failure: carries the HTTP status and the backend's stable error code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
  signal?: AbortSignal;
  /** null = no timeout (long-lived streams). */
  timeoutMs?: number | null;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    response.status,
    body?.error.code ?? 'HTTP_ERROR',
    body?.error.message ?? `Request failed (${response.status})`,
    body?.error.details,
  );
}

/**
 * fetch wrapper used outside RTK Query (streams, file downloads): adds the base
 * URL, auth header, JSON encoding and a timeout, and throws ApiError on non-2xx.
 * It has no store dependency: callers pass the token in.
 */
export async function apiFetch(path: string, options: FetchOptions = {}): Promise<Response> {
  const { method = 'GET', body, headers = {}, token, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const signals = [signal, timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined].filter(
    (s): s is AbortSignal => s !== undefined,
  );

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: signals.length ? AbortSignal.any(signals) : undefined,
  });

  if (!response.ok) throw await toApiError(response);
  return response;
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError');
