import fs from 'fs';
import path from 'path';

export interface ResolvedEwiPayConfig {
  baseUrl: string;
  siteSlug: string;
  apiKey: string;
  bkashCheckoutUrl: string;
  bkashTransactionsUrl: string;
  bkashWithdrawUrl: string;
  bkashWithdrawStatusUrl: string;
  bkashDepositStatusUrl: string;
  nagadCheckoutUrl: string;
  nagadTransactionsUrl: string;
  nagadWithdrawUrl: string;
  nagadWithdrawStatusUrl: string;
  nagadDepositStatusUrl: string;
  unifiedCheckoutUrl: string;
  unifiedDepositStatusUrl: string;
  unifiedWithdrawStatusUrl: string;
  memberStatusUrl: string;
  checkoutStatusUrl: string;
  webhookUrl: string;
}

const DEFAULT_BASE = 'https://ewi-pay.vercel.app';
const DEFAULT_SITE = 'ewi777';
const DEFAULT_KEY = process.env.EWI_PAY_API_KEY || 'ewi_live_ewi777_88789947264e';

let cachedConfig: { value: ResolvedEwiPayConfig; expiresAt: number } | null = null;

export function readFirebaseConfig(): { projectId: string; databaseId: string } {
  try {
    const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      return {
        projectId: String(parsed?.projectId || 'gen-lang-client-0882665131'),
        databaseId: String(
          parsed?.firestoreDatabaseId || 'ai-studio-win777premiumonl-cf3c2f52-bee9-47a8-ac01-331a160d69bc'
        )
      };
    }
  } catch {}
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0882665131',
    databaseId:
      process.env.FIREBASE_DATABASE_ID ||
      'ai-studio-win777premiumonl-cf3c2f52-bee9-47a8-ac01-331a160d69bc'
  };
}

export function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const vals = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return vals.map((v: any) => fromFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function normalizeBase(url?: string): string {
  const clean = String(url || '').trim().replace(/\/+$/, '');
  return clean || DEFAULT_BASE;
}

export function getRequestOrigin(req: any): string {
  const protoHeader = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const hostHeader = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').split(',')[0].trim();
  if (hostHeader) {
    const proto = protoHeader || (hostHeader.includes('localhost') || hostHeader.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${hostHeader}`;
  }
  return 'https://ewi-pay.vercel.app';
}

export function buildEwiPayConfigFromRaw(raw?: Record<string, any>): ResolvedEwiPayConfig {
  const baseUrl = normalizeBase(raw?.baseUrl);
  const siteSlug = String(raw?.siteSlug || '').trim() || DEFAULT_SITE;
  const apiKey = String(raw?.apiKey || '').trim() || DEFAULT_KEY;
  return {
    baseUrl,
    siteSlug,
    apiKey,
    bkashCheckoutUrl: String(raw?.bkashCheckoutUrl || '').trim() || `${baseUrl}/api/v1/bkash/checkout/create`,
    bkashTransactionsUrl: String(raw?.bkashTransactionsUrl || '').trim() || `${baseUrl}/api/v1/bkash/transactions`,
    bkashWithdrawUrl: String(raw?.bkashWithdrawUrl || '').trim() || `${baseUrl}/api/v1/bkash/withdrawals/request`,
    bkashWithdrawStatusUrl:
      String(raw?.bkashWithdrawStatusUrl || '').trim() || `${baseUrl}/api/v1/bkash/withdrawals/:id/status`,
    bkashDepositStatusUrl:
      String(raw?.bkashDepositStatusUrl || '').trim() || `${baseUrl}/api/v1/bkash/deposits/:id/status`,
    nagadCheckoutUrl: String(raw?.nagadCheckoutUrl || '').trim() || `${baseUrl}/api/v1/nagad/checkout/create`,
    nagadTransactionsUrl: String(raw?.nagadTransactionsUrl || '').trim() || `${baseUrl}/api/v1/nagad/transactions`,
    nagadWithdrawUrl: String(raw?.nagadWithdrawUrl || '').trim() || `${baseUrl}/api/v1/nagad/withdrawals/request`,
    nagadWithdrawStatusUrl:
      String(raw?.nagadWithdrawStatusUrl || '').trim() || `${baseUrl}/api/v1/nagad/withdrawals/:id/status`,
    nagadDepositStatusUrl:
      String(raw?.nagadDepositStatusUrl || '').trim() || `${baseUrl}/api/v1/nagad/deposits/:id/status`,
    unifiedCheckoutUrl: String(raw?.unifiedCheckoutUrl || '').trim() || `${baseUrl}/api/v1/checkout/create`,
    unifiedDepositStatusUrl: `${baseUrl}/api/v1/deposits/:orderId/status`,
    unifiedWithdrawStatusUrl: `${baseUrl}/api/v1/withdrawals/:withdrawalId/status`,
    memberStatusUrl: String(raw?.memberStatusUrl || '').trim() || `${baseUrl}/api/v1/member/:siteUserId/status`,
    checkoutStatusUrl:
      String(raw?.checkoutStatusUrl || '').trim() || `${baseUrl}/api/v1/checkout/status/:sessionId`,
    webhookUrl: String(raw?.webhookUrl || '').trim()
  };
}

export function fillTemplateId(template: string, id: string): string {
  const enc = encodeURIComponent(id);
  if (/(:idOrOrderId|:withdrawalId|:siteUserId|:sessionId|:depositId|:orderId|:id)/i.test(template)) {
    return template.replace(
      /(:idOrOrderId|:withdrawalId|:siteUserId|:sessionId|:depositId|:orderId|:id)/gi,
      enc
    );
  }
  const trimmed = template.replace(/\/+$/, '');
  return `${trimmed}/${enc}`;
}

export async function getEwiPayConfig(forceRefresh = false): Promise<ResolvedEwiPayConfig> {
  if (!forceRefresh && cachedConfig && cachedConfig.expiresAt > Date.now()) {
    return cachedConfig.value;
  }
  let rawEwiPay: Record<string, any> | undefined;
  try {
    const { projectId, databaseId } = readFirebaseConfig();
    const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/${encodeURIComponent(databaseId)}/documents/appConfig/settings`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(docUrl, { signal: controller.signal });
    clearTimeout(tid);
    if (res.ok) {
      const json = await res.json().catch(() => null);
      const mapField = json?.fields?.ewiPayConfig;
      if (mapField) {
        rawEwiPay = fromFirestoreValue(mapField);
      }
    }
  } catch {}

  const resolved = buildEwiPayConfigFromRaw(rawEwiPay);
  cachedConfig = { value: resolved, expiresAt: Date.now() + 8000 };
  return resolved;
}
