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

export default async function handler(req: IncomingMessage & { method?: string; url?: string; body?: any }, res: ServerResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const action = resolveActionSegment(req);
  const nowMs = Date.now();

  if (action === 'matches' && req.method === 'GET') {
    const settings = await getFirestoreDoc('appConfig', 'settings');
    const matches = Array.isArray(settings?.sportsMatches) ? settings.sportsMatches : [];
    const reqUrl = new URL(String(req.url || '/'), 'http://localhost');
    const userId = String(reqUrl.searchParams.get('userId') || '').trim();
    let bets: any[] = [];
    if (userId) {
      const docs = await listFirestoreCollection('sportsBets', 250);
      bets = docs
        .map((d) => d.data)
        .filter((b) => String(b?.userId || '') === userId)
        .sort((a, b) => Number(b?.createdAtMs || 0) - Number(a?.createdAtMs || 0));
    }
    return sendJson(res, 200, { success: true, matches, bets });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method not allowed' });
  }

  const body = await readBodyJson(req);

  if (action === 'bet') {
    const { userId, matchId, sport, matchTitle, selectedTeam, teamName, odds, amount } = body || {};
    const cleanAmount = Number(amount) || 0;
    const cleanOdds = Number(odds) || 0;
    if (!userId || !matchId || (sport !== 'cricket' && sport !== 'football')) {
      return sendJson(res, 400, { success: false, message: 'Invalid match or user parameters.' });
    }
    if (selectedTeam !== 'teamA' && selectedTeam !== 'teamB') {
      return sendJson(res, 400, { success: false, message: 'Only Team A or Team B win bets are allowed.' });
    }
    if (cleanAmount < 10 || cleanAmount > 50000 || cleanOdds < 1.05) {
      return sendJson(res, 400, { success: false, message: 'Stake must be between ৳10 and ৳50,000.' });
    }

    const settings = await getFirestoreDoc('appConfig', 'settings');
    const matches: any[] = Array.isArray(settings?.sportsMatches) ? settings.sportsMatches : [];
    const foundMatch = matches.find((m) => String(m?.id) === String(matchId));
    if (foundMatch && foundMatch.status === 'finished') {
      return sendJson(res, 409, { success: false, message: 'This match has already finished.' });
    }

    const betId = `sb_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
    const potentialWin = +(cleanAmount * cleanOdds).toFixed(2);
    const bet = {
      id: betId,
      userId: String(userId),
      matchId: String(matchId),
      sport: sport === 'football' ? 'football' : 'cricket',
      matchTitle: String(matchTitle || (foundMatch ? `${foundMatch.teamA} vs ${foundMatch.teamB}` : 'Live Match')),
      selectedTeam,
      teamName: String(teamName || (selectedTeam === 'teamA' ? foundMatch?.teamA || 'Team A' : foundMatch?.teamB || 'Team B')),
      odds: +cleanOdds.toFixed(2),
      amount: +cleanAmount.toFixed(2),
      potentialWin,
      status: 'pending',
      time: new Date(nowMs).toLocaleTimeString('en-US', { hour12: false }),
      createdAtMs: nowMs
    };
    await patchFirestoreDoc('sportsBets', betId, bet);
    return sendJson(res, 200, { success: true, bet });
  }

  if (action === 'upsert-match') {
    const { match } = body || {};
    if (!match || !match.teamA || !match.teamB || (match.sport !== 'cricket' && match.sport !== 'football')) {
      return sendJson(res, 400, { success: false, message: 'Sport, Team A, and Team B are required.' });
    }
    const settings = (await getFirestoreDoc('appConfig', 'settings')) || {};
    const existing: any[] = Array.isArray(settings.sportsMatches) ? [...settings.sportsMatches] : [];
    const cleanMatch = {
      id: String(match.id || `sp_${nowMs}_${Math.random().toString(36).slice(2, 6)}`),
      sport: match.sport === 'football' ? 'football' : 'cricket',
      league: String(match.league || (match.sport === 'football' ? 'Live Football' : 'Live Cricket')).trim(),
      teamA: String(match.teamA).trim(),
      teamB: String(match.teamB).trim(),
      teamAOdds: Math.max(1.05, Number(match.teamAOdds) || 1.85),
      teamBOdds: Math.max(1.05, Number(match.teamBOdds) || 1.95),
      scoreA: String(match.scoreA || ''),
      scoreB: String(match.scoreB || ''),
      statusText: String(match.statusText || 'Match Live'),
      status: match.status === 'finished' ? 'finished' : match.status === 'upcoming' ? 'upcoming' : 'live',
      ...(match.winner === 'teamA' || match.winner === 'teamB' ? { winner: match.winner } : {}),
      startTime: String(match.startTime || new Date(nowMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })),
      updatedAt: nowMs
    };
    const idx = existing.findIndex((m) => String(m?.id) === cleanMatch.id);
    const nextMatches = idx >= 0 ? existing.map((m, i) => (i === idx ? cleanMatch : m)) : [cleanMatch, ...existing];
    await patchFirestoreDoc('appConfig', 'settings', { ...settings, sportsMatches: nextMatches });
    return sendJson(res, 200, { success: true, match: cleanMatch, matches: nextMatches });
  }

  if (action === 'settle') {
    const { matchId, winner } = body || {};
    if (!matchId || (winner !== 'teamA' && winner !== 'teamB')) {
      return sendJson(res, 400, { success: false, message: 'matchId and winner (teamA or teamB) required.' });
    }
    const settings = (await getFirestoreDoc('appConfig', 'settings')) || {};
    const existing: any[] = Array.isArray(settings.sportsMatches) ? [...settings.sportsMatches] : [];
    let updatedMatch: any = null;
    const nextMatches = existing.map((m) => {
      if (String(m?.id) !== String(matchId)) return m;
      const winTeam = winner === 'teamA' ? m.teamA : m.teamB;
      updatedMatch = {
        ...m,
        status: 'finished',
        winner,
        statusText: `${winTeam} Won`,
        updatedAt: nowMs
      };
      return updatedMatch;
    });
    if (updatedMatch) {
      await patchFirestoreDoc('appConfig', 'settings', { ...settings, sportsMatches: nextMatches });
    }

    const docs = await listFirestoreCollection('sportsBets', 250);
    let settledCount = 0;
    for (const d of docs) {
      const b = d.data;
      if (String(b?.matchId || '') === String(matchId) && b?.status === 'pending') {
        const won = b.selectedTeam === winner;
        const winAmount = won ? +((Number(b.amount) || 0) * (Number(b.odds) || 1.9)).toFixed(2) : 0;
        await patchFirestoreDoc('sportsBets', d.id, {
          ...b,
          status: won ? 'won' : 'lost',
          winAmount
        });
        settledCount++;
      }
    }
    return sendJson(res, 200, { success: true, match: updatedMatch, settledCount });
  }

  return sendJson(res, 404, { success: false, message: 'Unknown sports action' });
}
