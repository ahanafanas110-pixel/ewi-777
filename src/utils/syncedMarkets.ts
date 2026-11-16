import type {
  AviatorServerState,
  BinaryMarketConfig,
  BinaryMarketQuote,
  Candle,
  D5Mode,
  D5Result,
  K3Mode,
  K3Result,
  MarketControlMode,
  WinGoMode
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
  if (r < 0.04) return +(1.02 + rng() * 0.09).toFixed(2);
  if (r > 0.9985) {
    const mega = 120 + rng() * (AVIATOR_MAX_MULTIPLIER - 120);
    return +Math.min(AVIATOR_MAX_MULTIPLIER, mega).toFixed(2);
  }
  const raw = 0.97 / (1 - Math.min(r, 0.9999));
  return +Math.min(AVIATOR_MAX_MULTIPLIER, Math.max(1.06, raw)).toFixed(2);
}

function aviatorFlyDurationMs(crashPoint: number): number {
  if (crashPoint <= 1.02) return 400;
  // Growth curve: mult(t) = exp(0.085 * tSec)
  const rawMs = Math.round((Math.log(crashPoint) / 0.085) * 1000);
  return Math.max(600, Math.min(115000, rawMs));
}

export function getSyncedAviatorState(nowMs = Date.now()): AviatorServerState {
  const hourMs = 3600000;
  const hourBucket = Math.floor(nowMs / hourMs);
  const hourStart = hourBucket * hourMs;

  let cursor = hourStart;
  let seq = 0;
  let currentRoundCrash = 1.5;
  let currentRoundStart = hourStart;
  let currentFlyMs = 4500;
  const completedCrashes: number[] = [];

  // Walk hour deterministically (<250 steps, <0.05ms) so every round flies full duration
  while (seq < 600) {
    const crashPt = getSyncedAviatorCrashPoint(hourBucket, seq);
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

  // Backfill remaining crash history from previous hour if near top of hour
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

  return {
    roundId: `AV${roundSuffix}`,
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

  const warmStartBucket = currentBucket - 48;
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

    const visibleCandles = allCandles.slice(-28);
    const firstOpen = visibleCandles[0]?.open || prevClose;
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

export function generateSyncedMinesBoard(roundId: string, minesCount: number, gridSize = 25): Set<number> {
  const rng = createSeededRng(`mines:${roundId}:${minesCount}`);
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
  revealStep: number
): 'AUTO' | 'FORCE_BOMB' | 'FORCE_SAFE' {
  if (!controlMode || controlMode === 'AUTO') return 'AUTO';
  const threshold = Math.max(100, poolAvgBet);
  const isHighBet = activeBetAmt >= threshold;

  if (controlMode === 'HIGH_BET_LOSS') {
    if (isHighBet && revealStep >= 2) return 'FORCE_BOMB';
    if (!isHighBet && revealStep <= 4) return 'FORCE_SAFE';
    return 'AUTO';
  }
  if (controlMode === 'HIGH_BET_WIN') {
    if (isHighBet) return 'FORCE_SAFE';
    return 'AUTO';
  }
  if (controlMode === 'LOW_BET_WIN') {
    if (!isHighBet) return 'FORCE_SAFE';
    if (isHighBet && revealStep >= 2) return 'FORCE_BOMB';
    return 'AUTO';
  }
  if (controlMode === 'LOW_BET_LOSS') {
    if (!isHighBet && revealStep >= 2) return 'FORCE_BOMB';
    if (isHighBet && revealStep <= 4) return 'FORCE_SAFE';
    return 'AUTO';
  }
  return 'AUTO';
}
