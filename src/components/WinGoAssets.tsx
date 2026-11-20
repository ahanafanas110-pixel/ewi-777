import React, { useEffect } from 'react';
import { WinGoPopupResult } from '../types';

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
      <span className="pointer-events-none absolute top-[1px] left-1/2 -translate-x-1/2 w-[34%] h-[12%] rounded-full bg-white/75" />
      <span className="pointer-events-none absolute bottom-[1px] left-1/2 -translate-x-1/2 w-[34%] h-[11%] rounded-full bg-white/45" />
      <span className="pointer-events-none absolute left-[1px] top-1/2 -translate-y-1/2 w-[11%] h-[32%] rounded-full bg-white/55" />
      <span className="pointer-events-none absolute right-[1px] top-1/2 -translate-y-1/2 w-[11%] h-[32%] rounded-full bg-white/45" />
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

export const WinGoCountdownOverlay: React.FC<CountdownOverlayProps> = ({ seconds }) => {
  if (seconds > 5 || seconds <= 0) return null;
  const tens = '0';
  const ones = String(seconds);

  return (
    <div className="absolute inset-0 z-20 rounded-3xl bg-black/50 backdrop-blur-[1.5px] flex items-center justify-center gap-4 px-6 select-none animate-fade-in">
      <div className="w-[104px] h-[142px] sm:w-[116px] sm:h-[154px] rounded-[22px] bg-[#ECFEFF] shadow-[0_14px_35px_rgba(0,0,0,0.38)] flex items-center justify-center border border-cyan-200">
        <span className="text-[76px] sm:text-[84px] font-black leading-none text-[#0891B2] tabular-nums">
          {tens}
        </span>
      </div>
      <div className="w-[104px] h-[142px] sm:w-[116px] sm:h-[154px] rounded-[22px] bg-[#ECFEFF] shadow-[0_14px_35px_rgba(0,0,0,0.38)] flex items-center justify-center border border-cyan-200">
        <span className="text-[76px] sm:text-[84px] font-black leading-none text-[#0891B2] tabular-nums">
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
 * WinGo WIN / LOSE Result Modal matching uploaded reference cards:
 * - Bold italic glowing WIN (amber/gold) or LOSE (coral/red) above frosted card
 * - Winning amount (red) / Lost amount (blue) + bold numeric readout
 * - Mode label (WinGo 30sec / 1min / 3min / 5min)
 * - Divider + Period + Result pills (Small/Big, Red/Green, optional Violet, ringed number)
 * - Red "I Know" action button
 */
export const WinGoResultPopupModal: React.FC<ResultPopupModalProps> = ({ popup, onClose }) => {
  useEffect(() => {
    if (!popup) return;
    const timeout = setTimeout(() => {
      onClose();
    }, 6500);
    return () => clearTimeout(timeout);
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
  const displayTitle = popup.gameLabel || modeLabel;

  const hasGreen = popup.resultColor.includes('green');
  const hasViolet = popup.resultColor.includes('violet');
  const isSmall = popup.resultSize === 'small';
  const num = popup.resultNumber;

  const ballBadgeColor =
    num === 0 || [1, 3, 7, 9].includes(num)
      ? 'bg-[#109B4B]'
      : num === 5
      ? 'bg-gradient-to-br from-[#109B4B] to-[#9333EA]'
      : 'bg-[#EA3838]';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] flex flex-col items-center relative pt-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing WIN / LOSE Title above card edge */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none"
          style={{
            textShadow: isWin
              ? '0 0 28px rgba(251, 191, 36, 0.85), 0 4px 12px rgba(0, 0, 0, 0.45)'
              : '0 0 28px rgba(239, 68, 68, 0.85), 0 4px 12px rgba(0, 0, 0, 0.45)'
          }}
        >
          <span
            className={`text-[46px] font-black italic tracking-wider uppercase leading-none bg-clip-text text-transparent ${
              isWin
                ? 'bg-gradient-to-b from-[#FFE875] via-[#FFB71B] to-[#E68A00]'
                : 'bg-gradient-to-b from-[#FF8C8C] via-[#F04444] to-[#C81E1E]'
            }`}
          >
            {isWin ? 'WIN' : 'LOSE'}
          </span>
        </div>

        {/* Frosted Metallic Card */}
        <div
          className={`w-full rounded-[28px] px-6 pt-8 pb-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)] border ${
            isWin ? 'border-[#E69D9D]' : 'border-[#8DA7FF]'
          }`}
          style={{
            background:
              'linear-gradient(180deg, rgba(232,229,229,0.96) 0%, rgba(214,210,210,0.95) 55%, rgba(193,189,189,0.95) 100%)'
          }}
        >
          {/* Winning / Lost amount */}
          <div
            className={`text-[15px] font-semibold tracking-tight mb-0.5 ${
              isWin ? 'text-[#E11D48]' : 'text-[#3B82F6]'
            }`}
          >
            {isWin ? 'Winning amount' : 'Lost amount'}
          </div>
          <div
            className={`text-[40px] font-black tracking-tight tabular-nums leading-none ${
              isWin ? 'text-[#E02424]' : 'text-[#3B82F6]'
            }`}
          >
            {popup.amount.toFixed(2)}
          </div>

          {/* Game Name */}
          <div className="text-[17px] font-extrabold text-slate-900 mt-5 mb-3">
            {displayTitle}
          </div>

          <div className="border-t border-black/15 my-3" />

          {/* Period & Result Rows */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 font-medium text-[13px]">Period</span>
              <span className="font-mono font-bold text-slate-900 text-[12px] tracking-tight">
                {popup.periodNumber}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 font-medium text-[13px]">Result</span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {Array.isArray(popup.badges) && popup.badges.length > 0 ? (
                  popup.badges.map((badge, idx) => {
                    const toneCls =
                      badge.tone === 'green'
                        ? 'bg-[#109B4B]'
                        : badge.tone === 'red'
                        ? 'bg-[#EA3838]'
                        : badge.tone === 'violet'
                        ? 'bg-[#9333EA]'
                        : badge.tone === 'orange'
                        ? 'bg-[#FB923C]'
                        : badge.tone === 'amber'
                        ? 'bg-[#D97706]'
                        : 'bg-slate-600';
                    return (
                      <span
                        key={`${badge.label}-${idx}`}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-white shadow-2xs ${toneCls}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })
                ) : (
                  <>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-white shadow-2xs ${
                        isSmall ? 'bg-[#109B4B]' : 'bg-[#FB923C]'
                      }`}
                    >
                      {isSmall ? 'Small' : 'Big'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-white shadow-2xs ${
                        hasGreen ? 'bg-[#109B4B]' : 'bg-[#EA3838]'
                      }`}
                    >
                      {hasGreen ? 'Green' : 'Red'}
                    </span>
                    {hasViolet && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-white bg-[#9333EA] shadow-2xs">
                        Violet
                      </span>
                    )}
                    <span
                      className={`w-6 h-6 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-[11px] font-black text-white ${ballBadgeColor}`}
                    >
                      {num}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom "I Know" Button */}
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full py-3 rounded-full bg-gradient-to-b from-[#EF2B2B] to-[#D91616] text-white font-extrabold text-[15px] shadow-[0_4px_0_#991B1B] active:translate-y-0.5 transition-all hover:brightness-105"
          >
            I Know
          </button>
        </div>
      </div>
    </div>
  );
};
