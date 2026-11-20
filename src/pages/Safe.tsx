import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Shield } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { PinkSafePlateLogo } from '../components/BrandLogos';

export const Safe: React.FC = () => {
  const { user, transferSafe, setActiveTab, language, showToast } = useApp();
  const [activeTab, setActiveTabMode] = useState<'in' | 'out'>('in');
  const [amountMultiplier, setAmountMultiplier] = useState<number>(2);
  const [customAmount, setCustomAmount] = useState<string>('200');

  const multipliers = [2, 5, 10, 50, 100, 200, 500, 1000];

  const handleSelectMultiplier = (mul: number) => {
    setAmountMultiplier(mul);
    setCustomAmount((mul * 100).toString());
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(customAmount);
    if (activeTab === 'in' && (isNaN(amt) || amt < 200)) {
      showToast('Minimum Safe Vault deposit is ৳200');
      return;
    }
    const res = transferSafe(amt, activeTab);
    if (!res.success) {
      showToast(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <button
          onClick={() => {
            setActiveTab('account');
            window.location.hash = '#/account';
          }}
          className="p-1 -ml-1 text-slate-700 hover:text-cyan-700 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h2 className="text-base font-extrabold text-slate-900">
          {getTranslation(language, 'safe')}
        </h2>
        <div className="w-6" />
      </div>

      <div className="p-4 space-y-4">
        {/* Banner with Interest Rate */}
        <div className="text-center text-xs font-bold text-cyan-700">
          Interest rate 0.006%
        </div>

        {/* Safe Vault Card */}
        <div className="bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <PinkSafePlateLogo size={36} />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 text-xs font-bold border border-white/20">
              <Shield className="w-3.5 h-3.5 text-cyan-200" />
              <span>Financial security</span>
            </div>
          </div>

          <div className="text-xs text-cyan-100 font-medium">Safe Vault Balance</div>
          <div className="text-3xl font-black mt-1 tabular-nums">৳{user.safeBalance.toFixed(2)}</div>
        </div>

        {/* Transfer Box */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTabMode('in')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeTab === 'in'
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-slate-400'
              }`}
            >
              Transfer In
            </button>
            <button
              onClick={() => setActiveTabMode('out')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeTab === 'out'
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-slate-400'
              }`}
            >
              Transfer Out
            </button>
          </div>

          {/* Amount input & presets */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-2">
              <span>Amount (Min ৳200 to Vault In)</span>
              <button
                type="button"
                onClick={() => setCustomAmount(activeTab === 'in' ? user.balance.toString() : user.safeBalance.toString())}
                className="text-cyan-700 font-black text-xs hover:underline"
              >
                All
              </button>
            </div>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Multipliers */}
          <div className="grid grid-cols-4 gap-2">
            {multipliers.map((mul) => (
              <button
                key={mul}
                onClick={() => handleSelectMultiplier(mul)}
                className={`py-2 rounded-xl text-xs font-black border transition-all ${
                  amountMultiplier === mul
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white border-transparent shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {mul}x
              </button>
            ))}
          </div>

          {/* Amount Available & Info */}
          <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1.5 border border-slate-200">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span>Amount available</span>
              <span className="font-mono font-bold tabular-nums">
                ৳{activeTab === 'in' ? user.balance.toFixed(2) : user.safeBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>24-hour estimated revenue</span>
              <span className="text-cyan-700 font-bold tabular-nums">
                ৳{((Number(customAmount) || 0) * 0.00006 * 48).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleTransfer}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-extrabold text-sm shadow-sm active:scale-98 transition-all hover:brightness-105"
          >
            {activeTab === 'in' ? 'Transfer In' : 'Transfer Out'}
          </button>
        </div>
      </div>
    </div>
  );
};
