import React from 'react';
import { Copy, Check } from 'lucide-react';
import type { WinGoResult } from '../types';

export interface LotteryTradeCardData {
  id: string;
  orderNumber: string;
  periodNumber: string;
  orderTime: string;
  purchaseAmount: number;
  quantity: number;
  selectionShort: string;
  selectionFull: string;
  selectionTone: 'orange' | 'blue' | 'green' | 'red' | 'violet' | 'cyan' | 'slate';
  status: 'pending' | 'won' | 'lost';
  winAmount?: number;
  countdownSec?: number;
  gameKind: 'wingo' | 'ewi_wingo' | 'k3' | 'd5';
  wingoResult?: {
    number: number;
    color: WinGoResult['color'];
    size: 'big' | 'small';
  };
  k3Result?: {
    dice: [number, number, number];
    sum: number;
    size: 'Big' | 'Small';
    parity: 'Even' | 'Odd';
  };
  d5Result?: {
    digits: [number, number, number, number, number];
    sum: number;
    size: 'Big' | 'Small';
    parity: 'Even' | 'Odd';
  };
}

interface LotteryTradeDetailCardProps {
  item: LotteryTradeCardData;
  isExpanded: boolean;
  onToggle: () => void;
  onCopyOrderNumber?: (orderNo: string) => void;
}

const BADGE_BG: Record<LotteryTradeCardData['selectionTone'], string> = {
  orange: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
  blue: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white',
  green: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
  red: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white',
  violet: 'bg-gradient-to-br from-purple-500 to-purple-700 text-white',
  cyan: 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white',
  slate: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white'
};

export function buildLotteryOrderNumber(prefix: 'WG' | 'DW' | 'K3' | 'D5', id: string, epochMs?: number): string {
  const d = new Date(epochMs || Date.now());
  const stamp = [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
    String(d.getUTCHours()).padStart(2, '0'),
    String(d.getUTCMinutes()).padStart(2, '0'),
    String(d.getUTCSeconds()).padStart(2, '0')
  ].join('');
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) >>> 0;
  }
  const tail = `${String(hash).padStart(10, '0')}${String((hash * 2654435761) >>> 0).slice(0, 4)}`.slice(0, 14);
  return `${prefix}${stamp}${tail}`;
}

export function formatFullOrderTimestamp(epochMs = Date.now(), offsetMinutes = 360): string {
  const shifted = new Date(epochMs + offsetMinutes * 60000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

export function fallbackOrderTimestamp(periodNumber: string, shortTime: string, offsetMinutes = 360): string {
  const digits = String(periodNumber || '').replace(/[^0-9]/g, '');
  if (digits.length >= 8 && (digits.startsWith('202') || digits.startsWith('203'))) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    if (/^\d{2}:\d{2}:\d{2}$/.test(shortTime)) {
      return `${y}-${m}-${d} ${shortTime}`;
    }
    return `${y}-${m}-${d} ${shortTime || '00:00:00'}`;
  }
  const shifted = new Date(Date.now() + offsetMinutes * 60000);
  const datePart = shifted.toISOString().slice(0, 10);
  return shortTime && shortTime.length >= 10 ? shortTime : `${datePart} ${shortTime || '00:00:00'}`;
}

export const LotteryTradeDetailCard: React.FC<LotteryTradeDetailCardProps> = ({
  item,
  isExpanded,
  onToggle,
  onCopyOrderNumber
}) => {
  const [copied, setCopied] = React.useState(false);

  const taxAmount = +(item.purchaseAmount * 0.02).toFixed(2);
  const amountAfterTax = +Math.max(0, item.purchaseAmount - taxAmount).toFixed(2);
  const netWinAmount =
    item.status === 'won'
      ? Number(item.winAmount || 0)
      : item.status === 'lost'
      ? -item.purchaseAmount
      : 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = item.orderNumber;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    onCopyOrderNumber?.(text);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full px-3.5 py-3 flex items-center justify-between gap-2.5 text-left hover:bg-slate-50/70 active:bg-slate-100/60 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs px-1 text-center leading-tight shadow-xs flex-shrink-0 ${BADGE_BG[item.selectionTone]}`}
          >
            <span className="truncate max-w-full">{item.selectionShort}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-extrabold text-[13px] text-slate-900 tabular-nums truncate">
                {item.periodNumber}
              </span>
              <span className="text-[10px] text-slate-500 leading-none">
                {isExpanded ? '▴' : '▾'}
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5 tabular-nums">
              {item.orderTime}
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex justify-end">
            <span
              className={`inline-flex items-center justify-center min-w-[66px] px-2.5 py-0.5 rounded-md border text-[11px] font-extrabold ${
                item.status === 'won'
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                  : item.status === 'lost'
                  ? 'border-rose-400 text-rose-600 bg-rose-50/50'
                  : 'border-cyan-500 text-[#0891B2] bg-cyan-50/60'
              }`}
            >
              {item.status === 'won'
                ? 'Win'
                : item.status === 'lost'
                ? 'Lose'
                : typeof item.countdownSec === 'number'
                ? `${item.countdownSec}s`
                : 'Pending'}
            </span>
          </div>
          <div
            className={`text-xs font-black mt-1 tabular-nums ${
              item.status === 'won'
                ? 'text-emerald-600'
                : item.status === 'lost'
                ? 'text-rose-600'
                : 'text-[#0891B2]'
            }`}
          >
            {item.status === 'won'
              ? `+৳${netWinAmount.toFixed(2)}`
              : item.status === 'lost'
              ? `-৳${item.purchaseAmount.toFixed(2)}`
              : `৳${item.purchaseAmount.toFixed(2)}`}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 bg-white space-y-2 animate-fade-in">
          <div className="text-sm font-black text-slate-900">Details</div>

          <div className="bg-slate-50 rounded-xl px-3 py-2.5 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500">Order number</div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-slate-800 break-all tabular-nums">
                {item.orderNumber}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#0891B2] hover:border-cyan-300 active:scale-95 flex-shrink-0"
                aria-label="Copy Order Number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Period</span>
            <span className="font-mono font-bold text-slate-800 tabular-nums">{item.periodNumber}</span>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Purchase amount</span>
            <span className="font-bold text-slate-800 tabular-nums">৳{item.purchaseAmount.toFixed(2)}</span>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Quantity</span>
            <span className="font-bold text-slate-800 tabular-nums">{item.quantity}</span>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Amount after tax</span>
            <span className="font-extrabold text-rose-500 tabular-nums">৳{amountAfterTax.toFixed(2)}</span>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Tax</span>
            <span className="font-bold text-slate-700 tabular-nums">৳{taxAmount.toFixed(2)}</span>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-500">Result</span>
            <div className="flex items-center justify-end gap-1.5 flex-wrap font-extrabold">
              {item.status === 'pending' ? (
                <span className="text-[#0891B2]">Waiting result...</span>
              ) : item.wingoResult ? (
                <>
                  <span className="text-slate-900 tabular-nums">{item.wingoResult.number}</span>
                  {(item.wingoResult.color === 'green' || item.wingoResult.color === 'green-violet') && (
                    <span className="text-emerald-600">Green</span>
                  )}
                  {(item.wingoResult.color === 'red' || item.wingoResult.color === 'red-violet') && (
                    <span className="text-rose-600">Red</span>
                  )}
                  {item.wingoResult.color.includes('violet') && (
                    <span className="text-purple-600">Violet</span>
                  )}
                  <span className={item.wingoResult.size === 'big' ? 'text-amber-500' : 'text-sky-600'}>
                    {item.wingoResult.size === 'big' ? 'Big' : 'Small'}
                  </span>
                </>
              ) : item.k3Result ? (
                <>
                  <span className="font-mono text-slate-800 tabular-nums">
                    [{item.k3Result.dice.join('-')}]
                  </span>
                  <span className="text-slate-900 tabular-nums">Sum {item.k3Result.sum}</span>
                  <span className={item.k3Result.size === 'Big' ? 'text-amber-500' : 'text-sky-600'}>
                    {item.k3Result.size}
                  </span>
                  <span className={item.k3Result.parity === 'Even' ? 'text-emerald-600' : 'text-indigo-600'}>
                    {item.k3Result.parity}
                  </span>
                </>
              ) : item.d5Result ? (
                <>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {item.d5Result.digits.join(' ')}
                  </span>
                  <span className="text-slate-600 tabular-nums">Sum {item.d5Result.sum}</span>
                  <span className={item.d5Result.size === 'Big' ? 'text-amber-500' : 'text-sky-600'}>
                    {item.d5Result.size}
                  </span>
                  <span className={item.d5Result.parity === 'Even' ? 'text-emerald-600' : 'text-indigo-600'}>
                    {item.d5Result.parity}
                  </span>
                </>
              ) : (
                <span className="text-slate-600">Settled</span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Select</span>
            <span className="font-bold text-slate-800">{item.selectionFull}</span>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Status</span>
            <span
              className={`font-extrabold ${
                item.status === 'won'
                  ? 'text-emerald-600'
                  : item.status === 'lost'
                  ? 'text-rose-600'
                  : 'text-[#0891B2]'
              }`}
            >
              {item.status === 'won' ? 'Win' : item.status === 'lost' ? 'Lose' : 'Pending'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Win/lose</span>
            <span
              className={`font-extrabold tabular-nums ${
                item.status === 'won'
                  ? 'text-emerald-600'
                  : item.status === 'lost'
                  ? 'text-rose-600'
                  : 'text-[#0891B2]'
              }`}
            >
              {item.status === 'won'
                ? `+ ৳${netWinAmount.toFixed(2)}`
                : item.status === 'lost'
                ? `- ৳${item.purchaseAmount.toFixed(2)}`
                : 'Pending'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Order time</span>
            <span className="font-mono font-bold text-slate-700 tabular-nums">{item.orderTime}</span>
          </div>
        </div>
      )}
    </div>
  );
};
