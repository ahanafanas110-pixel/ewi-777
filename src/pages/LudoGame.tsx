import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { LudoPlayer, LudoRoom, LudoRoomMode } from '../types';
import { apiUrl } from '../utils/phoneAndApi';
import { subscribeLudoRoomByIdInFirebase } from '../lib/firebase';
import { Ewi777Logo } from '../components/BrandLogos';
import {
  ArrowLeft,
  Copy,
  Crown,
  Dices,
  KeyRound,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trophy,
  Users,
  X
} from 'lucide-react';

const FINISHED_STEP = 56;
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// 52-cell clockwise outer loop [row, col] on a 15x15 Ludo board
const OUTER_TRACK: Array<[number, number]> = [
  // Red start arm -> up
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  // Green arm -> right
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  // Yellow arm -> down
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  // Blue arm -> left
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0]
];

const START_OFFSET: Record<LudoPlayer['color'], number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

const HOME_COLUMN: Record<LudoPlayer['color'], Array<[number, number]>> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

const YARD_SLOTS: Record<LudoPlayer['color'], Array<[number, number]>> = {
  red: [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
  green: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
  yellow: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
  blue: [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]]
};

const COLOR_STYLES: Record<
  LudoPlayer['color'],
  { label: string; hex: string; bg: string; lightBg: string; border: string; text: string }
> = {
  red: {
    label: 'Red',
    hex: '#EF4444',
    bg: 'bg-rose-500',
    lightBg: 'bg-rose-50',
    border: 'border-rose-500',
    text: 'text-rose-700'
  },
  green: {
    label: 'Green',
    hex: '#10B981',
    bg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-500',
    text: 'text-emerald-700'
  },
  yellow: {
    label: 'Yellow',
    hex: '#0891B2',
    bg: 'bg-cyan-600',
    lightBg: 'bg-cyan-50',
    border: 'border-cyan-600',
    text: 'text-cyan-700'
  },
  blue: {
    label: 'Blue',
    hex: '#3B82F6',
    bg: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-600',
    text: 'text-blue-700'
  }
};

// Realistic Bangladeshi player display names for Online Match opponents
const ONLINE_PLAYER_NAMES = [
  'Sadia Akter',
  'Tariq Hasan',
  'Nusrat Jahan',
  'Tanvir Ahmed',
  'Mehedi Hasan',
  'Farhana Yasmin',
  'Rafiq Islam',
  'Samira Chowdhury',
  'Arif Mahmud',
  'Mim Sultana',
  'Naimur Rahman',
  'Riya Karim'
];

const QUICK_STAKES = [20, 50, 100, 500, 1000, 5000];

function getGlobalTrackIndex(color: LudoPlayer['color'], step: number): number | null {
  if (step < 0 || step > 50) return null;
  return (START_OFFSET[color] + step) % 52;
}

function getTokenCoord(color: LudoPlayer['color'], step: number, tokenIdx: number): [number, number] {
  if (step < 0) return YARD_SLOTS[color][tokenIdx];
  if (step <= 50) {
    const gIdx = (START_OFFSET[color] + step) % 52;
    return OUTER_TRACK[gIdx];
  }
  if (step < FINISHED_STEP) {
    return HOME_COLUMN[color][step - 51];
  }
  // Center winning home zone slightly offset per color
  if (color === 'red') return [7, 6.2];
  if (color === 'green') return [6.2, 7];
  if (color === 'yellow') return [7, 7.8];
  return [7.8, 7];
}

function canMoveToken(step: number, roll: number): boolean {
  if (step === FINISHED_STEP) return false;
  if (step === -1) return roll === 6;
  return step + roll <= FINISHED_STEP;
}

function getValidTokenIndices(player: LudoPlayer, roll: number): number[] {
  const valid: number[] = [];
  player.tokens.forEach((step, idx) => {
    if (canMoveToken(step, roll)) valid.push(idx);
  });
  return valid;
}

function pickBestOnlineOpponentMove(
  players: LudoPlayer[],
  moverIdx: number,
  roll: number
): number {
  const mover = players[moverIdx];
  const valid = getValidTokenIndices(mover, roll);
  if (valid.length === 0) return -1;
  if (valid.length === 1) return valid[0];

  let bestIdx = valid[0];
  let bestScore = -99999;

  for (const tIdx of valid) {
    const curStep = mover.tokens[tIdx];
    const nextStep = curStep === -1 ? 0 : curStep + roll;
    let score = 0;

    if (nextStep === FINISHED_STEP) score += 900; // Exact finish
    if (curStep === -1 && roll === 6) score += 320; // Deploy out of yard
    if (curStep <= 50 && nextStep >= 51) score += 450; // Enter protected home stretch

    const nextGlobal = getGlobalTrackIndex(mover.color, nextStep);
    if (nextGlobal !== null) {
      if (SAFE_INDICES.has(nextGlobal)) score += 180;
      // Check opponent captures (especially human player slot 0)
      players.forEach((op, pIdx) => {
        if (pIdx === moverIdx) return;
        op.tokens.forEach((opStep) => {
          const opGlobal = getGlobalTrackIndex(op.color, opStep);
          if (opGlobal !== null && opGlobal === nextGlobal && !SAFE_INDICES.has(nextGlobal)) {
            score += pIdx === 0 ? 780 : 420;
          }
        });
      });
    }

    // Escape danger if currently exposed near an opponent ahead behind us
    const curGlobal = getGlobalTrackIndex(mover.color, curStep);
    if (curGlobal !== null && !SAFE_INDICES.has(curGlobal)) {
      let threatened = false;
      players.forEach((op, pIdx) => {
        if (pIdx === moverIdx) return;
        op.tokens.forEach((opStep) => {
          const opGlobal = getGlobalTrackIndex(op.color, opStep);
          if (opGlobal !== null) {
            const dist = (curGlobal - opGlobal + 52) % 52;
            if (dist >= 1 && dist <= 6) threatened = true;
          }
        });
      });
      if (threatened) score += 210;
    }

    // Prefer advancing furthest active token
    score += nextStep * 2.5;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = tIdx;
    }
  }
  return bestIdx;
}

// Strategic dice roll for online opponents so online matches reliably favor opponents over the human player
function rollStrategicOpponentDice(players: LudoPlayer[], moverIdx: number): number {
  const mover = players[moverIdx];
  const allInYard = mover.tokens.every((t) => t === -1);
  if (allInYard && Math.random() < 0.62) return 6;

  // Check if any roll 1..6 scores a capture on human (slot 0) or an exact home finish
  for (let candidate = 1; candidate <= 6; candidate++) {
    for (let tIdx = 0; tIdx < mover.tokens.length; tIdx++) {
      const cur = mover.tokens[tIdx];
      if (!canMoveToken(cur, candidate)) continue;
      const nxt = cur === -1 ? 0 : cur + candidate;
      if (nxt === FINISHED_STEP && Math.random() < 0.72) return candidate;
      const nxtGlobal = getGlobalTrackIndex(mover.color, nxt);
      if (nxtGlobal !== null && !SAFE_INDICES.has(nxtGlobal)) {
        const hitsHuman = players[0]?.tokens.some(
          (hs) => getGlobalTrackIndex(players[0].color, hs) === nxtGlobal
        );
        if (hitsHuman && Math.random() < 0.75) return candidate;
      }
    }
  }

  // Slight favorable skew toward higher rolls (4, 5, 6)
  const weighted = [1, 2, 3, 4, 4, 5, 5, 6, 6, 6];
  return weighted[Math.floor(Math.random() * weighted.length)];
}

// Slight natural constraint for human in Online mode when very close to capturing or winning against bots
function rollOnlineHumanDice(players: LudoPlayer[]): number {
  const human = players[0];
  const hasActive = human.tokens.some((t) => t >= 0 && t < FINISHED_STEP);
  if (!hasActive) {
    // Let human enter board fairly quickly so gameplay feels lively
    return Math.random() < 0.34 ? 6 : Math.floor(Math.random() * 5) + 1;
  }
  // If human has tokens almost finished, make exact finish slightly tougher
  const nearWinCount = human.tokens.filter((t) => t >= 50 && t < FINISHED_STEP).length;
  if (nearWinCount > 0) {
    const biasedLow = [1, 1, 2, 2, 3, 4, 5, 6];
    const roll = biasedLow[Math.floor(Math.random() * biasedLow.length)];
    // Avoid giving exact win if opponent isn't done yet
    const opponentWon = players.slice(1).some((p) => p.tokens.every((t) => t === FINISHED_STEP));
    if (!opponentWon) {
      const wouldWinNow = human.tokens.every((t, idx) => {
        if (t === FINISHED_STEP) return true;
        const othersDone = human.tokens.filter((x) => x === FINISHED_STEP).length >= 3;
        return othersDone && t + roll === FINISHED_STEP && idx >= 0;
      });
      if (wouldWinNow) {
        return roll === 6 ? 2 : roll + 1;
      }
    }
    return roll;
  }
  return Math.floor(Math.random() * 6) + 1;
}

function parseRoomCodeFromLocation(): string {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get('room');
    if (fromSearch) return fromSearch.trim().toUpperCase();
    const hash = window.location.hash || '';
    const qIdx = hash.indexOf('?');
    if (qIdx >= 0) {
      const hp = new URLSearchParams(hash.slice(qIdx + 1));
      const fromHash = hp.get('room');
      if (fromHash) return fromHash.trim().toUpperCase();
    }
  } catch {}
  return '';
}

function computePayoutsForRoom(
  mode: LudoRoomMode,
  stake: number,
  players: LudoPlayer[]
): Array<{ userId: string; name: string; rank: number; amount: number }> {
  const ranked = [...players].sort((a, b) => {
    const rA = a.finishedRank || 99;
    const rB = b.finishedRank || 99;
    if (rA !== rB) return rA - rB;
    const doneA = a.tokens.filter((t) => t === FINISHED_STEP).length;
    const doneB = b.tokens.filter((t) => t === FINISHED_STEP).length;
    if (doneA !== doneB) return doneB - doneA;
    const progA = a.tokens.reduce((s, t) => s + Math.max(0, t), 0);
    const progB = b.tokens.reduce((s, t) => s + Math.max(0, t), 0);
    return progB - progA;
  });

  if (mode === '2p_winner') {
    const prize = +(stake * 1.9).toFixed(2); // ৳20 -> ৳38
    return ranked.map((p, idx) => ({
      userId: p.userId,
      name: p.name,
      rank: idx + 1,
      amount: idx === 0 ? prize : 0
    }));
  }

  const totalPool = stake * 4;
  if (mode === '4p_winner') {
    const prize = +(totalPool * 0.9).toFixed(2); // ৳20x4 -> ৳72
    return ranked.map((p, idx) => ({
      userId: p.userId,
      name: p.name,
      rank: idx + 1,
      amount: idx === 0 ? prize : 0
    }));
  }

  // 4p_split: 10% fee; 90% pool split 1st (50% of total), 2nd (25%), 3rd (15%)
  const shares = [0.5, 0.25, 0.15, 0];
  return ranked.map((p, idx) => ({
    userId: p.userId,
    name: p.name,
    rank: idx + 1,
    amount: +(totalPool * (shares[idx] || 0)).toFixed(2)
  }));
}

export const LudoGame: React.FC = () => {
  const { user, adminSettings, ludoBets, placeLudoBet, settleLudoMatch, setActiveTab, showToast } =
    useApp();

  const [section, setSection] = useState<'online' | 'friends'>('online');
  const [onlineSize, setOnlineSize] = useState<2 | 4>(2);
  const [stakeInput, setStakeInput] = useState<string>('20');

  // Online active match state
  const [onlineMatch, setOnlineMatch] = useState<{
    mode: 'online_2p' | 'online_4p';
    stake: number;
    players: LudoPlayer[];
    turnIdx: number;
    diceValue: number | null;
    rolling: boolean;
    awaitingMove: boolean;
    consecutiveSixes: number;
    statusText: string;
    finished: boolean;
    winnerIdx: number | null;
  } | null>(null);

  // Friends room state
  const [roomModeDraft, setRoomModeDraft] = useState<LudoRoomMode>('2p_winner');
  const [roomStakeDraft, setRoomStakeDraft] = useState<string>('20');
  const [roomPassDraft, setRoomPassDraft] = useState<string>('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomsList, setRoomsList] = useState<LudoRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<LudoRoom | null>(null);
  const [roomDiceRolling, setRoomDiceRolling] = useState(false);
  const [roomDice, setRoomDice] = useState<number | null>(null);
  const [roomAwaitingMove, setRoomAwaitingMove] = useState(false);
  const [roomStatusText, setRoomStatusText] = useState('Waiting for players...');
  const [roomSixes, setRoomSixes] = useState(0);

  // Join room modal
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCodeDraft, setJoinCodeDraft] = useState('');
  const [joinPassDraft, setJoinPassDraft] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const onlineTimerRef = useRef<number | null>(null);
  const settledRoomIdsRef = useRef<Set<string>>(new Set());

  const parsedStake = Math.max(20, Math.min(50000, Math.floor(Number(stakeInput) || 20)));
  const parsedRoomStake = Math.max(20, Math.min(50000, Math.floor(Number(roomStakeDraft) || 20)));

  // Detect ?room=CODE in URL on mount
  useEffect(() => {
    const codeFromUrl = parseRoomCodeFromLocation();
    if (codeFromUrl) {
      setSection('friends');
      setJoinCodeDraft(codeFromUrl);
      setJoinModalOpen(true);
    }
  }, []);

  const fetchRoomsList = async () => {
    try {
      const res = await fetch(apiUrl('/api/ludo/rooms'), { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.rooms)) {
        setRoomsList(data.rooms);
      }
    } catch {}
  };

  useEffect(() => {
    if (section !== 'friends') return;
    fetchRoomsList();
    const iv = window.setInterval(fetchRoomsList, 6000);
    return () => clearInterval(iv);
  }, [section]);

  // Subscribe live Firestore updates + polling fallback for active friends room
  useEffect(() => {
    if (!activeRoom?.id) return;
    const unsub = subscribeLudoRoomByIdInFirebase(activeRoom.id, (updated) => {
      if (!updated) return;
      setActiveRoom(updated);
      if (updated.lastRoll) setRoomDice(updated.lastRoll);
    });
    const pollIv = window.setInterval(async () => {
      try {
        const res = await fetch(apiUrl('/api/ludo/rooms'), { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.rooms)) {
          const found = data.rooms.find((r: LudoRoom) => r.id === activeRoom.id);
          if (found) setActiveRoom(found);
        }
      } catch {}
    }, 2500);
    return () => {
      unsub();
      clearInterval(pollIv);
    };
  }, [activeRoom?.id]);

  // Settle friends room prize cleanly on finish
  useEffect(() => {
    if (!activeRoom || activeRoom.status !== 'finished') return;
    if (settledRoomIdsRef.current.has(activeRoom.id)) return;
    settledRoomIdsRef.current.add(activeRoom.id);

    const myEntry = (activeRoom.payouts || []).find((p) => p.userId === user.id);
    const myWin = Number(myEntry?.amount || 0);
    settleLudoMatch(
      myWin,
      activeRoom.mode,
      activeRoom.winnerSummary || `Room ${activeRoom.code} Rank #${myEntry?.rank || '-'}`,
      activeRoom.stake
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.status, activeRoom?.id]);

  // Cleanup online timers
  useEffect(() => {
    return () => {
      if (onlineTimerRef.current) window.clearTimeout(onlineTimerRef.current);
    };
  }, []);

  // =================== ONLINE MATCH ENGINE ===================
  const startOnlineMatch = () => {
    const val = Math.floor(Number(stakeInput) || 0);
    if (val < 20 || val > 50000) {
      showToast('Enter a stake between ৳20 and ৳50,000');
      return;
    }
    const mode: 'online_2p' | 'online_4p' = onlineSize === 2 ? 'online_2p' : 'online_4p';
    const res = placeLudoBet(val, mode);
    if (!res.success) return;

    const shuffled = [...ONLINE_PLAYER_NAMES].sort(() => Math.random() - 0.5);
    const colors: LudoPlayer['color'][] =
      onlineSize === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];

    const players: LudoPlayer[] = colors.map((color, idx) => ({
      slotIndex: idx,
      color,
      userId: idx === 0 ? user.id : `online_p_${idx}_${Date.now()}`,
      name: idx === 0 ? user.nickname || 'You' : shuffled[idx % shuffled.length],
      isBot: idx > 0,
      tokens: [-1, -1, -1, -1]
    }));

    setOnlineMatch({
      mode,
      stake: val,
      players,
      turnIdx: 0,
      diceValue: null,
      rolling: false,
      awaitingMove: false,
      consecutiveSixes: 0,
      statusText: `Your turn — Tap Roll Dice!`,
      finished: false,
      winnerIdx: null
    });
  };

  const applyTokenMoveOnBoard = (
    players: LudoPlayer[],
    moverIdx: number,
    tokenIdx: number,
    roll: number
  ): { nextPlayers: LudoPlayer[]; captured: boolean; reachedHome: boolean; wonGame: boolean } => {
    const nextPlayers = players.map((p) => ({ ...p, tokens: [...p.tokens] }));
    const mover = nextPlayers[moverIdx];
    const curStep = mover.tokens[tokenIdx];
    const nextStep = curStep === -1 ? 0 : curStep + roll;
    mover.tokens[tokenIdx] = nextStep;

    let captured = false;
    const nextGlobal = getGlobalTrackIndex(mover.color, nextStep);
    if (nextGlobal !== null && !SAFE_INDICES.has(nextGlobal)) {
      nextPlayers.forEach((op, oIdx) => {
        if (oIdx === moverIdx) return;
        op.tokens.forEach((opStep, otIdx) => {
          const opGlobal = getGlobalTrackIndex(op.color, opStep);
          if (opGlobal !== null && opGlobal === nextGlobal) {
            op.tokens[otIdx] = -1;
            captured = true;
          }
        });
      });
    }

    const reachedHome = nextStep === FINISHED_STEP;
    const wonGame = mover.tokens.every((t) => t === FINISHED_STEP);
    if (wonGame && !mover.finishedRank) {
      const takenRanks = nextPlayers.filter((x) => x.finishedRank).length;
      mover.finishedRank = takenRanks + 1;
    }

    return { nextPlayers, captured, reachedHome, wonGame };
  };

  const executeOnlineMove = (tokenIdx: number) => {
    setOnlineMatch((prev) => {
      if (!prev || prev.finished || !prev.awaitingMove || prev.diceValue === null) return prev;
      const mover = prev.players[prev.turnIdx];
      if (!canMoveToken(mover.tokens[tokenIdx], prev.diceValue)) return prev;

      const { nextPlayers, captured, reachedHome, wonGame } = applyTokenMoveOnBoard(
        prev.players,
        prev.turnIdx,
        tokenIdx,
        prev.diceValue
      );

      if (wonGame) {
        const prize =
          prev.mode === 'online_2p'
            ? +(prev.stake * 1.9).toFixed(2)
            : +(prev.stake * 4 * 0.9).toFixed(2);
        const humanWon = prev.turnIdx === 0;
        settleLudoMatch(
          humanWon ? prize : 0,
          prev.mode,
          humanWon
            ? `${mover.name} won EWI Ludo!`
            : `${mover.name} finished first`,
          prev.stake
        );
        return {
          ...prev,
          players: nextPlayers,
          awaitingMove: false,
          finished: true,
          winnerIdx: prev.turnIdx,
          statusText: humanWon
            ? `Congratulations! You won ৳${prize.toFixed(2)}!`
            : `${mover.name} won the match!`
        };
      }

      const bonusTurn = prev.diceValue === 6 || captured || reachedHome;
      const nextTurnIdx = bonusTurn ? prev.turnIdx : (prev.turnIdx + 1) % nextPlayers.length;
      const nextMover = nextPlayers[nextTurnIdx];

      return {
        ...prev,
        players: nextPlayers,
        turnIdx: nextTurnIdx,
        awaitingMove: false,
        consecutiveSixes: bonusTurn && prev.diceValue === 6 ? prev.consecutiveSixes : 0,
        statusText: bonusTurn
          ? `${mover.name} got a bonus roll${captured ? ' (Capture!)' : reachedHome ? ' (Home!)' : ''}!`
          : `${nextMover.name}'s turn...`
      };
    });
  };

  // Auto-drive online opponents' turns cleanly
  useEffect(() => {
    if (!onlineMatch || onlineMatch.finished) return;
    const activePlayer = onlineMatch.players[onlineMatch.turnIdx];
    if (!activePlayer?.isBot || onlineMatch.rolling || onlineMatch.awaitingMove) return;

    onlineTimerRef.current = window.setTimeout(() => {
      setOnlineMatch((prev) => (prev ? { ...prev, rolling: true } : prev));
      onlineTimerRef.current = window.setTimeout(() => {
        setOnlineMatch((prev) => {
          if (!prev || prev.finished) return prev;
          const mover = prev.players[prev.turnIdx];
          if (!mover?.isBot) return prev;

          const roll = rollStrategicOpponentDice(prev.players, prev.turnIdx);
          const nextSixes = roll === 6 ? prev.consecutiveSixes + 1 : 0;
          if (nextSixes >= 3) {
            const nxtIdx = (prev.turnIdx + 1) % prev.players.length;
            return {
              ...prev,
              rolling: false,
              diceValue: roll,
              consecutiveSixes: 0,
              turnIdx: nxtIdx,
              statusText: `${mover.name} rolled three 6s — turn passed!`
            };
          }

          const valid = getValidTokenIndices(mover, roll);
          if (valid.length === 0) {
            const nxtIdx = (prev.turnIdx + 1) % prev.players.length;
            return {
              ...prev,
              rolling: false,
              diceValue: roll,
              consecutiveSixes: 0,
              turnIdx: nxtIdx,
              statusText: `${mover.name} rolled ${roll} (No move)`
            };
          }

          const chosenToken = pickBestOnlineOpponentMove(prev.players, prev.turnIdx, roll);
          const { nextPlayers, captured, reachedHome, wonGame } = applyTokenMoveOnBoard(
            prev.players,
            prev.turnIdx,
            chosenToken,
            roll
          );

          if (wonGame) {
            settleLudoMatch(0, prev.mode, `${mover.name} finished first`, prev.stake);
            return {
              ...prev,
              players: nextPlayers,
              rolling: false,
              diceValue: roll,
              finished: true,
              winnerIdx: prev.turnIdx,
              statusText: `${mover.name} won the match!`
            };
          }

          const bonusTurn = roll === 6 || captured || reachedHome;
          const nextTurnIdx = bonusTurn ? prev.turnIdx : (prev.turnIdx + 1) % nextPlayers.length;
          return {
            ...prev,
            players: nextPlayers,
            rolling: false,
            diceValue: roll,
            consecutiveSixes: bonusTurn && roll === 6 ? nextSixes : 0,
            turnIdx: nextTurnIdx,
            statusText: bonusTurn
              ? `${mover.name} rolled ${roll} — Bonus turn!`
              : `${mover.name} rolled ${roll}. ${nextPlayers[nextTurnIdx].name}'s turn`
          };
        });
      }, 650);
    }, 650);

    return () => {
      if (onlineTimerRef.current) window.clearTimeout(onlineTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onlineMatch?.turnIdx,
    onlineMatch?.rolling,
    onlineMatch?.awaitingMove,
    onlineMatch?.finished,
    onlineMatch?.players
  ]);

  const handleOnlineHumanRoll = () => {
    if (!onlineMatch || onlineMatch.finished || onlineMatch.rolling || onlineMatch.awaitingMove) return;
    if (onlineMatch.turnIdx !== 0) return;

    setOnlineMatch((prev) => (prev ? { ...prev, rolling: true, statusText: 'Rolling dice...' } : prev));
    window.setTimeout(() => {
      setOnlineMatch((prev) => {
        if (!prev || prev.finished || prev.turnIdx !== 0) return prev;
        const roll = rollOnlineHumanDice(prev.players);
        const nextSixes = roll === 6 ? prev.consecutiveSixes + 1 : 0;
        if (nextSixes >= 3) {
          const nxt = 1 % prev.players.length;
          return {
            ...prev,
            rolling: false,
            diceValue: roll,
            consecutiveSixes: 0,
            turnIdx: nxt,
            statusText: `Rolled three 6s! Turn passed to ${prev.players[nxt].name}`
          };
        }
        const valid = getValidTokenIndices(prev.players[0], roll);
        if (valid.length === 0) {
          const nxt = 1 % prev.players.length;
          return {
            ...prev,
            rolling: false,
            diceValue: roll,
            consecutiveSixes: 0,
            turnIdx: nxt,
            statusText: `Rolled ${roll} — No valid move. ${prev.players[nxt].name}'s turn`
          };
        }
        // If only 1 possible token outcome, auto-select smoothly or let user tap
        if (valid.length === 1) {
          const { nextPlayers, captured, reachedHome, wonGame } = applyTokenMoveOnBoard(
            prev.players,
            0,
            valid[0],
            roll
          );
          if (wonGame) {
            const prize =
              prev.mode === 'online_2p'
                ? +(prev.stake * 1.9).toFixed(2)
                : +(prev.stake * 4 * 0.9).toFixed(2);
            settleLudoMatch(prize, prev.mode, `${prev.players[0].name} won EWI Ludo!`, prev.stake);
            return {
              ...prev,
              players: nextPlayers,
              rolling: false,
              diceValue: roll,
              finished: true,
              winnerIdx: 0,
              statusText: `You won ৳${prize.toFixed(2)}!`
            };
          }
          const bonus = roll === 6 || captured || reachedHome;
          const nextTurn = bonus ? 0 : 1 % nextPlayers.length;
          return {
            ...prev,
            players: nextPlayers,
            rolling: false,
            diceValue: roll,
            consecutiveSixes: bonus && roll === 6 ? nextSixes : 0,
            turnIdx: nextTurn,
            statusText: bonus
              ? `Rolled ${roll}! Bonus roll yours!`
              : `Moved token. ${nextPlayers[nextTurn].name}'s turn`
          };
        }
        return {
          ...prev,
          rolling: false,
          diceValue: roll,
          consecutiveSixes: nextSixes,
          awaitingMove: true,
          statusText: `You rolled ${roll}! Tap a glowing token to move`
        };
      });
    }, 520);
  };

  // =================== PRIVATE FRIENDS ROOM HANDLERS ===================
  const handleCreatePrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first to create a Friends Room');
      return;
    }
    const stake = Math.floor(Number(roomStakeDraft) || 0);
    if (stake < 20 || stake > 50000) {
      showToast('Room stake must be ৳20 to ৳50,000');
      return;
    }
    if (!roomPassDraft.trim() || roomPassDraft.trim().length < 3) {
      showToast('Set a room password (min 3 characters)');
      return;
    }
    const betRes = placeLudoBet(stake, roomModeDraft);
    if (!betRes.success) return;

    setIsCreatingRoom(true);
    try {
      const res = await fetch(apiUrl('/api/ludo/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          uid: user.uid,
          name: user.nickname || 'Host',
          mode: roomModeDraft,
          stake,
          password: roomPassDraft.trim()
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data.room) {
        showToast(data?.message || 'Unable to create room');
        return;
      }
      setActiveRoom(data.room);
      setRoomStatusText(`Room ${data.room.code} ready! Share invite link with friends.`);
      fetchRoomsList();
      showToast(`Room ${data.room.code} created!`);
    } catch {
      showToast('Connection error creating room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinPrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first to join a Ludo room');
      return;
    }
    const cleanCode = joinCodeDraft.trim().toUpperCase();
    const cleanPass = joinPassDraft.trim();
    if (!cleanCode || !cleanPass) {
      showToast('Enter both Room Code and Password');
      return;
    }
    setIsJoiningRoom(true);
    try {
      // Find room stake first if available in list so stake deducts cleanly
      const preKnown = roomsList.find((r) => String(r.code || '').toUpperCase() === cleanCode);
      const res = await fetch(apiUrl('/api/ludo/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          password: cleanPass,
          userId: user.id,
          uid: user.uid,
          name: user.nickname || 'Player'
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data.room) {
        showToast(data?.message || 'Could not join room');
        return;
      }
      const joinedRoom: LudoRoom = data.room;
      // Deduct stake once when newly joining (skip if host or already in room)
      const isHost = joinedRoom.hostUserId === user.id;
      if (!isHost && (!preKnown || !preKnown.players?.some((p) => p.userId === user.id))) {
        const betRes = placeLudoBet(joinedRoom.stake, joinedRoom.mode);
        if (!betRes.success) return;
      }
      setActiveRoom(joinedRoom);
      setJoinModalOpen(false);
      setRoomStatusText(
        joinedRoom.status === 'playing'
          ? `Match Live! ${joinedRoom.players[joinedRoom.currentTurnIdx]?.name}'s turn`
          : `Joined Room ${joinedRoom.code}! Waiting for all ${joinedRoom.maxPlayers} friends...`
      );
      showToast(`Entered Room ${joinedRoom.code}`);
    } catch {
      showToast('Failed to join room');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const syncRoomMoveToServer = async (
    room: LudoRoom,
    nextPlayers: LudoPlayer[],
    nextTurnIdx: number,
    roll: number,
    nextStatus?: LudoRoom['status']
  ) => {
    try {
      const res = await fetch(apiUrl('/api/ludo/move'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          players: nextPlayers,
          currentTurnIdx: nextTurnIdx,
          lastRoll: roll,
          status: nextStatus || room.status
        })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.room) setActiveRoom(data.room);
    } catch {}
  };

  const finishAndSettleRoom = async (room: LudoRoom, nextPlayers: LudoPlayer[]) => {
    const payouts = computePayoutsForRoom(room.mode, room.stake, nextPlayers);
    const first = payouts[0];
    const summary =
      room.mode === '4p_split'
        ? `1st ${payouts[0]?.name} (৳${payouts[0]?.amount}) • 2nd ${payouts[1]?.name} (৳${payouts[1]?.amount}) • 3rd ${payouts[2]?.name} (৳${payouts[2]?.amount})`
        : `${first?.name || 'Winner'} won ৳${first?.amount || 0}`;
    try {
      const res = await fetch(apiUrl('/api/ludo/settle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          payouts,
          winnerUserId: first?.userId,
          winnerSummary: summary
        })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.room) setActiveRoom(data.room);
    } catch {}
  };

  const executeRoomTokenMove = async (tokenIdx: number) => {
    if (!activeRoom || activeRoom.status !== 'playing' || roomDice === null || !roomAwaitingMove) return;
    const turnPlayer = activeRoom.players[activeRoom.currentTurnIdx];
    if (!turnPlayer || turnPlayer.userId !== user.id) return;
    if (!canMoveToken(turnPlayer.tokens[tokenIdx], roomDice)) return;

    setRoomAwaitingMove(false);
    const { nextPlayers, captured, reachedHome } = applyTokenMoveOnBoard(
      activeRoom.players,
      activeRoom.currentTurnIdx,
      tokenIdx,
      roomDice
    );

    const finishedCount = nextPlayers.filter((p) => p.tokens.every((t) => t === FINISHED_STEP)).length;
    const shouldEnd =
      activeRoom.mode === '4p_split'
        ? finishedCount >= Math.min(3, nextPlayers.length - 1)
        : finishedCount >= 1;

    if (shouldEnd) {
      await syncRoomMoveToServer(activeRoom, nextPlayers, activeRoom.currentTurnIdx, roomDice, 'finished');
      await finishAndSettleRoom(activeRoom, nextPlayers);
      return;
    }

    const bonus = roomDice === 6 || captured || reachedHome;
    let nextTurn = bonus
      ? activeRoom.currentTurnIdx
      : (activeRoom.currentTurnIdx + 1) % nextPlayers.length;
    // Skip players who already finished in 4p_split
    let guard = 0;
    while (nextPlayers[nextTurn]?.tokens.every((t) => t === FINISHED_STEP) && guard < nextPlayers.length) {
      nextTurn = (nextTurn + 1) % nextPlayers.length;
      guard++;
    }
    setRoomSixes(bonus && roomDice === 6 ? roomSixes : 0);
    setRoomStatusText(
      bonus
        ? `Bonus turn! Roll again!`
        : `Moved! Next turn: ${nextPlayers[nextTurn]?.name}`
    );
    await syncRoomMoveToServer(activeRoom, nextPlayers, nextTurn, roomDice, 'playing');
  };

  const handleRoomDiceRoll = async () => {
    if (!activeRoom || activeRoom.status !== 'playing' || roomDiceRolling || roomAwaitingMove) return;
    const turnPlayer = activeRoom.players[activeRoom.currentTurnIdx];
    if (!turnPlayer || turnPlayer.userId !== user.id) return;

    setRoomDiceRolling(true);
    window.setTimeout(async () => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setRoomDice(roll);
      setRoomDiceRolling(false);

      const nextSixes = roll === 6 ? roomSixes + 1 : 0;
      if (nextSixes >= 3) {
        setRoomSixes(0);
        const nxt = (activeRoom.currentTurnIdx + 1) % activeRoom.players.length;
        setRoomStatusText(`Rolled three 6s! Turn passed to ${activeRoom.players[nxt]?.name}`);
        await syncRoomMoveToServer(activeRoom, activeRoom.players, nxt, roll, 'playing');
        return;
      }

      const valid = getValidTokenIndices(turnPlayer, roll);
      if (valid.length === 0) {
        setRoomSixes(0);
        const nxt = (activeRoom.currentTurnIdx + 1) % activeRoom.players.length;
        setRoomStatusText(`Rolled ${roll} (No move). ${activeRoom.players[nxt]?.name}'s turn`);
        await syncRoomMoveToServer(activeRoom, activeRoom.players, nxt, roll, 'playing');
        return;
      }

      setRoomSixes(nextSixes);
      setRoomAwaitingMove(true);
      setRoomStatusText(`Rolled ${roll}! Tap your highlighted token to move.`);
    }, 480);
  };

  const copyInviteLink = (roomCode: string, roomPass?: string) => {
    const url = `${window.location.origin}/#/ludo?room=${roomCode}`;
    const payload = roomPass ? `${url}\nRoom Code: ${roomCode}\nPassword: ${roomPass}` : url;
    navigator.clipboard?.writeText(payload).catch(() => {});
    showToast('Room invite link copied!');
  };

  // =================== RENDER HELPERS ===================
  const currentOnlineValidTokens = useMemo(() => {
    if (!onlineMatch || !onlineMatch.awaitingMove || onlineMatch.turnIdx !== 0 || onlineMatch.diceValue === null) {
      return new Set<number>();
    }
    return new Set(getValidTokenIndices(onlineMatch.players[0], onlineMatch.diceValue));
  }, [onlineMatch]);

  const currentRoomValidTokens = useMemo(() => {
    if (!activeRoom || !roomAwaitingMove || roomDice === null) return new Set<number>();
    const turnPlayer = activeRoom.players[activeRoom.currentTurnIdx];
    if (!turnPlayer || turnPlayer.userId !== user.id) return new Set<number>();
    return new Set(getValidTokenIndices(turnPlayer, roomDice));
  }, [activeRoom, roomAwaitingMove, roomDice, user.id]);

  const renderBoard = (
    players: LudoPlayer[],
    turnIdx: number,
    validTokenIndices: Set<number>,
    onTokenTap: (playerIdx: number, tokenIdx: number) => void
  ) => {
    // Build a map of track cell -> tokens stacked cleanly
    const activeTurnColor = players[turnIdx]?.color;

    return (
      <div className="relative w-full max-w-[380px] aspect-square mx-auto bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden select-none">
        {/* 15x15 Grid Backdrop */}
        <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] grid-rows-[repeat(15,minmax(0,1fr))] w-full h-full">
          {Array.from({ length: 225 }).map((_, idx) => {
            const r = Math.floor(idx / 15);
            const c = idx % 15;

            // Corner Yards
            const inRedYard = r < 6 && c < 6;
            const inGreenYard = r < 6 && c >= 9;
            const inYellowYard = r >= 9 && c >= 9;
            const inBlueYard = r >= 9 && c < 6;
            const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

            if (inRedYard || inGreenYard || inYellowYard || inBlueYard || inCenter) {
              return <div key={idx} className="w-full h-full" />;
            }

            // Home Columns & Start Squares
            let cellBg = 'bg-white';
            let isStar = false;
            if ((r === 7 && c >= 1 && c <= 5) || (r === 6 && c === 1)) cellBg = 'bg-rose-500/85';
            else if ((c === 7 && r >= 1 && r <= 5) || (r === 1 && c === 8)) cellBg = 'bg-emerald-500/85';
            else if ((r === 7 && c >= 9 && c <= 13) || (r === 8 && c === 13)) cellBg = 'bg-cyan-600/85';
            else if ((c === 7 && r >= 9 && r <= 13) || (r === 13 && c === 6)) cellBg = 'bg-blue-600/85';

            // Star safe squares
            if (
              (r === 2 && c === 6) ||
              (r === 6 && c === 12) ||
              (r === 12 && c === 8) ||
              (r === 8 && c === 2) ||
              (r === 6 && c === 1) ||
              (r === 1 && c === 8) ||
              (r === 8 && c === 13) ||
              (r === 13 && c === 6)
            ) {
              isStar = true;
            }

            return (
              <div
                key={idx}
                className={`w-full h-full border-[0.5px] border-slate-200 flex items-center justify-center ${cellBg}`}
              >
                {isStar && (
                  <span
                    className={`text-[10px] leading-none font-black ${
                      cellBg === 'bg-white' ? 'text-slate-400' : 'text-white'
                    }`}
                  >
                    ★
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 4 Yard Overlays */}
        {(
          [
            { color: 'red', cls: 'top-0 left-0 bg-rose-500' },
            { color: 'green', cls: 'top-0 right-0 bg-emerald-500' },
            { color: 'yellow', cls: 'bottom-0 right-0 bg-cyan-600' },
            { color: 'blue', cls: 'bottom-0 left-0 bg-blue-600' }
          ] as const
        ).map((yard) => {
          const isTurn = activeTurnColor === yard.color;
          return (
            <div
              key={yard.color}
              className={`absolute w-[40%] h-[40%] ${yard.cls} p-3 flex items-center justify-center border border-slate-200 ${
                isTurn ? 'ring-2 ring-inset ring-white/90' : ''
              }`}
            >
              <div className="w-full h-full bg-white rounded-2xl grid grid-cols-2 grid-rows-2 p-2.5 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className={`rounded-full border-2 ${COLOR_STYLES[yard.color].border} ${COLOR_STYLES[yard.color].lightBg}`}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Center 3x3 Winning Home Triangles */}
        <svg
          viewBox="0 0 100 100"
          className="absolute top-[40%] left-[40%] w-[20%] h-[20%] pointer-events-none border border-slate-300"
        >
          <polygon points="0,0 50,50 0,100" fill="#EF4444" />
          <polygon points="0,0 100,0 50,50" fill="#10B981" />
          <polygon points="100,0 100,100 50,50" fill="#0891B2" />
          <polygon points="0,100 100,100 50,50" fill="#3B82F6" />
          <circle cx="50" cy="50" r="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
        </svg>

        {/* Live Tokens */}
        {players.map((p, pIdx) =>
          p.tokens.map((step, tIdx) => {
            const [r, c] = getTokenCoord(p.color, step, tIdx);
            const isValid = pIdx === turnIdx && validTokenIndices.has(tIdx);
            // Tiny micro-offset if multiple tokens of same/other player overlap
            const microX = ((pIdx + tIdx) % 2 === 0 ? -1 : 1) * (step >= 0 && step < FINISHED_STEP ? 1.5 : 0);
            const microY = (tIdx < 2 ? -1 : 1) * (step >= 0 && step < FINISHED_STEP ? 1.5 : 0);

            return (
              <button
                key={`${p.color}_${tIdx}`}
                type="button"
                disabled={!isValid}
                onClick={() => onTokenTap(pIdx, tIdx)}
                style={{
                  top: `calc(${((r + 0.5) / 15) * 100}% + ${microY}px)`,
                  left: `calc(${((c + 0.5) / 15) * 100}% + ${microX}px)`
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-[5.5%] h-[5.5%] min-w-[18px] min-h-[18px] rounded-full border-2 border-white shadow-md transition-all duration-200 flex items-center justify-center ${
                  COLOR_STYLES[p.color].bg
                } ${
                  isValid
                    ? 'z-30 scale-125 ring-4 ring-cyan-300 animate-pulse cursor-pointer'
                    : 'z-20 cursor-default'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
              </button>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="p-1.5 -ml-1 rounded-full bg-white/15 hover:bg-white/25 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <Ewi777Logo height={36} logoUrl={adminSettings.appLogoUrl} />
          <div className="text-[10px] font-bold text-cyan-100 mt-0.5">
            EWI LUDO • ৳20 – ৳50,000
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-mono font-black tabular-nums">
          ৳{Number(user.balance || 0).toFixed(0)}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-3 pt-4 space-y-4">
        {/* Mode Switcher: Online Match vs Friends Room */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setSection('online')}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              section === 'online'
                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Dices className="w-4 h-4" />
            <span>Online Match</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('friends')}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              section === 'friends'
                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Play With Friends</span>
          </button>
        </div>

        {/* =================== 1. ONLINE MATCH =================== */}
        {section === 'online' && (
          <div className="space-y-4">
            {!onlineMatch ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Quick Online Table</h2>
                    <p className="text-[11px] text-slate-500">
                      Instant matchmaking against live online players
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[10px] font-black">
                    Min ৳20
                  </span>
                </div>

                {/* 2P vs 4P */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOnlineSize(2)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      onlineSize === 2
                        ? 'bg-cyan-50 border-[#0891B2] ring-2 ring-cyan-500/20'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black text-slate-900">1v1 Battle (2 Players)</div>
                    <div className="text-[11px] font-bold text-[#0891B2] mt-1">
                      Win ৳{(parsedStake * 1.9).toFixed(0)} (1.9x)
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlineSize(4)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      onlineSize === 4
                        ? 'bg-cyan-50 border-[#0891B2] ring-2 ring-cyan-500/20'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black text-slate-900">4-Player Classic</div>
                    <div className="text-[11px] font-bold text-emerald-600 mt-1">
                      Win ৳{(parsedStake * 4 * 0.9).toFixed(0)} (90% Pool)
                    </div>
                  </button>
                </div>

                {/* Entry Stake Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">
                      Entry Stake (৳20 – ৳50,000)
                    </span>
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                      <span className="text-xs font-black text-[#0891B2]">৳</span>
                      <input
                        type="number"
                        min={20}
                        max={50000}
                        value={stakeInput}
                        onChange={(e) => setStakeInput(e.target.value)}
                        className="w-24 bg-transparent text-right font-mono font-black text-sm text-slate-900 focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_STAKES.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStakeInput(String(amt))}
                        className={`py-2 rounded-xl text-xs font-black border ${
                          Number(stakeInput) === amt
                            ? 'bg-[#0891B2] text-white border-[#0891B2]'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ৳{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startOnlineMatch}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-md active:scale-98"
                >
                  FIND MATCH &amp; PLAY • ৳{parsedStake}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Match Info Banner */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
                  <div>
                    <div className="text-[10px] font-black text-[#0891B2] uppercase">
                      {onlineMatch.mode === 'online_2p' ? '2P Quick Match' : '4P Classic Match'} • Stake ৳
                      {onlineMatch.stake}
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {onlineMatch.statusText}
                    </div>
                  </div>
                  {onlineMatch.finished && (
                    <button
                      type="button"
                      onClick={() => setOnlineMatch(null)}
                      className="px-3 py-1.5 rounded-xl bg-[#0891B2] text-white text-xs font-black whitespace-nowrap"
                    >
                      Play Again
                    </button>
                  )}
                </div>

                {/* Players Bar */}
                <div
                  className={`grid gap-2 ${
                    onlineMatch.players.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {onlineMatch.players.map((p, idx) => {
                    const isActive = !onlineMatch.finished && onlineMatch.turnIdx === idx;
                    const homeCount = p.tokens.filter((t) => t === FINISHED_STEP).length;
                    return (
                      <div
                        key={p.userId}
                        className={`p-2 rounded-xl border bg-white flex items-center justify-between gap-1.5 ${
                          isActive ? 'border-[#0891B2] ring-2 ring-cyan-500/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_STYLES[p.color].bg}`} />
                          <span className="text-[11px] font-black text-slate-900 truncate">
                            {p.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 flex-shrink-0">
                          {homeCount}/4
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Classic Ludo Board */}
                {renderBoard(
                  onlineMatch.players,
                  onlineMatch.turnIdx,
                  currentOnlineValidTokens,
                  (pIdx, tIdx) => {
                    if (pIdx === 0 && onlineMatch.turnIdx === 0) {
                      executeOnlineMove(tIdx);
                    }
                  }
                )}

                {/* Dice Control Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl border-2 border-cyan-200 bg-cyan-50 flex items-center justify-center font-mono text-2xl font-black text-[#0891B2] ${
                        onlineMatch.rolling ? 'animate-spin' : ''
                      }`}
                    >
                      {onlineMatch.diceValue ?? '🎲'}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {onlineMatch.turnIdx === 0 ? 'Your Turn' : `${onlineMatch.players[onlineMatch.turnIdx]?.name}'s Turn`}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {onlineMatch.awaitingMove
                          ? 'Select a pulsing token on the board'
                          : onlineMatch.turnIdx === 0
                          ? 'Roll 6 to bring a token out'
                          : 'Waiting for opponent move...'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      onlineMatch.finished ||
                      onlineMatch.rolling ||
                      onlineMatch.awaitingMove ||
                      onlineMatch.turnIdx !== 0
                    }
                    onClick={handleOnlineHumanRoll}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-500 text-white font-black text-xs shadow-sm active:scale-95"
                  >
                    {onlineMatch.rolling ? 'Rolling...' : 'ROLL DICE'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================== 2. PLAY WITH FRIENDS =================== */}
        {section === 'friends' && (
          <div className="space-y-4">
            {activeRoom ? (
              <div className="space-y-3">
                {/* Room Header Card */}
                <div className="bg-white border border-cyan-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-black text-[#0891B2] uppercase">
                        Room #{activeRoom.code} • {activeRoom.mode.replace('_', ' ').toUpperCase()} • Stake ৳
                        {activeRoom.stake}
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">{roomStatusText}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyInviteLink(activeRoom.code, activeRoom.password)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[11px] font-black flex items-center gap-1"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Invite Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveRoom(null)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold"
                      >
                        Leave
                      </button>
                    </div>
                  </div>

                  {/* Payout Summary Rule Pill */}
                  <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between">
                    <span className="font-bold">Prize Rule:</span>
                    <span className="font-black text-emerald-600">
                      {activeRoom.mode === '2p_winner'
                        ? `Winner gets ৳${(activeRoom.stake * 1.9).toFixed(0)} (1.9x)`
                        : activeRoom.mode === '4p_winner'
                        ? `1st Place gets ৳${(activeRoom.stake * 4 * 0.9).toFixed(0)} (90% Pool)`
                        : `1st ৳${(activeRoom.stake * 4 * 0.5).toFixed(0)} • 2nd ৳${(activeRoom.stake * 4 * 0.25).toFixed(0)} • 3rd ৳${(activeRoom.stake * 4 * 0.15).toFixed(0)}`}
                    </span>
                  </div>
                </div>

                {/* Players Slot List */}
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: activeRoom.maxPlayers }).map((_, idx) => {
                    const p = activeRoom.players[idx];
                    const isTurn = activeRoom.status === 'playing' && activeRoom.currentTurnIdx === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border bg-white flex items-center justify-between ${
                          isTurn ? 'border-[#0891B2] ring-2 ring-cyan-500/20' : 'border-slate-200'
                        }`}
                      >
                        {p ? (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_STYLES[p.color].bg}`} />
                              <span className="text-xs font-black text-slate-900 truncate">{p.name}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              {p.tokens.filter((t) => t === FINISHED_STEP).length}/4
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Waiting friend #{idx + 1}...
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeRoom.status === 'finished' && activeRoom.payouts && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                      <Trophy className="w-4 h-4" />
                      <span>Match Finished — Final Standings</span>
                    </div>
                    <div className="space-y-1.5">
                      {activeRoom.payouts.map((po) => (
                        <div
                          key={po.userId}
                          className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-emerald-100 text-xs"
                        >
                          <span className="font-bold text-slate-800">
                            #{po.rank} {po.name}
                          </span>
                          <span className="font-mono font-black text-emerald-600">
                            {po.amount > 0 ? `+৳${po.amount.toFixed(2)}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeRoom.status === 'waiting' ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-[#0891B2] flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        Waiting for Friends ({activeRoom.players.length} / {activeRoom.maxPlayers})
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Share this room code <strong className="text-[#0891B2]">{activeRoom.code}</strong> or invite
                        link. Match starts automatically once all {activeRoom.maxPlayers} friends join!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyInviteLink(activeRoom.code, activeRoom.password)}
                      className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-black inline-flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Invite Link &amp; Password</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {renderBoard(
                      activeRoom.players,
                      activeRoom.currentTurnIdx,
                      currentRoomValidTokens,
                      (pIdx, tIdx) => {
                        if (pIdx === activeRoom.currentTurnIdx) {
                          executeRoomTokenMove(tIdx);
                        }
                      }
                    )}

                    {activeRoom.status === 'playing' && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl border-2 border-cyan-200 bg-cyan-50 flex items-center justify-center font-mono text-2xl font-black text-[#0891B2] ${
                              roomDiceRolling ? 'animate-spin' : ''
                            }`}
                          >
                            {roomDice ?? activeRoom.lastRoll ?? '🎲'}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">
                              Turn: {activeRoom.players[activeRoom.currentTurnIdx]?.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {activeRoom.players[activeRoom.currentTurnIdx]?.userId === user.id
                                ? roomAwaitingMove
                                  ? 'Tap glowing token to move'
                                  : 'Your turn to roll dice'
                                : 'Waiting for friend to play...'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={
                            roomDiceRolling ||
                            roomAwaitingMove ||
                            activeRoom.players[activeRoom.currentTurnIdx]?.userId !== user.id
                          }
                          onClick={handleRoomDiceRoll}
                          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-500 text-white font-black text-xs"
                        >
                          {roomDiceRolling ? 'Rolling...' : 'ROLL DICE'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Create Private Password Room */}
                <form
                  onSubmit={handleCreatePrivateRoom}
                  className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#0891B2]" />
                      <span>Create Friends Password Room</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setJoinModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[11px] font-black flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Join Room</span>
                    </button>
                  </div>

                  {/* Payout Mode Choices */}
                  <div className="grid grid-cols-1 gap-2">
                    {(
                      [
                        {
                          id: '2p_winner' as const,
                          title: '2 Friends • Winner Takes All',
                          desc: `Stake ৳${parsedRoomStake} → Winner gets ৳${(parsedRoomStake * 1.9).toFixed(0)} (৳20 → ৳38)`
                        },
                        {
                          id: '4p_winner' as const,
                          title: '4 Friends • 1st Winner Takes 90%',
                          desc: `4 × ৳${parsedRoomStake} → 1st gets ৳${(parsedRoomStake * 4 * 0.9).toFixed(0)} (৳80 → ৳72)`
                        },
                        {
                          id: '4p_split' as const,
                          title: '4 Friends • 1st / 2nd / 3rd Split',
                          desc: `10% fee • 1st ৳${(parsedRoomStake * 4 * 0.5).toFixed(0)}, 2nd ৳${(parsedRoomStake * 4 * 0.25).toFixed(0)}, 3rd ৳${(parsedRoomStake * 4 * 0.15).toFixed(0)}`
                        }
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRoomModeDraft(opt.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          roomModeDraft === opt.id
                            ? 'bg-cyan-50 border-[#0891B2] ring-2 ring-cyan-500/20'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="text-xs font-black text-slate-900">{opt.title}</div>
                        <div className="text-[11px] font-bold text-[#0891B2] mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Stake (৳20 – ৳50,000)
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={50000}
                        required
                        value={roomStakeDraft}
                        onChange={(e) => setRoomStakeDraft(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-black text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Room Password
                      </label>
                      <input
                        type="text"
                        required
                        value={roomPassDraft}
                        onChange={(e) => setRoomPassDraft(e.target.value)}
                        placeholder="e.g. 7788"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingRoom}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-md disabled:opacity-60"
                  >
                    {isCreatingRoom
                      ? 'Creating Room...'
                      : `CREATE ROOM & GET SHARE LINK (৳${parsedRoomStake})`}
                  </button>
                </form>

                {/* Open Friends Rooms */}
                <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Active Friend Rooms ({roomsList.length})
                    </h3>
                    <button
                      type="button"
                      onClick={fetchRoomsList}
                      className="text-xs font-bold text-[#0891B2] flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {roomsList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No open rooms right now. Create one and invite your friends!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {roomsList.slice(0, 12).map((rm) => (
                        <div
                          key={rm.id}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <span>{rm.hostName}</span>
                              <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-[#0891B2] font-mono text-[10px]">
                                #{rm.code}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {rm.mode.replace('_', ' ')} • Stake ৳{rm.stake} • {rm.players.length}/{rm.maxPlayers}{' '}
                              Joined
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setJoinCodeDraft(rm.code);
                              setJoinPassDraft('');
                              setJoinModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#0891B2] text-white text-[11px] font-black flex items-center gap-1 flex-shrink-0"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Enter</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Recent EWI Ludo Matches */}
        {ludoBets.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
              <Crown className="w-4 h-4 text-[#0891B2]" />
              <span>My Recent Ludo History</span>
            </div>
            <div className="space-y-1.5">
              {ludoBets.slice(0, 8).map((b) => (
                <div
                  key={b.id}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-black text-slate-800 uppercase">{b.mode.replace('_', ' ')}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Stake ৳{b.stake} • {b.time}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      b.status === 'won'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {b.status === 'won' ? `+৳${b.winAmount.toFixed(2)}` : 'Lost'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Password Join Modal */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleJoinPrivateRoom}
            className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-[#0891B2]" />
                <span>Enter Ludo Friend Room</span>
              </h3>
              <button
                type="button"
                onClick={() => setJoinModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Room Code</label>
                <input
                  type="text"
                  required
                  value={joinCodeDraft}
                  onChange={(e) => setJoinCodeDraft(e.target.value.toUpperCase())}
                  placeholder="LUDO123456"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-black text-slate-900 uppercase"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Room Password</label>
                <input
                  type="password"
                  required
                  value={joinPassDraft}
                  onChange={(e) => setJoinPassDraft(e.target.value)}
                  placeholder="Enter shared password"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-[11px] text-[#0891B2] font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Entry stake is automatically matched to the room upon entering.</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoiningRoom}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs shadow-md disabled:opacity-60"
            >
              {isJoiningRoom ? 'Entering Room...' : 'VERIFY PASSWORD & ENTER ROOM'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
