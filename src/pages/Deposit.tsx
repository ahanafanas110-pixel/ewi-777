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
  ExternalLink,
  Copy,
  Headphones,
  Clock
} from 'lucide-react';
import { BkashLogo, NagadLogo } from '../components/PaymentLogos';
import { getTranslation } from '../utils/i18n';

type GatewayCategory = 'ewallet' | 'usdt' | 'custom';
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
    id: 'Binance Pay',
    label: 'Binance Pay (Instant ID)',
    sublabel: 'Send USDT via Binance Pay ID (+2% Bonus)',
    min: 2,
    max: 400,
    limitTag: '৳200 - ৳50K Equiv.'
  }
];

const USDT_USD_PRESETS = [2, 5, 10, 20, 50, 100, 200, 400];

export const Deposit: React.FC = () => {
  const {
    user,
    adminSettings,
    depositRequests,
    initiateEwiPayDeposit,
    submitDepositRequest,
    claimDepositBonus,
    setActiveTab,
    language,
    showToast
  } = useApp();

  const isDepositEnabled = adminSettings.depositEnabled !== false;
  const firstBonusAmt = Math.max(1, Number(adminSettings.firstDepositBonusAmount) || 50);
  const configuredBinancePayId = String(adminSettings.binancePayId || '').trim();

  const [category, setCategory] = useState<GatewayCategory>('ewallet');
  const [selectedEWallet, setSelectedEWallet] = useState<EWalletMethod>('bKash');
  const [selectedChannel, setSelectedChannel] = useState<string>('Send Money');
  const [amount, setAmount] = useState<number>(500);
  const [usdAmount, setUsdAmount] = useState<number>(10);

  // Manual Binance Pay & Custom Gateway fields
  const [binanceSenderId, setBinanceSenderId] = useState<string>('');
  const [binanceTrxId, setBinanceTrxId] = useState<string>('');
  const [copiedBinanceId, setCopiedBinanceId] = useState(false);

  const activeCustomGateways = useMemo(
    () =>
      (adminSettings.paymentGateways || [])
        .filter((g) => g.active && String(g.accountNumber || '').trim().length > 0)
        .slice(0, 6),
    [adminSettings.paymentGateways]
  );
  const [selectedCustomGwId, setSelectedCustomGwId] = useState<string>('');
  const selectedCustomGateway = useMemo(
    () =>
      activeCustomGateways.find((g) => g.id === selectedCustomGwId) ||
      activeCustomGateways[0] ||
      null,
    [activeCustomGateways, selectedCustomGwId]
  );
  const [customSenderNum, setCustomSenderNum] = useState('');
  const [customTrxId, setCustomTrxId] = useState('');
  const [copiedCustomAcc, setCopiedCustomAcc] = useState(false);

  // EWI PAY live checkout state
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
      const key = String(d.sessionId || d.orderId || d.trxId || d.id || '').trim();
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
      setSelectedChannel('Binance Pay');
      if (usdAmount < 2 || usdAmount * usdtRateBdt > 50000) setUsdAmount(10);
    } else {
      setSelectedChannel('Send Money');
      if (amount < 200) setAmount(500);
    }
  };

  const handleCopyBinancePayId = async () => {
    if (!configuredBinancePayId) return;
    try {
      await navigator.clipboard.writeText(configuredBinancePayId);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = configuredBinancePayId;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(ta);
    }
    setCopiedBinanceId(true);
    showToast('Binance Pay ID copied!');
    setTimeout(() => setCopiedBinanceId(false), 1800);
  };

  const goToCustomerCare = () => {
    setActiveTab('customer-service');
    window.location.hash = '#/customer-service';
  };

  const handleProceedDeposit = async () => {
    if (!isDepositEnabled) {
      showToast('SITE IS NOT COMING — Deposits are paused by Admin.');
      return;
    }

    if (isUsdt) {
      if (!configuredBinancePayId) {
        showToast('Binance Pay ID not configured — contact Care');
        return;
      }
      if (!Number.isFinite(usdAmount) || effectiveBdtBase < 200 || effectiveBdtBase > 50000) {
        showToast('Binance Pay deposit equivalent must be between ৳200 and ৳50,000');
        return;
      }
      if (!binanceSenderId.trim() || !binanceTrxId.trim()) {
        showToast('Please enter your Binance Sender ID and Order / TxID');
        return;
      }
      const res = submitDepositRequest(
        effectiveBdtBase,
        'USDT',
        'Binance Pay',
        binanceSenderId.trim(),
        binanceTrxId.trim()
      );
      if (res.success) {
        setBinanceSenderId('');
        setBinanceTrxId('');
      } else {
        showToast(res.message);
      }
      return;
    }

    if (category === 'custom') {
      if (!selectedCustomGateway) {
        showToast('No custom gateway selected');
        return;
      }
      const minG = Math.max(100, Number(selectedCustomGateway.minAmount) || 200);
      const maxG = Math.max(minG, Number(selectedCustomGateway.maxAmount) || 50000);
      if (amount < minG || amount > maxG) {
        showToast(`Amount must be between ৳${minG} and ৳${maxG.toLocaleString()}`);
        return;
      }
      if (!customSenderNum.trim() || !customTrxId.trim()) {
        showToast('Enter your sender number/account and TrxID');
        return;
      }
      const methodMapped: 'bKash' | 'Nagad' | 'USDT' =
        selectedCustomGateway.type === 'nagad'
          ? 'Nagad'
          : selectedCustomGateway.type === 'usdt'
          ? 'USDT'
          : 'bKash';
      const res = submitDepositRequest(
        effectiveBdtBase,
        methodMapped,
        selectedCustomGateway.name,
        customSenderNum.trim(),
        customTrxId.trim()
      );
      if (res.success) {
        setCustomSenderNum('');
        setCustomTrxId('');
      } else {
        showToast(res.message);
      }
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
      const res = await initiateEwiPayDeposit(
        effectiveBdtBase,
        selectedMethod,
        selectedChannel,
        user.phone || ''
      );
      if (res.success && res.checkoutUrl) {
        setEwiPayCheckoutUrl(res.checkoutUrl);
        showToast('Checkout created! Redirecting to EWI PAY...');
        setTimeout(() => {
          window.location.href = res.checkoutUrl!;
        }, 450);
      } else {
        showToast(res.message || 'Unable to start EWI PAY checkout');
      }
    } finally {
      setIsCreatingCheckout(false);
    }
  };

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
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h2 className="text-base font-extrabold text-slate-900">
          {getTranslation(language, 'deposit')}
        </h2>
        <button
          type="button"
          onClick={() => {
            setActiveTab('transaction-history');
            window.location.hash = '#/transaction-history';
          }}
          className="text-xs font-bold text-cyan-700 hover:underline whitespace-nowrap"
        >
          {getTranslation(language, 'myDepositHistory')}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-cyan-100 font-semibold mb-1">
            <span>{getTranslation(language, 'totalBalance')}</span>
            <button
              type="button"
              onClick={() => showToast('Balance synced')}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 active:rotate-180 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-3xl font-black tracking-tight tabular-nums">
            ৳{user.balance.toFixed(2)}
          </div>
          <div className="text-[11px] text-cyan-100 mt-2 flex items-center justify-between gap-2 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>24/7 Verified EWI PAY Gateway</span>
            </span>
            <button
              type="button"
              onClick={goToCustomerCare}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold"
            >
              <Headphones className="w-3 h-3" />
              <span>{getTranslation(language, 'supportCare')}</span>
            </button>
          </div>
        </div>

        {/* Admin Deposit Off Notice */}
        {!isDepositEnabled && (
          <div className="bg-gradient-to-br from-rose-700 via-rose-600 to-red-600 rounded-3xl p-5 text-white shadow-md border border-rose-300/60 text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[10px] font-black uppercase tracking-widest">
              <AlertCircle className="w-3.5 h-3.5 text-rose-100" />
              <span>Gateway Paused</span>
            </div>
            <h3 className="text-2xl font-black tracking-wide uppercase">
              SITE IS NOT COMING
            </h3>
            <p className="text-xs text-rose-50 font-medium leading-relaxed max-w-sm mx-auto">
              NOW NOT AVAILABLE — Deposit service is temporarily paused by the administrator. Please try again shortly or contact Customer Care.
            </p>
            <button
              type="button"
              onClick={goToCustomerCare}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-rose-700 text-xs font-black shadow-xs hover:bg-rose-50"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Contact Care</span>
            </button>
          </div>
        )}

        {/* Active Deposit Gift Bonus Notice */}
        {activePendingGift && (
          <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md border border-cyan-300/50 space-y-1">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="flex items-center gap-1.5 text-cyan-200">
                <Gift className="w-4 h-4" />
                <span>GIFT BONUS ARMED ({activePendingGift.code})</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white text-[#0B2235] text-[10px] font-black">
                +{activePendingGift.pct}%
              </span>
            </div>
            <p className="text-[11px] text-cyan-100 font-semibold">
              Reason: {activePendingGift.reason}
            </p>
            <p className="text-[11px] text-white/95">
              Depositing ৳{effectiveBdtBase.toLocaleString()} unlocks <strong className="text-cyan-200">+৳{activePendingGift.bonusAmt.toLocaleString()}</strong> extra gift bonus automatically upon approval!
            </p>
          </div>
        )}

        {/* One-Time Deposit Bonus Card */}
        {!user.hasClaimedDepositBonus && (
          <div
            className={`rounded-3xl p-4 shadow-xs flex items-center justify-between border ${
              hasCompletedDeposit
                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white border-transparent'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            <div>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${
                  hasCompletedDeposit ? 'text-cyan-100' : 'text-cyan-700'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{getTranslation(language, 'depositBonusCenter')}</span>
              </div>
              <div className={`font-extrabold text-sm mt-0.5 ${hasCompletedDeposit ? 'text-white' : 'text-slate-900'}`}>
                {hasCompletedDeposit
                  ? `${getTranslation(language, 'claimDepositBonus')} (৳${firstBonusAmt})`
                  : `${getTranslation(language, 'unlockDepositBonus')} (৳${firstBonusAmt})`}
              </div>
              <div
                className={`text-[10px] ${
                  hasCompletedDeposit ? 'text-cyan-50' : 'text-slate-500'
                }`}
              >
                {hasCompletedDeposit
                  ? `${getTranslation(language, 'claim')} ৳${firstBonusAmt}`
                  : getTranslation(language, 'unlockDepositBonus')}
              </div>
            </div>
            {hasCompletedDeposit ? (
              <button
                type="button"
                onClick={() => claimDepositBonus()}
                className="px-4 py-2 rounded-full bg-white text-slate-900 font-black text-xs shadow-sm active:scale-95 transition-all hover:bg-cyan-50 flex-shrink-0"
              >
                {getTranslation(language, 'claim')} ৳{firstBonusAmt}
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px] flex items-center gap-1 flex-shrink-0">
                <Lock className="w-3 h-3" />
                <span>{getTranslation(language, 'locked')}</span>
              </div>
            )}
          </div>
        )}

        {/* Gateway Category Switcher: E-Wallet vs Binance Pay / Configured Gateways */}
        <div
          className={`bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs grid gap-1.5 ${
            activeCustomGateways.length > 0 ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          <button
            type="button"
            onClick={() => handleCategorySwitch('ewallet')}
            className={`py-2.5 min-h-[44px] rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
              category === 'ewallet'
                ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
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
                ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="font-black">₮</span>
            <span>Binance Pay (+2%)</span>
          </button>
          {activeCustomGateways.length > 0 && (
            <button
              type="button"
              onClick={() => handleCategorySwitch('custom')}
              className={`py-2.5 min-h-[44px] rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
                category === 'custom'
                  ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Gateways ({activeCustomGateways.length})</span>
            </button>
          )}
        </div>

        {/* Method Selector Cards */}
        {category === 'ewallet' ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedEWallet('bKash')}
              className={`p-3 rounded-2xl flex items-center justify-between border-2 transition-all active:scale-95 ${
                selectedEWallet === 'bKash'
                  ? 'bg-cyan-50/90 border-cyan-500 shadow-sm ring-2 ring-cyan-500/20'
                  : 'bg-white border-slate-200 hover:border-cyan-400/50'
              }`}
            >
              <BkashLogo size="md" showText={true} />
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                  selectedEWallet === 'bKash'
                    ? 'bg-cyan-600 border-cyan-600 text-white font-black'
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
                  ? 'bg-cyan-50/90 border-cyan-500 shadow-sm ring-2 ring-cyan-500/20'
                  : 'bg-white border-slate-200 hover:border-cyan-400/50'
              }`}
            >
              <NagadLogo size="md" showText={true} />
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                  selectedEWallet === 'Nagad'
                    ? 'bg-cyan-600 border-cyan-600 text-white font-black'
                    : 'border-slate-300'
                }`}
              >
                {selectedEWallet === 'Nagad' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          </div>
        ) : category === 'custom' ? (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              {activeCustomGateways.map((gw) => {
                const isSel = selectedCustomGateway?.id === gw.id;
                return (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => setSelectedCustomGwId(gw.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${
                      isSel
                        ? 'bg-cyan-50/90 border-cyan-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-cyan-300'
                    }`}
                  >
                    <div className="font-black text-xs text-slate-900 truncate">{gw.name}</div>
                    <div className="text-[10px] font-bold uppercase text-cyan-700 mt-0.5">
                      {gw.type} • {gw.accountLabel || 'Official'}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedCustomGateway && (
              <div className="p-4 rounded-2xl bg-white border border-cyan-200 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-cyan-700 uppercase">
                      {selectedCustomGateway.name} ({selectedCustomGateway.accountLabel || selectedCustomGateway.type})
                    </div>
                    <div className="font-mono font-black text-sm text-slate-900 truncate">
                      {selectedCustomGateway.accountNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(selectedCustomGateway.accountNumber).catch(() => {});
                      setCopiedCustomAcc(true);
                      showToast('Gateway account copied!');
                      setTimeout(() => setCopiedCustomAcc(false), 1800);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-[11px] font-black flex items-center gap-1 flex-shrink-0"
                  >
                    {copiedCustomAcc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCustomAcc ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                {selectedCustomGateway.instructions && (
                  <p className="text-[11px] text-slate-600 font-medium">{selectedCustomGateway.instructions}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customSenderNum}
                    onChange={(e) => setCustomSenderNum(e.target.value)}
                    placeholder="Sender Number / Account"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                  <input
                    type="text"
                    value={customTrxId}
                    onChange={(e) => setCustomTrxId(e.target.value)}
                    placeholder="Transaction ID (TrxID)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white border border-cyan-300 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#0D9488] text-white font-black flex items-center justify-center text-base">
                  ₮
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900">Binance Pay Manual Deposit</div>
                  <div className="text-[10px] font-bold text-cyan-700">
                    $1 = ৳{usdtRateBdt} • +2% Auto Deposit Bonus
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-600 text-white text-[10px] font-black">
                +2% BONUS
              </span>
            </div>

            {configuredBinancePayId ? (
              <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-cyan-700 uppercase">Official Binance Pay ID</div>
                  <div className="font-mono font-black text-sm text-slate-900 truncate">
                    {configuredBinancePayId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBinancePayId}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-black flex items-center gap-1 flex-shrink-0"
                >
                  {copiedBinanceId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBinanceId ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-rose-700">
                  Binance Pay ID not configured — contact Care
                </span>
                <button
                  type="button"
                  onClick={goToCustomerCare}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-black whitespace-nowrap"
                >
                  Care
                </button>
              </div>
            )}
          </div>
        )}

        {/* SELECT CHANNEL */}
        <div className="bg-white rounded-3xl p-4 shadow-2xs border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              {getTranslation(language, 'selectChannel')}
            </span>
            <span className="text-[10px] font-bold text-cyan-700">
              {selectedMethod === 'USDT' ? 'Binance Pay Verified' : `${selectedMethod} · EWI PAY`}
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
                  className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-50/70 border-cyan-500 ring-1 ring-cyan-500/30 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-cyan-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-extrabold truncate ${isSelected ? 'text-cyan-800' : 'text-slate-800'}`}>
                      {ch.label}
                    </span>
                    <span className="text-[10px] font-black text-slate-700 tabular-nums">{ch.limitTag}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{ch.sublabel}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DEPOSIT AMOUNT */}
        <div className="bg-white rounded-3xl p-4 shadow-2xs border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              {isUsdt ? 'Binance Pay Amount ($ USDT)' : getTranslation(language, 'depositAmount')}
            </span>
            <span className="text-[11px] font-extrabold text-cyan-700 tabular-nums">
              {isUsdt
                ? '৳200 - ৳50,000 Equiv.'
                : `৳${activeChannelObj.min.toLocaleString()} - ৳${activeChannelObj.max.toLocaleString()}`}
            </span>
          </div>

          {isUsdt ? (
            <>
              <div className="grid grid-cols-4 gap-2">
                {USDT_USD_PRESETS.map((usd) => (
                  <button
                    key={usd}
                    type="button"
                    onClick={() => setUsdAmount(usd)}
                    className={`py-2 min-h-[40px] rounded-xl font-extrabold text-xs border transition-all active:scale-95 tabular-nums ${
                      usdAmount === usd
                        ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] border-transparent text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    ${usd.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative pt-1">
                <span className="absolute inset-y-0 left-3.5 top-1 flex items-center text-cyan-700 font-black text-base">
                  $
                </span>
                <input
                  type="number"
                  min={2}
                  max={400}
                  step="any"
                  value={usdAmount || ''}
                  onChange={(e) => setUsdAmount(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-16 py-3 text-sm font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter USDT amount"
                />
                <span className="absolute inset-y-0 right-3.5 top-1 flex items-center text-[11px] font-black text-slate-500">
                  USDT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Your Binance Pay ID / Phone
                  </label>
                  <input
                    type="text"
                    value={binanceSenderId}
                    onChange={(e) => setBinanceSenderId(e.target.value)}
                    placeholder="e.g. 58291042"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Binance Order / TxID
                  </label>
                  <input
                    type="text"
                    value={binanceTrxId}
                    onChange={(e) => setBinanceTrxId(e.target.value)}
                    placeholder="Enter Binance Order ID"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
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
                        ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] border-transparent text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    ৳{p.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative pt-1">
                <span className="absolute inset-y-0 left-3.5 top-1 flex items-center text-cyan-700 font-black text-base">
                  ৳
                </span>
                <input
                  type="number"
                  min={activeChannelObj.min}
                  max={activeChannelObj.max}
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-3 text-sm font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder={`Min ৳${activeChannelObj.min}`}
                />
              </div>
            </>
          )}

          {/* Breakdown Box */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-1.5 text-[11px]">
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
              <span>Turnover Requirement (1x)</span>
              <span className="text-slate-800 font-bold tabular-nums">
                ৳{(effectiveBdtBase * 1).toLocaleString()}
              </span>
            </div>
            {isUsdt && (
              <div className="flex justify-between text-emerald-700 font-black">
                <span>Binance Pay Auto Bonus (+2%)</span>
                <span className="tabular-nums">+৳{usdtAutoBonusBdt.toFixed(2)}</span>
              </div>
            )}
            {activePendingGift && (
              <div className="flex justify-between text-emerald-700 font-extrabold">
                <span>Gift Code ({activePendingGift.code} · +{activePendingGift.pct}%)</span>
                <span className="tabular-nums">+৳{activePendingGift.bonusAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-black pt-1 border-t border-slate-200">
              <span>Total Deposit Credit</span>
              <span className="text-cyan-700 tabular-nums">
                ৳{(effectiveBdtBase + usdtAutoBonusBdt + (activePendingGift?.bonusAmt || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          {isDepositEnabled ? (
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleProceedDeposit}
                disabled={isCreatingCheckout || (isUsdt && !configuredBinancePayId)}
                className="w-full py-3.5 min-h-[48px] rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-md active:scale-98 transition-all hover:brightness-105 disabled:opacity-60 uppercase tracking-wider"
              >
                {isCreatingCheckout
                  ? 'Connecting EWI PAY...'
                  : isUsdt
                  ? `Submit $${usdAmount.toLocaleString()} Binance Pay (+2%)`
                  : category === 'custom'
                  ? `Submit ${selectedCustomGateway?.name || 'Gateway'} ৳${amount.toLocaleString()}`
                  : `PAY ৳${amount.toLocaleString()}`}
              </button>

              {ewiPayCheckoutUrl && (
                <a
                  href={ewiPayCheckoutUrl}
                  target="_top"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Continue to EWI PAY Checkout →</span>
                </a>
              )}

              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-cyan-700 flex-shrink-0" />
                  <span>Checkout expires in 1 hour. Need help?</span>
                </span>
                <button
                  type="button"
                  onClick={goToCustomerCare}
                  className="font-black text-cyan-700 hover:underline whitespace-nowrap"
                >
                  Customer Care →
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-3.5 rounded-full bg-slate-200 text-slate-500 font-black text-sm shadow-xs cursor-not-allowed uppercase tracking-wider"
            >
              NOW NOT AVAILABLE
            </button>
          )}
        </div>

        {/* Recent Deposit Status Tracker */}
        {myRecentDeposits.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-2xs border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-cyan-700" />
                <span>Recent Deposit Orders</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('transaction-history');
                  window.location.hash = '#/transaction-history';
                }}
                className="text-[11px] font-bold text-cyan-700 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {myRecentDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate tabular-nums">
                        {dep.method} • ৳{dep.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        Order: {dep.orderId || dep.trxId} • {dep.time}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0 ${
                        dep.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : dep.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      {dep.status === 'approved'
                        ? 'Completed'
                        : dep.status === 'rejected'
                        ? 'Rejected'
                        : 'Pending'}
                    </span>
                  </div>
                  {dep.status === 'rejected' && (dep.rejectionReason || dep.adminNote) && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
                      Reason: {dep.rejectionReason || dep.adminNote}
                    </div>
                  )}
                  {dep.status === 'pending' && dep.checkoutUrl && (
                    <a
                      href={dep.checkoutUrl}
                      className="block w-full py-2 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white text-center font-black text-[11px] uppercase tracking-wider shadow-2xs"
                    >
                      Complete Payment →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
