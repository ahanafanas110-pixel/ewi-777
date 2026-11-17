import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Gift,
  Lock,
  X,
  AlertTriangle,
  AlertCircle,
  Check,
  Wallet,
  Timer,
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
    min: 100,
    max: 50000,
    limitTag: '৳100 - ৳50K'
  },
  {
    id: 'Cash Out',
    label: 'Cash Out',
    sublabel: 'Agent Gateway',
    min: 100,
    max: 50000,
    limitTag: '৳100 - ৳50K'
  },
  {
    id: 'P2P Fast',
    label: 'P2P Fast',
    sublabel: 'VIP High Limit',
    min: 200,
    max: 100000,
    limitTag: '৳200 - ৳100K'
  }
];

const USDT_CHANNELS: PaymentChannelOption[] = [
  {
    id: 'TRC20 Instant',
    label: 'TRC20 Network',
    sublabel: 'Zero Gas Fee',
    min: 500,
    max: 500000,
    limitTag: '৳500 - ৳500K'
  }
];

const DUMMY_TRX_PATTERNS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  'ABCDEFGH',
  'TEST1234',
  'TRX12345',
  'TRXID123',
  'QWERTYUI'
]);

function validateTrxId(raw: string): { valid: boolean; clean: string; error?: string } {
  const clean = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) {
    return { valid: false, clean, error: 'Transaction ID (TrxID) is required.' };
  }
  if (!/^[A-Z0-9]{8,16}$/.test(clean)) {
    return {
      valid: false,
      clean,
      error: 'Invalid TrxID! Must be 8–16 letters and numbers (e.g. BL78K9M2P1).'
    };
  }
  if (/^([A-Z0-9])\1+$/.test(clean) || DUMMY_TRX_PATTERNS.has(clean)) {
    return {
      valid: false,
      clean,
      error: 'Fake or repeated TrxID is not accepted. Enter the real TrxID from your payment SMS.'
    };
  }
  return { valid: true, clean };
}

export const Deposit: React.FC = () => {
  const {
    user,
    adminSettings,
    depositRequests,
    submitDepositRequest,
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

  // EWI-Pay live checkout state
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [ewiPayCheckoutUrl, setEwiPayCheckoutUrl] = useState<string | null>(null);

  // Manual TrxID Fallback Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [countdownSec, setCountdownSec] = useState(599);
  const [gatewayMode, setGatewayMode] = useState<'Send Money' | 'Cash Out' | 'Add Money'>('Send Money');
  const [senderNumber, setSenderNumber] = useState(user.phone || '');
  const [trxId, setTrxId] = useState('');
  const [trxError, setTrxError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<{
    orderId: string;
    amount: number;
    method: string;
    trxId: string;
  } | null>(null);

  const presets =
    category === 'ewallet'
      ? [100, 200, 500, 1000, 2000, 3000, 5000, 10000, 20000]
      : [500, 1000, 2000, 5000, 10000, 50000];

  const channels = category === 'ewallet' ? EWALLET_CHANNELS : USDT_CHANNELS;
  const activeChannelObj = useMemo(
    () => channels.find((c) => c.id === selectedChannel) || channels[0],
    [channels, selectedChannel]
  );

  const selectedMethod: 'bKash' | 'Nagad' | 'USDT' =
    category === 'usdt' ? 'USDT' : selectedEWallet;

  const currentOfficialAccount =
    selectedMethod === 'bKash'
      ? adminSettings.bkashNumber
      : selectedMethod === 'Nagad'
      ? adminSettings.nagadNumber
      : adminSettings.usdtAddress || 'TQm9xL...TRC20NotConfigured';

  const hasCompletedDeposit = useMemo(
    () =>
      (Number(user.totalDeposited) || 0) > 0 ||
      depositRequests.some((d) => d.userId === user.id && d.status === 'approved'),
    [user.totalDeposited, user.id, depositRequests]
  );

  const myRecentDeposits = useMemo(
    () => depositRequests.filter((d) => d.userId === user.id).slice(0, 5),
    [depositRequests, user.id]
  );

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
      bonusAmt: +((amount * pct) / 100).toFixed(2)
    };
  }, [user.pendingDepositBonusCode, adminSettings.activeGiftCodes, amount]);

  useEffect(() => {
    if (!showCheckoutModal) return;
    const timer = setInterval(() => {
      setCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showCheckoutModal]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(countdownSec / 60);
    const secs = countdownSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [countdownSec]);

  const copyValue = (val: string, fieldKey: string, label: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedField(fieldKey);
    showToast(`${label} copied!`);
    setTimeout(() => setCopiedField((cur) => (cur === fieldKey ? null : cur)), 1800);
  };

  const handleCategorySwitch = (nextCat: GatewayCategory) => {
    setCategory(nextCat);
    if (nextCat === 'usdt') {
      setSelectedChannel('TRC20 Instant');
      if (amount < 500) setAmount(500);
    } else {
      setSelectedChannel('Send Money');
      if (amount < 100) setAmount(500);
    }
  };

  const handleProceedEwiPay = async () => {
    if (!isDepositEnabled) {
      showToast('SITE IS NOT COMING — Deposits are paused by Admin.');
      return;
    }
    if (amount < activeChannelObj.min || amount > activeChannelObj.max) {
      showToast(`Amount must be between ৳${activeChannelObj.min} and ৳${activeChannelObj.max.toLocaleString()}`);
      return;
    }
    if (isCreatingCheckout) return;

    setIsCreatingCheckout(true);
    setEwiPayCheckoutUrl(null);
    try {
      const res = await initiateEwiPayDeposit(amount, selectedMethod, selectedChannel, senderNumber);
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

  const handleOpenManualModal = () => {
    if (!isDepositEnabled) {
      showToast('SITE IS NOT COMING — Deposits are paused by Admin.');
      return;
    }
    if (amount < activeChannelObj.min || amount > activeChannelObj.max) {
      showToast(`Amount must be between ৳${activeChannelObj.min} and ৳${activeChannelObj.max.toLocaleString()}`);
      return;
    }
    setOrderId(`EWI${Date.now().toString().slice(-8)}`);
    setCountdownSec(599);
    setTrxError(null);
    setShowCheckoutModal(true);
  };

  const handleSubmitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setTrxError(null);

    if (countdownSec <= 0) {
      setTrxError('Payment session expired. Please reopen checkout to get a fresh Order ID.');
      return;
    }

    const cleanSender = senderNumber.trim();
    if (category === 'ewallet') {
      const digits = cleanSender.replace(/\D/g, '');
      if (!/^01[3-9]\d{8}$/.test(digits)) {
        setTrxError('Enter a valid 11-digit BD sender wallet number (01XXXXXXXXX).');
        return;
      }
    } else if (!cleanSender || cleanSender.length < 6) {
      setTrxError('Enter your sending TRC20 wallet address or sender label.');
      return;
    }

    const trxValidation = validateTrxId(trxId);
    if (!trxValidation.valid) {
      setTrxError(trxValidation.error || 'Invalid TrxID');
      return;
    }

    const channelLabel =
      category === 'ewallet' ? `${selectedChannel} (${gatewayMode})` : selectedChannel;

    const res = submitDepositRequest(
      amount,
      selectedMethod,
      channelLabel,
      cleanSender,
      trxValidation.clean
    );

    if (res.success) {
      setLastSubmittedOrder({
        orderId,
        amount,
        method: selectedMethod,
        trxId: trxValidation.clean
      });
      setShowCheckoutModal(false);
      setTrxId('');
    } else {
      setTrxError(res.message);
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
              Depositing ৳{amount.toLocaleString()} unlocks <strong className="text-yellow-200">+৳{activePendingGift.bonusAmt.toLocaleString()}</strong> extra gift bonus automatically upon approval!
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
                  ? 'Deposit completed • ৳150 turnover required'
                  : 'Complete your first deposit to unlock this 1-time bonus'}
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
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-emerald-50/50'
            }`}
          >
            <span className="font-black">₮</span>
            <span>USDT (TRC20)</span>
          </button>
        </div>

        {/* Method Selector Cards (Keep official bKash pink logo & Nagad orange logo) */}
        {category === 'ewallet' ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedEWallet('bKash')}
              className={`p-3 rounded-2xl flex items-center justify-between border-2 transition-all active:scale-95 ${
                selectedEWallet === 'bKash'
                  ? 'bg-pink-50/90 border-[#E2136E] shadow-sm ring-2 ring-[#E2136E]/20'
                  : 'bg-white border-amber-100 hover:border-amber-200'
              }`}
            >
              <BkashLogo size="md" showText={true} />
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                  selectedEWallet === 'bKash'
                    ? 'bg-[#E2136E] border-[#E2136E] text-white font-black'
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
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-500 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center text-base">
                ₮
              </div>
              <div>
                <div className="font-extrabold text-sm text-slate-800">USDT (TRC20)</div>
                <div className="text-[10px] font-semibold text-emerald-700">
                  Instant Crypto Gateway
                </div>
              </div>
            </div>
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
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
          <div className={`grid gap-2 ${channels.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
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
              {getTranslation(language, 'depositAmount')}
            </span>
            <span className="text-[11px] font-extrabold text-[#B45309] tabular-nums">
              ৳{activeChannelObj.min.toLocaleString()} - ৳{activeChannelObj.max.toLocaleString()}
            </span>
          </div>

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

          {/* Breakdown Box */}
          <div className="bg-[#FFFDF7] rounded-2xl p-3 border border-amber-100 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-500 font-semibold">
              <span>Gateway Processing Fee</span>
              <span className="text-emerald-600 font-extrabold">৳0.00 (Free)</span>
            </div>
            <div className="flex justify-between text-slate-500 font-semibold">
              <span>Turnover Requirement (2x)</span>
              <span className="text-slate-700 font-bold tabular-nums">৳{(amount * 2).toLocaleString()}</span>
            </div>
            {activePendingGift && (
              <div className="flex justify-between text-emerald-700 font-extrabold">
                <span>Gift Code ({activePendingGift.code} · +{activePendingGift.pct}%)</span>
                <span className="tabular-nums">+৳{activePendingGift.bonusAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 font-black pt-1 border-t border-amber-100">
              <span>Total Deposit Credit</span>
              <span className="text-[#B45309] tabular-nums">
                ৳{(amount + (activePendingGift?.bonusAmt || 0)).toFixed(2)}
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

              <button
                type="button"
                onClick={handleOpenManualModal}
                className="w-full py-2.5 rounded-full bg-amber-50 border border-amber-200 text-[#92400E] font-bold text-xs hover:bg-amber-100 transition-colors"
              >
                Already Sent? Submit Manual TrxID
              </button>
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

        {/* Success Receipt Card */}
        {lastSubmittedOrder && (
          <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm text-emerald-900">
                  Payment Submitted ({lastSubmittedOrder.orderId})
                </h4>
                <p className="text-[11px] text-emerald-700 font-medium tabular-nums">
                  ৳{lastSubmittedOrder.amount.toFixed(2)} via {lastSubmittedOrder.method} • TrxID:{' '}
                  <span className="font-mono font-black">{lastSubmittedOrder.trxId}</span>
                </p>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800 bg-white/80 rounded-xl p-2.5 border border-emerald-100">
              Your order is currently <strong>Pending Verification</strong>. Once confirmed by the
              gateway admin, funds + auto deposit bonus will reflect in your wallet.
            </p>
          </div>
        )}

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

      {/* MANUAL TRXID VERIFICATION MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[94vh] flex flex-col animate-scale-up">
            <div className="bg-gradient-to-r from-[#92400E] via-[#D97706] to-[#F59E0B] text-white p-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-yellow-200" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Official Payment Checkout
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <div className="text-[11px] text-amber-100 font-semibold">Payment Amount</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black tracking-tight tabular-nums">
                      BDT {amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyValue(String(amount), 'amount', 'Amount')}
                      className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedField === 'amount' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/25 text-xs font-mono font-black tabular-nums">
                    <Timer className="w-3.5 h-3.5 text-yellow-200" />
                    <span>{formattedTimer}</span>
                  </div>
                  <div className="text-[10px] text-amber-100 font-mono mt-1">
                    Order: {orderId}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitCheckout} className="p-4 space-y-3.5 overflow-y-auto">
              <div className="bg-[#FFFDF7] rounded-2xl p-3.5 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-600">
                    Step 1: Copy Official {selectedMethod} Number
                  </span>
                  {selectedMethod === 'bKash' && <BkashLogo size="sm" showText={false} />}
                  {selectedMethod === 'Nagad' && <NagadLogo size="sm" showText={false} />}
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-black text-[#B45309] tracking-wider truncate">
                    {currentOfficialAccount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyValue(currentOfficialAccount, 'wallet', `${selectedMethod} Account`)
                    }
                    className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#92400E] font-extrabold text-xs flex items-center gap-1 flex-shrink-0 active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedField === 'wallet' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {adminSettings.depositInstructions}
                </p>
              </div>

              {category === 'ewallet' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-700 block">
                    Step 2: Choose Transfer Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Send Money', 'Cash Out', 'Add Money'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setGatewayMode(mode)}
                        className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold border transition-all ${
                          gatewayMode === mode
                            ? 'bg-amber-50 border-[#D97706] text-[#B45309]'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  {category === 'ewallet'
                    ? `Your ${selectedMethod} Sender Number`
                    : 'Your Sending TRC20 Address'}
                </label>
                <input
                  type={category === 'ewallet' ? 'tel' : 'text'}
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder={category === 'ewallet' ? '01XXXXXXXXX' : 'T...'}
                  className="w-full bg-[#FFFDF7] border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  Step 3: Enter Transaction ID (TrxID)
                </label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => {
                    setTrxId(e.target.value.toUpperCase());
                    if (trxError) setTrxError(null);
                  }}
                  placeholder="e.g. BL78K9M2P1"
                  maxLength={20}
                  className={`w-full bg-[#FFFDF7] border rounded-xl px-3.5 py-2.5 text-xs font-mono font-black uppercase text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 tracking-wider ${
                    trxError
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-amber-200 focus:ring-amber-300'
                  }`}
                  required
                />
              </div>

              {trxError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{trxError}</span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[10px] leading-relaxed flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Important:</strong> Wrong or fake TrxID is not accepted. Send exact{' '}
                  <strong>BDT {amount.toFixed(2)}</strong> before the timer expires, then enter your
                  real TrxID above.
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-3 rounded-full bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-xs shadow-md active:scale-98 transition-all hover:brightness-105"
                >
                  Confirm & Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
