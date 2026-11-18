import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft } from 'lucide-react';

export const FirstGift: React.FC = () => {
  const { user, depositRequests, claimDepositBonus, setActiveTab } = useApp();

  const hasCompletedDeposit =
    (Number(user.totalDeposited) || 0) > 0 ||
    depositRequests.some((d) => d.userId === user.id && d.status === 'approved');

  const compensationRows = [
    {
      condition: 'First deposit ৳100+',
      rate: 'Total 15% compensation from First Deposit Amount',
      limit: '৳50.00'
    },
    {
      condition: 'First deposit ৳1,000+',
      rate: 'Total 20% compensation from First Deposit Amount',
      limit: '৳200.00'
    },
    {
      condition: 'First deposit ৳5,000+',
      rate: 'Total 25% compensation from First Deposit Amount',
      limit: '৳1,250.00'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-slate-800 pb-24">
      {/* Light-Mode Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
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
        <h1 className="text-sm font-black text-slate-800">Activity details</h1>
        <div className="w-7" />
      </div>

      {/* Warm Orange-Gold Hero Banner matching screenshot */}
      <div className="bg-gradient-to-r from-[#FF7B1C] via-[#FF9124] to-[#FFB347] px-4 py-5 text-white relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="space-y-2 flex-1">
            <h2 className="text-xl font-black tracking-tight">First gift</h2>
            <p className="text-[11px] font-medium text-white/95">
              There are two types of new member gift package rewards:
            </p>
            <div className="space-y-1 text-[10.5px] text-white/95 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white text-[#FF7B1C] font-black text-[10px] flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span>Bonus for first deposit negative profit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white text-[#FF7B1C] font-black text-[10px] flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span>Play games and get bonuses only for new members</span>
              </div>
            </div>
            <div className="inline-block mt-1 px-3 py-1 rounded-full border border-white/75 text-[10px] font-bold">
              Activity details
            </div>
          </div>

          {/* Open Gift Box + Gold Coins Illustration */}
          <div className="w-28 h-28 flex-shrink-0 flex items-center justify-center">
            <svg width="108" height="108" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="54" cy="92" rx="42" ry="8" fill="#EA580C" fillOpacity="0.35" />
              {/* Gold coin stack */}
              <ellipse cx="26" cy="82" rx="14" ry="5" fill="#FACC15" />
              <rect x="12" y="62" width="28" height="20" fill="#F59E0B" />
              <ellipse cx="26" cy="62" rx="14" ry="5" fill="#FDE047" />
              {/* Opened Gift box */}
              <rect x="42" y="48" width="44" height="38" rx="6" fill="#EF4444" />
              <rect x="60" y="48" width="8" height="38" fill="#FDE047" />
              <rect x="38" y="34" width="52" height="12" rx="4" transform="rotate(-12 38 34)" fill="#F43F5E" />
              <circle cx="58" cy="36" r="5" fill="#FDE047" />
              <circle cx="72" cy="32" r="4" fill="#FACC15" />
            </svg>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Event Start / Claim Card */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden text-center pb-5">
          <div className="inline-block bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-xs px-8 py-2 rounded-b-2xl shadow-xs">
            First Deposit Event Status
          </div>
          <div className="mt-4 px-4 space-y-2">
            <div className="text-base font-black text-[#B45309]">
              {user.hasClaimedDepositBonus
                ? 'First Gift Bonus Claimed ✓'
                : hasCompletedDeposit
                ? 'Eligible for ৳50 First Deposit Gift!'
                : 'Complete Your First Deposit to Unlock'}
            </div>
            <p className="text-xs text-slate-500">
              {user.hasClaimedDepositBonus
                ? 'Your 1-time new member First Deposit reward has been added.'
                : hasCompletedDeposit
                ? 'Your approved deposit qualifies for the 1-time First Deposit gift.'
                : 'Make your first deposit of ৳200+ to unlock your new member package.'}
            </p>
          </div>
        </div>

        {/* 3-Column Conditions / Compensation / Bonus Limit Table */}
        <div className="bg-white rounded-2xl overflow-hidden border border-amber-200 shadow-xs">
          <div className="bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white grid grid-cols-3 text-center py-3 px-2 text-[11px] font-black leading-tight items-center">
            <div>Conditions of participation</div>
            <div>Get Compensation Bonus</div>
            <div>Bonus limit</div>
          </div>
          <div className="divide-y divide-amber-100 text-xs text-center">
            {compensationRows.map((row) => (
              <div key={row.condition} className="grid grid-cols-3 py-3.5 px-2 items-center gap-1">
                <div className="font-bold text-slate-700">{row.condition}</div>
                <div className="text-slate-600 text-[11px] leading-snug">{row.rate}</div>
                <div className="font-black text-[#B45309] tabular-nums">{row.limit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            if (user.hasClaimedDepositBonus) return;
            if (hasCompletedDeposit) {
              claimDepositBonus();
            } else {
              setActiveTab('deposit');
              window.location.hash = '#/deposit';
            }
          }}
          disabled={Boolean(user.hasClaimedDepositBonus)}
          className={`w-full py-3.5 rounded-full font-black text-xs shadow-sm transition-all active:scale-98 ${
            user.hasClaimedDepositBonus
              ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
              : hasCompletedDeposit
              ? 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white shadow-md'
              : 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white'
          }`}
        >
          {user.hasClaimedDepositBonus
            ? 'First Gift Already Claimed ✓'
            : hasCompletedDeposit
            ? 'Claim ৳50 First Deposit Gift'
            : 'Deposit Now to Unlock'}
        </button>
      </div>
    </div>
  );
};
