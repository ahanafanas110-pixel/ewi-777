import React, { useEffect, useMemo, useState } from 'react';
import { useApp, getLocalDateStr } from '../context/AppContext';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  GitBranch,
  Headphones,
  Lock,
  Users
} from 'lucide-react';
import { getTranslation } from '../utils/i18n';

const SALARY_TIERS = [
  { members: 5, salary: 300 },
  { members: 12, salary: 1000 },
  { members: 20, salary: 2200 },
  { members: 35, salary: 4000 },
  { members: 60, salary: 8000 },
  { members: 80, salary: 13000 },
  { members: 130, salary: 18000 },
  { members: 250, salary: 30000 },
  { members: 400, salary: 40000 },
  { members: 700, salary: 70000 },
  { members: 1000, salary: 100000 }
];

const SALARY_TERMS = [
  'Minimum salary starts from 5 active recharge members (৳300). Under 5 recharge members is not eligible for salary.',
  'Must be active and play daily (at least 1 bet yourself). Fake members put the salary on hold or stop it.',
  'Same IP, same bank/wallet details or same phone number cannot claim salary.',
  '3 Level Salary: Level 1 (direct invite), Level 2 (Level 1’s invite), and Level 3 (Level 2’s invite). Minimum 25% deposit MUST be met under your team & own deposit — without 25%, salary can NEVER be claimed.',
  'Even if total 3-level deposit is ৳3,500 or ৳4,000 (under 12 members / ৳10,000 tier), salary stays ৳300 until the next tier conditions are fully unlocked.',
  '300 × 10 = 3,000 — with at least 5 recharge members & ৳3,000+ team deposit (plus 25% rule), you unlock ৳300.',
  'For all tiers, your own deposit and minimum 25% deposit rule must be satisfied (team total recharge ≥ 10× salary).',
  'For higher tiers (৳1,000+), team total betting must be over 3× the team recharge.',
  'Salary is NOT credited automatically — meet the 25% & tier conditions first, then click Apply for verification.',
  'All decisions are final by Deshi Win.'
];

interface LevelMemberNode {
  key: string;
  uid: string;
  inviteCode: string;
  depositAmount: number;
  commission: number;
}

export const Salary: React.FC = () => {
  const {
    user,
    allUsers,
    adminSettings,
    referrals,
    bets,
    aviatorBets,
    binaryBets,
    transactions,
    claimAgentSalary,
    sendSupportMessage,
    setActiveTab,
    goBack,
    language,
    showToast
  } = useApp();

  const [midnightCountdown, setMidnightCountdown] = useState('00:00:00');
  const today = getLocalDateStr(
    new Date(),
    typeof adminSettings.timezoneOffsetMinutes === 'number'
      ? adminSettings.timezoneOffsetMinutes
      : 360
  );

  const threeLevelAppliedKey = `deshi_3level_salary_applied_${user.id || 'guest'}_${today}`;
  const [threeLevelAppliedToday, setThreeLevelAppliedToday] = useState<boolean>(() => {
    try {
      return localStorage.getItem(threeLevelAppliedKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setThreeLevelAppliedToday(localStorage.getItem(threeLevelAppliedKey) === '1');
    } catch {
      setThreeLevelAppliedToday(false);
    }
  }, [threeLevelAppliedKey]);

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

  // Build deduplicated 3-Level downline tree (Level 1 -> Level 2 -> Level 3)
  const { level1, level2, level3 } = useMemo(() => {
    const normalize = (v?: string) => String(v || '').trim().toUpperCase();
    const myCodes = new Set([normalize(user.inviteCode), normalize(user.uid)].filter(Boolean));
    const userByCode = new Map<string, typeof allUsers[number]>();
    allUsers.forEach((u) => {
      const c1 = normalize(u.inviteCode);
      const c2 = normalize(u.uid);
      if (c1) userByCode.set(c1, u);
      if (c2) userByCode.set(c2, u);
    });

    const collectChildren = (parentCodes: Set<string>, excludeKeys: Set<string>): LevelMemberNode[] => {
      const map = new Map<string, LevelMemberNode>();

      referrals.forEach((r) => {
        const refC = normalize(r.referrerCode);
        if (!refC || !parentCodes.has(refC)) return;
        const key = normalize(r.uid || r.phone || r.id);
        if (!key || excludeKeys.has(key)) return;
        const matchedUser = userByCode.get(normalize(r.uid));
        map.set(key, {
          key,
          uid: r.uid || key,
          inviteCode: normalize(matchedUser?.inviteCode),
          depositAmount: Math.max(Number(r.depositAmount) || 0, Number(matchedUser?.totalDeposited) || 0),
          commission: Number(r.commission) || 0
        });
      });

      allUsers.forEach((u) => {
        const refBy = normalize(u.referredBy);
        if (!refBy || !parentCodes.has(refBy)) return;
        const key = normalize(u.uid || u.phone || u.id);
        if (!key || excludeKeys.has(key)) return;
        const existing = map.get(key);
        const dep = Number(u.totalDeposited) || 0;
        if (!existing) {
          map.set(key, {
            key,
            uid: u.uid || u.id,
            inviteCode: normalize(u.inviteCode),
            depositAmount: dep,
            commission: 0
          });
        } else {
          map.set(key, {
            ...existing,
            inviteCode: existing.inviteCode || normalize(u.inviteCode),
            depositAmount: Math.max(existing.depositAmount, dep)
          });
        }
      });

      return Array.from(map.values());
    };

    const seen = new Set<string>(myCodes);
    const l1 = collectChildren(myCodes, seen);
    l1.forEach((n) => {
      seen.add(n.key);
      if (n.inviteCode) seen.add(n.inviteCode);
    });

    const l1Codes = new Set<string>();
    l1.forEach((n) => {
      if (n.inviteCode) l1Codes.add(n.inviteCode);
      if (n.uid) l1Codes.add(normalize(n.uid));
    });
    const l2 = l1Codes.size > 0 ? collectChildren(l1Codes, seen) : [];
    l2.forEach((n) => {
      seen.add(n.key);
      if (n.inviteCode) seen.add(n.inviteCode);
    });

    const l2Codes = new Set<string>();
    l2.forEach((n) => {
      if (n.inviteCode) l2Codes.add(n.inviteCode);
      if (n.uid) l2Codes.add(normalize(n.uid));
    });
    const l3 = l2Codes.size > 0 ? collectChildren(l2Codes, seen) : [];

    return { level1: l1, level2: l2, level3: l3 };
  }, [allUsers, referrals, user.inviteCode, user.uid]);

  const l1Deposit = level1.reduce((s, m) => s + m.depositAmount, 0);
  const l2Deposit = level2.reduce((s, m) => s + m.depositAmount, 0);
  const l3Deposit = level3.reduce((s, m) => s + m.depositAmount, 0);
  const threeLevelTotalDeposit = l1Deposit + l2Deposit + l3Deposit;
  const yourDeposit = Number(user.totalDeposited) || 0;

  // Minimum 25% of total deposit MUST exist under your team/levels & own deposit; otherwise NEVER eligible
  const min25Threshold = threeLevelTotalDeposit * 0.25;
  const l1Has25 = threeLevelTotalDeposit > 0 && l1Deposit >= min25Threshold;
  const l2Has25 = threeLevelTotalDeposit > 0 && l2Deposit >= min25Threshold;
  const l3Has25 = threeLevelTotalDeposit > 0 && l3Deposit >= min25Threshold;
  const ownHas25 = threeLevelTotalDeposit > 0 && yourDeposit >= min25Threshold;

  // Direct/Team tier calculations
  const rechargeMembersList = level1.filter((r) => r.depositAmount > 0);
  const rechargeMembersCount = rechargeMembersList.length;
  const teamRechargeTotal = threeLevelTotalDeposit > 0 ? threeLevelTotalDeposit : l1Deposit;
  const teamBetsTotal = Math.round(
    [...level1, ...level2, ...level3].reduce((sum, r) => sum + r.commission * 120, 0)
  );

  const hasMin25All =
    rechargeMembersCount >= 5 &&
    threeLevelTotalDeposit >= 3000 &&
    ownHas25 &&
    l1Has25 &&
    l2Has25 &&
    l3Has25;

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

  // Strict tier eligibility: minimum 5 recharge members + 25% deposit required for EVERY tier;
  // Total deposits remain capped at ৳300 until 12 members + ৳10,000 (1,000×10) + 3× bet are met.
  const matchedFullTier = [...SALARY_TIERS]
    .reverse()
    .find(
      (t) =>
        rechargeMembersCount >= t.members &&
        hasPlacedBetToday &&
        teamRechargeTotal >= t.salary * 10 &&
        yourDeposit >= teamRechargeTotal * 0.25 &&
        hasMin25All &&
        (t.members <= 5 || teamBetsTotal > teamRechargeTotal * 3)
    );

  const unlockedThreeLevelSalary = matchedFullTier
    ? matchedFullTier.salary
    : hasMin25All && hasPlacedBetToday
    ? 300
    : 0;

  const alreadyAppliedToday = user.lastSalaryClaimDate === today;
  const salaryHistory = transactions.filter((t) => t.userId === user.id && t.type === 'salary_bonus');

  const handleApplyTierSalary = () => {
    if (!matchedFullTier) {
      showToast('Need 25% minimum deposit & all tier conditions before applying for salary.');
      return;
    }
    const res = claimAgentSalary(matchedFullTier.members, matchedFullTier.salary);
    if (!res.success) {
      showToast(res.message);
      return;
    }
    sendSupportMessage({
      userId: user.id || 'guest',
      userUid: user.uid || 'GUEST',
      userNickname: user.nickname || user.phone || 'Member',
      userPhone: user.phone || user.email || '',
      sender: 'user',
      text: `[3 Level Salary Application] UID: ${user.uid || 'GUEST'} | Tier: ${matchedFullTier.members} Members (৳${matchedFullTier.salary.toLocaleString()}) | Combined: ৳${threeLevelTotalDeposit.toLocaleString()} | L1: ৳${l1Deposit.toLocaleString()} | L2: ৳${l2Deposit.toLocaleString()} | L3: ৳${l3Deposit.toLocaleString()} | Own: ৳${yourDeposit.toLocaleString()}`
    }).catch(() => {});
  };

  const handleApplyThreeLevelSalary = () => {
    if (threeLevelAppliedToday) {
      showToast('3 Level Salary application already submitted today.');
      return;
    }
    if (!hasMin25All || unlockedThreeLevelSalary <= 0) {
      showToast('Need 25% minimum deposit across all levels & active daily bet — cannot apply without 25%.');
      return;
    }
    try {
      localStorage.setItem(threeLevelAppliedKey, '1');
    } catch {}
    setThreeLevelAppliedToday(true);
    sendSupportMessage({
      userId: user.id || 'guest',
      userUid: user.uid || 'GUEST',
      userNickname: user.nickname || user.phone || 'Member',
      userPhone: user.phone || user.email || '',
      sender: 'user',
      text: `[3 Level Salary Application — ৳${unlockedThreeLevelSalary.toLocaleString()}] UID: ${user.uid || 'GUEST'} | Combined 3-Level Deposit: ৳${threeLevelTotalDeposit.toLocaleString()} | L1 (${level1.length}): ৳${l1Deposit.toLocaleString()} | L2 (${level2.length}): ৳${l2Deposit.toLocaleString()} | L3 (${level3.length}): ৳${l3Deposit.toLocaleString()} | Own (Min 25%): ৳${yourDeposit.toLocaleString()}`
    }).catch(() => {});
    showToast(`3 Level Salary (৳${unlockedThreeLevelSalary.toLocaleString()}) application sent to Customer Care!`);
    setActiveTab('customer-service');
    window.location.hash = '#/customer-service';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          type="button"
          onClick={() => goBack('promotion')}
          className="relative z-20 p-2 -ml-1 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-black tracking-tight text-slate-900">
          {getTranslation(language, 'threeLevelSalary')}
        </h1>
        <button
          onClick={() => {
            setActiveTab('promotion');
            window.location.hash = '#/promotion';
          }}
          className="text-[11px] font-black text-cyan-700 bg-cyan-50 px-3 py-2 rounded-lg border border-cyan-200 hover:bg-cyan-100 whitespace-nowrap"
        >
          {getTranslation(language, 'inviteTeam')}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Manual Apply Banner (No Auto-Collect) */}
        <div className="bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-2xl p-4 text-white shadow-sm flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-cyan-200">
              {getTranslation(language, 'threeLevelSalaryShort')} • APPLY ONLY
            </div>
            <div className="text-xs font-extrabold mt-0.5">
              {alreadyAppliedToday || threeLevelAppliedToday
                ? getTranslation(language, 'salaryApplied')
                : getTranslation(language, 'min25DepositRequired')}
            </div>
          </div>
          <div className="text-right flex-shrink-0 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
            <div className="text-[9px] uppercase font-bold text-cyan-100">
              {getTranslation(language, 'resetIn')}
            </div>
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
            <span>{getTranslation(language, 'viewAllChart')}</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white text-[10px] whitespace-nowrap">
            {getTranslation(language, 'allChartBtn')}
          </span>
        </button>

        {/* Dedicated 3 Level Salary Card */}
        <div className="bg-white rounded-2xl p-4 border border-cyan-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 leading-tight">
                  {getTranslation(language, 'threeLevelSalaryShort')}
                </h2>
                <p className="text-[11px] font-semibold text-slate-500">
                  {getTranslation(language, 'min25DepositRequired')}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200 tabular-nums whitespace-nowrap">
              ৳{threeLevelTotalDeposit.toLocaleString()} {getTranslation(language, 'totalLabel')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
            {[
              { label: getTranslation(language, 'level1Label'), members: level1.length, dep: l1Deposit, met: l1Has25 },
              { label: getTranslation(language, 'level2Label'), members: level2.length, dep: l2Deposit, met: l2Has25 },
              { label: getTranslation(language, 'level3Label'), members: level3.length, dep: l3Deposit, met: l3Has25 }
            ].map((lvl) => (
              <div
                key={lvl.label}
                className={`rounded-xl p-2.5 border ${
                  lvl.met ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                  {lvl.label} ({lvl.members})
                </div>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  ৳{lvl.dep.toLocaleString()}
                </div>
                <div
                  className={`text-[10px] font-bold mt-0.5 ${
                    lvl.met ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {lvl.met ? getTranslation(language, 'met25') : getTranslation(language, 'need25')}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 tabular-nums">
            <span className="text-slate-600">{getTranslation(language, 'ownDepositMin25')}</span>
            <span className={ownHas25 ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>
              ৳{yourDeposit.toLocaleString()} {threeLevelTotalDeposit > 0 ? `/ ৳${Math.ceil(min25Threshold).toLocaleString()} (25%)` : ''} {ownHas25 ? '✓' : `· ${getTranslation(language, 'need25')}`}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold bg-cyan-50/60 rounded-xl px-3 py-2 border border-cyan-200/80 tabular-nums">
            <span className="text-cyan-900">{getTranslation(language, 'eligibleSalaryRate')}</span>
            <span className="text-cyan-800 font-black">
              {unlockedThreeLevelSalary > 0
                ? `৳${unlockedThreeLevelSalary.toLocaleString()}`
                : `${getTranslation(language, 'locked')} (${getTranslation(language, 'need25')})`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleApplyThreeLevelSalary}
            disabled={threeLevelAppliedToday || !hasMin25All || !hasPlacedBetToday}
            className={`w-full py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 min-h-[44px] ${
              threeLevelAppliedToday
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                : hasMin25All && hasPlacedBetToday
                ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm hover:brightness-105 active:scale-98'
                : 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {threeLevelAppliedToday ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{getTranslation(language, 'salaryApplied')}</span>
              </>
            ) : hasMin25All && hasPlacedBetToday ? (
              <>
                <Headphones className="w-4 h-4" />
                <span>{getTranslation(language, 'applySalary')} (৳{unlockedThreeLevelSalary.toLocaleString()})</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>{getTranslation(language, 'need25DepositToApply')}</span>
              </>
            )}
          </button>
        </div>

        {/* Today's Progress Summary Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-cyan-700 tracking-wide">
              {getTranslation(language, 'todaysProgress')}
            </h2>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
              {today}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs pt-1 tabular-nums">
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-500">
                {getTranslation(language, 'rechargeMembers')}
              </div>
              <strong className="text-sm text-slate-900 font-black">{rechargeMembersCount}</strong>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-500">
                {getTranslation(language, 'threeLevelTeamRecharge')}
              </div>
              <strong className="text-sm text-slate-900 font-black">৳{teamRechargeTotal.toLocaleString()}</strong>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-500">
                {getTranslation(language, 'teamBets')}
              </div>
              <strong className="text-sm text-slate-900 font-black">৳{teamBetsTotal.toLocaleString()}</strong>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-slate-600">
              <div className="text-[10px] font-semibold text-slate-500">
                {getTranslation(language, 'yourDeposit')}
              </div>
              <strong className="text-sm text-slate-900 font-black">৳{yourDeposit.toLocaleString()}</strong>
            </div>
          </div>

          <div className="pt-2 space-y-1 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800">
              {matchedFullTier
                ? `Unlocked ৳${matchedFullTier.salary.toLocaleString()} Tier Salary — Ready to Apply!`
                : hasMin25All && hasPlacedBetToday
                ? '৳300 Base Salary Ready (stays ৳300 until 12 members & ৳10,000+ tier unlocked)'
                : nextTier
                ? `Need 25% minimum deposit + ${membersNeeded} more recharge member(s) for ৳${nextTier.salary.toLocaleString()} tier`
                : 'Maximum 1,000+ recharge member tier unlocked!'}
            </p>
            {hasPlacedBetToday ? (
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{getTranslation(language, 'activeToday')}</span>
              </p>
            ) : (
              <p className="text-xs font-bold text-cyan-700">
                {getTranslation(language, 'noBetToday')}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleApplyTierSalary}
            disabled={alreadyAppliedToday || !matchedFullTier}
            className={`w-full mt-2 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
              alreadyAppliedToday
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed'
                : matchedFullTier
                ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm hover:brightness-105 active:scale-98'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {alreadyAppliedToday ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{getTranslation(language, 'salaryApplied')}</span>
              </>
            ) : matchedFullTier ? (
              <>
                <Award className="w-4 h-4" />
                <span>{getTranslation(language, 'applySalary')} ৳{matchedFullTier.salary.toLocaleString()}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>{getTranslation(language, 'need25DepositToApply')}</span>
              </>
            )}
          </button>
        </div>

        {/* Agent Salary Tier Table */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
          <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white grid grid-cols-2 text-center py-3 px-4 text-xs font-black tracking-wide uppercase">
            <div>{getTranslation(language, 'rechargeMemberCol')}</div>
            <div>{getTranslation(language, 'threeLevelSalaryCol')}</div>
          </div>
          <div className="divide-y divide-slate-100 tabular-nums">
            {SALARY_TIERS.map((row, index) => {
              const reached = rechargeMembersCount >= row.members && hasMin25All;
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
            <span>{getTranslation(language, 'termsAndConditions')}</span>
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
            <span>{getTranslation(language, 'salaryHistory')}</span>
          </h3>

          {salaryHistory.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">
              {getTranslation(language, 'noRecordsYet')}
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
