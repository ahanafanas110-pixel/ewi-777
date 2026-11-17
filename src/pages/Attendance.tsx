import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check, Gift } from 'lucide-react';
import checkinBanner from '../assets/images/ewi777_checkin_banner_1794826719310.jpg';

export const Attendance: React.FC = () => {
  const { attendance, claimAttendanceReward, language, setActiveTab, setLanguage } = useApp();
  const [darkCardMode, setDarkCardMode] = useState(false);

  const nextAvailableDay = attendance.find((d) => d.status === 'available');
  const claimedCount = attendance.filter((d) => d.status === 'claimed').length;

  const handleMainClaim = () => {
    if (nextAvailableDay) {
      claimAttendanceReward(nextAvailableDay.day);
    }
  };

  return (
    <div className={`min-h-screen pb-24 transition-colors ${darkCardMode ? 'bg-[#12100B] text-white' : 'bg-[#FAF9F6] text-slate-900'}`}>
      {/* Top Clean Navigation Header matching Daily Sign-In UI */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <button
          onClick={() => {
            setActiveTab('activity');
            window.location.hash = '#/activity';
          }}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
            darkCardMode ? 'bg-[#1E1A11] border-amber-700/50 text-white' : 'bg-white border-amber-200 text-slate-800 shadow-2xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        </button>

        <h1 className="font-black text-base tracking-wide uppercase">
          DAILY SIGN-IN
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className={`px-2.5 py-1 rounded-full border text-xs font-bold flex items-center gap-1 ${
              darkCardMode ? 'bg-[#1E1A11] border-amber-700/50 text-amber-200' : 'bg-white border-amber-200 text-slate-800 shadow-2xs'
            }`}
          >
            <span>{language === 'en' ? '🇺🇸' : '🇧🇩'}</span>
            <span>{language === 'en' ? 'EN' : 'BN'}</span>
          </button>
          <button
            onClick={() => setDarkCardMode((d) => !d)}
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs ${
              darkCardMode ? 'bg-[#1E1A11] border-amber-700/50 text-amber-300' : 'bg-white border-amber-200 text-amber-600 shadow-2xs'
            }`}
            title="Toggle contrast"
          >
            ☀
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Official EWI 777 Daily Check-In Banner */}
        <div className="rounded-3xl overflow-hidden border border-amber-300/70 shadow-md bg-white">
          <img
            src={checkinBanner}
            alt="EWI 777 Daily Check-In"
            className="w-full h-32 object-cover"
          />
        </div>

        {/* Summary Card */}
        <div
          className={`rounded-3xl p-6 text-center shadow-xs border ${
            darkCardMode
              ? 'bg-[#1E1A11] border-amber-800/50'
              : 'bg-white border-amber-200/80'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#D97706] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Gift className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black tracking-tight">
            Sign in every day, get a bonus
          </h2>
          <p className={`text-xs mt-1 ${darkCardMode ? 'text-amber-100/70' : 'text-slate-500'}`}>
            Day 1 ৳1 up to Day 7 ৳7. Missing a day starts again from Day 1.
          </p>
        </div>

        {/* 7-Day Grid (Days 1-4 top row, Days 5-6 + wider Day 7 bottom row) */}
        <div className="grid grid-cols-4 gap-2.5">
          {attendance.map((day) => {
            const isClaimed = day.status === 'claimed';
            const isAvailable = day.status === 'available';
            const isDay7 = day.day === 7;
            return (
              <button
                key={day.day}
                type="button"
                onClick={() => isAvailable && claimAttendanceReward(day.day)}
                className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-1 min-h-[84px] border transition-all ${
                  isDay7 ? 'col-span-2' : 'col-span-1'
                } ${
                  isAvailable
                    ? 'bg-gradient-to-b from-[#FEF3C7] to-[#FDE68A] border-[#D97706] ring-2 ring-amber-400/50 shadow-sm active:scale-95'
                    : isClaimed
                    ? darkCardMode
                      ? 'bg-[#1A261F] border-emerald-700/60'
                      : 'bg-white border-emerald-200 shadow-2xs'
                    : darkCardMode
                    ? 'bg-[#1C1810] border-amber-900/40'
                    : 'bg-white border-amber-100 shadow-2xs'
                }`}
              >
                <span className={`text-[11px] font-semibold ${darkCardMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Day {day.day}
                </span>
                <span
                  className={`text-base font-black tabular-nums ${
                    isClaimed
                      ? 'text-[#16A34A]'
                      : isAvailable
                      ? 'text-[#D97706]'
                      : isDay7
                      ? 'text-[#D97706]'
                      : darkCardMode
                      ? 'text-amber-200'
                      : 'text-slate-800'
                  }`}
                >
                  ৳{day.amount}
                </span>
                {isClaimed ? (
                  <Check className="w-3.5 h-3.5 text-[#16A34A] stroke-[3]" />
                ) : isAvailable ? (
                  <span className="text-[9px] font-black text-[#B45309] uppercase">Ready</span>
                ) : (
                  <span className="h-3.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Claim / Come back tomorrow button */}
        <button
          type="button"
          onClick={handleMainClaim}
          disabled={!nextAvailableDay}
          className={`w-full py-3.5 rounded-full font-extrabold text-sm shadow-sm transition-all ${
            nextAvailableDay
              ? 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white hover:brightness-105 active:scale-98'
              : 'bg-[#DCC792] text-white/90 cursor-default'
          }`}
        >
          {nextAvailableDay
            ? `Claim Day ${nextAvailableDay.day} Bonus (৳${nextAvailableDay.amount})`
            : claimedCount >= 7
            ? 'Cycle Complete • Resets to Day 1 tomorrow (12:00 AM)'
            : 'Come back tomorrow'}
        </button>

        <div className={`text-center text-xs font-medium ${darkCardMode ? 'text-amber-200/70' : 'text-slate-500'}`}>
          Bonus needs 1× betting before withdrawal. Unlocks daily after 12:00 AM.
        </div>
      </div>
    </div>
  );
};
