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

  const qSession = Array.isArray(req.query?.sessionId) ? req.query?.sessionId[0] : req.query?.sessionId;
  const pathPart = (req.url || '').split('?')[0].split('/').filter(Boolean).pop() || '';
  const sessionId = String(qSession || pathPart || '').trim();
  if (!sessionId) return sendJson(400, { success: false, message: 'sessionId required' });

  const cfg = await getEwiPayConfig();
  try {
    const targetUrl = fillTemplateId(cfg.checkoutStatusUrl, sessionId);
    const upRes = await fetch(targetUrl, {
      headers: { 'x-api-key': cfg.apiKey }
    });
    const json = await upRes.json().catch(() => ({}));
    return sendJson(200, { success: upRes.ok, sessionId, ...json, gateway: json });
  } catch (err: any) {
    return sendJson(502, { success: false, message: err?.message || 'Checkout status error' });
  }
}
