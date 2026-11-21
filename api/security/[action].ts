import type { IncomingMessage, ServerResponse } from 'http';
import {
  extractClientIpNode,
  getFirestoreDoc,
  listFirestoreCollection,
  normalizeIpValue,
  parseDeviceNameNode,
  patchFirestoreDoc,
  readBodyJson,
  resolveActionSegment,
  sendJson,
  setCorsHeaders
} from '../_shared';

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const action = resolveActionSegment(req);
  const clientIp = normalizeIpValue(extractClientIpNode(req)) || 'Unknown';
  const deviceName = parseDeviceNameNode(String(req.headers?.['user-agent'] || ''));

  if (action === 'status' && req.method === 'GET') {
    const settingsDoc = (await getFirestoreDoc('appConfig', 'settings')) || {};
    const bannedIps: string[] = Array.isArray(settingsDoc.bannedIps)
      ? settingsDoc.bannedIps.map((x: any) => normalizeIpValue(String(x)))
      : [];
    const mentorBlocked = Array.isArray(settingsDoc.mentorBlockedIps) ? settingsDoc.mentorBlockedIps : [];
    const isBannedIp = clientIp !== 'Unknown' && bannedIps.includes(clientIp);
    const isMentorBlocked =
      clientIp !== 'Unknown' && mentorBlocked.some((b: any) => normalizeIpValue(String(b?.ip || '')) === clientIp);
    return sendJson(res, 200, {
      success: true,
      ip: clientIp,
      deviceName,
      isBannedIp,
      isMentorBlocked
    });
  }

  if (action === 'ip-report' && req.method === 'GET') {
    const userDocs = await listFirestoreCollection('users', 400);
    const ipBuckets = new Map<string, any[]>();
    const vpnUsers: any[] = [];
    for (const item of userDocs) {
      const u = item.data;
      const primaryIp = normalizeIpValue(String(u.lastIp || u.registeredIp || ''));
      const regIp = normalizeIpValue(String(u.registeredIp || ''));
      const summary = {
        id: u.id || item.id,
        uid: u.uid || '',
        nickname: u.nickname || 'Member',
        phone: u.phone || u.email || '',
        balance: Number(u.balance) || 0,
        registeredIp: regIp || primaryIp || 'Unknown',
        lastIp: primaryIp || 'Unknown',
        deviceName: u.deviceName || '',
        isVpn: Boolean(u.isVpn),
        vpnReason: u.vpnReason || '',
        ipCountry: u.ipCountry || '',
        ipIsp: u.ipIsp || '',
        isBanned: Boolean(u.isBanned),
        lastLogin: u.lastLogin || ''
      };
      if (summary.isVpn) vpnUsers.push(summary);
      const ipsToTrack = new Set<string>();
      if (primaryIp && primaryIp !== 'Unknown') ipsToTrack.add(primaryIp);
      if (regIp && regIp !== 'Unknown') ipsToTrack.add(regIp);
      ipsToTrack.forEach((ipAddr) => {
        const list = ipBuckets.get(ipAddr) || [];
        if (!list.some((x) => x.id === summary.id)) {
          list.push(summary);
          ipBuckets.set(ipAddr, list);
        }
      });
    }
    const multiIpGroups = Array.from(ipBuckets.entries())
      .filter(([, usersList]) => usersList.length >= 2)
      .map(([ip, usersList]) => ({
        ip,
        count: usersList.length,
        hasVpn: usersList.some((x) => x.isVpn),
        country: usersList.find((x) => x.ipCountry)?.ipCountry || '',
        isp: usersList.find((x) => x.ipIsp)?.ipIsp || '',
        users: usersList
      }))
      .sort((a, b) => b.count - a.count);

    return sendJson(res, 200, {
      success: true,
      multiIpGroups,
      vpnUsers,
      totalTrackedUsers: userDocs.length
    });
  }

  if (action === 'ban-ip' && req.method === 'POST') {
    const body = await readBodyJson(req);
    const targetIp = normalizeIpValue(String(body?.ip || ''));
    const unban = Boolean(body?.unban);
    if (!targetIp || targetIp === 'Unknown') {
      return sendJson(res, 400, { success: false, message: 'Valid IP required' });
    }
    const settingsDoc = (await getFirestoreDoc('appConfig', 'settings')) || {};
    const prevBanned: string[] = Array.isArray(settingsDoc.bannedIps)
      ? settingsDoc.bannedIps.map((x: any) => normalizeIpValue(String(x))).filter(Boolean)
      : [];
    const nextBanned = unban
      ? prevBanned.filter((x) => x !== targetIp)
      : Array.from(new Set([...prevBanned, targetIp]));

    await patchFirestoreDoc('appConfig', 'settings', {
      ...settingsDoc,
      bannedIps: nextBanned,
      updatedAt: Date.now()
    });
    return sendJson(res, 200, { success: true, bannedIps: nextBanned });
  }

  return sendJson(res, 404, { success: false, message: 'Unknown security endpoint' });
}
