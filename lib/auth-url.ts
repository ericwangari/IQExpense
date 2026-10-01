const productionUrl = 'https://iq-expense.vercel.app';

export function appOrigin() {
  if (typeof window === 'undefined') return productionUrl;
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return productionUrl;
  return origin;
}

export function authCallbackUrl(next = '/') {
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return `${appOrigin()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
