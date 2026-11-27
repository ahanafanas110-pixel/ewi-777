import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  HelpCircle,
  ChevronDown,
  RefreshCw,
  X,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { Ewi777Logo } from '../components/BrandLogos';
import { AviatorServerState } from '../types';
import { getSyncedCrashEngineState } from '../utils/syncedMarkets';
import { apiUrl } from '../utils/phoneAndApi';

type RoundPhase = 'waiting' | 'flying' | 'crashed';
type SlotId = 1 | 2 | 3;

interface PlaneSlotState {
  stake: string;
  mode: 'manual' | 'auto';
  autoCashEnabled: boolean;
  target: string;
  autoBetEnabled: boolean;
  roundsLeft: number;
  selRounds: number;
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

const TakaCoinBadge: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="flex-shrink-0 select-none"
  >
    <defs>
      <linearGradient id="takaCoinG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="15" fill="url(#takaCoinG)" stroke="#FEF3C7" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="11.5" fill="none" stroke="#78350F" strokeOpacity="0.35" strokeWidth="1" />
    <text
      x="16"
      y="21.5"
      textAnchor="middle"
      fill="#451A03"
      fontSize="16"
      fontWeight="900"
      fontFamily="system-ui, sans-serif"
    >
      ৳
    </text>
  </svg>
);

const createInitialSlot = (defaultAmt: string, autoCash = false, target = '2.00'): PlaneSlotState => ({
  stake: defaultAmt,
  mode: 'manual',
  autoCashEnabled: autoCash,
  target,
  autoBetEnabled: false,
  roundsLeft: 0,
  selRounds: 10,
  queuedForNext: false,
  activeBetId: null,
  activeBetRoundId: null,
  activeBetAmount: 0,
  cashedOutInfo: null,
  isPlacing: false
});

const SIM_PILOTS = [
  'SkyHawk88',
  'AceViper',
  'DhakaJet',
  'TigerPilot',
  'FalconEye',
  'Maverick77',
  'RedWing',
  'AeroKing',
  'StormChaser',
  'JetStream',
  'GoldenWing',
  'HighRoller'
];
const PILOT_COLORS = ['#e11d48', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];

interface SimBot {
  name: string;
  color: string;
  stake: number;
  target: number | null;
  cashedAt: number | null;
  payout: number | null;
}

function generateSimPilots(seedStr: string): SimBot[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stakes = [10, 20, 50, 100, 150, 250, 500];
  return SIM_PILOTS.slice(0, 10).map((name, i) => {
    const stake = stakes[Math.floor(rng() * stakes.length)];
    const r = rng();
    const target =
      r < 0.58 ? +(1.2 + rng() * 1.9).toFixed(2) : r < 0.88 ? +(3.1 + rng() * 5.5).toFixed(2) : null;
    return {
      name,
      color: PILOT_COLORS[i % PILOT_COLORS.length],
      stake,
      target,
      cashedAt: null,
      payout: null
    };
  });
}

export const PlaneGame: React.FC = () => {
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
  const [roundId, setRoundId] = useState<string>('PL000000');
  const [crashHistory, setCrashHistory] = useState<number[]>([
    2.41, 1.18, 6.72, 1.85, 14.35, 1.12, 3.19, 2.07, 1.44, 8.6, 1.62, 4.91, 2.88, 9.14
  ]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => localStorage.getItem('ewi_plane_muted') === 'true');
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'my' | 'top'>('all');
  const [winPopups, setWinPopups] = useState<Array<{ id: string; sid: SlotId; win: number; mult: number }>>([]);
  const [simBots, setSimBots] = useState<SimBot[]>(() => generateSimPilots('PL000000'));

  const [slots, setSlots] = useState<Record<SlotId, PlaneSlotState>>({
    1: createInitialSlot('50', false, '2.00'),
    2: createInitialSlot('100', true, '3.50'),
    3: createInitialSlot('10', true, '5.00')
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveMultiplierRef = useRef<number>(1.0);
  const lastBotCheckRef = useRef<number>(0);
  const waitCountdownElRef = useRef<HTMLDivElement | null>(null);
  const waitBarElRef = useRef<HTMLDivElement | null>(null);
  const flyingMultElRef = useRef<HTMLDivElement | null>(null);
  const crashedMultElRef = useRef<HTMLDivElement | null>(null);
  const slotPayoutRefs = useRef<Record<SlotId, HTMLSpanElement | null>>({ 1: null, 2: null, 3: null });
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const autoCashLockRef = useRef<Record<SlotId, boolean>>({ 1: false, 2: false, 3: false });
  const forcedPoolRef = useRef(crashPoolStates.plane);
  forcedPoolRef.current = crashPoolStates.plane;

  const audioRef = useRef<{
    ctx: AudioContext | null;
    osc: OscillatorNode | null;
    gain: GainNode | null;
  }>({ ctx: null, osc: null, gain: null });

  const serverStateRef = useRef<{
    roundId: string;
    phase: RoundPhase;
    phaseStartedAt: number;
    serverOffsetMs: number;
    crashPoint: number;
    crashedAtMs: number;
  }>({
    roundId: 'PL000000',
    phase: 'waiting',
    phaseStartedAt: Date.now(),
    serverOffsetMs: 0,
    crashPoint: 1.0,
    crashedAtMs: 0
  });

  const cashOutRef = useRef(cashOutCrashBet);
  const loseBetRef = useRef(loseAviatorBet);
  const placeBetRef = useRef(placeCrashBet);
  cashOutRef.current = cashOutCrashBet;
  loseBetRef.current = loseAviatorBet;
  placeBetRef.current = placeCrashBet;

  const playSound = (kind: 'click' | 'bet' | 'takeoff' | 'cashout' | 'crash') => {
    if (mutedRef.current) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audioRef.current.ctx) audioRef.current.ctx = new AC();
      const c = audioRef.current.ctx;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const now = c.currentTime;

      if (kind === 'click') {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(520, now);
        o.frequency.exponentialRampToValueAtTime(240, now + 0.045);
        g.gain.setValueAtTime(0.05, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        o.connect(g);
        g.connect(c.destination);
        o.start(now);
        o.stop(now + 0.05);
      } else if (kind === 'bet') {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(440, now);
        o.frequency.exponentialRampToValueAtTime(660, now + 0.09);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        o.connect(g);
        g.connect(c.destination);
        o.start(now);
        o.stop(now + 0.12);
      } else if (kind === 'cashout') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          const t = now + i * 0.045;
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.001, t);
          g.gain.linearRampToValueAtTime(0.07, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          o.connect(g);
          g.connect(c.destination);
          o.start(t);
          o.stop(t + 0.24);
        });
      } else if (kind === 'crash') {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(300, now);
        o.frequency.exponentialRampToValueAtTime(75, now + 0.38);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        o.connect(g);
        g.connect(c.destination);
        o.start(now);
        o.stop(now + 0.42);
      }
    } catch {
      // Ignore Web Audio blocks
    }
  };

  const pushWinToast = (sid: SlotId, win: number, mult: number) => {
    const id = `${Date.now()}_${sid}`;
    setWinPopups((prev) => [...prev.slice(-3), { id, sid, win, mult }]);
    setTimeout(() => {
      setWinPopups((prev) => prev.filter((p) => p.id !== id));
    }, 2400);
  };

  const updateSlot = (slotId: SlotId, patch: Partial<PlaneSlotState>) => {
    setSlots((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], ...patch }
    }));
  };

  const prevServerPhaseRef = useRef<RoundPhase>('waiting');

  // Poll /api/crash/state?game=plane (fallback deterministic synced engine)
  useEffect(() => {
    let mounted = true;
    let useFallback = false;

    const applyState = (st: AviatorServerState) => {
      if (!mounted) return;
      const clientNow = Date.now();
      const serverOffsetMs = (st.serverNow || clientNow) - clientNow;
      const prevRoundId = serverStateRef.current.roundId;
      const prevPhase = prevServerPhaseRef.current;
      prevServerPhaseRef.current = st.phase;

      const crashedNow = st.phase === 'crashed' && prevPhase !== 'crashed';
      if (crashedNow) {
        playSound('crash');
      }

      serverStateRef.current = {
        roundId: st.roundId,
        phase: st.phase,
        phaseStartedAt: st.phaseStartedAt,
        serverOffsetMs,
        crashPoint: st.crashPoint || 0,
        crashedAtMs: crashedNow
          ? performance.now()
          : st.phase === 'crashed'
          ? serverStateRef.current.crashedAtMs || performance.now()
          : 0
      };

      setRoundId(st.roundId);
      setPhase(st.phase);
      if (Array.isArray(st.crashHistory)) {
        setCrashHistory(st.crashHistory);
      }

      const isNewWaiting = st.phase === 'waiting' && st.roundId !== prevRoundId;
      if (isNewWaiting) {
        autoCashLockRef.current = { 1: false, 2: false, 3: false };
        setSimBots(generateSimPilots(st.roundId));
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

      if (isNewWaiting) {
        SLOT_IDS.forEach((sid) => {
          const sl = curSlots[sid];
          const wantsAuto = sl.autoBetEnabled && (sl.roundsLeft === 0 || sl.roundsLeft >= 1);
          const wantsBet = sl.queuedForNext || wantsAuto;
          if (wantsBet && (!sl.activeBetId || clearSlotIds.includes(sid))) {
            const amt = Math.max(10, Number(sl.stake) || 50);
            const autoTarget = sl.autoCashEnabled
              ? Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(sl.target) || 2.0))
              : undefined;
            const nextRoundsLeft = wantsAuto && sl.roundsLeft > 0 ? sl.roundsLeft - 1 : sl.roundsLeft;
            const keepAuto = wantsAuto && (sl.roundsLeft === 0 || sl.roundsLeft > 1);
            updateSlot(sid, {
              queuedForNext: false,
              roundsLeft: nextRoundsLeft,
              autoBetEnabled: keepAuto
            });
            placeBetRef.current('plane', st.roundId, amt, autoTarget, sid).then((res) => {
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
        applyState(getSyncedCrashEngineState('plane', Date.now()));
        return;
      }
      try {
        const res = await fetch(apiUrl('/api/crash/state?game=plane'), { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          useFallback = true;
          applyState(getSyncedCrashEngineState('plane', Date.now()));
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.success || !data.state) {
          useFallback = true;
          applyState(getSyncedCrashEngineState('plane', Date.now()));
          return;
        }
        applyState(data.state);
      } catch {
        useFallback = true;
        applyState(getSyncedCrashEngineState('plane', Date.now()));
      }
    };

    pollState();
    const poll = setInterval(pollState, 500);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, []);

  // 60fps Red Baron Biplane Canvas Stage + Blast Explosion + Clouds + Runway
  useEffect(() => {
    let rafId = 0;
    const clouds = Array.from({ length: 12 }, (_, i) => ({
      x: (i / 12) * 1.25,
      y: 0.1 + ((i * 37) % 60) / 100,
      scale: 0.55 + (i % 4) * 0.2,
      speed: 0.02 + (i % 5) * 0.008,
      opacity: 0.16 + (i % 4) * 0.05
    }));
    const stars = Array.from({ length: 48 }, (_, i) => ({
      x: ((i * 73) % 997) / 997,
      y: ((i * 41) % 820) / 1000,
      size: 0.9 + (i % 3) * 0.65,
      alpha: 0.35 + (i % 5) * 0.12
    }));
    let smokeParticles: Array<{ x: number; y: number; vx: number; vy: number; r: number; life: number; max: number }> = [];
    let blastEmbers: Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string; life: number; max: number }> = [];
    let lastBlastKey = '';
    let runwayScroll = 0;
    let lastTime = performance.now();

    const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
    const lerpCol = (c1: [number, number, number], c2: [number, number, number], t: number) => {
      const cl = Math.max(0, Math.min(1, t));
      return `rgb(${Math.round(lerp(c1[0], c2[0], cl))},${Math.round(lerp(c1[1], c2[1], cl))},${Math.round(lerp(c1[2], c2[2], cl))})`;
    };

    const drawBiplane = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      ang: number,
      sc: number,
      propP: number,
      scarfP: number,
      showGlow: boolean
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.scale(sc, sc);

      if (showGlow) {
        const glow = ctx.createRadialGradient(34, 0, 2, 34, 0, 34);
        glow.addColorStop(0, 'rgba(251,191,36,0.5)');
        glow.addColorStop(1, 'rgba(225,29,72,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(34, 0, 34, 0, Math.PI * 2);
        ctx.fill();
      }

      // Landing struts & wheel
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-26, 6);
      ctx.lineTo(-32, 13);
      ctx.moveTo(8, 8);
      ctx.lineTo(14, 21);
      ctx.moveTo(22, 8);
      ctx.lineTo(14, 21);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(14, 22, 6, 0, Math.PI * 2);
      ctx.fill();

      // Pilot white scarf streaming in wind
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.quadraticCurveTo(
        -18,
        -11 + Math.sin(scarfP) * 4,
        -30,
        -7 + Math.cos(scarfP * 1.4) * 5
      );
      ctx.stroke();

      // Tail fin
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(-42, -16);
      ctx.quadraticCurveTo(-30, -17, -24, -4);
      ctx.closePath();
      ctx.fill();

      // Crimson fuselage
      const bg = ctx.createLinearGradient(-38, -10, 34, 10);
      bg.addColorStop(0, '#9f1239');
      bg.addColorStop(0.55, '#e11d48');
      bg.addColorStop(1, '#fb7185');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(-36, -3);
      ctx.quadraticCurveTo(-12, -10, 28, -9);
      ctx.lineTo(35, -6);
      ctx.lineTo(35, 7);
      ctx.quadraticCurveTo(10, 11, -36, 4);
      ctx.closePath();
      ctx.fill();

      // Cockpit & golden goggles
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(-4, -9, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-2, -11.5, 4, 2.4);

      // Cowling + Biplane double wings
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(26, -8.5, 9, 16.5, 3);
      ctx.fill();
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.roundRect(2, 4, 22, 4.2, 2);
      ctx.fill();
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.roundRect(5, -5, 23, 4.2, 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, -15);
      ctx.lineTo(7, 6);
      ctx.moveTo(23, -15);
      ctx.lineTo(20, 6);
      ctx.stroke();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(3, -19.5, 28, 5.2, 2.5);
      ctx.fill();

      // Spinning Propeller
      ctx.save();
      ctx.translate(38, 0);
      ctx.fillStyle = 'rgba(226,232,240,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.8, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      const bLen = 19 * Math.sin(propP);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, -bLen);
      ctx.lineTo(0, bLen);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(-1, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    const drawStage = (currentPhase: RoundPhase, elapsedSec: number, curMult: number, now: number, dt: number, rId: string) => {
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
      const padL = 42 * dpr;
      const padR = 24 * dpr;
      const padT = 20 * dpr;
      const padB = 34 * dpr;
      const groundY = h - padB;
      ctx.clearRect(0, 0, w, h);

      // Dynamic Sky Gradient based on altitude
      const alt = currentPhase === 'flying' || currentPhase === 'crashed' ? Math.min(1, Math.log10(Math.max(1, curMult)) / 1.55) : 0;
      const sg = ctx.createLinearGradient(0, 0, 0, h);
      sg.addColorStop(0, lerpCol([16, 24, 42], [10, 7, 24], alt));
      sg.addColorStop(0.58, lerpCol([31, 46, 78], [58, 17, 44], alt));
      sg.addColorStop(1, lerpCol([89, 52, 62], [22, 28, 45], alt));
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);

      // Stars fade in at higher altitude
      const sAlpha = Math.max(0.1, (alt - 0.1) / 0.9);
      stars.forEach((st) => {
        ctx.fillStyle = `rgba(255,255,255,${st.alpha * sAlpha})`;
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.size * dpr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Horizon Sunset Glow
      const sunY = groundY + alt * h * 0.45;
      const sunG = ctx.createRadialGradient(w * 0.72, sunY, 10, w * 0.72, sunY, h * 0.65);
      sunG.addColorStop(0, `rgba(245, 158, 11, ${0.24 * (1 - alt * 0.75)})`);
      sunG.addColorStop(0.45, `rgba(225, 29, 72, ${0.15 * (1 - alt * 0.7)})`);
      sunG.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = sunG;
      ctx.fillRect(0, 0, w, h);

      // Scrolling Clouds
      const cloudSpd =
        currentPhase === 'waiting'
          ? 0.35
          : currentPhase === 'flying'
          ? 2.2 + Math.min(4.2, Math.log2(Math.max(1, curMult)))
          : 1.3;
      clouds.forEach((c) => {
        c.x -= c.speed * cloudSpd * dt;
        if (c.x < -0.25) {
          c.x = 1.2;
        }
        ctx.save();
        ctx.translate(c.x * w, c.y * h);
        ctx.scale(c.scale * dpr * 0.85, c.scale * dpr * 0.85);
        ctx.fillStyle = `rgba(241,245,249,${c.opacity * (1 - alt * 0.3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.arc(24, -8, 22, 0, Math.PI * 2);
        ctx.arc(46, 2, 20, 0, Math.PI * 2);
        ctx.arc(-22, 5, 19, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([4 * dpr, 6 * dpr]);
      for (let i = 1; i <= 4; i++) {
        const gy = lerp(groundY, padT, i / 4.5);
        ctx.beginPath();
        ctx.moveTo(padL, gy);
        ctx.lineTo(w - padR, gy);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Runway
      const rDrop =
        currentPhase === 'flying'
          ? Math.min(h * 0.38, elapsedSec * 28 * dpr)
          : currentPhase === 'crashed'
          ? h * 0.38
          : 0;
      const rY = groundY + rDrop;
      if (rY < h + 40 * dpr) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, rY, w, h - rY + 40 * dpr);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, rY, w, 14 * dpr);
        if (currentPhase === 'flying' && elapsedSec < 1.2) runwayScroll += dt * 420;
        else if (currentPhase === 'waiting') runwayScroll = 0;
        const sp = 44 * dpr;
        const off = (runwayScroll * dpr) % sp;
        ctx.fillStyle = 'rgba(248,250,252,0.55)';
        for (let rx = -sp; rx < w + sp; rx += sp) {
          ctx.fillRect(rx - off, rY + 5.5 * dpr, 22 * dpr, 2.5 * dpr);
        }
        for (let lx = padL; lx < w - padR; lx += 75 * dpr) {
          ctx.fillStyle = currentPhase === 'waiting' ? '#22c55e' : 'rgba(245,158,11,0.8)';
          ctx.beginPath();
          ctx.arc(lx, rY + 1.5 * dpr, 2 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Y-Axis Multiplier Ticks
      ctx.fillStyle = 'rgba(148,163,184,0.65)';
      ctx.font = `600 ${10 * dpr}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'right';
      const baseAxisMax = Math.max(2.0, curMult * 1.15);
      for (let i = 0; i <= 4; i++) {
        const val = 1 + ((baseAxisMax - 1) * i) / 4;
        const ay = lerp(groundY, padT + 12 * dpr, i / 4);
        ctx.fillText(`${val.toFixed(1)}x`, padL - 8 * dpr, ay + 3 * dpr);
      }

      const plotW = w - padL - padR;
      const plotH = groundY - padT;
      let px = padL + 54 * dpr;
      let py = groundY - 18 * dpr;
      let pang = -0.04;

      if (currentPhase === 'waiting') {
        py = groundY - 16 * dpr + Math.sin(now * 0.004) * 1.5 * dpr;
        pang = -0.03;
      } else if (currentPhase === 'flying') {
        const nx = Math.min(0.84, 1 - Math.exp(-elapsedSec * 0.22));
        const ny = Math.min(0.82, Math.pow(nx, 1.32) * 0.92);
        px = padL + 95 * dpr + nx * (plotW - 140 * dpr);
        py = groundY - 22 * dpr - ny * (plotH - 38 * dpr) + Math.sin(now * 0.0055) * 6 * dpr;
        pang = -0.26 - Math.sin(now * 0.004) * 0.04;

        const sx = padL + 70 * dpr;
        const sy = groundY - 10 * dpr;
        const cx = lerp(sx, px, 0.58);
        const cy = lerp(sy, py, 0.16);
        const ag = ctx.createLinearGradient(0, py, 0, groundY);
        ag.addColorStop(0, 'rgba(225,29,72,0.34)');
        ag.addColorStop(0.65, 'rgba(245,158,11,0.12)');
        ag.addColorStop(1, 'rgba(225,29,72,0)');
        ctx.beginPath();
        ctx.moveTo(sx, groundY);
        ctx.lineTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, px, py);
        ctx.lineTo(px, groundY);
        ctx.closePath();
        ctx.fillStyle = ag;
        ctx.fill();

        const lg = ctx.createLinearGradient(sx, sy, px, py);
        lg.addColorStop(0, '#f59e0b');
        lg.addColorStop(0.5, '#f43f5e');
        lg.addColorStop(1, '#ffffff');
        ctx.strokeStyle = 'rgba(244,63,94,0.28)';
        ctx.lineWidth = 7.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, px, py);
        ctx.stroke();
        ctx.strokeStyle = lg;
        ctx.lineWidth = 3.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, px, py);
        ctx.stroke();

        if (Math.random() < 0.65) {
          smokeParticles.push({
            x: px - 24 * dpr,
            y: py + 4 * dpr,
            vx: (-75 - Math.random() * 45) * dpr,
            vy: (12 + (Math.random() - 0.5) * 20) * dpr,
            r: (2.2 + Math.random() * 3.2) * dpr,
            life: 0,
            max: 0.45 + Math.random() * 0.35
          });
        }
      } else if (currentPhase === 'crashed') {
        const nx = Math.min(0.84, 1 - Math.exp(-Math.max(0.2, elapsedSec) * 0.22));
        const ny = Math.min(0.82, Math.pow(nx, 1.32) * 0.92);
        const crashOriginX = padL + 95 * dpr + nx * (plotW - 140 * dpr);
        const crashOriginY = groundY - 22 * dpr - ny * (plotH - 38 * dpr);
        const sinceCrash = serverStateRef.current.crashedAtMs
          ? Math.max(0, (now - serverStateRef.current.crashedAtMs) / 1000)
          : 0.35;
        const flyFrac = Math.min(1, sinceCrash / 0.85);
        px = crashOriginX + flyFrac * flyFrac * w * 0.45;
        py = crashOriginY - flyFrac * flyFrac * h * 0.4;
        pang = -0.35 - flyFrac * 0.25;

        // Spawn explosion blast embers once on crash
        if (lastBlastKey !== rId) {
          lastBlastKey = rId;
          const colors = ['#FDE047', '#FB923C', '#F43F5E', '#FFFFFF'];
          for (let i = 0; i < 22; i++) {
            const a = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
            const spd = (65 + Math.random() * 140) * dpr;
            blastEmbers.push({
              x: crashOriginX,
              y: crashOriginY,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              r: (2.5 + Math.random() * 4) * dpr,
              color: colors[i % colors.length],
              life: 0,
              max: 0.55 + Math.random() * 0.35
            });
          }
        }

        // Shockwave ring
        if (sinceCrash < 0.75) {
          const ringR = (10 + sinceCrash * 130) * dpr;
          const alpha = Math.max(0, 1 - sinceCrash / 0.75);
          ctx.strokeStyle = `rgba(251, 146, 60, ${alpha * 0.85})`;
          ctx.lineWidth = 3 * dpr;
          ctx.beginPath();
          ctx.arc(crashOriginX, crashOriginY, ringR, 0, Math.PI * 2);
          ctx.stroke();

          const flashGrad = ctx.createRadialGradient(crashOriginX, crashOriginY, 2, crashOriginX, crashOriginY, ringR * 0.65);
          flashGrad.addColorStop(0, `rgba(254, 240, 138, ${alpha * 0.7})`);
          flashGrad.addColorStop(0.5, `rgba(244, 63, 94, ${alpha * 0.45})`);
          flashGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(crashOriginX, crashOriginY, ringR * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      smokeParticles = smokeParticles.filter((p) => {
        p.life += dt;
        if (p.life >= p.max) return false;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.fillStyle = `rgba(226,232,240,${(1 - p.life / p.max) * 0.42})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + p.life * 1.4), 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      blastEmbers = blastEmbers.filter((p) => {
        p.life += dt;
        if (p.life >= p.max) return false;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        const alpha = Math.max(0, 1 - p.life / p.max);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 - p.life * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      if (px < w + 120 * dpr && py > -120 * dpr) {
        const pScale = Math.max(0.75, Math.min(1.12, w / (640 * dpr))) * dpr;
        drawBiplane(
          ctx,
          px,
          py,
          pang,
          pScale,
          (now * 0.001 * (currentPhase === 'waiting' ? 18 : 48)) % (Math.PI * 2),
          (now * 0.015) % (Math.PI * 2),
          currentPhase === 'flying'
        );
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const st = serverStateRef.current;
      const serverNowApprox = Date.now() + st.serverOffsetMs;
      const elapsedSec = Math.max(0, (serverNowApprox - st.phaseStartedAt) / 1000);
      const pool = forcedPoolRef.current;

      if (st.phase === 'waiting') {
        const rem = Math.max(0, 5.0 - elapsedSec);
        liveMultiplierRef.current = 1.0;
        if (waitCountdownElRef.current) {
          waitCountdownElRef.current.textContent = `${rem.toFixed(1)}s`;
        }
        if (waitBarElRef.current) {
          waitBarElRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, rem / 5.0))})`;
        }
        drawStage('waiting', elapsedSec, 1.0, now, dt, st.roundId);
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
          if (!st.crashedAtMs) st.crashedAtMs = now;
          liveMultiplierRef.current = forcedMult;
          playSound('crash');
          setPhase('crashed');
          setMultiplier(forcedMult);
          drawStage('crashed', elapsedSec, forcedMult, now, dt, st.roundId);

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
          liveMultiplierRef.current = curMult;
          if (flyingMultElRef.current) {
            flyingMultElRef.current.textContent = `${curMult.toFixed(2)}x`;
            flyingMultElRef.current.style.color =
              curMult >= 10 ? '#FCD34D' : curMult >= 2 ? '#6EE7B7' : '#FFFFFF';
          }
          drawStage('flying', elapsedSec, curMult, now, dt, st.roundId);

          if (now - lastBotCheckRef.current >= 140) {
            lastBotCheckRef.current = now;
            setSimBots((prevBots) => {
              let changed = false;
              const nextBots = prevBots.map((b) => {
                if (b.cashedAt === null && b.target !== null && curMult >= b.target) {
                  changed = true;
                  return { ...b, cashedAt: b.target, payout: +(b.stake * b.target).toFixed(2) };
                }
                return b;
              });
              return changed ? nextBots : prevBots;
            });
          }

          const curSlots = slotsRef.current;
          SLOT_IDS.forEach((sid) => {
            const sl = curSlots[sid];
            const payoutEl = slotPayoutRefs.current[sid];
            if (payoutEl && sl.activeBetId) {
              payoutEl.textContent = `৳${(sl.activeBetAmount * curMult).toFixed(2)}`;
            }
            const target = Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(sl.target) || 2.0));
            if (
              sl.activeBetId &&
              sl.activeBetRoundId === st.roundId &&
              sl.autoCashEnabled &&
              !autoCashLockRef.current[sid] &&
              curMult >= target
            ) {
              autoCashLockRef.current[sid] = true;
              const idToCash = sl.activeBetId;
              updateSlot(sid, { activeBetId: null, activeBetRoundId: null });
              cashOutRef.current('plane', idToCash, target).then((res) => {
                if (res.success) {
                  playSound('cashout');
                  pushWinToast(sid, res.winAmount, target);
                  updateSlot(sid, { cashedOutInfo: { mult: target, win: res.winAmount } });
                } else if (res.crashed) {
                  st.phase = 'crashed';
                  st.crashPoint = res.crashPoint || target;
                  if (!st.crashedAtMs) st.crashedAtMs = performance.now();
                  liveMultiplierRef.current = st.crashPoint;
                  playSound('crash');
                  setPhase('crashed');
                  setMultiplier(res.crashPoint || target);
                }
              });
            }
          });
        }
      } else {
        const finalCrash =
          pool && pool.roundId === st.roundId && Number(pool.forcedCrashMultiplier) > 0
            ? Number(pool.forcedCrashMultiplier)
            : st.crashPoint > 0
            ? st.crashPoint
            : 1.0;
        liveMultiplierRef.current = finalCrash;
        if (crashedMultElRef.current) {
          crashedMultElRef.current.textContent = `${finalCrash.toFixed(2)}x`;
        }
        drawStage('crashed', elapsedSec, finalCrash, now, dt, st.roundId);
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
      showToast(`Slot #${slotId} already has an active bet`);
      return;
    }
    const amt = Number(sl.stake);
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum PLANE bet is ৳10');
      return;
    }

    if (phase !== 'waiting') {
      playSound('click');
      updateSlot(slotId, { queuedForNext: !sl.queuedForNext });
      showToast(!sl.queuedForNext ? `Bet ${slotId} queued for next takeoff` : `Bet ${slotId} queue cancelled`);
      return;
    }

    const autoTarget = sl.autoCashEnabled
      ? Math.min(MAX_MULTIPLIER, Math.max(1.1, Number(sl.target) || 2.0))
      : undefined;
    updateSlot(slotId, { isPlacing: true });
    try {
      const res = await placeCrashBet('plane', roundId, amt, autoTarget, slotId);
      if (res.success && res.betId) {
        playSound('bet');
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
      const res = await cancelCrashBet('plane', idToCancel);
      if (res.success) {
        playSound('click');
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
    const cashMult = liveMultiplierRef.current;
    autoCashLockRef.current[slotId] = true;
    updateSlot(slotId, { activeBetId: null, activeBetRoundId: null });
    const res = await cashOutCrashBet('plane', idToCash, cashMult);
    if (res.success) {
      playSound('cashout');
      pushWinToast(slotId, res.winAmount, cashMult);
      updateSlot(slotId, { cashedOutInfo: { mult: cashMult, win: res.winAmount } });
    } else if (res.crashed) {
      serverStateRef.current.phase = 'crashed';
      serverStateRef.current.crashPoint = res.crashPoint || cashMult;
      serverStateRef.current.crashedAtMs = performance.now();
      playSound('crash');
      setPhase('crashed');
      setMultiplier(res.crashPoint || cashMult);
      showToast(`Flew away @ ${(res.crashPoint || cashMult).toFixed(2)}x!`);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem('ewi_plane_muted', String(next));
  };

  const myPlaneBets = aviatorBets.filter((b) => (!user.id || b.userId === user.id) && b.game === 'plane');
  const poolBets = crashPoolStates.plane?.roundId === roundId ? crashPoolStates.plane.bets || [] : [];
  const totalSimPot =
    simBots.reduce((s, b) => s + b.stake, 0) + poolBets.reduce((s, b) => s + (b.amount || 0), 0);
  const topCashouts = [...simBots]
    .filter((b) => b.payout !== null)
    .sort((a, b) => (b.payout || 0) - (a.payout || 0));

  const pillClass = (m: number) =>
    m >= 10
      ? 'bg-amber-100 text-amber-900 border-amber-300'
      : m >= 2
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
      : 'bg-sky-100 text-sky-900 border-sky-300';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      {/* Sticky Official Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('home');
              window.location.hash = '#/';
            }}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Ewi777Logo height={34} logoUrl={adminSettings.appLogoUrl} />
          <div className="min-w-0 hidden xs:block">
            <div className="text-xs font-black tracking-wider uppercase text-cyan-700 leading-none">
              PLANE
            </div>
            <div className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
              Casino · 3 Slots
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(user.lockedBalance || 0) > 0 && (
            <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-800 tabular-nums">
              Hold ৳{(user.lockedBalance || 0).toFixed(0)}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveTab('deposit');
              window.location.hash = '#/deposit';
            }}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-50 border border-cyan-200 px-2.5 py-1.5 text-xs font-mono font-black text-cyan-800 tabular-nums active:scale-95"
          >
            <TakaCoinBadge size={18} />
            <span>৳{Math.max(0, (user.balance || 0) - (user.lockedBalance || 0)).toFixed(2)}</span>
            <RefreshCw className="w-3 h-3 opacity-70" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
            aria-label="Sound"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
            aria-label="How to play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="p-3 space-y-3">
        {/* Recent Crash History Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 px-1.5 whitespace-nowrap">
              PLANE
            </span>
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {crashHistory.slice(0, 14).map((m, i) => (
                <span
                  key={`${m}-${i}`}
                  className={`flex-shrink-0 px-2 py-0.5 rounded-lg border font-mono text-[11px] font-black tabular-nums ${pillClass(
                    m
                  )} ${i === 0 ? 'ring-1 ring-cyan-500/40' : ''}`}
                >
                  {m.toFixed(2)}x
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700"
            >
              <span>Rounds</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {historyOpen && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
              {crashHistory.map((m, i) => (
                <span
                  key={`all-${m}-${i}`}
                  className={`px-2 py-0.5 rounded-lg border font-mono text-[11px] font-black tabular-nums ${pillClass(m)}`}
                >
                  {m.toFixed(2)}x
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Biplane Aviation Flight Stage */}
        <div className="relative h-64 rounded-2xl overflow-hidden border border-slate-300 bg-[#0b101b] shadow-lg select-none">
          <canvas ref={canvasRef} className="w-full h-full block" />

          <div className="pointer-events-none absolute top-2.5 left-3 flex items-center gap-2 rounded-lg bg-slate-950/75 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-slate-200">
            <span>#{roundId.slice(-6)}</span>
            <span className="opacity-30">|</span>
            <span className="text-cyan-300 uppercase tracking-wider">
              {phase === 'waiting' ? 'Runway Ready' : phase === 'flying' ? 'Airborne' : 'Flew Away'}
            </span>
          </div>

          {/* Floating Live Cashout Badges */}
          <div className="pointer-events-none absolute top-2.5 right-3 flex flex-col items-end gap-1">
            {winPopups.map((wp) => (
              <div
                key={wp.id}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 text-slate-950 px-2.5 py-1 text-xs font-black shadow-lg tabular-nums"
              >
                <span className="px-1.5 py-0.5 rounded bg-black/15 text-[9px]">B{wp.sid}</span>
                <span>+৳{wp.win.toFixed(2)}</span>
                <span className="font-mono text-[10px]">@{wp.mult.toFixed(2)}x</span>
              </div>
            ))}
          </div>

          {/* Center HUD */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            {phase === 'waiting' && (
              <div className="bg-slate-950/70 backdrop-blur-md border border-white/15 rounded-2xl px-6 py-3.5 shadow-xl">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  Place Your Bets
                </div>
                <div ref={waitCountdownElRef} className="text-4xl font-black font-mono tabular-nums text-white mt-0.5">
                  {countdown.toFixed(1)}s
                </div>
                <div className="w-44 h-2 bg-white/10 rounded-full overflow-hidden mt-2.5 mx-auto">
                  <div
                    ref={waitBarElRef}
                    className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 origin-left"
                    style={{ transform: `scaleX(${Math.min(1, countdown / 5.0)})` }}
                  />
                </div>
              </div>
            )}

            {phase === 'flying' && (
              <div
                ref={flyingMultElRef}
                className="text-5xl font-black font-mono tabular-nums tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] text-white"
              >
                {multiplier.toFixed(2)}x
              </div>
            )}

            {phase === 'crashed' && (
              <div className="bg-slate-950/75 backdrop-blur-md border border-rose-500/45 rounded-2xl px-6 py-3.5 shadow-[0_0_32px_rgba(225,29,72,0.35)]">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-300">
                  Flew Away!
                </div>
                <div ref={crashedMultElRef} className="text-5xl font-black font-mono tabular-nums text-rose-500 mt-0.5">
                  {multiplier.toFixed(2)}x
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3 Simultaneous Bet Cards */}
        <div className="space-y-2.5">
          {SLOT_IDS.map((slotId) => {
            const sl = slots[slotId];
            const locked =
              Boolean(sl.activeBetId) || sl.queuedForNext || sl.autoBetEnabled;
            const curNum = Number(sl.stake) || 10;

            return (
              <div
                key={slotId}
                className={`rounded-2xl p-3 border transition-colors shadow-xs bg-white ${
                  sl.activeBetId && phase === 'flying'
                    ? 'border-cyan-400'
                    : sl.cashedOutInfo
                    ? 'border-emerald-400'
                    : sl.activeBetId || sl.queuedForNext
                    ? 'border-rose-400'
                    : 'border-slate-200'
                }`}
              >
                {/* Head */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-black uppercase text-slate-700">
                      Bet {slotId}
                    </span>
                    {sl.cashedOutInfo && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        +৳{sl.cashedOutInfo.win.toFixed(2)} @{sl.cashedOutInfo.mult.toFixed(2)}x
                      </span>
                    )}
                  </div>

                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                    {(['manual', 'auto'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          updateSlot(slotId, { mode: m });
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-colors ${
                          sl.mode === m
                            ? 'bg-[#0891B2] text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body: Controls + Big Action Button */}
                <div className="grid grid-cols-12 gap-2.5 items-stretch">
                  <div className="col-span-7 space-y-1.5">
                    <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 px-1.5 py-1">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          playSound('click');
                          updateSlot(slotId, { stake: String(Math.max(10, curNum - 10)) });
                        }}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-black text-base text-slate-700 disabled:opacity-40"
                      >
                        −
                      </button>
                      <div className="flex-1 flex items-center justify-center gap-1 px-1 min-w-0">
                        <TakaCoinBadge size={16} />
                        <input
                          type="number"
                          min={10}
                          disabled={locked}
                          value={sl.stake}
                          onChange={(e) => updateSlot(slotId, { stake: e.target.value })}
                          className="w-full bg-transparent text-center font-mono font-black text-sm text-slate-900 focus:outline-none tabular-nums disabled:opacity-55"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          playSound('click');
                          updateSlot(slotId, { stake: String(Math.min(50000, curNum + 10)) });
                        }}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-black text-base text-slate-700 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <div className="grid grid-cols-6 gap-1">
                      {QUICK_CHIPS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            playSound('click');
                            updateSlot(slotId, { stake: String(c) });
                          }}
                          className={`py-1.5 rounded-lg border font-mono text-[10px] font-black tabular-nums disabled:opacity-40 ${
                            Number(sl.stake) === c
                              ? 'bg-cyan-50 border-cyan-500 text-cyan-800'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          playSound('click');
                          updateSlot(slotId, { stake: String(Math.max(10, Math.floor(curNum / 2))) });
                        }}
                        className="py-1.5 rounded-lg border bg-slate-50 border-slate-200 font-mono text-[10px] font-black text-slate-700 disabled:opacity-40"
                      >
                        ½
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          playSound('click');
                          updateSlot(slotId, { stake: String(Math.min(50000, curNum * 2)) });
                        }}
                        className="py-1.5 rounded-lg border bg-slate-50 border-slate-200 font-mono text-[10px] font-black text-slate-700 disabled:opacity-40"
                      >
                        2×
                      </button>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="col-span-5">
                    {phase === 'flying' && sl.activeBetId ? (
                      <button
                        type="button"
                        onClick={() => handleCashOut(slotId)}
                        className="w-full h-full min-h-[70px] rounded-xl bg-gradient-to-b from-[#06B6D4] to-[#0891B2] border border-cyan-300 text-white font-black flex flex-col items-center justify-center shadow-lg active:scale-98"
                      >
                        <span className="text-sm uppercase tracking-wider">CASH OUT</span>
                        <span
                          ref={(el) => {
                            slotPayoutRefs.current[slotId] = el;
                          }}
                          className="font-mono text-xs tabular-nums"
                        >
                          ৳{(sl.activeBetAmount * liveMultiplierRef.current).toFixed(2)}
                        </span>
                      </button>
                    ) : sl.activeBetId && phase === 'waiting' ? (
                      <button
                        type="button"
                        disabled={sl.isPlacing}
                        onClick={() => handleCancelActiveBet(slotId)}
                        className="w-full h-full min-h-[70px] rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 border border-rose-400 text-white font-black flex flex-col items-center justify-center shadow-md active:scale-98 disabled:opacity-60"
                      >
                        <span className="text-sm uppercase flex items-center gap-1">
                          <X className="w-4 h-4" /> CANCEL
                        </span>
                        <span className="font-mono text-[11px] tabular-nums">
                          ৳{sl.activeBetAmount.toFixed(0)}
                        </span>
                      </button>
                    ) : sl.queuedForNext ? (
                      <button
                        type="button"
                        onClick={() => handlePlaceBet(slotId)}
                        className="w-full h-full min-h-[70px] rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 border border-rose-400 text-white font-black flex flex-col items-center justify-center shadow-md active:scale-98"
                      >
                        <span className="text-sm uppercase">CANCEL</span>
                        <span className="font-mono text-[11px]">Queued Next</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={sl.isPlacing}
                        onClick={() => handlePlaceBet(slotId)}
                        className={`w-full h-full min-h-[70px] rounded-xl font-black flex flex-col items-center justify-center shadow-md active:scale-98 disabled:opacity-50 ${
                          phase === 'waiting'
                            ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 border border-emerald-300 text-slate-950'
                            : 'bg-gradient-to-b from-cyan-500 to-cyan-700 border border-cyan-400 text-white'
                        }`}
                      >
                        <span className="text-base uppercase tracking-wider">
                          {phase === 'waiting' ? 'BET' : 'BET NEXT'}
                        </span>
                        <span className="font-mono text-xs tabular-nums">
                          ৳{curNum.toFixed(2)}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Foot: Auto Cash Out & Auto Bet */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        updateSlot(slotId, { autoCashEnabled: !sl.autoCashEnabled });
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                        sl.autoCashEnabled
                          ? 'bg-cyan-50 border-cyan-400 text-cyan-800'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>Auto Cash Out</span>
                    </button>
                    <div className="flex items-center rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 w-20">
                      <input
                        type="number"
                        step="0.1"
                        min="1.1"
                        max={MAX_MULTIPLIER}
                        disabled={!sl.autoCashEnabled}
                        value={sl.target}
                        onChange={(e) => updateSlot(slotId, { target: e.target.value })}
                        className="w-full bg-transparent text-right font-mono font-bold text-xs text-slate-900 focus:outline-none disabled:opacity-40"
                      />
                      <span className="text-[11px] font-mono text-slate-400 ml-0.5">x</span>
                    </div>
                  </div>

                  {sl.mode === 'auto' && (
                    <div className="flex items-center gap-1.5">
                      {!sl.autoBetEnabled && (
                        <select
                          value={sl.selRounds}
                          onChange={(e) => updateSlot(slotId, { selRounds: Number(e.target.value) })}
                          className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700"
                        >
                          <option value={5}>5x</option>
                          <option value={10}>10x</option>
                          <option value={25}>25x</option>
                          <option value={0}>∞</option>
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click');
                          if (!sl.autoBetEnabled) {
                            updateSlot(slotId, {
                              autoBetEnabled: true,
                              roundsLeft: sl.selRounds
                            });
                            if (phase === 'waiting' && !sl.activeBetId) {
                              handlePlaceBet(slotId);
                            }
                          } else {
                            updateSlot(slotId, { autoBetEnabled: false, roundsLeft: 0 });
                          }
                        }}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black border ${
                          sl.autoBetEnabled
                            ? 'bg-rose-600 border-rose-400 text-white'
                            : 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        }`}
                      >
                        {sl.autoBetEnabled
                          ? `Stop (${sl.roundsLeft === 0 ? '∞' : sl.roundsLeft})`
                          : 'Auto Bet'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pilots / My Bets / Top Wins Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-2 border-b border-slate-100 grid grid-cols-3 gap-1 bg-slate-50">
            {(
              [
                { id: 'all', label: 'All Bets' },
                { id: 'my', label: `My Bets (${myPlaneBets.length})` },
                { id: 'top', label: 'Top Wins' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveFeedTab(t.id)}
                className={`py-2 rounded-xl text-xs font-black transition-colors ${
                  activeFeedTab === t.id
                    ? 'bg-[#0891B2] text-white shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-3.5 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
            <span>
              Pilots: <strong className="text-slate-900 font-mono">{simBots.length + poolBets.length}</strong>
            </span>
            <span>
              Total Pot: <strong className="text-cyan-700 font-mono">৳{totalSimPot.toLocaleString()}</strong>
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {activeFeedTab === 'all' &&
              [
                ...poolBets.map((pb) => ({
                  key: pb.betId || pb.id,
                  name: pb.nickname,
                  color: '#06b6d4',
                  stake: pb.amount,
                  cashedAt: pb.status === 'cashed_out' ? pb.cashoutMultiplier || null : null,
                  payout: pb.status === 'cashed_out' ? (pb.payoutAmount || pb.amount * (pb.cashoutMultiplier || 1)) : null
                })),
                ...simBots.map((b) => ({
                  key: b.name,
                  name: b.name,
                  color: b.color,
                  stake: b.stake,
                  cashedAt: b.cashedAt,
                  payout: b.payout
                }))
              ].map((p) => {
                const won = p.cashedAt !== null && p.payout !== null;
                return (
                  <div
                    key={p.key}
                    className={`grid grid-cols-12 items-center px-3.5 py-2 text-xs ${
                      won ? 'bg-emerald-50/70' : ''
                    }`}
                  >
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name[0]}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">
                        {p.name}
                      </span>
                    </div>
                    <div className="col-span-3 text-right font-mono text-slate-600 tabular-nums">
                      ৳{p.stake.toFixed(0)}
                    </div>
                    <div className="col-span-4 text-right font-mono tabular-nums">
                      {won ? (
                        <div>
                          <div className="font-black text-emerald-700">
                            ৳{p.payout!.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-emerald-800">
                            {p.cashedAt!.toFixed(2)}x
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">{phase === 'crashed' ? 'Flew away' : '—'}</span>
                      )}
                    </div>
                  </div>
                );
              })}

            {activeFeedTab === 'my' &&
              (myPlaneBets.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No PLANE bets logged yet. Place a bet above!
                </div>
              ) : (
                myPlaneBets.slice(0, 20).map((b) => (
                  <div
                    key={b.id}
                    className={`grid grid-cols-12 items-center px-3.5 py-2.5 text-xs ${
                      b.status === 'cashed_out' ? 'bg-emerald-50/70' : ''
                    }`}
                  >
                    <div className="col-span-5 flex items-center gap-1.5 font-mono">
                      <span className="text-slate-500">#{b.roundId.slice(-5)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-black">
                        B{b.slot || 1}
                      </span>
                    </div>
                    <div className="col-span-3 text-right font-mono font-bold tabular-nums">
                      ৳{b.amount.toFixed(0)}
                    </div>
                    <div className="col-span-4 text-right font-mono tabular-nums">
                      {b.status === 'cashed_out' ? (
                        <div>
                          <div className="font-black text-emerald-700">
                            +৳{(b.winAmount || 0).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-emerald-800">
                            @{b.cashoutMultiplier?.toFixed(2)}x
                          </div>
                        </div>
                      ) : b.status === 'lost' ? (
                        <span className="text-rose-600 font-bold text-[11px]">Flew Away</span>
                      ) : (
                        <span className="text-cyan-700 font-bold text-[11px]">Flying</span>
                      )}
                    </div>
                  </div>
                ))
              ))}

            {activeFeedTab === 'top' &&
              (topCashouts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Waiting for cashouts in this flight.
                </div>
              ) : (
                topCashouts.map((p, idx) => (
                  <div
                    key={`${p.name}-${idx}`}
                    className="grid grid-cols-12 items-center px-3.5 py-2 text-xs bg-emerald-50/60"
                  >
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <span className="font-mono font-black text-cyan-700">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold truncate">{p.name}</span>
                    </div>
                    <div className="col-span-3 text-right font-mono tabular-nums">
                      ৳{p.stake.toFixed(0)}
                    </div>
                    <div className="col-span-4 text-right font-mono tabular-nums">
                      <div className="font-black text-cyan-700">
                        ৳{p.payout!.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        {p.cashedAt!.toFixed(2)}x
                      </div>
                    </div>
                  </div>
                ))
              ))}
          </div>
        </div>
      </div>

      {/* How To Play Modal */}
      {showRulesModal && (
        <div
          onClick={() => setShowRulesModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-base uppercase tracking-wide text-slate-900">How To Play PLANE</h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="block text-slate-900">1. Place Up To 3 Simultaneous Bets</strong>
                Bet in Bangladeshi Taka (৳) on up to 3 independent slots before takeoff or queue bets for the next round mid-flight.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="block text-slate-900">2. Watch The Climb</strong>
                The biplane launches from the runway and multiplies your stake from 1.00x upward.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="block text-slate-900">3. Cash Out Before Fly-Away</strong>
                Press CASH OUT or enable Auto Cash Out to secure your winnings before the plane blasts off!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
