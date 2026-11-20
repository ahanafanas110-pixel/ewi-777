import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  BarChart3,
  Check,
  Clock,
  Heart,
  Menu,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  Undo2,
  X
} from 'lucide-react';
import { CustomerServiceLogo } from '../components/BrandLogos';
import {
  ROULETTE_RED_NUMBERS,
  ROULETTE_WHEEL_ORDER,
  getEwiRouletteState,
  getRouletteNumberColor
} from '../utils/syncedMarkets';
import { RouletteBetType } from '../types';

interface StagedSpot {
  key: string;
  betType: RouletteBetType;
  label: string;
  numbers: number[];
  payoutMultiplier: number;
  amount: number;
}

const CHIPS = [10, 20, 50, 100, 500];

// Standard French Call Bet Wheel Sectors
const VOISINS_NUMBERS = [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
const TIER_NUMBERS = [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];
const ORPHELINS_NUMBERS = [1, 20, 14, 31, 9, 17, 34, 6];
const ZERO_GAME_NUMBERS = [12, 35, 3, 26, 0, 32, 15];

export const EwiRoulette: React.FC = () => {
  const {
    user,
    adminSettings,
    rouletteBets,
    placeRouletteBet,
    settleRouletteRound,
    setActiveTab,
    showToast
  } = useApp();

  const tzOffset = adminSettings.timezoneOffsetMinutes ?? 360;
  const [gameState, setGameState] = useState(() => getEwiRouletteState(Date.now(), tzOffset));
  const [selectedChip, setSelectedChip] = useState<number>(20);
  const [stagedSpots, setStagedSpots] = useState<StagedSpot[]>([]);
  const [undoStack, setUndoStack] = useState<StagedSpot[][]>([]);
  const [lastPlacedSpots, setLastPlacedSpots] = useState<StagedSpot[]>([]);
  const [viewTab, setViewTab] = useState<'table' | 'racetrack' | 'favourites'>('table');
  const [statsOpen, setStatsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [favourites, setFavourites] = useState<Array<{ id: string; name: string; spots: StagedSpot[] }>>(() => {
    try {
      const raw = localStorage.getItem('ewi777_roulette_favs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settledRoundRef = useRef<string>('');
  const prevRoundIdRef = useRef<string>(gameState.roundId);
  const wheelAngleRef = useRef<number>(0);
  const ballAngleRef = useRef<number>(0);

  // Sync live clock & settle results
  useEffect(() => {
    const tick = () => {
      const next = getEwiRouletteState(Date.now(), tzOffset);
      setGameState(next);

      if (prevRoundIdRef.current !== next.roundId) {
        prevRoundIdRef.current = next.roundId;
        setStagedSpots([]);
        setUndoStack([]);
      }

      if (next.phase === 'result' && settledRoundRef.current !== next.roundId) {
        settledRoundRef.current = next.roundId;
        settleRouletteRound(next.roundId, next.winningNumber);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [tzOffset, settleRouletteRound]);

  // Smooth Canvas 37-Pocket European Wheel Animation
  useEffect(() => {
    let rafId = 0;
    const pocketCount = ROULETTE_WHEEL_ORDER.length;
    const pocketArc = (Math.PI * 2) / pocketCount;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const cx = w / 2;
          const cy = h / 2;
          const outerR = Math.min(cx, cy) - 6;

          const winIdx = Math.max(0, ROULETTE_WHEEL_ORDER.indexOf(gameState.winningNumber));
          const targetRelAngle = winIdx * pocketArc + pocketArc / 2;

          if (gameState.phase === 'betting') {
            wheelAngleRef.current += 0.008;
            ballAngleRef.current -= 0.014;
          } else if (gameState.phase === 'spinning') {
            const speed = Math.max(0.02, (gameState.phaseRemaining / 6) * 0.14);
            wheelAngleRef.current += speed * 0.45;
            const desiredBall = wheelAngleRef.current + targetRelAngle;
            const diff = Math.atan2(Math.sin(desiredBall - ballAngleRef.current), Math.cos(desiredBall - ballAngleRef.current));
            ballAngleRef.current += gameState.phaseRemaining <= 2 ? diff * 0.14 : -0.18;
          } else {
            wheelAngleRef.current += 0.004;
            ballAngleRef.current = wheelAngleRef.current + targetRelAngle;
          }

          ctx.clearRect(0, 0, w, h);

          // Outer brushed slate-cyan bezel
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
          ctx.fillStyle = '#0F172A';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#0891B2';
          ctx.stroke();

          // Ball track rim
          ctx.beginPath();
          ctx.arc(cx, cy, outerR - 10, 0, Math.PI * 2);
          ctx.fillStyle = '#F8FAFC';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#CBD5E1';
          ctx.stroke();

          // 37 Pockets
          const pocketOuterR = outerR - 20;
          const pocketInnerR = outerR * 0.44;
          for (let i = 0; i < pocketCount; i++) {
            const num = ROULETTE_WHEEL_ORDER[i];
            const startA = wheelAngleRef.current + i * pocketArc - Math.PI / 2;
            const endA = startA + pocketArc;
            const color = getRouletteNumberColor(num);

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(startA) * pocketInnerR, cy + Math.sin(startA) * pocketInnerR);
            ctx.arc(cx, cy, pocketOuterR, startA, endA);
            ctx.arc(cx, cy, pocketInnerR, endA, startA, true);
            ctx.closePath();

            ctx.fillStyle =
              color === 'green' ? '#059669' : color === 'red' ? '#DC2626' : '#1E293B';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#FDE68A';
            ctx.stroke();

            // Highlight winning pocket in result phase
            if (gameState.phase === 'result' && num === gameState.winningNumber) {
              ctx.save();
              ctx.fillStyle = 'rgba(253, 224, 71, 0.32)';
              ctx.fill();
              ctx.restore();
            }

            // Pocket Number Text
            const midA = (startA + endA) / 2;
            const textR = pocketOuterR - 11;
            ctx.save();
            ctx.translate(cx + Math.cos(midA) * textR, cy + Math.sin(midA) * textR);
            ctx.rotate(midA + Math.PI / 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 8.5px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(num), 0, 0);
            ctx.restore();
          }

          // Center turret
          ctx.beginPath();
          ctx.arc(cx, cy, pocketInnerR, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#0891B2';
          ctx.stroke();

          // Turret cross spokes
          for (let k = 0; k < 4; k++) {
            const a = wheelAngleRef.current + (k * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * (pocketInnerR - 4), cy + Math.sin(a) * (pocketInnerR - 4));
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Ivory Roulette Ball
          const ballR =
            gameState.phase === 'betting'
              ? outerR - 14
              : gameState.phase === 'spinning' && gameState.phaseRemaining > 2
              ? outerR - 15
              : (pocketOuterR + pocketInnerR) * 0.56;
          const bAngle = ballAngleRef.current - Math.PI / 2;
          const bx = cx + Math.cos(bAngle) * ballR;
          const by = cy + Math.sin(bAngle) * ballR;

          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#0F172A';
          ctx.stroke();
        }
      }
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [gameState.phase, gameState.phaseRemaining, gameState.winningNumber]);

  const currentRoundPlacedBets = useMemo(
    () => rouletteBets.filter((b) => b.roundId === gameState.roundId && b.userId === user.id),
    [rouletteBets, gameState.roundId, user.id]
  );

  const totalStagedAmount = useMemo(
    () => stagedSpots.reduce((s, x) => s + x.amount, 0),
    [stagedSpots]
  );

  const totalActiveRoundAmount = useMemo(
    () => currentRoundPlacedBets.reduce((s, x) => s + x.amount, 0),
    [currentRoundPlacedBets]
  );

  const roundWonAmount = useMemo(
    () =>
      currentRoundPlacedBets
        .filter((b) => b.status === 'won')
        .reduce((s, b) => s + (b.winAmount || 0), 0),
    [currentRoundPlacedBets]
  );

  const stageSpot = (
    key: string,
    betType: RouletteBetType,
    label: string,
    numbers: number[],
    payoutMultiplier: number
  ) => {
    if (gameState.phase !== 'betting') {
      showToast('Betting closed for current spin');
      return;
    }
    setUndoStack((prev) => [...prev.slice(-15), stagedSpots]);
    setStagedSpots((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        return prev.map((s) =>
          s.key === key ? { ...s, amount: s.amount + selectedChip } : s
        );
      }
      return [
        ...prev,
        { key, betType, label, numbers, payoutMultiplier, amount: selectedChip }
      ];
    });
  };

  const handleStageCallGroup = (name: string, nums: number[]) => {
    if (gameState.phase !== 'betting') {
      showToast('Betting closed for current spin');
      return;
    }
    setUndoStack((prev) => [...prev.slice(-15), stagedSpots]);
    setStagedSpots((prev) => {
      const next = [...prev];
      for (const n of nums) {
        const key = `straight_${n}`;
        const idx = next.findIndex((s) => s.key === key);
        if (idx >= 0) {
          next[idx] = { ...next[idx], amount: next[idx].amount + selectedChip };
        } else {
          next.push({
            key,
            betType: 'straight',
            label: `#${n}`,
            numbers: [n],
            payoutMultiplier: 36,
            amount: selectedChip
          });
        }
      }
      return next;
    });
    showToast(`${name} (${nums.length} numbers) staged`);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setStagedSpots(prev);
  };

  const handleClear = () => {
    if (stagedSpots.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-15), stagedSpots]);
    setStagedSpots([]);
  };

  const handleDouble = () => {
    if (stagedSpots.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-15), stagedSpots]);
    setStagedSpots((prev) => prev.map((s) => ({ ...s, amount: s.amount * 2 })));
  };

  const handleRepeat = () => {
    if (lastPlacedSpots.length === 0) {
      showToast('No previous round bets to repeat');
      return;
    }
    if (gameState.phase !== 'betting') {
      showToast('Wait for next betting window');
      return;
    }
    setUndoStack((prev) => [...prev.slice(-15), stagedSpots]);
    setStagedSpots(lastPlacedSpots.map((s) => ({ ...s })));
  };

  const handleConfirmBets = () => {
    if (gameState.phase !== 'betting') {
      showToast('Betting closed for this spin');
      return;
    }
    if (stagedSpots.length === 0) {
      showToast('Tap table numbers or outside bets first');
      return;
    }
    if (!user.isLoggedIn) {
      showToast('Please log in to place bets');
      return;
    }
    if (totalStagedAmount > user.balance) {
      showToast('Insufficient balance');
      return;
    }

    let placedCount = 0;
    for (const spot of stagedSpots) {
      const res = placeRouletteBet(
        gameState.roundId,
        spot.betType,
        spot.label,
        spot.numbers,
        spot.amount,
        spot.payoutMultiplier
      );
      if (res.success) {
        placedCount += 1;
      } else {
        showToast(res.message);
        break;
      }
    }

    if (placedCount > 0) {
      setLastPlacedSpots(stagedSpots);
      setStagedSpots([]);
      setUndoStack([]);
      showToast(`Placed ${placedCount} roulette bet(s) on ${gameState.roundId}`);
    }
  };

  const handleSaveFavourite = () => {
    const source = stagedSpots.length > 0 ? stagedSpots : lastPlacedSpots;
    if (source.length === 0) {
      showToast('Place or stage bets first to save');
      return;
    }
    const total = source.reduce((s, x) => s + x.amount, 0);
    const entry = {
      id: `fav_${Date.now()}`,
      name: `Pattern (${source.length} spots · ৳${total})`,
      spots: source
    };
    const next = [entry, ...favourites].slice(0, 8);
    setFavourites(next);
    localStorage.setItem('ewi777_roulette_favs', JSON.stringify(next));
    showToast('Saved to Favourites');
  };

  const getSpotAmount = (key: string) => {
    const staged = stagedSpots.find((s) => s.key === key)?.amount || 0;
    const placed = currentRoundPlacedBets
      .filter((b) => `${b.betType}_${b.label}` === key || (b.betType === 'straight' && `straight_${b.numbers[0]}` === key))
      .reduce((s, b) => s + b.amount, 0);
    return { staged, placed };
  };

  const statsSummary = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 0; i <= 36; i++) counts[i] = 0;
    let red = 0;
    let black = 0;
    let green = 0;
    let even = 0;
    let odd = 0;
    gameState.history.forEach((h) => {
      counts[h.number] = (counts[h.number] || 0) + 1;
      if (h.color === 'green') green++;
      else if (h.color === 'red') red++;
      else black++;
      if (h.number !== 0) {
        if (h.number % 2 === 0) even++;
        else odd++;
      }
    });
    const sorted = Object.entries(counts)
      .map(([num, c]) => ({ num: Number(num), count: c }))
      .sort((a, b) => b.count - a.count);
    return {
      hot: sorted.slice(0, 4),
      cold: sorted.slice(-4).reverse(),
      total: Math.max(1, gameState.history.length),
      red,
      black,
      green,
      even,
      odd
    };
  }, [gameState.history]);

  // Build 12 rows x 3 columns for mobile-friendly vertical European table
  const rows = useMemo(() => {
    const out: number[][] = [];
    for (let r = 0; r < 12; r++) {
      const base = r * 3;
      out.push([base + 1, base + 2, base + 3]);
    }
    return out;
  }, []);

  const col1Nums = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 3 + 1), []);
  const col2Nums = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 3 + 2), []);
  const col3Nums = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 3 + 3), []);

  const goTab = (tab: string, hash: string) => {
    setActiveTab(tab);
    window.location.hash = hash;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-10">
      {/* Light Mode Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => goTab('casino', '#/casino')}
            className="p-1.5 -ml-1 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95"
            aria-label="Back to Casino"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="min-w-0">
            <div className="font-black text-sm text-slate-900 truncate">EWI ROULETTE</div>
            <div className="text-[10px] font-mono font-bold text-cyan-700 truncate">
              {gameState.roundId} · Bucharest Auto
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-slate-100 border border-slate-200">
            <span className="text-[10px] font-black text-cyan-700">৳</span>
            <span className="text-xs font-extrabold tabular-nums text-slate-900 max-w-[64px] truncate">
              {user.balance.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => goTab('deposit', '#/deposit')}
              className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center active:scale-90"
              aria-label="Deposit"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 flex items-center justify-center active:scale-95"
            aria-label="Statistics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => goTab('customer-service', '#/customer-service')}
            className="p-0.5 rounded-full bg-cyan-50 border border-cyan-200 active:scale-95"
            aria-label="Customer Care"
          >
            <CustomerServiceLogo size={26} />
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95"
            aria-label="Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="px-3 pt-3 space-y-3">
        {/* Top Wheel Studio + Status Card */}
        <div className="bg-white rounded-3xl p-3 border border-cyan-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                gameState.phase === 'betting'
                  ? 'bg-emerald-100 text-emerald-800'
                  : gameState.phase === 'spinning'
                  ? 'bg-cyan-100 text-cyan-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {gameState.phase === 'betting'
                  ? `Place Bets · ${gameState.phaseRemaining}s`
                  : gameState.phase === 'spinning'
                  ? `No More Bets · ${gameState.phaseRemaining}s`
                  : `Winning #${gameState.winningNumber}`}
              </span>
            </span>

            {totalActiveRoundAmount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-black tabular-nums">
                Active: ৳{totalActiveRoundAmount}
              </span>
            )}
          </div>

          {/* Canvas Wheel */}
          <div className="relative flex items-center justify-center py-1">
            <canvas ref={canvasRef} width={220} height={220} className="w-[210px] h-[210px] block" />

            {/* Center Hub Status */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-white/95 border-2 border-cyan-500 shadow-md flex flex-col items-center justify-center">
                {gameState.phase === 'result' ? (
                  <>
                    <span
                      className={`text-lg font-black leading-none ${
                        gameState.winningColor === 'green'
                          ? 'text-emerald-600'
                          : gameState.winningColor === 'red'
                          ? 'text-rose-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {gameState.winningNumber}
                    </span>
                    <span className="text-[9px] font-black uppercase text-slate-500">
                      {gameState.winningColor}
                    </span>
                  </>
                ) : gameState.phase === 'spinning' ? (
                  <span className="text-[10px] font-black uppercase text-cyan-700">SPIN</span>
                ) : (
                  <>
                    <span className="text-base font-mono font-black text-cyan-800 tabular-nums leading-none">
                      {gameState.phaseRemaining}s
                    </span>
                    <span className="text-[8px] font-bold uppercase text-slate-400 mt-0.5">OPEN</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {gameState.phase === 'result' && roundWonAmount > 0 && (
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center text-xs font-black">
              You won ৳{roundWonAmount.toFixed(2)} on #{gameState.winningNumber}!
            </div>
          )}

          {/* Recent Winning Numbers Strip */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase mr-1 flex-shrink-0">
              Last:
            </span>
            {gameState.history.slice(0, 14).map((item, idx) => (
              <span
                key={item.roundId}
                className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center text-white flex-shrink-0 tabular-nums ${
                  item.color === 'green'
                    ? 'bg-emerald-600'
                    : item.color === 'red'
                    ? 'bg-rose-600'
                    : 'bg-slate-800'
                } ${idx === 0 ? 'ring-2 ring-cyan-500 ring-offset-1' : 'opacity-90'}`}
              >
                {item.number}
              </span>
            ))}
          </div>
        </div>

        {/* Mode Tabs: Table / Racetrack / Favourites */}
        <div className="bg-white rounded-2xl p-1 border border-slate-200 grid grid-cols-3 gap-1 shadow-2xs">
          {(
            [
              { id: 'table', label: 'Table' },
              { id: 'racetrack', label: 'Racetrack' },
              { id: 'favourites', label: 'Favourites' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setViewTab(t.id)}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                viewTab === t.id
                  ? 'bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TABLE VIEW */}
        {viewTab === 'table' && (
          <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-xs space-y-2">
            {/* Zero */}
            {(() => {
              const { staged, placed } = getSpotAmount('straight_0');
              const isWin = gameState.phase === 'result' && gameState.winningNumber === 0;
              return (
                <button
                  type="button"
                  onClick={() => stageSpot('straight_0', 'straight', '#0', [0], 36)}
                  className={`w-full py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-sm relative flex items-center justify-center shadow-xs active:scale-99 ${
                    isWin ? 'ring-4 ring-amber-400' : ''
                  }`}
                >
                  <span>0</span>
                  {(staged > 0 || placed > 0) && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-black tabular-nums">
                      ৳{staged + placed}
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Main Grid + Outside Left Strip */}
            <div className="grid grid-cols-4 gap-1.5">
              {/* Left Column Outside Bets (1-18, EVEN, RED, BLACK, ODD, 19-36) */}
              <div className="flex flex-col gap-1.5">
                {[
                  {
                    key: 'low_1-18',
                    type: 'low' as RouletteBetType,
                    label: '1-18',
                    nums: Array.from({ length: 18 }, (_, i) => i + 1),
                    bg: 'bg-slate-100 text-slate-800 border-slate-300'
                  },
                  {
                    key: 'even_EVEN',
                    type: 'even' as RouletteBetType,
                    label: 'EVEN',
                    nums: Array.from({ length: 18 }, (_, i) => (i + 1) * 2),
                    bg: 'bg-slate-100 text-slate-800 border-slate-300'
                  },
                  {
                    key: 'red_RED',
                    type: 'red' as RouletteBetType,
                    label: 'RED',
                    nums: Array.from(ROULETTE_RED_NUMBERS),
                    bg: 'bg-rose-600 text-white border-rose-700'
                  },
                  {
                    key: 'black_BLACK',
                    type: 'black' as RouletteBetType,
                    label: 'BLACK',
                    nums: Array.from({ length: 36 }, (_, i) => i + 1).filter(
                      (n) => !ROULETTE_RED_NUMBERS.has(n)
                    ),
                    bg: 'bg-slate-900 text-white border-slate-950'
                  },
                  {
                    key: 'odd_ODD',
                    type: 'odd' as RouletteBetType,
                    label: 'ODD',
                    nums: Array.from({ length: 18 }, (_, i) => i * 2 + 1),
                    bg: 'bg-slate-100 text-slate-800 border-slate-300'
                  },
                  {
                    key: 'high_19-36',
                    type: 'high' as RouletteBetType,
                    label: '19-36',
                    nums: Array.from({ length: 18 }, (_, i) => i + 19),
                    bg: 'bg-slate-100 text-slate-800 border-slate-300'
                  }
                ].map((ob) => {
                  const { staged, placed } = getSpotAmount(ob.key);
                  return (
                    <button
                      key={ob.key}
                      type="button"
                      onClick={() => stageSpot(ob.key, ob.type, ob.label, ob.nums, 2)}
                      className={`flex-1 rounded-xl border font-black text-[11px] flex flex-col items-center justify-center py-2 active:scale-95 ${ob.bg}`}
                    >
                      <span>{ob.label}</span>
                      {(staged > 0 || placed > 0) && (
                        <span className="mt-0.5 px-1.5 rounded-full bg-cyan-500 text-white text-[9px] font-black tabular-nums">
                          ৳{staged + placed}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 1..36 European Table Grid (3 cols × 12 rows) + Bottom 2:1 */}
              <div className="col-span-3 space-y-1.5">
                <div className="grid grid-cols-3 gap-1">
                  {rows.flat().map((num) => {
                    const isRed = ROULETTE_RED_NUMBERS.has(num);
                    const { staged, placed } = getSpotAmount(`straight_${num}`);
                    const isWin = gameState.phase === 'result' && gameState.winningNumber === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => stageSpot(`straight_${num}`, 'straight', `#${num}`, [num], 36)}
                        className={`h-9 rounded-xl font-black text-xs text-white relative flex items-center justify-center shadow-2xs active:scale-95 ${
                          isRed ? 'bg-rose-600' : 'bg-slate-800'
                        } ${isWin ? 'ring-2 ring-amber-400 scale-105 z-10' : ''}`}
                      >
                        <span>{num}</span>
                        {(staged > 0 || placed > 0) && (
                          <span className="absolute -top-1 -right-1 px-1 min-w-[18px] h-4 rounded-full bg-cyan-400 text-slate-950 text-[8.5px] font-black flex items-center justify-center ring-1 ring-white tabular-nums">
                            {staged + placed}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 2:1 Columns */}
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { key: 'column_Col1', label: '2:1 (1)', nums: col1Nums },
                    { key: 'column_Col2', label: '2:1 (2)', nums: col2Nums },
                    { key: 'column_Col3', label: '2:1 (3)', nums: col3Nums }
                  ].map((c) => {
                    const { staged, placed } = getSpotAmount(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => stageSpot(c.key, 'column', c.label.split(' ')[1] || c.label, c.nums, 3)}
                        className="py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 font-black text-[11px] flex flex-col items-center justify-center active:scale-95"
                      >
                        <span>2:1</span>
                        {(staged > 0 || placed > 0) && (
                          <span className="text-[9px] font-black text-cyan-700 tabular-nums">
                            ৳{staged + placed}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dozens Row */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { key: 'dozen_1st 12', label: '1st 12', nums: Array.from({ length: 12 }, (_, i) => i + 1) },
                { key: 'dozen_2nd 12', label: '2nd 12', nums: Array.from({ length: 12 }, (_, i) => i + 13) },
                { key: 'dozen_3rd 12', label: '3rd 12', nums: Array.from({ length: 12 }, (_, i) => i + 25) }
              ].map((d) => {
                const { staged, placed } = getSpotAmount(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => stageSpot(d.key, 'dozen', d.label, d.nums, 3)}
                    className="py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 font-black text-xs flex flex-col items-center justify-center active:scale-95"
                  >
                    <span>{d.label}</span>
                    {(staged > 0 || placed > 0) && (
                      <span className="text-[9px] font-black text-cyan-700 tabular-nums">
                        ৳{staged + placed}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* RACETRACK VIEW */}
        {viewTab === 'racetrack' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
              French Sector Call Bets
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: 'TIER', sub: '12 Numbers (5/8 Wheel)', nums: TIER_NUMBERS },
                { name: 'ORPH.', sub: '8 Orphelins Numbers', nums: ORPHELINS_NUMBERS },
                { name: 'VOISINS', sub: '17 Neighbors of Zero', nums: VOISINS_NUMBERS },
                { name: 'ZERO', sub: '7 Zero Game Numbers', nums: ZERO_GAME_NUMBERS }
              ].map((sec) => (
                <button
                  key={sec.name}
                  type="button"
                  onClick={() => handleStageCallGroup(sec.name, sec.nums)}
                  className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 hover:border-cyan-400 text-left active:scale-98 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-cyan-900">{sec.name}</span>
                    <span className="text-[10px] font-black text-cyan-700">
                      ৳{sec.nums.length * selectedChip}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-0.5">{sec.sub}</div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-500 mb-2">
                Tap any pocket to bet number + 2 wheel neighbors:
              </div>
              <div className="flex flex-wrap gap-1">
                {ROULETTE_WHEEL_ORDER.map((num, idx) => {
                  const color = getRouletteNumberColor(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        const len = ROULETTE_WHEEL_ORDER.length;
                        const picks = [
                          ROULETTE_WHEEL_ORDER[(idx - 2 + len) % len],
                          ROULETTE_WHEEL_ORDER[(idx - 1 + len) % len],
                          num,
                          ROULETTE_WHEEL_ORDER[(idx + 1) % len],
                          ROULETTE_WHEEL_ORDER[(idx + 2) % len]
                        ];
                        handleStageCallGroup(`#${num} & Neighbors`, picks);
                      }}
                      className={`w-8 h-8 rounded-lg text-xs font-black text-white active:scale-90 ${
                        color === 'green' ? 'bg-emerald-600' : color === 'red' ? 'bg-rose-600' : 'bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FAVOURITES VIEW */}
        {viewTab === 'favourites' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-cyan-600" />
                <span>Saved Bet Patterns</span>
              </div>
              <button
                type="button"
                onClick={handleSaveFavourite}
                className="px-3 py-1 rounded-full bg-cyan-600 text-white text-[11px] font-black flex items-center gap-1 active:scale-95"
              >
                <Heart className="w-3 h-3" />
                <span>Save Current</span>
              </button>
            </div>

            {favourites.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Stage bets on the table and tap &ldquo;Save Current&rdquo; to save favourite layouts.
              </p>
            ) : (
              <div className="space-y-2">
                {favourites.map((fav) => (
                  <div
                    key={fav.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-800 truncate">{fav.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {fav.spots.map((s) => s.label).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (gameState.phase !== 'betting') {
                            showToast('Betting closed for current spin');
                            return;
                          }
                          setUndoStack((prev) => [...prev.slice(-15), stagedSpots]);
                          setStagedSpots(fav.spots.map((s) => ({ ...s })));
                          setViewTab('table');
                          showToast('Loaded favourite pattern');
                        }}
                        className="px-3 py-1.5 rounded-full bg-cyan-600 text-white text-[11px] font-black"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = favourites.filter((f) => f.id !== fav.id);
                          setFavourites(next);
                          localStorage.setItem('ewi777_roulette_favs', JSON.stringify(next));
                        }}
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chip Selector & Action Controls */}
        <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-1.5">
            {CHIPS.map((chip) => {
              const active = selectedChip === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSelectedChip(chip)}
                  className={`flex-1 py-2 rounded-full font-black text-xs border-2 transition-all active:scale-95 tabular-nums ${
                    active
                      ? 'bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white border-cyan-700 shadow-sm scale-105'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-cyan-300'
                  }`}
                >
                  ৳{chip}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleDouble}
              disabled={stagedSpots.length === 0}
              className="py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-black text-[11px] disabled:opacity-40"
            >
              2x
            </button>
            <button
              type="button"
              onClick={handleRepeat}
              disabled={lastPlacedSpots.length === 0}
              className="py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repeat</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={stagedSpots.length === 0}
              className="py-2 rounded-xl bg-slate-100 border border-slate-200 text-rose-600 font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirmBets}
            disabled={gameState.phase !== 'betting' || stagedSpots.length === 0}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0E7490] via-[#0891B2] to-[#06B6D4] text-white font-black text-sm shadow-md active:scale-98 disabled:opacity-45 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {totalStagedAmount > 0
                ? `CONFIRM BET · ৳${totalStagedAmount.toFixed(0)}`
                : 'TAP TABLE TO BET'}
            </span>
          </button>
        </div>

        {/* Recent Player Bets */}
        {rouletteBets.length > 0 && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-2">
            <div className="text-xs font-black text-slate-800">My Recent Roulette Bets</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {rouletteBets.slice(0, 10).map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-black text-slate-800">
                      {b.label} <span className="text-[10px] text-slate-400">({b.roundId})</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Stake: ৳{b.amount} · {b.payoutMultiplier}x</div>
                  </div>
                  <span
                    className={`font-black tabular-nums ${
                      b.status === 'won'
                        ? 'text-emerald-600'
                        : b.status === 'lost'
                        ? 'text-rose-600'
                        : 'text-cyan-700'
                    }`}
                  >
                    {b.status === 'won'
                      ? `+৳${(b.winAmount || 0).toFixed(2)}`
                      : b.status === 'lost'
                      ? `-৳${b.amount}`
                      : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Statistics Modal */}
      {statsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0E7490] to-[#06B6D4] px-4 py-3 text-white flex items-center justify-between">
              <span className="font-black text-sm">EWI Roulette Statistics (Last 50)</span>
              <button type="button" onClick={() => setStatsOpen(false)} className="p-1 rounded-full bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="font-black text-rose-700 mb-1.5">HOT NUMBERS</div>
                  <div className="flex gap-1.5">
                    {statsSummary.hot.map((h) => (
                      <span
                        key={h.num}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white font-black tabular-nums"
                      >
                        {h.num}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200">
                  <div className="font-black text-sky-800 mb-1.5">COLD NUMBERS</div>
                  <div className="flex gap-1.5">
                    {statsSummary.cold.map((c) => (
                      <span
                        key={c.num}
                        className="px-2 py-1 rounded-lg bg-sky-700 text-white font-black tabular-nums"
                      >
                        {c.num}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-black">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200">
                  Red {Math.round((statsSummary.red / statsSummary.total) * 100)}%
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-800 border border-slate-300">
                  Black {Math.round((statsSummary.black / statsSummary.total) * 100)}%
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Zero {Math.round((statsSummary.green / statsSummary.total) * 100)}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center font-black">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  Even {statsSummary.even} · Odd {statsSummary.odd}
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  Sample: {gameState.history.length} Spins
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Menu */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-72 bg-white h-full p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-black text-base text-slate-900">Roulette Rules</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-full bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Straight Up (1#)</span>
                  <span className="font-black text-cyan-700">36X</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Dozen / Column (12#)</span>
                  <span className="font-black text-cyan-700">3X</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Red / Black / Even / Odd / 1-18 / 19-36</span>
                  <span className="font-black text-cyan-700">2X</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Round Cycle</span>
                  <span className="font-black text-slate-800">20s Bet + 6s Spin + 4s Result</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                goTab('customer-service', '#/customer-service');
              }}
              className="w-full py-3 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 font-black text-xs flex items-center justify-center gap-2"
            >
              <CustomerServiceLogo size={22} />
              <span>24/7 Customer Care</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
