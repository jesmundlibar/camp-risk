const STORAGE_KEY = 'user';

function apiBaseCandidates() {
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  return [
    '', // same-origin (works if /api is proxied)
    `${protocol}//${host}:8000`, // common local Django port
    'http://127.0.0.1:8000',
    'http://localhost:8000',
  ];
}

async function postJsonWithFallback(path, payload) {
  let lastError = new Error('Request failed');
  for (const base of apiBaseCandidates()) {
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof body.error === 'string' ? body.error : 'Invalid credentials';
        throw new Error(msg);
      }
      return body;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Request failed');
    }
  }
  throw lastError;
}

export function loadUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUser(user) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export async function login(username, password, role) {
  const user = await postJsonWithFallback('/api/auth/login/', { username, password, role });
  saveUser(user);
  return user;
}

export async function logout() {
  try {
    await postJsonWithFallback('/api/auth/logout/', {});
  } catch {
    // Clear local session even if backend is unreachable.
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
