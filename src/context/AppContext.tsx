import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  ReferralMember,
  Transaction,
  DepositRequest,
  WinGoBet,
  WinGoResult,
  WinGoMode,
  WinGoMarketState,
  Candle,
  BinaryOptionBet,
  AttendanceDay,
  AdminSettings,
  Language,
  WinGoPopupResult,
  AviatorBet,
  AppNotification,
  WithdrawRequest,
  GameItem,
  BroadcastNotice,
  BinaryMarketQuote,
  SupportMessage,
  K3Mode,
  D5Mode,
  K3Result,
  K3Bet,
  D5Result,
  D5Bet,
  AdminAccessLog
} from '../types';
import confetti from 'canvas-confetti';
import {
  checkBoundWalletInFirebase,
  saveBoundWalletInFirebase,
  subscribeAppSettingsInFirebase,
  saveAppSettingsToFirebase,
  getAppSettingsFromFirebase,
  subscribeUsersInFirebase,
  saveUserToFirebase,
  updateUserInFirebase,
  deleteUserFromFirebase,
  fetchAllUsersFromFirebase,
  subscribeDepositsInFirebase,
  saveDepositToFirebase,
  updateDepositInFirebase,
  subscribeWithdrawsInFirebase,
  saveWithdrawToFirebase,
  updateWithdrawInFirebase,
  subscribeSupportMessagesInFirebase,
  saveSupportMessageToFirebase,
  savePasswordRequestToFirebase,
  subscribeWingoBetsInFirebase,
  saveWingoBetToFirebase,
  subscribeTransactionsInFirebase,
  saveTransactionToFirebase,
  subscribeNotificationsInFirebase,
  saveNotificationToFirebase,
  subscribeAdminAccessLogsInFirebase,
  saveAdminAccessLogToFirebase
} from '../lib/firebase';
import { BINARY_MARKETS, BINARY_MARKET_MAP } from '../constants/markets';
import { VIP_TIERS } from '../constants/vipTiers';
import {
  computeDailyIssueInfo,
  fetchLotteryHistory,
  nextIssueFromLatest
} from '../utils/lotteryApi';
import {
  getSyncedBinarySnapshot,
  getSyncedWinGoNumber,
  subtractPeriodString
} from '../utils/syncedMarkets';

export const ATTENDANCE_TIERS = [
  { day: 1, requiredDeposit: 1000, amount: 20 },
  { day: 2, requiredDeposit: 2000, amount: 40 },
  { day: 3, requiredDeposit: 4000, amount: 80 },
  { day: 4, requiredDeposit: 6000, amount: 150 },
  { day: 5, requiredDeposit: 10000, amount: 300 },
  { day: 6, requiredDeposit: 18000, amount: 600 },
  { day: 7, requiredDeposit: 30000, amount: 1200 },
];

export const getLocalDateStr = (d: Date = new Date()): string => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

interface AppContextType {
  user: User;
  allUsers: User[];
  referrals: ReferralMember[];
  transactions: Transaction[];
  depositRequests: DepositRequest[];
  withdrawRequests: WithdrawRequest[];
  bets: WinGoBet[];
  globalWingoBets: WinGoBet[];
  aviatorBets: AviatorBet[];
  syncServerDataNow: () => Promise<void>;
  historyResults: WinGoResult[];
  activeWingoMode: WinGoMode;
  setActiveWingoMode: (mode: WinGoMode) => void;
  wingoMarkets: Record<WinGoMode, WinGoMarketState>;
  wingoResultPopup: WinGoPopupResult | null;
  clearWingoResultPopup: () => void;
  currentPeriod: string;
  timeRemaining: number;
  binaryBets: BinaryOptionBet[];
  candles: Candle[];
  binaryMarkets: Record<string, BinaryMarketQuote>;
  binaryCandleSecRemaining: number;
  attendance: AttendanceDay[];
  adminSettings: AdminSettings;
  language: Language;
  toastMessage: string | null;
  activeTab: string;
  isNavigating: boolean;
  isAdminLoggedIn: boolean;
  invitationParam: string;
  binaryPrice: number;
  showInstallModal: boolean;
  setShowInstallModal: (open: boolean) => void;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  syncWingoFromApi: (mode?: WinGoMode) => Promise<void>;
  wingoApiStatus: Record<WinGoMode, 'live' | 'syncing' | 'fallback'>;
  wingoLastSyncTime: string | null;
  supportMessages: SupportMessage[];
  sendSupportMessage: (payload: {
    userId: string;
    userUid?: string;
    userNickname?: string;
    userPhone?: string;
    sender: 'user' | 'admin';
    text: string;
    imageUrl?: string;
  }) => Promise<void>;
  historyFilterTab: 'all' | 'deposit' | 'withdraw' | 'rebate' | 'gift' | 'lottery_win';
  setHistoryFilterTab: (tab: 'all' | 'deposit' | 'withdraw' | 'rebate' | 'gift' | 'lottery_win') => void;
  firstDepositModalOpen: boolean;
  setFirstDepositModalOpen: (open: boolean) => void;
  claimExtraFirstDepositBonus: (tierDeposit: number, bonusAmount: number) => { success: boolean; message: string };
  k3Bets: K3Bet[];
  placeK3Bet: (
    mode: K3Mode,
    periodNumber: string,
    betType: string,
    selection: string,
    amount: number,
    multiplier: number,
    payoutRate: number
  ) => { success: boolean; message: string };
  settleK3Round: (mode: K3Mode, periodNumber: string, dice: [number, number, number]) => void;
  d5Bets: D5Bet[];
  placeD5Bet: (
    mode: D5Mode,
    periodNumber: string,
    position: 'A' | 'B' | 'C' | 'D' | 'E' | 'SUM',
    betType: 'size' | 'parity' | 'digit',
    selection: string,
    amount: number,
    multiplier: number,
    payoutRate: number
  ) => { success: boolean; message: string };
  settleD5Round: (mode: D5Mode, periodNumber: string, digits: [number, number, number, number, number]) => void;
  setActiveTab: (tab: string) => void;
  setLanguage: (lang: Language) => void;
  showToast: (msg: string) => void;
  login: (phoneOrEmail: string, pass: string, remember: boolean) => Promise<{ success: boolean; message: string }>;
  register: (phoneOrEmail: string, pass: string, inviteCode?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  adminLogin: (phone: string, pass: string) => Promise<{ success: boolean; message: string; requires2FA?: boolean }>;
  verifyAdmin2FA: (phone: string, pass: string, code: string) => Promise<{ success: boolean; message: string }>;
  adminLogout: () => void;
  adminAccessLogs: AdminAccessLog[];
  logAdminAccessEntry: (
    action: AdminAccessLog['action'],
    phoneAttempt?: string,
    sessionId?: string
  ) => Promise<void>;
  heartbeatAdminAccess: (sessionId: string) => Promise<void>;
  updateAdminSettings: (settings: Partial<AdminSettings>) => void;
  updateNickname: (name: string) => void;
  changeLoginPassword: (currentPassword: string, newPassword: string) => { success: boolean; message: string };
  updateUserAvatar: (avatarDataUrl: string) => void;
  bindWallet: (type: 'bKash' | 'Nagad', number: string, loginPassword: string) => Promise<{ success: boolean; message: string }>;
  submitDepositRequest: (amount: number, method: 'bKash' | 'Nagad' | 'USDT', channel: string, senderNumber: string, trxId: string) => { success: boolean; message: string };
  approveDeposit: (requestId: string) => void;
  rejectDeposit: (requestId: string, note?: string) => void;
  claimDepositBonus: () => { success: boolean; message: string };
  withdraw: (amount: number, method: 'bKash' | 'Nagad', loginPass: string) => { success: boolean; message: string };
  transferSafe: (amount: number, direction: 'in' | 'out') => { success: boolean; message: string };
  claimGiftCode: (code: string) => Promise<{ success: boolean; message: string }>;
  claimAttendanceReward: (day: number) => { success: boolean; message: string };
  claimVipReward: (level: number, type: 'levelUp' | 'monthly', amount: number) => { success: boolean; message: string };
  placeBet: (mode: WinGoMode, type: 'color' | 'number' | 'size', value: string | number, amount: number, multiplier: number) => { success: boolean; message: string };
  placeBinaryTrade: (asset: string, direction: 'UP' | 'DOWN', amount: number, durationSeconds: number) => { success: boolean; message: string };
  placeAviatorBet: (roundId: string, amount: number, autoCashout?: number) => { success: boolean; message: string; betId?: string };
  cashOutAviatorBet: (betId: string, multiplier: number) => { success: boolean; winAmount: number };
  loseAviatorBet: (betId: string) => void;
  placeMinesBet: (amount: number, minesCount: number) => { success: boolean; message: string };
  cashOutMinesWin: (betAmount: number, winAmount: number, multiplier: number, minesCount: number) => { success: boolean; winAmount: number };
  claimAgentSalary: (tierMembers: number, salaryAmount: number) => { success: boolean; message: string };
  claimActivityAward: (missionKey: string, targetBet: number, rewardAmount: number, isDaily: boolean) => { success: boolean; message: string };
  getInviteLink: () => string;
  copyInviteLink: () => void;
  copyInviteCode: () => void;
  setUserTurnover: (userId: string, requiredTurnover: number) => void;
  toggleUserBan: (userId: string, reason?: string) => void;
  adminModifyUserBalance: (userId: string, action: 'add' | 'deduct' | 'set', amount: number, reason?: string) => { success: boolean; message: string };
  adminUpdateUserRole: (userId: string, role: 'USER' | 'VIP' | 'ADMIN') => void;
  adminDeleteUser: (userId: string) => void;
  adminSendUserNotice: (userId: string, message: string) => void;
  updateWithdrawStatus: (id: string, status: 'processing' | 'completed' | 'rejected') => void;
  sendBroadcastNotice: (title: string, message: string, target: 'all' | 'vip' | 'active') => void;
  deleteBroadcastNotice: (id: string) => void;
  requestPasswordRecovery: (phone: string, note?: string) => Promise<{ success: boolean; message: string; password?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const INITIAL_GUEST_USER: User = {
  id: '',
  uid: '',
  phone: '',
  email: '',
  nickname: '',
  avatar: '',
  balance: 0.00,
  safeBalance: 0.00,
  vipLevel: 0,
  exp: 0,
  totalDeposited: 0,
  inviteCode: '',
  lastLogin: '',
  isLoggedIn: false,
  turnoverRequired: 0,
  turnoverCompleted: 0,
  hasClaimedDepositBonus: false,
  illegalBetCount: 0,
  claimedVipBonuses: {},
  vipMonthlyLastClaim: {}
};

export const INITIAL_USER = INITIAL_GUEST_USER;

export const DEFAULT_GAMES: GameItem[] = [
  {
    id: 'game_wingo_30s',
    slug: 'wingo-30s',
    title: 'Win Go 30s',
    imageUrl: '',
    category: 'Lottery',
    badge: 'HOT',
    price: '9X',
    sortOrder: 1,
    active: true,
    featured: true,
    targetTab: 'wingo',
    htmlCode: '<!-- EWI 777 Official WinGo 30s Engine -->\n<div class="ewi-game" data-mode="30s">WinGo 30s Live</div>'
  },
  {
    id: 'game_wingo_1m',
    slug: 'wingo-1m',
    title: 'Win Go 1 Min',
    imageUrl: '',
    category: 'Lottery',
    badge: 'LIVE',
    price: '9X',
    sortOrder: 2,
    active: true,
    featured: false,
    targetTab: 'wingo',
    htmlCode: '<!-- EWI 777 Official WinGo 1m Engine -->\n<div class="ewi-game" data-mode="1m">WinGo 1m Live</div>'
  },
  {
    id: 'game_wingo_3m',
    slug: 'wingo-3m',
    title: 'Win Go 3 Min',
    imageUrl: '',
    category: 'Lottery',
    badge: '9X',
    price: '9X',
    sortOrder: 3,
    active: true,
    featured: false,
    targetTab: 'wingo',
    htmlCode: '<!-- EWI 777 Official WinGo 3m Engine -->\n<div class="ewi-game" data-mode="3m">WinGo 3m Live</div>'
  },
  {
    id: 'game_wingo_5m',
    slug: 'wingo-5m',
    title: 'Win Go 5 Min',
    imageUrl: '',
    category: 'Lottery',
    badge: '9X',
    price: '9X',
    sortOrder: 4,
    active: true,
    featured: false,
    targetTab: 'wingo',
    htmlCode: '<!-- EWI 777 Official WinGo 5m Engine -->\n<div class="ewi-game" data-mode="5m">WinGo 5m Live</div>'
  },
  {
    id: 'game_aviator',
    slug: 'aviator-plane',
    title: 'Aviator Plane',
    imageUrl: '',
    category: 'Crash',
    badge: '10000X',
    price: '10000X',
    sortOrder: 5,
    active: true,
    featured: true,
    targetTab: 'aviator',
    htmlCode: '<!-- EWI 777 Aviator Crash Engine -->\n<div class="ewi-game" data-game="aviator">Aviator Plane Crash</div>'
  },
  {
    id: 'game_binary',
    slug: 'binary-market',
    title: 'Binary Market',
    imageUrl: '',
    category: 'Trading',
    badge: '90%',
    price: '90%',
    sortOrder: 6,
    active: true,
    featured: true,
    targetTab: 'binary',
    htmlCode: '<!-- EWI 777 Binary Market Engine -->\n<div class="ewi-game" data-game="binary">Binary Trading Live</div>'
  },
  {
    id: 'game_mines',
    slug: 'mines-777',
    title: 'Mines 777',
    imageUrl: '',
    category: 'Casino',
    badge: 'NEW',
    price: '24X+',
    sortOrder: 7,
    active: true,
    featured: true,
    targetTab: 'mines',
    htmlCode: '<!-- EWI 777 Mines Treasure Engine -->\n<div class="ewi-game" data-game="mines">Mines 777 Live</div>'
  },
  {
    id: 'game_k3',
    slug: 'k3-lottery',
    title: 'K3 Lottery',
    imageUrl: '',
    category: 'Lottery',
    badge: '207X',
    price: '207X',
    sortOrder: 8,
    active: true,
    featured: true,
    targetTab: 'k3',
    htmlCode: '<!-- EWI 777 K3 Dice Lottery Engine -->\n<div class="ewi-game" data-game="k3">K3 Dice Live</div>'
  },
  {
    id: 'game_5d',
    slug: '5d-lottery',
    title: '5D Lottery',
    imageUrl: '',
    category: 'Lottery',
    badge: '9X',
    price: '9X',
    sortOrder: 9,
    active: true,
    featured: true,
    targetTab: '5d',
    htmlCode: '<!-- EWI 777 5D Number Lottery Engine -->\n<div class="ewi-game" data-game="5d">5D Lottery Live</div>'
  }
];

export const DEFAULT_ADMIN_PHONE_HASH = '0aab39f411ae77619215a3cd679005519c52baa0758214ec51901ea355d006f1';
export const DEFAULT_ADMIN_PASS_HASH = '07882c957ec3bb16b8f5ec021707910625689e5e011811ce855fb5aeeddc1874';

// Pure deterministic SHA-256 hex digest (works cleanly in HTTPS, HTTP LAN, and SSR)
export function sha256HexSync(ascii: string): string {
  const utf8 = unescape(encodeURIComponent(ascii));
  const words: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  const bitLen = utf8.length * 8;
  words[bitLen >> 5] |= 0x80 << (24 - (bitLen % 32));
  words[(((bitLen + 64) >> 9) << 4) + 15] = bitLen;

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const w = new Array<number>(64);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) w[t] = words[i + t] | 0;
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, w[t - 15]) ^ rotr(18, w[t - 15]) ^ (w[t - 15] >>> 3);
      const s1 = rotr(17, w[t - 2]) ^ rotr(19, w[t - 2]) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

function sanitizeGatewayNumber(val: unknown): string {
  const str = String(val || '').trim();
  if (!str) return '';
  const digits = str.replace(/[\s\-().]/g, '');
  const norm =
    digits.startsWith('+8800') ? '0' + digits.slice(5)
    : digits.startsWith('+880') ? '0' + digits.slice(4)
    : digits.startsWith('8800') ? '0' + digits.slice(4)
    : digits.startsWith('880') ? '0' + digits.slice(3)
    : /^1[3-9]\d{8}$/.test(digits) ? '0' + digits
    : digits;
  return sha256HexSync(norm) === DEFAULT_ADMIN_PHONE_HASH ? '' : str;
}

function sanitizeBannerListClient(list: any): AdminSettings['banners'] {
  if (!Array.isArray(list)) return DEFAULT_BANNERS;
  return list
    .map((b: any) => {
      const url = String(b?.url || '');
      if (url.includes('image_06ccef65.png')) {
        return { ...b, url: '/assets/brand/welcome-200-banner.png' };
      }
      return b;
    })
    .slice(0, 10);
}

function maskPhoneForAudit(phone: string): string {
  const clean = String(phone || '').trim();
  if (!clean) return '';
  if (sha256HexSync(normalizePhone(clean)) === DEFAULT_ADMIN_PHONE_HASH) return 'ADM-PRIMARY';
  if (clean.length <= 5) return '***';
  return `${clean.slice(0, 3)}****${clean.slice(-2)}`;
}

export const DEFAULT_BANNERS = [
  {
    id: 'ban_ewi777_official',
    title: 'EWI 777 Official Crown Event',
    url: '/ewi777-banner.jpg',
    link: '#/wingo',
    sortOrder: 1,
    active: true
  },
  {
    id: 'ban_welcome_200_bonus',
    title: 'EWI 777 Welcome Bonus up to 200%',
    url: '/assets/brand/welcome-200-banner.png',
    link: '#/deposit',
    sortOrder: 2,
    active: true
  },
  {
    id: 'ban_ewi777_asia_welcome',
    title: "EWI 777 — Welcome to Asia's Best Entertainment Website",
    url: '/ewi777-asia-banner.jpg',
    link: '#/wingo',
    sortOrder: 3,
    active: true
  }
];

const INITIAL_ADMIN_SETTINGS: AdminSettings = {
  bkashNumber: '',
  nagadNumber: '',
  rocketNumber: '',
  usdtAddress: '',
  minWithdraw: 100,
  referCommissionPercent: 10,
  depositInstructions: 'Deposits are currently disabled by Administration (NOW NOT AVAILABLE). Please contact Customer Service for updates.',
  nextWingoOutcome: 'AUTO',
  nextWingoOutcomes: {
    '30s': 'AUTO',
    '1m': 'AUTO',
    '3m': 'AUTO',
    '5m': 'AUTO'
  },
  queuedWingoOutcomes: {},
  wingoSyncPath: 'wingo',
  wingoPattern: '1,2,3,4,5',
  showTopEarners: false,
  appName: 'EWI 777',
  appLogoUrl: '',
  supportLink: '',
  supportPhone: '',
  depositEnabled: false,
  withdrawEnabled: true,
  giftCodeEnabled: true,
  registrationEnabled: true,
  maintenanceMode: false,
  marqueeText: 'Notice: Welcome to EWI 777 online entertainment. Instant referral commission, 24/7 fast withdrawals via Nagad & bKash. Live synchronized WinGo, K3, 5D, Aviator, Mines & Binary Trading!',
  popupTitle: 'Welcome to EWI 777',
  popupMessage: '',
  enableSystemPopup: false,
  banners: DEFAULT_BANNERS,
  bannersCustomized: false,
  activeGiftCodes: [],
  games: DEFAULT_GAMES,
  broadcasts: [],
  adminPhoneHash: DEFAULT_ADMIN_PHONE_HASH,
  adminPasswordHash: DEFAULT_ADMIN_PASS_HASH
};

const INITIAL_REFERRALS: ReferralMember[] = [
  {
    id: 'ref_1',
    referrerCode: '1623059',
    phone: '017***9481',
    uid: '1849102',
    nickname: 'Rahim***88',
    registrationDate: '2026-10-19 14:22:10',
    commission: 420.50,
    depositAmount: 5000,
    level: 1,
    status: 'active'
  },
  {
    id: 'ref_2',
    referrerCode: '1623059',
    phone: '018***3320',
    uid: '1904128',
    nickname: 'Karim***07',
    registrationDate: '2026-10-18 19:40:15',
    commission: 850.00,
    depositAmount: 10000,
    level: 1,
    status: 'active'
  },
  {
    id: 'ref_3',
    referrerCode: '1623059',
    phone: '019***1294',
    uid: '2019483',
    nickname: 'Hasan***99',
    registrationDate: '2026-10-17 11:15:32',
    commission: 120.00,
    depositAmount: 2000,
    level: 1,
    status: 'active'
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [];

// Helper to calculate VIP level based on cumulative deposits
export const calculateVipFromDeposit = (totalDeposited: number): number => {
  if (totalDeposited >= 15000000) return 10;
  if (totalDeposited >= 5000000) return 9;
  if (totalDeposited >= 1500000) return 8;
  if (totalDeposited >= 500000) return 7;
  if (totalDeposited >= 150000) return 6;
  if (totalDeposited >= 50000) return 5;
  if (totalDeposited >= 15000) return 4;
  if (totalDeposited >= 5000) return 3;
  if (totalDeposited >= 2000) return 2;
  if (totalDeposited >= 500) return 1;
  return 0;
};

// Generate shared deterministic candlesticks for all 17 Binary Trading markets prior to first server poll
const buildSeedBinaryMarkets = (): Record<string, BinaryMarketQuote> => {
  return getSyncedBinarySnapshot(BINARY_MARKETS, Date.now()).markets;
};

export const PUBLIC_UNAUTH_TABS = new Set([
  'home',
  'login',
  'register',
  'registration',
  'customer-service',
  'admin'
]);

const MONTHLY_VIP_MS = 30 * 24 * 60 * 60 * 1000;

// Auto-unlock VIP tier from cumulative deposits & auto-credit eligible Level-Up + Monthly Salary bonuses
export function applyAutoVipRewards(targetUser: User): {
  updatedUser: User;
  newTxs: Transaction[];
  newNotifs: AppNotification[];
  totalCredited: number;
} {
  if (!targetUser || !targetUser.id) {
    return { updatedUser: targetUser, newTxs: [], newNotifs: [], totalCredited: 0 };
  }

  const totalDep = Number(targetUser.totalDeposited) || 0;
  const computedLevel = Math.max(targetUser.vipLevel || 0, calculateVipFromDeposit(totalDep));
  const claimed = { ...(targetUser.claimedVipBonuses || {}) };
  const monthlyLast = { ...(targetUser.vipMonthlyLastClaim || {}) };
  const now = Date.now();
  const timeStr = new Date(now).toLocaleString();

  let runningBal = Number(targetUser.balance) || 0;
  let totalCredited = 0;
  const newTxs: Transaction[] = [];
  const newNotifs: AppNotification[] = [];

  for (const tier of VIP_TIERS) {
    if (tier.level > computedLevel) break;

    const lvlKey = `levelUp_${tier.level}`;
    if (!claimed[lvlKey] && tier.levelUpBonus > 0) {
      claimed[lvlKey] = true;
      runningBal = +(runningBal + tier.levelUpBonus).toFixed(2);
      totalCredited = +(totalCredited + tier.levelUpBonus).toFixed(2);
      newTxs.unshift({
        id: `tx_${now}_viplvl_${tier.level}`,
        userId: targetUser.id,
        type: 'vip_bonus',
        title: `VIP ${tier.level} Level-Up Bonus (Auto Unlocked)`,
        detail: `Deposit ৳${tier.requiredDeposit.toLocaleString()} reached • +৳${tier.levelUpBonus.toLocaleString()} credited`,
        amount: tier.levelUpBonus,
        balanceAfter: runningBal,
        time: timeStr,
        status: 'success'
      });
      newNotifs.unshift({
        id: `notif_${now}_viplvl_${tier.level}`,
        userId: targetUser.id,
        title: `VIP ${tier.level} Unlocked!`,
        message: `৳${tier.levelUpBonus.toLocaleString()} Level-Up Bonus has been automatically added to your wallet.`,
        type: 'bonus',
        read: false,
        time: timeStr
      });
    }

    if (tier.monthlyBonus > 0) {
      const lastClaimMs = Number(monthlyLast[String(tier.level)] || 0);
      if (now - lastClaimMs >= MONTHLY_VIP_MS) {
        monthlyLast[String(tier.level)] = now;
        claimed[`monthly_${tier.level}`] = true;
        runningBal = +(runningBal + tier.monthlyBonus).toFixed(2);
        totalCredited = +(totalCredited + tier.monthlyBonus).toFixed(2);
        newTxs.unshift({
          id: `tx_${now}_vipmo_${tier.level}`,
          userId: targetUser.id,
          type: 'vip_bonus',
          title: `VIP ${tier.level} Monthly VIP Salary (Auto Credited)`,
          detail: `Monthly VIP${tier.level} salary ৳${tier.monthlyBonus.toLocaleString()} credited to wallet`,
          amount: tier.monthlyBonus,
          balanceAfter: runningBal,
          time: timeStr,
          status: 'success'
        });
        newNotifs.unshift({
          id: `notif_${now}_vipmo_${tier.level}`,
          userId: targetUser.id,
          title: `VIP ${tier.level} Monthly Salary Credited`,
          message: `৳${tier.monthlyBonus.toLocaleString()} Monthly VIP Salary has been automatically added to your wallet.`,
          type: 'bonus',
          read: false,
          time: timeStr
        });
      }
    }
  }

  const changed =
    totalCredited > 0 ||
    computedLevel !== (targetUser.vipLevel || 0) ||
    Object.keys(claimed).length !== Object.keys(targetUser.claimedVipBonuses || {}).length;

  if (!changed) {
    return { updatedUser: targetUser, newTxs: [], newNotifs: [], totalCredited: 0 };
  }

  return {
    updatedUser: {
      ...targetUser,
      vipLevel: computedLevel,
      balance: runningBal,
      claimedVipBonuses: claimed,
      vipMonthlyLastClaim: monthlyLast
    },
    newTxs,
    newNotifs,
    totalCredited
  };
}

// Robust route parsing supporting /#/wallet, #/wallet, /wallet, and enforcing strict auth gate
export const resolveCurrentRoute = (isLoggedIn = true): string => {
  let resolved = 'home';
  try {
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';
    const href = window.location.href || '';
    const full = (hash + ' ' + pathname + ' ' + href).toLowerCase();

    const cleanHash = hash.replace(/^#+/, '').replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '').toLowerCase();
    const cleanPath = pathname.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
    const target = cleanHash || cleanPath;

    if (
      target === 'admin-ewi777-panel-009' ||
      cleanHash === 'admin-ewi777-panel-009' ||
      cleanPath === 'admin-ewi777-panel-009' ||
      full.includes('/admin-ewi777-panel-009') ||
      full.includes('#/admin-ewi777-panel-009')
    ) {
      return 'admin';
    }
    if (target === 'admin' || cleanHash === 'admin' || cleanPath === 'admin') {
      return isLoggedIn ? 'home' : 'login';
    }

    if (target === 'wallet' || cleanHash === 'wallet' || full.includes('/wallet') || full.includes('#/wallet')) resolved = 'wallet';
    else if (target === 'deposit' || cleanHash === 'deposit' || full.includes('/deposit') || full.includes('#/deposit')) resolved = 'deposit';
    else if (target === 'safe' || cleanHash === 'safe' || full.includes('/safe') || full.includes('#/safe')) resolved = 'safe';
    else if (target === 'vip' || cleanHash === 'vip' || full.includes('/vip') || full.includes('#/vip')) resolved = 'vip';
    else if (target === 'wingo' || cleanHash === 'wingo' || full.includes('/wingo') || full.includes('#/wingo')) resolved = 'wingo';
    else if (target === 'aviator' || target === 'aviator-plane' || cleanHash === 'aviator' || full.includes('/aviator') || full.includes('#/aviator')) resolved = 'aviator';
    else if (target === 'binary' || target === 'binary-market' || cleanHash === 'binary' || full.includes('/binary') || full.includes('#/binary')) resolved = 'binary';
    else if (target === 'activity' || cleanHash === 'activity' || full.includes('/activity') || full.includes('#/activity')) resolved = 'activity';
    else if (target === 'promotion' || cleanHash === 'promotion' || full.includes('/promotion') || full.includes('invite')) resolved = 'promotion';
    else if (target === 'account' || cleanHash === 'account' || full.includes('/account')) resolved = 'account';
    else if (target === 'login' || cleanHash === 'login' || full.includes('/login') || full.includes('#/login')) resolved = 'login';
    else if (target === 'register' || target === 'registration' || cleanHash === 'register' || full.includes('/register') || full.includes('#/register')) resolved = 'register';
    else if (target === 'transaction-history' || cleanHash === 'transaction-history' || full.includes('/transaction-history') || full.includes('#/transaction-history')) resolved = 'transaction-history';
    else if (target === 'customer-service' || cleanHash === 'customer-service' || full.includes('/customer-service') || full.includes('#/customer-service')) resolved = 'customer-service';
    else if (target === 'salary' || cleanHash === 'salary' || full.includes('/salary') || full.includes('#/salary')) resolved = 'salary';
    else if (target === 'gifts' || cleanHash === 'gifts' || full.includes('/gifts') || full.includes('#/gifts')) resolved = 'gifts';
    else if (target === 'attendence' || target === 'attendance' || cleanHash === 'attendence' || cleanHash === 'attendance' || full.includes('/attendence') || full.includes('/attendance')) resolved = 'attendence';
    else if (target === 'change-nickname' || cleanHash === 'change-nickname' || full.includes('/change-nickname') || full.includes('#/change-nickname')) resolved = 'change-nickname';
    else if (target === 'change-login-password' || cleanHash === 'change-login-password' || full.includes('/change-login-password') || full.includes('#/change-login-password')) resolved = 'change-login-password';
    else if (target === 'language' || cleanHash === 'language' || full.includes('/language') || full.includes('#/language')) resolved = 'language';
    else if (target === 'mines' || cleanHash === 'mines' || full.includes('/mines') || full.includes('#/mines')) resolved = 'mines';
    else if (target === 'k3' || cleanHash === 'k3' || full.includes('/k3') || full.includes('#/k3')) resolved = 'k3';
    else if (target === '5d' || cleanHash === '5d' || full.includes('/5d') || full.includes('#/5d')) resolved = '5d';
    else if (target === 'deposit-history' || cleanHash === 'deposit-history' || target === 'withdraw-history' || cleanHash === 'withdraw-history') resolved = 'transaction-history';
    else if (target === 'game-statistics' || cleanHash === 'game-statistics') resolved = 'wingo';
    else if (target === 'activity-award' || cleanHash === 'activity-award' || full.includes('/activity-award') || full.includes('#/activity-award')) resolved = 'activity-award';
    else if (target === 'betting-rebate' || cleanHash === 'betting-rebate' || full.includes('/betting-rebate') || full.includes('#/betting-rebate')) resolved = 'betting-rebate';
    else if (target === 'super-jackpot' || cleanHash === 'super-jackpot' || full.includes('/super-jackpot') || full.includes('#/super-jackpot')) resolved = 'super-jackpot';
    else if (target === 'first-gift' || cleanHash === 'first-gift' || full.includes('/first-gift') || full.includes('#/first-gift')) resolved = 'first-gift';
  } catch {}

  if (!isLoggedIn && !PUBLIC_UNAUTH_TABS.has(resolved)) {
    return 'login';
  }
  return resolved;
};

// Utility to normalize Bangladeshi phone numbers (01XXXXXXXXX)
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+8800')) cleaned = '0' + cleaned.slice(5);
  else if (cleaned.startsWith('+880')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('8800')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('880')) cleaned = '0' + cleaned.slice(3);
  else if (/^1[3-9]\d{8}$/.test(cleaned)) cleaned = '0' + cleaned;
  return cleaned;
};

// Calculate WinGo payout for a candidate number given current pending bets
export const calculateWinGoPayoutForNumber = (candidate: number, periodBets: WinGoBet[]): number => {
  let payout = 0;
  const size: 'big' | 'small' = candidate >= 5 ? 'big' : 'small';

  for (const bet of periodBets) {
    if (bet.type === 'number') {
      if (Number(bet.value) === candidate) {
        payout += bet.totalAmount * 9;
      }
    } else if (bet.type === 'size') {
      if (bet.value === size) {
        payout += bet.totalAmount * 2;
      }
    } else if (bet.type === 'color') {
      if (bet.value === 'green') {
        if ([1, 3, 7, 9].includes(candidate)) payout += bet.totalAmount * 2;
        else if (candidate === 5) payout += bet.totalAmount * 1.5;
      } else if (bet.value === 'red') {
        if ([2, 4, 6, 8].includes(candidate)) payout += bet.totalAmount * 2;
        else if (candidate === 0) payout += bet.totalAmount * 1.5;
      } else if (bet.value === 'violet') {
        if ([0, 5].includes(candidate)) payout += bet.totalAmount * 4.5;
      }
    }
  }
  return payout;
};

// Select the outcome that has the LEAST money wagered/payout; if 0 bets, random 0-9
export const getLeastBetWinningNumber = (periodBets: WinGoBet[]): number => {
  if (!periodBets || periodBets.length === 0) {
    return Math.floor(Math.random() * 10);
  }

  let minPayout = Infinity;
  let bestCandidates: number[] = [];

  for (let candidate = 0; candidate <= 9; candidate++) {
    const payout = calculateWinGoPayoutForNumber(candidate, periodBets);
    if (payout < minPayout) {
      minPayout = payout;
      bestCandidates = [candidate];
    } else if (payout === minPayout) {
      bestCandidates.push(candidate);
    }
  }

  return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
};

// Deterministic period number & countdown generator aligned with daily UTC schedule
export function getWingoPeriodForTime(mode: WinGoMode, timestampMs: number = Date.now()) {
  const info = computeDailyIssueInfo('wingo', mode, timestampMs);
  const d = new Date(timestampMs);
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const epochSec = Math.floor(timestampMs / 1000);
  const duration = info.dur;
  const modeCode = mode === '30s' ? '30' : mode === '1m' ? '01' : mode === '3m' ? '03' : '05';
  const periodIndex = Math.floor(epochSec / duration);
  return { period: info.period, periodIndex, rem: info.rem, duration, ymd, modeCode };
}

export const WINGO_API_SEGMENTS: Record<WinGoMode, string> = {
  '30s': 'WinGo_30S',
  '1m': 'WinGo_1M',
  '3m': 'WinGo_3M',
  '5m': 'WinGo_5M'
};

export const WINGO_MODES: WinGoMode[] = ['30s', '1m', '3m', '5m'];

function deriveWingoMeta(num: number): { color: WinGoResult['color']; size: 'big' | 'small' } {
  const safeNum = Math.min(9, Math.max(0, Math.round(num)));
  let color: WinGoResult['color'];
  if (safeNum === 0) color = 'red-violet';
  else if (safeNum === 5) color = 'green-violet';
  else if ([1, 3, 7, 9].includes(safeNum)) color = 'green';
  else color = 'red';
  return { color, size: safeNum >= 5 ? 'big' : 'small' };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always safely merge loaded user with defaults; starts logged out by default for fresh sessions
  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('win777_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isLoggedIn && parsed.phone) {
          return {
            ...INITIAL_GUEST_USER,
            ...parsed,
            balance: Number(parsed.balance) || 0,
            safeBalance: Number(parsed.safeBalance) || 0,
            totalDeposited: Number(parsed.totalDeposited) || 0,
            turnoverRequired: Number(parsed.turnoverRequired) || 0,
            turnoverCompleted: Number(parsed.turnoverCompleted) || 0,
          };
        }
      }
    } catch {}
    return INITIAL_GUEST_USER;
  });

  // Only real registered users are maintained
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('win777_all_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((u: User) => u && (u.phone || u.email));
        }
      }
    } catch {}
    return [];
  });

  // Persistent registry of all bKash and Nagad numbers ever added on the platform (1 number = 1 use only)
  const [globalBoundNumbers, setGlobalBoundNumbers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_all_bound_numbers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('ewi777_all_bound_numbers', JSON.stringify(globalBoundNumbers));
  }, [globalBoundNumbers]);

  const [referrals, setReferrals] = useState<ReferralMember[]>(() => {
    try {
      const saved = localStorage.getItem('win777_referrals');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_REFERRALS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('win777_transactions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TRANSACTIONS;
  });

  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>(() => {
    try {
      const saved = localStorage.getItem('win777_deposit_requests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_withdraw_requests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    try {
      const saved = localStorage.getItem('win777_admin_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const legacyCodes = new Set(['EWI777', 'WIN777', 'VIP777', 'WELCOME']);
        const cleanedCodes = Array.isArray(parsed.activeGiftCodes)
          ? parsed.activeGiftCodes.filter((c: any) => c && (c.createdAt || !legacyCodes.has(String(c.code || '').toUpperCase())))
          : [];
        const loadedGamesRaw =
          Array.isArray(parsed.games) && parsed.games.length > 0 ? parsed.games : DEFAULT_GAMES;
        const withNewGames = [...loadedGamesRaw];
        for (const dg of DEFAULT_GAMES) {
          if (!withNewGames.some((g: GameItem) => g.id === dg.id)) {
            withNewGames.push(dg);
          }
        }
        const loadedGames = withNewGames.map((g: GameItem) =>
          g.id === 'game_aviator' ? { ...g, badge: '10000X', price: '10000X' } : g
        );
        const hasLegacyRetiredBanner =
          Array.isArray(parsed.banners) &&
          parsed.banners.some((b: any) => String(b?.url || '').includes('image_3c433c14'));
        const hasCustomBanners = Boolean(parsed.bannersCustomized) && !hasLegacyRetiredBanner;
        const loadedBanners = hasCustomBanners
          ? sanitizeBannerListClient(parsed.banners)
          : DEFAULT_BANNERS;
        const { adminPhone: _legacyP, adminPassword: _legacyPw, ...cleanParsed } = parsed;
        const adminPhoneHash =
          parsed.adminPhoneHash ||
          (_legacyP ? sha256HexSync(normalizePhone(String(_legacyP))) : DEFAULT_ADMIN_PHONE_HASH);
        const adminPasswordHash =
          parsed.adminPasswordHash ||
          (_legacyPw ? sha256HexSync(String(_legacyPw)) : DEFAULT_ADMIN_PASS_HASH);
        return {
          ...INITIAL_ADMIN_SETTINGS,
          ...cleanParsed,
          bkashNumber: sanitizeGatewayNumber(cleanParsed.bkashNumber),
          nagadNumber: sanitizeGatewayNumber(cleanParsed.nagadNumber),
          supportPhone: sanitizeGatewayNumber(cleanParsed.supportPhone),
          adminPhoneHash,
          adminPasswordHash,
          activeGiftCodes: cleanedCodes,
          games: loadedGames,
          banners: loadedBanners,
          bannersCustomized: hasCustomBanners
        };
      }
    } catch {}
    return INITIAL_ADMIN_SETTINGS;
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('win777_admin_auth') === 'true';
  });

  const [adminAccessLogs, setAdminAccessLogs] = useState<AdminAccessLog[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_admin_access_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('win777_language') as Language) || 'en';
  });

  const [activeTab, setActiveTabRaw] = useState<string>(() => resolveCurrentRoute(user.isLoggedIn));
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [invitationParam, setInvitationParam] = useState<string>('');
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [wingoResultPopup, setWingoResultPopup] = useState<WinGoPopupResult | null>(null);
  const clearWingoResultPopup = () => setWingoResultPopup(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_support_messages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [historyFilterTab, setHistoryFilterTab] = useState<
    'all' | 'deposit' | 'withdraw' | 'rebate' | 'gift' | 'lottery_win'
  >('all');
  const [firstDepositModalOpen, setFirstDepositModalOpen] = useState<boolean>(false);
  const [k3Bets, setK3Bets] = useState<K3Bet[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_k3_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [d5Bets, setD5Bets] = useState<D5Bet[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_d5_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // 4 Independent WinGo Markets state (30s, 1m, 3m, 5m)
  const [activeWingoMode, setActiveWingoMode] = useState<WinGoMode>('30s');
  const [wingoApiStatus, setWingoApiStatus] = useState<Record<WinGoMode, 'live' | 'syncing' | 'fallback'>>({
    '30s': 'syncing',
    '1m': 'syncing',
    '3m': 'syncing',
    '5m': 'syncing'
  });
  const [wingoLastSyncTime, setWingoLastSyncTime] = useState<string | null>(null);

  const [wingoMarkets, setWingoMarkets] = useState<Record<WinGoMode, WinGoMarketState>>(() => {
    const initial: Record<WinGoMode, WinGoMarketState> = {} as any;
    WINGO_MODES.forEach((mode) => {
      const { period, periodIndex, rem, duration, ymd, modeCode } = getWingoPeriodForTime(mode);
      const history: WinGoResult[] = [];
      for (let i = 1; i <= 50; i++) {
        const histPeriod = `${ymd}${modeCode}${String((periodIndex - i) % 100000).padStart(5, '0')}`;
        const num = getSyncedWinGoNumber(mode, histPeriod);
        const { color, size } = deriveWingoMeta(num);
        history.push({
          periodNumber: histPeriod,
          number: num,
          color,
          size,
          time: new Date(Date.now() - i * duration * 1000).toTimeString().slice(0, 8),
          mode
        });
      }
      initial[mode] = {
        period,
        timeRemaining: rem,
        durationSeconds: duration,
        history
      };
    });
    return initial;
  });

  const [bets, setBets] = useState<WinGoBet[]>(() => {
    try {
      const saved = localStorage.getItem('win777_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [globalWingoBets, setGlobalWingoBets] = useState<WinGoBet[]>([]);
  const globalWingoBetsRef = useRef<WinGoBet[]>([]);
  globalWingoBetsRef.current = globalWingoBets;

  // Shared Multi-Asset Binary Markets state (all 17 markets synced globally across phones)
  const [binaryMarkets, setBinaryMarkets] = useState<Record<string, BinaryMarketQuote>>(() =>
    buildSeedBinaryMarkets()
  );
  const [binaryCandleSecRemaining, setBinaryCandleSecRemaining] = useState<number>(() =>
    Math.max(1, 8 - (Math.floor(Date.now() / 1000) % 8))
  );
  const candles = binaryMarkets['BTC/USDT']?.candles || [];
  const binaryPrice = binaryMarkets['BTC/USDT']?.price ?? 89450.25;

  const [binaryBets, setBinaryBets] = useState<BinaryOptionBet[]>(() => {
    try {
      const saved = localStorage.getItem('win777_binary_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [aviatorBets, setAviatorBets] = useState<AviatorBet[]>(() => {
    try {
      const saved = localStorage.getItem('win777_aviator_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Compute Daily Attendance days dynamically from user's deposit & consecutive check-in state
  const attendance: AttendanceDay[] = React.useMemo(() => {
    const today = getLocalDateStr();
    const yesterday = getLocalDateStr(new Date(Date.now() - 86400000));
    const attState = user.attendanceState || { claimedDays: [], streak: 0 };
    const claimedDays = Array.isArray(attState.claimedDays) ? attState.claimedDays : [];
    const lastClaimDate = attState.lastClaimDate;
    const claimedToday = lastClaimDate === today;
    const missedDay = Boolean(lastClaimDate && lastClaimDate !== today && lastClaimDate !== yesterday);
    const totalDep = Number(user.totalDeposited) || 0;

    // Next eligible day in [1..7] that hasn't been claimed yet (each day 1-time claim per user)
    // If streak was broken (missedDay) and Day 1 was not claimed, Day 1 is next;
    // If Day 1 was already claimed earlier, the next unclaimed day opens after today's deposit or consecutive sequence.
    const nextUnclaimed = ATTENDANCE_TIERS.find((t) => !claimedDays.includes(t.day))?.day ?? null;

    return ATTENDANCE_TIERS.map((tier) => {
      const isClaimed = claimedDays.includes(tier.day);
      if (isClaimed) {
        return {
          day: tier.day,
          requiredDeposit: tier.requiredDeposit,
          amount: tier.amount,
          claimed: true,
          status: 'claimed' as const,
          lockReason: 'Claimed'
        };
      }

      if (!user.isLoggedIn) {
        return {
          day: tier.day,
          requiredDeposit: tier.requiredDeposit,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: 'Login required'
        };
      }

      if (totalDep <= 0) {
        return {
          day: tier.day,
          requiredDeposit: tier.requiredDeposit,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: 'No deposit history'
        };
      }

      if (claimedToday) {
        return {
          day: tier.day,
          requiredDeposit: tier.requiredDeposit,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: 'Unlocks tomorrow'
        };
      }

      if (tier.day !== nextUnclaimed) {
        return {
          day: tier.day,
          requiredDeposit: tier.requiredDeposit,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: `Claim Day ${nextUnclaimed} first`
        };
      }

      if (missedDay && attState.lastDepositDate !== today && totalDep < tier.requiredDeposit) {
        return {
          day: tier.day,
          requiredDeposit: tier.requiredDeposit,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: `Need ৳${tier.requiredDeposit.toLocaleString()}+ deposit`
        };
      }

      if (totalDep < tier.requiredDeposit) {
        return {
          day: tier.day,
          requiredDeposit: tier.requiredDeposit,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: `Deposit ৳${tier.requiredDeposit.toLocaleString()}+ required`
        };
      }

      return {
        day: tier.day,
        requiredDeposit: tier.requiredDeposit,
        amount: tier.amount,
        claimed: false,
        status: 'available' as const
      };
    });
  }, [user.isLoggedIn, user.totalDeposited, user.attendanceState]);

  // Persist states
  useEffect(() => {
    localStorage.setItem('win777_current_user', JSON.stringify(user));
    if (user.isLoggedIn && user.id) {
      setAllUsers((prev) => {
        const exists = prev.some((u) => u.id === user.id);
        if (!exists) return prev;
        return prev.map((u) => (u.id === user.id ? { ...u, ...user } : u));
      });
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('win777_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem('win777_admin_settings', JSON.stringify(adminSettings));
  }, [adminSettings]);

  useEffect(() => {
    localStorage.setItem('win777_admin_auth', isAdminLoggedIn ? 'true' : 'false');
  }, [isAdminLoggedIn]);

  useEffect(() => {
    localStorage.setItem('win777_deposit_requests', JSON.stringify(depositRequests));
  }, [depositRequests]);

  useEffect(() => {
    localStorage.setItem('ewi777_withdraw_requests', JSON.stringify(withdrawRequests));
  }, [withdrawRequests]);

  useEffect(() => {
    localStorage.setItem('win777_referrals', JSON.stringify(referrals));
  }, [referrals]);

  useEffect(() => {
    localStorage.setItem('win777_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('win777_bets', JSON.stringify(bets));
  }, [bets]);

  useEffect(() => {
    localStorage.setItem('win777_aviator_bets', JSON.stringify(aviatorBets));
  }, [aviatorBets]);

  useEffect(() => {
    localStorage.setItem('win777_binary_bets', JSON.stringify(binaryBets));
  }, [binaryBets]);

  useEffect(() => {
    localStorage.setItem('win777_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('ewi777_notifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('ewi777_support_messages', JSON.stringify(supportMessages.slice(-250)));
  }, [supportMessages]);

  useEffect(() => {
    localStorage.setItem('ewi777_k3_bets', JSON.stringify(k3Bets.slice(0, 150)));
  }, [k3Bets]);

  useEffect(() => {
    localStorage.setItem('ewi777_d5_bets', JSON.stringify(d5Bets.slice(0, 150)));
  }, [d5Bets]);

  useEffect(() => {
    localStorage.setItem('ewi777_admin_access_logs', JSON.stringify(adminAccessLogs.slice(0, 200)));
  }, [adminAccessLogs]);

  const addNotification = (payload: Omit<AppNotification, 'id' | 'userId' | 'read' | 'time'>) => {
    const uid = userRef.current.id;
    if (!uid) return;
    const entry: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      title: payload.title,
      message: payload.message,
      reason: payload.reason,
      type: payload.type,
      read: false,
      time: new Date().toLocaleString()
    };
    setNotifications((prev) => [entry, ...prev].slice(0, 50));
    saveNotificationToFirebase(entry).catch(() => {});
  };

  const markNotificationsRead = () => {
    const uid = userRef.current.id;
    if (!uid) return;
    setNotifications((prev) =>
      prev.map((n) => (n.userId === uid || n.userId === 'ALL' ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    const uid = userRef.current.id;
    if (!uid) return;
    setNotifications((prev) => prev.filter((n) => n.userId && n.userId !== uid && n.userId !== 'ALL'));
  };

  // Central Server Synchronizer (Real-time 1.5s sync across all phones & Admin Panel)
  const syncServerDataFnRef = useRef<(() => Promise<void>) | null>(null);
  const lastSettingsPushAtRef = useRef<number>(0);
  const lastUsersMutationAtRef = useRef<number>(0);
  const lastDepositsMutationAtRef = useRef<number>(0);
  const lastWithdrawsMutationAtRef = useRef<number>(0);
  const deletedUserIdsRef = useRef<Set<string>>(new Set());

  const syncServerDataNow = async () => {
    if (syncServerDataFnRef.current) {
      await syncServerDataFnRef.current();
    }
  };

  useEffect(() => {
    const syncServerData = async () => {
      const pollStartedAt = Date.now();
      try {
        const [depRes, wdRes, setRes, usrRes, wBetRes, csRes] = await Promise.all([
          fetch('/api/deposits', { cache: 'no-store' }).catch(() => null),
          fetch('/api/withdraws', { cache: 'no-store' }).catch(() => null),
          fetch('/api/settings', { cache: 'no-store' }).catch(() => null),
          fetch('/api/users', { cache: 'no-store' }).catch(() => null),
          fetch('/api/wingo/bets', { cache: 'no-store' }).catch(() => null),
          fetch('/api/support/messages', { cache: 'no-store' }).catch(() => null),
        ]);

        const csCt = csRes?.headers.get('content-type') || '';
        if (csRes && csRes.ok && csCt.includes('application/json')) {
          const csData = await csRes.json();
          if (csData && Array.isArray(csData.messages)) {
            setSupportMessages((prev) => {
              const map = new Map(prev.map((m) => [m.id, m]));
              let changed = false;
              for (const m of csData.messages) {
                if (m?.id && !map.has(m.id)) {
                  map.set(m.id, m);
                  changed = true;
                }
              }
              if (!changed && prev.length === map.size) return prev;
              return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            });
          }
        }

        const depCt = depRes?.headers.get('content-type') || '';
        if (depRes && depRes.ok && depCt.includes('application/json') && lastDepositsMutationAtRef.current < pollStartedAt && Date.now() - lastDepositsMutationAtRef.current > 2500) {
          const data = await depRes.json();
          if (data && Array.isArray(data.deposits)) {
            setDepositRequests((prev) => {
              const prevMap = new Map(prev.map((d) => [d.id, d]));
              let hasChange = false;
              for (const sDep of data.deposits) {
                if (!prevMap.has(sDep.id) || prevMap.get(sDep.id)?.status !== sDep.status) {
                  prevMap.set(sDep.id, sDep);
                  hasChange = true;
                }
              }
              if (!hasChange && prev.length === prevMap.size) return prev;
              return Array.from(prevMap.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
            });
          }
        }

        const wdCt = wdRes?.headers.get('content-type') || '';
        if (wdRes && wdRes.ok && wdCt.includes('application/json') && lastWithdrawsMutationAtRef.current < pollStartedAt && Date.now() - lastWithdrawsMutationAtRef.current > 2500) {
          const wData = await wdRes.json();
          if (wData && Array.isArray(wData.withdraws)) {
            setWithdrawRequests((prev) => {
              const prevMap = new Map(prev.map((w) => [w.id, w]));
              let hasChange = false;
              for (const sw of wData.withdraws) {
                if (!prevMap.has(sw.id) || prevMap.get(sw.id)?.status !== sw.status) {
                  prevMap.set(sw.id, sw);
                  hasChange = true;
                }
              }
              if (!hasChange && prev.length === prevMap.size) return prev;
              return Array.from(prevMap.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
            });
          }
        }

        const wbCt = wBetRes?.headers.get('content-type') || '';
        if (wBetRes && wBetRes.ok && wbCt.includes('application/json')) {
          const wbData = await wBetRes.json();
          if (wbData && Array.isArray(wbData.bets)) {
            setGlobalWingoBets(wbData.bets);
          }
        }

        const setCt = setRes?.headers.get('content-type') || '';
        if (setRes && setRes.ok && setCt.includes('application/json') && lastSettingsPushAtRef.current < pollStartedAt && Date.now() - lastSettingsPushAtRef.current > 2500) {
          const sData = await setRes.json();
          if (sData && sData.settings) {
            setAdminSettings((prev) => {
              const rawGames =
                Array.isArray(sData.settings.games) && sData.settings.games.length > 0
                  ? sData.settings.games
                  : prev.games || DEFAULT_GAMES;
              const mergedGamesList = [...rawGames];
              for (const dg of DEFAULT_GAMES) {
                if (!mergedGamesList.some((g: GameItem) => g.id === dg.id)) {
                  mergedGamesList.push(dg);
                }
              }
              const normalizedGames = mergedGamesList.map((g: GameItem) =>
                g.id === 'game_aviator' ? { ...g, badge: '10000X', price: '10000X' } : g
              );
              const serverHasLegacyBanner =
                Array.isArray(sData.settings.banners) &&
                sData.settings.banners.some((b: any) => String(b?.url || '').includes('image_3c433c14'));
              const serverHasBanners =
                Boolean(sData.settings.bannersCustomized) && !serverHasLegacyBanner;
              const resolvedBanners = serverHasBanners
                ? sanitizeBannerListClient(sData.settings.banners)
                : DEFAULT_BANNERS;
              const { adminPhone: _sp, adminPassword: _spw, ...cleanRemote } = sData.settings;
              const merged: AdminSettings = {
                ...INITIAL_ADMIN_SETTINGS,
                ...cleanRemote,
                bkashNumber: sanitizeGatewayNumber(cleanRemote.bkashNumber),
                nagadNumber: sanitizeGatewayNumber(cleanRemote.nagadNumber),
                supportPhone: sanitizeGatewayNumber(cleanRemote.supportPhone),
                adminPhoneHash:
                  cleanRemote.adminPhoneHash ||
                  (_sp ? sha256HexSync(normalizePhone(String(_sp))) : prev.adminPhoneHash || DEFAULT_ADMIN_PHONE_HASH),
                adminPasswordHash:
                  cleanRemote.adminPasswordHash ||
                  (_spw ? sha256HexSync(String(_spw)) : prev.adminPasswordHash || DEFAULT_ADMIN_PASS_HASH),
                games: normalizedGames,
                banners: resolvedBanners,
                bannersCustomized: serverHasBanners
              };
              if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
              adminSettingsRef.current = merged;
              return merged;
            });
          }
        }

        const logRes = await fetch('/api/admin/access-logs', { cache: 'no-store' }).catch(() => null);
        const logCt = logRes?.headers.get('content-type') || '';
        if (logRes && logRes.ok && logCt.includes('application/json')) {
          const logData = await logRes.json().catch(() => null);
          if (logData && Array.isArray(logData.logs) && logData.logs.length > 0) {
            setAdminAccessLogs((prev) => {
              const map = new Map<string, AdminAccessLog>(prev.map((l) => [l.id, l]));
              let changed = false;
              for (const sl of logData.logs) {
                if (sl?.id && !map.has(sl.id)) {
                  map.set(sl.id, sl);
                  changed = true;
                }
              }
              if (!changed && prev.length === map.size) return prev;
              return Array.from(map.values())
                .sort((a, b) => (Number(b.enteredAtMs) || 0) - (Number(a.enteredAtMs) || 0))
                .slice(0, 200);
            });
          }
        }

        const usrCt = usrRes?.headers.get('content-type') || '';
        if (usrRes && usrRes.ok && usrCt.includes('application/json') && lastUsersMutationAtRef.current < pollStartedAt && Date.now() - lastUsersMutationAtRef.current > 2500) {
          const uData = await usrRes.json();
          if (uData && Array.isArray(uData.users)) {
            setAllUsers((prev) => {
              const map = new Map(prev.map((u) => [u.id, u]));
              let changed = false;
              for (const su of uData.users) {
                if (deletedUserIdsRef.current.has(su.id)) continue;
                const cur = map.get(su.id);
                if (!cur || JSON.stringify(cur) !== JSON.stringify(su)) {
                  map.set(su.id, su);
                  changed = true;
                }
              }
              return changed ? Array.from(map.values()) : prev;
            });

            if (userRef.current.isLoggedIn && userRef.current.id) {
              const matched = uData.users.find((su: User) => su.id === userRef.current.id);
              if (matched) {
                const needsAvatarPush = Boolean(userRef.current.avatar && !matched.avatar);
                if (needsAvatarPush) {
                  fetch('/api/users/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userRef.current.id, patch: { avatar: userRef.current.avatar } })
                  }).catch(() => {});
                  updateUserInFirebase(userRef.current.id, { avatar: userRef.current.avatar }, userRef.current).catch(() => {});
                }
                const resolvedAvatar = matched.avatar || userRef.current.avatar || '';
                const resolvedClaimedFd =
                  matched.claimedFirstDepositTiers || userRef.current.claimedFirstDepositTiers;
                const needsFieldSync =
                  matched.balance !== userRef.current.balance ||
                  matched.totalDeposited !== userRef.current.totalDeposited ||
                  matched.isBanned !== userRef.current.isBanned ||
                  matched.turnoverRequired !== userRef.current.turnoverRequired ||
                  matched.role !== userRef.current.role ||
                  resolvedAvatar !== (userRef.current.avatar || '') ||
                  JSON.stringify(resolvedClaimedFd || {}) !==
                    JSON.stringify(userRef.current.claimedFirstDepositTiers || {});

                const baseUser: User = needsFieldSync
                  ? {
                      ...userRef.current,
                      balance: Number(matched.balance) || 0,
                      totalDeposited: Number(matched.totalDeposited) || 0,
                      totalWithdrawn: Number(matched.totalWithdrawn) || userRef.current.totalWithdrawn || 0,
                      vipLevel: matched.vipLevel ?? userRef.current.vipLevel,
                      role: matched.role ?? userRef.current.role,
                      turnoverRequired: Number(matched.turnoverRequired) || 0,
                      isBanned: matched.isBanned,
                      banReason: matched.banReason,
                      avatar: resolvedAvatar,
                      claimedFirstDepositTiers: resolvedClaimedFd
                    }
                  : userRef.current;

                const autoVip = applyAutoVipRewards(baseUser);
                if (needsFieldSync || autoVip.totalCredited > 0 || autoVip.updatedUser.vipLevel !== baseUser.vipLevel) {
                  setUser(autoVip.updatedUser);
                  if (autoVip.newTxs.length > 0) {
                    setTransactions((txs) => [...autoVip.newTxs, ...txs]);
                    autoVip.newTxs.forEach((tx) => saveTransactionToFirebase(tx).catch(() => {}));
                  }
                  if (autoVip.newNotifs.length > 0) {
                    setNotifications((ns) => [...autoVip.newNotifs, ...ns].slice(0, 50));
                    autoVip.newNotifs.forEach((nf) => saveNotificationToFirebase(nf).catch(() => {}));
                  }
                  if (autoVip.totalCredited > 0) {
                    fetch('/api/users/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user: autoVip.updatedUser })
                    }).catch(() => {});
                    saveUserToFirebase(autoVip.updatedUser).catch(() => {});
                  }
                }
              }
            }
          }
        }
      } catch {}
    };

    syncServerDataFnRef.current = syncServerData;
    syncServerData();
    const interval = setInterval(syncServerData, 1500);
    const onFocusOrVisible = () => {
      if (document.visibilityState !== 'hidden') syncServerData();
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, []);

  // Real-Time Firebase Firestore Synchronization Across All Browsers, Mobile Devices & Vercel Deployments
  useEffect(() => {
    // Seed initial appConfig/settings in Firestore once if completely empty
    getAppSettingsFromFirebase()
      .then((existing) => {
        if (!existing) {
          saveAppSettingsToFirebase(adminSettingsRef.current).catch(() => {});
        }
      })
      .catch(() => {});

    const unsubSettings = subscribeAppSettingsInFirebase((remoteSettings) => {
      if (Date.now() - lastSettingsPushAtRef.current < 2200) return;
      setAdminSettings((prev) => {
        const rawGames =
          Array.isArray(remoteSettings.games) && remoteSettings.games.length > 0
            ? remoteSettings.games
            : prev.games || DEFAULT_GAMES;
        const mergedGamesList = [...rawGames];
        for (const dg of DEFAULT_GAMES) {
          if (!mergedGamesList.some((g: GameItem) => g.id === dg.id)) {
            mergedGamesList.push(dg);
          }
        }
        const normalizedGames = mergedGamesList.map((g: GameItem) =>
          g.id === 'game_aviator' ? { ...g, badge: '10000X', price: '10000X' } : g
        );
        const remoteHasLegacyBanner =
          Array.isArray(remoteSettings.banners) &&
          remoteSettings.banners.some((b: any) => String(b?.url || '').includes('image_3c433c14'));
        const remoteHasBanners =
          Boolean(remoteSettings.bannersCustomized) && !remoteHasLegacyBanner;
        const resolvedBanners = remoteHasBanners
          ? sanitizeBannerListClient(remoteSettings.banners)
          : DEFAULT_BANNERS;
        const { adminPhone: _rp, adminPassword: _rpw, ...cleanRemote } = remoteSettings;
        const merged: AdminSettings = {
          ...INITIAL_ADMIN_SETTINGS,
          ...cleanRemote,
          bkashNumber: sanitizeGatewayNumber(cleanRemote.bkashNumber),
          nagadNumber: sanitizeGatewayNumber(cleanRemote.nagadNumber),
          supportPhone: sanitizeGatewayNumber(cleanRemote.supportPhone),
          adminPhoneHash:
            cleanRemote.adminPhoneHash ||
            (_rp ? sha256HexSync(normalizePhone(String(_rp))) : prev.adminPhoneHash || DEFAULT_ADMIN_PHONE_HASH),
          adminPasswordHash:
            cleanRemote.adminPasswordHash ||
            (_rpw ? sha256HexSync(String(_rpw)) : prev.adminPasswordHash || DEFAULT_ADMIN_PASS_HASH),
          games: normalizedGames,
          banners: resolvedBanners,
          bannersCustomized: remoteHasBanners
        };
        if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
        adminSettingsRef.current = merged;
        return merged;
      });
    });

    const unsubUsers = subscribeUsersInFirebase((fbUsers) => {
      if (Date.now() - lastUsersMutationAtRef.current < 2200) return;
      if (!Array.isArray(fbUsers)) return;

      setAllUsers((prev) => {
        const map = new Map(prev.map((u) => [u.id, u]));
        let changed = false;
        for (const fu of fbUsers) {
          if (!fu?.id || deletedUserIdsRef.current.has(fu.id)) continue;
          const cur = map.get(fu.id);
          if (!cur || JSON.stringify(cur) !== JSON.stringify(fu)) {
            map.set(fu.id, fu);
            changed = true;
          }
        }
        return changed ? Array.from(map.values()) : prev;
      });

      if (userRef.current.isLoggedIn && userRef.current.id) {
        const matched = fbUsers.find((fu) => fu.id === userRef.current.id);
        if (matched) {
          const resolvedAvatar = matched.avatar || userRef.current.avatar || '';
          const resolvedClaimedFd =
            matched.claimedFirstDepositTiers || userRef.current.claimedFirstDepositTiers;
          const needsFieldSync =
            matched.balance !== userRef.current.balance ||
            matched.totalDeposited !== userRef.current.totalDeposited ||
            matched.isBanned !== userRef.current.isBanned ||
            matched.turnoverRequired !== userRef.current.turnoverRequired ||
            matched.role !== userRef.current.role ||
            (matched.loginPassword && matched.loginPassword !== userRef.current.loginPassword) ||
            resolvedAvatar !== (userRef.current.avatar || '') ||
            JSON.stringify(resolvedClaimedFd || {}) !==
              JSON.stringify(userRef.current.claimedFirstDepositTiers || {});

          const baseUser: User = needsFieldSync
            ? {
                ...userRef.current,
                balance: Number(matched.balance) || 0,
                totalDeposited: Number(matched.totalDeposited) || 0,
                totalWithdrawn: Number(matched.totalWithdrawn) || userRef.current.totalWithdrawn || 0,
                vipLevel: matched.vipLevel ?? userRef.current.vipLevel,
                role: matched.role ?? userRef.current.role,
                turnoverRequired: Number(matched.turnoverRequired) || 0,
                isBanned: matched.isBanned,
                banReason: matched.banReason,
                loginPassword: matched.loginPassword || userRef.current.loginPassword,
                avatar: resolvedAvatar,
                claimedFirstDepositTiers: resolvedClaimedFd
              }
            : userRef.current;

          const autoVip = applyAutoVipRewards(baseUser);
          if (needsFieldSync || autoVip.totalCredited > 0 || autoVip.updatedUser.vipLevel !== baseUser.vipLevel) {
            setUser(autoVip.updatedUser);
            if (autoVip.newTxs.length > 0) {
              setTransactions((txs) => [...autoVip.newTxs, ...txs]);
              autoVip.newTxs.forEach((tx) => saveTransactionToFirebase(tx).catch(() => {}));
            }
            if (autoVip.newNotifs.length > 0) {
              setNotifications((ns) => [...autoVip.newNotifs, ...ns].slice(0, 50));
              autoVip.newNotifs.forEach((nf) => saveNotificationToFirebase(nf).catch(() => {}));
            }
            if (autoVip.totalCredited > 0) {
              saveUserToFirebase(autoVip.updatedUser).catch(() => {});
            }
          }
        }
      }
    });

    const unsubDeposits = subscribeDepositsInFirebase((fbDeps) => {
      if (Date.now() - lastDepositsMutationAtRef.current < 2200) return;
      setDepositRequests((prev) => {
        const prevMap = new Map(prev.map((d) => [d.id, d]));
        let hasChange = false;
        for (const fd of fbDeps) {
          if (!prevMap.has(fd.id) || prevMap.get(fd.id)?.status !== fd.status) {
            prevMap.set(fd.id, fd);
            hasChange = true;
          }
        }
        if (!hasChange && prev.length === prevMap.size) return prev;
        return Array.from(prevMap.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
      });
    });

    const unsubWithdraws = subscribeWithdrawsInFirebase((fbWds) => {
      if (Date.now() - lastWithdrawsMutationAtRef.current < 2200) return;
      setWithdrawRequests((prev) => {
        const prevMap = new Map(prev.map((w) => [w.id, w]));
        let hasChange = false;
        for (const fw of fbWds) {
          if (!prevMap.has(fw.id) || prevMap.get(fw.id)?.status !== fw.status) {
            prevMap.set(fw.id, fw);
            hasChange = true;
          }
        }
        if (!hasChange && prev.length === prevMap.size) return prev;
        return Array.from(prevMap.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
      });
    });

    const unsubSupport = subscribeSupportMessagesInFirebase((fbMsgs) => {
      setSupportMessages((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        let changed = false;
        for (const m of fbMsgs) {
          if (m?.id && !map.has(m.id)) {
            map.set(m.id, m);
            changed = true;
          }
        }
        if (!changed && prev.length === map.size) return prev;
        return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      });
    });

    const unsubWingoBets = subscribeWingoBetsInFirebase((fbBets) => {
      setGlobalWingoBets((prev) => {
        const map = new Map(prev.map((b) => [b.id, b]));
        let changed = false;
        for (const fb of fbBets) {
          if (!map.has(fb.id) || map.get(fb.id)?.status !== fb.status) {
            map.set(fb.id, fb);
            changed = true;
          }
        }
        if (!changed && prev.length === map.size) return prev;
        return Array.from(map.values())
          .sort((a, b) => (b.id > a.id ? 1 : -1))
          .slice(0, 250);
      });
    });

    const unsubTransactions = subscribeTransactionsInFirebase((fbTxs) => {
      setTransactions((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        let changed = false;
        for (const ft of fbTxs) {
          if (!map.has(ft.id) || map.get(ft.id)?.status !== ft.status) {
            map.set(ft.id, ft);
            changed = true;
          }
        }
        if (!changed && prev.length === map.size) return prev;
        return Array.from(map.values()).sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 350);
      });
    });

    const unsubNotifications = subscribeNotificationsInFirebase((fbNotifs) => {
      setNotifications((prev) => {
        const map = new Map(prev.map((n) => [n.id, n]));
        let changed = false;
        for (const fn of fbNotifs) {
          if (!map.has(fn.id)) {
            map.set(fn.id, fn);
            changed = true;
          }
        }
        if (!changed && prev.length === map.size) return prev;
        return Array.from(map.values()).sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 120);
      });
    });

    const unsubAccessLogs = subscribeAdminAccessLogsInFirebase((fbLogs) => {
      setAdminAccessLogs((prev) => {
        const map = new Map<string, AdminAccessLog>(prev.map((l) => [l.id, l]));
        let changed = false;
        for (const fl of fbLogs) {
          if (fl?.id && !map.has(fl.id)) {
            map.set(fl.id, fl);
            changed = true;
          }
        }
        if (!changed && prev.length === map.size) return prev;
        return Array.from(map.values())
          .sort((a, b) => (Number(b.enteredAtMs) || 0) - (Number(a.enteredAtMs) || 0))
          .slice(0, 200);
      });
    });

    return () => {
      unsubSettings();
      unsubUsers();
      unsubDeposits();
      unsubWithdraws();
      unsubSupport();
      unsubWingoBets();
      unsubTransactions();
      unsubNotifications();
      unsubAccessLogs();
    };
  }, []);

  // Track latest official API issue & next period per WinGo mode
  const apiNextPeriodRef = useRef<Partial<Record<WinGoMode, string>>>({});
  const apiLatestResultsRef = useRef<Partial<Record<WinGoMode, Map<string, number>>>>({});
  const settledPeriodsRef = useRef<Set<string>>(new Set());
  const wingoApiStatusRef = useRef(wingoApiStatus);
  useEffect(() => {
    wingoApiStatusRef.current = wingoApiStatus;
  }, [wingoApiStatus]);

  const fetchWingoModeFromApi = async (mode: WinGoMode): Promise<WinGoResult[] | null> => {
    const fetched = await fetchLotteryHistory('wingo', mode);
    if (!fetched || !Array.isArray(fetched.list) || fetched.list.length === 0) return null;

    const mapped: WinGoResult[] = fetched.list
      .map((item: any) => {
        const issue = String(item?.issueNumber ?? item?.issue ?? item?.periodNumber ?? '').trim();
        const num = Number(item?.number ?? item?.num ?? NaN);
        if (!issue || Number.isNaN(num)) return null;
        const safeNum = Math.min(9, Math.max(0, Math.round(num)));
        const { color, size } = deriveWingoMeta(safeNum);
        return {
          periodNumber: issue,
          number: safeNum,
          color,
          size,
          time: String(item?.time || item?.drawTime || item?.createTime || new Date().toTimeString().slice(0, 8)),
          mode,
          premium: item?.premium !== undefined ? String(item.premium) : undefined,
          source: 'api'
        } as WinGoResult;
      })
      .filter((x): x is WinGoResult => x !== null)
      .slice(0, 50);

    if (mapped.length > 0 && mapped.length < 50) {
      const seen = new Set(mapped.map((m) => m.periodNumber));
      const anchorPeriod = mapped[mapped.length - 1].periodNumber;
      const dur = mode === '30s' ? 30 : mode === '1m' ? 60 : mode === '3m' ? 180 : 300;
      let step = 1;
      while (mapped.length < 50 && step <= 60) {
        const prevIssue = subtractPeriodString(anchorPeriod, step);
        step += 1;
        if (seen.has(prevIssue)) continue;
        seen.add(prevIssue);
        const synNum = getSyncedWinGoNumber(mode, prevIssue);
        const { color, size } = deriveWingoMeta(synNum);
        mapped.push({
          periodNumber: prevIssue,
          number: synNum,
          color,
          size,
          time: new Date(Date.now() - mapped.length * dur * 1000).toTimeString().slice(0, 8),
          mode,
          source: 'local'
        });
      }
    }

    return mapped.length > 0 ? mapped.slice(0, 50) : null;
  };

  const applyResolvedWingoOutcome = (mode: WinGoMode, resolvingPeriod: string, resolvedNumber: number, resolvedTime?: string) => {
    const settleKey = `${mode}:${resolvingPeriod}`;
    if (settledPeriodsRef.current.has(settleKey)) return;
    settledPeriodsRef.current.add(settleKey);
    if (settledPeriodsRef.current.size > 200) {
      const first = settledPeriodsRef.current.values().next().value;
      if (first) settledPeriodsRef.current.delete(first);
    }

    const safeNum = Math.min(9, Math.max(0, Math.round(resolvedNumber)));
    const { color, size } = deriveWingoMeta(safeNum);
    const timeStr = resolvedTime || new Date().toTimeString().slice(0, 8);

    const userRoundBets = betsRef.current.filter(
      (b) =>
        b.periodNumber === resolvingPeriod &&
        b.mode === mode &&
        b.status === 'pending' &&
        (!userRef.current.id || b.userId === userRef.current.id)
    );

    const evalBetOutcome = (b: WinGoBet): { won: boolean; winAmount: number } => {
      let won = false;
      let odds = 2;
      if (b.type === 'number') {
        won = Number(b.value) === safeNum;
        odds = 9;
      } else if (b.type === 'size') {
        won = b.value === size;
        odds = 2;
      } else if (b.type === 'color') {
        if (b.value === 'green') {
          if ([1, 3, 7, 9].includes(safeNum)) {
            won = true;
            odds = 2;
          } else if (safeNum === 5) {
            won = true;
            odds = 1.5;
          }
        } else if (b.value === 'red') {
          if ([2, 4, 6, 8].includes(safeNum)) {
            won = true;
            odds = 2;
          } else if (safeNum === 0) {
            won = true;
            odds = 1.5;
          }
        } else if (b.value === 'violet') {
          if ([0, 5].includes(safeNum)) {
            won = true;
            odds = 4.5;
          }
        }
      }
      return { won, winAmount: won ? +(b.totalAmount * odds).toFixed(2) : 0 };
    };

    let userWinTotal = 0;
    let userWagerTotal = 0;
    for (const ub of userRoundBets) {
      userWagerTotal += ub.totalAmount;
      const { winAmount } = evalBetOutcome(ub);
      userWinTotal += winAmount;
    }

    const settledBetWrites: WinGoBet[] = [];
    setBets((prevBets) =>
      prevBets.map((b) => {
        if (b.periodNumber === resolvingPeriod && b.mode === mode && b.status === 'pending') {
          const { won, winAmount } = evalBetOutcome(b);
          const nextBet: WinGoBet = { ...b, status: won ? ('won' as const) : ('lost' as const), winAmount };
          settledBetWrites.push(nextBet);
          return nextBet;
        }
        return b;
      })
    );
    if (settledBetWrites.length > 0) {
      settledBetWrites.forEach((sb) => saveWingoBetToFirebase(sb).catch(() => {}));
    }

    if (userWinTotal > 0) {
      const nextBal = +(userRef.current.balance + userWinTotal).toFixed(2);
      const nextTurnoverComp = (userRef.current.turnoverCompleted || 0) + userWinTotal;
      setUser((u) => {
        const updated = {
          ...u,
          balance: +(u.balance + userWinTotal).toFixed(2),
          turnoverCompleted: (u.turnoverCompleted || 0) + userWinTotal
        };
        if (updated.id) saveUserToFirebase(updated).catch(() => {});
        return updated;
      });
      if (userRef.current.id) {
        updateUserInFirebase(
          userRef.current.id,
          { balance: nextBal, turnoverCompleted: nextTurnoverComp },
          userRef.current
        ).catch(() => {});
      }
      const winTx: Transaction = {
        id: `tx_${Date.now()}_${mode}`,
        userId: userRef.current.id,
        type: 'lottery_win',
        title: `WinGo ${mode} Prize Won!`,
        detail: `Period ${resolvingPeriod.slice(-5)} Result: ${safeNum} (${color.toUpperCase()})`,
        amount: userWinTotal,
        balanceAfter: nextBal,
        time: new Date().toLocaleString(),
        status: 'success'
      };
      setTransactions((txs) => [winTx, ...txs]);
      saveTransactionToFirebase(winTx).catch(() => {});
      confetti({ particleCount: 75, spread: 65 });
      showToast(`WinGo ${mode} Won! +৳${userWinTotal.toFixed(2)}`);
    }

    if (userRoundBets.length > 0) {
      setWingoResultPopup({
        periodNumber: resolvingPeriod,
        mode,
        status: userWinTotal > 0 ? 'won' : 'lost',
        amount: userWinTotal > 0 ? userWinTotal : userWagerTotal,
        resultNumber: safeNum,
        resultColor: color,
        resultSize: size
      });
    }

    const newResult: WinGoResult = {
      periodNumber: resolvingPeriod,
      number: safeNum,
      color,
      size,
      time: timeStr,
      mode
    };

    setWingoMarkets((prev) => {
      const cur = prev[mode];
      if (!cur) return prev;
      const dedupedHistory = [
        newResult,
        ...cur.history.filter((h) => h.periodNumber !== resolvingPeriod)
      ].slice(0, 50);
      return {
        ...prev,
        [mode]: {
          ...cur,
          history: dedupedHistory
        }
      };
    });
  };

  const syncWingoFromApi = async (targetMode?: WinGoMode) => {
    const targetModes = targetMode ? [targetMode] : WINGO_MODES;
    await Promise.all(
      targetModes.map(async (mode) => {
        setWingoApiStatus((prev) => ({ ...prev, [mode]: prev[mode] === 'live' ? 'live' : 'syncing' }));
        const liveList = await fetchWingoModeFromApi(mode);
        if (!liveList || liveList.length === 0) {
          setWingoApiStatus((prev) => ({ ...prev, [mode]: prev[mode] === 'live' ? 'live' : 'fallback' }));
          return;
        }

        const lookupMap = new Map<string, number>();
        liveList.forEach((item) => lookupMap.set(item.periodNumber, item.number));
        apiLatestResultsRef.current[mode] = lookupMap;

        const latestIssue = liveList[0].periodNumber;
        const nextPeriod = nextIssueFromLatest(latestIssue);
        if (nextPeriod) {
          apiNextPeriodRef.current[mode] = nextPeriod;
        }

        // Reconcile any pending bets whose official API result just arrived
        const pendingForApiIssues = betsRef.current.filter(
          (b) => b.mode === mode && b.status === 'pending' && lookupMap.has(b.periodNumber)
        );
        if (pendingForApiIssues.length > 0) {
          const settledPeriods = new Set<string>();
          pendingForApiIssues.forEach((b) => {
            if (!settledPeriods.has(b.periodNumber)) {
              settledPeriods.add(b.periodNumber);
              const apiNum = lookupMap.get(b.periodNumber);
              const apiRow = liveList.find((x) => x.periodNumber === b.periodNumber);
              if (apiNum !== undefined) {
                applyResolvedWingoOutcome(mode, b.periodNumber, apiNum, apiRow?.time);
              }
            }
          });
        }

        setWingoApiStatus((prev) => ({ ...prev, [mode]: 'live' }));
        setWingoLastSyncTime(new Date().toLocaleTimeString());

        setWingoMarkets((prev) => {
          const cur = prev[mode];
          if (!cur) return prev;
          const nextApiPeriod = apiNextPeriodRef.current[mode] || cur.period;
          return {
            ...prev,
            [mode]: {
              ...cur,
              period: nextApiPeriod,
              history: liveList
            }
          };
        });
      })
    );
  };

  useEffect(() => {
    syncWingoFromApi();
    const apiPoll = setInterval(() => {
      syncWingoFromApi();
    }, 6000);
    return () => clearInterval(apiPoll);
  }, []);

  // Comprehensive URL Routing & Strict Auth Gate (No guest entry to Home, WinGo, Aviator, or Binary)
  useEffect(() => {
    const handleUrlRoute = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      let code = searchParams.get('invitationCode') || searchParams.get('code') || searchParams.get('r_code');

      if (!code && hash.includes('?')) {
        const hashQuery = hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        code = hashParams.get('invitationCode') || hashParams.get('code') || hashParams.get('r_code');
      }

      if (code) {
        setInvitationParam(code);
        sessionStorage.setItem('win777_invite_code', code);
      }

      const pathnameLower = (window.location.pathname || '').toLowerCase();
      const target = resolveCurrentRoute(userRef.current.isLoggedIn);
      setActiveTabRaw(target);
      if (
        !userRef.current.isLoggedIn &&
        target === 'login' &&
        hash !== '#/login' &&
        !hash.toLowerCase().includes('admin-ewi777-panel-009') &&
        !pathnameLower.includes('admin-ewi777-panel-009')
      ) {
        window.location.hash = '#/login';
      }
    };

    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    window.addEventListener('popstate', handleUrlRoute);
    return () => {
      window.removeEventListener('hashchange', handleUrlRoute);
      window.removeEventListener('popstate', handleUrlRoute);
    };
  }, []);

  // Reactive Strict Auth Guard
  useEffect(() => {
    if (!user.isLoggedIn && !PUBLIC_UNAUTH_TABS.has(activeTab)) {
      setActiveTabRaw('login');
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    }
  }, [user.isLoggedIn, activeTab]);

  // Smooth Tab Switcher with strict login guard & hash sync
  const setActiveTab = (tab: string) => {
    const targetTab =
      !userRef.current.isLoggedIn && !PUBLIC_UNAUTH_TABS.has(tab) ? 'login' : tab;
    if (targetTab !== tab) {
      showToast('Please login or register first to access EWI 777 markets!');
    }
    const targetHash =
      targetTab === 'home'
        ? '#/'
        : targetTab === 'admin'
        ? '#/admin-ewi777-panel-009'
        : `#/${targetTab}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    if (targetTab === activeTab) return;
    setIsNavigating(true);
    setTimeout(() => {
      setActiveTabRaw(targetTab);
      setIsNavigating(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 120);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // 1. Shared Multi-Asset Binary Trading Synchronizer (Server API + deterministic Vercel fallback)
  useEffect(() => {
    let active = true;
    const stepLocalBinaryTick = () => {
      if (!active) return;
      const snap = getSyncedBinarySnapshot(BINARY_MARKETS, Date.now());
      setBinaryCandleSecRemaining(snap.candleSecRemaining);
      setBinaryMarkets(snap.markets);
    };

    const syncBinaryFromServer = async () => {
      try {
        const res = await fetch('/api/binary/state', { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          stepLocalBinaryTick();
          return;
        }
        const data = await res.json();
        if (!active || !data?.success || !data.markets) {
          stepLocalBinaryTick();
          return;
        }

        const nextMap: Record<string, BinaryMarketQuote> = {};
        for (const spec of BINARY_MARKETS) {
          const sm = data.markets[spec.symbol];
          if (sm && Array.isArray(sm.candles)) {
            nextMap[spec.symbol] = {
              symbol: spec.symbol,
              price: Number(sm.price),
              candles: sm.candles,
              changePct: Number(sm.changePct || 0)
            };
          }
        }
        if (Object.keys(nextMap).length > 0) {
          setBinaryMarkets((prev) => ({ ...prev, ...nextMap }));
        }
        if (typeof data.candleSecRemaining === 'number') {
          setBinaryCandleSecRemaining(data.candleSecRemaining);
        }
      } catch {
        stepLocalBinaryTick();
      }
    };

    syncBinaryFromServer();
    const poll = setInterval(syncBinaryFromServer, 1000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, []);

  // Track already resolved periods to guarantee each period resolves exactly once
  const lastResolvedPeriodRef = useRef<Record<WinGoMode, string>>({
    '30s': '',
    '1m': '',
    '3m': '',
    '5m': ''
  });
  const betsRef = useRef(bets);
  betsRef.current = bets;
  const adminSettingsRef = useRef(adminSettings);
  adminSettingsRef.current = adminSettings;
  const userRef = useRef(user);
  userRef.current = user;
  const binaryMarketsRef = useRef(binaryMarkets);
  binaryMarketsRef.current = binaryMarkets;

  // 1B. Check and settle active binary bets per asset using shared market price & least-bet rule
  useEffect(() => {
    const binInterval = setInterval(() => {
      const now = Date.now();
      setBinaryBets((prevBets) => {
        const hasExpired = prevBets.some((b) => b.status === 'active' && now >= b.endTime);
        if (!hasExpired) return prevBets;

        let balanceDelta = 0;
        const activeBets = prevBets.filter((b) => b.status === 'active');

        const updated = prevBets.map((bet) => {
          if (bet.status === 'active' && now >= bet.endTime) {
            const spec = BINARY_MARKET_MAP[bet.asset];
            const decimals = spec?.decimals ?? 2;
            const step = spec?.volatility ?? 2.5;
            const liveAssetPrice = binaryMarketsRef.current[bet.asset]?.price ?? bet.entryPrice;

            const assetPool = activeBets.filter((b) => b.asset === bet.asset);
            const totalUp = assetPool.filter((b) => b.direction === 'UP').reduce((s, b) => s + b.amount, 0);
            const totalDown = assetPool.filter((b) => b.direction === 'DOWN').reduce((s, b) => s + b.amount, 0);

            let strikePrice = liveAssetPrice;
            let isWin = false;

            if (totalUp < totalDown) {
              isWin = bet.direction === 'UP';
              strikePrice = +(Math.max(liveAssetPrice, bet.entryPrice + step * (1.2 + Math.random()))).toFixed(decimals);
            } else if (totalDown < totalUp) {
              isWin = bet.direction === 'DOWN';
              strikePrice = +(Math.min(liveAssetPrice, bet.entryPrice - step * (1.2 + Math.random()))).toFixed(decimals);
            } else {
              isWin =
                (bet.direction === 'UP' && strikePrice > bet.entryPrice) ||
                (bet.direction === 'DOWN' && strikePrice < bet.entryPrice);
            }

            if (isWin) {
              const winAmount = +(bet.amount * (1 + bet.payoutRate)).toFixed(2);
              balanceDelta += winAmount;
              return { ...bet, status: 'won' as const, strikePrice, winAmount };
            } else {
              return { ...bet, status: 'lost' as const, strikePrice, winAmount: 0 };
            }
          }
          return bet;
        });

        if (balanceDelta > 0) {
          const nextBal = +(userRef.current.balance + balanceDelta).toFixed(2);
          const nextTurnoverComp = (userRef.current.turnoverCompleted || 0) + balanceDelta;
          setUser((u) => {
            const updated = {
              ...u,
              balance: +(u.balance + balanceDelta).toFixed(2),
              turnoverCompleted: (u.turnoverCompleted || 0) + balanceDelta
            };
            if (updated.id) saveUserToFirebase(updated).catch(() => {});
            return updated;
          });
          if (userRef.current.id) {
            updateUserInFirebase(
              userRef.current.id,
              { balance: nextBal, turnoverCompleted: nextTurnoverComp },
              userRef.current
            ).catch(() => {});
          }
          const winTx: Transaction = {
            id: `tx_${Date.now()}`,
            userId: userRef.current.id,
            type: 'binary_win',
            title: 'Binary Option Win',
            detail: `Market Payout Credited (+৳${balanceDelta.toFixed(2)})`,
            amount: balanceDelta,
            balanceAfter: nextBal,
            time: new Date().toLocaleString(),
            status: 'success'
          };
          setTransactions((txs) => [winTx, ...txs]);
          saveTransactionToFirebase(winTx).catch(() => {});
          confetti({ particleCount: 70, spread: 60 });
          showToast(`Binary Trade Won! +৳${balanceDelta.toFixed(2)}`);
        }

        return updated;
      });
    }, 500);

    return () => clearInterval(binInterval);
  }, []);

  // 2. WinGo: 4 Independent Live Markets (30s, 1m, 3m, 5m) Timer & 100% API Resolver
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const modes: WinGoMode[] = ['30s', '1m', '3m', '5m'];
      const modesToRefresh: WinGoMode[] = [];

      setWingoMarkets((prevMarkets) => {
        const updatedMarkets = { ...prevMarkets };

        modes.forEach((mode) => {
          const current = updatedMarkets[mode];
          if (!current) return;
          const { period: utcPeriod, rem } = getWingoPeriodForTime(mode, now);

          // Active period uses live API next period whenever available
          const activeTargetPeriod = apiNextPeriodRef.current[mode] || utcPeriod;

          // Detect round completion (countdown rolled over to full duration or reached <= 1)
          const rolledOver = rem === current.durationSeconds || current.timeRemaining <= 1;
          const periodChanged =
            (apiNextPeriodRef.current[mode] &&
              apiNextPeriodRef.current[mode] !== current.period &&
              apiLatestResultsRef.current[mode]?.has(current.period)) ||
            (rolledOver && lastResolvedPeriodRef.current[mode] !== current.period);

          if (periodChanged && lastResolvedPeriodRef.current[mode] !== current.period) {
            const resolvingPeriod = current.period;
            lastResolvedPeriodRef.current[mode] = resolvingPeriod;
            modesToRefresh.push(mode);

            const queuedList = adminSettingsRef.current.queuedWingoOutcomes?.[mode];
            const hasQueuedNum = Array.isArray(queuedList) && queuedList.length > 0;
            const outcome =
              adminSettingsRef.current.nextWingoOutcomes?.[mode] ??
              adminSettingsRef.current.nextWingoOutcome ??
              'AUTO';

            const apiOfficialNum = apiLatestResultsRef.current[mode]?.get(resolvingPeriod);

            const hasForcedOutcome =
              typeof outcome === 'number' ||
              outcome === 'GREEN' ||
              outcome === 'RED' ||
              outcome === 'VIOLET' ||
              hasQueuedNum;

            const nextPeriodAfterResolve =
              apiNextPeriodRef.current[mode] && apiNextPeriodRef.current[mode] !== resolvingPeriod
                ? apiNextPeriodRef.current[mode]!
                : nextIssueFromLatest(resolvingPeriod) || utcPeriod;

            const periodHash = resolvingPeriod.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

            if (hasForcedOutcome || apiOfficialNum !== undefined) {
              let resolvedNum = apiOfficialNum ?? periodHash % 10;
              if (typeof outcome === 'number') {
                resolvedNum = Math.min(9, Math.max(0, outcome));
              } else if (outcome === 'GREEN') {
                resolvedNum = [1, 3, 7, 9][periodHash % 4];
              } else if (outcome === 'RED') {
                resolvedNum = [2, 4, 6, 8][periodHash % 4];
              } else if (outcome === 'VIOLET') {
                resolvedNum = periodHash % 2 === 0 ? 0 : 5;
              } else if (hasQueuedNum) {
                resolvedNum = Math.min(9, Math.max(0, Number(queuedList![0])));
                const remainingQueue = queuedList!.slice(1);
                setTimeout(() => {
                  setAdminSettings((prev) => {
                    const next = {
                      ...prev,
                      queuedWingoOutcomes: {
                        ...(prev.queuedWingoOutcomes || {}),
                        [mode]: remainingQueue
                      }
                    };
                    adminSettingsRef.current = next;
                    fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ settings: next })
                    }).catch(() => {});
                    saveAppSettingsToFirebase(next).catch(() => {});
                    return next;
                  });
                }, 0);
              } else if (apiOfficialNum !== undefined) {
                resolvedNum = apiOfficialNum;
              }

              const { color, size } = deriveWingoMeta(resolvedNum);
              const timeStr = new Date(now).toTimeString().slice(0, 8);
              const newResult: WinGoResult = {
                periodNumber: resolvingPeriod,
                number: resolvedNum,
                color,
                size,
                time: timeStr,
                mode
              };

              setTimeout(() => {
                applyResolvedWingoOutcome(mode, resolvingPeriod, resolvedNum, timeStr);
              }, 0);

              const dedupedHistory = [
                newResult,
                ...current.history.filter((h) => h.periodNumber !== resolvingPeriod)
              ].slice(0, 50);

              updatedMarkets[mode] = {
                ...current,
                period: nextPeriodAfterResolve,
                timeRemaining: rem,
                history: dedupedHistory
              };
            } else {
              // 100% API-driven: advance timer & poll API rapidly until official result publishes
              updatedMarkets[mode] = {
                ...current,
                period: nextPeriodAfterResolve,
                timeRemaining: rem
              };

              const pollForOfficial = async (attempt: number) => {
                await syncWingoFromApi(mode);
                const exactNum = apiLatestResultsRef.current[mode]?.get(resolvingPeriod);
                if (exactNum !== undefined) {
                  applyResolvedWingoOutcome(mode, resolvingPeriod, exactNum);
                  return;
                }
                if (attempt < 4) {
                  setTimeout(() => pollForOfficial(attempt + 1), attempt === 1 ? 550 : 900);
                } else {
                  // Fallback to the newest record returned by API if issue ID offset differs slightly
                  const freshList = await fetchWingoModeFromApi(mode);
                  if (freshList && freshList.length > 0) {
                    applyResolvedWingoOutcome(mode, resolvingPeriod, freshList[0].number, freshList[0].time);
                  }
                }
              };
              setTimeout(() => pollForOfficial(1), 300);
            }
          } else {
            updatedMarkets[mode] = {
              ...current,
              period: apiNextPeriodRef.current[mode] || activeTargetPeriod,
              timeRemaining: rem
            };
          }
        });

        return updatedMarkets;
      });

      if (modesToRefresh.length > 0) {
        setTimeout(() => {
          modesToRefresh.forEach((m) => syncWingoFromApi(m));
        }, 1200);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auth: Login (Strictly only registered IDs can log in across server + local; no auto-create)
  const login = async (phoneOrEmail: string, pass: string, _remember: boolean) => {
    if (!phoneOrEmail || !pass) {
      return { success: false, message: 'Please enter phone/email and password' };
    }

    const trimmed = phoneOrEmail.trim();
    const normInput = trimmed.includes('@') ? trimmed.toLowerCase() : normalizePhone(trimmed);

    let existing: User | undefined = allUsers.find((u) => {
      const uPhoneNorm = normalizePhone(u.phone || '');
      const uEmailNorm = (u.email || '').toLowerCase();
      return (normInput && (uPhoneNorm === normInput || uEmailNorm === normInput)) || u.uid === trimmed;
    });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed, password: pass })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || 'Account not found or invalid password. Please register first.'
          };
        }
        if (data.user) {
          existing = data.user;
        }
      }
    } catch {
      // Static deploy / offline fallback uses local allUsers
    }

    if (!existing) {
      try {
        const fbUsers = await fetchAllUsersFromFirebase();
        existing = fbUsers.find((u) => {
          const uPhoneNorm = normalizePhone(u.phone || '');
          const uEmailNorm = (u.email || '').toLowerCase();
          return (normInput && (uPhoneNorm === normInput || uEmailNorm === normInput)) || u.uid === trimmed;
        });
      } catch {}
    }

    if (!existing) {
      return {
        success: false,
        message: 'Account not found! Only registered IDs can log in. Please register first.'
      };
    }

    if (existing.isBanned) {
      showToast('Your account is banned by Administrator! Contact support.');
      return {
        success: false,
        message: `Account is Banned: ${existing.banReason || 'Terms Violation'}. Contact Customer Support.`
      };
    }

    if (existing.loginPassword && existing.loginPassword !== pass) {
      return { success: false, message: 'Incorrect login password! Please try again.' };
    }

    const baseLoggedUser: User = {
      ...INITIAL_USER,
      ...existing,
      balance: Number(existing.balance) || 0,
      safeBalance: Number(existing.safeBalance) || 0,
      totalDeposited: Number(existing.totalDeposited) || 0,
      turnoverRequired: Number(existing.turnoverRequired) || 0,
      turnoverCompleted: Number(existing.turnoverCompleted) || 0,
      lastLogin: new Date().toISOString().replace('T', ' ').slice(0, 19),
      isLoggedIn: true
    };

    const autoVip = applyAutoVipRewards(baseLoggedUser);
    const loggedUser = autoVip.updatedUser;

    if (autoVip.newTxs.length > 0) {
      setTransactions((prev) => [...autoVip.newTxs, ...prev]);
      autoVip.newTxs.forEach((tx) => saveTransactionToFirebase(tx).catch(() => {}));
    }
    if (autoVip.newNotifs.length > 0) {
      setNotifications((prev) => [...autoVip.newNotifs, ...prev].slice(0, 50));
      autoVip.newNotifs.forEach((nf) => saveNotificationToFirebase(nf).catch(() => {}));
    }
    if (autoVip.totalCredited > 0) {
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: loggedUser })
      }).catch(() => {});
    }
    saveUserToFirebase(loggedUser).catch(() => {});

    setAllUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === loggedUser.id);
      if (idx >= 0) {
        return prev.map((u) => (u.id === loggedUser.id ? loggedUser : u));
      }
      return [...prev, loggedUser];
    });
    setUser(loggedUser);
    if (localStorage.getItem('ewi777_fd_hide_date') !== getLocalDateStr()) {
      setFirstDepositModalOpen(true);
    }
    showToast(
      autoVip.totalCredited > 0
        ? `Logged in! VIP Bonus +৳${autoVip.totalCredited.toLocaleString()} auto-credited!`
        : 'Logged in successfully'
    );
    setActiveTab('home');
    window.location.hash = '#/';
    return { success: true, message: 'Success' };
  };

  // Auth: Register (Strict 1 account per phone number; new accounts start with 00 across all balances)
  const register = async (phoneOrEmail: string, pass: string, inviteCode?: string) => {
    if (adminSettings.registrationEnabled === false) {
      return { success: false, message: 'New user registration is currently disabled by Administrator' };
    }
    if (!phoneOrEmail || !pass) {
      return { success: false, message: 'Phone number and password are required' };
    }

    const trimmed = phoneOrEmail.trim();
    const isEmail = trimmed.includes('@');
    const normInput = isEmail ? trimmed.toLowerCase() : normalizePhone(trimmed);

    if (!isEmail && normInput.length < 10) {
      return { success: false, message: 'Please enter a valid mobile number' };
    }

    let existing = allUsers.find((u) => {
      const uPhoneNorm = normalizePhone(u.phone || '');
      const uEmailNorm = (u.email || '').toLowerCase();
      return (normInput && uPhoneNorm === normInput) || (isEmail && uEmailNorm === normInput);
    });

    if (!existing) {
      try {
        const fbUsers = await fetchAllUsersFromFirebase();
        existing = fbUsers.find((u) => {
          const uPhoneNorm = normalizePhone(u.phone || '');
          const uEmailNorm = (u.email || '').toLowerCase();
          return (normInput && uPhoneNorm === normInput) || (isEmail && uEmailNorm === normInput);
        });
      } catch {}
    }

    if (existing) {
      return {
        success: false,
        message: 'This phone number already has an account! 1 number can only register 1 ID.'
      };
    }

    const newUid = Math.floor(1000000 + Math.random() * 9000000).toString();
    const resolvedInviteCode =
      inviteCode?.trim() ||
      invitationParam ||
      sessionStorage.getItem('win777_invite_code') ||
      '';

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uid: newUid,
      phone: !isEmail ? normInput : undefined,
      email: isEmail ? normInput : undefined,
      nickname: (!isEmail ? normInput.slice(0, 5) : 'User_') + newUid.slice(-4),
      avatar: '',
      balance: 0.00,
      safeBalance: 0.00,
      vipLevel: 0,
      exp: 0,
      totalDeposited: 0.00,
      inviteCode: newUid,
      referredBy: resolvedInviteCode || undefined,
      lastLogin: new Date().toISOString().replace('T', ' ').slice(0, 19),
      isLoggedIn: true,
      loginPassword: pass,
      turnoverRequired: 0.00,
      turnoverCompleted: 0.00,
      hasClaimedDepositBonus: false,
      illegalBetCount: 0,
      boundWallets: [],
      attendanceState: {
        claimedDays: [],
        streak: 0
      }
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: newUser })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || 'This number is already registered! Only 1 account per number is allowed.'
          };
        }
      }
    } catch {
      // Static deploy fallback
    }

    if (resolvedInviteCode) {
      const maskedPhone = normInput.length >= 7 ? normInput.slice(0, 3) + '***' + normInput.slice(-4) : normInput;
      const newReferral: ReferralMember = {
        id: `ref_${Date.now()}`,
        referrerCode: resolvedInviteCode,
        phone: maskedPhone,
        uid: newUid,
        nickname: newUser.nickname,
        registrationDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
        commission: 50.00,
        depositAmount: 0,
        level: 1,
        status: 'active'
      };

      setReferrals((prev) => [newReferral, ...prev]);

      setAllUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.inviteCode === resolvedInviteCode || u.uid === resolvedInviteCode) {
            const nextExp = u.exp + 100;
            updateUserInFirebase(u.id, { exp: nextExp }, u).catch(() => {});
            return { ...u, exp: nextExp };
          }
          return u;
        })
      );
    }

    saveUserToFirebase(newUser).catch(() => {});
    setAllUsers((prev) => [...prev, newUser]);
    setUser(newUser);
    setFirstDepositModalOpen(true);
    showToast('Registration successful! Welcome to EWI 777.');
    setActiveTab('home');
    window.location.hash = '#/';
    return { success: true, message: 'Success' };
  };

  const logout = () => {
    setUser((u) => ({ ...u, isLoggedIn: false }));
    setFirstDepositModalOpen(false);
    showToast('Logged out');
    setActiveTab('login');
    window.location.hash = '#/login';
  };

  // Record Visitor IP + Entry Timestamp on /admin-ewi777-panel-009 (synced to Express + Vercel + Firebase)
  const logAdminAccessEntry = async (
    action: AdminAccessLog['action'],
    phoneAttempt?: string,
    sessionId?: string
  ) => {
    const nowMs = Date.now();
    const cleanSession = sessionId
      ? String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
      : '';
    let detectedIp = '';
    try {
      const res = await fetch('/api/admin/access-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(cleanSession ? { sessionId: cleanSession } : {}),
          ...(phoneAttempt ? { phoneAttempt: maskPhoneForAudit(phoneAttempt) } : {})
        })
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.detectedIp && data.detectedIp !== 'Unknown') {
          detectedIp = String(data.detectedIp);
        }
        if (data?.entry?.id) {
          const serverEntry: AdminAccessLog = {
            ...data.entry,
            ...(phoneAttempt ? { phoneAttempt: maskPhoneForAudit(phoneAttempt) } : {})
          };
          setAdminAccessLogs((prev) =>
            [serverEntry, ...prev.filter((l) => l.id !== serverEntry.id)].slice(0, 200)
          );
          saveAdminAccessLogToFirebase(serverEntry).catch(() => {});
          return;
        }
      }
    } catch {}

    if (!detectedIp || detectedIp === '127.0.0.1' || detectedIp === '::1') {
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json', {
          signal: AbortSignal.timeout(2500)
        });
        if (ipRes.ok) {
          const ipJson = await ipRes.json().catch(() => null);
          if (ipJson?.ip) detectedIp = String(ipJson.ip);
        }
      } catch {}
    }

    const entryId =
      cleanSession && action === 'visit'
        ? `log_${cleanSession}`
        : `log_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;

    const entry: AdminAccessLog = {
      id: entryId,
      ...(cleanSession ? { sessionId: cleanSession } : {}),
      ip: detectedIp || 'Unknown',
      enteredAt: new Date(nowMs).toLocaleString('en-GB'),
      enteredAtMs: nowMs,
      lastSeenAtMs: nowMs,
      staySeconds: 0,
      action,
      ...(phoneAttempt ? { phoneAttempt: maskPhoneForAudit(phoneAttempt) } : {}),
      userAgent:
        typeof navigator !== 'undefined' ? String(navigator.userAgent || '').slice(0, 180) : '',
      route: '/admin-ewi777-panel-009'
    };

    setAdminAccessLogs((prev) =>
      [entry, ...prev.filter((l) => l.id !== entry.id)].slice(0, 200)
    );
    saveAdminAccessLogToFirebase(entry).catch(() => {});
  };

  const heartbeatAdminAccess = async (sessionId: string) => {
    const cleanSession = String(sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (!cleanSession) return;
    const nowMs = Date.now();
    let updatedEntry: AdminAccessLog | null = null;
    try {
      const res = await fetch('/api/admin/access-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat', sessionId: cleanSession })
      });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.entry?.id) {
          updatedEntry = data.entry as AdminAccessLog;
        }
      }
    } catch {}

    if (updatedEntry) {
      setAdminAccessLogs((prev) =>
        [updatedEntry!, ...prev.filter((l) => l.id !== updatedEntry!.id)].slice(0, 200)
      );
      saveAdminAccessLogToFirebase(updatedEntry).catch(() => {});
      return;
    }

    setAdminAccessLogs((prev) => {
      const existing = prev.find((l) => l.sessionId === cleanSession && l.action === 'visit');
      if (!existing) return prev;
      const staySeconds = Math.max(0, Math.round((nowMs - (existing.enteredAtMs || nowMs)) / 1000));
      const patched: AdminAccessLog = { ...existing, lastSeenAtMs: nowMs, staySeconds };
      saveAdminAccessLogToFirebase(patched).catch(() => {});
      return [patched, ...prev.filter((l) => l.id !== existing.id)].slice(0, 200);
    });
  };

  // Admin Auth (2-Step: Hash-verified Phone+Pass -> 8-char Rotating 30s 2FA Code verified strictly server-side on /admin-ewi777-panel-009)
  const adminLogin = async (phone: string, pass: string) => {
    const cleanPhone = normalizePhone(phone.trim());
    const cleanPass = String(pass || '');
    if (!/^01[3-9]\d{8}$/.test(cleanPhone) && cleanPhone.length < 7) {
      return { success: false, message: 'Enter a valid Administrator mobile number.' };
    }
    if (cleanPass.length < 4) {
      return { success: false, message: 'Administrator password must be at least 4 characters.' };
    }
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          password: cleanPass,
          route: '/admin-ewi777-panel-009'
        })
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          logAdminAccessEntry('login_step1', cleanPhone).catch(() => {});
          return {
            success: true,
            requires2FA: true,
            message: 'Step 1 verified! Enter the 8-character 2FA code from your Authenticator.'
          };
        }
        logAdminAccessEntry('login_failed', cleanPhone).catch(() => {});
        return { success: false, message: data.message || 'Invalid Admin Phone or Password!' };
      }
      const fbSettings = await getAppSettingsFromFirebase().catch(() => null);
      const expectedPhoneHash =
        fbSettings?.adminPhoneHash ||
        adminSettings.adminPhoneHash ||
        DEFAULT_ADMIN_PHONE_HASH;
      const expectedPassHash =
        fbSettings?.adminPasswordHash ||
        adminSettings.adminPasswordHash ||
        DEFAULT_ADMIN_PASS_HASH;
      if (sha256HexSync(cleanPhone) === expectedPhoneHash && sha256HexSync(cleanPass) === expectedPassHash) {
        logAdminAccessEntry('login_step1', cleanPhone).catch(() => {});
        return { success: true, requires2FA: true, message: 'Enter 8-character 2FA code.' };
      }
      logAdminAccessEntry('login_failed', cleanPhone).catch(() => {});
      return { success: false, message: 'Invalid Admin Phone or Password!' };
    } catch {
      const expectedPhoneHash = adminSettings.adminPhoneHash || DEFAULT_ADMIN_PHONE_HASH;
      const expectedPassHash = adminSettings.adminPasswordHash || DEFAULT_ADMIN_PASS_HASH;
      if (sha256HexSync(cleanPhone) === expectedPhoneHash && sha256HexSync(cleanPass) === expectedPassHash) {
        logAdminAccessEntry('login_step1', cleanPhone).catch(() => {});
        return { success: true, requires2FA: true, message: 'Enter 8-character 2FA code.' };
      }
      logAdminAccessEntry('login_failed', cleanPhone).catch(() => {});
      return { success: false, message: 'Invalid Admin Phone or Password!' };
    }
  };

  const verifyAdmin2FA = async (phone: string, pass: string, code: string) => {
    const cleanPhone = normalizePhone(phone.trim());
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length !== 8) {
      return { success: false, message: 'Enter the exact 8-character 2FA security code.' };
    }
    try {
      const res = await fetch('/api/admin/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          password: pass,
          code: cleanCode,
          route: '/admin-ewi777-panel-009'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.sessionToken) {
          sessionStorage.setItem('ewi777_admin_token', String(data.sessionToken));
        }
        logAdminAccessEntry('login_success', cleanPhone).catch(() => {});
        setIsAdminLoggedIn(true);
        showToast('2FA Verified! Welcome to EWI 777 Super Admin.');
        setActiveTab('admin');
        window.location.hash = '#/admin-ewi777-panel-009';
        return { success: true, message: 'Success' };
      }
      logAdminAccessEntry('login_failed', cleanPhone).catch(() => {});
      return { success: false, message: data.message || 'Invalid or expired 2FA code!' };
    } catch {
      return { success: false, message: 'Unable to reach 2FA verification server.' };
    }
  };

  const adminLogout = () => {
    sessionStorage.removeItem('ewi777_admin_token');
    setIsAdminLoggedIn(false);
    showToast('Admin logged out');
    const nextTab = userRef.current.isLoggedIn ? 'home' : 'login';
    setActiveTab(nextTab);
    window.location.hash = nextTab === 'home' ? '#/' : '#/login';
  };

  const updateAdminSettings = (settings: Partial<AdminSettings>) => {
    lastSettingsPushAtRef.current = Date.now();
    const prev = adminSettingsRef.current;
    const { adminPhone: rawNewPhone, adminPassword: rawNewPass, ...restSettings } = settings;
    const nextPhoneHash =
      settings.adminPhoneHash ||
      (rawNewPhone ? sha256HexSync(normalizePhone(String(rawNewPhone))) : prev.adminPhoneHash || DEFAULT_ADMIN_PHONE_HASH);
    const nextPassHash =
      settings.adminPasswordHash ||
      (rawNewPass ? sha256HexSync(String(rawNewPass)) : prev.adminPasswordHash || DEFAULT_ADMIN_PASS_HASH);
    const next: AdminSettings = {
      ...prev,
      ...restSettings,
      adminPhoneHash: nextPhoneHash,
      adminPasswordHash: nextPassHash,
      ...(Array.isArray(restSettings.banners)
        ? {
            banners: sanitizeBannerListClient(restSettings.banners),
            bannersCustomized:
              restSettings.bannersCustomized !== undefined ? restSettings.bannersCustomized : true
          }
        : {})
    };
    adminSettingsRef.current = next;
    setAdminSettings(next);
    saveAppSettingsToFirebase(next).catch(() => {});
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: next })
    }).catch(() => {});
    showToast('Admin settings updated & synced to Firebase!');
  };

  const updateNickname = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updatedUser: User = { ...userRef.current, nickname: trimmed };
    setUser(updatedUser);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, nickname: trimmed } : u))
    );
    if (updatedUser.id) {
      updateUserInFirebase(updatedUser.id, { nickname: trimmed }, updatedUser).catch(() => {});
      fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: updatedUser.id, patch: { nickname: trimmed } })
      }).catch(() => {});
    }
    showToast('Nickname updated');
  };

  const changeLoginPassword = (currentPassword: string, newPassword: string) => {
    if (!user.isLoggedIn || !user.id) {
      return { success: false, message: 'Please log in first' };
    }
    if (user.loginPassword && user.loginPassword !== currentPassword.trim()) {
      return { success: false, message: 'Current login password is incorrect' };
    }
    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, message: 'New password must be at least 6 characters' };
    }
    const nextPass = newPassword.trim();
    const updatedUser: User = { ...userRef.current, loginPassword: nextPass };
    setUser(updatedUser);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, loginPassword: nextPass } : u))
    );
    updateUserInFirebase(updatedUser.id, { loginPassword: nextPass }, updatedUser).catch(() => {});
    fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: updatedUser.id, patch: { loginPassword: nextPass } })
    }).catch(() => {});
    showToast('Login password changed successfully!');
    return { success: true, message: 'Password updated successfully' };
  };

  const updateUserAvatar = (avatarDataUrl: string) => {
    const updatedUser: User = { ...userRef.current, avatar: avatarDataUrl };
    setUser(updatedUser);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, avatar: avatarDataUrl } : u))
    );
    if (updatedUser.id) {
      updateUserInFirebase(updatedUser.id, { avatar: avatarDataUrl }, updatedUser).catch(() => {});
      fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: updatedUser.id, patch: { avatar: avatarDataUrl } })
      }).catch(() => {});
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: updatedUser })
      }).catch(() => {});
    }
    showToast('Profile photo saved permanently!');
  };

  // Bind mobile wallet with login password verification + Firebase Firestore global uniqueness
  const bindWallet = async (type: 'bKash' | 'Nagad', number: string, loginPassword: string) => {
    if (!user.isLoggedIn) {
      return { success: false, message: 'Please log in first before linking a wallet account.' };
    }

    const cleanNum = normalizePhone(number);
    if (!/^01[3-9]\d{8}$/.test(cleanNum)) {
      return { success: false, message: 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX)' };
    }

    if (!loginPassword || !loginPassword.trim()) {
      return { success: false, message: 'Please enter your account login password to bind this wallet.' };
    }

    if (user.loginPassword && user.loginPassword !== loginPassword.trim()) {
      return { success: false, message: 'Incorrect login password! Please enter the password you used during registration/login.' };
    }

    // Check if already bound to current user's own wallet list
    const alreadyOwn =
      normalizePhone(user.boundBkash || '') === cleanNum ||
      normalizePhone(user.boundNagad || '') === cleanNum ||
      Boolean(user.boundWallets?.some((w) => normalizePhone(w.number) === cleanNum));
    if (alreadyOwn) {
      return { success: false, message: `Number ${cleanNum} is already linked to your account.` };
    }

    // 1. Check Firebase Firestore global boundWallets collection
    try {
      const fbRecord = await checkBoundWalletInFirebase(cleanNum);
      if (fbRecord) {
        if (fbRecord.userId !== user.id) {
          return {
            success: false,
            message: 'This number is already logged in on another account! Each bKash/Nagad number can only be linked once.'
          };
        }
        return {
          success: false,
          message: `Number ${cleanNum} is already registered on this platform!`
        };
      }
    } catch {
      // Fall back to server & local checks if offline
    }

    // 2. Check Server API uniqueness
    try {
      const checkRes = await fetch('/api/bound-numbers/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: cleanNum, userId: user.id })
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData?.bound) {
          return {
            success: false,
            message: 'This number is already logged in on another account! Each bKash/Nagad number can only be linked once.'
          };
        }
      }
    } catch {}

    // 3. Check local globalBoundNumbers & allUsers
    const alreadyInGlobal = globalBoundNumbers.includes(cleanNum);
    const alreadyInOtherUsers = allUsers.some(
      (u) =>
        u.id !== user.id &&
        (normalizePhone(u.boundBkash || '') === cleanNum ||
          normalizePhone(u.boundNagad || '') === cleanNum ||
          u.boundWallets?.some((w) => normalizePhone(w.number) === cleanNum))
    );

    if (alreadyInGlobal || alreadyInOtherUsers) {
      return {
        success: false,
        message: 'This number is already logged in on another account! Each bKash/Nagad number can only be linked once.'
      };
    }

    // 4. Persist to Server & Firebase Firestore
    try {
      const regRes = await fetch('/api/bound-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: cleanNum, userId: user.id })
      });
      if (regRes.status === 409) {
        const errData = await regRes.json().catch(() => ({}));
        return {
          success: false,
          message: errData.message || 'This number is already logged in on another account!'
        };
      }
    } catch {}

    try {
      await saveBoundWalletInFirebase({
        number: cleanNum,
        type,
        userId: user.id,
        userPhone: user.phone || user.email || '',
        createdAt: new Date().toISOString()
      });
    } catch {}

    const newWalletItem = {
      id: `w_${Date.now()}`,
      type,
      number: cleanNum,
      addedAt: new Date().toLocaleString()
    };

    const updatedWallets = [...(user.boundWallets || []), newWalletItem];
    const updatedUser: User = {
      ...user,
      boundWallets: updatedWallets,
      boundBkash: type === 'bKash' ? cleanNum : user.boundBkash,
      boundNagad: type === 'Nagad' ? cleanNum : user.boundNagad
    };

    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    setGlobalBoundNumbers((prev) => (prev.includes(cleanNum) ? prev : [...prev, cleanNum]));
    showToast(`${type} number ${cleanNum} bound successfully!`);
    return { success: true, message: 'Success' };
  };

  // Deposit: Submit manual payment with TRX ID
  const submitDepositRequest = (
    amount: number,
    method: 'bKash' | 'Nagad' | 'USDT',
    channel: string,
    senderNumber: string,
    trxId: string
  ) => {
    if (adminSettings.depositEnabled === false) {
      showToast('Deposit system is currently disabled by Administrator!');
      return { success: false, message: 'Deposit system is currently disabled' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator! Deposits disabled.');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    if (amount < 100) return { success: false, message: 'Minimum deposit is ৳100' };
    if (!senderNumber.trim() || !trxId.trim()) {
      return { success: false, message: 'Please provide both sender number and Transaction ID (TRX ID)' };
    }

    const newReq: DepositRequest = {
      id: `dep_${Date.now()}`,
      userId: user.id,
      userPhone: senderNumber.trim(),
      method,
      channel,
      amount,
      senderNumber: senderNumber.trim(),
      trxId: trxId.trim().toUpperCase(),
      status: 'pending',
      time: new Date().toLocaleString()
    };

    setDepositRequests((prev) => [newReq, ...prev]);

    // Send to central server so ANY mobile worldwide syncs with the Admin Panel in real time
    // "ar keo zodi deposit kore obossoi admin panel e show korbe prithibir ze keo ze kono mobile theke korle"
    fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq)
    }).catch(() => {});

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}`,
        userId: user.id,
        type: 'deposit',
        title: `Deposit ${method} (Pending)`,
        detail: `TRX ID: ${trxId.trim().toUpperCase()} • Sent from: ${senderNumber}`,
        amount: amount,
        balanceAfter: user.balance,
        time: new Date().toLocaleString(),
        status: 'pending',
        method,
        trxId: trxId.trim().toUpperCase(),
        senderNumber: senderNumber.trim()
      },
      ...prev
    ]);

    showToast('Deposit submitted! Funds will be verified by Administrator and credited.');
    return { success: true, message: 'Submitted' };
  };

  // Admin Approve Deposit:
  // "Bonus ze kono deposit e 50 Taka pabe turnover 150 Taka ar deposit korle 2x turnover diba"
  // "ar Bonus auto wallet e add hoye zabe sundor kore"
  const approveDeposit = (requestId: string) => {
    const req = depositRequests.find((r) => r.id === requestId);
    if (!req || (req.status !== 'pending' && req.status !== 'processing')) return;

    lastDepositsMutationAtRef.current = Date.now();
    lastUsersMutationAtRef.current = Date.now();

    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
    );

    const depositAmt = req.amount;
    let bonusAmt = 50.00;
    let bonusTurnover = 150.00;

    if (depositAmt >= 10000) {
      bonusAmt = 1000.00;
      bonusTurnover = 3000.00;
    } else if (depositAmt >= 5000) {
      bonusAmt = 500.00;
      bonusTurnover = 1500.00;
    } else if (depositAmt >= 1000) {
      bonusAmt = 100.00;
      bonusTurnover = 300.00;
    } else {
      bonusAmt = 50.00;
      bonusTurnover = 150.00;
    }

    const depositTurnover = depositAmt * 2; // 2x turnover on deposit
    const totalTurnoverAdded = depositTurnover + bonusTurnover;
    const totalCredit = +(depositAmt + bonusAmt).toFixed(2);

    const todayStr = getLocalDateStr();
    const vipTxs: Transaction[] = [];
    const vipNotifs: AppNotification[] = [];
    let vipCreditedTotal = 0;

    const normReqPhone = normalizePhone(req.userPhone || req.senderNumber || '');
    const isReqUser = (u: User) =>
      u.id === req.userId || (normReqPhone !== '' && normalizePhone(u.phone || '') === normReqPhone);

    // Update user balance, turnover, totalDeposited, and auto-unlock & auto-credit VIP bonuses
    setAllUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (isReqUser(u)) {
          const baseUser: User = {
            ...u,
            balance: +(u.balance + totalCredit).toFixed(2),
            exp: u.exp + depositAmt,
            totalDeposited: (u.totalDeposited || 0) + depositAmt,
            turnoverRequired: (u.turnoverRequired || 0) + totalTurnoverAdded,
            attendanceState: {
              claimedDays: u.attendanceState?.claimedDays || [],
              lastClaimDate: u.attendanceState?.lastClaimDate,
              streak: u.attendanceState?.streak || 0,
              lastDepositDate: todayStr
            }
          };
          const autoVip = applyAutoVipRewards(baseUser);
          vipTxs.push(...autoVip.newTxs);
          vipNotifs.push(...autoVip.newNotifs);
          vipCreditedTotal = autoVip.totalCredited;
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: autoVip.updatedUser })
          }).catch(() => {});
          return autoVip.updatedUser;
        }
        return u;
      })
    );

    if (isReqUser(user)) {
      setUser((u) => {
        const baseUser: User = {
          ...u,
          balance: +(u.balance + totalCredit).toFixed(2),
          exp: u.exp + depositAmt,
          totalDeposited: (u.totalDeposited || 0) + depositAmt,
          turnoverRequired: (u.turnoverRequired || 0) + totalTurnoverAdded,
          attendanceState: {
            claimedDays: u.attendanceState?.claimedDays || [],
            lastClaimDate: u.attendanceState?.lastClaimDate,
            streak: u.attendanceState?.streak || 0,
            lastDepositDate: todayStr
          }
        };
        const autoVip = applyAutoVipRewards(baseUser);
        if (vipTxs.length === 0) vipTxs.push(...autoVip.newTxs);
        if (vipNotifs.length === 0) vipNotifs.push(...autoVip.newNotifs);
        if (vipCreditedTotal === 0) vipCreditedTotal = autoVip.totalCredited;
        return autoVip.updatedUser;
      });
    }

    // Record deposit bonus + any auto-unlocked VIP transactions
    const timeNow = new Date().toLocaleString();
    setTransactions((prev) => [
      ...vipTxs,
      {
        id: `tx_${Date.now()}_bonus`,
        userId: req.userId,
        type: 'deposit_bonus',
        title: 'Auto Deposit Bonus (Graduated Tier)',
        detail: `৳${bonusAmt} Bonus Unlocked for ৳${depositAmt} Deposit (+৳${bonusTurnover} Turnover Required)`,
        amount: bonusAmt,
        balanceAfter: +(user.balance + totalCredit).toFixed(2),
        time: timeNow,
        status: 'success'
      },
      ...prev.map((t) => (t.trxId === req.trxId ? { ...t, status: 'success' as const } : t))
    ]);

    if (vipNotifs.length > 0) {
      setNotifications((prev) => [...vipNotifs, ...prev].slice(0, 50));
    }

    // Notify central server
    fetch('/api/deposits/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId })
    }).catch(() => {});

    confetti({ particleCount: 70, spread: 60 });
    showToast(
      vipCreditedTotal > 0
        ? `Deposit ৳${depositAmt} approved! +৳${bonusAmt} Deposit Bonus & +৳${vipCreditedTotal} VIP Bonus auto-credited!`
        : `Deposit ৳${depositAmt} approved! ৳${bonusAmt} Bonus auto-credited to wallet.`
    );
  };

  // Admin Reject Deposit
  const rejectDeposit = (requestId: string, note?: string) => {
    const req = depositRequests.find((r) => r.id === requestId);
    if (!req) return;

    lastDepositsMutationAtRef.current = Date.now();
    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected', adminNote: note } : r))
    );

    // Notify central server
    fetch('/api/deposits/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId, note })
    }).catch(() => {});

    setTransactions((prev) =>
      prev.map((t) => (t.trxId === req.trxId ? { ...t, status: 'rejected' as const } : t))
    );

    showToast(`Deposit ৳${req.amount} rejected`);
  };

  // Password Recovery via Customer Service
  // "ar keo password vule gele customer service e kotha bole password nite parbe"
  const requestPasswordRecovery = async (phone: string, note?: string) => {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      return { success: false, message: 'Please enter your registered phone number' };
    }

    try {
      await fetch('/api/password-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, note: note || 'User requested password recovery' })
      });
    } catch {}

    const matchedUser = allUsers.find(
      (u) => normalizePhone(u.phone || '') === cleanPhone || (u.uid && u.uid === cleanPhone)
    );

    if (matchedUser && matchedUser.loginPassword) {
      return {
        success: true,
        message: 'Account verified! Customer Service retrieved your password.',
        password: matchedUser.loginPassword
      };
    }

    return {
      success: true,
      message: 'Password recovery ticket submitted. Customer Service specialist is on standby to assist you.'
    };
  };

  // Claim One-Time Deposit Bonus (Strictly unlocked only after completing a deposit)
  const claimDepositBonus = () => {
    if (!user.isLoggedIn) {
      showToast('Please log in first!');
      return { success: false, message: 'Please log in first!' };
    }
    if (user.hasClaimedDepositBonus) {
      showToast('Deposit bonus can only be claimed 1 time!');
      return { success: false, message: 'Deposit bonus has already been claimed!' };
    }

    const hasCompletedDeposit =
      (Number(user.totalDeposited) || 0) > 0 ||
      depositRequests.some((d) => d.userId === user.id && d.status === 'approved');

    if (!hasCompletedDeposit) {
      showToast('Complete your deposit first to unlock this 1-time bonus!');
      return { success: false, message: 'Deposit must be completed first before claiming!' };
    }

    const bonusAmount = 50.00;
    const newBal = +(user.balance + bonusAmount).toFixed(2);
    const newTurnover = (user.turnoverRequired || 0) + 150;

    const updatedUser: User = {
      ...user,
      balance: newBal,
      turnoverRequired: newTurnover,
      hasClaimedDepositBonus: true
    };
    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}`,
        userId: user.id,
        type: 'deposit_bonus',
        title: 'First Deposit Bonus (1-Time)',
        detail: '৳50 Cash (150 Taka Turnover)',
        amount: bonusAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);

    confetti({ particleCount: 60, spread: 60 });
    showToast('Claimed ৳50 Deposit Bonus! Added 150 turnover.');
    return { success: true, message: 'Claimed' };
  };

  // Claim VIP Level-Up or Monthly Privilege Reward (strictly per-user & synced)
  const claimVipReward = (level: number, type: 'levelUp' | 'monthly', amount: number) => {
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first!');
      return { success: false, message: 'Login required' };
    }
    if (amount <= 0) {
      return { success: false, message: 'Not available for this VIP tier' };
    }
    if (user.vipLevel < level) {
      showToast(`Deposit more to unlock VIP${level} before claiming this reward!`);
      return { success: false, message: `Reach VIP${level} to unlock` };
    }

    const key = `${type}_${level}`;
    const alreadyClaimed = Boolean(user.claimedVipBonuses?.[key]);
    if (type === 'levelUp' && alreadyClaimed) {
      showToast(`VIP${level} Level-Up bonus already credited!`);
      return { success: false, message: 'Already claimed' };
    }
    if (type === 'monthly') {
      const lastTs = Number(user.vipMonthlyLastClaim?.[String(level)] || 0);
      if (lastTs > 0 && Date.now() - lastTs < MONTHLY_VIP_MS) {
        showToast(`VIP${level} Monthly salary already credited for this 30-day cycle!`);
        return { success: false, message: 'Already claimed this month' };
      }
    }

    const newBal = +(user.balance + amount).toFixed(2);
    const updatedUser: User = {
      ...user,
      balance: newBal,
      claimedVipBonuses: {
        ...(user.claimedVipBonuses || {}),
        [key]: true
      },
      vipMonthlyLastClaim:
        type === 'monthly'
          ? { ...(user.vipMonthlyLastClaim || {}), [String(level)]: Date.now() }
          : user.vipMonthlyLastClaim
    };

    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_vip`,
        userId: user.id,
        type: 'vip_bonus',
        title: `VIP${level} ${type === 'levelUp' ? 'Level-Up' : 'Monthly'} Bonus`,
        detail: `Auto Credited to Wallet: ৳${amount.toLocaleString()}`,
        amount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);

    confetti({ particleCount: 75, spread: 70 });
    showToast(`VIP${level} Bonus of ৳${amount.toLocaleString()} auto-added to your wallet!`);
    return { success: true, message: 'Claimed' };
  };

  // Withdraw Funds (With Turnover check, global toggle & server WithdrawRequest sync)
  const withdraw = (amount: number, method: 'bKash' | 'Nagad', loginPass: string) => {
    if (adminSettings.withdrawEnabled === false) {
      showToast('Withdraw system is currently disabled by Administrator!');
      return { success: false, message: 'Withdraw system is currently disabled' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator! Withdrawals disabled.');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    const minWd = Number(adminSettings.minWithdraw) || 100;
    if (amount < minWd) return { success: false, message: `Minimum withdrawal is ৳${minWd}` };
    if (user.balance < amount) return { success: false, message: 'Insufficient wallet balance' };

    const targetBound = method === 'bKash' ? user.boundBkash : user.boundNagad;
    if (!targetBound) {
      return {
        success: false,
        message: `Please bind your ${method} account first before withdrawing.`
      };
    }

    // Verify login password
    if (user.loginPassword && user.loginPassword !== loginPass.trim()) {
      return { success: false, message: 'Incorrect login password! Please enter your real password.' };
    }

    // Check Turnover requirement
    const remainingTurnover = Math.max(0, (user.turnoverRequired || 0) - (user.turnoverCompleted || 0));
    if (remainingTurnover > 0) {
      return {
        success: false,
        message: `Turnover requirement not completed! Remaining turnover needed: ৳${remainingTurnover.toFixed(2)}.`
      };
    }

    const newBal = +(user.balance - amount).toFixed(2);
    setUser((u) => ({ ...u, balance: newBal }));

    const newWd: WithdrawRequest = {
      id: `wd_${Date.now()}`,
      userId: user.id,
      userName: user.nickname || user.phone || 'User',
      userPhone: user.phone || user.email || '',
      amount,
      method,
      number: targetBound,
      status: 'pending',
      time: new Date().toLocaleString()
    };
    setWithdrawRequests((prev) => [newWd, ...prev]);

    fetch('/api/withdraws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWd)
    }).catch(() => {});

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: user.id,
      type: 'withdraw',
      title: `Withdraw to ${method} (${targetBound})`,
      detail: 'Pending admin transfer queue',
      amount: -amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'pending',
      method
    };

    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Withdrawal of ৳${amount} submitted! Processing to ${targetBound}`);
    return { success: true, message: 'Success' };
  };

  // Safe Vault
  const transferSafe = (amount: number, direction: 'in' | 'out') => {
    if (amount <= 0) return { success: false, message: 'Invalid amount' };

    if (direction === 'in') {
      if (user.balance < amount) return { success: false, message: 'Insufficient balance' };
      setUser((u) => ({
        ...u,
        balance: +(u.balance - amount).toFixed(2),
        safeBalance: +((u.safeBalance || 0) + amount).toFixed(2)
      }));
      showToast(`Transferred ৳${amount} into Safe Vault`);
      return { success: true, message: 'Transferred' };
    } else {
      if ((user.safeBalance || 0) < amount) return { success: false, message: 'Insufficient Safe balance' };
      setUser((u) => ({
        ...u,
        balance: +(u.balance + amount).toFixed(2),
        safeBalance: +((u.safeBalance || 0) - amount).toFixed(2)
      }));
      showToast(`Transferred ৳${amount} out of Safe Vault`);
      return { success: true, message: 'Transferred' };
    }
  };

  // Claim Gift Code (Global Admin-controlled, respects maxClaims, expiry, 1-per-user, & turnover)
  const claimGiftCode = async (code: string) => {
    if (adminSettings.giftCodeEnabled === false) {
      return { success: false, message: 'Gift Code claims are currently disabled by Administrator!' };
    }
    if (!user.isLoggedIn) {
      return { success: false, message: 'Please log in first to redeem gift codes!' };
    }
    if (user.isBanned) {
      return { success: false, message: 'Your account is banned by Administrator!' };
    }

    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      return { success: false, message: 'Please enter a valid gift code' };
    }

    let bonus = 0;
    let turnoverReq = 0;

    // 1. Try authoritative central server redemption first
    let handledByServer = false;
    try {
      const res = await fetch('/api/gift-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmed,
          userId: user.id,
          phone: user.phone || user.email || user.id,
          nickname: user.nickname
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, message: data.message || 'Invalid or expired gift code' };
        }
        handledByServer = true;
        bonus = Number(data.amount) || 0;
        turnoverReq = Number(data.turnoverAmount ?? data.amount) || 0;
        if (data.settings) {
          setAdminSettings((prev) => ({ ...prev, ...data.settings }));
        }
      }
    } catch {
      // Static deployment fallback
    }

    if (!handledByServer) {
      const activeIdx = adminSettings.activeGiftCodes.findIndex(
        (c) => c.code.toUpperCase() === trimmed
      );
      if (activeIdx < 0) {
        return { success: false, message: 'Invalid or non-existent gift code' };
      }

      const active = adminSettings.activeGiftCodes[activeIdx];
      const now = Date.now();
      if (active.active === false) {
        return { success: false, message: 'This gift code is currently inactive!' };
      }
      if (active.expiresAt && active.expiresAt > 0 && now > active.expiresAt) {
        return { success: false, message: 'This gift code has expired!' };
      }
      if ((active.claimedCount || 0) >= (active.maxClaims || 1)) {
        return { success: false, message: 'Gift code claim limit has been reached!' };
      }
      if (active.minRequiredBalance && user.balance < active.minRequiredBalance) {
        return { success: false, message: `Minimum ৳${active.minRequiredBalance} balance required to claim this code!` };
      }
      const claimerKey = normalizePhone(user.phone || '') || user.id;
      const claimedBy = Array.isArray(active.claimedBy) ? active.claimedBy : [];
      if (claimerKey && claimedBy.includes(claimerKey)) {
        return { success: false, message: 'You have already claimed this gift code!' };
      }

      bonus = Number(active.amount) || 0;
      turnoverReq =
        active.turnoverAmount !== undefined && active.turnoverAmount !== null
          ? Number(active.turnoverAmount)
          : bonus;

      const claimRecord = {
        userId: user.id,
        nickname: user.nickname || 'User',
        contact: user.phone || user.email || '',
        amount: bonus,
        time: new Date().toLocaleString()
      };

      const updatedCodes = adminSettings.activeGiftCodes.map((c, idx) =>
        idx === activeIdx
          ? {
              ...c,
              claimedCount: (c.claimedCount || 0) + 1,
              claimedBy: claimerKey ? [...claimedBy, claimerKey] : claimedBy,
              claimRecords: [claimRecord, ...(c.claimRecords || [])]
            }
          : c
      );
      setAdminSettings((prev) => ({ ...prev, activeGiftCodes: updatedCodes }));
    }

    const newBal = +(user.balance + bonus).toFixed(2);
    const newTurnover = +((user.turnoverRequired || 0) + turnoverReq).toFixed(2);
    const claimTimeStr = new Date().toLocaleString();
    const updatedUser: User = {
      ...user,
      balance: newBal,
      turnoverRequired: newTurnover,
      lastGiftClaimTime: claimTimeStr,
      lastGiftCode: trimmed,
      lastGiftAmount: bonus
    };

    setUser(updatedUser);
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}`,
        userId: user.id,
        type: 'gift',
        title: 'Gift Code Claimed',
        detail: `Code: ${trimmed} • +৳${turnoverReq.toFixed(0)} Turnover Required`,
        amount: bonus,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
    showToast(`Received ৳${bonus.toFixed(2)}! (৳${turnoverReq.toFixed(0)} turnover added)`);
    return { success: true, message: 'Success' };
  };

  // Daily Attendance Check-in (Enforces deposit history, 1-time claim per day tier, 1 claim per calendar day, and streak reset on skip)
  const claimAttendanceReward = (day: number) => {
    const target = attendance.find((a) => a.day === day);
    if (!target) return { success: false, message: 'Day not found' };
    if (target.status === 'claimed' || target.claimed) {
      return { success: false, message: `Day ${day} bonus has already been claimed!` };
    }
    if (target.status === 'locked') {
      const reason = target.lockReason || 'Deposit requirements not met yet';
      showToast(reason);
      return { success: false, message: reason };
    }

    const today = getLocalDateStr();
    const yesterday = getLocalDateStr(new Date(Date.now() - 86400000));
    const prevState = user.attendanceState || { claimedDays: [], streak: 0 };
    const missedDay = Boolean(
      prevState.lastClaimDate && prevState.lastClaimDate !== today && prevState.lastClaimDate !== yesterday
    );

    const newBal = +(user.balance + target.amount).toFixed(2);
    const updatedUser: User = {
      ...user,
      balance: newBal,
      attendanceState: {
        ...prevState,
        claimedDays: [...(prevState.claimedDays || []), day],
        lastClaimDate: today,
        streak: missedDay ? 1 : (prevState.streak || 0) + 1
      }
    };

    setUser(updatedUser);
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_att`,
        userId: user.id,
        type: 'attendance_bonus',
        title: `Daily Attendance Day ${day} Bonus`,
        detail: `Deposit Milestone ৳${target.requiredDeposit.toLocaleString()}+ Unlocked`,
        amount: target.amount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);

    showToast(`Claimed Day ${day} bonus ৳${target.amount.toFixed(2)}!`);
    confetti({ particleCount: 60, spread: 65 });
    return { success: true, message: 'Claimed' };
  };

  // WinGo Betting with Arbitrage / ILLEGAL BET Detection
  // "ek sathe Big/Small,Red/Green,3-5 ta number trade korle ILLEGAL BET 3x turnover diba all balane er upor sundor kore"
  const placeBet = (
    mode: WinGoMode,
    type: 'color' | 'number' | 'size',
    value: string | number,
    amount: number,
    multiplier: number
  ) => {
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first to place WinGo bets');
      return { success: false, message: 'Login required' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator! Betting is disabled.');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    const totalCost = amount * multiplier;
    if (totalCost <= 0) return { success: false, message: 'Invalid bet amount' };
    if (user.balance < totalCost) {
      showToast('Insufficient balance');
      return { success: false, message: 'Insufficient balance' };
    }

    const currentPeriodNum = wingoMarkets[mode].period;

    // Check user's current pending bets in this active period for opposing options (Hedging abuse)
    const existingPeriodBets = bets.filter(
      (b) => b.periodNumber === currentPeriodNum && b.mode === mode && b.status === 'pending'
    );

    let isIllegalBet = false;
    let illegalReason = '';

    // 1. Check Big / Small opposing bets
    if (type === 'size') {
      const opposingSize = value === 'big' ? 'small' : 'big';
      if (existingPeriodBets.some((b) => b.type === 'size' && b.value === opposingSize)) {
        isIllegalBet = true;
        illegalReason = 'Hedging on both Big & Small simultaneously';
      }
    }

    // 2. Check Red / Green opposing bets
    if (type === 'color') {
      if (value === 'red' && existingPeriodBets.some((b) => b.type === 'color' && b.value === 'green')) {
        isIllegalBet = true;
        illegalReason = 'Hedging on both Red & Green simultaneously';
      } else if (value === 'green' && existingPeriodBets.some((b) => b.type === 'color' && b.value === 'red')) {
        isIllegalBet = true;
        illegalReason = 'Hedging on both Red & Green simultaneously';
      }
    }

    // 3. Check 3 to 5+ number trades in same round
    if (type === 'number') {
      const existingNumbers = new Set(
        existingPeriodBets.filter((b) => b.type === 'number').map((b) => b.value)
      );
      existingNumbers.add(value);
      if (existingNumbers.size >= 3) {
        isIllegalBet = true;
        illegalReason = `Placing bets on 3 or more numbers (${existingNumbers.size} numbers)`;
      }
    }

    let penaltyTurnover = 0;
    if (isIllegalBet) {
      // 3X Turnover penalty on user's entire balance!
      penaltyTurnover = +(Math.max(500, user.balance * 3)).toFixed(2);
    }

    const newBal = +(user.balance - totalCost).toFixed(2);
    setUser((u) => ({
      ...u,
      balance: newBal,
      exp: u.exp + totalCost,
      turnoverCompleted: (u.turnoverCompleted || 0) + totalCost,
      turnoverRequired: (u.turnoverRequired || 0) + penaltyTurnover,
      illegalBetCount: isIllegalBet ? (u.illegalBetCount || 0) + 1 : u.illegalBetCount
    }));

    const newBet: WinGoBet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      nickname: user.nickname || 'Player',
      userPhone: user.phone || user.email || '',
      periodNumber: currentPeriodNum,
      mode,
      type,
      value,
      amount,
      multiplier,
      totalAmount: totalCost,
      status: 'pending',
      time: new Date().toLocaleTimeString('en-US', { hour12: false })
    };

    setBets((prev) => [newBet, ...prev]);
    setGlobalWingoBets((prev) => [newBet, ...prev].slice(0, 250));

    // Push live bet immediately to central server so Admin Panel monitors all phones in real time
    fetch('/api/wingo/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBet)
    }).catch(() => {});

    // Record transactions
    const txs: Transaction[] = [
      {
        id: `tx_${Date.now()}`,
        userId: user.id,
        type: 'lottery_bet',
        title: `WinGo ${mode} Bet (${type}: ${value})`,
        detail: `Period ${currentPeriodNum}`,
        amount: -totalCost,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      }
    ];

    if (isIllegalBet) {
      txs.unshift({
        id: `tx_${Date.now()}_penalty`,
        userId: user.id,
        type: 'turnover_penalty',
        title: '3X Turnover Applied',
        detail: `${illegalReason} — ৳${penaltyTurnover.toFixed(2)} turnover added.`,
        amount: 0,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      });
      addNotification({
        title: '3X Turnover Applied',
        message: `+৳${penaltyTurnover.toFixed(2)} turnover requirement added to your account.`,
        reason: `${illegalReason} (WinGo ${mode} • Period ${currentPeriodNum.slice(-5)})`,
        type: 'turnover'
      });
    }

    showToast(`WinGo ${mode} bet placed successfully!`);
    setTransactions((prev) => [...txs, ...prev]);
    return { success: true, message: 'Success' };
  };

  // Binary Option Trade across all synchronized global markets
  const placeBinaryTrade = (
    asset: string,
    direction: 'UP' | 'DOWN',
    amount: number,
    durationSeconds: number
  ) => {
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first to trade Binary Market');
      return { success: false, message: 'Login required' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator! Trading is disabled.');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    if (amount <= 0) return { success: false, message: 'Invalid trade amount' };
    if (user.balance < amount) {
      showToast('Insufficient balance');
      return { success: false, message: 'Insufficient balance' };
    }

    const spec = BINARY_MARKET_MAP[asset];
    const decimals = spec?.decimals ?? 2;
    const payoutRate = spec?.payoutRate ?? 0.90;
    const entryPrice = binaryMarkets[asset]?.price ?? binaryPrice;

    const newBal = +(user.balance - amount).toFixed(2);
    setUser((u) => ({
      ...u,
      balance: newBal,
      exp: u.exp + amount,
      turnoverCompleted: (u.turnoverCompleted || 0) + amount
    }));

    const now = Date.now();
    const endTime = now + durationSeconds * 1000;
    const newBet: BinaryOptionBet = {
      id: `bin_${now}`,
      userId: user.id,
      asset,
      direction,
      entryPrice,
      amount,
      payoutRate,
      durationSeconds,
      startTime: now,
      endTime,
      status: 'active'
    };

    setBinaryBets((prev) => [newBet, ...prev]);

    fetch('/api/binary/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset, direction, amount, endTime })
    }).catch(() => {});

    setTransactions((prev) => [
      {
        id: `tx_${now}`,
        userId: user.id,
        type: 'binary_bet',
        title: `Binary Trade (${direction} ${asset})`,
        detail: `Entry: ${entryPrice.toFixed(decimals)} • Timeframe: ${durationSeconds}s`,
        amount: -amount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);

    showToast(`Binary Trade Placed: ${asset} ${direction} @ ${entryPrice.toFixed(decimals)}`);
    return { success: true, message: 'Success' };
  };

  // Aviator Plane Game Actions
  const placeAviatorBet = (roundId: string, amount: number, autoCashout?: number) => {
    if (!user.isLoggedIn) {
      showToast('Please login first to bet on Aviator Plane');
      return { success: false, message: 'Please log in first' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator!');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    if (amount < 10) {
      return { success: false, message: 'Minimum Aviator bet is ৳10' };
    }
    if (user.balance < amount) {
      showToast('Insufficient wallet balance');
      return { success: false, message: 'Insufficient balance' };
    }

    const betId = `av_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBal = +(user.balance - amount).toFixed(2);
    setUser((u) => ({
      ...u,
      balance: newBal,
      exp: u.exp + amount,
      turnoverCompleted: (u.turnoverCompleted || 0) + amount
    }));

    const newBet: AviatorBet = {
      id: betId,
      roundId,
      userId: user.id,
      amount,
      status: 'active',
      autoCashout: autoCashout && autoCashout >= 1.1 ? autoCashout : undefined,
      time: new Date().toLocaleTimeString('en-US', { hour12: false })
    };
    setAviatorBets((prev) => [newBet, ...prev]);

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_avb`,
        userId: user.id,
        type: 'aviator_bet',
        title: 'Aviator Plane Bet',
        detail: `Round #${roundId.slice(-5)}${autoCashout ? ` • Auto @ ${autoCashout.toFixed(2)}x` : ''}`,
        amount: -amount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);

    showToast(`Aviator Bet Placed: ৳${amount}`);
    return { success: true, message: 'Bet placed', betId };
  };

  const cashOutAviatorBet = (betId: string, multiplier: number) => {
    const target = aviatorBets.find((b) => b.id === betId && b.status === 'active');
    if (!target) return { success: false, winAmount: 0 };

    const winAmount = +(target.amount * multiplier).toFixed(2);
    setAviatorBets((prev) =>
      prev.map((b) =>
        b.id === betId
          ? { ...b, status: 'cashed_out', cashoutMultiplier: +multiplier.toFixed(2), winAmount }
          : b
      )
    );

    const newBal = +(userRef.current.balance + winAmount).toFixed(2);
    setUser((u) => ({
      ...u,
      balance: +(u.balance + winAmount).toFixed(2),
      turnoverCompleted: (u.turnoverCompleted || 0) + winAmount
    }));

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_avw`,
        userId: userRef.current.id,
        type: 'aviator_win',
        title: `Aviator Cashed Out @ ${multiplier.toFixed(2)}x`,
        detail: `Round #${target.roundId.slice(-5)} • Profit +৳${(winAmount - target.amount).toFixed(2)}`,
        amount: winAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);

    confetti({ particleCount: 70, spread: 60 });
    showToast(`Cashed Out @ ${multiplier.toFixed(2)}x! +৳${winAmount.toFixed(2)}`);
    return { success: true, winAmount };
  };

  const loseAviatorBet = (betId: string) => {
    setAviatorBets((prev) =>
      prev.map((b) => (b.id === betId && b.status === 'active' ? { ...b, status: 'lost', winAmount: 0 } : b))
    );
  };

  // Mines 777 Game Actions
  const placeMinesBet = (amount: number, minesCount: number) => {
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first to play Mines 777');
      return { success: false, message: 'Please log in first' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator!');
      return { success: false, message: 'Account banned' };
    }
    if (amount < 10) {
      showToast('Minimum bet is ৳10');
      return { success: false, message: 'Minimum bet is ৳10' };
    }
    if (user.balance < amount) {
      showToast('Insufficient wallet balance');
      return { success: false, message: 'Insufficient balance' };
    }
    const newBal = +(user.balance - amount).toFixed(2);
    setUser((u) => ({
      ...u,
      balance: newBal,
      exp: u.exp + amount,
      turnoverCompleted: (u.turnoverCompleted || 0) + amount
    }));
    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_mnb`,
        userId: user.id,
        type: 'mines_bet',
        title: `Mines 777 Bet (${minesCount} Mines)`,
        detail: `25 Tiles • Bet ৳${amount.toFixed(2)}`,
        amount: -amount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);
    return { success: true, message: 'Round started' };
  };

  const cashOutMinesWin = (betAmount: number, winAmount: number, multiplier: number, minesCount: number) => {
    const newBal = +(userRef.current.balance + winAmount).toFixed(2);
    setUser((u) => ({
      ...u,
      balance: +(u.balance + winAmount).toFixed(2),
      turnoverCompleted: (u.turnoverCompleted || 0) + winAmount
    }));
    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_mnw`,
        userId: userRef.current.id,
        type: 'mines_win',
        title: `Mines 777 Win @ ${multiplier.toFixed(2)}x`,
        detail: `${minesCount} Mines • Profit +৳${(winAmount - betAmount).toFixed(2)}`,
        amount: winAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);
    confetti({ particleCount: 65, spread: 60 });
    showToast(`Mines 777 Win! +৳${winAmount.toFixed(2)} (${multiplier.toFixed(2)}x)`);
    return { success: true, winAmount };
  };

  // Agent Daily Salary Claim (Enforces Terms & Conditions 1-8 cleanly)
  const claimAgentSalary = (tierMembers: number, salaryAmount: number) => {
    if (!user.isLoggedIn || !user.id) {
      return { success: false, message: 'Please log in first' };
    }
    const today = getLocalDateStr();
    if (user.lastSalaryClaimDate === today) {
      return { success: false, message: 'You have already claimed today’s agent salary.' };
    }
    const userReferrals = referrals.filter(
      (r) => (r.referrerCode === user.inviteCode || r.referrerCode === user.uid) && (r.depositAmount || 0) > 0
    );
    if (userReferrals.length < tierMembers) {
      return {
        success: false,
        message: `You need ${tierMembers - userReferrals.length} more recharge member(s) for this tier.`
      };
    }
    const newBal = +(user.balance + salaryAmount).toFixed(2);
    const updatedUser: User = {
      ...user,
      balance: newBal,
      lastSalaryClaimDate: today
    };
    setUser(updatedUser);
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_sal`,
        userId: user.id,
        type: 'salary_bonus',
        title: `EWI777 Agent Daily Salary`,
        detail: `${tierMembers} Recharge Members Tier • ৳${salaryAmount.toLocaleString()} credited`,
        amount: salaryAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);
    confetti({ particleCount: 75, spread: 65 });
    showToast(`Agent Salary ৳${salaryAmount.toLocaleString()} credited!`);
    return { success: true, message: 'Salary credited' };
  };

  // Activity Award Claim (Daily Missions: 1000->12, 10000->65, 50000->300, 100000->600 & Weekly Tasks)
  const claimActivityAward = (
    missionKey: string,
    targetBet: number,
    rewardAmount: number,
    isDaily: boolean
  ) => {
    if (!user.isLoggedIn || !user.id) {
      return { success: false, message: 'Please log in first' };
    }
    const today = getLocalDateStr();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const claimPeriodKey = isDaily
      ? today
      : `week_${Math.floor(todayStart.getTime() / (7 * 86400000))}`;

    const existingClaims = user.claimedActivityRewards || {};
    if (existingClaims[missionKey] === claimPeriodKey) {
      return { success: false, message: 'Reward already claimed for this period' };
    }

    const newBal = +(user.balance + rewardAmount).toFixed(2);
    const updatedClaims = {
      ...existingClaims,
      [missionKey]: claimPeriodKey
    };
    const updatedUser: User = {
      ...user,
      balance: newBal,
      claimedActivityRewards: updatedClaims
    };
    setUser(updatedUser);
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_act`,
        userId: user.id,
        type: 'activity_award',
        title: isDaily
          ? `Daily Betting Mission (৳${targetBet.toLocaleString()})`
          : `Weekly Betting Task (৳${targetBet.toLocaleString()})`,
        detail: `Activity Award • ৳${rewardAmount.toFixed(2)} credited`,
        amount: rewardAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);
    confetti({ particleCount: 70, spread: 60 });
    showToast(`Activity Award +৳${rewardAmount.toFixed(2)} credited!`);
    return { success: true, message: 'Award credited' };
  };

  // Real-Time Support Chat Messenger (2-way User <-> Admin with optional Gallery Photo)
  const sendSupportMessage = async (payload: {
    userId: string;
    userUid?: string;
    userNickname?: string;
    userPhone?: string;
    sender: 'user' | 'admin';
    text: string;
    imageUrl?: string;
  }) => {
    if (!payload.userId || (!payload.text.trim() && !payload.imageUrl)) return;
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data?.success && data.message) {
        setSupportMessages((prev) => [...prev, data.message]);
      }
    } catch {
      const fallbackMsg: SupportMessage = {
        id: `cs_${Date.now()}`,
        userId: payload.userId,
        userUid: payload.userUid,
        userNickname: payload.userNickname,
        userPhone: payload.userPhone,
        sender: payload.sender,
        text: payload.text.trim(),
        imageUrl: payload.imageUrl,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        timestamp: Date.now()
      };
      setSupportMessages((prev) => [...prev, fallbackMsg]);
    }
  };

  // Extra First Deposit Bonus Tier Collector (1-time per tier)
  const claimExtraFirstDepositBonus = (tierDeposit: number, bonusAmount: number) => {
    if (!user.isLoggedIn || !user.id) {
      return { success: false, message: 'Please log in first to collect bonus!' };
    }
    const existingClaims = { ...(user.claimedFirstDepositTiers || {}) };
    const key = String(tierDeposit);
    if (existingClaims[key]) {
      return { success: false, message: 'You have already collected this tier bonus!' };
    }
    if ((Number(user.totalDeposited) || 0) < tierDeposit) {
      return { success: false, message: `Deposit at least ৳${tierDeposit.toLocaleString()} to unlock!` };
    }
    existingClaims[key] = true;
    const newBal = +(user.balance + bonusAmount).toFixed(2);
    const updatedUser: User = {
      ...user,
      balance: newBal,
      claimedFirstDepositTiers: existingClaims
    };
    setUser(updatedUser);
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});
    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_fd`,
        userId: user.id,
        type: 'first_deposit_bonus',
        title: `Extra First Deposit Bonus (৳${tierDeposit.toLocaleString()})`,
        detail: `First deposit tier ৳${tierDeposit.toLocaleString()} reward • +৳${bonusAmount.toFixed(2)}`,
        amount: bonusAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);
    confetti({ particleCount: 75, spread: 60 });
    showToast(`+৳${bonusAmount.toFixed(2)} Extra First Deposit Bonus collected!`);
    return { success: true, message: 'Bonus collected' };
  };

  // K3 Dice Lottery Engine
  const placeK3Bet = (
    mode: K3Mode,
    periodNumber: string,
    betType: string,
    selection: string,
    amount: number,
    multiplier: number,
    payoutRate: number
  ) => {
    if (!user.isLoggedIn) {
      return { success: false, message: 'Please log in first to place K3 bets!' };
    }
    const totalAmount = +(amount * multiplier).toFixed(2);
    if (totalAmount <= 0 || isNaN(totalAmount)) {
      return { success: false, message: 'Invalid bet amount' };
    }
    if (user.balance < totalAmount) {
      return { success: false, message: 'Insufficient balance! Please deposit first.' };
    }
    const newBal = +(user.balance - totalAmount).toFixed(2);
    const updatedUser: User = {
      ...user,
      balance: newBal,
      turnoverCompleted: +(user.turnoverCompleted + totalAmount).toFixed(2),
      exp: user.exp + Math.round(totalAmount)
    };
    setUser(updatedUser);
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    const betEntry: K3Bet = {
      id: `k3_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      periodNumber,
      mode,
      betType,
      selection,
      amount,
      multiplier,
      totalAmount,
      payoutRate,
      status: 'pending',
      time: new Date().toTimeString().slice(0, 8)
    };
    setK3Bets((prev) => [betEntry, ...prev]);
    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_k3b`,
        userId: user.id,
        type: 'k3_bet',
        title: `K3 ${mode} Bet (${selection})`,
        detail: `Period ${periodNumber} • ${betType}`,
        amount: -totalAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);
    return { success: true, message: 'Bet placed' };
  };

  const settleK3Round = (mode: K3Mode, periodNumber: string, dice: [number, number, number]) => {
    const sum = dice[0] + dice[1] + dice[2];
    const isBig = sum >= 11;
    const isEven = sum % 2 === 0;
    const sorted = [...dice].sort((a, b) => a - b);
    const allSame = sorted[0] === sorted[1] && sorted[1] === sorted[2];
    const hasPair = sorted[0] === sorted[1] || sorted[1] === sorted[2];
    const allDiff = sorted[0] !== sorted[1] && sorted[1] !== sorted[2];
    const isConsec3 = allDiff && sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];

    let totalWinCredit = 0;
    setK3Bets((prev) => {
      const hasPending = prev.some((b) => b.periodNumber === periodNumber && b.mode === mode && b.status === 'pending');
      if (!hasPending) return prev;
      return prev.map((b) => {
        if (b.periodNumber !== periodNumber || b.mode !== mode || b.status !== 'pending') return b;
        let won = false;
        if (b.betType === 'total_num') {
          won = Number(b.selection) === sum;
        } else if (b.betType === 'total_prop') {
          if (b.selection === 'Big') won = isBig;
          else if (b.selection === 'Small') won = !isBig;
          else if (b.selection === 'Odd') won = !isEven;
          else if (b.selection === 'Even') won = isEven;
        } else if (b.betType === '2same_match') {
          const d = Number(b.selection[0]);
          won = dice.filter((x) => x === d).length >= 2;
        } else if (b.betType === '2same_pair') {
          const [pairStr, singleStr] = b.selection.split('#');
          const pDigit = Number(pairStr?.[0] || 0);
          const sDigit = Number(singleStr || 0);
          won = dice.filter((x) => x === pDigit).length === 2 && dice.includes(sDigit);
        } else if (b.betType === '3same_exact') {
          const d = Number(b.selection[0]);
          won = allSame && dice[0] === d;
        } else if (b.betType === '3same_any') {
          won = allSame;
        } else if (b.betType === 'diff_3') {
          const chosen = b.selection.split(',').map(Number);
          won = allDiff && chosen.every((n) => dice.includes(n));
        } else if (b.betType === 'diff_consec') {
          won = isConsec3;
        } else if (b.betType === 'diff_2') {
          const chosen = b.selection.split(',').map(Number);
          won = hasPair ? false : chosen.every((n) => dice.includes(n));
          if (!won && chosen.length === 2) {
            won = chosen.every((n) => dice.includes(n));
          }
        }
        const winAmt = won ? +(b.totalAmount * (b.payoutRate ?? 1.98) * 0.98).toFixed(2) : 0;
        totalWinCredit += winAmt;
        return { ...b, status: won ? 'won' : 'lost', winAmount: winAmt };
      });
    });

    if (totalWinCredit > 0) {
      const nextBal = +(userRef.current.balance + totalWinCredit).toFixed(2);
      const updatedUser = { ...userRef.current, balance: nextBal };
      setUser(updatedUser);
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: updatedUser })
      }).catch(() => {});
      setTransactions((prev) => [
        {
          id: `tx_${Date.now()}_k3w`,
          userId: userRef.current.id,
          type: 'k3_win',
          title: `K3 ${mode} Win`,
          detail: `Period ${periodNumber} • Dice ${dice.join('-')} (Sum ${sum})`,
          amount: totalWinCredit,
          balanceAfter: nextBal,
          time: new Date().toLocaleString(),
          status: 'success'
        },
        ...prev
      ]);
      confetti({ particleCount: 70, spread: 60 });
      showToast(`K3 Won +৳${totalWinCredit.toFixed(2)}!`);
    }
  };

  // 5D Lottery Engine
  const placeD5Bet = (
    mode: D5Mode,
    periodNumber: string,
    position: 'A' | 'B' | 'C' | 'D' | 'E' | 'SUM',
    betType: 'size' | 'parity' | 'digit',
    selection: string,
    amount: number,
    multiplier: number,
    payoutRate: number
  ) => {
    if (!user.isLoggedIn) {
      return { success: false, message: 'Please log in first to place 5D bets!' };
    }
    const totalAmount = +(amount * multiplier).toFixed(2);
    if (totalAmount <= 0 || isNaN(totalAmount)) {
      return { success: false, message: 'Invalid bet amount' };
    }
    if (user.balance < totalAmount) {
      return { success: false, message: 'Insufficient balance! Please deposit first.' };
    }
    const newBal = +(user.balance - totalAmount).toFixed(2);
    const updatedUser: User = {
      ...user,
      balance: newBal,
      turnoverCompleted: +(user.turnoverCompleted + totalAmount).toFixed(2),
      exp: user.exp + Math.round(totalAmount)
    };
    setUser(updatedUser);
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: updatedUser })
    }).catch(() => {});

    const betEntry: D5Bet = {
      id: `d5_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      periodNumber,
      mode,
      position,
      betType,
      selection,
      amount,
      multiplier,
      totalAmount,
      payoutRate,
      status: 'pending',
      time: new Date().toTimeString().slice(0, 8)
    };
    setD5Bets((prev) => [betEntry, ...prev]);
    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_d5b`,
        userId: user.id,
        type: 'd5_bet',
        title: `5D ${mode} Bet (${position}: ${selection})`,
        detail: `Period ${periodNumber}`,
        amount: -totalAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);
    return { success: true, message: 'Bet placed' };
  };

  const settleD5Round = (mode: D5Mode, periodNumber: string, digits: [number, number, number, number, number]) => {
    const sum = digits.reduce((a, b) => a + b, 0);
    const posIndex: Record<'A' | 'B' | 'C' | 'D' | 'E', number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    let totalWinCredit = 0;

    setD5Bets((prev) => {
      const hasPending = prev.some((b) => b.periodNumber === periodNumber && b.mode === mode && b.status === 'pending');
      if (!hasPending) return prev;
      return prev.map((b) => {
        if (b.periodNumber !== periodNumber || b.mode !== mode || b.status !== 'pending') return b;
        const targetVal = b.position === 'SUM' ? sum : digits[posIndex[b.position]];
        let won = false;
        if (b.betType === 'digit') {
          won = Number(b.selection) === targetVal;
        } else if (b.betType === 'size') {
          const isBig = b.position === 'SUM' ? sum >= 23 : targetVal >= 5;
          won = b.selection === 'Big' ? isBig : !isBig;
        } else if (b.betType === 'parity') {
          const isEven = targetVal % 2 === 0;
          won = b.selection === 'Even' ? isEven : !isEven;
        }
        const winAmt = won ? +(b.totalAmount * (b.payoutRate ?? 2) * 0.98).toFixed(2) : 0;
        totalWinCredit += winAmt;
        return { ...b, status: won ? 'won' : 'lost', winAmount: winAmt };
      });
    });

    if (totalWinCredit > 0) {
      const nextBal = +(userRef.current.balance + totalWinCredit).toFixed(2);
      const updatedUser = { ...userRef.current, balance: nextBal };
      setUser(updatedUser);
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: updatedUser })
      }).catch(() => {});
      setTransactions((prev) => [
        {
          id: `tx_${Date.now()}_d5w`,
          userId: userRef.current.id,
          type: 'd5_win',
          title: `5D ${mode} Win`,
          detail: `Period ${periodNumber} • ${digits.join('-')} (Sum ${sum})`,
          amount: totalWinCredit,
          balanceAfter: nextBal,
          time: new Date().toLocaleString(),
          status: 'success'
        },
        ...prev
      ]);
      confetti({ particleCount: 70, spread: 60 });
      showToast(`5D Won +৳${totalWinCredit.toFixed(2)}!`);
    }
  };

  const getInviteLink = () => {
    const origin = window.location.origin;
    return `${origin}/#/registration?invitationCode=${user.inviteCode}`;
  };

  const copyInviteLink = () => {
    navigator.clipboard?.writeText(getInviteLink()).catch(() => {});
    showToast('Invitation link copied successfully!');
  };

  const copyInviteCode = () => {
    navigator.clipboard?.writeText(user.inviteCode).catch(() => {});
    showToast('Invitation code copied!');
  };

  const setUserTurnover = (userId: string, requiredTurnover: number) => {
    lastUsersMutationAtRef.current = Date.now();
    const target = allUsers.find((u) => u.id === userId) || (user.id === userId ? user : undefined);
    setAllUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === userId ? { ...u, turnoverRequired: requiredTurnover } : u))
    );
    if (user.id === userId) {
      setUser((u) => ({ ...u, turnoverRequired: requiredTurnover }));
    }
    fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userPhone: target?.phone,
        fallbackUser: target,
        patch: { turnoverRequired: requiredTurnover }
      })
    }).catch(() => {});
    showToast(`Turnover updated to ৳${requiredTurnover.toFixed(0)}`);
  };

  // Admin Ban / Unban Any Member
  // "sundor kore set koro ze kono member ke ban kora zabe"
  const toggleUserBan = (userId: string, reason?: string) => {
    lastUsersMutationAtRef.current = Date.now();
    const target = allUsers.find((u) => u.id === userId) || (user.id === userId ? user : undefined);
    const nextBanned = target ? !target.isBanned : true;
    const nextReason = nextBanned ? (reason || 'Violation of Platform Fair Play Rules') : undefined;

    setAllUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.id === userId ? { ...u, isBanned: nextBanned, banReason: nextReason } : u
      )
    );

    if (user.id === userId) {
      setUser((u) => ({ ...u, isBanned: nextBanned, banReason: nextReason }));
    }

    fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userPhone: target?.phone,
        fallbackUser: target,
        patch: { isBanned: nextBanned, banReason: nextReason || '' }
      })
    }).catch(() => {});

    showToast(nextBanned ? 'User banned successfully!' : 'User unbanned successfully!');
  };

  const adminModifyUserBalance = (
    userId: string,
    action: 'add' | 'deduct' | 'set',
    amount: number,
    reason?: string
  ) => {
    const numAmt = Number(amount) || 0;
    if (numAmt < 0) return { success: false, message: 'Amount cannot be negative' };

    const target = allUsers.find((u) => u.id === userId) || (user.id === userId ? user : null);
    if (!target) return { success: false, message: 'User not found' };

    lastUsersMutationAtRef.current = Date.now();

    const curBal = Number(target.balance || 0);
    let nextBal = curBal;
    if (action === 'add') nextBal = +(curBal + numAmt).toFixed(2);
    else if (action === 'deduct') nextBal = +Math.max(0, curBal - numAmt).toFixed(2);
    else if (action === 'set') nextBal = +Math.max(0, numAmt).toFixed(2);

    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, balance: nextBal } : u))
    );
    if (user.id === userId) {
      setUser((u) => ({ ...u, balance: nextBal }));
    }

    fetch('/api/users/modify-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userPhone: target.phone,
        fallbackUser: target,
        action,
        amount: numAmt
      })
    }).catch(() => {});

    const delta = +(nextBal - curBal).toFixed(2);
    setTransactions((prev) => [
      {
        id: `tx_${Date.now()}_adm`,
        userId,
        type: delta >= 0 ? 'deposit' : 'withdraw',
        title: `Admin ${action.toUpperCase()} Balance`,
        detail: reason?.trim() || `Balance updated by Super Controller`,
        amount: delta,
        balanceAfter: nextBal,
        time: new Date().toLocaleString(),
        status: 'success'
      },
      ...prev
    ]);

    showToast(`Updated ${target.nickname} balance to ৳${nextBal.toFixed(2)}`);
    return { success: true, message: 'Balance updated' };
  };

  const adminUpdateUserRole = (userId: string, role: 'USER' | 'VIP' | 'ADMIN') => {
    lastUsersMutationAtRef.current = Date.now();
    const target = allUsers.find((u) => u.id === userId) || (user.id === userId ? user : undefined);
    setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    if (user.id === userId) {
      setUser((u) => ({ ...u, role }));
    }
    fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userPhone: target?.phone,
        fallbackUser: target,
        patch: { role }
      })
    }).catch(() => {});
    showToast(`Role updated to ${role}`);
  };

  const adminDeleteUser = (userId: string) => {
    lastUsersMutationAtRef.current = Date.now();
    deletedUserIdsRef.current.add(userId);
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deleteUser: true })
    }).catch(() => {});
    showToast('User account deleted');
  };

  const adminSendUserNotice = (userId: string, message: string) => {
    if (!message.trim()) return;
    const entry: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      title: 'Personal Admin Notice',
      message: message.trim(),
      type: 'system',
      read: false,
      time: new Date().toLocaleString()
    };
    setNotifications((prev) => [entry, ...prev].slice(0, 50));
    showToast('Personal notice sent to user!');
  };

  const updateWithdrawStatus = (id: string, status: 'processing' | 'completed' | 'rejected') => {
    const target = withdrawRequests.find((w) => w.id === id);
    if (!target) return;
    const prevStatus = target.status;

    lastWithdrawsMutationAtRef.current = Date.now();
    lastUsersMutationAtRef.current = Date.now();

    setWithdrawRequests((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status } : w))
    );

    if (status === 'completed' && prevStatus !== 'completed') {
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === target.userId
            ? { ...u, totalWithdrawn: +(Number(u.totalWithdrawn || 0) + target.amount).toFixed(2) }
            : u
        )
      );
      if (user.id === target.userId) {
        setUser((u) => ({
          ...u,
          totalWithdrawn: +(Number(u.totalWithdrawn || 0) + target.amount).toFixed(2)
        }));
      }
    } else if (status === 'rejected' && prevStatus !== 'rejected') {
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === target.userId
            ? { ...u, balance: +(Number(u.balance || 0) + target.amount).toFixed(2) }
            : u
        )
      );
      if (user.id === target.userId) {
        setUser((u) => ({
          ...u,
          balance: +(Number(u.balance || 0) + target.amount).toFixed(2)
        }));
      }
    }

    fetch('/api/withdraws/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    }).catch(() => {});

    showToast(`Withdrawal marked as ${status.toUpperCase()}`);
  };

  const sendBroadcastNotice = (title: string, message: string, target: 'all' | 'vip' | 'active') => {
    if (!title.trim() || !message.trim()) return;
    const notice: BroadcastNotice = {
      id: `brd_${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      target,
      time: new Date().toLocaleString()
    };

    updateAdminSettings({
      broadcasts: [notice, ...(adminSettings.broadcasts || [])]
    });

    const entry: AppNotification = {
      id: `notif_${Date.now()}_brd`,
      userId: 'ALL',
      title: title.trim(),
      message: message.trim(),
      type: 'system',
      read: false,
      time: new Date().toLocaleString()
    };
    setNotifications((prev) => [entry, ...prev].slice(0, 50));
    showToast('Broadcast sent to users!');
  };

  const deleteBroadcastNotice = (id: string) => {
    updateAdminSettings({
      broadcasts: (adminSettings.broadcasts || []).filter((b) => b.id !== id)
    });
    showToast('Broadcast deleted');
  };

  const currentPeriod = wingoMarkets[activeWingoMode].period;
  const timeRemaining = wingoMarkets[activeWingoMode].timeRemaining;
  const historyResults = wingoMarkets[activeWingoMode].history;

  const userNotifications = user.id
    ? notifications.filter((n) => n.userId === user.id || n.userId === 'ALL')
    : [];
  const unreadNotificationsCount = userNotifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        user,
        allUsers,
        referrals,
        transactions,
        depositRequests,
        withdrawRequests,
        bets,
        globalWingoBets,
        aviatorBets,
        syncServerDataNow,
        historyResults,
        activeWingoMode,
        setActiveWingoMode,
        wingoMarkets,
        wingoResultPopup,
        clearWingoResultPopup,
        currentPeriod,
        timeRemaining,
        binaryBets,
        candles,
        binaryMarkets,
        binaryCandleSecRemaining,
        attendance,
        adminSettings,
        language,
        toastMessage,
        activeTab,
        isNavigating,
        isAdminLoggedIn,
        invitationParam,
        binaryPrice,
        showInstallModal,
        setShowInstallModal,
        notifications: userNotifications,
        unreadNotificationsCount,
        isNotificationOpen,
        setIsNotificationOpen,
        markNotificationsRead,
        clearNotifications,
        syncWingoFromApi,
        wingoApiStatus,
        wingoLastSyncTime,
        supportMessages,
        sendSupportMessage,
        historyFilterTab,
        setHistoryFilterTab,
        firstDepositModalOpen,
        setFirstDepositModalOpen,
        claimExtraFirstDepositBonus,
        k3Bets,
        placeK3Bet,
        settleK3Round,
        d5Bets,
        placeD5Bet,
        settleD5Round,
        setActiveTab,
        setLanguage,
        showToast,
        login,
        register,
        logout,
        adminLogin,
        verifyAdmin2FA,
        adminLogout,
        adminAccessLogs,
        logAdminAccessEntry,
        heartbeatAdminAccess,
        updateAdminSettings,
        updateNickname,
        changeLoginPassword,
        updateUserAvatar,
        bindWallet,
        submitDepositRequest,
        approveDeposit,
        rejectDeposit,
        claimDepositBonus,
        claimVipReward,
        withdraw,
        transferSafe,
        claimGiftCode,
        claimAttendanceReward,
        placeBet,
        placeBinaryTrade,
        placeAviatorBet,
        cashOutAviatorBet,
        loseAviatorBet,
        placeMinesBet,
        cashOutMinesWin,
        claimAgentSalary,
        claimActivityAward,
        getInviteLink,
        copyInviteLink,
        copyInviteCode,
        setUserTurnover,
        toggleUserBan,
        adminModifyUserBalance,
        adminUpdateUserRole,
        adminDeleteUser,
        adminSendUserNotice,
        updateWithdrawStatus,
        sendBroadcastNotice,
        deleteBroadcastNotice,
        requestPasswordRecovery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
