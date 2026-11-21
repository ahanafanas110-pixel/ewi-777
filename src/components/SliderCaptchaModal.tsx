import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, X, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface SliderCaptchaModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CANVAS_W = 240;
const CANVAS_H = 74;

function randomCaptchaCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

export const SliderCaptchaModal: React.FC<SliderCaptchaModalProps> = ({
  isOpen,
  onSuccess,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [code, setCode] = useState<string>(() => randomCaptchaCode(6));
  const [userInput, setUserInput] = useState<string>('');
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generateNewChallenge = useCallback(() => {
    setCode(randomCaptchaCode(6));
    setUserInput('');
    setVerified(false);
    setErrorMsg('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateNewChallenge();
    }
  }, [isOpen, generateNewChallenge]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Pure Light Cyan Studio Background
    const bg = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    bg.addColorStop(0, '#ECFEFF');
    bg.addColorStop(0.5, '#F8FAFC');
    bg.addColorStop(1, '#E0F2FE');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle security wave grid lines
    const palette = ['#0891B2', '#06B6D4', '#0D9488', '#0284C7', '#0F766E'];
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.strokeStyle = palette[i % palette.length];
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1.4;
      const y1 = Math.random() * CANVAS_H;
      const y2 = Math.random() * CANVAS_H;
      ctx.moveTo(0, y1);
      ctx.bezierCurveTo(
        CANVAS_W * 0.35,
        Math.random() * CANVAS_H,
        CANVAS_W * 0.65,
        Math.random() * CANVAS_H,
        CANVAS_W,
        y2
      );
      ctx.stroke();
    }

    // Scatter security micro dots
    for (let i = 0; i < 38; i++) {
      ctx.beginPath();
      ctx.fillStyle = palette[i % palette.length];
      ctx.globalAlpha = 0.35;
      ctx.arc(
        Math.random() * CANVAS_W,
        Math.random() * CANVAS_H,
        1 + Math.random() * 1.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Render 6 rotated/skewed alphanumeric characters
    ctx.globalAlpha = 1;
    const startX = 24;
    const stepX = 33;
    const fonts = ['900 28px ui-monospace, monospace', '900 29px system-ui, sans-serif', 'italic 900 28px Georgia, serif'];

    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      const angle = (Math.random() - 0.5) * 0.42;
      const x = startX + i * stepX;
      const y = CANVAS_H / 2 + 4 + (Math.random() - 0.5) * 8;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = fonts[i % fonts.length];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ['#0F172A', '#0E7490', '#0369A1', '#0F766E'][i % 4];
      ctx.shadowColor = 'rgba(8, 145, 178, 0.25)';
      ctx.shadowBlur = 2;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  }, [isOpen, code]);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verified) return;
    const cleanInput = userInput.trim().toUpperCase();
    if (!cleanInput) {
      setErrorMsg('Please enter the 6-character security code');
      return;
    }
    if (cleanInput === code.toUpperCase()) {
      setErrorMsg('');
      setVerified(true);
      setTimeout(() => {
        onSuccess();
      }, 420);
    } else {
      setErrorMsg('Code did not match. A fresh code has been generated.');
      setCode(randomCaptchaCode(6));
      setUserInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-[356px] shadow-2xl border border-cyan-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-extrabold text-sm">Security Captcha Verification</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Captcha Body */}
        <form onSubmit={handleVerify} className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Enter the 6-character code shown below</span>
            <button
              type="button"
              onClick={generateNewChallenge}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 font-black text-[11px] hover:bg-cyan-100 active:scale-95"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-200 bg-[#ECFEFF] shadow-inner flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onClick={generateNewChallenge}
              className="w-full max-w-[240px] h-[74px] rounded-xl cursor-pointer select-none block"
              title="Tap to refresh code"
            />
            {verified && (
              <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-4 py-1.5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <input
              ref={inputRef}
              type="text"
              maxLength={6}
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Type 6-character code"
              autoComplete="off"
              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 rounded-2xl px-4 py-3 text-center text-lg font-mono font-black tracking-[0.35em] text-slate-900 placeholder:tracking-normal placeholder:text-xs placeholder:font-sans placeholder:font-semibold focus:outline-none uppercase"
            />
            {errorMsg && (
              <p className="text-[11px] font-bold text-rose-600 text-center">{errorMsg}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={verified}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-md active:scale-98 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            <span>{verified ? 'Verified ✓' : 'Verify & Continue'}</span>
            {!verified && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
          </button>
        </form>
      </div>
    </div>
  );
};
