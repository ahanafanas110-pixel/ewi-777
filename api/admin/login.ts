import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

const DEFAULT_PHONE_HASH = '0aab39f411ae77619215a3cd679005519c52baa0758214ec51901ea355d006f1';
const DEFAULT_PASS_HASH = '07882c957ec3bb16b8f5ec021707910625689e5e011811ce855fb5aeeddc1874';

function sha256Hex(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

function getFirebaseConfigSafe(): { projectId: string; firestoreDatabaseId: string; apiKey: string } {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0882665131',
      firestoreDatabaseId:
        process.env.FIREBASE_DATABASE_ID || 'ai-studio-win777premiumonl-cf3c2f52-bee9-47a8-ac01-331a160d69bc',
      apiKey: process.env.FIREBASE_API_KEY || ''
    };
  }
}

function normalizePhoneServer(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+8800')) cleaned = '0' + cleaned.slice(5);
  else if (cleaned.startsWith('+880')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('8800')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('880')) cleaned = '0' + cleaned.slice(3);
  else if (/^1[3-9]\d{8}$/.test(cleaned)) cleaned = '0' + cleaned;
  return cleaned;
}

async function readBodyJson(req: any): Promise<any> {
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

async function fetchLiveAdminCredentialHashes(): Promise<{ phoneHash: string; passwordHash: string }> {
  const envPhone = process.env.ADMIN_PHONE ? normalizePhoneServer(process.env.ADMIN_PHONE) : '';
  const envPass = process.env.ADMIN_PASSWORD || '';
  const fallback = {
    phoneHash: envPhone ? sha256Hex(envPhone) : DEFAULT_PHONE_HASH,
    passwordHash: envPass ? sha256Hex(envPass) : DEFAULT_PASS_HASH
  };
  try {
    const firebaseConfig = getFirebaseConfigSafe();
    if (!firebaseConfig.projectId) return fallback;
    const keyQuery = firebaseConfig.apiKey ? `?key=${firebaseConfig.apiKey}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/appConfig/settings${keyQuery}`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = await res.json();
    const fields = data?.fields || {};
    const phoneHash =
      fields.adminPhoneHash?.stringValue ||
      (fields.adminPhone?.stringValue ? sha256Hex(normalizePhoneServer(fields.adminPhone.stringValue)) : '') ||
      fallback.phoneHash;
    const passwordHash =
      fields.adminPasswordHash?.stringValue ||
      (fields.adminPassword?.stringValue ? sha256Hex(fields.adminPassword.stringValue) : '') ||
      fallback.passwordHash;
    return { phoneHash, passwordHash };
  } catch {
    return fallback;
  }
}

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  const sendJson = (statusCode: number, payload: any) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };

  if (req.method !== 'POST') {
    return sendJson(405, { success: false, message: 'Method not allowed' });
  }

  const body = await readBodyJson(req);
  const { phone, password, route } = body || {};

  if (route && String(route) !== '/admin-ewi777-panel-009') {
    return sendJson(403, { success: false, message: 'Unauthorized admin access route!' });
  }

  const rawPhone = String(phone || '').trim();
  const rawPass = String(password || '');
  if (!rawPhone || rawPass.length < 4) {
    return sendJson(400, { success: false, message: 'Please enter a valid Admin Phone and Password.' });
  }

  const creds = await fetchLiveAdminCredentialHashes();
  const inputPhone = normalizePhoneServer(rawPhone);
  const inputPhoneHash = sha256Hex(inputPhone);
  const inputPassHash = sha256Hex(rawPass);

  if (inputPhoneHash !== creds.phoneHash || inputPassHash !== creds.passwordHash) {
    return sendJson(401, { success: false, message: 'Invalid Admin Phone or Password!' });
  }

  return sendJson(200, { success: true, requires2FA: true });
}
