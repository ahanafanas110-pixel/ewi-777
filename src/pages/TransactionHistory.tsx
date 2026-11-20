import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Copy, Check, FileText } from 'lucide-react';

interface HistoryCardRow {
  id: string;
  type: string;
  badgeLabel: string;
  methodLabel: string;
  time: string;
  amount: number;
  orderNumber: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  checkoutUrl?: string;
  payoutTrxId?: string;
  rejectionReason?: string;
  detail?: string;
  rawMethod?: 'bKash' | 'Nagad' | 'USDT';
  channel?: string;
  senderNumber?: string;
}

export const TransactionHistory: React.FC = () => {
  const {
    user,
    transactions,
    depositRequests,
    withdrawRequests,
    initiateEwiPayDeposit,
    setActiveTab,
    historyFilterTab,
    setHistoryFilterTab,
    showToast
  } = useApp();

  const [filterType, setFilterType] = useState<string>(historyFilterTab || 'all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  useEffect(() => {
    if (historyFilterTab) {
      setFilterType(historyFilterTab);
    }
  }, [historyFilterTab]);

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    showToast('Order number copied');
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
  };

  const handleCompletePayment = async (row: HistoryCardRow) => {
    if (row.checkoutUrl) {
      window.location.href = row.checkoutUrl;
      return;
    }
    if (resumingId) return;
    setResumingId(row.id);
    try {
      const res = await initiateEwiPayDeposit(
        Math.abs(row.amount),
        row.rawMethod || 'bKash',
        row.channel || 'Send Money',
        row.senderNumber || user.phone || ''
      );
      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        showToast(res.message || 'Unable to resume checkout');
      }
    } finally {
      setResumingId(null);
    }
  };

  const combinedItems = useMemo<HistoryCardRow[]>(() => {
    const list: HistoryCardRow[] = [];
    const seenKeys = new Set<string>();

    // 1. User Deposit Requests (all statuses: pending, approved, rejected)
    depositRequests
      .filter((d) => d.userId === user.id || (user.phone && d.senderNumber === user.phone))
      .forEach((d) => {
        const dedupKey = `dep:${d.sessionId || d.orderId || d.trxId || d.id}`;
        if (seenKeys.has(dedupKey)) return;
        seenKeys.add(dedupKey);
        const status: HistoryCardRow['status'] =
          d.status === 'approved' ? 'COMPLETED' : d.status === 'rejected' ? 'REJECTED' : 'PENDING';
        list.push({
          id: `dep_req_${d.id}`,
          type: 'deposit',
          badgeLabel: 'DEPOSIT',
          methodLabel: String(d.method || 'bKash'),
          time: d.time,
          amount: Math.abs(Number(d.amount) || 0),
          orderNumber: String(d.orderId || d.trxId || d.sessionId || d.id),
          status,
          checkoutUrl: d.checkoutUrl,
          rejectionReason: d.status === 'rejected' ? d.rejectionReason || d.adminNote : undefined,
          rawMethod: d.method,
          channel: d.channel,
          senderNumber: d.senderNumber
        });
      });

    // 2. User Withdraw Requests (all statuses: pending, processing, completed, rejected)
    withdrawRequests
      .filter((w) => w.userId === user.id || (user.phone && w.userPhone === user.phone))
      .forEach((w) => {
        const dedupKey = `wd:${w.id}`;
        if (seenKeys.has(dedupKey)) return;
        seenKeys.add(dedupKey);
        const status: HistoryCardRow['status'] =
          w.status === 'completed'
            ? 'COMPLETED'
            : w.status === 'rejected'
            ? 'REJECTED'
            : w.status === 'processing'
            ? 'PROCESSING'
            : 'PENDING';
        list.push({
          id: `wd_req_${w.id}`,
          type: 'withdraw',
          badgeLabel: 'WITHDRAW',
          methodLabel: `${w.method}${w.number ? ` · ${w.number}` : ''}`,
          time: w.time,
          amount: Math.abs(Number(w.amount) || 0),
          orderNumber: String(w.orderId || w.id),
          status,
          payoutTrxId: w.payoutTrxId,
          rejectionReason:
            w.status === 'rejected'
              ? w.userMessage || w.rejectionReason || w.adminNote || 'কিছুক্ষণ পর আবার চেষ্টা করুন'
              : undefined
        });
      });

    // 3. Remaining Transactions (strictly exclude gift codes from Deposit, deduplicate deposit/withdraw entries already covered)
    transactions
      .filter((tx) => tx.userId === user.id)
      .forEach((tx) => {
        if (tx.type === 'deposit') {
          const matchingReq = depositRequests.some(
            (d) =>
              d.userId === user.id &&
              d.status === 'approved' &&
              (String(tx.detail || '').includes(d.trxId) ||
                (Math.abs(d.amount - Math.abs(tx.amount)) < 0.01 && tx.time === d.time))
          );
          if (matchingReq) return;
        }
        if (tx.type === 'withdraw') {
          const matchingWd = withdrawRequests.some(
            (w) =>
              w.userId === user.id &&
              Math.abs(w.amount - Math.abs(tx.amount)) < 0.01 &&
              (tx.time === w.time || String(tx.detail || '').includes(w.number))
          );
          if (matchingWd) return;
        }

        const badgeMap: Record<string, string> = {
          deposit: 'DEPOSIT',
          withdraw: 'WITHDRAW',
          gift: 'GIFT',
          rebate: 'REBATE',
          salary_bonus: 'SALARY',
          lottery_win: 'LOTTERY WIN',
          recharge_bonus: 'RECHARGE BONUS',
          daily_refer_bonus: 'DAILY REFER',
          wingo_streak_bonus: 'WIN STREAK',
          wingo_refund: 'WINGO REFUND'
        };

        list.push({
          id: tx.id,
          type: tx.type,
          badgeLabel: badgeMap[tx.type] || tx.type.replace(/_/g, ' ').toUpperCase(),
          methodLabel: tx.title,
          time: tx.time,
          amount: tx.amount,
          orderNumber: String(tx.id).toUpperCase(),
          status: tx.status === 'rejected' ? 'REJECTED' : tx.status === 'pending' ? 'PENDING' : 'COMPLETED',
          detail: tx.detail
        });
      });

    return list;
  }, [depositRequests, withdrawRequests, transactions, user.id, user.phone]);

  const filtered = combinedItems.filter((tx) => {
    if (filterType === 'deposit') {
      if (tx.type !== 'deposit') return false;
    } else if (filterType === 'withdraw') {
      if (tx.type !== 'withdraw') return false;
    } else if (filterType !== 'all') {
      if (tx.type !== filterType) return false;
    }
    if (filterDate && !tx.time.includes(filterDate)) return false;
    return true;
  });

  const headingTitle =
    filterType === 'deposit'
      ? 'DEPOSIT HISTORY'
      : filterType === 'withdraw'
      ? 'WITHDRAWAL HISTORY'
      : 'TRANSACTION HISTORY';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <div className="bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab('wallet');
            window.location.hash = '#/wallet';
          }}
          className="p-1.5 -ml-1 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-700 hover:text-cyan-700 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <h2 className="text-sm font-black tracking-wider text-slate-900 uppercase">
          {headingTitle}
        </h2>
        <div className="w-8" />
      </div>

      <div className="p-4 space-y-3.5">
        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setHistoryFilterTab(e.target.value as any);
              }}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 shadow-2xs appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Records</option>
              <option value="deposit">Deposit History</option>
              <option value="withdraw">Withdrawal History</option>
              <option value="rebate">Rebate</option>
              <option value="gift">Gifts</option>
              <option value="lottery_win">Lottery Win</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Section Subtitle */}
        <div className="flex items-center gap-2 px-1 pt-0.5">
          <div className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-700 flex items-center justify-center">
            <FileText className="w-3 h-3" />
          </div>
          <span className="text-xs font-black tracking-wide text-slate-700 uppercase">
            {headingTitle}
          </span>
        </div>

        {/* Records Cards */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-3xl p-6 border border-slate-200">
              No records found.
            </div>
          ) : (
            filtered.map((row) => {
              const isDep = row.type === 'deposit';
              const isWd = row.type === 'withdraw';
              const statusStyle =
                row.status === 'COMPLETED'
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                  : row.status === 'REJECTED'
                  ? 'border-rose-300 text-rose-700 bg-rose-50'
                  : row.status === 'PROCESSING'
                  ? 'border-sky-300 text-sky-700 bg-sky-50'
                  : 'border-cyan-300 text-cyan-800 bg-cyan-50';

              const typeBadgeStyle = isDep
                ? 'bg-emerald-50 text-emerald-700'
                : isWd
                ? 'bg-rose-50 text-rose-700'
                : 'bg-cyan-50 text-cyan-700';

              return (
                <div
                  key={row.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                >
                  {/* Card Header: Type Badge Left + Status Right */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span
                      className={`px-3 py-1 rounded-md text-[11px] font-black tracking-wide uppercase ${typeBadgeStyle}`}
                    >
                      {row.badgeLabel}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md border text-[10px] font-black tracking-wide ${statusStyle}`}
                    >
                      {row.status === 'COMPLETED'
                        ? 'Completed'
                        : row.status === 'PROCESSING'
                        ? 'Processing'
                        : row.status === 'REJECTED'
                        ? 'Rejected'
                        : 'Pending'}
                    </span>
                  </div>

                  {/* 4 Key Rows */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">
                        {isDep ? 'Deposit amount' : isWd ? 'Withdrawal amount' : 'Amount'}
                      </span>
                      <span
                        className={`font-black font-mono tabular-nums text-sm ${
                          isDep
                            ? 'text-cyan-700'
                            : isWd
                            ? 'text-rose-600'
                            : row.amount >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {isDep || isWd
                          ? `৳${Math.abs(row.amount).toFixed(2)}`
                          : `${row.amount >= 0 ? '+' : '-'}৳${Math.abs(row.amount).toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-medium">Type</span>
                      <span className="font-bold text-slate-900 text-right truncate max-w-[65%]">
                        {row.methodLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Time</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">
                        {row.time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">Order number</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold text-slate-900 truncate max-w-[175px]">
                          {row.orderNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(row.id, row.orderNumber)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex-shrink-0"
                          aria-label="Copy Order Number"
                        >
                          {copiedId === row.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {row.payoutTrxId && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">Payout TrxID</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono font-bold text-emerald-700 truncate max-w-[175px]">
                            {row.payoutTrxId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(`${row.id}_trx`, row.payoutTrxId!)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex-shrink-0"
                            aria-label="Copy Payout TrxID"
                          >
                            {copiedId === `${row.id}_trx` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {row.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
                        Note: {row.rejectionReason}
                      </div>
                    )}

                    {row.detail && !isDep && !isWd && (
                      <div className="text-[11px] text-slate-500 pt-0.5 truncate">{row.detail}</div>
                    )}
                  </div>

                  {/* Full-width Cyan COMPLETE PAYMENT button on Pending EWI PAY Deposits */}
                  {isDep && row.status === 'PENDING' && row.rawMethod !== 'USDT' && (
                    <button
                      type="button"
                      disabled={resumingId === row.id}
                      onClick={() => handleCompletePayment(row)}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs tracking-wider uppercase shadow-sm hover:brightness-105 active:scale-98 transition-all disabled:opacity-60"
                    >
                      {resumingId === row.id ? 'OPENING CHECKOUT...' : 'COMPLETE PAYMENT'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
