export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  // Client-side requests starting with /api/ should hit Next.js local proxy routes
  const isClient = typeof window !== 'undefined';
  const base = isClient && path.startsWith('/api/') ? '' : API_BASE_URL;
  const url = path.startsWith('http') ? path : `${base}${path}`;
  return fetch(url, options);
}

