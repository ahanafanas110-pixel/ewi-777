import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Gift,
  Lock,
  AlertCircle,
  Check,
  Wallet,
  Receipt,
  ExternalLink
} from 'lucide-react';
import { BkashLogo, NagadLogo } from '../components/PaymentLogos';
import { getTranslation } from '../utils/i18n';

type GatewayCategory = 'ewallet' | 'usdt';
type EWalletMethod = 'bKash' | 'Nagad';
type PaymentChannelOption = {
  id: string;
  label: string;
  sublabel: string;
  min: number;
  max: number;
  limitTag: string;
};

const EWALLET_CHANNELS: PaymentChannelOption[] = [
  {
    id: 'Send Money',
    label: 'Send Money',
    sublabel: 'Instant Personal',
    min: 200,
    max: 50000,
    limitTag: '৳200 - ৳50K'
  }
];

const USDT_CHANNELS: PaymentChannelOption[] = [
  {
    id: 'Binance / USDT TRC20',
    label: 'Binance / USDT TRC20',
    sublabel: 'Instant +2% Auto Bonus',
    min: 2,
    max: 20000,
    limitTag: '$2 - $20,000'
  }
];

const USDT_USD_PRESETS = [2, 5, 10, 20, 50, 100, 500, 1000, 5000, 20000];

export const Deposit: React.FC = () => {
  const {
    user,
    adminSettings,
    depositRequests,
    initiateEwiPayDeposit,
    claimDepositBonus,
    setActiveTab,
    language,
    showToast
  } = useApp();

  const isDepositEnabled = adminSettings.depositEnabled !== false;

  const [category, setCategory] = useState<GatewayCategory>('ewallet');
  const [selectedEWallet, setSelectedEWallet] = useState<EWalletMethod>('bKash');
  const [selectedChannel, setSelectedChannel] = useState<string>('Send Money');
  const [amount, setAmount] = useState<number>(500);
  const [usdAmount, setUsdAmount] = useState<number>(10);

  // EWI-Pay live checkout state
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [ewiPayCheckoutUrl, setEwiPayCheckoutUrl] = useState<string | null>(null);

  const usdtRateBdt = Math.max(80, Number(adminSettings.usdtRateBdt) || 120);
  const isUsdt = category === 'usdt';
  const effectiveBdtBase = isUsdt ? +(usdAmount * usdtRateBdt).toFixed(2) : amount;
  const usdtAutoBonusBdt = isUsdt ? +(effectiveBdtBase * 0.02).toFixed(2) : 0;

  const presets = [200, 500, 1000, 2000, 3000, 5000, 10000, 20000, 50000];

  const channels = isUsdt ? USDT_CHANNELS : EWALLET_CHANNELS;
  const activeChannelObj = useMemo(
    () => channels.find((c) => c.id === selectedChannel) || channels[0],
    [channels, selectedChannel]
  );

  const selectedMethod: 'bKash' | 'Nagad' | 'USDT' = isUsdt ? 'USDT' : selectedEWallet;

  const hasCompletedDeposit = useMemo(
    () =>
      (Number(user.totalDeposited) || 0) > 0 ||
      depositRequests.some((d) => d.userId === user.id && d.status === 'approved'),
    [user.totalDeposited, user.id, depositRequests]
  );

  const myRecentDeposits = useMemo(() => {
    const seen = new Set<string>();
    const list = [];
    for (const d of depositRequests) {
      if (d.userId !== user.id) continue;
      const key = String(d.sessionId || d.trxId || d.id || '').trim();
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      list.push(d);
      if (list.length >= 5) break;
    }
    return list;
  }, [depositRequests, user.id]);

  const activePendingGift = useMemo(() => {
    const code = String(user.pendingDepositBonusCode || '').trim().toUpperCase();
    if (!code) return null;
    const item = (adminSettings.activeGiftCodes || []).find(
      (c) => c.code.toUpperCase() === code && c.active !== false && c.rewardType === 'deposit_percent'
    );
    if (!item) return null;
    const pct = Number(item.depositBonusPercent || item.amount || 200);
    return {
      code: item.code,
      pct,
      reason: item.reason || item.note || `${pct}% Deposit Gift Bonus`,
      bonusAmt: +((effectiveBdtBase * pct) / 100).toFixed(2)
    };
  }, [user.pendingDepositBonusCode, adminSettings.activeGiftCodes, effectiveBdtBase]);

  const handleCategorySwitch = (nextCat: GatewayCategory) => {
    setCategory(nextCat);
    if (nextCat === 'usdt') {
      setSelectedChannel('Binance / USDT TRC20');
      if (usdAmount < 2 || usdAmount > 20000) setUsdAmount(10);
    } else {
      setSelectedChannel('Send Money');
      if (amount < 200) setAmount(500);
    }
  };

  const handleProceedEwiPay = async () => {
    if (!isDepositEnabled) {
      showToast('SITE IS NOT COMING — Deposits are paused by Admin.');
      return;
    }
    if (isUsdt) {
      if (!Number.isFinite(usdAmount) || usdAmount < 2 || usdAmount > 20000) {
        showToast('Binance / USDT deposit must be between $2 and $20,000');
        return;
      }
    } else if (amount < activeChannelObj.min || amount > activeChannelObj.max) {
      showToast(`Amount must be between ৳${activeChannelObj.min} and ৳${activeChannelObj.max.toLocaleString()}`);
      return;
    }
    if (isCreatingCheckout) return;

    setIsCreatingCheckout(true);
    setEwiPayCheckoutUrl(null);
    try {
      const res = await initiateEwiPayDeposit(
        effectiveBdtBase,
        selectedMethod,
        selectedChannel,
        user.phone || '',
        isUsdt ? usdAmount : undefined
      );
      if (res.success && res.checkoutUrl) {
        setEwiPayCheckoutUrl(res.checkoutUrl);
        showToast('Checkout created! Redirecting to EWI-Pay...');
        setTimeout(() => {
          window.location.href = res.checkoutUrl!;
        }, 450);
      } else {
        showToast(res.message || 'Unable to start EWI-Pay checkout');
      }
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      <div className="bg-white px-4 py-3 border-b border-amber-100 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => {
            setActiveTab('wallet');
            window.location.hash = '#/wallet';
          }}
          className="p-1.5 -ml-1 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-700 hover:text-[#B45309] active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h2 className="text-base font-extrabold text-slate-800">
          {getTranslation(language, 'deposit')}
        </h2>
        <button
          onClick={() => {
            setActiveTab('transaction-history');
            window.location.hash = '#/transaction-history';
          }}
          className="text-xs font-bold text-[#B45309] hover:underline whitespace-nowrap"
        >
          Deposit History
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Luxury Gold Balance Card */}
        <div className="bg-gradient-to-r from-[#92400E] via-[#D97706] to-[#F59E0B] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-amber-100 font-semibold mb-1">
            <span>Available Balance</span>
            <button
              onClick={() => showToast('Balance synced')}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 active:rotate-180 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-3xl font-black tracking-tight tabular-nums">
            ৳{user.balance.toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-100 mt-2 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>24/7 Verified EWI-Pay Gateway</span>
          </div>
        </div>

        {/* Admin Deposit Off Notice */}
        {!isDepositEnabled && (
          <div className="bg-gradient-to-br from-[#1F160A] via-[#78350F] to-[#B45309] rounded-3xl p-5 text-white shadow-md border border-amber-400/50 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[10px] font-black uppercase tracking-widest">
              <AlertCircle className="w-3.5 h-3.5 text-amber-200" />
              <span>Gateway Paused</span>
            </div>
            <h3 className="text-2xl font-black tracking-wide uppercase drop-shadow-xs">
              SITE IS NOT COMING
            </h3>
            <p className="text-xs text-amber-100 font-medium leading-relaxed max-w-sm mx-auto">
              NOW NOT AVAILABLE — Deposit service is temporarily paused by the administrator. Please try again shortly or contact Customer Service.
            </p>
          </div>
        )}

        {/* Active 200% Deposit Gift Bonus Notice */}
        {activePendingGift && (
          <div className="bg-gradient-to-r from-[#78350F] via-[#B45309] to-[#D97706] rounded-3xl p-4 text-white shadow-md border border-amber-300/45 space-y-1">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="flex items-center gap-1.5 text-yellow-200">
                <Gift className="w-4 h-4" />
                <span>GIFT BONUS ARMED ({activePendingGift.code})</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white text-[#92400E] text-[10px] font-black">
                +{activePendingGift.pct}%
              </span>
            </div>
            <p className="text-[11px] text-amber-100 font-semibold">
              Reason: {activePendingGift.reason}
            </p>
            <p className="text-[11px] text-white/95">
              Depositing ৳{effectiveBdtBase.toLocaleString()} unlocks <strong className="text-yellow-200">+৳{activePendingGift.bonusAmt.toLocaleString()}</strong> extra gift bonus automatically upon approval!
            </p>
          </div>
        )}

        {/* One-Time Deposit Bonus Card */}
        {!user.hasClaimedDepositBonus && (
          <div
            className={`rounded-3xl p-4 shadow-sm flex items-center justify-between border ${
              hasCompletedDeposit
                ? 'bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white border-transparent'
                : 'bg-white text-slate-700 border-amber-100'
            }`}
          >
            <div>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${
                  hasCompletedDeposit ? 'text-yellow-200' : 'text-[#B45309]'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>First Deposit Bonus (1x Only)</span>
              </div>
              <div className="font-extrabold text-sm mt-0.5">
                {hasCompletedDeposit ? 'Claim ৳50 Cash Bonus!' : 'Unlock ৳50 After Deposit'}
              </div>
              <div
                className={`text-[10px] ${
                  hasCompletedDeposit ? 'text-amber-100' : 'text-slate-500'
                }`}
              >
                {hasCompletedDeposit
                  ? 'Deposit completed • Click Claim to collect (1-time)'
                  : 'Complete your first deposit (৳200+) to unlock this 1-time bonus'}
              </div>
            </div>
            {hasCompletedDeposit ? (
              <button
                onClick={() => claimDepositBonus()}
                className="px-4 py-2 rounded-full bg-white text-slate-900 font-black text-xs shadow-md active:scale-95 transition-all hover:bg-amber-50 flex-shrink-0"
              >
                Claim ৳50
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px] flex items-center gap-1 flex-shrink-0">
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </div>
            )}
          </div>
        )}

        {/* Gateway Category Switcher: E-Wallet vs USDT */}
        <div className="bg-white rounded-2xl p-1.5 border border-amber-100 shadow-2xs grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleCategorySwitch('ewallet')}
            className={`py-2.5 min-h-[44px] rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
              category === 'ewallet'
                ? 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white shadow-sm'
                : 'text-slate-600 hover:bg-amber-50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>E-Wallet (BDT)</span>
          </button>
          <button
            type="button"
            onClick={() => handleCategorySwitch('usdt')}
            className={`py-2.5 min-h-[44px] rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
              category === 'usdt'
                ? 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white shadow-sm'
                : 'text-slate-600 hover:bg-amber-50'
            }`}
          >
            <span className="font-black">₮</span>
            <span>Binance / USDT (+2%)</span>
          </button>
        </div>

        {/* Method Selector Cards */}
        {category === 'ewallet' ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedEWallet('bKash')}
              className={`p-3 rounded-2xl flex items-center justify-between border-2 transition-all active:scale-95 ${
                selectedEWallet === 'bKash'
                  ? 'bg-amber-50/80 border-[#D97706] shadow-sm ring-2 ring-[#D97706]/20'
                  : 'bg-white border-amber-100 hover:border-amber-200'
              }`}
            >
              <BkashLogo size="md" showText={true} />
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                  selectedEWallet === 'bKash'
                    ? 'bg-[#D97706] border-[#D97706] text-white font-black'
                    : 'border-slate-300'
                }`}
              >
                {selectedEWallet === 'bKash' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedEWallet('Nagad')}
              className={`p-3 rounded-2xl flex items-center justify-between border-2 transition-all active:scale-95 ${
                selectedEWallet === 'Nagad'
                  ? 'bg-orange-50/90 border-[#F7931E] shadow-sm ring-2 ring-[#F7931E]/20'
                  : 'bg-white border-amber-100 hover:border-amber-200'
              }`}
            >
              <NagadLogo size="md" showText={true} />
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                  selectedEWallet === 'Nagad'
                    ? 'bg-[#F7931E] border-[#F7931E] text-white font-black'
                    : 'border-slate-300'
                }`}
              >
                {selectedEWallet === 'Nagad' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border-2 border-[#D97706] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#B45309] to-[#F59E0B] text-white font-black flex items-center justify-center text-base">
                ₮
              </div>
              <div>
                <div className="font-extrabold text-sm text-slate-900">Binance / USDT (TRC20)</div>
                <div className="text-[10px] font-extrabold text-[#B45309]">
                  $2 – $20,000 • +2% Auto Deposit Bonus
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#B45309] text-white text-[10px] font-black">
              +2% BONUS
            </span>
          </div>
        )}

        {/* SELECT CHANNEL */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-amber-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Select Channel
            </span>
            <span className="text-[10px] font-bold text-[#B45309]">
              {selectedMethod} Verified
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {channels.map((ch) => {
              const isSelected = activeChannelObj.id === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-amber-50 border-[#D97706] ring-1 ring-[#D97706]/30 shadow-2xs'
                      : 'bg-[#FFFDF7] border-amber-100 hover:border-amber-200'
                  }`}
                >
                  <div
                    className={`text-xs font-extrabold truncate ${
                      isSelected ? 'text-[#B45309]' : 'text-slate-800'
                    }`}
                  >
                    {ch.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{ch.sublabel}</div>
                  <div className="mt-1.5 text-[10px] font-black text-slate-700 tabular-nums">
                    {ch.limitTag}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DEPOSIT AMOUNT */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-amber-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              {isUsdt ? 'Binance / USDT Amount ($)' : getTranslation(language, 'depositAmount')}
            </span>
            <span className="text-[11px] font-extrabold text-[#B45309] tabular-nums">
              {isUsdt
                ? '$2 - $20,000 USDT'
                : `৳${activeChannelObj.min.toLocaleString()} - ৳${activeChannelObj.max.toLocaleString()}`}
            </span>
          </div>

          {isUsdt ? (
            <>
              <div className="grid grid-cols-5 gap-1.5">
                {USDT_USD_PRESETS.map((usd) => (
                  <button
                    key={usd}
                    type="button"
                    onClick={() => setUsdAmount(usd)}
                    className={`py-2 min-h-[40px] rounded-xl font-extrabold text-xs border transition-all active:scale-95 tabular-nums ${
                      usdAmount === usd
                        ? 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] border-transparent text-white shadow-sm'
                        : 'bg-[#FFFDF7] border-amber-100 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    ${usd.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative pt-1">
                <span className="absolute inset-y-0 left-3.5 top-1 flex items-center text-[#B45309] font-black text-base">
                  $
                </span>
                <input
                  type="number"
                  min={2}
                  max={20000}
                  step="any"
                  value={usdAmount || ''}
                  onChange={(e) => setUsdAmount(Number(e.target.value) || 0)}
                  className="w-full bg-[#FFFDF7] border border-amber-200 rounded-2xl pl-9 pr-16 py-3 text-sm font-black text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Min $2 - Max $20,000"
                />
                <span className="absolute inset-y-0 right-3.5 top-1 flex items-center text-[11px] font-black text-slate-500">
                  USDT
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`py-2.5 min-h-[44px] rounded-xl font-extrabold text-xs border transition-all active:scale-95 tabular-nums ${
                      amount === p
                        ? 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] border-transparent text-white shadow-sm'
                        : 'bg-[#FFFDF7] border-amber-100 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    ৳{p.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative pt-1">
                <span className="absolute inset-y-0 left-3.5 top-1 flex items-center text-[#B45309] font-black text-base">
                  ৳
                </span>
                <input
                  type="number"
                  min={activeChannelObj.min}
                  max={activeChannelObj.max}
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-full bg-[#FFFDF7] border border-amber-200 rounded-2xl pl-9 pr-4 py-3 text-sm font-black text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder={`Min ৳${activeChannelObj.min}`}
                />
              </div>
            </>
          )}

          {/* Breakdown Box */}
          <div className="bg-[#FFFDF7] rounded-2xl p-3 border border-amber-100 space-y-1.5 text-[11px]">
            {isUsdt && (
              <div className="flex justify-between text-slate-600 font-bold">
                <span>Exchange Conversion ($1 = ৳{usdtRateBdt})</span>
                <span className="tabular-nums text-slate-900">
                  ${usdAmount} = ৳{effectiveBdtBase.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 font-semibold">
              <span>Gateway Processing Fee</span>
              <span className="text-emerald-600 font-extrabold">৳0.00 (Free)</span>
            </div>
            <div className="flex justify-between text-slate-500 font-semibold">
              <span>Turnover Requirement (2x)</span>
              <span className="text-slate-700 font-bold tabular-nums">
                ৳{(effectiveBdtBase * 2).toLocaleString()}
              </span>
            </div>
            {isUsdt && (
              <div className="flex justify-between text-emerald-700 font-black">
                <span>Binance / USDT Auto Bonus (+2%)</span>
                <span className="tabular-nums">+৳{usdtAutoBonusBdt.toFixed(2)}</span>
              </div>
            )}
            {activePendingGift && (
              <div className="flex justify-between text-emerald-700 font-extrabold">
                <span>Gift Code ({activePendingGift.code} · +{activePendingGift.pct}%)</span>
                <span className="tabular-nums">+৳{activePendingGift.bonusAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 font-black pt-1 border-t border-amber-100">
              <span>Total Deposit Credit</span>
              <span className="text-[#B45309] tabular-nums">
                ৳{(effectiveBdtBase + usdtAutoBonusBdt + (activePendingGift?.bonusAmt || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          {isDepositEnabled ? (
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleProceedEwiPay}
                disabled={isCreatingCheckout}
                className="w-full py-3.5 min-h-[48px] rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-sm shadow-md active:scale-98 transition-all hover:brightness-105 disabled:opacity-60 uppercase tracking-wider"
              >
                {isCreatingCheckout
                  ? 'Connecting EWI-Pay...'
                  : isUsdt
                  ? `Pay $${usdAmount.toLocaleString()} USDT (+2% Bonus)`
                  : `Pay ৳${amount.toLocaleString()} via EWI-Pay`}
              </button>

              {ewiPayCheckoutUrl && (
                <a
                  href={ewiPayCheckoutUrl}
                  target="_top"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Continue to EWI-Pay Checkout →</span>
                </a>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleProceedEwiPay}
              disabled
              className="w-full py-3.5 rounded-full bg-slate-300 text-slate-600 font-black text-sm shadow-xs cursor-not-allowed uppercase tracking-wider"
            >
              NOW NOT AVAILABLE
            </button>
          )}
        </div>

        {/* Recent Deposit Status Tracker */}
        {myRecentDeposits.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-amber-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#D97706]" />
                <span>Recent Deposit Orders</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('transaction-history');
                  window.location.hash = '#/transaction-history';
                }}
                className="text-[11px] font-bold text-[#B45309]"
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {myRecentDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="p-3 rounded-2xl bg-[#FFFDF7] border border-amber-100 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-800 truncate tabular-nums">
                      {dep.method} • ৳{dep.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      TrxID: {dep.trxId} • {dep.time}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0 ${
                      dep.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : dep.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {dep.status === 'approved'
                      ? 'Complete'
                      : dep.status === 'rejected'
                      ? 'Rejected'
                      : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
