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
import { VIP_TIERS } from '../constants/vipTiers';
import { DepositPastelIcon } from '../components/AccountIcons';
import vipLevelUpGift from '../assets/images/vip_levelup_gift_1794826715707.jpg';
import vipMonthlyChest from '../assets/images/vip_monthly_chest_1794826717578.jpg';

export const Vip: React.FC = () => {
  const { user, claimVipReward, setActiveTab, showToast } = useApp();
  const [selectedVipLevel, setSelectedVipLevel] = useState<number>(user.vipLevel || 1);

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
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      {/* Luxury Gold Header */}
      <div className="bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] px-4 pt-3 pb-8 text-white rounded-b-[2rem] shadow-md">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setActiveTab('account');
              window.location.hash = '#/account';
            }}
            className="p-1 -ml-1 text-white hover:opacity-80 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-1.5 font-black text-lg tracking-wide">
            <Award className="w-5 h-5 text-yellow-200" />
            <span>VIP PRIVILEGE CLUB (1-10)</span>
          </div>
          <div className="w-6" />
        </div>

        <div className="bg-white rounded-2xl p-4 text-slate-800 shadow-sm grid grid-cols-2 divide-x divide-amber-100">
          <div className="text-center pr-2">
            <div className="text-base font-black text-[#D97706]">
              ৳{userDeposited.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Total Deposits</div>
          </div>
          <div className="text-center pl-2">
            <div className="text-base font-black text-slate-800">
              <span className="text-lg text-emerald-600 font-black">VIP {user.vipLevel}</span> Active
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Current Rank</div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Horizontal VIP 1 to 10 Selector Pills */}
        <div className="bg-white rounded-3xl p-2.5 shadow-xs border border-amber-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2 px-1">
            <span>Select VIP Tier:</span>
            <span className="text-[11px] text-[#D97706] font-bold">Auto-Unlock on Deposit</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {VIP_TIERS.map((tier) => {
              const tierUnlocked = user.vipLevel >= tier.level;
              const isSelected = selectedVipLevel === tier.level;
              return (
                <button
                  key={tier.level}
                  onClick={() => setSelectedVipLevel(tier.level)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white shadow-md scale-102'
                      : tierUnlocked
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50/70 text-slate-600 hover:bg-amber-100/70 border border-amber-200'
                  }`}
                >
                  {tierUnlocked ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 opacity-60" />
                  )}
                  <span>VIP{tier.level}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected VIP Tier Card */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentTier.badgeColor} text-white flex flex-col items-center justify-center shadow-md font-black`}
              >
                <Award className="w-5 h-5" />
                <span className="text-[11px] tracking-tight">VIP {currentTier.level}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-800">{currentTier.title}</h3>
                  {isUnlocked ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px] flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Unlocked
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#B45309] font-bold text-[10px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{currentTier.description}</div>
              </div>
            </div>
          </div>

          {/* Deposit Requirement Progress Bar */}
          <div className="p-3.5 rounded-2xl bg-[#FFFDF7] border border-amber-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Required Deposit to Unlock</span>
              <span className="font-mono font-black text-[#D97706]">
                ৳{currentTier.requiredDeposit.toLocaleString()}
              </span>
            </div>

            <div className="w-full bg-amber-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#D97706] to-[#FBBF24] h-full rounded-full transition-all"
                style={{ width: `${depositProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>Deposited: ৳{userDeposited.toLocaleString()}</span>
              {isUnlocked ? (
                <span className="text-emerald-600 font-bold">Auto-Unlocked!</span>
              ) : (
                <span className="text-[#D97706] font-bold">Need ৳{depositNeeded.toLocaleString()} more</span>
              )}
            </div>

            {!isUnlocked && (
              <button
                onClick={() => {
                  setActiveTab('deposit');
                  window.location.hash = '#/deposit';
                }}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <DepositPastelIcon size={18} />
                <span>Deposit ৳{depositNeeded.toLocaleString()} to Auto-Unlock VIP{currentTier.level}</span>
              </button>
            )}
          </div>

          {/* Privilege Reward Cards with Custom Artwork */}
          <div className="space-y-3 pt-1">
            <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#D97706]" />
              <span>Privilege Rewards (Auto Credited to Wallet)</span>
            </h4>

            {/* Level-Up Cash Reward Card with Gold Gift Image */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 to-yellow-50/70 border border-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={vipLevelUpGift}
                  alt="Level-Up Gift"
                  className="w-16 h-16 rounded-2xl object-cover border border-amber-300 shadow-sm flex-shrink-0 bg-white"
                />
                <div className="min-w-0">
                  <div className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Level-Up Cash Reward</span>
                  </div>
                  <div className="text-base font-black text-[#B45309] mt-0.5 font-mono">
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
                className={`px-3.5 py-2 rounded-full font-black text-[11px] shadow-xs transition-all flex-shrink-0 ${
                  isLevelUpClaimed
                    ? 'bg-emerald-100 text-emerald-700'
                    : isUnlocked
                    ? 'bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLevelUpClaimed ? 'Credited ✓' : isUnlocked ? 'Claim' : 'Locked'}
              </button>
            </div>

            {/* Monthly VIP Salary Card with Gold Chest Image */}
            {currentTier.level >= 2 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 to-yellow-50/70 border border-amber-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={vipMonthlyChest}
                    alt="Monthly VIP Chest"
                    className="w-16 h-16 rounded-2xl object-cover border border-amber-300 shadow-sm flex-shrink-0 bg-white"
                  />
                  <div className="min-w-0">
                    <div className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Monthly VIP Salary</span>
                    </div>
                    <div className="text-base font-black text-[#B45309] mt-0.5 font-mono">
                      {currentTier.monthlyBonus === 0 ? '৳00' : `৳${currentTier.monthlyBonus.toLocaleString()}`}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {currentTier.monthlyBonus === 0
                        ? 'Monthly VIP salary starts from VIP 3'
                        : 'Auto-credited every 30 days to wallet'}
                    </div>
                  </div>
                </div>

                {currentTier.monthlyBonus === 0 ? (
                  <span className="px-3.5 py-2 rounded-full bg-slate-100 text-slate-500 font-black text-xs flex-shrink-0">
                    ৳00
                  </span>
                ) : (
                  <button
                    onClick={() => handleClaim('monthly', currentTier.monthlyBonus)}
                    disabled={!isUnlocked || isMonthlyCreditedForCycle}
                    className={`px-3.5 py-2 rounded-full font-black text-[11px] shadow-xs transition-all flex-shrink-0 ${
                      isMonthlyCreditedForCycle
                        ? 'bg-emerald-100 text-emerald-700'
                        : isUnlocked
                        ? 'bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isMonthlyCreditedForCycle
                      ? 'Credited ✓'
                      : isUnlocked
                      ? 'Claim'
                      : 'Locked'}
                  </button>
                )}
              </div>
            )}

            {/* Safe Vault & Game Rebate perks */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-white border border-amber-200 space-y-1">
                <div className="text-slate-500 font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Safe Vault Daily Interest</span>
                </div>
                <div className="text-sm font-black text-slate-800 font-mono">
                  {currentTier.safeInterest} / day
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-amber-200 space-y-1">
                <div className="text-slate-500 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Game Betting Rebate</span>
                </div>
                <div className="text-sm font-black text-slate-800 font-mono">
                  {currentTier.rebateRate} daily
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Complete VIP Level Rules Breakdown */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-200 space-y-3">
          <h3 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#D97706]" />
            <span>VIP Level Unlock Tiers &amp; Auto-Credit Rules</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Deposit Needed</th>
                  <th className="pb-2 font-medium">Level Bonus</th>
                  <th className="pb-2 font-medium text-right">Monthly Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-mono">
                {VIP_TIERS.map((t) => (
                  <tr
                    key={t.level}
                    onClick={() => setSelectedVipLevel(t.level)}
                    className={`cursor-pointer ${selectedVipLevel === t.level ? 'bg-amber-50 font-bold' : ''}`}
                  >
                    <td className="py-2 text-slate-800 font-black">VIP {t.level}</td>
                    <td className="py-2 text-slate-600">৳{t.requiredDeposit.toLocaleString()}</td>
                    <td className="py-2 text-[#D97706] font-bold">৳{t.levelUpBonus.toLocaleString()}</td>
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
