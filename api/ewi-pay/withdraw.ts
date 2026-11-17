import type { IncomingMessage, ServerResponse } from 'http';

const EWI_PAY_BASE = 'https://ewi-pay.vercel.app';
const EWI_PAY_API_KEY = process.env.EWI_PAY_API_KEY || 'ewi_live_ewi777_88789947264e';

async function readBodyJson(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: Buffer | string) => { raw += chunk.toString(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  const sendJson = (code: number, payload: any) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };
  if (req.method !== 'POST') return sendJson(405, { success: false, message: 'Method not allowed' });
  const body = await readBodyJson(req);
  try {
    const upRes = await fetch(`${EWI_PAY_BASE}/api/v1/withdrawals/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': EWI_PAY_API_KEY },
      body: JSON.stringify({
        site: 'ewi777',
        user_id: body.user_id || body.userId || 'USER_1',
        amount: Number(body.amount) || 0,
        method: body.method || 'bKash',
        account_number: body.number || body.accountNumber || ''
      })
    });
    const json = await upRes.json().catch(() => ({}));
    return sendJson(200, { success: upRes.ok, gateway: json });
  } catch (err: any) {
    return sendJson(502, { success: false, message: err?.message || 'Gateway withdraw error' });
  }
}
