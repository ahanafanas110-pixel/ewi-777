import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, RefreshCw, Plane, History, CheckCircle2, ShieldCheck, Users } from 'lucide-react';
import { AviatorPlaneLogo, Ewi777Logo } from '../components/BrandLogos';
import { AviatorServerState } from '../types';
import { getSyncedAviatorState } from '../utils/syncedMarkets';

type RoundPhase = 'waiting' | 'flying' | 'crashed';
const MAX_MULTIPLIER = 10000;
const QUICK_CHIPS = [100, 200, 500, 10000];

export const AviatorPlane: React.FC = () => {
  const {
    user,
    aviatorBets,
    crashPoolStates,
    placeCrashBet,
    cashOutCrashBet,
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
  const [betAmount, setBetAmount] = useState<string>('100');
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<boolean>(false);
  const [autoCashoutVal, setAutoCashoutVal] = useState<string>('2.00');
  const [activeBetId, setActiveBetId] = useState<string | null>(null);
  const [activeBetRoundId, setActiveBetRoundId] = useState<string | null>(null);
  const [activeBetAmount, setActiveBetAmount] = useState<number>(0);
  const [cashedOutInfo, setCashedOutInfo] = useState<{ mult: number; win: number } | null>(null);
  const [isPlacing, setIsPlacing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeBetIdRef = useRef<string | null>(activeBetId);
  const activeBetRoundRef = useRef<string | null>(activeBetRoundId);
  const autoCashoutRef = useRef<{ enabled: boolean; target: number }>({ enabled: false, target: 2.0 });
  const forcedPoolRef = useRef(crashPoolStates.aviator);
  forcedPoolRef.current = crashPoolStates.aviator;

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

  const cashOutRef = useRef(cashOutCrashBet);
  const loseBetRef = useRef(loseAviatorBet);
  cashOutRef.current = cashOutCrashBet;
  loseBetRef.current = loseAviatorBet;

  // Poll authoritative crash engine from server (fallback identical epoch engine)
  useEffect(() => {
    let mounted = true;
    let useFallback = false;

    const applyState = (st: AviatorServerState) => {
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
        (st.phase === 'crashed' &&
          activeBetIdRef.current &&
          (!activeBetRoundRef.current || activeBetRoundRef.current === st.roundId)) ||
        (st.phase === 'waiting' &&
          activeBetIdRef.current &&
          activeBetRoundRef.current &&
          activeBetRoundRef.current !== st.roundId)
      ) {
        const lostId = activeBetIdRef.current;
        activeBetIdRef.current = null;
        activeBetRoundRef.current = null;
        setActiveBetId(null);
        setActiveBetRoundId(null);
        loseBetRef.current(lostId);
      }
    };

    const pollState = async () => {
      if (useFallback) {
        applyState(getSyncedAviatorState(Date.now()));
        return;
      }
      try {
        const res = await fetch('/api/crash/state?game=aviator', { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          useFallback = true;
          applyState(getSyncedAviatorState(Date.now()));
          return;
        }
        const data = await res.json();
        if (!data?.success || !data.state) {
          useFallback = true;
          applyState(getSyncedAviatorState(Date.now()));
          return;
        }
        applyState(data.state);
      } catch {
        useFallback = true;
        applyState(getSyncedAviatorState(Date.now()));
      }
    };

    pollState();
    const poll = setInterval(pollState, 220);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, []);

  // 60fps Spribe Sunburst Stage & Shared 30% Pool Force-Crash Enforcement
  useEffect(() => {
    let rafId = 0;

    const drawSpribeStage = (currentPhase: RoundPhase, elapsedSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Spribe #0E0E10 Dark Background
      ctx.fillStyle = '#0E0E10';
      ctx.fillRect(0, 0, w, h);

      // Rotating Sunburst Rays from Bottom-Left Origin
      const originX = 16 * dpr;
      const originY = h - 16 * dpr;
      const rayAngleOffset = currentPhase === 'flying' ? elapsedSec * 0.14 : 0;
      const numRays = 20;
      const maxRadius = Math.hypot(w, h) * 1.1;

      ctx.save();
      ctx.translate(originX, originY);
      for (let i = 0; i < numRays; i++) {
        if (i % 2 === 0) {
          const a1 = (i / numRays) * Math.PI * 2 + rayAngleOffset;
          const a2 = ((i + 0.55) / numRays) * Math.PI * 2 + rayAngleOffset;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a1) * maxRadius, Math.sin(a1) * maxRadius);
          ctx.lineTo(Math.cos(a2) * maxRadius, Math.sin(a2) * maxRadius);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
          ctx.fill();
        }
      }
      ctx.restore();

      // Subtle Axis Guides
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(originX, 14 * dpr);
      ctx.lineTo(originX, originY);
      ctx.lineTo(w - 14 * dpr, originY);
      ctx.stroke();

      if (currentPhase === 'waiting') {
        return;
      }

      const progress = Math.min(1, Math.max(0, elapsedSec / 7.5));
      const startX = originX + 6 * dpr;
      const startY = originY - 4 * dpr;
      const endX = startX + (w - 76 * dpr) * (currentPhase === 'crashed' ? Math.min(1.12, progress + 0.18) : progress);
      const endY =
        startY -
        (h - 68 * dpr) *
          Math.pow(currentPhase === 'crashed' ? Math.min(1.08, progress + 0.16) : progress, 0.82);

      const bobY =
        currentPhase === 'flying' && progress > 0.85
          ? Math.sin((elapsedSec - 6) * 3.2) * (6 * dpr)
          : 0;
      const tipX = endX;
      const tipY = Math.max(24 * dpr, endY + bobY);

      const cpX = startX + (tipX - startX) * 0.56;
      const cpY = startY - (startY - tipY) * 0.12;

      if (currentPhase === 'flying') {
        const areaGrad = ctx.createLinearGradient(0, tipY, 0, startY);
        areaGrad.addColorStop(0, 'rgba(225, 29, 72, 0.48)');
        areaGrad.addColorStop(1, 'rgba(225, 29, 72, 0.03)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.lineTo(tipX, startY);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 3.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Crisp Spribe Red Plane Sprite
        ctx.save();
        ctx.translate(tipX, tipY);
        const angle = -Math.atan2(startY - tipY, Math.max(40, tipX - startX)) * 0.65;
        ctx.rotate(angle);

        // Propeller blur
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(18 * dpr, -9 * dpr);
        ctx.lineTo(18 * dpr, 9 * dpr);
        ctx.stroke();

        // Jet exhaust glow
        const exGrad = ctx.createLinearGradient(-26 * dpr, 0, -6 * dpr, 0);
        exGrad.addColorStop(0, 'rgba(225, 29, 72, 0)');
        exGrad.addColorStop(1, '#FB7185');
        ctx.fillStyle = exGrad;
        ctx.beginPath();
        ctx.moveTo(-8 * dpr, -4 * dpr);
        ctx.lineTo(-26 * dpr, 0);
        ctx.lineTo(-8 * dpr, 4 * dpr);
        ctx.closePath();
        ctx.fill();

        // Aircraft Fuselage
        ctx.fillStyle = '#E11D48';
        ctx.beginPath();
        ctx.moveTo(19 * dpr, 0);
        ctx.lineTo(2 * dpr, -7 * dpr);
        ctx.lineTo(-14 * dpr, -11 * dpr);
        ctx.lineTo(-10 * dpr, -2 * dpr);
        ctx.lineTo(-17 * dpr, 2 * dpr);
        ctx.lineTo(-10 * dpr, 6 * dpr);
        ctx.lineTo(6 * dpr, 7 * dpr);
        ctx.closePath();
        ctx.fill();

        // Cockpit window
        ctx.fillStyle = '#FFF1F2';
        ctx.beginPath();
        ctx.ellipse(5 * dpr, -1.5 * dpr, 5 * dpr, 2.2 * dpr, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (currentPhase === 'crashed') {
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.55)';
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
      const pool = forcedPoolRef.current;

      if (st.phase === 'waiting') {
        const rem = Math.max(0, 5.0 - elapsedSec);
        setCountdown(rem);
        setMultiplier(1.0);
        drawSpribeStage('waiting', elapsedSec);
      } else if (st.phase === 'flying') {
        const curMult = +Math.min(MAX_MULTIPLIER, Math.exp(0.085 * elapsedSec)).toFixed(2);
        const poolForced =
          pool &&
          pool.roundId === st.roundId &&
          Number(pool.forcedCrashMultiplier) > 0 &&
          curMult >= Number(pool.forcedCrashMultiplier);

        if (poolForced) {
          const forcedMult = Number(pool.forcedCrashMultiplier);
          st.phase = 'crashed';
          st.crashPoint = forcedMult;
          setPhase('crashed');
          setMultiplier(forcedMult);
          drawSpribeStage('crashed', elapsedSec);
          if (activeBetIdRef.current && activeBetRoundRef.current === st.roundId) {
            const lostId = activeBetIdRef.current;
            activeBetIdRef.current = null;
            activeBetRoundRef.current = null;
            setActiveBetId(null);
            setActiveBetRoundId(null);
            loseBetRef.current(lostId);
          }
        } else {
          setMultiplier(curMult);
          drawSpribeStage('flying', elapsedSec);

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
            cashOutRef.current('aviator', idToCash, cashMult).then((res) => {
              if (res.success) {
                setCashedOutInfo({ mult: cashMult, win: res.winAmount });
              } else if (res.crashed) {
                st.phase = 'crashed';
                st.crashPoint = res.crashPoint || cashMult;
                setPhase('crashed');
                setMultiplier(res.crashPoint || cashMult);
              }
            });
          }
        }
      } else if (st.phase === 'crashed') {
        const finalCrash =
          pool && pool.roundId === st.roundId && Number(pool.forcedCrashMultiplier) > 0
            ? Number(pool.forcedCrashMultiplier)
            : st.crashPoint > 0
            ? st.crashPoint
            : 1.0;
        setMultiplier(finalCrash);
        drawSpribeStage('crashed', elapsedSec);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePlaceBet = async () => {
    if (isPlacing) return;
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
    setIsPlacing(true);
    try {
      const res = await placeCrashBet('aviator', roundId, amt, autoTarget);
      if (res.success && res.betId) {
        setActiveBetId(res.betId);
        setActiveBetRoundId(roundId);
        setActiveBetAmount(amt);
        setCashedOutInfo(null);
      } else {
        showToast(res.message);
      }
    } finally {
      setIsPlacing(false);
    }
  };

  const handleCashOut = async () => {
    if (phase !== 'flying' || !activeBetId) return;
    const idToCash = activeBetId;
    const cashMult = multiplier;
    setActiveBetId(null);
    setActiveBetRoundId(null);
    activeBetIdRef.current = null;
    activeBetRoundRef.current = null;
    const res = await cashOutCrashBet('aviator', idToCash, cashMult);
    if (res.success) {
      setCashedOutInfo({ mult: cashMult, win: res.winAmount });
    } else if (res.crashed) {
      serverStateRef.current.phase = 'crashed';
      serverStateRef.current.crashPoint = res.crashPoint || cashMult;
      setPhase('crashed');
      setMultiplier(res.crashPoint || cashMult);
      showToast(`Flew away @ ${(res.crashPoint || cashMult).toFixed(2)}x!`);
    }
  };

  const myRecentBets = aviatorBets.filter(
    (b) => (!user.id || b.userId === user.id) && (b.game === 'aviator' || !b.game)
  );
  const livePoolBets = crashPoolStates.aviator?.roundId === roundId ? crashPoolStates.aviator.bets || [] : [];

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white pb-16">
      {/* Spribe Dark Header with Luxury Gold Brand Accent */}
      <div className="bg-[#1B1B1E] border-b border-white/10 px-4 py-2.5 relative flex items-center justify-between min-h-[60px] shadow-md sticky top-0 z-30">
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="relative z-10 p-2 -ml-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          <Ewi777Logo height={50} logoUrl={adminSettings.appLogoUrl} />
        </div>

        <button
          type="button"
          onClick={() => showToast('Balance synced')}
          className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E0E10] border border-amber-500/35 text-xs font-black font-mono tabular-nums text-amber-300 active:scale-95"
        >
          <span>৳{user.balance.toFixed(2)}</span>
          <RefreshCw className="w-3 h-3 text-amber-400" />
        </button>
      </div>

      <div className="p-3.5 space-y-3.5">
        {/* Title Strip */}
        <div className="flex items-center justify-between bg-[#1B1B1E] rounded-2xl px-3.5 py-2 border border-white/10">
          <div className="flex items-center gap-2">
            <AviatorPlaneLogo size={22} />
            <span className="font-black text-xs tracking-wider italic text-white">AVIATOR</span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 font-mono tabular-nums">
            #{roundId}
          </span>
        </div>

        {/* Recent Crash Multipliers Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {crashHistory.map((m, idx) => (
            <span
              key={`${m}-${idx}`}
              className={`px-2.5 py-1 rounded-full text-[11px] font-black font-mono tabular-nums flex-shrink-0 border ${
                m >= 10
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                  : m >= 2
                  ? 'bg-purple-500/25 border-purple-400/50 text-purple-200'
                  : 'bg-sky-500/20 border-sky-400/40 text-sky-200'
              }`}
            >
              {m.toFixed(2)}x
            </span>
          ))}
        </div>

        {/* Spribe #0E0E10 Sunburst Stage */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0E0E10] shadow-xl h-64">
          <canvas ref={canvasRef} className="w-full h-full block" />

          <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-[10px] font-mono text-slate-300">
              Round #{roundId.slice(-5)} · Provably Synced
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-black font-mono">
              MAX 10,000X
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
            {phase === 'waiting' && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E11D48]/20 border border-[#E11D48]/40 text-rose-200 text-xs font-black tracking-wider uppercase">
                  <Plane className="w-3.5 h-3.5" />
                  <span>Waiting For Next Round</span>
                </div>
                <div className="text-4xl font-black font-mono tabular-nums text-white">
                  {countdown.toFixed(1)}s
                </div>
                <div className="w-44 h-1.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                  <div
                    className="h-full bg-[#E11D48] transition-all duration-75"
                    style={{ width: `${Math.min(100, (countdown / 5.0) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {phase === 'flying' && (
              <div>
                <div
                  className={`text-5xl font-black font-mono tabular-nums tracking-tight drop-shadow-[0_4px_20px_rgba(225,29,72,0.55)] ${
                    multiplier >= 10
                      ? 'text-amber-300'
                      : multiplier >= 2
                      ? 'text-purple-300'
                      : 'text-white'
                  }`}
                >
                  {multiplier.toFixed(2)}x
                </div>
                {cashedOutInfo && (
                  <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-xs font-black">
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
                <div className="text-xs font-black uppercase tracking-widest text-rose-300">
                  FLEW AWAY!
                </div>
                <div className="text-5xl font-black font-mono tabular-nums text-[#E11D48]">
                  {multiplier.toFixed(2)}x
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spribe #1B1B1E Control Deck */}
        <div className="bg-[#1B1B1E] rounded-2xl p-4 border border-white/10 space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#0E0E10] border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between">
              <span className="text-xs font-black text-amber-400">৳</span>
              <input
                type="number"
                min={10}
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
              className="min-h-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 font-black text-xs active:scale-95 disabled:opacity-50"
            >
              1/2
            </button>
            <button
              type="button"
              disabled={Boolean(activeBetId)}
              onClick={() => setBetAmount(String(Math.min(50000, (Number(betAmount) || 10) * 2)))}
              className="min-h-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 font-black text-xs active:scale-95 disabled:opacity-50"
            >
              2X
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={Boolean(activeBetId)}
                onClick={() => setBetAmount(String(chip))}
                className={`min-h-[40px] rounded-xl text-xs font-black font-mono tabular-nums border transition-all active:scale-95 disabled:opacity-50 ${
                  Number(betAmount) === chip
                    ? 'bg-[#D97706] border-amber-400 text-white'
                    : 'bg-[#0E0E10] border-white/10 text-slate-200 hover:bg-white/10'
                }`}
              >
                ৳{chip}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between bg-[#0E0E10] rounded-xl px-3.5 py-2.5 border border-white/10">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCashoutEnabled}
                onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#22C55E]"
              />
              <span className="text-xs font-bold text-slate-200">Auto Cash Out (Max 10,000x)</span>
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
                className="w-20 bg-[#1B1B1E] border border-white/15 rounded-lg px-2 py-1 text-right font-mono font-black text-xs text-amber-300 focus:outline-none disabled:opacity-40"
              />
              <span className="text-xs font-black text-slate-400">x</span>
            </div>
          </div>

          {phase === 'flying' && activeBetId ? (
            <button
              type="button"
              onClick={handleCashOut}
              className="w-full min-h-[54px] py-3.5 rounded-xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FBBF24] text-slate-950 font-black text-base shadow-lg active:scale-97 transition-all flex items-center justify-center gap-2"
            >
              <span>CASH OUT</span>
              <span className="font-mono tabular-nums">
                ৳{(activeBetAmount * multiplier).toFixed(2)}
              </span>
            </button>
          ) : activeBetId && phase === 'waiting' ? (
            <div className="w-full min-h-[54px] py-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-sm flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Bet Locked: ৳{activeBetAmount.toFixed(2)} · Ready for Takeoff</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={phase !== 'waiting' || isPlacing}
              className="w-full min-h-[54px] py-3.5 rounded-xl bg-[#22C55E] hover:bg-emerald-500 text-slate-950 font-black text-base shadow-lg active:scale-97 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {phase === 'waiting'
                ? `BET ৳${(Number(betAmount) || 0).toFixed(2)}`
                : phase === 'flying'
                ? 'FLIGHT IN PROGRESS...'
                : 'NEXT ROUND STARTING...'}
            </button>
          )}
        </div>

        {/* Live Round Pool Bettors */}
        {livePoolBets.length > 0 && (
          <div className="bg-[#1B1B1E] rounded-2xl p-4 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black text-slate-200">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Live Flight Players ({livePoolBets.length})</span>
              </span>
              <span className="font-mono text-amber-300 tabular-nums">
                Pool: ৳{(crashPoolStates.aviator?.totalPool || 0).toFixed(0)}
              </span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {livePoolBets.slice(0, 12).map((pb) => (
                <div
                  key={pb.betId || pb.id}
                  className="px-3 py-2 rounded-xl bg-[#0E0E10] border border-white/5 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-200 truncate">{pb.nickname}</span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="text-slate-300">৳{pb.amount.toFixed(0)}</span>
                    {pb.status === 'cashed_out' ? (
                      <span className="text-emerald-400 font-black">{pb.cashoutMultiplier?.toFixed(2)}x</span>
                    ) : pb.status === 'lost' ? (
                      <span className="text-rose-400 font-bold">Lost</span>
                    ) : (
                      <span className="text-amber-300 font-bold">In Flight</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Aviator Bets History */}
        <div className="bg-[#1B1B1E] rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="font-black text-xs text-slate-200 flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-400" />
              <span>My Aviator Bets ({myRecentBets.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="text-[11px] font-black text-amber-400 hover:underline"
            >
              + Deposit
            </button>
          </div>

          {myRecentBets.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No Aviator bets placed yet. Place your bet during the countdown!
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
              {myRecentBets.slice(0, 15).map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl bg-[#0E0E10] border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-amber-300">#{b.roundId.slice(-5)}</span>
                      <span className="tabular-nums">Bet: ৳{b.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{b.time}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    {b.status === 'cashed_out' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-[11px]">
                        {b.cashoutMultiplier?.toFixed(2)}x · +৳{b.winAmount?.toFixed(2)}
                      </span>
                    ) : b.status === 'lost' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-black text-[11px]">
                        Crashed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-black text-[11px]">
                        Flying
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
