import { PRODUCTION_ORIGIN } from '../config/deploy';

function normalizeApiBase(raw: string): string {
  let base = raw.trim().replace(/\/+$/, '');
  if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }
  return base;
}

/** قاعدة REST دائماً تنتهي بـ /api (لتفادي 404 عند ضبط VITE_API_URL بدون لاحقة /api) */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return normalizeApiBase(String(raw));
  }
  if (import.meta.env.PROD) {
    return normalizeApiBase(PRODUCTION_ORIGIN);
  }
  return '/api';
}

/** أصل Socket.io: نفس مضيف الـ API بدون /api */
export function getSocketOrigin(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    let base = String(raw).trim().replace(/\/+$/, '');
    if (base.endsWith('/api')) {
      base = base.slice(0, -4);
    }
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return base;
    }
  }
  if (import.meta.env.PROD) {
    return PRODUCTION_ORIGIN;
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}
