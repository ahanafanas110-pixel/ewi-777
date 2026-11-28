import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { EwiWingoMode, WinGoResult } from '../types';
import {
  formatTimeWithOffset,
  getEwiWingoNumberMeta,
  getEwiWingoPeriodInfo,
  getSyncedEwiWingoHistory,
  resolveControlledEwiWingoNumber,
  resolveForcedEwiWingoNumber
} from '../utils/syncedMarkets';
import { ArrowLeft, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { Ewi777Logo } from '../components/BrandLogos';
import { apiUrl } from '../utils/phoneAndApi';
import {
  LotteryTradeDetailCard,
  buildLotteryOrderNumber,
  fallbackOrderTimestamp
} from '../components/LotteryTradeDetailCard';

const MODES: { id: EwiWingoMode; label: string; sec: string }[] = [
  { id: '15s', label: 'Deshi 15s', sec: '15s' },
  { id: '30s', label: 'Deshi 30s', sec: '30s' },
  { id: '1m', label: 'Deshi 1m', sec: '1m' },
  { id: '3m', label: 'Deshi 3m', sec: '3m' }
];

const QUICK_AMOUNTS = [10, 50, 100, 500];
const MULTIPLIERS = [1, 2, 5, 10, 20];

export const EwiWinGo: React.FC = () => {
  const {
    user,
    adminSettings,
    ewiWingoBets,
    marketPools,
    placeEwiWingoBet,
    settleEwiWingoRound,
    popLotteryQueue,
    setActiveTab,
    goBack,
    showToast
  } = useApp();

  const [mode, setMode] = useState<EwiWingoMode>('15s');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [historyTab, setHistoryTab] = useState<'history' | 'mybets'>('history');
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [serverResults, setServerResults] = useState<WinGoResult[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [betSpec, setBetSpec] = useState<{
    type: 'color' | 'number' | 'size';
    value: string | number;
    label: string;
    oddsText: string;
  } | null>(null);
  const [stake, setStake] = useState<number>(10);
  const [multiplier, setMultiplier] = useState<number>(1);

  const settledRef = useRef<Set<string>>(new Set());
  const prevActivePeriodRef = useRef<string>('');
  const adminSettingsRef = useRef(adminSettings);
  adminSettingsRef.current = adminSettings;
  const marketPoolsRef = useRef(marketPools);
  marketPoolsRef.current = marketPools;

  const tzOffset = adminSettings.timezoneOffsetMinutes ?? 360;
  const periodInfo = useMemo(() => getEwiWingoPeriodInfo(mode, nowMs, tzOffset), [mode, nowMs, tzOffset]);

  useEffect(() => {
    let cancelled = false;
    const loadResults = async () => {
      try {
        const r = await fetch(apiUrl(`/api/lottery/results?key=${encodeURIComponent(`ewi_wingo_${mode}`)}`), { cache: 'no-store' });
        const ct = r.headers.get('content-type') || '';
        if (r.ok && ct.includes('application/json')) {
          const data = await r.json().catch(() => null);
          if (!cancelled && data && Array.isArray(data.results)) {
            setServerResults(data.results);
          }
        }
      } catch {}
    };
    loadResults();
    const poll = setInterval(loadResults, 2500);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [mode]);

  const historyRows = useMemo(() => {
    const base = getSyncedEwiWingoHistory(mode, 10, nowMs, tzOffset);
    if (serverResults.length === 0) return base;
    const map = new Map<string, WinGoResult>();
    serverResults.forEach((r) => {
      if (r?.periodNumber) map.set(r.periodNumber, r);
    });
    return base.map((row) => map.get(row.periodNumber) || row);
  }, [mode, nowMs, tzOffset, serverResults]);

  useEffect(() => {
    const iv = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(iv);
  }, []);

  const resolveModeRoundOutcome = (m: EwiWingoMode, p: string): number => {
    const curSettings = adminSettingsRef.current;
    const queuedList = curSettings.queuedEwiWingoOutcomes?.[m] || [];
    const queuedNum = typeof queuedList[0] === 'number' ? queuedList[0] : undefined;
    const forcedOutcome = curSettings.nextEwiWingoOutcomes?.[m] ?? 'AUTO';
    const forcedResolved = resolveForcedEwiWingoNumber(m, p, forcedOutcome, queuedNum);
    if (forcedResolved !== null) {
      if (typeof queuedNum === 'number') {
        popLotteryQueue('ewi_wingo', m);
      }
      return forcedResolved;
    }

    const poolEntry = marketPoolsRef.current?.[`ewi_wingo_${m}_${p}`];
    const poolBets: Array<{ type: 'color' | 'number' | 'size'; value: string | number; totalAmount: number }> = poolEntry
      ? Object.entries(poolEntry.selections || {}).map(([k, total]) => {
          const sep = k.indexOf(':');
          const bType = (sep >= 0 ? k.slice(0, sep) : 'color') as 'color' | 'number' | 'size';
          const rawVal = sep >= 0 ? k.slice(sep + 1) : k;
          return {
            type: bType,
            value: bType === 'number' ? Number(rawVal) : rawVal,
            totalAmount: Number(total) || 0
          };
        })
      : [];
    const localRoundBets = ewiWingoBets
      .filter((x) => x.mode === m && x.periodNumber === p && x.status === 'pending')
      .map((rb) => ({ type: rb.type, value: rb.value, totalAmount: rb.totalAmount }));
    const merged = poolBets.length > 0 ? poolBets : localRoundBets;
    const controlMode = curSettings.gameControlModes?.ewiWingo || 'HIGH_BET_LOSS';
    return resolveControlledEwiWingoNumber(m, p, controlMode, merged);
  };

  useEffect(() => {
    // Also persist settled row whenever the active mode period transitions
    if (prevActivePeriodRef.current && prevActivePeriodRef.current !== periodInfo.period) {
      const prevP = prevActivePeriodRef.current;
      const key = `${mode}:${prevP}`;
      if (!settledRef.current.has(key)) {
        settledRef.current.add(key);
        const resolvedNum = resolveModeRoundOutcome(mode, prevP);
        const meta = getEwiWingoNumberMeta(resolvedNum);
        const settledRow: WinGoResult = {
          periodNumber: prevP,
          number: resolvedNum,
          color: meta.color,
          size: meta.size,
          time: formatTimeWithOffset(nowMs, tzOffset),
          source: 'local'
        };
        setServerResults((prev) => [settledRow, ...prev.filter((r) => r.periodNumber !== prevP)].slice(0, 20));
        fetch(apiUrl('/api/lottery/results'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: `ewi_wingo_${mode}`, result: settledRow })
        }).catch(() => {});
        settleEwiWingoRound(mode, prevP, resolvedNum);
      }
    }
    prevActivePeriodRef.current = periodInfo.period;

    const pendingByPeriod = new Map<string, { mode: EwiWingoMode; periodNumber: string }>();
    for (const b of ewiWingoBets) {
      if (b.status !== 'pending' || b.userId !== user.id) continue;
      const activeForMode = getEwiWingoPeriodInfo(b.mode, nowMs, tzOffset).period;
      if (b.periodNumber !== activeForMode) {
        const key = `${b.mode}:${b.periodNumber}`;
        if (!settledRef.current.has(key)) {
          pendingByPeriod.set(key, { mode: b.mode, periodNumber: b.periodNumber });
        }
      }
    }

    if (pendingByPeriod.size > 0) {
      pendingByPeriod.forEach(({ mode: m, periodNumber: p }, key) => {
        settledRef.current.add(key);
        const resolvedNum = resolveModeRoundOutcome(m, p);
        const meta = getEwiWingoNumberMeta(resolvedNum);
        const settledRow: WinGoResult = {
          periodNumber: p,
          number: resolvedNum,
          color: meta.color,
          size: meta.size,
          time: formatTimeWithOffset(nowMs, tzOffset),
          source: 'local'
        };
        if (m === mode) {
          setServerResults((prev) => [settledRow, ...prev.filter((r) => r.periodNumber !== p)].slice(0, 20));
        }
        fetch(apiUrl('/api/lottery/results'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: `ewi_wingo_${m}`, result: settledRow })
        }).catch(() => {});
        settleEwiWingoRound(m, p, resolvedNum);
      });
    }
  }, [nowMs, periodInfo.period, mode, ewiWingoBets, user.id, tzOffset]);

  const isLocked = periodInfo.timeRemaining <= 5;

  useEffect(() => {
    if (isLocked && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [isLocked, drawerOpen]);

  const openBetDrawer = (
    type: 'color' | 'number' | 'size',
    value: string | number,
    label: string,
    oddsText: string
  ) => {
    if (isLocked) {
      showToast('Betting closed for final 5 seconds!');
      return;
    }
    setBetSpec({ type, value, label, oddsText });
    setStake(10);
    setMultiplier(1);
    setDrawerOpen(true);
  };

  const handleConfirmBet = () => {
    if (!betSpec) return;
    if (isLocked) {
      showToast('Round locked! Wait for next period.');
      return;
    }
    const res = placeEwiWingoBet(mode, periodInfo.period, betSpec.type, betSpec.value, stake, multiplier);
    if (res.success) {
      setDrawerOpen(false);
    } else {
      showToast(res.message);
    }
  };

  const myBets = useMemo(
    () => ewiWingoBets.filter((b) => !user.id || b.userId === user.id).slice(0, 20),
    [ewiWingoBets, user.id]
  );

  const remMins = Math.floor(periodInfo.timeRemaining / 60);
  const remSecs = periodInfo.timeRemaining % 60;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <div className="sticky top-0 z-30 bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <button
          type="button"
          onClick={() => goBack('home')}
          className="relative z-20 p-2 -ml-1.5 min-w-[40px] min-h-[40px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div className="flex flex-col items-center justify-center">
          <Ewi777Logo height={38} logoUrl={adminSettings.appLogoUrl} />
          <div className="text-[10px] font-bold text-cyan-100 mt-0.5">
            Deshi WinGo • Min ৳10
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setNowMs(Date.now());
            showToast('Market synced');
          }}
          className="p-2 rounded-full bg-white/15 hover:bg-white/25 active:rotate-180 transition-transform"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-3.5">
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Playable Balance
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xl font-black text-slate-900 tabular-nums">
                ৳{Math.max(0, (user.balance || 0) - (user.lockedBalance || 0)).toFixed(2)}
              </div>
              {(user.lockedBalance || 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-extrabold text-amber-800 tabular-nums">
                  Hold: ৳{(user.lockedBalance || 0).toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('deposit');
              window.location.hash = '#/deposit';
            }}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-sm active:scale-95"
          >
            Deposit
          </button>
        </div>

        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 grid grid-cols-4 gap-1.5 shadow-2xs">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`py-2.5 rounded-xl text-center transition-all active:scale-95 ${
                  active
                    ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-cyan-50'
                }`}
              >
                <div className="text-xs font-black">{m.sec}</div>
                <div className={`text-[9px] font-bold ${active ? 'text-cyan-100' : 'text-slate-500'}`}>
                  {m.label}
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-white/15 px-2.5 py-0.5 rounded-full text-amber-200">
                <Clock className="w-3 h-3" />
                <span>Deshi WinGo {mode}</span>
              </div>
              <div className="text-[11px] font-semibold text-cyan-100 mt-1.5 flex items-center gap-1">
                <span>Period Number</span>
              </div>
              <div className="text-sm font-mono font-black tracking-wider tabular-nums">
                {periodInfo.period}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-cyan-100 uppercase tracking-wider mb-1">
              {isLocked ? 'Drawing...' : 'Time Remaining'}
            </div>
            <div className="flex items-center gap-1 justify-end font-mono text-2xl font-black tabular-nums">
              <span className="bg-white text-slate-900 px-2 py-1 rounded-xl shadow-xs">
                {String(remMins).padStart(2, '0')}
              </span>
              <span className="text-cyan-200">:</span>
              <span
                className={`px-2 py-1 rounded-xl shadow-xs ${
                  isLocked
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-white text-slate-900'
                }`}
              >
                {String(remSecs).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-xs space-y-3 relative">
          {isLocked && (
            <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center text-white">
              <div className="text-4xl font-black text-cyan-300 tabular-nums animate-bounce">
                {periodInfo.timeRemaining}
              </div>
              <div className="text-xs font-black uppercase tracking-widest mt-1">
                Settling Round...
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => openBetDrawer('color', 'green', 'Green', '1.89X')}
              className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm active:scale-95"
            >
              Green · 1.89X
            </button>
            <button
              type="button"
              onClick={() => openBetDrawer('color', 'violet', 'Violet', '4.5X')}
              className="py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-sm active:scale-95"
            >
              Violet · 4.5X
            </button>
            <button
              type="button"
              onClick={() => openBetDrawer('color', 'red', 'Red', '1.89X')}
              className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-sm active:scale-95"
            >
              Red · 1.89X
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const { color } = getEwiWingoNumberMeta(num);
              const bg =
                color === 'red-violet'
                  ? 'from-rose-500 via-rose-500 to-purple-600'
                  : color === 'green-violet'
                  ? 'from-emerald-500 via-emerald-500 to-purple-600'
                  : color === 'green'
                  ? 'from-emerald-500 to-emerald-700'
                  : 'from-rose-500 to-rose-700';
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => openBetDrawer('number', num, `Number ${num}`, '9X')}
                  className={`h-11 rounded-full bg-gradient-to-br ${bg} text-white font-black text-base shadow-sm active:scale-90 transition-transform flex items-center justify-center border-2 border-white`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => openBetDrawer('size', 'big', 'Big (5-9)', '1.89X')}
              className="py-3 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-sm active:scale-95"
            >
              BIG · 1.89X
            </button>
            <button
              type="button"
              onClick={() => openBetDrawer('size', 'small', 'Small (0-4)', '1.89X')}
              className="py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black text-sm shadow-sm active:scale-95"
            >
              SMALL · 1.89X
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="grid grid-cols-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setHistoryTab('history')}
              className={`py-3 text-xs font-black transition-colors ${
                historyTab === 'history'
                  ? 'bg-cyan-50 text-[#0891B2] border-b-2 border-[#0891B2]'
                  : 'text-slate-500'
              }`}
            >
              Recent 10 Results
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('mybets')}
              className={`py-3 text-xs font-black transition-colors ${
                historyTab === 'mybets'
                  ? 'bg-cyan-50 text-[#0891B2] border-b-2 border-[#0891B2]'
                  : 'text-slate-500'
              }`}
            >
              My Bets ({myBets.length})
            </button>
          </div>

          {historyTab === 'history' ? (
            <div className="divide-y divide-slate-100 text-xs">
              <div className="grid grid-cols-4 px-3 py-2 bg-slate-50 text-[10px] font-black uppercase text-slate-500 text-center">
                <div className="text-left">Period</div>
                <div>Number</div>
                <div>Big/Small</div>
                <div>Color</div>
              </div>
              {historyRows.map((row) => (
                <div key={row.periodNumber} className="grid grid-cols-4 px-3 py-2.5 items-center text-center">
                  <div className="text-left font-mono text-[11px] font-bold text-slate-600 truncate">
                    {row.periodNumber.slice(-7)}
                  </div>
                  <div
                    className={`font-black text-base tabular-nums ${
                      row.color.includes('green') ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {row.number}
                  </div>
                  <div className="font-bold text-slate-700 capitalize">{row.size}</div>
                  <div className="flex items-center justify-center gap-1">
                    {row.color.includes('green') && <span className="w-3 h-3 rounded-full bg-emerald-500" />}
                    {row.color.includes('red') && <span className="w-3 h-3 rounded-full bg-rose-500" />}
                    {row.color.includes('violet') && <span className="w-3 h-3 rounded-full bg-purple-600" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 space-y-2.5">
              {myBets.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-semibold">
                  No Deshi WinGo bets placed yet.
                </div>
              ) : (
                myBets.map((b) => {
                  const matchedRow =
                    b.resultNumber !== undefined
                      ? {
                          number: b.resultNumber,
                          color: b.resultColor || ('green' as const),
                          size: b.resultSize || ('small' as const)
                        }
                      : historyRows.find((r) => r.periodNumber === b.periodNumber);
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
                  return (
                    <LotteryTradeDetailCard
                      key={b.id}
                      isExpanded={expandedBetId === b.id}
                      onToggle={() => setExpandedBetId((prev) => (prev === b.id ? null : b.id))}
                      onCopyOrderNumber={() => showToast('Order number copied!')}
                      item={{
                        id: b.id,
                        orderNumber: b.orderNumber || buildLotteryOrderNumber('DW', b.id),
                        periodNumber: b.periodNumber,
                        orderTime: b.orderTime || fallbackOrderTimestamp(b.periodNumber, b.time, tzOffset),
                        purchaseAmount: b.totalAmount,
                        quantity: b.multiplier || 1,
                        selectionShort: shortLabel,
                        selectionFull: `${b.mode.toUpperCase()} • ${b.type === 'number' ? `Number ${valStr}` : shortLabel}`,
                        selectionTone: tone,
                        status: b.status,
                        winAmount: b.winAmount,
                        countdownSec:
                          b.mode === mode && b.periodNumber === periodInfo.period && b.status === 'pending'
                            ? periodInfo.timeRemaining
                            : undefined,
                        gameKind: 'ewi_wingo',
                        wingoResult: matchedRow
                          ? { number: matchedRow.number, color: matchedRow.color, size: matchedRow.size }
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

      {drawerOpen && betSpec && !isLocked && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center">
          <div className="w-full max-w-md bg-white border-t border-slate-200 rounded-t-3xl p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-[#0891B2]">
                  Deshi WinGo {mode}
                </div>
                <div className="text-base font-black text-slate-900">
                  Select: {betSpec.label} ({betSpec.oddsText})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-600">
                  Amount (Min ৳10)
                </span>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <span className="text-xs font-black text-[#0891B2]">৳</span>
                  <input
                    type="number"
                    min={10}
                    value={stake || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setStake(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    onBlur={() => {
                      if (!stake || stake < 10) setStake(10);
                    }}
                    className="w-20 bg-transparent text-right font-mono font-black text-sm text-slate-900 focus:outline-none tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStake(amt)}
                    className={`py-2 rounded-xl text-xs font-black border ${
                      stake === amt
                        ? 'bg-[#0891B2] text-white border-[#0891B2]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    ৳{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-600">Multiplier</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMultiplier((m) => Math.max(1, m - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-black text-base flex items-center justify-center"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={multiplier || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setMultiplier(isNaN(val) ? 1 : Math.min(999, Math.max(1, val)));
                    }}
                    className="w-14 h-8 rounded-lg border border-slate-200 bg-white text-center font-mono font-black text-sm text-slate-900 focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setMultiplier((m) => Math.min(999, m + 1))}
                    className="w-8 h-8 rounded-lg bg-[#0891B2] text-white font-black text-base flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {MULTIPLIERS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMultiplier(m)}
                    className={`py-2 rounded-xl text-xs font-black border ${
                      multiplier === m
                        ? 'bg-[#0891B2] text-white border-[#0891B2]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {m}X
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmBet}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-md active:scale-98 flex items-center justify-center gap-2 tabular-nums"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Total Bet ৳{(Math.max(10, stake) * Math.max(1, multiplier)).toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
