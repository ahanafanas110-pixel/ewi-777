import type { IncomingMessage, ServerResponse } from 'http';
import {
  extractClientIpNode,
  getFirestoreDoc,
  listFirestoreCollection,
  normalizeIpValue,
  patchFirestoreDoc,
  readBodyJson,
  resolveActionSegment,
  sendJson,
  setCorsHeaders,
  signMentorToken
} from '../_shared';

function appendMentorLog(settingsDoc: Record<string, any>, entry: Record<string, any>) {
  const prev = Array.isArray(settingsDoc.mentorLogs) ? settingsDoc.mentorLogs : [];
  return [entry, ...prev].slice(0, 300);
}

async function blockMentorIpPermanently(
  settingsDoc: Record<string, any>,
  clientIp: string,
  reason: string,
  attemptedUsername?: string
) {
  const nowMs = Date.now();
  const prevBlocked = Array.isArray(settingsDoc.mentorBlockedIps) ? settingsDoc.mentorBlockedIps : [];
  const nextBlocked = [
    {
      ip: clientIp,
      reason,
      ...(attemptedUsername ? { attemptedUsername } : {}),
      blockedAt: new Date(nowMs).toLocaleString('en-GB'),
      blockedAtMs: nowMs
    },
    ...prevBlocked.filter((x: any) => normalizeIpValue(String(x?.ip || '')) !== clientIp)
  ].slice(0, 200);

  const nextLogs = appendMentorLog(settingsDoc, {
    id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
    mentorId: 'security',
    mentorName: 'Mentor Gatekeeper',
    mentorUsername: attemptedUsername || 'unknown',
    ip: clientIp,
    action: 'login_failed_blocked',
    detail: reason,
    time: new Date(nowMs).toLocaleString('en-GB'),
    timestamp: nowMs
  });

  await patchFirestoreDoc('appConfig', 'settings', {
    ...settingsDoc,
    mentorBlockedIps: nextBlocked,
    mentorLogs: nextLogs,
    updatedAt: nowMs
  });
}

function isSameUtcDay(val: any, todayYmd: string): boolean {
  if (!val) return false;
  if (typeof val === 'number') return new Date(val).toISOString().slice(0, 10) === todayYmd;
  const s = String(val);
  if (s.startsWith(todayYmd)) return true;
  const parsed = Date.parse(s);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === todayYmd;
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

  const actionSegment = resolveActionSegment(req);
  const body = await readBodyJson(req);
  const clientIp = normalizeIpValue(extractClientIpNode(req)) || 'Unknown';
  const settingsDoc = (await getFirestoreDoc('appConfig', 'settings')) || {};

  const bannedIps: string[] = Array.isArray(settingsDoc.bannedIps) ? settingsDoc.bannedIps.map(normalizeIpValue) : [];
  if (clientIp !== 'Unknown' && bannedIps.includes(clientIp)) {
    return sendJson(res, 403, { success: false, bannedIp: true, message: 'Your IP address is globally banned.' });
  }

  const blockedList: any[] = Array.isArray(settingsDoc.mentorBlockedIps) ? settingsDoc.mentorBlockedIps : [];
  if (blockedList.some((b: any) => normalizeIpValue(String(b?.ip || '')) === clientIp)) {
    return sendJson(res, 403, {
      success: false,
      mentorBlocked: true,
      ip: clientIp,
      message: 'This IP has been permanently blocked from Mentor access. Contact Admin to unblock.'
    });
  }

  const mentors: any[] = Array.isArray(settingsDoc.mentors) ? settingsDoc.mentors : [];

  if (actionSegment === 'login') {
    const username = String(body?.username || '').trim().replace(/^@+/, '');
    const password = String(body?.password || '');
    if (!username || !password) {
      return sendJson(res, 400, { success: false, ip: clientIp, message: 'Username and password are required.' });
    }

    if (mentors.length === 0) {
      return sendJson(res, 400, {
        success: false,
        ip: clientIp,
        message: 'No Mentor accounts created yet. Ask Admin to create your Mentor account in Admin Panel → Mentors first.'
      });
    }

    const matched = mentors.find(
      (m) =>
        String(m.username || '').trim().replace(/^@+/, '').toLowerCase() === username.toLowerCase() &&
        m.active !== false
    );

    if (!matched || (matched.password !== password && matched.password !== password.trim())) {
      await blockMentorIpPermanently(
        settingsDoc,
        clientIp,
        'Invalid Mentor username or password attempt',
        username
      );
      return sendJson(res, 403, {
        success: false,
        mentorBlocked: true,
        ip: clientIp,
        message: 'Invalid Mentor credentials! Your IP has been permanently blocked. Ask Admin to unblock it.'
      });
    }

    const allowedIp = normalizeIpValue(String(matched.allowedIp || ''));
    if (!allowedIp || allowedIp !== clientIp) {
      await blockMentorIpPermanently(
        settingsDoc,
        clientIp,
        `IP mismatch for Mentor "${matched.username}" (expected ${allowedIp || 'unset'}, got ${clientIp})`,
        username
      );
      return sendJson(res, 403, {
        success: false,
        mentorBlocked: true,
        ip: clientIp,
        message: `IP mismatch (${clientIp} ≠ authorized ${allowedIp || 'unset'})! Your IP has been permanently blocked.`
      });
    }

    const nowMs = Date.now();
    const nextMentors = mentors.map((m) =>
      m.id === matched.id
        ? { ...m, lastLoginAt: new Date(nowMs).toLocaleString('en-GB'), lastLoginIp: clientIp }
        : m
    );
    const nextLogs = appendMentorLog(settingsDoc, {
      id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      mentorId: matched.id,
      mentorName: matched.name,
      mentorUsername: matched.username,
      ip: clientIp,
      action: 'login_success',
      detail: 'Mentor signed in with exact IP match',
      time: new Date(nowMs).toLocaleString('en-GB'),
      timestamp: nowMs
    });
    await patchFirestoreDoc('appConfig', 'settings', {
      ...settingsDoc,
      mentors: nextMentors,
      mentorLogs: nextLogs,
      updatedAt: nowMs
    });

    const token = signMentorToken(matched.id, clientIp);
    return sendJson(res, 200, {
      success: true,
      token,
      ip: clientIp,
      mentor: {
        id: matched.id,
        name: matched.name,
        username: matched.username,
        allowedIp: matched.allowedIp,
        giftCodeBudget: Number(matched.giftCodeBudget || 0),
        giftCodeSpent: Number(matched.giftCodeSpent || 0)
      }
    });
  }

  // Verify token + 100% live IP match for data & action routes
  const mentorId = String(body?.mentorId || '').trim();
  const token = String(body?.token || '').trim();
  const mentor = mentors.find((m) => m.id === mentorId && m.active !== false);
  if (!mentor || normalizeIpValue(String(mentor.allowedIp || '')) !== clientIp || signMentorToken(mentor.id, clientIp) !== token) {
    return sendJson(res, 401, {
      success: false,
      message: 'Mentor session expired or IP changed. Please re-authenticate.'
    });
  }

  if (actionSegment === 'data') {
    const [userDocs, wdDocs, depDocs, msgDocs] = await Promise.all([
      listFirestoreCollection('users', 400),
      listFirestoreCollection('withdraws', 250),
      listFirestoreCollection('deposits', 300),
      listFirestoreCollection('supportMessages', 400)
    ]);

    const ipCounts = new Map<string, number>();
    userDocs.forEach(({ data: u }) => {
      const ip = normalizeIpValue(String(u.lastIp || u.registeredIp || ''));
      if (ip && ip !== 'Unknown') ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
    });

    // ZERO balance, ZERO totalDeposited, ZERO totalWithdrawn exposed to Mentor
    const sanitizedUsers = userDocs.map(({ id, data: u }) => {
      const primaryIp = normalizeIpValue(String(u.lastIp || u.registeredIp || 'Unknown'));
      return {
        id: u.id || id,
        uid: u.uid || '',
        nickname: u.nickname || 'Member',
        phone: u.phone || u.email || '',
        registeredIp: normalizeIpValue(String(u.registeredIp || '')) || 'Unknown',
        lastIp: primaryIp || 'Unknown',
        deviceName: u.deviceName || 'Unknown Device',
        isVpn: Boolean(u.isVpn),
        vpnReason: u.vpnReason || '',
        ipCountry: u.ipCountry || '',
        ipIsp: u.ipIsp || '',
        sameIpCount: primaryIp !== 'Unknown' ? ipCounts.get(primaryIp) || 1 : 1,
        hasHoldingBalance: Number(u.lockedBalance || 0) > 0,
        turnoverRequired: Number(u.turnoverRequired || 0),
        turnoverCompleted: Number(u.turnoverCompleted || 0),
        createdAt: u.createdAt || '',
        lastLogin: u.lastLogin || '',
        isBanned: Boolean(u.isBanned)
      };
    });

    // Withdrawals WITHOUT money amount or monetary totals
    const sanitizedWithdraws = wdDocs
      .map(({ id, data: w }) => ({
        id: w.id || id,
        orderId: w.orderId || w.id || id,
        userId: w.userId || '',
        userName: w.userName || 'Member',
        userPhone: w.userPhone || '',
        method: w.method || 'bKash',
        number: w.number || '',
        status: w.status || 'pending',
        time: w.time || '',
        createdAtMs: Number(w.createdAtMs || 0),
        adminNote: w.adminNote || '',
        rejectionReason: w.rejectionReason || '',
        userMessage: w.userMessage || ''
      }))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    // Pure COUNT-ONLY metrics for Today's Registrations & Binary vs bKash/Nagad Depositors
    const todayYmd = new Date().toISOString().slice(0, 10);
    const todayRegistrationsCount = userDocs.filter(({ data: u }) => isSameUtcDay(u.createdAt, todayYmd)).length;
    const binaryDepositorSet = new Set<string>();
    const bkashNagadDepositorSet = new Set<string>();
    depDocs.forEach(({ data: d }) => {
      if (d.status !== 'approved') return;
      const key = String(d.userId || d.userPhone || d.id);
      const m = String(d.method || '').toLowerCase();
      if (m === 'usdt' || m.includes('binary')) binaryDepositorSet.add(key);
      else if (m === 'bkash' || m === 'nagad' || m === 'rocket') bkashNagadDepositorSet.add(key);
    });

    const supportMessages = msgDocs
      .map(({ data: m }) => m)
      .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));

    const myGiftCodes = (Array.isArray(settingsDoc.activeGiftCodes) ? settingsDoc.activeGiftCodes : []).filter(
      (g: any) => g.createdByMentorId === mentor.id
    );

    return sendJson(res, 200, {
      success: true,
      ip: clientIp,
      mentor: {
        id: mentor.id,
        name: mentor.name,
        username: mentor.username,
        allowedIp: mentor.allowedIp,
        giftCodeBudget: Number(mentor.giftCodeBudget || 0),
        giftCodeSpent: Number(mentor.giftCodeSpent || 0)
      },
      countsOnly: {
        todayRegistrationsCount,
        binaryDepositorsCount: binaryDepositorSet.size,
        bkashNagadDepositorsCount: bkashNagadDepositorSet.size
      },
      users: sanitizedUsers,
      withdraws: sanitizedWithdraws,
      supportMessages,
      giftCodes: myGiftCodes
    });
  }

  if (actionSegment === 'action') {
    const op = String(body?.op || '').trim();
    const nowMs = Date.now();
    const nowStr = new Date(nowMs).toLocaleString('en-GB');

    // 1. Live Customer Care Chat Reply
    if (op === 'support_reply') {
      const { userId, userUid, userNickname, userPhone, text, imageUrl } = body;
      if (!userId || (!String(text || '').trim() && !imageUrl)) {
        return sendJson(res, 400, { success: false, message: 'Reply message or image required.' });
      }
      const msgId = `cs_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
      const msg = {
        id: msgId,
        userId: String(userId),
        userUid: String(userUid || ''),
        userNickname: String(userNickname || 'Member'),
        userPhone: String(userPhone || ''),
        sender: 'admin',
        repliedByRole: 'mentor',
        repliedByName: mentor.name,
        text: String(text || '').trim().slice(0, 4000),
        ...(typeof imageUrl === 'string' && imageUrl.startsWith('data:image/') ? { imageUrl: imageUrl.slice(0, 320000) } : {}),
        time: new Date(nowMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        timestamp: nowMs
      };
      await patchFirestoreDoc('supportMessages', msgId, msg);
      const nextLogs = appendMentorLog(settingsDoc, {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorUsername: mentor.username,
        ip: clientIp,
        action: 'support_reply',
        targetUid: String(userUid || userId),
        detail: `Replied to customer care chat (${String(userUid || userId)}): ${msg.text.slice(0, 80)}`,
        time: nowStr,
        timestamp: nowMs
      });
      await patchFirestoreDoc('appConfig', 'settings', { ...settingsDoc, mentorLogs: nextLogs, updatedAt: nowMs });
      return sendJson(res, 200, { success: true, message: msg });
    }

    // 2. Withdraw Status Update (ONLY processing / rejected) + Holding Balance release + Turnover adjust
    if (op === 'withdraw_update') {
      const { withdrawId, status, note } = body;
      if (status !== 'processing' && status !== 'rejected') {
        return sendJson(res, 403, { success: false, message: 'Mentors may only mark withdrawals Processing or Rejected.' });
      }
      const wdDoc = await getFirestoreDoc('withdraws', String(withdrawId || ''));
      if (!wdDoc) {
        return sendJson(res, 404, { success: false, message: 'Withdrawal record not found.' });
      }
      const prevStatus = wdDoc.status;
      if (prevStatus === 'completed') {
        return sendJson(res, 400, { success: false, message: 'Completed withdrawals cannot be modified.' });
      }
      const cleanNote = String(note || '').trim() || (status === 'rejected' ? 'আপনি কিছুক্ষণ পর আবার চেষ্টা করুন ধন্যবাদ' : 'Processing by Mentor');
      await patchFirestoreDoc('withdraws', String(withdrawId), {
        ...wdDoc,
        status,
        adminNote: cleanNote,
        ...(status === 'rejected' ? { rejectionReason: cleanNote, userMessage: cleanNote } : {})
      });
      if (status === 'rejected' && prevStatus !== 'rejected') {
        const uDoc = await getFirestoreDoc('users', String(wdDoc.userId || ''));
        if (uDoc) {
          await patchFirestoreDoc('users', String(wdDoc.userId), {
            ...uDoc,
            balance: +(Number(uDoc.balance || 0) + Number(wdDoc.amount || 0)).toFixed(2),
            updatedAt: nowMs
          });
        }
      }
      const nextLogs = appendMentorLog(settingsDoc, {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorUsername: mentor.username,
        ip: clientIp,
        action: 'withdraw_updated',
        targetUid: String(wdDoc.userId || ''),
        detail: `Marked withdrawal ${wdDoc.orderId || withdrawId} as ${status.toUpperCase()} (${cleanNote})`,
        time: nowStr,
        timestamp: nowMs
      });
      await patchFirestoreDoc('appConfig', 'settings', { ...settingsDoc, mentorLogs: nextLogs, updatedAt: nowMs });
      return sendJson(res, 200, { success: true });
    }

    if (op === 'release_holding') {
      const { userId } = body;
      const uDoc = await getFirestoreDoc('users', String(userId || ''));
      if (!uDoc) return sendJson(res, 404, { success: false, message: 'User not found.' });
      await patchFirestoreDoc('users', String(userId), { ...uDoc, lockedBalance: 0, updatedAt: nowMs });
      const nextLogs = appendMentorLog(settingsDoc, {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorUsername: mentor.username,
        ip: clientIp,
        action: 'holding_released',
        targetUid: String(uDoc.uid || userId),
        detail: `Released holding lock for UID ${uDoc.uid || userId}`,
        time: nowStr,
        timestamp: nowMs
      });
      await patchFirestoreDoc('appConfig', 'settings', { ...settingsDoc, mentorLogs: nextLogs, updatedAt: nowMs });
      return sendJson(res, 200, { success: true });
    }

    if (op === 'adjust_turnover') {
      const { userId, turnoverRequired, turnoverCompleted } = body;
      const uDoc = await getFirestoreDoc('users', String(userId || ''));
      if (!uDoc) return sendJson(res, 404, { success: false, message: 'User not found.' });
      const nextReq = Math.max(0, Number(turnoverRequired ?? uDoc.turnoverRequired ?? 0));
      const nextComp = Math.max(0, Number(turnoverCompleted ?? uDoc.turnoverCompleted ?? 0));
      await patchFirestoreDoc('users', String(userId), {
        ...uDoc,
        turnoverRequired: nextReq,
        turnoverCompleted: nextComp,
        updatedAt: nowMs
      });
      const nextLogs = appendMentorLog(settingsDoc, {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorUsername: mentor.username,
        ip: clientIp,
        action: 'turnover_adjusted',
        targetUid: String(uDoc.uid || userId),
        detail: `Adjusted turnover for UID ${uDoc.uid || userId} to Req=${nextReq}, Done=${nextComp}`,
        time: nowStr,
        timestamp: nowMs
      });
      await patchFirestoreDoc('appConfig', 'settings', { ...settingsDoc, mentorLogs: nextLogs, updatedAt: nowMs });
      return sendJson(res, 200, { success: true });
    }

    // 3. Gift Code Generator strictly capped by Mentor Budget
    if (op === 'create_gift_code') {
      const code = String(body?.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      const amount = Math.max(1, Number(body?.amount) || 0);
      const maxClaims = Math.max(1, Math.floor(Number(body?.maxClaims) || 1));
      const turnoverAmount = Math.max(0, Number(body?.turnoverAmount) || amount);
      const targetUid = String(body?.targetUid || '').trim().toUpperCase();
      const reason = String(body?.reason || `Mentor Gift (${mentor.name})`).trim();
      if (!code || code.length < 4) {
        return sendJson(res, 400, { success: false, message: 'Code must be at least 4 characters.' });
      }
      const existingCodes: any[] = Array.isArray(settingsDoc.activeGiftCodes) ? settingsDoc.activeGiftCodes : [];
      if (existingCodes.some((c) => String(c.code || '').toUpperCase() === code)) {
        return sendJson(res, 409, { success: false, message: 'Gift code already exists!' });
      }
      const totalCost = +(amount * maxClaims).toFixed(2);
      const budget = Number(mentor.giftCodeBudget || 0);
      const spent = Number(mentor.giftCodeSpent || 0);
      if (spent + totalCost > budget) {
        return sendJson(res, 403, {
          success: false,
          message: `Insufficient Mentor Gift Budget! Remaining: ৳${Math.max(0, budget - spent).toFixed(2)}, Needed: ৳${totalCost}`
        });
      }
      const newGift = {
        code,
        rewardType: 'fixed',
        amount,
        maxClaims,
        claimedCount: 0,
        turnoverAmount,
        createdAt: nowMs,
        claimedBy: [],
        active: true,
        ...(targetUid ? { targetUid } : {}),
        reason,
        note: `Created by Mentor ${mentor.name}`,
        createdByMentorId: mentor.id,
        createdByMentorName: mentor.name,
        claimRecords: []
      };
      const nextMentors = mentors.map((m) =>
        m.id === mentor.id ? { ...m, giftCodeSpent: +(spent + totalCost).toFixed(2) } : m
      );
      const nextLogs = appendMentorLog(settingsDoc, {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorUsername: mentor.username,
        ip: clientIp,
        action: 'gift_code_created',
        code,
        amount: totalCost,
        ...(targetUid ? { targetUid } : {}),
        detail: `Created Gift Code ${code} (৳${amount} × ${maxClaims} = ৳${totalCost})${targetUid ? ` for UID ${targetUid}` : ''}`,
        time: nowStr,
        timestamp: nowMs
      });
      await patchFirestoreDoc('appConfig', 'settings', {
        ...settingsDoc,
        activeGiftCodes: [newGift, ...existingCodes],
        mentors: nextMentors,
        mentorLogs: nextLogs,
        updatedAt: nowMs
      });
      return sendJson(res, 200, {
        success: true,
        giftCode: newGift,
        giftCodeSpent: +(spent + totalCost).toFixed(2)
      });
    }

    // 5. Broadcast / UID Personal Notification Sender
    if (op === 'send_notice') {
      const { targetUid, title, message } = body;
      const cleanTitle = String(title || '').trim();
      const cleanMessage = String(message || '').trim();
      if (!cleanTitle || !cleanMessage) {
        return sendJson(res, 400, { success: false, message: 'Title and message are required.' });
      }
      const notifId = `notif_m_${nowMs}_${Math.random().toString(36).slice(2, 6)}`;
      let resolvedUserId = 'ALL';
      if (targetUid && String(targetUid).trim().toUpperCase() !== 'ALL') {
        const cleanUid = String(targetUid).trim().toUpperCase();
        const users = await listFirestoreCollection('users', 400);
        const targetUser = users.find(
          ({ data: u }) =>
            String(u.uid || '').toUpperCase() === cleanUid ||
            String(u.id || '').toUpperCase() === cleanUid ||
            String(u.phone || '') === String(targetUid).trim()
        );
        if (!targetUser) {
          return sendJson(res, 404, { success: false, message: `User UID "${cleanUid}" not found.` });
        }
        resolvedUserId = String(targetUser.data.id || targetUser.id);
      }
      await patchFirestoreDoc('notifications', notifId, {
        id: notifId,
        userId: resolvedUserId,
        title: cleanTitle.slice(0, 300),
        message: cleanMessage.slice(0, 3000),
        reason: `Sent by Mentor ${mentor.name}`,
        type: 'system',
        read: false,
        time: nowStr
      });
      const nextLogs = appendMentorLog(settingsDoc, {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorUsername: mentor.username,
        ip: clientIp,
        action: 'broadcast_sent',
        targetUid: resolvedUserId === 'ALL' ? 'ALL' : String(targetUid),
        detail: `Sent notice "${cleanTitle}" to ${resolvedUserId === 'ALL' ? 'All Users' : `UID ${targetUid}`}`,
        time: nowStr,
        timestamp: nowMs
      });
      await patchFirestoreDoc('appConfig', 'settings', { ...settingsDoc, mentorLogs: nextLogs, updatedAt: nowMs });
      return sendJson(res, 200, { success: true });
    }

    // 6. Change own Mentor Password
    if (op === 'change_password') {
      const { currentPassword, newPassword } = body;
      if (String(currentPassword || '') !== mentor.password) {
        return sendJson(res, 401, { success: false, message: 'Current password is incorrect.' });
      }
      if (!newPassword || String(newPassword).trim().length < 6) {
        return sendJson(res, 400, { success: false, message: 'New password must be at least 6 characters.' });
      }
      const nextMentors = mentors.map((m) =>
        m.id === mentor.id ? { ...m, password: String(newPassword).trim() } : m
      );
      const nextLogs = appendMentorLog(settingsDoc, {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorUsername: mentor.username,
        ip: clientIp,
        action: 'password_changed',
        detail: `Mentor ${mentor.username} updated their own password`,
        time: nowStr,
        timestamp: nowMs
      });
      await patchFirestoreDoc('appConfig', 'settings', {
        ...settingsDoc,
        mentors: nextMentors,
        mentorLogs: nextLogs,
        updatedAt: nowMs
      });
      return sendJson(res, 200, { success: true, message: 'Mentor password updated successfully!' });
    }

    return sendJson(res, 400, { success: false, message: 'Unknown mentor action.' });
  }

  return sendJson(res, 404, { success: false, message: 'Unknown mentor endpoint.' });
}
