import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Coins, CheckCircle2 } from 'lucide-react';

export const BettingRebate: React.FC = () => {
  const { user, bets, aviatorBets, binaryBets, transactions, setActiveTab, showToast } = useApp();

  const totalBetVolume = Math.round(
    transactions
      .filter(
        (t) =>
          t.userId === user.id &&
          (t.type === 'lottery_bet' || t.type === 'aviator_bet' || t.type === 'binary_bet' || t.type === 'mines_bet')
      )
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0) +
      bets.filter((b) => b.userId === user.id).reduce((s, b) => s + (b.totalAmount || 0), 0) +
      aviatorBets.filter((b) => b.userId === user.id).reduce((s, b) => s + (b.amount || 0), 0) +
      binaryBets.filter((b) => b.userId === user.id).reduce((s, b) => s + (b.amount || 0), 0)
  );

  const rebateRate = 0.006; // 0.60%
  const estimatedRebate = +(totalBetVolume * rebateRate).toFixed(2);
  const rebateHistory = transactions.filter((t) => t.userId === user.id && t.type === 'rebate');

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-slate-800 pb-24">
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
        <h1 className="text-sm font-black text-slate-800">Betting Rebate</h1>
        <div className="w-7" />
      </div>

      <div className="bg-gradient-to-r from-[#FF8800] to-[#FFB830] px-4 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-100">Real-Time VIP Rebate Rate</div>
            <div className="text-3xl font-black mt-1">0.60%</div>
            <div className="text-[11px] text-amber-50 mt-1">
              Total Betting Volume: ৳{totalBetVolume.toLocaleString()}
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Coins className="w-9 h-9 text-white" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Accrued Daily Rebate</span>
            <span className="text-lg font-black text-amber-600 tabular-nums">৳{estimatedRebate.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Rebates are calculated across WinGo, Aviator Plane, Binary Trading, and Mines 777 and settled automatically daily at 01:00 AM.
          </p>
          <button
            onClick={() => showToast('Daily rebates settle automatically every day at 01:00 AM')}
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#FF8800] to-[#FFA726] text-white font-black text-xs shadow-sm active:scale-98 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Auto-Settlement Active</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-2.5">
          <h3 className="text-xs font-black text-slate-800">Rebate History</h3>
          {rebateHistory.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No rebate payouts yet. Place bets to earn daily 0.60% cashback!
            </div>
          ) : (
            rebateHistory.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                <div>
                  <div className="font-bold text-slate-800">{r.title}</div>
                  <div className="text-[10px] text-slate-400">{r.time}</div>
                </div>
                <span className="text-emerald-600 font-black tabular-nums">+৳{r.amount.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
