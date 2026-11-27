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

const CHIP_CONFIGS = [
  { value: 10, fill: '#059669', dark: '#064E3B', rim: '#A7F3D0', text: '#FFFFFF' },
  { value: 20, fill: '#0284C7', dark: '#0C4A6E', rim: '#BAE6FD', text: '#FFFFFF' },
  { value: 50, fill: '#DC2626', dark: '#7F1D1D', rim: '#FECACA', text: '#FFFFFF' },
  { value: 100, fill: '#4F46E5', dark: '#312E81', rim: '#C7D2FE', text: '#FFFFFF' },
  { value: 500, fill: '#1E293B', dark: '#020617', rim: '#FDE047', text: '#FDE047' }
];

// Standard French Call Bet Wheel Sectors
const VOISINS_NUMBERS = [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
const TIER_NUMBERS = [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];
const ORPHELINS_NUMBERS = [1, 20, 14, 31, 9, 17, 34, 6];
const ZERO_GAME_NUMBERS = [12, 35, 3, 26, 0, 32, 15];

function formatCompactChip(amt: number): string {
  if (amt >= 1000) return `${+(amt / 1000).toFixed(1)}k`;
  return String(amt);
}

/** Realistic Striped Casino Chip Token (SVG) */
const ChipToken: React.FC<{
  cfg: (typeof CHIP_CONFIGS)[number];
  active: boolean;
  onClick: () => void;
}> = ({ cfg, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center transition-all duration-150 ${
      active ? '-translate-y-1.5 scale-110 z-10' : 'opacity-85 hover:opacity-100 active:scale-95'
    }`}
    aria-label={`Select ৳${cfg.value} chip`}
  >
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
        active ? 'ring-2 ring-amber-400 shadow-[0_6px_16px_rgba(251,191,36,0.45)]' : ''
      }`}
    >
      <svg viewBox="0 0 64 64" className="w-12 h-12 block">
        <defs>
          <radialGradient id={`chip_${cfg.value}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={cfg.fill} />
            <stop offset="100%" stopColor={cfg.dark} />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill={`url(#chip_${cfg.value})`} stroke="#0F172A" strokeWidth="1.5" />
        {/* 8 Casino Edge Stripes */}
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={cfg.rim}
          strokeWidth="4.5"
          strokeDasharray="6.8 6.8"
        />
        <circle cx="32" cy="32" r="21" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
        <circle cx="32" cy="32" r="18.5" fill={cfg.dark} stroke="#FDE68A" strokeOpacity="0.45" strokeWidth="0.9" />
        <text
          x="32"
          y="35.5"
          textAnchor="middle"
          fill={cfg.text}
          fontSize="12.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          ৳{cfg.value}
        </text>
      </svg>
    </div>
  </button>
);

/** Miniature Stacked Casino Chip Badge Placed on Table Felt */
const PlacedChipMarker: React.FC<{ amount: number; isPlacedOnly?: boolean }> = ({ amount, isPlacedOnly }) => {
  const color =
    amount >= 500
      ? 'bg-gradient-to-b from-slate-800 to-slate-950 text-amber-300 border-amber-400'
      : amount >= 100
      ? 'bg-gradient-to-b from-indigo-500 to-indigo-800 text-white border-indigo-200'
      : amount >= 50
      ? 'bg-gradient-to-b from-rose-500 to-rose-800 text-white border-rose-200'
      : amount >= 20
      ? 'bg-gradient-to-b from-sky-500 to-sky-800 text-white border-sky-200'
      : 'bg-gradient-to-b from-emerald-500 to-emerald-800 text-white border-emerald-200';

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[23px] h-[23px] px-1 rounded-full border-2 border-dashed text-[8.5px] font-black shadow-[0_4px_8px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.35)] tabular-nums ${color} ${
        isPlacedOnly ? 'ring-1 ring-amber-300' : 'ring-1 ring-white/90'
      }`}
    >
      {formatCompactChip(amount)}
    </span>
  );
};

/** Classic Crystal/Brass Casino Marker Dolly for Winning Number */
const WinDollyMarker: React.FC = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
  >
    <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 border border-white/80 shadow-inner" />
    <span className="w-5 h-1.5 -mt-0.5 rounded-full bg-gradient-to-b from-amber-200 to-amber-600 border border-amber-900/60" />
  </span>
);

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
  const [hoveredWheelIdx, setHoveredWheelIdx] = useState<number | null>(null);
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
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const wheelAngleRef = useRef<number>(0);
  const ballAngleRef = useRef<number>(0);
  const ballRadiusRatioRef = useRef<number>(0.885);
  const lastPhaseRef = useRef<string>(gameState.phase);
  const lastTickSectorRef = useRef<number>(-1);

  // Subtle Web Audio ball click / pocket drop sound
  const playRouletteSfx = (kind: 'tick' | 'drop') => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'drop' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(kind === 'drop' ? 580 : 1420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(kind === 'drop' ? 280 : 820, ctx.currentTime + 0.045);
      gain.gain.setValueAtTime(kind === 'drop' ? 0.05 : 0.014, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  };

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
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [tzOffset, settleRouletteRound]);

  // Continuous 60fps HiDPI Luxury European Single-Zero Roulette Wheel
  useEffect(() => {
    let rafId = 0;
    const pocketCount = ROULETTE_WHEEL_ORDER.length;
    const pocketArc = (Math.PI * 2) / pocketCount;

    const render = () => {
      const canvas = canvasRef.current;
      const gs = gameStateRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const cssSize = Math.max(250, Math.round(rect.width || 292));
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const target = Math.floor(cssSize * dpr);
        if (canvas.width !== target || canvas.height !== target) {
          canvas.width = target;
          canvas.height = target;
        }

        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const cx = w / 2;
          const cy = h / 2;
          const outerR = Math.min(cx, cy) - 6 * dpr;

          const winIdx = Math.max(0, ROULETTE_WHEEL_ORDER.indexOf(gs.winningNumber));
          const targetRelAngle = winIdx * pocketArc + pocketArc / 2;

          if (lastPhaseRef.current !== gs.phase) {
            if (gs.phase === 'result') playRouletteSfx('drop');
            lastPhaseRef.current = gs.phase;
          }

          // Multi-stage realistic European Roulette Ball Physics
          if (gs.phase === 'betting') {
            wheelAngleRef.current += 0.005;
            ballAngleRef.current -= 0.012;
            ballRadiusRatioRef.current += (0.885 - ballRadiusRatioRef.current) * 0.12;
          } else if (gs.phase === 'spinning') {
            const remRatio = Math.max(0, Math.min(1, gs.phaseRemaining / 6));
            const wheelSpeed = 0.018 + remRatio * 0.038;
            wheelAngleRef.current += wheelSpeed;

            if (remRatio > 0.48) {
              // Fast outer track orbit
              ballAngleRef.current -= 0.085 + remRatio * 0.12;
              const trackJitter = Math.sin(ballAngleRef.current * 4) * 0.004;
              ballRadiusRatioRef.current += (0.885 + trackJitter - ballRadiusRatioRef.current) * 0.16;
              const sector = Math.floor(
                (((ballAngleRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)
              );
              if (sector !== lastTickSectorRef.current && remRatio < 0.78) {
                lastTickSectorRef.current = sector;
                playRouletteSfx('tick');
              }
            } else if (remRatio > 0.16) {
              // Drop across diamond deflectors with realistic radial bounce
              const dropProgress = 1 - (remRatio - 0.16) / 0.32; // 0 -> 1
              const desiredBall = wheelAngleRef.current + targetRelAngle;
              const diff = Math.atan2(
                Math.sin(desiredBall - ballAngleRef.current),
                Math.cos(desiredBall - ballAngleRef.current)
              );
              ballAngleRef.current += (diff * 0.09) - (1 - dropProgress) * 0.06;
              const bounce = Math.abs(Math.sin(dropProgress * Math.PI * 3.5)) * (1 - dropProgress) * 0.045;
              const targetR = 0.86 - dropProgress * 0.28 + bounce;
              ballRadiusRatioRef.current += (targetR - ballRadiusRatioRef.current) * 0.22;
              const sector = Math.floor(
                (((ballAngleRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)
              );
              if (sector !== lastTickSectorRef.current) {
                lastTickSectorRef.current = sector;
                playRouletteSfx('tick');
              }
            } else {
              // Lock smoothly into the recessed drop pocket
              const desiredBall = wheelAngleRef.current + targetRelAngle;
              const diff = Math.atan2(
                Math.sin(desiredBall - ballAngleRef.current),
                Math.cos(desiredBall - ballAngleRef.current)
              );
              ballAngleRef.current += diff * 0.26;
              const settleBounce = Math.sin((0.16 - remRatio) * 55) * 0.012 * (remRatio / 0.16);
              ballRadiusRatioRef.current += (0.555 + settleBounce - ballRadiusRatioRef.current) * 0.28;
            }
          } else {
            // Result hold phase — ball rotates smoothly locked in the winning pocket
            wheelAngleRef.current += 0.0045;
            ballAngleRef.current = wheelAngleRef.current + targetRelAngle;
            ballRadiusRatioRef.current += (0.555 - ballRadiusRatioRef.current) * 0.24;
          }

          ctx.clearRect(0, 0, w, h);

          // Studio cast shadow beneath wooden bowl
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy + 4 * dpr, outerR, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.fill();
          ctx.restore();

          // 1. Deep Lacquered Rosewood / Mahogany Bowl Rim
          const woodGrad = ctx.createRadialGradient(
            cx - outerR * 0.28,
            cy - outerR * 0.28,
            outerR * 0.3,
            cx,
            cy,
            outerR
          );
          woodGrad.addColorStop(0, '#8A3315');
          woodGrad.addColorStop(0.45, '#5D1E0C');
          woodGrad.addColorStop(0.82, '#3B1005');
          woodGrad.addColorStop(0.96, '#230802');
          woodGrad.addColorStop(1, '#120401');
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
          ctx.fillStyle = woodGrad;
          ctx.fill();

          // Subtle concentric wood grain lathe rings
          for (let ring = 0.92; ring <= 0.985; ring += 0.016) {
            ctx.beginPath();
            ctx.arc(cx, cy, outerR * ring, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 200, 140, 0.08)';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();
          }

          // Outer brushed gold trim ring + 16 brass mahogany rim studs
          ctx.beginPath();
          ctx.arc(cx, cy, outerR - 2.2 * dpr, 0, Math.PI * 2);
          ctx.lineWidth = 2.2 * dpr;
          ctx.strokeStyle = '#E5C158';
          ctx.stroke();

          for (let s = 0; s < 16; s++) {
            const sa = (s * Math.PI * 2) / 16;
            const sr = outerR * 0.955;
            const sx = cx + Math.cos(sa) * sr;
            const sy = cy + Math.sin(sa) * sr;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = s % 2 === 0 ? '#FEF08A' : '#D4AF37';
            ctx.fill();
          }

          // 2. Concave Slanted Ball Track + Lip Shadow
          const trackOuterR = outerR * 0.91;
          const trackGrad = ctx.createRadialGradient(cx, cy, outerR * 0.72, cx, cy, trackOuterR);
          trackGrad.addColorStop(0, '#1D0803');
          trackGrad.addColorStop(0.62, '#4A190B');
          trackGrad.addColorStop(0.88, '#2D0D05');
          trackGrad.addColorStop(1, '#140401');
          ctx.beginPath();
          ctx.arc(cx, cy, trackOuterR, 0, Math.PI * 2);
          ctx.fillStyle = trackGrad;
          ctx.fill();

          // Inner mahogany shelf edge highlight
          ctx.beginPath();
          ctx.arc(cx, cy, trackOuterR - 1 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.25)';
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();

          // 8 Alternating Vertical & Horizontal Diamond Brass/Chrome Deflector Canoes
          for (let d = 0; d < 8; d++) {
            const da = (d * Math.PI) / 4;
            const dr = outerR * 0.84;
            const dx = cx + Math.cos(da) * dr;
            const dy = cy + Math.sin(da) * dr;
            const isVerticalCanoe = d % 2 === 0;
            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(da + (isVerticalCanoe ? 0 : Math.PI / 2));

            // Drop shadow under deflector
            ctx.beginPath();
            ctx.moveTo(0, -3.2 * dpr);
            ctx.lineTo(6.2 * dpr, 0.8 * dpr);
            ctx.lineTo(0, 4.4 * dpr);
            ctx.lineTo(-6.2 * dpr, 0.8 * dpr);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fill();

            // 3D Beveled Diamond Body
            ctx.beginPath();
            ctx.moveTo(0, -3.6 * dpr);
            ctx.lineTo(5.8 * dpr, 0);
            ctx.lineTo(0, 3.6 * dpr);
            ctx.lineTo(-5.8 * dpr, 0);
            ctx.closePath();
            const defGrad = ctx.createLinearGradient(-5 * dpr, -3 * dpr, 5 * dpr, 3 * dpr);
            defGrad.addColorStop(0, '#FEF08A');
            defGrad.addColorStop(0.5, '#D4AF37');
            defGrad.addColorStop(1, '#78350F');
            ctx.fillStyle = defGrad;
            ctx.fill();
            ctx.lineWidth = 0.7 * dpr;
            ctx.strokeStyle = '#FEF9C3';
            ctx.stroke();
            ctx.restore();
          }

          // 3. Outer Metallic Rotor Bezel
          const pocketOuterR = outerR * 0.765;
          const pocketDivR = outerR * 0.61;
          const pocketInnerR = outerR * 0.43;

          ctx.beginPath();
          ctx.arc(cx, cy, pocketOuterR + 3 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = '#92400E';
          ctx.lineWidth = 4 * dpr;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, pocketOuterR + 1.5 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 1.6 * dpr;
          ctx.stroke();

          // 4. 37 European Pockets + Recessed Drop Ring + Raised Metallic Frets
          for (let i = 0; i < pocketCount; i++) {
            const num = ROULETTE_WHEEL_ORDER[i];
            const startA = wheelAngleRef.current + i * pocketArc - Math.PI / 2;
            const endA = startA + pocketArc;
            const color = getRouletteNumberColor(num);

            // Outer Number Plate
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(startA) * pocketDivR, cy + Math.sin(startA) * pocketDivR);
            ctx.arc(cx, cy, pocketOuterR, startA, endA);
            ctx.arc(cx, cy, pocketDivR, endA, startA, true);
            ctx.closePath();
            ctx.fillStyle =
              color === 'green' ? '#059669' : color === 'red' ? '#DC2626' : '#0F172A';
            ctx.fill();

            // Inner Recessed Pocket Well
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(startA) * pocketInnerR, cy + Math.sin(startA) * pocketInnerR);
            ctx.arc(cx, cy, pocketDivR, startA, endA);
            ctx.arc(cx, cy, pocketInnerR, endA, startA, true);
            ctx.closePath();
            ctx.fillStyle =
              color === 'green' ? '#046C4E' : color === 'red' ? '#7F1D1D' : '#030712';
            ctx.fill();

            // Winning Pocket Golden Spotlight
            if (gs.phase === 'result' && num === gs.winningNumber) {
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(startA) * pocketInnerR, cy + Math.sin(startA) * pocketInnerR);
              ctx.arc(cx, cy, pocketOuterR, startA, endA);
              ctx.arc(cx, cy, pocketInnerR, endA, startA, true);
              ctx.closePath();
              ctx.fillStyle = 'rgba(253, 224, 71, 0.42)';
              ctx.fill();
            }

            // Raised Brass Fret Divider (dark shadow + gold highlight)
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(startA) * pocketInnerR, cy + Math.sin(startA) * pocketInnerR);
            ctx.lineTo(cx + Math.cos(startA) * pocketOuterR, cy + Math.sin(startA) * pocketOuterR);
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 2.1 * dpr;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(startA) * pocketInnerR, cy + Math.sin(startA) * pocketInnerR);
            ctx.lineTo(cx + Math.cos(startA) * pocketOuterR, cy + Math.sin(startA) * pocketOuterR);
            ctx.strokeStyle = '#FCD34D';
            ctx.lineWidth = 1.0 * dpr;
            ctx.stroke();

            // Crisp European Number Typography
            const midA = (startA + endA) / 2;
            const textR = (pocketOuterR + pocketDivR) * 0.505;
            ctx.save();
            ctx.translate(cx + Math.cos(midA) * textR, cy + Math.sin(midA) * textR);
            ctx.rotate(midA + Math.PI / 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `900 ${7.8 * dpr}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(num), 0, 0);
            ctx.restore();
          }

          // Pocket Ring Separator Bezel
          ctx.beginPath();
          ctx.arc(cx, cy, pocketDivR, 0, Math.PI * 2);
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 1.4 * dpr;
          ctx.stroke();

          // 5. Machined 3D Brass Turret Cone + Spindles + Finial Cap (NO white DOM sticker!)
          const coneGrad = ctx.createRadialGradient(
            cx - pocketInnerR * 0.3,
            cy - pocketInnerR * 0.3,
            2 * dpr,
            cx,
            cy,
            pocketInnerR
          );
          coneGrad.addColorStop(0, '#FEF9C3');
          coneGrad.addColorStop(0.28, '#EAB308');
          coneGrad.addColorStop(0.65, '#A16207');
          coneGrad.addColorStop(0.92, '#5C3308');
          coneGrad.addColorStop(1, '#2D1603');
          ctx.beginPath();
          ctx.arc(cx, cy, pocketInnerR, 0, Math.PI * 2);
          ctx.fillStyle = coneGrad;
          ctx.fill();
          ctx.lineWidth = 2.2 * dpr;
          ctx.strokeStyle = '#FDE68A';
          ctx.stroke();

          // Lathe groove rings on cone
          [0.82, 0.64, 0.45].forEach((rRatio) => {
            ctx.beginPath();
            ctx.arc(cx, cy, pocketInnerR * rRatio, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(69, 26, 3, 0.35)';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();
          });

          // 4 Turned Crossed Brass Turret Arms + Collar + Spherical Finials
          for (let k = 0; k < 4; k++) {
            const a = wheelAngleRef.current + (k * Math.PI) / 2;
            const armR = pocketInnerR * 0.83;
            const ax = cx + Math.cos(a) * armR;
            const ay = cy + Math.sin(a) * armR;

            // Arm shadow
            ctx.beginPath();
            ctx.moveTo(cx + 1 * dpr, cy + 2 * dpr);
            ctx.lineTo(ax + 1 * dpr, ay + 2 * dpr);
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 3.8 * dpr;
            ctx.stroke();

            // Brass Spindle Arm
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(ax, ay);
            ctx.strokeStyle = '#FEF08A';
            ctx.lineWidth = 2.8 * dpr;
            ctx.stroke();

            // Mid decorative collar bead
            const mx = cx + Math.cos(a) * (armR * 0.56);
            const my = cy + Math.sin(a) * (armR * 0.56);
            ctx.beginPath();
            ctx.arc(mx, my, 2.5 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#FDE047';
            ctx.fill();

            // End spherical finial
            const finGrad = ctx.createRadialGradient(ax - 1.4 * dpr, ay - 1.4 * dpr, 0.5 * dpr, ax, ay, 4.6 * dpr);
            finGrad.addColorStop(0, '#FFFFFF');
            finGrad.addColorStop(0.45, '#FACC15');
            finGrad.addColorStop(1, '#713F12');
            ctx.beginPath();
            ctx.arc(ax, ay, 4.6 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = finGrad;
            ctx.fill();
          }

          // Central Knurled Finial Cap
          const capR = pocketInnerR * 0.25;
          const capGrad = ctx.createRadialGradient(cx - capR * 0.3, cy - capR * 0.3, 1 * dpr, cx, cy, capR);
          capGrad.addColorStop(0, '#FFFFFF');
          capGrad.addColorStop(0.4, '#FDE047');
          capGrad.addColorStop(0.85, '#B45309');
          capGrad.addColorStop(1, '#451A03');
          ctx.beginPath();
          ctx.arc(cx, cy, capR, 0, Math.PI * 2);
          ctx.fillStyle = capGrad;
          ctx.fill();
          ctx.lineWidth = 1.4 * dpr;
          ctx.strokeStyle = '#FEF9C3';
          ctx.stroke();

          // Ruby center glint
          ctx.beginPath();
          ctx.arc(cx, cy, capR * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = '#DC2626';
          ctx.fill();

          // 6. Specular Ivory Roulette Ball + Subtle Motion Trail when Spinning
          const ballR = outerR * ballRadiusRatioRef.current;
          const bAngle = ballAngleRef.current - Math.PI / 2;
          const bx = cx + Math.cos(bAngle) * ballR;
          const by = cy + Math.sin(bAngle) * ballR;

          if (gs.phase === 'spinning') {
            for (let tr = 1; tr <= 4; tr++) {
              const tAngle = bAngle + tr * 0.08;
              const tx = cx + Math.cos(tAngle) * ballR;
              const ty = cy + Math.sin(tAngle) * ballR;
              ctx.beginPath();
              ctx.arc(tx, ty, Math.max(1.5, 4.4 - tr * 0.8) * dpr, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${(0.28 - tr * 0.06).toFixed(2)})`;
              ctx.fill();
            }
          }

          ctx.beginPath();
          ctx.arc(bx + 1.8 * dpr, by + 2.2 * dpr, 4.9 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.52)';
          ctx.fill();

          const ballGrad = ctx.createRadialGradient(
            bx - 1.6 * dpr,
            by - 1.6 * dpr,
            0.7 * dpr,
            bx,
            by,
            5.1 * dpr
          );
          ballGrad.addColorStop(0, '#FFFFFF');
          ballGrad.addColorStop(0.55, '#F1F5F9');
          ballGrad.addColorStop(1, '#475569');
          ctx.beginPath();
          ctx.arc(bx, by, 5.1 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = ballGrad;
          ctx.fill();

          // Stationary Overhead Studio Glass Glare Arc
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, outerR * 0.94, -Math.PI * 0.82, -Math.PI * 0.28);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
          ctx.lineWidth = 14 * dpr;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();
        }
      }
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

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
    const lockedAmt = Math.max(0, Number(user.lockedBalance || 0));
    const playableBal = Math.max(0, +(Number(user.balance || 0) - lockedAmt).toFixed(2));
    if (totalStagedAmount > playableBal) {
      showToast(
        lockedAmt > 0
          ? 'Holding balance cannot be wagered until released by Admin!'
          : 'Insufficient balance'
      );
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

  // Phase countdown progress %
  const phasePct =
    gameState.phase === 'betting'
      ? Math.min(100, Math.round((gameState.phaseRemaining / 20) * 100))
      : gameState.phase === 'spinning'
      ? Math.min(100, Math.round((gameState.phaseRemaining / 6) * 100))
      : Math.min(100, Math.round((gameState.phaseRemaining / 4) * 100));

  // Highlighted wheel neighbors on racetrack hover/focus
  const highlightedWheelSet = useMemo(() => {
    if (hoveredWheelIdx === null) return new Set<number>();
    const len = ROULETTE_WHEEL_ORDER.length;
    return new Set<number>([
      ROULETTE_WHEEL_ORDER[(hoveredWheelIdx - 2 + len) % len],
      ROULETTE_WHEEL_ORDER[(hoveredWheelIdx - 1 + len) % len],
      ROULETTE_WHEEL_ORDER[hoveredWheelIdx],
      ROULETTE_WHEEL_ORDER[(hoveredWheelIdx + 1) % len],
      ROULETTE_WHEEL_ORDER[(hoveredWheelIdx + 2) % len]
    ]);
  }, [hoveredWheelIdx]);

  const playableBalance = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));

  return (
    <div
      className="min-h-screen text-white pb-12"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #102B24 0%, #071316 48%, #04090C 100%)'
      }}
    >
      {/* Luxury VIP Casino Header */}
      <header className="sticky top-0 z-30 bg-[#071417]/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-3 py-2 flex items-center justify-between gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => goTab('casino', '#/casino')}
            className="p-1.5 -ml-1 rounded-full text-amber-200 hover:bg-white/10 active:scale-95"
            aria-label="Back to Casino"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="min-w-0">
            <div className="font-black text-sm tracking-wide text-amber-100 truncate flex items-center gap-1.5">
              <span>MONTE CARLO VIP ROULETTE</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-emerald-300/90 truncate">
              {gameState.roundId} · European Single Zero
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-black/45 border border-[#D4AF37]/50">
            <span className="text-[10px] font-black text-amber-300">৳</span>
            <span className="text-xs font-extrabold tabular-nums text-white max-w-[68px] truncate">
              {playableBalance.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => goTab('deposit', '#/deposit')}
              className="w-5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center active:scale-90"
              aria-label="Deposit"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="w-8 h-8 rounded-full bg-white/10 border border-[#D4AF37]/40 text-amber-200 flex items-center justify-center active:scale-95"
            aria-label="Statistics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => goTab('customer-service', '#/customer-service')}
            className="p-0.5 rounded-full bg-white/10 border border-[#D4AF37]/40 active:scale-95"
            aria-label="Customer Care"
          >
            <CustomerServiceLogo size={26} />
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-8 h-8 rounded-full bg-white/10 border border-[#D4AF37]/40 text-amber-200 flex items-center justify-center active:scale-95"
            aria-label="Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 pt-3 space-y-3">
        {Number(user.lockedBalance || 0) > 0 && (
          <div className="px-3 py-2 rounded-2xl bg-amber-950/75 border border-amber-400/50 text-[11px] font-bold text-amber-200 flex items-center justify-between gap-2">
            <span>Hold Balance: ৳{Number(user.lockedBalance || 0).toFixed(2)} (Blocked until Admin releases)</span>
            <span className="font-mono text-emerald-300">Playable: ৳{playableBalance.toFixed(2)}</span>
          </div>
        )}

        {/* Luxury Monte Carlo Studio Stage Framed by Mahogany & Brushed Brass */}
        <div className="p-1.5 rounded-[30px] bg-gradient-to-b from-[#60230D] via-[#3A1205] to-[#1D0802] border-2 border-[#D4AF37]/80 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          <div
            className="relative rounded-[24px] p-3.5 border border-[#D4AF37]/40 overflow-hidden space-y-2.5 text-white shadow-inner"
            style={{
              background: 'radial-gradient(circle at 50% 42%, #114738 0%, #08271F 60%, #03120E 100%)'
            }}
          >
            {/* Live Studio Status Bar */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                  gameState.phase === 'betting'
                    ? 'bg-emerald-500/20 border-emerald-400/45 text-emerald-200'
                    : gameState.phase === 'spinning'
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-white/15 border-[#D4AF37]/80 text-amber-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>
                  {gameState.phase === 'betting'
                    ? `Place Your Bets · ${gameState.phaseRemaining}s`
                    : gameState.phase === 'spinning'
                    ? `No More Bets · Spinning ${gameState.phaseRemaining}s`
                    : `Winning #${gameState.winningNumber} (${gameState.winningColor.toUpperCase()})`}
                </span>
              </span>

              {totalActiveRoundAmount > 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/45 text-amber-200 text-[10px] font-black tabular-nums">
                  In Play: ৳{totalActiveRoundAmount}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-200/80 uppercase tracking-wider">
                  Min ৳10 · 36X
                </span>
              )}
            </div>

            {/* Smooth Countdown Progress Track */}
            <div className="h-1.5 rounded-full bg-black/50 border border-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  gameState.phase === 'betting'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                    : gameState.phase === 'spinning'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
                    : 'bg-gradient-to-r from-amber-300 to-emerald-300'
                }`}
                style={{ width: `${phasePct}%` }}
              />
            </div>

            {/* Unobstructed Photorealistic HiDPI Wheel Canvas */}
            <div className="relative flex items-center justify-center py-0.5">
              <canvas ref={canvasRef} width={580} height={580} className="w-[286px] h-[286px] block" />

              {/* Corner Result Medallion Callout when Settled */}
              {gameState.phase === 'result' && (
                <div className="absolute top-1.5 right-1.5 pointer-events-none">
                  <div
                    className={`w-14 h-14 rounded-2xl border-2 border-[#D4AF37] shadow-[0_8px_24px_rgba(0,0,0,0.65)] flex flex-col items-center justify-center ${
                      gameState.winningColor === 'green'
                        ? 'bg-emerald-700'
                        : gameState.winningColor === 'red'
                        ? 'bg-rose-700'
                        : 'bg-slate-950'
                    }`}
                  >
                    <span className="text-xl font-black leading-none text-white tabular-nums">
                      {gameState.winningNumber}
                    </span>
                    <span className="text-[8px] font-black uppercase text-amber-300 tracking-wider mt-0.5">
                      {gameState.winningColor}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {gameState.phase === 'result' && roundWonAmount > 0 && (
              <div className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-600/35 via-amber-500/20 to-emerald-600/35 border border-amber-300/60 text-amber-100 text-center text-xs font-black shadow-lg">
                Congratulations! Won ৳{roundWonAmount.toFixed(2)} on #{gameState.winningNumber}
              </div>
            )}

            {/* Casino Marquee History Strip */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-2 border-t border-[#D4AF37]/25">
              <span className="text-[9px] font-black text-amber-300/85 uppercase mr-1 flex-shrink-0 tracking-wider">
                Board
              </span>
              {gameState.history.slice(0, 14).map((item, idx) => (
                <span
                  key={item.roundId}
                  className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center text-white flex-shrink-0 tabular-nums border border-white/20 ${
                    item.color === 'green'
                      ? 'bg-emerald-600'
                      : item.color === 'red'
                      ? 'bg-rose-600'
                      : 'bg-slate-950'
                  } ${idx === 0 ? 'ring-2 ring-amber-400 scale-105 shadow-[0_0_10px_rgba(251,191,36,0.6)]' : 'opacity-85'}`}
                >
                  {item.number}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Luxury Dark Velvet Mode Tabs */}
        <div className="bg-[#081A18] rounded-2xl p-1 border border-[#D4AF37]/40 grid grid-cols-3 gap-1 shadow-lg">
          {(
            [
              { id: 'table', label: 'Casino Felt' },
              { id: 'racetrack', label: 'Racetrack' },
              { id: 'favourites', label: 'Saved Bets' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setViewTab(t.id)}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                viewTab === t.id
                  ? 'bg-gradient-to-b from-[#E5C158] to-[#B68D28] text-slate-950 shadow-sm'
                  : 'text-amber-100/75 hover:text-amber-100 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TABLE VIEW — Authentic European Emerald Baize Felt Inside Mahogany Rail */}
        {viewTab === 'table' && (
          <div className="p-1.5 rounded-[30px] bg-gradient-to-b from-[#5A210D] via-[#3A1306] to-[#200801] border-2 border-[#D4AF37]/80 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
            <div
              className="rounded-[24px] p-3 border border-[#D4AF37]/60 shadow-inner space-y-2"
              style={{
                background: 'radial-gradient(circle at 50% 35%, #12694E 0%, #0B4B38 62%, #062D21 100%)'
              }}
            >
              {/* Scalloped Zero Crown */}
              {(() => {
                const { staged, placed } = getSpotAmount('straight_0');
                const total = staged + placed;
                const isWin = gameState.phase === 'result' && gameState.winningNumber === 0;
                return (
                  <button
                    type="button"
                    onClick={() => stageSpot('straight_0', 'straight', '#0', [0], 36)}
                    className={`w-full py-2.5 rounded-t-2xl rounded-b-lg bg-gradient-to-b from-emerald-600/95 to-emerald-800/95 border border-[#D4AF37]/85 text-white font-black text-base relative flex items-center justify-center gap-2 shadow-inner active:scale-99 ${
                      isWin ? 'ring-3 ring-amber-300 shadow-[0_0_18px_rgba(253,224,71,0.75)]' : ''
                    }`}
                  >
                    {isWin && <WinDollyMarker />}
                    <span>0</span>
                    {total > 0 && <PlacedChipMarker amount={total} isPlacedOnly={staged === 0} />}
                  </button>
                );
              })()}

              {/* Main Grid + Outside Left Strip */}
              <div className="grid grid-cols-4 gap-1.5">
                {/* Left Column Outside Bets with Authentic Rotated Casino Diamonds */}
                <div className="flex flex-col gap-1.5">
                  {[
                    {
                      key: 'low_1-18',
                      type: 'low' as RouletteBetType,
                      label: '1–18',
                      nums: Array.from({ length: 18 }, (_, i) => i + 1),
                      diamond: null
                    },
                    {
                      key: 'even_EVEN',
                      type: 'even' as RouletteBetType,
                      label: 'EVEN',
                      nums: Array.from({ length: 18 }, (_, i) => (i + 1) * 2),
                      diamond: null
                    },
                    {
                      key: 'red_RED',
                      type: 'red' as RouletteBetType,
                      label: 'RED',
                      nums: Array.from(ROULETTE_RED_NUMBERS),
                      diamond: 'red' as const
                    },
                    {
                      key: 'black_BLACK',
                      type: 'black' as RouletteBetType,
                      label: 'BLACK',
                      nums: Array.from({ length: 36 }, (_, i) => i + 1).filter(
                        (n) => !ROULETTE_RED_NUMBERS.has(n)
                      ),
                      diamond: 'black' as const
                    },
                    {
                      key: 'odd_ODD',
                      type: 'odd' as RouletteBetType,
                      label: 'ODD',
                      nums: Array.from({ length: 18 }, (_, i) => i * 2 + 1),
                      diamond: null
                    },
                    {
                      key: 'high_19-36',
                      type: 'high' as RouletteBetType,
                      label: '19–36',
                      nums: Array.from({ length: 18 }, (_, i) => i + 19),
                      diamond: null
                    }
                  ].map((ob) => {
                    const { staged, placed } = getSpotAmount(ob.key);
                    const total = staged + placed;
                    return (
                      <button
                        key={ob.key}
                        type="button"
                        onClick={() => stageSpot(ob.key, ob.type, ob.label, ob.nums, 2)}
                        className="flex-1 rounded-xl bg-[#083C2E]/95 border border-[#D4AF37]/65 text-amber-50 font-black text-[11px] flex flex-col items-center justify-center py-2 relative active:scale-95 hover:bg-[#0D5641] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      >
                        {ob.diamond ? (
                          <span
                            className={`w-5 h-5 rotate-45 border border-[#D4AF37] shadow-sm ${
                              ob.diamond === 'red' ? 'bg-gradient-to-br from-[#EF4444] to-[#991B1B]' : 'bg-gradient-to-br from-[#334155] to-[#020617]'
                            }`}
                            aria-label={ob.label}
                          />
                        ) : (
                          <span className="tracking-wide">{ob.label}</span>
                        )}
                        {total > 0 && (
                          <div className="mt-1">
                            <PlacedChipMarker amount={total} isPlacedOnly={staged === 0} />
                          </div>
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
                      const total = staged + placed;
                      const isWin = gameState.phase === 'result' && gameState.winningNumber === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => stageSpot(`straight_${num}`, 'straight', `#${num}`, [num], 36)}
                          className={`h-10 rounded-lg border border-[#D4AF37]/55 bg-[#094232]/90 relative flex items-center justify-center active:scale-95 transition-all ${
                            isWin ? 'ring-2 ring-amber-300 bg-amber-400/25 scale-105 z-10 shadow-[0_0_14px_rgba(251,191,36,0.75)]' : ''
                          }`}
                        >
                          {isWin && <WinDollyMarker />}
                          <span
                            className={`w-8 h-7 rounded-full flex items-center justify-center font-black text-xs text-white border border-amber-200/35 shadow-[0_2px_4px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] ${
                              isRed
                                ? 'bg-gradient-to-b from-[#DC2626] to-[#991B1B]'
                                : 'bg-gradient-to-b from-[#1E293B] to-[#020617]'
                            }`}
                          >
                            {num}
                          </span>
                          {total > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 z-20">
                              <PlacedChipMarker amount={total} isPlacedOnly={staged === 0} />
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
                      const total = staged + placed;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => stageSpot(c.key, 'column', c.label.split(' ')[1] || c.label, c.nums, 3)}
                          className="py-2 rounded-lg bg-[#083C2E] border border-[#D4AF37]/65 text-amber-200 font-black text-[11px] flex flex-col items-center justify-center gap-0.5 active:scale-95"
                        >
                          <span>2:1</span>
                          {total > 0 && <PlacedChipMarker amount={total} isPlacedOnly={staged === 0} />}
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
                  const total = staged + placed;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => stageSpot(d.key, 'dozen', d.label, d.nums, 3)}
                      className="py-2.5 rounded-xl bg-[#083C2E] border border-[#D4AF37]/65 text-amber-50 font-black text-xs flex flex-col items-center justify-center gap-1 active:scale-95"
                    >
                      <span>{d.label}</span>
                      {total > 0 && <PlacedChipMarker amount={total} isPlacedOnly={staged === 0} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* RACETRACK VIEW — European Casino Oval Stadium & French Call Sectors */}
        {viewTab === 'racetrack' && (
          <div className="p-1.5 rounded-[30px] bg-gradient-to-b from-[#5A210D] via-[#3A1306] to-[#200801] border-2 border-[#D4AF37]/80 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
            <div
              className="rounded-[24px] p-4 border border-[#D4AF37]/60 shadow-inner space-y-3.5 text-white"
              style={{
                background: 'radial-gradient(circle at 50% 45%, #12694E 0%, #0B4B38 68%, #062D21 100%)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  French Call Racetrack
                </span>
                <span className="text-[10px] font-bold text-emerald-100/80">Tap sector or number ±2 neighbors</span>
              </div>

              {/* Stadium Inner 4 Classic French Sectors */}
              <div className="rounded-full border-2 border-[#D4AF37]/75 bg-[#063226]/90 p-2 grid grid-cols-4 gap-1 shadow-inner">
                {[
                  { name: 'TIER', sub: '12#', nums: TIER_NUMBERS },
                  { name: 'ORPH.', sub: '8#', nums: ORPHELINS_NUMBERS },
                  { name: 'VOISINS', sub: '17#', nums: VOISINS_NUMBERS },
                  { name: 'ZERO', sub: '7#', nums: ZERO_GAME_NUMBERS }
                ].map((sec, idx) => (
                  <button
                    key={sec.name}
                    type="button"
                    onClick={() => handleStageCallGroup(sec.name, sec.nums)}
                    className={`py-2.5 px-1 text-center transition-all active:scale-95 hover:bg-emerald-700/60 border-[#D4AF37]/40 ${
                      idx === 0
                        ? 'rounded-l-full border-r'
                        : idx === 3
                        ? 'rounded-r-full'
                        : 'border-r'
                    }`}
                  >
                    <div className="font-black text-[10px] text-amber-200 tracking-wide">{sec.name}</div>
                    <div className="text-[9px] font-bold text-emerald-200/80 mt-0.5">
                      {sec.sub} · ৳{sec.nums.length * selectedChip}
                    </div>
                  </button>
                ))}
              </div>

              {/* Wheel-Order Oval Track Perimeter */}
              <div className="pt-1">
                <div className="text-[10px] font-bold text-emerald-100/80 mb-2">
                  Wheel Sequence Track (Tap any pocket for Number + 2 Wheel Neighbors):
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {ROULETTE_WHEEL_ORDER.map((num, idx) => {
                    const color = getRouletteNumberColor(num);
                    const isHighlighted = highlightedWheelSet.has(num);
                    const { staged, placed } = getSpotAmount(`straight_${num}`);
                    return (
                      <button
                        key={num}
                        type="button"
                        onMouseEnter={() => setHoveredWheelIdx(idx)}
                        onMouseLeave={() => setHoveredWheelIdx(null)}
                        onClick={() => {
                          setHoveredWheelIdx(idx);
                          const len = ROULETTE_WHEEL_ORDER.length;
                          const picks = [
                            ROULETTE_WHEEL_ORDER[(idx - 2 + len) % len],
                            ROULETTE_WHEEL_ORDER[(idx - 1 + len) % len],
                            num,
                            ROULETTE_WHEEL_ORDER[(idx + 1) % len],
                            ROULETTE_WHEEL_ORDER[(idx + 2) % len]
                          ];
                          handleStageCallGroup(`#${num} & ±2 Neighbors`, picks);
                        }}
                        className={`h-9 rounded-lg text-[11px] font-black text-white relative border transition-all active:scale-90 ${
                          color === 'green'
                            ? 'bg-emerald-600 border-amber-300/70'
                            : color === 'red'
                            ? 'bg-[#C81E1E] border-[#D4AF37]/50'
                            : 'bg-[#0B1120] border-[#D4AF37]/50'
                        } ${isHighlighted ? 'ring-2 ring-amber-300 scale-105 z-10' : ''}`}
                      >
                        <span>{num}</span>
                        {staged + placed > 0 && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-300 border border-slate-900" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAVOURITES VIEW */}
        {viewTab === 'favourites' && (
          <div className="bg-[#0A201D] rounded-3xl p-4 border border-[#D4AF37]/45 shadow-xl space-y-3 text-white">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Saved Bet Patterns</span>
              </div>
              <button
                type="button"
                onClick={handleSaveFavourite}
                className="px-3 py-1 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 text-[11px] font-black flex items-center gap-1 active:scale-95"
              >
                <Heart className="w-3 h-3" />
                <span>Save Current</span>
              </button>
            </div>

            {favourites.length === 0 ? (
              <p className="text-xs text-emerald-100/70 py-6 text-center">
                Stage bets on the table and tap &ldquo;Save Current&rdquo; to save favourite layouts.
              </p>
            ) : (
              <div className="space-y-2">
                {favourites.map((fav) => (
                  <div
                    key={fav.id}
                    className="p-2.5 rounded-2xl bg-black/30 border border-[#D4AF37]/30 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-black text-amber-100">{fav.name}</div>
                      <div className="text-[10px] text-emerald-200/70 truncate max-w-[200px]">
                        {fav.spots.map((s) => s.label).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (gameState.phase !== 'betting') {
                            showToast('Wait for next betting window');
                            return;
                          }
                          setUndoStack((prev) => [...prev.slice(-15), stagedSpots]);
                          setStagedSpots(fav.spots.map((s) => ({ ...s })));
                          setViewTab('table');
                          showToast('Loaded favourite layout');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-[11px] font-black"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = favourites.filter((x) => x.id !== fav.id);
                          setFavourites(next);
                          localStorage.setItem('ewi777_roulette_favs', JSON.stringify(next));
                        }}
                        className="p-1.5 rounded-xl bg-rose-500/20 text-rose-300"
                        aria-label="Delete pattern"
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

        {/* Authentic Leather & Brass Casino Chip Rack & Action Console */}
        <div
          className="rounded-3xl p-3.5 border border-[#D4AF37]/50 shadow-[0_14px_34px_rgba(0,0,0,0.65)] space-y-3"
          style={{
            background: 'linear-gradient(180deg, #102522 0%, #071316 100%)'
          }}
        >
          <div className="flex items-center justify-around py-1">
            {CHIP_CONFIGS.map((cfg) => (
              <ChipToken
                key={cfg.value}
                cfg={cfg}
                active={selectedChip === cfg.value}
                onClick={() => setSelectedChip(cfg.value)}
              />
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="py-2.5 rounded-xl bg-white/10 border border-white/15 text-amber-100 font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-35 active:scale-95"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleDouble}
              disabled={stagedSpots.length === 0}
              className="py-2.5 rounded-xl bg-white/10 border border-white/15 text-amber-200 font-black text-[11px] disabled:opacity-35 active:scale-95"
            >
              2x
            </button>
            <button
              type="button"
              onClick={handleRepeat}
              disabled={lastPlacedSpots.length === 0}
              className="py-2.5 rounded-xl bg-white/10 border border-white/15 text-amber-100 font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-35 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repeat</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={stagedSpots.length === 0}
              className="py-2.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-35 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirmBets}
            disabled={gameState.phase !== 'betting' || stagedSpots.length === 0}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#D4AF37] text-slate-950 font-black text-sm shadow-[0_6px_22px_rgba(212,175,55,0.4)] active:scale-98 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {totalStagedAmount > 0
                ? `CONFIRM BET · ৳${totalStagedAmount.toFixed(0)}`
                : 'TAP FELT TABLE TO BET'}
            </span>
          </button>
        </div>

        {/* Recent Player Bets */}
        {rouletteBets.length > 0 && (
          <div className="bg-[#0A1E1C]/95 rounded-3xl p-4 border border-[#D4AF37]/35 shadow-lg space-y-2">
            <div className="text-xs font-black text-amber-200">My Recent Roulette Bets</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {rouletteBets.slice(0, 10).map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-2xl bg-black/35 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-black text-white">
                      {b.label} <span className="text-[10px] text-amber-200/60">({b.roundId})</span>
                    </div>
                    <div className="text-[10px] text-emerald-200/75">
                      Stake: ৳{b.amount} · {b.payoutMultiplier}x
                    </div>
                  </div>
                  <span
                    className={`font-black tabular-nums ${
                      b.status === 'won'
                        ? 'text-emerald-400'
                        : b.status === 'lost'
                        ? 'text-rose-400'
                        : 'text-amber-300'
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
              <span className="font-black text-sm">Deshi Roulette Statistics (Last 50)</span>
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
