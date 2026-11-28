import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Award,
  Gift,
  Shield,
  Coins,
  Check,
  Lock,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { VIP_TIERS, getVipBadgeImage } from '../constants/vipTiers';
import { DepositPastelIcon } from '../components/AccountIcons';
import vipLevelUpGift from '../assets/images/vip_levelup_gift_1794826715707.jpg';
import vipMonthlyChest from '../assets/images/vip_monthly_chest_1794826717578.jpg';
import { getTranslation } from '../utils/i18n';

const VipBadgeImg: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackSize?: string;
}> = ({ src, alt, className = 'w-6 h-6 object-contain', fallbackSize = 'w-5 h-5' }) => {
  const [errored, setErrored] = useState(false);
  if (errored || !src) {
    return (
      <span className={`inline-flex items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 flex-shrink-0 ${className}`}>
        <Award className={fallbackSize} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={className}
    />
  );
};

export const Vip: React.FC = () => {
  const { user, claimVipReward, setActiveTab, goBack, language, showToast } = useApp();
  const [selectedVipLevel, setSelectedVipLevel] = useState<number>(
    Math.min(VIP_TIERS.length, Math.max(1, user.vipLevel || 1))
  );

  const currentTier = VIP_TIERS.find((t) => t.level === selectedVipLevel) || VIP_TIERS[0];
  const userDeposited = user.totalDeposited || 0;
  const isUnlocked = user.vipLevel >= currentTier.level;
  const depositNeeded = Math.max(0, currentTier.requiredDeposit - userDeposited);
  const depositProgress = Math.min(100, (userDeposited / currentTier.requiredDeposit) * 100);

  const claimedMap = user.claimedVipBonuses || {};
  const levelUpKey = `levelUp_${currentTier.level}`;
  const isLevelUpClaimed = Boolean(claimedMap[levelUpKey]);

  const lastMonthlyTs = Number(user.vipMonthlyLastClaim?.[String(currentTier.level)] || 0);
  const monthlyCycleMs = 30 * 24 * 60 * 60 * 1000;
  const isMonthlyCreditedForCycle =
    currentTier.monthlyBonus > 0 && lastMonthlyTs > 0 && Date.now() - lastMonthlyTs < monthlyCycleMs;

  const handleClaim = (type: 'levelUp' | 'monthly', amount: number) => {
    if (amount <= 0) return;
    if (!isUnlocked) {
      showToast(`Deposit ৳${depositNeeded.toLocaleString()} more to unlock VIP${currentTier.level}!`);
      return;
    }
    claimVipReward(currentTier.level, type, amount);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] px-4 pt-3 pb-8 text-white rounded-b-[2rem] shadow-md">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => goBack('account')}
            aria-label="Back"
            className="relative z-20 p-2 -ml-1.5 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-1.5 font-black text-lg tracking-wide">
            <Award className="w-5 h-5 text-cyan-200" />
            <span>{getTranslation(language, 'vipPrivilegeClub')}</span>
          </div>
          <div className="w-6" />
        </div>

        <div className="bg-white rounded-2xl p-4 text-slate-800 shadow-sm grid grid-cols-2 divide-x divide-slate-200 border border-slate-200">
          <div className="text-center pr-2">
            <div className="text-base font-black text-cyan-700 tabular-nums">
              ৳{userDeposited.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {getTranslation(language, 'totalDeposits')}
            </div>
          </div>
          <div className="text-center pl-2 flex items-center justify-center gap-2">
            <VipBadgeImg
              src={getVipBadgeImage(Math.max(1, user.vipLevel || 1))}
              alt={`VIP ${user.vipLevel}`}
              className="w-9 h-10 object-contain drop-shadow-sm flex-shrink-0"
            />
            <div className="text-left">
              <div className="text-base font-black text-slate-900 leading-tight">
                <span className="text-lg text-emerald-600 font-black">VIP {user.vipLevel}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {getTranslation(language, 'currentRank')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Horizontal VIP 1 to 10 Selector */}
        <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2 px-1">
            <span>{getTranslation(language, 'selectVipTier')}</span>
            <span className="text-[11px] text-cyan-700 font-bold">
              {getTranslation(language, 'autoUnlockDeposit')}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {VIP_TIERS.map((tier) => {
              const tierUnlocked = user.vipLevel >= tier.level;
              const isSelected = selectedVipLevel === tier.level;
              return (
                <button
                  key={tier.level}
                  onClick={() => setSelectedVipLevel(tier.level)}
                  className={`flex-shrink-0 px-3 py-2 min-h-[44px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-sm'
                      : tierUnlocked
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <VipBadgeImg
                    src={tier.badgeImage}
                    alt={`VIP ${tier.level}`}
                    className={`w-6 h-6 object-contain ${!tierUnlocked && !isSelected ? 'opacity-80' : ''}`}
                    fallbackSize="w-4 h-4"
                  />
                  <span>VIP{tier.level}</span>
                  {tierUnlocked ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                  ) : (
                    <Lock className="w-3 h-3 opacity-60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected VIP Tier Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 p-1.5">
                <VipBadgeImg
                  src={currentTier.badgeImage}
                  alt={`VIP ${currentTier.level} Emblem`}
                  className={`w-full h-full object-contain drop-shadow-[0_6px_12px_rgba(15,23,42,0.18)] ${
                    !isUnlocked ? 'grayscale-[20%] opacity-95' : ''
                  }`}
                  fallbackSize="w-8 h-8"
                />
              </div>
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base text-slate-900">{currentTier.title}</h3>
                  {isUnlocked ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[10px] flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> {getTranslation(language, 'unlocked')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {getTranslation(language, 'locked')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 leading-snug">{currentTier.description}</div>
              </div>
            </div>
          </div>

          {/* Deposit Requirement Progress Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Required Deposit to Unlock</span>
              <span className="font-mono font-black text-cyan-700 tabular-nums">
                ৳{currentTier.requiredDeposit.toLocaleString()}
              </span>
            </div>

            <div className="w-full bg-cyan-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] h-full rounded-full transition-all"
                style={{ width: `${depositProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 tabular-nums">
              <span>Deposited: ৳{userDeposited.toLocaleString()}</span>
              {isUnlocked ? (
                <span className="text-emerald-600 font-bold">Auto-Unlocked!</span>
              ) : (
                <span className="text-cyan-700 font-bold">Need ৳{depositNeeded.toLocaleString()} more</span>
              )}
            </div>

            {!isUnlocked && (
              <button
                onClick={() => {
                  setActiveTab('deposit');
                  window.location.hash = '#/deposit';
                }}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <DepositPastelIcon size={18} />
                <span>Deposit ৳{depositNeeded.toLocaleString()} to Auto-Unlock VIP{currentTier.level}</span>
              </button>
            )}
          </div>

          {/* Privilege Reward Cards */}
          <div className="space-y-3 pt-1">
            <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-cyan-600" />
              <span>Privilege Rewards (Auto Credited to Wallet)</span>
            </h4>

            {/* Level-Up Cash Reward Card */}
            <div className="p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={vipLevelUpGift}
                  alt="Level-Up Gift"
                  className="w-16 h-16 rounded-2xl object-cover border border-cyan-200 shadow-xs flex-shrink-0 bg-white"
                />
                <div className="min-w-0">
                  <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                    <span>Level-Up Cash Reward</span>
                  </div>
                  <div className="text-base font-black text-cyan-700 mt-0.5 font-mono tabular-nums">
                    ৳{currentTier.levelUpBonus.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Auto-credited when VIP {currentTier.level} unlocks
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleClaim('levelUp', currentTier.levelUpBonus)}
                disabled={!isUnlocked || isLevelUpClaimed}
                className={`px-3.5 py-2 rounded-xl font-black text-[11px] shadow-xs transition-all flex-shrink-0 ${
                  isLevelUpClaimed
                    ? 'bg-emerald-100 text-emerald-700'
                    : isUnlocked
                    ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLevelUpClaimed
                  ? getTranslation(language, 'claimed')
                  : isUnlocked
                  ? getTranslation(language, 'claim')
                  : getTranslation(language, 'locked')}
              </button>
            </div>

            {/* Monthly VIP Salary Card */}
            {currentTier.level >= 2 && (
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={vipMonthlyChest}
                    alt="Monthly VIP Chest"
                    className="w-16 h-16 rounded-2xl object-cover border border-teal-200 shadow-xs flex-shrink-0 bg-white"
                  />
                  <div className="min-w-0">
                    <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span>Monthly VIP Salary</span>
                    </div>
                    <div className="text-base font-black text-teal-700 mt-0.5 font-mono tabular-nums">
                      {currentTier.monthlyBonus === 0 ? '৳00' : `৳${currentTier.monthlyBonus.toLocaleString()}`}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {currentTier.monthlyBonus === 0
                        ? 'Monthly VIP salary starts from VIP 2'
                        : 'Auto-credited every 30 days to wallet'}
                    </div>
                  </div>
                </div>

                {currentTier.monthlyBonus === 0 ? (
                  <span className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-500 font-black text-xs flex-shrink-0">
                    ৳00
                  </span>
                ) : (
                  <button
                    onClick={() => handleClaim('monthly', currentTier.monthlyBonus)}
                    disabled={!isUnlocked || isMonthlyCreditedForCycle}
                    className={`px-3.5 py-2 rounded-xl font-black text-[11px] shadow-xs transition-all flex-shrink-0 ${
                      isMonthlyCreditedForCycle
                        ? 'bg-emerald-100 text-emerald-700'
                        : isUnlocked
                        ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isMonthlyCreditedForCycle
                      ? getTranslation(language, 'claimed')
                      : isUnlocked
                      ? getTranslation(language, 'claim')
                      : getTranslation(language, 'locked')}
                  </button>
                )}
              </div>
            )}

            {/* Safe Vault & Game Rebate perks */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Safe Vault Daily Interest</span>
                </div>
                <div className="text-sm font-black text-slate-900 font-mono">
                  {currentTier.safeInterest} / day
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Game Betting Rebate</span>
                </div>
                <div className="text-sm font-black text-slate-900 font-mono">
                  {currentTier.rebateRate} daily
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Complete VIP Level Rules Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-3">
          <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-cyan-600" />
            <span>VIP Level Unlock Tiers &amp; Auto-Credit Rules</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-2 font-semibold">Rank</th>
                  <th className="pb-2 font-semibold">Deposit Needed</th>
                  <th className="pb-2 font-semibold">Level Bonus</th>
                  <th className="pb-2 font-semibold text-right">Monthly Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {VIP_TIERS.map((t) => (
                  <tr
                    key={t.level}
                    onClick={() => setSelectedVipLevel(t.level)}
                    className={`cursor-pointer ${selectedVipLevel === t.level ? 'bg-cyan-50 font-bold' : ''}`}
                  >
                    <td className="py-2 text-slate-900 font-black">
                      <div className="flex items-center gap-1.5">
                        <VipBadgeImg
                          src={t.badgeImage}
                          alt={`VIP ${t.level}`}
                          className="w-6 h-6 object-contain flex-shrink-0"
                          fallbackSize="w-4 h-4"
                        />
                        <span>VIP {t.level}</span>
                      </div>
                    </td>
                    <td className="py-2 text-slate-600">৳{t.requiredDeposit.toLocaleString()}</td>
                    <td className="py-2 text-cyan-700 font-bold">৳{t.levelUpBonus.toLocaleString()}</td>
                    <td className="py-2 text-right font-bold">
                      {t.level === 1 ? (
                        <span className="text-slate-400 font-sans text-[10px]">No Monthly</span>
                      ) : t.monthlyBonus === 0 ? (
                        <span className="text-slate-500">৳00</span>
                      ) : (
                        <span className="text-emerald-600">৳{t.monthlyBonus.toLocaleString()}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
