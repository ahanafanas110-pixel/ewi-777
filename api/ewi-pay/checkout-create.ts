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

  const cfg = await getEwiPayConfig();
  const body = await readBodyJson(req);
  const {
    amount,
    usdAmount,
    user_id,
    userId,
    siteUserId,
    orderId: rawOrderId,
    method,
    provider: rawProvider,
    channel,
    senderNumber,
    callbackUrl: rawCallbackUrl,
    returnUrl,
    return_url
  } = body || {};

  const methodStr = String(method || rawProvider || 'bKash');
  const isUsdt = methodStr.toUpperCase() === 'USDT';
  const usdtRate = 120;
  const numUsd = usdAmount !== undefined ? Number(usdAmount) : 0;
  const numAmt = isUsdt && numUsd > 0 ? +(numUsd * usdtRate).toFixed(2) : Number(amount) || 0;
  const cleanUserId = String(siteUserId || user_id || userId || 'USER_1').trim();

  if (isUsdt) {
    const checkUsd = numUsd > 0 ? numUsd : +(numAmt / usdtRate).toFixed(2);
    if (checkUsd < 2 || checkUsd > 20000) {
      return sendJson(400, { success: false, message: 'Binance / USDT deposit must be between $2 and $20,000' });
    }
  } else if (numAmt < 200 || numAmt > 50000) {
    return sendJson(400, { success: false, message: 'Deposit amount must be between ৳200 and ৳50,000' });
  }

  const methodLower = methodStr.toLowerCase();
  const providerSlug = methodLower.includes('bkash')
    ? 'bkash'
    : methodLower.includes('nagad')
    ? 'nagad'
    : isUsdt
    ? 'usdt'
    : '';

  const gatewayEndpoint =
    providerSlug === 'bkash'
      ? cfg.bkashCheckoutUrl
      : providerSlug === 'nagad'
      ? cfg.nagadCheckoutUrl
      : cfg.unifiedCheckoutUrl;

  const uniqueOrderId =
    String(rawOrderId || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_') ||
    `DEP_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const siteOrigin = getRequestOrigin(req);
  const resolvedCallbackUrl =
    String(rawCallbackUrl || cfg.webhookUrl || '').trim() || `${siteOrigin}/api/ewi-pay/webhook`;
  const resolvedReturnUrl = String(returnUrl || return_url || `${siteOrigin}/#/transaction-history`).trim();

  const methodQuery = providerSlug ? `&method=${encodeURIComponent(providerSlug)}` : '';
  const fallbackUrl = `${cfg.baseUrl}/payment/${encodeURIComponent(cfg.siteSlug)}?amount=${encodeURIComponent(
    String(numAmt)
  )}&user_id=${encodeURIComponent(cleanUserId)}${methodQuery}`;

  let upstreamJson: any = null;
  let upstreamOk = false;
  try {
    const upRes = await fetch(gatewayEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey },
      body: JSON.stringify({
        amount: numAmt,
        siteUserId: cleanUserId,
        orderId: uniqueOrderId,
        callbackUrl: resolvedCallbackUrl,
        returnUrl: resolvedReturnUrl,
        ...(providerSlug ? { provider: providerSlug } : {}),
        ...(isUsdt && numUsd > 0 ? { usdAmount: numUsd } : {}),
        site: cfg.siteSlug,
        user_id: cleanUserId,
        method: providerSlug || methodStr,
        channel: channel || (isUsdt ? 'Binance / USDT TRC20' : 'EWI PAY'),
        return_url: resolvedReturnUrl
      })
    });
    upstreamOk = upRes.ok;
    upstreamJson = await upRes.json().catch(() => null);
  } catch {
    upstreamOk = false;
  }

  const paymentUrl =
    upstreamJson?.paymentUrl ||
    upstreamJson?.payment_url ||
    upstreamJson?.checkoutUrl ||
    upstreamJson?.checkout_url ||
    upstreamJson?.data?.paymentUrl ||
    upstreamJson?.data?.payment_url ||
    upstreamJson?.data?.checkoutUrl ||
    upstreamJson?.data?.checkout_url ||
    upstreamJson?.data?.url ||
    fallbackUrl;

  const sessionId =
    upstreamJson?.sessionId ||
    upstreamJson?.session_id ||
    upstreamJson?.data?.sessionId ||
    upstreamJson?.data?.session_id ||
    '';

  const returnedDepositId =
    upstreamJson?.depositId ||
    upstreamJson?.deposit_id ||
    upstreamJson?.orderId ||
    upstreamJson?.id ||
    upstreamJson?.data?.depositId ||
    upstreamJson?.data?.id ||
    '';

  const recordId = uniqueOrderId;

  return sendJson(200, {
    success: true,
    upstreamSynced: upstreamOk,
    paymentUrl,
    checkoutUrl: paymentUrl,
    orderId: uniqueOrderId,
    sessionId: String(sessionId || returnedDepositId || uniqueOrderId),
    depositId: String(returnedDepositId || uniqueOrderId),
    provider: providerSlug || methodLower,
    deposit: {
      id: recordId,
      orderId: uniqueOrderId,
      sessionId: String(sessionId || returnedDepositId || uniqueOrderId),
      checkoutUrl: paymentUrl,
      userId: cleanUserId,
      userPhone: String(senderNumber || cleanUserId),
      method: methodStr,
      provider: providerSlug || methodLower,
      channel: channel || (isUsdt ? 'Binance / USDT TRC20' : 'EWI PAY'),
      amount: numAmt,
      ...(isUsdt && numUsd > 0 ? { usdAmount: numUsd } : {}),
      senderNumber: String(senderNumber || cleanUserId),
      trxId: String(upstreamJson?.trx_id || upstreamJson?.trxId || uniqueOrderId).toUpperCase(),
      status: 'pending',
      time: new Date().toLocaleString(),
      createdAtMs: Date.now()
    },
    gateway: upstreamJson
  });
}
