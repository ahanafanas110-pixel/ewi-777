import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Copy,
  LogOut,
  ChevronRight,
  User as UserIcon,
  Camera,
  Bell,
  Headphones,
  Eye,
  EyeOff,
  Wallet as WalletIcon,
  CreditCard,
  ShieldCheck,
  Crown,
  Gift,
  CalendarCheck,
  BarChart2,
  Award,
  Globe,
  Coins,
  UserCog,
  KeyRound
} from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { compressImageFileToDataUrl } from '../utils/imageCompress';
import {
  GameHistoryGridIcon,
  TransactionGridIcon,
  DepositHistoryGridIcon,
  WithdrawHistoryGridIcon
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
    showToast
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [hideBalance, setHideBalance] = useState(false);

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

  const go = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  const menuRows = [
    {
      id: 'notification',
      label: 'Notification',
      icon: Bell,
      onClick: () => {
        markNotificationsRead();
        setIsNotificationOpen(true);
      },
      rightNode:
        unreadNotificationsCount > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-black text-emerald-700">
              {unreadNotificationsCount}
            </span>
          </span>
        ) : null
    },
    {
      id: 'gifts',
      label: 'Gifts',
      icon: Gift,
      onClick: () => go('gifts')
    },
    {
      id: 'attendance',
      label: 'Daily Sign-in',
      icon: CalendarCheck,
      onClick: () => go('attendence')
    },
    {
      id: 'game-statistics',
      label: 'Game statistics',
      icon: BarChart2,
      onClick: () => go('game-statistics')
    },
    {
      id: 'activity',
      label: 'My activity',
      icon: Award,
      onClick: () => go('activity')
    },
    {
      id: 'language',
      label: getTranslation(language, 'language') || 'Language',
      icon: Globe,
      onClick: () => go('language'),
      rightText: language === 'en' ? 'English' : 'বাংলা'
    },
    {
      id: 'safe',
      label: 'Safe Vault',
      icon: ShieldCheck,
      onClick: () => go('safe'),
      rightText: `৳${user.safeBalance.toFixed(2)}`
    },
    {
      id: 'vip',
      label: 'VIP Rewards',
      icon: Crown,
      onClick: () => go('vip'),
      rightText: `VIP${user.vipLevel}`
    },
    {
      id: 'salary',
      label: 'Agent Daily Salary',
      icon: Coins,
      onClick: () => go('salary'),
      rightText: 'Up to ৳100,000'
    },
    {
      id: 'change-nickname',
      label: getTranslation(language, 'changeNickname') || 'Change Nickname',
      icon: UserCog,
      onClick: () => go('change-nickname'),
      rightText: user.nickname
    },
    {
      id: 'change-password',
      label: getTranslation(language, 'changePasswordHeader') || 'Change Login Password',
      icon: KeyRound,
      onClick: () => go('change-login-password')
    },
    {
      id: 'customer-service',
      label: getTranslation(language, 'customerService') || 'Customer Service',
      icon: Headphones,
      onClick: () => go('customer-service')
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <div className="px-4 pt-4 space-y-4">
        {/* Top Profile Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="relative cursor-pointer select-none flex-shrink-0"
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
                  className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-600 to-teal-700 border-2 border-cyan-400 shadow-md flex items-center justify-center text-white font-black text-lg">
                  {(user.nickname || user.phone || 'M').charAt(0).toUpperCase() || <UserIcon className="w-6 h-6" />}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white text-cyan-600 flex items-center justify-center shadow border border-cyan-300">
                <Camera className="w-3 h-3" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-base font-black text-slate-900 tracking-tight truncate">
                Hello, <span className="uppercase">{user.nickname || user.phone || 'MEMBER'}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => go('vip')}
                  className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-black text-[11px] flex items-center gap-1 shadow-xs active:scale-95"
                >
                  <Crown className="w-3 h-3" />
                  <span>VIP{user.vipLevel}</span>
                </button>

                <div className="px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-[11px] font-bold text-cyan-800 flex items-center gap-1.5">
                  <span className="tabular-nums">UID {user.uid || 'N/A'}</span>
                  {user.uid && (
                    <button
                      type="button"
                      onClick={copyUid}
                      aria-label="Copy UID"
                      className="text-cyan-700 hover:opacity-80 active:scale-90"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Top Circular Action Buttons: Notification & Customer Service */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            <button
              type="button"
              onClick={() => {
                markNotificationsRead();
                setIsNotificationOpen(true);
              }}
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-cyan-600 active:scale-95 transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => go('customer-service')}
              aria-label="Customer Service"
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-cyan-600 active:scale-95 transition-all"
            >
              <Headphones className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Holding Assets Card (No Profit & Loss Displayed) */}
        <div className="bg-white rounded-3xl p-4 border border-cyan-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span>Holding assets (BDT)</span>
                <button
                  type="button"
                  onClick={() => setHideBalance((prev) => !prev)}
                  aria-label="Toggle balance visibility"
                  className="text-cyan-700 hover:opacity-80"
                >
                  {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => go('wallet')}
                className="mt-1 flex items-center gap-1 text-2xl font-black text-slate-900 tracking-tight tabular-nums active:scale-98"
              >
                <span>{hideBalance ? '••••••' : `৳${user.balance.toFixed(2)}`}</span>
                <ChevronRight className="w-5 h-5 text-cyan-600" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => go('wallet')}
              className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-black flex items-center gap-1 active:scale-95"
            >
              <span>Wallet</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => go('deposit')}
              className="py-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-teal-500 text-white font-black text-sm shadow-sm flex items-center justify-center gap-2 active:scale-97 transition-transform whitespace-nowrap"
            >
              <WalletIcon className="w-4 h-4 stroke-[2.3]" />
              <span>{getTranslation(language, 'deposit') || 'Deposit'}</span>
            </button>

            <button
              type="button"
              onClick={() => go('wallet')}
              className="py-2.5 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white font-black text-sm shadow-sm flex items-center justify-center gap-2 active:scale-97 transition-transform whitespace-nowrap"
            >
              <CreditCard className="w-4 h-4 stroke-[2.3]" />
              <span>{getTranslation(language, 'withdraw') || 'Withdraw'}</span>
            </button>
          </div>
        </div>

        {/* 2×2 Quick History Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => go('game-statistics')}
            className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center gap-2.5 text-left hover:border-cyan-400 active:scale-98 transition-all"
          >
            <GameHistoryGridIcon size={36} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-900 truncate">
                {getTranslation(language, 'gameHistory') || 'Game History'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">My game history</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setHistoryFilterTab('all');
              go('transaction-history');
            }}
            className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center gap-2.5 text-left hover:border-cyan-400 active:scale-98 transition-all"
          >
            <TransactionGridIcon size={36} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-900 truncate">
                {getTranslation(language, 'transactionHistory') || 'Transaction'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">My transaction history</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setHistoryFilterTab('deposit');
              go('transaction-history');
            }}
            className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center gap-2.5 text-left hover:border-cyan-400 active:scale-98 transition-all"
          >
            <DepositHistoryGridIcon size={36} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-900 truncate">
                {getTranslation(language, 'deposit') || 'Deposit'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">My deposit history</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setHistoryFilterTab('withdraw');
              go('transaction-history');
            }}
            className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center gap-2.5 text-left hover:border-cyan-400 active:scale-98 transition-all"
          >
            <WithdrawHistoryGridIcon size={36} />
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-900 truncate">
                {getTranslation(language, 'withdraw') || 'Withdraw'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">My withdraw history</div>
            </div>
          </button>
        </div>

        {/* Settings & Menu Card */}
        <div className="bg-white rounded-3xl p-1.5 border border-slate-200 shadow-xs divide-y divide-slate-100">
          {menuRows.map((row) => {
            const Icon = row.icon;
            return (
              <button
                key={row.id}
                type="button"
                onClick={row.onClick}
                className="w-full px-3 py-3 flex items-center justify-between text-left hover:bg-slate-50 rounded-2xl active:scale-99 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 flex-shrink-0">
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {row.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {row.rightNode}
                  {row.rightText && (
                    <span className="text-xs font-semibold text-slate-500 max-w-[110px] truncate">
                      {row.rightText}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Log Out Button */}
        <button
          type="button"
          onClick={logout}
          className="w-full py-3.5 rounded-full border border-rose-200 text-rose-600 bg-white font-extrabold text-xs shadow-xs hover:bg-rose-50 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{getTranslation(language, 'logout') || 'Log out'}</span>
        </button>
      </div>
    </div>
  );
};
