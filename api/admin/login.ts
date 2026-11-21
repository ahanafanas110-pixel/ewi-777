import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  extractClientIpNode,
  getFirestoreDoc,
  normalizeIpValue,
  parseDeviceNameNode,
  patchFirestoreDoc,
  readBodyJson,
  sendJson,
  SESSION_TTL_MS,
  setCorsHeaders,
  sha256HexNode
} from '../_shared';

const OLD_PHONE_HASH = '0aab39f411ae77619215a3cd679005519c52baa0758214ec51901ea355d006f1';
const OLD_PASS_HASH = '07882c957ec3bb16b8f5ec021707910625689e5e011811ce855fb5aeeddc1874';
const DEFAULT_PHONE_HASH = '27c75197134a88ef96daf2bdb444e3d6a0a394b9fa857b886c42b1988dd75d47';
const DEFAULT_PASS_HASH = 'bfbbb4e8bb9a402d888fd5133a41cf3d2423b82849d05bb63b2be5740f322814';
const ADMIN_2FA_SECRET = process.env.ADMIN_2FA_SECRET || 'EWI777-2FA-CORE-9941-SEC-X82';

function normalizePhoneServer(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+8800')) cleaned = '0' + cleaned.slice(5);
  else if (cleaned.startsWith('+880')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('8800')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('880')) cleaned = '0' + cleaned.slice(3);
  else if (/^1[35789]\d{8}$/.test(cleaned)) cleaned = '0' + cleaned;
  return cleaned;
}

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method not allowed' });
  }

  const body = await readBodyJson(req);
  const { phone, password, route, sessionId, deviceName, forceTakeover } = body || {};

  if (route && String(route) !== '/admin-ewi777-panel-009') {
    return sendJson(res, 403, { success: false, message: 'Unauthorized admin access route!' });
  }

  const rawPhone = String(phone || '').trim();
  const rawPass = String(password || '');
  if (!rawPhone || rawPass.length < 4) {
    return sendJson(res, 400, { success: false, message: 'Please enter a valid Admin Phone and Password.' });
  }

  const clientIp = normalizeIpValue(extractClientIpNode(req)) || 'Unknown';
  const resolvedDevice = String(deviceName || '').trim() || parseDeviceNameNode(String(req.headers?.['user-agent'] || ''));

  const settingsDoc = (await getFirestoreDoc('appConfig', 'settings')) || {};
  const bannedIps: string[] = Array.isArray(settingsDoc.bannedIps) ? settingsDoc.bannedIps.map(normalizeIpValue) : [];
  if (clientIp !== 'Unknown' && bannedIps.includes(clientIp)) {
    return sendJson(res, 403, { success: false, bannedIp: true, message: 'Access denied: Your IP address is blocked.' });
  }

  const envPhone = process.env.ADMIN_PHONE ? normalizePhoneServer(process.env.ADMIN_PHONE) : '';
  const envPass = process.env.ADMIN_PASSWORD || '';
  const fallbackPhoneHash = envPhone ? sha256HexNode(envPhone) : DEFAULT_PHONE_HASH;
  const fallbackPassHash = envPass ? sha256HexNode(envPass) : DEFAULT_PASS_HASH;

  const rawFbPhoneHash =
    settingsDoc.adminPhoneHash ||
    (settingsDoc.adminPhone ? sha256HexNode(normalizePhoneServer(String(settingsDoc.adminPhone))) : '');
  const rawFbPassHash =
    settingsDoc.adminPasswordHash ||
    (settingsDoc.adminPassword ? sha256HexNode(String(settingsDoc.adminPassword)) : '');

  const expectedPhoneHash = rawFbPhoneHash && rawFbPhoneHash !== OLD_PHONE_HASH ? rawFbPhoneHash : fallbackPhoneHash;
  const expectedPassHash = rawFbPassHash && rawFbPassHash !== OLD_PASS_HASH ? rawFbPassHash : fallbackPassHash;

  const inputPhone = normalizePhoneServer(rawPhone);
  if (sha256HexNode(inputPhone) !== expectedPhoneHash || sha256HexNode(rawPass) !== expectedPassHash) {
    return sendJson(res, 401, { success: false, message: 'Invalid Admin Number or Password!' });
  }

  // Enforce Single-Session Admin Lock
  const nowMs = Date.now();
  const active = settingsDoc.activeAdminSession;
  const incomingSid = String(sessionId || '').trim() || `adm_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
  const isStillAlive =
    active &&
    active.sessionId &&
    active.sessionId !== incomingSid &&
    nowMs - Number(active.lastSeenAtMs || active.loggedInAtMs || 0) < SESSION_TTL_MS;

  if (isStillAlive && !forceTakeover) {
    return sendJson(res, 409, {
      success: false,
      sessionConflict: true,
      activeSession: active,
      message: `Admin is already active on ${active.deviceName || 'another device'} (IP: ${active.ip || 'Unknown'}). Kick that session from the active device first.`
    });
  }

  const nextSession = {
    sessionId: incomingSid,
    ip: clientIp,
    deviceName: resolvedDevice,
    loggedInAt: new Date(nowMs).toLocaleString('en-GB'),
    loggedInAtMs: nowMs,
    lastSeenAtMs: nowMs
  };
  await patchFirestoreDoc('appConfig', 'settings', {
    ...settingsDoc,
    activeAdminSession: nextSession,
    updatedAt: nowMs
  });

  const sessionToken = crypto
    .createHmac('sha256', ADMIN_2FA_SECRET)
    .update(`ADMIN_SESSION:${expectedPhoneHash}:${incomingSid}:${Math.floor(nowMs / 86400000)}`)
    .digest('hex')
    .slice(0, 32);

  return sendJson(res, 200, {
    success: true,
    requires2FA: false,
    sessionToken,
    sessionId: incomingSid,
    activeSession: nextSession,
    message: 'Admin authenticated'
  });
}
