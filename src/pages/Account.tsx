import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Copy,
  RefreshCw,
  LogOut,
  ChevronRight,
  User as UserIcon,
  Camera
} from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { PinkSafePlateLogo, CustomerServiceLogo } from '../components/BrandLogos';
import { compressImageFileToDataUrl } from '../utils/imageCompress';
import {
  WalletPastelIcon,
  DepositPastelIcon,
  WithdrawPastelIcon,
  VipPastelIcon,
  GameHistoryGridIcon,
  TransactionGridIcon,
  DepositHistoryGridIcon,
  WithdrawHistoryGridIcon,
  NotificationRowIcon,
  GiftsRowIcon,
  StatsRowIcon,
  LanguageRowIcon,
  SalaryRowIcon,
  NicknameRowIcon,
  PasswordRowIcon
} from '../components/AccountIcons';

interface AccountProps {
  onOpenLanguage?: () => void;
}

export const Account: React.FC<AccountProps> = () => {
  const {
    user,
    logout,
    updateUserAvatar,
    setActiveTab,
    setHistoryFilterTab,
    unreadNotificationsCount,
    setIsNotificationOpen,
    markNotificationsRead,
    language,
    showToast,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const copyUid = () => {
    navigator.clipboard?.writeText(user.uid).catch(() => {});
    showToast('Copy successful');
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size should be under 10MB');
      return;
    }
    try {
      const compressed = await compressImageFileToDataUrl(file, 320, 0.82);
      updateUserAvatar(compressed);
    } catch {
      showToast('Failed to process image');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      {/* Top Profile Header (Luxury Gold) */}
      <div className="bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] px-4 pt-4 pb-12 rounded-b-[2rem] text-white shadow-md">
        <div className="flex items-center gap-3.5 mb-2">
          {/* Avatar with custom upload system - no predefined photo */}
          <div
            className="relative cursor-pointer select-none group"
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload profile photo"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.nickname}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/80 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xs border-2 border-white/80 shadow-md flex items-center justify-center text-white">
                <UserIcon className="w-8 h-8 opacity-90" />
              </div>
            )}
            {/* Camera badge overlay */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-[#B45309] flex items-center justify-center shadow-md border border-amber-200 hover:scale-110 active:scale-95 transition-transform">
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wide uppercase">
                {user.nickname || user.phone || user.uid || 'MEMBER'}
              </span>
              <button
                onClick={() => {
                  setActiveTab('vip');
                  window.location.hash = '#/vip';
                }}
                className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-black text-[10px] tracking-wide shadow-xs active:scale-95"
              >
                VIP{user.vipLevel}
              </button>
            </div>

            {/* UID with copy button */}
            <div className="flex items-center gap-1.5 text-xs text-white/90 mt-1">
              <span>UID | {user.uid || 'N/A'}</span>
              {user.uid && (
                <button onClick={copyUid} className="p-0.5 hover:text-yellow-200 active:scale-90">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Upload photo helper link */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-yellow-200 hover:underline flex items-center gap-1 font-bold mt-0.5"
            >
              <Camera className="w-3 h-3" />
              <span>{user.avatar ? 'Change Photo' : 'Upload Profile Photo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Account White Card */}
      <div className="px-4 -mt-8 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>{getTranslation(language, 'totalBalance')}</span>
            <button
              onClick={() => showToast('Balance refreshed')}
              className="text-slate-400 hover:text-[#D97706] active:rotate-180 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-3xl font-black text-slate-900 tracking-tight mb-5">
            ৳{user.balance.toFixed(2)}
          </div>

          {/* Quick 4 icons (Wallet, Deposit, Withdraw, VIP) */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-amber-100">
            <button
              onClick={() => {
                setActiveTab('wallet');
                window.location.hash = '#/wallet';
              }}
              className="flex flex-col items-center gap-1.5 py-2 hover:bg-amber-50/60 rounded-2xl active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                <WalletPastelIcon size={44} />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {getTranslation(language, 'wallet')}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="flex flex-col items-center gap-1.5 py-2 hover:bg-orange-50/50 rounded-2xl active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                <DepositPastelIcon size={44} />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {getTranslation(language, 'deposit')}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('wallet');
                window.location.hash = '#/wallet';
              }}
              className="flex flex-col items-center gap-1.5 py-2 hover:bg-blue-50/50 rounded-2xl active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                <WithdrawPastelIcon size={44} />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {getTranslation(language, 'withdraw')}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('vip');
                window.location.hash = '#/vip';
              }}
              className="flex flex-col items-center gap-1.5 py-2 hover:bg-emerald-50/50 rounded-2xl active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                <VipPastelIcon size={44} />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {getTranslation(language, 'vip')}
              </span>
            </button>
          </div>
        </div>

        {/* Safe Vault Card (from frame_150.png) */}
        <div
          onClick={() => {
            setActiveTab('safe');
            window.location.hash = '#/safe';
          }}
          className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shadow-xs">
              <PinkSafePlateLogo size={36} />
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                <span>Safe</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  ৳{user.safeBalance.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Half-hour interest rate 0.006%, earnings calculated once every 30 minutes
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </div>

        {/* Game, Transaction, Deposit & Withdraw 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setActiveTab('wingo');
              window.location.hash = '#/wingo';
            }}
            className="bg-white rounded-2xl p-3.5 shadow-xs border border-amber-200/80 flex items-center gap-3 text-left active:scale-98 transition-all"
          >
            <GameHistoryGridIcon size={38} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-800 truncate">
                {getTranslation(language, 'gameHistory')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">My game history</div>
            </div>
          </button>

          <button
            onClick={() => {
              setHistoryFilterTab('all');
              setActiveTab('transaction-history');
              window.location.hash = '#/transaction-history';
            }}
            className="bg-white rounded-2xl p-3.5 shadow-xs border border-amber-200/80 flex items-center gap-3 text-left active:scale-98 transition-all"
          >
            <TransactionGridIcon size={38} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-800 truncate">
                {getTranslation(language, 'transactionHistory')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">My transaction history</div>
            </div>
          </button>

          <button
            onClick={() => {
              setHistoryFilterTab('deposit');
              setActiveTab('transaction-history');
              window.location.hash = '#/transaction-history';
            }}
            className="bg-white rounded-2xl p-3.5 shadow-xs border border-amber-200/80 flex items-center gap-3 text-left active:scale-98 transition-all"
          >
            <DepositHistoryGridIcon size={38} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-800 truncate">
                {getTranslation(language, 'deposit')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">My deposit history</div>
            </div>
          </button>

          <button
            onClick={() => {
              setHistoryFilterTab('withdraw');
              setActiveTab('transaction-history');
              window.location.hash = '#/transaction-history';
            }}
            className="bg-white rounded-2xl p-3.5 shadow-xs border border-amber-200/80 flex items-center gap-3 text-left active:scale-98 transition-all"
          >
            <WithdrawHistoryGridIcon size={38} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-800 truncate">
                {getTranslation(language, 'withdraw')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">My withdraw history</div>
            </div>
          </button>
        </div>

        {/* Settings Center & Account Security */}
        <div className="bg-white rounded-3xl p-2 shadow-xs border border-amber-200/80 divide-y divide-amber-50">
          {/* Notification */}
          <button
            onClick={() => {
              markNotificationsRead();
              setIsNotificationOpen(true);
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/40 rounded-2xl active:scale-99 transition-colors"
          >
            <div className="flex items-center gap-3">
              <NotificationRowIcon size={32} />
              <span className="text-xs font-bold text-slate-700">Notification</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              {unreadNotificationsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF4D4F] text-white text-[10px] font-black leading-none">
                  {unreadNotificationsCount}
                </span>
              )}
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Gifts */}
          <button
            onClick={() => {
              setActiveTab('gifts');
              window.location.hash = '#/gifts';
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/40 rounded-2xl active:scale-99 transition-colors"
          >
            <div className="flex items-center gap-3">
              <GiftsRowIcon size={32} />
              <span className="text-xs font-bold text-slate-700">Gifts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Game statistics */}
          <button
            onClick={() => {
              setActiveTab('wingo');
              window.location.hash = '#/wingo';
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/40 rounded-2xl active:scale-99 transition-colors"
          >
            <div className="flex items-center gap-3">
              <StatsRowIcon size={32} />
              <span className="text-xs font-bold text-slate-700">Game statistics</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Language Selection */}
          <button
            onClick={() => {
              setActiveTab('language');
              window.location.hash = '#/language';
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/40 rounded-2xl active:scale-99 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LanguageRowIcon size={32} />
              <span className="text-xs font-bold text-slate-700">
                {getTranslation(language, 'language')}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-xs font-semibold text-slate-600">
                {language === 'en' ? 'English' : 'বাংলা'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Agent Daily Salary */}
          <button
            onClick={() => {
              setActiveTab('salary');
              window.location.hash = '#/salary';
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/40 rounded-2xl active:scale-99 transition-colors"
          >
            <div className="flex items-center gap-3">
              <SalaryRowIcon size={32} />
              <span className="text-xs font-bold text-slate-700">Agent Daily Salary</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-[11px] font-bold text-[#D97706]">Up to ৳100,000</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Change Nickname */}
          <button
            onClick={() => {
              setActiveTab('change-nickname');
              window.location.hash = '#/change-nickname';
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/40 rounded-2xl active:scale-99 transition-colors"
          >
            <div className="flex items-center gap-3">
              <NicknameRowIcon size={32} />
              <span className="text-xs font-bold text-slate-700">
                {getTranslation(language, 'changeNickname')}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-xs font-semibold text-slate-600">{user.nickname}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Change Login Password */}
          <button
            onClick={() => {
              setActiveTab('change-login-password');
              window.location.hash = '#/change-login-password';
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/40 rounded-2xl active:scale-99 transition-colors"
          >
            <div className="flex items-center gap-3">
              <PasswordRowIcon size={32} />
              <span className="text-xs font-bold text-slate-700">
                {getTranslation(language, 'changePasswordHeader')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Customer Service */}
          <button
            onClick={() => {
              setActiveTab('customer-service');
              window.location.hash = '#/customer-service';
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/40 rounded-2xl active:scale-99 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CustomerServiceLogo size={32} />
              <span className="text-xs font-bold text-slate-700">
                {getTranslation(language, 'customerService')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Log Out Button */}
        <button
          onClick={logout}
          className="w-full py-3.5 rounded-full border border-amber-300 text-[#B45309] bg-white font-extrabold text-xs shadow-xs hover:bg-amber-50 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{getTranslation(language, 'logout')}</span>
        </button>
      </div>
    </div>
  );
};
