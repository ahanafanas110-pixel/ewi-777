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

// ================= BINARY 17-MARKET GLOBAL DETERMINISTIC ENGINE =================
export const BINARY_CANDLE_MS = 8000;

function computeDeterministicBinaryCandle(
  symbol: string,
  basePrice: number,
  decimals: number,
  volatility: number,
  bucketIdx: number,
  prevClose: number,
  maxSubTicks: number,
  bias: 'AUTO' | 'BULL' | 'BEAR' = 'AUTO',
  offsetMinutes = 360
): { candle: Candle; price: number } {
  const bucketTime = bucketIdx * BINARY_CANDLE_MS;
  const open = prevClose;
  let high = open;
  let low = open;
  let cur = open;
  let volume = 8;

  for (let sec = 0; sec < maxSubTicks; sec++) {
    const rng = createSeededRng(`bin:${symbol}:${bucketIdx}:${sec}`);
    const driftBack = ((basePrice - cur) / Math.max(basePrice * 0.015, volatility * 4)) * volatility * 0.14;
    const biasDrift =
      bias === 'BULL' ? volatility * 0.32 : bias === 'BEAR' ? -volatility * 0.32 : 0;
    const step = (rng() - 0.5) * volatility * 0.88 + driftBack + biasDrift;
    cur = +Math.max(volatility * 5, cur + step).toFixed(decimals);
    if (cur > high) high = cur;
    if (cur < low) low = cur;
    volume += Math.floor(rng() * 5) + 1;
  }

  return {
    price: cur,
    candle: {
      time: bucketTime,
      timeStr: formatTimeWithOffset(bucketTime, offsetMinutes),
      open,
      high,
      low,
      close: cur,
      volume
    }
  };
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
  const currentBucket = Math.floor(nowMs / BINARY_CANDLE_MS);
  const currentSecInCandle = Math.floor((nowMs % BINARY_CANDLE_MS) / 1000) + 1;
  const candleSecRemaining = Math.max(1, 8 - Math.floor((nowMs % BINARY_CANDLE_MS) / 1000));

  const warmStartBucket = currentBucket - 160;
  const markets: Record<string, BinaryMarketQuote> = {};

  for (const spec of specs) {
    const anchorRng = createSeededRng(`bin_anchor:${spec.symbol}:${Math.floor(warmStartBucket / 20)}`);
    let prevClose = +(
      spec.basePrice +
      (anchorRng() - 0.5) * spec.volatility * 6
    ).toFixed(spec.decimals);
    prevClose = Math.max(spec.volatility * 5, prevClose);

    const allCandles: Candle[] = [];
    for (let b = warmStartBucket; b <= currentBucket; b++) {
      const isCur = b === currentBucket;
      const subTicks = isCur ? Math.min(8, Math.max(1, currentSecInCandle)) : 8;
      const { candle, price } = computeDeterministicBinaryCandle(
        spec.symbol,
        spec.basePrice,
        spec.decimals,
        spec.volatility,
        b,
        prevClose,
        subTicks,
        isCur ? bias : 'AUTO',
        offsetMinutes
      );
      allCandles.push(candle);
      prevClose = price;
    }

    const visibleCandles = allCandles.slice(-140);
    const firstOpen = visibleCandles[visibleCandles.length - 28]?.open || visibleCandles[0]?.open || prevClose;
    markets[spec.symbol] = {
      symbol: spec.symbol,
      price: prevClose,
      candles: visibleCandles,
      changePct: +(((prevClose - firstOpen) / firstOpen) * 100).toFixed(3)
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
  const prevClose = currentQuote?.price ?? spec.basePrice;
  const nextBucket = Math.floor(nowMs / BINARY_CANDLE_MS) + 1;
  const { candle } = computeDeterministicBinaryCandle(
    spec.symbol,
    spec.basePrice,
    spec.decimals,
    spec.volatility,
    nextBucket,
    prevClose,
    8,
    bias,
    offsetMinutes
  );
  return {
    nextBucket,
    direction: candle.close >= candle.open ? 'BULL' : 'BEAR',
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    timeLabel: candle.timeStr,
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

const BASE_5S_MS = 5000;

function getDeterministic5sDelta(
  symbol: string,
  volatility: number,
  bucket5sIdx: number,
  bias: 'AUTO' | 'BULL' | 'BEAR' = 'AUTO'
): { delta: number; highJitter: number; lowJitter: number; vol: number } {
  const rng = createSeededRng(`bin5s:${symbol}:${bucket5sIdx}`);
  const wave = Math.sin(bucket5sIdx * 0.19 + fnv1aSeed(symbol) % 17) * volatility * 0.22;
  const macro = Math.cos(bucket5sIdx * 0.045) * volatility * 0.16;
  const biasShift = bias === 'BULL' ? volatility * 0.26 : bias === 'BEAR' ? -volatility * 0.26 : 0;
  const delta = (rng() - 0.5) * volatility * 0.72 + wave + macro + biasShift;
  const highJitter = Math.abs(rng() * volatility * 0.28);
  const lowJitter = Math.abs(rng() * volatility * 0.28);
  const vol = Math.floor(rng() * 14) + 4;
  return { delta, highJitter, lowJitter, vol };
}

/**
 * Generates timeframe-consistent OHLC candlesticks for Binary & Gold Market.
 * - Base resolution is 5s ticks.
 * - For 5s, 15s, 30s, 1m (60s), 5m (300s): every candle literally aggregates
 *   all underlying 5s steps inside that exact time bucket (so two 30s candles
 *   combine directly into one 1m candle, five 1m candles into 5m, etc.).
 * - For larger timeframes (15m, 30m, 1h, 12h, 24h): scales smoothly from
 *   coarse deterministic sub-candles with live anchor continuity.
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

  // Fine aggregation path for 5s .. 5m: exact sum of underlying 5s ticks
  if (tfSec <= 300) {
    const start5s = Math.floor((startBucket * tfMs) / BASE_5S_MS);
    const current5s = Math.floor(nowMs / BASE_5S_MS);
    const anchorRng = createSeededRng(`bin5s_anchor:${spec.symbol}:${Math.floor(start5s / 120)}`);
    let cur = +(spec.basePrice + (anchorRng() - 0.5) * spec.volatility * 6).toFixed(spec.decimals);
    cur = Math.max(spec.volatility * 5, cur);

    const candleMap = new Map<number, Candle>();
    for (let s5 = start5s; s5 <= current5s; s5++) {
      const tMs = s5 * BASE_5S_MS;
      const bIdx = Math.floor(tMs / tfMs);
      const isLiveTick = s5 === current5s;
      const step = getDeterministic5sDelta(spec.symbol, spec.volatility, s5, isLiveTick ? bias : 'AUTO');
      const open = cur;
      const nextRaw = Math.max(spec.volatility * 5, +(open + step.delta).toFixed(spec.decimals));
      const meanRev = ((spec.basePrice - nextRaw) / Math.max(spec.basePrice * 0.02, spec.volatility * 8)) * spec.volatility * 0.08;
      const close = +(nextRaw + meanRev).toFixed(spec.decimals);
      const hi = +Math.max(open, close, Math.max(open, close) + step.highJitter).toFixed(spec.decimals);
      const lo = +Math.max(spec.volatility * 4, Math.min(open, close, Math.min(open, close) - step.lowJitter)).toFixed(spec.decimals);
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

  // Coarse multi-substep aggregation path for 15m .. 30d
  const scaleFactor = Math.min(18, Math.sqrt(tfSec / 60));
  const subStepsPerCandle = tfSec >= 86400 ? 14 : tfSec >= 3600 ? 10 : 6;
  const anchorRng = createSeededRng(`bin_macro_anchor:${spec.symbol}:${tfSec}:${Math.floor(startBucket / 16)}`);
  let cur = +(spec.basePrice + (anchorRng() - 0.5) * spec.volatility * 4 * Math.min(6, scaleFactor)).toFixed(spec.decimals);
  cur = Math.max(spec.volatility * 5, cur);

  const candles: Candle[] = [];
  for (let b = startBucket; b <= currentBucket; b++) {
    const bStart = b * tfMs;
    const isCur = b === currentBucket;
    const open = cur;
    let high = open;
    let low = open;
    let volume = 0;

    const activeSubs = isCur
      ? Math.max(1, Math.min(subStepsPerCandle, Math.ceil(((nowMs - bStart) / tfMs) * subStepsPerCandle)))
      : subStepsPerCandle;

    for (let sub = 0; sub < activeSubs; sub++) {
      const rng = createSeededRng(`bin_macro:${spec.symbol}:${tfSec}:${b}:${sub}`);
      const driftBack = ((spec.basePrice - cur) / Math.max(spec.basePrice * 0.03, spec.volatility * 10)) * spec.volatility * 0.2;
      const biasDrift = isCur
        ? bias === 'BULL'
          ? spec.volatility * 0.45 * Math.min(6, scaleFactor) * 0.35
          : bias === 'BEAR'
          ? -spec.volatility * 0.45 * Math.min(6, scaleFactor) * 0.35
          : 0
        : 0;
      const stepDelta = (rng() - 0.5) * spec.volatility * 0.72 * Math.min(5.5, scaleFactor * 0.65) + driftBack + biasDrift;
      cur = +Math.max(spec.volatility * 5, cur + stepDelta).toFixed(spec.decimals);
      if (cur > high) high = cur;
      if (cur < low) low = cur;
      volume += Math.floor(rng() * 35) + 12;
    }

    candles.push({
      time: bStart,
      timeStr: tfSec >= 86400 ? formatDateWithOffset(bStart, offsetMinutes) : formatTimeWithOffset(bStart, offsetMinutes),
      open,
      high: +Math.max(high, open, cur).toFixed(spec.decimals),
      low: +Math.min(low, open, cur).toFixed(spec.decimals),
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

// ================= EWI ROULETTE SYNCHRONIZED EUROPEAN ENGINE =================
export const ROULETTE_WHEEL_ORDER: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const ROULETTE_RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

export function getRouletteNumberColor(num: number): 'green' | 'red' | 'black' {
  if (num === 0) return 'green';
  return ROULETTE_RED_NUMBERS.has(num) ? 'red' : 'black';
}

export interface EwiRouletteState {
  roundId: string;
  phase: 'betting' | 'spinning' | 'result';
  timeRemaining: number;
  phaseRemaining: number;
  winningNumber: number;
  winningColor: 'green' | 'red' | 'black';
  history: Array<{ roundId: string; number: number; color: 'green' | 'red' | 'black' }>;
  serverNow: number;
}

const ROULETTE_BETTING_MS = 20000;
const ROULETTE_SPINNING_MS = 6000;
const ROULETTE_RESULT_MS = 4000;
const ROULETTE_ROUND_MS = ROULETTE_BETTING_MS + ROULETTE_SPINNING_MS + ROULETTE_RESULT_MS;

function getRouletteNumberForRound(roundIndex: number): number {
  const rng = createSeededRng(`ewi_roulette:${roundIndex}`);
  return Math.floor(rng() * 37);
}

export function getEwiRouletteState(nowMs = Date.now(), offsetMinutes = 360): EwiRouletteState {
  const roundIndex = Math.floor(nowMs / ROULETTE_ROUND_MS);
  const roundStart = roundIndex * ROULETTE_ROUND_MS;
  const elapsed = Math.max(0, nowMs - roundStart);

  let phase: 'betting' | 'spinning' | 'result' = 'betting';
  let phaseRemaining = 0;

  if (elapsed < ROULETTE_BETTING_MS) {
    phase = 'betting';
    phaseRemaining = Math.ceil((ROULETTE_BETTING_MS - elapsed) / 1000);
  } else if (elapsed < ROULETTE_BETTING_MS + ROULETTE_SPINNING_MS) {
    phase = 'spinning';
    phaseRemaining = Math.ceil((ROULETTE_BETTING_MS + ROULETTE_SPINNING_MS - elapsed) / 1000);
  } else {
    phase = 'result';
    phaseRemaining = Math.ceil((ROULETTE_ROUND_MS - elapsed) / 1000);
  }

  const timeRemaining = Math.max(0, Math.ceil((ROULETTE_ROUND_MS - elapsed) / 1000));
  const winningNumber = getRouletteNumberForRound(roundIndex);
  const winningColor = getRouletteNumberColor(winningNumber);

  const d = new Date(nowMs + offsetMinutes * 60000);
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
  const roundSuffix = String(roundIndex % 10000).padStart(4, '0');
  const roundId = `RL${ymd}${roundSuffix}`;

  const history: Array<{ roundId: string; number: number; color: 'green' | 'red' | 'black' }> = [];
  for (let i = 1; i <= 50; i++) {
    const prevIdx = roundIndex - i;
    const num = getRouletteNumberForRound(prevIdx);
    const prevD = new Date(prevIdx * ROULETTE_ROUND_MS + offsetMinutes * 60000);
    const prevYmd = `${prevD.getUTCFullYear()}${String(prevD.getUTCMonth() + 1).padStart(2, '0')}${String(
      prevD.getUTCDate()
    ).padStart(2, '0')}`;
    history.push({
      roundId: `RL${prevYmd}${String(prevIdx % 10000).padStart(4, '0')}`,
      number: num,
      color: getRouletteNumberColor(num)
    });
  }

  return {
    roundId,
    phase,
    timeRemaining,
    phaseRemaining,
    winningNumber,
    winningColor,
    history,
    serverNow: nowMs
  };
}

export function computeRouletteBetPayout(
  numbers: number[],
  winningNumber: number,
  amount: number,
  payoutMultiplier: number
): number {
  if (!numbers.includes(winningNumber)) return 0;
  return +(amount * payoutMultiplier).toFixed(2);
}



