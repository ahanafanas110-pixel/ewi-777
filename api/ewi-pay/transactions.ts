import type { IncomingMessage, ServerResponse } from 'http';

const EWI_PAY_BASE = 'https://ewi-pay.vercel.app';
const EWI_PAY_API_KEY = process.env.EWI_PAY_API_KEY || 'ewi_live_ewi777_88789947264e';

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
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
  if (req.method !== 'GET') return sendJson(405, { success: false, message: 'Method not allowed' });
  try {
    const endpoints = [
      `${EWI_PAY_BASE}/api/v1/bkash/transactions`,
      `${EWI_PAY_BASE}/api/v1/nagad/transactions`,
      `${EWI_PAY_BASE}/api/v1/merchant/transactions`
    ];
    const results = await Promise.all(
      endpoints.map(async (url) => {
        try {
          const upRes = await fetch(url, { headers: { 'x-api-key': EWI_PAY_API_KEY } });
          if (!upRes.ok) return [];
          const json = await upRes.json().catch(() => ({}));
          return Array.isArray(json?.transactions)
            ? json.transactions
            : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json)
            ? json
            : [];
        } catch {
          return [];
        }
      })
    );
    const mergedMap = new Map<string, any>();
    results.flat().forEach((item: any) => {
      if (!item) return;
      const key = String(item.id || item.deposit_id || item.depositId || item.sessionId || item.trx_id || item.trxId || '');
      if (!key) return;
      const prev = mergedMap.get(key) || {};
      mergedMap.set(key, { ...prev, ...item });
    });
    return sendJson(200, { success: true, transactions: Array.from(mergedMap.values()) });
  } catch (err: any) {
    return sendJson(502, { success: false, transactions: [], message: err?.message || 'Gateway fetch error' });
  }
}
