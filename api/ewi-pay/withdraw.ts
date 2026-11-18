import type { IncomingMessage, ServerResponse } from 'http';

const EWI_PAY_BASE = 'https://ewi-pay.vercel.app';
const EWI_PAY_API_KEY = process.env.EWI_PAY_API_KEY || 'ewi_live_ewi777_88789947264e';

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
  const body = await readBodyJson(req);
  const methodStr = String(body.method || 'bKash');
  const methodLower = methodStr.toLowerCase();
  const withdrawUrl = methodLower.includes('bkash')
    ? `${EWI_PAY_BASE}/api/v1/bkash/withdrawals/request`
    : methodLower.includes('nagad')
    ? `${EWI_PAY_BASE}/api/v1/nagad/withdrawals/request`
    : `${EWI_PAY_BASE}/api/v1/withdrawals/request`;
  try {
    const upRes = await fetch(withdrawUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': EWI_PAY_API_KEY },
      body: JSON.stringify({
        site: 'ewi777',
        user_id: body.user_id || body.userId || 'USER_1',
        amount: Number(body.amount) || 0,
        method: methodLower.includes('bkash') ? 'bkash' : methodLower.includes('nagad') ? 'nagad' : methodStr,
        account_number: body.number || body.accountNumber || '',
        accountNumber: body.number || body.accountNumber || ''
      })
    });
    const json = await upRes.json().catch(() => ({}));
    const withdrawalId =
      json?.withdrawalId ||
      json?.withdrawal_id ||
      json?.id ||
      json?.data?.withdrawalId ||
      json?.data?.id ||
      '';
    return sendJson(200, { success: upRes.ok, withdrawalId, gateway: json });
  } catch (err: any) {
    return sendJson(502, { success: false, message: err?.message || 'Gateway withdraw error' });
  }
}
