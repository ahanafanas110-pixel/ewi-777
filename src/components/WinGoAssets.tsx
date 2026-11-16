import React, { useEffect, useState } from 'react';
import { WinGoPopupResult } from '../types';
import { Check, Rocket, X } from 'lucide-react';

interface WinGoBallProps {
  number: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Glossy 3D Lottery Ball (0–9) matching official WinGo 3D ball aesthetic:
 * - 0: Red + Violet diagonal split rim, Violet numeral
 * - 5: Green + Violet diagonal split rim, Green-Violet numeral
 * - 1, 3, 7, 9: Green rim, Green numeral
 * - 2, 4, 6, 8: Red rim, Red numeral
 */
export const WinGoBall: React.FC<WinGoBallProps> = ({
  number,
  size = 'md',
  className = ''
}) => {
  const n = Math.min(9, Math.max(0, Math.round(number)));

  const sizeMap = {
    xs: { outer: 'w-6 h-6', inner: 'w-[15px] h-[15px]', text: 'text-[10px]' },
    sm: { outer: 'w-7 h-7', inner: 'w-[18px] h-[18px]', text: 'text-xs' },
    md: { outer: 'w-12 h-12', inner: 'w-8 h-8', text: 'text-xl' },
    lg: { outer: 'w-14 h-14', inner: 'w-9 h-9', text: 'text-2xl' }
  }[size];

  const isZero = n === 0;
  const isFive = n === 5;
  const isGreen = [1, 3, 7, 9].includes(n);

  const rimBackground = isZero
    ? 'linear-gradient(135deg, #F04444 0%, #EE3B3B 49%, #A84BF9 51%, #9939F5 100%)'
    : isFive
    ? 'linear-gradient(135deg, #3BD47E 0%, #24B865 49%, #A84BF9 51%, #9939F5 100%)'
    : isGreen
    ? 'linear-gradient(155deg, #4FE18E 0%, #25B864 60%, #19944E 100%)'
    : 'linear-gradient(155deg, #FF6464 0%, #EC3A3A 60%, #C82323 100%)';

  const innerGradient = isZero
    ? 'radial-gradient(circle at 38% 30%, #FFFFFF 0%, #F9EEFF 65%, #E7CEFF 100%)'
    : isFive
    ? 'radial-gradient(circle at 38% 30%, #FFFFFF 0%, #F1ECFF 65%, #DEC8FF 100%)'
    : isGreen
    ? 'radial-gradient(circle at 38% 30%, #FFFFFF 0%, #ECFFF4 65%, #BFF2D4 100%)'
    : 'radial-gradient(circle at 38% 30%, #FFFFFF 0%, #FFF1F1 65%, #FACBC9 100%)';

  const digitColorClass = isZero
    ? 'text-[#993CF4]'
    : isFive
    ? 'bg-gradient-to-br from-[#28B86A] via-[#6F78DC] to-[#993CF4] bg-clip-text text-transparent'
    : isGreen
    ? 'text-[#21A65B]'
    : 'text-[#E33838]';

  return (
    <div
      className={`relative rounded-full inline-flex items-center justify-center select-none shadow-[0_4px_10px_rgba(15,23,42,0.18)] overflow-hidden flex-shrink-0 ${sizeMap.outer} ${className}`}
      style={{ background: rimBackground }}
    >
      {/* Top glossy crescent notch */}
      <span className="pointer-events-none absolute top-[1px] left-1/2 -translate-x-1/2 w-[34%] h-[12%] rounded-full bg-white/75" />
      {/* Bottom subtle specular crescent */}
      <span className="pointer-events-none absolute bottom-[1px] left-1/2 -translate-x-1/2 w-[34%] h-[11%] rounded-full bg-white/45" />
      {/* Left specular crescent */}
      <span className="pointer-events-none absolute left-[1px] top-1/2 -translate-y-1/2 w-[11%] h-[32%] rounded-full bg-white/55" />
      {/* Right specular crescent */}
      <span className="pointer-events-none absolute right-[1px] top-1/2 -translate-y-1/2 w-[11%] h-[32%] rounded-full bg-white/45" />

      {/* Glossy Inner White Disc */}
      <span
        className={`relative z-10 rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] ${sizeMap.inner}`}
        style={{ background: innerGradient }}
      >
        <span className={`font-black leading-none tracking-tight ${sizeMap.text} ${digitColorClass}`}>
          {n}
        </span>
      </span>
    </div>
  );
};

interface CountdownOverlayProps {
  seconds: number;
}

/**
 * Last 05-Second Countdown Overlay (05, 04, 03, 02, 01) matching reference cards
 */
export const WinGoCountdownOverlay: React.FC<CountdownOverlayProps> = ({ seconds }) => {
  if (seconds > 5 || seconds <= 0) return null;
  const tens = '0';
  const ones = String(seconds);

  return (
    <div className="absolute inset-0 z-20 rounded-3xl bg-black/50 backdrop-blur-[1.5px] flex items-center justify-center gap-4 px-6 select-none animate-fade-in">
      <div className="w-[104px] h-[142px] sm:w-[116px] sm:h-[154px] rounded-[22px] bg-[#F4F5F7] shadow-[0_14px_35px_rgba(0,0,0,0.38)] flex items-center justify-center border border-white">
        <span className="text-[76px] sm:text-[84px] font-black leading-none text-[#FF4B55] tabular-nums">
          {tens}
        </span>
      </div>
      <div className="w-[104px] h-[142px] sm:w-[116px] sm:h-[154px] rounded-[22px] bg-[#F4F5F7] shadow-[0_14px_35px_rgba(0,0,0,0.38)] flex items-center justify-center border border-white">
        <span className="text-[76px] sm:text-[84px] font-black leading-none text-[#FF4B55] tabular-nums">
          {ones}
        </span>
      </div>
    </div>
  );
};

interface ResultPopupModalProps {
  popup: WinGoPopupResult | null;
  onClose: () => void;
}

/**
 * WinGo Result Modal:
 * - WON: Warm coral/orange/gold "Congratulations" winged rocket shield card with Prize Receipt & 3s auto-close
 * - LOST: Silver-blue "Sorry" winged rocket shield card with "Lose" receipt & 3s auto-close
 */
export const WinGoResultPopupModal: React.FC<ResultPopupModalProps> = ({ popup, onClose }) => {
  const [autoCloseSec, setAutoCloseSec] = useState(3);

  useEffect(() => {
    if (!popup) return;
    setAutoCloseSec(3);

    const interval = setInterval(() => {
      setAutoCloseSec((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    const timeout = setTimeout(() => {
      onClose();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [popup, onClose]);

  if (!popup) return null;

  const isWin = popup.status === 'won';
  const modeLabel =
    popup.mode === '30s'
      ? 'WinGo 30sec'
      : popup.mode === '1m'
      ? 'WinGo 1min'
      : popup.mode === '3m'
      ? 'WinGo 3min'
      : 'WinGo 5min';

  const hasGreen = popup.resultColor.includes('green');
  const hasViolet = popup.resultColor.includes('violet');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-[320px] flex flex-col items-center">
        {/* Main Result Card */}
        <div
          className={`relative w-full rounded-[28px] pt-14 pb-5 px-5 shadow-[0_20px_55px_rgba(0,0,0,0.45)] ${
            isWin
              ? 'bg-gradient-to-b from-[#FF7B4A] via-[#FF5E43] to-[#FF3D47] text-white'
              : 'bg-gradient-to-b from-[#DCE7F7] via-[#BDCEE6] to-[#9FB5D6] text-[#5B769C]'
          }`}
        >
          {/* Top Overlapping Winged Rocket Crest */}
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none">
            <div className="relative flex items-center justify-center">
              {/* Left & Right Stylized Wings */}
              <div
                className={`w-28 h-8 rounded-full blur-[0.2px] flex items-center justify-between px-1 ${
                  isWin
                    ? 'bg-gradient-to-r from-[#FFCC7A] via-[#FFE7B3] to-[#FFCC7A]'
                    : 'bg-gradient-to-r from-[#C8D9F0] via-[#F4F8FF] to-[#C8D9F0]'
                } shadow-md`}
              />
              {/* Center Medallion Circle */}
              <div
                className={`absolute w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl ${
                  isWin
                    ? 'bg-gradient-to-b from-[#FFE59C] to-[#FF9B3E] border-[#FFF3D1]'
                    : 'bg-gradient-to-b from-[#EFF5FF] to-[#AECCF2] border-[#FFFFFF]'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    isWin
                      ? 'bg-gradient-to-b from-[#FFB948] to-[#FF812D] text-white'
                      : 'bg-gradient-to-b from-[#9EBCE5] to-[#7DA0CF] text-white'
                  }`}
                >
                  <Rocket className="w-7 h-7 stroke-[2.3]" />
                </div>
              </div>
            </div>
            {/* Decorative Ribbon Bar */}
            <div
              className={`-mt-1 w-52 h-4 rounded-b-xl shadow-xs ${
                isWin
                  ? 'bg-gradient-to-r from-[#FF9947] via-[#FFD27D] to-[#FF9947]'
                  : 'bg-gradient-to-r from-[#8BA7CE] via-[#D8E6FA] to-[#8BA7CE]'
              }`}
            />
          </div>

          {/* Heading: Congratulations / Sorry */}
          <h3
            className={`text-center text-[22px] font-black tracking-tight mb-4 drop-shadow-xs ${
              isWin ? 'text-white' : 'text-[#5A79A5]'
            }`}
          >
            {isWin ? 'Congratulations' : 'Sorry'}
          </h3>

          {/* Lottery Results Row */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mb-4">
            <span className={`text-[11px] font-bold mr-0.5 ${isWin ? 'text-white/95' : 'text-[#5D7CA8]'}`}>
              Lottery results
            </span>

            {/* Color pill(s) */}
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white shadow-2xs ${
                hasGreen && hasViolet
                  ? 'bg-gradient-to-r from-[#2EC56D] via-[#2EC56D] to-[#9B4DF8]'
                  : !hasGreen && hasViolet
                  ? 'bg-gradient-to-r from-[#EF4444] via-[#EF4444] to-[#9B4DF8]'
                  : hasGreen
                  ? 'bg-[#2EC56D]'
                  : 'bg-[#EF4444]'
              }`}
            >
              {hasGreen ? 'Green' : 'Red'}
              {hasViolet ? ' Violet' : ''}
            </span>

            {/* Ball Number */}
            <WinGoBall number={popup.resultNumber} size="xs" />

            {/* Size Pill */}
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white capitalize shadow-2xs ${
                popup.resultSize === 'big'
                  ? isWin
                    ? 'bg-[#A65FF5]'
                    : 'bg-[#FF8C3A]'
                  : 'bg-[#2CC46C]'
              }`}
            >
              {popup.resultSize}
            </span>
          </div>

          {/* 3D Ticket Receipt Slot */}
          <div className="relative mb-4">
            {/* Slot Bar */}
            <div
              className={`h-4 rounded-full p-1 shadow-inner ${
                isWin ? 'bg-[#D64329]' : 'bg-[#8AA6CE]/70'
              }`}
            >
              <div className="w-full h-full rounded-full bg-black/25" />
            </div>

            {/* White Curled Receipt Paper */}
            <div className="mx-3 -mt-2 bg-gradient-to-b from-[#FFEBEB] via-[#FFFFFF] to-[#F7F8FA] rounded-b-2xl pt-3 pb-4 px-4 text-center shadow-[0_12px_20px_rgba(0,0,0,0.16)] border-x border-b border-white">
              {isWin ? (
                <>
                  <div className="text-[11px] font-bold text-[#F26D5B] mb-0.5">Bonus</div>
                  <div className="text-[26px] font-black text-[#FF4D4D] tracking-tight tabular-nums leading-tight">
                    ৳{popup.amount.toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-[24px] font-black text-[#6E85A3] tracking-tight py-1">
                  Lose
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-500 leading-snug">
                <div>Period: {modeLabel}</div>
                <div className="font-mono font-bold text-slate-600 mt-0.5">{popup.periodNumber}</div>
              </div>
            </div>
          </div>

          {/* 3 seconds auto close indicator */}
          <div
            className={`flex items-center justify-center gap-2 text-xs font-semibold ${
              isWin ? 'text-white/95' : 'text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full border border-white/80 flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span>{autoCloseSec > 0 ? `${autoCloseSec} seconds auto close` : 'Closing...'}</span>
          </div>
        </div>

        {/* Circular Close (X) Button below card matching reference */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close result popup"
          className="mt-4 w-9 h-9 rounded-full border-2 border-white/80 text-white flex items-center justify-center bg-black/30 hover:bg-black/50 active:scale-95 transition-all shadow-lg"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
