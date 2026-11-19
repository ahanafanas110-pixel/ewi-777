import type { IncomingMessage, ServerResponse } from 'http';
import { getEwiPayConfig, getRequestOrigin } from './_config';

async function readBodyJson(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: Buffer | string) => { raw += chunk.toString(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Cache-Control', 'no-store');
}

function normalizeBd11(num: any): string {
  const digits = String(num || '').replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length >= 13) return `0${digits.slice(3, 13)}`;
  if (digits.startsWith('0') && digits.length >= 11) return digits.slice(0, 11);
  if (digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
}

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const sendJson = (code: number, payload: any) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };
  if (req.method !== 'POST') return sendJson(405, { success: false, message: 'Method not allowed' });

  const cfg = await getEwiPayConfig();
  const body = await readBodyJson(req);
  const methodStr = String(body.provider || body.method || 'bKash');
  const methodLower = methodStr.toLowerCase();
  const providerSlug = methodLower.includes('nagad') ? 'nagad' : 'bkash';
  const withdrawUrl =
    providerSlug === 'bkash' ? cfg.bkashWithdrawUrl : cfg.nagadWithdrawUrl;

  const cleanUserId = String(body.siteUserId || body.user_id || body.userId || 'USER_1').trim();
  const orderId = String(body.orderId || body.order_id || `wd_${Date.now()}`).trim();
  const recipientNumber = normalizeBd11(body.recipientNumber || body.number || body.accountNumber || '');
  const siteOrigin = getRequestOrigin(req);
  const resolvedCallbackUrl =
    String(body.callbackUrl || cfg.webhookUrl || '').trim() || `${siteOrigin}/api/ewi-pay/webhook`;

  try {
    const upRes = await fetch(withdrawUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey },
      body: JSON.stringify({
        siteUserId: cleanUserId,
        orderId,
        recipientNumber,
        provider: providerSlug,
        amount: Number(body.amount) || 0,
        callbackUrl: resolvedCallbackUrl,
        autoDispatch: body.autoDispatch !== undefined ? Boolean(body.autoDispatch) : true,
        site: cfg.siteSlug,
        user_id: cleanUserId,
        method: providerSlug,
        account_number: recipientNumber,
        accountNumber: recipientNumber,
        wallet_number: recipientNumber
      })
    });
    const json = await upRes.json().catch(() => ({}));
    const withdrawalId = String(
      json?.withdrawalId ||
        json?.withdrawal_id ||
        json?.id ||
        json?.withdrawal?.id ||
        json?.data?.withdrawalId ||
        json?.data?.withdrawal_id ||
        json?.data?.id ||
        ''
    ).trim();
    return sendJson(200, {
      success: upRes.ok,
      withdrawalId,
      orderId,
      provider: providerSlug,
      gateway: json
    });
  } catch (err: any) {
    return sendJson(502, { success: false, message: err?.message || 'Gateway withdraw error' });
  }
}
