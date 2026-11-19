import React, { useState, useEffect } from 'react';
import { useApp, getLocalDateStr } from '../context/AppContext';
import { X, Check } from 'lucide-react';
import eventRewardsGiftImg from '../assets/images/event_rewards_gift_1794740711784.jpg';

export const WalletPastelIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 15C11 11.6863 13.6863 9 17 9H30C32.2091 9 34 10.7909 34 13V17H11V15Z" fill="#FF5A5F" />
    <rect x="7" y="15" width="33" height="24" rx="7" fill="#FFCFD2" />
    <rect x="7" y="15" width="33" height="24" rx="7" fill="url(#walletGrad)" />
    <rect x="14" y="21" width="9" height="3" rx="1.5" fill="#FF5252" />
    <rect x="30" y="23" width="12" height="8" rx="4" fill="#FFA4AA" />
    <circle cx="34.5" cy="27" r="2.2" fill="#FF4D58" />
    <defs>
      <linearGradient id="walletGrad" x1="7" y1="15" x2="40" y2="39" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFD2D6" />
        <stop offset="1" stopColor="#FFB0B8" />
      </linearGradient>
    </defs>
  </svg>
);

export const DepositPastelIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 18L24 9L34 15V26H13V18Z" fill="#F97316" />
    <path d="M17 17L28 11L35 16L33 27H17V17Z" fill="#FB923C" />
    <path d="M8 20C8 17.7909 9.79086 16 12 16H17.5C19 19.2 21.3 20.5 24 20.5C26.7 20.5 29 19.2 30.5 16H36C38.2091 16 40 17.7909 40 20V32C40 36.4183 36.4183 40 32 40H16C11.5817 40 8 36.4183 8 32V20Z" fill="url(#depGrad)" />
    <defs>
      <linearGradient id="depGrad" x1="8" y1="16" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFDDB8" />
        <stop offset="1" stopColor="#FDBA74" />
      </linearGradient>
    </defs>
  </svg>
);

export const WithdrawPastelIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="11" width="34" height="27" rx="7" fill="url(#wdrGrad)" />
    <path d="M7 18C7 14.134 10.134 11 14 11H34C37.866 11 41 14.134 41 18V20H7V18Z" fill="#3B82F6" />
    <rect x="13" y="29" width="5" height="3" rx="1.5" fill="#60A5FA" />
    <rect x="21" y="29" width="9" height="3" rx="1.5" fill="#60A5FA" />
    <defs>
      <linearGradient id="wdrGrad" x1="7" y1="11" x2="41" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DBEAFE" />
        <stop offset="1" stopColor="#BFDBFE" />
      </linearGradient>
    </defs>
  </svg>
);

export const VipPastelIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.5 8.5C18.5 7.5 19.9 7 21.3 7H26.7C28.1 7 29.5 7.5 30.5 8.5L39.5 17.5C41.4 19.4 41.9 22.3 40.7 24.7L36.7 32.7C35.8 34.5 34.1 35.8 32.1 36.2L24.8 37.8C24.3 37.9 23.7 37.9 23.2 37.8L15.9 36.2C13.9 35.8 12.2 34.5 11.3 32.7L7.3 24.7C6.1 22.3 6.6 19.4 8.5 17.5L17.5 8.5Z"
      fill="url(#vipGrad)"
    />
    <path
      d="M18.5 15.5L22.2 30H25.8L29.5 15.5H26.2L24 25.5L21.8 15.5H18.5Z"
      fill="#0D9488"
    />
    <defs>
      <linearGradient id="vipGrad" x1="7" y1="7" x2="41" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#B8EFE2" />
        <stop offset="1" stopColor="#8DE2CF" />
      </linearGradient>
    </defs>
  </svg>
);

export const ActivityAwardSquircleIcon: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="url(#actGrad)" />
    <path d="M13 8H21V22L17 19L13 22V8Z" fill="white" fillOpacity="0.45" />
    <path d="M27 8H35V22L31 19L27 22V8Z" fill="white" fillOpacity="0.45" />
    <circle cx="24" cy="28" r="10.5" fill="white" fillOpacity="0.45" />
    <circle cx="24" cy="28" r="7.5" fill="white" />
    <path d="M24 23L25.4 25.9L28.6 26.3L26.3 28.5L26.9 31.7L24 30.2L21.1 31.7L21.7 28.5L19.4 26.3L22.6 25.9L24 23Z" fill="#FF7B54" />
    <defs>
      <linearGradient id="actGrad" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF6B5B" />
        <stop offset="1" stopColor="#FFC8A8" />
      </linearGradient>
    </defs>
  </svg>
);

export const BettingRebateSquircleIcon: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="url(#rebGrad)" />
    <rect x="11" y="13" width="26" height="22" rx="6" fill="white" fillOpacity="0.35" />
    <ellipse cx="16.5" cy="20.5" rx="4.5" ry="2.2" fill="white" />
    <path d="M12 20.5V28.5C12 29.7 14 30.7 16.5 30.7C19 30.7 21 29.7 21 28.5V20.5" fill="white" />
    <rect x="27" y="20" width="10" height="7" rx="3.5" fill="white" />
    <circle cx="30.5" cy="23.5" r="1.8" fill="#F59E0B" />
    <defs>
      <linearGradient id="rebGrad" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF8800" />
        <stop offset="1" stopColor="#FFD13B" />
      </linearGradient>
    </defs>
  </svg>
);

export const SuperJackpotSquircleIcon: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="url(#sjGrad)" />
    <path d="M16 14H32V23C32 27.4183 28.4183 31 24 31C19.5817 31 16 27.4183 16 23V14Z" fill="white" fillOpacity="0.72" />
    <path d="M11 16H16V22C13 22 11 20 11 17V16Z" fill="white" fillOpacity="0.55" />
    <path d="M32 16H37V17C37 20 35 22 32 22V16Z" fill="white" fillOpacity="0.55" />
    <rect x="22" y="30" width="4" height="5" fill="white" />
    <rect x="17" y="35" width="14" height="3.5" rx="1.75" fill="white" />
    <defs>
      <linearGradient id="sjGrad" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#05C98B" />
        <stop offset="1" stopColor="#B8F7DF" />
      </linearGradient>
    </defs>
  </svg>
);

export const FirstGiftSquircleIcon: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="url(#fgGrad)" />
    <rect x="11" y="19" width="26" height="5" rx="1.5" fill="white" fillOpacity="0.88" />
    <rect x="13" y="25" width="22" height="12" rx="2.5" fill="white" fillOpacity="0.75" />
    <rect x="22" y="19" width="4" height="18" fill="#A855F7" fillOpacity="0.45" />
    <path d="M24 19C20 19 16 16.5 17 14C18 11.5 22 14 24 19Z" fill="white" fillOpacity="0.7" />
    <path d="M24 19C28 19 32 16.5 31 14C30 11.5 26 14 24 19Z" fill="white" fillOpacity="0.7" />
    <defs>
      <linearGradient id="fgGrad" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5B21B6" />
        <stop offset="1" stopColor="#C084FC" />
      </linearGradient>
    </defs>
  </svg>
);

interface EventRewardsModalProps {
  isOpen: boolean;
  onLoginClick: () => void;
  onContinueBrowsing: () => void;
}

export const EventRewardsModal: React.FC<EventRewardsModalProps> = ({
  isOpen,
  onLoginClick,
  onContinueBrowsing
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px] animate-fade-in">
      <div className="relative w-full max-w-[340px] bg-gradient-to-b from-[#FFFBEB] via-white to-white rounded-[26px] pt-24 pb-6 px-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.32)] border border-amber-200 mt-16">
        {/* Top Overlapping Glossy 3D Gift Box */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 flex items-center justify-center pointer-events-none select-none">
          <img
            src={eventRewardsGiftImg}
            alt="Event Rewards 3D Gift Box"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(217,119,6,0.32)]"
            style={{
              WebkitMaskImage: 'radial-gradient(closest-side, black 72%, rgba(0,0,0,0.65) 86%, transparent 99%)',
              maskImage: 'radial-gradient(closest-side, black 72%, rgba(0,0,0,0.65) 86%, transparent 99%)'
            }}
          />
        </div>

        {/* Title with Gold Petal Wing Accents */}
        <div className="flex items-center justify-center gap-2.5 mb-2.5">
          <svg width="16" height="18" viewBox="0 0 18 20" fill="none" className="flex-shrink-0">
            <ellipse cx="8" cy="6.5" rx="6.5" ry="3.2" transform="rotate(24 8 6.5)" fill="#FBBF24" />
            <ellipse cx="10" cy="14" rx="5.5" ry="2.8" transform="rotate(-12 10 14)" fill="#D97706" />
          </svg>
          <h3 className="text-[20px] font-black text-[#1E2536] tracking-tight">Event Rewards</h3>
          <svg width="16" height="18" viewBox="0 0 18 20" fill="none" className="flex-shrink-0 scale-x-[-1]">
            <ellipse cx="8" cy="6.5" rx="6.5" ry="3.2" transform="rotate(24 8 6.5)" fill="#FBBF24" />
            <ellipse cx="10" cy="14" rx="5.5" ry="2.8" transform="rotate(-12 10 14)" fill="#D97706" />
          </svg>
        </div>

        <p className="text-[13px] text-[#283144] font-bold leading-relaxed mb-6 px-1">
          Log in to participate in the{' '}
          <span className="text-[#D97706] font-extrabold">event rewards</span> and unlock all 8 exclusive rewards
        </p>

        <button
          type="button"
          onClick={onLoginClick}
          className="w-full py-3 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-[15px] shadow-[0_8px_18px_rgba(217,119,6,0.34)] active:scale-97 transition-all"
        >
          Log in now to participate
        </button>

        <button
          type="button"
          onClick={onContinueBrowsing}
          className="mt-4 text-[13px] font-bold text-[#273043] hover:text-slate-900 transition-colors"
        >
          Don&apos;t log in yet, continue browsing
        </button>
      </div>
    </div>
  );
};

// ===== Account 2x2 Grid & Settings Row Pastel Icons (Matching reference) =====
export const GameHistoryGridIcon: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="26" height="28" rx="6" fill="#4D9EFF" />
    <rect x="9" y="13" width="12" height="2.6" rx="1.3" fill="white" />
    <rect x="9" y="19" width="8" height="2.6" rx="1.3" fill="white" />
    <circle cx="28" cy="28" r="8" fill="#60A5FA" stroke="white" strokeWidth="1.5" />
    <text x="28" y="31.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="900">$</text>
  </svg>
);

export const TransactionGridIcon: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="26" height="28" rx="6" fill="#2EE59D" />
    <rect x="9" y="13" width="12" height="2.6" rx="1.3" fill="white" />
    <rect x="9" y="19" width="10" height="2.6" rx="1.3" fill="white" />
    <circle cx="28" cy="28" r="8" fill="#10B981" stroke="white" strokeWidth="1.5" />
    <path d="M24.5 26.5H31.5M31.5 26.5L29.2 24.2M31.5 29.8H24.5M24.5 29.8L26.8 32.1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DepositHistoryGridIcon: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="7" width="28" height="26" rx="7" fill="#FCA5A5" />
    <path d="M14 7H22V17L18 14L14 17V7Z" fill="#FB7185" />
    <rect x="11" y="21" width="10" height="2.4" rx="1.2" fill="#EF4444" />
    <rect x="11" y="26" width="14" height="2.4" rx="1.2" fill="#EF4444" />
  </svg>
);

export const WithdrawHistoryGridIcon: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12C9 9.79 10.79 8 13 8H28C30.2 8 32 9.79 32 12V16H9V12Z" fill="#FB923C" />
    <rect x="6" y="13" width="28" height="20" rx="6" fill="#FDBA74" />
    <rect x="24" y="20" width="11" height="7" rx="3.5" fill="#F97316" />
    <circle cx="11" cy="31" r="6" fill="#F97316" stroke="white" strokeWidth="1.5" />
    <path d="M8.5 31L10.3 32.8L13.5 29.2" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NotificationRowIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="26" height="20" rx="5" fill="#FDE68A" />
    <path d="M7 11L16 18L25 11" stroke="#B45309" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GiftsRowIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="11" width="24" height="5" rx="2" fill="#D97706" />
    <rect x="6" y="16" width="20" height="12" rx="3" fill="#FDE68A" />
    <rect x="14" y="11" width="4" height="17" fill="#B45309" />
    <path d="M16 11C12.5 11 10 8.5 11.5 6.5C13 4.5 15.5 7 16 11Z" fill="#F59E0B" />
    <path d="M16 11C19.5 11 22 8.5 20.5 6.5C19 4.5 16.5 7 16 11Z" fill="#F59E0B" />
  </svg>
);

export const StatsRowIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="16" width="5" height="10" rx="2" fill="#F59E0B" />
    <rect x="13" y="11" width="5" height="15" rx="2" fill="#D97706" />
    <rect x="21" y="6" width="5" height="20" rx="2" fill="#FDE68A" />
  </svg>
);

export const LanguageRowIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="11.5" fill="#D97706" />
    <ellipse cx="16" cy="16" rx="5.5" ry="11.5" stroke="white" strokeWidth="1.8" />
    <line x1="4.5" y1="16" x2="27.5" y2="16" stroke="white" strokeWidth="1.8" />
    <line x1="6.5" y1="10.5" x2="25.5" y2="10.5" stroke="white" strokeWidth="1.4" />
    <line x1="6.5" y1="21.5" x2="25.5" y2="21.5" stroke="white" strokeWidth="1.4" />
  </svg>
);

export const SalaryRowIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="24" height="20" rx="5" fill="#FDE68A" />
    <circle cx="16" cy="16" r="6" fill="#F59E0B" />
    <text x="16" y="19" textAnchor="middle" fill="white" fontSize="9" fontWeight="900">৳</text>
  </svg>
);

export const NicknameRowIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="5" width="24" height="22" rx="6" fill="#FEF3C7" />
    <circle cx="16" cy="12.5" r="4" fill="#D97706" />
    <path d="M9.5 23C10.5 19.5 13 18 16 18C19 18 21.5 19.5 22.5 23" stroke="#D97706" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const PasswordRowIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="13" width="20" height="14" rx="4.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.6" />
    <path d="M11 13V9.5C11 6.74 13.24 4.5 16 4.5C18.76 4.5 21 6.74 21 9.5V13" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="16" cy="20" r="2.2" fill="#D97706" />
  </svg>
);

export const FIRST_DEPOSIT_TIERS = [
  { deposit: 100, bonus: 18 },
  { deposit: 300, bonus: 48 },
  { deposit: 500, bonus: 88 },
  { deposit: 1000, bonus: 158 },
  { deposit: 3000, bonus: 388 },
  { deposit: 5000, bonus: 588 },
  { deposit: 10000, bonus: 1088 },
  { deposit: 50000, bonus: 4888 }
];

export const ExtraFirstDepositModal: React.FC = () => {
  const {
    user,
    depositRequests,
    firstDepositModalOpen,
    setFirstDepositModalOpen,
    claimExtraFirstDepositBonus,
    setActiveTab,
    showToast
  } = useApp();
  const [noMoreToday, setNoMoreToday] = useState(false);

  useEffect(() => {
    if (firstDepositModalOpen) {
      setNoMoreToday(false);
    }
  }, [firstDepositModalOpen]);

  const totalDep = Number(user.totalDeposited) || 0;
  const hasCompletedAnyDeposit =
    totalDep > 0 ||
    Boolean(user.hasClaimedDepositBonus) ||
    depositRequests.some((d) => d.userId === user.id && d.status === 'approved');

  if (!user.isLoggedIn || !firstDepositModalOpen || hasCompletedAnyDeposit) return null;

  const handleClose = () => {
    if (noMoreToday) {
      localStorage.setItem('ewi777_fd_hide_date', getLocalDateStr());
    }
    setFirstDepositModalOpen(false);
  };

  const claimedMap = user.claimedFirstDepositTiers || {};

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-[340px] rounded-3xl overflow-hidden bg-[#FFFDF7] border border-amber-200 shadow-[0_24px_60px_rgba(217,119,6,0.32)] flex flex-col max-h-[78vh]">
        {/* Luxury Gold Header */}
        <div className="bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] px-4 py-3.5 text-center text-white">
          <h3 className="text-base font-black tracking-tight">Extra first deposit bonus</h3>
          <p className="text-[11px] text-amber-100 font-semibold mt-0.5">
            Each account can only receive rewards once
          </p>
        </div>

        {/* Tiers List */}
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
          {FIRST_DEPOSIT_TIERS.map((tier) => {
            const current = Math.min(totalDep, tier.deposit);
            const pct = Math.min(100, Math.round((current / tier.deposit) * 100));
            const isClaimed = Boolean(claimedMap[String(tier.deposit)]);
            const canCollect = !isClaimed && totalDep >= tier.deposit;

            return (
              <div
                key={tier.deposit}
                className="bg-white rounded-2xl p-3 border border-amber-200 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="text-slate-800">
                    First deposit{' '}
                    <span className="text-[#B45309]">{tier.deposit.toLocaleString()}</span>
                  </span>
                  <span className="text-[#D97706] font-black">+ ৳{tier.bonus.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Deposit {tier.deposit.toLocaleString()} for the first time and you will receive{' '}
                  {tier.bonus} bonus
                </p>

                <div className="flex items-center gap-2.5 pt-0.5">
                  <div className="flex-1 h-4 rounded-full bg-amber-50 border border-amber-200 relative overflow-hidden flex items-center justify-center">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#D97706] to-[#F59E0B] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                    <span
                      className={`relative z-10 text-[10px] font-black tabular-nums ${
                        pct > 55 ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {Math.floor(current)}/{tier.deposit}
                    </span>
                  </div>

                  {isClaimed ? (
                    <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] font-black">
                      Collected
                    </span>
                  ) : canCollect ? (
                    <button
                      type="button"
                      onClick={() => {
                        const res = claimExtraFirstDepositBonus(tier.deposit, tier.bonus);
                        if (!res.success) showToast(res.message);
                      }}
                      className="px-4 py-1 rounded-full bg-gradient-to-r from-[#00B977] to-emerald-500 text-white text-[11px] font-black shadow-xs active:scale-95"
                    >
                      Collect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFirstDepositModalOpen(false);
                        setActiveTab('deposit');
                        window.location.hash = '#/deposit';
                      }}
                      className="px-4 py-1 rounded-full border border-[#D97706] text-[#B45309] hover:bg-amber-50 text-[11px] font-extrabold active:scale-95 transition-colors"
                    >
                      Deposit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Controls */}
        <div className="px-4 py-3 bg-white border-t border-amber-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setNoMoreToday((v) => !v)}
            className="flex items-center gap-2 text-[11px] font-bold text-slate-600 select-none"
          >
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                noMoreToday
                  ? 'bg-[#D97706] border-[#D97706] text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {noMoreToday && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </span>
            <span>No more reminders today</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleClose();
              setActiveTab('first-gift');
              window.location.hash = '#/first-gift';
            }}
            className="px-6 py-1.5 rounded-full bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white font-black text-xs shadow-sm active:scale-95 transition-transform"
          >
            Activity
          </button>
        </div>
      </div>

      {/* Bottom Circular X Close Button */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close first deposit bonus popup"
        className="mt-4 w-9 h-9 rounded-full border-2 border-white/85 text-white flex items-center justify-center bg-black/40 hover:bg-black/60 active:scale-95 transition-all shadow-lg"
      >
        <X className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
