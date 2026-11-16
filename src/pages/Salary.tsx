import React from 'react';
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
  'Team total recharge must be at least 10× your salary.',
  'Example: salary 600 × 10 = 6,000 — if team recharge is over 6,000 you get 600.',
  'Your own deposit must be at least 25% of the team recharge.',
  'Team total betting must be over 3× the team recharge.',
  'For great performance, find a TEACHER for better offers.',
  'All decisions are final by EWI777.'
];

export const Salary: React.FC = () => {
  const {
    user,
    referrals,
    bets,
    aviatorBets,
    binaryBets,
    transactions,
    claimAgentSalary,
    setActiveTab,
    showToast
  } = useApp();

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
        rechargeMembersCount >= t.members &&
        hasPlacedBetToday &&
        teamRechargeTotal >= t.salary * 10 &&
        yourDeposit >= teamRechargeTotal * 0.25 &&
        teamBetsTotal > teamRechargeTotal * 3
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
    <div className="min-h-screen bg-[#F7F8FC] text-slate-800 pb-24">
      {/* Light-Mode Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-200/70 px-4 py-3 flex items-center justify-between shadow-2xs">
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
          className="text-[11px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hover:bg-amber-100 whitespace-nowrap"
        >
          Invite Team
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Today's Progress Summary Card (Light Mode) */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-amber-600 tracking-wide">
              Today&apos;s progress
            </h2>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
              {today}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs pt-1 tabular-nums">
            <div className="bg-[#FFF9EB] rounded-xl px-3 py-2 border border-amber-100 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-400">Recharge members</div>
              <strong className="text-sm text-slate-900 font-black">{rechargeMembersCount}</strong>
            </div>
            <div className="bg-[#FFF9EB] rounded-xl px-3 py-2 border border-amber-100 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-400">Team recharge</div>
              <strong className="text-sm text-slate-900 font-black">৳{teamRechargeTotal.toLocaleString()}</strong>
            </div>
            <div className="bg-[#FFF9EB] rounded-xl px-3 py-2 border border-amber-100 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-400">Team bets</div>
              <strong className="text-sm text-slate-900 font-black">৳{teamBetsTotal.toLocaleString()}</strong>
            </div>
            <div className="bg-[#FFF9EB] rounded-xl px-3 py-2 border border-amber-100 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-400">Your deposit</div>
              <strong className="text-sm text-slate-900 font-black">৳{yourDeposit.toLocaleString()}</strong>
            </div>
          </div>

          <div className="pt-2 space-y-1 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800">
              {nextTier
                ? `You need ${membersNeeded} more recharge member(s) for the next tier`
                : 'Maximum 1,000+ recharge member tier unlocked!'}
            </p>
            {hasPlacedBetToday ? (
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>You are active today (bet placed ✓)</span>
              </p>
            ) : (
              <p className="text-xs font-bold text-amber-600">
                You haven&apos;t placed a bet today yet.
              </p>
            )}
          </div>

          {eligibleTier && (
            <button
              onClick={handleClaim}
              disabled={alreadyClaimedToday}
              className={`w-full mt-2 py-3 rounded-full font-black text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                alreadyClaimedToday
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-md hover:brightness-105'
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

        {/* Agent Salary Tier Table (Light Mode) */}
        <div className="bg-white rounded-2xl overflow-hidden border border-amber-200/80 shadow-xs">
          <div className="bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#EAB308] text-slate-950 grid grid-cols-2 text-center py-3 px-4 text-xs font-black tracking-wide uppercase">
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
                      ? 'bg-amber-50 text-amber-700'
                      : index % 2 === 1
                      ? 'bg-[#FAFAFC] text-slate-700'
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

        {/* Terms and Conditions (Light Mode, Exact 1-8 rules with EWI777 branding) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-amber-600 tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Terms and Conditions</span>
          </h3>
          <div className="space-y-2.5">
            {SALARY_TERMS.map((term, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <span>{term}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Salary History (Light Mode) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-amber-600 tracking-wide flex items-center gap-2">
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
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between text-xs"
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
