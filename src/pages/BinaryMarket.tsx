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
  Bell,
  Briefcase,
  MoreHorizontal,
  CalendarClock,
  Trash2,
  Layers,
  Crown,
  Flame,
  BarChart2
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

interface MarketVisualMeta {
  tag: string;
  glyph: string;
  secondaryGlyph?: string;
  badgeGradient: string;
  secondaryBg?: string;
  accentHex: string;
  areaRgba: string;
  chipBorder: string;
  chipBg: string;
  bullCol: string;
  bearCol: string;
  shortDesc: string;
}

const MARKET_VISUALS: Record<string, MarketVisualMeta> = {
  // Crypto — Distinct Coin Identity & Accent Palette
  'BTC/USDT': {
    tag: 'CRYPTO',
    glyph: '₿',
    badgeGradient: 'from-amber-500 to-orange-600',
    accentHex: '#F59E0B',
    areaRgba: 'rgba(245, 158, 11, 0.14)',
    chipBorder: 'border-amber-300',
    chipBg: 'bg-amber-50',
    bullCol: '#10B981',
    bearCol: '#EF4444',
    shortDesc: 'Digital Gold Spot'
  },
  'ETH/USDT': {
    tag: 'CRYPTO',
    glyph: 'Ξ',
    badgeGradient: 'from-indigo-500 to-violet-600',
    accentHex: '#6366F1',
    areaRgba: 'rgba(99, 102, 241, 0.14)',
    chipBorder: 'border-indigo-300',
    chipBg: 'bg-indigo-50',
    bullCol: '#14B8A6',
    bearCol: '#F43F5E',
    shortDesc: 'Smart Contract L1'
  },
  'BNB/USDT': {
    tag: 'CRYPTO',
    glyph: '◈',
    badgeGradient: 'from-yellow-400 to-amber-500',
    accentHex: '#CA8A04',
    areaRgba: 'rgba(234, 179, 8, 0.15)',
    chipBorder: 'border-yellow-300',
    chipBg: 'bg-yellow-50',
    bullCol: '#059669',
    bearCol: '#DC2626',
    shortDesc: 'Exchange Chain'
  },
  'SOL/USDT': {
    tag: 'CRYPTO',
    glyph: '◎',
    badgeGradient: 'from-violet-600 via-fuchsia-500 to-cyan-500',
    accentHex: '#8B5CF6',
    areaRgba: 'rgba(139, 92, 246, 0.15)',
    chipBorder: 'border-violet-300',
    chipBg: 'bg-violet-50',
    bullCol: '#06B6D4',
    bearCol: '#E11D48',
    shortDesc: 'High-Speed L1'
  },
  'XRP/USDT': {
    tag: 'CRYPTO',
    glyph: '✕',
    badgeGradient: 'from-sky-500 to-blue-700',
    accentHex: '#0284C7',
    areaRgba: 'rgba(2, 132, 199, 0.14)',
    chipBorder: 'border-sky-300',
    chipBg: 'bg-sky-50',
    bullCol: '#10B981',
    bearCol: '#F43F5E',
    shortDesc: 'Cross-Border FX'
  },

  // Forex — Dual Currency Pair Shields
  'EUR/USD': {
    tag: 'FOREX',
    glyph: '€',
    secondaryGlyph: '$',
    badgeGradient: 'from-blue-600 to-indigo-700',
    secondaryBg: 'from-emerald-500 to-teal-600',
    accentHex: '#059669',
    areaRgba: 'rgba(5, 150, 105, 0.13)',
    chipBorder: 'border-emerald-300',
    chipBg: 'bg-emerald-50',
    bullCol: '#059669',
    bearCol: '#EF4444',
    shortDesc: 'Major FX Pair'
  },
  'GBP/USD': {
    tag: 'FOREX',
    glyph: '£',
    secondaryGlyph: '$',
    badgeGradient: 'from-rose-600 to-blue-700',
    secondaryBg: 'from-sky-500 to-cyan-600',
    accentHex: '#0EA5E9',
    areaRgba: 'rgba(14, 165, 233, 0.13)',
    chipBorder: 'border-sky-300',
    chipBg: 'bg-sky-50',
    bullCol: '#0891B2',
    bearCol: '#E11D48',
    shortDesc: 'Cable Sterling'
  },
  'USD/JPY': {
    tag: 'FOREX',
    glyph: '$',
    secondaryGlyph: '¥',
    badgeGradient: 'from-emerald-600 to-teal-700',
    secondaryBg: 'from-rose-500 to-red-600',
    accentHex: '#14B8A6',
    areaRgba: 'rgba(20, 184, 166, 0.13)',
    chipBorder: 'border-teal-300',
    chipBg: 'bg-teal-50',
    bullCol: '#0D9488',
    bearCol: '#E11D48',
    shortDesc: 'Tokyo Session'
  },
  'AUD/USD': {
    tag: 'FOREX',
    glyph: 'A$',
    secondaryGlyph: '$',
    badgeGradient: 'from-cyan-600 to-blue-700',
    secondaryBg: 'from-amber-500 to-orange-600',
    accentHex: '#2563EB',
    areaRgba: 'rgba(37, 99, 235, 0.13)',
    chipBorder: 'border-blue-300',
    chipBg: 'bg-blue-50',
    bullCol: '#10B981',
    bearCol: '#EF4444',
    shortDesc: 'Aussie Commodity FX'
  },
  'USD/CHF': {
    tag: 'FOREX',
    glyph: '$',
    secondaryGlyph: 'Fr',
    badgeGradient: 'from-slate-700 to-slate-900',
    secondaryBg: 'from-red-500 to-rose-600',
    accentHex: '#E11D48',
    areaRgba: 'rgba(225, 29, 72, 0.12)',
    chipBorder: 'border-rose-300',
    chipBg: 'bg-rose-50',
    bullCol: '#10B981',
    bearCol: '#E11D48',
    shortDesc: 'Swissie Safe Haven'
  },
  'EUR/JPY': {
    tag: 'FOREX',
    glyph: '€',
    secondaryGlyph: '¥',
    badgeGradient: 'from-indigo-600 to-blue-700',
    secondaryBg: 'from-rose-500 to-pink-600',
    accentHex: '#0D9488',
    areaRgba: 'rgba(13, 148, 136, 0.13)',
    chipBorder: 'border-teal-300',
    chipBg: 'bg-teal-50',
    bullCol: '#14B8A6',
    bearCol: '#F43F5E',
    shortDesc: 'Euro-Yen Cross'
  },

  // Commodities — 24K Spot Gold
  'XAU/USD': {
    tag: '24K GOLD',
    glyph: 'Au',
    badgeGradient: 'from-amber-400 via-yellow-500 to-amber-600',
    accentHex: '#D97706',
    areaRgba: 'rgba(245, 158, 11, 0.14)',
    chipBorder: 'border-amber-300',
    chipBg: 'bg-amber-50',
    bullCol: '#10B981',
    bearCol: '#EF4444',
    shortDesc: '24K Spot Bullion'
  },

  // Indices — Exchange Shields
  US30: {
    tag: 'INDEX',
    glyph: '30',
    badgeGradient: 'from-blue-700 to-slate-900',
    accentHex: '#2563EB',
    areaRgba: 'rgba(37, 99, 235, 0.14)',
    chipBorder: 'border-blue-300',
    chipBg: 'bg-blue-50',
    bullCol: '#10B981',
    bearCol: '#EF4444',
    shortDesc: 'Dow Jones Industrial'
  },
  NAS100: {
    tag: 'INDEX',
    glyph: 'N1',
    badgeGradient: 'from-cyan-600 to-teal-700',
    accentHex: '#0891B2',
    areaRgba: 'rgba(8, 145, 178, 0.15)',
    chipBorder: 'border-cyan-300',
    chipBg: 'bg-cyan-50',
    bullCol: '#06B6D4',
    bearCol: '#F43F5E',
    shortDesc: 'Nasdaq Tech 100'
  },
  SPX500: {
    tag: 'INDEX',
    glyph: '500',
    badgeGradient: 'from-rose-600 to-red-800',
    accentHex: '#DC2626',
    areaRgba: 'rgba(220, 38, 38, 0.13)',
    chipBorder: 'border-rose-300',
    chipBg: 'bg-rose-50',
    bullCol: '#10B981',
    bearCol: '#DC2626',
    shortDesc: 'S&P 500 Benchmark'
  }
};

function getMarketVisual(symbol: string): MarketVisualMeta {
  return (
    MARKET_VISUALS[symbol] || {
      tag: 'MARKET',
      glyph: symbol.slice(0, 2),
      badgeGradient: 'from-cyan-600 to-teal-600',
      accentHex: '#0891B2',
      areaRgba: 'rgba(8, 145, 178, 0.14)',
      chipBorder: 'border-cyan-300',
      chipBg: 'bg-cyan-50',
      bullCol: '#10B981',
      bearCol: '#EF4444',
      shortDesc: 'Live Market'
    }
  );
}

const MarketAssetEmblem: React.FC<{ symbol: string; size?: 'sm' | 'md' | 'lg' }> = ({
  symbol,
  size = 'md'
}) => {
  if (symbol === 'XAU/USD') {
    return <GoldMarketLogo size={size === 'lg' ? 38 : size === 'sm' ? 26 : 34} />;
  }
  const meta = getMarketVisual(symbol);
  const dim =
    size === 'lg'
      ? 'w-10 h-10 text-xs'
      : size === 'sm'
      ? 'w-6 h-6 text-[9px]'
      : 'w-8 h-8 text-[11px]';

  if (meta.secondaryGlyph) {
    return (
      <div className={`relative flex items-center flex-shrink-0 ${size === 'sm' ? 'w-9 h-6' : 'w-11 h-8'}`}>
        <div
          className={`${size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6.5 h-6.5 text-[11px]'} rounded-full bg-gradient-to-br ${meta.badgeGradient} text-white font-black flex items-center justify-center shadow-xs border border-white/80 z-10`}
        >
          {meta.glyph}
        </div>
        <div
          className={`${size === 'sm' ? 'w-5 h-5 text-[8px] -ml-1.5' : 'w-6.5 h-6.5 text-[10px] -ml-2'} rounded-full bg-gradient-to-br ${meta.secondaryBg || 'from-slate-600 to-slate-800'} text-white font-black flex items-center justify-center shadow-xs border border-white/80`}
        >
          {meta.secondaryGlyph}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${dim} rounded-xl bg-gradient-to-br ${meta.badgeGradient} ${
        symbol === 'BNB/USDT' ? 'text-slate-950' : 'text-white'
      } font-black flex items-center justify-center shadow-sm border border-white/40 flex-shrink-0 tracking-tight`}
    >
      {meta.glyph}
    </div>
  );
};

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
  const [chartStyleMode, setChartStyleMode] = useState<'auto' | 'candles' | 'hollow' | 'heikin' | 'area'>('auto');
  const [showChartStyleMenu, setShowChartStyleMenu] = useState<boolean>(false);

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
  const [pricePanRatio, setPricePanRatio] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartBoxRef = useRef<HTMLDivElement | null>(null);
  const visibleCountRef = useRef<number>(28);
  const panOffsetRef = useRef<number>(0);
  const pricePanRef = useRef<number>(0);

  // Smooth 60fps interpolated chart camera + price + inertial glide + crosshair refs
  const smoothVisibleRef = useRef<number>(28);
  const smoothPanRef = useRef<number>(0);
  const smoothPricePanRef = useRef<number>(0);
  const smoothPriceRef = useRef<number | null>(null);
  const smoothMinPRef = useRef<number | null>(null);
  const smoothMaxPRef = useRef<number | null>(null);
  const panVelXRef = useRef<number>(0);
  const panVelYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastDragTsRef = useRef<number>(0);
  const pointerHoverRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{ prevDist: number; prevMidX: number; prevMidY: number } | null>(null);
  const lastTapMsRef = useRef<number>(0);
  const offsetMinutes = adminSettings.timezoneOffsetMinutes ?? 360;

  useEffect(() => {
    setSelectedCategory('All');
    setShowAssetPicker(false);
    visibleCountRef.current = 28;
    panOffsetRef.current = 0;
    pricePanRef.current = 0;
    smoothVisibleRef.current = 28;
    smoothPanRef.current = 0;
    smoothPricePanRef.current = 0;
    smoothPriceRef.current = null;
    smoothMinPRef.current = null;
    smoothMaxPRef.current = null;
    panVelXRef.current = 0;
    panVelYRef.current = 0;
    setVisibleCount(28);
    setPanOffset(0);
    setPricePanRatio(0);
    setSelectedAsset(initialMarketMode === 'gold' ? 'XAU/USD' : 'BTC/USDT');
  }, [initialMarketMode]);

  useEffect(() => {
    // Reset price scale interpolation cleanly when switching symbols or timeframes
    smoothPriceRef.current = null;
    smoothMinPRef.current = null;
    smoothMaxPRef.current = null;
    panVelXRef.current = 0;
    panVelYRef.current = 0;
  }, [selectedAsset, candleTimeframeSec]);

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
      return BINARY_MARKETS.filter((m) => m.symbol === 'XAU/USD');
    }
    const nonGold = BINARY_MARKETS.filter((m) => m.category !== 'Commodities' && m.symbol !== 'XAU/USD');
    if (selectedCategory === 'All') return nonGold;
    return nonGold.filter((m) => m.category === selectedCategory);
  }, [isGoldMode, selectedCategory]);

  const activeSpec =
    BINARY_MARKET_MAP[selectedAsset] ||
    (isGoldMode ? BINARY_MARKET_MAP['XAU/USD'] : BINARY_MARKET_MAP['BTC/USDT']) ||
    BINARY_MARKETS[0];
  const activeVisual = useMemo(() => getMarketVisual(activeSpec.symbol), [activeSpec.symbol]);
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
        180,
        assetPrice
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSpec, candleTimeframeSec, currentSecEpoch, adminSettings.binaryNextCandleBias, offsetMinutes, assetPrice]
  );

  const latestCandle = assetCandles[assetCandles.length - 1];
  const payoutPct = Math.round(activeSpec.payoutRate * 100);

  // Market Range & Bull/Bear Sentiment analytics derived deterministically from recent candles
  const marketStats = useMemo(() => {
    const slice = assetCandles.slice(-24);
    if (slice.length === 0) {
      return { high: assetPrice, low: assetPrice, posPct: 50, bullPct: 54 };
    }
    const high = Math.max(...slice.map((c) => c.high), assetPrice);
    const low = Math.min(...slice.map((c) => c.low), assetPrice);
    const span = Math.max(activeSpec.volatility * 0.1, high - low);
    const posPct = Math.max(4, Math.min(96, Math.round(((assetPrice - low) / span) * 100)));
    const bullCount = slice.filter((c) => c.close >= c.open).length;
    const bullPct = Math.max(22, Math.min(78, Math.round((bullCount / slice.length) * 100)));
    return { high, low, posPct, bullPct };
  }, [assetCandles, assetPrice, activeSpec.volatility]);

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
    visual: activeVisual,
    isGoldMode,
    chartStyle: chartStyleMode,
    activeOrders: assetActiveOrders,
    secRemaining: candleSecRemaining,
    candleSec: candleTimeframeSec,
    expiryLabel: tradeExpiryLabel,
    offsetMinutes
  });

  chartDataRef.current = {
    candles: assetCandles,
    price: assetPrice,
    spec: activeSpec,
    visual: activeVisual,
    isGoldMode,
    chartStyle: chartStyleMode,
    activeOrders: assetActiveOrders,
    secRemaining: candleSecRemaining,
    candleSec: candleTimeframeSec,
    expiryLabel: tradeExpiryLabel,
    offsetMinutes
  };

  const resetChartView = () => {
    visibleCountRef.current = 28;
    panOffsetRef.current = 0;
    pricePanRef.current = 0;
    panVelXRef.current = 0;
    panVelYRef.current = 0;
    setVisibleCount(28);
    setPanOffset(0);
    setPricePanRatio(0);
  };

  // Non-passive mouse wheel zoom & trackpad horizontal pan (Quotex-style)
  useEffect(() => {
    const el = chartBoxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      panVelXRef.current = 0;
      panVelYRef.current = 0;
      const total = chartDataRef.current.candles.length || 180;
      const rect = el.getBoundingClientRect();
      const plotCssW = Math.max(120, rect.width - 74) * 0.74;
      const slotCssW = plotCssW / Math.max(10, visibleCountRef.current);

      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        const deltaPx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? -e.deltaX : -e.deltaY;
        const minPan = -visibleCountRef.current * 0.45;
        const maxPan = Math.max(0, total - visibleCountRef.current);
        const nextPan = Math.max(minPan, Math.min(maxPan, panOffsetRef.current + deltaPx / Math.max(4, slotCssW)));
        panOffsetRef.current = nextPan;
        setPanOffset(nextPan);
      } else {
        const factor = e.deltaY > 0 ? 1.1 : 0.91;
        const nextCount = Math.max(10, Math.min(115, visibleCountRef.current * factor));
        visibleCountRef.current = nextCount;
        setVisibleCount(nextCount);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastReactSyncMs = 0;

    const renderChart = (ts: number) => {
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
            visual,
            isGoldMode: goldDark,
            chartStyle,
            activeOrders: orders,
            secRemaining,
            candleSec,
            expiryLabel,
            offsetMinutes: tzMin
          } = chartDataRef.current;

          // Inertial momentum glide when released after drag
          if (!isDraggingRef.current && (Math.abs(panVelXRef.current) > 0.002 || Math.abs(panVelYRef.current) > 0.0002)) {
            const total = candles.length || 180;
            const minPan = -visibleCountRef.current * 0.45;
            const maxPan = Math.max(0, total - visibleCountRef.current);
            panOffsetRef.current = Math.max(minPan, Math.min(maxPan, panOffsetRef.current + panVelXRef.current));
            pricePanRef.current = Math.max(-0.85, Math.min(0.85, pricePanRef.current + panVelYRef.current));
            panVelXRef.current *= 0.9;
            panVelYRef.current *= 0.88;
            if (Math.abs(panVelXRef.current) <= 0.002) panVelXRef.current = 0;
            if (Math.abs(panVelYRef.current) <= 0.0002) panVelYRef.current = 0;
            if (ts - lastReactSyncMs > 90) {
              lastReactSyncMs = ts;
              setPanOffset(panOffsetRef.current);
              setPricePanRatio(pricePanRef.current);
            }
          }

          // Smooth camera & live price interpolation (exponential critically-damped lerp)
          const camEase = isDraggingRef.current ? 0.55 : 0.24;
          smoothVisibleRef.current += (visibleCountRef.current - smoothVisibleRef.current) * 0.26;
          smoothPanRef.current += (panOffsetRef.current - smoothPanRef.current) * camEase;
          smoothPricePanRef.current += (pricePanRef.current - smoothPricePanRef.current) * camEase;

          if (smoothPriceRef.current === null || Math.abs(price - smoothPriceRef.current) > spec.basePrice * 0.25) {
            smoothPriceRef.current = price;
          } else {
            smoothPriceRef.current += (price - smoothPriceRef.current) * 0.22;
          }
          const smoothPrice = smoothPriceRef.current;

          const count = smoothVisibleRef.current;
          const offset = smoothPanRef.current;
          const vPan = smoothPricePanRef.current;

          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Gold Market -> Warm Ivory Champagne Light Surface; Binary -> Crisp Pure White Surface
          if (goldDark) {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, '#FFFDF7');
            bgGrad.addColorStop(0.55, '#FFFBEB');
            bgGrad.addColorStop(1, '#FEF7DF');
            ctx.fillStyle = bgGrad;
          } else {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, '#FFFFFF');
            bgGrad.addColorStop(1, '#F8FAFC');
            ctx.fillStyle = bgGrad;
          }
          ctx.fillRect(0, 0, w, h);

          const axisRightW = 74 * dpr;
          const bottomAxisH = 22 * dpr;
          const topPad = 18 * dpr;
          const plotW = Math.max(80, w - axisRightW);
          const plotH = Math.max(80, h - bottomAxisH - topPad);

          const safeCount = Math.max(10, Math.min(candles.length || 28, count));
          const minPan = -safeCount * 0.45;
          const maxPan = Math.max(0, candles.length - safeCount);
          const clampedPan = Math.max(minPan, Math.min(maxPan, offset));

          const candleAreaW = plotW * 0.74;
          const slotW = candleAreaW / Math.max(1, safeCount);
          const bodyW = Math.max(3.6 * dpr, Math.min(13.5 * dpr, slotW * 0.62));
          const getCandleX = (idx: number) =>
            (idx - (candles.length - safeCount) + clampedPan) * slotW + slotW / 2 + 4 * dpr;

          const visibleEntries: Array<{ c: (typeof candles)[number]; idx: number; cx: number }> = [];
          for (let idx = 0; idx < candles.length; idx++) {
            const cx = getCandleX(idx);
            if (cx >= -slotW && cx <= plotW + slotW) {
              const rawC = candles[idx];
              // Smoothly animate live last candle close & high/low tip
              if (idx === candles.length - 1) {
                visibleEntries.push({
                  c: {
                    ...rawC,
                    close: smoothPrice,
                    high: Math.max(rawC.high, smoothPrice),
                    low: Math.min(rawC.low, smoothPrice)
                  },
                  idx,
                  cx
                });
              } else {
                visibleEntries.push({ c: rawC, idx, cx });
              }
            }
          }
          const visible = visibleEntries.map((v) => v.c);

          const highs = visible.map((c) => c.high);
          const lows = visible.map((c) => c.low);
          orders.forEach((o) => {
            highs.push(o.entryPrice);
            lows.push(o.entryPrice);
          });

          const rawMin = lows.length > 0 ? Math.min(...lows, smoothPrice) : smoothPrice - spec.volatility * 3;
          const rawMax = highs.length > 0 ? Math.max(...highs, smoothPrice) : smoothPrice + spec.volatility * 3;
          const rawSpan = rawMax - rawMin;
          const minSpan = Math.max(rawSpan, spec.volatility * 2.6);
          const pad = minSpan * 0.17;
          const targetBaseMinP = rawMin - pad;
          const targetBaseMaxP = rawMax + pad;

          // Smooth vertical Y-axis range transitions when scrolling candles
          if (
            smoothMinPRef.current === null ||
            smoothMaxPRef.current === null ||
            Math.abs(targetBaseMaxP - smoothMaxPRef.current) > spec.basePrice * 0.25
          ) {
            smoothMinPRef.current = targetBaseMinP;
            smoothMaxPRef.current = targetBaseMaxP;
          } else {
            smoothMinPRef.current += (targetBaseMinP - smoothMinPRef.current) * 0.22;
            smoothMaxPRef.current += (targetBaseMaxP - smoothMaxPRef.current) * 0.22;
          }

          const baseMinP = smoothMinPRef.current;
          const baseMaxP = smoothMaxPRef.current;
          const rangeP = Math.max(spec.volatility * 0.5, baseMaxP - baseMinP);
          const minP = baseMinP + vPan * rangeP;
          const maxP = baseMaxP + vPan * rangeP;

          const priceToY = (p: number) => topPad + ((maxP - p) / rangeP) * plotH;

          // Subtle Horizontal & Vertical Gridlines
          ctx.strokeStyle = goldDark ? 'rgba(217, 119, 6, 0.14)' : 'rgba(148, 163, 184, 0.26)';
          ctx.lineWidth = 1 * dpr;
          ctx.font = `600 ${9.5 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillStyle = goldDark ? '#78716C' : '#64748B';

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
            ctx.strokeStyle = goldDark ? 'rgba(217, 119, 6, 0.08)' : 'rgba(203, 213, 225, 0.35)';
            ctx.moveTo(vx, topPad);
            ctx.lineTo(vx, topPad + plotH);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Right Axis Divider
          ctx.strokeStyle = goldDark ? '#FDE68A' : '#E2E8F0';
          ctx.beginPath();
          ctx.moveTo(plotW, 0);
          ctx.lineTo(plotW, h - bottomAxisH);
          ctx.stroke();

          // Clip candles & lines strictly inside the plot region
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, topPad - 2 * dpr, plotW, plotH + 4 * dpr);
          ctx.clip();

          // Resolve distinct visual chart style per asset when set to 'auto'
          const getAutoChartStyle = (sym: string): 'candles' | 'hollow' | 'heikin' | 'area' => {
            if (sym === 'ETH/USDT' || sym === 'XRP/USDT' || sym === 'USD/JPY') return 'heikin';
            if (sym === 'EUR/USD' || sym === 'GBP/USD' || sym === 'EUR/JPY' || sym === 'US30') return 'hollow';
            if (sym === 'AUD/USD' || sym === 'USD/CHF' || sym === 'NAS100') return 'area';
            return 'candles';
          };
          const resolvedStyle = chartStyle === 'auto' ? getAutoChartStyle(spec.symbol) : chartStyle;
          const isForex = spec.category === 'Forex';
          const isIndex = spec.category === 'Indices';

          // Bottom Volume Histogram Bars (15% of plot height)
          const maxVol = Math.max(1, ...visible.map((c) => Number(c.volume || 10)));
          const volAreaH = plotH * 0.15;
          visibleEntries.forEach(({ c, cx }) => {
            const isBull = c.close >= c.open;
            const barH = Math.max(2.5 * dpr, (Number(c.volume || 8) / maxVol) * volAreaH);
            ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.17)' : 'rgba(239, 68, 68, 0.15)';
            ctx.beginPath();
            ctx.roundRect(cx - bodyW * 0.4, topPad + plotH - barH, bodyW * 0.8, barH, [2 * dpr, 2 * dpr, 0, 0]);
            ctx.fill();
          });

          // Category-specific Technical Indicators:
          // - Forex: Bollinger Band Channel (14-period ± 1.8σ)
          // - Gold: VWAP Equilibrium + Support/Resistance Pivot Band
          // - Indices / Area: Smooth Gradient Area Curve
          if ((isForex || resolvedStyle === 'hollow') && visibleEntries.length >= 6) {
            const win = 12;
            const upperPts: Array<{ x: number; y: number }> = [];
            const lowerPts: Array<{ x: number; y: number }> = [];
            const midPts: Array<{ x: number; y: number }> = [];
            for (let i = 0; i < visibleEntries.length; i++) {
              const start = Math.max(0, i - win + 1);
              const slice = visibleEntries.slice(start, i + 1);
              const mean = slice.reduce((s, item) => s + item.c.close, 0) / slice.length;
              const variance = slice.reduce((s, item) => s + (item.c.close - mean) ** 2, 0) / slice.length;
              const std = Math.sqrt(variance);
              const cx = visibleEntries[i].cx;
              upperPts.push({ x: cx, y: priceToY(mean + std * 1.85) });
              lowerPts.push({ x: cx, y: priceToY(mean - std * 1.85) });
              midPts.push({ x: cx, y: priceToY(mean) });
            }
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(upperPts[0].x, upperPts[0].y);
            for (let i = 1; i < upperPts.length; i++) ctx.lineTo(upperPts[i].x, upperPts[i].y);
            for (let i = lowerPts.length - 1; i >= 0; i--) ctx.lineTo(lowerPts[i].x, lowerPts[i].y);
            ctx.closePath();
            ctx.fillStyle = visual.areaRgba;
            ctx.fill();

            ctx.strokeStyle = visual.accentHex;
            ctx.lineWidth = 1.1 * dpr;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(upperPts[0].x, upperPts[0].y);
            for (let i = 1; i < upperPts.length; i++) ctx.lineTo(upperPts[i].x, upperPts[i].y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(lowerPts[0].x, lowerPts[0].y);
            for (let i = 1; i < lowerPts.length; i++) ctx.lineTo(lowerPts[i].x, lowerPts[i].y);
            ctx.stroke();

            ctx.setLineDash([4 * dpr, 3 * dpr]);
            ctx.beginPath();
            ctx.moveTo(midPts[0].x, midPts[0].y);
            for (let i = 1; i < midPts.length; i++) ctx.lineTo(midPts[i].x, midPts[i].y);
            ctx.stroke();
            ctx.restore();
          } else if (resolvedStyle === 'area' && visibleEntries.length >= 2) {
            ctx.save();
            const areaGrad = ctx.createLinearGradient(0, topPad, 0, topPad + plotH);
            areaGrad.addColorStop(0, visual.areaRgba);
            areaGrad.addColorStop(0.55, 'rgba(8, 145, 178, 0.05)');
            areaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            const pts = visibleEntries.map((v) => ({ x: v.cx, y: priceToY(v.c.close) }));
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              const prev = pts[i - 1];
              const curr = pts[i];
              ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.lineTo(pts[pts.length - 1].x, topPad + plotH);
            ctx.lineTo(pts[0].x, topPad + plotH);
            ctx.closePath();
            ctx.fillStyle = areaGrad;
            ctx.fill();

            ctx.strokeStyle = visual.accentHex;
            ctx.lineWidth = 2.2 * dpr;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              const prev = pts[i - 1];
              const curr = pts[i];
              ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();
            ctx.restore();
          } else if (goldDark && visibleEntries.length >= 3) {
            // Gold Market: subtle 24K VWAP equilibrium line + session high/low envelope
            let cumPV = 0;
            let cumV = 0;
            ctx.save();
            ctx.strokeStyle = 'rgba(217, 119, 6, 0.68)';
            ctx.lineWidth = 1.5 * dpr;
            ctx.setLineDash([5 * dpr, 3 * dpr]);
            ctx.beginPath();
            visibleEntries.forEach(({ c, cx }, idx) => {
              const typical = (c.high + c.low + c.close) / 3;
              const v = Math.max(1, Number(c.volume || 10));
              cumPV += typical * v;
              cumV += v;
              const vwapY = priceToY(cumPV / cumV);
              if (idx === 0) ctx.moveTo(cx, vwapY);
              else ctx.lineTo(cx, vwapY);
            });
            ctx.stroke();
            ctx.restore();
          }

          // Compute Heikin-Ashi values when resolvedStyle === 'heikin'
          const drawBars =
            resolvedStyle === 'heikin'
              ? (() => {
                  const ha: Array<{ c: (typeof visibleEntries)[number]['c']; idx: number; cx: number }> = [];
                  let prevHaOpen = visibleEntries[0]?.c.open || 0;
                  let prevHaClose = visibleEntries[0]?.c.close || 0;
                  for (let i = 0; i < visibleEntries.length; i++) {
                    const raw = visibleEntries[i].c;
                    const haClose = (raw.open + raw.high + raw.low + raw.close) / 4;
                    const haOpen = i === 0 ? (raw.open + raw.close) / 2 : (prevHaOpen + prevHaClose) / 2;
                    const haHigh = Math.max(raw.high, haOpen, haClose);
                    const haLow = Math.min(raw.low, haOpen, haClose);
                    prevHaOpen = haOpen;
                    prevHaClose = haClose;
                    ha.push({
                      idx: visibleEntries[i].idx,
                      cx: visibleEntries[i].cx,
                      c: { ...raw, open: haOpen, high: haHigh, low: haLow, close: haClose }
                    });
                  }
                  return ha;
                })()
              : visibleEntries;

          // Render Candles (skipped in pure 'area' mountain mode; subtle micro ticks instead)
          if (resolvedStyle !== 'area') {
            drawBars.forEach(({ c, idx, cx }) => {
              const isBull = c.close >= c.open;
              const isLive = idx === candles.length - 1;
              const col = isBull ? visual.bullCol : visual.bearCol;
              const highY = priceToY(c.high);
              const lowY = priceToY(c.low);
              const openY = priceToY(c.open);
              const closeY = priceToY(c.close);

              ctx.strokeStyle = col;
              ctx.lineWidth = (isLive ? 1.7 : 1.35) * dpr;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(cx, highY);
              ctx.lineTo(cx, lowY);
              ctx.stroke();

              const topY = Math.min(openY, closeY);
              const bodyH = Math.max(2.4 * dpr, Math.abs(closeY - openY));
              const radius = Math.min(2.2 * dpr, bodyW * 0.28, bodyH * 0.4);

              if (resolvedStyle === 'hollow' && isBull) {
                ctx.fillStyle = goldDark ? '#FFFBEB' : '#FFFFFF';
                ctx.strokeStyle = col;
                ctx.lineWidth = 1.6 * dpr;
                ctx.beginPath();
                ctx.roundRect(cx - bodyW / 2, topY, bodyW, bodyH, radius);
                ctx.fill();
                ctx.stroke();
              } else {
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.roundRect(cx - bodyW / 2, topY, bodyW, bodyH, radius);
                ctx.fill();
                if (isLive && bodyW >= 5 * dpr && bodyH >= 4 * dpr) {
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
                  ctx.beginPath();
                  ctx.roundRect(cx - bodyW / 2 + 1 * dpr, topY + 1 * dpr, Math.max(1.5 * dpr, bodyW * 0.35), bodyH - 2 * dpr, 1 * dpr);
                  ctx.fill();
                }
              }
            });
          }

          // Dual Moving Average Ribbon for Crypto & Indices (EMA-6 fast + EMA-16 slow)
          if (!isForex && resolvedStyle !== 'area' && visibleEntries.length >= 4) {
            const drawEma = (period: number, color: string, width: number, alpha: number) => {
              ctx.save();
              ctx.strokeStyle = color;
              ctx.globalAlpha = alpha;
              ctx.lineWidth = width * dpr;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              let ema = visibleEntries[0].c.close;
              const k = 2 / (period + 1);
              const pts = visibleEntries.map(({ c, cx }) => {
                ema = c.close * k + ema * (1 - k);
                return { x: cx, y: priceToY(ema) };
              });
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
              }
              ctx.stroke();
              ctx.restore();
            };

            drawEma(6, visual.accentHex, 1.6, 0.92);
            drawEma(16, isIndex ? '#0F172A' : '#64748B', 1.25, 0.55);
          }

          // Beginning of Trade & Expiry Dashed Vertical Lines
          const liveCandleX = candles.length > 0 ? getCandleX(candles.length - 1) : candleAreaW;
          const beginX = liveCandleX + slotW * 0.65;
          const endX = beginX + Math.max(46 * dpr, plotW * 0.19);

          ctx.save();
          ctx.setLineDash([4 * dpr, 3 * dpr]);
          ctx.lineWidth = 1.2 * dpr;

          if (beginX >= 0 && beginX <= plotW) {
            ctx.strokeStyle = goldDark ? '#D97706' : '#94A3B8';
            ctx.beginPath();
            ctx.moveTo(beginX, topPad);
            ctx.lineTo(beginX, topPad + plotH);
            ctx.stroke();
          }

          if (endX >= 0 && endX <= plotW) {
            ctx.strokeStyle = visual.accentHex;
            ctx.beginPath();
            ctx.moveTo(endX, topPad);
            ctx.lineTo(endX, topPad + plotH);
            ctx.stroke();
          }
          ctx.restore();

          // Live Price Horizontal Dashed Line + Pulsing Radial Beacon Tip
          const liveY = priceToY(smoothPrice);
          if (liveY >= topPad - 4 * dpr && liveY <= topPad + plotH + 4 * dpr) {
            ctx.save();
            ctx.setLineDash([3 * dpr, 3 * dpr]);
            ctx.strokeStyle = goldDark ? '#D97706' : '#0F172A';
            ctx.lineWidth = 1.25 * dpr;
            ctx.beginPath();
            ctx.moveTo(0, liveY);
            ctx.lineTo(plotW, liveY);
            ctx.stroke();
            ctx.restore();

            if (liveCandleX >= -6 * dpr && liveCandleX <= plotW + 6 * dpr) {
              const pulse = (ts % 1400) / 1400; // 0..1 smooth continuous pulse
              const ringR = (4.5 + pulse * 9) * dpr;
              const ringAlpha = Math.max(0, 0.45 * (1 - pulse));
              ctx.beginPath();
              ctx.arc(liveCandleX, liveY, ringR, 0, Math.PI * 2);
              ctx.fillStyle = goldDark
                ? `rgba(217, 119, 6, ${ringAlpha.toFixed(3)})`
                : `rgba(8, 145, 178, ${ringAlpha.toFixed(3)})`;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(liveCandleX, liveY, 4.2 * dpr, 0, Math.PI * 2);
              ctx.fillStyle = visual.accentHex;
              ctx.fill();
              ctx.lineWidth = 1.8 * dpr;
              ctx.strokeStyle = '#FFFFFF';
              ctx.stroke();
            }
          }

          const cdText = formatCountdownClock(secRemaining);
          if (beginX >= 20 * dpr && beginX <= plotW - 18 * dpr) {
            ctx.fillStyle = goldDark ? '#B45309' : visual.accentHex;
            ctx.beginPath();
            ctx.roundRect(beginX - 18 * dpr, topPad + 4 * dpr, 36 * dpr, 14 * dpr, 4 * dpr);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `800 ${8 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
            ctx.fillText(cdText, beginX - 13 * dpr, topPad + 13.5 * dpr);
          }

          // Active Order Exact Entry Price Lines
          orders.forEach((order, oIdx) => {
            const entryY = Math.max(topPad + 10 * dpr, Math.min(topPad + plotH - 10 * dpr, priceToY(order.entryPrice)));
            const isCall = order.direction === 'UP';
            const diff = smoothPrice - order.entryPrice;
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

            if (beginX >= 0 && beginX <= plotW) {
              ctx.beginPath();
              ctx.arc(beginX, entryY, 4 * dpr, 0, Math.PI * 2);
              ctx.fillStyle = lineCol;
              ctx.fill();
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.5 * dpr;
              ctx.stroke();
            }
          });

          // Crisp Interactive Crosshair + Floating OHLC Readout on Hover
          if (pointerHoverRef.current.active && visibleEntries.length > 0) {
            const hx = pointerHoverRef.current.x * dpr;
            const hy = pointerHoverRef.current.y * dpr;
            if (hx >= 0 && hx <= plotW && hy >= topPad && hy <= topPad + plotH) {
              let nearest = visibleEntries[0];
              let bestDist = Math.abs(nearest.cx - hx);
              for (let i = 1; i < visibleEntries.length; i++) {
                const dist = Math.abs(visibleEntries[i].cx - hx);
                if (dist < bestDist) {
                  bestDist = dist;
                  nearest = visibleEntries[i];
                }
              }

              ctx.save();
              ctx.setLineDash([2.5 * dpr, 2.5 * dpr]);
              ctx.strokeStyle = goldDark ? 'rgba(146, 64, 14, 0.45)' : 'rgba(15, 23, 42, 0.35)';
              ctx.lineWidth = 1 * dpr;
              ctx.beginPath();
              ctx.moveTo(nearest.cx, topPad);
              ctx.lineTo(nearest.cx, topPad + plotH);
              ctx.moveTo(0, hy);
              ctx.lineTo(plotW, hy);
              ctx.stroke();
              ctx.restore();

              const dDec = Math.min(3, spec.decimals);
              const tStr =
                candleSec >= 86400
                  ? formatDateWithOffset(nearest.c.time, tzMin)
                  : formatTimeWithOffset(nearest.c.time, tzMin);
              const hudText = `${tStr}  O:${nearest.c.open.toFixed(dDec)} H:${nearest.c.high.toFixed(dDec)} L:${nearest.c.low.toFixed(dDec)} C:${nearest.c.close.toFixed(dDec)}`;
              const hudW = Math.min(plotW - 16 * dpr, (hudText.length * 4.8 + 16) * dpr);
              ctx.fillStyle = goldDark ? 'rgba(120, 53, 15, 0.88)' : 'rgba(15, 23, 42, 0.88)';
              ctx.beginPath();
              ctx.roundRect(8 * dpr, topPad + 4 * dpr, hudW, 16 * dpr, 5 * dpr);
              ctx.fill();
              ctx.fillStyle = '#FFFFFF';
              ctx.font = `700 ${7.6 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
              ctx.fillText(hudText, 14 * dpr, topPad + 14.5 * dpr);
            }
          }

          ctx.restore(); // End plot clip

          // Trade & Expiry Labels Above Plot
          ctx.font = `700 ${8 * dpr}px sans-serif`;
          if (beginX >= 40 * dpr && beginX <= plotW - 10 * dpr) {
            ctx.fillStyle = goldDark ? '#92400E' : '#475569';
            ctx.fillText('Beginning of trade ▸', beginX - 42 * dpr, topPad - 5 * dpr);
          }
          if (endX >= 28 * dpr && endX <= plotW) {
            ctx.fillStyle = visual.accentHex;
            ctx.fillText(`Exp ${expiryLabel}`, endX - 36 * dpr, topPad - 5 * dpr);
          }

          // Right-axis Current Price Pill (smoothly tracks smoothPrice)
          const clampedPillY = Math.max(topPad + 8 * dpr, Math.min(topPad + plotH - 8 * dpr, liveY));
          const tagH = 19 * dpr;
          ctx.fillStyle = goldDark ? '#D97706' : '#0F172A';
          ctx.beginPath();
          ctx.roundRect(plotW + 2 * dpr, clampedPillY - tagH / 2, axisRightW - 5 * dpr, tagH, 4 * dpr);
          ctx.fill();
          ctx.fillStyle = goldDark ? '#FFFFFF' : '#22D3EE';
          ctx.font = `800 ${9.2 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillText(smoothPrice.toFixed(Math.min(4, spec.decimals)), plotW + 6 * dpr, clampedPillY + 3.2 * dpr);

          // Bottom Time Axis Strip
          ctx.fillStyle = goldDark ? '#FFFBEB' : '#F8FAFC';
          ctx.fillRect(0, h - bottomAxisH, w, bottomAxisH);
          ctx.strokeStyle = goldDark ? '#FDE68A' : '#E2E8F0';
          ctx.beginPath();
          ctx.moveTo(0, h - bottomAxisH);
          ctx.lineTo(w, h - bottomAxisH);
          ctx.stroke();

          ctx.fillStyle = goldDark ? '#78716C' : '#64748B';
          ctx.font = `600 ${8.5 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          if (visibleEntries.length > 0) {
            const labelIdxs = [
              0,
              Math.floor(visibleEntries.length * 0.35),
              Math.floor(visibleEntries.length * 0.7),
              visibleEntries.length - 1
            ];
            const used = new Set<number>();
            labelIdxs.forEach((li) => {
              const entry = visibleEntries[li];
              if (!entry || used.has(entry.idx)) return;
              used.add(entry.idx);
              const tx = Math.max(8 * dpr, Math.min(plotW - 44 * dpr, entry.cx - 12 * dpr));
              const label =
                candleSec >= 86400 ? formatDateWithOffset(entry.c.time, tzMin) : formatTimeWithOffset(entry.c.time, tzMin);
              ctx.fillText(label, tx, h - 7 * dpr);
            });
          }
          ctx.fillStyle = goldDark ? '#B45309' : visual.accentHex;
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
      showToast(
        Number(user.lockedBalance || 0) > 0
          ? 'Holding balance cannot be wagered until released by Admin!'
          : 'Insufficient wallet balance!'
      );
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
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < amt) {
      showToast(
        Number(user.lockedBalance || 0) > 0
          ? 'Holding balance cannot be wagered until released by Admin!'
          : 'Insufficient wallet balance!'
      );
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
    <div
      className={`min-h-screen pb-28 ${
        isGoldMode
          ? 'bg-[#FFFDF5] text-slate-900'
          : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Top Trading Terminal Header */}
      <div
        className={`sticky top-0 z-30 backdrop-blur-md px-3 py-2.5 ${
          isGoldMode
            ? 'bg-white/95 border-b border-amber-200/90 shadow-xs'
            : 'bg-white/95 border-b border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back + REAL Balance + Bell */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleExit}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center active:scale-95 transition-transform flex-shrink-0 ${
                isGoldMode
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-700'
              }`}
              aria-label="Exit Market"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div
              className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 min-w-0 ${
                isGoldMode
                  ? 'bg-amber-50/75 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide ${
                  isGoldMode
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {isGoldMode ? 'GOLD' : 'REAL'}
              </span>
              <span className="text-xs font-black font-mono tabular-nums truncate text-slate-900">
                ৳{Math.max(0, (user.balance || 0) - (user.lockedBalance || 0)).toFixed(2)}
              </span>
              {(user.lockedBalance || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black tabular-nums flex-shrink-0">
                  Hold ৳{(user.lockedBalance || 0).toFixed(0)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowNotifPopover((v) => !v)}
              className={`relative w-8 h-8 rounded-xl border flex items-center justify-center active:scale-95 flex-shrink-0 ${
                isGoldMode
                  ? 'bg-amber-50/70 border-amber-200 text-amber-800 hover:border-amber-400'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-400'
              }`}
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
            {!isGoldMode ? (
              <button
                type="button"
                onClick={() => setShowAssetPicker((v) => !v)}
                className="px-2.5 py-2 rounded-xl border font-black text-xs flex items-center gap-1 active:scale-95 bg-cyan-50 border-cyan-200 text-cyan-800"
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>Markets</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            ) : (
              <div className="px-2.5 py-2 rounded-xl border font-black text-xs flex items-center gap-1 bg-amber-50 border-amber-300 text-amber-800">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>XAU/USD</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className={`px-3 py-2 rounded-xl font-black text-xs shadow-xs active:scale-95 whitespace-nowrap ${
                isGoldMode
                  ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
              }`}
            >
              Deposit
            </button>
          </div>
        </div>

        {/* Notifications Popover */}
        {showNotifPopover && (
          <div
            className={`mt-2 rounded-2xl p-3 shadow-xl space-y-2 border bg-white text-slate-900 ${
              isGoldMode ? 'border-amber-200' : 'border-cyan-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-black">
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
              <div className="text-[11px] py-2 text-center text-slate-500">
                No recent alerts
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {recentNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2 rounded-xl border text-[11px] ${
                      isGoldMode ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="font-black">{n.title}</div>
                    <div className="text-slate-600 truncate">{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Asset Dropdown Overlay */}
        {showAssetPicker && (
          <div
            className={`mt-2 rounded-2xl p-3 shadow-xl space-y-2.5 border bg-white text-slate-900 ${
              isGoldMode ? 'border-amber-200' : 'border-cyan-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black">
                {isGoldMode ? (
                  <Crown className="w-4 h-4 text-amber-600" />
                ) : (
                  <Globe2 className="w-4 h-4 text-cyan-600" />
                )}
                <span>
                  {isGoldMode
                    ? `24K Gold Spot Desk`
                    : `Select Binary Market (${filteredMarkets.length})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetPicker(false)}
                className="p-1 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {!isGoldMode && (
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
            )}

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-0.5">
              {filteredMarkets.map((mkt) => {
                const q = binaryMarkets[mkt.symbol];
                const px = q?.price ?? mkt.basePrice;
                const chg = q?.changePct ?? 0;
                const active = mkt.symbol === selectedAsset;
                const mv = getMarketVisual(mkt.symbol);
                return (
                  <button
                    key={mkt.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedAsset(mkt.symbol);
                      setPanOffset(0);
                      setShowAssetPicker(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? isGoldMode
                          ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                          : `${mv.chipBg} ${mv.chipBorder} ring-1 ring-cyan-500`
                        : isGoldMode
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
                        : 'bg-slate-50/70 border-slate-200 hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MarketAssetEmblem symbol={mkt.symbol} size="sm" />
                        <span className="font-black text-xs truncate text-slate-900">
                          {mkt.symbol}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 flex-shrink-0">
                        +{Math.round(mkt.payoutRate * 100)}%
                      </span>
                    </div>
                    <div className="text-[10px] truncate mt-1 text-slate-500">
                      {mv.shortDesc}
                    </div>
                    <div className="flex items-center justify-between mt-1 font-mono text-[11px] tabular-nums">
                      <span className="font-bold text-slate-900">
                        {formatAssetPrice(px, mkt)}
                      </span>
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
        {/* GOLD MARKET LIGHT BULLION DESK vs BINARY MULTI-ASSET LIVE TICKER STRIP */}
        {isGoldMode ? (
          <div className="bg-gradient-to-r from-[#FFFBEB] via-white to-[#FEF3C7]/70 rounded-2xl px-3.5 py-2.5 border border-amber-200 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-900 truncate">
                  Deshi Win 24K Gold Bullion
                </div>
                <div className="text-[10px] font-semibold text-amber-700/80 truncate">
                  Pure XAU/USD Spot Feed • Instant Payout
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-[10px] font-black text-amber-800 whitespace-nowrap flex-shrink-0">
              24K SPOT
            </span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {BINARY_ONLY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex-shrink-0 transition-all ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <span className="text-[9.5px] font-black text-cyan-700 whitespace-nowrap flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" />
                Live Feeds
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {filteredMarkets.map((mkt) => {
                const q = binaryMarkets[mkt.symbol];
                const px = q?.price ?? mkt.basePrice;
                const chg = q?.changePct ?? 0;
                const active = mkt.symbol === selectedAsset;
                const mv = getMarketVisual(mkt.symbol);
                return (
                  <button
                    key={mkt.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedAsset(mkt.symbol);
                      setPanOffset(0);
                    }}
                    className={`flex-shrink-0 w-[132px] p-2 rounded-xl border text-left transition-all ${
                      active
                        ? `${mv.chipBg} ${mv.chipBorder} ring-2 ring-offset-0 ring-cyan-500/60 shadow-xs`
                        : 'bg-slate-50/90 border-slate-200 hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <MarketAssetEmblem symbol={mkt.symbol} size="sm" />
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8.5px] font-black ${
                          chg >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {chg >= 0 ? '+' : ''}
                        {chg.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-900 truncate">{mkt.symbol}</span>
                      <span className="text-[9px] font-black text-emerald-600">+{Math.round(mkt.payoutRate * 100)}%</span>
                    </div>
                    <div className="text-[11px] font-mono font-black text-slate-700 tabular-nums mt-0.5">
                      {formatAssetPrice(px, mkt)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Asset Quote Card + High/Low Range + Bull/Bear Sentiment */}
        <div
          className={`rounded-2xl border px-3.5 py-2.5 space-y-2 ${
            isGoldMode
              ? 'bg-white border-amber-200 shadow-xs'
              : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <MarketAssetEmblem symbol={selectedAsset} size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-xs text-slate-900">
                    {selectedAsset}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      isGoldMode
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : `${activeVisual.chipBg} text-slate-800 border ${activeVisual.chipBorder}`
                    }`}
                  >
                    {activeVisual.tag}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700">
                    +{payoutPct}%
                  </span>
                </div>
                <div className="text-[10px] truncate mt-0.5 text-slate-500">
                  {activeSpec.name} • {formatTimeWithOffset(nowTime, offsetMinutes)} ({formatOffsetLabel(offsetMinutes)})
                </div>
              </div>
            </div>

            <div className="text-right font-mono tabular-nums flex-shrink-0">
              <div className={`text-sm font-black ${isGoldMode ? 'text-amber-700' : 'text-slate-900'}`}>
                {formatAssetPrice(assetPrice, activeSpec)}
              </div>
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

          {/* Intraday High/Low Range + Bull vs Bear Market Sentiment */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-dashed border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9.5px] font-mono tabular-nums">
                <span className="text-slate-500">
                  L:{formatAssetPrice(marketStats.low, activeSpec)}
                </span>
                <span className={isGoldMode ? 'text-amber-800 font-bold' : 'text-slate-700 font-bold'}>
                  H:{formatAssetPrice(marketStats.high, activeSpec)}
                </span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isGoldMode ? 'bg-amber-100' : 'bg-slate-100'}`}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${marketStats.posPct}%`,
                    backgroundColor: activeVisual.accentHex
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9.5px] font-black tabular-nums">
                <span className="text-emerald-500 flex items-center gap-0.5">
                  <BarChart2 className="w-2.5 h-2.5" />
                  BUY {marketStats.bullPct}%
                </span>
                <span className="text-rose-500">SELL {100 - marketStats.bullPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-rose-500/80 flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${marketStats.bullPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Briefcase Trade History Popover */}
        {tradesPopover !== 'none' && (
          <div
            className={`rounded-2xl border p-3 shadow-lg space-y-2.5 bg-white text-slate-900 ${
              isGoldMode ? 'border-amber-200' : 'border-cyan-200'
            }`}
          >
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
                      tradesPopover === t.id
                        ? isGoldMode
                          ? 'bg-amber-500 text-white'
                          : 'bg-cyan-600 text-white'
                        : 'bg-slate-100 text-slate-600'
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
                  <p className="text-xs py-3 text-center text-slate-500">
                    No open trades active.
                  </p>
                ) : (
                  activeOrders.map((t) => {
                    const spec = BINARY_MARKET_MAP[t.asset] || activeSpec;
                    const secLeft = Math.max(0, Math.ceil((t.endTime - nowTime) / 1000));
                    return (
                      <div
                        key={t.id}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          isGoldMode ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-black text-slate-900">
                            {t.direction === 'UP' ? '▲ BUY' : '▼ SELL'} {t.asset}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            @{formatAssetPrice(t.entryPrice, spec)} • ৳{t.amount}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-lg font-mono font-black text-[11px] tabular-nums ${
                            isGoldMode ? 'bg-amber-100 text-amber-800' : 'bg-cyan-50 text-cyan-800'
                          }`}
                        >
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
                  <p className="text-xs py-3 text-center text-slate-500">
                    No pending scheduled trades. Open Timer → TIME to schedule one.
                  </p>
                ) : (
                  pendingOrders.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl border flex items-center justify-between text-xs bg-amber-50/70 border-amber-200"
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
                  <p className="text-xs py-3 text-center text-slate-500">
                    No closed trades yet.
                  </p>
                ) : (
                  completedOrders.slice(0, 15).map((t) => {
                    const spec = BINARY_MARKET_MAP[t.asset] || activeSpec;
                    const won = t.status === 'won';
                    return (
                      <div
                        key={t.id}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          isGoldMode ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-black text-slate-900">
                            {t.direction === 'UP' ? '▲ BUY' : '▼ SELL'} {t.asset}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Entry {formatAssetPrice(t.entryPrice, spec)} → Exit{' '}
                            {formatAssetPrice(t.exitPrice || t.entryPrice, spec)}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-lg font-mono font-black text-[11px] tabular-nums ${
                            won ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
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
        <div
          className={`rounded-2xl border overflow-hidden relative bg-white ${
            isGoldMode
              ? 'border-amber-200 shadow-xs'
              : 'border-slate-200 shadow-xs'
          }`}
        >
          {/* Chart Header Overlay: ••• Candle Timeframe | Briefcase Trades | Live OHLC */}
          <div
            className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${
              isGoldMode
                ? 'border-amber-200/80 bg-[#FFFBEB]/85'
                : 'border-slate-100 bg-slate-50/80'
            }`}
          >
            <div className="flex items-center gap-1.5 relative">
              {/* 3-Dot Button -> Candle Timeframe Menu */}
              <button
                type="button"
                onClick={() => setShowCandleMenu((v) => !v)}
                className={`px-2 py-1 rounded-lg border text-xs font-black flex items-center gap-1 transition-colors ${
                  showCandleMenu
                    ? isGoldMode
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-cyan-600 text-white border-cyan-600'
                    : isGoldMode
                    ? 'bg-white border-amber-200 text-amber-800 hover:border-amber-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400'
                }`}
                aria-label="Candle Timeframe Settings"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">{candleIntervalLabel}</span>
              </button>

              {/* Chart Type Switcher Button */}
              <button
                type="button"
                onClick={() => {
                  setShowCandleMenu(false);
                  setShowChartStyleMenu((v) => !v);
                }}
                className={`px-2 py-1 rounded-lg border text-xs font-black flex items-center gap-1 transition-colors ${
                  showChartStyleMenu
                    ? isGoldMode
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-cyan-600 text-white border-cyan-600'
                    : isGoldMode
                    ? 'bg-white border-amber-200 text-amber-800 hover:border-amber-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400'
                }`}
                aria-label="Chart Type"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px] capitalize">{chartStyleMode}</span>
              </button>

              {/* Briefcase Open / Pending / Closed Trades */}
              <button
                type="button"
                onClick={() => setTradesPopover((p) => (p === 'none' ? 'open' : 'none'))}
                className={`relative px-2 py-1 rounded-lg border text-xs font-black flex items-center gap-1 transition-colors ${
                  tradesPopover !== 'none'
                    ? isGoldMode
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-cyan-600 text-white border-cyan-600'
                    : isGoldMode
                    ? 'bg-white border-amber-200 text-amber-800 hover:border-amber-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400'
                }`}
                aria-label="Trades History"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">{activeOrders.length + pendingOrders.length}</span>
              </button>

              {/* Chart Style Popover */}
              {showChartStyleMenu && (
                <div
                  className={`absolute top-9 left-0 z-40 w-56 border rounded-2xl p-2.5 shadow-xl space-y-2 bg-white text-slate-900 ${
                    isGoldMode ? 'border-amber-200' : 'border-cyan-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                      <BarChart2 className={`w-3 h-3 ${isGoldMode ? 'text-amber-600' : 'text-cyan-600'}`} />
                      <span>Chart Style</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowChartStyleMenu(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'auto', label: 'Unique' },
                        { id: 'candles', label: 'Candles' },
                        { id: 'hollow', label: 'Hollow' },
                        { id: 'heikin', label: 'Heikin' },
                        { id: 'area', label: 'Mountain' }
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setChartStyleMode(st.id);
                          setShowChartStyleMenu(false);
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${
                          chartStyleMode === st.id
                            ? isGoldMode
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-cyan-600 text-white shadow-xs'
                            : isGoldMode
                            ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                            : 'bg-slate-100 text-slate-700 hover:bg-cyan-50'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3-Dot Candle Interval Popover */}
              {showCandleMenu && (
                <div
                  className={`absolute top-9 left-0 z-40 w-56 border rounded-2xl p-2.5 shadow-xl space-y-2 bg-white text-slate-900 ${
                    isGoldMode ? 'border-amber-200' : 'border-cyan-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                      <Layers className={`w-3 h-3 ${isGoldMode ? 'text-amber-600' : 'text-cyan-600'}`} />
                      <span>Candle Interval</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCandleMenu(false)}
                      className="text-slate-400 hover:text-slate-600"
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
                            ? isGoldMode
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-cyan-600 text-white shadow-xs'
                            : isGoldMode
                            ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
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
                <div className="hidden sm:flex items-center gap-1.5 font-mono text-[9.5px] tabular-nums mr-1 text-slate-500">
                  <span>O:{latestCandle.open.toFixed(Math.min(3, activeSpec.decimals))}</span>
                  <span className="text-emerald-600">H:{latestCandle.high.toFixed(Math.min(3, activeSpec.decimals))}</span>
                  <span className="text-rose-600">L:{latestCandle.low.toFixed(Math.min(3, activeSpec.decimals))}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const maxPan = Math.max(0, assetCandles.length - visibleCountRef.current);
                    const next = Math.min(maxPan, panOffsetRef.current + Math.max(4, Math.floor(visibleCountRef.current / 4)));
                    panOffsetRef.current = next;
                    setPanOffset(next);
                  }}
                  className={`px-1.5 py-0.5 rounded border font-black bg-white ${
                    isGoldMode ? 'border-amber-200 text-amber-800' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  &lt;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(115, Math.round(visibleCountRef.current + 8));
                    visibleCountRef.current = next;
                    setVisibleCount(next);
                  }}
                  className={`px-1.5 py-0.5 rounded border font-black bg-white ${
                    isGoldMode ? 'border-amber-200 text-amber-800' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={resetChartView}
                  className={`px-2 py-0.5 rounded border font-black ${
                    isGoldMode
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                  }`}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(10, Math.round(visibleCountRef.current - 6));
                    visibleCountRef.current = next;
                    setVisibleCount(next);
                  }}
                  className={`px-1.5 py-0.5 rounded border font-black bg-white ${
                    isGoldMode ? 'border-amber-200 text-amber-800' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const minPan = -visibleCountRef.current * 0.45;
                    const next = Math.max(minPan, panOffsetRef.current - Math.max(4, Math.floor(visibleCountRef.current / 4)));
                    panOffsetRef.current = next;
                    setPanOffset(next);
                  }}
                  className={`px-1.5 py-0.5 rounded border font-black bg-white ${
                    isGoldMode ? 'border-amber-200 text-amber-800' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>

          {/* Interactive 60fps Quotex-Style Inertial Pan, Pinch-Zoom & Crosshair Canvas */}
          <div
            ref={chartBoxRef}
            style={{ touchAction: 'none' }}
            className="w-full h-64 sm:h-72 relative touch-none select-none cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              try {
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              } catch {}
              panVelXRef.current = 0;
              panVelYRef.current = 0;
              isDraggingRef.current = true;
              lastDragTsRef.current = performance.now();
              const rect = e.currentTarget.getBoundingClientRect();
              pointerHoverRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };

              const now = Date.now();
              if (activePointersRef.current.size === 0 && now - lastTapMsRef.current < 280) {
                resetChartView();
                lastTapMsRef.current = 0;
              } else if (activePointersRef.current.size === 0) {
                lastTapMsRef.current = now;
              }
              activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (activePointersRef.current.size >= 2) {
                const pts = Array.from(activePointersRef.current.values());
                pinchStateRef.current = {
                  prevDist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
                  prevMidX: (pts[0].x + pts[1].x) / 2,
                  prevMidY: (pts[0].y + pts[1].y) / 2
                };
              } else {
                pinchStateRef.current = null;
              }
            }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              pointerHoverRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
              const prevPt = activePointersRef.current.get(e.pointerId);
              if (!prevPt) return;

              const plotCssW = Math.max(100, rect.width - 74) * 0.74;
              const plotCssH = Math.max(80, rect.height - 40);
              const total = assetCandles.length || 180;

              if (activePointersRef.current.size >= 2) {
                activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
                const pts = Array.from(activePointersRef.current.values());
                const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                const midX = (pts[0].x + pts[1].x) / 2;
                const midY = (pts[0].y + pts[1].y) / 2;
                const prevPinch = pinchStateRef.current;

                if (prevPinch && dist > 6 && prevPinch.prevDist > 6) {
                  const ratio = prevPinch.prevDist / dist;
                  const nextCount = Math.max(10, Math.min(115, visibleCountRef.current * ratio));
                  visibleCountRef.current = nextCount;
                  setVisibleCount(nextCount);

                  const slotCssW = plotCssW / Math.max(10, nextCount);
                  const dx = midX - prevPinch.prevMidX;
                  const dy = midY - prevPinch.prevMidY;
                  const minPan = -nextCount * 0.45;
                  const maxPan = Math.max(0, total - nextCount);
                  const nextPan = Math.max(minPan, Math.min(maxPan, panOffsetRef.current + dx / Math.max(4, slotCssW)));
                  const nextVPan = Math.max(-0.85, Math.min(0.85, pricePanRef.current + dy / plotCssH));
                  panOffsetRef.current = nextPan;
                  pricePanRef.current = nextVPan;
                  setPanOffset(nextPan);
                  setPricePanRatio(nextVPan);
                }
                pinchStateRef.current = { prevDist: dist, prevMidX: midX, prevMidY: midY };
              } else {
                const dx = e.clientX - prevPt.x;
                const dy = e.clientY - prevPt.y;
                activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

                const slotCssW = plotCssW / Math.max(10, visibleCountRef.current);
                const dCandles = dx / Math.max(4, slotCssW);
                const dVPan = dy / plotCssH;
                const minPan = -visibleCountRef.current * 0.45;
                const maxPan = Math.max(0, total - visibleCountRef.current);
                const nextPan = Math.max(minPan, Math.min(maxPan, panOffsetRef.current + dCandles));
                const nextVPan = Math.max(-0.85, Math.min(0.85, pricePanRef.current + dVPan));
                panOffsetRef.current = nextPan;
                pricePanRef.current = nextVPan;
                panVelXRef.current = dCandles * 0.85;
                panVelYRef.current = dVPan * 0.85;
                lastDragTsRef.current = performance.now();
                setPanOffset(nextPan);
                setPricePanRatio(nextVPan);
              }
            }}
            onPointerUp={(e) => {
              activePointersRef.current.delete(e.pointerId);
              try {
                (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
              } catch {}
              if (activePointersRef.current.size < 2) {
                pinchStateRef.current = null;
              }
              if (activePointersRef.current.size === 0) {
                isDraggingRef.current = false;
                if (performance.now() - lastDragTsRef.current > 80) {
                  panVelXRef.current = 0;
                  panVelYRef.current = 0;
                }
              }
            }}
            onPointerLeave={() => {
              if (activePointersRef.current.size === 0) {
                pointerHoverRef.current.active = false;
              }
            }}
            onPointerCancel={(e) => {
              activePointersRef.current.delete(e.pointerId);
              if (activePointersRef.current.size < 2) {
                pinchStateRef.current = null;
              }
              if (activePointersRef.current.size === 0) {
                isDraggingRef.current = false;
                pointerHoverRef.current.active = false;
              }
            }}
          >
            <canvas ref={canvasRef} className="w-full h-full block" />
            {(Math.abs(panOffset) > 0.25 || Math.abs(pricePanRatio) > 0.02 || Math.round(visibleCount) !== 28) && (
              <button
                type="button"
                onClick={resetChartView}
                className={`absolute bottom-7 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black border shadow-xs transition-all active:scale-95 ${
                  isGoldMode
                    ? 'bg-white/95 border-amber-300 text-amber-800 hover:bg-amber-50'
                    : 'bg-white/95 border-cyan-200 text-cyan-700 hover:bg-cyan-50'
                }`}
              >
                Reset View ▸
              </button>
            )}
          </div>
        </div>

        {/* Active Live Orders Strip */}
        {activeOrders.length > 0 && (
          <div
            className={`rounded-2xl border p-2.5 space-y-1.5 bg-white ${
              isGoldMode
                ? 'border-amber-200 shadow-xs'
                : 'border-cyan-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-black">
              <span className="text-slate-800">
                Open Positions ({activeOrders.length})
              </span>
              <span className={isGoldMode ? 'text-amber-700' : 'text-cyan-700'}>Auto Settle</span>
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
                    inProfit
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-rose-50/70 border-rose-200'
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
                    <span className="font-mono text-[10px] tabular-nums truncate text-slate-600">
                      @{formatAssetPrice(order.entryPrice, spec)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-nums flex-shrink-0">
                    <span className={`font-black text-[11px] ${inProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {inProfit ? `+৳${(order.amount * order.payoutRate).toFixed(0)}` : `-৳${order.amount}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border font-black text-[11px] bg-white ${
                        isGoldMode
                          ? 'border-amber-200 text-amber-800'
                          : 'border-cyan-200 text-cyan-800'
                      }`}
                    >
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
          <div className="rounded-2xl border p-2.5 space-y-1.5 bg-amber-50/80 border-amber-200">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-800">
              <span>Scheduled Pending Trades ({pendingOrders.length})</span>
              <span>Auto Executes at Target Clock</span>
            </div>
            {pendingOrders.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="px-3 py-1.5 rounded-xl border flex items-center justify-between text-xs bg-white border-amber-200"
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
                  <span className="font-mono text-[11px] font-black text-amber-700">
                    @ {p.targetTimeLabel}
                  </span>
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

        {/* Bottom Order Control Panel */}
        <div
          className={`rounded-2xl border p-3 space-y-3 relative bg-white ${
            isGoldMode
              ? 'border-amber-200 shadow-xs'
              : 'border-slate-200 shadow-2xs'
          }`}
        >
          {/* Asset Row + PENDING TRADE Toggle */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isGoldMode) setShowAssetPicker(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-black ${
                isGoldMode
                  ? 'bg-amber-50/70 border-amber-200 text-slate-900 cursor-default'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <MarketAssetEmblem symbol={selectedAsset} size="sm" />
              <span>{selectedAsset}</span>
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
              className="flex items-center gap-2 text-xs font-bold"
            >
              <span className="uppercase tracking-wide text-[10px] font-black text-slate-600">
                PENDING TRADE
              </span>
              <span
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                  pendingTradeMode
                    ? isGoldMode
                      ? 'bg-amber-500 justify-end'
                      : 'bg-cyan-600 justify-end'
                    : 'bg-slate-200 justify-start'
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
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                isGoldMode
                  ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
                  : 'bg-slate-50 border-slate-200 hover:border-cyan-400'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>Timer</span>
                <span className={`font-black ${isGoldMode ? 'text-amber-700' : 'text-cyan-700'}`}>
                  {pendingTradeMode ? 'TIME' : 'EXPIRY'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5 font-mono font-black text-sm tabular-nums text-slate-900">
                  <Clock className={`w-3.5 h-3.5 ${isGoldMode ? 'text-amber-600' : 'text-cyan-600'}`} />
                  <span>{pendingTradeMode ? pendingClockStr : tradeExpiryLabel}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>

            {/* Investment Box */}
            <div
              className={`p-2 rounded-xl border flex flex-col justify-between ${
                isGoldMode ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold px-1 text-slate-500">
                <span>Investment</span>
                <span>Min ৳10</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(10, (Number(customAmountStr) || 20) - 10);
                    setTradeAmount(next);
                    setCustomAmountStr(String(next));
                  }}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center active:scale-95 bg-white ${
                    isGoldMode ? 'border-amber-200 text-amber-800' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 flex items-center justify-center font-mono font-black text-sm text-slate-900">
                  <span className={`mr-0.5 ${isGoldMode ? 'text-amber-700' : 'text-cyan-700'}`}>৳</span>
                  <input
                    type="number"
                    min={10}
                    value={customAmountStr}
                    onChange={(e) => {
                      setCustomAmountStr(e.target.value);
                      setTradeAmount(Number(e.target.value) || 0);
                    }}
                    className="w-full bg-transparent text-center font-mono font-black text-sm focus:outline-none tabular-nums text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(50000, (Number(customAmountStr) || 10) + 10);
                    setTradeAmount(next);
                    setCustomAmountStr(String(next));
                  }}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center active:scale-95 bg-white ${
                    isGoldMode ? 'border-amber-200 text-amber-800' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Timer & Pending Scheduler 2-Tab Popover (TIMER | TIME) */}
          {timerModalOpen && (
            <div
              className={`border rounded-2xl p-3 space-y-3 shadow-inner ${
                isGoldMode
                  ? 'bg-[#FFFBEB] border-amber-200'
                  : 'bg-slate-50 border-cyan-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`grid grid-cols-2 gap-1 p-1 rounded-xl border flex-1 bg-white ${
                    isGoldMode ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setTimerModalTab('timer')}
                    className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      timerModalTab === 'timer'
                        ? isGoldMode
                          ? 'bg-amber-500 text-white'
                          : 'bg-cyan-600 text-white'
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
                  className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-500"
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
                            ? isGoldMode
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-cyan-600 text-white shadow-xs'
                            : isGoldMode
                            ? 'bg-white border border-amber-200 text-amber-900 hover:border-amber-400'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-cyan-400'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Minutes Stepper */}
                  <div
                    className={`flex items-center gap-2 border rounded-xl p-1.5 bg-white ${
                      isGoldMode ? 'border-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const nextMin = Math.max(1, Math.round(tradeDurationSec / 60) - 1);
                        setCustomMinutesStr(String(nextMin));
                        setTradeDurationSec(nextMin * 60);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">
                        Custom:
                      </span>
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
                        className="w-16 border rounded-lg py-1 text-center font-mono font-black text-xs bg-slate-50 border-slate-200 text-slate-900"
                      />
                      <span className="text-[11px] font-black text-slate-600">
                        min
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMin = Math.min(43200, Math.round(tradeDurationSec / 60) + 1);
                        setCustomMinutesStr(String(nextMin));
                        setTradeDurationSec(nextMin * 60);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] flex items-center gap-1.5 text-slate-600">
                    <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Auto-execute at exact local clock time ({tradeExpiryLabel} expiry)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold block mb-1 text-slate-500">
                        Execution Time
                      </label>
                      <input
                        type="time"
                        value={pendingClockStr}
                        onChange={(e) => setPendingClockStr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border font-mono font-black text-xs bg-white border-slate-200 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold block mb-1 text-slate-500">
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
                    ? isGoldMode
                      ? 'bg-amber-50 border-amber-500 text-amber-800'
                      : 'bg-cyan-50 border-cyan-500 text-cyan-700'
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
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-md px-3.5 py-2.5 border-t shadow-2xl z-30 flex items-center gap-2.5 bg-white/95 ${
          isGoldMode ? 'border-amber-200' : 'border-slate-200'
        }`}
      >
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
