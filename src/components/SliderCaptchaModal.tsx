import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SliderCaptchaModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const SCENES = [
  { name: 'Emerald Lagoon', skyTop: '#0B486B', skyBot: '#79BD9A', sun: '#FFE17D', hill1: '#3B8686', hill2: '#0B486B', accent: '#CFF09E', water: '#22667E' },
  { name: 'Golden Sunset', skyTop: '#2B1055', skyBot: '#F7971E', sun: '#FFD200', hill1: '#753A88', hill2: '#3C1053', accent: '#FF6B6B', water: '#A43931' },
  { name: 'Alpine Dawn', skyTop: '#1D2B64', skyBot: '#F8CDDA', sun: '#FFF3B0', hill1: '#4E54C8', hill2: '#232526', accent: '#FFFFFF', water: '#3B4D9B' },
  { name: 'Royal Gold Palace', skyTop: '#1A120B', skyBot: '#D4AF37', sun: '#FFF5B8', hill1: '#78350F', hill2: '#451A03', accent: '#FDE68A', water: '#92400E' },
  { name: 'Sakura Ridge', skyTop: '#355C7D', skyBot: '#F8B195', sun: '#FFF0F5', hill1: '#6C5B7B', hill2: '#355C7D', accent: '#FFB6C1', water: '#C06C84' },
  { name: 'Arctic Aurora', skyTop: '#0F2027', skyBot: '#2C5364', sun: '#A8FF78', hill1: '#203A43', hill2: '#0F2027', accent: '#78FFD6', water: '#1A3A47' },
  { name: 'Sahara Dunes', skyTop: '#4B1248', skyBot: '#F0C27B', sun: '#FFF7AE', hill1: '#C06C2B', hill2: '#7D3C0F', accent: '#FAD390', water: '#B3541E' },
  { name: 'Jade Canyon', skyTop: '#134E5E', skyBot: '#71B280', sun: '#E0F7DA', hill1: '#28725A', hill2: '#0D3B2E', accent: '#A8E6CF', water: '#1E5B47' },
  { name: 'Imperial Night', skyTop: '#090D16', skyBot: '#2D3A54', sun: '#FDE68A', hill1: '#1E293B', hill2: '#0F172A', accent: '#F59E0B', water: '#172554' },
  { name: 'Coral Reef', skyTop: '#005C97', skyBot: '#363795', sun: '#FF9A8B', hill1: '#0083B0', hill2: '#004E92', accent: '#FF6B9D', water: '#006994' },
  { name: 'Amber Autumn', skyTop: '#41295A', skyBot: '#FF8008', sun: '#FFF176', hill1: '#993D00', hill2: '#4D1A00', accent: '#FFC837', water: '#B84A00' },
  { name: 'Misty Bamboo', skyTop: '#1F4037', skyBot: '#99F2C8', sun: '#F8FFAE', hill1: '#2E6B5A', hill2: '#14362C', accent: '#D0F5BE', water: '#24594A' },
  { name: 'Saffron Temple', skyTop: '#2E1A47', skyBot: '#FFAE42', sun: '#FFF6A3', hill1: '#8D4925', hill2: '#4A2311', accent: '#FFD166', water: '#A45A28' },
  { name: 'Cobalt Glacier', skyTop: '#000428', skyBot: '#004E92', sun: '#E0F2FE', hill1: '#0284C7', hill2: '#0C4A6E', accent: '#BAE6FD', water: '#0369A1' },
  { name: 'Copper Mesa', skyTop: '#331B0E', skyBot: '#D97706', sun: '#FEF08A', hill1: '#9A3412', hill2: '#431407', accent: '#FDBA74', water: '#7C2D12' },
  { name: 'Lavender Mist', skyTop: '#2E1437', skyBot: '#D8B4FE', sun: '#FAF5FF', hill1: '#6B21A8', hill2: '#3B0764', accent: '#E9D5FF', water: '#581C87' },
  { name: 'Oceanic Sunburst', skyTop: '#0F172A', skyBot: '#F59E0B', sun: '#FEF3C7', hill1: '#0E7490', hill2: '#164E63', accent: '#FBBF24', water: '#155E75' },
  { name: 'Velvet Horizon', skyTop: '#1E1B4B', skyBot: '#F43F5E', sun: '#FDE047', hill1: '#701A75', hill2: '#311042', accent: '#FDA4AF', water: '#4C0519' },
  { name: 'Mint Highland', skyTop: '#064E3B', skyBot: '#6EE7B7', sun: '#ECFDF5', hill1: '#047857', hill2: '#022C22', accent: '#A7F3D0', water: '#065F46' },
  { name: 'Crown Oasis', skyTop: '#18181B', skyBot: '#EAB308', sun: '#FEF9C3', hill1: '#854D0E', hill2: '#422006', accent: '#FACC15', water: '#713F12' }
];

const CANVAS_W = 300;
const CANVAS_H = 152;
const PIECE_SIZE = 44;
const SNAP_TOLERANCE = 8;

function drawPuzzlePath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const r = s * 0.18;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.35, y);
  ctx.arc(x + s * 0.5, y, r, Math.PI, 0, false);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x + s, y + s * 0.35);
  ctx.arc(x + s, y + s * 0.5, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(x + s, y + s);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x, y + s * 0.65);
  ctx.arc(x, y + s * 0.5, r, Math.PI / 2, -Math.PI / 2, true);
  ctx.closePath();
}

function drawScene(ctx: CanvasRenderingContext2D, sceneIndex: number) {
  const s = SCENES[sceneIndex % SCENES.length];
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, s.skyTop);
  grad.addColorStop(0.75, s.skyBot);
  grad.addColorStop(1, s.water);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Decorative stars / birds / clouds seeded by sceneIndex
  const seed = (sceneIndex + 1) * 37;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (let i = 0; i < 12; i++) {
    const sx = ((seed * (i + 3) * 19) % (CANVAS_W - 20)) + 10;
    const sy = ((seed * (i + 5) * 11) % 60) + 8;
    ctx.beginPath();
    ctx.arc(sx, sy, (i % 3) + 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sun / Moon
  const sunX = 48 + ((sceneIndex * 53) % 210);
  const sunY = 34 + ((sceneIndex * 17) % 28);
  ctx.fillStyle = s.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Back Mountain Range
  ctx.fillStyle = s.hill1;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H - 34);
  for (let x = 0; x <= CANVAS_W; x += 30) {
    const h = 42 + Math.sin((x + sceneIndex * 29) * 0.032) * 24;
    ctx.lineTo(x, CANVAS_H - h);
  }
  ctx.lineTo(CANVAS_W, CANVAS_H);
  ctx.lineTo(0, CANVAS_H);
  ctx.closePath();
  ctx.fill();

  // Front Ridge
  ctx.fillStyle = s.hill2;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H - 18);
  for (let x = 0; x <= CANVAS_W; x += 25) {
    const h = 24 + Math.cos((x + sceneIndex * 41) * 0.045) * 14;
    ctx.lineTo(x, CANVAS_H - h);
  }
  ctx.lineTo(CANVAS_W, CANVAS_H);
  ctx.lineTo(0, CANVAS_H);
  ctx.closePath();
  ctx.fill();

  // Geometric highlights (pine trees / sailboats / lanterns)
  ctx.fillStyle = s.accent;
  for (let i = 0; i < 6; i++) {
    const tx = 24 + ((sceneIndex * 23 + i * 48) % (CANVAS_W - 48));
    const ty = CANVAS_H - 14 - (i % 2) * 8;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 18);
    ctx.lineTo(tx - 8, ty);
    ctx.lineTo(tx + 8, ty);
    ctx.closePath();
    ctx.fill();
  }

  // Water shimmer bars
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < 5; i++) {
    const wx = (sunX - 24 + i * 11) % (CANVAS_W - 30);
    ctx.fillRect(Math.max(8, wx), CANVAS_H - 14 + i * 2.5, 28 - i * 3, 1.5);
  }
}

export const SliderCaptchaModal: React.FC<SliderCaptchaModalProps> = ({
  isOpen,
  onSuccess,
  onClose
}) => {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pieceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [sceneIdx, setSceneIdx] = useState<number>(() => Math.floor(Math.random() * 20));
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 185, y: 52 });
  const [sliderX, setSliderX] = useState<number>(0);
  const [dragging, setDragging] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorShake, setErrorShake] = useState(false);

  const maxSlideX = CANVAS_W - PIECE_SIZE - 12;

  const generateNewChallenge = useCallback((nextScene?: number) => {
    const idx = typeof nextScene === 'number' ? nextScene % 20 : Math.floor(Math.random() * 20);
    const tx = 110 + Math.floor(Math.random() * (CANVAS_W - PIECE_SIZE - 130));
    const ty = 24 + Math.floor(Math.random() * (CANVAS_H - PIECE_SIZE - 44));
    setSceneIdx(idx);
    setTargetPos({ x: tx, y: ty });
    setSliderX(0);
    setVerified(false);
    setErrorShake(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateNewChallenge();
    }
  }, [isOpen, generateNewChallenge]);

  useEffect(() => {
    if (!isOpen) return;
    const bgCanvas = bgCanvasRef.current;
    const pieceCanvas = pieceCanvasRef.current;
    if (!bgCanvas || !pieceCanvas) return;

    const bgCtx = bgCanvas.getContext('2d');
    const pCtx = pieceCanvas.getContext('2d');
    if (!bgCtx || !pCtx) return;

    // 1. Render full scene on offscreen temp canvas so piece image matches cleanly
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_W;
    offscreen.height = CANVAS_H;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    drawScene(offCtx, sceneIdx);

    // 2. Draw background with dark cutout hole at targetPos
    bgCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    bgCtx.drawImage(offscreen, 0, 0);
    bgCtx.save();
    drawPuzzlePath(bgCtx, targetPos.x, targetPos.y, PIECE_SIZE);
    bgCtx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    bgCtx.fill();
    bgCtx.lineWidth = 2;
    bgCtx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
    bgCtx.stroke();
    bgCtx.restore();

    // 3. Draw extracted puzzle piece at (0, 0) on pieceCanvas
    pCtx.clearRect(0, 0, PIECE_SIZE + 14, CANVAS_H);
    pCtx.save();
    pCtx.translate(-targetPos.x + 4, 0);
    drawPuzzlePath(pCtx, targetPos.x, targetPos.y, PIECE_SIZE);
    pCtx.clip();
    pCtx.drawImage(offscreen, 0, 0);
    pCtx.restore();

    pCtx.save();
    drawPuzzlePath(pCtx, 4, targetPos.y, PIECE_SIZE);
    pCtx.lineWidth = 2;
    pCtx.strokeStyle = '#FFFFFF';
    pCtx.shadowColor = 'rgba(0,0,0,0.45)';
    pCtx.shadowBlur = 4;
    pCtx.stroke();
    pCtx.restore();
  }, [isOpen, sceneIdx, targetPos]);

  const finishDrag = useCallback(() => {
    if (!dragging || verified) return;
    setDragging(false);

    if (Math.abs(sliderX - targetPos.x) <= SNAP_TOLERANCE) {
      setSliderX(targetPos.x);
      setVerified(true);
      setTimeout(() => {
        onSuccess();
      }, 650);
    } else {
      setErrorShake(true);
      setTimeout(() => {
        setErrorShake(false);
        setSliderX(0);
      }, 450);
    }
  }, [dragging, verified, sliderX, targetPos.x, onSuccess]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const thumbW = 48;
      const ratio = (clientX - rect.left - thumbW / 2) / Math.max(1, rect.width - thumbW);
      const clamped = Math.max(0, Math.min(maxSlideX, ratio * maxSlideX));
      setSliderX(clamped);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onEnd = () => finishDrag();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [dragging, finishDrag, maxSlideX]);

  if (!isOpen) return null;

  const progressRatio = maxSlideX > 0 ? sliderX / maxSlideX : 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-[348px] shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-extrabold text-sm">Complete security verification</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => generateNewChallenge(sceneIdx + 1)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95"
              title="Next Puzzle Scene (1-20)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Canvas Puzzle Area */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Scene {(sceneIdx % 20) + 1} / 20 · {SCENES[sceneIdx % 20].name}</span>
            <span className={verified ? 'text-emerald-600' : 'text-cyan-700'}>
              {verified ? 'Matched!' : 'Slide to fit'}
            </span>
          </div>

          <div
            className={`relative mx-auto rounded-2xl overflow-hidden border-2 shadow-inner bg-slate-900 ${
              verified
                ? 'border-emerald-500'
                : errorShake
                ? 'border-rose-500 animate-pulse'
                : 'border-cyan-200'
            }`}
            style={{ width: CANVAS_W, height: CANVAS_H }}
          >
            <canvas ref={bgCanvasRef} width={CANVAS_W} height={CANVAS_H} className="block w-full h-full" />
            <canvas
              ref={pieceCanvasRef}
              width={PIECE_SIZE + 14}
              height={CANVAS_H}
              className="absolute top-0 pointer-events-none"
              style={{ left: `${sliderX - 4}px` }}
            />
            {verified && (
              <div className="absolute inset-0 bg-emerald-600/25 flex items-center justify-center backdrop-blur-[1px]">
                <div className="px-4 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verification complete</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Cyan/Emerald Slider Track */}
          <div
            ref={trackRef}
            className={`relative h-12 rounded-2xl border flex items-center justify-center overflow-hidden select-none transition-colors ${
              verified
                ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                : errorShake
                ? 'bg-rose-50 border-rose-300 text-rose-600'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <div
              className={`absolute left-0 top-0 bottom-0 transition-none ${
                verified
                  ? 'bg-emerald-200/70'
                  : errorShake
                  ? 'bg-rose-200/70'
                  : 'bg-cyan-200/70'
              }`}
              style={{ width: `calc(${progressRatio * 84}% + 24px)` }}
            />
            <span className="relative z-10 text-xs font-extrabold tracking-wide pointer-events-none pl-6">
              {verified
                ? 'Verification complete'
                : errorShake
                ? 'Try again! Align cleanly'
                : 'Hold and slide to complete the piece'}
            </span>
            <button
              type="button"
              onMouseDown={() => !verified && setDragging(true)}
              onTouchStart={() => !verified && setDragging(true)}
              style={{ left: `calc(${progressRatio * 84}%)` }}
              className={`absolute top-1 bottom-1 w-12 rounded-xl flex items-center justify-center font-black text-lg shadow-md cursor-grab active:cursor-grabbing z-20 transition-colors ${
                verified
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-[#0891B2] to-[#06B6D4] text-white'
              }`}
            >
              {verified ? '✓' : '»'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
