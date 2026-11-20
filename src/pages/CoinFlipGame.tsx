import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, RefreshCw, Clock, History, ShieldCheck } from 'lucide-react';
import { Ewi777Logo } from '../components/BrandLogos';
import { EwiCoinFace, EwiCoinBadgePair } from '../components/CoinFlipArtwork';
import { resolveCoinFlipOutcome } from '../utils/syncedMarkets';

const ROUND_SEC = 20;
const BET_OPEN_SEC = 15;
const QUICK_AMTS = [10, 50, 100, 500, 1000];
const COIN_FLIP_PAYOUT = 1.89;

interface FlipHistoryRow {
  periodNumber: string;
  result: 'GOLD' | 'SILVER';
  time: string;
}

function computeCoinEpoch(nowMs = Date.now()): { period: string; rem: number; isLocked: boolean } {
  const secTotal = Math.floor(nowMs / 1000);
  const slot = Math.floor(secTotal / ROUND_SEC);
  const elapsed = secTotal % ROUND_SEC;
  const rem = ROUND_SEC - elapsed;
  return {
    period: `CF${String(slot).slice(-7)}`,
    rem,
    isLocked: elapsed >= BET_OPEN_SEC
  };
}

export const CoinFlipGame: React.FC = () => {
  const {
    user,
    adminSettings,
    coinFlipBets,
    marketPools,
    placeCoinFlipBet,
    settleCoinFlipRound,
    setActiveTab,
    showToast
  } = useApp();

  const [epoch, setEpoch] = useState(() => computeCoinEpoch());
  const [selectedSide, setSelectedSide] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [betAmount, setBetAmount] = useState<string>('50');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [lastOutcome, setLastOutcome] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [history, setHistory] = useState<FlipHistoryRow[]>(() => {
    const curSlot = Math.floor(Date.now() / 1000 / ROUND_SEC);
    return Array.from({ length: 12 }, (_, idx) => {
      const p = `CF${String(curSlot - idx - 1).slice(-7)}`;
      return {
        periodNumber: p,
        result: resolveCoinFlipOutcome(p, 0, 0, 'AUTO'),
        time: '--:--'
      };
    });
  });

  const activePeriodRef = useRef<string>(epoch.period);
  const prevRemRef = useRef<number>(epoch.rem);
  const coinFlipBetsRef = useRef(coinFlipBets);
  const marketPoolsRef = useRef(marketPools);
  const settleRef = useRef(settleCoinFlipRound);
  const controlModeRef = useRef(adminSettings.gameControlModes?.coinflip || 'HIGH_BET_LOSS');

  coinFlipBetsRef.current = coinFlipBets;
  marketPoolsRef.current = marketPools;
  settleRef.current = settleCoinFlipRound;
  controlModeRef.current = adminSettings.gameControlModes?.coinflip || 'HIGH_BET_LOSS';

  useEffect(() => {
    const t = setInterval(() => {
      const next = computeCoinEpoch(Date.now());
      setEpoch(next);
      const rolledOver = next.rem > prevRemRef.current;
      prevRemRef.current = next.rem;

      if (rolledOver) {
        const resolvingPeriod = activePeriodRef.current;
        activePeriodRef.current = next.period;

        const poolKey = `coinflip_default_${resolvingPeriod}`;
        const poolEntry = marketPoolsRef.current[poolKey];
        let goldTotal = Number(poolEntry?.selections?.GOLD || 0);
        let silverTotal = Number(poolEntry?.selections?.SILVER || 0);

        coinFlipBetsRef.current.forEach((b) => {
          if (b.periodNumber === resolvingPeriod && b.status === 'pending') {
            if (!poolEntry) {
              if (b.side === 'GOLD') goldTotal += b.amount;
              else silverTotal += b.amount;
            }
          }
        });

        const winnerSide = resolveCoinFlipOutcome(
          resolvingPeriod,
          goldTotal,
          silverTotal,
          controlModeRef.current
        );

        setIsFlipping(true);
        setTimeout(() => {
          setLastOutcome(winnerSide);
          setIsFlipping(false);
          setHistory((prev) => [
            {
              periodNumber: resolvingPeriod,
              result: winnerSide,
              time: new Date().toTimeString().slice(0, 8)
            },
            ...prev.filter((r) => r.periodNumber !== resolvingPeriod).slice(0, 19)
          ]);
          settleRef.current(resolvingPeriod, winnerSide);
        }, 1200);
      }
    }, 350);

    return () => clearInterval(t);
  }, []);

  const handlePlaceBet = () => {
    if (epoch.isLocked) {
      showToast('Round locked! Wait for coin reveal...');
      return;
    }
    const amt = Number(betAmount);
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum Coin Flip bet is ৳10');
      return;
    }
    placeCoinFlipBet(epoch.period, selectedSide, amt);
  };

  const currentRoundBets = coinFlipBets.filter(
    (b) => b.periodNumber === epoch.period && b.status === 'pending'
  );

  const arenaVisualSide = isFlipping ? selectedSide : lastOutcome;
  const isSilverArena = arenaVisualSide === 'SILVER';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] px-4 py-2.5 relative flex items-center justify-between min-h-[60px] shadow-lg sticky top-0 z-30 border-b border-cyan-400/25 text-white">
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="relative z-10 p-2 -ml-1 rounded-xl bg-black/20 hover:bg-black/30 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          <Ewi777Logo height={50} logoUrl={adminSettings.appLogoUrl} />
        </div>

        <button
          type="button"
          onClick={() => showToast('Wallet synced')}
          className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 border border-cyan-300/35 text-xs font-black font-mono tabular-nums text-cyan-100"
        >
          <span>৳{user.balance.toFixed(2)}</span>
          <RefreshCw className="w-3 h-3 text-cyan-300" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <EwiCoinBadgePair size={38} />
            <div>
              <div className="font-black text-xs tracking-wider text-[#0891B2]">COIN FLIP · EWI777</div>
              <div className="text-[10px] text-slate-500 font-bold">GOLD vs SILVER · 1.89X PAYOUT</div>
            </div>
          </div>

          <div className="text-right font-mono tabular-nums">
            <div className="text-[10px] text-slate-500">#{epoch.period}</div>
            <div className={`text-sm font-black flex items-center justify-end gap-1 ${epoch.isLocked ? 'text-rose-500' : 'text-[#0891B2]'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{epoch.rem}s</span>
            </div>
          </div>
        </div>

        {/* 3D Animated Coin Arena */}
        <div
          className="rounded-3xl p-6 border shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500"
          style={{
            borderColor: isSilverArena ? 'rgba(220, 38, 38, 0.35)' : 'rgba(234, 179, 8, 0.35)',
            backgroundColor: isSilverArena ? '#180607' : '#141506',
            backgroundImage: isSilverArena
              ? 'radial-gradient(circle at 50% 45%, rgba(153, 27, 27, 0.55) 0%, rgba(16, 6, 7, 0.96) 76%), linear-gradient(to right, rgba(220, 38, 38, 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(220, 38, 38, 0.14) 1px, transparent 1px)'
              : 'radial-gradient(circle at 50% 45%, rgba(101, 90, 14, 0.55) 0%, rgba(16, 16, 6, 0.96) 76%), linear-gradient(to right, rgba(202, 138, 4, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(202, 138, 4, 0.15) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 36px 36px, 36px 36px'
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-200/90 mb-4 relative z-10">
            {isFlipping
              ? 'Flipping Official EWI777 Coin...'
              : epoch.isLocked
              ? 'Locking Pool & Drawing Result...'
              : `Last Winner: ${lastOutcome} EWI777`}
          </div>

          <div className="w-44 h-44 relative z-10" style={{ perspective: '1000px' }}>
            <div
              className="w-full h-full relative transition-transform duration-1000"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipping
                  ? 'rotateY(1080deg) scale(1.08)'
                  : lastOutcome === 'SILVER'
                  ? 'rotateY(180deg)'
                  : 'rotateY(0deg)'
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full shadow-[0_0_40px_rgba(250,204,21,0.45)]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <EwiCoinFace side="GOLD" size={176} />
              </div>

              <div
                className="absolute inset-0 flex items-center justify-center rounded-full shadow-[0_0_40px_rgba(203,213,225,0.45)]"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <EwiCoinFace side="SILVER" size={176} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-5 overflow-x-auto max-w-full pb-1 no-scrollbar relative z-10">
            {history.slice(0, 12).map((row) => (
              <span
                key={row.periodNumber}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex-shrink-0 border ${
                  row.result === 'GOLD'
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                    : 'bg-slate-400/20 border-slate-300/50 text-slate-200'
                }`}
              >
                {row.result === 'GOLD' ? 'GOLD' : 'SILVER'}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedSide('GOLD')}
            className={`p-3.5 rounded-2xl border-2 text-center transition-all active:scale-97 flex flex-col items-center gap-1.5 ${
              selectedSide === 'GOLD'
                ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] border-amber-200 text-slate-950 shadow-lg'
                : 'bg-white border-amber-200 text-amber-700 hover:border-amber-400'
            }`}
          >
            <EwiCoinFace side="GOLD" size={44} />
            <div className="text-xs font-black tracking-wider uppercase">GOLD COIN</div>
            <div className={`text-[11px] font-extrabold ${selectedSide === 'GOLD' ? 'text-amber-950' : 'text-slate-500'}`}>
              EWI777 · 1.89X
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSide('SILVER')}
            className={`p-3.5 rounded-2xl border-2 text-center transition-all active:scale-97 flex flex-col items-center gap-1.5 ${
              selectedSide === 'SILVER'
                ? 'bg-gradient-to-br from-slate-200 to-slate-400 border-slate-300 text-slate-950 shadow-lg'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            <EwiCoinFace side="SILVER" size={44} />
            <div className="text-xs font-black tracking-wider uppercase">SILVER COIN</div>
            <div className={`text-[11px] font-extrabold ${selectedSide === 'SILVER' ? 'text-slate-800' : 'text-slate-500'}`}>
              EWI777 · 1.89X
            </div>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Bet Amount (Min ৳10)</span>
            <span className="font-mono font-bold text-[#0891B2] tabular-nums">
              Est. Win: ৳{((Number(betAmount) || 0) * COIN_FLIP_PAYOUT).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center">
              <span className="text-xs font-black text-[#0891B2] mr-2">৳</span>
              <input
                type="number"
                min={10}
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-full bg-transparent text-center font-mono font-black text-base text-slate-900 focus:outline-none tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={() => setBetAmount(String(Math.max(10, Math.floor((Number(betAmount) || 20) / 2))))}
              className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs active:scale-95"
            >
              1/2
            </button>
            <button
              type="button"
              onClick={() => setBetAmount(String(Math.min(50000, (Number(betAmount) || 10) * 2)))}
              className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs active:scale-95"
            >
              2X
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {QUICK_AMTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setBetAmount(String(amt))}
                className={`py-2 rounded-xl text-xs font-black font-mono tabular-nums border transition-all ${
                  Number(betAmount) === amt
                    ? 'bg-[#0891B2] border-[#0891B2] text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                ৳{amt}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={epoch.isLocked}
            onClick={handlePlaceBet}
            className="w-full min-h-[50px] py-3.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-lg active:scale-98 disabled:opacity-45 transition-all"
          >
            {epoch.isLocked
              ? `LOCKED — REVEALING IN ${epoch.rem}s`
              : `BET ${selectedSide} EWI777 (৳${(Number(betAmount) || 0).toFixed(0)})`}
          </button>

          {currentRoundBets.length > 0 && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {currentRoundBets.length} Active Bet(s) this round (Total ৳
                {currentRoundBets.reduce((s, b) => s + b.amount, 0).toFixed(0)})
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800">
            <History className="w-4 h-4 text-[#0891B2]" />
            <span>My Coin Flip History ({coinFlipBets.length})</span>
          </div>

          {coinFlipBets.length === 0 ? (
            <div className="py-5 text-center text-xs text-slate-500">
              Choose GOLD (EWI777) or SILVER (EWI777) and place your first bet!
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {coinFlipBets.slice(0, 15).map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-black text-slate-900">
                      {b.side} EWI777 · <span className="font-mono text-[#0891B2]">#{b.periodNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{b.time} · Bet ৳{b.amount.toFixed(0)}</div>
                  </div>
                  <div className="font-mono font-black tabular-nums">
                    {b.status === 'won' ? (
                      <span className="text-emerald-600">+৳{(b.winAmount || 0).toFixed(2)}</span>
                    ) : b.status === 'lost' ? (
                      <span className="text-rose-600">-৳{b.amount.toFixed(2)}</span>
                    ) : (
                      <span className="text-[#0891B2]">Pending</span>
                    )}
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
