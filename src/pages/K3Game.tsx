import React, { useState, useEffect, useRef, useId } from 'react';
import { useApp } from '../context/AppContext';
import { K3Mode, K3Result } from '../types';
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
import { computeDailyIssueInfo, nextIssueFromLatest } from '../utils/lotteryApi';
import {
  formatTimeWithOffset,
  getSyncedK3History,
  resolveControlledK3Dice
} from '../utils/syncedMarkets';

const K3_TOTAL_MULTIPLIERS: Record<number, number> = {
  3: 207.36,
  4: 69.12,
  5: 34.56,
  6: 20.74,
  7: 13.83,
  8: 9.88,
  9: 8.3,
  10: 7.68,
  11: 7.68,
  12: 8.3,
  13: 9.88,
  14: 13.83,
  15: 20.74,
  16: 34.56,
  17: 69.12,
  18: 207.36
};

const K3_BALL_STYLES = [
  'from-[#FF6B6B] to-[#E11D48]',
  'from-[#34D399] to-[#059669]',
  'from-[#FF6B6B] to-[#E11D48]',
  'from-[#34D399] to-[#059669]',
  'from-[#FF6B6B] to-[#E11D48]',
  'from-[#34D399] to-[#059669]',
  'from-[#FF6B6B] to-[#E11D48]',
  'from-[#34D399] to-[#059669]'
];

const PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]]
};

const ADJACENT_FACES: Record<number, { top: number; left: number; right: number }> = {
  1: { top: 1, left: 3, right: 5 },
  2: { top: 2, left: 3, right: 1 },
  3: { top: 3, left: 4, right: 6 },
  4: { top: 4, left: 2, right: 6 },
  5: { top: 5, left: 4, right: 6 },
  6: { top: 6, left: 4, right: 5 }
};

function renderFacePips(faceVal: number) {
  const coords = PIP_LAYOUTS[faceVal] || PIP_LAYOUTS[1];
  const isYellow = faceVal === 1 || faceVal === 4;
  const r = faceVal === 1 ? 21 : faceVal === 2 || faceVal === 4 ? 11.5 : 10.5;
  return coords.map(([cx, cy], i) => (
    <circle
      key={i}
      cx={cx}
      cy={cy}
      r={r}
      fill={isYellow ? '#FFE600' : '#FFFFFF'}
    />
  ));
}

const Dice3DSvg: React.FC<{ value: number; size?: number; rolling?: boolean }> = ({
  value,
  size = 64,
  rolling = false
}) => {
  const uid = useId().replace(/:/g, '');
  const v = Math.min(6, Math.max(1, Math.round(value)));
  const faces = ADJACENT_FACES[v] || ADJACENT_FACES[1];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 select-none transition-transform duration-100 ${
        rolling ? 'scale-105 animate-pulse' : ''
      }`}
      style={{ filter: 'drop-shadow(0 5px 6px rgba(0,0,0,0.34))' }}
    >
      <defs>
        <clipPath id={`clip_${uid}`}>
          <path d="M44 13.2 Q50 10 56 13.2 L80 25.8 Q86 29 86 35.5 L86 64.5 Q86 71 80 74.2 L56 86.8 Q50 90 44 86.8 L20 74.2 Q14 71 14 64.5 L14 35.5 Q14 29 20 25.8 Z" />
        </clipPath>
        <linearGradient id={`top_${uid}`} x1="50" y1="10" x2="50" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B78" />
          <stop offset="100%" stopColor="#FF3347" />
        </linearGradient>
        <linearGradient id={`left_${uid}`} x1="14" y1="29" x2="50" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F42539" />
          <stop offset="100%" stopColor="#CC0F24" />
        </linearGradient>
        <linearGradient id={`right_${uid}`} x1="50" y1="48" x2="86" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CA1025" />
          <stop offset="100%" stopColor="#940717" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#clip_${uid})`}>
        <polygon points="50,10 86,29 50,48 14,29" fill={`url(#top_${uid})`} />
        <polygon points="14,29 50,48 50,90 14,71" fill={`url(#left_${uid})`} />
        <polygon points="50,48 86,29 86,71 50,90" fill={`url(#right_${uid})`} />
        <path
          d="M14 29 L50 48 L86 29 M50 48 L50 90"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <g transform="matrix(0.36 0.19 -0.36 0.19 50 10)">
          {renderFacePips(faces.top)}
        </g>
        <g transform="matrix(0.36 0.19 0 0.42 14 29)">
          {renderFacePips(faces.left)}
        </g>
        <g transform="matrix(0.36 -0.19 0 0.42 50 48)">
          {renderFacePips(faces.right)}
        </g>
      </g>
    </svg>
  );
};

export const K3Game: React.FC = () => {
  const {
    user,
    adminSettings,
    k3Bets,
    marketPools,
    placeK3Bet,
    settleK3Round,
    setActiveTab,
    showToast,
    syncServerDataNow,
    unreadNotificationsCount,
    setIsNotificationOpen,
    markNotificationsRead
  } = useApp();

  const [mode, setMode] = useState<K3Mode>('1m');
  const [periodInfo, setPeriodInfo] = useState(() => computeDailyIssueInfo('k3', '1m'));
  const [apiPeriod, setApiPeriod] = useState<string>('');
  const [history, setHistory] = useState<K3Result[]>([]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollingDice, setRollingDice] = useState<[number, number, number]>([1, 5, 6]);
  const [activeBetTab, setActiveBetTab] = useState<'total' | '2same' | '3same' | 'different'>('total');
  const [activeRecordTab, setActiveRecordTab] = useState<'history' | 'chart' | 'my'>('history');
  const [page, setPage] = useState<number>(1);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  const [selected2Match, setSelected2Match] = useState<number[]>([]);
  const [selected2PairTop, setSelected2PairTop] = useState<number[]>([]);
  const [selected2PairBot, setSelected2PairBot] = useState<number[]>([]);
  const [selected3Exact, setSelected3Exact] = useState<number[]>([]);
  const [selected3Any, setSelected3Any] = useState<boolean>(false);
  const [selectedDiff3, setSelectedDiff3] = useState<number[]>([]);
  const [selectedDiffConsec, setSelectedDiffConsec] = useState<boolean>(false);
  const [selectedDiff2, setSelectedDiff2] = useState<number[]>([]);

  const [betSlip, setBetSlip] = useState<{
    betType: string;
    selection: string;
    label: string;
    payoutRate: number;
  } | null>(null);
  const [betBaseAmount, setBetBaseAmount] = useState<number>(10);
  const [betMultiplier, setBetMultiplier] = useState<number>(1);

  const activePeriodRef = useRef<string>('');
  const lastLatestIssueRef = useRef<string>('');
  const prevRemRef = useRef<number>(periodInfo.rem);
  const k3BetsRef = useRef(k3Bets);
  const marketPoolsRef = useRef(marketPools);
  const settleK3Ref = useRef(settleK3Round);
  const controlModeRef = useRef(adminSettings.gameControlModes?.k3 || 'AUTO');
  const tzOffsetRef = useRef(adminSettings.timezoneOffsetMinutes ?? 360);

  useEffect(() => {
    k3BetsRef.current = k3Bets;
    marketPoolsRef.current = marketPools;
    settleK3Ref.current = settleK3Round;
    controlModeRef.current = adminSettings.gameControlModes?.k3 || 'AUTO';
    tzOffsetRef.current = adminSettings.timezoneOffsetMinutes ?? 360;
  }, [k3Bets, marketPools, settleK3Round, adminSettings.gameControlModes, adminSettings.timezoneOffsetMinutes]);

  useEffect(() => {
    if (!isRolling) return;
    let frame = 0;
    const spinId = setInterval(() => {
      frame += 1;
      setRollingDice([
        ((frame * 2) % 6) + 1,
        ((frame * 3 + 2) % 6) + 1,
        ((frame * 5 + 4) % 6) + 1
      ]);
    }, 85);
    return () => clearInterval(spinId);
  }, [isRolling]);

  useEffect(() => {
    setPage(1);
    setApiPeriod('');
    setIsRolling(false);
    const info = computeDailyIssueInfo('k3', mode);
    setPeriodInfo(info);
    activePeriodRef.current = info.period;
    prevRemRef.current = info.rem;

    const initialList = getSyncedK3History(mode, info.period, 50, Date.now());
    setHistory(initialList);
    if (initialList[0]?.periodNumber) {
      lastLatestIssueRef.current = initialList[0].periodNumber;
    }

    const timer = setInterval(() => {
      const next = computeDailyIssueInfo('k3', mode);
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

        const normalizeK3Bet = (betType: string, selection: string, totalAmount: number) => {
          if (betType === 'total_num') return { betType: 'sum', selection, totalAmount };
          if (betType === 'total_prop') {
            return {
              betType: selection === 'Big' || selection === 'Small' ? 'size' : 'parity',
              selection,
              totalAmount
            };
          }
          if (betType === '2same_match' || betType === '2same_pair') {
            return { betType: '2same', selection, totalAmount };
          }
          if (betType === '3same_exact' || betType === '3same_any') {
            return { betType: '3same', selection, totalAmount };
          }
          return { betType: 'diff', selection, totalAmount };
        };

        const activeLocalBets = k3BetsRef.current
          .filter((b) => b.mode === mode && b.periodNumber === resolvingPeriod && b.status === 'pending')
          .map((b) => normalizeK3Bet(b.betType, b.selection, b.totalAmount));

        const poolEntry = marketPoolsRef.current?.[`k3_${mode}_${resolvingPeriod}`];
        const poolBets = poolEntry
          ? Object.entries(poolEntry.selections || {}).map(([key, total]) => {
              const sepIdx = key.indexOf(':');
              const bType = sepIdx >= 0 ? key.slice(0, sepIdx) : 'total_prop';
              const sel = sepIdx >= 0 ? key.slice(sepIdx + 1) : key;
              return normalizeK3Bet(bType, sel, Number(total) || 0);
            })
          : [];

        const mergedBets = poolBets.length > 0 ? poolBets : activeLocalBets;
        const drawnDice = resolveControlledK3Dice(
          mode,
          resolvingPeriod,
          controlModeRef.current,
          mergedBets
        );

        setTimeout(() => {
          const sum = drawnDice[0] + drawnDice[1] + drawnDice[2];
          const uniq = new Set(drawnDice).size;
          const pattern =
            uniq === 1 ? '3 same numbers' : uniq === 2 ? '2 same numbers' : '3 different numbers';
          const newRow: K3Result = {
            periodNumber: resolvingPeriod,
            dice: drawnDice,
            sum,
            size: sum >= 11 ? 'Big' : 'Small',
            parity: sum % 2 === 0 ? 'Even' : 'Odd',
            pattern,
            time: formatTimeWithOffset(Date.now(), tzOffsetRef.current)
          };
          setHistory((prev) => [newRow, ...prev.filter((r) => r.periodNumber !== resolvingPeriod)].slice(0, 50));
          lastLatestIssueRef.current = resolvingPeriod;
          settleK3Ref.current(mode, resolvingPeriod, drawnDice);
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
  const displayedDice: [number, number, number] = isRolling
    ? rollingDice
    : history[0]?.dice || [1, 5, 6];
  const minStr = String(Math.floor(periodInfo.rem / 60)).padStart(2, '0');
  const secStr = String(periodInfo.rem % 60).padStart(2, '0');

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const pagedHistory = history.slice((page - 1) * pageSize, page * pageSize);
  const myModeBets = k3Bets.filter((b) => b.mode === mode);

  const openSlip = (betType: string, selection: string, label: string, payoutRate: number) => {
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
    const res = placeK3Bet(
      mode,
      currentDisplayPeriod,
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
    showToast(`Deshi K3 Bet placed: ${betSlip.label} (৳${(betBaseAmount * betMultiplier).toFixed(2)})`);
    setBetSlip(null);
    setSelected2Match([]);
    setSelected2PairTop([]);
    setSelected2PairBot([]);
    setSelected3Exact([]);
    setSelected3Any(false);
    setSelectedDiff3([]);
    setSelectedDiffConsec(false);
    setSelectedDiff2([]);
  };

  const handleSubmitComboBet = () => {
    if (activeBetTab === '2same') {
      if (selected2Match.length > 0) {
        const d = selected2Match[0];
        openSlip('2same_match', `${d}${d}`, `2 Same (${d}${d})`, 13.83);
        return;
      }
      if (selected2PairTop.length > 0 && selected2PairBot.length > 0) {
        const p = selected2PairTop[0];
        const s = selected2PairBot[0];
        openSlip('2same_pair', `${p}${p}#${s}`, `Pair ${p}${p} + ${s}`, 69.12);
        return;
      }
      showToast('Select matching numbers first');
    } else if (activeBetTab === '3same') {
      if (selected3Exact.length > 0) {
        const d = selected3Exact[0];
        openSlip('3same_exact', `${d}${d}${d}`, `3 Same (${d}${d}${d})`, 207.36);
        return;
      }
      if (selected3Any) {
        openSlip('3same_any', 'ANY', 'Any 3 Same Numbers', 34.56);
        return;
      }
      showToast('Select 3 same option first');
    } else if (activeBetTab === 'different') {
      if (selectedDiff3.length === 3) {
        const sorted = [...selectedDiff3].sort((a, b) => a - b);
        openSlip('diff_3', sorted.join(','), `3 Different (${sorted.join(',')})`, 34.56);
        return;
      }
      if (selectedDiffConsec) {
        openSlip('diff_consec', 'CONSEC', '3 Continuous Numbers', 8.64);
        return;
      }
      if (selectedDiff2.length === 2) {
        const sorted = [...selectedDiff2].sort((a, b) => a - b);
        openSlip('diff_2', sorted.join(','), `2 Different (${sorted.join(',')})`, 6.91);
        return;
      }
      showToast('Pick 3 different, 3 continuous, or 2 different numbers');
    }
  };

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
          {(['1m', '3m', '5m', '10m'] as K3Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2 px-1 rounded-xl text-xs font-black text-center transition-all ${
                mode === m
                  ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-cyan-50'
              }`}
            >
              Deshi K3 {m === '1m' ? '1Min' : m === '3m' ? '3Min' : m === '5m' ? '5Min' : '10Min'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-3.5 relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
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
              <div className="text-lg font-black text-slate-900 tabular-nums tracking-tight mt-1">
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

          <div className="relative rounded-2xl p-[9px] bg-gradient-to-b from-[#00B86B] via-[#009F57] to-[#008946] shadow-[0_6px_14px_rgba(0,137,70,0.28)] border border-[#4ADE80]/50">
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

            <div className="bg-[#003F23] rounded-xl p-[6px] grid grid-cols-3 gap-[6px] shadow-[inset_0_3px_8px_rgba(0,0,0,0.5)]">
              {displayedDice.map((d, idx) => (
                <div
                  key={idx}
                  className="h-[88px] rounded-[10px] relative overflow-hidden bg-gradient-to-b from-[#5A676A] via-[#A0AEB1] to-[#627073] flex items-center justify-center shadow-[inset_0_6px_10px_rgba(0,0,0,0.38),inset_0_-6px_10px_rgba(0,0,0,0.35)] border border-white/15"
                >
                  <Dice3DSvg value={d} size={66} rolling={isRolling} />
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

          <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-2xl">
            {(
              [
                { id: 'total', label: 'Total' },
                { id: '2same', label: '2 same' },
                { id: '3same', label: '3 same' },
                { id: 'different', label: 'Different' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveBetTab(t.id)}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeBetTab === t.id
                    ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeBetTab === 'total' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2.5 place-items-center">
                {Array.from({ length: 16 }, (_, i) => i + 3).map((num) => (
                  <button
                    key={num}
                    onClick={() => openSlip('total_num', String(num), `Total ${num}`, K3_TOTAL_MULTIPLIERS[num])}
                    className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                  >
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-b ${
                        K3_BALL_STYLES[num % 2]
                      } text-white font-black text-lg flex items-center justify-center shadow-md border-2 border-white`}
                    >
                      {num}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {K3_TOTAL_MULTIPLIERS[num]}X
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => openSlip('total_prop', 'Big', 'Big (11-18)', 2)}
                  className="py-2.5 rounded-xl bg-gradient-to-b from-[#06B6D4] to-[#0891B2] text-white font-black text-xs shadow-xs active:scale-95"
                >
                  <div>Big</div>
                  <div className="text-[10px] opacity-90">2X</div>
                </button>
                <button
                  onClick={() => openSlip('total_prop', 'Small', 'Small (3-10)', 2)}
                  className="py-2.5 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 text-white font-black text-xs shadow-xs active:scale-95"
                >
                  <div>Small</div>
                  <div className="text-[10px] opacity-90">2X</div>
                </button>
                <button
                  onClick={() => openSlip('total_prop', 'Odd', 'Odd Sum', 2)}
                  className="py-2.5 rounded-xl bg-gradient-to-b from-indigo-500 to-purple-600 text-white font-black text-xs shadow-xs active:scale-95"
                >
                  <div>Odd</div>
                  <div className="text-[10px] opacity-90">2X</div>
                </button>
                <button
                  onClick={() => openSlip('total_prop', 'Even', 'Even Sum', 2)}
                  className="py-2.5 rounded-xl bg-gradient-to-b from-emerald-400 to-green-600 text-white font-black text-xs shadow-xs active:scale-95"
                >
                  <div>Even</div>
                  <div className="text-[10px] opacity-90">2X</div>
                </button>
              </div>
            </div>
          )}

          {activeBetTab === '2same' && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-bold text-slate-700 mb-2">
                  2 matching numbers: odds <span className="text-[#0891B2]">(13.83)</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((d) => {
                    const active = selected2Match.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => setSelected2Match(active ? [] : [d])}
                        className={`py-2.5 rounded-xl font-black transition-all ${
                          active
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {d}{d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-700 mb-2">
                  A pair of unique numbers: odds <span className="text-[#0891B2]">(69.12)</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5, 6].map((d) => {
                    const active = selected2PairTop.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          setSelected2PairTop(active ? [] : [d]);
                          setSelected2PairBot((b) => b.filter((x) => x !== d));
                        }}
                        className={`py-2 rounded-xl font-black ${
                          active ? 'bg-[#0891B2] text-white' : 'bg-cyan-50 text-[#0891B2] border border-cyan-200'
                        }`}
                      >
                        {d}{d}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((d) => {
                    const active = selected2PairBot.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          setSelected2PairBot(active ? [] : [d]);
                          setSelected2PairTop((t) => t.filter((x) => x !== d));
                        }}
                        className={`py-2 rounded-xl font-black ${
                          active ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSubmitComboBet}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs shadow-sm"
              >
                Place 2-Same Bet
              </button>
            </div>
          )}

          {activeBetTab === '3same' && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-bold text-slate-700 mb-2">
                  3 of the same number: odds <span className="text-[#0891B2]">(207.36)</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((d) => {
                    const active = selected3Exact.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          setSelected3Exact(active ? [] : [d]);
                          setSelected3Any(false);
                        }}
                        className={`py-2.5 rounded-xl font-black ${
                          active ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {d}{d}{d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-700 mb-2">
                  Any 3 of the same number: odds <span className="text-[#0891B2]">(34.56)</span>
                </div>
                <button
                  onClick={() => {
                    setSelected3Any((v) => !v);
                    setSelected3Exact([]);
                  }}
                  className={`w-full py-3 rounded-xl font-black ${
                    selected3Any
                      ? 'bg-[#0891B2] text-white shadow-sm'
                      : 'bg-cyan-50 text-[#0891B2] border border-cyan-200'
                  }`}
                >
                  Any 3 of the same number: odds (34.56)
                </button>
              </div>

              <button
                onClick={handleSubmitComboBet}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs shadow-sm"
              >
                Place 3-Same Bet
              </button>
            </div>
          )}

          {activeBetTab === 'different' && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-bold text-slate-700 mb-2">
                  3 different numbers: odds <span className="text-[#0891B2]">(34.56)</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((d) => {
                    const active = selectedDiff3.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() =>
                          setSelectedDiff3((prev) =>
                            active ? prev.filter((x) => x !== d) : prev.length < 3 ? [...prev, d] : [...prev.slice(1), d]
                          )
                        }
                        className={`py-2.5 rounded-xl font-black ${
                          active ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-700 mb-2">
                  3 continuous numbers: odds <span className="text-[#0891B2]">(8.64)</span>
                </div>
                <button
                  onClick={() => setSelectedDiffConsec((v) => !v)}
                  className={`w-full py-2.5 rounded-xl font-black ${
                    selectedDiffConsec ? 'bg-[#0891B2] text-white' : 'bg-cyan-50 text-[#0891B2] border border-cyan-200'
                  }`}
                >
                  3 continuous numbers
                </button>
              </div>

              <div>
                <div className="font-bold text-slate-700 mb-2">
                  2 different numbers: odds <span className="text-[#0891B2]">(6.91)</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((d) => {
                    const active = selectedDiff2.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() =>
                          setSelectedDiff2((prev) =>
                            active ? prev.filter((x) => x !== d) : prev.length < 2 ? [...prev, d] : [prev[1], d]
                          )
                        }
                        className={`py-2.5 rounded-xl font-black ${
                          active ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSubmitComboBet}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs shadow-sm"
              >
                Place Different Numbers Bet
              </button>
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
                    <th className="py-2 px-1 text-center font-bold">Sum</th>
                    <th className="py-2 px-2 rounded-r-xl text-right font-bold">Results</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedHistory.map((row) => (
                    <tr key={row.periodNumber} className="hover:bg-cyan-50/40">
                      <td className="py-2.5 px-2 font-mono text-[11px] font-bold text-slate-700">
                        {row.periodNumber}
                      </td>
                      <td className="py-2.5 px-1 text-center text-[11px] font-bold text-slate-700">
                        <span className="font-black text-slate-900 mr-1">{row.sum}</span>
                        <span className={row.size === 'Big' ? 'text-[#0891B2]' : 'text-blue-600'}>{row.size}</span>{' '}
                        <span className={row.parity === 'Even' ? 'text-emerald-600' : 'text-indigo-600'}>{row.parity}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center justify-end gap-1">
                          {row.dice.map((d, i) => (
                            <Dice3DSvg key={i} value={d} size={20} />
                          ))}
                        </div>
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
            <div className="space-y-2">
              {history.slice(0, 15).map((row) => {
                const isThreeSame = row.dice[0] === row.dice[1] && row.dice[1] === row.dice[2];
                const isTwoSame = !isThreeSame && new Set(row.dice).size === 2;
                const tag = isThreeSame ? '3 same numbers' : isTwoSame ? '2 same numbers' : '3 different numbers';
                return (
                  <div
                    key={row.periodNumber}
                    className="flex items-center justify-between text-[11px] py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="font-mono font-bold text-slate-700">{row.periodNumber}</span>
                    <div className="flex items-center gap-1">
                      {row.dice.map((d, i) => (
                        <Dice3DSvg key={i} value={d} size={20} />
                      ))}
                    </div>
                    <span className="text-slate-600 font-semibold">{tag}</span>
                  </div>
                );
              })}
            </div>
          )}

          {activeRecordTab === 'my' && (
            <div className="space-y-2.5">
              {myModeBets.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">No Deshi K3 bets placed yet.</div>
              ) : (
                myModeBets.slice(0, 30).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-slate-800">{b.selection}</div>
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
                <div className="text-xs font-bold text-cyan-100">Deshi K3 {mode.toUpperCase()}</div>
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
              Deshi K3 Rules
            </div>
            <div className="p-4 text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>3 dice roll each round (each 1-6).</p>
              <p><strong>Total:</strong> Predict the exact sum (3-18) up to 207.36X, or Big (11-18) / Small (3-10) / Odd / Even at 2X.</p>
              <p><strong>2 Same / 3 Same / Different:</strong> Match pairs, triples, or unique 3-dice combinations for big multipliers.</p>
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
