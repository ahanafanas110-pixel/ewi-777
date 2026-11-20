import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import {
  RefreshCw,
  Clock,
  ChevronRight,
  Lock,
  Smartphone,
  AlertTriangle
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
import { isValidBdFullPhone } from '../utils/phoneAndApi';

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

  const minWithdraw = Math.max(300, adminSettings.minWithdraw || 300);
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
    if (isNaN(amt) || amt < minWithdraw) {
      showToast(`Minimum withdrawal amount is ৳${minWithdraw}`);
      return;
    }
    if (amt > 50000) {
      showToast('Maximum withdrawal amount is ৳50,000');
      return;
    }
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

    const digits = bindNumberInput.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? digits.slice(0, 11) : `0${digits}`.slice(0, 11);
    if (!isValidBdFullPhone(normalized)) {
      const msg = 'Please enter a valid 11-digit mobile number';
      setBindError(msg);
      showToast(msg);
      return;
    }

    setIsBinding(true);
    try {
      const res = await bindWallet(bindType, normalized, bindPassword);
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Header title={getTranslation(language, 'wallet')} showBack={false} />

      <div className="p-4 space-y-4">
        <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-cyan-100 font-semibold mb-1">
            <span>{getTranslation(language, 'totalBalance')}</span>
            <button
              type="button"
              onClick={() => showToast('Balance updated')}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 active:rotate-180 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-3xl font-black tracking-tight mb-3 tabular-nums">
            ৳{(user?.balance || 0).toFixed(2)}
          </div>

          {(user?.lockedBalance || 0) > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3 bg-black/20 rounded-2xl px-3 py-2 border border-white/15 text-[11px] tabular-nums">
              <div>
                <div className="text-cyan-200/80 text-[10px] font-bold">Withdrawable</div>
                <div className="font-black text-white">
                  ৳{Math.max(0, (user?.balance || 0) - (user?.lockedBalance || 0)).toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-cyan-200/80 text-[10px] font-bold flex items-center justify-end gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked Bonus</span>
                </div>
                <div className="font-black text-cyan-200">
                  ৳{(user?.lockedBalance || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="py-3 min-h-[44px] rounded-full bg-white text-slate-900 font-black text-xs shadow-sm hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <DepositPastelIcon size={18} />
              <span>{getTranslation(language, 'deposit')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="py-3 min-h-[44px] rounded-full bg-white/20 text-white font-black text-xs shadow-sm hover:bg-white/30 active:scale-98 transition-all flex items-center justify-center gap-1.5 backdrop-blur-xs"
            >
              <WithdrawPastelIcon size={18} />
              <span>{getTranslation(language, 'withdraw')}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800">Turnover Requirement</span>
            <span
              className={`font-black text-xs tabular-nums ${
                remainingTurnover === 0 ? 'text-emerald-600' : 'text-cyan-700'
              }`}
            >
              {remainingTurnover === 0
                ? 'Completed (Withdraw Available)'
                : `Need ৳${remainingTurnover.toFixed(2)} more`}
            </span>
          </div>

          <div className="w-full bg-cyan-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] h-full rounded-full transition-all"
              style={{
                width: `${
                  !user?.turnoverRequired || user.turnoverRequired === 0
                    ? 100
                    : Math.min(100, ((user?.turnoverCompleted || 0) / user.turnoverRequired) * 100)
                }%`
              }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
            <span>Completed: ৳{(user?.turnoverCompleted || 0).toFixed(2)}</span>
            <span>Target: ৳{(user?.turnoverRequired || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-cyan-600" />
              <span>Withdrawal Accounts (bKash / Nagad)</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowBindModal(true)}
              className="text-[11px] font-bold text-white bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] hover:brightness-105 px-3 py-1.5 rounded-full shadow-2xs active:scale-95 transition-all flex items-center gap-1"
            >
              <span>+ Add Account</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            Security Rule: You can add bKash or Nagad accounts freely, but each number can only ever be registered <strong>once</strong> across the platform.
          </p>

          <div className="space-y-2">
            {(user.boundWallets && user.boundWallets.length > 0) ? (
              user.boundWallets.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {w.type === 'bKash' ? (
                      <BkashLogo size="sm" showText={true} />
                    ) : (
                      <NagadLogo size="sm" showText={true} />
                    )}
                    <div>
                      <div className="font-mono text-xs font-black text-slate-900 tracking-wide">
                        {w.number}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        Added: {w.addedAt}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Verified
                  </span>
                </div>
              ))
            ) : (user.boundBkash || user.boundNagad) ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {user.boundBkash && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <BkashLogo size="sm" showText={true} />
                    <div className="font-mono text-xs font-black text-slate-900">
                      {user.boundBkash}
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold block">Verified</span>
                  </div>
                )}
                {user.boundNagad && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <NagadLogo size="sm" showText={true} />
                    <div className="font-mono text-xs font-black text-slate-900">
                      {user.boundNagad}
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold block">Verified</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => setShowBindModal(true)}
                className="p-4 rounded-2xl border-2 border-dashed border-slate-300 text-center cursor-pointer hover:bg-slate-50 transition-all"
              >
                <div className="text-xs font-extrabold text-slate-700">No account linked yet</div>
                <div className="text-[10px] text-cyan-700 font-medium mt-0.5">
                  Click here to link your official bKash or Nagad number
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('safe');
            window.location.hash = '#/safe';
          }}
          className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 flex items-center justify-center shadow-2xs">
              <PinkSafePlateLogo size={36} />
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <span>Financial Safe Vault</span>
                <span className="text-[10px] text-cyan-700 font-bold">
                  · 0.006% Rate
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                Balance: ৳{(user?.safeBalance || 0).toFixed(2)}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setHistoryFilterTab('deposit');
              setActiveTab('transaction-history');
              window.location.hash = '#/transaction-history';
            }}
            className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center gap-3 text-left active:scale-98 transition-all"
          >
            <DepositHistoryGridIcon size={36} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-900 truncate">Deposit History</div>
              <div className="text-[10px] text-slate-500 truncate">All bKash / Nagad</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setHistoryFilterTab('withdraw');
              setActiveTab('transaction-history');
              window.location.hash = '#/transaction-history';
            }}
            className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center gap-3 text-left active:scale-98 transition-all"
          >
            <WithdrawHistoryGridIcon size={36} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-900 truncate">Withdraw History</div>
              <div className="text-[10px] text-slate-500 truncate">Payout tracking</div>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Transactions</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setHistoryFilterTab('all');
                setActiveTab('transaction-history');
                window.location.hash = '#/transaction-history';
              }}
              className="text-[11px] text-cyan-700 font-bold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {transactions.filter((tx) => tx.userId === user.id).slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{tx.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{tx.time}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-black tabular-nums ${
                      tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.amount > 0 ? `+৳${tx.amount.toFixed(2)}` : `-৳${Math.abs(tx.amount).toFixed(2)}`}
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      tx.status === 'success'
                        ? 'text-emerald-600'
                        : tx.status === 'rejected'
                        ? 'text-rose-600'
                        : 'text-cyan-700'
                    }`}
                  >
                    {tx.status === 'success' ? 'Completed' : tx.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-black text-base text-slate-900">Withdraw Funds</h3>

            {withdrawDisabled && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>System Paused:</strong> Withdrawals are currently paused by the administrator.
                </div>
              </div>
            )}

            {remainingTurnover > 0 && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
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
                    ? 'bg-cyan-50 border-cyan-500 text-cyan-800 ring-1 ring-cyan-500/30'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                }`}
              >
                <BkashLogo size="sm" showText={true} />
                <span className="text-[10px] text-slate-500 font-mono">
                  {user.boundBkash ? user.boundBkash.slice(-4) : 'Unset'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setWithdrawMethod('Nagad')}
                className={`p-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-between ${
                  withdrawMethod === 'Nagad'
                    ? 'bg-cyan-50 border-cyan-500 text-cyan-800 ring-1 ring-cyan-500/30'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                }`}
              >
                <NagadLogo size="sm" showText={true} />
                <span className="text-[10px] text-slate-500 font-mono">
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
                  max={Math.min(50000, Math.max(0, (user.balance || 0) - (user.lockedBalance || 0)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 tabular-nums">
                  <span>
                    Withdrawable: ৳{Math.max(0, (user.balance || 0) - (user.lockedBalance || 0)).toFixed(2)}
                  </span>
                  <span>Min: ৳{minWithdraw} · Max: ৳50,000</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Enter Login Password (Security Verification)</span>
                </label>
                <input
                  type="password"
                  value={loginPasswordInput}
                  onChange={(e) => setLoginPasswordInput(e.target.value)}
                  placeholder="Enter your account login password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                  className="py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {withdrawDisabled ? 'Paused' : 'Confirm Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-black text-base text-slate-900">
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
                    ? 'bg-cyan-50 border-cyan-500 ring-1 ring-cyan-500/30'
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
                    ? 'bg-cyan-50 border-cyan-500 ring-1 ring-cyan-500/30'
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
                  inputMode="numeric"
                  maxLength={11}
                  value={bindNumberInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setBindNumberInput(digits);
                    if (bindError) setBindError(null);
                  }}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-cyan-600" />
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                  className="py-2.5 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-extrabold text-xs shadow-md disabled:opacity-60"
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
