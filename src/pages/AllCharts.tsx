import React, { useEffect, useState } from 'react';
import { useApp, getLocalDateStr } from '../context/AppContext';
import {
  ArrowLeft,
  Award,
  Flame,
  Gift,
  Headphones,
  RotateCcw,
  Users,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Ewi777Logo } from '../components/BrandLogos';

type ChartTabId =
  | 'weekly_deposit'
  | 'recharge_bonus'
  | 'wingo_streak'
  | 'agent_weekly'
  | 'daily_refer'
  | 'wingo_refund';

const CHART_TABS: Array<{ id: ChartTabId; label: string }> = [
  { id: 'weekly_deposit', label: 'Weekly Deposit' },
  { id: 'recharge_bonus', label: 'Recharge Bonus' },
  { id: 'wingo_streak', label: 'WinGo Streak' },
  { id: 'agent_weekly', label: 'Agent Weekly' },
  { id: 'daily_refer', label: 'Daily Refer' },
  { id: 'wingo_refund', label: '6-Step Refund' }
];

const WEEKLY_DEPOSIT_ROWS = [
  { deposit: 5000, bonus: 500 },
  { deposit: 10000, bonus: 1500 },
  { deposit: 20000, bonus: 2000 },
  { deposit: 30000, bonus: 3000 },
  { deposit: 50000, bonus: 5000 }
];

const RECHARGE_FIRST_ROWS = [
  { dep: 200, bonus: 38, turnover: 38 },
  { dep: 500, bonus: 68, turnover: 68 },
  { dep: 1000, bonus: 128, turnover: 128 },
  { dep: 3000, bonus: 228, turnover: 228 },
  { dep: 5000, bonus: 428, turnover: 428 },
  { dep: 12000, bonus: 1088, turnover: 1088 },
  { dep: 60000, bonus: 4088, turnover: 4088 },
  { dep: 120000, bonus: 4088, turnover: 4088 }
];

const RECHARGE_SECOND_ROWS = [
  { dep: 500, bonus: 98, turnover: 98 },
  { dep: 1000, bonus: 188, turnover: 188 },
  { dep: 5000, bonus: 488, turnover: 488 },
  { dep: 12000, bonus: 888, turnover: 888 },
  { dep: 60000, bonus: 6000, turnover: 6000 },
  { dep: 120000, bonus: 12000, turnover: 12000 }
];

const RECHARGE_THIRD_ROWS = [
  { dep: 1000, bonus: 100, turnover: 100 },
  { dep: 5000, bonus: 500, turnover: 500 },
  { dep: 12000, bonus: 1200, turnover: 1200 },
  { dep: 60000, bonus: 6000, turnover: 6000 },
  { dep: 120000, bonus: 12000, turnover: 12000 }
];

const WINGO_STREAK_HIGH = [
  { wins: '3 Wins', minBet: '৳100+', bonus: 30 },
  { wins: '5 Wins', minBet: '৳100+', bonus: 150 },
  { wins: '8 Wins', minBet: '৳130+', bonus: 1000 },
  { wins: '10 Wins', minBet: '৳100+', bonus: 5000 },
  { wins: '15 Wins', minBet: '৳100+', bonus: 10000 }
];

const WINGO_STREAK_LOW = [
  { wins: '5 Wins', minBet: '৳10 – ৳99', bonus: 20 },
  { wins: '8 Wins', minBet: '৳10 – ৳99', bonus: 100 },
  { wins: '10 Wins', minBet: '৳10 – ৳99', bonus: 500 },
  { wins: '15 Wins', minBet: '৳10 – ৳99', bonus: 1000 }
];

const AGENT_WEEKLY_SALARY_ROWS = [
  { invites: 5, salary: 209 },
  { invites: 10, salary: 519 },
  { invites: 20, salary: 1129 },
  { invites: 30, salary: 2159 },
  { invites: 50, salary: 5199 },
  { invites: 100, salary: 11299 }
];

const DAILY_REFER_ROWS = [
  { members: 3, bonus: 151 },
  { members: 5, bonus: 351 },
  { members: 10, bonus: 751 },
  { members: 20, bonus: 1551 },
  { members: 30, bonus: 2551 },
  { members: 50, bonus: 4551 },
  { members: 80, bonus: 7551 },
  { members: 100, bonus: 10551 },
  { members: 150, bonus: 20551 },
  { members: 300, bonus: 45551 }
];

const SIX_STEP_STARTS = [5, 15, 45, 125, 150, 250];
const SIX_STEP_MATRIX = [
  { level: 'Level 1', values: [5, 15, 45, 125, 150, 250] },
  { level: 'Level 2', values: [15, 45, 135, 375, 450, 750] },
  { level: 'Level 3', values: [45, 135, 405, 1125, 1350, 2250] },
  { level: 'Level 4', values: [135, 405, 1215, 3375, 4050, 6750] },
  { level: 'Level 5', values: [405, 1215, 3645, 10125, 12150, 20250] },
  { level: 'Level 6', values: [1215, 3645, 10935, 30375, 36450, 60750] }
];
const SIX_STEP_TOTALS = [1820, 5460, 16380, 45500, 54600, 91000];

export const AllCharts: React.FC = () => {
  const {
    user,
    adminSettings,
    referrals,
    ewiWingoBets,
    sendSupportMessage,
    claimWinGoStreakBonus,
    claimWinGoSixStepRefund,
    setActiveTab,
    showToast
  } = useApp();

  const [activeChart, setActiveChart] = useState<ChartTabId>('weekly_deposit');
  const [midnightCountdown, setMidnightCountdown] = useState('00:00:00');

  useEffect(() => {
    const updateClock = () => {
      const offsetMs = (adminSettings.timezoneOffsetMinutes ?? 360) * 60_000;
      const offsetNowMs = Date.now() + offsetMs;
      const remMs = Math.max(0, 86_400_000 - (offsetNowMs % 86_400_000));
      const totalSec = Math.floor(remMs / 1000);
      const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const ss = String(totalSec % 60).padStart(2, '0');
      setMidnightCountdown(`${hh}:${mm}:${ss}`);
    };
    updateClock();
    const iv = setInterval(updateClock, 1000);
    return () => clearInterval(iv);
  }, [adminSettings.timezoneOffsetMinutes]);

  const goCustomerCare = () => {
    setActiveTab('customer-service');
    window.location.hash = '#/customer-service';
  };

  const today = getLocalDateStr();
  const todayStreak = user.lastWinGoStreakDate === today ? Number(user.winGoStreakCount || 0) : 0;
  const streakAlreadyClaimed = user.claimedWinGoStreakDate === today;
  const isStreakEligible = todayStreak >= 3 && !streakAlreadyClaimed;

  const userReferrals = referrals.filter(
    (r) => r.referrerCode === user.inviteCode || r.referrerCode === user.uid
  );
  const qualifiedDailyRefers = userReferrals.filter((r) => (Number(r.depositAmount) || 0) >= 500).length;

  const qualifiedWeeklyTier = WEEKLY_DEPOSIT_ROWS.filter(
    (r) => (Number(user.totalDeposited) || 0) >= r.deposit
  ).pop() || null;

  const qualifiedAgentTier = AGENT_WEEKLY_SALARY_ROWS.filter(
    (r) => userReferrals.length >= r.invites
  ).pop() || null;

  const qualifiedDailyTier = DAILY_REFER_ROWS.filter(
    (r) => qualifiedDailyRefers >= r.members
  ).pop() || null;

  const myEwiSettled = ewiWingoBets.filter((b) => b.userId === user.id && b.status !== 'pending');
  const latestSixEwi = myEwiSettled.slice(0, 6);
  const refundKey = latestSixEwi.map((b) => b.id).join(',');
  const isRefundEligible =
    latestSixEwi.length === 6 &&
    latestSixEwi.every((b) => b.status === 'lost') &&
    !(user.claimedWingoRefunds || []).includes(refundKey);

  const sendBonusChatNotice = (chartTitle: string, qualifiedDetail: string) => {
    sendSupportMessage({
      userId: user.id || 'guest',
      userUid: user.uid || 'GUEST',
      userNickname: user.nickname || user.phone || 'Member',
      userPhone: user.phone || user.email || '',
      sender: 'user',
      text: `[Bonus Application] UID: ${user.uid || 'GUEST'} | Chart: ${chartTitle} | Qualified: ${qualifiedDetail}`
    }).catch(() => {});
  };

  const handleApplyWeeklyDeposit = () => {
    if (!qualifiedWeeklyTier) {
      showToast('Not eligible yet — reach at least ৳5,000 total deposit first.');
      return;
    }
    sendBonusChatNotice(
      'Weekly Deposit Bonus',
      `৳${(user.totalDeposited || 0).toLocaleString()} deposited (Tier +৳${qualifiedWeeklyTier.bonus.toLocaleString()})`
    );
    showToast('Weekly deposit bonus application sent to Customer Care!');
    goCustomerCare();
  };

  const handleStreakClaim = () => {
    if (!isStreakEligible) {
      showToast(
        streakAlreadyClaimed
          ? 'Today’s WinGo Streak Bonus is already claimed'
          : 'Not eligible yet — reach 3+ consecutive wins on WinGo today.'
      );
      return;
    }
    const res = claimWinGoStreakBonus();
    if (!res.success) {
      showToast(res.message);
      return;
    }
    sendBonusChatNotice('WinGo Win Streak Bonus', `${todayStreak} Consecutive Wins Claimed`);
  };

  const handleApplyAgentWeekly = () => {
    if (!qualifiedAgentTier) {
      showToast('Not eligible yet — reach at least 5 active invites first.');
      return;
    }
    sendBonusChatNotice(
      'Agent Weekly Salary',
      `${userReferrals.length} Invites (Weekly Salary Tier ৳${qualifiedAgentTier.salary.toLocaleString()})`
    );
    showToast('Agent salary application sent to Customer Care!');
    goCustomerCare();
  };

  const handleApplyDailyRefer = () => {
    if (!qualifiedDailyTier) {
      showToast('Not eligible yet — reach at least 3 qualified refers (৳500+ deposit).');
      return;
    }
    sendBonusChatNotice(
      'Daily Refer Milestone Bonus',
      `${qualifiedDailyRefers} Qualified Members (Tier +৳${qualifiedDailyTier.bonus.toLocaleString()})`
    );
    showToast('Daily Refer bonus confirmation sent to Customer Care!');
    goCustomerCare();
  };

  const handleSixStepRefund = () => {
    if (!isRefundEligible) {
      showToast('Not eligible yet — requires 6 consecutive lost Hney WinGo rounds.');
      return;
    }
    const res = claimWinGoSixStepRefund();
    if (!res.success) {
      showToast(res.message);
      return;
    }
    sendBonusChatNotice('Hney WinGo 6-Step 100% Refund', '6 Consecutive Losses Refunded');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="p-1.5 -ml-1 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        <div className="flex items-center gap-2">
          <Ewi777Logo height={34} logoUrl={adminSettings.appLogoUrl} />
          <span className="text-sm font-black text-slate-900 tracking-tight">ALL BONUS CHARTS</span>
        </div>

        <button
          type="button"
          onClick={goCustomerCare}
          className="px-2.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 font-black text-[11px] flex items-center gap-1 whitespace-nowrap"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Support</span>
        </button>
      </div>

      {/* 6-Tab Horizontal Chart Switcher */}
      <div className="bg-white border-b border-slate-200 px-3 py-2.5 sticky top-[55px] z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CHART_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveChart(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap flex-shrink-0 transition-all ${
                activeChart === t.id
                  ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 1. WEEKLY DEPOSIT BONUS */}
        {activeChart === 'weekly_deposit' && (
          <div className="space-y-3.5">
            <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
                HNEY WIN WEEKLY REWARD
              </div>
              <h2 className="text-lg font-black mt-0.5">Weekly Deposit Bonus Chart</h2>
              <p className="text-xs text-cyan-100 mt-1 leading-relaxed">
                Meet weekly deposit milestones to unlock massive bonuses. Weekly deposit rewards are verified manually via Customer Care.
              </p>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
              <div className="bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white grid grid-cols-2 text-center py-3 px-4 text-xs font-black uppercase tracking-wider">
                <div>WEEKLY DEPOSIT</div>
                <div>CASH BONUS</div>
              </div>
              <div className="divide-y divide-slate-100 tabular-nums">
                {WEEKLY_DEPOSIT_ROWS.map((r, i) => (
                  <div
                    key={r.deposit}
                    className={`grid grid-cols-2 text-center py-3.5 px-4 text-sm font-bold ${
                      i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                  >
                    <div className="text-slate-800">৳{r.deposit.toLocaleString()}</div>
                    <div className="font-black text-cyan-700">+৳{r.bonus.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Your Total Deposited</span>
                <span className="font-mono font-black text-slate-900 tabular-nums">
                  ৳{(user.totalDeposited || 0).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyWeeklyDeposit}
                className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  qualifiedWeeklyTier
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-md active:scale-98'
                    : 'bg-slate-200 text-slate-500 opacity-50 blur-[0.5px]'
                }`}
              >
                <Headphones className="w-4 h-4" />
                <span>
                  {qualifiedWeeklyTier
                    ? `Apply Bonus (+৳${qualifiedWeeklyTier.bonus.toLocaleString()})`
                    : 'Reach ৳5,000 Deposit to Unlock'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 2. RECHARGE BONUS */}
        {activeChart === 'recharge_bonus' && (
          <div className="space-y-3.5">
            <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
                AUTO-CREDIT • 1X TURNOVER
              </div>
              <h2 className="text-lg font-black mt-0.5">Invitation Recharge Bonus</h2>
              <p className="text-xs text-cyan-100 mt-1 leading-relaxed">
                Credits automatically to your wallet whenever an invited member completes their 1st, 2nd, or 3rd deposit (e.g. ৳200 deposit → ৳38 bonus with ৳38 turnover).
              </p>
            </div>

            {[
              { title: '1st Downline Deposit', rows: RECHARGE_FIRST_ROWS },
              { title: '2nd Downline Deposit', rows: RECHARGE_SECOND_ROWS },
              { title: '3rd Downline Deposit', rows: RECHARGE_THIRD_ROWS }
            ].map((group) => (
              <div key={group.title} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
                <div className="bg-gradient-to-r from-[#0B2235] to-[#0E314A] text-white px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-between">
                  <span>{group.title}</span>
                  <span className="text-[10px] text-cyan-300">Auto-Added ✓</span>
                </div>
                <div className="grid grid-cols-3 text-center py-2 px-3 bg-slate-50 text-[10px] font-black text-slate-600 uppercase border-b border-slate-200">
                  <div>Deposit</div>
                  <div>Bonus</div>
                  <div>Turnover</div>
                </div>
                <div className="divide-y divide-slate-100 tabular-nums">
                  {group.rows.map((r) => (
                    <div key={`${group.title}-${r.dep}`} className="grid grid-cols-3 text-center py-2.5 px-3 text-xs font-bold">
                      <div className="text-slate-800">৳{r.dep.toLocaleString()}</div>
                      <div className="font-black text-emerald-700">+৳{r.bonus.toLocaleString()}</div>
                      <div className="text-slate-500">৳{r.turnover.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. WINGO WINSTREAK BONUS */}
        {activeChart === 'wingo_streak' && (
          <div className="space-y-3.5">
            <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
                  3X TURNOVER • RESETS 12:00 AM
                </div>
                <h2 className="text-lg font-black mt-0.5">WinGo Win Streak Bonus</h2>
                <div className="text-xs text-cyan-100 mt-1 font-bold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-cyan-300" />
                  <span>Today&apos;s Streak: {todayStreak} Consecutive Wins</span>
                </div>
              </div>
              <div className="bg-black/25 px-3 py-1.5 rounded-xl border border-white/20 text-right flex-shrink-0">
                <div className="text-[9px] uppercase font-bold text-cyan-200">Reset In</div>
                <div className="text-xs font-mono font-black tabular-nums">{midnightCountdown}</div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-slate-900">Claim Eligible Daily Streak</div>
                <div className="text-[11px] text-slate-500">
                  {streakAlreadyClaimed
                    ? 'Today’s WinGo Streak Bonus claimed ✓'
                    : 'Reach 3+ wins (৳100+ bet) or 5+ wins (৳10-৳99)'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleStreakClaim}
                className={`px-4 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                  streakAlreadyClaimed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed opacity-70'
                    : isStreakEligible
                    ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-sm active:scale-95'
                    : 'bg-slate-200 text-slate-500 opacity-50 blur-[0.5px]'
                }`}
              >
                {streakAlreadyClaimed ? 'Claimed ✓' : isStreakEligible ? 'Claim Streak' : 'Locked'}
              </button>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
              <div className="bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white px-4 py-2.5 text-xs font-black uppercase">
                Bet Amount ৳100 &amp; Above
              </div>
              <div className="divide-y divide-slate-100 tabular-nums">
                {WINGO_STREAK_HIGH.map((r) => (
                  <div key={r.wins} className="grid grid-cols-3 text-center py-3 px-3 text-xs font-bold">
                    <div className="text-slate-900 font-black">{r.wins}</div>
                    <div className="text-slate-500">{r.minBet}</div>
                    <div className="text-cyan-700 font-black">+৳{r.bonus.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
              <div className="bg-slate-800 text-white px-4 py-2.5 text-xs font-black uppercase">
                Bet Amount ৳10 – ৳99
              </div>
              <div className="divide-y divide-slate-100 tabular-nums">
                {WINGO_STREAK_LOW.map((r) => (
                  <div key={r.wins} className="grid grid-cols-3 text-center py-3 px-3 text-xs font-bold">
                    <div className="text-slate-900 font-black">{r.wins}</div>
                    <div className="text-slate-500">{r.minBet}</div>
                    <div className="text-cyan-700 font-black">+৳{r.bonus.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. AGENT WEEKLY SALARY */}
        {activeChart === 'agent_weekly' && (
          <div className="space-y-3.5">
            <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
                7-DAY INVITE PERFORMANCE
              </div>
              <h2 className="text-lg font-black mt-0.5">Agent Weekly Salary Chart</h2>
              <p className="text-xs text-cyan-100 mt-1 leading-relaxed">
                Grow your active team over 7 days and apply with Hney Win Customer Care every Monday for weekly agent salary payout.
              </p>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
              <div className="bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white grid grid-cols-2 text-center py-3 px-4 text-xs font-black uppercase">
                <div>7-DAY ACTIVE INVITES</div>
                <div>WEEKLY SALARY</div>
              </div>
              <div className="divide-y divide-slate-100 tabular-nums">
                {AGENT_WEEKLY_SALARY_ROWS.map((r, i) => (
                  <div
                    key={r.invites}
                    className={`grid grid-cols-2 text-center py-3.5 px-4 text-sm font-bold ${
                      i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                  >
                    <div className="text-slate-800">{r.invites} Invites</div>
                    <div className="font-black text-cyan-700">৳{r.salary.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-600" />
                  <span>Your Total Team Members</span>
                </span>
                <span className="font-mono font-black text-slate-900 tabular-nums">{userReferrals.length}</span>
              </div>
              <button
                type="button"
                onClick={handleApplyAgentWeekly}
                className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  qualifiedAgentTier
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-md active:scale-98'
                    : 'bg-slate-200 text-slate-500 opacity-50 blur-[0.5px]'
                }`}
              >
                <Headphones className="w-4 h-4" />
                <span>
                  {qualifiedAgentTier
                    ? `Apply Weekly Salary (৳${qualifiedAgentTier.salary.toLocaleString()})`
                    : 'Reach 5 Active Invites to Unlock'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 5. DAILY REFER BONUS */}
        {activeChart === 'daily_refer' && (
          <div className="space-y-3.5">
            <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
                AUTO-ADDED • MIN ৳500 DEPOSIT
              </div>
              <h2 className="text-lg font-black mt-0.5">Daily Refer Milestone Bonus</h2>
              <p className="text-xs text-cyan-100 mt-1 leading-relaxed">
                Each invited friend who recharges at least ৳500 today advances your milestone. Bonuses credit automatically as each tier unlocks!
              </p>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex items-center justify-between text-xs">
              <div>
                <div className="text-slate-500 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Qualified Invites (৳500+ Deposit)</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5 tabular-nums">
                  {qualifiedDailyRefers} Members
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Status</div>
                <div className="text-xs font-black text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Auto-Credited</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
              <div className="bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white grid grid-cols-2 text-center py-3 px-4 text-xs font-black uppercase">
                <div>QUALIFIED REFERS</div>
                <div>AUTO BONUS</div>
              </div>
              <div className="divide-y divide-slate-100 tabular-nums">
                {DAILY_REFER_ROWS.map((r, i) => {
                  const unlocked = qualifiedDailyRefers >= r.members;
                  return (
                    <div
                      key={r.members}
                      className={`grid grid-cols-2 text-center py-3 px-4 text-sm font-bold ${
                        unlocked
                          ? 'bg-cyan-50 text-cyan-800'
                          : i % 2 === 1
                          ? 'bg-slate-50/70 text-slate-800'
                          : 'bg-white text-slate-800'
                      }`}
                    >
                      <div>{r.members} Members</div>
                      <div className="font-black text-cyan-700">+৳{r.bonus.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyDailyRefer}
              className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                qualifiedDailyTier
                  ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-md active:scale-98'
                  : 'bg-slate-200 text-slate-500 opacity-50 blur-[0.5px]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {qualifiedDailyTier
                  ? `Apply / Verify Refer Bonus (+৳${qualifiedDailyTier.bonus.toLocaleString()})`
                  : 'Invite 3 Qualified Members to Unlock'}
              </span>
            </button>
          </div>
        )}

        {/* 6. HNEY WINGO 6-STEP 3X LOSS 100% REFUND MATRIX */}
        {activeChart === 'wingo_refund' && (
          <div className="space-y-3.5">
            <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
                WIN GO 100% CAPITAL PROTECTION
              </div>
              <h2 className="text-lg font-black mt-0.5">Hney WinGo 6-Step 3X Loss Refund</h2>
              <p className="text-xs text-cyan-100 mt-1 leading-relaxed">
                Follow the official 6-Step 3× martingale table strictly on WinGo. If all 6 consecutive steps lose, claim 100% of your capital back immediately!
              </p>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-center text-[11px] tabular-nums">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black uppercase">
                      <th className="py-2.5 px-2 text-left">Start From</th>
                      {SIX_STEP_STARTS.map((s) => (
                        <th key={s} className="py-2.5 px-2">
                          ৳{s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {SIX_STEP_MATRIX.map((row, idx) => (
                      <tr key={row.level} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="py-2.5 px-2 text-left font-black text-cyan-700 whitespace-nowrap">
                          {row.level}
                        </td>
                        {row.values.map((v, cIdx) => (
                          <td key={`${row.level}-${cIdx}`} className="py-2.5 px-2">
                            {v.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 font-black text-cyan-800 border-t-2 border-cyan-300">
                      <td className="py-3 px-2 text-left uppercase whitespace-nowrap">Total Refund</td>
                      {SIX_STEP_TOTALS.map((tot, idx) => (
                        <td key={`tot-${idx}`} className="py-3 px-2">
                          ৳{tot.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                <RotateCcw className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                <span>
                  Verifies your latest 6 consecutive lost WinGo / Hney WinGo trades against the exact 3× step progression above and refunds 100% instantly.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSixStepRefund}
                className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  isRefundEligible
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-md active:scale-98'
                    : 'bg-slate-200 text-slate-500 opacity-50 blur-[0.5px]'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>
                  {isRefundEligible
                    ? 'Verify & Claim 100% 6-Step Loss Refund'
                    : 'Requires 6 Consecutive Losses to Unlock'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
