import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, RefreshCw, Plane, History, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AviatorPlaneLogo, Ewi777Logo } from '../components/BrandLogos';
import { AviatorServerState } from '../types';
import { getSyncedAviatorState } from '../utils/syncedMarkets';

type RoundPhase = 'waiting' | 'flying' | 'crashed';
const MAX_MULTIPLIER = 10000;

export const AviatorPlane: React.FC = () => {
  const {
    user,
    aviatorBets,
    placeAviatorBet,
    cashOutAviatorBet,
    loseAviatorBet,
    setActiveTab,
    showToast,
    adminSettings
  } = useApp();

  const [phase, setPhase] = useState<RoundPhase>('waiting');
  const [countdown, setCountdown] = useState<number>(5.0);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [roundId, setRoundId] = useState<string>('AV000000');
  const [crashHistory, setCrashHistory] = useState<number[]>([2.41, 1.38, 6.82, 1.85, 11.2, 1.15, 3.04, 2.09]);

  // Controls
  const [betAmount, setBetAmount] = useState<string>('50');
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<boolean>(false);
  const [autoCashoutVal, setAutoCashoutVal] = useState<string>('2.00');
  const [activeBetId, setActiveBetId] = useState<string | null>(null);
  const [activeBetRoundId, setActiveBetRoundId] = useState<string | null>(null);
  const [activeBetAmount, setActiveBetAmount] = useState<number>(0);
  const [cashedOutInfo, setCashedOutInfo] = useState<{ mult: number; win: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeBetIdRef = useRef<string | null>(activeBetId);
  const activeBetRoundRef = useRef<string | null>(activeBetRoundId);
  const autoCashoutRef = useRef<{ enabled: boolean; target: number }>({ enabled: false, target: 2.0 });

  // Server-authoritative state synchronized across every mobile phone
  const serverStateRef = useRef<{
    roundId: string;
    phase: RoundPhase;
    phaseStartedAt: number;
    serverOffsetMs: number;
    crashPoint: number;
  }>({
    roundId: 'AV000000',
    phase: 'waiting',
    phaseStartedAt: Date.now(),
    serverOffsetMs: 0,
    crashPoint: 1.0
  });

  activeBetIdRef.current = activeBetId;
  activeBetRoundRef.current = activeBetRoundId;
  autoCashoutRef.current = {
    enabled: autoCashoutEnabled,
    target: Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(autoCashoutVal) || 2.0))
  };

  const cashOutRef = useRef(cashOutAviatorBet);
  const loseBetRef = useRef(loseAviatorBet);
  cashOutRef.current = cashOutAviatorBet;
  loseBetRef.current = loseAviatorBet;

  // Poll shared authoritative Aviator engine from server (or identical deterministic epoch engine on static Vercel hosting)
  useEffect(() => {
    let mounted = true;

    const computeDeterministicState = (nowMs: number): AviatorServerState =>
      getSyncedAviatorState(nowMs);

    const applyAviatorState = (st: AviatorServerState) => {
      if (!mounted) return;
      const clientNow = Date.now();
      const serverOffsetMs = (st.serverNow || clientNow) - clientNow;
      const prevRoundId = serverStateRef.current.roundId;

      serverStateRef.current = {
        roundId: st.roundId,
        phase: st.phase,
        phaseStartedAt: st.phaseStartedAt,
        serverOffsetMs,
        crashPoint: st.crashPoint || 0
      };

      setRoundId(st.roundId);
      setPhase(st.phase);
      if (Array.isArray(st.crashHistory)) {
        setCrashHistory(st.crashHistory);
      }

      if (st.phase === 'waiting' && st.roundId !== prevRoundId) {
        setCashedOutInfo(null);
      }

      if (
        st.phase === 'crashed' &&
        activeBetIdRef.current &&
        (!activeBetRoundRef.current || activeBetRoundRef.current === st.roundId)
      ) {
        const lostId = activeBetIdRef.current;
        activeBetIdRef.current = null;
        activeBetRoundRef.current = null;
        setActiveBetId(null);
        setActiveBetRoundId(null);
        loseBetRef.current(lostId);
      }

      if (
        st.phase === 'waiting' &&
        activeBetIdRef.current &&
        activeBetRoundRef.current &&
        activeBetRoundRef.current !== st.roundId
      ) {
        const lostId = activeBetIdRef.current;
        activeBetIdRef.current = null;
        activeBetRoundRef.current = null;
        setActiveBetId(null);
        setActiveBetRoundId(null);
        loseBetRef.current(lostId);
      }
    };

    let useDeterministicFallback = false;

    const fetchAviatorState = async () => {
      if (useDeterministicFallback) {
        applyAviatorState(computeDeterministicState(Date.now()));
        return;
      }
      try {
        const res = await fetch('/api/aviator/state', { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          useDeterministicFallback = true;
          applyAviatorState(computeDeterministicState(Date.now()));
          return;
        }
        const data = await res.json();
        if (!data?.success || !data.state) {
          useDeterministicFallback = true;
          applyAviatorState(computeDeterministicState(Date.now()));
          return;
        }
        applyAviatorState(data.state);
      } catch {
        useDeterministicFallback = true;
        applyAviatorState(computeDeterministicState(Date.now()));
      }
    };

    fetchAviatorState();
    const poll = setInterval(fetchAviatorState, 220);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, []);

  // 60fps Canvas & Smooth Interpolated Multiplier anchored to server phaseStartedAt
  useEffect(() => {
    let rafId = 0;

    const drawStage = (currentPhase: RoundPhase, elapsedSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 75, 145, 0.12)';
      ctx.lineWidth = 1 * dpr;
      const gridStep = 36 * dpr;
      for (let x = gridStep; x < w; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = gridStep; y < h; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (currentPhase === 'waiting') {
        ctx.strokeStyle = 'rgba(255, 75, 145, 0.45)';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(16 * dpr, h - 22 * dpr);
        ctx.lineTo(w - 16 * dpr, h - 22 * dpr);
        ctx.stroke();
        return;
      }

      const progress = Math.min(1, Math.max(0, elapsedSec / 7.5));
      const startX = 24 * dpr;
      const startY = h - 24 * dpr;
      const endX = startX + (w - 72 * dpr) * (currentPhase === 'crashed' ? Math.min(1.15, progress + 0.18) : progress);
      const endY =
        startY -
        (h - 68 * dpr) *
          Math.pow(currentPhase === 'crashed' ? Math.min(1.1, progress + 0.15) : progress, 0.82);

      const bobY =
        currentPhase === 'flying' && progress > 0.85
          ? Math.sin((elapsedSec - 6) * 3.2) * (6 * dpr)
          : 0;
      const tipX = endX;
      const tipY = Math.max(26 * dpr, endY + bobY);

      const cpX = startX + (tipX - startX) * 0.55;
      const cpY = startY - (startY - tipY) * 0.12;

      if (currentPhase === 'flying') {
        const fillGrad = ctx.createLinearGradient(0, tipY, 0, startY);
        fillGrad.addColorStop(0, 'rgba(255, 42, 122, 0.42)');
        fillGrad.addColorStop(1, 'rgba(255, 42, 122, 0.02)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.lineTo(tipX, startY);
        ctx.closePath();
        ctx.fillStyle = fillGrad;
        ctx.fill();

        const lineGrad = ctx.createLinearGradient(startX, startY, tipX, tipY);
        lineGrad.addColorStop(0, '#FF4B91');
        lineGrad.addColorStop(1, '#FFD166');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 3.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.save();
        ctx.translate(tipX, tipY);
        const angle = -Math.atan2(startY - tipY, Math.max(40, tipX - startX)) * 0.65;
        ctx.rotate(angle);

        const flameLen = (14 + Math.sin(elapsedSec * 28) * 4) * dpr;
        const flameGrad = ctx.createLinearGradient(-flameLen, 0, 0, 0);
        flameGrad.addColorStop(0, 'rgba(255, 209, 102, 0)');
        flameGrad.addColorStop(1, '#FF2A7A');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-10 * dpr, -3 * dpr);
        ctx.lineTo(-10 * dpr - flameLen, 0);
        ctx.lineTo(-10 * dpr, 3 * dpr);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FF2A7A';
        ctx.beginPath();
        ctx.moveTo(18 * dpr, 0);
        ctx.lineTo(-10 * dpr, -9 * dpr);
        ctx.lineTo(-6 * dpr, 0);
        ctx.lineTo(-10 * dpr, 9 * dpr);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFE4F0';
        ctx.beginPath();
        ctx.ellipse(5 * dpr, -1 * dpr, 5 * dpr, 2.2 * dpr, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (currentPhase === 'crashed') {
        ctx.strokeStyle = 'rgba(255, 42, 122, 0.55)';
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([5 * dpr, 5 * dpr]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, Math.min(w - 10 * dpr, tipX), tipY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const tick = () => {
      const st = serverStateRef.current;
      const serverNowApprox = Date.now() + st.serverOffsetMs;
      const elapsedSec = Math.max(0, (serverNowApprox - st.phaseStartedAt) / 1000);

      if (st.phase === 'waiting') {
        const rem = Math.max(0, 5.0 - elapsedSec);
        setCountdown(rem);
        setMultiplier(1.0);
        drawStage('waiting', elapsedSec);
      } else if (st.phase === 'flying') {
        const curMult = +Math.min(MAX_MULTIPLIER, Math.exp(0.085 * elapsedSec)).toFixed(2);
        setMultiplier(curMult);
        drawStage('flying', elapsedSec);

        if (
          activeBetIdRef.current &&
          activeBetRoundRef.current === st.roundId &&
          autoCashoutRef.current.enabled &&
          curMult >= autoCashoutRef.current.target
        ) {
          const idToCash = activeBetIdRef.current;
          const cashMult = autoCashoutRef.current.target;
          activeBetIdRef.current = null;
          activeBetRoundRef.current = null;
          setActiveBetId(null);
          setActiveBetRoundId(null);
          const res = cashOutRef.current(idToCash, cashMult);
          if (res.success) {
            setCashedOutInfo({ mult: cashMult, win: res.winAmount });
          }
        }
      } else if (st.phase === 'crashed') {
        const finalCrash = st.crashPoint > 0 ? st.crashPoint : 1.0;
        setMultiplier(finalCrash);
        drawStage('crashed', elapsedSec);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePlaceBet = () => {
    if (phase !== 'waiting') {
      showToast('Wait for current flight to finish before betting!');
      return;
    }
    if (activeBetId) {
      showToast('You already have an active bet for this flight!');
      return;
    }
    const amt = Number(betAmount);
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum Aviator bet is ৳10');
      return;
    }
    const autoTarget = autoCashoutEnabled
      ? Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(autoCashoutVal) || 2.0))
      : undefined;
    const res = placeAviatorBet(roundId, amt, autoTarget);
    if (res.success && res.betId) {
      setActiveBetId(res.betId);
      setActiveBetRoundId(roundId);
      setActiveBetAmount(amt);
      setCashedOutInfo(null);
    } else {
      showToast(res.message);
    }
  };

  const handleCashOut = () => {
    if (phase !== 'flying' || !activeBetId) return;
    const idToCash = activeBetId;
    const cashMult = multiplier;
    setActiveBetId(null);
    setActiveBetRoundId(null);
    activeBetIdRef.current = null;
    activeBetRoundRef.current = null;
    const res = cashOutAviatorBet(idToCash, cashMult);
    if (res.success) {
      setCashedOutInfo({ mult: cashMult, win: res.winAmount });
    }
  };

  const myRecentBets = aviatorBets.filter((b) => !user.id || b.userId === user.id);

  return (
    <div className="min-h-screen bg-[#12040D] text-white pb-16">
      {/* Pink-Dark Luxury Top Header */}
      <div className="bg-gradient-to-r from-[#FF2A7A] via-[#FF4B91] to-[#B5179E] px-4 py-2.5 relative flex items-center justify-between min-h-[62px] shadow-lg sticky top-0 z-30">
        <button
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="relative z-10 p-1.5 -ml-1 rounded-full hover:bg-white/15 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          <Ewi777Logo height={58} logoUrl={adminSettings.appLogoUrl} />
        </div>

        <button
          onClick={() => showToast('Balance synced')}
          className="relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-xs border border-white/20 text-xs font-black tabular-nums active:scale-95"
        >
          <span>৳{user.balance.toFixed(2)}</span>
          <RefreshCw className="w-3 h-3 text-pink-200" />
        </button>
      </div>

      <div className="p-3.5 space-y-3.5">
        {/* Game Mode Strip */}
        <div className="flex items-center justify-between bg-[#1D0916] rounded-2xl px-3.5 py-2 border border-pink-500/25">
          <div className="flex items-center gap-2">
            <AviatorPlaneLogo size={22} />
            <span className="font-black text-xs tracking-wider italic text-white">AVIATOR PLANE</span>
          </div>
          <span className="text-[10px] font-bold text-pink-300/80 font-mono">ROUND #{roundId}</span>
        </div>

        {/* Recent Crash Multipliers Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {crashHistory.map((m, idx) => (
            <span
              key={`${m}-${idx}`}
              className={`px-2.5 py-1 rounded-full text-[11px] font-black font-mono tabular-nums flex-shrink-0 border ${
                m >= 10
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : m >= 2
                  ? 'bg-purple-500/25 border-purple-400/50 text-purple-200'
                  : 'bg-[#FF2A7A]/20 border-[#FF2A7A]/40 text-pink-200'
              }`}
            >
              {m.toFixed(2)}x
            </span>
          ))}
        </div>

        {/* Live Flight Radar Canvas Stage */}
        <div className="relative rounded-3xl overflow-hidden border border-pink-500/35 bg-gradient-to-b from-[#230719] via-[#170511] to-[#0D0209] shadow-[0_0_35px_rgba(255,42,122,0.22)] h-60">
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Round Tag + Max Payout Tag */}
          <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-pink-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  phase === 'flying'
                    ? 'bg-emerald-400 animate-ping'
                    : phase === 'waiting'
                    ? 'bg-amber-400'
                    : 'bg-[#FF2A7A]'
                }`}
              />
              <span>Round #{roundId.slice(-5)} • Synced</span>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black font-mono">
              MAX 10,000X
            </div>
          </div>

          {/* Center Multiplier / Status Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
            {phase === 'waiting' && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-200 text-xs font-black tracking-wider uppercase">
                  <Plane className="w-3.5 h-3.5" />
                  <span>Preparing Takeoff</span>
                </div>
                <div className="text-4xl font-black font-mono tabular-nums text-white drop-shadow-md">
                  {countdown.toFixed(1)}s
                </div>
                <div className="w-44 h-1.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF2A7A] to-amber-300 transition-all duration-75"
                    style={{ width: `${Math.min(100, (countdown / 5.0) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {phase === 'flying' && (
              <div>
                <div
                  className={`text-5xl font-black font-mono tabular-nums tracking-tight drop-shadow-[0_4px_22px_rgba(255,42,122,0.7)] ${
                    multiplier >= 10
                      ? 'text-amber-300'
                      : multiplier >= 2
                      ? 'text-pink-300'
                      : 'text-white'
                  }`}
                >
                  {multiplier.toFixed(2)}x
                </div>
                {cashedOutInfo && (
                  <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-xs font-black">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Cashed Out @ {cashedOutInfo.mult.toFixed(2)}x (+৳{cashedOutInfo.win.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
            )}

            {phase === 'crashed' && (
              <div className="space-y-1">
                <div className="text-xs font-black uppercase tracking-widest text-pink-300">
                  FLEW AWAY!
                </div>
                <div className="text-5xl font-black font-mono tabular-nums text-[#FF2A7A] drop-shadow-[0_4px_20px_rgba(255,42,122,0.75)]">
                  {multiplier.toFixed(2)}x
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Betting & Cash Out Control Panel */}
        <div className="bg-[#1F0917] rounded-3xl p-4 border border-pink-500/25 shadow-xl space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#12040D] border border-pink-500/30 rounded-2xl px-3.5 py-2 flex items-center justify-between">
              <span className="text-xs font-black text-pink-400">৳</span>
              <input
                type="number"
                min="10"
                disabled={Boolean(activeBetId)}
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-full bg-transparent text-center font-mono font-black text-base text-white focus:outline-none tabular-nums disabled:opacity-60"
              />
            </div>
            <button
              type="button"
              disabled={Boolean(activeBetId)}
              onClick={() => setBetAmount(String(Math.max(10, Math.floor((Number(betAmount) || 20) / 2))))}
              className="min-h-[44px] px-3.5 rounded-2xl bg-white/10 hover:bg-white/15 font-black text-xs active:scale-95 disabled:opacity-50"
            >
              1/2
            </button>
            <button
              type="button"
              disabled={Boolean(activeBetId)}
              onClick={() => setBetAmount(String(Math.min(50000, (Number(betAmount) || 10) * 2)))}
              className="min-h-[44px] px-3.5 rounded-2xl bg-white/10 hover:bg-white/15 font-black text-xs active:scale-95 disabled:opacity-50"
            >
              2X
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[10, 50, 100, 500, 1000].map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={Boolean(activeBetId)}
                onClick={() => setBetAmount(String(chip))}
                className={`min-h-[38px] rounded-xl text-xs font-black tabular-nums border transition-all active:scale-95 disabled:opacity-50 ${
                  Number(betAmount) === chip
                    ? 'bg-[#FF2A7A] border-[#FF4B91] text-white'
                    : 'bg-white/5 border-white/10 text-pink-100 hover:bg-white/10'
                }`}
              >
                ৳{chip}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between bg-[#12040D] rounded-2xl px-3.5 py-2 border border-pink-500/20">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCashoutEnabled}
                onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#FF2A7A]"
              />
              <span className="text-xs font-bold text-pink-100">Auto Cash Out (Max 10,000x)</span>
            </label>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="1.1"
                max={MAX_MULTIPLIER}
                disabled={!autoCashoutEnabled}
                value={autoCashoutVal}
                onChange={(e) => setAutoCashoutVal(e.target.value)}
                className="w-20 bg-white/10 border border-pink-400/30 rounded-xl px-2 py-1 text-right font-mono font-black text-xs text-amber-300 focus:outline-none disabled:opacity-40"
              />
              <span className="text-xs font-black text-pink-300">x</span>
            </div>
          </div>

          {phase === 'flying' && activeBetId ? (
            <button
              type="button"
              onClick={handleCashOut}
              className="w-full min-h-[54px] py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black text-base shadow-[0_6px_25px_rgba(245,158,11,0.45)] active:scale-97 transition-all flex items-center justify-center gap-2"
            >
              <span>CASH OUT</span>
              <span className="font-mono tabular-nums">
                ৳{(activeBetAmount * multiplier).toFixed(2)}
              </span>
            </button>
          ) : activeBetId && phase === 'waiting' ? (
            <div className="w-full min-h-[54px] py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-sm flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Bet Locked: ৳{activeBetAmount.toFixed(2)} • Ready for Takeoff!</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={phase !== 'waiting'}
              className="w-full min-h-[54px] py-3.5 rounded-2xl bg-gradient-to-r from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] text-white font-black text-base shadow-[0_6px_25px_rgba(255,42,122,0.45)] active:scale-97 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {phase === 'waiting'
                ? `PLACE BET ৳${(Number(betAmount) || 0).toFixed(2)}`
                : phase === 'flying'
                ? 'FLIGHT IN PROGRESS...'
                : 'NEXT ROUND STARTING...'}
            </button>
          )}
        </div>

        {/* My Aviator Bets History */}
        <div className="bg-[#1F0917] rounded-3xl p-4 border border-pink-500/20 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="font-black text-xs text-pink-100 flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#FF4B91]" />
              <span>My Aviator Bets ({myRecentBets.length})</span>
            </h3>
            <button
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="text-[11px] font-black text-[#FF4B91] hover:underline"
            >
              + Deposit
            </button>
          </div>

          {myRecentBets.length === 0 ? (
            <div className="text-center py-6 text-xs text-pink-200/50">
              No Aviator bets placed yet. Place your bet during the countdown!
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
              {myRecentBets.slice(0, 15).map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-2xl bg-[#12040D] border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-pink-300">#{b.roundId.slice(-5)}</span>
                      <span className="tabular-nums">Bet: ৳{b.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-pink-200/50 mt-0.5">{b.time}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    {b.status === 'cashed_out' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[11px]">
                        {b.cashoutMultiplier?.toFixed(2)}x • +৳{b.winAmount?.toFixed(2)}
                      </span>
                    ) : b.status === 'lost' ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-black text-[11px]">
                        Crashed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-[11px] animate-pulse">
                        Flying...
                      </span>
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
