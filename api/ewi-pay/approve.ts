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
  const depositId = String(body.depositId || '').trim();
  if (!depositId) return sendJson(400, { success: false, message: 'depositId required' });
  try {
    const upRes = await fetch(`${EWI_PAY_BASE}/api/v1/merchant/transactions/${encodeURIComponent(depositId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': EWI_PAY_API_KEY }
    });
    const json = await upRes.json().catch(() => ({}));
    return sendJson(200, { success: upRes.ok, gateway: json });
  } catch (err: any) {
    return sendJson(502, { success: false, message: err?.message || 'Gateway approve error' });
  }
}
