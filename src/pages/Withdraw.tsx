import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Headphones,
  Lock,
  Plus,
  RefreshCw,
  Wallet as WalletIcon,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BkashLogo, NagadLogo } from '../components/PaymentLogos';
import { getLocalDateStr } from '../context/AppContext';

type EWalletBrand = 'bKash' | 'Nagad' | 'Upay' | 'SureCash';

interface SavedEWallet {
  id: string;
  type: EWalletBrand;
  number: string;
  accountName?: string;
}

const EWALLET_OPTIONS: Array<{ value: EWalletBrand; label: string }> = [
  { value: 'bKash', label: 'BKASH' },
  { value: 'Upay', label: 'UPAY' },
  { value: 'Nagad', label: 'NAGAD' },
  { value: 'SureCash', label: 'Surecash' }
];

function maskAccountNumber(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '—';
  if (s.length <= 6) return s;
  return `${s.slice(0, 3)}****${s.slice(-3)}`;
}

function maskUsdtAddress(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}••••${s.slice(-6)}`;
}

const TetherSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="15" fill="#26A17B" />
    <path
      d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657zm0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117z"
      fill="#fff"
    />
  </svg>
);

const EWalletBrandBadge: React.FC<{ type: EWalletBrand }> = ({ type }) => {
  if (type === 'bKash') return <BkashLogo size="sm" showText={false} />;
  if (type === 'Nagad') return <NagadLogo size="sm" showText={false} />;
  if (type === 'Upay') {
    return (
      <div className="w-6 h-6 rounded-xl bg-amber-400 text-slate-900 font-black text-[10px] flex items-center justify-center shadow-xs flex-shrink-0">
        UP
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-xl bg-cyan-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs flex-shrink-0">
      SC
    </div>
  );
};

export const Withdraw: React.FC = () => {
  const {
    user,
    withdrawRequests,
    adminSettings,
    withdraw,
    bindWallet,
    bindUsdtAddress,
    goBack,
    setActiveTab,
    showToast
  } = useApp();

  const [view, setView] = useState<'main' | 'methods' | 'add_ewallet'>('main');
  const [methodTab, setMethodTab] = useState<'ewallet' | 'usdt'>('ewallet');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Saved E-Wallets merged cleanly from boundWallets + legacy boundBkash/boundNagad
  const savedWallets: SavedEWallet[] = useMemo(() => {
    const list: SavedEWallet[] = [];
    const seen = new Set<string>();
    const addUnique = (w: SavedEWallet) => {
      const key = `${w.type.toLowerCase()}:${w.number}`;
      if (!w.number || seen.has(key)) return;
      seen.add(key);
      list.push(w);
    };
    if (Array.isArray(user.boundWallets)) {
      user.boundWallets.forEach((w) =>
        addUnique({
          id: w.id,
          type: w.type,
          number: w.number,
          accountName: w.accountName || user.nickname || 'Member'
        })
      );
    }
    if (user.boundNagad) {
      addUnique({
        id: `legacy_nagad_${user.boundNagad}`,
        type: 'Nagad',
        number: user.boundNagad,
        accountName: user.nickname || 'Member'
      });
    }
    if (user.boundBkash) {
      addUnique({
        id: `legacy_bkash_${user.boundBkash}`,
        type: 'bKash',
        number: user.boundBkash,
        accountName: user.nickname || 'Member'
      });
    }
    return list;
  }, [user.boundWallets, user.boundBkash, user.boundNagad, user.nickname]);

  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  useEffect(() => {
    if (savedWallets.length === 0) {
      setSelectedWalletId('');
      return;
    }
    if (!savedWallets.some((w) => w.id === selectedWalletId)) {
      setSelectedWalletId(savedWallets[0].id);
    }
  }, [savedWallets, selectedWalletId]);

  const selectedWallet = useMemo(
    () => savedWallets.find((w) => w.id === selectedWalletId) || savedWallets[0] || null,
    [savedWallets, selectedWalletId]
  );

  // Amounts
  const [bdtInput, setBdtInput] = useState<string>('');
  const [usdtInput, setUsdtInput] = useState<string>('');

  // Add E-Wallet form state
  const [newType, setNewType] = useState<EWalletBrand | ''>('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<EWalletBrand>('bKash');
  const [fullNameInput, setFullNameInput] = useState<string>(user.nickname || '');
  const [accountInput, setAccountInput] = useState<string>('');
  const [isSavingWallet, setIsSavingWallet] = useState(false);

  // Add USDT address modal state
  const [showUsdtModal, setShowUsdtModal] = useState(false);
  const [usdtAddrDraft, setUsdtAddrDraft] = useState<string>(user.boundUsdt || '');
  const [usdtNetDraft, setUsdtNetDraft] = useState<string>(user.usdtNetwork || 'TRC20');
  const [isSavingUsdt, setIsSavingUsdt] = useState(false);

  useEffect(() => {
    if (!fullNameInput && user.nickname) setFullNameInput(user.nickname);
  }, [user.nickname, fullNameInput]);

  // Derived financial constraints
  const lockedAmt = Math.max(0, Number(user.lockedBalance || 0));
  const totalBalance = Math.max(0, Number(user.balance || 0));
  const withdrawableAmt = Math.max(0, +(totalBalance - lockedAmt).toFixed(2));
  const remainingTurnover = Math.max(0, +((user.turnoverRequired || 0) - (user.turnoverCompleted || 0)).toFixed(2));
  const withdrawDisabled = adminSettings.withdrawEnabled === false;

  const usdtRate = Math.max(80, Number(adminSettings.usdtRateBdt || 120));
  const minEwallet = Math.max(300, Number(adminSettings.minWithdraw) || 300);
  const maxEwallet = 50000;
  const minUsdtBdt = +(10 * usdtRate).toFixed(2);
  const maxUsdtBdt = +(50000 * usdtRate).toFixed(2);

  const rangeMin = methodTab === 'usdt' ? minUsdtBdt : minEwallet;
  const rangeMax = methodTab === 'usdt' ? maxUsdtBdt : maxEwallet;

  const myWithdraws = useMemo(() => {
    return (withdrawRequests || [])
      .filter((w) => w.userId === user.id || (user.uid && w.userId === user.uid))
      .sort((a, b) => (Number(b.createdAtMs) || 0) - (Number(a.createdAtMs) || 0));
  }, [withdrawRequests, user.id, user.uid]);

  const tzOffset =
    typeof adminSettings.timezoneOffsetMinutes === 'number' ? adminSettings.timezoneOffsetMinutes : 360;
  const todayStr = getLocalDateStr(new Date(), tzOffset);
  const todayWithdrawCount = useMemo(() => {
    return myWithdraws.filter((w) => {
      if (w.status === 'rejected') return false;
      if (w.createdAtMs) {
        return getLocalDateStr(new Date(w.createdAtMs), tzOffset) === todayStr;
      }
      return String(w.time || '').includes(todayStr);
    }).length;
  }, [myWithdraws, todayStr, tzOffset]);
  const remainingDailyTimes = Math.max(0, 3 - todayWithdrawCount);

  const parsedBdt = Number(bdtInput) || 0;
  const parsedUsdt = Number(usdtInput) || 0;

  // Live inline error message
  const inlineError = useMemo(() => {
    if (!bdtInput.trim() && !usdtInput.trim()) return '';
    if (withdrawDisabled) return 'Withdrawals are currently paused by Administrator';
    if (remainingTurnover > 0) return 'Insufficient turnover';
    if (parsedBdt <= 0) return 'Please enter a valid amount';
    if (lockedAmt > 0 && parsedBdt > withdrawableAmt) {
      return `Hold balance (৳${lockedAmt.toFixed(2)}) cannot be withdrawn until released`;
    }
    if (parsedBdt > withdrawableAmt) return 'Insufficient withdrawable balance';
    if (parsedBdt < rangeMin) {
      return methodTab === 'usdt'
        ? `Minimum USDT withdrawal is 10 USDT (৳${rangeMin.toLocaleString()})`
        : `Minimum withdrawal is ৳${rangeMin.toLocaleString()}`;
    }
    if (parsedBdt > rangeMax) {
      return `Maximum withdrawal is ৳${rangeMax.toLocaleString()}`;
    }
    return '';
  }, [
    bdtInput,
    usdtInput,
    withdrawDisabled,
    remainingTurnover,
    parsedBdt,
    lockedAmt,
    withdrawableAmt,
    rangeMin,
    rangeMax,
    methodTab
  ]);

  const canSubmit =
    !withdrawDisabled &&
    remainingTurnover <= 0 &&
    parsedBdt >= rangeMin &&
    parsedBdt <= rangeMax &&
    parsedBdt <= withdrawableAmt &&
    (methodTab === 'ewallet' ? Boolean(selectedWallet) : Boolean(user.boundUsdt));

  const handleRefreshBalance = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 550);
    showToast(`Available balance: ৳${totalBalance.toFixed(2)} (Playable: ৳${withdrawableAmt.toFixed(2)})`);
  };

  const handleBdtChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setBdtInput(cleaned);
    const num = Number(cleaned);
    if (!cleaned || isNaN(num) || num <= 0) {
      setUsdtInput('');
    } else {
      setUsdtInput((num / usdtRate).toFixed(2));
    }
  };

  const handleUsdtChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setUsdtInput(cleaned);
    const num = Number(cleaned);
    if (!cleaned || isNaN(num) || num <= 0) {
      setBdtInput('');
    } else {
      setBdtInput((num * usdtRate).toFixed(2));
    }
  };

  const handleAllClick = () => {
    const capped = Math.min(rangeMax, withdrawableAmt);
    if (capped <= 0) {
      setBdtInput('0');
      setUsdtInput('0');
      if (lockedAmt > 0) {
        showToast(`৳${lockedAmt.toFixed(2)} balance is on Hold and cannot be withdrawn.`);
      } else {
        showToast('No withdrawable balance available');
      }
      return;
    }
    const fixedStr = capped.toFixed(2);
    setBdtInput(fixedStr);
    setUsdtInput((capped / usdtRate).toFixed(2));
  };

  const handleWithdrawSubmit = () => {
    if (withdrawDisabled) {
      showToast('Withdrawals are currently paused by Administrator.');
      return;
    }
    if (methodTab === 'ewallet' && !selectedWallet) {
      showToast('Please add and select an E-Wallet account first.');
      setView('methods');
      return;
    }
    if (methodTab === 'usdt' && !user.boundUsdt) {
      showToast('Please add your USDT address first.');
      setUsdtAddrDraft('');
      setShowUsdtModal(true);
      return;
    }
    if (remainingTurnover > 0) {
      showToast(`Need to bet ৳${remainingTurnover.toFixed(2)} more to withdraw!`);
      return;
    }
    if (lockedAmt > 0 && parsedBdt > withdrawableAmt) {
      showToast(`৳${lockedAmt.toFixed(2)} balance is on Hold and cannot be withdrawn until released.`);
      return;
    }
    if (parsedBdt < rangeMin || parsedBdt > rangeMax) {
      showToast(`Amount must be between ৳${rangeMin.toLocaleString()} and ৳${rangeMax.toLocaleString()}`);
      return;
    }
    if (parsedBdt > withdrawableAmt) {
      showToast('Insufficient withdrawable balance');
      return;
    }

    const res =
      methodTab === 'ewallet' && selectedWallet
        ? withdraw(parsedBdt, selectedWallet.type, undefined, {
            accountNumber: selectedWallet.number,
            accountName: selectedWallet.accountName
          })
        : withdraw(parsedBdt, 'USDT', undefined, {
            accountNumber: user.boundUsdt,
            usdAmount: parsedUsdt > 0 ? parsedUsdt : +(parsedBdt / usdtRate).toFixed(2),
            network: user.usdtNetwork || 'TRC20'
          });

    if (res.success) {
      setBdtInput('');
      setUsdtInput('');
    } else {
      showToast(res.message);
    }
  };

  const handleSaveNewWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType) {
      showToast('Please choose an E-Wallet type');
      return;
    }
    if (!fullNameInput.trim()) {
      showToast('Please enter full name');
      return;
    }
    const cleanDigits = accountInput.replace(/\D/g, '');
    if (cleanDigits.length < 10 || cleanDigits.length > 16) {
      showToast('Please enter a valid E-Wallet account number');
      return;
    }
    setIsSavingWallet(true);
    try {
      const res = await bindWallet(newType, cleanDigits, undefined, fullNameInput.trim());
      if (res.success) {
        setAccountInput('');
        setNewType('');
        setView('methods');
      } else {
        showToast(res.message);
      }
    } finally {
      setIsSavingWallet(false);
    }
  };

  const handleSaveUsdtAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUsdt(true);
    try {
      const res = await bindUsdtAddress(usdtAddrDraft, usdtNetDraft);
      if (res.success) {
        setShowUsdtModal(false);
      } else {
        showToast(res.message);
      }
    } finally {
      setIsSavingUsdt(false);
    }
  };

  const copyText = (txt: string, label: string) => {
    try {
      navigator.clipboard.writeText(txt);
      showToast(`${label} copied!`);
    } catch {
      showToast(txt);
    }
  };

  const scrollToHistory = () => {
    const el = document.getElementById('withdrawal-history-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ==================== SUB-VIEW 2: E-WALLET PAYMENT METHOD LIST ====================
  if (view === 'methods') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
        <div className="sticky top-0 z-30 h-14 bg-white border-b border-slate-100 px-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView('main')}
            aria-label="Back"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-800 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-slate-900 truncate">E-Wallet Payment Method</h1>
          <div className="w-11" />
        </div>

        <div className="max-w-3xl mx-auto p-4 space-y-3">
          {savedWallets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-cyan-300 p-8 text-center space-y-2">
              <WalletIcon className="w-8 h-8 text-cyan-600 mx-auto" />
              <div className="text-sm font-bold text-slate-800">No E-Wallet added yet</div>
              <div className="text-xs text-slate-500">Tap below to add bKash, Nagad, Upay, or SureCash.</div>
            </div>
          ) : (
            savedWallets.map((w) => {
              const isSelected = selectedWallet?.id === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWalletId(w.id);
                    setView('main');
                  }}
                  className={`w-full text-left bg-white rounded-2xl p-4 border transition-all flex items-center justify-between gap-3 active:scale-[0.99] ${
                    isSelected
                      ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-cyan-300'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <EWalletBrandBadge type={w.type} />
                      <span className="font-black text-sm text-slate-900 uppercase tracking-wide">
                        {w.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 truncate">
                      {w.accountName || user.nickname || 'Member'}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                      {maskAccountNumber(w.number)}
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] border-cyan-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Sticky bottom Add payment method button */}
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => {
                setPickerDraft(newType || 'bKash');
                setView('add_ewallet');
              }}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-md hover:brightness-105 active:scale-[0.99] transition-all"
            >
              Add payment method
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SUB-VIEW 3: ADD E-WALLET ====================
  if (view === 'add_ewallet') {
    const canSaveWallet = Boolean(newType && fullNameInput.trim() && accountInput.replace(/\D/g, '').length >= 10);
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
        <div className="sticky top-0 z-30 h-14 bg-white border-b border-slate-100 px-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView('methods')}
            aria-label="Back"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-800 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-slate-900 truncate">E-Wallet Payment Method</h1>
          <div className="w-11" />
        </div>

        <form onSubmit={handleSaveNewWallet} className="max-w-3xl mx-auto p-4 space-y-5">
          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#0D9488] text-white flex items-center justify-center shadow-xs">
              <WalletIcon className="w-4 h-4" />
            </div>
            <span className="text-base font-black text-slate-900">E-Wallet</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Choose type</label>
              <button
                type="button"
                onClick={() => {
                  setPickerDraft(newType || 'bKash');
                  setPickerOpen(true);
                }}
                className="w-full h-12 rounded-xl bg-white border border-slate-200 px-3.5 flex items-center justify-between text-sm hover:border-cyan-400 transition-colors"
              >
                <span className={newType ? 'font-bold text-slate-900 uppercase' : 'text-slate-400 font-medium'}>
                  {newType ? EWALLET_OPTIONS.find((o) => o.value === newType)?.label || newType : 'Please choose'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Enter full account holder name"
                className="w-full h-12 rounded-xl bg-white border border-slate-200 px-3.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Account</label>
              <input
                type="tel"
                inputMode="numeric"
                value={accountInput}
                onChange={(e) => setAccountInput(e.target.value.replace(/\D/g, '').slice(0, 16))}
                placeholder="Please enter Account"
                className="w-full h-12 rounded-xl bg-white border border-slate-200 px-3.5 text-sm font-semibold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200">
            <div className="max-w-3xl mx-auto">
              <button
                type="submit"
                disabled={!canSaveWallet || isSavingWallet}
                className={`w-full h-12 rounded-xl font-black text-sm transition-all ${
                  canSaveWallet && !isSavingWallet
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-md hover:brightness-105'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSavingWallet ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>

        {/* Choose Type Bottom Picker Drawer */}
        {pickerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-150">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-800 min-h-[36px] px-2"
                >
                  Cancel
                </button>
                <span className="text-xs font-bold text-slate-400">Select E-Wallet</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewType(pickerDraft);
                    setPickerOpen(false);
                  }}
                  className="text-sm font-black text-cyan-600 hover:text-cyan-700 min-h-[36px] px-2"
                >
                  Confirm
                </button>
              </div>
              <div className="py-3 divide-y divide-slate-100">
                {EWALLET_OPTIONS.map((opt) => {
                  const active = pickerDraft === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPickerDraft(opt.value)}
                      className={`w-full py-3.5 text-center transition-colors flex items-center justify-center gap-2 ${
                        active
                          ? 'bg-cyan-50/70 text-slate-900 font-black text-base'
                          : 'text-slate-400 font-semibold text-sm hover:text-slate-700'
                      }`}
                    >
                      <EWalletBrandBadge type={opt.value} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== MAIN VIEW: WITHDRAW ====================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 h-14 bg-white border-b border-slate-100 px-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goBack('account')}
          aria-label="Back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-800 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-slate-900 whitespace-nowrap">Withdraw</h1>
        <button
          type="button"
          onClick={scrollToHistory}
          className="text-xs font-bold text-cyan-700 hover:text-cyan-800 whitespace-nowrap px-1.5 py-2"
        >
          Withdrawal history
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Available Balance Card (Cyan-Teal Deshi Win Signature) */}
        <div className="bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs text-cyan-100 font-semibold">
            <span className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center">
              <WalletIcon className="w-3.5 h-3.5 text-cyan-200" />
            </span>
            <span>Available balance</span>
          </div>

          <div className="mt-2 flex items-center gap-2.5">
            <div className="text-3xl font-black tracking-tight tabular-nums">
              ৳{totalBalance.toFixed(2)}
            </div>
            <button
              type="button"
              onClick={handleRefreshBalance}
              aria-label="Refresh balance"
              className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {lockedAmt > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 bg-black/25 rounded-xl px-3 py-2 border border-amber-300/30 text-[11px] tabular-nums">
              <div>
                <div className="text-cyan-200/80 text-[10px] font-bold">Withdrawable</div>
                <div className="font-black text-white">৳{withdrawableAmt.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-amber-300 text-[10px] font-bold flex items-center justify-end gap-1">
                  <Lock className="w-3 h-3" />
                  <span>On Hold (Blocked)</span>
                </div>
                <div className="font-black text-amber-200">৳{lockedAmt.toFixed(2)}</div>
              </div>
            </div>
          )}

          <div className="mt-3 flex justify-end text-white/40 tracking-[0.25em] text-xs font-bold select-none">
            •••• &nbsp; ••••
          </div>
        </div>

        {/* Method Selector Cards: E-Wallet & USDT */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setMethodTab('ewallet');
              setBdtInput('');
              setUsdtInput('');
            }}
            className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border transition-all min-h-[92px] active:scale-98 ${
              methodTab === 'ewallet'
                ? 'bg-gradient-to-br from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white border-cyan-500 shadow-md'
                : 'bg-white text-slate-800 border-slate-200 hover:border-cyan-300'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                methodTab === 'ewallet' ? 'bg-white/20 text-white' : 'bg-cyan-50 text-cyan-700'
              }`}
            >
              <WalletIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-black tracking-wide">E-Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethodTab('usdt');
              setBdtInput('');
              setUsdtInput('');
            }}
            className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border transition-all min-h-[92px] active:scale-98 ${
              methodTab === 'usdt'
                ? 'bg-gradient-to-br from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white border-cyan-500 shadow-md'
                : 'bg-white text-slate-800 border-slate-200 hover:border-cyan-300'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                methodTab === 'usdt' ? 'bg-white/20' : 'bg-emerald-50'
              }`}
            >
              <TetherSvgIcon className="w-7 h-7" />
            </div>
            <span className="text-xs font-black tracking-wide">USDT</span>
          </button>
        </div>

        {/* E-WALLET FLOW */}
        {methodTab === 'ewallet' ? (
          <div className="space-y-3">
            {/* Bound E-Wallet Summary / Add Card */}
            {selectedWallet ? (
              <button
                type="button"
                onClick={() => setView('methods')}
                className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between text-left hover:border-cyan-400 transition-colors active:scale-[0.99]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <EWalletBrandBadge type={selectedWallet.type} />
                    <span className="font-black text-sm text-slate-900 uppercase">
                      {selectedWallet.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                    {maskAccountNumber(selectedWallet.number)}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setView('methods')}
                className="w-full bg-white rounded-2xl p-5 border-2 border-dashed border-cyan-300 flex flex-col items-center justify-center gap-1.5 hover:bg-cyan-50/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg border border-dashed border-cyan-400 flex items-center justify-center text-cyan-600">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-600">Add</span>
              </button>
            )}

            {/* E-Wallet Amount Input Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 flex items-center gap-3 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500">
                <span className="text-lg font-black text-cyan-600 select-none">৳</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={bdtInput}
                  onChange={(e) => handleBdtChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-sm font-black text-slate-900 focus:outline-none tabular-nums"
                />
              </div>

              {inlineError && (
                <div className="text-xs font-bold text-rose-600 px-1">{inlineError}</div>
              )}

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-cyan-700 font-semibold tabular-nums">
                  Withdrawable balance ৳{withdrawableAmt.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={handleAllClick}
                  className="px-4 py-1 rounded-md border border-cyan-500 text-cyan-700 font-bold text-xs hover:bg-cyan-50 active:scale-95 transition-all"
                >
                  All
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Withdrawal amount received</span>
                <span className="font-black text-cyan-700 tabular-nums">
                  ৳{(parsedBdt > 0 ? parsedBdt : 0).toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleWithdrawSubmit}
                className={`w-full h-11 rounded-full font-black text-sm transition-all ${
                  canSubmit
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-md hover:brightness-105 active:scale-[0.99]'
                    : 'bg-slate-300 text-white cursor-pointer'
                }`}
              >
                {withdrawDisabled ? 'Withdraw Paused' : 'Withdraw'}
              </button>
            </div>
          </div>
        ) : (
          /* USDT FLOW */
          <div className="space-y-3">
            {/* Add / View USDT Address Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setUsdtAddrDraft(user.boundUsdt || '');
                  setUsdtNetDraft(user.usdtNetwork || 'TRC20');
                  setShowUsdtModal(true);
                }}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900">
                    {user.boundUsdt ? `USDT (${user.usdtNetwork || 'TRC20'})` : 'Add USDT address'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                    {user.boundUsdt ? maskUsdtAddress(user.boundUsdt) : 'Tap here to bind your TRC20 / BEP20 address'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('customer-service');
                  window.location.hash = '#/customer-service';
                }}
                className="text-[11px] font-bold text-cyan-700 hover:underline whitespace-nowrap flex-shrink-0"
              >
                Customer service
              </button>
            </div>

            {/* Select amount of USDT Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <TetherSvgIcon className="w-6 h-6" />
                <span className="text-sm font-black text-slate-900">Select amount of USDT</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-cyan-500">
                <span className="text-base font-black text-cyan-600 select-none">৳</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={bdtInput}
                  onChange={(e) => handleBdtChange(e.target.value)}
                  placeholder="Please enter withdrawal amount"
                  className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none tabular-nums"
                />
              </div>

              {inlineError && (
                <div className="text-xs font-bold text-rose-600 px-1">{inlineError}</div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-cyan-500">
                <TetherSvgIcon className="w-5 h-5 flex-shrink-0" />
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={usdtInput}
                  onChange={(e) => handleUsdtChange(e.target.value)}
                  placeholder="Please enter USDT amount"
                  className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none tabular-nums"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-cyan-700 font-semibold tabular-nums">
                  Withdrawable balance ৳{withdrawableAmt.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={handleAllClick}
                  className="px-4 py-1 rounded-md border border-cyan-500 text-cyan-700 font-bold text-xs hover:bg-cyan-50 active:scale-95 transition-all"
                >
                  All
                </button>
              </div>

              <button
                type="button"
                onClick={handleWithdrawSubmit}
                className={`w-full h-11 rounded-full font-black text-sm transition-all ${
                  canSubmit
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-md hover:brightness-105 active:scale-[0.99]'
                    : 'bg-slate-300 text-white cursor-pointer'
                }`}
              >
                {withdrawDisabled ? 'Withdraw Paused' : 'Withdraw'}
              </button>
            </div>
          </div>
        )}

        {/* Rules / Conditions Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-cyan-600 text-[10px] mt-1">◆</span>
            <span>
              Need to bet{' '}
              <strong className="text-cyan-700 tabular-nums">৳{remainingTurnover.toFixed(2)}</strong> to be able to
              withdraw
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-600 text-[10px] mt-1">◆</span>
            <span>
              Withdraw time <strong className="text-cyan-700">00:00-23:55</strong>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-600 text-[10px] mt-1">◆</span>
            <span>
              Today Remaining Withdrawal Times{' '}
              <strong className="text-cyan-700 tabular-nums">{remainingDailyTimes}</strong>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-600 text-[10px] mt-1">◆</span>
            <span>
              Withdrawal amount range{' '}
              <strong className="text-cyan-700 tabular-nums">
                ৳{rangeMin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}-৳
                {rangeMax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
          {methodTab === 'usdt' && (
            <>
              <div className="flex items-start gap-2">
                <span className="text-cyan-600 text-[10px] mt-1">◆</span>
                <span>
                  After withdraw, you need to confirm the blockchain main network 3 times before it arrives at your
                  account.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-600 text-[10px] mt-1">◆</span>
                <span>
                  Please confirm that the operating environment is safe to avoid information being tampered with or
                  leaked.
                </span>
              </div>
            </>
          )}
          <div className="flex items-start gap-2">
            <span className="text-cyan-600 text-[10px] mt-1">◆</span>
            <span>
              Please check your registered bank information again before making a withdrawal. If your registered bank
              information is incorrect, our company will not be responsible for any losses you may incur.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-600 text-[10px] mt-1">◆</span>
            <span>If your registered bank information is incorrect, please contact customer service.</span>
          </div>
        </div>

        {/* Inline Withdrawal History Section */}
        <div id="withdrawal-history-section" className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-600" />
              <h2 className="text-base font-black text-slate-900">Withdrawal history</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {myWithdraws.length} records
            </span>
          </div>

          {myWithdraws.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs font-semibold text-slate-400">
              No withdrawal history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {myWithdraws.map((w) => {
                const statusLabel =
                  w.status === 'completed'
                    ? 'Completed'
                    : w.status === 'rejected'
                    ? 'Rejected'
                    : w.status === 'processing'
                    ? 'Processing'
                    : 'Pending';
                const statusColor =
                  w.status === 'completed'
                    ? 'text-emerald-600'
                    : w.status === 'rejected'
                    ? 'text-rose-600'
                    : w.status === 'processing'
                    ? 'text-cyan-600'
                    : 'text-amber-600';
                const orderRef = w.orderId || w.id;
                const typeDisplay =
                  w.method === 'USDT' ? `USDT (${w.network || 'TRC20'})` : `E-Wallet · ${w.method}`;
                return (
                  <div
                    key={w.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="px-3 py-1 rounded-md bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs">
                        Withdraw
                      </span>
                      <span className={`font-black text-xs ${statusColor}`}>{statusLabel}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Balance</span>
                      <span className="font-black text-cyan-700 tabular-nums">
                        ৳{Number(w.amount || 0).toFixed(2)}
                        {w.usdAmount ? ` (${Number(w.usdAmount).toFixed(2)} USDT)` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Type</span>
                      <span className="font-bold text-slate-800">{typeDisplay}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Account</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {w.method === 'USDT' ? maskUsdtAddress(w.number) : maskAccountNumber(w.number)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Time</span>
                      <span className="text-slate-600 tabular-nums">{w.time}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 flex-shrink-0">Order number</span>
                      <button
                        type="button"
                        onClick={() => copyText(orderRef, 'Order number')}
                        className="inline-flex items-center gap-1.5 font-mono text-slate-700 hover:text-cyan-700 truncate"
                      >
                        <span className="truncate">{orderRef}</span>
                        <Copy className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      </button>
                    </div>

                    {w.status === 'rejected' && (w.userMessage || w.adminNote || w.rejectionReason) && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                        {w.userMessage || w.rejectionReason || w.adminNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit USDT Address Modal */}
      {showUsdtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TetherSvgIcon className="w-6 h-6" />
                <h3 className="font-black text-base text-slate-900">USDT Address</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUsdtModal(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUsdtAddress} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['TRC20', 'BEP20', 'ERC20'] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setUsdtNetDraft(net)}
                      className={`py-2 rounded-xl font-black border transition-all ${
                        usdtNetDraft === net
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={usdtAddrDraft}
                  onChange={(e) => setUsdtAddrDraft(e.target.value.trim())}
                  placeholder="Enter your USDT wallet address"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUsdtModal(false)}
                  className="py-2.5 rounded-full bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUsdt}
                  className="py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black shadow-md disabled:opacity-60"
                >
                  {isSavingUsdt ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
