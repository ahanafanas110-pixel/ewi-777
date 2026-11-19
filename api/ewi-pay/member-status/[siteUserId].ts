import type { IncomingMessage, ServerResponse } from 'http';
import { getEwiPayConfig, fillTemplateId } from '../_config';

export default async function handler(
  req: IncomingMessage & { method?: string; query?: Record<string, string | string[]>; url?: string },
  res: ServerResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

  const qUser = Array.isArray(req.query?.siteUserId) ? req.query?.siteUserId[0] : req.query?.siteUserId;
  const pathParts = (req.url || '').split('?')[0].split('/').filter(Boolean);
  const siteUserId = String(qUser || pathParts[pathParts.length - 1] || '').trim();
  if (!siteUserId) return sendJson(400, { success: false, message: 'siteUserId required' });

  const cfg = await getEwiPayConfig();
  const targetUrl = fillTemplateId(cfg.memberStatusUrl, siteUserId);
  try {
    const upRes = await fetch(targetUrl, {
      headers: { 'x-api-key': cfg.apiKey }
    });
    const json = await upRes.json().catch(() => ({}));
    const deposits = Array.isArray(json?.deposits)
      ? json.deposits
      : Array.isArray(json?.data?.deposits)
      ? json.data.deposits
      : [];
    const withdrawals = Array.isArray(json?.withdrawals)
      ? json.withdrawals
      : Array.isArray(json?.data?.withdrawals)
      ? json.data.withdrawals
      : [];
    return sendJson(200, {
      ...(json && typeof json === 'object' ? json : {}),
      success: upRes.ok,
      siteUserId,
      deposits,
      withdrawals,
      gateway: json
    });
  } catch (err: any) {
    return sendJson(502, {
      success: false,
      siteUserId,
      deposits: [],
      withdrawals: [],
      message: err?.message || 'Member status error'
    });
  }
}
