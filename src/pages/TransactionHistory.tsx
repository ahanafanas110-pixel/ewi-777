import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const {
    user,
    transactions,
    depositRequests,
    withdrawRequests,
    setActiveTab,
    historyFilterTab,
    setHistoryFilterTab
  } = useApp();
  const [filterType, setFilterType] = useState<string>(historyFilterTab || 'all');
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    if (historyFilterTab) {
      setFilterType(historyFilterTab);
    }
  }, [historyFilterTab]);

  const combinedItems = useMemo(() => {
    const base = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      title: tx.title,
      detail: tx.detail || tx.title,
      time: tx.time,
      amount: tx.amount,
      statusBadge: 'Completed'
    }));

    const seenDepositKeys = new Set<string>();
    const extraDeposits = depositRequests
      .filter((d) => {
        if ((d.userId !== user.id && d.senderNumber !== user.phone) || d.status === 'approved') {
          return false;
        }
        const key = d.sessionId || d.trxId || d.id;
        if (seenDepositKeys.has(key)) return false;
        seenDepositKeys.add(key);
        return true;
      })
      .map((d) => ({
        id: `dep_req_${d.id}`,
        type: 'deposit' as const,
        title: `${d.method} Deposit (${d.status.toUpperCase()})`,
        detail: `TRX: ${d.trxId} • From: ${d.senderNumber}`,
        time: d.time,
        amount: d.amount,
        statusBadge: d.status === 'rejected' ? 'Rejected' : 'Pending'
      }));

    const seenWithdrawKeys = new Set<string>();
    const extraWithdraws = withdrawRequests
      .filter((w) => {
        if ((w.userId !== user.id && w.userPhone !== user.phone) || w.status === 'completed') {
          return false;
        }
        if (seenWithdrawKeys.has(w.id)) return false;
        seenWithdrawKeys.add(w.id);
        return true;
      })
      .map((w) => ({
        id: `wd_req_${w.id}`,
        type: 'withdraw' as const,
        title: `${w.method} Withdraw (${w.status.toUpperCase()})`,
        detail: `To: ${w.number}${w.status === 'rejected' && w.adminNote ? ` • Reason: ${w.adminNote}` : ''}`,
        time: w.time,
        amount: -Math.abs(w.amount),
        statusBadge:
          w.status === 'rejected'
            ? 'Rejected'
            : w.status === 'processing'
            ? 'Processing'
            : 'Pending'
      }));

    return [...extraDeposits, ...extraWithdraws, ...base];
  }, [transactions, depositRequests, withdrawRequests, user.id, user.phone]);

  const filtered = combinedItems.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterDate && !tx.time.startsWith(filterDate)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      {/* Top Navbar */}
      <div className="bg-white px-4 py-3 border-b border-amber-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => {
            setActiveTab('account');
            window.location.hash = '#/account';
          }}
          className="p-1 -ml-1 text-slate-700 hover:text-[#B45309] active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h2 className="text-base font-extrabold text-slate-800">
          {filterType === 'deposit'
            ? 'Deposit history'
            : filterType === 'withdraw'
            ? 'Withdraw history'
            : 'Transaction history'}
        </h2>
        <div className="w-6" />
      </div>

      <div className="p-4 space-y-4">
        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setHistoryFilterTab(e.target.value as any);
              }}
              className="w-full bg-white border border-amber-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 shadow-2xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#D97706]"
            >
              <option value="all">All</option>
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
              <option value="rebate">Rebate</option>
              <option value="gift">Gifts</option>
              <option value="lottery_win">Lottery Win</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 text-xs">
              ▼
            </div>
          </div>

          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#D97706]"
            />
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-3xl p-6 border border-amber-200">
              No records found.
            </div>
          ) : (
            filtered.map((tx) => (
              <div
                key={tx.id}
                className="bg-white rounded-3xl overflow-hidden border border-amber-200 shadow-xs"
              >
                {/* Header banner with EWI 777 gradient gold */}
                <div className="bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] px-4 py-2 text-white font-black text-xs flex items-center justify-between">
                  <span>{tx.title}</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                    {tx.statusBadge}
                  </span>
                </div>

                <div className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Detail</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[70%] break-words">
                      {tx.detail}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span>Time</span>
                    <span className="font-mono text-slate-600">{tx.time}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-100 font-bold">
                    <span className="text-slate-600">Amount</span>
                    <span
                      className={`text-sm font-black ${
                        tx.amount >= 0 ? 'text-[#00B977]' : 'text-rose-600'
                      }`}
                    >
                      {tx.amount >= 0 ? `+৳${tx.amount.toFixed(2)}` : `-৳${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
