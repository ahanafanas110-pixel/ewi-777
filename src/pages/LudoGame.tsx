import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { LudoPlayer, LudoRoom, LudoRoomMode } from '../types';
import { apiUrl } from '../utils/phoneAndApi';
import {
  saveLudoRoomToFirebase,
  subscribeLudoRoomByIdInFirebase,
  subscribeLudoRoomsInFirebase
} from '../lib/firebase';
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
  Star,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import ludoHeroImg from '../assets/images/ludo_realistic_icon_1795251767143.jpg';

// Lightweight Web Audio API board FX synthesizer (safe fallback if blocked)
function playLudoSound(
  type: 'roll' | 'move' | 'capture' | 'home' | 'win',
  enabled: boolean
) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, dur: number, oscType: OscillatorType, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(gainVal, now + startOffset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + dur + 0.02);
    };

    if (type === 'roll') {
      [0, 0.07, 0.14, 0.22].forEach((offset, i) => {
        playTone(220 + i * 45, offset, 0.055, 'triangle', 0.06);
      });
    } else if (type === 'move') {
      playTone(460, 0, 0.08, 'sine', 0.08);
      playTone(620, 0.035, 0.07, 'triangle', 0.05);
    } else if (type === 'capture') {
      playTone(540, 0, 0.09, 'sawtooth', 0.06);
      playTone(280, 0.07, 0.16, 'triangle', 0.08);
    } else if (type === 'home') {
      playTone(523.25, 0, 0.12, 'sine', 0.08);
      playTone(659.25, 0.08, 0.14, 'sine', 0.08);
      playTone(783.99, 0.16, 0.22, 'sine', 0.09);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        playTone(freq, idx * 0.09, 0.35, 'triangle', 0.09);
      });
    }

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);
  } catch {}
}

// 3D Pip Layout helper for die faces 1-6
const DICE_PIP_SLOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const RealisticDiceCube: React.FC<{
  value: number | null;
  rolling: boolean;
  accentHex: string;
  canTap: boolean;
  onTap?: () => void;
}> = ({ value, rolling, accentHex, canTap, onTap }) => {
  const face = value && value >= 1 && value <= 6 ? value : 6;
  const activePips = DICE_PIP_SLOTS[face] || DICE_PIP_SLOTS[6];

  return (
    <button
      type="button"
      disabled={!canTap}
      onClick={onTap}
      aria-label="Ludo Dice"
      style={{
        boxShadow: canTap
          ? `0 6px 18px ${accentHex}40, inset 0 2px 3px rgba(255,255,255,0.95)`
          : '0 4px 10px rgba(15,23,42,0.12), inset 0 2px 3px rgba(255,255,255,0.9)'
      }}
      className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br from-white via-[#F8FAFC] to-[#E2E8F0] border-2 border-slate-300 border-b-[5px] border-b-slate-400/80 p-2 grid grid-cols-3 grid-rows-3 place-items-center transition-transform duration-200 ${
        rolling
          ? 'animate-spin scale-95'
          : canTap
          ? 'cursor-pointer hover:scale-105 active:translate-y-0.5 ring-2 ring-cyan-400/50'
          : 'cursor-default'
      }`}
    >
      {Array.from({ length: 9 }).map((_, idx) => {
        const hasPip = activePips.includes(idx);
        const isCenterAce = face === 1 && idx === 4;
        return (
          <span
            key={idx}
            className={`rounded-full transition-all duration-150 ${
              hasPip
                ? isCenterAce
                  ? 'w-3.5 h-3.5 bg-gradient-to-br from-rose-500 to-rose-700 shadow-inner'
                  : 'w-2.5 h-2.5 bg-gradient-to-br from-slate-800 to-slate-950 shadow-inner'
                : 'w-2 h-2 opacity-0'
            }`}
          />
        );
      })}
      {!value && !rolling && (
        <span className="sr-only">Tap to roll</span>
      )}
    </button>
  );
};

// Realistic 3D sculpted Ludo Pawn SVG
const LudoPawnSvg: React.FC<{ color: LudoPlayer['color']; isValid: boolean; uid: string }> = ({
  color,
  isValid,
  uid
}) => {
  const palette: Record<
    LudoPlayer['color'],
    { light: string; mid: string; dark: string; rim: string }
  > = {
    red: { light: '#FDA4AF', mid: '#E11D48', dark: '#9F1239', rim: '#FFF1F2' },
    green: { light: '#6EE7B7', mid: '#059669', dark: '#065F46', rim: '#ECFDF5' },
    yellow: { light: '#67E8F9', mid: '#0891B2', dark: '#155E75', rim: '#ECFEFF' },
    blue: { light: '#93C5FD', mid: '#2563EB', dark: '#1E3A8A', rim: '#EFF6FF' }
  };
  const pal = palette[color];
  const gradId = `pawn_${uid}_${color}_${isValid ? 'v' : 'n'}`;

  return (
    <svg
      viewBox="0 0 36 42"
      className="w-full h-full drop-shadow-[0_3px_3px_rgba(15,23,42,0.45)] overflow-visible"
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={pal.light} />
          <stop offset="55%" stopColor={pal.mid} />
          <stop offset="100%" stopColor={pal.dark} />
        </radialGradient>
      </defs>
      {/* Contact shadow */}
      <ellipse cx="18" cy="37.5" rx="11.5" ry="3.6" fill="rgba(15,23,42,0.34)" />
      {/* Base pedestal */}
      <path
        d="M8.5 34.5 C8.5 30 11.5 23 18 19 C24.5 23 27.5 30 27.5 34.5 C27.5 36.8 23.2 38 18 38 C12.8 38 8.5 36.8 8.5 34.5 Z"
        fill={`url(#${gradId})`}
        stroke={pal.rim}
        strokeWidth="1.6"
      />
      {/* Sculpted pawn head */}
      <circle
        cx="18"
        cy="13.5"
        r="9.2"
        fill={`url(#${gradId})`}
        stroke={pal.rim}
        strokeWidth="1.7"
      />
      {/* Inner crown jewel */}
      <circle cx="18" cy="13.5" r="4.1" fill={pal.rim} fillOpacity="0.92" />
      <circle cx="15" cy="10.2" r="2.2" fill="#FFFFFF" fillOpacity="0.72" />
    </svg>
  );
};

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
    turnSeq: number;
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
  const onlineTimer2Ref = useRef<number | null>(null);
  const onlineMatchRef = useRef(onlineMatch);
  onlineMatchRef.current = onlineMatch;
  const onlineSettledRef = useRef(false);
  const settledRoomIdsRef = useRef<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const parsedStake = Math.max(20, Math.min(50000, Math.floor(Number(stakeInput) || 20)));
  const parsedRoomStake = Math.max(20, Math.min(50000, Math.floor(Number(roomStakeDraft) || 20)));

  // Detect ?room=CODE in URL or pending sessionStorage invite on mount
  useEffect(() => {
    const codeFromUrl = parseRoomCodeFromLocation();
    let pendingCode = '';
    try {
      pendingCode = (sessionStorage.getItem('ewi777_pending_ludo_room') || '').trim().toUpperCase();
      if (pendingCode) sessionStorage.removeItem('ewi777_pending_ludo_room');
    } catch {}
    const resolvedCode = codeFromUrl || pendingCode;
    if (resolvedCode) {
      setSection('friends');
      setJoinCodeDraft(resolvedCode);
      setJoinModalOpen(true);
    }
  }, []);

  const fetchRoomsList = async () => {
    try {
      const res = await fetch(apiUrl('/api/ludo/rooms'), { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.rooms)) {
        setRoomsList(data.rooms.filter((r: LudoRoom) => r.status !== 'cancelled'));
      }
    } catch {}
  };

  useEffect(() => {
    if (section !== 'friends') return;
    fetchRoomsList();
    const unsubFb = subscribeLudoRoomsInFirebase((fbRooms) => {
      if (fbRooms.length > 0) {
        setRoomsList((prev) => {
          const map = new Map<string, LudoRoom>();
          prev.forEach((r) => map.set(r.id, r));
          fbRooms.forEach((r) => {
            const cur = map.get(r.id);
            if (!cur || (r.updatedAt || 0) >= (cur.updatedAt || 0)) {
              map.set(r.id, { ...r, password: r.password ? '***' : '' });
            }
          });
          return Array.from(map.values())
            .filter((r) => r.status !== 'cancelled')
            .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
        });
      }
    });
    const iv = window.setInterval(fetchRoomsList, 6000);
    return () => {
      unsubFb();
      clearInterval(iv);
    };
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

  // Settle friends room prize cleanly on finish or refund if cancelled while waiting
  useEffect(() => {
    if (!activeRoom) return;
    if (activeRoom.status === 'cancelled') {
      if (settledRoomIdsRef.current.has(activeRoom.id)) return;
      const joined = (activeRoom.players || []).some((p) => p.userId === user.id);
      if (joined) {
        settledRoomIdsRef.current.add(activeRoom.id);
        settleLudoMatch(
          activeRoom.stake,
          activeRoom.mode,
          `Room ${activeRoom.code} cancelled — stake refunded`,
          activeRoom.stake
        );
        showToast(`Room ${activeRoom.code} cancelled — ৳${activeRoom.stake} refunded.`);
      }
      setActiveRoom(null);
      return;
    }
    if (activeRoom.status !== 'finished') return;
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

  // Settle Online match cleanly once when finished (outside state updaters)
  useEffect(() => {
    if (!onlineMatch || !onlineMatch.finished) {
      onlineSettledRef.current = false;
      return;
    }
    if (onlineSettledRef.current) return;
    onlineSettledRef.current = true;
    const humanWon = onlineMatch.winnerIdx === 0;
    const prize =
      onlineMatch.mode === 'online_2p'
        ? +(onlineMatch.stake * 1.9).toFixed(2)
        : +(onlineMatch.stake * 4 * 0.9).toFixed(2);
    const winnerName = onlineMatch.players[onlineMatch.winnerIdx ?? 0]?.name || 'Player';
    playLudoSound('win', soundEnabled);
    settleLudoMatch(
      humanWon ? prize : 0,
      onlineMatch.mode,
      humanWon ? `${winnerName} won EWI Ludo!` : `${winnerName} finished first`,
      onlineMatch.stake
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineMatch?.finished, onlineMatch?.winnerIdx]);

  // Cleanup online timers on unmount
  useEffect(() => {
    return () => {
      if (onlineTimerRef.current) window.clearTimeout(onlineTimerRef.current);
      if (onlineTimer2Ref.current) window.clearTimeout(onlineTimer2Ref.current);
    };
  }, []);

  // =================== ONLINE MATCH ENGINE ===================
  const startOnlineMatch = () => {
    if (onlineTimerRef.current) window.clearTimeout(onlineTimerRef.current);
    if (onlineTimer2Ref.current) window.clearTimeout(onlineTimer2Ref.current);
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

    onlineSettledRef.current = false;
    setOnlineMatch({
      mode,
      stake: val,
      players,
      turnIdx: 0,
      turnSeq: 1,
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
    const cur = onlineMatchRef.current;
    if (!cur || cur.finished || !cur.awaitingMove || cur.diceValue === null) return;
    const mover = cur.players[cur.turnIdx];
    if (!canMoveToken(mover.tokens[tokenIdx], cur.diceValue)) return;

    const { nextPlayers, captured, reachedHome, wonGame } = applyTokenMoveOnBoard(
      cur.players,
      cur.turnIdx,
      tokenIdx,
      cur.diceValue
    );

    if (wonGame) {
      const prize =
        cur.mode === 'online_2p'
          ? +(cur.stake * 1.9).toFixed(2)
          : +(cur.stake * 4 * 0.9).toFixed(2);
      const humanWon = cur.turnIdx === 0;
      setOnlineMatch((prev) =>
        prev
          ? {
              ...prev,
              players: nextPlayers,
              awaitingMove: false,
              finished: true,
              winnerIdx: prev.turnIdx,
              turnSeq: prev.turnSeq + 1,
              statusText: humanWon
                ? `Congratulations! You won ৳${prize.toFixed(2)}!`
                : `${mover.name} won the match!`
            }
          : prev
      );
      return;
    }

    if (captured) playLudoSound('capture', soundEnabled);
    else if (reachedHome) playLudoSound('home', soundEnabled);
    else playLudoSound('move', soundEnabled);

    const bonusTurn = cur.diceValue === 6 || captured || reachedHome;
    const nextTurnIdx = bonusTurn ? cur.turnIdx : (cur.turnIdx + 1) % nextPlayers.length;
    const nextMover = nextPlayers[nextTurnIdx];

    setOnlineMatch((prev) =>
      prev
        ? {
            ...prev,
            players: nextPlayers,
            turnIdx: nextTurnIdx,
            turnSeq: prev.turnSeq + 1,
            awaitingMove: false,
            consecutiveSixes: bonusTurn && prev.diceValue === 6 ? prev.consecutiveSixes : 0,
            statusText: bonusTurn
              ? `${mover.name} got a bonus roll${captured ? ' (Capture!)' : reachedHome ? ' (Home!)' : ''}!`
              : `${nextMover.name}'s turn...`
          }
        : prev
    );
  };

  // Auto-drive online opponents' turns cleanly (driven strictly by turnSeq so setting rolling:true NEVER cancels timer)
  useEffect(() => {
    const cur = onlineMatchRef.current;
    if (!cur || cur.finished) return;
    const activePlayer = cur.players[cur.turnIdx];
    if (!activePlayer?.isBot || cur.awaitingMove) return;

    if (onlineTimerRef.current) window.clearTimeout(onlineTimerRef.current);
    if (onlineTimer2Ref.current) window.clearTimeout(onlineTimer2Ref.current);

    onlineTimerRef.current = window.setTimeout(() => {
      const stillCur = onlineMatchRef.current;
      if (!stillCur || stillCur.finished || !stillCur.players[stillCur.turnIdx]?.isBot) return;
      playLudoSound('roll', soundEnabledRef.current);
      setOnlineMatch((prev) =>
        prev ? { ...prev, rolling: true, statusText: `${activePlayer.name} rolling dice...` } : prev
      );

      onlineTimer2Ref.current = window.setTimeout(() => {
        const snap = onlineMatchRef.current;
        if (!snap || snap.finished) return;
        const mover = snap.players[snap.turnIdx];
        if (!mover?.isBot) return;

        const roll = rollStrategicOpponentDice(snap.players, snap.turnIdx);
        const nextSixes = roll === 6 ? snap.consecutiveSixes + 1 : 0;
        if (nextSixes >= 3) {
          const nxtIdx = (snap.turnIdx + 1) % snap.players.length;
          setOnlineMatch((prev) =>
            prev
              ? {
                  ...prev,
                  rolling: false,
                  diceValue: roll,
                  consecutiveSixes: 0,
                  turnIdx: nxtIdx,
                  turnSeq: prev.turnSeq + 1,
                  statusText: `${mover.name} rolled three 6s — turn passed!`
                }
              : prev
          );
          return;
        }

        const valid = getValidTokenIndices(mover, roll);
        if (valid.length === 0) {
          const nxtIdx = (snap.turnIdx + 1) % snap.players.length;
          setOnlineMatch((prev) =>
            prev
              ? {
                  ...prev,
                  rolling: false,
                  diceValue: roll,
                  consecutiveSixes: 0,
                  turnIdx: nxtIdx,
                  turnSeq: prev.turnSeq + 1,
                  statusText: `${mover.name} rolled ${roll} (No move)`
                }
              : prev
          );
          return;
        }

        const chosenToken = pickBestOnlineOpponentMove(snap.players, snap.turnIdx, roll);
        const { nextPlayers, captured, reachedHome, wonGame } = applyTokenMoveOnBoard(
          snap.players,
          snap.turnIdx,
          chosenToken,
          roll
        );

        if (wonGame) {
          setOnlineMatch((prev) =>
            prev
              ? {
                  ...prev,
                  players: nextPlayers,
                  rolling: false,
                  diceValue: roll,
                  finished: true,
                  winnerIdx: snap.turnIdx,
                  turnSeq: prev.turnSeq + 1,
                  statusText: `${mover.name} won the match!`
                }
              : prev
          );
          return;
        }

        if (captured) playLudoSound('capture', soundEnabledRef.current);
        else if (reachedHome) playLudoSound('home', soundEnabledRef.current);
        else playLudoSound('move', soundEnabledRef.current);

        const bonusTurn = roll === 6 || captured || reachedHome;
        const nextTurnIdx = bonusTurn ? snap.turnIdx : (snap.turnIdx + 1) % nextPlayers.length;
        setOnlineMatch((prev) =>
          prev
            ? {
                ...prev,
                players: nextPlayers,
                rolling: false,
                diceValue: roll,
                consecutiveSixes: bonusTurn && roll === 6 ? nextSixes : 0,
                turnIdx: nextTurnIdx,
                turnSeq: prev.turnSeq + 1,
                statusText: bonusTurn
                  ? `${mover.name} rolled ${roll} — Bonus turn!`
                  : `${mover.name} rolled ${roll}. ${nextPlayers[nextTurnIdx].name}'s turn`
              }
            : prev
        );
      }, 600);
    }, 550);

    return () => {
      if (onlineTimerRef.current) window.clearTimeout(onlineTimerRef.current);
      if (onlineTimer2Ref.current) window.clearTimeout(onlineTimer2Ref.current);
    };
  }, [onlineMatch?.turnSeq, onlineMatch?.finished]);

  const handleOnlineHumanRoll = () => {
    const cur = onlineMatchRef.current;
    if (!cur || cur.finished || cur.rolling || cur.awaitingMove) return;
    if (cur.turnIdx !== 0) return;

    playLudoSound('roll', soundEnabled);
    setOnlineMatch((prev) => (prev ? { ...prev, rolling: true, statusText: 'Rolling dice...' } : prev));
    window.setTimeout(() => {
      const snap = onlineMatchRef.current;
      if (!snap || snap.finished || snap.turnIdx !== 0) return;
      const roll = rollOnlineHumanDice(snap.players);
      const nextSixes = roll === 6 ? snap.consecutiveSixes + 1 : 0;
      if (nextSixes >= 3) {
        const nxt = 1 % snap.players.length;
        setOnlineMatch((prev) =>
          prev
            ? {
                ...prev,
                rolling: false,
                diceValue: roll,
                consecutiveSixes: 0,
                turnIdx: nxt,
                turnSeq: prev.turnSeq + 1,
                statusText: `Rolled three 6s! Turn passed to ${prev.players[nxt].name}`
              }
            : prev
        );
        return;
      }
      const valid = getValidTokenIndices(snap.players[0], roll);
      if (valid.length === 0) {
        const nxt = 1 % snap.players.length;
        setOnlineMatch((prev) =>
          prev
            ? {
                ...prev,
                rolling: false,
                diceValue: roll,
                consecutiveSixes: 0,
                turnIdx: nxt,
                turnSeq: prev.turnSeq + 1,
                statusText: `Rolled ${roll} — No valid move. ${prev.players[nxt].name}'s turn`
              }
            : prev
        );
        return;
      }
      if (valid.length === 1) {
        const { nextPlayers, captured, reachedHome, wonGame } = applyTokenMoveOnBoard(
          snap.players,
          0,
          valid[0],
          roll
        );
        if (wonGame) {
          const prize =
            snap.mode === 'online_2p'
              ? +(snap.stake * 1.9).toFixed(2)
              : +(snap.stake * 4 * 0.9).toFixed(2);
          setOnlineMatch((prev) =>
            prev
              ? {
                  ...prev,
                  players: nextPlayers,
                  rolling: false,
                  diceValue: roll,
                  finished: true,
                  winnerIdx: 0,
                  turnSeq: prev.turnSeq + 1,
                  statusText: `You won ৳${prize.toFixed(2)}!`
                }
              : prev
          );
          return;
        }
        if (captured) playLudoSound('capture', soundEnabled);
        else if (reachedHome) playLudoSound('home', soundEnabled);
        else playLudoSound('move', soundEnabled);

        const bonus = roll === 6 || captured || reachedHome;
        const nextTurn = bonus ? 0 : 1 % nextPlayers.length;
        setOnlineMatch((prev) =>
          prev
            ? {
                ...prev,
                players: nextPlayers,
                rolling: false,
                diceValue: roll,
                consecutiveSixes: bonus && roll === 6 ? nextSixes : 0,
                turnIdx: nextTurn,
                turnSeq: prev.turnSeq + 1,
                statusText: bonus
                  ? `Rolled ${roll}! Bonus roll yours!`
                  : `Moved token. ${nextPlayers[nextTurn].name}'s turn`
              }
            : prev
        );
        return;
      }
      setOnlineMatch((prev) =>
        prev
          ? {
              ...prev,
              rolling: false,
              diceValue: roll,
              consecutiveSixes: nextSixes,
              awaitingMove: true,
              statusText: `You rolled ${roll}! Tap a glowing token to move`
            }
          : prev
      );
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
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < stake) {
      showToast('Insufficient wallet balance to create this room!');
      return;
    }

    setIsCreatingRoom(true);
    try {
      let createdRoom: LudoRoom | null = null;
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
        if (res.ok && data?.success && data.room) {
          createdRoom = data.room;
        }
      } catch {}

      // Direct Firestore fallback if API endpoint unavailable
      if (!createdRoom) {
        const nowMs = Date.now();
        const code = `LUDO${Math.floor(100000 + Math.random() * 900000)}`;
        const roomId = `ludo_${code}_${nowMs}`;
        createdRoom = {
          id: roomId,
          code,
          password: roomPassDraft.trim(),
          hostUserId: String(user.id),
          hostName: String(user.nickname || 'Host'),
          mode: roomModeDraft,
          maxPlayers: roomModeDraft === '2p_winner' ? 2 : 4,
          stake,
          status: 'waiting',
          players: [
            {
              slotIndex: 0,
              color: 'red',
              userId: String(user.id),
              uid: String(user.uid || ''),
              name: String(user.nickname || 'Host'),
              isBot: false,
              tokens: [-1, -1, -1, -1]
            }
          ],
          currentTurnIdx: 0,
          createdAt: new Date(nowMs).toLocaleString('en-GB'),
          createdAtMs: nowMs,
          updatedAt: nowMs
        };
      }

      const betRes = placeLudoBet(stake, roomModeDraft);
      if (!betRes.success) return;

      await saveLudoRoomToFirebase(createdRoom).catch(() => {});
      setActiveRoom(createdRoom);
      setRoomStatusText(`Room ${createdRoom.code} ready! Share invite link with friends.`);
      fetchRoomsList();
      showToast(`Room ${createdRoom.code} created!`);
    } catch {
      showToast('Connection error creating room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleCancelWaitingRoom = async () => {
    if (!activeRoom || activeRoom.status !== 'waiting' || activeRoom.hostUserId !== user.id) return;
    try {
      const res = await fetch(apiUrl('/api/ludo/cancel'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: activeRoom.id, userId: user.id })
      });
      const data = await res.json().catch(() => null);
      const cancelledRoom: LudoRoom = data?.room || { ...activeRoom, status: 'cancelled', updatedAt: Date.now() };
      await saveLudoRoomToFirebase(cancelledRoom).catch(() => {});
      setActiveRoom(cancelledRoom);
      fetchRoomsList();
    } catch {
      const cancelledRoom: LudoRoom = { ...activeRoom, status: 'cancelled', updatedAt: Date.now() };
      await saveLudoRoomToFirebase(cancelledRoom).catch(() => {});
      setActiveRoom(cancelledRoom);
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
      let preKnown = roomsList.find((r) => String(r.code || '').toUpperCase() === cleanCode);
      if (!preKnown) {
        try {
          const listRes = await fetch(apiUrl('/api/ludo/rooms'), { cache: 'no-store' });
          const listData = await listRes.json().catch(() => null);
          if (listRes.ok && Array.isArray(listData?.rooms)) {
            preKnown = listData.rooms.find((r: LudoRoom) => String(r.code || '').toUpperCase() === cleanCode);
          }
        } catch {}
      }
      const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
      const alreadySeatedPre = Boolean(preKnown?.players?.some((p) => p.userId === user.id));
      if (preKnown && !alreadySeatedPre && playableBal < Number(preKnown.stake || 0)) {
        showToast(`Need ৳${preKnown.stake} balance to join Room ${preKnown.code}!`);
        return;
      }

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
      const isHost = joinedRoom.hostUserId === user.id;
      if (!isHost && !alreadySeatedPre) {
        const betRes = placeLudoBet(joinedRoom.stake, joinedRoom.mode);
        if (!betRes.success) return;
      }
      await saveLudoRoomToFirebase(joinedRoom).catch(() => {});
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
    const optimisticRoom: LudoRoom = {
      ...room,
      players: nextPlayers,
      currentTurnIdx: nextTurnIdx,
      lastRoll: roll,
      status: nextStatus || room.status,
      updatedAt: Date.now()
    };
    setActiveRoom(optimisticRoom);
    saveLudoRoomToFirebase(optimisticRoom).catch(() => {});
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
      playLudoSound('win', soundEnabled);
      await syncRoomMoveToServer(activeRoom, nextPlayers, activeRoom.currentTurnIdx, roomDice, 'finished');
      await finishAndSettleRoom(activeRoom, nextPlayers);
      return;
    }

    if (captured) playLudoSound('capture', soundEnabled);
    else if (reachedHome) playLudoSound('home', soundEnabled);
    else playLudoSound('move', soundEnabled);

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

    playLudoSound('roll', soundEnabled);
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
    const activeTurnColor = players[turnIdx]?.color;

    // Group tokens by cell position so stacked pawns separate neatly instead of overlapping
    const cellGroups = new Map<string, Array<{ pIdx: number; tIdx: number }>>();
    const tokenPositions: Array<{
      p: LudoPlayer;
      pIdx: number;
      tIdx: number;
      step: number;
      r: number;
      c: number;
      key: string;
    }> = [];

    players.forEach((p, pIdx) => {
      p.tokens.forEach((step, tIdx) => {
        const [r, c] = getTokenCoord(p.color, step, tIdx);
        const key = `${r.toFixed(1)}_${c.toFixed(1)}`;
        tokenPositions.push({ p, pIdx, tIdx, step, r, c, key });
        const arr = cellGroups.get(key) || [];
        arr.push({ pIdx, tIdx });
        cellGroups.set(key, arr);
      });
    });

    return (
      <div className="w-full max-w-[400px] mx-auto p-2.5 sm:p-3 rounded-[28px] bg-gradient-to-br from-[#5C3A21] via-[#7A4B2A] to-[#432714] border border-[#3B210F] shadow-[0_18px_38px_rgba(15,23,42,0.22),inset_0_1px_1px_rgba(255,255,255,0.28)] select-none">
        <div className="relative w-full aspect-square bg-[#FAF7F0] rounded-2xl border-2 border-[#C8B8A2] shadow-[inset_0_2px_6px_rgba(15,23,42,0.14)] overflow-hidden">
          {/* 15x15 Grid Backdrop */}
          <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] grid-rows-[repeat(15,minmax(0,1fr))] w-full h-full">
            {Array.from({ length: 225 }).map((_, idx) => {
              const r = Math.floor(idx / 15);
              const c = idx % 15;

              const inRedYard = r < 6 && c < 6;
              const inGreenYard = r < 6 && c >= 9;
              const inYellowYard = r >= 9 && c >= 9;
              const inBlueYard = r >= 9 && c < 6;
              const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

              if (inRedYard || inGreenYard || inYellowYard || inBlueYard || inCenter) {
                return <div key={idx} className="w-full h-full" />;
              }

              let cellBg = 'bg-[#FAF7F0]';
              let isStar = false;
              let entryArrow: string | null = null;

              if ((r === 7 && c >= 1 && c <= 5) || (r === 6 && c === 1)) {
                cellBg = 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-inner';
              } else if ((c === 7 && r >= 1 && r <= 5) || (r === 1 && c === 8)) {
                cellBg = 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-inner';
              } else if ((r === 7 && c >= 9 && c <= 13) || (r === 8 && c === 13)) {
                cellBg = 'bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-inner';
              } else if ((c === 7 && r >= 9 && r <= 13) || (r === 13 && c === 6)) {
                cellBg = 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-inner';
              }

              // Entry arrows into each color's home column
              if (r === 7 && c === 0) entryArrow = '→';
              else if (r === 0 && c === 7) entryArrow = '↓';
              else if (r === 7 && c === 14) entryArrow = '←';
              else if (r === 14 && c === 7) entryArrow = '↑';

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
                  className={`w-full h-full border-[0.5px] border-slate-300/80 flex items-center justify-center relative ${cellBg}`}
                >
                  {isStar && (
                    <div
                      className={`w-[72%] h-[72%] rounded-full flex items-center justify-center ${
                        cellBg.startsWith('bg-[#FAF7F0]')
                          ? 'bg-slate-200/70 text-slate-500'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                    </div>
                  )}
                  {!isStar && entryArrow && (
                    <span
                      className={`text-[10px] sm:text-xs font-black leading-none ${
                        r === 7 && c === 0
                          ? 'text-rose-600'
                          : r === 0 && c === 7
                          ? 'text-emerald-600'
                          : r === 7 && c === 14
                          ? 'text-cyan-700'
                          : 'text-blue-600'
                      }`}
                    >
                      {entryArrow}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4 Corner Yards */}
          {(
            [
              {
                color: 'red',
                cls: 'top-0 left-0 bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700',
                ring: 'ring-rose-300'
              },
              {
                color: 'green',
                cls: 'top-0 right-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700',
                ring: 'ring-emerald-300'
              },
              {
                color: 'yellow',
                cls: 'bottom-0 right-0 bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700',
                ring: 'ring-cyan-200'
              },
              {
                color: 'blue',
                cls: 'bottom-0 left-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700',
                ring: 'ring-blue-300'
              }
            ] as const
          ).map((yard) => {
            const isTurn = activeTurnColor === yard.color;
            return (
              <div
                key={yard.color}
                className={`absolute w-[40%] h-[40%] ${yard.cls} p-[5.5%] flex items-center justify-center border border-black/15 transition-all duration-300 ${
                  isTurn ? `ring-4 ring-inset ${yard.ring} brightness-105` : ''
                }`}
              >
                <div className="w-full h-full bg-[#FAF7F0] rounded-2xl shadow-[inset_0_3px_8px_rgba(15,23,42,0.18)] border border-white/80" />
              </div>
            );
          })}

          {/* Exact-Aligned Recessed Home Sockets inside each Yard */}
          {(Object.keys(YARD_SLOTS) as LudoPlayer['color'][]).map((color) =>
            YARD_SLOTS[color].map(([sr, sc], idx) => (
              <div
                key={`pad_${color}_${idx}`}
                style={{
                  top: `${((sr + 0.5) / 15) * 100}%`,
                  left: `${((sc + 0.5) / 15) * 100}%`
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-[7.8%] h-[7.8%] rounded-full border-2 ${COLOR_STYLES[color].border} ${COLOR_STYLES[color].lightBg} shadow-[inset_0_2px_4px_rgba(15,23,42,0.16)] pointer-events-none z-10`}
              />
            ))
          )}

          {/* Center 3x3 Winning Home Triangles with Crown Medallion */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[40%] left-[40%] w-[20%] h-[20%] pointer-events-none border border-slate-400/70 shadow-inner"
          >
            <polygon points="0,0 50,50 0,100" fill="#E11D48" />
            <polygon points="0,0 100,0 50,50" fill="#059669" />
            <polygon points="100,0 100,100 50,50" fill="#0891B2" />
            <polygon points="0,100 100,100 50,50" fill="#2563EB" />
            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="18" fill="#FAF7F0" stroke="#0891B2" strokeWidth="2.5" />
          </svg>
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 pointer-events-none text-[#0891B2] z-10">
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-cyan-100" />
          </div>

          {/* Live 3D Sculpted Pawns with Smart Multi-Token Stacking */}
          {tokenPositions.map(({ p, pIdx, tIdx, step, r, c, key }) => {
            const isValid = pIdx === turnIdx && validTokenIndices.has(tIdx);
            const group = cellGroups.get(key) || [];
            const stackIdx = group.findIndex((g) => g.pIdx === pIdx && g.tIdx === tIdx);
            const stackTotal = group.length;

            let offsetX = 0;
            let offsetY = 0;
            let stackScale = 1;
            if (stackTotal > 1 && step >= 0) {
              const angle = (stackIdx / stackTotal) * Math.PI * 2;
              const radius = stackTotal === 2 ? 4.2 : 5.2;
              offsetX = Math.cos(angle) * radius;
              offsetY = Math.sin(angle) * radius;
              stackScale = stackTotal >= 3 ? 0.76 : 0.85;
            }

            return (
              <button
                key={`${p.color}_${tIdx}`}
                type="button"
                disabled={!isValid}
                onClick={() => onTokenTap(pIdx, tIdx)}
                style={{
                  top: `calc(${((r + 0.5) / 15) * 100}% + ${offsetY}px)`,
                  left: `calc(${((c + 0.5) / 15) * 100}% + ${offsetX}px)`,
                  transform: `translate(-50%, -56%) scale(${isValid ? 1.24 : stackScale})`
                }}
                className={`absolute w-[6.6%] h-[7.6%] min-w-[20px] min-h-[23px] transition-all duration-200 flex items-center justify-center ${
                  isValid
                    ? 'z-30 cursor-pointer drop-shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-bounce'
                    : 'z-20 cursor-default'
                }`}
              >
                {isValid && (
                  <span className="absolute -bottom-0.5 w-[90%] h-[36%] rounded-full border-2 border-cyan-300 bg-cyan-400/25 animate-ping pointer-events-none" />
                )}
                <LudoPawnSvg color={p.color} isValid={isValid} uid={`${pIdx}_${tIdx}`} />
              </button>
            );
          })}
        </div>
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="p-1.5 rounded-full bg-white/15 border border-white/20 hover:bg-white/25 active:scale-95"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-cyan-200" />}
          </button>
          <div className="px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-mono font-black tabular-nums">
            ৳{Number(user.balance || 0).toFixed(0)}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-3 pt-4 space-y-4">
        {/* Realistic Lobby Showcase Banner when idle */}
        {!onlineMatch && !activeRoom && (
          <div className="bg-white border border-cyan-100 rounded-3xl p-3.5 shadow-xs flex items-center gap-3.5">
            <img
              src={ludoHeroImg}
              alt="EWI Ludo Royal Board"
              className="w-16 h-16 rounded-2xl object-cover border border-cyan-100 shadow-xs flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-900">EWI Royal Ludo Club</span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[9px] font-black uppercase">
                  Live Table
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                3D Wooden Board • Play fast online battles or invite friends with a private password room.
              </p>
            </div>
          </div>
        )}

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

                {/* Dice Control Bar with Realistic 3D Pip Dice */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <RealisticDiceCube
                      value={onlineMatch.diceValue}
                      rolling={onlineMatch.rolling}
                      accentHex={COLOR_STYLES[onlineMatch.players[onlineMatch.turnIdx]?.color || 'red'].hex}
                      canTap={
                        !onlineMatch.finished &&
                        !onlineMatch.rolling &&
                        !onlineMatch.awaitingMove &&
                        onlineMatch.turnIdx === 0
                      }
                      onTap={handleOnlineHumanRoll}
                    />
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {onlineMatch.turnIdx === 0 ? 'Your Turn' : `${onlineMatch.players[onlineMatch.turnIdx]?.name}'s Turn`}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {onlineMatch.awaitingMove
                          ? 'Select a glowing pawn on the board'
                          : onlineMatch.turnIdx === 0
                          ? 'Tap dice or Roll 6 to bring a pawn out'
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

                {onlineMatch.finished && (
                  <div className="bg-white border border-cyan-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 text-[#0891B2] flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          {onlineMatch.winnerIdx === 0
                            ? 'Victory! Prize Credited'
                            : `${onlineMatch.players[onlineMatch.winnerIdx ?? 1]?.name} Won This Round`}
                        </div>
                        <div className="text-[11px] text-slate-500">{onlineMatch.statusText}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOnlineMatch(null)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-black whitespace-nowrap"
                    >
                      Play Again
                    </button>
                  </div>
                )}
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
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => copyInviteLink(activeRoom.code, activeRoom.password)}
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-black inline-flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Invite Link &amp; Password</span>
                      </button>
                      {activeRoom.hostUserId === user.id && (
                        <button
                          type="button"
                          onClick={handleCancelWaitingRoom}
                          className="px-4 py-2.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black inline-flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel &amp; Refund</span>
                        </button>
                      )}
                    </div>
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
                          <RealisticDiceCube
                            value={roomDice ?? activeRoom.lastRoll ?? null}
                            rolling={roomDiceRolling}
                            accentHex={COLOR_STYLES[activeRoom.players[activeRoom.currentTurnIdx]?.color || 'red'].hex}
                            canTap={
                              !roomDiceRolling &&
                              !roomAwaitingMove &&
                              activeRoom.players[activeRoom.currentTurnIdx]?.userId === user.id
                            }
                            onTap={handleRoomDiceRoll}
                          />
                          <div>
                            <div className="text-xs font-black text-slate-900">
                              Turn: {activeRoom.players[activeRoom.currentTurnIdx]?.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {activeRoom.players[activeRoom.currentTurnIdx]?.userId === user.id
                                ? roomAwaitingMove
                                  ? 'Tap glowing pawn to move'
                                  : 'Tap dice or press Roll Dice'
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
