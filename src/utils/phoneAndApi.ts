/**
 * Bangladeshi mobile validation utility + Backend API helper
 * Enforces valid BD operator prefixes: 018, 017, 013, 015, 019 (exact 10 digits without leading 0).
 */
export const VALID_BD_PREFIXES = ['18', '17', '13', '15', '19'] as const;

export function normalizeBdDigitsInput(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length > 3) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function isValidBdLocalTenDigits(tenDigits: string): boolean {
  return /^1[35789]\d{8}$/.test(String(tenDigits || '').trim());
}

export function isValidBdFullPhone(normalizedZeroEleven: string): boolean {
  return /^01[35789]\d{8}$/.test(String(normalizedZeroEleven || '').trim());
}

export const BD_PHONE_RULE_MSG =
  'Mobile number must be max 10 digits (after +880) starting with 18, 17, 13, 15, or 19.';

export function getApiBaseUrl(): string {
  try {
    const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL;
    if (typeof envBase === 'string' && envBase.trim()) {
      return envBase.trim().replace(/\/+$/, '');
    }
  } catch {}
  return '';
}

export function apiUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${clean}` : clean;
}

export async function safeFetchJson<T = any>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(apiUrl(path), init);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return { ok: false, status: res.status, data: null };
    }
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok && data !== null, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
