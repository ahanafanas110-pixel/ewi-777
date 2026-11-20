import React, { useState } from 'react';
import { useApp, getLocalDateStr } from '../context/AppContext';
import { ArrowLeft, History, CheckCircle2, Wallet, X } from 'lucide-react';

const DAILY_MISSIONS = [
  { key: 'daily_1000', target: 1000, reward: 12 },
  { key: 'daily_10000', target: 10000, reward: 65 },
  { key: 'daily_50000', target: 50000, reward: 300 },
  { key: 'daily_100000', target: 100000, reward: 600 }
];

const WEEKLY_TASKS = [
  { key: 'weekly_200000', target: 200000, reward: 1000 },
  { key: 'weekly_500000', target: 500000, reward: 2800 }
];

export const ActivityAward: React.FC = () => {
  const {
    user,
    bets,
    aviatorBets,
    binaryBets,
    transactions,
    claimActivityAward,
    setActiveTab,
    showToast
  } = useApp();

  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const [showRecords, setShowRecords] = useState(false);

  const today = getLocalDateStr();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const weekAgoMs = todayStartMs - 6 * 24 * 60 * 60 * 1000;

  // Calculate user's real today bet volume and 7-day bet volume
  const betTxs = transactions.filter(
    (t) =>
      t.userId === user.id &&
      (t.type === 'lottery_bet' || t.type === 'aviator_bet' || t.type === 'binary_bet' || t.type === 'mines_bet')
  );

  let todayBetAmount = 0;
  let weeklyBetAmount = 0;

  for (const t of betTxs) {
    const parsed = Date.parse(t.time);
    const amt = Math.abs(Number(t.amount) || 0);
    if (!Number.isNaN(parsed)) {
      if (parsed >= todayStartMs) todayBetAmount += amt;
      if (parsed >= weekAgoMs) weeklyBetAmount += amt;
    } else {
      todayBetAmount += amt;
      weeklyBetAmount += amt;
    }
  }

  // Fallback check against active in-memory bets if transaction log didn't record an active round yet
  const memoryBetSum =
    bets.filter((b) => b.userId === user.id).reduce((s, b) => s + (b.totalAmount || 0), 0) +
    aviatorBets.filter((b) => b.userId === user.id).reduce((s, b) => s + (b.amount || 0), 0) +
    binaryBets.filter((b) => b.userId === user.id).reduce((s, b) => s + (b.amount || 0), 0);

  todayBetAmount = Math.round(Math.max(todayBetAmount, memoryBetSum));
  weeklyBetAmount = Math.round(Math.max(weeklyBetAmount, todayBetAmount));

  const claimedMap = user.claimedActivityRewards || {};
  const records = transactions.filter((t) => t.userId === user.id && t.type === 'activity_award');

  const handleAction = (missionKey: string, target: number, reward: number, completed: boolean, claimed: boolean) => {
    if (claimed) {
      showToast('Reward already claimed for this period');
      return;
    }
    if (!completed) {
      setActiveTab('wingo');
      window.location.hash = '#/wingo';
      return;
    }
    const res = claimActivityAward(missionKey, target, reward, tab === 'daily');
    if (!res.success) {
      showToast(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => {
            setActiveTab('activity');
            window.location.hash = '#/activity';
          }}
          className="p-1.5 -ml-1 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        <h1 className="text-sm font-black text-slate-900">Activity Award</h1>

        <button
          onClick={() => setShowRecords(true)}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-cyan-700"
        >
          <History className="w-4 h-4" />
          <span>Collection record</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] px-4 py-5 text-white relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="space-y-1.5 flex-1">
            <h2 className="text-xl font-black tracking-tight">Activity Award</h2>
            <p className="text-[11px] text-cyan-50 leading-relaxed font-medium">
              Complete weekly/daily tasks to receive rich rewards
            </p>
            <p className="text-[10px] text-cyan-100/90 leading-relaxed">
              Weekly rewards cannot be accumulated to the next week, and daily rewards cannot be accumulated to the next day.
            </p>
          </div>

          {/* 3D Mystery Cube Illustration */}
          <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
            <svg width="92" height="92" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="48" cy="52" rx="38" ry="18" transform="rotate(-18 48 52)" stroke="#CFFAFE" strokeWidth="2.5" strokeOpacity="0.65" />
              <path d="M48 16L74 28V60L48 72L22 60V28L48 16Z" fill="url(#cubeCyan)" stroke="#ECFEFF" strokeWidth="2" />
              <path d="M48 16L74 28L48 40L22 28L48 16Z" fill="#22D3EE" />
              <path d="M48 40L74 28V60L48 72V40Z" fill="#0891B2" />
              <text x="56" y="56" fill="white" fontSize="18" fontWeight="900">?</text>
              <text x="30" y="56" fill="#ECFEFF" fontSize="18" fontWeight="900">?</text>
              <circle cx="18" cy="24" r="5" fill="#67E8F9" />
              <defs>
                <linearGradient id="cubeCyan" x1="22" y1="16" x2="74" y2="72" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#67E8F9" />
                  <stop offset="1" stopColor="#0E7490" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Daily Mission / Weekly Tasks Tabs */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2.5 mb-4">
          <button
            onClick={() => setTab('daily')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
              tab === 'daily'
                ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Daily mission
          </button>
          <button
            onClick={() => setTab('weekly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'weekly'
                ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Weekly tasks
          </button>
        </div>

        {/* Task Cards */}
        <div className="space-y-3.5">
          {(tab === 'daily' ? DAILY_MISSIONS : WEEKLY_TASKS).map((mission) => {
            const currentAmount = tab === 'daily' ? todayBetAmount : weeklyBetAmount;
            const progress = Math.min(currentAmount, mission.target);
            const completed = currentAmount >= mission.target;
            const claimPeriodKey = tab === 'daily' ? today : `week_${Math.floor(todayStartMs / (7 * 86400000))}`;
            const claimed = claimedMap[mission.key] === claimPeriodKey;
            const pct = Math.min(100, Math.round((progress / mission.target) * 100));

            return (
              <div
                key={mission.key}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Top Banner Tag + Status */}
                <div className="flex items-center justify-between pr-4 border-b border-slate-100">
                  <div className="bg-emerald-600 text-white text-xs font-black px-4 py-2 rounded-br-2xl">
                    {tab === 'daily' ? 'Daily mission' : 'Weekly task'}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      claimed
                        ? 'text-emerald-600'
                        : completed
                        ? 'text-cyan-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {claimed ? 'Claimed ✓' : completed ? 'Ready to claim' : 'Unfinished'}
                  </span>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-black text-[11px]">
                        ৳
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {tab === 'daily' ? 'Daily betting bonus' : 'Weekly betting bonus'}
                      </span>
                      <span className="text-xs font-black text-cyan-700 tabular-nums">
                        {progress.toLocaleString()}/{mission.target.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Strip */}
                  <div className="bg-slate-50 rounded-xl px-3 py-2 space-y-1.5 border border-slate-200">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                      <span>
                        {tab === 'daily'
                          ? `Bet ৳${mission.target.toLocaleString()} today`
                          : `Bet ৳${mission.target.toLocaleString()} this week`}
                      </span>
                      <span className="font-bold text-slate-700">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-cyan-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Award Amount Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">Award amount</span>
                    <div className="flex items-center gap-1.5 text-cyan-700 font-black text-sm tabular-nums">
                      <Wallet className="w-4 h-4 text-cyan-600" />
                      <span>৳{mission.reward.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleAction(mission.key, mission.target, mission.reward, completed, claimed)}
                    disabled={claimed}
                    className={`w-full py-2.5 rounded-xl font-black text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                      claimed
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed'
                        : completed
                        ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm'
                        : 'bg-white border border-cyan-600 text-cyan-700 hover:bg-cyan-50'
                    }`}
                  >
                    {claimed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Received</span>
                      </>
                    ) : completed ? (
                      <span>Receive ৳{mission.reward}</span>
                    ) : (
                      <span>to complete</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collection Record Modal */}
      {showRecords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-sm text-slate-900">Collection record</span>
              <button
                onClick={() => setShowRecords(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {records.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-medium">
                  No Activity Award claimed yet.
                </div>
              ) : (
                records.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{r.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.time}</div>
                    </div>
                    <span className="text-emerald-600 font-black font-mono tabular-nums">
                      +৳{r.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
