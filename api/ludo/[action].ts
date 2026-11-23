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
    const { roomId, players, currentTurnIdx, lastRoll, status, statusText } = body || {};
    const room = await getFirestoreDoc('ludoRooms', String(roomId || ''));
    if (!room) return sendJson(res, 404, { success: false, message: 'Room not found' });
    const nextRoom = {
      ...room,
      ...(Array.isArray(players) ? { players } : {}),
      ...(typeof currentTurnIdx === 'number' ? { currentTurnIdx } : {}),
      ...(typeof lastRoll === 'number' ? { lastRoll } : {}),
      ...(status ? { status } : {}),
      ...(typeof statusText === 'string' && statusText ? { statusText } : {}),
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
    const nextRoom = {
      ...room,
      status: 'cancelled',
      statusText: `Room ${room.code} cancelled — 90% stake refunded.`,
      updatedAt: nowMs
    };
    await patchFirestoreDoc('ludoRooms', String(roomId), nextRoom);
    return sendJson(res, 200, { success: true, room: nextRoom });
  }

  if (action === 'leave') {
    const { roomId, userId, name } = body || {};
    const room = await getFirestoreDoc('ludoRooms', String(roomId || ''));
    if (!room) return sendJson(res, 404, { success: false, message: 'Room not found' });
    if (room.status !== 'waiting') {
      return sendJson(res, 409, { success: false, message: 'Cannot leave & refund after match started.' });
    }
    const prevPlayers: any[] = Array.isArray(room.players) ? room.players : [];
    const nextPlayers = prevPlayers
      .filter((p) => String(p.userId) !== String(userId || ''))
      .map((p, idx) => ({ ...p, slotIndex: idx }));
    const nextRoom = {
      ...room,
      players: nextPlayers,
      statusText: `${String(name || 'Player')} left room (90% refund).`,
      updatedAt: nowMs
    };
    await patchFirestoreDoc('ludoRooms', String(roomId), nextRoom);
    return sendJson(res, 200, { success: true, room: nextRoom });
  }

  if (action === 'forfeit') {
    const { roomId, userId, name } = body || {};
    const room = await getFirestoreDoc('ludoRooms', String(roomId || ''));
    if (!room) return sendJson(res, 404, { success: false, message: 'Room not found' });
    if (room.status === 'finished' || room.status === 'cancelled') {
      return sendJson(res, 200, { success: true, room, alreadySettled: true });
    }
    if (room.status !== 'playing') {
      return sendJson(res, 200, { success: true, room });
    }

    const prevPlayers: any[] = Array.isArray(room.players) ? room.players : [];
    const nextPlayers = prevPlayers.map((p) =>
      String(p.userId) === String(userId || '')
        ? { ...p, forfeited: true, finishedRank: 99 }
        : p
    );

    const activePlayers = nextPlayers.filter((p) => !p.forfeited && p.finishedRank !== 99);
    const leaverName = String(
      name || prevPlayers.find((p) => String(p.userId) === String(userId || ''))?.name || 'Player'
    );
    const stake = Number(room.stake || 0);

    if (activePlayers.length <= 1 || room.mode === '2p_winner') {
      const ranked = [...nextPlayers].sort((a, b) => {
        if (Boolean(a.forfeited) !== Boolean(b.forfeited)) return a.forfeited ? 1 : -1;
        const rA = Number(a.finishedRank || 99);
        const rB = Number(b.finishedRank || 99);
        if (rA !== rB) return rA - rB;
        const doneA = Array.isArray(a.tokens) ? a.tokens.filter((t: number) => t === 56).length : 0;
        const doneB = Array.isArray(b.tokens) ? b.tokens.filter((t: number) => t === 56).length : 0;
        if (doneA !== doneB) return doneB - doneA;
        const progA = Array.isArray(a.tokens) ? a.tokens.reduce((s: number, t: number) => s + Math.max(0, t), 0) : 0;
        const progB = Array.isArray(b.tokens) ? b.tokens.reduce((s: number, t: number) => s + Math.max(0, t), 0) : 0;
        return progB - progA;
      });
      const totalPool = room.mode === '2p_winner' ? stake * 2 : stake * 4;
      const payouts = ranked.map((p, idx) => {
        if (p.forfeited) return { userId: p.userId, name: p.name, rank: idx + 1, amount: 0 };
        if (room.mode === '2p_winner') {
          return { userId: p.userId, name: p.name, rank: idx + 1, amount: idx === 0 ? +(stake * 1.9).toFixed(2) : 0 };
        }
        if (room.mode === '4p_winner' || activePlayers.length <= 1) {
          return { userId: p.userId, name: p.name, rank: idx + 1, amount: idx === 0 ? +(totalPool * 0.9).toFixed(2) : 0 };
        }
        const shares = [0.5, 0.25, 0.15, 0];
        return { userId: p.userId, name: p.name, rank: idx + 1, amount: +(totalPool * (shares[idx] || 0)).toFixed(2) };
      });
      const first = payouts[0];
      const summary = `${first?.name || 'Winner'} won ৳${first?.amount || 0} (${leaverName} exited & forfeited)`;
      const nextRoom = {
        ...room,
        players: nextPlayers,
        status: 'finished',
        payouts,
        winnerUserId: first?.userId,
        winnerSummary: summary,
        statusText: summary,
        updatedAt: nowMs
      };
      await patchFirestoreDoc('ludoRooms', String(roomId), nextRoom);
      return sendJson(res, 200, { success: true, room: nextRoom });
    }

    let nextTurn = Number(room.currentTurnIdx || 0) % nextPlayers.length;
    let guard = 0;
    while (
      (nextPlayers[nextTurn]?.forfeited ||
        (Array.isArray(nextPlayers[nextTurn]?.tokens) && nextPlayers[nextTurn].tokens.every((t: number) => t === 56))) &&
      guard < nextPlayers.length
    ) {
      nextTurn = (nextTurn + 1) % nextPlayers.length;
      guard++;
    }
    const nextRoom = {
      ...room,
      players: nextPlayers,
      currentTurnIdx: nextTurn,
      statusText: `${leaverName} exited & forfeited! ${nextPlayers[nextTurn]?.name}'s turn`,
      updatedAt: nowMs
    };
    await patchFirestoreDoc('ludoRooms', String(roomId), nextRoom);
    return sendJson(res, 200, { success: true, room: nextRoom });
  }

  return sendJson(res, 404, { success: false, message: 'Unknown Ludo action' });
}
