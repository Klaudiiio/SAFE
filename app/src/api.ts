const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${formattedEndpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrfResponse = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
      credentials: 'include',
      signal: options.signal,
    });
    if (!csrfResponse.ok) {
      throw new Error('Could not start a secure API request.');
    }

    const csrfPayload: unknown = await csrfResponse.json();
    if (
      typeof csrfPayload !== 'object' ||
      csrfPayload === null ||
      !('csrf_token' in csrfPayload) ||
      typeof csrfPayload.csrf_token !== 'string'
    ) {
      throw new Error('The server did not return a valid CSRF token.');
    }
    headers.set('X-CSRFToken', csrfPayload.csrf_token);
  }

  return fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });
}