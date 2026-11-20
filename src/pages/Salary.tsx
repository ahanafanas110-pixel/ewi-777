import React, { useEffect, useState } from 'react';
import { useApp, getLocalDateStr } from '../context/AppContext';
import { ArrowLeft, Award, CheckCircle2, Clock, Users } from 'lucide-react';

const SALARY_TIERS = [
  { members: 3, salary: 300 },
  { members: 5, salary: 600 },
  { members: 12, salary: 1500 },
  { members: 20, salary: 2500 },
  { members: 35, salary: 5000 },
  { members: 60, salary: 10000 },
  { members: 80, salary: 15000 },
  { members: 130, salary: 20000 },
  { members: 250, salary: 30000 },
  { members: 400, salary: 40000 },
  { members: 700, salary: 70000 },
  { members: 1000, salary: 100000 }
];

const SALARY_TERMS = [
  'Must be active and play daily (at least 1 bet yourself). Fake members put the salary on hold or stop it.',
  'Same IP, same bank/wallet details or same phone number cannot claim salary.',
  'Starter Bonus: Bring ৳2,000+ total referral deposit to unlock the ৳300 Agent Salary immediately.',
  'Team total recharge for higher tiers must be at least 10× your salary.',
  'Example: salary 600 × 10 = 6,000 — if team recharge is over 6,000 you get 600.',
  'For higher tiers (৳600+), your own deposit must be at least 25% of the team recharge.',
  'For higher tiers (৳600+), team total betting must be over 3× the team recharge.',
  'For great performance, find a TEACHER for better offers.',
  'All decisions are final by EWI777.'
];

export const Salary: React.FC = () => {
  const {
    user,
    adminSettings,
    referrals,
    bets,
    aviatorBets,
    binaryBets,
    transactions,
    claimAgentSalary,
    setActiveTab,
    showToast
  } = useApp();

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

  const userReferrals = referrals.filter(
    (r) => r.referrerCode === user.inviteCode || r.referrerCode === user.uid
  );
  const rechargeMembersList = userReferrals.filter((r) => (Number(r.depositAmount) || 0) > 0);
  const rechargeMembersCount = rechargeMembersList.length;
  const teamRechargeTotal = rechargeMembersList.reduce(
    (sum, r) => sum + (Number(r.depositAmount) || 0),
    0
  );
  const teamBetsTotal = Math.round(
    userReferrals.reduce((sum, r) => sum + (Number(r.commission) || 0) * 120, 0)
  );
  const yourDeposit = Number(user.totalDeposited) || 0;

  const today = getLocalDateStr();
  const hasPlacedBetToday =
    bets.some((b) => b.userId === user.id) ||
    aviatorBets.some((b) => b.userId === user.id) ||
    binaryBets.some((b) => b.userId === user.id) ||
    transactions.some(
      (t) =>
        t.userId === user.id &&
        (t.type === 'lottery_bet' || t.type === 'aviator_bet' || t.type === 'binary_bet' || t.type === 'mines_bet')
    );

  const nextTier = SALARY_TIERS.find((t) => rechargeMembersCount < t.members);
  const membersNeeded = nextTier ? Math.max(0, nextTier.members - rechargeMembersCount) : 0;

  const eligibleTier = [...SALARY_TIERS]
    .reverse()
    .find(
      (t) =>
        (t.salary === 300 && teamRechargeTotal >= 2000) ||
        (rechargeMembersCount >= t.members &&
          hasPlacedBetToday &&
          teamRechargeTotal >= t.salary * 10 &&
          yourDeposit >= teamRechargeTotal * 0.25 &&
          teamBetsTotal > teamRechargeTotal * 3)
    );

  const alreadyClaimedToday = user.lastSalaryClaimDate === today;
  const salaryHistory = transactions.filter((t) => t.userId === user.id && t.type === 'salary_bonus');

  const handleClaim = () => {
    if (!eligibleTier) {
      showToast('Complete today’s requirements & tier targets to claim Agent Salary');
      return;
    }
    const res = claimAgentSalary(eligibleTier.members, eligibleTier.salary);
    if (!res.success) showToast(res.message);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => {
            setActiveTab('promotion');
            window.location.hash = '#/promotion';
          }}
          className="p-1.5 -ml-1 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <h1 className="text-base font-black tracking-tight text-slate-900">
          EWI777 Agent Salary
        </h1>
        <button
          onClick={() => {
            setActiveTab('promotion');
            window.location.hash = '#/promotion';
          }}
          className="text-[11px] font-black text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200 hover:bg-cyan-100 whitespace-nowrap"
        >
          Invite Team
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Midnight 12:00 AM Auto-Collect Status Banner */}
        <div className="bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-2xl p-4 text-white shadow-sm flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-cyan-200">
              Auto-Collect Active • Midnight 12:00 AM
            </div>
            <div className="text-xs font-extrabold mt-0.5">
              {alreadyClaimedToday
                ? 'Today’s eligible salary has been credited ✓'
                : 'Eligible salary settles automatically at 12:00 AM'}
            </div>
          </div>
          <div className="text-right flex-shrink-0 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
            <div className="text-[9px] uppercase font-bold text-cyan-100">Reset In</div>
            <div className="text-sm font-mono font-black tabular-nums">{midnightCountdown}</div>
          </div>
        </div>

        {/* All Bonus Charts Navigation Button */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('all-chart');
            window.location.hash = '#/all-chart';
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-xs uppercase tracking-wider shadow-xs hover:bg-slate-50 active:scale-98 transition-all flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-600" />
            <span>View All Chart (Weekly, Streak, Refer &amp; 6-Step Refund)</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white text-[10px] whitespace-nowrap">
            All Chart →
          </span>
        </button>

        {/* Today's Progress Summary Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-cyan-700 tracking-wide">
              Today&apos;s progress
            </h2>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
              {today}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs pt-1 tabular-nums">
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-500">Recharge members</div>
              <strong className="text-sm text-slate-900 font-black">{rechargeMembersCount}</strong>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-500">Team recharge</div>
              <strong className="text-sm text-slate-900 font-black">৳{teamRechargeTotal.toLocaleString()}</strong>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-500">Team bets</div>
              <strong className="text-sm text-slate-900 font-black">৳{teamBetsTotal.toLocaleString()}</strong>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-500">Your deposit</div>
              <strong className="text-sm text-slate-900 font-black">৳{yourDeposit.toLocaleString()}</strong>
            </div>
          </div>

          <div className="pt-2 space-y-1 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800">
              {eligibleTier
                ? `Unlocked ৳${eligibleTier.salary.toLocaleString()} Daily Salary!`
                : nextTier
                ? `Bring ৳${Math.max(0, 2000 - teamRechargeTotal).toLocaleString()} more team deposit for ৳300 Salary (or ${membersNeeded} member(s) for tier)`
                : 'Maximum 1,000+ recharge member tier unlocked!'}
            </p>
            {hasPlacedBetToday ? (
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>You are active today (bet placed ✓)</span>
              </p>
            ) : (
              <p className="text-xs font-bold text-cyan-700">
                You haven&apos;t placed a bet today yet.
              </p>
            )}
          </div>

          {eligibleTier && (
            <button
              onClick={handleClaim}
              disabled={alreadyClaimedToday}
              className={`w-full mt-2 py-3 rounded-xl font-black text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                alreadyClaimedToday
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm hover:brightness-105'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>
                {alreadyClaimedToday
                  ? 'Today’s Salary Already Claimed ✓'
                  : `Claim Daily Salary ৳${eligibleTier.salary.toLocaleString()}`}
              </span>
            </button>
          )}
        </div>

        {/* Agent Salary Tier Table */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
          <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white grid grid-cols-2 text-center py-3 px-4 text-xs font-black tracking-wide uppercase">
            <div>RECHARGE MEMBER</div>
            <div>AGENT SALARY</div>
          </div>
          <div className="divide-y divide-slate-100 tabular-nums">
            {SALARY_TIERS.map((row, index) => {
              const reached = rechargeMembersCount >= row.members;
              return (
                <div
                  key={row.members}
                  className={`grid grid-cols-2 text-center py-3 px-4 text-sm font-semibold transition-colors ${
                    reached
                      ? 'bg-cyan-50 text-cyan-800'
                      : index % 2 === 1
                      ? 'bg-slate-50 text-slate-700'
                      : 'bg-white text-slate-700'
                  }`}
                >
                  <div>{row.members.toLocaleString()}</div>
                  <div className="font-black text-slate-900">৳{row.salary.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-cyan-700 tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Terms and Conditions</span>
          </h3>
          <div className="space-y-2.5">
            {SALARY_TERMS.map((term, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                <span className="w-5 h-5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-700 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <span>{term}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Salary History */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-cyan-700 tracking-wide flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Salary history</span>
          </h3>

          {salaryHistory.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">
              No records yet.
            </div>
          ) : (
            <div className="space-y-2">
              {salaryHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800">{item.title}</div>
                    <div className="text-[11px] text-slate-400">{item.time}</div>
                  </div>
                  <div className="text-emerald-600 font-black font-mono tabular-nums">
                    +৳{item.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
