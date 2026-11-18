import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  X,
  Rocket
} from 'lucide-react';
import { Ewi777Logo } from '../components/BrandLogos';
import { AviatorServerState } from '../types';
import { getSyncedCrashEngineState } from '../utils/syncedMarkets';
import { apiUrl } from '../utils/phoneAndApi';
import luckyJetPilotImg from '../assets/images/lucky_jet_pilot_1794905505516.jpg';

type RoundPhase = 'waiting' | 'flying' | 'crashed';
type SlotId = 1 | 2 | 3;

interface LuckySlotState {
  betAmount: string;
  autoBetEnabled: boolean;
  autoCashoutEnabled: boolean;
  autoCashoutVal: string;
  activeBetId: string | null;
  activeBetRoundId: string | null;
  activeBetAmount: number;
  cashedOutInfo: { mult: number; win: number } | null;
  isPlacing: boolean;
}

const MAX_MULTIPLIER = 10000;
const QUICK_CHIPS = [10, 50, 100, 500];
const SLOT_IDS: SlotId[] = [1, 2, 3];

const createInitialSlot = (defaultAmt = '50'): LuckySlotState => ({
  betAmount: defaultAmt,
  autoBetEnabled: false,
  autoCashoutEnabled: false,
  autoCashoutVal: '2.00',
  activeBetId: null,
  activeBetRoundId: null,
  activeBetAmount: 0,
  cashedOutInfo: null,
  isPlacing: false
});

export const LuckyJetGame: React.FC = () => {
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
  const [roundId, setRoundId] = useState<string>('LJ000000');
  const [crashHistory, setCrashHistory] = useState<number[]>([3.12, 1.44, 8.95, 1.92, 14.5, 1.19, 2.75, 4.18]);

  // 3 Simultaneous Bet Slots
  const [slots, setSlots] = useState<Record<SlotId, LuckySlotState>>({
    1: createInitialSlot('50'),
    2: createInitialSlot('20'),
    3: createInitialSlot('10')
  });

  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [betsTab, setBetsTab] = useState<'all' | 'my' | 'top'>('all');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pilotSpriteRef = useRef<HTMLImageElement | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const autoCashLockRef = useRef<Record<SlotId, boolean>>({ 1: false, 2: false, 3: false });
  const forcedPoolRef = useRef(crashPoolStates.luckyjet);
  forcedPoolRef.current = crashPoolStates.luckyjet;

  const serverStateRef = useRef<{
    roundId: string;
    phase: RoundPhase;
    phaseStartedAt: number;
    serverOffsetMs: number;
    crashPoint: number;
  }>({
    roundId: 'LJ000000',
    phase: 'waiting',
    phaseStartedAt: Date.now(),
    serverOffsetMs: 0,
    crashPoint: 1.0
  });

  const cashOutRef = useRef(cashOutCrashBet);
  const loseBetRef = useRef(loseAviatorBet);
  const placeBetRef = useRef(placeCrashBet);
  cashOutRef.current = cashOutCrashBet;
  loseBetRef.current = loseAviatorBet;
  placeBetRef.current = placeCrashBet;

  const updateSlot = (slotId: SlotId, patch: Partial<LuckySlotState>) => {
    setSlots((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], ...patch }
    }));
  };

  useEffect(() => {
    const img = new Image();
    img.src = luckyJetPilotImg;
    pilotSpriteRef.current = img;
  }, []);

  // Poll /api/crash/state?game=luckyjet (identical deterministic fallback on static host)
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

      const isNewWaiting = st.phase === 'waiting' && st.roundId !== prevRoundId;
      if (isNewWaiting) {
        autoCashLockRef.current = { 1: false, 2: false, 3: false };
        setSlots((prev) => ({
          1: { ...prev[1], cashedOutInfo: null },
          2: { ...prev[2], cashedOutInfo: null },
          3: { ...prev[3], cashedOutInfo: null }
        }));
      }

      const curSlots = slotsRef.current;
      const toLoseIds: string[] = [];
      const clearSlotIds: SlotId[] = [];

      SLOT_IDS.forEach((sid) => {
        const sl = curSlots[sid];
        if (!sl.activeBetId) return;
        const shouldLose =
          (st.phase === 'crashed' && (!sl.activeBetRoundId || sl.activeBetRoundId === st.roundId)) ||
          (st.phase === 'waiting' && sl.activeBetRoundId && sl.activeBetRoundId !== st.roundId);
        if (shouldLose) {
          toLoseIds.push(sl.activeBetId);
          clearSlotIds.push(sid);
        }
      });

      if (clearSlotIds.length > 0) {
        setSlots((prev) => {
          const next = { ...prev };
          clearSlotIds.forEach((sid) => {
            next[sid] = { ...next[sid], activeBetId: null, activeBetRoundId: null };
          });
          return next;
        });
        toLoseIds.forEach((id) => loseBetRef.current(id));
      }

      // Per-slot Autobet trigger at start of new waiting round
      if (isNewWaiting) {
        SLOT_IDS.forEach((sid) => {
          const sl = curSlots[sid];
          if (sl.autoBetEnabled && (!sl.activeBetId || clearSlotIds.includes(sid))) {
            const amt = Math.max(10, Number(sl.betAmount) || 50);
            const autoTarget = sl.autoCashoutEnabled
              ? Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(sl.autoCashoutVal) || 2.0))
              : undefined;
            placeBetRef.current('luckyjet', st.roundId, amt, autoTarget, sid).then((res) => {
              if (res.success && res.betId && mounted) {
                autoCashLockRef.current[sid] = false;
                updateSlot(sid, {
                  activeBetId: res.betId,
                  activeBetRoundId: st.roundId,
                  activeBetAmount: amt
                });
              }
            });
          }
        });
      }
    };

    const pollState = async () => {
      if (useFallback) {
        applyState(getSyncedCrashEngineState('luckyjet', Date.now()));
        return;
      }
      try {
        const res = await fetch(apiUrl('/api/crash/state?game=luckyjet'), { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          useFallback = true;
          applyState(getSyncedCrashEngineState('luckyjet', Date.now()));
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.success || !data.state) {
          useFallback = true;
          applyState(getSyncedCrashEngineState('luckyjet', Date.now()));
          return;
        }
        applyState(data.state);
      } catch {
        useFallback = true;
        applyState(getSyncedCrashEngineState('luckyjet', Date.now()));
      }
    };

    pollState();
    const poll = setInterval(pollState, 220);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, []);

  // 60fps #141029 Indigo Arena + Lucky Joe Jetpack Curve + Forced Pool Cap Check
  useEffect(() => {
    let rafId = 0;

    const drawArena = (currentPhase: RoundPhase, elapsedSec: number) => {
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

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#1D153A');
      bgGrad.addColorStop(1, '#141029');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      for (let i = 0; i < 18; i++) {
        const sx = (i * 73 + Math.floor(elapsedSec * 12)) % w;
        const sy = ((i * 47) % (h - 24 * dpr)) + 8 * dpr;
        ctx.fillRect(sx, sy, 1.5 * dpr, 1.5 * dpr);
      }

      const originX = 18 * dpr;
      const originY = h - 20 * dpr;

      ctx.strokeStyle = 'rgba(167, 139, 250, 0.16)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(originX, 12 * dpr);
      ctx.lineTo(originX, originY);
      ctx.lineTo(w - 14 * dpr, originY);
      ctx.stroke();

      if (currentPhase === 'waiting') {
        return;
      }

      const progress = Math.min(1, Math.max(0, elapsedSec / 7.5));
      const startX = originX + 4 * dpr;
      const startY = originY - 4 * dpr;
      const endX = startX + (w - 82 * dpr) * (currentPhase === 'crashed' ? Math.min(1.12, progress + 0.18) : progress);
      const endY =
        startY -
        (h - 70 * dpr) *
          Math.pow(currentPhase === 'crashed' ? Math.min(1.08, progress + 0.16) : progress, 0.8);

      const bobY =
        currentPhase === 'flying' && progress > 0.85
          ? Math.sin((elapsedSec - 6) * 3.5) * (6 * dpr)
          : 0;
      const tipX = endX;
      const tipY = Math.max(26 * dpr, endY + bobY);
      const cpX = startX + (tipX - startX) * 0.56;
      const cpY = startY - (startY - tipY) * 0.14;

      if (currentPhase === 'flying') {
        const fillGrad = ctx.createLinearGradient(0, tipY, 0, startY);
        fillGrad.addColorStop(0, 'rgba(139, 92, 246, 0.44)');
        fillGrad.addColorStop(1, 'rgba(139, 92, 246, 0.02)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.lineTo(tipX, startY);
        ctx.closePath();
        ctx.fillStyle = fillGrad;
        ctx.fill();

        const lineGrad = ctx.createLinearGradient(startX, startY, tipX, tipY);
        lineGrad.addColorStop(0, '#8B5CF6');
        lineGrad.addColorStop(1, '#F59E0B');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 3.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.save();
        ctx.translate(tipX, tipY);
        const flameGrad = ctx.createRadialGradient(-8 * dpr, 12 * dpr, 2 * dpr, -8 * dpr, 12 * dpr, 16 * dpr);
        flameGrad.addColorStop(0, '#FBBF24');
        flameGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(-8 * dpr, 12 * dpr, 15 * dpr, 0, Math.PI * 2);
        ctx.fill();

        const r = 18 * dpr;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        if (pilotSpriteRef.current && pilotSpriteRef.current.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, r - 2 * dpr, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(pilotSpriteRef.current, -r + 2 * dpr, -r + 2 * dpr, (r - 2 * dpr) * 2, (r - 2 * dpr) * 2);
          ctx.restore();
        }
        ctx.restore();
      } else if (currentPhase === 'crashed') {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
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
        drawArena('waiting', elapsedSec);
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
          drawArena('crashed', elapsedSec);

          const curSlots = slotsRef.current;
          const lostIds: string[] = [];
          const clearSids: SlotId[] = [];
          SLOT_IDS.forEach((sid) => {
            const sl = curSlots[sid];
            if (sl.activeBetId && sl.activeBetRoundId === st.roundId) {
              lostIds.push(sl.activeBetId);
              clearSids.push(sid);
            }
          });
          if (clearSids.length > 0) {
            setSlots((prev) => {
              const next = { ...prev };
              clearSids.forEach((sid) => {
                next[sid] = { ...next[sid], activeBetId: null, activeBetRoundId: null };
              });
              return next;
            });
            lostIds.forEach((id) => loseBetRef.current(id));
          }
        } else {
          setMultiplier(curMult);
          drawArena('flying', elapsedSec);

          const curSlots = slotsRef.current;
          SLOT_IDS.forEach((sid) => {
            const sl = curSlots[sid];
            const target = Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(sl.autoCashoutVal) || 2.0));
            if (
              sl.activeBetId &&
              sl.activeBetRoundId === st.roundId &&
              sl.autoCashoutEnabled &&
              !autoCashLockRef.current[sid] &&
              curMult >= target
            ) {
              autoCashLockRef.current[sid] = true;
              const idToCash = sl.activeBetId;
              updateSlot(sid, { activeBetId: null, activeBetRoundId: null });
              cashOutRef.current('luckyjet', idToCash, target).then((res) => {
                if (res.success) {
                  updateSlot(sid, { cashedOutInfo: { mult: target, win: res.winAmount } });
                } else if (res.crashed) {
                  st.phase = 'crashed';
                  st.crashPoint = res.crashPoint || target;
                  setPhase('crashed');
                  setMultiplier(res.crashPoint || target);
                }
              });
            }
          });
        }
      } else if (st.phase === 'crashed') {
        const finalCrash =
          pool && pool.roundId === st.roundId && Number(pool.forcedCrashMultiplier) > 0
            ? Number(pool.forcedCrashMultiplier)
            : st.crashPoint > 0
            ? st.crashPoint
            : 1.0;
        setMultiplier(finalCrash);
        drawArena('crashed', elapsedSec);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePlaceBet = async (slotId: SlotId) => {
    const sl = slots[slotId];
    if (sl.isPlacing) return;
    if (phase !== 'waiting') {
      showToast('Wait for current flight to land before placing bet');
      return;
    }
    if (sl.activeBetId) {
      showToast(`Slot #${slotId} bet already locked for this round`);
      return;
    }
    const amt = Number(sl.betAmount);
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum Lucky Jet bet is ৳10');
      return;
    }
    const autoTarget = sl.autoCashoutEnabled
      ? Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(sl.autoCashoutVal) || 2.0))
      : undefined;
    updateSlot(slotId, { isPlacing: true });
    try {
      const res = await placeCrashBet('luckyjet', roundId, amt, autoTarget, slotId);
      if (res.success && res.betId) {
        autoCashLockRef.current[slotId] = false;
        updateSlot(slotId, {
          activeBetId: res.betId,
          activeBetRoundId: roundId,
          activeBetAmount: amt,
          cashedOutInfo: null
        });
      } else {
        showToast(res.message);
      }
    } finally {
      updateSlot(slotId, { isPlacing: false });
    }
  };

  const handleCashOut = async (slotId: SlotId) => {
    const sl = slots[slotId];
    if (phase !== 'flying' || !sl.activeBetId) return;
    const idToCash = sl.activeBetId;
    const cashMult = multiplier;
    autoCashLockRef.current[slotId] = true;
    updateSlot(slotId, { activeBetId: null, activeBetRoundId: null });
    const res = await cashOutCrashBet('luckyjet', idToCash, cashMult);
    if (res.success) {
      updateSlot(slotId, { cashedOutInfo: { mult: cashMult, win: res.winAmount } });
    } else if (res.crashed) {
      serverStateRef.current.phase = 'crashed';
      serverStateRef.current.crashPoint = res.crashPoint || cashMult;
      setPhase('crashed');
      setMultiplier(res.crashPoint || cashMult);
      showToast(`Lucky Joe flew away @ ${(res.crashPoint || cashMult).toFixed(2)}x!`);
    }
  };

  const myLuckyJetBets = aviatorBets.filter((b) => (!user.id || b.userId === user.id) && b.game === 'luckyjet');
  const poolBets = crashPoolStates.luckyjet?.bets || [];
  const topBets = [...myLuckyJetBets]
    .filter((b) => b.status === 'cashed_out')
    .sort((a, b) => (b.winAmount || 0) - (a.winAmount || 0));
  const cashedOutBadges = SLOT_IDS.map((sid) => ({ sid, info: slots[sid].cashedOutInfo })).filter(
    (x): x is { sid: SlotId; info: { mult: number; win: number } } => Boolean(x.info)
  );

  return (
    <div className="min-h-screen bg-[#141029] text-white pb-16">
      {/* Header */}
      <div className="bg-[#1D163A] border-b border-violet-500/20 px-4 py-2.5 relative flex items-center justify-between min-h-[60px] shadow-md sticky top-0 z-30">
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="relative z-10 p-2 -ml-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          <Ewi777Logo height={50} logoUrl={adminSettings.appLogoUrl} />
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            className="p-2 rounded-xl bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
            aria-label="How to play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => showToast('Balance synced')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#141029] border border-amber-400/35 text-xs font-black font-mono tabular-nums text-amber-300"
          >
            <span>৳{user.balance.toFixed(0)}</span>
            <RefreshCw className="w-3 h-3 text-amber-400" />
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-3.5">
        {/* Title Strip */}
        <div className="flex items-center justify-between bg-[#1D163A] rounded-2xl px-3.5 py-2 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <img
              src={luckyJetPilotImg}
              alt="Lucky Jet"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-amber-400"
            />
            <span className="font-black text-xs tracking-wider text-white">LUCKY JET · 3 SLOTS</span>
          </div>
          <span className="text-[11px] font-bold text-violet-300 font-mono tabular-nums">
            #{roundId}
          </span>
        </div>

        {/* HISTORY OF ROUNDS */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-violet-300/70 tracking-wider uppercase px-1">
            HISTORY OF ROUNDS
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {crashHistory.map((m, idx) => (
              <span
                key={`${m}-${idx}`}
                className={`px-2.5 py-1 rounded-full text-[11px] font-black font-mono tabular-nums flex-shrink-0 border ${
                  m >= 10
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                    : m >= 2
                    ? 'bg-violet-500/30 border-violet-400/50 text-violet-200'
                    : 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                }`}
              >
                {m.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        {/* Deep Indigo Flight Canvas Stage */}
        <div className="relative rounded-2xl overflow-hidden border border-violet-500/30 bg-[#141029] shadow-xl h-64">
          <canvas ref={canvasRef} className="w-full h-full block" />

          <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-black/45 border border-white/10 text-[10px] font-mono text-violet-200">
              Round #{roundId.slice(-5)}
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black font-mono">
              MAX 10,000X
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
            {phase === 'waiting' && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-500/25 border border-violet-400/40 text-violet-200 text-xs font-black tracking-wider uppercase">
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Preparing Jetpack</span>
                </div>
                <div className="text-4xl font-black font-mono tabular-nums text-white">
                  {countdown.toFixed(1)}s
                </div>
                <div className="w-44 h-1.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-amber-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, (countdown / 5.0) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {phase === 'flying' && (
              <div>
                <div
                  className={`text-5xl font-black font-mono tabular-nums tracking-tight drop-shadow-[0_4px_20px_rgba(139,92,246,0.7)] ${
                    multiplier >= 10
                      ? 'text-amber-300'
                      : multiplier >= 2
                      ? 'text-violet-300'
                      : 'text-white'
                  }`}
                >
                  {multiplier.toFixed(2)}x
                </div>
                {cashedOutBadges.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {cashedOutBadges.map((b) => (
                      <div
                        key={b.sid}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[11px] font-black"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>
                          S{b.sid}: {b.info.mult.toFixed(2)}x (+৳{b.info.win.toFixed(2)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {phase === 'crashed' && (
              <div className="space-y-1">
                <div className="text-xs font-black uppercase tracking-widest text-rose-300">
                  FLEW AWAY!
                </div>
                <div className="text-5xl font-black font-mono tabular-nums text-rose-400">
                  {multiplier.toFixed(2)}x
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3 Independent Simultaneous Trade Slots */}
        <div className="space-y-2.5">
          {SLOT_IDS.map((slotId) => {
            const sl = slots[slotId];
            return (
              <div
                key={slotId}
                className="bg-[#1D163A] rounded-2xl p-3.5 border border-violet-500/25 space-y-2.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-amber-300 tracking-wider uppercase">
                    Jet Slot #{slotId}
                  </span>
                  {sl.cashedOutInfo ? (
                    <span className="text-emerald-400 font-black font-mono">
                      Won +৳{sl.cashedOutInfo.win.toFixed(2)} @ {sl.cashedOutInfo.mult.toFixed(2)}x
                    </span>
                  ) : sl.activeBetId ? (
                    <span className="text-emerald-300 font-bold font-mono">
                      Locked: ৳{sl.activeBetAmount.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-violet-300/75 font-semibold">Min ৳10</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center justify-between bg-[#141029] rounded-xl px-3 py-1.5 border border-violet-500/20 cursor-pointer">
                    <span className="font-bold text-violet-100 text-[11px]">Autobet</span>
                    <input
                      type="checkbox"
                      checked={sl.autoBetEnabled}
                      onChange={(e) => updateSlot(slotId, { autoBetEnabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-400"
                    />
                  </label>
                  <label className="flex items-center justify-between bg-[#141029] rounded-xl px-3 py-1.5 border border-violet-500/20 cursor-pointer">
                    <span className="font-bold text-violet-100 text-[11px]">Autowithdraw</span>
                    <input
                      type="checkbox"
                      checked={sl.autoCashoutEnabled}
                      onChange={(e) => updateSlot(slotId, { autoCashoutEnabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-400"
                    />
                  </label>
                </div>

                {sl.autoCashoutEnabled && (
                  <div className="flex items-center justify-between bg-[#141029] rounded-xl px-3 py-1.5 border border-amber-400/30">
                    <span className="text-[11px] font-bold text-amber-200">Target Multiplier</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="1.1"
                        max={MAX_MULTIPLIER}
                        value={sl.autoCashoutVal}
                        onChange={(e) => updateSlot(slotId, { autoCashoutVal: e.target.value })}
                        className="w-16 bg-[#1D163A] border border-violet-400/30 rounded-lg px-2 py-0.5 text-right font-mono font-black text-xs text-amber-300 focus:outline-none"
                      />
                      <span className="text-xs font-black text-violet-300">x</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#141029] border border-violet-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400">৳</span>
                    <input
                      type="number"
                      min={10}
                      disabled={Boolean(sl.activeBetId)}
                      value={sl.betAmount}
                      onChange={(e) => updateSlot(slotId, { betAmount: e.target.value })}
                      className="w-full bg-transparent text-center font-mono font-black text-sm text-white focus:outline-none tabular-nums disabled:opacity-60"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(sl.activeBetId)}
                    onClick={() =>
                      updateSlot(slotId, {
                        betAmount: String(Math.max(10, Math.floor((Number(sl.betAmount) || 20) / 2)))
                      })
                    }
                    className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/15 font-black text-xs active:scale-95 disabled:opacity-50"
                  >
                    1/2
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(sl.activeBetId)}
                    onClick={() =>
                      updateSlot(slotId, {
                        betAmount: String(Math.min(50000, (Number(sl.betAmount) || 10) * 2))
                      })
                    }
                    className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/15 font-black text-xs active:scale-95 disabled:opacity-50"
                  >
                    2X
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={Boolean(sl.activeBetId)}
                      onClick={() => updateSlot(slotId, { betAmount: String(chip) })}
                      className={`min-h-[34px] rounded-xl text-[11px] font-black font-mono tabular-nums border transition-all disabled:opacity-50 ${
                        Number(sl.betAmount) === chip
                          ? 'bg-gradient-to-r from-[#D97706] to-[#F59E0B] border-amber-300 text-slate-950'
                          : 'bg-[#141029] border-white/10 text-violet-100 hover:bg-white/10'
                      }`}
                    >
                      ৳{chip}
                    </button>
                  ))}
                </div>

                {phase === 'flying' && sl.activeBetId ? (
                  <button
                    type="button"
                    onClick={() => handleCashOut(slotId)}
                    className="w-full min-h-[46px] py-2.5 rounded-xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FBBF24] text-slate-950 font-black text-sm shadow-lg active:scale-97 transition-all flex items-center justify-center gap-2"
                  >
                    <span>WITHDRAW #{slotId}</span>
                    <span className="font-mono tabular-nums">
                      ৳{(sl.activeBetAmount * multiplier).toFixed(2)}
                    </span>
                  </button>
                ) : sl.activeBetId && phase === 'waiting' ? (
                  <div className="w-full min-h-[46px] py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-xs flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Slot #{slotId} Locked: ৳{sl.activeBetAmount.toFixed(2)} · Takeoff Ready</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePlaceBet(slotId)}
                    disabled={phase !== 'waiting' || sl.isPlacing}
                    className="w-full min-h-[46px] py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] hover:brightness-110 text-white font-black text-sm shadow-lg active:scale-97 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    {phase === 'waiting'
                      ? `BET SLOT #${slotId} · ৳${(Number(sl.betAmount) || 0).toFixed(2)}`
                      : phase === 'flying'
                      ? 'FLIGHT IN PROGRESS...'
                      : 'NEXT ROUND STARTING...'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* All / My / Top Bets Tabs */}
        <div className="bg-[#1D163A] rounded-2xl p-4 border border-violet-500/20 space-y-3">
          <div className="grid grid-cols-3 gap-1.5 bg-[#141029] p-1 rounded-xl">
            {(
              [
                { id: 'all', label: `All (${poolBets.length})` },
                { id: 'my', label: `My (${myLuckyJetBets.length})` },
                { id: 'top', label: `Top (${topBets.length})` }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setBetsTab(t.id)}
                className={`py-2 rounded-lg text-xs font-black transition-all ${
                  betsTab === t.id
                    ? 'bg-violet-600 text-white shadow-2xs'
                    : 'text-violet-300 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {betsTab === 'all' && (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {poolBets.length === 0 ? (
                <div className="py-6 text-center text-xs text-violet-300/60">
                  No active pool bets yet in round #{roundId.slice(-5)}.
                </div>
              ) : (
                poolBets.slice(0, 20).map((b) => (
                  <div
                    key={b.betId || b.id}
                    className="p-2.5 rounded-xl bg-[#141029] border border-white/5 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-white truncate">{b.nickname}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="text-violet-200">৳{b.amount.toFixed(0)}</span>
                      {b.status === 'cashed_out' ? (
                        <span className="text-emerald-400 font-black">{b.cashoutMultiplier?.toFixed(2)}x</span>
                      ) : b.status === 'lost' ? (
                        <span className="text-rose-400 font-bold">Lost</span>
                      ) : (
                        <span className="text-amber-300 font-bold">Flying</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {betsTab === 'my' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {myLuckyJetBets.length === 0 ? (
                <div className="py-6 text-center text-xs text-violet-300/60">
                  No Lucky Jet bets placed yet.
                </div>
              ) : (
                myLuckyJetBets.slice(0, 15).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-[#141029] border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="font-mono text-amber-300">#{b.roundId.slice(-5)}</span>
                        {b.slot ? <span className="text-[10px] text-violet-300">S{b.slot}</span> : null}
                        <span className="tabular-nums">Bet: ৳{b.amount.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-violet-300/60 mt-0.5">{b.time}</div>
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
                ))
              )}
            </div>
          )}

          {betsTab === 'top' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {topBets.length === 0 ? (
                <div className="py-6 text-center text-xs text-violet-300/60">
                  Cash out during flights to rank on the Top Wins board!
                </div>
              ) : (
                topBets.slice(0, 15).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-[#141029] border border-amber-400/20 flex items-center justify-between text-xs font-mono tabular-nums"
                  >
                    <div>
                      <div className="font-black text-amber-300">+{b.cashoutMultiplier?.toFixed(2)}x</div>
                      <div className="text-[10px] text-violet-300/70">Bet ৳{b.amount.toFixed(2)}</div>
                    </div>
                    <div className="font-black text-emerald-400">+৳{(b.winAmount || 0).toFixed(2)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-[#1D163A] border border-violet-500/30 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#7C3AED] to-[#D97706] p-4 flex items-center justify-between text-white">
              <span className="font-black text-sm">How to Play Lucky Jet</span>
              <button type="button" onClick={() => setShowHowToPlay(false)} className="p-1 rounded-full bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 text-xs text-violet-100 space-y-2.5 leading-relaxed">
              <p>1. Place up to 3 simultaneous bets (minimum ৳10 per slot) during the 5-second countdown before Lucky Joe takes off.</p>
              <p>2. Watch the multiplier climb in real time synchronized across every connected device.</p>
              <p>3. Tap WITHDRAW on each slot before Lucky Joe flies away to multiply your stake up to 10,000x!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
