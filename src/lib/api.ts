import { env, isEnvMissing, envErrorMessage } from './env.ts';

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  method?: string;
  body?: any;
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;
  retryAfter?: number;

  constructor(message: string, status: number, data?: any, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

/**
 * Extracts a readable error message from API response data.
 * Detail can be a simple string or an array of { msg: string, ... }.
 */
export function extractErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    const msgs = data.detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        return item?.msg || JSON.stringify(item);
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join('. ');
  }
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  return fallback;
}

/**
 * Unified fetch wrapper for backend API calls.
 * - Injects Authorization: Bearer <access_token> when auth: true
 * - Formats validation errors (detail as string or array of {msg})
 * - Handles 401 on protected calls by clearing storage and routing to /login
 * - Handles 429 by parsing Retry-After header
 * - Maps network errors to "Cannot reach the server. Check your connection."
 */
export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  if (isEnvMissing && !env.VITE_API_URL) {
    throw new ApiError(envErrorMessage || 'Missing VITE_API_URL. Copy .env.example to .env and fill it', 500);
  }

  const { method = 'GET', body, auth = false, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (auth) {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Ignore localStorage access issues
    }
  }

  let requestBody: any = undefined;
  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || body instanceof FormData || body instanceof Blob) {
      requestBody = body;
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  const baseUrl = env.VITE_API_URL;
  const url = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      ...rest,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }

  // Handle 429 Rate Limiting
  if (response.status === 429) {
    const retryAfterHeader = response.headers.get('Retry-After');
    const parsed = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
    const retryAfter = isNaN(parsed) || parsed <= 0 ? 60 : parsed;
    let data: any = null;
    try {
      data = await response.json();
    } catch {}
    const msg = extractErrorMessage(data, `Too many attempts. Try again in ${retryAfter}s`);
    throw new ApiError(msg, 429, data, retryAfter);
  }

  // Handle 401 on protected calls
  if (response.status === 401 && auth) {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('role');
      localStorage.removeItem('name');
      sessionStorage.setItem('auth_notice', 'Session expired, please log in');
    } catch {}

    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {}
    const msg = extractErrorMessage(data, 'Session expired, please log in');
    throw new ApiError(msg, 401, data);
  }

  // Handle other HTTP errors
  if (!response.ok) {
    let data: any = null;
    try {
      data = await response.json();
    } catch {}
    const msg = extractErrorMessage(data, `Request failed with status ${response.status}`);
    throw new ApiError(msg, response.status, data);
  }

  // Successful response
  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}
