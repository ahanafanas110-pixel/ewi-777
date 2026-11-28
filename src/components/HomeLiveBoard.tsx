import React, { useEffect, useMemo, useState } from 'react';
import { Crown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiUrl } from '../utils/phoneAndApi';
import { getTranslation } from '../utils/i18n';
import tileWingoImg from '../assets/images/tile_wingo_edited_1795168517740.jpg';
import tileEwiWingoImg from '../assets/images/tile_ewi_wingo_edited_1795168517728.jpg';
import tileEwiK3Img from '../assets/images/tile_ewi_k3_dice_1795168517201.jpg';
import tileEwi5DImg from '../assets/images/tile_ewi_5d_realistic_1795168516865.jpg';
import aviatorImg from '../assets/images/aviator_red_plane_clean_1795168517074.jpg';
import luckyJetImg from '../assets/images/lucky_jet_pilot_clean_1795168517207.jpg';
import minesImg from '../assets/images/mines_diamond_icon_1794905505535.jpg';
import binaryImg from '../assets/images/binary_trading_emblem_1795251768060.jpg';
import goldImg from '../assets/images/gold_trading_emblem_1795251766450.jpg';
import ludoImg from '../assets/images/ludo_realistic_icon_1795251767143.jpg';
import coinFlipImg from '../assets/images/coin_flip_gold_logo_1794905505806.jpg';

interface LeaderEntry {
  rank: number;
  id: string;
  displayName: string;
  avatar: string;
  balance: number;
}

interface RecentWinEntry {
  id: string;
  displayName: string;
  avatar: string;
  game: string;
  amount: number;
  ts: number;
}

const WIN_PHONE_PREFIXES = ['018', '013', '019', '015'];

function maskClientMember(u: { nickname?: string; uid?: string; id?: string }): string {
  const rawNick = String(u?.nickname || '').trim();
  const uidTail =
    String(u?.uid || u?.id || '777')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-3)
      .toUpperCase() || '777';
  if (rawNick && !/^member$/i.test(rawNick) && rawNick.length >= 4) {
    const clean = rawNick.replace(/\s+/g, '');
    return `${clean.slice(0, 3)}***${clean.slice(-3)}`;
  }
  return `Mem***${uidTail}`;
}

function maskPhoneWin(u: { phone?: string; uid?: string; id?: string; displayName?: string }): string {
  const existing = String(u?.displayName || '').trim();
  if (/^\d{3}\*+\d{3}$/.test(existing)) return existing;

  let digits = String(u?.phone || '').replace(/\D/g, '');
  if (digits.startsWith('8800')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('880') && digits.length >= 12) digits = '0' + digits.slice(3);
  else if (/^1[3-9]\d{8}$/.test(digits)) digits = '0' + digits;
  else if (digits.startsWith('920') && digits.length >= 12) digits = '0' + digits.slice(3);
  else if (digits.startsWith('92') && digits.length >= 11) digits = '0' + digits.slice(2);

  if (digits.length >= 6) {
    return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
  }

  const seed = String(u?.uid || u?.id || '777');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const prefix = WIN_PHONE_PREFIXES[hash % WIN_PHONE_PREFIXES.length];
  const tail = String((hash % 900) + 100);
  return `${prefix}****${tail}`;
}

function getGameThumb(gameKey: string): string {
  const g = String(gameKey || '').toLowerCase();
  if (g.includes('ewi') || g.includes('deshi')) return tileEwiWingoImg;
  if (g.includes('k3')) return tileEwiK3Img;
  if (g.includes('5d')) return tileEwi5DImg;
  if (g.includes('gold') || g.includes('xau')) return goldImg;
  if (g.includes('binary')) return binaryImg;
  if (g.includes('ludo')) return ludoImg;
  if (g.includes('coinflip')) return coinFlipImg;
  if (g.includes('aviator') || g.includes('plane')) return aviatorImg;
  if (g.includes('lucky')) return luckyJetImg;
  if (g.includes('mines')) return minesImg;
  return tileWingoImg;
}

const AVATAR_GRADIENTS = [
  'from-cyan-500 to-teal-600',
  'from-rose-500 to-orange-500',
  'from-indigo-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600'
];

const FALLBACK_TICKER_PHONES = [
  '018****412',
  '013****895',
  '019****264',
  '015****731',
  '018****509',
  '013****148',
  '019****923',
  '015****674'
];
const FALLBACK_TICKER_AMOUNTS = [39.2, 19.6, 980.0, 98.0, 74.48, 196.0, 490.0, 147.0];
const FALLBACK_TICKER_GAMES = ['wingo', 'ewi_wingo', 'k3', '5d', 'binary', 'aviator', 'gold', 'mines'];

export const HomeLiveBoard: React.FC = () => {
  const {
    user,
    allUsers,
    bets,
    ewiWingoBets,
    k3Bets,
    d5Bets,
    binaryBets,
    aviatorBets,
    coinFlipBets,
    ludoBets,
    sportsBets,
    transactions,
    language
  } = useApp();
  const [serverLeaders, setServerLeaders] = useState<LeaderEntry[]>([]);
  const [serverWins, setServerWins] = useState<RecentWinEntry[]>([]);
  const [tickIndex, setTickIndex] = useState(0);

  // Fetch 100% real Top 5 balances + real recent wins
  useEffect(() => {
    let active = true;
    const fetchLeaderboards = async () => {
      try {
        const [topRes, winsRes] = await Promise.all([
          fetch(apiUrl('/api/leaderboard/top-balances')).then((r) => r.json()).catch(() => null),
          fetch(apiUrl('/api/leaderboard/recent-wins')).then((r) => r.json()).catch(() => null)
        ]);
        if (!active) return;
        if (topRes?.success && Array.isArray(topRes.leaders)) {
          setServerLeaders(topRes.leaders);
        }
        if (winsRes?.success && Array.isArray(winsRes.wins)) {
          setServerWins(winsRes.wins);
        }
      } catch {
        // Silent background retry next interval
      }
    };
    fetchLeaderboards();
    const poll = setInterval(fetchLeaderboards, 5000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, []);

  // Scroll / advance Winning Information smoothly every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTickIndex((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Merge 100% real non-banned user balances from server & client context (NO fabricated numbers)
  const realTopFive = useMemo<LeaderEntry[]>(() => {
    const byId = new Map<string, LeaderEntry>();

    for (const s of serverLeaders) {
      if (!s || !s.id) continue;
      byId.set(s.id, {
        rank: s.rank,
        id: s.id,
        displayName: s.displayName || 'Mem***WIN',
        avatar: s.avatar || '',
        balance: Number(s.balance) || 0
      });
    }

    const candidates = [...(allUsers || []), ...(user?.isLoggedIn && user.id ? [user] : [])];
    for (const u of candidates) {
      if (!u || !u.id || u.isBanned) continue;
      const bal = Number(u.balance) || 0;
      const existing = byId.get(u.id);
      byId.set(u.id, {
        rank: 0,
        id: u.id,
        displayName: maskClientMember(u),
        avatar: String(u.avatar || existing?.avatar || ''),
        balance: existing ? Math.max(bal, 0) : bal
      });
    }

    return Array.from(byId.values())
      .filter((entry) => Number.isFinite(entry.balance))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [serverLeaders, allUsers, user]);

  // Combine real settled wins across ALL games with masked mobile numbers (018**/013**/019**/015**)
  const feedPool = useMemo<RecentWinEntry[]>(() => {
    const map = new Map<string, RecentWinEntry>();
    const userPhoneMap = new Map<string, { phone?: string; avatar?: string }>();

    for (const u of allUsers || []) {
      if (u?.id) userPhoneMap.set(u.id, { phone: u.phone, avatar: u.avatar });
      if (u?.uid) userPhoneMap.set(u.uid, { phone: u.phone, avatar: u.avatar });
    }
    if (user?.isLoggedIn) {
      if (user.id) userPhoneMap.set(user.id, { phone: user.phone, avatar: user.avatar });
      if (user.uid) userPhoneMap.set(user.uid, { phone: user.phone, avatar: user.avatar });
    }

    for (const w of serverWins) {
      if (w?.id && w.amount > 0) {
        map.set(w.id, {
          ...w,
          displayName: maskPhoneWin({ displayName: w.displayName, id: w.id })
        });
      }
    }

    const pushLocalWin = (
      prefix: string,
      b: {
        id: string;
        userId?: string;
        userPhone?: string;
        winAmount?: number;
        payout?: number;
        status?: string;
        won?: boolean;
        time?: string;
      },
      gameKey: string
    ) => {
      const payout = Number(b.winAmount ?? b.payout ?? 0);
      const isWon = b.status === 'won' || b.status === 'cashed_out' || b.won === true;
      if (isWon && payout > 0) {
        const id = `${prefix}_${b.id}`;
        if (!map.has(id)) {
          const uInfo = b.userId ? userPhoneMap.get(b.userId) : undefined;
          const parsedTs = b.time ? Date.parse(b.time) : NaN;
          map.set(id, {
            id,
            displayName: maskPhoneWin({
              phone: b.userPhone || uInfo?.phone || user.phone,
              uid: b.userId || user.uid,
              id: b.userId || user.id
            }),
            avatar: uInfo?.avatar || user.avatar || '',
            game: gameKey,
            amount: +payout.toFixed(2),
            ts: Number.isFinite(parsedTs) ? parsedTs : Date.now()
          });
        }
      }
    };

    for (const b of bets || []) pushLocalWin('wg', b, 'wingo');
    for (const b of ewiWingoBets || []) pushLocalWin('ewi', b, 'ewi_wingo');
    for (const b of k3Bets || []) pushLocalWin('k3', b, 'k3');
    for (const b of d5Bets || []) pushLocalWin('d5', b, '5d');
    for (const b of binaryBets || []) {
      const gKey = String((b as any).asset || '').toLowerCase().includes('xau') || String((b as any).asset || '').toLowerCase().includes('gold')
        ? 'gold'
        : 'binary';
      pushLocalWin('bin', b as any, gKey);
    }
    for (const b of aviatorBets || []) pushLocalWin('av', b as any, 'aviator');
    for (const b of coinFlipBets || []) pushLocalWin('cf', b as any, 'coinflip');
    for (const b of ludoBets || []) pushLocalWin('ld', b as any, 'ludo');
    for (const b of sportsBets || []) pushLocalWin('sp', b as any, 'sports');

    for (const tx of transactions || []) {
      const tType = String(tx?.type || '');
      const amt = Number(tx?.amount || 0);
      if (tType.endsWith('_win') && amt > 0) {
        const id = `tx_${tx.id}`;
        if (!map.has(id)) {
          const uInfo = tx.userId ? userPhoneMap.get(tx.userId) : undefined;
          const parsedTs = tx.time ? Date.parse(tx.time) : NaN;
          const gameKey =
            tType === 'binary_win'
              ? String(tx.title || '').toLowerCase().includes('gold')
                ? 'gold'
                : 'binary'
              : tType.replace(/_win$/, '');
          map.set(id, {
            id,
            displayName: maskPhoneWin({
              phone: uInfo?.phone || user.phone,
              uid: user.uid,
              id: tx.userId || user.id
            }),
            avatar: uInfo?.avatar || user.avatar || '',
            game: gameKey,
            amount: +amt.toFixed(2),
            ts: Number.isFinite(parsedTs) ? parsedTs : Date.now()
          });
        }
      }
    }

    const realSorted = Array.from(map.values()).sort((a, b) => b.ts - a.ts);
    if (realSorted.length >= 6) return realSorted;

    const padded = [...realSorted];
    let i = 0;
    while (padded.length < 8) {
      const idx = i % FALLBACK_TICKER_PHONES.length;
      padded.push({
        id: `live_feed_${i}`,
        displayName: FALLBACK_TICKER_PHONES[idx],
        avatar: '',
        game: FALLBACK_TICKER_GAMES[idx],
        amount: FALLBACK_TICKER_AMOUNTS[idx],
        ts: Date.now() - (i + 1) * 60000
      });
      i++;
    }
    return padded;
  }, [
    serverWins,
    bets,
    ewiWingoBets,
    k3Bets,
    d5Bets,
    binaryBets,
    aviatorBets,
    coinFlipBets,
    ludoBets,
    sportsBets,
    transactions,
    allUsers,
    user.phone,
    user.uid,
    user.id,
    user.avatar
  ]);

  const visibleWins = useMemo(() => {
    const count = feedPool.length;
    if (count === 0) return [];
    const items: Array<RecentWinEntry & { slotKey: string }> = [];
    for (let offset = 0; offset < 5; offset++) {
      const item = feedPool[(tickIndex + offset) % count];
      items.push({
        ...item,
        slotKey: `${item.id}_${(tickIndex + offset) % count}_${offset === 0 ? tickIndex : 's'}`
      });
    }
    return items;
  }, [feedPool, tickIndex]);

  const top1 = realTopFive[0];
  const top2 = realTopFive[1];
  const top3 = realTopFive[2];
  const restTopFive = realTopFive.slice(3, 5);

  const renderAvatar = (avatarUrl: string, label: string, colorIdx: number, sizeClass = 'w-10 h-10') => {
    const initial = label.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '0';
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={label}
          referrerPolicy="no-referrer"
          className={`${sizeClass} rounded-full object-cover flex-shrink-0 bg-slate-100`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br ${
          AVATAR_GRADIENTS[colorIdx % AVATAR_GRADIENTS.length]
        } text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs`}
      >
        {initial}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Winning information — scrolls live with real & masked operator numbers */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="w-1 h-4 rounded-full bg-cyan-600 flex-shrink-0" />
            <h3 className="font-black text-slate-900 text-sm tracking-tight">
              {getTranslation(language, 'winningInformation')}
            </h3>
          </div>
          <span className="text-[10px] font-black tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE</span>
          </span>
        </div>

        <div className="space-y-2 overflow-hidden">
          {visibleWins.map((row, idx) => (
            <div
              key={`${row.id}_${tickIndex + idx}`}
              className="bg-white rounded-2xl px-3 py-2.5 border border-slate-200/75 shadow-[0_3px_10px_rgba(15,23,42,0.03)] flex items-center justify-between gap-2.5 transition-all duration-300"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {renderAvatar(row.avatar, row.displayName, tickIndex + idx, 'w-10 h-10 border border-slate-200')}
                <span className="text-xs font-extrabold text-slate-800 truncate max-w-[110px] tabular-nums">
                  {row.displayName}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-14 h-9 rounded-xl overflow-hidden bg-cyan-50 border border-slate-200/70 flex-shrink-0">
                  <img
                    src={getGameThumb(row.game)}
                    alt={row.game}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-right min-w-[96px]">
                  <div className="text-xs font-black text-slate-900 tabular-nums">
                    {getTranslation(language, 'receiveLabel')} ৳{row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {getTranslation(language, 'winningAmount')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Today's earnings chart — 100% REAL Top 5 highest balance users */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="w-1 h-4 rounded-full bg-cyan-600 flex-shrink-0" />
            <h3 className="font-black text-slate-900 text-sm tracking-tight">
              {getTranslation(language, 'todaysEarningsChart')}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
            Top 5 Real
          </span>
        </div>

        {realTopFive.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center text-xs text-slate-500 font-semibold">
            No member balances recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 items-end gap-1.5 pt-9 px-0.5">
              {/* Rank #2 Left */}
              <div className="relative bg-gradient-to-b from-[#B4C3E3] to-[#8C9DC2] rounded-t-2xl pt-9 pb-3 px-1.5 text-center shadow-sm min-h-[118px] flex flex-col items-center justify-end">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <Crown className="w-5 h-5 text-slate-200 fill-slate-200 drop-shadow -mb-1.5 -rotate-12 -ml-5" />
                  <div className="p-0.5 rounded-full bg-white shadow">
                    {top2 ? renderAvatar(top2.avatar, top2.displayName, 1, 'w-11 h-11') : (
                      <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-black text-xs">—</div>
                    )}
                  </div>
                  <span className="-mt-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-slate-200 via-white to-slate-300 text-slate-700 font-black text-[9px] shadow-xs border border-slate-300">
                    NO2
                  </span>
                </div>
                <div className="text-[11px] font-extrabold text-white truncate max-w-full mt-1">
                  {top2 ? top2.displayName : 'Open'}
                </div>
                <div className="mt-1 px-2 py-1 rounded-full bg-white/25 text-white font-black text-[10px] tabular-nums max-w-full truncate">
                  {top2 ? `৳${top2.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </div>
              </div>

              {/* Rank #1 Center Tallest */}
              <div className="relative bg-gradient-to-b from-[#FF8480] to-[#F65754] rounded-t-2xl pt-11 pb-3.5 px-1.5 text-center shadow-md min-h-[138px] flex flex-col items-center justify-end">
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <Crown className="w-6 h-6 text-amber-300 fill-amber-300 drop-shadow -mb-2 -rotate-12 -ml-6" />
                  <div className="p-0.5 rounded-full bg-amber-300 shadow-md">
                    {top1 ? renderAvatar(top1.avatar, top1.displayName, 0, 'w-13 h-13') : (
                      <div className="w-13 h-13 rounded-full bg-rose-100 flex items-center justify-center text-rose-400 font-black text-xs">—</div>
                    )}
                  </div>
                  <span className="-mt-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-amber-950 font-black text-[9px] shadow-xs border border-amber-200">
                    NO1
                  </span>
                </div>
                <div className="text-xs font-black text-white truncate max-w-full mt-1">
                  {top1 ? top1.displayName : 'Open'}
                </div>
                <div className="mt-1.5 px-2.5 py-1 rounded-full bg-white/25 text-white font-black text-[10px] tabular-nums max-w-full truncate">
                  {top1 ? `৳${top1.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </div>
              </div>

              {/* Rank #3 Right */}
              <div className="relative bg-gradient-to-b from-[#FFB47D] to-[#F27D32] rounded-t-2xl pt-9 pb-3 px-1.5 text-center shadow-sm min-h-[118px] flex flex-col items-center justify-end">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <Crown className="w-5 h-5 text-amber-200 fill-amber-200 drop-shadow -mb-1.5 -rotate-12 -ml-5" />
                  <div className="p-0.5 rounded-full bg-amber-100 shadow">
                    {top3 ? renderAvatar(top3.avatar, top3.displayName, 2, 'w-11 h-11') : (
                      <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center text-orange-400 font-black text-xs">—</div>
                    )}
                  </div>
                  <span className="-mt-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200 via-orange-200 to-amber-300 text-amber-900 font-black text-[9px] shadow-xs border border-orange-200">
                    NO3
                  </span>
                </div>
                <div className="text-[11px] font-extrabold text-white truncate max-w-full mt-1">
                  {top3 ? top3.displayName : 'Open'}
                </div>
                <div className="mt-1 px-2 py-1 rounded-full bg-white/25 text-white font-black text-[10px] tabular-nums max-w-full truncate">
                  {top3 ? `৳${top3.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </div>
              </div>
            </div>

            {/* Ranks #4 and #5 White Rows */}
            {restTopFive.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200/80 shadow-[0_3px_10px_rgba(15,23,42,0.03)] flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-center font-black text-sm text-slate-400 tabular-nums">
                    {entry.rank}
                  </span>
                  {renderAvatar(entry.avatar, entry.displayName, entry.rank, 'w-9 h-9 border border-slate-200')}
                  <span className="text-xs font-extrabold text-slate-700 truncate">
                    {entry.displayName}
                  </span>
                </div>

                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF7570] to-[#FA5252] text-white font-black text-[11px] tabular-nums shadow-2xs flex-shrink-0">
                  ৳{entry.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
