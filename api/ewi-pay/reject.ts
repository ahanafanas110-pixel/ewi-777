import type { IncomingMessage, ServerResponse } from 'http';
import { getEwiPayConfig } from './_config';

async function readBodyJson(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: Buffer | string) => { raw += chunk.toString(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
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
  const depositId = String(body.depositId || '').trim();
  const note = String(body.note || '').trim();
  const methodLower = String(body.method || '').toLowerCase();
  if (!depositId) return sendJson(400, { success: false, message: 'depositId required' });
  const primaryUrl = methodLower.includes('bkash')
    ? `${cfg.baseUrl}/api/v1/bkash/transactions/${encodeURIComponent(depositId)}/reject`
    : methodLower.includes('nagad')
    ? `${cfg.baseUrl}/api/v1/nagad/transactions/${encodeURIComponent(depositId)}/reject`
    : `${cfg.baseUrl}/api/v1/merchant/transactions/${encodeURIComponent(depositId)}/reject`;
  try {
    let upRes = await fetch(primaryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey },
      body: JSON.stringify({ note })
    });
    if (!upRes.ok && (methodLower.includes('bkash') || methodLower.includes('nagad'))) {
      upRes = await fetch(`${cfg.baseUrl}/api/v1/merchant/transactions/${encodeURIComponent(depositId)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey },
        body: JSON.stringify({ note })
      });
    }
    const json = await upRes.json().catch(() => ({}));
    return sendJson(200, { success: upRes.ok, gateway: json });
  } catch (err: any) {
    return sendJson(502, { success: false, message: err?.message || 'Gateway reject error' });
  }
}
