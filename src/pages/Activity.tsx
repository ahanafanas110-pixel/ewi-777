import React from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Gift, ChevronRight } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { PinkGiftIllustration, PinkAttendanceIllustration } from '../components/PinkActivityIllustrations';
import {
  ActivityAwardSquircleIcon,
  BettingRebateSquircleIcon,
  SuperJackpotSquircleIcon,
  FirstGiftSquircleIcon
} from '../components/AccountIcons';

export const Activity: React.FC = () => {
  const {
    user,
    transactions,
    depositRequests,
    claimDepositBonus,
    setActiveTab,
    language,
    showToast,
  } = useApp();

  const hasCompletedDeposit =
    (Number(user.totalDeposited) || 0) > 0 ||
    depositRequests.some((d) => d.userId === user.id && d.status === 'approved');

  const BONUS_TYPES = new Set([
    'deposit_bonus',
    'first_deposit_bonus',
    'attendance_bonus',
    'vip_bonus',
    'salary_bonus',
    'activity_award',
    'gift',
    'rebate',
    'commission'
  ]);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const userBonusTxs = transactions.filter(
    (t) => t.userId === user.id && BONUS_TYPES.has(t.type) && Number(t.amount) > 0
  );
  const totalBonus = userBonusTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const todaysBonus = userBonusTxs
    .filter((t) => {
      const parsedMs = Date.parse(t.time);
      return !isNaN(parsedMs) && parsedMs >= todayStart.getTime();
    })
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const lastGiftTx = transactions.find((t) => t.userId === user.id && t.type === 'gift');
  const lastGiftTime = user.lastGiftClaimTime || lastGiftTx?.time || '';

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      <Header title={getTranslation(language, 'activity')} showBack={false} />

      {/* Top Bonus Banner (Pink Luxury) */}
      <div className="bg-gradient-to-br from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] text-white px-4 pt-4 pb-12 rounded-b-[2rem] shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-pink-100 font-medium">
              {getTranslation(language, 'todaysBonus')}
            </div>
            <div className="text-2xl font-black tracking-tight mt-0.5 tabular-nums">
              ৳{todaysBonus.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-pink-100 font-medium">
              {getTranslation(language, 'totalBonus')}
            </div>
            <div className="text-2xl font-black tracking-tight mt-0.5 text-yellow-200 tabular-nums">
              ৳{totalBonus.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => {
              setActiveTab('transaction-history');
              window.location.hash = '#/transaction-history';
            }}
            className="py-2 px-8 rounded-full bg-white text-[#FF2A7A] font-extrabold text-xs shadow-md active:scale-95 transition-transform"
          >
            {getTranslation(language, 'bonusDetails')}
          </button>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* First Deposit Bonus Claim Section (1-Time Only After Completed Deposit) */}
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-[#FF2A7A] rounded-3xl p-4 text-white shadow-md flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-yellow-200">
              <Gift className="w-3.5 h-3.5" />
              <span>Deposit Bonus Center</span>
            </div>
            <div className="font-extrabold text-sm mt-0.5">
              {user.hasClaimedDepositBonus
                ? 'Deposit Bonus Claimed ✓'
                : hasCompletedDeposit
                ? 'Claim ৳50 Deposit Bonus (1-Time)!'
                : 'Complete Deposit to Unlock ৳50 Bonus'}
            </div>
            <div className="text-[10px] text-pink-100">
              {user.hasClaimedDepositBonus
                ? '1-time deposit bonus already claimed.'
                : hasCompletedDeposit
                ? 'Your deposit is verified! Claim your 1-time ৳50 reward.'
                : 'Available 1 time only after your deposit is approved.'}
            </div>
          </div>
          <button
            onClick={() => claimDepositBonus()}
            disabled={user.hasClaimedDepositBonus}
            className={`px-4 py-2 rounded-full font-black text-xs shadow-md active:scale-95 transition-all flex-shrink-0 ${
              user.hasClaimedDepositBonus
                ? 'bg-white/40 text-white cursor-not-allowed'
                : hasCompletedDeposit
                ? 'bg-white text-slate-900 hover:bg-yellow-50'
                : 'bg-white/25 text-white border border-white/40'
            }`}
          >
            {user.hasClaimedDepositBonus ? 'Claimed' : hasCompletedDeposit ? 'Claim ৳50' : 'Locked'}
          </button>
        </div>

        {/* Quick 4 Category Buttons (Gradient Squircles -> Light Mode Subpages) */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100 grid grid-cols-4 gap-2 text-center">
          <button
            onClick={() => {
              setActiveTab('activity-award');
              window.location.hash = '#/activity-award';
            }}
            className="flex flex-col items-center gap-1.5 p-1 active:scale-95 transition-all"
          >
            <ActivityAwardSquircleIcon size={46} />
            <span className="text-[11px] font-bold text-slate-700 leading-tight">
              {getTranslation(language, 'activityAward')}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('betting-rebate');
              window.location.hash = '#/betting-rebate';
            }}
            className="flex flex-col items-center gap-1.5 p-1 active:scale-95 transition-all"
          >
            <BettingRebateSquircleIcon size={46} />
            <span className="text-[11px] font-bold text-slate-700 leading-tight">
              {getTranslation(language, 'bettingRebate')}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('super-jackpot');
              window.location.hash = '#/super-jackpot';
            }}
            className="flex flex-col items-center gap-1.5 p-1 active:scale-95 transition-all"
          >
            <SuperJackpotSquircleIcon size={46} />
            <span className="text-[11px] font-bold text-slate-700 leading-tight">
              {getTranslation(language, 'superJackpot')}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('first-gift');
              window.location.hash = '#/first-gift';
            }}
            className="flex flex-col items-center gap-1.5 p-1 active:scale-95 transition-all"
          >
            <FirstGiftSquircleIcon size={46} />
            <span className="text-[11px] font-bold text-slate-700 leading-tight">
              {getTranslation(language, 'firstGift')}
            </span>
          </button>
        </div>

        {/* Feature Cards Grid (Gifts & Attendance Bonus - Pure Pink Vector Theme) */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Gifts Card */}
          <div
            onClick={() => {
              setActiveTab('gifts');
              window.location.hash = '#/gifts';
            }}
            className="group bg-white rounded-3xl overflow-hidden border border-pink-200/90 shadow-xs hover:shadow-md cursor-pointer active:scale-97 transition-all flex flex-col"
          >
            {/* Top Pink Vector Illustration Banner */}
            <div className="w-full h-28 sm:h-32 relative overflow-hidden flex items-center justify-center">
              <PinkGiftIllustration className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] font-black text-[#FF2A7A] shadow-xs">
                HOT
              </span>
            </div>

            {/* Content text */}
            <div className="p-3 bg-white flex flex-col justify-between flex-1">
              <div>
                <h4 className="font-black text-sm text-slate-900 group-hover:text-[#FF2A7A] transition-colors">
                  {getTranslation(language, 'gifts')}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                  {lastGiftTime ? `Last claimed: ${lastGiftTime}` : 'Redeem exclusive gift codes'}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-pink-50 flex items-center justify-between text-[#FF2A7A]">
                <span className="text-[10px] font-black">
                  Redeem Now
                </span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Attendance Bonus Card */}
          <div
            onClick={() => {
              setActiveTab('attendence');
              window.location.hash = '#/attendence';
            }}
            className="group bg-white rounded-3xl overflow-hidden border border-pink-200/90 shadow-xs hover:shadow-md cursor-pointer active:scale-97 transition-all flex flex-col"
          >
            {/* Top Pink Vector Illustration Banner */}
            <div className="w-full h-28 sm:h-32 relative overflow-hidden flex items-center justify-center">
              <PinkAttendanceIllustration className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] font-black text-[#FF2A7A] shadow-xs">
                DAILY
              </span>
            </div>

            {/* Content text */}
            <div className="p-3 bg-white flex flex-col justify-between flex-1">
              <div>
                <h4 className="font-black text-sm text-slate-900 group-hover:text-[#FF2A7A] transition-colors">
                  {getTranslation(language, 'attendanceBonus')}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                  7-Day deposit rewards up to ৳1,200
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-pink-50 flex items-center justify-between text-[#FF2A7A]">
                <span className="text-[10px] font-black">
                  Check-in
                </span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
