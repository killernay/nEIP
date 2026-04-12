/**
 * API helper and auth token management for nEIP MCP Server.
 */

const API_BASE = process.env['NEIP_API_URL'] ?? 'http://localhost:5400';
let authToken: string | null = process.env['NEIP_TOKEN'] ?? null;

export function setAuthToken(token: string): void {
  authToken = token;
}

export async function apiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  const init: RequestInit = { method, headers, signal: controller.signal };
  if (body) {
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1${path}`, init);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText })) as Record<string, unknown>;
    throw new Error(`API ${res.status}: ${(err['detail'] as string) ?? res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
