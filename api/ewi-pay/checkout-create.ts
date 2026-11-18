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
  const { amount, usdAmount, user_id, userId, method, channel, senderNumber, returnUrl, return_url } = body || {};
  const methodStr = String(method || 'bKash');
  const isUsdt = methodStr.toUpperCase() === 'USDT';
  const usdtRate = 120;
  const numUsd = usdAmount !== undefined ? Number(usdAmount) : 0;
  const numAmt = isUsdt && numUsd > 0 ? +(numUsd * usdtRate).toFixed(2) : Number(amount) || 0;
  const cleanUserId = String(user_id || userId || 'USER_1').trim();

  if (isUsdt) {
    const checkUsd = numUsd > 0 ? numUsd : +(numAmt / usdtRate).toFixed(2);
    if (checkUsd < 2 || checkUsd > 20000) {
      return sendJson(400, { success: false, message: 'Binance / USDT deposit must be between $2 and $20,000' });
    }
  } else if (numAmt < 200 || numAmt > 50000) {
    return sendJson(400, { success: false, message: 'Deposit amount must be between ৳200 and ৳50,000' });
  }

  const methodLower = methodStr.toLowerCase();
  const gatewayEndpoint = methodLower.includes('bkash')
    ? `${EWI_PAY_BASE}/api/v1/bkash/checkout/create`
    : methodLower.includes('nagad')
    ? `${EWI_PAY_BASE}/api/v1/nagad/checkout/create`
    : `${EWI_PAY_BASE}/api/v1/checkout/create`;

  const methodQuery = methodLower.includes('bkash')
    ? '&method=bkash'
    : methodLower.includes('nagad')
    ? '&method=nagad'
    : isUsdt
    ? '&method=usdt'
    : '';

  const fallbackUrl = `${EWI_PAY_BASE}/payment/ewi777?amount=${encodeURIComponent(String(numAmt))}&user_id=${encodeURIComponent(cleanUserId)}${methodQuery}`;
  const resolvedReturnUrl = returnUrl || return_url || undefined;

  let upstreamJson: any = null;
  let upstreamOk = false;
  try {
    const upRes = await fetch(gatewayEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': EWI_PAY_API_KEY },
      body: JSON.stringify({
        site: 'ewi777',
        amount: numAmt,
        ...(isUsdt && numUsd > 0 ? { usdAmount: numUsd } : {}),
        user_id: cleanUserId,
        method: methodLower.includes('bkash') ? 'bkash' : methodLower.includes('nagad') ? 'nagad' : methodStr,
        channel: channel || (isUsdt ? 'Binance / USDT TRC20' : 'EWI-Pay Gateway'),
        return_url: resolvedReturnUrl,
        returnUrl: resolvedReturnUrl
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
    upstreamJson?.data?.checkoutUrl ||
    upstreamJson?.data?.url ||
    fallbackUrl;

  const sessionId =
    upstreamJson?.session_id ||
    upstreamJson?.sessionId ||
    upstreamJson?.data?.session_id ||
    upstreamJson?.data?.sessionId ||
    '';

  const depositId =
    upstreamJson?.deposit_id ||
    upstreamJson?.depositId ||
    upstreamJson?.id ||
    upstreamJson?.data?.id ||
    (sessionId || `ewipay_${Date.now()}`);

  return sendJson(200, {
    success: true,
    upstreamSynced: upstreamOk,
    checkoutUrl,
    sessionId: String(sessionId || depositId),
    depositId: String(depositId),
    deposit: {
      id: String(depositId),
      sessionId: String(sessionId || depositId),
      userId: cleanUserId,
      userPhone: String(senderNumber || cleanUserId),
      method: methodStr,
      channel: channel || (isUsdt ? 'Binance / USDT TRC20' : 'EWI-Pay Gateway'),
      amount: numAmt,
      ...(isUsdt && numUsd > 0 ? { usdAmount: numUsd } : {}),
      senderNumber: String(senderNumber || cleanUserId),
      trxId: String(upstreamJson?.trx_id || upstreamJson?.trxId || depositId).toUpperCase(),
      status: 'pending',
      time: new Date().toLocaleString()
    },
    gateway: upstreamJson
  });
}
