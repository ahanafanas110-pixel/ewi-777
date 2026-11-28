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
  KeyRound,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import { getLanguageBadge, getTranslation } from '../utils/i18n';
import { compressImageFileToDataUrl } from '../utils/imageCompress';
import {
  GameHistoryGridIcon,
  TransactionGridIcon,
  DepositHistoryGridIcon,
  WithdrawHistoryGridIcon
} from '../components/AccountIcons';
import { getVipBadgeImage } from '../constants/vipTiers';
import { BeginnerGuideModal } from '../components/GuideAndPolicyModals';
import { PinkSafePlateLogo } from '../components/BrandLogos';

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
  const [showGuideModal, setShowGuideModal] = useState(false);

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

  const langBadge = getLanguageBadge(language);

  const menuRows = [
    {
      id: 'notification',
      label: getTranslation(language, 'notification'),
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
      label: getTranslation(language, 'gifts'),
      icon: Gift,
      onClick: () => go('gifts')
    },
    {
      id: 'attendance',
      label: getTranslation(language, 'dailySignInMenu'),
      icon: CalendarCheck,
      onClick: () => go('attendence')
    },
    {
      id: 'game-statistics',
      label: getTranslation(language, 'gameStatistics'),
      icon: BarChart2,
      onClick: () => go('game-statistics')
    },
    {
      id: 'activity',
      label: getTranslation(language, 'myActivity'),
      icon: Award,
      onClick: () => go('activity')
    },
    {
      id: 'language',
      label: getTranslation(language, 'language'),
      icon: Globe,
      onClick: () => go('language'),
      rightText: `${langBadge.flag} ${langBadge.nativeName}`
    },
    {
      id: 'safe',
      label: getTranslation(language, 'safeVaultMenu'),
      icon: ShieldCheck,
      onClick: () => go('safe'),
      rightText: `৳${user.safeBalance.toFixed(2)}`
    },
    {
      id: 'vip',
      label: getTranslation(language, 'vipRewardsMenu'),
      icon: Crown,
      onClick: () => go('vip'),
      rightNode: (
        <img
          src={user.vipLevel >= 1 ? getVipBadgeImage(user.vipLevel) : '/assets/aistudio/image_b85a3980.png'}
          alt={`VIP${user.vipLevel}`}
          className={
            user.vipLevel >= 1
              ? 'w-5 h-6 object-contain'
              : 'w-5 h-5 object-cover [clip-path:polygon(50%_2%,94%_22%,86%_73%,50%_98%,14%_73%,6%_22%)]'
          }
        />
      ),
      rightText: `VIP${user.vipLevel}`
    },
    {
      id: 'salary',
      label: getTranslation(language, 'agentDailySalaryMenu'),
      icon: Coins,
      onClick: () => go('salary'),
      rightText: 'Up to ৳100,000'
    },
    {
      id: 'change-nickname',
      label: getTranslation(language, 'changeNickname'),
      icon: UserCog,
      onClick: () => go('change-nickname'),
      rightText: user.nickname
    },
    {
      id: 'change-password',
      label: getTranslation(language, 'changePasswordHeader'),
      icon: KeyRound,
      onClick: () => go('change-login-password')
    },
    {
      id: 'beginner-guide',
      label: getTranslation(language, 'beginnersGuide'),
      icon: BookOpen,
      onClick: () => setShowGuideModal(true)
    },
    {
      id: 'privacy-risk',
      label: getTranslation(language, 'privacyAndRisk'),
      icon: ShieldAlert,
      onClick: () => go('privacy-&-risk'),
      rightText: '/privacy-&-risk'
    },
    {
      id: 'customer-service',
      label: getTranslation(language, 'customerService'),
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
                {getTranslation(language, 'helloGreeting')} <span className="uppercase">{user.nickname || user.phone || 'MEMBER'}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => go('vip')}
                  className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-black text-[11px] flex items-center gap-1 shadow-xs active:scale-95"
                >
                  <img
                    src={user.vipLevel >= 1 ? getVipBadgeImage(user.vipLevel) : '/assets/aistudio/image_b85a3980.png'}
                    alt={`VIP${user.vipLevel}`}
                    className={
                      user.vipLevel >= 1
                        ? 'w-4 h-4 object-contain'
                        : 'w-4 h-4 object-cover [clip-path:polygon(50%_2%,94%_22%,86%_73%,50%_98%,14%_73%,6%_22%)]'
                    }
                  />
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

        {/* Holding Assets Card */}
        <div className="bg-white rounded-3xl p-4 border border-cyan-100 shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span>{getTranslation(language, 'holdingAssetsBdt')}</span>
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
              {!hideBalance && (user.lockedBalance || 0) > 0 && (
                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800 tabular-nums">
                  <span>Playable: ৳{Math.max(0, user.balance - (user.lockedBalance || 0)).toFixed(2)}</span>
                  <span>•</span>
                  <span>Hold: ৳{(user.lockedBalance || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => go('wallet')}
              className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-black flex items-center gap-1 active:scale-95"
            >
              <span>{getTranslation(language, 'wallet')}</span>
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
              onClick={() => go('withdraw')}
              className="py-2.5 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white font-black text-sm shadow-sm flex items-center justify-center gap-2 active:scale-97 transition-transform whitespace-nowrap"
            >
              <CreditCard className="w-4 h-4 stroke-[2.3]" />
              <span>{getTranslation(language, 'withdraw') || 'Withdraw'}</span>
            </button>
          </div>
        </div>

        {/* Standalone Safe Card (Positioned Directly Below Holding Assets) */}
        <button
          type="button"
          onClick={() => go('safe')}
          className="w-full bg-white rounded-3xl p-4 border border-cyan-100 shadow-xs flex items-center justify-between gap-3 text-left hover:border-cyan-300 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <PinkSafePlateLogo size={42} />
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 leading-tight">
                {getTranslation(language, 'safeVaultMenu') || 'Safe'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                Daily interest rate 0.1%, earnings calculated regularly
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs tabular-nums shadow-2xs">
              {hideBalance ? '••••' : `৳${(user.safeBalance || 0).toFixed(2)}`}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </button>

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
                {getTranslation(language, 'gameHistory')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {getTranslation(language, 'myGameHistory')}
              </div>
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
                {getTranslation(language, 'transactionHistory')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {getTranslation(language, 'myTransactionHistory')}
              </div>
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
                {getTranslation(language, 'deposit')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {getTranslation(language, 'myDepositHistory')}
              </div>
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
                {getTranslation(language, 'withdraw')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {getTranslation(language, 'myWithdrawHistory')}
              </div>
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

      <BeginnerGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onOpenRiskDisclosure={() => {
          setShowGuideModal(false);
          go('privacy-&-risk');
        }}
      />
    </div>
  );
};
