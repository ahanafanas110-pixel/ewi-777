import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, RefreshCw, Plane, History, CheckCircle2, Users, X, WifiOff } from 'lucide-react';
import { AviatorPlaneLogo, Ewi777Logo } from '../components/BrandLogos';
import { AviatorServerState } from '../types';
import { getSyncedAviatorState } from '../utils/syncedMarkets';
import { apiUrl } from '../utils/phoneAndApi';
import { loadTransparentSprite } from '../utils/spriteAlpha';

type RoundPhase = 'waiting' | 'flying' | 'crashed';
type SlotId = 1 | 2 | 3;

interface SlotState {
  betAmount: string;
  autoCashoutEnabled: boolean;
  autoCashoutVal: string;
  queuedForNext: boolean;
  activeBetId: string | null;
  activeBetRoundId: string | null;
  activeBetAmount: number;
  cashedOutInfo: { mult: number; win: number } | null;
  isPlacing: boolean;
}

const MAX_MULTIPLIER = 10000;
const QUICK_CHIPS = [10, 50, 100, 500];
const SLOT_IDS: SlotId[] = [1, 2, 3];
const AVIATOR_PLANE_SPRITE_SRC = '/assets/aistudio/image_03b0df3a.png';

const createInitialSlot = (defaultAmt = '100'): SlotState => ({
  betAmount: defaultAmt,
  autoCashoutEnabled: false,
  autoCashoutVal: '2.00',
  queuedForNext: false,
  activeBetId: null,
  activeBetRoundId: null,
  activeBetAmount: 0,
  cashedOutInfo: null,
  isPlacing: false
});

export const AviatorPlane: React.FC = () => {
  const {
    user,
    aviatorBets,
    crashPoolStates,
    placeCrashBet,
    cancelCrashBet,
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
  const [networkAlertMsg, setNetworkAlertMsg] = useState<string | null>(null);

  const [slots, setSlots] = useState<Record<SlotId, SlotState>>({
    1: createInitialSlot('100'),
    2: createInitialSlot('50'),
    3: createInitialSlot('10')
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const planeSpriteRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const autoCashLockRef = useRef<Record<SlotId, boolean>>({ 1: false, 2: false, 3: false });
  const forcedPoolRef = useRef(crashPoolStates.aviator);
  forcedPoolRef.current = crashPoolStates.aviator;

  const serverStateRef = useRef<{
    roundId: string;
    phase: RoundPhase;
    phaseStartedAt: number;
    serverOffsetMs: number;
    crashPoint: number;
    forcedReason?: string;
  }>({
    roundId: 'AV000000',
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

  const updateSlot = (slotId: SlotId, patch: Partial<SlotState>) => {
    setSlots((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], ...patch }
    }));
  };

  useEffect(() => {
    let active = true;
    loadTransparentSprite(AVIATOR_PLANE_SPRITE_SRC, 'dark-checker')
      .then((dataUrl) => {
        if (!active) return;
        const img = new Image();
        img.onload = () => {
          if (active) planeSpriteRef.current = img;
        };
        img.src = dataUrl;
      })
      .catch(() => {
        const img = new Image();
        img.src = AVIATOR_PLANE_SPRITE_SRC;
        planeSpriteRef.current = img;
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const pool = crashPoolStates.aviator;
    if (pool?.roundId === roundId && pool.forcedReason) {
      setNetworkAlertMsg(pool.forcedReason);
    } else if (phase === 'waiting') {
      setNetworkAlertMsg(null);
    }
  }, [crashPoolStates.aviator, roundId, phase]);

  // Poll authoritative crash engine from server (fallback identical epoch engine)
  useEffect(() => {
    let mounted = true;
    let useFallback = false;

    const applyState = (st: AviatorServerState & { forcedReason?: string }) => {
      if (!mounted) return;
      const clientNow = Date.now();
      const serverOffsetMs = (st.serverNow || clientNow) - clientNow;
      const prevRoundId = serverStateRef.current.roundId;

      serverStateRef.current = {
        roundId: st.roundId,
        phase: st.phase,
        phaseStartedAt: st.phaseStartedAt,
        serverOffsetMs,
        crashPoint: st.crashPoint || 0,
        forcedReason: st.forcedReason
      };

      setRoundId(st.roundId);
      setPhase(st.phase);
      if (st.forcedReason && st.phase === 'crashed') {
        setNetworkAlertMsg(st.forcedReason);
      } else if (st.phase === 'waiting') {
        setNetworkAlertMsg(null);
      }
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

      // Auto-submit any queued bets for the new waiting round
      if (isNewWaiting) {
        SLOT_IDS.forEach((sid) => {
          const sl = curSlots[sid];
          if (sl.queuedForNext && (!sl.activeBetId || clearSlotIds.includes(sid))) {
            const amt = Math.max(10, Number(sl.betAmount) || 50);
            const autoTarget = sl.autoCashoutEnabled
              ? Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(sl.autoCashoutVal) || 2.0))
              : undefined;
            updateSlot(sid, { queuedForNext: false });
            placeBetRef.current('aviator', st.roundId, amt, autoTarget, sid).then((res) => {
              if (res.success && res.betId && mounted) {
                autoCashLockRef.current[sid] = false;
                updateSlot(sid, {
                  activeBetId: res.betId,
                  activeBetRoundId: st.roundId,
                  activeBetAmount: amt,
                  queuedForNext: false
                });
              }
            });
          }
        });
      }
    };

    const pollState = async () => {
      if (useFallback) {
        applyState(getSyncedAviatorState(Date.now()));
        return;
      }
      try {
        const res = await fetch(apiUrl('/api/crash/state?game=aviator'), { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          useFallback = true;
          applyState(getSyncedAviatorState(Date.now()));
          return;
        }
        const data = await res.json().catch(() => null);
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
    const poll = setInterval(pollState, 200);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, []);

  // 60fps Sunburst Stage + Transparent Red Aviator Plane Sprite
  useEffect(() => {
    let rafId = 0;

    const drawPlaneSprite = (
      ctx: CanvasRenderingContext2D,
      dpr: number,
      x: number,
      y: number,
      angleRad: number,
      isFlying: boolean,
      isCrashed: boolean,
      widthPx = 96
    ) => {
      const sprite = planeSpriteRef.current;
      const wPx = widthPx * dpr;
      const hPx = widthPx * 0.62 * dpr;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angleRad);

      if (isFlying) {
        const exGrad = ctx.createLinearGradient(-wPx * 0.68, 0, -wPx * 0.3, 0);
        exGrad.addColorStop(0, 'rgba(225, 29, 72, 0)');
        exGrad.addColorStop(1, 'rgba(251, 113, 133, 0.85)');
        ctx.fillStyle = exGrad;
        ctx.beginPath();
        ctx.moveTo(-wPx * 0.25, -5 * dpr);
        ctx.lineTo(-wPx * 0.7, 0);
        ctx.lineTo(-wPx * 0.25, 5 * dpr);
        ctx.closePath();
        ctx.fill();
      }

      if (sprite && ('width' in sprite ? sprite.width > 0 : (sprite as HTMLImageElement).complete)) {
        // Flip horizontally because image_03b0df3a faces left; scale(-1, 1) makes nose fly right-up!
        ctx.scale(-1, 1);
        ctx.shadowColor = isCrashed ? 'rgba(225, 29, 72, 0.6)' : 'rgba(244, 63, 94, 0.5)';
        ctx.shadowBlur = 14 * dpr;
        ctx.drawImage(sprite, -wPx * 0.5, -hPx * 0.5, wPx, hPx);
      }
      ctx.restore();
    };

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

      ctx.fillStyle = '#0E0E10';
      ctx.fillRect(0, 0, w, h);

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
          ctx.fillStyle = 'rgba(255, 255, 255, 0.028)';
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(originX, 14 * dpr);
      ctx.lineTo(originX, originY);
      ctx.lineTo(w - 14 * dpr, originY);
      ctx.stroke();

      if (currentPhase === 'waiting') {
        const hoverY = originY - 24 * dpr + Math.sin(elapsedSec * 3.5) * 2 * dpr;
        drawPlaneSprite(ctx, dpr, originX + 52 * dpr, hoverY, -0.08, false, false, 78);
        return;
      }

      const progress = Math.min(1, Math.max(0, elapsedSec / 7.5));
      const startX = originX + 6 * dpr;
      const startY = originY - 6 * dpr;
      const endX = startX + (w - 108 * dpr) * (currentPhase === 'crashed' ? Math.min(1.16, progress + 0.14) : progress);
      const endY =
        startY -
        (h - 86 * dpr) *
          Math.pow(currentPhase === 'crashed' ? Math.min(1.08, progress + 0.14) : progress, 0.82);

      const bobY =
        currentPhase === 'flying' && progress > 0.82
          ? Math.sin((elapsedSec - 5.8) * 3.2) * (6 * dpr)
          : 0;
      const tipX = endX;
      const tipY = Math.max(38 * dpr, endY + bobY);

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
        ctx.fillStyle = fillGradOrFallback(areaGrad);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 3.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();

        const angle = -Math.atan2(startY - tipY, Math.max(45 * dpr, tipX - startX)) * 0.45;
        drawPlaneSprite(ctx, dpr, tipX, tipY - 6 * dpr, angle, true, false, 96);
      } else if (currentPhase === 'crashed') {
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.55)';
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([5 * dpr, 5 * dpr]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, Math.min(w - 10 * dpr, tipX), tipY);
        ctx.stroke();
        ctx.setLineDash([]);

        const flyOff = Math.min(1, elapsedSec * 0.35);
        ctx.save();
        ctx.globalAlpha = Math.max(0.25, 1 - flyOff * 0.55);
        drawPlaneSprite(
          ctx,
          dpr,
          Math.min(w - 24 * dpr, tipX + flyOff * 42 * dpr),
          Math.max(24 * dpr, tipY - flyOff * 24 * dpr),
          -0.25,
          false,
          true,
          86
        );
        ctx.restore();
      }
    };

    const fillGradOrFallback = (g: CanvasGradient) => g;

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
          if (pool.forcedReason) {
            setNetworkAlertMsg(pool.forcedReason);
          }
          setPhase('crashed');
          setMultiplier(forcedMult);
          drawSpribeStage('crashed', elapsedSec);

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
          drawSpribeStage('flying', elapsedSec);

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
              cashOutRef.current('aviator', idToCash, target).then((res) => {
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
        drawSpribeStage('crashed', elapsedSec);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePlaceBet = async (slotId: SlotId) => {
    const sl = slots[slotId];
    if (sl.isPlacing) return;
    if (sl.activeBetId) {
      showToast(`Slot #${slotId} already has an active bet for this flight!`);
      return;
    }
    const amt = Number(sl.betAmount);
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum Aviator bet is ৳10');
      return;
    }

    if (phase !== 'waiting') {
      updateSlot(slotId, { queuedForNext: !sl.queuedForNext });
      showToast(!sl.queuedForNext ? `Slot #${slotId} queued for next round` : `Slot #${slotId} queue cancelled`);
      return;
    }

    const autoTarget = sl.autoCashoutEnabled
      ? Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(sl.autoCashoutVal) || 2.0))
      : undefined;
    updateSlot(slotId, { isPlacing: true });
    try {
      const res = await placeCrashBet('aviator', roundId, amt, autoTarget, slotId);
      if (res.success && res.betId) {
        autoCashLockRef.current[slotId] = false;
        updateSlot(slotId, {
          activeBetId: res.betId,
          activeBetRoundId: roundId,
          activeBetAmount: amt,
          cashedOutInfo: null,
          queuedForNext: false
        });
      } else {
        showToast(res.message);
      }
    } finally {
      updateSlot(slotId, { isPlacing: false });
    }
  };

  const handleCancelActiveBet = async (slotId: SlotId) => {
    const sl = slots[slotId];
    if (!sl.activeBetId || phase !== 'waiting') return;
    const idToCancel = sl.activeBetId;
    updateSlot(slotId, { isPlacing: true });
    try {
      const res = await cancelCrashBet('aviator', idToCancel);
      if (res.success) {
        updateSlot(slotId, {
          activeBetId: null,
          activeBetRoundId: null,
          activeBetAmount: 0,
          queuedForNext: false
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
    const res = await cashOutCrashBet('aviator', idToCash, cashMult);
    if (res.success) {
      updateSlot(slotId, { cashedOutInfo: { mult: cashMult, win: res.winAmount } });
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
  const cashedOutBadges = SLOT_IDS.map((sid) => ({ sid, info: slots[sid].cashedOutInfo })).filter(
    (x): x is { sid: SlotId; info: { mult: number; win: number } } => Boolean(x.info)
  );

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
            <span className="font-black text-xs tracking-wider italic text-white">AVIATOR · 3 SLOTS</span>
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
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0E0E10] shadow-xl h-72">
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
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-widest text-rose-300">
                  FLEW AWAY!
                </div>
                <div className="text-5xl font-black font-mono tabular-nums text-[#E11D48]">
                  {multiplier.toFixed(2)}x
                </div>
                {networkAlertMsg && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-200 text-[11px] font-black shadow-lg">
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>{networkAlertMsg}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3 Independent Simultaneous Trade Slots (Queue Next Round + Cancel before takeoff) */}
        <div className="space-y-2.5">
          {SLOT_IDS.map((slotId) => {
            const sl = slots[slotId];
            return (
              <div
                key={slotId}
                className="bg-[#1B1B1E] rounded-2xl p-3.5 border border-white/10 space-y-2.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-amber-300 tracking-wider uppercase">
                    Trade Slot #{slotId}
                  </span>
                  {sl.cashedOutInfo ? (
                    <span className="text-emerald-400 font-black font-mono">
                      Won +৳{sl.cashedOutInfo.win.toFixed(2)} @ {sl.cashedOutInfo.mult.toFixed(2)}x
                    </span>
                  ) : sl.activeBetId ? (
                    <span className="text-emerald-300 font-bold font-mono">
                      Locked: ৳{sl.activeBetAmount.toFixed(0)}
                    </span>
                  ) : sl.queuedForNext ? (
                    <span className="text-amber-300 font-black font-mono">
                      Queued for Next Flight · ৳{(Number(sl.betAmount) || 0).toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold">Min ৳10</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#0E0E10] border border-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400">৳</span>
                    <input
                      type="number"
                      min={10}
                      disabled={Boolean(sl.activeBetId) || sl.queuedForNext}
                      value={sl.betAmount}
                      onChange={(e) => updateSlot(slotId, { betAmount: e.target.value })}
                      className="w-full bg-transparent text-center font-mono font-black text-sm text-white focus:outline-none tabular-nums disabled:opacity-60"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(sl.activeBetId) || sl.queuedForNext}
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
                    disabled={Boolean(sl.activeBetId) || sl.queuedForNext}
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
                      disabled={Boolean(sl.activeBetId) || sl.queuedForNext}
                      onClick={() => updateSlot(slotId, { betAmount: String(chip) })}
                      className={`min-h-[34px] rounded-xl text-[11px] font-black font-mono tabular-nums border transition-all active:scale-95 disabled:opacity-50 ${
                        Number(sl.betAmount) === chip
                          ? 'bg-[#D97706] border-amber-400 text-white'
                          : 'bg-[#0E0E10] border-white/10 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      ৳{chip}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-[#0E0E10] rounded-xl px-3 py-2 border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sl.autoCashoutEnabled}
                      onChange={(e) => updateSlot(slotId, { autoCashoutEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#22C55E]"
                    />
                    <span className="text-[11px] font-bold text-slate-200">Auto Cash Out</span>
                  </label>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      max={MAX_MULTIPLIER}
                      disabled={!sl.autoCashoutEnabled}
                      value={sl.autoCashoutVal}
                      onChange={(e) => updateSlot(slotId, { autoCashoutVal: e.target.value })}
                      className="w-16 bg-[#1B1B1E] border border-white/15 rounded-lg px-2 py-1 text-right font-mono font-black text-xs text-amber-300 focus:outline-none disabled:opacity-40"
                    />
                    <span className="text-xs font-black text-slate-400">x</span>
                  </div>
                </div>

                {phase === 'flying' && sl.activeBetId ? (
                  <button
                    type="button"
                    onClick={() => handleCashOut(slotId)}
                    className="w-full min-h-[46px] py-2.5 rounded-xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FBBF24] text-slate-950 font-black text-sm shadow-lg active:scale-97 transition-all flex items-center justify-center gap-2"
                  >
                    <span>CASH OUT #{slotId}</span>
                    <span className="font-mono tabular-nums">
                      ৳{(sl.activeBetAmount * multiplier).toFixed(2)}
                    </span>
                  </button>
                ) : sl.activeBetId && phase === 'waiting' ? (
                  <button
                    type="button"
                    disabled={sl.isPlacing}
                    onClick={() => handleCancelActiveBet(slotId)}
                    className="w-full min-h-[46px] py-2.5 rounded-xl bg-rose-600/85 hover:bg-rose-600 border border-rose-400/50 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-97 transition-all disabled:opacity-60"
                  >
                    <X className="w-4 h-4" />
                    <span>CANCEL BET #{slotId} (REFUND ৳{sl.activeBetAmount.toFixed(0)})</span>
                  </button>
                ) : sl.queuedForNext ? (
                  <button
                    type="button"
                    onClick={() => handlePlaceBet(slotId)}
                    className="w-full min-h-[46px] py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 border border-rose-400/50 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-97 transition-all"
                  >
                    <X className="w-4 h-4" />
                    <span>CANCEL QUEUED BET (#{slotId} · ৳{(Number(sl.betAmount) || 0).toFixed(0)})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePlaceBet(slotId)}
                    disabled={sl.isPlacing}
                    className={`w-full min-h-[46px] py-2.5 rounded-xl font-black text-sm shadow-lg active:scale-97 transition-all disabled:opacity-45 ${
                      phase === 'waiting'
                        ? 'bg-[#22C55E] hover:bg-emerald-500 text-slate-950'
                        : 'bg-amber-500/90 hover:bg-amber-500 text-slate-950'
                    }`}
                  >
                    {phase === 'waiting'
                      ? `BET SLOT #${slotId} · ৳${(Number(sl.betAmount) || 0).toFixed(2)}`
                      : `QUEUE NEXT ROUND #${slotId} · ৳${(Number(sl.betAmount) || 0).toFixed(2)}`}
                  </button>
                )}
              </div>
            );
          })}
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
              No Aviator bets placed yet. Place up to 3 simultaneous bets or queue for next round!
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
                      {b.slot ? <span className="text-[10px] text-slate-400">S{b.slot}</span> : null}
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
