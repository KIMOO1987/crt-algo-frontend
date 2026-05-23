export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  return fetch(url, options);
}
