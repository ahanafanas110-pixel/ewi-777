import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, RefreshCw, Shuffle, History } from 'lucide-react';
import { MinesGameLogo, Ewi777Logo } from '../components/BrandLogos';
import {
  generateSyncedMinesBoard,
  getSyncedMinesEpochInfo,
  resolveMinesTileControl,
  formatTimeWithOffset
} from '../utils/syncedMarkets';
import minesBombImg from '../assets/images/mines_bomb_icon_1794905505739.jpg';
import minesDiamondImg from '../assets/images/mines_diamond_icon_1794905505535.jpg';

const GRID_SIZE = 25;
const MINE_PRESETS = [1, 3, 5, 10, 15, 20];
const BET_PRESETS = [10, 50, 100, 500, 1000];

function computeMinesMultiplier(totalMines: number, safeOpened: number): number {
  if (safeOpened <= 0) return 1.0;
  let prob = 1;
  for (let i = 0; i < safeOpened; i++) {
    prob *= (GRID_SIZE - totalMines - i) / (GRID_SIZE - i);
  }
  const fair = 0.97 / Math.max(0.0001, prob);
  return +Math.min(500, Math.max(1.03, fair)).toFixed(2);
}

interface MinesHistoryItem {
  id: string;
  minesCount: number;
  safeHits: number;
  bet: number;
  multiplier: number;
  payout: number;
  won: boolean;
  time: string;
}

export const MinesGame: React.FC = () => {
  const {
    user,
    placeMinesBet,
    cashOutMinesWin,
    setActiveTab,
    showToast,
    adminSettings,
    marketPools,
    syncServerDataNow
  } = useApp();

  const [betAmount, setBetAmount] = useState<string>('50');
  const [minesCount, setMinesCount] = useState<number>(3);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [roundEnded, setRoundEnded] = useState<'won' | 'lost' | null>(null);
  const [mineIndices, setMineIndices] = useState<Set<number>>(new Set());
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hitMineIdx, setHitMineIdx] = useState<number | null>(null);
  const [activeBetAmt, setActiveBetAmt] = useState<number>(0);
  const [activeRoundSeq, setActiveRoundSeq] = useState<number>(0);
  const [history, setHistory] = useState<MinesHistoryItem[]>([]);
  const [minesEpoch, setMinesEpoch] = useState(() => getSyncedMinesEpochInfo());
  const [activeRoundId, setActiveRoundId] = useState<string>(() => getSyncedMinesEpochInfo().roundId);

  const tzOffset = adminSettings.timezoneOffsetMinutes ?? 360;

  useEffect(() => {
    const t = setInterval(() => {
      setMinesEpoch(getSyncedMinesEpochInfo());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const safeHits = revealedIndices.size;
  const currentMultiplier = computeMinesMultiplier(minesCount, safeHits);
  const nextMultiplier = computeMinesMultiplier(minesCount, safeHits + 1);
  const currentCashoutValue = +(activeBetAmt * currentMultiplier).toFixed(2);
  const maxSafeTiles = GRID_SIZE - minesCount;

  const startRound = () => {
    const amt = Number(betAmount);
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum Mines bet is ৳10');
      return;
    }
    const roundSeqBefore = user.minesRoundSeq || 0;
    const res = placeMinesBet(amt, minesCount);
    if (!res.success) {
      if (res.message) showToast(res.message);
      return;
    }

    const epoch = getSyncedMinesEpochInfo();
    const uniqueNonce = `${epoch.roundId}_${roundSeqBefore + 1}_${Date.now()}`;
    const bombs = generateSyncedMinesBoard(epoch.roundId, minesCount, GRID_SIZE, uniqueNonce);

    setActiveRoundId(epoch.roundId);
    setActiveRoundSeq(roundSeqBefore);
    setMineIndices(bombs);
    setRevealedIndices(new Set());
    setHitMineIdx(null);
    setRoundEnded(null);
    setActiveBetAmt(amt);
    setGameActive(true);
  };

  const finishCashOut = (hitsCount: number, mult: number) => {
    const payout = +(activeBetAmt * mult).toFixed(2);
    cashOutMinesWin(activeBetAmt, payout, mult, minesCount);
    setGameActive(false);
    setRoundEnded('won');
    setHistory((prev) => [
      {
        id: `mn_${Date.now()}`,
        minesCount,
        safeHits: hitsCount,
        bet: activeBetAmt,
        multiplier: mult,
        payout,
        won: true,
        time: formatTimeWithOffset(Date.now(), tzOffset)
      },
      ...prev.slice(0, 14)
    ]);
  };

  const handleTileClick = (idx: number) => {
    if (!gameActive || revealedIndices.has(idx)) return;

    const pool = marketPools?.[`mines_${minesCount}_live`];
    const poolAvgBet = pool && (pool.betCount || 0) > 0 ? pool.totalAmount / (pool.betCount || 1) : 100;
    const revealStep = revealedIndices.size + 1;

    const tileControl = resolveMinesTileControl(
      adminSettings.gameControlModes?.mines || 'AUTO',
      activeBetAmt,
      poolAvgBet,
      revealStep,
      adminSettings.minesPattern || 'RANDOM',
      activeRoundSeq
    );

    let effectiveMines = mineIndices;
    let isBombTile = mineIndices.has(idx);

    if (tileControl === 'FORCE_BOMB' && !isBombTile) {
      // Swap an existing unrevealed mine into idx so total mines count remains accurate
      const nextMines = new Set(mineIndices);
      let swapOut: number | null = null;
      for (const m of nextMines) {
        if (!revealedIndices.has(m) && m !== idx) {
          swapOut = m;
          break;
        }
      }
      if (swapOut !== null) {
        nextMines.delete(swapOut);
        nextMines.add(idx);
        effectiveMines = nextMines;
        setMineIndices(nextMines);
        isBombTile = true;
      }
    } else if (tileControl === 'FORCE_SAFE' && isBombTile) {
      // Move the bomb at idx to an unrevealed safe tile so total mines count stays accurate
      const nextMines = new Set(mineIndices);
      let swapIn: number | null = null;
      for (let i = 0; i < GRID_SIZE; i++) {
        if (!revealedIndices.has(i) && i !== idx && !nextMines.has(i)) {
          swapIn = i;
          break;
        }
      }
      if (swapIn !== null) {
        nextMines.delete(idx);
        nextMines.add(swapIn);
        effectiveMines = nextMines;
        setMineIndices(nextMines);
        isBombTile = false;
      }
    }

    if (isBombTile || effectiveMines.has(idx)) {
      setHitMineIdx(idx);
      setGameActive(false);
      setRoundEnded('lost');
      showToast('BOOM! You hit a hidden mine.');
      setHistory((prev) => [
        {
          id: `mn_${Date.now()}`,
          minesCount,
          safeHits,
          bet: activeBetAmt,
          multiplier: 0,
          payout: 0,
          won: false,
          time: formatTimeWithOffset(Date.now(), tzOffset)
        },
        ...prev.slice(0, 14)
      ]);
      return;
    }

    const nextRevealed = new Set(revealedIndices);
    nextRevealed.add(idx);
    setRevealedIndices(nextRevealed);

    if (nextRevealed.size >= maxSafeTiles) {
      const fullMult = computeMinesMultiplier(minesCount, nextRevealed.size);
      finishCashOut(nextRevealed.size, fullMult);
    }
  };

  const handleRandomTile = () => {
    if (!gameActive) return;
    const unrevealed: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      if (!revealedIndices.has(i)) unrevealed.push(i);
    }
    if (unrevealed.length === 0) return;
    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    handleTileClick(pick);
  };

  return (
    <div className="min-h-screen bg-[#141008] text-white pb-16">
      {/* Luxury Gold Vault Header */}
      <div className="bg-gradient-to-r from-[#78350F] via-[#B45309] to-[#D97706] px-4 py-2.5 relative flex items-center justify-between min-h-[62px] shadow-lg sticky top-0 z-30 border-b border-amber-400/25">
        <button
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="relative z-10 p-1.5 -ml-1 rounded-full hover:bg-white/15 active:scale-95 transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          <Ewi777Logo height={56} logoUrl={adminSettings.appLogoUrl} />
        </div>

        <button
          onClick={() => {
            syncServerDataNow();
            showToast('Wallet balance synced');
          }}
          className="relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/35 backdrop-blur-xs border border-amber-300/30 text-xs font-black tabular-nums active:scale-95"
        >
          <span>৳{user.balance.toFixed(2)}</span>
          <RefreshCw className="w-3 h-3 text-amber-300" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Game Mode Strip */}
        <div className="flex items-center justify-between bg-[#1F180D] rounded-2xl px-3.5 py-2 border border-amber-500/25">
          <div className="flex items-center gap-2">
            <MinesGameLogo size={22} />
            <span className="font-black text-xs tracking-wider italic text-amber-100">MINES 777</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold font-mono">
            <span className="text-emerald-400">#{gameActive ? activeRoundId : minesEpoch.roundId}</span>
            <span className="text-amber-300/80 uppercase">
              • 5×5 ({minesCount} Mines) • {minesEpoch.secondsRemaining}s
            </span>
          </div>
        </div>

        {/* Live Multiplier Bar */}
        <div className="grid grid-cols-3 gap-2 bg-[#1F180D] rounded-2xl p-3 border border-amber-500/25 text-center tabular-nums">
          <div>
            <div className="text-[10px] font-bold text-amber-200/70 uppercase">Diamonds</div>
            <div className="text-sm font-black text-emerald-400">
              {safeHits} / {maxSafeTiles}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-200/70 uppercase">Next Tile</div>
            <div className="text-sm font-black text-amber-300 font-mono">
              {nextMultiplier.toFixed(2)}x
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-200/70 uppercase">Current Win</div>
            <div className="text-sm font-black text-white font-mono">
              ৳{gameActive && safeHits > 0 ? currentCashoutValue.toFixed(2) : '0.00'}
            </div>
          </div>
        </div>

        {/* 5x5 Mines Vault Grid */}
        <div className="bg-[#1C160B] rounded-3xl p-3.5 border border-amber-500/30 shadow-[0_0_30px_rgba(217,119,6,0.18)]">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: GRID_SIZE }).map((_, idx) => {
              const isRevealed = revealedIndices.has(idx);
              const isMine = mineIndices.has(idx);
              const isHitMine = hitMineIdx === idx;
              const showAll = roundEnded !== null;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!gameActive || isRevealed}
                  onClick={() => handleTileClick(idx)}
                  className={`aspect-square rounded-2xl flex items-center justify-center overflow-hidden p-1.5 transition-all duration-150 select-none ${
                    isHitMine
                      ? 'bg-gradient-to-br from-rose-600 to-red-900 border-2 border-amber-300 shadow-lg scale-95'
                      : isRevealed
                      ? 'bg-gradient-to-br from-emerald-500/25 to-emerald-800/40 border border-emerald-400/70 shadow-inner'
                      : showAll && isMine
                      ? 'bg-rose-950/80 border border-rose-500/40 opacity-90'
                      : showAll && !isMine
                      ? 'bg-emerald-950/50 border border-emerald-500/25 opacity-60'
                      : gameActive
                      ? 'bg-gradient-to-b from-[#3B2E18] to-[#231A0C] hover:from-[#4E3D20] border border-amber-400/35 shadow-md active:scale-92 cursor-pointer'
                      : 'bg-[#251D0F] border border-amber-500/15 opacity-80'
                  }`}
                >
                  {isHitMine || (showAll && isMine) ? (
                    <img
                      src={minesBombImg}
                      alt="Mine Bomb"
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover rounded-xl ${isHitMine ? 'animate-pulse' : 'opacity-90'}`}
                    />
                  ) : isRevealed || (showAll && !isMine) ? (
                    <img
                      src={minesDiamondImg}
                      alt="Gem"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.75)]"
                    />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-amber-400/30 ring-2 ring-amber-300/20" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bet & Mine Controls */}
        <div className="bg-[#1C160B] rounded-3xl p-4 border border-amber-500/25 space-y-3.5">
          {/* Bet Amount */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-amber-200">Bet Amount (৳) • Min ৳10</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={gameActive}
                  onClick={() => setBetAmount(String(Math.max(10, Math.round((Number(betAmount) || 50) / 2))))}
                  className="px-2 py-0.5 rounded-lg bg-white/10 text-[10px] font-black text-amber-100 disabled:opacity-40"
                >
                  1/2
                </button>
                <button
                  type="button"
                  disabled={gameActive}
                  onClick={() => setBetAmount(String(Math.min(50000, Math.round((Number(betAmount) || 50) * 2))))}
                  className="px-2 py-0.5 rounded-lg bg-white/10 text-[10px] font-black text-amber-100 disabled:opacity-40"
                >
                  2X
                </button>
              </div>
            </div>
            <input
              type="number"
              min={10}
              disabled={gameActive}
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-[#141008] border border-amber-500/35 rounded-2xl px-4 py-3 text-sm font-black font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-60"
            />
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {BET_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={gameActive}
                  onClick={() => setBetAmount(String(amt))}
                  className={`py-1.5 rounded-xl text-[11px] font-black border transition-all disabled:opacity-40 ${
                    Number(betAmount) === amt
                      ? 'bg-gradient-to-r from-[#D97706] to-[#F59E0B] border-amber-300 text-slate-950'
                      : 'bg-white/5 border-white/10 text-amber-100'
                  }`}
                >
                  ৳{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Mines Count */}
          <div>
            <div className="text-xs font-bold text-amber-200 mb-1.5">Number of Mines</div>
            <div className="grid grid-cols-6 gap-1.5">
              {MINE_PRESETS.map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  disabled={gameActive}
                  onClick={() => setMinesCount(cnt)}
                  className={`py-2 rounded-xl text-xs font-black border transition-all disabled:opacity-40 ${
                    minesCount === cnt
                      ? 'bg-amber-400 border-amber-300 text-slate-950'
                      : 'bg-white/5 border-white/10 text-slate-200'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          {!gameActive ? (
            <button
              type="button"
              onClick={startRound}
              className="w-full min-h-[50px] py-3.5 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-sm shadow-lg active:scale-98 transition-all"
            >
              Start Game (Bet ৳{Math.max(10, Number(betAmount) || 10)})
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleRandomTile}
                className="py-3.5 rounded-full bg-white/10 border border-amber-400/30 text-amber-100 font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Pick</span>
              </button>
              <button
                type="button"
                disabled={safeHits < 1}
                onClick={() => finishCashOut(safeHits, currentMultiplier)}
                className="col-span-2 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm shadow-lg active:scale-98 disabled:opacity-45"
              >
                {safeHits < 1
                  ? 'Tap a Tile to Reveal'
                  : `Cash Out ৳${currentCashoutValue.toFixed(2)} (${currentMultiplier.toFixed(2)}x)`}
              </button>
            </div>
          )}
        </div>

        {/* Recent Mines History */}
        <div className="bg-[#1C160B] rounded-3xl p-4 border border-amber-500/20 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-amber-100">
            <History className="w-4 h-4 text-amber-400" />
            <span>Recent Rounds</span>
          </div>
          {history.length === 0 ? (
            <div className="py-4 text-center text-xs text-amber-200/60">
              Tap Start Game and uncover emerald diamonds while avoiding hidden mines.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs tabular-nums"
                >
                  <div>
                    <div className="font-bold text-white">
                      {item.minesCount} Mines · {item.safeHits} Gems
                    </div>
                    <div className="text-[10px] text-amber-200/60">{item.time}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-black font-mono ${item.won ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.won ? `+৳${item.payout.toFixed(2)}` : `-৳${item.bet.toFixed(2)}`}
                    </div>
                    <div className="text-[10px] text-amber-300 font-mono">
                      {item.won ? `${item.multiplier.toFixed(2)}x` : 'BOOM'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
