import React, { useState } from 'react';
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
  ShieldCheck,
  Clock,
  Check
} from 'lucide-react';
import { getTranslation } from '../utils/i18n';

export const Promotion: React.FC = () => {
  const {
    user,
    referrals,
    language,
    setActiveTab,
    copyInviteLink,
    copyInviteCode,
    getInviteLink,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'members' | 'tiers' | 'rules'>('members');
  const [showQrModal, setShowQrModal] = useState(false);

  // Calculate dynamic stats
  const userReferrals = referrals.filter(
    (r) => r.referrerCode === user.inviteCode || r.referrerCode === user.uid
  );
  const directSubordinates = userReferrals.filter((r) => r.level === 1);
  const teamSubordinates = userReferrals;
  const totalCommission = userReferrals.reduce((sum, r) => sum + r.commission, 0) + 1250.00;
  const yesterdayCommission = (totalCommission * 0.15).toFixed(2);

  const inviteLink = getInviteLink();
  const shareText = encodeURIComponent(
    `Join EWI 777 Premium Lottery & Games! Register with my invite code: ${user.inviteCode} and get ৳50 welcome bonus: ${inviteLink}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${shareText}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`;

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      <Header title={getTranslation(language, 'promotion')} showBack={false} />

      {/* Top Banner with Commission Stats (Pink Luxury) */}
      <div className="bg-gradient-to-br from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] text-white px-4 pt-4 pb-12 rounded-b-[2rem] shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-pink-100 font-medium">
              {getTranslation(language, 'yesterdayCommission')}
            </div>
            <div className="text-3xl font-black tracking-tight mt-1">
              ৳{yesterdayCommission}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-pink-100 font-medium">
              {getTranslation(language, 'totalCommission')}
            </div>
            <div className="text-2xl font-black tracking-tight mt-1 text-yellow-200">
              ৳{totalCommission.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Level Rebate Progress bar */}
        <div className="bg-black/15 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-yellow-300" />
              <span>Agency Level: VIP{user.vipLevel} Agent</span>
            </span>
            <span className="text-yellow-200">Rebate 0.60%</span>
          </div>
          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-300 to-amber-400 h-full w-[68%] rounded-full shadow-xs" />
          </div>
          <div className="flex justify-between text-[10px] text-pink-100 mt-1">
            <span>Direct Team: {directSubordinates.length} members</span>
            <span>Next Level VIP5: 0.70%</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 -mt-7 mb-4">
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100 grid grid-cols-2 gap-3">
          {/* Direct Subordinates */}
          <div className="bg-[#FFF5F8] rounded-2xl p-3 border border-pink-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF2A7A] text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">
                {directSubordinates.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 leading-tight">
                {getTranslation(language, 'directSubordinates')}
              </div>
            </div>
          </div>

          {/* Team Subordinates */}
          <div className="bg-[#F0FDF4] rounded-2xl p-3 border border-green-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">
                {teamSubordinates.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 leading-tight">
                {getTranslation(language, 'teamSubordinates')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INVITATION LINK & CODE SECTION */}
      <div className="px-4 space-y-4">
        {/* Agent Daily Salary Entry Card */}
        <button
          onClick={() => {
            setActiveTab('salary');
            window.location.hash = '#/salary';
          }}
          className="w-full bg-gradient-to-r from-[#1A1405] via-[#2A1E08] to-[#1A1405] border border-amber-400/50 rounded-3xl p-4 text-left text-white shadow-md flex items-center justify-between gap-3 active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#D4A017] text-slate-950 flex items-center justify-center shadow-sm flex-shrink-0">
              <Award className="w-6 h-6 stroke-[2.3]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-[#FBBF24]">EWI777 Agent Daily Salary</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                  DAILY
                </span>
              </div>
              <div className="text-[11px] text-amber-100/80 truncate mt-0.5">
                Earn ৳300 up to ৳100,000 daily team recharge salary
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#FBBF24] flex-shrink-0" />
        </button>

        <div className="bg-white rounded-3xl p-5 shadow-xs border border-pink-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#FF2A7A]" />
              <span>Invite Friends & Earn Commission</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-[#FF2A7A] border border-pink-100">
              100% Tracking
            </span>
          </div>

          {/* Invitation Code */}
          <div className="bg-[#FFF8FA] rounded-2xl p-3 border border-pink-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">
                {getTranslation(language, 'inviteCode')}
              </div>
              <div className="text-lg font-black tracking-widest text-[#FF2A7A]">
                {user.inviteCode}
              </div>
            </div>
            <button
              onClick={copyInviteCode}
              className="px-4 py-2 rounded-xl bg-pink-100/70 hover:bg-pink-100 text-[#FF2A7A] font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{getTranslation(language, 'copyCode')}</span>
            </button>
          </div>

          {/* Invitation Link Box */}
          <div className="bg-[#FFF8FA] rounded-2xl p-3 border border-pink-100 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400">
              {getTranslation(language, 'invitationLink')}
            </div>
            <div className="text-xs text-slate-700 font-mono break-all bg-white p-2.5 rounded-xl border border-pink-100 select-all">
              {inviteLink}
            </div>
          </div>

          {/* Prominent Copy Button */}
          <button
            onClick={copyInviteLink}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-extrabold text-sm shadow-md active:scale-98 transition-all hover:brightness-105 flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>{getTranslation(language, 'copyInvitationLink')}</span>
          </button>

          {/* Quick Social Shares & QR with Official Brand Logos */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-1 rounded-2xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-[11px] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#25D366" />
                <path
                  d="M23.1 8.85C21.2 6.95 18.68 5.9 15.98 5.9C10.42 5.9 5.9 10.42 5.9 15.98C5.9 17.76 6.36 19.5 7.25 21.02L5.82 26.25L11.17 24.85C12.64 25.65 14.3 26.07 15.98 26.07C21.54 26.07 26.06 21.55 26.06 15.99C26.06 13.3 25.01 10.76 23.1 8.85ZM15.98 24.37C14.48 24.37 13.01 23.97 11.72 23.21L11.42 23.03L8.24 23.86L9.09 20.76L8.89 20.44C8.05 19.1 7.6 17.56 7.6 15.98C7.6 11.36 11.36 7.6 15.98 7.6C18.22 7.6 20.32 8.47 21.9 10.05C23.48 11.63 24.35 13.74 24.35 15.98C24.36 20.61 20.6 24.37 15.98 24.37ZM20.57 18.1C20.32 17.97 19.08 17.36 18.85 17.28C18.62 17.19 18.45 17.15 18.29 17.4C18.12 17.65 17.64 18.22 17.49 18.39C17.35 18.56 17.2 18.58 16.95 18.45C16.7 18.32 15.89 18.06 14.93 17.2C14.18 16.53 13.68 15.71 13.53 15.46C13.39 15.21 13.51 15.07 13.64 14.95C13.75 14.84 13.89 14.66 14.01 14.51C14.14 14.37 14.18 14.26 14.26 14.1C14.35 13.93 14.3 13.78 14.24 13.66C14.18 13.53 13.68 12.3 13.47 11.8C13.27 11.31 13.06 11.38 12.91 11.37C12.76 11.36 12.6 11.36 12.43 11.36C12.26 11.36 11.99 11.42 11.76 11.67C11.53 11.92 10.89 12.53 10.89 13.76C10.89 15 11.79 16.19 11.91 16.36C12.04 16.53 13.67 19.05 16.18 20.13C16.78 20.39 17.25 20.54 17.61 20.66C18.21 20.85 18.76 20.82 19.19 20.76C19.67 20.69 20.68 20.15 20.89 19.56C21.1 18.97 21.1 18.47 21.03 18.36C20.97 18.26 20.82 18.22 20.57 18.1Z"
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
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              className="py-2.5 px-1 rounded-2xl bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold text-[11px] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <div className="w-[26px] h-[26px] rounded-full bg-purple-600 text-white flex items-center justify-center">
                <QrCode className="w-3.5 h-3.5 stroke-[2.4]" />
              </div>
              <span>QR Code</span>
            </button>
          </div>
        </div>

        {/* Tabs for Subordinates Data, Commission Tiers, and Rules */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100">
          <div className="flex border-b border-pink-50 mb-4">
            <button
              onClick={() => setActiveSubTab('members')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeSubTab === 'members'
                  ? 'border-[#FF2A7A] text-[#FF2A7A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Invited Members ({teamSubordinates.length})
            </button>
            <button
              onClick={() => setActiveSubTab('tiers')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeSubTab === 'tiers'
                  ? 'border-[#FF2A7A] text-[#FF2A7A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Rebate Tiers
            </button>
            <button
              onClick={() => setActiveSubTab('rules')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeSubTab === 'rules'
                  ? 'border-[#FF2A7A] text-[#FF2A7A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Promotion Rules
            </button>
          </div>

          {/* Members List */}
          {activeSubTab === 'members' && (
            <div className="space-y-3">
              {teamSubordinates.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No subordinates yet. Share your link to start earning!
                </div>
              ) : (
                teamSubordinates.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100"
                  >
                    <div>
                      <div className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <span>{member.nickname}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-pink-100 text-[#FF2A7A] text-[9px] font-bold">
                          Tier {member.level}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        UID: {member.uid} • {member.phone}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Joined: {member.registrationDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-600 font-mono">
                        +৳{member.commission.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">Total Rebate</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Multi-Tier Commission Details */}
          {activeSubTab === 'tiers' && (
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">Tier 1 Direct Referrals</div>
                  <div className="text-[11px] text-slate-500">Friends who register via your link</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-[#FF2A7A]">0.60%</span>
                  <div className="text-[10px] text-slate-400">Recurring rebate</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">Tier 2 Sub-Referrals</div>
                  <div className="text-[11px] text-slate-500">Subordinates invited by your Tier 1 friends</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-amber-600">0.18%</span>
                  <div className="text-[10px] text-slate-400">Recurring rebate</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">Tier 3 Extended Team</div>
                  <div className="text-[11px] text-slate-500">Subordinates invited by Tier 2 members</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-blue-600">0.05%</span>
                  <div className="text-[10px] text-slate-400">Recurring rebate</div>
                </div>
              </div>
            </div>
          )}

          {/* Promotion Rules */}
          {activeSubTab === 'rules' && (
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="flex gap-2">
                <span className="text-[#FF2A7A] font-bold">1.</span>
                <p>When you invite friends through your invitation link or code, they automatically become your direct subordinates.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-[#FF2A7A] font-bold">2.</span>
                <p>For every valid user who registers and places bets, you receive multi-tier commission rebates settled automatically every day at 01:00 AM.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-[#FF2A7A] font-bold">3.</span>
                <p>Commission can be directly withdrawn to your mobile wallet or used in games at any time with 0 fees.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl border border-pink-100 space-y-4">
            <h3 className="font-bold text-base text-slate-800">Scan to Register</h3>
            <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100 inline-block mx-auto">
              <div className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-300 flex flex-col items-center justify-center relative">
                <div className="grid grid-cols-6 gap-1 w-full h-full p-2">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        i % 2 === 0 || i % 7 === 0 ? 'bg-[#FF2A7A]' : 'bg-pink-100'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF2A7A] to-[#FF758F] text-white flex items-center justify-center font-black text-xs border-2 border-white shadow-md">
                    EWI
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Invite Code: <span className="text-[#FF2A7A] font-bold">{user.inviteCode}</span>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
