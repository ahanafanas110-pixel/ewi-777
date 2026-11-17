import type { IncomingMessage, ServerResponse } from 'http';

const EWI_PAY_BASE = 'https://ewi-pay.vercel.app';
const EWI_PAY_API_KEY = process.env.EWI_PAY_API_KEY || 'ewi_live_ewi777_88789947264e';

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  const sendJson = (code: number, payload: any) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };
  if (req.method !== 'GET') return sendJson(405, { success: false, message: 'Method not allowed' });
  try {
    const upRes = await fetch(`${EWI_PAY_BASE}/api/v1/merchant/transactions`, {
      headers: { 'x-api-key': EWI_PAY_API_KEY }
    });
    const json = await upRes.json().catch(() => ({}));
    const list = Array.isArray(json?.transactions)
      ? json.transactions
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
      ? json
      : [];
    return sendJson(200, { success: upRes.ok, transactions: list, raw: json });
  } catch (err: any) {
    return sendJson(502, { success: false, transactions: [], message: err?.message || 'Gateway fetch error' });
  }
}
