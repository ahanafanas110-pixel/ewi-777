import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowLeft,
  ChevronDown,
  History,
  X,
  Plus,
  Minus,
  Globe2,
  Coins
} from 'lucide-react';
import { Ewi777Logo, GoldMarketLogo } from '../components/BrandLogos';
import { BINARY_MARKETS, BINARY_MARKET_MAP } from '../constants/markets';
import { BinaryMarketCategory, BinaryMarketConfig } from '../types';
import {
  formatTimeWithOffset,
  formatDateWithOffset,
  formatOffsetLabel,
  getSyncedBinaryCandlesForTimeframe,
  formatCountdownClock
} from '../utils/syncedMarkets';

const BINARY_ONLY_CATEGORIES: Array<'All' | BinaryMarketCategory> = [
  'All',
  'Crypto',
  'Forex',
  'Indices'
];

const TIMEFRAMES = [
  { label: '30 sec', sec: 30 },
  { label: '1 min', sec: 60 },
  { label: '3 min', sec: 180 },
  { label: '5 min', sec: 300 },
  { label: '15 min', sec: 900 },
  { label: '30 min', sec: 1800 },
  { label: '1 hour', sec: 3600 },
  { label: '1 day', sec: 86400 },
  { label: '15 day', sec: 1296000 },
  { label: '30 day', sec: 2592000 }
];

const QUICK_AMOUNTS = [10, 50, 100, 500, 1000];

function formatAssetPrice(value: number, spec?: BinaryMarketConfig): string {
  const decimals = spec?.decimals ?? 2;
  const num = Number(value) || 0;
  const formatted = num.toFixed(decimals);
  if (spec?.category === 'Forex') return formatted;
  return `$${formatted}`;
}

interface BinaryMarketProps {
  initialMarketMode?: 'gold' | 'binary';
}

export const BinaryMarket: React.FC<BinaryMarketProps> = ({ initialMarketMode = 'binary' }) => {
  const {
    user,
    binaryMarkets,
    binaryBets,
    placeBinaryTrade,
    setActiveTab,
    showToast,
    adminSettings
  } = useApp();

  const isGoldMode = initialMarketMode === 'gold';
  const [selectedCategory, setSelectedCategory] = useState<'All' | BinaryMarketCategory>('All');
  const [selectedAsset, setSelectedAsset] = useState<string>(isGoldMode ? 'XAU/USD' : 'BTC/USDT');
  const [showAssetPicker, setShowAssetPicker] = useState<boolean>(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(30);
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [customAmountStr, setCustomAmountStr] = useState<string>('100');
  const [pendingTradeMode, setPendingTradeMode] = useState<boolean>(false);
  const [tradesPopover, setTradesPopover] = useState<'none' | 'open' | 'closed'>('none');
  const [nowTime, setNowTime] = useState<number>(() => Date.now());
  const [visibleCount, setVisibleCount] = useState<number>(28);
  const [panOffset, setPanOffset] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startPan: number }>({
    active: false,
    startX: 0,
    startPan: 0
  });
  const offsetMinutes = adminSettings.timezoneOffsetMinutes ?? 360;

  useEffect(() => {
    setSelectedCategory('All');
    setShowAssetPicker(false);
    setPanOffset(0);
    setSelectedAsset(initialMarketMode === 'gold' ? 'XAU/USD' : 'BTC/USDT');
  }, [initialMarketMode]);

  useEffect(() => {
    const t = setInterval(() => setNowTime(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const filteredMarkets = useMemo(() => {
    if (isGoldMode) {
      return BINARY_MARKETS.filter((m) => m.symbol === 'XAU/USD' || m.category === 'Commodities');
    }
    const nonGold = BINARY_MARKETS.filter((m) => m.category !== 'Commodities' && m.symbol !== 'XAU/USD');
    if (selectedCategory === 'All') return nonGold;
    return nonGold.filter((m) => m.category === selectedCategory);
  }, [isGoldMode, selectedCategory]);

  const activeSpec =
    BINARY_MARKET_MAP[selectedAsset] ||
    (isGoldMode ? BINARY_MARKET_MAP['XAU/USD'] : BINARY_MARKET_MAP['BTC/USDT']) ||
    BINARY_MARKETS[0];
  const activeQuote =
    binaryMarkets[selectedAsset] ||
    (isGoldMode ? binaryMarkets['XAU/USD'] : binaryMarkets['BTC/USDT']);
  const assetPrice = activeQuote?.price ?? activeSpec.basePrice;
  const currentSecEpoch = Math.floor(nowTime / 1000);
  const tfSecRemaining = Math.max(1, selectedTimeframe - (currentSecEpoch % selectedTimeframe));
  const tfCountdownLabel = formatCountdownClock(tfSecRemaining);
  const activeTfObj = TIMEFRAMES.find((t) => t.sec === selectedTimeframe) || TIMEFRAMES[0];

  const assetCandles = useMemo(
    () =>
      getSyncedBinaryCandlesForTimeframe(
        activeSpec,
        selectedTimeframe,
        nowTime,
        adminSettings.binaryNextCandleBias || 'AUTO',
        offsetMinutes,
        96,
        assetPrice
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSpec, selectedTimeframe, currentSecEpoch, adminSettings.binaryNextCandleBias, offsetMinutes, assetPrice]
  );

  const payoutPct = Math.round(activeSpec.payoutRate * 100);

  const activeOrders = useMemo(() => binaryBets.filter((b) => b.status === 'active'), [binaryBets]);
  const assetActiveOrders = useMemo(
    () => activeOrders.filter((b) => b.asset === selectedAsset),
    [activeOrders, selectedAsset]
  );
  const completedOrders = useMemo(() => binaryBets.filter((b) => b.status !== 'active'), [binaryBets]);

  const chartDataRef = useRef({
    candles: assetCandles,
    price: assetPrice,
    spec: activeSpec,
    activeOrders: assetActiveOrders,
    secRemaining: tfSecRemaining,
    timeframeSec: selectedTimeframe,
    timeframeLabel: activeTfObj.label,
    offsetMinutes,
    visibleCount,
    panOffset
  });

  chartDataRef.current = {
    candles: assetCandles,
    price: assetPrice,
    spec: activeSpec,
    activeOrders: assetActiveOrders,
    secRemaining: tfSecRemaining,
    timeframeSec: selectedTimeframe,
    timeframeLabel: activeTfObj.label,
    offsetMinutes,
    visibleCount,
    panOffset
  };

  useEffect(() => {
    let rafId = 0;

    const renderChart = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        if (ctx && rect.width > 0 && rect.height > 0) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const targetW = Math.floor(rect.width * dpr);
          const targetH = Math.floor(rect.height * dpr);
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          const {
            candles,
            price,
            spec,
            activeOrders: orders,
            secRemaining,
            timeframeSec,
            timeframeLabel,
            offsetMinutes: tzMin,
            visibleCount: count,
            panOffset: offset
          } = chartDataRef.current;

          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Crisp Light Terminal Surface
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);

          const axisRightW = 72 * dpr;
          const bottomAxisH = 22 * dpr;
          const topPad = 14 * dpr;
          const plotW = Math.max(80, w - axisRightW);
          const plotH = Math.max(80, h - bottomAxisH - topPad);

          const safeCount = Math.max(12, Math.min(candles.length || 28, count));
          const maxPan = Math.max(0, candles.length - safeCount);
          const clampedPan = Math.max(0, Math.min(maxPan, offset));
          const endIdx = candles.length - clampedPan;
          const startIdx = Math.max(0, endIdx - safeCount);
          const visible = candles.slice(startIdx, endIdx);
          const highs = visible.map((c) => c.high);
          const lows = visible.map((c) => c.low);
          orders.forEach((o) => {
            highs.push(o.entryPrice);
            lows.push(o.entryPrice);
          });

          const rawMin = lows.length > 0 ? Math.min(...lows, price) : price - spec.volatility * 3;
          const rawMax = highs.length > 0 ? Math.max(...highs, price) : price + spec.volatility * 3;
          const rawSpan = rawMax - rawMin;
          const minSpan = Math.max(rawSpan, spec.volatility * 2.8);
          const pad = minSpan * 0.16;
          const minP = rawMin - pad;
          const maxP = rawMax + pad;
          const rangeP = Math.max(spec.volatility * 0.5, maxP - minP);

          const priceToY = (p: number) => topPad + ((maxP - p) / rangeP) * plotH;

          // Subtle Horizontal & Vertical Gridlines
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1 * dpr;
          ctx.font = `600 ${9.5 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillStyle = '#64748B';

          const hLines = 5;
          for (let i = 0; i <= hLines; i++) {
            const ratio = i / hLines;
            const y = topPad + ratio * plotH;
            ctx.beginPath();
            ctx.setLineDash([3 * dpr, 3 * dpr]);
            ctx.moveTo(0, y);
            ctx.lineTo(plotW, y);
            ctx.stroke();
            ctx.setLineDash([]);

            const pVal = maxP - ratio * rangeP;
            ctx.fillText(pVal.toFixed(Math.min(4, spec.decimals)), plotW + 6 * dpr, y + 3 * dpr);
          }

          // Vertical Time Gridlines
          const vLines = 4;
          for (let i = 1; i <= vLines; i++) {
            const vx = (plotW / (vLines + 1)) * i;
            ctx.beginPath();
            ctx.setLineDash([3 * dpr, 4 * dpr]);
            ctx.strokeStyle = '#F1F5F9';
            ctx.moveTo(vx, topPad);
            ctx.lineTo(vx, topPad + plotH);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Right Axis Divider
          ctx.strokeStyle = '#E2E8F0';
          ctx.beginPath();
          ctx.moveTo(plotW, 0);
          ctx.lineTo(plotW, h - bottomAxisH);
          ctx.stroke();

          // Candle Plot Geometry
          const candleAreaW = plotW * 0.78;
          const slotW = candleAreaW / Math.max(1, visible.length);
          const bodyW = Math.max(4 * dpr, Math.min(11 * dpr, slotW * 0.62));

          visible.forEach((c, idx) => {
            const cx = idx * slotW + slotW / 2 + 4 * dpr;
            const isBull = c.close >= c.open;
            const col = isBull ? '#10B981' : '#EF4444';
            const highY = priceToY(c.high);
            const lowY = priceToY(c.low);
            const openY = priceToY(c.open);
            const closeY = priceToY(c.close);

            ctx.strokeStyle = col;
            ctx.lineWidth = 1.4 * dpr;
            ctx.beginPath();
            ctx.moveTo(cx, highY);
            ctx.lineTo(cx, lowY);
            ctx.stroke();

            const topY = Math.min(openY, closeY);
            const bodyH = Math.max(2 * dpr, Math.abs(closeY - openY));
            ctx.fillStyle = col;
            ctx.fillRect(cx - bodyW / 2, topY, bodyW, bodyH);
          });

          // Beginning & End of Trade Vertical Dashed Lines
          const beginX = candleAreaW + 6 * dpr;
          const endX = plotW - 18 * dpr;

          ctx.save();
          ctx.setLineDash([4 * dpr, 3 * dpr]);
          ctx.lineWidth = 1.2 * dpr;

          ctx.strokeStyle = '#94A3B8';
          ctx.beginPath();
          ctx.moveTo(beginX, topPad);
          ctx.lineTo(beginX, topPad + plotH);
          ctx.stroke();

          ctx.strokeStyle = '#0891B2';
          ctx.beginPath();
          ctx.moveTo(endX, topPad);
          ctx.lineTo(endX, topPad + plotH);
          ctx.stroke();
          ctx.restore();

          ctx.font = `700 ${8 * dpr}px sans-serif`;
          ctx.fillStyle = '#64748B';
          ctx.fillText('Beginning', beginX - 18 * dpr, topPad + 9 * dpr);
          ctx.fillStyle = '#0E7490';
          ctx.fillText(`End (${timeframeLabel})`, endX - 36 * dpr, topPad + 9 * dpr);

          // Live Price Dashed Horizontal Line + Pulsing Tip Dot + Right Price Pill
          const liveY = Math.max(topPad + 6 * dpr, Math.min(topPad + plotH - 6 * dpr, priceToY(price)));
          ctx.save();
          ctx.setLineDash([3 * dpr, 3 * dpr]);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 1.1 * dpr;
          ctx.beginPath();
          ctx.moveTo(0, liveY);
          ctx.lineTo(plotW, liveY);
          ctx.stroke();
          ctx.restore();

          const lastX = visible.length > 0 ? (visible.length - 1) * slotW + slotW / 2 + 4 * dpr : candleAreaW;
          ctx.beginPath();
          ctx.arc(lastX, liveY, 3.6 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = '#0891B2';
          ctx.fill();
          ctx.lineWidth = 1.5 * dpr;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          // Right-axis Current Price Pill
          const tagH = 18 * dpr;
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.roundRect(plotW + 2 * dpr, liveY - tagH / 2, axisRightW - 5 * dpr, tagH, 4 * dpr);
          ctx.fill();
          ctx.fillStyle = '#22D3EE';
          ctx.font = `700 ${9.5 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillText(price.toFixed(Math.min(4, spec.decimals)), plotW + 6 * dpr, liveY + 3.2 * dpr);

          // Active Order Exact Entry Price Line
          orders.forEach((order, oIdx) => {
            const entryY = Math.max(topPad + 10 * dpr, Math.min(topPad + plotH - 10 * dpr, priceToY(order.entryPrice)));
            const isCall = order.direction === 'UP';
            const diff = price - order.entryPrice;
            const inProfit = (isCall && diff > 0) || (!isCall && diff < 0);
            const lineCol = isCall ? '#10B981' : '#EF4444';

            ctx.save();
            ctx.setLineDash([5 * dpr, 3 * dpr]);
            ctx.strokeStyle = lineCol;
            ctx.lineWidth = 1.8 * dpr;
            ctx.beginPath();
            ctx.moveTo(0, entryY);
            ctx.lineTo(plotW, entryY);
            ctx.stroke();
            ctx.restore();

            const pillY = Math.max(topPad + 12 * dpr, Math.min(topPad + plotH - 12 * dpr, entryY - oIdx * 20 * dpr));
            const labelText = `${isCall ? '▲ BUY' : '▼ SELL'} ${order.entryPrice.toFixed(Math.min(4, spec.decimals))} • ${
              inProfit ? `+৳${(order.amount * order.payoutRate).toFixed(0)}` : `-৳${order.amount}`
            }`;
            const pillW = Math.min(plotW - 14 * dpr, (labelText.length * 5.6 + 14) * dpr);

            ctx.fillStyle = lineCol;
            ctx.beginPath();
            ctx.roundRect(8 * dpr, pillY - 9 * dpr, pillW, 18 * dpr, 4 * dpr);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = `800 ${8.5 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
            ctx.fillText(labelText, 13 * dpr, pillY + 3 * dpr);

            ctx.beginPath();
            ctx.arc(beginX, entryY, 4 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = lineCol;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5 * dpr;
            ctx.stroke();
          });

          // Bottom Time Axis Strip
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(0, h - bottomAxisH, w, bottomAxisH);
          ctx.strokeStyle = '#E2E8F0';
          ctx.beginPath();
          ctx.moveTo(0, h - bottomAxisH);
          ctx.lineTo(w, h - bottomAxisH);
          ctx.stroke();

          ctx.fillStyle = '#64748B';
          ctx.font = `600 ${8.5 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          const indices = [0, Math.floor(visible.length * 0.35), Math.floor(visible.length * 0.7), visible.length - 1];
          indices.forEach((idx) => {
            const c = visible[idx];
            if (!c) return;
            const tx = Math.max(8 * dpr, Math.min(plotW - 44 * dpr, idx * slotW + 4 * dpr));
            const label = timeframeSec >= 86400 ? formatDateWithOffset(c.time, tzMin) : formatTimeWithOffset(c.time, tzMin);
            ctx.fillText(label, tx, h - 7 * dpr);
          });
          ctx.fillStyle = '#0891B2';
          ctx.fillText(formatCountdownClock(secRemaining), plotW + 5 * dpr, h - 7 * dpr);
        }
      }
      rafId = requestAnimationFrame(renderChart);
    };

    rafId = requestAnimationFrame(renderChart);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleTrade = (direction: 'UP' | 'DOWN') => {
    const amt = Number(customAmountStr) || tradeAmount;
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum trade amount is ৳10');
      return;
    }
    if (user.balance < amt) {
      showToast('Insufficient wallet balance!');
      return;
    }
    placeBinaryTrade(selectedAsset, direction, amt, selectedTimeframe, assetPrice);
  };

  const handleExit = () => {
    setActiveTab('home');
    window.location.hash = '#/';
  };

  const isUp = (activeQuote?.changePct ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-36">
      {/* Light Mode Header */}
      <div className="bg-white border-b border-cyan-100 px-3.5 py-2.5 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleExit}
              className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Exit Market"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="flex items-center flex-shrink-0">
              <Ewi777Logo height={34} logoUrl={adminSettings.appLogoUrl} />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isGoldMode) setShowAssetPicker((v) => !v);
              }}
              className={`px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-left transition-colors min-w-0 ${
                isGoldMode ? 'cursor-default border-cyan-200 bg-cyan-50/70' : 'hover:border-cyan-400'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-slate-900 truncate">
                    {isGoldMode ? 'GOLD XAU/USD' : selectedAsset}
                  </span>
                  <span className="text-[10px] font-black text-cyan-700 tabular-nums">
                    +{payoutPct}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                  <span>{isGoldMode ? 'Spot Gold Trading' : activeSpec.name}</span>
                </div>
              </div>
              {!isGoldMode && <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold leading-none">Balance</div>
              <div className="text-xs font-black font-mono text-slate-900 tabular-nums mt-0.5">
                ৳{user.balance.toFixed(2)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-black text-xs shadow-xs active:scale-95 whitespace-nowrap"
            >
              Deposit
            </button>
          </div>
        </div>

        {/* Timezone Bar */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
          <div className="flex items-center gap-1.5 font-mono text-slate-600 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            <span className="font-bold text-slate-800">
              {formatTimeWithOffset(nowTime, offsetMinutes)}
            </span>
            <span className="text-slate-400">({formatOffsetLabel(offsetMinutes)})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isGoldMode ? (
              <span className="px-2.5 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs">
                <GoldMarketLogo size={14} className="rounded-sm" />
                <span>GOLD TRADING</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Globe2 className="w-3 h-3" />
                <span>BINARY TRADING</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setTradesPopover((p) => (p === 'open' ? 'none' : 'open'))}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-colors ${
                tradesPopover === 'open'
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Open ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setTradesPopover((p) => (p === 'closed' ? 'none' : 'closed'))}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-colors ${
                tradesPopover === 'closed'
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Closed ({completedOrders.length})
            </button>
          </div>
        </div>

        {/* Asset Dropdown Overlay (Binary Trading markets only) */}
        {!isGoldMode && showAssetPicker && (
          <div className="mt-2 bg-white border border-cyan-200 rounded-2xl p-3 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                <Globe2 className="w-4 h-4 text-cyan-600" />
                <span>Select Binary Market ({filteredMarkets.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetPicker(false)}
                className="p-1 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {BINARY_ONLY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-cyan-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
              {filteredMarkets.map((mkt) => {
                const q = binaryMarkets[mkt.symbol];
                const px = q?.price ?? mkt.basePrice;
                const chg = q?.changePct ?? 0;
                const active = mkt.symbol === selectedAsset;
                return (
                  <button
                    key={mkt.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedAsset(mkt.symbol);
                      setShowAssetPicker(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-cyan-50 border-cyan-500 ring-1 ring-cyan-400'
                        : 'bg-slate-50/70 border-slate-200 hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">{mkt.symbol}</span>
                      <span className="text-[10px] font-black text-emerald-600">
                        +{Math.round(mkt.payoutRate * 100)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{mkt.name}</div>
                    <div className="flex items-center justify-between mt-1 font-mono text-[11px] tabular-nums">
                      <span className="font-bold text-slate-900">{formatAssetPrice(px, mkt)}</span>
                      <span className={chg >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {chg >= 0 ? '+' : ''}
                        {chg.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Trading Workspace */}
      <div className="p-3 space-y-3">
        {!isGoldMode && (
          <div className="relative rounded-2xl overflow-hidden border border-cyan-200 shadow-xs bg-slate-900 h-24">
            <img
              src="/assets/aistudio/image_f9ecaae4.png"
              alt="EWI Binary Options Trading"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent flex flex-col justify-center px-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                Crypto · Forex · Indices
              </span>
              <span className="text-sm font-black text-white leading-tight mt-0.5">
                EWI777 Binary Pro Market
              </span>
              <span className="text-[11px] font-semibold text-slate-200 mt-0.5">
                Up to +92% instant payout · Tap asset above to switch
              </span>
            </div>
          </div>
        )}

        {/* Live Quote Header Strip */}
        <div className="bg-white rounded-2xl border border-slate-200 px-3.5 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            {selectedAsset === 'XAU/USD' ? (
              <GoldMarketLogo size={36} />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                <Coins className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900">{selectedAsset}</span>
                <span className="text-[11px] font-bold text-cyan-700">{activeSpec.category}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-mono tabular-nums">
                <span className="text-lg font-black text-slate-900">
                  {formatAssetPrice(assetPrice, activeSpec)}
                </span>
                <span className={`text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isUp ? '+' : ''}
                  {(activeQuote?.changePct ?? 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Candle Close ({activeTfObj.label})</div>
            <div className="text-base font-mono font-black text-cyan-700 tabular-nums">
              {tfCountdownLabel}
            </div>
          </div>
        </div>

        {/* Open / Closed Trades Popover Card */}
        {tradesPopover !== 'none' && (
          <div className="bg-white rounded-2xl border border-cyan-200 p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-cyan-600" />
                <span>
                  {tradesPopover === 'open'
                    ? `Open Positions (${activeOrders.length})`
                    : `Closed History (${completedOrders.length})`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setTradesPopover('none')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            {tradesPopover === 'open' ? (
              activeOrders.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-400">
                  No open trades right now. Tap Buy ↑ or Sell ↓ below to open a position.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {activeOrders.map((order) => {
                    const spec = BINARY_MARKET_MAP[order.asset] || activeSpec;
                    const livePx = binaryMarkets[order.asset]?.price ?? order.entryPrice;
                    const isCall = order.direction === 'UP';
                    const diff = livePx - order.entryPrice;
                    const inMoney = (isCall && diff > 0) || (!isCall && diff < 0);
                    const secLeft = Math.max(0, Math.ceil((order.endTime - nowTime) / 1000));
                    return (
                      <div
                        key={order.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          inMoney ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-black">
                            <span className={isCall ? 'text-emerald-600' : 'text-rose-600'}>
                              {isCall ? '▲ BUY' : '▼ SELL'}
                            </span>
                            <span className="text-slate-900">{order.asset}</span>
                            <span className="text-slate-600 tabular-nums">৳{order.amount}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 tabular-nums">
                            Entry {formatAssetPrice(order.entryPrice, spec)} → Live {formatAssetPrice(livePx, spec)}
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="font-black text-cyan-700">{formatCountdownClock(secLeft)}</div>
                          <div className={`text-[10px] font-black ${inMoney ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {inMoney ? `+৳${(order.amount * order.payoutRate).toFixed(0)}` : 'Out of Money'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : completedOrders.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400">No closed trades recorded yet.</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {completedOrders.slice(0, 20).map((t) => {
                  const spec = BINARY_MARKET_MAP[t.asset] || activeSpec;
                  const won = t.status === 'won';
                  return (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-black">
                          <span className={t.direction === 'UP' ? 'text-emerald-600' : 'text-rose-600'}>
                            {t.direction === 'UP' ? '▲ BUY' : '▼ SELL'}
                          </span>
                          <span className="text-slate-900">{t.asset}</span>
                          <span className="tabular-nums text-slate-600">৳{t.amount}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5 tabular-nums">
                          Entry {formatAssetPrice(t.entryPrice, spec)} · Exit{' '}
                          {t.strikePrice !== undefined ? formatAssetPrice(t.strikePrice, spec) : '—'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-lg font-mono font-black text-[11px] tabular-nums ${
                          won ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {won ? `+৳${(t.winAmount ?? t.amount * (1 + t.payoutRate)).toFixed(2)}` : `-৳${t.amount.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Smooth 60fps Light Canvas + Zoom & Pan Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 text-[10px]">
            <span className="font-bold text-slate-500">
              Showing {Math.min(visibleCount, assetCandles.length || visibleCount)}/{assetCandles.length || 96} candles ({activeTfObj.label})
              {panOffset > 0 ? ` • History (-${panOffset})` : ' • Live'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setPanOffset((p) =>
                    Math.min(Math.max(0, assetCandles.length - visibleCount), p + Math.max(4, Math.floor(visibleCount / 4)))
                  )
                }
                className="px-2 py-0.5 rounded bg-white border border-slate-200 font-black text-slate-700 hover:border-cyan-400"
                title="Pan Left"
              >
                &lt;
              </button>
              <button
                type="button"
                onClick={() => setVisibleCount((c) => Math.min(96, c + 12))}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 font-black text-slate-700 hover:border-cyan-400"
                title="Zoom Out"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisibleCount(Math.min(96, Math.max(28, assetCandles.length || 96)));
                  setPanOffset(0);
                }}
                className="px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 font-black text-cyan-700 hover:bg-cyan-100"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setVisibleCount((c) => Math.max(12, c - 8))}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 font-black text-slate-700 hover:border-cyan-400"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setPanOffset((p) => Math.max(0, p - Math.max(4, Math.floor(visibleCount / 4))))}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 font-black text-slate-700 hover:border-cyan-400"
                title="Pan Right"
              >
                &gt;
              </button>
            </div>
          </div>
          <div
            className="w-full h-64 sm:h-72 relative touch-pan-y select-none cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              dragRef.current = { active: true, startX: e.clientX, startPan: panOffset };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return;
              const dx = e.clientX - dragRef.current.startX;
              const deltaCandles = Math.round(dx / 12);
              const maxPan = Math.max(0, assetCandles.length - visibleCount);
              setPanOffset(Math.max(0, Math.min(maxPan, dragRef.current.startPan + deltaCandles)));
            }}
            onPointerUp={() => {
              dragRef.current.active = false;
            }}
            onPointerLeave={() => {
              dragRef.current.active = false;
            }}
          >
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </div>

        {/* Live Entry Marker Cards */}
        {activeOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-cyan-200 p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-black text-slate-800">
              <span>Active Market Positions ({activeOrders.length})</span>
              <span className="text-[11px] text-cyan-700">Auto Settle on Expiry</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {activeOrders.slice(0, 4).map((order) => {
                const spec = BINARY_MARKET_MAP[order.asset] || activeSpec;
                const livePx = binaryMarkets[order.asset]?.price ?? order.entryPrice;
                const isCall = order.direction === 'UP';
                const diff = livePx - order.entryPrice;
                const inProfit = (isCall && diff > 0) || (!isCall && diff < 0);
                const secLeft = Math.max(0, Math.ceil((order.endTime - nowTime) / 1000));
                return (
                  <div
                    key={order.id}
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs ${
                      inProfit ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded font-black text-[10px] text-white ${
                          isCall ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      >
                        {isCall ? '▲ BUY' : '▼ SELL'}
                      </span>
                      <span className="font-black text-slate-900">{order.asset}</span>
                      <span className="font-mono text-[11px] text-slate-600 tabular-nums truncate">
                        @{formatAssetPrice(order.entryPrice, spec)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums flex-shrink-0">
                      <span className={`font-black text-[11px] ${inProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {inProfit ? `+৳${(order.amount * order.payoutRate).toFixed(0)}` : `-৳${order.amount}`}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-cyan-200 text-cyan-800 font-black text-[11px]">
                        {formatCountdownClock(secLeft)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Control Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3 shadow-2xs">
          {/* Pending Trade Toggle + Payout Info */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setPendingTradeMode((v) => !v);
                showToast(!pendingTradeMode ? 'Pending Trade execution armed' : 'Instant Market execution active');
              }}
              className="flex items-center gap-2 text-xs font-bold text-slate-700"
            >
              <span
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                  pendingTradeMode ? 'bg-cyan-600 justify-end' : 'bg-slate-200 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </span>
              <span className="uppercase tracking-wide text-[11px] font-black text-slate-700">
                PENDING TRADE
              </span>
            </button>

            <span className="text-[11px] font-black text-emerald-600 tabular-nums">
              Payout {payoutPct}% (+৳{((Number(customAmountStr) || tradeAmount) * activeSpec.payoutRate).toFixed(0)})
            </span>
          </div>

          {/* Trade Duration Selector (30 sec .. 30 day) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Trade Duration (Seconds / Time)
              </span>
              <span className="text-[11px] font-black text-cyan-700 tabular-nums">
                Active: {activeTfObj.label}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.sec}
                  type="button"
                  onClick={() => {
                    setSelectedTimeframe(tf.sec);
                    setPanOffset(0);
                  }}
                  className={`py-2 px-1 rounded-lg text-[11px] font-black transition-all tabular-nums whitespace-nowrap ${
                    selectedTimeframe === tf.sec
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-cyan-50'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Investment Input (Min ৳10) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
              <span>Investment (Min ৳10)</span>
              <span className="font-mono tabular-nums">
                Est. Return: ৳{((Number(customAmountStr) || tradeAmount) * (1 + activeSpec.payoutRate)).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(10, (Number(customAmountStr) || 20) - 10);
                  setTradeAmount(next);
                  setCustomAmountStr(String(next));
                }}
                className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-sm text-cyan-700">
                  ৳
                </span>
                <input
                  type="number"
                  min={10}
                  value={customAmountStr}
                  onChange={(e) => {
                    setCustomAmountStr(e.target.value);
                    setTradeAmount(Number(e.target.value) || 0);
                  }}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 text-center font-mono font-black text-base text-slate-900 focus:outline-none focus:border-cyan-500 tabular-nums"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(50000, (Number(customAmountStr) || 10) + 10);
                  setTradeAmount(next);
                  setCustomAmountStr(String(next));
                }}
                className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setTradeAmount(amt);
                    setCustomAmountStr(String(amt));
                  }}
                  className={`py-1.5 rounded-lg text-[11px] font-black border transition-all tabular-nums ${
                    Number(customAmountStr) === amt
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ৳{amt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Trade Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md px-3.5 py-2.5 border-t border-slate-200 shadow-2xl z-30 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => handleTrade('UP')}
          className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <TrendingUp className="w-4 h-4 stroke-[3]" />
          <span>Buy ↑ (৳{customAmountStr || tradeAmount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTrade('DOWN')}
          className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-[#EF4444] hover:bg-rose-600 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <TrendingDown className="w-4 h-4 stroke-[3]" />
          <span>Sell ↓ (৳{customAmountStr || tradeAmount})</span>
        </button>
      </div>
    </div>
  );
};
