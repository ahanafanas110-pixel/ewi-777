import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import {
  RefreshCw,
  Shield,
  Clock,
  ChevronRight,
  Lock,
  Smartphone,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { BkashLogo, NagadLogo } from '../components/PaymentLogos';
import { getTranslation } from '../utils/i18n';
import { PinkSafePlateLogo } from '../components/BrandLogos';
import {
  DepositPastelIcon,
  WithdrawPastelIcon,
  DepositHistoryGridIcon,
  WithdrawHistoryGridIcon
} from '../components/AccountIcons';

export const Wallet: React.FC = () => {
  const {
    user,
    transactions,
    withdraw,
    bindWallet,
    setActiveTab,
    setHistoryFilterTab,
    language,
    showToast,
    adminSettings,
  } = useApp();

  const minWithdraw = adminSettings.minWithdraw || 100;
  const withdrawDisabled = adminSettings.withdrawEnabled === false;

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>(String(Math.max(500, minWithdraw)));
  const [withdrawMethod, setWithdrawMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');

  // Wallet binding modal
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindType, setBindType] = useState<'bKash' | 'Nagad'>('bKash');
  const [bindNumberInput, setBindNumberInput] = useState('');
  const [bindPassword, setBindPassword] = useState('');
  const [bindError, setBindError] = useState<string | null>(null);
  const [isBinding, setIsBinding] = useState(false);

  const remainingTurnover = Math.max(0, (user?.turnoverRequired || 0) - (user?.turnoverCompleted || 0));

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    const res = withdraw(amt, withdrawMethod, loginPasswordInput);
    if (res.success) {
      setShowWithdrawModal(false);
      setLoginPasswordInput('');
    } else {
      showToast(res.message);
    }
  };

  const handleBindSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBinding) return;
    setBindError(null);
    setIsBinding(true);
    try {
      const res = await bindWallet(bindType, bindNumberInput, bindPassword);
      if (res.success) {
        setShowBindModal(false);
        setBindNumberInput('');
        setBindPassword('');
        setBindError(null);
      } else {
        setBindError(res.message);
        showToast(res.message);
      }
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      <Header title={getTranslation(language, 'wallet')} showBack={false} />

      <div className="p-4 space-y-4">
        {/* Pink Gradient Wallet Card */}
        <div className="bg-gradient-to-r from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-pink-100 font-semibold mb-1">
            <span>{getTranslation(language, 'totalBalance')}</span>
            <button
              onClick={() => showToast('Balance updated')}
              className="p-1 rounded-full bg-white/20 hover:bg-white/30 active:rotate-180 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-3xl font-black tracking-tight mb-4">
            ৳{(user?.balance || 0).toFixed(2)}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="py-3 rounded-full bg-white text-[#FF2A7A] font-black text-xs shadow-sm hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <DepositPastelIcon size={18} />
              <span>{getTranslation(language, 'deposit')}</span>
            </button>

            <button
              onClick={() => setShowWithdrawModal(true)}
              className="py-3 rounded-full bg-white/20 text-white font-black text-xs shadow-sm hover:bg-white/30 active:scale-98 transition-all flex items-center justify-center gap-1.5 backdrop-blur-xs"
            >
              <WithdrawPastelIcon size={18} />
              <span>{getTranslation(language, 'withdraw')}</span>
            </button>
          </div>
        </div>

        {/* Turnover Requirement Status Box */}
        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800">Turnover Requirement</span>
            <span
              className={`font-black text-xs ${
                remainingTurnover === 0 ? 'text-green-600' : 'text-[#FF2A7A]'
              }`}
            >
              {remainingTurnover === 0
                ? 'Completed (Withdraw Available)'
                : `Need ৳${remainingTurnover.toFixed(2)} more`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-pink-100/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FF2A7A] to-[#FF758F] h-full rounded-full transition-all"
              style={{
                width: `${
                  !user?.turnoverRequired || user.turnoverRequired === 0
                    ? 100
                    : Math.min(100, ((user?.turnoverCompleted || 0) / user.turnoverRequired) * 100)
                }%`
              }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Completed: ৳{(user?.turnoverCompleted || 0).toFixed(2)}</span>
            <span>Target: ৳{(user?.turnoverRequired || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Bound Wallet Numbers Card (Add bKash & Nagad Accounts) */}
        {/* "ar ekhane Bkash Nagad add korar system diba iccha moto add korte parbe tobe age zodi oi number ei site e add kora hoye thake tahole parbe na abar add korte ekta number 1 bar e add korte parbe." */}
        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#FF2A7A]" />
              <span>Withdrawal Accounts (bKash / Nagad)</span>
            </h3>
            <button
              onClick={() => setShowBindModal(true)}
              className="text-[11px] font-bold text-white bg-[#FF2A7A] hover:bg-pink-600 px-3 py-1 rounded-full shadow-2xs active:scale-95 transition-all flex items-center gap-1"
            >
              <span>+ Add Account</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            Security Rule: You can add bKash or Nagad accounts freely, but each number can only ever be registered <strong>once</strong> across the platform.
          </p>

          {/* Wallets List */}
          <div className="space-y-2">
            {(user.boundWallets && user.boundWallets.length > 0) ? (
              user.boundWallets.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {w.type === 'bKash' ? (
                      <BkashLogo size="sm" showText={true} />
                    ) : (
                      <NagadLogo size="sm" showText={true} />
                    )}
                    <div>
                      <div className="font-mono text-xs font-black text-slate-800 tracking-wide">
                        {w.number}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        Added: {w.addedAt}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Verified
                  </span>
                </div>
              ))
            ) : (user.boundBkash || user.boundNagad) ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {user.boundBkash && (
                  <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1">
                    <BkashLogo size="sm" showText={true} />
                    <div className="font-mono text-xs font-black text-slate-800">
                      {user.boundBkash}
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold block">Verified</span>
                  </div>
                )}
                {user.boundNagad && (
                  <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1">
                    <NagadLogo size="sm" showText={true} />
                    <div className="font-mono text-xs font-black text-slate-800">
                      {user.boundNagad}
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold block">Verified</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => setShowBindModal(true)}
                className="p-4 rounded-2xl border-2 border-dashed border-pink-200 text-center cursor-pointer hover:bg-pink-50/50 transition-all"
              >
                <div className="text-xs font-extrabold text-slate-600">No account linked yet</div>
                <div className="text-[10px] text-pink-500 font-medium mt-0.5">
                  Click here to link your official bKash or Nagad number
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Safe Vault Banner */}
        <div
          onClick={() => {
            setActiveTab('safe');
            window.location.hash = '#/safe';
          }}
          className="bg-white rounded-3xl p-4 border border-pink-100 shadow-xs flex items-center justify-between cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-pink-50 flex items-center justify-center shadow-xs">
              <PinkSafePlateLogo size={36} />
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <span>Financial Safe Vault</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-100 text-[#FF2A7A] font-bold">
                  0.006% Rate
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Balance: ৳{(user?.safeBalance || 0).toFixed(2)}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Deposit History & Withdraw History 2-Card Row */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setHistoryFilterTab('deposit');
              setActiveTab('transaction-history');
              window.location.hash = '#/transaction-history';
            }}
            className="bg-white rounded-2xl p-3.5 border border-pink-100 shadow-xs flex items-center gap-3 text-left active:scale-98 transition-all"
          >
            <DepositHistoryGridIcon size={36} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-800 truncate">Deposit History</div>
              <div className="text-[10px] text-slate-400 truncate">All bKash / Nagad</div>
            </div>
          </button>
          <button
            onClick={() => {
              setHistoryFilterTab('withdraw');
              setActiveTab('transaction-history');
              window.location.hash = '#/transaction-history';
            }}
            className="bg-white rounded-2xl p-3.5 border border-pink-100 shadow-xs flex items-center gap-3 text-left active:scale-98 transition-all"
          >
            <WithdrawHistoryGridIcon size={36} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-800 truncate">Withdraw History</div>
              <div className="text-[10px] text-slate-400 truncate">Payout tracking</div>
            </div>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Transactions</span>
            </h3>
            <button
              onClick={() => {
                setHistoryFilterTab('all');
                setActiveTab('transaction-history');
                window.location.hash = '#/transaction-history';
              }}
              className="text-[11px] text-[#FF2A7A] font-bold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {transactions.filter((tx) => tx.userId === user.id).slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800">{tx.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{tx.time}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-black ${
                      tx.amount > 0 ? 'text-green-600' : 'text-[#FF2A7A]'
                    }`}
                  >
                    {tx.amount > 0 ? `+৳${tx.amount.toFixed(2)}` : `-৳${Math.abs(tx.amount).toFixed(2)}`}
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Withdraw Modal with Login Password and Bound Check */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-black text-base text-slate-800">Withdraw Funds</h3>

            {/* Withdraw System Disabled Warning */}
            {withdrawDisabled && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>System Paused:</strong> Withdrawals are currently paused by the administrator.
                </div>
              </div>
            )}

            {/* Turnover Check Warning */}
            {remainingTurnover > 0 && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Turnover Warning:</strong> You must complete ৳{remainingTurnover.toFixed(2)} more turnover in games/binary before withdrawing.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWithdrawMethod('bKash')}
                className={`p-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-between ${
                  withdrawMethod === 'bKash'
                    ? 'bg-pink-50 border-[#E2136E] text-[#E2136E] ring-1 ring-[#E2136E]/30'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-pink-50/30'
                }`}
              >
                <BkashLogo size="sm" showText={true} />
                <span className="text-[10px] text-slate-400 font-mono">
                  {user.boundBkash ? user.boundBkash.slice(-4) : 'Unset'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setWithdrawMethod('Nagad')}
                className={`p-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-between ${
                  withdrawMethod === 'Nagad'
                    ? 'bg-orange-50 border-[#F7931E] text-[#F7931E] ring-1 ring-[#F7931E]/30'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-orange-50/30'
                }`}
              >
                <NagadLogo size="sm" showText={true} />
                <span className="text-[10px] text-slate-400 font-mono">
                  {user.boundNagad ? user.boundNagad.slice(-4) : 'Unset'}
                </span>
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Withdraw Amount (৳)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min={minWithdraw}
                  max={user.balance}
                  className="w-full bg-[#FFF8FA] border border-pink-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  required
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Available: ৳{user.balance.toFixed(2)}</span>
                  <span>Min: ৳{minWithdraw}</span>
                </div>
              </div>

              {/* Login Password Input Required */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#FF2A7A]" />
                  <span>Enter Login Password (Security Verification)</span>
                </label>
                <input
                  type="password"
                  value={loginPasswordInput}
                  onChange={(e) => setLoginPasswordInput(e.target.value)}
                  placeholder="Enter your account login password"
                  className="w-full bg-[#FFF8FA] border border-pink-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="py-2.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={remainingTurnover > 0 || withdrawDisabled}
                  className="py-2.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {withdrawDisabled ? 'Paused' : 'Confirm Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Binding Modal (1 Time Only Per ID) */}
      {showBindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-black text-base text-slate-800">
              Link bKash / Nagad Wallet
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Platform rule: You can link accounts as desired, but each number can only ever be added <strong>once</strong> across the entire site. If this number was previously registered by any account, it will not be accepted.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBindType('bKash')}
                className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-center ${
                  bindType === 'bKash'
                    ? 'bg-pink-50 border-[#E2136E] ring-1 ring-[#E2136E]/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <BkashLogo size="sm" showText={true} />
              </button>
              <button
                type="button"
                onClick={() => setBindType('Nagad')}
                className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-center ${
                  bindType === 'Nagad'
                    ? 'bg-orange-50 border-[#F7931E] ring-1 ring-[#F7931E]/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <NagadLogo size="sm" showText={true} />
              </button>
            </div>

            <form onSubmit={handleBindSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  11-Digit {bindType} Number
                </label>
                <input
                  type="tel"
                  value={bindNumberInput}
                  onChange={(e) => {
                    setBindNumberInput(e.target.value);
                    if (bindError) setBindError(null);
                  }}
                  placeholder="017xxxxxxxx"
                  className="w-full bg-[#FFF8FA] border border-pink-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#FF2A7A]" />
                  <span>Account Login Password</span>
                </label>
                <input
                  type="password"
                  value={bindPassword}
                  onChange={(e) => {
                    setBindPassword(e.target.value);
                    if (bindError) setBindError(null);
                  }}
                  placeholder="Enter your registration/login password"
                  className="w-full bg-[#FFF8FA] border border-pink-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  required
                />
              </div>

              {bindError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{bindError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBindModal(false);
                    setBindError(null);
                    setBindPassword('');
                  }}
                  className="py-2.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBinding}
                  className="py-2.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-extrabold text-xs shadow-md disabled:opacity-60"
                >
                  {isBinding ? 'Verifying...' : 'Bind Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
