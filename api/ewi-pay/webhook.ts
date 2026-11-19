import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { getEwiPayConfig } from './_config';
import { processEwiPayWebhookPayload } from './_firestoreSync';

async function readRawBody(req: any): Promise<string> {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (typeof req.body === 'string') return req.body;
  return new Promise((resolve) => {
    let raw = '';
    if (typeof req.on === 'function') {
      req.on('data', (chunk: Buffer | string) => { raw += chunk.toString(); });
      req.on('end', () => {
        if (raw) resolve(raw);
        else if (req.body && typeof req.body === 'object') resolve(JSON.stringify(req.body));
        else resolve('');
      });
      req.on('error', () => resolve(''));
    } else {
      resolve(req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : '');
    }
  });
}

function safeCompareHex(a: string, b: string): boolean {
  const cleanA = a.replace(/^sha256=/i, '').trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (!cleanA || cleanA.length !== cleanB.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(cleanA, 'utf8'), Buffer.from(cleanB, 'utf8'));
  } catch {
    return false;
  }
}

export default async function handler(
  req: IncomingMessage & { method?: string; headers?: Record<string, string | string[] | undefined>; body?: any },
  res: ServerResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-EWI-Signature, x-ewi-signature');
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

  if (req.method !== 'POST') return sendJson(405, { ok: false, success: false, message: 'Method not allowed' });

  const cfg = await getEwiPayConfig();
  const webhookSecret = process.env.EWI_PAY_WEBHOOK_SECRET || cfg.apiKey;
  const rawBody = await readRawBody(req);
  const sigHeader = String(req.headers?.['x-ewi-signature'] || req.headers?.['X-EWI-Signature'] || '').trim();
  if (sigHeader) {
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (!safeCompareHex(sigHeader, expected)) {
      return sendJson(401, { ok: false, success: false, message: 'Invalid webhook signature' });
    }
  }

  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : (req.body && typeof req.body === 'object' ? req.body : {});
  } catch {
    return sendJson(400, { ok: false, success: false, message: 'Invalid JSON payload' });
  }

  try {
    const result = await processEwiPayWebhookPayload(payload);
    return sendJson(200, {
      ok: true,
      success: true,
      acknowledged: true,
      event: result.eventType,
      targetId: result.targetId,
      actionTaken: result.actionTaken
    });
  } catch (err: any) {
    return sendJson(200, {
      ok: true,
      success: true,
      acknowledged: true,
      note: err?.message || 'Processed'
    });
  }
}
