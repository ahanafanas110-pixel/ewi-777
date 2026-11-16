import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, LayoutGrid, ClipboardList, Crown } from 'lucide-react';

export const SuperJackpot: React.FC = () => {
  const { setActiveTab, showToast } = useApp();
  const [infoTab, setInfoTab] = useState<'none' | 'rule' | 'star'>('none');

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
        <h1 className="text-sm font-black text-slate-800">Super Jackpot</h1>
        <div className="w-7" />
      </div>

      {/* Coral-Orange Gradient Hero Banner */}
      <div className="bg-gradient-to-r from-[#FF7B63] via-[#FF8C66] to-[#FFB37B] px-4 py-5 text-white relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="space-y-2 flex-1">
            <h2 className="text-xl font-black tracking-tight">Super Jackpot</h2>
            <p className="text-[11px] text-white/95 leading-relaxed font-medium">
              When you get the Super Jackpot in 【WinGo / Aviator】 Can get 1 additional bonus
            </p>
            <p className="text-[10px] text-orange-50 leading-relaxed">
              The reward is valid for 30 day, and you will not be able to claim it after it expires!
            </p>
          </div>

          {/* 3D Gift Box & Red Envelope Illustration */}
          <div className="w-28 h-24 flex-shrink-0 flex items-center justify-center">
            <svg width="108" height="96" viewBox="0 0 108 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="28" y="34" width="44" height="44" rx="8" fill="#8B5CF6" />
              <rect x="28" y="34" width="44" height="22" rx="6" fill="#F97316" />
              <rect x="45" y="34" width="10" height="44" fill="#FDE047" />
              <rect x="24" y="24" width="52" height="14" rx="5" fill="#EF4444" />
              <path d="M50 24C40 24 34 17 38 12C42 7 49 15 50 24Z" fill="#FDE047" />
              <path d="M50 24C60 24 66 17 62 12C58 7 51 15 50 24Z" fill="#FBBF24" />
              {/* Red envelopes */}
              <rect x="66" y="42" width="26" height="32" rx="4" transform="rotate(14 66 42)" fill="#F43F5E" stroke="#FDE047" strokeWidth="1.5" />
              <circle cx="77" cy="56" r="4" fill="#FDE047" />
            </svg>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Receive in batches pill button */}
        <button
          onClick={() => showToast('No pending Super Jackpot bonus available to claim yet')}
          className="w-full py-2.5 rounded-full bg-[#CBD0DC] text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98"
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Receive in batches</span>
        </button>

        {/* Rule & Winning star white cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setInfoTab(infoTab === 'rule' ? 'none' : 'rule')}
            className={`bg-white rounded-2xl py-3 px-4 border shadow-xs flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              infoTab === 'rule' ? 'border-[#FF6B6B] text-[#FF5A67]' : 'border-slate-100 text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-[#FF5A67]" />
            <span>Rule</span>
          </button>

          <button
            onClick={() => setInfoTab(infoTab === 'star' ? 'none' : 'star')}
            className={`bg-white rounded-2xl py-3 px-4 border shadow-xs flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              infoTab === 'star' ? 'border-[#FF6B6B] text-[#FF5A67]' : 'border-slate-100 text-slate-700'
            }`}
          >
            <Crown className="w-4 h-4 text-[#FF5A67]" />
            <span>Winning star</span>
          </button>
        </div>

        {/* Rule / Winning Star Info Panel */}
        {infoTab === 'rule' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs text-xs text-slate-600 space-y-2 leading-relaxed">
            <div className="font-black text-slate-800">Super Jackpot Rules</div>
            <p>1. Place qualifying bets in WinGo, Aviator Plane, or Mines 777 to enter high-multiplier Jackpot draws.</p>
            <p>2. Hitting a Super Jackpot multiplier grants an extra cash bonus credited here for 30 days.</p>
            <p>3. Unclaimed jackpot rewards expire automatically after 30 days.</p>
          </div>
        )}

        {infoTab === 'star' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs text-xs space-y-2">
            <div className="font-black text-slate-800">Recent Super Jackpot Winners</div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="font-bold text-slate-700">RAH***88 (WinGo)</span>
              <span className="font-black text-[#FF5A67]">+৳25,000.00</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="font-bold text-slate-700">TAN***41 (Aviator 124x)</span>
              <span className="font-black text-[#FF5A67]">+৳18,500.00</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="font-bold text-slate-700">FAI***09 (Mines 777)</span>
              <span className="font-black text-[#FF5A67]">+৳12,000.00</span>
            </div>
          </div>
        )}

        {/* Empty State Card matching Screenshot */}
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-xs space-y-3">
          <div className="w-28 h-24 mx-auto flex items-center justify-center opacity-80">
            <svg width="110" height="90" viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 70C18 52 38 40 58 44C78 48 92 60 94 74H18V70Z" fill="#EFF1F6" />
              <rect x="34" y="16" width="40" height="50" rx="6" fill="#E2E6F0" />
              <path d="M40 28H66M40 38H62M40 48H54" stroke="#CBD2E1" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M22 66L28 52L34 66H22Z" fill="#DFE3ED" />
              <path d="M80 66L86 48L92 66H80Z" fill="#DFE3ED" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-slate-400">
            You don&apos;t have a big jackpot yet, let&apos;s bet
          </p>
        </div>

        {/* Go bet CTA Button */}
        <button
          onClick={() => {
            setActiveTab('wingo');
            window.location.hash = '#/wingo';
          }}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF5555] text-white font-black text-sm shadow-md active:scale-98 transition-all"
        >
          Go bet
        </button>
      </div>
    </div>
  );
};
