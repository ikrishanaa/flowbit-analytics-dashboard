// Resolve API base for both server and browser contexts.
// Priority (server): API_BASE_INTERNAL -> localhost:4000
// Priority (browser): NEXT_PUBLIC_API_BASE -> window.host:4000 -> localhost:4000
function resolveApiBase(): string {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    if (process.env.NEXT_PUBLIC_API_BASE && process.env.NEXT_PUBLIC_API_BASE.trim()) {
      return process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, '');
    }
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4000`;
  }
  if (process.env.API_BASE_INTERNAL && process.env.API_BASE_INTERNAL.trim()) {
    return process.env.API_BASE_INTERNAL.replace(/\/$/, '');
  }
  return 'http://localhost:4000';
}

const API_BASE = resolveApiBase();

function getRoleFromCookie(): string | undefined {
  try {
    if (typeof window !== 'undefined') {
      const m = document.cookie.match(/(?:^|; )role=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : undefined;
  } else {
      // Server: use Next's cookies() API (works in RSC/route handlers)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cookies } = require('next/headers');
      const c = cookies();
      const v = c?.get?.('role')?.value as string | undefined;
      return v;
    }
  } catch {
    return undefined;
  }
}

function getTokenFromCookie(): string | undefined {
  try {
    if (typeof window !== 'undefined') {
      // Prefer cookie; fallback to localStorage
      const m = document.cookie.match(/(?:^|; )auth_token=([^;]+)/);
      const fromCookie = m ? decodeURIComponent(m[1]) : undefined;
      return fromCookie || window.localStorage.getItem('auth_token') || undefined;
  } else {
      // Server: use Next's cookies() API
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cookies } = require('next/headers');
      const c = cookies();
      const v = c?.get?.('auth_token')?.value as string | undefined;
      return v;
    }
  } catch {
    return undefined;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const role = (init?.headers as any)?.['x-role'] || getRoleFromCookie();
  const token = (init?.headers as any)?.['Authorization'] || (init?.headers as any)?.['authorization'] || getTokenFromCookie();
  const headers = { 'Content-Type': 'application/json', ...(init?.headers || {}) } as Record<string, string>;
  if (role && !('x-role' in headers)) headers['x-role'] = String(role);
  if (token && !(headers['Authorization'] || (headers as any)['authorization'])) headers['Authorization'] = `Bearer ${String(token)}`;
  const r = await fetch(url, { ...init, cache: 'no-store', headers });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
  return r.json();
}

export async function apiPost<T>(path: string, body: any, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const role = (init?.headers as any)?.['x-role'] || getRoleFromCookie();
  const token = (init?.headers as any)?.['Authorization'] || (init?.headers as any)?.['authorization'] || getTokenFromCookie();
  const headers = { 'Content-Type': 'application/json', ...(init?.headers || {}) } as Record<string, string>;
  if (role && !('x-role' in headers)) headers['x-role'] = String(role);
  if (token && !(headers['Authorization'] || (headers as any)['authorization'])) headers['Authorization'] = `Bearer ${String(token)}`;
  const r = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers });
  if (!r.ok) {
    try {
      const j = await r.json();
      let errMsg = j?.error || j?.message || `POST ${path} failed: ${r.status}`;
      const issues = Array.isArray(j?.issues) ? j.issues : [];
      if (issues.length) {
        const codes = new Set(issues.map((i: any) => i?.message));
        if (codes.has('name_min_2') || codes.has('password_min_2')) {
          errMsg = 'Name and password must be at least 2 characters.';
        } else {
          errMsg = issues.map((i: any) => i?.message || 'invalid field').join(', ');
        }
      }
      throw new Error(errMsg);
    } catch {
      throw new Error(`POST ${path} failed: ${r.status}`);
    }
  }
  return r.json();
}
