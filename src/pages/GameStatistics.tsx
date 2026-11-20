import React, { useMemo, useState } from 'react';
import { useApp, getLocalDateStr } from '../context/AppContext';
import { ArrowLeft, Gamepad2, BarChart3, Flame, Trophy } from 'lucide-react';

type StatsPeriod = 'today' | 'yesterday' | 'week' | 'month';

function parseTxTimestamp(timeStr?: string, idStr?: string): number {
  if (timeStr) {
    const parsed = Date.parse(timeStr);
    if (!Number.isNaN(parsed) && parsed > 1000000000000) return parsed;
  }
  if (idStr) {
    const m = idStr.match(/(\d{13})/);
    if (m) return Number(m[1]);
  }
  return Date.now();
}

export const GameStatistics: React.FC = () => {
  const { user, transactions, setActiveTab, adminSettings } = useApp();
  const [period, setPeriod] = useState<StatsPeriod>('today');

  const tzOffset =
    typeof adminSettings.timezoneOffsetMinutes === 'number' ? adminSettings.timezoneOffsetMinutes : 360;

  const stats = useMemo(() => {
    const now = Date.now();
    const todayKey = getLocalDateStr(new Date(now), tzOffset);
    const yesterdayKey = getLocalDateStr(new Date(now - 86400000), tzOffset);
    const weekStartMs = now - 7 * 86400000;
    const monthPrefix = todayKey.slice(0, 7);

    const userTxs = transactions.filter((t) => !user.id || t.userId === user.id);

    const inPeriod = (timeStr?: string, idStr?: string): boolean => {
      const ts = parseTxTimestamp(timeStr, idStr);
      const dKey = getLocalDateStr(new Date(ts), tzOffset);
      if (period === 'today') return dKey === todayKey;
      if (period === 'yesterday') return dKey === yesterdayKey;
      if (period === 'week') return ts >= weekStartMs;
      return dKey.startsWith(monthPrefix);
    };

    const categories = {
      lottery: { bet: 0, count: 0, win: 0 },
      video: { bet: 0, count: 0, win: 0 },
      trading: { bet: 0, count: 0, win: 0 },
      slot: { bet: 0, count: 0, win: 0 }
    };

    for (const tx of userTxs) {
      if (!inPeriod(tx.time, tx.id)) continue;
      const amt = Math.abs(Number(tx.amount) || 0);
      if (
        tx.type === 'lottery_bet' ||
        tx.type === 'ewi_wingo_bet' ||
        tx.type === 'k3_bet' ||
        tx.type === 'd5_bet'
      ) {
        categories.lottery.bet += amt;
        categories.lottery.count += 1;
      } else if (
        tx.type === 'lottery_win' ||
        tx.type === 'ewi_wingo_win' ||
        tx.type === 'k3_win' ||
        tx.type === 'd5_win'
      ) {
        categories.lottery.win += amt;
      } else if (
        tx.type === 'aviator_bet' ||
        tx.type === 'luckyjet_bet' ||
        tx.type === 'coinflip_bet'
      ) {
        categories.video.bet += amt;
        categories.video.count += 1;
      } else if (
        tx.type === 'aviator_win' ||
        tx.type === 'luckyjet_win' ||
        tx.type === 'coinflip_win'
      ) {
        categories.video.win += amt;
      } else if (tx.type === 'binary_bet') {
        categories.trading.bet += amt;
        categories.trading.count += 1;
      } else if (tx.type === 'binary_win') {
        categories.trading.win += amt;
      } else if (tx.type === 'mines_bet') {
        categories.slot.bet += amt;
        categories.slot.count += 1;
      } else if (tx.type === 'mines_win') {
        categories.slot.win += amt;
      }
    }

    const totalBet =
      categories.lottery.bet +
      categories.video.bet +
      categories.trading.bet +
      categories.slot.bet;

    return {
      totalBet,
      lottery: categories.lottery,
      video: categories.video,
      trading: categories.trading,
      slot: categories.slot
    };
  }, [transactions, user.id, period, tzOffset]);

  const sections = [
    {
      key: 'lottery',
      title: 'Lottery',
      subtitle: 'WinGo · EWI WinGo · K3 · 5D',
      icon: Trophy,
      data: stats.lottery
    },
    {
      key: 'video',
      title: 'Casino & Crash',
      subtitle: 'PLANE · Roulette · Aviator · Lucky Jet · Coin Flip',
      icon: Flame,
      data: stats.video
    },
    {
      key: 'trading',
      title: 'Trading',
      subtitle: 'Binary & Gold Market',
      icon: BarChart3,
      data: stats.trading
    },
    {
      key: 'slot',
      title: 'Slot',
      subtitle: 'Mines 777',
      icon: Gamepad2,
      data: stats.slot
    }
  ];

  const periodTabs: { id: StatsPeriod; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This month' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-cyan-100 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab('account');
            window.location.hash = '#/account';
          }}
          className="p-1.5 -ml-1 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-slate-700 hover:bg-cyan-50 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.3]" />
        </button>
        <h1 className="text-base font-black text-slate-900 tracking-tight">Game statistics</h1>
        <div className="w-9" />
      </div>

      <div className="p-4 space-y-4">
        {/* Timeframe Switcher */}
        <div className="grid grid-cols-4 gap-2">
          {periodTabs.map((t) => {
            const active = period === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPeriod(t.id)}
                className={`py-2 px-1.5 rounded-xl text-[11px] font-black transition-all active:scale-95 truncate ${
                  active
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-cyan-300'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Total Bet Hero Card */}
        <div className="bg-white rounded-3xl py-7 px-4 border border-cyan-100 shadow-sm text-center relative overflow-hidden">
          <div className="text-3xl font-black text-cyan-700 tracking-tight tabular-nums relative z-10">
            ৳{stats.totalBet.toFixed(2)}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1.5 relative z-10">
            Total bet
          </div>
        </div>

        {/* Category Breakdown List Card */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm divide-y divide-slate-100">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div key={sec.key} className="py-3.5 first:pt-1 last:pb-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 leading-tight">
                        {sec.title}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        {sec.subtitle}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pl-2 relative space-y-2.5">
                  <div
                    className="absolute left-[14px] top-3 bottom-3 w-px border-l border-dashed border-cyan-300 pointer-events-none"
                    aria-hidden="true"
                  />

                  <div className="flex items-center justify-between text-xs relative">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-cyan-50 border border-cyan-400 flex items-center justify-center relative z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
                      </span>
                      <span className="text-slate-500 font-semibold">Total bet</span>
                    </div>
                    <span className="font-extrabold text-slate-900 tabular-nums">
                      ৳{sec.data.bet.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs relative">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-50 border border-sky-300 flex items-center justify-center relative z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      </span>
                      <span className="text-slate-500 font-semibold">Number of bets</span>
                    </div>
                    <span className="font-extrabold text-slate-900 tabular-nums">
                      {sec.data.count}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs relative">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-teal-50 border border-teal-300 flex items-center justify-center relative z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      </span>
                      <span className="text-slate-500 font-semibold">Winning amount</span>
                    </div>
                    <span className="font-black text-cyan-700 tabular-nums">
                      ৳{sec.data.win.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
