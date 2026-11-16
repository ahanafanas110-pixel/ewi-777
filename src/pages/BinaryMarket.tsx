import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  BarChart3,
  ArrowLeft,
  Target,
  History,
  Globe2
} from 'lucide-react';
import { BinaryMarketLogo } from '../components/BrandLogos';
import { BINARY_MARKETS, BINARY_MARKET_MAP } from '../constants/markets';
import { BinaryMarketCategory, BinaryMarketConfig } from '../types';

const CATEGORIES: Array<'All' | BinaryMarketCategory> = [
  'All',
  'Crypto',
  'Forex',
  'Commodities',
  'Indices'
];

function formatAssetPrice(value: number, spec?: BinaryMarketConfig): string {
  const decimals = spec?.decimals ?? 2;
  const num = Number(value) || 0;
  const formatted = num.toFixed(decimals);
  if (spec?.category === 'Forex') return formatted;
  return `$${formatted}`;
}

export const BinaryMarket: React.FC = () => {
  const {
    user,
    binaryMarkets,
    binaryCandleSecRemaining,
    binaryBets,
    placeBinaryTrade,
    setActiveTab,
    showToast
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<'All' | BinaryMarketCategory>('All');
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC/USDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(30);
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [customAmountStr, setCustomAmountStr] = useState<string>('100');
  const [binaryTradeTab, setBinaryTradeTab] = useState<'active' | 'history'>('active');
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowTime(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const filteredMarkets = useMemo(() => {
    if (selectedCategory === 'All') return BINARY_MARKETS;
    return BINARY_MARKETS.filter((m) => m.category === selectedCategory);
  }, [selectedCategory]);

  const activeSpec = BINARY_MARKET_MAP[selectedAsset] || BINARY_MARKETS[0];
  const activeQuote = binaryMarkets[selectedAsset] || binaryMarkets['BTC/USDT'];
  const assetPrice = activeQuote?.price ?? activeSpec.basePrice;
  const assetCandles = activeQuote?.candles || [];
  const payoutPct = Math.round(activeSpec.payoutRate * 100);

  const timeframes = [
    { label: '15s', sec: 15 },
    { label: '30s', sec: 30 },
    { label: '1m', sec: 60 },
    { label: '3m', sec: 180 },
    { label: '5m', sec: 300 },
    { label: '15m', sec: 900 },
    { label: '30m', sec: 1800 }
  ];

  const amountPresets = [50, 100, 200, 500, 1000, 2000, 5000];

  const handleTrade = (direction: 'UP' | 'DOWN') => {
    const amt = Number(customAmountStr) || tradeAmount;
    if (amt <= 0) {
      showToast('Please enter a valid amount');
      return;
    }
    if (user.balance < amt) {
      showToast('Insufficient wallet balance!');
      return;
    }
    placeBinaryTrade(selectedAsset, direction, amt, selectedTimeframe);
  };

  // Japanese Candlestick Chart geometry calculation (supports high-precision Forex & Crypto)
  const visibleCandles = assetCandles.slice(-24);
  const allHighs = visibleCandles.map((c) => c.high);
  const allLows = visibleCandles.map((c) => c.low);
  const rawMin = allLows.length > 0 ? Math.min(...allLows, assetPrice) : assetPrice - activeSpec.volatility * 3;
  const rawMax = allHighs.length > 0 ? Math.max(...allHighs, assetPrice) : assetPrice + activeSpec.volatility * 3;
  const span = rawMax - rawMin;
  const minSpan = Math.max(span, activeSpec.volatility * 2);
  const padding = minSpan * 0.12;
  const minPrice = rawMin - padding;
  const maxPrice = rawMax + padding;
  const priceRange = Math.max(activeSpec.volatility * 0.5, maxPrice - minPrice);

  const svgWidth = 360;
  const svgHeight = 184;
  const axisReserve = 62;
  const candleAreaWidth = svgWidth - axisReserve;
  const candleSlotWidth = candleAreaWidth / Math.max(1, visibleCandles.length);
  const candleBodyWidth = Math.max(5, candleSlotWidth * 0.65);

  const scaleY = (p: number) => {
    return svgHeight - ((p - minPrice) / priceRange) * (svgHeight - 24) - 12;
  };

  const currentPriceY = scaleY(assetPrice);
  const firstCandle = visibleCandles[0];
  const lastCandle = visibleCandles[visibleCandles.length - 1];
  const priceDiff = lastCandle && firstCandle ? lastCandle.close - firstCandle.open : 0;
  const isOverallGreen = priceDiff >= 0;

  const activeOrders = binaryBets.filter((b) => b.status === 'active');
  const assetActiveOrders = activeOrders.filter((b) => b.asset === selectedAsset);
  const completedOrders = binaryBets.filter((b) => b.status !== 'active');

  const handleExit = () => {
    setActiveTab('home');
    window.location.hash = '#/';
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-32">
      <Header title="Binary Market" showBack={true} onBack={handleExit} />

      <div className="p-4 space-y-3.5">
        {/* Exit & Live Indicator */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleExit}
            className="px-3.5 py-1.5 rounded-full bg-white text-[#FF2A7A] hover:bg-pink-50 border border-pink-200 font-black text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Exit Market</span>
          </button>

          <div className="text-[11px] font-extrabold text-slate-500 bg-white px-3 py-1 rounded-full border border-pink-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>17 Live Synced Markets</span>
          </div>
        </div>

        {/* Multi-Asset Category Filter & Market Selector */}
        <div className="bg-white rounded-3xl p-3 shadow-xs border border-pink-100 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-[#FF2A7A]" />
              <span>Select Binary Market</span>
            </span>
            <span className="text-[10px] font-bold text-[#FF2A7A] bg-pink-50 px-2 py-0.5 rounded-full">
              {filteredMarkets.length} Pairs
            </span>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex-shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white shadow-2xs'
                    : 'bg-pink-50/60 text-slate-600 hover:bg-pink-100/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Independent Market Cards Strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filteredMarkets.map((mkt) => {
              const quote = binaryMarkets[mkt.symbol];
              const price = quote?.price ?? mkt.basePrice;
              const chg = quote?.changePct ?? 0;
              const isSelected = selectedAsset === mkt.symbol;
              const isUp = chg >= 0;

              return (
                <button
                  key={mkt.symbol}
                  type="button"
                  onClick={() => setSelectedAsset(mkt.symbol)}
                  className={`min-w-[132px] p-2.5 rounded-2xl border text-left transition-all flex-shrink-0 active:scale-97 ${
                    isSelected
                      ? 'bg-[#12040D] text-white border-[#FF2A7A] shadow-md ring-1 ring-[#FF2A7A]/40'
                      : 'bg-[#FFF8FA] border-pink-100 text-slate-800 hover:border-pink-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black text-xs truncate">{mkt.symbol}</span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-[#FF2A7A] text-white'
                          : 'bg-pink-100 text-[#FF2A7A]'
                      }`}
                    >
                      +{Math.round(mkt.payoutRate * 100)}%
                    </span>
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isSelected ? 'text-pink-200/80' : 'text-slate-400'
                    }`}
                  >
                    {mkt.name}
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-1.5 font-mono">
                    <span
                      className={`text-[11px] font-black tabular-nums ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {formatAssetPrice(price, mkt)}
                    </span>
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        isUp ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {chg.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Selected Asset & Candle Close Countdown Card */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#0D050F] flex items-center justify-center p-1 shadow-xs flex-shrink-0 border border-pink-200">
              <BinaryMarketLogo size={36} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-sm text-slate-800">{selectedAsset}</span>
                <span className="px-2 py-0.5 rounded-full bg-pink-50 text-[#FF2A7A] text-[10px] font-bold border border-pink-100">
                  {payoutPct}% Payout
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                <span className="truncate">{activeSpec.name}</span>
                <span className={`font-mono font-bold ${isOverallGreen ? 'text-green-600' : 'text-red-500'}`}>
                  {formatAssetPrice(assetPrice, activeSpec)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-[10px] uppercase font-extrabold text-slate-400 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-[#FF2A7A]" />
              <span>Candle Closes In</span>
            </div>
            <div className="text-xl font-mono font-black text-[#FF2A7A]">
              00:0{binaryCandleSecRemaining}s
            </div>
            <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live 8s Synced
            </div>
          </div>
        </div>

        {/* Real Japanese RED & GREEN Candlestick Chart */}
        <div className="bg-[#0D050F] rounded-3xl p-4 text-white shadow-xl relative overflow-hidden border border-pink-900/40">
          <div className="flex items-center justify-between text-xs text-pink-300 font-semibold mb-2 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <BarChart3 className="w-4 h-4 text-[#FF2A7A] flex-shrink-0" />
              <span className="font-bold text-white truncate">{selectedAsset} Chart</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-950/60 text-pink-300 font-mono flex-shrink-0">
                {selectedTimeframe}s
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] flex-shrink-0">
              <span className="text-slate-400">
                H: <strong className="text-green-400">{formatAssetPrice(lastCandle?.high ?? assetPrice, activeSpec)}</strong>
              </span>
              <span className="text-slate-400">
                L: <strong className="text-red-400">{formatAssetPrice(lastCandle?.low ?? assetPrice, activeSpec)}</strong>
              </span>
            </div>
          </div>

          {/* SVG Japanese Candlestick Chart */}
          <div className="w-full h-48 relative select-none">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full">
              {[0.25, 0.5, 0.75].map((ratio) => {
                const y = svgHeight * ratio;
                const priceAtY = maxPrice - ratio * priceRange;
                return (
                  <g key={ratio}>
                    <line
                      x1="0"
                      y1={y}
                      x2={candleAreaWidth}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.07)"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={candleAreaWidth + 4}
                      y={y + 3}
                      fill="rgba(255, 255, 255, 0.45)"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {priceAtY.toFixed(Math.min(4, activeSpec.decimals))}
                    </text>
                  </g>
                );
              })}

              {visibleCandles.map((c, i) => {
                const x = i * candleSlotWidth + candleSlotWidth / 2;
                const isBullish = c.close >= c.open;
                const candleColor = isBullish ? '#10B981' : '#EF4444';

                const openY = scaleY(c.open);
                const closeY = scaleY(c.close);
                const highY = scaleY(c.high);
                const lowY = scaleY(c.low);

                const bodyTop = Math.min(openY, closeY);
                const bodyBottom = Math.max(openY, closeY);
                const bodyHeight = Math.max(2, bodyBottom - bodyTop);

                return (
                  <g key={c.time || i}>
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke={candleColor}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <rect
                      x={x - candleBodyWidth / 2}
                      y={bodyTop}
                      width={candleBodyWidth}
                      height={bodyHeight}
                      fill={candleColor}
                      rx="1"
                    />
                    <rect
                      x={x - candleBodyWidth / 2}
                      y={svgHeight - Math.min(18, (c.volume || 10) * 0.4)}
                      width={candleBodyWidth}
                      height={Math.min(18, (c.volume || 10) * 0.4)}
                      fill={isBullish ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                      rx="0.5"
                    />
                  </g>
                );
              })}

              {/* Horizontal Live Price Dashed Line */}
              <line
                x1="0"
                y1={currentPriceY}
                x2={candleAreaWidth}
                y2={currentPriceY}
                stroke="#FF2A7A"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />

              {/* Current Price Axis Tag on Right */}
              <g
                transform={`translate(${candleAreaWidth + 2}, ${Math.max(10, Math.min(svgHeight - 10, currentPriceY))})`}
              >
                <rect x="0" y="-8" width="58" height="16" rx="3" fill="#FF2A7A" />
                <text x="3" y="3" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  {assetPrice.toFixed(Math.min(4, activeSpec.decimals))}
                </text>
              </g>

              {/* Active Trade Entry Lines & Markers for Selected Asset */}
              {assetActiveOrders.map((bet) => {
                const betY = scaleY(bet.entryPrice);
                const isCall = bet.direction === 'UP';
                const color = isCall ? '#10B981' : '#F43F5E';
                return (
                  <g key={bet.id}>
                    <line
                      x1="0"
                      y1={betY}
                      x2={candleAreaWidth}
                      y2={betY}
                      stroke={color}
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                    <g transform={`translate(2, ${Math.max(10, Math.min(svgHeight - 10, betY))})`}>
                      <rect x="0" y="-7" width="84" height="14" rx="3" fill={color} />
                      <text x="4" y="3" fill="#FFFFFF" fontSize="7.5" fontWeight="900" fontFamily="monospace">
                        {isCall ? '▲ CALL' : '▼ PUT'} {bet.entryPrice.toFixed(Math.min(4, activeSpec.decimals))}
                      </text>
                    </g>
                    <circle
                      cx={candleAreaWidth - 8}
                      cy={betY}
                      r="4"
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {visibleCandles.length > 0 && (
                <circle
                  cx={(visibleCandles.length - 1) * candleSlotWidth + candleSlotWidth / 2}
                  cy={currentPriceY}
                  r="3.5"
                  fill="#FF2A7A"
                  className="animate-pulse"
                />
              )}
            </svg>
          </div>

          <div className="flex justify-between items-center text-[10px] text-pink-300/80 pt-2 border-t border-white/10 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-[#10B981]" /> Green: Bullish
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-[#EF4444]" /> Red: Bearish
            </span>
            <span>Live: {formatAssetPrice(assetPrice, activeSpec)}</span>
          </div>
        </div>

        {/* Active Position Entry Tracker */}
        {activeOrders.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-sm border-2 border-pink-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#FF2A7A]" />
                <span>Trade Entry Tracking ({activeOrders.length} Active)</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Tracking
              </span>
            </div>

            <div className="space-y-2">
              {activeOrders.map((order) => {
                const spec = BINARY_MARKET_MAP[order.asset] || activeSpec;
                const liveAssetPx = binaryMarkets[order.asset]?.price ?? order.entryPrice;
                const isCall = order.direction === 'UP';
                const diff = liveAssetPx - order.entryPrice;
                const isInTheMoney = (isCall && diff > 0) || (!isCall && diff < 0);
                const secLeft = Math.max(0, Math.ceil((order.endTime - nowTime) / 1000));

                return (
                  <div
                    key={order.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isInTheMoney
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-rose-50/70 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-black text-[10px] text-white ${
                            isCall ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        >
                          {isCall ? '▲ CALL' : '▼ PUT'}
                        </span>
                        <span className="font-black text-slate-800">{order.asset}</span>
                        <span className="font-extrabold text-slate-700">৳{order.amount}</span>
                      </div>
                      <div className="font-mono font-black text-xs text-[#FF2A7A] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{secLeft}s</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-black/5 text-[11px] font-mono">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Entry</div>
                        <div className="font-black text-slate-800">
                          {formatAssetPrice(order.entryPrice, spec)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Current</div>
                        <div className="font-black text-slate-800">
                          {formatAssetPrice(liveAssetPx, spec)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Status</div>
                        <div className={`font-black ${isInTheMoney ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isInTheMoney ? `Win (+${Math.round(order.payoutRate * 100)}%)` : 'Trailing'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expiration Timeframes */}
        <div className="bg-white rounded-3xl p-3 shadow-xs border border-pink-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2 px-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF2A7A]" />
              <span>Select Expiry Time</span>
            </span>
            <span className="text-[11px] text-[#FF2A7A] font-extrabold">{payoutPct}% Return</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf.sec}
                onClick={() => setSelectedTimeframe(tf.sec)}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  selectedTimeframe === tf.sec
                    ? 'bg-gradient-to-b from-[#FF2A7A] to-[#FF5A92] text-white shadow-xs scale-102'
                    : 'bg-pink-50/60 text-slate-700 hover:bg-pink-100/50'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Investment Amount Selection */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
            <span>Investment Amount (৳)</span>
            <span className="text-[11px] font-semibold text-slate-500">
              Balance: ৳{user.balance.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {amountPresets.slice(0, 4).map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setTradeAmount(amt);
                  setCustomAmountStr(amt.toString());
                }}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  tradeAmount === amt
                    ? 'bg-pink-50 border-[#FF2A7A] text-[#FF2A7A]'
                    : 'border-slate-100 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ৳{amt}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-[#FF2A7A] font-black text-sm">
              ৳
            </span>
            <input
              type="number"
              value={customAmountStr}
              onChange={(e) => {
                setCustomAmountStr(e.target.value);
                setTradeAmount(Number(e.target.value) || 0);
              }}
              className="w-full bg-[#FFF8FA] border border-pink-200/80 rounded-2xl pl-8 pr-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          </div>
        </div>

        {/* Call & Put Trade Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => handleTrade('UP')}
            className="py-4 rounded-3xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm shadow-md active:scale-98 transition-all flex flex-col items-center justify-center gap-1 hover:brightness-105"
          >
            <div className="flex items-center gap-1.5 text-base">
              <TrendingUp className="w-5 h-5 stroke-[3]" />
              <span>CALL / UP</span>
            </div>
            <span className="text-[11px] font-medium opacity-90">
              Payout: +৳{((Number(customAmountStr) || tradeAmount) * (1 + activeSpec.payoutRate)).toFixed(2)} ({payoutPct}%)
            </span>
          </button>

          <button
            onClick={() => handleTrade('DOWN')}
            className="py-4 rounded-3xl bg-gradient-to-r from-[#FF2A7A] to-[#E8177E] text-white font-black text-sm shadow-md active:scale-98 transition-all flex flex-col items-center justify-center gap-1 hover:brightness-105"
          >
            <div className="flex items-center gap-1.5 text-base">
              <TrendingDown className="w-5 h-5 stroke-[3]" />
              <span>PUT / DOWN</span>
            </div>
            <span className="text-[11px] font-medium opacity-90">
              Payout: +৳{((Number(customAmountStr) || tradeAmount) * (1 + activeSpec.payoutRate)).toFixed(2)} ({payoutPct}%)
            </span>
          </button>
        </div>

        {/* Active & Completed Orders List */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100">
          <div className="flex border-b border-slate-100 mb-3">
            <button
              type="button"
              onClick={() => setBinaryTradeTab('active')}
              className={`flex-1 pb-2.5 text-xs font-black text-center border-b-2 transition-all ${
                binaryTradeTab === 'active'
                  ? 'border-[#FF2A7A] text-[#FF2A7A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Active Trades ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setBinaryTradeTab('history')}
              className={`flex-1 pb-2.5 text-xs font-black text-center border-b-2 transition-all ${
                binaryTradeTab === 'history'
                  ? 'border-[#FF2A7A] text-[#FF2A7A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Binary History ({completedOrders.length})
            </button>
          </div>

          {binaryTradeTab === 'active' ? (
            <div className="space-y-2">
              {activeOrders.length === 0 ? (
                <div className="text-center py-7 text-xs text-slate-400">
                  <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[#FF2A7A] flex items-center justify-center mx-auto mb-2">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span>No active trades. Select a market, expiry time, and tap CALL or PUT!</span>
                </div>
              ) : (
                activeOrders.map((trade) => {
                  const spec = BINARY_MARKET_MAP[trade.asset] || activeSpec;
                  const leftSeconds = Math.max(0, Math.ceil((trade.endTime - nowTime) / 1000));
                  return (
                    <div
                      key={trade.id}
                      className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-black">
                          <span className={trade.direction === 'UP' ? 'text-emerald-600' : 'text-[#FF2A7A]'}>
                            {trade.direction === 'UP' ? '▲ CALL' : '▼ PUT'}
                          </span>
                          <span className="text-slate-800">{trade.asset}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            @{formatAssetPrice(trade.entryPrice, spec)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Amount: ৳{trade.amount} • {trade.durationSeconds}s duration
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="px-2.5 py-1 rounded-full bg-white text-[#FF2A7A] font-black text-xs shadow-2xs border border-pink-100">
                          {leftSeconds}s left
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {completedOrders.length === 0 ? (
                <div className="text-center py-7 text-xs text-slate-400">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <History className="w-5 h-5" />
                  </div>
                  <span>No completed trades yet. Trade outcomes will be recorded here!</span>
                </div>
              ) : (
                completedOrders.slice(0, 20).map((trade) => {
                  const spec = BINARY_MARKET_MAP[trade.asset] || activeSpec;
                  const isWon = trade.status === 'won';
                  return (
                    <div
                      key={trade.id}
                      className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-pink-200 transition-all flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                              trade.direction === 'UP'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {trade.direction === 'UP' ? '▲ CALL' : '▼ PUT'}
                          </span>
                          <span className="font-black text-slate-800">{trade.asset}</span>
                          <span className="text-[11px] font-bold text-slate-600">৳{trade.amount}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span>Entry: {formatAssetPrice(trade.entryPrice, spec)}</span>
                          <span>•</span>
                          <span>
                            Exit: {trade.strikePrice !== undefined ? formatAssetPrice(trade.strikePrice, spec) : '---'}
                          </span>
                          <span>•</span>
                          <span>{trade.durationSeconds}s</span>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span
                          className={`px-2.5 py-1 rounded-xl font-black text-[11px] uppercase tracking-wide ${
                            isWon ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isWon ? `+৳${trade.winAmount}` : `-৳${trade.amount}`}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                          {isWon ? 'Won ✓' : 'Lost'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Quick Trade Action Dock */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md px-4 py-2.5 border-t border-pink-100 shadow-2xl z-30 flex items-center gap-2.5">
        <button
          onClick={() => handleTrade('UP')}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:brightness-105"
        >
          <TrendingUp className="w-4 h-4 stroke-[3]" />
          <span>CALL / UP (৳{customAmountStr || tradeAmount})</span>
        </button>

        <button
          onClick={() => handleTrade('DOWN')}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#FF2A7A] to-[#E8177E] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:brightness-105"
        >
          <TrendingDown className="w-4 h-4 stroke-[3]" />
          <span>PUT / DOWN (৳{customAmountStr || tradeAmount})</span>
        </button>
      </div>
    </div>
  );
};
