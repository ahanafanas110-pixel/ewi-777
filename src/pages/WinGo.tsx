import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  RefreshCw,
  Volume2,
  HelpCircle,
  Bell,
  Clock,
  History
} from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { WinGoMode } from '../types';
import { Ewi777Logo, CustomerServiceLogo } from '../components/BrandLogos';
import {
  WinGoBall,
  WinGoCountdownOverlay
} from '../components/WinGoAssets';
import {
  LotteryTradeDetailCard,
  buildLotteryOrderNumber,
  fallbackOrderTimestamp
} from '../components/LotteryTradeDetailCard';

export const WinGo: React.FC = () => {
  const {
    user,
    activeWingoMode,
    setActiveWingoMode,
    currentPeriod,
    timeRemaining,
    historyResults,
    bets,
    placeBet,
    setActiveTab,
    language,
    showToast,
    unreadNotificationsCount,
    setIsNotificationOpen,
    markNotificationsRead,
    syncWingoFromApi,
    adminSettings
  } = useApp();

  useEffect(() => {
    syncWingoFromApi(activeWingoMode);
    const poll = setInterval(() => {
      syncWingoFromApi(activeWingoMode);
    }, 2500);
    return () => clearInterval(poll);
  }, [activeWingoMode]);

  useEffect(() => {
    if (timeRemaining <= 1 || timeRemaining >= 28) {
      const t = setTimeout(() => {
        syncWingoFromApi(activeWingoMode);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [timeRemaining, activeWingoMode]);

  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState<'color' | 'number' | 'size'>('color');
  const [selectedBetValue, setSelectedBetValue] = useState<string | number>('green');
  const [baseUnit, setBaseUnit] = useState<number>(10);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'game' | 'my'>('game');
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showBetSuccessOverlay, setShowBetSuccessOverlay] = useState(false);
  const tzOffset = adminSettings.timezoneOffsetMinutes ?? 360;

  const seconds = timeRemaining % 60;
  const minutes = Math.floor(timeRemaining / 60);

  const secStr = seconds.toString().padStart(2, '0');
  const minStr = minutes.toString().padStart(2, '0');

  const totalBetCost = baseUnit * multiplier;
  const isBetLocked = timeRemaining <= 5;

  const handleOpenBet = (type: 'color' | 'number' | 'size', value: string | number) => {
    if (isBetLocked) {
      showToast('Betting is locked for this round. Please wait for next round!');
      return;
    }
    setSelectedBetType(type);
    setSelectedBetValue(value);
    setMultiplier(1);
    setBetModalOpen(true);
  };

  const handleConfirmBet = () => {
    const res = placeBet(activeWingoMode, selectedBetType, selectedBetValue, baseUnit, multiplier);
    if (res.success) {
      setBetModalOpen(false);
      setShowBetSuccessOverlay(true);
      setTimeout(() => {
        setShowBetSuccessOverlay(false);
      }, 1800);
    }
  };

  const currentModeBets = bets.filter((b) => b.mode === activeWingoMode);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] px-4 pt-3 pb-8 text-white rounded-b-[2rem] shadow-md">
        <div className="relative flex items-center justify-between min-h-[62px] mb-4">
          <button
            onClick={() => {
              setActiveTab('home');
              window.location.hash = '#/';
            }}
            className="relative z-10 p-1.5 -ml-1 text-white hover:opacity-80 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
            <Ewi777Logo height={40} logoUrl={adminSettings.appLogoUrl} />
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <button
              onClick={() => {
                markNotificationsRead();
                setIsNotificationOpen(true);
              }}
              className="relative p-1 text-white/90 hover:text-white active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-cyan-300 text-[#0B2235] text-[9px] font-black flex items-center justify-center shadow-xs tabular-nums">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('customer-service');
                window.location.hash = '#/customer-service';
              }}
              aria-label="Customer Service"
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-transform"
            >
              <CustomerServiceLogo size={24} />
            </button>
            <button
              onClick={() => showToast('Game audio toggled')}
              className="p-1 text-white/90 hover:text-white"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 text-slate-800 shadow-md border border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
              ৳{Math.max(0, (user.balance || 0) - (user.lockedBalance || 0)).toFixed(2)}
            </span>
            <button
              onClick={() => showToast('Wallet balance refreshed')}
              className="text-slate-400 hover:text-[#0891B2] active:rotate-180 transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center text-xs font-semibold text-slate-500 mb-3">
            {getTranslation(language, 'balance')}
          </div>
          {(user.lockedBalance || 0) > 0 && (
            <div className="mx-auto mb-3 w-fit px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 tabular-nums">
              Hold Balance: ৳{(user.lockedBalance || 0).toFixed(2)} (Blocked until Admin releases)
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setActiveTab('wallet');
                window.location.hash = '#/wallet';
              }}
              className="py-3 min-h-[44px] rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-extrabold text-sm shadow-xs hover:brightness-105 active:scale-98 transition-all"
            >
              {getTranslation(language, 'withdraw')}
            </button>
            <button
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="py-3 min-h-[44px] rounded-full bg-emerald-600 text-white font-extrabold text-sm shadow-xs hover:brightness-105 active:scale-98 transition-all"
            >
              {getTranslation(language, 'deposit')}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200 grid grid-cols-4 gap-1.5">
          {(['30s', '1m', '3m', '5m'] as WinGoMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveWingoMode(mode)}
              className={`py-2 min-h-[40px] px-1 rounded-xl text-xs font-black text-center transition-all ${
                activeWingoMode === mode
                  ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-xs scale-102'
                  : 'text-slate-600 hover:bg-cyan-50'
              }`}
            >
              {mode === '30s' ? '30 Sec' : mode === '1m' ? '1 Min' : mode === '3m' ? '3 Min' : '5 Min'}
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/20">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="px-3 py-1 rounded-full border border-white/40 text-[11px] font-bold flex items-center gap-1 active:scale-95"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How to play</span>
                </button>
              </div>
              <div className="text-xs font-black text-white/95 mt-2 flex items-center gap-2">
                <div className="flex flex-col">
                  <span>WinGo {activeWingoMode}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 w-fit mt-0.5">
                    {activeWingoMode === '30s' ? 'Resolves every 30 sec' : activeWingoMode === '1m' ? 'Resolves every 1 min' : activeWingoMode === '3m' ? 'Resolves every 3 min' : 'Resolves every 5 min'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-cyan-100 tracking-wider mb-1 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />
                <span>{getTranslation(language, 'timeRemaining')}</span>
              </div>
              <div className="flex items-center gap-1 tabular-nums">
                <span className="w-7 h-8 rounded-lg bg-white text-slate-900 font-mono font-black text-lg flex items-center justify-center shadow-xs">
                  {minStr[0]}
                </span>
                <span className="w-7 h-8 rounded-lg bg-white text-slate-900 font-mono font-black text-lg flex items-center justify-center shadow-xs">
                  {minStr[1]}
                </span>
                <span className="font-mono font-black text-xl px-0.5">:</span>
                <span className={`w-7 h-8 rounded-lg bg-white font-mono font-black text-lg flex items-center justify-center shadow-xs ${isBetLocked ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
                  {secStr[0]}
                </span>
                <span className={`w-7 h-8 rounded-lg bg-white font-mono font-black text-lg flex items-center justify-center shadow-xs ${isBetLocked ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
                  {secStr[1]}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-100 font-semibold">{getTranslation(language, 'period')}</span>
              <span className="font-mono font-extrabold tracking-wider tabular-nums">{currentPeriod}</span>
            </div>

            {historyResults.length > 0 && (
              <div className="flex items-center justify-between bg-white/15 rounded-2xl px-3 py-1.5 border border-white/15">
                <span className="text-[10px] font-bold text-cyan-100">{getTranslation(language, 'latestResults')}</span>
                <div className="flex items-center gap-1.5">
                  {historyResults.slice(0, 5).map((r) => (
                    <div key={r.periodNumber} title={`Period ${r.periodNumber}`}>
                      <WinGoBall number={r.number} size="xs" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {bets.filter((b) => b.periodNumber === currentPeriod && b.mode === activeWingoMode && b.status === 'pending').length > 0 && (
            <div className="mt-2.5 p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-between text-xs border border-white/30 animate-pulse">
              <span className="font-bold text-cyan-100 flex items-center gap-1.5 text-[11px]">
                Active on Period {currentPeriod.slice(-5)}:
              </span>
              <span className="font-mono font-black text-white text-[11px]">
                {bets
                  .filter((b) => b.periodNumber === currentPeriod && b.mode === activeWingoMode && b.status === 'pending')
                  .map((b) => `${b.value.toString().toUpperCase()} (৳${b.totalAmount})`)
                  .join(' • ')}
              </span>
            </div>
          )}

        </div>

        <div className="relative space-y-4">
          <WinGoCountdownOverlay seconds={timeRemaining} />

          {showBetSuccessOverlay && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="px-6 py-3 rounded-2xl bg-slate-900/85 backdrop-blur-xs text-white font-extrabold text-sm shadow-2xl tracking-wide animate-fade-in">
                {getTranslation(language, 'betSuccessful')}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleOpenBet('color', 'green')}
              disabled={isBetLocked}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {getTranslation(language, 'green')} (1.89X)
            </button>
            <button
              onClick={() => handleOpenBet('color', 'violet')}
              disabled={isBetLocked}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 text-white font-black text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {getTranslation(language, 'violet')} (4.5X)
            </button>
            <button
              onClick={() => handleOpenBet('color', 'red')}
              disabled={isBetLocked}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {getTranslation(language, 'red')} (1.89X)
            </button>
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1 gap-2">
              <span>{getTranslation(language, 'selectNumber')}</span>
              <span className="text-[10px] text-slate-500 text-right">{getTranslation(language, 'upTo4NumbersRule')}</span>
            </div>
            <div className="grid grid-cols-5 gap-2.5 place-items-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => handleOpenBet('number', n)}
                  disabled={isBetLocked}
                  aria-label={`Bet on number ${n}`}
                  className="flex items-center justify-center p-0.5 rounded-full active:scale-90 transition-transform disabled:opacity-50"
                >
                  <WinGoBall number={n} size="md" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOpenBet('size', 'big')}
              disabled={isBetLocked}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {getTranslation(language, 'big')} (5-9) 1.89X
            </button>
            <button
              onClick={() => handleOpenBet('size', 'small')}
              disabled={isBetLocked}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {getTranslation(language, 'small')} (0-4) 1.89X
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200">
          <div className="flex border-b border-slate-100 mb-3">
            <button
              onClick={() => setActiveHistoryTab('game')}
              className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all ${
                activeHistoryTab === 'game'
                  ? 'border-[#0891B2] text-[#0891B2]'
                  : 'border-transparent text-slate-500'
              }`}
            >
              Game History ({activeWingoMode})
            </button>
            <button
              onClick={() => setActiveHistoryTab('my')}
              className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all ${
                activeHistoryTab === 'my'
                  ? 'border-[#0891B2] text-[#0891B2]'
                  : 'border-transparent text-slate-500'
              }`}
            >
              My Bets ({currentModeBets.length})
            </button>
          </div>

          {activeHistoryTab === 'game' ? (
            <div className="space-y-2.5">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100 text-[11px]">
                      <th className="pb-2 font-medium">Period</th>
                      <th className="pb-2 font-medium text-center">Number</th>
                      <th className="pb-2 font-medium text-center">Size</th>
                      <th className="pb-2 font-medium text-right">Color</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {historyResults.slice(0, 10).map((res) => (
                      <tr key={res.periodNumber} className="hover:bg-cyan-50/40">
                        <td className="py-2 text-slate-700 font-semibold text-[11px]">
                          {res.periodNumber}
                        </td>
                        <td className="py-2 text-center">
                          <div className="inline-flex items-center justify-center">
                            <WinGoBall number={res.number} size="sm" />
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={`font-black uppercase text-[11px] ${
                              res.size === 'big' ? 'text-[#0891B2]' : 'text-blue-600'
                            }`}
                          >
                            {res.size}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span
                              className={`w-3 h-3 rounded-full ${
                                res.color.includes('green') ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            {res.color.includes('violet') && (
                              <span className="w-3 h-3 rounded-full bg-purple-500" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentModeBets.length === 0 ? (
                <div className="text-center py-7 text-xs text-slate-500">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-[#0891B2] flex items-center justify-center mx-auto mb-2">
                    <History className="w-5 h-5" />
                  </div>
                  <span>No bets placed in WinGo {activeWingoMode} yet. Place a bet above!</span>
                </div>
              ) : (
                currentModeBets.slice(0, 20).map((b) => {
                  const matchedRes =
                    b.resultNumber !== undefined
                      ? {
                          number: b.resultNumber,
                          color: b.resultColor || ('green' as const),
                          size: b.resultSize || ('small' as const)
                        }
                      : historyResults.find((h) => h.periodNumber === b.periodNumber);
                  const valStr = String(b.value);
                  const tone =
                    valStr === 'big'
                      ? 'orange'
                      : valStr === 'small'
                      ? 'blue'
                      : valStr === 'green'
                      ? 'green'
                      : valStr === 'red'
                      ? 'red'
                      : valStr === 'violet'
                      ? 'violet'
                      : 'cyan';
                  const shortLabel =
                    b.type === 'size'
                      ? valStr === 'big'
                        ? 'Big'
                        : 'Small'
                      : b.type === 'color'
                      ? valStr.charAt(0).toUpperCase() + valStr.slice(1)
                      : valStr;
                  const fullLabel =
                    b.type === 'number'
                      ? `Number ${valStr}`
                      : shortLabel;
                  return (
                    <LotteryTradeDetailCard
                      key={b.id}
                      isExpanded={expandedBetId === b.id}
                      onToggle={() => setExpandedBetId((prev) => (prev === b.id ? null : b.id))}
                      onCopyOrderNumber={() => showToast('Order number copied!')}
                      item={{
                        id: b.id,
                        orderNumber: b.orderNumber || buildLotteryOrderNumber('WG', b.id),
                        periodNumber: b.periodNumber,
                        orderTime: b.orderTime || fallbackOrderTimestamp(b.periodNumber, b.time, tzOffset),
                        purchaseAmount: b.totalAmount,
                        quantity: b.multiplier || 1,
                        selectionShort: shortLabel,
                        selectionFull: fullLabel,
                        selectionTone: tone,
                        status: b.status,
                        winAmount: b.winAmount,
                        countdownSec: b.periodNumber === currentPeriod && b.status === 'pending' ? timeRemaining : undefined,
                        gameKind: 'wingo',
                        wingoResult: matchedRes
                          ? { number: matchedRes.number, color: matchedRes.color, size: matchedRes.size }
                          : undefined
                      }}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {betModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border-t border-slate-200 rounded-t-[2.5rem] p-5 w-full max-w-md shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  WinGo {activeWingoMode}
                </h3>
                <span className="text-xs text-slate-500">
                  Select: <span className="font-bold text-[#0891B2] uppercase">{selectedBetType} {selectedBetValue}</span>
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">Period: {currentPeriod.slice(-5)}</span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">{getTranslation(language, 'baseUnit')}</span>
              <div className="grid grid-cols-4 gap-2">
                {[1, 10, 100, 1000].map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setBaseUnit(unit)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all tabular-nums ${
                      baseUnit === unit
                        ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] border-[#0891B2] text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-cyan-50'
                    }`}
                  >
                    ৳{unit}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto py-1">
              {[1, 5, 10, 20, 50, 100].map((mul) => (
                <button
                  key={mul}
                  onClick={() => setMultiplier(mul)}
                  className={`flex-1 min-w-[45px] py-1.5 rounded-lg text-xs font-bold border ${
                    multiplier === mul
                      ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] border-[#0891B2] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  X{mul}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => setBetModalOpen(false)}
                className="py-3 rounded-full bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-95"
              >
                {getTranslation(language, 'cancel')}
              </button>
              <button
                onClick={handleConfirmBet}
                className="col-span-2 py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-extrabold text-sm shadow-md active:scale-98 transition-all hover:brightness-105 tabular-nums"
              >
                {getTranslation(language, 'totalAmount')} ৳{totalBetCost.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900">{getTranslation(language, 'winGoGameRules')}</h3>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed max-h-60 overflow-y-auto">
              <p>• <strong>Green:</strong> If the result is 1, 3, 7, 9, you win 1.89X. If the result is 5, you win 1.5X.</p>
              <p>• <strong>Red:</strong> If the result is 2, 4, 6, 8, you win 1.89X. If the result is 0, you win 1.5X.</p>
              <p>• <strong>Violet:</strong> If the result is 0 or 5, you win 4.5X.</p>
              <p>• <strong>Numbers (0-9):</strong> Guess the exact winning digit for 9X payout.</p>
              <p>• <strong>Big (5-9) / Small (0-4):</strong> 1.89X payout.</p>
              <p>• <strong>Fair Play Policy:</strong> Opposing bets (Big+Small, Red+Green, or 5+ numbers in one round) automatically apply a 3X turnover requirement (details sent to Notifications).</p>
            </div>
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-bold text-xs"
            >
              {getTranslation(language, 'understood')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
