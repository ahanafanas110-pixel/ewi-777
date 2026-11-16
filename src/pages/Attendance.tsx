import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Check, Lock, CalendarCheck2, BookOpen } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { PinkAttendanceIllustration } from '../components/PinkActivityIllustrations';

export const Attendance: React.FC = () => {
  const { user, attendance, claimAttendanceReward, language, setActiveTab } = useApp();
  const [view, setView] = useState<'checkin' | 'rules'>('checkin');

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      <Header
        title={getTranslation(language, 'attendanceBonus')}
        showBack
        onBack={() => {
          setActiveTab('activity');
          window.location.hash = '#/activity';
        }}
      />

      {/* Hero Summary */}
      <div className="bg-gradient-to-r from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] px-4 pt-5 pb-12 text-white rounded-b-[2rem] shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-12 rounded-2xl overflow-hidden border-2 border-white/50 shadow-sm flex-shrink-0">
              <PinkAttendanceIllustration className="w-full h-full" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-pink-100 uppercase">Cumulative Deposit</div>
              <div className="text-2xl font-black tabular-nums">
                ৳{(user.totalDeposited || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-2xl bg-white/20 backdrop-blur-xs text-center">
            <div className="text-[10px] font-bold text-pink-100 uppercase">Streak</div>
            <div className="text-base font-black tabular-nums">{user.attendanceState?.streak || 0} Days</div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Segmented Control */}
        <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-pink-100 grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setView('checkin')}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              view === 'checkin'
                ? 'bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white shadow-xs'
                : 'text-slate-600 hover:bg-pink-50'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>7-Day Check-In</span>
          </button>
          <button
            onClick={() => setView('rules')}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              view === 'rules'
                ? 'bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white shadow-xs'
                : 'text-slate-600 hover:bg-pink-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Game Rules</span>
          </button>
        </div>

        {view === 'checkin' ? (
          <div className="grid grid-cols-2 gap-3">
            {attendance.map((day) => {
              const isClaimed = day.status === 'claimed';
              const isAvailable = day.status === 'available';
              return (
                <button
                  key={day.day}
                  type="button"
                  onClick={() => claimAttendanceReward(day.day)}
                  className={`p-4 rounded-3xl border text-left transition-all active:scale-98 flex flex-col justify-between min-h-[110px] ${
                    day.day === 7 ? 'col-span-2' : ''
                  } ${
                    isClaimed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : isAvailable
                      ? 'bg-gradient-to-br from-[#FF2A7A] to-[#FF5A92] border-transparent text-white shadow-md ring-2 ring-pink-300/60'
                      : 'bg-white border-pink-100 text-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-black uppercase ${
                        isAvailable ? 'text-pink-100' : isClaimed ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      Day {day.day}
                    </span>
                    {isClaimed ? (
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : isAvailable ? (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-300 text-slate-900 text-[9px] font-black">
                        UNLOCKED
                      </span>
                    ) : (
                      <Lock className="w-4 h-4 text-slate-300" />
                    )}
                  </div>

                  <div className="my-1.5">
                    <div
                      className={`text-xl font-black tabular-nums leading-tight ${
                        isAvailable ? 'text-white' : isClaimed ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      ৳{day.amount.toLocaleString()}
                    </div>
                    <div
                      className={`text-[11px] font-bold tabular-nums ${
                        isAvailable ? 'text-pink-100' : 'text-slate-400'
                      }`}
                    >
                      Min Deposit: ৳{day.requiredDeposit.toLocaleString()}+
                    </div>
                  </div>

                  <div
                    className={`text-[11px] font-extrabold ${
                      isClaimed
                        ? 'text-emerald-600'
                        : isAvailable
                        ? 'text-yellow-200'
                        : 'text-[#FF2A7A]/80'
                    }`}
                  >
                    {isClaimed
                      ? 'Claimed Once ✓'
                      : isAvailable
                      ? 'Tap to Claim Bonus →'
                      : day.lockReason || 'Locked'}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl overflow-hidden border border-pink-100 shadow-xs">
              <div className="bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white grid grid-cols-3 text-center py-3 px-2 text-[11px] font-extrabold">
                <div>Continuous Days</div>
                <div>Accumulated Deposit</div>
                <div>Attendance Bonus</div>
              </div>
              <div className="divide-y divide-pink-50 text-xs tabular-nums">
                {attendance.map((row, idx) => (
                  <div
                    key={row.day}
                    className={`grid grid-cols-3 text-center py-3 px-2 font-semibold ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#FFF5F9]'
                    }`}
                  >
                    <div className="text-slate-800 font-bold">Day {row.day}</div>
                    <div className="text-slate-600">৳{row.requiredDeposit.toLocaleString()}.00</div>
                    <div className="text-[#FF2A7A] font-black">৳{row.amount.toLocaleString()}.00</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-pink-100 shadow-xs p-5 space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <h4 className="font-black text-slate-800 text-sm mb-1">Attendance Rules</h4>
              <p>◆ Consecutive login and deposit days unlock progressively higher rewards up to ৳1,200 on Day 7.</p>
              <p>◆ Check in once per day. Each day tier can only be claimed once per user.</p>
              <p>◆ Players with no deposit history cannot claim attendance bonuses.</p>
              <p>◆ Missing a consecutive day without claiming resets the streak back to Day 1.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
