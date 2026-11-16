import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, RefreshCw, Shield, AlertCircle } from 'lucide-react';
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
    const res = transferSafe(amt, activeTab);
    if (!res.success) {
      showToast(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 border-b border-pink-100 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => {
            setActiveTab('account');
            window.location.hash = '#/account';
          }}
          className="p-1 -ml-1 text-slate-700 hover:text-[#FF2A7A] active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h2 className="text-base font-extrabold text-slate-800">
          {getTranslation(language, 'safe')}
        </h2>
        <div className="w-6" />
      </div>

      <div className="p-4 space-y-4">
        {/* Banner with Interest Rate */}
        <div className="text-center text-xs font-bold text-[#FF2A7A]">
          Interest rate 0.006%
        </div>

        {/* Pink Luxury Vault Card */}
        <div className="bg-gradient-to-r from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <PinkSafePlateLogo size={36} />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>Financial security</span>
            </div>
          </div>

          <div className="text-xs text-pink-100 font-medium">Safe Vault Balance</div>
          <div className="text-3xl font-black mt-1">৳{user.safeBalance.toFixed(2)}</div>
        </div>

        {/* Transfer Box */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-pink-100 space-y-4">
          <div className="flex border-b border-pink-50">
            <button
              onClick={() => setActiveTabMode('in')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeTab === 'in'
                  ? 'border-[#FF2A7A] text-[#FF2A7A]'
                  : 'border-transparent text-slate-400'
              }`}
            >
              Transfer In
            </button>
            <button
              onClick={() => setActiveTabMode('out')}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                activeTab === 'out'
                  ? 'border-[#FF2A7A] text-[#FF2A7A]'
                  : 'border-transparent text-slate-400'
              }`}
            >
              Transfer Out
            </button>
          </div>

          {/* Amount input & presets */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-2">
              <span>Amount (Each amount: 100)</span>
              <button
                type="button"
                onClick={() => setCustomAmount(activeTab === 'in' ? user.balance.toString() : user.safeBalance.toString())}
                className="text-[#FF2A7A] font-black text-xs hover:underline"
              >
                All
              </button>
            </div>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-[#FFF8FA] border border-pink-100 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF2A7A]"
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
                    ? 'bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white border-transparent shadow-xs'
                    : 'bg-[#FFF8FA] border-pink-100 text-slate-700 hover:bg-pink-50'
                }`}
              >
                {mul}x
              </button>
            ))}
          </div>

          {/* Amount Available & Info */}
          <div className="bg-[#FFF8FA] rounded-2xl p-3 text-xs space-y-1.5 border border-pink-100">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span>Amount available</span>
              <span className="font-mono font-bold">
                ৳{activeTab === 'in' ? user.balance.toFixed(2) : user.safeBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>24-hour estimated revenue</span>
              <span className="text-[#FF2A7A] font-bold">
                ৳{((Number(customAmount) || 0) * 0.00006 * 48).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleTransfer}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-extrabold text-sm shadow-md active:scale-98 transition-all hover:brightness-105"
          >
            {activeTab === 'in' ? 'Transfer In' : 'Transfer Out'}
          </button>
        </div>
      </div>
    </div>
  );
};
