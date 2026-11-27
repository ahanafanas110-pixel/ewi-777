import React, { useEffect, useMemo, useState } from 'react';
import { normalizePhone, useApp } from '../context/AppContext';
import { ArrowLeft, Copy, Check, FileText, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Language } from '../types';

interface HistoryCardRow {
  id: string;
  source: 'deposit_req' | 'withdraw_req' | 'ledger';
  type: string;
  badgeLabel: string;
  methodLabel: string;
  channelLabel?: string;
  time: string;
  sortMs: number;
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

const HISTORY_COPY: Record<
  Language,
  {
    allTitle: string;
    depositTitle: string;
    withdrawTitle: string;
    allOpt: string;
    depOpt: string;
    wdOpt: string;
    rebateOpt: string;
    giftOpt: string;
    winOpt: string;
    emptyAll: string;
    emptyDeposit: string;
    emptyWithdraw: string;
    depAmount: string;
    wdAmount: string;
    amount: string;
    type: string;
    time: string;
    orderNo: string;
    payoutTrx: string;
    note: string;
    completed: string;
    processing: string;
    rejected: string;
    pending: string;
    completePay: string;
    opening: string;
  }
> = {
  en: {
    allTitle: 'TRANSACTION HISTORY',
    depositTitle: 'DEPOSIT HISTORY',
    withdrawTitle: 'WITHDRAWAL HISTORY',
    allOpt: 'All Records',
    depOpt: 'Deposit History',
    wdOpt: 'Withdrawal History',
    rebateOpt: 'Rebate',
    giftOpt: 'Gifts',
    winOpt: 'Lottery Win',
    emptyAll: 'No transaction records yet.',
    emptyDeposit: 'No deposit history yet.',
    emptyWithdraw: 'No withdrawal requests yet.',
    depAmount: 'Deposit amount',
    wdAmount: 'Withdrawal amount',
    amount: 'Amount',
    type: 'Type',
    time: 'Time',
    orderNo: 'Order / TrxID',
    payoutTrx: 'Payout TrxID',
    note: 'Note',
    completed: 'Completed',
    processing: 'Processing',
    rejected: 'Rejected',
    pending: 'Pending',
    completePay: 'COMPLETE PAYMENT',
    opening: 'OPENING CHECKOUT...'
  },
  bn: {
    allTitle: 'লেনদেনের ইতিহাস',
    depositTitle: 'ডিপোজিট ইতিহাস',
    withdrawTitle: 'উইথড্র ইতিহাস',
    allOpt: 'সব রেকর্ড',
    depOpt: 'ডিপোজিট ইতিহাস',
    wdOpt: 'উইথড্র ইতিহাস',
    rebateOpt: 'রিবেট',
    giftOpt: 'গিফট',
    winOpt: 'লটারি জয়',
    emptyAll: 'এখনো কোনো লেনদেন পাওয়া যায়নি।',
    emptyDeposit: 'এখনো কোনো ডিপোজিট ইতিহাস নেই।',
    emptyWithdraw: 'আপনি এখনো কোনো উইথড্র করেননি।',
    depAmount: 'ডিপোজিট পরিমাণ',
    wdAmount: 'উইথড্র পরিমাণ',
    amount: 'পরিমাণ',
    type: 'মাধ্যম',
    time: 'সময়',
    orderNo: 'অর্ডার / TrxID',
    payoutTrx: 'পেআউট TrxID',
    note: 'নোট',
    completed: 'সম্পন্ন',
    processing: 'প্রক্রিয়াধীন',
    rejected: 'বাতিল',
    pending: 'অপেক্ষমান',
    completePay: 'পেমেন্ট সম্পন্ন করুন',
    opening: 'চেকআউট খোলা হচ্ছে...'
  },
  hi: {
    allTitle: 'लेनदेन इतिहास',
    depositTitle: 'डिपॉज़िट इतिहास',
    withdrawTitle: 'विथड्रॉ इतिहास',
    allOpt: 'सभी रिकॉर्ड',
    depOpt: 'डिपॉज़िट इतिहास',
    wdOpt: 'विथड्रॉ इतिहास',
    rebateOpt: 'रिबेट',
    giftOpt: 'गिफ्ट',
    winOpt: 'लॉटरी जीत',
    emptyAll: 'अभी तक कोई लेनदेन रिकॉर्ड नहीं है।',
    emptyDeposit: 'अभी तक कोई डिपॉज़िट इतिहास नहीं है।',
    emptyWithdraw: 'आपने अभी तक कोई विथड्रॉ नहीं किया है।',
    depAmount: 'डिपॉज़िट राशि',
    wdAmount: 'विथड्रॉ राशि',
    amount: 'राशि',
    type: 'माध्यम',
    time: 'समय',
    orderNo: 'ऑर्डर / TrxID',
    payoutTrx: 'पेआउट TrxID',
    note: 'नोट',
    completed: 'पूर्ण',
    processing: 'प्रोसेसिंग',
    rejected: 'अस्वीकृत',
    pending: 'लंबित',
    completePay: 'भुगतान पूरा करें',
    opening: 'चेकआउट खुल रहा है...'
  },
  ur: {
    allTitle: 'لین دین کی تاریخ',
    depositTitle: 'ڈپازٹ ہسٹری',
    withdrawTitle: 'ودڈرا ہسٹری',
    allOpt: 'تمام ریکارڈز',
    depOpt: 'ڈپازٹ ہسٹری',
    wdOpt: 'ودڈرا ہسٹری',
    rebateOpt: 'ریبیٹ',
    giftOpt: 'تحائف',
    winOpt: 'لاٹری جیت',
    emptyAll: 'ابھی تک کوئی لین دین موجود نہیں۔',
    emptyDeposit: 'ابھی تک کوئی ڈپازٹ ہسٹری موجود نہیں۔',
    emptyWithdraw: 'آپ نے ابھی تک کوئی ودڈرا کی درخواست نہیں دی۔',
    depAmount: 'ڈپازٹ رقم',
    wdAmount: 'ودڈرا رقم',
    amount: 'رقم',
    type: 'طریقہ',
    time: 'وقت',
    orderNo: 'آرڈر / TrxID',
    payoutTrx: 'پے آؤٹ TrxID',
    note: 'نوٹ',
    completed: 'مکمل',
    processing: 'جاری ہے',
    rejected: 'مسترد',
    pending: 'زیر التواء',
    completePay: 'ادائیگی مکمل کریں',
    opening: 'چیک آؤٹ کھل رہا ہے...'
  }
};

function resolveSortTimeMs(rec: { createdAtMs?: number; id?: string; time?: string }): number {
  if (typeof rec.createdAtMs === 'number' && rec.createdAtMs > 0) return rec.createdAtMs;
  const match = String(rec.id || '').match(/_(\d{13})(?:_|$)/);
  if (match) return Number(match[1]) || 0;
  const parsed = rec.time ? Date.parse(rec.time) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
    language,
    showToast
  } = useApp();

  const copy = HISTORY_COPY[language] || HISTORY_COPY.en;
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
    showToast('Order / TrxID copied');
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
    if (!user.isLoggedIn || !user.id) return [];

    const normUserPhone = normalizePhone(user.phone || '');
    const list: HistoryCardRow[] = [];
    const seenKeys = new Set<string>();

    // 1. User Deposit Requests ONLY
    depositRequests
      .filter((d) => {
        if (d.userId === user.id) return true;
        if (normUserPhone && d.senderNumber && normalizePhone(d.senderNumber) === normUserPhone) return true;
        if (normUserPhone && d.userPhone && normalizePhone(d.userPhone) === normUserPhone) return true;
        return false;
      })
      .forEach((d) => {
        const dedupKey = `dep:${d.sessionId || d.orderId || d.trxId || d.id}`;
        if (seenKeys.has(dedupKey)) return;
        seenKeys.add(dedupKey);
        const status: HistoryCardRow['status'] =
          d.status === 'approved' ? 'COMPLETED' : d.status === 'rejected' ? 'REJECTED' : 'PENDING';
        const channelStr = String(d.channel || '').trim();
        list.push({
          id: `dep_req_${d.id}`,
          source: 'deposit_req',
          type: 'deposit',
          badgeLabel: 'DEPOSIT',
          methodLabel: `${d.method || 'bKash'}${channelStr ? ` · ${channelStr}` : ''}`,
          channelLabel: channelStr || undefined,
          time: d.time,
          sortMs: resolveSortTimeMs(d),
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

    // 2. User Withdraw Requests ONLY (strictly real submitted withdrawals)
    withdrawRequests
      .filter((w) => {
        if (w.userId === user.id) return true;
        if (normUserPhone && w.userPhone && normalizePhone(w.userPhone) === normUserPhone) return true;
        return false;
      })
      .forEach((w) => {
        const dedupKey = `wd:${w.orderId || w.id}`;
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
          source: 'withdraw_req',
          type: 'withdraw',
          badgeLabel: 'WITHDRAW',
          methodLabel: `${w.method}${w.number ? ` · ${w.number}` : ''}`,
          time: w.time,
          sortMs: resolveSortTimeMs(w),
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

    // 3. Other Account Ledger Transactions (excludes deposit/withdraw & zero-amount admin hold noise)
    transactions
      .filter((tx) => tx.userId === user.id)
      .forEach((tx) => {
        if (tx.type === 'deposit' || tx.type === 'withdraw') return;
        if ((tx.type === 'admin_hold' || tx.type === 'admin_release') && Math.abs(Number(tx.amount) || 0) === 0) {
          return;
        }

        const badgeMap: Record<string, string> = {
          gift: 'GIFT',
          rebate: 'REBATE',
          salary_bonus: 'SALARY',
          lottery_win: 'LOTTERY WIN',
          recharge_bonus: 'RECHARGE BONUS',
          daily_refer_bonus: 'DAILY REFER',
          wingo_streak_bonus: 'WIN STREAK',
          wingo_refund: 'WINGO REFUND',
          admin_adjust: 'ADJUSTMENT',
          admin_hold: 'HOLD',
          admin_release: 'RELEASE',
          withdraw_refund: 'WD REFUND'
        };

        list.push({
          id: tx.id,
          source: 'ledger',
          type: tx.type,
          badgeLabel: badgeMap[tx.type] || tx.type.replace(/_/g, ' ').toUpperCase(),
          methodLabel: tx.title,
          time: tx.time,
          sortMs: resolveSortTimeMs(tx),
          amount: tx.amount,
          orderNumber: String(tx.trxId || tx.id).toUpperCase(),
          status: tx.status === 'rejected' ? 'REJECTED' : tx.status === 'pending' ? 'PENDING' : 'COMPLETED',
          detail: tx.detail
        });
      });

    return list.sort((a, b) => (b.sortMs || 0) - (a.sortMs || 0));
  }, [depositRequests, withdrawRequests, transactions, user.isLoggedIn, user.id, user.phone]);

  const filtered = combinedItems.filter((tx) => {
    if (filterType === 'deposit') {
      if (tx.source !== 'deposit_req') return false;
    } else if (filterType === 'withdraw') {
      if (tx.source !== 'withdraw_req') return false;
    } else if (filterType !== 'all') {
      if (tx.type !== filterType) return false;
    }
    if (filterDate && !tx.time.includes(filterDate)) return false;
    return true;
  });

  const headingTitle =
    filterType === 'deposit'
      ? copy.depositTitle
      : filterType === 'withdraw'
      ? copy.withdrawTitle
      : copy.allTitle;

  const emptyMessage =
    filterType === 'withdraw'
      ? copy.emptyWithdraw
      : filterType === 'deposit'
      ? copy.emptyDeposit
      : copy.emptyAll;

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
              <option value="all">{copy.allOpt}</option>
              <option value="deposit">{copy.depOpt}</option>
              <option value="withdraw">{copy.wdOpt}</option>
              <option value="rebate">{copy.rebateOpt}</option>
              <option value="gift">{copy.giftOpt}</option>
              <option value="lottery_win">{copy.winOpt}</option>
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
        <div className="flex items-center justify-between px-1 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-700 flex items-center justify-center">
              {filterType === 'withdraw' ? (
                <ArrowUpCircle className="w-3.5 h-3.5" />
              ) : filterType === 'deposit' ? (
                <ArrowDownCircle className="w-3.5 h-3.5" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
            </div>
            <span className="text-xs font-black tracking-wide text-slate-700 uppercase">
              {headingTitle}
            </span>
          </div>
          {filtered.length > 0 && (
            <span className="text-[11px] font-bold font-mono text-slate-400">
              {filtered.length}
            </span>
          )}
        </div>

        {/* Records Cards */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-3xl p-6 border border-slate-200 font-semibold">
              {emptyMessage}
            </div>
          ) : (
            filtered.map((row) => {
              const isDep = row.source === 'deposit_req';
              const isWd = row.source === 'withdraw_req';
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
                        ? copy.completed
                        : row.status === 'PROCESSING'
                        ? copy.processing
                        : row.status === 'REJECTED'
                        ? copy.rejected
                        : copy.pending}
                    </span>
                  </div>

                  {/* Key Rows */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">
                        {isDep ? copy.depAmount : isWd ? copy.wdAmount : copy.amount}
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
                      <span className="text-slate-500 font-medium">{copy.type}</span>
                      <span className="font-bold text-slate-900 text-right truncate max-w-[65%]">
                        {row.methodLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">{copy.time}</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">
                        {row.time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">{copy.orderNo}</span>
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
                        <span className="text-slate-500 font-medium">{copy.payoutTrx}</span>
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
                        {copy.note}: {row.rejectionReason}
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
                      {resumingId === row.id ? copy.opening : copy.completePay}
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
