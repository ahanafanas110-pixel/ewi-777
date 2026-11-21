import type { IncomingMessage, ServerResponse } from 'http';
import {
  getFirestoreDoc,
  patchFirestoreDoc,
  readBodyJson,
  sendJson,
  SESSION_TTL_MS,
  setCorsHeaders
} from '../_shared';

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const settingsDoc = (await getFirestoreDoc('appConfig', 'settings')) || {};
  const active = settingsDoc.activeAdminSession || null;
  const nowMs = Date.now();
  const validActive =
    active && nowMs - Number(active.lastSeenAtMs || active.loggedInAtMs || 0) < SESSION_TTL_MS ? active : null;

  if (req.method === 'GET') {
    return sendJson(res, 200, { success: true, activeSession: validActive });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method not allowed' });
  }

  const body = await readBodyJson(req);
  const { action, sessionId } = body || {};

  if (action === 'kick' || action === 'logout') {
    if (action === 'logout' && validActive && sessionId && validActive.sessionId !== sessionId) {
      return sendJson(res, 200, { success: true, activeSession: validActive });
    }
    await patchFirestoreDoc('appConfig', 'settings', {
      ...settingsDoc,
      activeAdminSession: null,
      updatedAt: nowMs
    });
    return sendJson(res, 200, { success: true, activeSession: null, kicked: action === 'kick' });
  }

  if (action === 'heartbeat') {
    if (validActive && sessionId && validActive.sessionId !== sessionId) {
      return sendJson(res, 409, {
        success: false,
        kicked: true,
        activeSession: validActive,
        message: 'Your admin session was ended or superseded.'
      });
    }
    if (validActive && (!sessionId || validActive.sessionId === sessionId)) {
      const updated = { ...validActive, lastSeenAtMs: nowMs };
      await patchFirestoreDoc('appConfig', 'settings', {
        ...settingsDoc,
        activeAdminSession: updated
      });
      return sendJson(res, 200, { success: true, activeSession: updated });
    }
    return sendJson(res, 200, { success: true, activeSession: validActive });
  }

  return sendJson(res, 400, { success: false, message: 'Unsupported session action' });
}
