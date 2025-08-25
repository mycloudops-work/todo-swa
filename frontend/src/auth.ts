export async function getUser() {
  const res = await fetch('/.auth/me', { credentials: 'include' });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.clientPrincipal || null;
}
export function login() { window.location.href='/.auth/login/aad'; }
export function logout() { window.location.href='/.auth/logout'; }
