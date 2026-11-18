import type { IncomingMessage, ServerResponse } from 'http';

const EWI_PAY_BASE = 'https://ewi-pay.vercel.app';
const EWI_PAY_API_KEY = process.env.EWI_PAY_API_KEY || 'ewi_live_ewi777_88789947264e';

export default async function handler(
  req: IncomingMessage & { method?: string; query?: Record<string, string | string[]>; url?: string },
  res: ServerResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Cache-Control', 'no-store');
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

  const qId = Array.isArray(req.query?.id) ? req.query?.id[0] : req.query?.id;
  const pathPart = (req.url || '').split('?')[0].split('/').filter(Boolean).pop() || '';
  const id = String(qId || pathPart || '').trim();
  if (!id) return sendJson(400, { success: false, message: 'withdrawal id required' });

  try {
    const upRes = await fetch(`${EWI_PAY_BASE}/api/v1/withdrawals/${encodeURIComponent(id)}/status`, {
      headers: { 'x-api-key': EWI_PAY_API_KEY }
    });
    const json = await upRes.json().catch(() => ({}));
    return sendJson(200, { success: upRes.ok, withdrawalId: id, gateway: json });
  } catch (err: any) {
    return sendJson(502, { success: false, message: err?.message || 'Withdrawal status error' });
  }
}
