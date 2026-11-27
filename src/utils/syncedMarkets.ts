import type {
  AviatorServerState,
  BinaryMarketConfig,
  BinaryMarketQuote,
  Candle,
  D5Mode,
  D5Result,
  EwiWingoMode,
  K3Mode,
  K3Result,
  MarketControlMode,
  MinesPatternMode,
  WinGoMode,
  WinGoResult
} from '../types';

/**
 * Shared deterministic UTC epoch PRNG & market generators.
 * Imported identically by React UI and Express server so every mobile device
 * worldwide displays the exact same K3, 5D, Aviator, Mines, and Binary markets.
 */
export function fnv1aSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createSeededRng(seedStr: string): () => number {
  let state = fnv1aSeed(seedStr) || 0x12345678;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function subtractPeriodString(periodStr: string, offset: number): string {
  try {
    return (BigInt(periodStr) - BigInt(offset)).toString();
  } catch {
    return `${periodStr}_${offset}`;
  }
}

export function formatTimeWithOffset(epochMs: number, offsetMinutes = 360): string {
  const shifted = new Date(epochMs + offsetMinutes * 60000);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatDateWithOffset(epochMs: number, offsetMinutes = 360): string {
  const shifted = new Date(epochMs + offsetMinutes * 60000);
  const mo = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(shifted.getUTCDate()).padStart(2, '0');
  return `${mo}/${dy}`;
}

export function getDateKeyWithOffset(epochMs = Date.now(), offsetMinutes = 360): string {
  const shifted = new Date(epochMs + offsetMinutes * 60000);
  return shifted.toISOString().slice(0, 10);
}

export function formatOffsetLabel(offsetMinutes = 360): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMin = Math.abs(Math.round(offsetMinutes));
  const hrs = Math.floor(absMin / 60);
  const mins = absMin % 60;
  return `UTC${sign}${hrs}:${String(mins).padStart(2, '0')}`;
}

export function formatUtcTimeFromSec(epochMs: number): string {
  return formatTimeWithOffset(epochMs, 0);
}

// ================= WINGO DETERMINISTIC FALLBACK =================
export function getSyncedWinGoNumber(mode: WinGoMode, periodNumber: string): number {
  const rng = createSeededRng(`wingo:${mode}:${periodNumber}`);
  return Math.floor(rng() * 10);
}

// ================= EWI WINGO OWNED SYNCHRONIZED ENGINE =================
export const EWI_WINGO_DURATIONS: Record<EwiWingoMode, number> = {
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '3m': 180
};

export function getEwiWingoNumberMeta(num: number): {
  color: WinGoResult['color'];
  size: 'big' | 'small';
} {
  const n = ((Math.round(num) % 10) + 10) % 10;
  let color: WinGoResult['color'] = n % 2 === 0 ? 'red' : 'green';
  if (n === 0) color = 'red-violet';
  if (n === 5) color = 'green-violet';
  return { color, size: n >= 5 ? 'big' : 'small' };
}

export function getEwiWingoPeriodInfo(
  mode: EwiWingoMode,
  nowMs = Date.now(),
  offsetMinutes = 360
): { period: string; timeRemaining: number; durationSeconds: number } {
  const dur = EWI_WINGO_DURATIONS[mode] || 30;
  const totalSec = Math.floor(nowMs / 1000);
  const slotIdx = Math.floor(totalSec / dur);
  const rem = Math.max(1, dur - (totalSec % dur));
  const dateKey = getDateKeyWithOffset(nowMs, offsetMinutes).replace(/-/g, '');
  const modeCode = mode === '15s' ? '15' : mode === '30s' ? '30' : mode === '1m' ? '01' : '03';
  const period = `${dateKey}EW${modeCode}${String(slotIdx).slice(-5).padStart(5, '0')}`;
  return { period, timeRemaining: rem, durationSeconds: dur };
}

export function getSyncedEwiWingoNumber(mode: EwiWingoMode, periodNumber: string): number {
  const rng = createSeededRng(`ewi_wingo:${mode}:${periodNumber}`);
  return Math.floor(rng() * 10);
}

export function resolveControlledEwiWingoNumber(
  mode: EwiWingoMode,
  periodNumber: string,
  controlMode: MarketControlMode | undefined,
  bets: Array<{ type: 'color' | 'number' | 'size'; value: string | number; totalAmount: number }>
): number {
  const fallback = getSyncedEwiWingoNumber(mode, periodNumber);
  if (!controlMode || controlMode === 'AUTO' || bets.length === 0) {
    return fallback;
  }

  const scores = Array.from({ length: 10 }, (_, candidate) => {
    const meta = getEwiWingoNumberMeta(candidate);
    let payout = 0;
    for (const b of bets) {
      const amt = Number(b.totalAmount) || 0;
      if (amt <= 0) continue;
      if (b.type === 'number' && Number(b.value) === candidate) {
        payout += amt * 9;
      } else if (b.type === 'size' && String(b.value) === meta.size) {
        payout += amt * 1.89;
      } else if (b.type === 'color') {
        const val = String(b.value);
        if (val === 'green' && (meta.color === 'green' || meta.color === 'green-violet')) {
          payout += amt * (candidate === 5 ? 1.5 : 1.89);
        } else if (val === 'red' && (meta.color === 'red' || meta.color === 'red-violet')) {
          payout += amt * (candidate === 0 ? 1.5 : 1.89);
        } else if (val === 'violet' && (candidate === 0 || candidate === 5)) {
          payout += amt * 4.5;
        }
      }
    }
    return { candidate, payout };
  });

  scores.sort((a, b) => a.payout - b.payout);
  if (controlMode === 'HIGH_BET_LOSS' || controlMode === 'LOW_BET_WIN') {
    const minPayout = scores[0].payout;
    const minCandidates = scores.filter((s) => s.payout === minPayout).map((s) => s.candidate);
    const rng = createSeededRng(`ewi_wingo_pick:${mode}:${periodNumber}`);
    return minCandidates[Math.floor(rng() * minCandidates.length)] ?? scores[0].candidate;
  }
  const maxPayout = scores[scores.length - 1].payout;
  const maxCandidates = scores.filter((s) => s.payout === maxPayout).map((s) => s.candidate);
  const rng = createSeededRng(`ewi_wingo_pick:${mode}:${periodNumber}`);
  return maxCandidates[Math.floor(rng() * maxCandidates.length)] ?? scores[scores.length - 1].candidate;
}

export function resolveForcedEwiWingoNumber(
  mode: EwiWingoMode,
  periodNumber: string,
  forcedOutcome?: 'AUTO' | 'RED' | 'GREEN' | 'VIOLET' | number,
  queuedNum?: number
): number | null {
  if (typeof queuedNum === 'number' && !Number.isNaN(queuedNum)) {
    return Math.min(9, Math.max(0, Math.round(queuedNum)));
  }
  if (typeof forcedOutcome === 'number' && !Number.isNaN(forcedOutcome)) {
    return Math.min(9, Math.max(0, Math.round(forcedOutcome)));
  }
  const hash = periodNumber.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + mode.length;
  if (forcedOutcome === 'GREEN') return [1, 3, 7, 9][hash % 4];
  if (forcedOutcome === 'RED') return [2, 4, 6, 8][hash % 4];
  if (forcedOutcome === 'VIOLET') return hash % 2 === 0 ? 0 : 5;
  return null;
}

export function getSyncedEwiWingoHistory(
  mode: EwiWingoMode,
  count = 10,
  nowMs = Date.now(),
  offsetMinutes = 360
): WinGoResult[] {
  const dur = EWI_WINGO_DURATIONS[mode] || 30;
  const rows: WinGoResult[] = [];
  for (let i = 1; i <= count; i++) {
    const pastMs = nowMs - i * dur * 1000;
    const info = getEwiWingoPeriodInfo(mode, pastMs, offsetMinutes);
    const num = getSyncedEwiWingoNumber(mode, info.period);
    const meta = getEwiWingoNumberMeta(num);
    rows.push({
      periodNumber: info.period,
      number: num,
      color: meta.color,
      size: meta.size,
      time: formatTimeWithOffset(pastMs, offsetMinutes),
      source: 'local'
    });
  }
  return rows;
}

// ================= K3 SYNCHRONIZED ENGINE =================
const K3_MODE_DURATIONS: Record<K3Mode, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '10m': 600
};

export function getSyncedK3Dice(mode: K3Mode, periodNumber: string): [number, number, number] {
  const rng = createSeededRng(`k3:${mode}:${periodNumber}`);
  return [
    Math.floor(rng() * 6) + 1,
    Math.floor(rng() * 6) + 1,
    Math.floor(rng() * 6) + 1
  ];
}

export function buildSyncedK3Row(mode: K3Mode, periodNumber: string, epochMs?: number): K3Result {
  const dice = getSyncedK3Dice(mode, periodNumber);
  const sum = dice[0] + dice[1] + dice[2];
  const uniq = new Set(dice).size;
  const pattern =
    uniq === 1 ? '3 same numbers' : uniq === 2 ? '2 same numbers' : '3 different numbers';
  return {
    periodNumber,
    dice,
    sum,
    size: sum >= 11 ? 'Big' : 'Small',
    parity: sum % 2 === 0 ? 'Even' : 'Odd',
    pattern,
    time: formatUtcTimeFromSec(epochMs ?? Date.now())
  };
}

export function getSyncedK3History(
  mode: K3Mode,
  currentPeriodStr: string,
  count = 50,
  nowMs = Date.now()
): K3Result[] {
  const durMs = (K3_MODE_DURATIONS[mode] || 60) * 1000;
  const rows: K3Result[] = [];
  for (let i = 1; i <= count; i++) {
    const issue = subtractPeriodString(currentPeriodStr, i);
    rows.push(buildSyncedK3Row(mode, issue, nowMs - i * durMs));
  }
  return rows;
}

export function parseK3ForcedOutcome(
  rawSpec: string | undefined,
  mode: K3Mode,
  periodNumber: string
): [number, number, number] | null {
  const spec = String(rawSpec || '').trim().toUpperCase();
  if (!spec || spec === 'AUTO') return null;

  const exactMatch = spec.match(/^([1-6])[,\-\s]([1-6])[,\-\s]([1-6])$/);
  if (exactMatch) {
    return [Number(exactMatch[1]), Number(exactMatch[2]), Number(exactMatch[3])];
  }

  if (spec.startsWith('TRIPLE:')) {
    const d = Math.min(6, Math.max(1, Number(spec.split(':')[1]) || 6));
    return [d, d, d];
  }
  if (spec === 'TRIPLE') {
    const rng = createSeededRng(`k3force:${mode}:${periodNumber}:triple`);
    const d = Math.floor(rng() * 6) + 1;
    return [d, d, d];
  }

  const allTriples: Array<[number, number, number]> = [];
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      for (let c = 1; c <= 6; c++) {
        allTriples.push([a, b, c]);
      }
    }
  }

  let candidates: Array<[number, number, number]> = [];
  if (spec.startsWith('SUM:')) {
    const targetSum = Math.min(18, Math.max(3, Number(spec.split(':')[1]) || 11));
    candidates = allTriples.filter((d) => d[0] + d[1] + d[2] === targetSum);
  } else if (spec === 'BIG') {
    candidates = allTriples.filter((d) => d[0] + d[1] + d[2] >= 11);
  } else if (spec === 'SMALL') {
    candidates = allTriples.filter((d) => d[0] + d[1] + d[2] <= 10);
  } else if (spec === 'ODD') {
    candidates = allTriples.filter((d) => (d[0] + d[1] + d[2]) % 2 !== 0);
  } else if (spec === 'EVEN') {
    candidates = allTriples.filter((d) => (d[0] + d[1] + d[2]) % 2 === 0);
  }

  if (candidates.length === 0) return null;
  const rng = createSeededRng(`k3force:${mode}:${periodNumber}:${spec}`);
  return candidates[Math.floor(rng() * candidates.length)] || candidates[0];
}

// ================= 5D SYNCHRONIZED ENGINE =================
const D5_MODE_DURATIONS: Record<D5Mode, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '10m': 600
};

export function getSyncedD5Digits(
  mode: D5Mode,
  periodNumber: string
): [number, number, number, number, number] {
  const rng = createSeededRng(`5d:${mode}:${periodNumber}`);
  return [
    Math.floor(rng() * 10),
    Math.floor(rng() * 10),
    Math.floor(rng() * 10),
    Math.floor(rng() * 10),
    Math.floor(rng() * 10)
  ];
}

export function buildSyncedD5Row(mode: D5Mode, periodNumber: string, epochMs?: number): D5Result {
  const digits = getSyncedD5Digits(mode, periodNumber);
  const sum = digits.reduce((a, b) => a + b, 0);
  return {
    periodNumber,
    digits,
    sum,
    size: sum >= 23 ? 'Big' : 'Small',
    parity: sum % 2 === 0 ? 'Even' : 'Odd',
    time: formatUtcTimeFromSec(epochMs ?? Date.now())
  };
}

export function getSyncedD5History(
  mode: D5Mode,
  currentPeriodStr: string,
  count = 50,
  nowMs = Date.now()
): D5Result[] {
  const durMs = (D5_MODE_DURATIONS[mode] || 60) * 1000;
  const rows: D5Result[] = [];
  for (let i = 1; i <= count; i++) {
    const issue = subtractPeriodString(currentPeriodStr, i);
    rows.push(buildSyncedD5Row(mode, issue, nowMs - i * durMs));
  }
  return rows;
}

export function parseD5ForcedOutcome(
  rawSpec: string | undefined,
  mode: D5Mode,
  periodNumber: string
): [number, number, number, number, number] | null {
  const spec = String(rawSpec || '').trim().toUpperCase();
  if (!spec || spec === 'AUTO') return null;

  const exactSep = spec.match(/^([0-9])[,\-\s]([0-9])[,\-\s]([0-9])[,\-\s]([0-9])[,\-\s]([0-9])$/);
  if (exactSep) {
    return [
      Number(exactSep[1]),
      Number(exactSep[2]),
      Number(exactSep[3]),
      Number(exactSep[4]),
      Number(exactSep[5])
    ];
  }
  const compactMatch = spec.match(/^([0-9])([0-9])([0-9])([0-9])([0-9])$/);
  if (compactMatch) {
    return [
      Number(compactMatch[1]),
      Number(compactMatch[2]),
      Number(compactMatch[3]),
      Number(compactMatch[4]),
      Number(compactMatch[5])
    ];
  }

  const rng = createSeededRng(`d5force:${mode}:${periodNumber}:${spec}`);
  for (let attempt = 0; attempt < 250; attempt++) {
    const digits: [number, number, number, number, number] = [
      Math.floor(rng() * 10),
      Math.floor(rng() * 10),
      Math.floor(rng() * 10),
      Math.floor(rng() * 10),
      Math.floor(rng() * 10)
    ];
    const sum = digits.reduce((a, b) => a + b, 0);
    if (spec === 'SUM_BIG' && sum >= 23) return digits;
    if (spec === 'SUM_SMALL' && sum <= 22) return digits;
    if (spec === 'SUM_ODD' && sum % 2 !== 0) return digits;
    if (spec === 'SUM_EVEN' && sum % 2 === 0) return digits;
  }
  if (spec === 'SUM_BIG') return [6, 7, 5, 4, 8];
  if (spec === 'SUM_SMALL') return [1, 2, 3, 4, 2];
  if (spec === 'SUM_ODD') return [1, 2, 3, 4, 5];
  if (spec === 'SUM_EVEN') return [2, 2, 4, 4, 6];
  return null;
}

// ================= AVIATOR DETERMINISTIC GLOBAL ENGINE =================
export const AVIATOR_MAX_MULTIPLIER = 10000;
const AVIATOR_WAIT_MS = 5000;
const AVIATOR_CRASH_HOLD_MS = 3000;

export function getSyncedAviatorCrashPoint(hourBucket: number, seqIdx: number): number {
  const rng = createSeededRng(`aviator:${hourBucket}:${seqIdx}`);
  const r = rng();
  if (r < 0.42) return +(1.00 + rng() * 0.10).toFixed(2);
  if (r < 0.77) return +(1.11 + rng() * 0.24).toFixed(2);
  if (r > 0.999) {
    const mega = 35 + rng() * (AVIATOR_MAX_MULTIPLIER - 35);
    return +Math.min(AVIATOR_MAX_MULTIPLIER, mega).toFixed(2);
  }
  const raw = 0.52 / (1 - Math.min(r, 0.9999));
  return +Math.min(AVIATOR_MAX_MULTIPLIER, Math.max(1.02, raw)).toFixed(2);
}

function aviatorFlyDurationMs(crashPoint: number): number {
  if (crashPoint <= 1.02) return 400;
  // Growth curve: mult(t) = exp(0.085 * tSec)
  const rawMs = Math.round((Math.log(crashPoint) / 0.085) * 1000);
  return Math.max(600, Math.min(115000, rawMs));
}

export function getSyncedAviatorState(nowMs = Date.now()): AviatorServerState {
  return getSyncedCrashEngineState('aviator', nowMs);
}

export function getSyncedLuckyJetState(nowMs = Date.now()): AviatorServerState {
  return getSyncedCrashEngineState('luckyjet', nowMs);
}

export function getSyncedCrashEngineState(
  game: 'aviator' | 'luckyjet' | 'plane',
  nowMs = Date.now()
): AviatorServerState {
  const hourMs = 3600000;
  const hourBucket = Math.floor(nowMs / hourMs);
  const hourStart = hourBucket * hourMs;
  const saltPrefix = game === 'luckyjet' ? 'luckyjet' : game === 'plane' ? 'plane' : 'aviator';

  let cursor = hourStart;
  let seq = 0;
  let currentRoundCrash = 1.25;
  let currentRoundStart = hourStart;
  let currentFlyMs = 2600;
  const completedCrashes: number[] = [];

  while (seq < 600) {
    const rng = createSeededRng(`${saltPrefix}:${hourBucket}:${seq}`);
    const r = rng();
    let crashPt: number;
    if (r < 0.42) {
      crashPt = +(1.00 + rng() * 0.10).toFixed(2);
    } else if (r < 0.77) {
      crashPt = +(1.11 + rng() * 0.24).toFixed(2);
    } else if (r > 0.999) {
      crashPt = +Math.min(AVIATOR_MAX_MULTIPLIER, 35 + rng() * (AVIATOR_MAX_MULTIPLIER - 35)).toFixed(2);
    } else {
      crashPt = +Math.min(AVIATOR_MAX_MULTIPLIER, Math.max(1.02, 0.52 / (1 - Math.min(r, 0.9999)))).toFixed(2);
    }
    const flyMs = aviatorFlyDurationMs(crashPt);
    const roundTotalMs = AVIATOR_WAIT_MS + flyMs + AVIATOR_CRASH_HOLD_MS;

    if (nowMs < cursor + roundTotalMs) {
      currentRoundCrash = crashPt;
      currentRoundStart = cursor;
      currentFlyMs = flyMs;
      break;
    }

    completedCrashes.unshift(crashPt);
    if (completedCrashes.length > 20) completedCrashes.pop();
    cursor += roundTotalMs;
    seq += 1;
  }

  let prevIdx = -1;
  while (completedCrashes.length < 16) {
    completedCrashes.push(getSyncedAviatorCrashPoint(hourBucket - 1, 500 + prevIdx));
    prevIdx -= 1;
  }

  const elapsed = Math.max(0, nowMs - currentRoundStart);
  let phase: 'waiting' | 'flying' | 'crashed' = 'waiting';
  let phaseStartedAt = currentRoundStart;
  let currentMultiplier = 1.0;

  if (elapsed < AVIATOR_WAIT_MS) {
    phase = 'waiting';
    phaseStartedAt = currentRoundStart;
  } else if (elapsed < AVIATOR_WAIT_MS + currentFlyMs) {
    phase = 'flying';
    phaseStartedAt = currentRoundStart + AVIATOR_WAIT_MS;
    const flySec = (elapsed - AVIATOR_WAIT_MS) / 1000;
    currentMultiplier = +Math.min(
      currentRoundCrash,
      Math.min(AVIATOR_MAX_MULTIPLIER, Math.exp(0.085 * flySec))
    ).toFixed(2);
  } else {
    phase = 'crashed';
    phaseStartedAt = currentRoundStart + AVIATOR_WAIT_MS + currentFlyMs;
    currentMultiplier = currentRoundCrash;
  }

  const roundSuffix = `${String(hourBucket).slice(-3)}${String(seq).padStart(3, '0')}`;
  const prefix = game === 'luckyjet' ? 'LJ' : game === 'plane' ? 'PL' : 'AV';
  return {
    roundId: `${prefix}${roundSuffix}`,
    phase,
    phaseStartedAt,
    serverNow: nowMs,
    crashPoint: phase === 'crashed' ? currentRoundCrash : 0,
    countdownRemaining:
      phase === 'waiting' ? Math.max(0, +((AVIATOR_WAIT_MS - elapsed) / 1000).toFixed(2)) : 0,
    currentMultiplier,
    crashHistory: completedCrashes.slice(0, 16),
    maxMultiplier: AVIATOR_MAX_MULTIPLIER
  };
}

/**
 * Silent 30% Max Payout / 70% Company Profit Rule across Aviator & Lucky Jet:
 * - Out of collective & rolling wagers, max allowed payouts = 30% (keeping 70% company profit).
 * - Prevents low-multiplier (1.10x–1.25x) auto-collect bypasses without surfacing internal banner text.
 */
export function evaluateCrash30Cap(params: {
  totalPool: number;
  totalPaidOut: number;
  activeBetAmount: number;
  currentMultiplier: number;
  activePlayerCount: number;
  rollingWagered?: number;
  rollingPaidOut?: number;
}): {
  shouldForceCrash: boolean;
  reason?: string;
  potentialPayout: number;
  payoutCap: number;
} {
  const totalPool = Math.max(0, Number(params.totalPool) || 0);
  const totalPaidOut = Math.max(0, Number(params.totalPaidOut) || 0);
  const activeBetAmount = Math.max(0, Number(params.activeBetAmount) || 0);
  const mult = Math.max(1, Number(params.currentMultiplier) || 1);
  const payoutCap = +(totalPool * 0.30).toFixed(2);
  const potentialPayout = +(activeBetAmount * mult).toFixed(2);
  const rollingWagered = Math.max(totalPool, Number(params.rollingWagered) || 0);
  const rollingPaidOut = Math.max(totalPaidOut, Number(params.rollingPaidOut) || 0);
  const rollingCap = +(rollingWagered * 0.30).toFixed(2);

  if (totalPool <= 0) {
    return { shouldForceCrash: false, potentialPayout, payoutCap };
  }

  // High-value bettor guard (>= 500 stake) triggers blast before cashout
  if (activeBetAmount >= 500) {
    return {
      shouldForceCrash: true,
      potentialPayout,
      payoutCap
    };
  }

  // Once 30% of round pool or rolling pool is already paid out, trigger blast immediately
  if ((totalPaidOut >= payoutCap && totalPaidOut > 0) || (rollingWagered >= 1000 && rollingPaidOut >= rollingCap)) {
    return {
      shouldForceCrash: true,
      potentialPayout,
      payoutCap
    };
  }

  // Collective pool check: payout cannot push round payouts above 30% of round wagers
  if (totalPool >= activeBetAmount * 2 || params.activePlayerCount > 1) {
    if (totalPaidOut + potentialPayout > payoutCap) {
      return {
        shouldForceCrash: true,
        potentialPayout,
        payoutCap
      };
    }
  }

  // Rolling ledger check across consecutive solo/multi rounds (every 1000 wagered allows max 300 paid out)
  if (rollingWagered > 0 && rollingPaidOut + potentialPayout > rollingCap && mult > 1.02) {
    // Allow small occasional wins only if rolling pool still has budget, otherwise blast cleanly
    return {
      shouldForceCrash: true,
      potentialPayout,
      payoutCap
    };
  }

  // Dominant solo guard: cap multiplier strictly so low auto-collect cannot drain rolling profit
  const isDominantSolo = params.activePlayerCount <= 1 || activeBetAmount >= totalPool * 0.55;
  if (isDominantSolo && (mult >= 1.10 || rollingPaidOut + potentialPayout > rollingCap)) {
    return {
      shouldForceCrash: true,
      potentialPayout,
      payoutCap
    };
  }

  return { shouldForceCrash: false, potentialPayout, payoutCap };
}

// ================= BINARY & GOLD GLOBAL STOCHASTIC REGIME ENGINE (NO SINE WAVES) =================
export const BINARY_CANDLE_MS = 8000;
const BASE_5S_MS = 5000;

type RegimeMode =
  | 'IMPULSE_UP'
  | 'IMPULSE_DOWN'
  | 'CHOP'
  | 'SQUEEZE'
  | 'BREAKOUT_UP'
  | 'BREAKOUT_DOWN'
  | 'SWEEP_TOP'
  | 'SWEEP_BOT';

interface MarketDnaProfile {
  minRegimeSteps: number;
  maxRegimeSteps: number;
  trendBias: number;
  chopBias: number;
  spikeProb: number;
  spikeScale: number;
  wickScale: number;
  pullbackRate: number;
  meanRev: number;
  volBase: number;
}

const MARKET_DNA_PROFILES: Record<string, MarketDnaProfile> = {
  'BTC/USDT': { minRegimeSteps: 28, maxRegimeSteps: 110, trendBias: 0.34, chopBias: 0.24, spikeProb: 0.055, spikeScale: 1.9, wickScale: 0.68, pullbackRate: 0.31, meanRev: 0.032, volBase: 1.15 },
  'ETH/USDT': { minRegimeSteps: 22, maxRegimeSteps: 86, trendBias: 0.38, chopBias: 0.28, spikeProb: 0.068, spikeScale: 2.15, wickScale: 0.88, pullbackRate: 0.34, meanRev: 0.038, volBase: 1.25 },
  'BNB/USDT': { minRegimeSteps: 34, maxRegimeSteps: 120, trendBias: 0.25, chopBias: 0.44, spikeProb: 0.042, spikeScale: 1.8, wickScale: 0.52, pullbackRate: 0.36, meanRev: 0.045, volBase: 0.9 },
  'SOL/USDT': { minRegimeSteps: 18, maxRegimeSteps: 78, trendBias: 0.45, chopBias: 0.18, spikeProb: 0.088, spikeScale: 2.35, wickScale: 0.96, pullbackRate: 0.28, meanRev: 0.028, volBase: 1.42 },
  'XRP/USDT': { minRegimeSteps: 36, maxRegimeSteps: 135, trendBias: 0.21, chopBias: 0.54, spikeProb: 0.075, spikeScale: 2.55, wickScale: 0.74, pullbackRate: 0.39, meanRev: 0.052, volBase: 0.95 },
  'EUR/USD':  { minRegimeSteps: 16, maxRegimeSteps: 64, trendBias: 0.20, chopBias: 0.56, spikeProb: 0.035, spikeScale: 1.65, wickScale: 0.92, pullbackRate: 0.42, meanRev: 0.065, volBase: 0.85 },
  'GBP/USD':  { minRegimeSteps: 20, maxRegimeSteps: 74, trendBias: 0.28, chopBias: 0.40, spikeProb: 0.065, spikeScale: 2.15, wickScale: 1.24, pullbackRate: 0.37, meanRev: 0.048, volBase: 1.1 },
  'USD/JPY':  { minRegimeSteps: 30, maxRegimeSteps: 118, trendBias: 0.36, chopBias: 0.30, spikeProb: 0.046, spikeScale: 1.95, wickScale: 0.58, pullbackRate: 0.30, meanRev: 0.035, volBase: 1.0 },
  'AUD/USD':  { minRegimeSteps: 18, maxRegimeSteps: 62, trendBias: 0.23, chopBias: 0.50, spikeProb: 0.032, spikeScale: 1.55, wickScale: 0.76, pullbackRate: 0.41, meanRev: 0.058, volBase: 0.88 },
  'USD/CHF':  { minRegimeSteps: 24, maxRegimeSteps: 80, trendBias: 0.21, chopBias: 0.52, spikeProb: 0.034, spikeScale: 1.6, wickScale: 0.68, pullbackRate: 0.41, meanRev: 0.062, volBase: 0.82 },
  'EUR/JPY':  { minRegimeSteps: 22, maxRegimeSteps: 84, trendBias: 0.35, chopBias: 0.32, spikeProb: 0.058, spikeScale: 2.05, wickScale: 0.88, pullbackRate: 0.33, meanRev: 0.036, volBase: 1.18 },
  'XAU/USD':  { minRegimeSteps: 20, maxRegimeSteps: 92, trendBias: 0.33, chopBias: 0.30, spikeProb: 0.082, spikeScale: 2.45, wickScale: 1.35, pullbackRate: 0.32, meanRev: 0.038, volBase: 1.22 },
  'US30':     { minRegimeSteps: 28, maxRegimeSteps: 98, trendBias: 0.31, chopBias: 0.36, spikeProb: 0.044, spikeScale: 1.85, wickScale: 0.62, pullbackRate: 0.34, meanRev: 0.042, volBase: 1.02 },
  'NAS100':   { minRegimeSteps: 22, maxRegimeSteps: 94, trendBias: 0.42, chopBias: 0.24, spikeProb: 0.072, spikeScale: 2.25, wickScale: 0.82, pullbackRate: 0.29, meanRev: 0.030, volBase: 1.35 },
  'SPX500':   { minRegimeSteps: 32, maxRegimeSteps: 112, trendBias: 0.30, chopBias: 0.38, spikeProb: 0.032, spikeScale: 1.65, wickScale: 0.52, pullbackRate: 0.35, meanRev: 0.045, volBase: 0.92 }
};

function getMarketDna(symbol: string): MarketDnaProfile {
  const explicit = MARKET_DNA_PROFILES[symbol];
  if (explicit) return explicit;
  const s = fnv1aSeed(symbol);
  return {
    minRegimeSteps: 20 + (s % 14),
    maxRegimeSteps: 72 + ((s >>> 4) % 45),
    trendBias: 0.22 + ((s >>> 8) % 20) * 0.01,
    chopBias: 0.25 + ((s >>> 12) % 25) * 0.01,
    spikeProb: 0.04 + ((s >>> 16) % 5) * 0.01,
    spikeScale: 1.7 + ((s >>> 20) % 7) * 0.12,
    wickScale: 0.6 + ((s >>> 23) % 6) * 0.1,
    pullbackRate: 0.3 + ((s >>> 26) % 12) * 0.01,
    meanRev: 0.035 + ((s >>> 19) % 25) * 0.001,
    volBase: 0.9 + ((s >>> 5) % 4) * 0.12
  };
}

interface RegimeSegment {
  startOffset: number;
  endOffset: number;
  mode: RegimeMode;
  drift: number;
  volScale: number;
}

const REGIME_EPOCH_CACHE = new Map<string, RegimeSegment[]>();

function getEpochRegimeSegments(symbol: string, epochIdx: number, epochSpan: number): RegimeSegment[] {
  const cacheKey = `${symbol}:${epochIdx}:${epochSpan}`;
  const cached = REGIME_EPOCH_CACHE.get(cacheKey);
  if (cached) return cached;

  const dna = getMarketDna(symbol);
  const rng = createSeededRng(`regime:${symbol}:${epochIdx}`);
  const segs: RegimeSegment[] = [];
  let cursor = 0;
  let lastDir = rng() < 0.5 ? 1 : -1;

  while (cursor < epochSpan) {
    const span =
      dna.minRegimeSteps + Math.floor(rng() * Math.max(4, dna.maxRegimeSteps - dna.minRegimeSteps + 1));
    const endOffset = Math.min(epochSpan, cursor + span);
    const r = rng();

    let mode: RegimeMode = 'CHOP';
    let drift = 0;
    let volScale = dna.volBase;

    if (r < dna.chopBias * 0.58) {
      mode = 'CHOP';
      drift = (rng() - 0.5) * 0.08;
      volScale = dna.volBase * (0.72 + rng() * 0.35);
    } else if (r < dna.chopBias) {
      mode = 'SQUEEZE';
      drift = (rng() - 0.5) * 0.04;
      volScale = dna.volBase * (0.38 + rng() * 0.24);
    } else if (r < dna.chopBias + 0.14) {
      // Breakout / liquidity sweep opposite or continuation of prior swing
      const dir = rng() < 0.55 ? -lastDir : lastDir;
      lastDir = dir;
      if (rng() < 0.55) {
        mode = dir > 0 ? 'BREAKOUT_UP' : 'BREAKOUT_DOWN';
        drift = dir * dna.trendBias * (1.35 + rng() * 0.65);
        volScale = dna.volBase * (1.45 + rng() * 0.55);
      } else {
        mode = dir > 0 ? 'SWEEP_TOP' : 'SWEEP_BOT';
        drift = dir * dna.trendBias * 0.45;
        volScale = dna.volBase * (1.25 + rng() * 0.45);
      }
    } else {
      const dir = rng() < 0.66 ? -lastDir : lastDir;
      lastDir = dir;
      mode = dir > 0 ? 'IMPULSE_UP' : 'IMPULSE_DOWN';
      drift = dir * dna.trendBias * (0.75 + rng() * 0.7);
      volScale = dna.volBase * (0.85 + rng() * 0.5);
    }

    segs.push({ startOffset: cursor, endOffset, mode, drift, volScale });
    cursor = endOffset;
  }

  if (REGIME_EPOCH_CACHE.size > 400) {
    REGIME_EPOCH_CACHE.clear();
  }
  REGIME_EPOCH_CACHE.set(cacheKey, segs);
  return segs;
}

function getRegimeAtStep(symbol: string, stepIdx: number): RegimeSegment {
  const symSeed = fnv1aSeed(symbol);
  const epochSpan = 580 + (symSeed % 347);
  const epochIdx = Math.floor(stepIdx / epochSpan);
  const offset = ((stepIdx % epochSpan) + epochSpan) % epochSpan;
  const segs = getEpochRegimeSegments(symbol, epochIdx, epochSpan);
  for (let i = 0; i < segs.length; i++) {
    if (offset < segs[i].endOffset) return segs[i];
  }
  return segs[segs.length - 1];
}

function getDeterministic5sDelta(
  symbol: string,
  volatility: number,
  bucket5sIdx: number,
  bias: 'AUTO' | 'BULL' | 'BEAR' = 'AUTO'
): { delta: number; highJitter: number; lowJitter: number; vol: number } {
  const dna = getMarketDna(symbol);
  const reg = getRegimeAtStep(symbol, bucket5sIdx);
  const rng = createSeededRng(`bin5s_v2:${symbol}:${bucket5sIdx}`);

  // Local multi-tick micro-impulse (2-5 bar mini-swings, non-periodic hash)
  const microBlock = Math.floor(bucket5sIdx / 3);
  const microRng = createSeededRng(`bin5s_micro:${symbol}:${microBlock}`);
  const microDir = microRng() < 0.5 ? 1 : -1;
  const microBias = microDir * (0.08 + microRng() * 0.16);

  // Authentic pullback probability inside directional trends so bars alternate naturally
  const isPullback = rng() < dna.pullbackRate;
  const regimeDrift = isPullback ? -reg.drift * (0.45 + rng() * 0.55) : reg.drift * (0.65 + rng() * 0.7);

  // Heavy-tailed volatility shock (news spike / liquidity wick)
  const isSpike = rng() < dna.spikeProb;
  const shockScale = isSpike ? dna.spikeScale * (0.85 + rng() * 0.5) : 0.65 + rng() * 0.75;

  // Triangular-like noise for realistic fat tails without sine uniformity
  const n1 = rng() - 0.5;
  const n2 = rng() - 0.5;
  const rawNoise = (n1 + n2 * 0.7) * volatility * reg.volScale * shockScale * 0.68;

  const biasShift = bias === 'BULL' ? volatility * 0.34 : bias === 'BEAR' ? -volatility * 0.34 : 0;
  const delta = rawNoise + (regimeDrift + microBias) * volatility * 0.52 + biasShift;

  // Sweep/pinbar asymmetric wicks
  const wickMult = dna.wickScale * reg.volScale * (isSpike ? 1.55 : 1.0);
  const upperSweep = reg.mode === 'SWEEP_TOP' ? 1.45 : 1.0;
  const lowerSweep = reg.mode === 'SWEEP_BOT' ? 1.45 : 1.0;
  const highJitter = Math.abs((0.12 + rng() * 0.55) * volatility * wickMult * upperSweep);
  const lowJitter = Math.abs((0.12 + rng() * 0.55) * volatility * wickMult * lowerSweep);

  const volBase = reg.mode.startsWith('BREAKOUT') ? 22 : reg.mode === 'SQUEEZE' ? 5 : 10;
  const vol = Math.floor(rng() * (volBase + (isSpike ? 18 : 8))) + 3;

  return { delta, highJitter, lowJitter, vol };
}

function getSynced5sAnchorPrice(
  spec: Pick<BinaryMarketConfig, 'symbol' | 'basePrice' | 'decimals' | 'volatility'>,
  s5Anchor: number
): number {
  const dna = getMarketDna(spec.symbol);
  const anchorSlot = Math.floor(s5Anchor / 140);
  const anchorRng = createSeededRng(`bin5s_anchor_v2:${spec.symbol}:${anchorSlot}`);
  const offsetSteps = ((s5Anchor % 140) + 140) % 140;
  let cur = +(spec.basePrice + (anchorRng() - 0.5) * spec.volatility * 7 * dna.volBase).toFixed(spec.decimals);
  cur = Math.max(spec.volatility * 5, cur);
  const start = anchorSlot * 140;
  for (let i = 0; i < offsetSteps; i++) {
    const step = getDeterministic5sDelta(spec.symbol, spec.volatility, start + i, 'AUTO');
    const nextRaw = Math.max(spec.volatility * 5, cur + step.delta);
    const meanRev = ((spec.basePrice - nextRaw) / Math.max(spec.basePrice * 0.025, spec.volatility * 9)) * spec.volatility * dna.meanRev * 2.2;
    cur = +(nextRaw + meanRev).toFixed(spec.decimals);
  }
  return cur;
}

export function getSyncedBinarySnapshot(
  specs: Array<Pick<BinaryMarketConfig, 'symbol' | 'basePrice' | 'decimals' | 'volatility'>>,
  nowMs = Date.now(),
  bias: 'AUTO' | 'BULL' | 'BEAR' = 'AUTO',
  offsetMinutes = 360
): {
  serverNow: number;
  candleSecRemaining: number;
  markets: Record<string, BinaryMarketQuote>;
} {
  const current8sBucket = Math.floor(nowMs / BINARY_CANDLE_MS);
  const candleSecRemaining = Math.max(1, 8 - Math.floor((nowMs % BINARY_CANDLE_MS) / 1000));
  const current5s = Math.floor(nowMs / BASE_5S_MS);
  const sub5sProgress = Math.min(1, Math.max(0.15, ((nowMs % BASE_5S_MS) + 450) / BASE_5S_MS));
  const lookback5s = 192; // 16 minutes of 5s steps
  const start5s = current5s - lookback5s;

  const markets: Record<string, BinaryMarketQuote> = {};

  for (const spec of specs) {
    const dna = getMarketDna(spec.symbol);
    let cur = getSynced5sAnchorPrice(spec, start5s);

    // Aggregate 5s bars into 8s snapshot candles cleanly for mini-charts + exact live price
    const candleMap = new Map<number, Candle>();
    let liveOpen = cur;
    let liveTargetClose = cur;
    let liveHi = cur;
    let liveLo = cur;

    for (let s5 = start5s; s5 <= current5s; s5++) {
      const tMs = s5 * BASE_5S_MS;
      const b8 = Math.floor(tMs / BINARY_CANDLE_MS);
      const isLive = s5 === current5s;
      const step = getDeterministic5sDelta(spec.symbol, spec.volatility, s5, isLive ? bias : 'AUTO');
      const open = cur;
      const nextRaw = Math.max(spec.volatility * 5, open + step.delta);
      const meanRev =
        ((spec.basePrice - nextRaw) / Math.max(spec.basePrice * 0.025, spec.volatility * 9)) *
        spec.volatility *
        dna.meanRev *
        2.2;
      const fullClose = +(nextRaw + meanRev).toFixed(spec.decimals);
      const close = isLive
        ? +(open + (fullClose - open) * sub5sProgress).toFixed(spec.decimals)
        : fullClose;
      const hi = +Math.max(open, close, Math.max(open, close) + step.highJitter * (isLive ? sub5sProgress : 1)).toFixed(spec.decimals);
      const lo = +Math.max(
        spec.volatility * 4,
        Math.min(open, close, Math.min(open, close) - step.lowJitter * (isLive ? sub5sProgress : 1))
      ).toFixed(spec.decimals);

      if (isLive) {
        liveOpen = open;
        liveTargetClose = close;
        liveHi = hi;
        liveLo = lo;
      }
      cur = close;

      const existing = candleMap.get(b8);
      if (!existing) {
        const bStart = b8 * BINARY_CANDLE_MS;
        candleMap.set(b8, {
          time: bStart,
          timeStr: formatTimeWithOffset(bStart, offsetMinutes),
          open,
          high: hi,
          low: lo,
          close,
          volume: step.vol
        });
      } else {
        existing.high = Math.max(existing.high, hi);
        existing.low = Math.min(existing.low, lo);
        existing.close = close;
        existing.volume = (existing.volume || 0) + step.vol;
      }
    }

    const visibleCandles: Candle[] = [];
    for (let b = current8sBucket - 115; b <= current8sBucket; b++) {
      const c = candleMap.get(b);
      if (c) visibleCandles.push(c);
    }

    const latestPrice = visibleCandles[visibleCandles.length - 1]?.close ?? liveTargetClose ?? liveOpen;
    const refOpen = visibleCandles[Math.max(0, visibleCandles.length - 28)]?.open || visibleCandles[0]?.open || latestPrice;

    void liveHi;
    void liveLo;

    markets[spec.symbol] = {
      symbol: spec.symbol,
      price: latestPrice,
      candles: visibleCandles,
      changePct: +(((latestPrice - refOpen) / Math.max(1e-9, refOpen)) * 100).toFixed(3)
    };
  }

  return {
    serverNow: nowMs,
    candleSecRemaining,
    markets
  };
}

export function getNextBinaryCandlePreview(
  spec: Pick<BinaryMarketConfig, 'symbol' | 'basePrice' | 'decimals' | 'volatility'>,
  bias: 'AUTO' | 'BULL' | 'BEAR' = 'AUTO',
  nowMs = Date.now(),
  offsetMinutes = 360
): {
  nextBucket: number;
  direction: 'BULL' | 'BEAR';
  open: number;
  high: number;
  low: number;
  close: number;
  timeLabel: string;
  secUntilNext: number;
} {
  const snap = getSyncedBinarySnapshot([spec], nowMs, 'AUTO', offsetMinutes);
  const currentQuote = snap.markets[spec.symbol];
  const open = currentQuote?.price ?? spec.basePrice;
  const nextBucket = Math.floor(nowMs / BINARY_CANDLE_MS) + 1;
  const next5s = Math.floor((nextBucket * BINARY_CANDLE_MS) / BASE_5S_MS);
  const dna = getMarketDna(spec.symbol);
  const step = getDeterministic5sDelta(spec.symbol, spec.volatility, next5s, bias);
  const nextRaw = Math.max(spec.volatility * 5, open + step.delta * 1.4);
  const meanRev = ((spec.basePrice - nextRaw) / Math.max(spec.basePrice * 0.025, spec.volatility * 9)) * spec.volatility * dna.meanRev * 2.2;
  const close = +(nextRaw + meanRev).toFixed(spec.decimals);
  const high = +Math.max(open, close, Math.max(open, close) + step.highJitter).toFixed(spec.decimals);
  const low = +Math.max(spec.volatility * 4, Math.min(open, close, Math.min(open, close) - step.lowJitter)).toFixed(spec.decimals);

  return {
    nextBucket,
    direction: close >= open ? 'BULL' : 'BEAR',
    open,
    high,
    low,
    close,
    timeLabel: formatTimeWithOffset(nextBucket * BINARY_CANDLE_MS, offsetMinutes),
    secUntilNext: snap.candleSecRemaining
  };
}

export function formatCountdownClock(secRemaining: number): string {
  const s = Math.max(0, Math.floor(secRemaining));
  const days = Math.floor(s / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) {
    return `${days}d ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Generates timeframe-consistent OHLC candlesticks for Binary & Gold Market.
 * - Uses non-periodic Market DNA regime switching (zero sine waves) so every
 *   asset displays distinct breakouts, consolidations, pullbacks, and wicks.
 * - For 5s .. 5m: exact aggregation of underlying 5s steps inside each bucket.
 * - For larger timeframes (15m .. 30d): multi-substep regime evolution anchored
 *   smoothly to the live price.
 */
export function getSyncedBinaryCandlesForTimeframe(
  spec: Pick<BinaryMarketConfig, 'symbol' | 'basePrice' | 'decimals' | 'volatility'>,
  timeframeSec: number,
  nowMs = Date.now(),
  bias: 'AUTO' | 'BULL' | 'BEAR' = 'AUTO',
  offsetMinutes = 360,
  count = 96,
  livePriceOverride?: number
): Candle[] {
  const tfSec = Math.max(5, Math.round(timeframeSec));
  const tfMs = tfSec * 1000;
  const currentBucket = Math.floor(nowMs / tfMs);
  const startBucket = currentBucket - (count - 1);
  const dna = getMarketDna(spec.symbol);

  // Fine aggregation path for 5s .. 5m: exact sum of underlying 5s ticks
  if (tfSec <= 300) {
    const start5s = Math.floor((startBucket * tfMs) / BASE_5S_MS);
    const current5s = Math.floor(nowMs / BASE_5S_MS);
    let cur = getSynced5sAnchorPrice(spec, start5s);

    const candleMap = new Map<number, Candle>();
    for (let s5 = start5s; s5 <= current5s; s5++) {
      const tMs = s5 * BASE_5S_MS;
      const bIdx = Math.floor(tMs / tfMs);
      const isLiveTick = s5 === current5s;
      const step = getDeterministic5sDelta(spec.symbol, spec.volatility, s5, isLiveTick ? bias : 'AUTO');
      const open = cur;
      const nextRaw = Math.max(spec.volatility * 5, open + step.delta);
      const meanRev =
        ((spec.basePrice - nextRaw) / Math.max(spec.basePrice * 0.025, spec.volatility * 9)) *
        spec.volatility *
        dna.meanRev *
        2.2;
      const close = +(nextRaw + meanRev).toFixed(spec.decimals);
      const hi = +Math.max(open, close, Math.max(open, close) + step.highJitter).toFixed(spec.decimals);
      const lo = +Math.max(
        spec.volatility * 4,
        Math.min(open, close, Math.min(open, close) - step.lowJitter)
      ).toFixed(spec.decimals);
      cur = close;

      const existing = candleMap.get(bIdx);
      if (!existing) {
        const bStart = bIdx * tfMs;
        candleMap.set(bIdx, {
          time: bStart,
          timeStr: formatTimeWithOffset(bStart, offsetMinutes),
          open,
          high: hi,
          low: lo,
          close,
          volume: step.vol
        });
      } else {
        existing.high = Math.max(existing.high, hi);
        existing.low = Math.min(existing.low, lo);
        existing.close = close;
        existing.volume = (existing.volume || 0) + step.vol;
      }
    }

    const out: Candle[] = [];
    for (let b = startBucket; b <= currentBucket; b++) {
      const c = candleMap.get(b);
      if (c) out.push(c);
    }
    if (out.length > 0 && typeof livePriceOverride === 'number' && !isNaN(livePriceOverride)) {
      const last = { ...out[out.length - 1] };
      const px = +livePriceOverride.toFixed(spec.decimals);
      last.close = px;
      last.high = Math.max(last.high, px);
      last.low = Math.min(last.low, px);
      out[out.length - 1] = last;
    }
    return out;
  }

  // Coarse multi-substep regime evolution path for 15m .. 30d
  const scaleFactor = Math.min(18, Math.sqrt(tfSec / 60));
  const subStepsPerCandle = tfSec >= 86400 ? 14 : tfSec >= 3600 ? 10 : 7;
  const anchorRng = createSeededRng(`bin_macro_anchor_v2:${spec.symbol}:${tfSec}:${Math.floor(startBucket / 16)}`);
  let cur = +(
    spec.basePrice +
    (anchorRng() - 0.5) * spec.volatility * 5 * dna.volBase * Math.min(5, scaleFactor * 0.7)
  ).toFixed(spec.decimals);
  cur = Math.max(spec.volatility * 5, cur);

  const candles: Candle[] = [];
  for (let b = startBucket; b <= currentBucket; b++) {
    const bStart = b * tfMs;
    const isCur = b === currentBucket;
    const open = cur;
    let high = open;
    let low = open;
    let volume = 0;
    const reg = getRegimeAtStep(spec.symbol, b * 12);

    const activeSubs = isCur
      ? Math.max(1, Math.min(subStepsPerCandle, Math.ceil(((nowMs - bStart) / tfMs) * subStepsPerCandle)))
      : subStepsPerCandle;

    for (let sub = 0; sub < activeSubs; sub++) {
      const rng = createSeededRng(`bin_macro_v2:${spec.symbol}:${tfSec}:${b}:${sub}`);
      const isPullback = rng() < dna.pullbackRate;
      const regPush = (isPullback ? -reg.drift * 0.5 : reg.drift * 0.75) * spec.volatility * Math.min(4.5, scaleFactor * 0.55);
      const driftBack =
        ((spec.basePrice - cur) / Math.max(spec.basePrice * 0.03, spec.volatility * 10)) *
        spec.volatility *
        dna.meanRev *
        4.2;
      const biasDrift = isCur
        ? bias === 'BULL'
          ? spec.volatility * 0.45 * Math.min(5, scaleFactor) * 0.32
          : bias === 'BEAR'
          ? -spec.volatility * 0.45 * Math.min(5, scaleFactor) * 0.32
          : 0
        : 0;
      const shock = rng() < dna.spikeProb ? dna.spikeScale : 1.0;
      const stepDelta =
        (rng() - 0.5 + (rng() - 0.5) * 0.6) *
          spec.volatility *
          0.62 *
          reg.volScale *
          shock *
          Math.min(5.2, scaleFactor * 0.6) +
        regPush +
        driftBack +
        biasDrift;
      cur = +Math.max(spec.volatility * 5, cur + stepDelta).toFixed(spec.decimals);
      if (cur > high) high = cur;
      if (cur < low) low = cur;
      volume += Math.floor(rng() * 35 * reg.volScale) + 10;
    }

    const wickPad = spec.volatility * dna.wickScale * Math.min(3.5, scaleFactor * 0.45);
    const wRng = createSeededRng(`bin_macro_wick:${spec.symbol}:${tfSec}:${b}`);
    high = +Math.max(high, open, cur, Math.max(open, cur) + wRng() * wickPad).toFixed(spec.decimals);
    low = +Math.max(spec.volatility * 4, Math.min(low, open, cur, Math.min(open, cur) - wRng() * wickPad)).toFixed(spec.decimals);

    candles.push({
      time: bStart,
      timeStr: tfSec >= 86400 ? formatDateWithOffset(bStart, offsetMinutes) : formatTimeWithOffset(bStart, offsetMinutes),
      open,
      high,
      low,
      close: cur,
      volume
    });
  }

  if (candles.length > 0 && typeof livePriceOverride === 'number' && !isNaN(livePriceOverride)) {
    const last = { ...candles[candles.length - 1] };
    const px = +livePriceOverride.toFixed(spec.decimals);
    last.close = px;
    last.high = Math.max(last.high, px);
    last.low = Math.min(last.low, px);
    candles[candles.length - 1] = last;
  }
  return candles;
}

// ================= MINES SYNCHRONIZED GLOBAL ROUND ENGINE =================
export function getSyncedMinesEpochInfo(nowMs = Date.now()): {
  roundId: string;
  secondsRemaining: number;
  slotIndex: number;
} {
  const roundMs = 60000;
  const slotIndex = Math.floor(nowMs / roundMs);
  const rem = Math.max(1, 60 - (Math.floor(nowMs / 1000) % 60));
  return {
    roundId: `M${String(slotIndex).slice(-6)}`,
    secondsRemaining: rem,
    slotIndex
  };
}

export function generateSyncedMinesBoard(
  roundId: string,
  minesCount: number,
  gridSize = 25,
  nonce?: string | number
): Set<number> {
  const rng = createSeededRng(`mines:${roundId}:${minesCount}:${nonce ?? Date.now()}`);
  const indices = Array.from({ length: gridSize }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return new Set(indices.slice(0, Math.min(gridSize - 1, Math.max(1, minesCount))));
}

// ================= 4-MODE OUTCOME CONTROL RESOLVERS =================
export function evaluatePoolControl(
  mode: MarketControlMode,
  entries: Array<{ key: string; total: number }>
): { winningKey?: string; losingKey?: string } {
  if (mode === 'AUTO' || entries.length === 0) return {};
  const sortedDesc = [...entries].sort((a, b) => b.total - a.total);
  const highest = sortedDesc[0];
  const nonZeroAsc = [...entries].filter((e) => e.total > 0).sort((a, b) => a.total - b.total);
  const lowest = nonZeroAsc.length > 0 ? nonZeroAsc[0] : sortedDesc[sortedDesc.length - 1];

  if (highest.total <= 0) return {};
  if (mode === 'HIGH_BET_LOSS') {
    const opposingLowest = sortedDesc[sortedDesc.length - 1];
    return { losingKey: highest.key, winningKey: opposingLowest.key };
  }
  if (mode === 'HIGH_BET_WIN') {
    const opposingLowest = sortedDesc[sortedDesc.length - 1];
    return { winningKey: highest.key, losingKey: opposingLowest.key };
  }
  if (mode === 'LOW_BET_WIN') {
    return { winningKey: lowest.key, losingKey: highest.key };
  }
  if (mode === 'LOW_BET_LOSS') {
    return { losingKey: lowest.key, winningKey: highest.key };
  }
  return {};
}

function scoreK3DiceAgainstBets(
  dice: [number, number, number],
  bets: Array<{ betType: string; selection: string; totalAmount: number }>
): number {
  const sum = dice[0] + dice[1] + dice[2];
  const counts: Record<number, number> = {};
  dice.forEach((d) => {
    counts[d] = (counts[d] || 0) + 1;
  });
  const vals = Object.values(counts);
  const isThreeSame = vals.includes(3);
  const isTwoSame = vals.includes(2);
  const uniq = vals.length;
  let payout = 0;

  for (const b of bets) {
    let mult = 0;
    const sel = String(b.selection);
    if (b.betType === 'sum' && Number(sel) === sum) mult = 10;
    else if (b.betType === 'size') {
      if (sel === 'Big' && sum >= 11) mult = 2;
      if (sel === 'Small' && sum <= 10) mult = 2;
    } else if (b.betType === 'parity') {
      if (sel === 'Odd' && sum % 2 !== 0) mult = 2;
      if (sel === 'Even' && sum % 2 === 0) mult = 2;
    } else if (b.betType === '2same' && isTwoSame && (sel === 'Any 2 Same' || dice.includes(Number(sel[0])))) {
      mult = 12;
    } else if (b.betType === '3same' && isThreeSame) {
      mult = 40;
    } else if (b.betType === 'diff' && uniq === 3) {
      mult = 8;
    }
    payout += (Number(b.totalAmount) || 0) * mult;
  }
  return payout;
}

export function resolveControlledK3Dice(
  mode: K3Mode,
  periodNumber: string,
  controlMode: MarketControlMode | undefined,
  bets: Array<{ betType: string; selection: string; totalAmount: number }>
): [number, number, number] {
  const fallback = getSyncedK3Dice(mode, periodNumber);
  if (!controlMode || controlMode === 'AUTO' || bets.length === 0) return fallback;

  // Build candidate dice triples starting with deterministic one, plus representative pool coverage
  const candidates: Array<[number, number, number]> = [fallback];
  const rng = createSeededRng(`k3ctrl:${mode}:${periodNumber}`);
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      const d3 = Math.floor(rng() * 6) + 1;
      candidates.push([d1, d2, d3]);
    }
  }
  // Ensure sum extremes and triples are sampled cleanly
  candidates.push([1, 1, 1], [2, 2, 2], [6, 6, 6], [1, 2, 3], [4, 5, 6]);

  const scored = candidates.map((d) => ({ dice: d, payout: scoreK3DiceAgainstBets(d, bets) }));
  scored.sort((a, b) => a.payout - b.payout);

  // HIGH_BET_LOSS / LOW_BET_WIN => pick minimum total payout so the heaviest wager loses & lighter/opposing wins
  if (controlMode === 'HIGH_BET_LOSS' || controlMode === 'LOW_BET_WIN') {
    const bestNonZeroLower = scored.find((s) => s.payout === scored[0].payout) || scored[0];
    return bestNonZeroLower.dice;
  }
  // HIGH_BET_WIN / LOW_BET_LOSS => pick maximum total payout so heavy wager wins
  return scored[scored.length - 1].dice;
}

function scoreD5DigitsAgainstBets(
  digits: [number, number, number, number, number],
  bets: Array<{ position: string; betType?: string; selection: string; totalAmount: number }>
): number {
  const sum = digits.reduce((a, b) => a + b, 0);
  const posMap: Record<string, number> = {
    A: digits[0],
    B: digits[1],
    C: digits[2],
    D: digits[3],
    E: digits[4]
  };
  let payout = 0;

  for (const b of bets) {
    const val = b.position === 'SUM' ? sum : posMap[b.position] ?? 0;
    const isBig = b.position === 'SUM' ? val >= 23 : val >= 5;
    const sel = String(b.selection);
    let mult = 0;
    if (b.betType === 'digit' && Number(sel) === val) mult = 9;
    else if (sel === 'Big' && isBig) mult = 2;
    else if (sel === 'Small' && !isBig) mult = 2;
    else if (sel === 'Odd' && val % 2 !== 0) mult = 2;
    else if (sel === 'Even' && val % 2 === 0) mult = 2;
    payout += (Number(b.totalAmount) || 0) * mult;
  }
  return payout;
}

export function resolveControlledD5Digits(
  mode: D5Mode,
  periodNumber: string,
  controlMode: MarketControlMode | undefined,
  bets: Array<{ position: string; betType?: string; selection: string; totalAmount: number }>
): [number, number, number, number, number] {
  const fallback = getSyncedD5Digits(mode, periodNumber);
  if (!controlMode || controlMode === 'AUTO' || bets.length === 0) return fallback;

  const candidates: Array<[number, number, number, number, number]> = [fallback];
  for (let i = 0; i < 48; i++) {
    const rng = createSeededRng(`d5ctrl:${mode}:${periodNumber}:${i}`);
    candidates.push([
      Math.floor(rng() * 10),
      Math.floor(rng() * 10),
      Math.floor(rng() * 10),
      Math.floor(rng() * 10),
      Math.floor(rng() * 10)
    ]);
  }
  // Ensure clear Big/Small/Odd/Even extreme vectors are included
  candidates.push([0, 0, 0, 0, 0], [9, 9, 9, 9, 9], [1, 3, 5, 7, 9], [0, 2, 4, 6, 8]);

  const scored = candidates.map((digs) => ({ digits: digs, payout: scoreD5DigitsAgainstBets(digs, bets) }));
  scored.sort((a, b) => a.payout - b.payout);

  if (controlMode === 'HIGH_BET_LOSS' || controlMode === 'LOW_BET_WIN') {
    return scored[0].digits;
  }
  return scored[scored.length - 1].digits;
}

export function resolveMinesTileControl(
  controlMode: MarketControlMode | undefined,
  activeBetAmt: number,
  poolAvgBet: number,
  revealStep: number,
  minesPattern: MinesPatternMode = 'RANDOM',
  userRoundSeq = 0
): 'AUTO' | 'FORCE_BOMB' | 'FORCE_SAFE' {
  // Specific pattern overrides requested by Admin
  if (minesPattern === 'FIRST_WIN_SECOND_LOSS') {
    if (revealStep === 1) return 'FORCE_SAFE';
    if (revealStep >= 2) return 'FORCE_BOMB';
  }
  if (minesPattern === 'THREE_WIN_TEN_LOSS') {
    const cyclePos = ((Math.max(0, userRoundSeq) % 13) + 13) % 13;
    const isWinRound = cyclePos < 3;
    if (isWinRound) {
      return revealStep <= 6 ? 'FORCE_SAFE' : 'AUTO';
    }
    // 10 Loss rounds: 1st tile lures safely, 2nd click triggers mine
    if (revealStep === 1) return 'FORCE_SAFE';
    return 'FORCE_BOMB';
  }

  if (!controlMode || controlMode === 'AUTO') {
    // Tighter house protection on AUTO: rare deep streaks, bombs trigger frequently after 1st/2nd reveal
    if (revealStep >= 3) return 'FORCE_BOMB';
    if (revealStep === 2 && ((userRoundSeq + Math.round(activeBetAmt)) % 5 !== 0)) {
      return 'FORCE_BOMB';
    }
    return 'AUTO';
  }
  const threshold = Math.max(50, poolAvgBet);
  const isHighBet = activeBetAmt >= threshold;

  if (controlMode === 'HIGH_BET_LOSS') {
    if (isHighBet && revealStep >= 2) return 'FORCE_BOMB';
    if (!isHighBet && revealStep >= 3) return 'FORCE_BOMB';
    if (!isHighBet && revealStep <= 2) return 'FORCE_SAFE';
    return 'AUTO';
  }
  if (controlMode === 'HIGH_BET_WIN') {
    if (isHighBet) return 'FORCE_SAFE';
    return 'AUTO';
  }
  if (controlMode === 'LOW_BET_WIN') {
    if (!isHighBet && revealStep <= 2) return 'FORCE_SAFE';
    if (isHighBet && revealStep >= 2) return 'FORCE_BOMB';
    return revealStep >= 3 ? 'FORCE_BOMB' : 'AUTO';
  }
  if (controlMode === 'LOW_BET_LOSS') {
    if (!isHighBet && revealStep >= 2) return 'FORCE_BOMB';
    if (isHighBet && revealStep <= 3) return 'FORCE_SAFE';
    return 'AUTO';
  }
  return 'AUTO';
}

// ================= COIN FLIP SYNCHRONIZED POOL RESOLVER =================
export function resolveCoinFlipOutcome(
  roundId: string,
  goldTotal: number,
  silverTotal: number,
  controlMode: MarketControlMode = 'HIGH_BET_LOSS'
): 'GOLD' | 'SILVER' {
  const rng = createSeededRng(`coinflip:${roundId}`);
  const randomSide: 'GOLD' | 'SILVER' = rng() >= 0.5 ? 'GOLD' : 'SILVER';

  if (controlMode === 'AUTO' || (goldTotal <= 0 && silverTotal <= 0)) {
    return randomSide;
  }

  if (goldTotal === silverTotal) {
    return randomSide;
  }

  const highSide: 'GOLD' | 'SILVER' = goldTotal > silverTotal ? 'GOLD' : 'SILVER';
  const lowSide: 'GOLD' | 'SILVER' = highSide === 'GOLD' ? 'SILVER' : 'GOLD';

  if (controlMode === 'HIGH_BET_LOSS' || controlMode === 'LOW_BET_WIN') {
    return lowSide;
  }
  if (controlMode === 'HIGH_BET_WIN' || controlMode === 'LOW_BET_LOSS') {
    return highSide;
  }
  return randomSide;
}



