import type { IncomingMessage, ServerResponse } from 'http';
import {
  getFirestoreDoc,
  listFirestoreCollection,
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

  if (action === 'rooms' && req.method === 'GET') {
    const docs = await listFirestoreCollection('ludoRooms', 60);
    const rooms = docs
      .map(({ data }) => ({
        ...data,
        password: data.password ? '***' : ''
      }))
      .sort((a: any, b: any) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return sendJson(res, 200, { success: true, rooms });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method not allowed' });
  }

  const body = await readBodyJson(req);
  const nowMs = Date.now();

  if (action === 'create') {
    const { userId, uid, name, mode, stake, password } = body || {};
    const numStake = Number(stake) || 0;
    if (!userId || numStake < 20 || numStake > 50000 || !String(password || '').trim()) {
      return sendJson(res, 400, { success: false, message: 'Stake must be ৳20–৳50,000 and password is required.' });
    }
    const maxPlayers = mode === '2p_winner' ? 2 : 4;
    const code = `LUDO${Math.floor(100000 + Math.random() * 900000)}`;
    const roomId = `ludo_${code}_${nowMs}`;
    const room = {
      id: roomId,
      code,
      password: String(password).trim(),
      hostUserId: String(userId),
      hostName: String(name || 'Host'),
      mode: mode === '4p_split' ? '4p_split' : mode === '4p_winner' ? '4p_winner' : '2p_winner',
      maxPlayers,
      stake: numStake,
      status: 'waiting',
      players: [
        {
          slotIndex: 0,
          color: 'red',
          userId: String(userId),
          uid: String(uid || ''),
          name: String(name || 'Player 1'),
          isBot: false,
          tokens: [-1, -1, -1, -1]
        }
      ],
      currentTurnIdx: 0,
      createdAt: new Date(nowMs).toLocaleString('en-GB'),
      createdAtMs: nowMs,
      updatedAt: nowMs
    };
    await patchFirestoreDoc('ludoRooms', roomId, room);
    return sendJson(res, 200, { success: true, room });
  }

  if (action === 'join') {
    const { code, password, userId, uid, name } = body || {};
    const cleanCode = String(code || '').trim().toUpperCase();
    const docs = await listFirestoreCollection('ludoRooms', 80);
    const found = docs.find(({ data }) => String(data.code || '').toUpperCase() === cleanCode);
    if (!found) {
      return sendJson(res, 404, { success: false, message: 'Ludo room not found.' });
    }
    const room = found.data;
    if (String(room.password || '') !== String(password || '').trim()) {
      return sendJson(res, 401, { success: false, message: 'Incorrect room password!' });
    }
    const players: any[] = Array.isArray(room.players) ? room.players : [];
    const alreadyIn = players.some((p) => p.userId === userId);
    if (!alreadyIn) {
      if (room.status !== 'waiting' || players.length >= Number(room.maxPlayers || 2)) {
        return sendJson(res, 409, { success: false, message: 'Room is already full or started.' });
      }
      const colors = Number(room.maxPlayers) === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
      const slotIdx = players.length;
      players.push({
        slotIndex: slotIdx,
        color: colors[slotIdx] || 'blue',
        userId: String(userId),
        uid: String(uid || ''),
        name: String(name || `Player ${slotIdx + 1}`),
        isBot: false,
        tokens: [-1, -1, -1, -1]
      });
      room.players = players;
      if (players.length >= Number(room.maxPlayers || 2)) {
        room.status = 'playing';
      }
      room.updatedAt = nowMs;
      await patchFirestoreDoc('ludoRooms', found.id, room);
    }
    return sendJson(res, 200, { success: true, room });
  }

  if (action === 'move') {
    const { roomId, players, currentTurnIdx, lastRoll, status } = body || {};
    const room = await getFirestoreDoc('ludoRooms', String(roomId || ''));
    if (!room) return sendJson(res, 404, { success: false, message: 'Room not found' });
    const nextRoom = {
      ...room,
      ...(Array.isArray(players) ? { players } : {}),
      ...(typeof currentTurnIdx === 'number' ? { currentTurnIdx } : {}),
      ...(typeof lastRoll === 'number' ? { lastRoll } : {}),
      ...(status ? { status } : {}),
      updatedAt: nowMs
    };
    await patchFirestoreDoc('ludoRooms', String(roomId), nextRoom);
    return sendJson(res, 200, { success: true, room: nextRoom });
  }

  if (action === 'settle') {
    const { roomId, payouts, winnerUserId, winnerSummary } = body || {};
    const room = await getFirestoreDoc('ludoRooms', String(roomId || ''));
    if (!room) return sendJson(res, 404, { success: false, message: 'Room not found' });
    if (room.status === 'finished') {
      return sendJson(res, 200, { success: true, room, alreadySettled: true });
    }
    const nextRoom = {
      ...room,
      status: 'finished',
      ...(winnerUserId ? { winnerUserId } : {}),
      ...(winnerSummary ? { winnerSummary } : {}),
      ...(Array.isArray(payouts) ? { payouts } : {}),
      updatedAt: nowMs
    };
    await patchFirestoreDoc('ludoRooms', String(roomId), nextRoom);
    return sendJson(res, 200, { success: true, room: nextRoom });
  }

  if (action === 'cancel') {
    const { roomId, userId } = body || {};
    const room = await getFirestoreDoc('ludoRooms', String(roomId || ''));
    if (!room) return sendJson(res, 404, { success: false, message: 'Room not found' });
    if (String(room.hostUserId || '') !== String(userId || '')) {
      return sendJson(res, 403, { success: false, message: 'Only the host can cancel this room.' });
    }
    if (room.status !== 'waiting') {
      return sendJson(res, 409, { success: false, message: 'Cannot cancel a match that already started.' });
    }
    const nextRoom = { ...room, status: 'cancelled', updatedAt: nowMs };
    await patchFirestoreDoc('ludoRooms', String(roomId), nextRoom);
    return sendJson(res, 200, { success: true, room: nextRoom });
  }

  return sendJson(res, 404, { success: false, message: 'Unknown Ludo action' });
}
