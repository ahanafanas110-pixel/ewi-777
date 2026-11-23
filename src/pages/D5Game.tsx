import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { D5Mode, D5Result } from '../types';
import {
  ArrowLeft,
  Bell,
  Volume2,
  RefreshCw,
  HelpCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Lock
} from 'lucide-react';
import { Ewi777Logo, CustomerServiceLogo } from '../components/BrandLogos';
import { AnimatedHoneyBee, HoneycombHiveHome } from '../components/HoneyBeeVisuals';
import { computeDailyIssueInfo, nextIssueFromLatest } from '../utils/lotteryApi';
import {
  formatTimeWithOffset,
  getSyncedD5History,
  resolveControlledD5Digits
} from '../utils/syncedMarkets';

export const D5Game: React.FC = () => {
  const {
    user,
    adminSettings,
    d5Bets,
    marketPools,
    placeD5Bet,
    settleD5Round,
    setActiveTab,
    showToast,
    syncServerDataNow,
    unreadNotificationsCount,
    setIsNotificationOpen,
    markNotificationsRead
  } = useApp();

  const [mode, setMode] = useState<D5Mode>('1m');
  const [periodInfo, setPeriodInfo] = useState(() => computeDailyIssueInfo('d5', '1m'));
  const [apiPeriod, setApiPeriod] = useState<string>('');
  const [history, setHistory] = useState<D5Result[]>([]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollingDigits, setRollingDigits] = useState<[number, number, number, number, number]>([
    0, 3, 2, 7, 1
  ]);
  const [selectedPos, setSelectedPos] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'SUM'>('A');
  const [chartPos, setChartPos] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [activeRecordTab, setActiveRecordTab] = useState<'history' | 'chart' | 'my'>('history');
  const [page, setPage] = useState<number>(1);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  const [betSlip, setBetSlip] = useState<{
    betType: 'size' | 'parity' | 'digit';
    selection: string;
    label: string;
    payoutRate: number;
  } | null>(null);
  const [betBaseAmount, setBetBaseAmount] = useState<number>(10);
  const [betMultiplier, setBetMultiplier] = useState<number>(1);

  const activePeriodRef = useRef<string>('');
  const lastLatestIssueRef = useRef<string>('');
  const prevRemRef = useRef<number>(periodInfo.rem);
  const d5BetsRef = useRef(d5Bets);
  const marketPoolsRef = useRef(marketPools);
  const settleD5Ref = useRef(settleD5Round);
  const controlModeRef = useRef(adminSettings.gameControlModes?.d5 || 'AUTO');
  const tzOffsetRef = useRef(adminSettings.timezoneOffsetMinutes ?? 360);

  useEffect(() => {
    d5BetsRef.current = d5Bets;
    marketPoolsRef.current = marketPools;
    settleD5Ref.current = settleD5Round;
    controlModeRef.current = adminSettings.gameControlModes?.d5 || 'AUTO';
    tzOffsetRef.current = adminSettings.timezoneOffsetMinutes ?? 360;
  }, [d5Bets, marketPools, settleD5Round, adminSettings.gameControlModes, adminSettings.timezoneOffsetMinutes]);

  useEffect(() => {
    if (!isRolling) return;
    let frame = 0;
    const spinId = setInterval(() => {
      frame += 1;
      setRollingDigits([
        (frame * 3) % 10,
        (frame * 7 + 1) % 10,
        (frame * 9 + 4) % 10,
        (frame * 3 + 7) % 10,
        (frame * 7 + 2) % 10
      ]);
    }, 85);
    return () => clearInterval(spinId);
  }, [isRolling]);

  useEffect(() => {
    setPage(1);
    setApiPeriod('');
    setIsRolling(false);
    const info = computeDailyIssueInfo('d5', mode);
    setPeriodInfo(info);
    activePeriodRef.current = info.period;
    prevRemRef.current = info.rem;

    const initialList = getSyncedD5History(mode, info.period, 50, Date.now());
    setHistory(initialList);
    if (initialList[0]?.periodNumber) {
      lastLatestIssueRef.current = initialList[0].periodNumber;
    }

    const timer = setInterval(() => {
      const next = computeDailyIssueInfo('d5', mode);
      setPeriodInfo(next);
      const rolledOver = next.rem > prevRemRef.current;
      prevRemRef.current = next.rem;

      if (rolledOver) {
        const resolvingPeriod = activePeriodRef.current || next.period;
        const nextPeriodStr = nextIssueFromLatest(resolvingPeriod) || next.period;
        activePeriodRef.current = nextPeriodStr;
        setApiPeriod(nextPeriodStr);
        setBetSlip(null);
        setIsRolling(true);

        const activeLocalBets = d5BetsRef.current
          .filter((b) => b.mode === mode && b.periodNumber === resolvingPeriod && b.status === 'pending')
          .map((b) => ({
            position: b.position,
            betType: b.betType,
            selection: b.selection,
            totalAmount: b.totalAmount
          }));

        const poolEntry = marketPoolsRef.current?.[`d5_${mode}_${resolvingPeriod}`];
        const poolBets = poolEntry
          ? Object.entries(poolEntry.selections || {}).map(([key, total]) => {
              const parts = key.split(':');
              return {
                position: parts[0] || 'A',
                betType: parts[1] || 'size',
                selection: parts.slice(2).join(':') || 'Big',
                totalAmount: Number(total) || 0
              };
            })
          : [];

        const mergedBets = poolBets.length > 0 ? poolBets : activeLocalBets;
        const drawnDigits = resolveControlledD5Digits(
          mode,
          resolvingPeriod,
          controlModeRef.current,
          mergedBets
        );

        setTimeout(() => {
          const sum = drawnDigits.reduce((a, b) => a + b, 0);
          const newRow: D5Result = {
            periodNumber: resolvingPeriod,
            digits: drawnDigits,
            sum,
            size: sum >= 23 ? 'Big' : 'Small',
            parity: sum % 2 === 0 ? 'Even' : 'Odd',
            time: formatTimeWithOffset(Date.now(), tzOffsetRef.current)
          };
          setHistory((prev) => [newRow, ...prev.filter((r) => r.periodNumber !== resolvingPeriod)].slice(0, 50));
          lastLatestIssueRef.current = resolvingPeriod;
          settleD5Ref.current(mode, resolvingPeriod, drawnDigits);
          setIsRolling(false);
        }, 1250);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [mode]);

  const currentDisplayPeriod = apiPeriod || periodInfo.period;
  const isLocked = periodInfo.rem <= 5;
  const latestDigits: [number, number, number, number, number] = isRolling
    ? rollingDigits
    : history[0]?.digits || [0, 3, 2, 7, 1];
  const latestSum = latestDigits.reduce((a, b) => a + b, 0);
  const minStr = String(Math.floor(periodInfo.rem / 60)).padStart(2, '0');
  const secStr = String(periodInfo.rem % 60).padStart(2, '0');

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const pagedHistory = history.slice((page - 1) * pageSize, page * pageSize);
  const myModeBets = d5Bets.filter((b) => b.mode === mode);

  const openSlip = (betType: 'size' | 'parity' | 'digit', selection: string, label: string, payoutRate: number) => {
    if (isLocked) {
      showToast('Betting locked for final 5 seconds');
      return;
    }
    setBetBaseAmount(10);
    setBetMultiplier(1);
    setBetSlip({ betType, selection, label, payoutRate });
  };

  const confirmBet = () => {
    if (!betSlip) return;
    const res = placeD5Bet(
      mode,
      currentDisplayPeriod,
      selectedPos,
      betSlip.betType,
      betSlip.selection,
      betBaseAmount,
      betMultiplier,
      betSlip.payoutRate
    );
    if (!res.success) {
      showToast(res.message);
      return;
    }
    showToast(`Hney 5D Bet placed: ${selectedPos} ${betSlip.label}`);
    setBetSlip(null);
  };

  const posIdxMap: Record<'A' | 'B' | 'C' | 'D' | 'E', number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  const cIdx = posIdxMap[chartPos];
  const chartStats = Array.from({ length: 10 }, (_, digit) => {
    let missing = 0;
    let foundFirst = false;
    let freq = 0;
    let maxConsec = 0;
    let curConsec = 0;
    let gapRun = 0;
    const gaps: number[] = [];

    for (const r of history) {
      const val = r.digits[cIdx];
      if (val === digit) {
        freq += 1;
        curConsec += 1;
        if (curConsec > maxConsec) maxConsec = curConsec;
        if (!foundFirst) {
          foundFirst = true;
        }
        gaps.push(gapRun);
        gapRun = 0;
      } else {
        curConsec = 0;
        if (!foundFirst) missing += 1;
        gapRun += 1;
      }
    }
    const avgMissing =
      gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : missing;
    return { digit, missing, avgMissing, freq, maxConsec };
  });

  const chartRows = history.slice(0, 12);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] px-4 pt-3 pb-8 text-white rounded-b-[2rem] shadow-md">
        <div className="relative flex items-center justify-between min-h-[62px] mb-4">
          <button
            onClick={() => {
              setActiveTab('home');
              window.location.hash = '#/';
            }}
            className="relative z-10 p-1 -ml-1 text-white hover:opacity-80 active:scale-95"
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
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-cyan-300 text-[#0B2235] text-[9px] font-black flex items-center justify-center">
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
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-xs"
            >
              <CustomerServiceLogo size={24} />
            </button>
            <button onClick={() => showToast('Game audio toggled')} className="p-1 text-white/90">
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 text-slate-800 shadow-md border border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
              ৳{user.balance.toFixed(2)}
            </span>
            <button
              onClick={() => {
                syncServerDataNow();
                showToast('Wallet balance refreshed');
              }}
              className="text-slate-400 hover:text-[#0891B2] active:rotate-180 transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center text-xs font-semibold text-slate-500 mb-4">Wallet balance</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setActiveTab('wallet');
                window.location.hash = '#/wallet';
              }}
              className="py-3 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-extrabold text-sm shadow-xs active:scale-98"
            >
              Withdraw
            </button>
            <button
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="py-3 rounded-full bg-emerald-600 text-white font-extrabold text-sm shadow-xs active:scale-98"
            >
              Deposit
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200 grid grid-cols-4 gap-1.5">
          {(['1m', '3m', '5m', '10m'] as D5Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2 px-1 rounded-xl text-xs font-black text-center transition-all ${
                mode === m
                  ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-cyan-50'
              }`}
            >
              Hney 5D {m === '1m' ? '1Min' : m === '3m' ? '3Min' : m === '5m' ? '5Min' : '10Min'}
            </button>
          ))}
        </div>

        <HoneycombHiveHome
          variant="pill"
          title={`Hney 5D Hive • ${mode.toUpperCase()} Draw`}
          subtitle="5-Digit Golden Honeycombs • Live Synced Results"
        />

        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <span>Lottery results</span>
              <AnimatedHoneyBee size={16} flight="hover" delayMs={180} />
            </span>
            <div className="flex items-center gap-1.5">
              {(['A', 'B', 'C', 'D', 'E'] as const).map((letter, idx) => (
                <div key={letter} className="flex flex-col items-center">
                  <span className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs flex items-center justify-center tabular-nums">
                    {latestDigits[idx]}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 mt-0.5">{letter}</span>
                </div>
              ))}
              <span className="text-xs font-black text-slate-400 mb-3">=</span>
              <div className="flex flex-col items-center">
                <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs flex items-center justify-center shadow-xs tabular-nums">
                  {latestSum}
                </span>
                <span className="text-[9px] font-bold text-transparent mt-0.5">S</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Period</span>
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="px-2.5 py-0.5 rounded-full border border-cyan-300 text-[#0891B2] text-[10px] font-bold flex items-center gap-1 hover:bg-cyan-50 active:scale-95"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>How to play</span>
                </button>
              </div>
              <div className="text-lg font-black text-slate-900 tabular-nums tracking-tight mt-0.5">
                {currentDisplayPeriod}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-[#0891B2]" />
                <span>Time remaining</span>
              </div>
              <div className="flex items-center gap-1">
                {[minStr[0], minStr[1], ':', secStr[0], secStr[1]].map((ch, i) =>
                  ch === ':' ? (
                    <span key={i} className="font-mono font-black text-lg text-[#F95959] px-0.5">:</span>
                  ) : (
                    <span
                      key={i}
                      className={`w-6 h-7 rounded-md bg-slate-100 border border-slate-200 font-mono font-black text-base flex items-center justify-center tabular-nums ${
                        isLocked ? 'text-[#F95959] animate-pulse' : 'text-[#F95959]'
                      }`}
                    >
                      {ch}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl p-[9px] bg-gradient-to-b from-[#00B86B] via-[#009F57] to-[#008946] border border-[#4ADE80]/50 shadow-[0_6px_14px_rgba(0,137,70,0.28)]">
            <svg
              width="14"
              height="24"
              viewBox="0 0 14 24"
              className="pointer-events-none absolute -left-[1px] top-1/2 -translate-y-1/2 z-10 drop-shadow-xs"
            >
              <polygon points="0,0 14,12 0,24" fill="#00C06E" />
            </svg>
            <svg
              width="14"
              height="24"
              viewBox="0 0 14 24"
              className="pointer-events-none absolute -right-[1px] top-1/2 -translate-y-1/2 z-10 drop-shadow-xs"
            >
              <polygon points="14,0 0,12 14,24" fill="#00C06E" />
            </svg>
            <div className="bg-[#003F23] rounded-xl p-[6px] grid grid-cols-5 gap-1.5 shadow-[inset_0_3px_8px_rgba(0,0,0,0.5)]">
              {latestDigits.map((d, idx) => (
                <div
                  key={idx}
                  className="h-20 rounded-[10px] bg-gradient-to-b from-[#64748B] via-[#F1F5F9] to-[#64748B] flex items-center justify-center shadow-[inset_0_5px_9px_rgba(0,0,0,0.32),inset_0_-5px_9px_rgba(0,0,0,0.3)]"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shadow-xs tabular-nums transition-transform ${
                      isRolling ? 'animate-pulse scale-105' : ''
                    } ${idx === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    {d}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 relative overflow-hidden space-y-4">
          {isLocked && (
            <div className="absolute inset-0 z-20 bg-black/55 backdrop-blur-[1.5px] flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-3">
                <div className="w-20 h-28 rounded-2xl bg-white shadow-xl flex items-center justify-center text-6xl font-black text-[#0891B2]">
                  0
                </div>
                <div className="w-20 h-28 rounded-2xl bg-white shadow-xl flex items-center justify-center text-6xl font-black text-[#0891B2]">
                  {periodInfo.rem}
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-black/60 text-cyan-200 text-[11px] font-black flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Drawing result...</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-6 gap-1.5 border-b border-slate-100 pb-2.5">
            {(['A', 'B', 'C', 'D', 'E', 'SUM'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPos(pos)}
                className={`py-2 rounded-t-xl font-black text-xs transition-all ${
                  selectedPos === pos
                    ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => openSlip('size', 'Big', selectedPos === 'SUM' ? 'Big (>=23)' : 'Big (5-9)', 2)}
              className="py-2.5 rounded-xl bg-gradient-to-b from-[#06B6D4] to-[#0891B2] text-white font-black text-xs shadow-xs active:scale-95"
            >
              Big 2X
            </button>
            <button
              onClick={() => openSlip('size', 'Small', selectedPos === 'SUM' ? 'Small (<=22)' : 'Small (0-4)', 2)}
              className="py-2.5 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 text-white font-black text-xs shadow-xs active:scale-95"
            >
              Small 2X
            </button>
            <button
              onClick={() => openSlip('parity', 'Odd', 'Odd', 2)}
              className="py-2.5 rounded-xl bg-gradient-to-b from-indigo-500 to-purple-600 text-white font-black text-xs shadow-xs active:scale-95"
            >
              Odd 2X
            </button>
            <button
              onClick={() => openSlip('parity', 'Even', 'Even', 2)}
              className="py-2.5 rounded-xl bg-gradient-to-b from-emerald-400 to-green-600 text-white font-black text-xs shadow-xs active:scale-95"
            >
              Even 2X
            </button>
          </div>

          {selectedPos !== 'SUM' && (
            <div className="grid grid-cols-5 gap-3 pt-1 place-items-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button
                  key={d}
                  onClick={() => openSlip('digit', String(d), `Number ${d}`, 9)}
                  className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                >
                  <div className="w-11 h-11 rounded-full border-2 border-cyan-200 bg-cyan-50/50 text-slate-800 font-black text-base flex items-center justify-center hover:border-[#0891B2] hover:text-[#0891B2]">
                    {d}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">9X</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(
              [
                { id: 'history', label: 'Game history' },
                { id: 'chart', label: 'Chart' },
                { id: 'my', label: 'My history' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveRecordTab(t.id)}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeRecordTab === t.id
                    ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeRecordTab === 'history' && (
            <div className="space-y-3">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white">
                    <th className="py-2 px-2 rounded-l-xl font-bold">Period</th>
                    <th className="py-2 px-1 text-center font-bold">Result</th>
                    <th className="py-2 px-2 rounded-r-xl text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedHistory.map((row) => (
                    <tr key={row.periodNumber} className="hover:bg-cyan-50/40">
                      <td className="py-2.5 px-2 font-mono text-[11px] font-bold text-slate-700">
                        {row.periodNumber}
                      </td>
                      <td className="py-2.5 px-1">
                        <div className="flex items-center justify-center gap-1">
                          {row.digits.map((d, i) => (
                            <span
                              key={i}
                              className="w-5 h-5 rounded-full border border-slate-200 bg-white text-[10px] font-black text-slate-700 flex items-center justify-center"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span className="inline-flex w-6 h-6 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-[11px] font-black items-center justify-center">
                          {row.sum}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg bg-cyan-50 text-[#0891B2] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-extrabold text-slate-600">
                  {page}/{totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeRecordTab === 'chart' && (
            <div className="space-y-3">
              <div className="flex gap-1.5">
                {(['A', 'B', 'C', 'D', 'E'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPos(p)}
                    className={`w-8 h-8 rounded-t-xl font-black text-xs ${
                      chartPos === p ? 'bg-[#0891B2] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="text-[10px] space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 overflow-x-auto">
                <div className="font-bold text-slate-700 mb-1">Statistic (last {history.length} Periods)</div>
                {[
                  { label: 'Missing', key: 'missing' as const },
                  { label: 'Avg missing', key: 'avgMissing' as const },
                  { label: 'Frequency', key: 'freq' as const },
                  { label: 'Max consec', key: 'maxConsec' as const }
                ].map((metric) => (
                  <div key={metric.key} className="grid grid-cols-[68px_repeat(10,1fr)] items-center gap-0.5 text-center">
                    <span className="text-left font-bold text-slate-500">{metric.label}</span>
                    {chartStats.map((st) => (
                      <span key={st.digit} className="font-mono font-bold text-slate-700">
                        {st[metric.key]}
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              <div className="relative overflow-x-auto">
                <svg
                  className="pointer-events-none absolute top-7 right-[44px] left-[92px] h-[calc(100%-28px)] w-[calc(100%-136px)] z-0"
                  viewBox={`0 0 200 ${Math.max(1, chartRows.length) * 32}`}
                  preserveAspectRatio="none"
                >
                  {chartRows.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#0891B2"
                      strokeWidth="1.8"
                      points={chartRows
                        .map((r, rIdx) => {
                          const x = r.digits[cIdx] * 20 + 10;
                          const y = rIdx * 32 + 16;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  )}
                </svg>

                <table className="w-full text-[10px] relative z-10">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white">
                      <th className="py-1.5 px-1.5 text-left rounded-l-lg">Period</th>
                      <th className="py-1.5 px-1 text-center">Number</th>
                      <th className="py-1.5 px-1.5 text-right rounded-r-lg">B/S O/E</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chartRows.map((row) => {
                      const val = row.digits[cIdx];
                      const isBig = val >= 5;
                      const isOdd = val % 2 !== 0;
                      return (
                        <tr key={row.periodNumber} className="h-8">
                          <td className="px-1.5 font-mono font-bold text-slate-700">
                            {row.periodNumber.slice(-7)}
                          </td>
                          <td className="px-1">
                            <div className="grid grid-cols-10 gap-0.5 text-center items-center">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                <span
                                  key={n}
                                  className={`w-4 h-4 mx-auto rounded-full flex items-center justify-center font-black text-[9px] ${
                                    val === n
                                      ? 'bg-[#0891B2] text-white shadow-xs'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-1.5 text-right">
                            <div className="inline-flex gap-1">
                              <span
                                className={`w-4 h-4 rounded-full text-white font-black text-[9px] flex items-center justify-center ${
                                  isBig ? 'bg-[#0891B2]' : 'bg-blue-500'
                                }`}
                              >
                                {isBig ? 'B' : 'S'}
                              </span>
                              <span
                                className={`w-4 h-4 rounded-full text-white font-black text-[9px] flex items-center justify-center ${
                                  isOdd ? 'bg-indigo-600' : 'bg-emerald-500'
                                }`}
                              >
                                {isOdd ? 'O' : 'E'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeRecordTab === 'my' && (
            <div className="space-y-2.5">
              {myModeBets.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">No Hney 5D bets placed yet.</div>
              ) : (
                myModeBets.slice(0, 30).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-slate-800">
                        Pos {b.position} • {b.selection}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{b.periodNumber} • {b.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900">৳{b.totalAmount.toFixed(2)}</div>
                      <div
                        className={`text-[10px] font-black uppercase ${
                          b.status === 'won'
                            ? 'text-emerald-600'
                            : b.status === 'lost'
                            ? 'text-slate-400'
                            : 'text-[#0891B2]'
                        }`}
                      >
                        {b.status === 'won' ? `+৳${(b.winAmount || 0).toFixed(2)}` : b.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {betSlip && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-t border-slate-200 rounded-t-3xl p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] -mx-5 -mt-5 px-5 py-3.5 rounded-t-3xl text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-cyan-100">Hney 5D {mode.toUpperCase()} • Pos {selectedPos}</div>
                <div className="text-base font-black">Select: {betSlip.label} ({betSlip.payoutRate}X)</div>
              </div>
              <button onClick={() => setBetSlip(null)} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Balance Unit</span>
              <div className="flex gap-1.5">
                {[1, 10, 100, 1000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setBetBaseAmount(v)}
                    className={`px-3 py-1.5 rounded-xl font-black ${
                      betBaseAmount === v ? 'bg-[#0891B2] text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    ৳{v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBetMultiplier((m) => Math.max(1, m - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-black text-base"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={betMultiplier || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setBetMultiplier(isNaN(val) ? 1 : Math.min(9999, Math.max(1, val)));
                  }}
                  className="w-16 h-8 rounded-xl border border-slate-200 bg-white text-center font-black text-sm text-slate-900 tabular-nums focus:outline-none focus:border-[#0891B2]"
                />
                <button
                  type="button"
                  onClick={() => setBetMultiplier((m) => Math.min(9999, m + 1))}
                  className="w-8 h-8 rounded-xl bg-[#0891B2] text-white font-black text-base"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {[1, 5, 10, 20, 50, 100].map((q) => (
                <button
                  key={q}
                  onClick={() => setBetMultiplier(q)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                    betMultiplier === q ? 'bg-[#0891B2] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  X{q}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => setBetSlip(null)}
                className="py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmBet}
                className="col-span-2 py-3 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs shadow-md"
              >
                Total amount ৳{(betBaseAmount * betMultiplier).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] p-4 text-white text-center font-black text-sm">
              Hney 5D Rules
            </div>
            <div className="p-4 text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>Each round draws 5 numbers (A, B, C, D, E) from 0 to 9 plus their total SUM.</p>
              <p><strong>Positions A-E:</strong> Bet Big (5-9), Small (0-4), Odd, Even at 2X, or exact digit 0-9 at 9X.</p>
              <p><strong>SUM:</strong> Bet Big (&gt;=23), Small (&lt;=22), Odd, or Even on the combined total at 2X.</p>
            </div>
            <div className="p-4 pt-0">
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
