import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { fromFirestoreValue, readFirebaseConfig, toFirestoreValue } from './ewi-pay/_config';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function getBaseFirestoreDocUrl(): string {
  const { projectId, databaseId } = readFirebaseConfig();
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents`;
}

export function decodeFirestoreDoc(docJson: any): Record<string, any> | null {
  if (!docJson?.fields) return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(docJson.fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

export async function getFirestoreDoc(col: string, docId: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${getBaseFirestoreDocUrl()}/${col}/${encodeURIComponent(docId)}`);
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return decodeFirestoreDoc(json);
  } catch {
    return null;
  }
}

export async function listFirestoreCollection(col: string, pageSize = 300): Promise<Array<{ id: string; data: Record<string, any> }>> {
  try {
    const res = await fetch(`${getBaseFirestoreDocUrl()}/${col}?pageSize=${pageSize}`);
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    const out: Array<{ id: string; data: Record<string, any> }> = [];
    for (const d of docs) {
      const decoded = decodeFirestoreDoc(d);
      if (decoded) {
        const id = String(d.name || '').split('/').pop() || String(decoded.id || '');
        if (id) out.push({ id, data: decoded });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function patchFirestoreDoc(col: string, docId: string, fullObj: Record<string, any>): Promise<boolean> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(fullObj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  try {
    const res = await fetch(`${getBaseFirestoreDocUrl()}/${col}/${encodeURIComponent(docId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Cache-Control', 'no-store');
}

export function sendJson(res: ServerResponse, statusCode: number, payload: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export async function readBodyJson(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: Buffer | string) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export function extractClientIpNode(req: IncomingMessage): string {
  const headers = req.headers || {};
  const xff = headers['x-forwarded-for'];
  let ip = '';
  if (typeof xff === 'string' && xff.trim()) {
    ip = xff.split(',')[0].trim();
  } else if (Array.isArray(xff) && xff.length > 0) {
    ip = String(xff[0]).split(',')[0].trim();
  } else if (typeof headers['cf-connecting-ip'] === 'string') {
    ip = headers['cf-connecting-ip'].trim();
  } else if (typeof headers['x-real-ip'] === 'string') {
    ip = headers['x-real-ip'].trim();
  } else if (req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  }
  return normalizeIpValue(ip) || 'Unknown';
}

export function parseDeviceNameNode(userAgent?: string): string {
  const ua = String(userAgent || '').trim();
  if (!ua) return 'Unknown Device';
  let os = 'Device';
  let model = '';
  if (/iPhone/i.test(ua)) {
    os = 'iOS';
    model = 'iPhone';
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    model = 'iPad';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s[\d.]+;\s*([^;)]+)/i);
    if (match && match[1]) {
      model = match[1].replace(/\s*Build\/.*$/i, '').trim();
    }
    if (!model || model.toLowerCase() === 'k') model = 'Android Phone';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
    model = 'Windows PC';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    model = 'MacBook / Mac';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    model = 'Linux PC';
  }
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  if (model && os && !model.toLowerCase().includes(os.toLowerCase())) {
    return `${model} • ${os} (${browser})`.slice(0, 64);
  }
  return `${model || os} • ${browser}`.slice(0, 64);
}

export function normalizeIpValue(ip: string): string {
  const cleaned = String(ip || '').trim().replace(/^::ffff:/i, '');
  if (cleaned === '::1' || cleaned === '0:0:0:0:0:0:0:1') return '127.0.0.1';
  return cleaned;
}

export function sha256HexNode(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

export function signMentorToken(mentorId: string, ip: string): string {
  const secret = process.env.ADMIN_2FA_SECRET || 'EWI777-MENTOR-CORE-SEC-2026';
  return crypto.createHmac('sha256', secret).update(`${mentorId}:${ip}`).digest('hex').slice(0, 32);
}

export function resolveActionSegment(req: IncomingMessage): string {
  const rawUrl = String(req.url || '');
  const pathOnly = rawUrl.split('?')[0].replace(/\/+$/, '');
  return pathOnly.split('/').pop()?.toLowerCase() || '';
}
