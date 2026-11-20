import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check, Gift } from 'lucide-react';
import checkinBanner from '../assets/images/ewi777_checkin_banner_1794826719310.jpg';

export const Attendance: React.FC = () => {
  const { attendance, claimAttendanceReward, language, setActiveTab, setLanguage } = useApp();

  const nextAvailableDay = attendance.find((d) => d.status === 'available');
  const claimedCount = attendance.filter((d) => d.status === 'claimed').length;

  const handleMainClaim = () => {
    if (nextAvailableDay) {
      claimAttendanceReward(nextAvailableDay.day);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-[#F8FAFC] text-slate-900">
      {/* Top Navigation Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-30">
        <button
          onClick={() => {
            setActiveTab('activity');
            window.location.hash = '#/activity';
          }}
          className="w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        </button>

        <h1 className="font-black text-base tracking-wide uppercase text-slate-900">
          DAILY SIGN-IN
        </h1>

        <button
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
        >
          <span>{language === 'en' ? '🇺🇸' : '🇧🇩'}</span>
          <span>{language === 'en' ? 'EN' : 'BN'}</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Official EWI 777 Daily Check-In Banner */}
        <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xs bg-white">
          <img
            src={checkinBanner}
            alt="EWI 777 Daily Check-In"
            className="w-full h-32 object-cover"
          />
        </div>

        {/* Summary Card */}
        <div className="rounded-3xl p-6 text-center shadow-xs border bg-white border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <Gift className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            Sign in every day, get a bonus
          </h2>
          <p className="text-xs mt-1 text-slate-500">
            Day 1 ৳1 up to Day 7 ৳7. Missing a day starts again from Day 1.
          </p>
        </div>

        {/* 7-Day Grid */}
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
                    ? 'bg-gradient-to-b from-cyan-50 to-teal-50 border-cyan-500 ring-2 ring-cyan-400/40 shadow-sm active:scale-95'
                    : isClaimed
                    ? 'bg-white border-emerald-200 shadow-2xs'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-500">
                  Day {day.day}
                </span>
                <span
                  className={`text-base font-black tabular-nums ${
                    isClaimed
                      ? 'text-emerald-600'
                      : isAvailable
                      ? 'text-cyan-700'
                      : isDay7
                      ? 'text-cyan-700'
                      : 'text-slate-900'
                  }`}
                >
                  ৳{day.amount}
                </span>
                {isClaimed ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                ) : isAvailable ? (
                  <span className="text-[9px] font-black text-cyan-700 uppercase">Ready</span>
                ) : (
                  <span className="h-3.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Claim button */}
        <button
          type="button"
          onClick={handleMainClaim}
          disabled={!nextAvailableDay}
          className={`w-full py-3.5 rounded-2xl font-extrabold text-sm shadow-sm transition-all ${
            nextAvailableDay
              ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white hover:brightness-105 active:scale-98'
              : 'bg-slate-200 text-slate-500 cursor-default'
          }`}
        >
          {nextAvailableDay
            ? `Claim Day ${nextAvailableDay.day} Bonus (৳${nextAvailableDay.amount})`
            : claimedCount >= 7
            ? 'Cycle Complete • Resets to Day 1 tomorrow (12:00 AM)'
            : 'Come back tomorrow'}
        </button>

        <div className="text-center text-xs font-medium text-slate-500">
          Bonus needs 1× betting before withdrawal. Unlocks daily after 12:00 AM.
        </div>
      </div>
    </div>
  );
};
