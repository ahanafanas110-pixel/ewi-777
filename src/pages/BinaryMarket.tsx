import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowLeft,
  ChevronDown,
  X,
  Plus,
  Minus,
  Globe2,
  Coins,
  Bell,
  Briefcase,
  MoreHorizontal,
  CalendarClock,
  Trash2,
  Layers
} from 'lucide-react';
import { GoldMarketLogo } from '../components/BrandLogos';
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

// Independent candle chart intervals (controlled by ••• 3-dot button on chart)
const CANDLE_INTERVALS = [
  { label: '30s', sec: 30 },
  { label: '1m', sec: 60 },
  { label: '2m', sec: 120 },
  { label: '3m', sec: 180 },
  { label: '5m', sec: 300 },
  { label: '15m', sec: 900 },
  { label: '30m', sec: 1800 }
];

// Trade expiry presets (controlled by Timer box in order panel)
const EXPIRY_PRESETS = [
  { label: '30s', short: '00:30', sec: 30 },
  { label: '1m', short: '01:00', sec: 60 },
  { label: '3m', short: '03:00', sec: 180 },
  { label: '5m', short: '05:00', sec: 300 },
  { label: '15m', short: '15:00', sec: 900 },
  { label: '30m', short: '30:00', sec: 1800 },
  { label: '1h', short: '01:00h', sec: 3600 },
  { label: '1d', short: '1d', sec: 86400 },
  { label: '15d', short: '15d', sec: 1296000 },
  { label: '30d', short: '30d', sec: 2592000 }
];

const QUICK_AMOUNTS = [10, 50, 100, 500, 1000];

interface ScheduledPendingTrade {
  id: string;
  asset: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  durationSec: number;
  targetTimeLabel: string;
  triggerAtMs: number;
  createdAtMs: number;
}

function formatDurationLabel(sec: number): string {
  if (sec < 60) return `00:${String(sec).padStart(2, '0')}`;
  if (sec < 3600) {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  if (sec < 86400 && sec % 3600 === 0) {
    return `${Math.round(sec / 3600)}h`;
  }
  if (sec % 86400 === 0) {
    return `${Math.round(sec / 86400)}d`;
  }
  return `${Math.round(sec / 60)}m`;
}

function formatAssetPrice(value: number, spec?: BinaryMarketConfig): string {
  const decimals = spec?.decimals ?? 2;
  const num = Number(value) || 0;
  const formatted = num.toFixed(decimals);
  if (spec?.category === 'Forex') return formatted;
  return `$${formatted}`;
}

function getDefaultPendingClock(offsetMs = 120000): string {
  const d = new Date(Date.now() + offsetMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseClockToTriggerMs(hhmm: string): number {
  const [hStr, mStr] = (hhmm || '').split(':');
  const hh = Math.max(0, Math.min(23, Number(hStr) || 0));
  const mm = Math.max(0, Math.min(59, Number(mStr) || 0));
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  if (target.getTime() <= Date.now() + 3000) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
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
    adminSettings,
    unreadNotificationsCount,
    notifications
  } = useApp();

  const isGoldMode = initialMarketMode === 'gold';
  const [selectedCategory, setSelectedCategory] = useState<'All' | BinaryMarketCategory>('All');
  const [selectedAsset, setSelectedAsset] = useState<string>(isGoldMode ? 'XAU/USD' : 'BTC/USDT');
  const [showAssetPicker, setShowAssetPicker] = useState<boolean>(false);
  const [showNotifPopover, setShowNotifPopover] = useState<boolean>(false);

  // Independent Candle Timeframe (••• button on chart) vs Trade Expiry Timer
  const [candleTimeframeSec, setCandleTimeframeSec] = useState<number>(60);
  const [showCandleMenu, setShowCandleMenu] = useState<boolean>(false);

  const [tradeDurationSec, setTradeDurationSec] = useState<number>(60);
  const [customMinutesStr, setCustomMinutesStr] = useState<string>('1');
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [customAmountStr, setCustomAmountStr] = useState<string>('100');

  // Timer & Pending Time scheduler popover
  const [timerModalOpen, setTimerModalOpen] = useState<boolean>(false);
  const [timerModalTab, setTimerModalTab] = useState<'timer' | 'time'>('timer');
  const [pendingTradeMode, setPendingTradeMode] = useState<boolean>(false);
  const [pendingClockStr, setPendingClockStr] = useState<string>(() => getDefaultPendingClock());
  const [pendingDirection, setPendingDirection] = useState<'UP' | 'DOWN'>('UP');

  const [pendingOrders, setPendingOrders] = useState<ScheduledPendingTrade[]>(() => {
    try {
      const raw = localStorage.getItem('ewi777_binary_pending_orders');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Briefcase drawer (Open / Pending / Closed)
  const [tradesPopover, setTradesPopover] = useState<'none' | 'open' | 'pending' | 'closed'>('none');

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
    try {
      localStorage.setItem('ewi777_binary_pending_orders', JSON.stringify(pendingOrders));
    } catch {}
  }, [pendingOrders]);

  // Keep refs fresh so pending timer triggers cleanly
  const latestMarketsRef = useRef(binaryMarkets);
  latestMarketsRef.current = binaryMarkets;
  const placeTradeRef = useRef(placeBinaryTrade);
  placeTradeRef.current = placeBinaryTrade;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setNowTime(now);

      setPendingOrders((prev) => {
        if (prev.length === 0) return prev;
        const due = prev.filter((o) => now >= o.triggerAtMs);
        if (due.length === 0) return prev;
        const remaining = prev.filter((o) => now < o.triggerAtMs);
        due.forEach((order) => {
          const spec = BINARY_MARKET_MAP[order.asset];
          const px = latestMarketsRef.current[order.asset]?.price ?? spec?.basePrice ?? 0;
          const res = placeTradeRef.current(order.asset, order.direction, order.amount, order.durationSec, px);
          if (res.success) {
            showToastRef.current(`Pending ${order.direction === 'UP' ? 'BUY' : 'SELL'} ${order.asset} executed!`);
          }
        });
        return remaining;
      });
    }, 250);
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
  const candleSecRemaining = Math.max(1, candleTimeframeSec - (currentSecEpoch % candleTimeframeSec));
  const candleCountdownLabel = formatCountdownClock(candleSecRemaining);
  const tradeExpiryLabel = formatDurationLabel(tradeDurationSec);
  const candleIntervalLabel =
    CANDLE_INTERVALS.find((c) => c.sec === candleTimeframeSec)?.label || formatDurationLabel(candleTimeframeSec);

  const assetCandles = useMemo(
    () =>
      getSyncedBinaryCandlesForTimeframe(
        activeSpec,
        candleTimeframeSec,
        nowTime,
        adminSettings.binaryNextCandleBias || 'AUTO',
        offsetMinutes,
        96,
        assetPrice
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSpec, candleTimeframeSec, currentSecEpoch, adminSettings.binaryNextCandleBias, offsetMinutes, assetPrice]
  );

  const latestCandle = assetCandles[assetCandles.length - 1];
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
    secRemaining: candleSecRemaining,
    candleSec: candleTimeframeSec,
    expiryLabel: tradeExpiryLabel,
    offsetMinutes,
    visibleCount,
    panOffset
  });

  chartDataRef.current = {
    candles: assetCandles,
    price: assetPrice,
    spec: activeSpec,
    activeOrders: assetActiveOrders,
    secRemaining: candleSecRemaining,
    candleSec: candleTimeframeSec,
    expiryLabel: tradeExpiryLabel,
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
            candleSec,
            expiryLabel,
            offsetMinutes: tzMin,
            visibleCount: count,
            panOffset: offset
          } = chartDataRef.current;

          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Pure Light Mode Terminal Surface
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);

          const axisRightW = 74 * dpr;
          const bottomAxisH = 22 * dpr;
          const topPad = 18 * dpr;
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
          const minSpan = Math.max(rawSpan, spec.volatility * 2.6);
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

          for (let i = 1; i <= 4; i++) {
            const vx = (plotW / 5) * i;
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
          const candleAreaW = plotW * 0.74;
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

          // Beginning of Trade ▸ & Expiry Dashed Vertical Lines
          const beginX = candleAreaW + 8 * dpr;
          const endX = plotW - 14 * dpr;

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
          ctx.fillStyle = '#475569';
          ctx.fillText('Beginning of trade ▸', beginX - 42 * dpr, topPad - 5 * dpr);
          ctx.fillStyle = '#0E7490';
          ctx.fillText(`Exp ${expiryLabel}`, endX - 36 * dpr, topPad - 5 * dpr);

          // Live Price Horizontal Dashed Line + Glowing Tip + Countdown Pill
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
          ctx.arc(lastX, liveY, 3.8 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = '#0891B2';
          ctx.fill();
          ctx.lineWidth = 1.6 * dpr;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          // Right-axis Current Price Pill + Candle Countdown
          const tagH = 19 * dpr;
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.roundRect(plotW + 2 * dpr, liveY - tagH / 2, axisRightW - 5 * dpr, tagH, 4 * dpr);
          ctx.fill();
          ctx.fillStyle = '#22D3EE';
          ctx.font = `800 ${9.2 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillText(price.toFixed(Math.min(4, spec.decimals)), plotW + 6 * dpr, liveY + 3.2 * dpr);

          // Live floating candle countdown near Beginning line
          const cdText = formatCountdownClock(secRemaining);
          ctx.fillStyle = '#0891B2';
          ctx.beginPath();
          ctx.roundRect(beginX - 18 * dpr, topPad + 4 * dpr, 36 * dpr, 14 * dpr, 4 * dpr);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `800 ${8 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillText(cdText, beginX - 13 * dpr, topPad + 13.5 * dpr);

          // Active Order Exact Entry Price Lines
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

            const pillY = Math.max(topPad + 14 * dpr, Math.min(topPad + plotH - 12 * dpr, entryY - oIdx * 20 * dpr));
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
            const label = candleSec >= 86400 ? formatDateWithOffset(c.time, tzMin) : formatTimeWithOffset(c.time, tzMin);
            ctx.fillText(label, tx, h - 7 * dpr);
          });
          ctx.fillStyle = '#0891B2';
          ctx.fillText(cdText, plotW + 5 * dpr, h - 7 * dpr);
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
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < amt) {
      showToast('Insufficient wallet balance!');
      return;
    }

    if (pendingTradeMode) {
      setPendingDirection(direction);
      setTimerModalTab('time');
      setTimerModalOpen(true);
      return;
    }

    placeBinaryTrade(selectedAsset, direction, amt, tradeDurationSec, assetPrice);
  };

  const handleConfirmPendingOrder = () => {
    const amt = Number(customAmountStr) || tradeAmount;
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum pending trade amount is ৳10');
      return;
    }
    const triggerAtMs = parseClockToTriggerMs(pendingClockStr);
    const entry: ScheduledPendingTrade = {
      id: `pend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      asset: selectedAsset,
      direction: pendingDirection,
      amount: amt,
      durationSec: tradeDurationSec,
      targetTimeLabel: pendingClockStr,
      triggerAtMs,
      createdAtMs: Date.now()
    };
    setPendingOrders((prev) => [entry, ...prev]);
    setTimerModalOpen(false);
    setPendingTradeMode(false);
    showToast(`Pending ${pendingDirection === 'UP' ? 'BUY' : 'SELL'} scheduled for ${pendingClockStr}`);
  };

  const handleExit = () => {
    setActiveTab('home');
    window.location.hash = '#/';
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      {/* Top Trading Terminal Header (Video-Matched Pure Light Mode) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back + REAL Balance + Bell */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleExit}
              className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
              aria-label="Exit Market"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black tracking-wide">
                REAL
              </span>
              <span className="text-xs font-black font-mono text-slate-900 tabular-nums truncate">
                ৳{user.balance.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowNotifPopover((v) => !v)}
              className="relative w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center hover:border-cyan-400 active:scale-95 flex-shrink-0"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: Markets Picker + Deposit CTA */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!isGoldMode) setShowAssetPicker((v) => !v);
                else showToast('Gold Trading · Spot XAU/USD (+92% payout)');
              }}
              className="px-2.5 py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 font-black text-xs flex items-center gap-1 active:scale-95"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Markets</span>
              {!isGoldMode && <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs shadow-xs active:scale-95 whitespace-nowrap"
            >
              Deposit
            </button>
          </div>
        </div>

        {/* Notifications Popover */}
        {showNotifPopover && (
          <div className="mt-2 bg-white border border-cyan-200 rounded-2xl p-3 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-800">
              <span>Account Alerts</span>
              <button
                type="button"
                onClick={() => setShowNotifPopover(false)}
                className="p-1 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentNotifications.length === 0 ? (
              <div className="text-[11px] text-slate-500 py-2 text-center">No recent alerts</div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {recentNotifications.map((n) => (
                  <div key={n.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                    <div className="font-black text-slate-900">{n.title}</div>
                    <div className="text-slate-600 truncate">{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
      <div className="p-3 space-y-2.5">
        {/* Live Quote Strip */}
        <div className="bg-white rounded-2xl border border-slate-200 px-3.5 py-2 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            {selectedAsset === 'XAU/USD' ? (
              <GoldMarketLogo size={34} />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                <Coins className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900">{selectedAsset}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black">
                  +{payoutPct}%
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                {activeSpec.name} • {formatTimeWithOffset(nowTime, offsetMinutes)} ({formatOffsetLabel(offsetMinutes)})
              </div>
            </div>
          </div>

          <div className="text-right font-mono tabular-nums">
            <div className="text-sm font-black text-slate-900">{formatAssetPrice(assetPrice, activeSpec)}</div>
            <div
              className={`text-[10px] font-black ${
                (activeQuote?.changePct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {(activeQuote?.changePct ?? 0) >= 0 ? '+' : ''}
              {(activeQuote?.changePct ?? 0).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Briefcase Trade History Popover */}
        {tradesPopover !== 'none' && (
          <div className="bg-white rounded-2xl border border-cyan-200 p-3 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'open', label: `Open (${activeOrders.length})` },
                    { id: 'pending', label: `Pending (${pendingOrders.length})` },
                    { id: 'closed', label: `Closed (${completedOrders.length})` }
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTradesPopover(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors ${
                      tradesPopover === t.id ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTradesPopover('none')}
                className="p-1 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {tradesPopover === 'open' && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {activeOrders.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No open trades active.</p>
                ) : (
                  activeOrders.map((t) => {
                    const spec = BINARY_MARKET_MAP[t.asset] || activeSpec;
                    const secLeft = Math.max(0, Math.ceil((t.endTime - nowTime) / 1000));
                    return (
                      <div
                        key={t.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-black text-slate-900">
                            {t.direction === 'UP' ? '▲ BUY' : '▼ SELL'} {t.asset}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            @{formatAssetPrice(t.entryPrice, spec)} • ৳{t.amount}
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-cyan-50 text-cyan-800 font-mono font-black text-[11px] tabular-nums">
                          {formatCountdownClock(secLeft)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tradesPopover === 'pending' && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {pendingOrders.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    No pending scheduled trades. Open Timer → TIME to schedule one.
                  </p>
                ) : (
                  pendingOrders.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-black text-slate-900">
                          {p.direction === 'UP' ? '▲ BUY' : '▼ SELL'} {p.asset} • ৳{p.amount}
                        </div>
                        <div className="text-[10px] font-mono text-amber-700">
                          Executes at {p.targetTimeLabel} • Expiry {formatDurationLabel(p.durationSec)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingOrders((prev) => prev.filter((x) => x.id !== p.id));
                          showToast('Cancelled pending trade');
                        }}
                        className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600"
                        aria-label="Cancel pending trade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {tradesPopover === 'closed' && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {completedOrders.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No closed trades yet.</p>
                ) : (
                  completedOrders.slice(0, 15).map((t) => {
                    const spec = BINARY_MARKET_MAP[t.asset] || activeSpec;
                    const won = t.status === 'won';
                    return (
                      <div
                        key={t.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-black text-slate-900">
                            {t.direction === 'UP' ? '▲ BUY' : '▼ SELL'} {t.asset}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Entry {formatAssetPrice(t.entryPrice, spec)} → Exit{' '}
                            {formatAssetPrice(t.exitPrice || t.entryPrice, spec)}
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
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Candlestick Chart Card with Top-Left ••• Candle Selector & Briefcase */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
          {/* Chart Header Overlay: ••• Candle Timeframe | Briefcase Trades | Live OHLC */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80">
            <div className="flex items-center gap-1.5 relative">
              {/* 3-Dot Button -> Candle Timeframe Menu */}
              <button
                type="button"
                onClick={() => setShowCandleMenu((v) => !v)}
                className={`px-2 py-1 rounded-lg border text-xs font-black flex items-center gap-1 transition-colors ${
                  showCandleMenu
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400'
                }`}
                aria-label="Candle Timeframe Settings"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">{candleIntervalLabel}</span>
              </button>

              {/* Briefcase Open / Pending / Closed Trades */}
              <button
                type="button"
                onClick={() => setTradesPopover((p) => (p === 'none' ? 'open' : 'none'))}
                className={`relative px-2 py-1 rounded-lg border text-xs font-black flex items-center gap-1 transition-colors ${
                  tradesPopover !== 'none'
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400'
                }`}
                aria-label="Trades History"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">{activeOrders.length + pendingOrders.length}</span>
              </button>

              {/* 3-Dot Candle Interval Popover */}
              {showCandleMenu && (
                <div className="absolute top-9 left-0 z-40 w-56 bg-white border border-cyan-200 rounded-2xl p-2.5 shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <Layers className="w-3 h-3 text-cyan-600" />
                      <span>Candle Interval</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCandleMenu(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CANDLE_INTERVALS.map((ci) => (
                      <button
                        key={ci.sec}
                        type="button"
                        onClick={() => {
                          setCandleTimeframeSec(ci.sec);
                          setPanOffset(0);
                          setShowCandleMenu(false);
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${
                          candleTimeframeSec === ci.sec
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-cyan-50'
                        }`}
                      >
                        {ci.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live OHLC + Zoom Controls */}
            <div className="flex items-center gap-1.5">
              {latestCandle && (
                <div className="hidden sm:flex items-center gap-1.5 font-mono text-[9.5px] text-slate-500 tabular-nums mr-1">
                  <span>O:{latestCandle.open.toFixed(Math.min(3, activeSpec.decimals))}</span>
                  <span className="text-emerald-600">H:{latestCandle.high.toFixed(Math.min(3, activeSpec.decimals))}</span>
                  <span className="text-rose-600">L:{latestCandle.low.toFixed(Math.min(3, activeSpec.decimals))}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    setPanOffset((p) =>
                      Math.min(Math.max(0, assetCandles.length - visibleCount), p + Math.max(4, Math.floor(visibleCount / 4)))
                    )
                  }
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-black text-slate-700"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => Math.min(96, c + 12))}
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-black text-slate-700"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisibleCount(28);
                    setPanOffset(0);
                  }}
                  className="px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 font-black text-cyan-700"
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => Math.max(12, c - 8))}
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-black text-slate-700"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setPanOffset((p) => Math.max(0, p - Math.max(4, Math.floor(visibleCount / 4))))}
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-black text-slate-700"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>

          {/* Interactive 60fps Canvas */}
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

        {/* Active Live Orders Strip */}
        {activeOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-cyan-200 p-2.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-black text-slate-800">
              <span>Open Positions ({activeOrders.length})</span>
              <span className="text-cyan-700">Auto Settle</span>
            </div>
            {activeOrders.slice(0, 3).map((order) => {
              const spec = BINARY_MARKET_MAP[order.asset] || activeSpec;
              const livePx = binaryMarkets[order.asset]?.price ?? order.entryPrice;
              const isCall = order.direction === 'UP';
              const diff = livePx - order.entryPrice;
              const inProfit = (isCall && diff > 0) || (!isCall && diff < 0);
              const secLeft = Math.max(0, Math.ceil((order.endTime - nowTime) / 1000));
              return (
                <div
                  key={order.id}
                  className={`px-3 py-1.5 rounded-xl border flex items-center justify-between text-xs ${
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
                    <span className="font-mono text-[10px] text-slate-600 tabular-nums truncate">
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
        )}

        {/* Scheduled Pending Trades Strip */}
        {pendingOrders.length > 0 && (
          <div className="bg-amber-50/80 rounded-2xl border border-amber-200 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-800">
              <span>Scheduled Pending Trades ({pendingOrders.length})</span>
              <span>Auto Executes at Target Clock</span>
            </div>
            {pendingOrders.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded font-black text-[10px] text-white ${
                      p.direction === 'UP' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  >
                    {p.direction === 'UP' ? 'BUY' : 'SELL'}
                  </span>
                  <span className="font-black text-slate-900">{p.asset}</span>
                  <span className="font-mono text-[11px] text-slate-600">৳{p.amount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-black text-amber-700">@ {p.targetTimeLabel}</span>
                  <button
                    type="button"
                    onClick={() => setPendingOrders((prev) => prev.filter((x) => x.id !== p.id))}
                    className="text-rose-500 p-1"
                    aria-label="Cancel pending"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Order Control Panel (Video-Matched) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3 shadow-2xs relative">
          {/* Asset Row + PENDING TRADE Toggle */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isGoldMode) setShowAssetPicker(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-900"
            >
              <span>{isGoldMode ? 'XAU/USD Gold' : selectedAsset}</span>
              <span className="text-emerald-600">+{payoutPct}%</span>
              {!isGoldMode && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !pendingTradeMode;
                setPendingTradeMode(next);
                if (next) {
                  setTimerModalTab('time');
                  setTimerModalOpen(true);
                }
              }}
              className="flex items-center gap-2 text-xs font-bold text-slate-700"
            >
              <span className="uppercase tracking-wide text-[10px] font-black text-slate-600">
                PENDING TRADE
              </span>
              <span
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                  pendingTradeMode ? 'bg-cyan-600 justify-end' : 'bg-slate-200 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </span>
            </button>
          </div>

          {/* Two-Column Timer Box & Investment Stepper */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Timer Box -> Opens 2-Tab TIMER / TIME Popover */}
            <button
              type="button"
              onClick={() => setTimerModalOpen((v) => !v)}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-400 text-left flex flex-col justify-between transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>Timer</span>
                <span className="text-cyan-700 font-black">
                  {pendingTradeMode ? 'TIME' : 'EXPIRY'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5 font-mono font-black text-sm text-slate-900 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{pendingTradeMode ? pendingClockStr : tradeExpiryLabel}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>

            {/* Investment Box */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
                <span>Investment</span>
                <span className="text-slate-400">Min ৳10</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(10, (Number(customAmountStr) || 20) - 10);
                    setTradeAmount(next);
                    setCustomAmountStr(String(next));
                  }}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 flex items-center justify-center font-mono font-black text-sm text-slate-900">
                  <span className="text-cyan-700 mr-0.5">৳</span>
                  <input
                    type="number"
                    min={10}
                    value={customAmountStr}
                    onChange={(e) => {
                      setCustomAmountStr(e.target.value);
                      setTradeAmount(Number(e.target.value) || 0);
                    }}
                    className="w-full bg-transparent text-center font-mono font-black text-sm text-slate-900 focus:outline-none tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(50000, (Number(customAmountStr) || 10) + 10);
                    setTradeAmount(next);
                    setCustomAmountStr(String(next));
                  }}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Timer & Pending Scheduler 2-Tab Popover (TIMER | TIME) */}
          {timerModalOpen && (
            <div className="bg-slate-50 border border-cyan-200 rounded-2xl p-3 space-y-3 shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 flex-1">
                  <button
                    type="button"
                    onClick={() => setTimerModalTab('timer')}
                    className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      timerModalTab === 'timer'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    TIMER (Expiry)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerModalTab('time')}
                    className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      timerModalTab === 'time'
                        ? 'bg-amber-500 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    TIME (Schedule)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setTimerModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {timerModalTab === 'timer' ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-5 gap-1.5">
                    {EXPIRY_PRESETS.map((tf) => (
                      <button
                        key={tf.sec}
                        type="button"
                        onClick={() => {
                          setTradeDurationSec(tf.sec);
                          setCustomMinutesStr(tf.sec >= 60 ? String(Math.round(tf.sec / 60)) : '1');
                          setTimerModalOpen(false);
                        }}
                        className={`py-2 px-1 rounded-xl text-[11px] font-black tabular-nums transition-all ${
                          tradeDurationSec === tf.sec
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-cyan-400'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Minutes Stepper */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextMin = Math.max(1, Math.round(tradeDurationSec / 60) - 1);
                        setCustomMinutesStr(String(nextMin));
                        setTradeDurationSec(nextMin * 60);
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">Custom:</span>
                      <input
                        type="number"
                        min={1}
                        max={43200}
                        value={customMinutesStr}
                        onChange={(e) => {
                          setCustomMinutesStr(e.target.value);
                          const parsed = Math.floor(Number(e.target.value));
                          if (!isNaN(parsed) && parsed >= 1 && parsed <= 43200) {
                            setTradeDurationSec(parsed * 60);
                          }
                        }}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-1 text-center font-mono font-black text-xs text-slate-900"
                      />
                      <span className="text-[11px] font-black text-slate-600">min</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMin = Math.min(43200, Math.round(tradeDurationSec / 60) + 1);
                        setCustomMinutesStr(String(nextMin));
                        setTradeDurationSec(nextMin * 60);
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Auto-execute at exact local clock time ({tradeExpiryLabel} expiry)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Execution Time
                      </label>
                      <input
                        type="time"
                        value={pendingClockStr}
                        onChange={(e) => setPendingClockStr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-black text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Direction
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPendingDirection('UP')}
                          className={`py-2 rounded-xl text-xs font-black border ${
                            pendingDirection === 'UP'
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          Buy ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDirection('DOWN')}
                          className={`py-2 rounded-xl text-xs font-black border ${
                            pendingDirection === 'DOWN'
                              ? 'bg-rose-500 text-white border-rose-500'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          Sell ↓
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmPendingOrder}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black shadow-sm active:scale-98"
                  >
                    Set Pending Trade ({pendingClockStr} • ৳{customAmountStr || tradeAmount})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Investment Chips */}
          <div className="grid grid-cols-5 gap-1.5">
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

          {/* Payout Readout Strip */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-slate-500">
              Payout ({candleIntervalLabel} chart • {tradeExpiryLabel} expiry)
            </span>
            <span className="font-mono font-black text-emerald-600 tabular-nums">
              ৳{((Number(customAmountStr) || tradeAmount) * (1 + activeSpec.payoutRate)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Dual Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md px-3.5 py-2.5 border-t border-slate-200 shadow-2xl z-30 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => handleTrade('UP')}
          className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <TrendingUp className="w-4 h-4 stroke-[3]" />
          <span>{pendingTradeMode ? 'Schedule Buy ↑' : 'Buy ↑'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTrade('DOWN')}
          className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-[#EF4444] hover:bg-rose-600 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <TrendingDown className="w-4 h-4 stroke-[3]" />
          <span>{pendingTradeMode ? 'Schedule Sell ↓' : 'Sell ↓'}</span>
        </button>
      </div>
    </div>
  );
};
