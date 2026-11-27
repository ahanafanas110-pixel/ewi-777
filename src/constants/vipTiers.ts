export interface VipTierConfig {
  level: number;
  requiredDeposit: number;
  requiredExp: number;
  levelUpBonus: number;
  monthlyBonus: number;
  safeInterest: string;
  rebateRate: string;
  badgeColor: string;
  badgeImage: string;
  title: string;
  description: string;
}

export function getVipBadgeImage(level: number): string {
  const clamped = Math.max(1, Math.min(9, Math.round(level || 1)));
  return `/assets/vip/vip-${clamped}.png`;
}

export const VIP_TIERS: VipTierConfig[] = [
  {
    level: 1,
    requiredDeposit: 2000,
    requiredExp: 10000,
    levelUpBonus: 100,
    monthlyBonus: 0,
    safeInterest: '0.20%',
    rebateRate: '0.40%',
    badgeColor: 'from-slate-400 to-slate-500',
    badgeImage: '/assets/vip/vip-1.png',
    title: 'Silver Elite',
    description: 'Deposit ৳2,000 to auto-unlock VIP 1 & receive ৳100 Level-Up Bonus',
  },
  {
    level: 2,
    requiredDeposit: 5000,
    requiredExp: 50000,
    levelUpBonus: 200,
    monthlyBonus: 80,
    safeInterest: '0.30%',
    rebateRate: '0.50%',
    badgeColor: 'from-cyan-500 to-teal-600',
    badgeImage: '/assets/vip/vip-2.png',
    title: 'Gold Star',
    description: 'Deposit ৳5,000 to unlock VIP 2: ৳200 Level-Up + ৳80 Monthly Salary',
  },
  {
    level: 3,
    requiredDeposit: 15000,
    requiredExp: 200000,
    levelUpBonus: 500,
    monthlyBonus: 188,
    safeInterest: '0.40%',
    rebateRate: '0.60%',
    badgeColor: 'from-emerald-500 to-green-600',
    badgeImage: '/assets/vip/vip-3.png',
    title: 'Platinum Master',
    description: 'Deposit ৳15,000 to unlock VIP 3: ৳500 Level-Up + ৳188 Monthly Salary',
  },
  {
    level: 4,
    requiredDeposit: 50000,
    requiredExp: 500000,
    levelUpBonus: 1200,
    monthlyBonus: 388,
    safeInterest: '0.50%',
    rebateRate: '0.70%',
    badgeColor: 'from-cyan-500 to-blue-600',
    badgeImage: '/assets/vip/vip-4.png',
    title: 'Diamond King',
    description: 'Deposit ৳50,000 to unlock VIP 4: ৳1,200 Level-Up + ৳388 Monthly Salary',
  },
  {
    level: 5,
    requiredDeposit: 150000,
    requiredExp: 1500000,
    levelUpBonus: 2800,
    monthlyBonus: 888,
    safeInterest: '0.60%',
    rebateRate: '0.85%',
    badgeColor: 'from-purple-500 to-indigo-600',
    badgeImage: '/assets/vip/vip-5.png',
    title: 'Crown Master',
    description: 'Deposit ৳150,000 to unlock VIP 5: ৳2,800 Level-Up + ৳888 Monthly Salary',
  },
  {
    level: 6,
    requiredDeposit: 500000,
    requiredExp: 5000000,
    levelUpBonus: 6800,
    monthlyBonus: 1888,
    safeInterest: '0.80%',
    rebateRate: '1.00%',
    badgeColor: 'from-teal-500 to-cyan-700',
    badgeImage: '/assets/vip/vip-6.png',
    title: 'Grandmaster Lord',
    description: 'Deposit ৳500,000 to unlock VIP 6: ৳6,800 Level-Up + ৳1,888 Monthly Salary',
  },
  {
    level: 7,
    requiredDeposit: 1500000,
    requiredExp: 15000000,
    levelUpBonus: 15800,
    monthlyBonus: 3888,
    safeInterest: '1.00%',
    rebateRate: '1.30%',
    badgeColor: 'from-violet-600 to-purple-800',
    badgeImage: '/assets/vip/vip-7.png',
    title: 'Supreme Elite',
    description: 'Deposit ৳1,500,000 to unlock VIP 7: ৳15,800 Level-Up + ৳3,888 Monthly Salary',
  },
  {
    level: 8,
    requiredDeposit: 5000000,
    requiredExp: 50000000,
    levelUpBonus: 38800,
    monthlyBonus: 8888,
    safeInterest: '1.30%',
    rebateRate: '1.80%',
    badgeColor: 'from-sky-600 to-indigo-700',
    badgeImage: '/assets/vip/vip-8.png',
    title: 'Imperial Legend',
    description: 'Deposit ৳5,000,000 to unlock VIP 8: ৳38,800 Level-Up + ৳8,888 Monthly Salary',
  },
  {
    level: 9,
    requiredDeposit: 15000000,
    requiredExp: 150000000,
    levelUpBonus: 88800,
    monthlyBonus: 18888,
    safeInterest: '1.80%',
    rebateRate: '2.50%',
    badgeColor: 'from-slate-800 via-cyan-700 to-teal-700',
    badgeImage: '/assets/vip/vip-9.png',
    title: 'Royal Sovereign VIP',
    description: 'Deposit ৳15,000,000 to unlock VIP 9: ৳88,800 Level-Up + ৳18,888 Monthly Salary',
  },
];
