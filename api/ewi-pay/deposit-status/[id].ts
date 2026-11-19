import type { IncomingMessage, ServerResponse } from 'http';
import { getEwiPayConfig, fillTemplateId } from '../_config';

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
  const qMethod = Array.isArray(req.query?.method) ? req.query?.method[0] : req.query?.method;
  const pathPart = (req.url || '').split('?')[0].split('/').filter(Boolean).pop() || '';
  const id = String(qId || pathPart || '').trim();
  const methodLower = String(qMethod || '').toLowerCase();
  if (!id) return sendJson(400, { success: false, message: 'deposit id required' });

  const cfg = await getEwiPayConfig();
  const unifiedUrl = fillTemplateId(cfg.unifiedDepositStatusUrl, id);
  const methodUrl = methodLower.includes('bkash')
    ? fillTemplateId(cfg.bkashDepositStatusUrl, id)
    : methodLower.includes('nagad')
    ? fillTemplateId(cfg.nagadDepositStatusUrl, id)
    : '';

  try {
    let upRes = await fetch(unifiedUrl, {
      headers: { 'x-api-key': cfg.apiKey }
    });
    let json = upRes.ok ? await upRes.json().catch(() => ({})) : {};
    const statusStr = String(json?.status || json?.deposit?.status || json?.data?.status || '').toLowerCase();
    if ((!upRes.ok || !statusStr) && methodUrl) {
      const mRes = await fetch(methodUrl, { headers: { 'x-api-key': cfg.apiKey } });
      if (mRes.ok) {
        upRes = mRes;
        json = await mRes.json().catch(() => ({}));
      }
    }
    return sendJson(200, {
      ...(json && typeof json === 'object' ? json : {}),
      success: upRes.ok,
      depositId: id,
      orderId: id,
      gateway: json
    });
  } catch (err: any) {
    return sendJson(502, { success: false, message: err?.message || 'Deposit status error' });
  }
}
