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
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
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
  const numAmt = Number(body.amount) || 0;
  const cleanUserId = String(body.user_id || body.userId || 'USER_1').trim();
  if (numAmt <= 0) return sendJson(400, { success: false, message: 'Valid amount required' });

  const fallbackUrl = `${EWI_PAY_BASE}/payment/ewi777?amount=${encodeURIComponent(String(numAmt))}&user_id=${encodeURIComponent(cleanUserId)}`;
  let upstreamJson: any = null;
  let upstreamOk = false;
  try {
    const upRes = await fetch(`${EWI_PAY_BASE}/api/v1/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': EWI_PAY_API_KEY },
      body: JSON.stringify({
        site: 'ewi777',
        amount: numAmt,
        user_id: cleanUserId,
        method: body.method || 'bKash',
        channel: body.channel || 'EWI-Pay'
      })
    });
    upstreamOk = upRes.ok;
    upstreamJson = await upRes.json().catch(() => null);
  } catch {
    upstreamOk = false;
  }

  const checkoutUrl =
    upstreamJson?.checkout_url ||
    upstreamJson?.checkoutUrl ||
    upstreamJson?.payment_url ||
    upstreamJson?.data?.checkout_url ||
    upstreamJson?.data?.url ||
    fallbackUrl;
  const depositId =
    upstreamJson?.deposit_id ||
    upstreamJson?.depositId ||
    upstreamJson?.id ||
    upstreamJson?.data?.id ||
    `ewipay_${Date.now()}`;

  return sendJson(200, {
    success: true,
    upstreamSynced: upstreamOk,
    checkoutUrl,
    depositId: String(depositId),
    gateway: upstreamJson
  });
}
