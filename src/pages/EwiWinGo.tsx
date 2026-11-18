import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { EwiWingoMode } from '../types';
import {
  getEwiWingoNumberMeta,
  getEwiWingoPeriodInfo,
  getSyncedEwiWingoHistory,
  resolveControlledEwiWingoNumber
} from '../utils/syncedMarkets';
import { ArrowLeft, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { Ewi777Logo } from '../components/BrandLogos';

const MODES: { id: EwiWingoMode; label: string; sec: string }[] = [
  { id: '15s', label: 'EWI 15s', sec: '15s' },
  { id: '30s', label: 'EWI 30s', sec: '30s' },
  { id: '1m', label: 'EWI 1m', sec: '1m' },
  { id: '3m', label: 'EWI 3m', sec: '3m' }
];

const QUICK_AMOUNTS = [10, 50, 100, 500];
const MULTIPLIERS = [1, 2, 5, 10, 20];

export const EwiWinGo: React.FC = () => {
  const {
    user,
    adminSettings,
    ewiWingoBets,
    placeEwiWingoBet,
    settleEwiWingoRound,
    setActiveTab,
    showToast
  } = useApp();

  const [mode, setMode] = useState<EwiWingoMode>('15s');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [historyTab, setHistoryTab] = useState<'history' | 'mybets'>('history');

  // Bet Drawer
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

  const periodInfo = useMemo(() => getEwiWingoPeriodInfo(mode, nowMs), [mode, nowMs]);
  const historyRows = useMemo(() => getSyncedEwiWingoHistory(mode, 10, nowMs), [mode, nowMs]);

  useEffect(() => {
    const iv = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(iv);
  }, []);

  // Auto-settle any pending EWI WinGo bets as soon as their period ends
  useEffect(() => {
    const pendingByPeriod = new Map<string, { mode: EwiWingoMode; periodNumber: string }>();
    for (const b of ewiWingoBets) {
      if (b.status !== 'pending' || b.userId !== user.id) continue;
      const activeForMode = getEwiWingoPeriodInfo(b.mode, nowMs).period;
      if (b.periodNumber !== activeForMode) {
        const key = `${b.mode}:${b.periodNumber}`;
        if (!settledRef.current.has(key)) {
          pendingByPeriod.set(key, { mode: b.mode, periodNumber: b.periodNumber });
        }
      }
    }

    if (pendingByPeriod.size > 0) {
      const controlMode = adminSettings.gameControlModes?.k3 || 'HIGH_BET_LOSS';
      pendingByPeriod.forEach(({ mode: m, periodNumber: p }, key) => {
        settledRef.current.add(key);
        const roundBets = ewiWingoBets.filter(
          (x) => x.mode === m && x.periodNumber === p && x.status === 'pending'
        );
        const resolvedNum = resolveControlledEwiWingoNumber(
          m,
          p,
          controlMode,
          roundBets.map((rb) => ({
            type: rb.type,
            value: rb.value,
            totalAmount: rb.totalAmount
          }))
        );
        settleEwiWingoRound(m, p, resolvedNum);
      });
    }
  }, [nowMs, ewiWingoBets, user.id, adminSettings.gameControlModes]);

  const isLocked = periodInfo.timeRemaining <= 3;

  const openBetDrawer = (
    type: 'color' | 'number' | 'size',
    value: string | number,
    label: string,
    oddsText: string
  ) => {
    if (isLocked) {
      showToast('Betting closed for final 3 seconds!');
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
    <div className="min-h-screen bg-[#FFFDF7] text-slate-800 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-[#92400E] via-[#D97706] to-[#F59E0B] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="p-1.5 -ml-1 rounded-full bg-white/15 hover:bg-white/25 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center justify-center">
          <Ewi777Logo height={38} logoUrl={adminSettings.appLogoUrl} />
          <div className="text-[10px] font-bold text-amber-100 mt-0.5">
            EWI WinGo • Min ৳10
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
        {/* Wallet Strip */}
        <div className="bg-white rounded-2xl px-4 py-3 border border-amber-200 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Wallet Balance
            </div>
            <div className="text-xl font-black text-slate-900 tabular-nums">
              ৳{user.balance.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('deposit');
              window.location.hash = '#/deposit';
            }}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-xs shadow-sm active:scale-95"
          >
            Deposit
          </button>
        </div>

        {/* Mode Tabs (15s, 30s, 1m, 3m) */}
        <div className="bg-white rounded-2xl p-1.5 border border-amber-100 grid grid-cols-4 gap-1.5 shadow-2xs">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`py-2.5 rounded-xl text-center transition-all active:scale-95 ${
                  active
                    ? 'bg-gradient-to-b from-[#F59E0B] to-[#B45309] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-amber-50'
                }`}
              >
                <div className="text-xs font-black">{m.sec}</div>
                <div className={`text-[9px] font-bold ${active ? 'text-amber-100' : 'text-slate-400'}`}>
                  {m.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Period & Countdown Card */}
        <div className="bg-gradient-to-r from-[#78350F] via-[#B45309] to-[#D97706] rounded-3xl p-4 text-white shadow-md flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-white/15 px-2.5 py-0.5 rounded-full text-amber-100">
              <Clock className="w-3 h-3" />
              <span>EWI WinGo {mode}</span>
            </div>
            <div className="text-[11px] font-semibold text-amber-100 mt-2">Period Number</div>
            <div className="text-sm font-mono font-black tracking-wider tabular-nums">
              {periodInfo.period}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-amber-100 uppercase tracking-wider mb-1">
              {isLocked ? 'Drawing...' : 'Time Remaining'}
            </div>
            <div className="flex items-center gap-1 justify-end font-mono text-2xl font-black tabular-nums">
              <span className="bg-black/30 px-2 py-1 rounded-xl border border-amber-300/30">
                {String(remMins).padStart(2, '0')}
              </span>
              <span className="text-yellow-200">:</span>
              <span
                className={`px-2 py-1 rounded-xl border ${
                  isLocked
                    ? 'bg-red-600 border-red-300 animate-pulse'
                    : 'bg-black/30 border-amber-300/30'
                }`}
              >
                {String(remSecs).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Betting Board */}
        <div className="bg-white rounded-3xl p-3.5 border border-amber-200/80 shadow-xs space-y-3 relative">
          {isLocked && (
            <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center text-white">
              <div className="text-4xl font-black text-amber-300 tabular-nums animate-bounce">
                {periodInfo.timeRemaining}
              </div>
              <div className="text-xs font-black uppercase tracking-widest mt-1">
                Settling Round...
              </div>
            </div>
          )}

          {/* Color Buttons */}
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

          {/* 0-9 Number Grid */}
          <div className="grid grid-cols-5 gap-2 bg-[#FFFDF7] p-2.5 rounded-2xl border border-amber-100">
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

          {/* Big / Small Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => openBetDrawer('size', 'big', 'Big (5-9)', '1.89X')}
              className="py-3 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white font-black text-sm shadow-sm active:scale-95"
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

        {/* History / My Bets Switcher */}
        <div className="bg-white rounded-3xl border border-amber-200/80 shadow-xs overflow-hidden">
          <div className="grid grid-cols-2 border-b border-amber-100">
            <button
              type="button"
              onClick={() => setHistoryTab('history')}
              className={`py-3 text-xs font-black transition-colors ${
                historyTab === 'history'
                  ? 'bg-amber-50 text-[#B45309] border-b-2 border-[#D97706]'
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
                  ? 'bg-amber-50 text-[#B45309] border-b-2 border-[#D97706]'
                  : 'text-slate-500'
              }`}
            >
              My Bets ({myBets.length})
            </button>
          </div>

          {historyTab === 'history' ? (
            <div className="divide-y divide-amber-50 text-xs">
              <div className="grid grid-cols-4 px-3 py-2 bg-[#FFF9EB] text-[10px] font-black uppercase text-slate-500 text-center">
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
            <div className="p-3 space-y-2">
              {myBets.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                  No EWI WinGo bets placed yet.
                </div>
              ) : (
                myBets.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-2xl bg-[#FFFDF7] border border-amber-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-slate-800 capitalize">
                        {b.mode} · {b.type}: {String(b.value)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Period {b.periodNumber.slice(-7)} · Bet ৳{b.totalAmount.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          b.status === 'won'
                            ? 'bg-emerald-100 text-emerald-700'
                            : b.status === 'lost'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {b.status === 'won'
                          ? `+৳${(b.winAmount || 0).toFixed(2)}`
                          : b.status === 'lost'
                          ? 'Lost'
                          : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bet Drawer Modal */}
      {drawerOpen && betSpec && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                  EWI WinGo {mode}
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
              <div className="text-xs font-extrabold text-slate-600">Amount (Min ৳10)</div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStake(amt)}
                    className={`py-2 rounded-xl text-xs font-black border ${
                      stake === amt
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-[#FFFDF7] text-slate-700 border-amber-200'
                    }`}
                  >
                    ৳{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-600">Multiplier</div>
              <div className="grid grid-cols-5 gap-1.5">
                {MULTIPLIERS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMultiplier(m)}
                    className={`py-2 rounded-xl text-xs font-black border ${
                      multiplier === m
                        ? 'bg-slate-900 text-amber-300 border-slate-900'
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
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-sm shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Total Bet ৳{(stake * multiplier).toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
