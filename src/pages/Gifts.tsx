import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Gift, Clock, CheckCircle2, Ticket } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { PinkGiftIllustration } from '../components/PinkActivityIllustrations';

export const Gifts: React.FC = () => {
  const { user, transactions, claimGiftCode, language, showToast, setActiveTab } = useApp();
  const [giftInput, setGiftInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const giftTransactions = transactions.filter((t) => t.userId === user.id && t.type === 'gift');
  const lastGiftTx = giftTransactions[0];
  const lastGiftTime = user.lastGiftClaimTime || lastGiftTx?.time || '';
  const lastGiftCode = user.lastGiftCode || '';
  const lastGiftAmount = user.lastGiftAmount ?? lastGiftTx?.amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRedeeming) return;
    if (!giftInput.trim()) {
      showToast('Please enter a gift code');
      return;
    }
    setIsRedeeming(true);
    try {
      const res = await claimGiftCode(giftInput);
      if (res.success) {
        setGiftInput('');
      } else {
        showToast(res.message);
      }
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      <Header
        title={getTranslation(language, 'gifts')}
        showBack
        onBack={() => {
          setActiveTab('activity');
          window.location.hash = '#/activity';
        }}
      />

      {/* Hero Gift Header */}
      <div className="bg-gradient-to-r from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] px-4 pt-5 pb-12 text-white rounded-b-[2rem] shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-20 h-16 rounded-2xl overflow-hidden border-2 border-white/50 shadow-md flex-shrink-0">
            <PinkGiftIllustration className="w-full h-full" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Gift Code Exchange</h2>
            <p className="text-xs text-pink-100 mt-0.5 leading-relaxed">
              Enter your official EWI 777 admin gift code to claim instant bonus balance.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-7 space-y-4">
        {/* Redeem Box */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-pink-100 space-y-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800">
            <Ticket className="w-4 h-4 text-[#FF2A7A]" />
            <span>Redeem Promotion Code</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={giftInput}
              onChange={(e) => setGiftInput(e.target.value)}
              placeholder="Enter gift code (e.g. EWI777VIP)"
              className="w-full bg-[#FFF8FA] border border-pink-200 rounded-2xl px-4 py-3.5 text-sm font-extrabold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF2A7A] uppercase tracking-wider"
            />
            <button
              type="submit"
              disabled={isRedeeming}
              className="w-full min-h-[48px] py-3.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-black text-sm shadow-md active:scale-98 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4" />
              <span>{isRedeeming ? 'Verifying Code...' : getTranslation(language, 'receive')}</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Each active code can only be redeemed once per user. Bonus turnover requirements apply before withdrawal.
          </p>
        </div>

        {/* Last Gift Code Status */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-800">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Last Gift Code Received</span>
            </span>
          </div>
          {lastGiftTime ? (
            <div className="p-3 rounded-2xl bg-pink-50/70 border border-pink-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-slate-800">
                  {lastGiftCode ? `Code: ${lastGiftCode}` : 'Gift Reward'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{lastGiftTime}</div>
              </div>
              {lastGiftAmount !== undefined && (
                <div className="font-black text-emerald-600 font-mono text-sm tabular-nums">
                  +৳{Number(lastGiftAmount).toFixed(2)}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 text-center text-xs text-slate-400">
              No gift code claimed yet
            </div>
          )}
        </div>

        {/* Gift Code Claim History */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
            <Clock className="w-4 h-4 text-[#FF2A7A]" />
            <span>Claim History</span>
          </div>

          {giftTransactions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Your redeemed gift codes will appear here.
            </div>
          ) : (
            <div className="divide-y divide-pink-50">
              {giftTransactions.map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-800 truncate">{tx.detail || tx.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.time}</div>
                  </div>
                  <div className="font-black text-emerald-600 font-mono tabular-nums flex-shrink-0">
                    +৳{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
