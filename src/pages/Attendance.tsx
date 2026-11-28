import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check, Gift } from 'lucide-react';
import { PinkAttendanceIllustration } from '../components/PinkActivityIllustrations';
import { getLanguageBadge, getTranslation } from '../utils/i18n';
import { Language } from '../types';

const LANG_ORDER: Language[] = ['en', 'bn', 'hi', 'ur'];

export const Attendance: React.FC = () => {
  const { attendance, claimAttendanceReward, language, setActiveTab, setLanguage } = useApp();
  const langBadge = getLanguageBadge(language);

  const nextAvailableDay = attendance.find((d) => d.status === 'available');
  const claimedCount = attendance.filter((d) => d.status === 'claimed').length;

  const handleMainClaim = () => {
    if (nextAvailableDay) {
      claimAttendanceReward(nextAvailableDay.day);
    }
  };

  const cycleLanguage = () => {
    const idx = LANG_ORDER.indexOf(language);
    setLanguage(LANG_ORDER[(idx + 1) % LANG_ORDER.length]);
  };

  return (
    <div className="min-h-screen pb-24 bg-[#F8FAFC] text-slate-900">
      {/* Top Navigation Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-30">
        <button
          type="button"
          onClick={() => {
            setActiveTab('activity');
          }}
          aria-label="Back"
          className="relative z-20 w-10 h-10 rounded-xl border flex items-center justify-center active:scale-95 transition-all bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h1 className="font-black text-base tracking-wide uppercase text-slate-900">
          {getTranslation(language, 'dailySignIn')}
        </h1>

        <button
          onClick={cycleLanguage}
          className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
        >
          <span>{langBadge.flag}</span>
          <span>{langBadge.short}</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Official Deshi Win Daily Check-In Illustration Card */}
        <div className="rounded-3xl overflow-hidden border border-cyan-100 shadow-xs bg-white h-40">
          <PinkAttendanceIllustration className="w-full h-full object-cover" />
        </div>

        {/* Summary Card */}
        <div className="rounded-3xl p-6 text-center shadow-xs border bg-white border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <Gift className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            {getTranslation(language, 'signInDailyTitle')}
          </h2>
          <p className="text-xs mt-1 text-slate-500">
            {getTranslation(language, 'signInDailyDesc')}
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
                  {getTranslation(language, 'dayLabel')} {day.day}
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
                  <span className="text-[9px] font-black text-cyan-700 uppercase">
                    {getTranslation(language, 'ready')}
                  </span>
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
            ? `${getTranslation(language, 'claim')} ${getTranslation(language, 'dayLabel')} ${nextAvailableDay.day} (৳${nextAvailableDay.amount})`
            : claimedCount >= 7
            ? 'Cycle Complete • Resets to Day 1 tomorrow (12:00 AM)'
            : getTranslation(language, 'comeBackTomorrow')}
        </button>

        <div className="text-center text-xs font-medium text-slate-500">
          Bonus needs 1× betting before withdrawal. Unlocks daily after 12:00 AM.
        </div>
      </div>
    </div>
  );
};
