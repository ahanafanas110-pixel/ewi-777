import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import {
  Copy,
  Users,
  TrendingUp,
  Share2,
  QrCode,
  Award,
  ChevronRight,
  GitBranch
} from 'lucide-react';
import { getTranslation } from '../utils/i18n';

interface TeamMemberNode {
  id: string;
  uid: string;
  phone: string;
  nickname: string;
  inviteCode: string;
  registrationDate: string;
  commission: number;
  depositAmount: number;
  level: 1 | 2 | 3;
  viaName?: string;
}

export const Promotion: React.FC = () => {
  const {
    user,
    allUsers,
    referrals,
    language,
    setActiveTab,
    copyInviteLink,
    copyInviteCode,
    getInviteLink,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'members' | 'tiers' | 'rules'>('members');
  const [levelFilter, setLevelFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [showQrModal, setShowQrModal] = useState(false);

  // Build deduplicated 3-Level tree (Level 1 -> Level 2 -> Level 3) from invite link chains
  const { level1, level2, level3, allLevels } = useMemo(() => {
    const normalize = (v?: string) => String(v || '').trim().toUpperCase();
    const myCodes = new Set([normalize(user.inviteCode), normalize(user.uid)].filter(Boolean));

    const userByCode = new Map<string, typeof allUsers[number]>();
    allUsers.forEach((u) => {
      const c1 = normalize(u.inviteCode);
      const c2 = normalize(u.uid);
      if (c1) userByCode.set(c1, u);
      if (c2) userByCode.set(c2, u);
    });

    const collectChildren = (
      parentCodes: Set<string>,
      lvl: 1 | 2 | 3,
      excludeKeys: Set<string>,
      parentNameByCode?: Map<string, string>
    ): TeamMemberNode[] => {
      const map = new Map<string, TeamMemberNode>();

      referrals.forEach((r) => {
        const refC = normalize(r.referrerCode);
        if (!refC || !parentCodes.has(refC)) return;
        const key = normalize(r.uid || r.phone || r.id);
        if (!key || excludeKeys.has(key)) return;
        const matchedUser = userByCode.get(normalize(r.uid));
        map.set(key, {
          id: r.id,
          uid: r.uid || key,
          phone: r.phone || matchedUser?.phone || 'Member',
          nickname: matchedUser?.nickname || r.nickname || 'Member',
          inviteCode: normalize(matchedUser?.inviteCode || r.uid),
          registrationDate: r.registrationDate || new Date().toISOString().slice(0, 10),
          commission: Number(r.commission || 0),
          depositAmount: Math.max(Number(r.depositAmount) || 0, Number(matchedUser?.totalDeposited) || 0),
          level: lvl,
          viaName: parentNameByCode?.get(refC)
        });
      });

      allUsers.forEach((u) => {
        const refBy = normalize(u.referredBy);
        if (!refBy || !parentCodes.has(refBy)) return;
        const key = normalize(u.uid || u.phone || u.id);
        if (!key || excludeKeys.has(key)) return;
        const existing = map.get(key);
        const dep = Number(u.totalDeposited || 0);
        if (!existing) {
          map.set(key, {
            id: `u_${u.id}`,
            uid: u.uid || u.id,
            phone: u.phone || u.email || 'Member',
            nickname: u.nickname || 'Member',
            inviteCode: normalize(u.inviteCode || u.uid),
            registrationDate: u.createdAt ? u.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            commission: 0,
            depositAmount: dep,
            level: lvl,
            viaName: parentNameByCode?.get(refBy)
          });
        } else {
          map.set(key, {
            ...existing,
            inviteCode: existing.inviteCode || normalize(u.inviteCode || u.uid),
            depositAmount: Math.max(existing.depositAmount, dep),
            nickname: u.nickname || existing.nickname,
            viaName: existing.viaName || parentNameByCode?.get(refBy)
          });
        }
      });

      return Array.from(map.values());
    };

    const seen = new Set<string>(myCodes);
    const l1 = collectChildren(myCodes, 1, seen);
    const l1Codes = new Set<string>();
    const l1NameMap = new Map<string, string>();
    l1.forEach((n) => {
      seen.add(normalize(n.uid));
      if (n.inviteCode) {
        seen.add(n.inviteCode);
        l1Codes.add(n.inviteCode);
        l1NameMap.set(n.inviteCode, `${n.nickname} (${n.uid})`);
      }
      if (n.uid) {
        l1Codes.add(normalize(n.uid));
        l1NameMap.set(normalize(n.uid), `${n.nickname} (${n.uid})`);
      }
    });

    const l2 = l1Codes.size > 0 ? collectChildren(l1Codes, 2, seen, l1NameMap) : [];
    const l2Codes = new Set<string>();
    const l2NameMap = new Map<string, string>();
    l2.forEach((n) => {
      seen.add(normalize(n.uid));
      if (n.inviteCode) {
        seen.add(n.inviteCode);
        l2Codes.add(n.inviteCode);
        l2NameMap.set(n.inviteCode, `${n.nickname} (${n.uid})`);
      }
      if (n.uid) {
        l2Codes.add(normalize(n.uid));
        l2NameMap.set(normalize(n.uid), `${n.nickname} (${n.uid})`);
      }
    });

    const l3 = l2Codes.size > 0 ? collectChildren(l2Codes, 3, seen, l2NameMap) : [];
    const combined = [...l1, ...l2, ...l3];
    return { level1: l1, level2: l2, level3: l3, allLevels: combined };
  }, [referrals, allUsers, user.inviteCode, user.uid]);

  const filteredMembers = useMemo(() => {
    if (levelFilter === 'all') return allLevels;
    return allLevels.filter((m) => m.level === levelFilter);
  }, [allLevels, levelFilter]);

  const l1Deposit = level1.reduce((sum, m) => sum + m.depositAmount, 0);
  const l2Deposit = level2.reduce((sum, m) => sum + m.depositAmount, 0);
  const l3Deposit = level3.reduce((sum, m) => sum + m.depositAmount, 0);

  const totalCommission = allLevels.reduce((sum, r) => sum + Number(r.commission || 0), 0);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const yesterdayCommission = allLevels
    .filter((r) => r.registrationDate.startsWith(yesterdayStr))
    .reduce((sum, r) => sum + Number(r.commission || 0), 0);

  const inviteLink = getInviteLink();
  const shareText = encodeURIComponent(
    `Join Deshi Win Premium Lottery & Trading! Register with my invite code: ${user.inviteCode} and start playing: ${inviteLink}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${shareText}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Header title={getTranslation(language, 'promotion')} showBack={false} />

      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white px-4 pt-4 pb-12 rounded-b-[2rem] shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-cyan-100 font-medium">
              {getTranslation(language, 'yesterdayCommission')}
            </div>
            <div className="text-3xl font-black tracking-tight mt-1 tabular-nums">
              ৳{yesterdayCommission.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-cyan-100 font-medium">
              {getTranslation(language, 'totalCommission')}
            </div>
            <div className="text-2xl font-black tracking-tight mt-1 text-cyan-200 tabular-nums">
              ৳{totalCommission.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Level Rebate Progress bar */}
        <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-cyan-200" />
              <span>{getTranslation(language, 'agencyLevel')}: VIP{user.vipLevel}</span>
            </span>
            <span className="text-cyan-200">{getTranslation(language, 'rebateLabel')} 0.60%</span>
          </div>
          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-300 to-teal-300 h-full rounded-full shadow-xs transition-all"
              style={{ width: `${Math.min(100, Math.max(12, allLevels.length * 8))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-cyan-100 mt-1">
            <span>
              {getTranslation(language, 'directTeam')}: {level1.length} {getTranslation(language, 'membersUnit')}
            </span>
            <span>
              L1: {level1.length} • L2: {level2.length} • L3: {level3.length} ({adminInfoRate(user.vipLevel)})
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 -mt-7 mb-4 space-y-3">
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 grid grid-cols-2 gap-3">
          <div className="bg-cyan-50/70 rounded-2xl p-3 border border-cyan-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                {level1.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 leading-tight">
                {getTranslation(language, 'directSubordinates')}
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                {allLevels.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 leading-tight">
                {getTranslation(language, 'teamSubordinates')}
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated 3-Level Tree Breakdown */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-cyan-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <GitBranch className="w-4 h-4 text-cyan-600" />
              <span>{getTranslation(language, 'threeLevelTracking')}</span>
            </div>
            <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
              L1 → L2 → L3
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('members');
                setLevelFilter(levelFilter === 1 ? 'all' : 1);
              }}
              className={`rounded-2xl p-2.5 border transition-all ${
                levelFilter === 1
                  ? 'bg-cyan-50 border-cyan-500 ring-1 ring-cyan-400'
                  : 'bg-slate-50 border-slate-200 hover:border-cyan-300'
              }`}
            >
              <div className="text-[10px] font-black uppercase text-cyan-700">
                {getTranslation(language, 'level1Label')}
              </div>
              <div className="text-lg font-black text-slate-900 leading-tight mt-0.5">
                {level1.length}
              </div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                ৳{l1Deposit.toLocaleString()}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('members');
                setLevelFilter(levelFilter === 2 ? 'all' : 2);
              }}
              className={`rounded-2xl p-2.5 border transition-all ${
                levelFilter === 2
                  ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-400'
                  : 'bg-slate-50 border-slate-200 hover:border-teal-300'
              }`}
            >
              <div className="text-[10px] font-black uppercase text-teal-700">
                {getTranslation(language, 'level2Label')}
              </div>
              <div className="text-lg font-black text-slate-900 leading-tight mt-0.5">
                {level2.length}
              </div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                ৳{l2Deposit.toLocaleString()}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('members');
                setLevelFilter(levelFilter === 3 ? 'all' : 3);
              }}
              className={`rounded-2xl p-2.5 border transition-all ${
                levelFilter === 3
                  ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-400'
                  : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="text-[10px] font-black uppercase text-indigo-700">
                {getTranslation(language, 'level3Label')}
              </div>
              <div className="text-lg font-black text-slate-900 leading-tight mt-0.5">
                {level3.length}
              </div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                ৳{l3Deposit.toLocaleString()}
              </div>
            </button>
          </div>
          <p className="text-[10.5px] text-slate-500 leading-snug">
            {getTranslation(language, 'threeLevelInviteGuide')}
          </p>
        </div>
      </div>

      {/* INVITATION LINK & CODE SECTION */}
      <div className="px-4 space-y-4">
        <button
          onClick={() => {
            setActiveTab('salary');
            window.location.hash = '#/salary';
          }}
          className="w-full bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-left text-white shadow-sm flex items-center justify-between gap-3 active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center shadow-xs flex-shrink-0">
              <Award className="w-6 h-6 stroke-[2.3]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-white">
                  {getTranslation(language, 'threeLevelSalary')}
                </span>
              </div>
              <div className="text-[11px] text-cyan-100 truncate mt-0.5">
                {getTranslation(language, 'threeLevelSalaryDesc')}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-cyan-200 flex-shrink-0" />
        </button>

        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-600" />
              <span>{getTranslation(language, 'inviteFriendsEarn')}</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 whitespace-nowrap">
              {getTranslation(language, 'threeLevelTracking')}
            </span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                {getTranslation(language, 'inviteCode')}
              </div>
              <div className="text-lg font-black tracking-widest text-cyan-700">
                {user.inviteCode}
              </div>
            </div>
            <button
              onClick={copyInviteCode}
              className="px-4 py-2 rounded-xl bg-cyan-100 hover:bg-cyan-200 text-cyan-800 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{getTranslation(language, 'copyCode')}</span>
            </button>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2">
            <div className="text-[11px] font-semibold text-slate-500">
              {getTranslation(language, 'invitationLink')}
            </div>
            <div className="text-xs text-slate-700 font-mono break-all bg-white p-2.5 rounded-xl border border-slate-200 select-all">
              {inviteLink}
            </div>
          </div>

          <button
            onClick={copyInviteLink}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-extrabold text-sm shadow-sm active:scale-98 transition-all hover:brightness-105 flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>{getTranslation(language, 'copyInvitationLink')}</span>
          </button>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-1 rounded-2xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-[11px] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#25D366" />
                <path
                  d="M23.1 8.85C21.2 6.95 18.68 5.9 15.98 5.9C10.42 5.9 5.9 10.42 5.9 15.98C5.9 17.76 6.36 19.5 7.25 21.02L5.82 26.25L11.17 24.85C12.64 25.65 14.3 26.07 15.98 26.07C21.54 26.07 26.06 21.55 26.06 15.99C26.06 13.3 25.01 10.76 23.1 8.85ZM15.98 24.37C14.48 24.37 13.01 23.97 11.72 23.21L11.42 23.03L8.24 23.86L9.09 20.76L8.89 20.44C8.05 19.1 7.6 17.56 7.6 15.98C7.6 11.36 11.36 7.6 15.98 7.6C18.22 7.6 20.32 8.47 21.9 10.05C23.48 11.63 24.35 13.74 24.35 15.98C24.36 20.61 20.6 24.37 15.98 24.37Z"
                  fill="white"
                />
              </svg>
              <span>WhatsApp</span>
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-1 rounded-2xl bg-[#229ED9]/10 text-[#007AB8] hover:bg-[#229ED9]/20 font-bold text-[11px] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#229ED9" />
                <path
                  d="M23.38 9.64L20.66 22.46C20.45 23.36 19.91 23.58 19.15 23.16L15 20.1L13 22.02C12.78 22.24 12.59 22.43 12.16 22.43L12.46 18.2L20.16 11.24C20.49 10.94 20.09 10.78 19.64 11.08L10.12 17.07L6.03 15.79C5.14 15.51 5.12 14.9 6.22 14.47L22.22 8.31C22.96 8.04 23.61 8.49 23.38 9.64Z"
                  fill="white"
                />
              </svg>
              <span>Telegram</span>
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-1 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 font-bold text-[11px] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#1877F2" />
                <path
                  d="M21.05 20.62L21.75 16.02H17.34V13.03C17.34 11.77 17.96 10.54 19.93 10.54H21.94V6.62C21.94 6.62 20.12 6.31 18.37 6.31C14.73 6.31 12.35 8.52 12.35 12.51V16.02H8.31V20.62H12.35V31.74C13.16 31.87 13.99 31.94 14.84 31.94C15.7 31.94 16.53 31.87 17.34 31.74V20.62H21.05Z"
                  fill="white"
                />
              </svg>
              <span>Facebook</span>
            </a>
            <button
              onClick={() => setShowQrModal(true)}
              className="py-2.5 px-1 rounded-2xl bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-bold text-[11px] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <div className="w-[26px] h-[26px] rounded-full bg-cyan-600 text-white flex items-center justify-center">
                <QrCode className="w-3.5 h-3.5 stroke-[2.4]" />
              </div>
              <span>QR Code</span>
            </button>
          </div>
        </div>

        {/* Tabs for Invited Members, Tiers, and Rules */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200">
          <div className="flex border-b border-slate-200 mb-4">
            <button
              onClick={() => setActiveSubTab('members')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeSubTab === 'members'
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {getTranslation(language, 'invitedMembers')} ({allLevels.length})
            </button>
            <button
              onClick={() => setActiveSubTab('tiers')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeSubTab === 'tiers'
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {getTranslation(language, 'rebateTiers')}
            </button>
            <button
              onClick={() => setActiveSubTab('rules')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeSubTab === 'rules'
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {getTranslation(language, 'promotionRules')}
            </button>
          </div>

          {activeSubTab === 'members' && (
            <div className="space-y-3">
              {/* Level 1, 2, 3 Filter Tabs */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: 'all' as const, label: `${getTranslation(language, 'allLevels')} (${allLevels.length})` },
                  { key: 1 as const, label: `L1 (${level1.length})` },
                  { key: 2 as const, label: `L2 (${level2.length})` },
                  { key: 3 as const, label: `L3 (${level3.length})` }
                ].map((f) => (
                  <button
                    key={String(f.key)}
                    type="button"
                    onClick={() => setLevelFilter(f.key)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-black border transition-all tabular-nums ${
                      levelFilter === f.key
                        ? 'bg-[#0891B2] text-white border-[#0891B2] shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {getTranslation(language, 'noRecordsYet')} ({user.inviteCode})
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const badgeStyle =
                    member.level === 1
                      ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                      : member.level === 2
                      ? 'bg-teal-100 text-teal-800 border-teal-200'
                      : 'bg-indigo-100 text-indigo-800 border-indigo-200';
                  return (
                    <div
                      key={`${member.level}_${member.id}`}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{member.nickname}</span>
                          <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black ${badgeStyle}`}>
                            Level {member.level}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          UID: {member.uid} • {member.phone}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {getTranslation(language, 'joined')}: {member.registrationDate} • {getTranslation(language, 'deposited')}: ৳{(member.depositAmount || 0).toFixed(2)}
                        </div>
                        {member.viaName && (
                          <div className="text-[10px] font-bold text-cyan-700 mt-0.5">
                            {getTranslation(language, 'viaLabel')}: {member.viaName}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-black text-emerald-600 font-mono tabular-nums">
                          +৳{Number(member.commission || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">{getTranslation(language, 'totalRebate')}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeSubTab === 'tiers' && (
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    {getTranslation(language, 'level1Label')} — Direct Referrals
                  </div>
                  <div className="text-[11px] text-slate-500">Friends who register via your invite link</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-cyan-700">0.60%</span>
                  <div className="text-[10px] text-slate-400">{getTranslation(language, 'rebateLabel')}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    {getTranslation(language, 'level2Label')} — Sub-Referrals
                  </div>
                  <div className="text-[11px] text-slate-500">Members invited by your Level 1 friends</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-teal-700">0.18%</span>
                  <div className="text-[10px] text-slate-400">{getTranslation(language, 'rebateLabel')}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    {getTranslation(language, 'level3Label')} — Extended Team
                  </div>
                  <div className="text-[11px] text-slate-500">Members invited by Level 2 members</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-blue-600">0.05%</span>
                  <div className="text-[10px] text-slate-400">{getTranslation(language, 'rebateLabel')}</div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'rules' && (
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="flex gap-2">
                <span className="text-cyan-700 font-bold">1.</span>
                <p>{getTranslation(language, 'threeLevelInviteGuide')}</p>
              </div>
              <div className="flex gap-2">
                <span className="text-cyan-700 font-bold">2.</span>
                <p>For every valid user across Level 1, Level 2 &amp; Level 3 who registers and deposits/bets, your team counts &amp; commission update automatically.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-cyan-700 font-bold">3.</span>
                <p>Commission can be directly withdrawn to your mobile wallet or used in games at any time.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {getTranslation(language, 'scanToRegister')}
            </h3>
            <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-200 inline-block mx-auto">
              <div className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-300 flex flex-col items-center justify-center relative">
                <div className="grid grid-cols-6 gap-1 w-full h-full p-2">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        i % 2 === 0 || i % 7 === 0 ? 'bg-[#0891B2]' : 'bg-cyan-100'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0891B2] to-[#06B6D4] text-white flex items-center justify-center font-black text-[10px] border-2 border-white shadow-md">
                    DESHI
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {getTranslation(language, 'inviteCode')}: <span className="text-cyan-700 font-bold">{user.inviteCode}</span>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-95"
            >
              {getTranslation(language, 'close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function adminInfoRate(vipLevel: number): string {
  const pct = (0.5 + vipLevel * 0.05).toFixed(2);
  return `${pct}%`;
}
