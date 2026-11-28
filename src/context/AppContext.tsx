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
  AdminAccessLog,
  MarketPoolEntry,
  CrashPoolState,
  CoinFlipBet,
  EwiWingoMode,
  EwiWingoBet,
  GlobalLotteryBet,
  ActiveAdminSession,
  LudoRoomMode,
  LudoBetRecord,
  SportsMatch,
  SportsBet
} from '../types';
import {
  buildLotteryOrderNumber,
  formatFullOrderTimestamp
} from '../components/LotteryTradeDetailCard';
import { getClientDeviceName } from '../utils/deviceInfo';
import confetti from 'canvas-confetti';
import {
  checkBoundWalletInFirebase,
  saveBoundWalletInFirebase,
  subscribeAppSettingsInFirebase,
  saveAppSettingsToFirebase,
  getAppSettingsFromFirebase,
  subscribeUsersInFirebase,
  subscribeSingleUserInFirebase,
  saveUserToFirebase,
  updateUserInFirebase,
  deleteUserFromFirebase,
  fetchAllUsersFromFirebase,
  subscribeDepositsInFirebase,
  subscribeUserDepositsInFirebase,
  saveDepositToFirebase,
  updateDepositInFirebase,
  subscribeWithdrawsInFirebase,
  subscribeUserWithdrawsInFirebase,
  saveWithdrawToFirebase,
  updateWithdrawInFirebase,
  subscribeSupportMessagesInFirebase,
  subscribeUserSupportMessagesInFirebase,
  saveSupportMessageToFirebase,
  savePasswordRequestToFirebase,
  subscribeWingoBetsInFirebase,
  subscribeUserWingoBetsInFirebase,
  saveWingoBetToFirebase,
  subscribeTransactionsInFirebase,
  subscribeUserTransactionsInFirebase,
  saveTransactionToFirebase,
  subscribeNotificationsInFirebase,
  subscribeUserNotificationsInFirebase,
  saveNotificationToFirebase,
  subscribeAdminAccessLogsInFirebase,
  saveAdminAccessLogToFirebase,
  subscribeMarketPoolsInFirebase,
  saveMarketPoolInFirebase,
  subscribeReferralsInFirebase,
  subscribeUserReferralsInFirebase,
  saveReferralToFirebase,
  subscribeCrashStateInFirebase,
  saveCrashStateToFirebase,
  subscribeSportsBetsInFirebase,
  subscribeUserSportsBetsInFirebase,
  saveSportsBetToFirebase
} from '../lib/firebase';
import { BINARY_MARKETS, BINARY_MARKET_MAP } from '../constants/markets';
import { VIP_TIERS } from '../constants/vipTiers';
import {
  computeDailyIssueInfo,
  fetchLotteryHistory,
  nextIssueFromLatest
} from '../utils/lotteryApi';
import {
  evaluateCrash30Cap,
  evaluatePoolControl,
  getDateKeyWithOffset,
  getEwiWingoNumberMeta,
  getEwiWingoPeriodInfo,
  getSyncedBinarySnapshot,
  getSyncedWinGoNumber,
  subtractPeriodString
} from '../utils/syncedMarkets';
import {
  BD_PHONE_RULE_MSG,
  apiUrl,
  isValidBdFullPhone
} from '../utils/phoneAndApi';

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PASSWORD_RULE_MSG = 'The password must be at least 8 digits and must contain letters + numbers';

export const ATTENDANCE_TIERS = [
  { day: 1, requiredDeposit: 0, amount: 1 },
  { day: 2, requiredDeposit: 0, amount: 2 },
  { day: 3, requiredDeposit: 0, amount: 3 },
  { day: 4, requiredDeposit: 0, amount: 4 },
  { day: 5, requiredDeposit: 0, amount: 5 },
  { day: 6, requiredDeposit: 0, amount: 6 },
  { day: 7, requiredDeposit: 0, amount: 7 },
];

export const getLocalDateStr = (d: Date = new Date(), offsetMinutes?: number): string => {
  if (typeof offsetMinutes === 'number') {
    return getDateKeyWithOffset(d.getTime(), offsetMinutes);
  }
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
  globalLotteryBets: GlobalLotteryBet[];
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
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
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
    repliedByRole?: 'admin' | 'mentor';
    repliedByName?: string;
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
  ewiWingoBets: EwiWingoBet[];
  placeEwiWingoBet: (
    mode: EwiWingoMode,
    periodNumber: string,
    type: 'color' | 'number' | 'size',
    value: string | number,
    amount: number,
    multiplier: number
  ) => { success: boolean; message: string };
  settleEwiWingoRound: (mode: EwiWingoMode, periodNumber: string, resolvedNumber: number) => void;
  popLotteryQueue: (game: 'ewi_wingo' | 'k3' | 'd5', mode: string) => void;
  setActiveTab: (tab: string) => void;
  goBack: (fallbackTab?: string) => void;
  setLanguage: (lang: Language) => void;
  showToast: (msg: string) => void;
  login: (phoneOrEmail: string, pass: string, remember: boolean) => Promise<{ success: boolean; message: string }>;
  register: (phoneOrEmail: string, pass: string, inviteCode?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  adminLogin: (phone: string, pass: string) => Promise<{ success: boolean; message: string; requires2FA?: boolean; sessionConflict?: ActiveAdminSession }>;
  verifyAdmin2FA: (phone: string, pass: string, code: string) => Promise<{ success: boolean; message: string }>;
  adminLogout: () => void;
  visitorIpInfo: { ip: string; deviceName: string; isBannedIp: boolean };
  banIpGlobally: (ip: string) => Promise<void>;
  unbanIpGlobally: (ip: string) => Promise<void>;
  kickAdminSession: () => Promise<void>;
  ludoBets: LudoBetRecord[];
  placeLudoBet: (stake: number, mode: 'online_2p' | 'online_4p' | LudoRoomMode) => { success: boolean; message: string };
  settleLudoMatch: (
    winAmount: number,
    mode: 'online_2p' | 'online_4p' | LudoRoomMode,
    detail: string,
    stake: number,
    isRefund?: boolean
  ) => void;
  sportsMatches: SportsMatch[];
  sportsBets: SportsBet[];
  placeSportsBet: (matchId: string, selectedTeam: 'teamA' | 'teamB', amount: number) => Promise<{ success: boolean; message: string }>;
  upsertSportsMatch: (match: Partial<SportsMatch> & { sport: 'cricket' | 'football'; teamA: string; teamB: string }) => Promise<void>;
  settleSportsMatch: (matchId: string, winner: 'teamA' | 'teamB') => Promise<void>;
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
  bindWallet: (
    type: 'bKash' | 'Nagad' | 'Upay' | 'SureCash',
    number: string,
    loginPassword?: string,
    accountName?: string
  ) => Promise<{ success: boolean; message: string }>;
  bindUsdtAddress: (address: string, network?: string) => Promise<{ success: boolean; message: string }>;
  submitDepositRequest: (amount: number, method: 'bKash' | 'Nagad' | 'USDT', channel: string, senderNumber: string, trxId: string) => { success: boolean; message: string };
  initiateEwiPayDeposit: (
    amount: number,
    method: 'bKash' | 'Nagad' | 'USDT',
    channel: string,
    senderNumber?: string,
    usdAmountOverride?: number
  ) => Promise<{ success: boolean; message: string; checkoutUrl?: string; depositId?: string }>;
  syncEwiPayTransactions: () => Promise<any[]>;
  approveDeposit: (requestId: string) => void;
  rejectDeposit: (requestId: string, note?: string) => void;
  claimDepositBonus: () => { success: boolean; message: string };
  withdraw: (
    amount: number,
    method: 'bKash' | 'Nagad' | 'Upay' | 'SureCash' | 'USDT',
    loginPass?: string,
    opts?: { accountNumber?: string; accountName?: string; usdAmount?: number; network?: string }
  ) => { success: boolean; message: string };
  transferSafe: (amount: number, direction: 'in' | 'out') => { success: boolean; message: string };
  claimGiftCode: (code: string) => Promise<{ success: boolean; message: string; pendingDeposit?: boolean }>;
  claimAttendanceReward: (day: number) => { success: boolean; message: string };
  claimVipReward: (level: number, type: 'levelUp' | 'monthly', amount: number) => { success: boolean; message: string };
  placeBet: (mode: WinGoMode, type: 'color' | 'number' | 'size', value: string | number, amount: number, multiplier: number) => { success: boolean; message: string };
  placeBinaryTrade: (asset: string, direction: 'UP' | 'DOWN', amount: number, durationSeconds: number, entryPriceOverride?: number) => { success: boolean; message: string };
  placeAviatorBet: (roundId: string, amount: number, autoCashout?: number) => { success: boolean; message: string; betId?: string };
  cashOutAviatorBet: (betId: string, multiplier: number) => { success: boolean; winAmount: number };
  loseAviatorBet: (betId: string) => void;
  crashPoolStates: Record<'aviator' | 'luckyjet' | 'plane', CrashPoolState | null>;
  placeCrashBet: (game: 'aviator' | 'luckyjet' | 'plane', roundId: string, amount: number, autoCashout?: number, slot?: 1 | 2 | 3) => Promise<{ success: boolean; message: string; betId?: string; crashed?: boolean; crashPoint?: number }>;
  cancelCrashBet: (game: 'aviator' | 'luckyjet' | 'plane', betId: string) => Promise<{ success: boolean; message: string }>;
  cashOutCrashBet: (game: 'aviator' | 'luckyjet' | 'plane', betId: string, multiplier: number) => Promise<{ success: boolean; winAmount: number; crashed?: boolean; crashPoint?: number }>;
  claimWinGoStreakBonus: () => { success: boolean; message: string };
  claimWinGoSixStepRefund: () => { success: boolean; message: string };
  placeMinesBet: (amount: number, minesCount: number) => { success: boolean; message: string };
  cashOutMinesWin: (betAmount: number, winAmount: number, multiplier: number, minesCount: number) => { success: boolean; winAmount: number };
  incrementMinesRoundSeq: () => void;
  coinFlipBets: CoinFlipBet[];
  placeCoinFlipBet: (periodNumber: string, side: 'GOLD' | 'SILVER', amount: number) => { success: boolean; message: string; betId?: string };
  settleCoinFlipRound: (periodNumber: string, resultSide: 'GOLD' | 'SILVER') => void;
  marketPools: Record<string, MarketPoolEntry>;
  recordMarketPoolBet: (game: 'ewi_wingo' | 'k3' | 'd5' | 'mines' | 'binary' | 'coinflip', mode: string, period: string, selection: string, amount: number) => void;
  claimAgentSalary: (tierMembers: number, salaryAmount: number) => { success: boolean; message: string };
  claimActivityAward: (missionKey: string, targetBet: number, rewardAmount: number, isDaily: boolean) => { success: boolean; message: string };
  getInviteLink: () => string;
  copyInviteLink: () => void;
  copyInviteCode: () => void;
  setUserTurnover: (userId: string, requiredTurnover: number) => void;
  toggleUserBan: (userId: string, reason?: string) => void;
  adminModifyUserBalance: (userId: string, action: 'add' | 'deduct' | 'set', amount: number, reason?: string, opts?: { locked?: boolean; turnover?: number }) => { success: boolean; message: string };
  holdUserBalance: (userId: string, amount?: number, reason?: string) => { success: boolean; message: string };
  releaseLockedBalance: (userId: string, amount?: number) => { success: boolean; message: string };
  adminUpdateUserRole: (userId: string, role: 'USER' | 'VIP' | 'ADMIN') => void;
  adminDeleteUser: (userId: string) => void;
  adminSendUserNotice: (userId: string, message: string) => void;
  updateWithdrawStatus: (
    id: string,
    status: 'processing' | 'completed' | 'rejected',
    note?: string,
    turnoverPenalty?: number,
    meta?: { payoutTrxId?: string; userMessage?: string; rejectionReason?: string; ewiPayWithdrawId?: string }
  ) => void;
  sendBroadcastNotice: (title: string, message: string, target: 'all' | 'vip' | 'active') => void;
  deleteBroadcastNotice: (id: string) => void;
  requestPasswordRecovery: (phone: string, note?: string) => Promise<{ success: boolean; message: string }>;
  banNotice: string | null;
  clearBanNotice: () => void;
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
  lockedBalance: 0.00,
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
    htmlCode: '<!-- Deshi Win Official WinGo 30s Engine -->\n<div class="ewi-game" data-mode="30s">WinGo 30s Live</div>'
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
    htmlCode: '<!-- Deshi Win Official WinGo 1m Engine -->\n<div class="ewi-game" data-mode="1m">WinGo 1m Live</div>'
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
    htmlCode: '<!-- Deshi Win Official WinGo 3m Engine -->\n<div class="ewi-game" data-mode="3m">WinGo 3m Live</div>'
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
    htmlCode: '<!-- Deshi Win Official WinGo 5m Engine -->\n<div class="ewi-game" data-mode="5m">WinGo 5m Live</div>'
  },
  {
    id: 'game_aviator',
    slug: 'aviator-plane',
    title: 'Aviator Plane',
    imageUrl: '',
    category: 'Slots',
    badge: '10000X',
    price: '10000X',
    sortOrder: 5,
    active: true,
    featured: true,
    targetTab: 'aviator',
    htmlCode: '<!-- Deshi Win Aviator Crash Engine -->\n<div class="ewi-game" data-game="aviator">Aviator Plane Crash</div>'
  },
  {
    id: 'game_plane',
    slug: 'plane',
    title: 'PLANE',
    imageUrl: '',
    category: 'Casino',
    badge: '20000X',
    price: '20000X',
    sortOrder: 6.1,
    active: true,
    featured: true,
    targetTab: 'plane',
    htmlCode: '<!-- Deshi Win PLANE Biplane Crash Engine -->\n<div class="ewi-game" data-game="plane">PLANE Aviation Crash</div>'
  },
  {
    id: 'game_ludo',
    slug: 'ewi-ludo',
    title: 'Deshi Ludo',
    imageUrl: '',
    category: 'Casino',
    badge: '1.9X',
    price: '1.9X',
    sortOrder: 6.3,
    active: true,
    featured: true,
    targetTab: 'ludo',
    htmlCode: '<!-- Deshi Win Multiplayer & Match Ludo -->\n<div class="ewi-game" data-game="ludo">Deshi Ludo Live</div>'
  },
  {
    id: 'game_sports',
    slug: 'live-sports',
    title: 'Live Cricket & Football',
    imageUrl: '',
    category: 'Casino',
    badge: 'LIVE',
    price: '1.90X',
    sortOrder: 6.4,
    active: true,
    featured: true,
    targetTab: 'sports',
    htmlCode: '<!-- Deshi Win Live Cricket & Football Team Betting -->\n<div class="ewi-game" data-game="sports">Live Sports</div>'
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
    htmlCode: '<!-- Deshi Win Binary Market Engine -->\n<div class="ewi-game" data-game="binary">Binary Trading Live</div>'
  },
  {
    id: 'game_mines',
    slug: 'mines-777',
    title: 'Mines 777',
    imageUrl: '',
    category: 'Slots',
    badge: 'NEW',
    price: '24X+',
    sortOrder: 7,
    active: true,
    featured: true,
    targetTab: 'mines',
    htmlCode: '<!-- Deshi Win Mines Treasure Engine -->\n<div class="ewi-game" data-game="mines">Mines 777 Live</div>'
  },
  {
    id: 'game_k3',
    slug: 'k3-lottery',
    title: 'Deshi K3',
    imageUrl: '',
    category: 'Lottery',
    badge: '207X',
    price: '207X',
    sortOrder: 8,
    active: true,
    featured: true,
    targetTab: 'k3',
    htmlCode: '<!-- Deshi Win K3 Dice Lottery Engine -->\n<div class="ewi-game" data-game="k3">Deshi K3 Dice Live</div>'
  },
  {
    id: 'game_5d',
    slug: '5d-lottery',
    title: 'Deshi 5D',
    imageUrl: '',
    category: 'Lottery',
    badge: '9X',
    price: '9X',
    sortOrder: 9,
    active: true,
    featured: true,
    targetTab: '5d',
    htmlCode: '<!-- Deshi Win 5D Number Lottery Engine -->\n<div class="ewi-game" data-game="5d">Deshi 5D Lottery Live</div>'
  },
  {
    id: 'game_luckyjet',
    slug: 'lucky-jet',
    title: 'Lucky Jet',
    imageUrl: '',
    category: 'Slots',
    badge: '10000X',
    price: '10000X',
    sortOrder: 10,
    active: true,
    featured: true,
    targetTab: 'luckyjet',
    htmlCode: '<!-- Deshi Win Lucky Jet Crash Engine -->\n<div class="ewi-game" data-game="luckyjet">Lucky Jet Live</div>'
  },
  {
    id: 'game_coinflip',
    slug: 'coin-flip',
    title: 'Coin Flip',
    imageUrl: '',
    category: 'Slots',
    badge: '1.89X',
    price: '1.89X',
    sortOrder: 11,
    active: true,
    featured: true,
    targetTab: 'coinflip',
    htmlCode: '<!-- Deshi Win Coin Flip Engine -->\n<div class="ewi-game" data-game="coinflip">Coin Flip Gold/Silver</div>'
  },
  {
    id: 'game_gold_market',
    slug: 'gold-market',
    title: 'Gold Market',
    imageUrl: '/assets/aistudio/image_2c2d654f.png',
    category: 'Trading',
    badge: 'XAU/USD',
    price: '90%',
    sortOrder: 12,
    active: true,
    featured: true,
    targetTab: 'gold-market',
    htmlCode: '<!-- Deshi Win Gold Spot XAU/USD Trading -->\n<div class="ewi-game" data-game="gold-market" data-asset="XAU/USD">Gold Market Live</div>'
  },
  {
    id: 'game_ewi_wingo',
    slug: 'ewi-wingo',
    title: 'Deshi WinGo',
    imageUrl: '',
    category: 'Lottery',
    badge: '15S+',
    price: '1.89X',
    sortOrder: 4.5,
    active: true,
    featured: true,
    targetTab: 'ewi-wingo',
    htmlCode: '<!-- Deshi WinGo 15s-3m Engine -->\n<div class="ewi-game" data-game="ewi-wingo">Deshi WinGo Live</div>'
  }
];

const OLD_DEFAULT_ADMIN_PHONE_HASH = '0aab39f411ae77619215a3cd679005519c52baa0758214ec51901ea355d006f1';
const OLD_DEFAULT_ADMIN_PASS_HASH = '07882c957ec3bb16b8f5ec021707910625689e5e011811ce855fb5aeeddc1874';
export const DEFAULT_ADMIN_PHONE_HASH = '27c75197134a88ef96daf2bdb444e3d6a0a394b9fa857b886c42b1988dd75d47';
export const DEFAULT_ADMIN_PASS_HASH = 'bfbbb4e8bb9a402d888fd5133a41cf3d2423b82849d05bb63b2be5740f322814';
const REQUEST_EXPIRY_MS = 60 * 60 * 1000;

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

function sanitizeAppLogoUrl(val: unknown): string {
  const s = String(val || '').trim();
  if (!s) return '';
  if (s.includes('image_0435eabf') || s.includes('pink') && s.includes('ewi')) return '';
  return s;
}

function sanitizeBannerListClient(list: any): AdminSettings['banners'] {
  if (!Array.isArray(list)) return DEFAULT_BANNERS;
  return list
    .map((b: any) => {
      const url = String(b?.url || '');
      const cleanTitle = String(b?.title || '')
        .replace(/Hney Win|EWI 777|EWI777/gi, 'Deshi Win')
        .replace(/\bHney\b/gi, 'Deshi');
      if (url.includes('image_06ccef65') || url.includes('welcome-200-banner')) {
        return { ...b, title: cleanTitle, url: '/assets/brand/deshi-banner-2.jpg' };
      }
      if (url.includes('image_8c5384f7') || url.includes('image_3c433c14') || url.includes('image_046bb074')) {
        return { ...b, title: cleanTitle, url: '/assets/brand/deshi-banner-1.jpg' };
      }
      if (url.includes('image_d2e764e7')) {
        return { ...b, title: cleanTitle, url: '/assets/brand/deshi-banner-3.jpg' };
      }
      return { ...b, title: cleanTitle };
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
    title: 'Deshi Win Official Crown Event',
    url: '/assets/brand/deshi-banner-1.jpg',
    link: '#/wingo',
    sortOrder: 1,
    active: true
  },
  {
    id: 'ban_welcome_200_bonus',
    title: 'Deshi Win Welcome Bonus up to 200%',
    url: '/assets/brand/deshi-banner-2.jpg',
    link: '#/deposit',
    sortOrder: 2,
    active: true
  },
  {
    id: 'ban_ewi777_usdt_2pct',
    title: 'Deshi Win USDT 5% Instant Bonus ($2 - $20,000)',
    url: '/assets/brand/deshi-banner-3.jpg',
    link: '#/deposit',
    sortOrder: 3,
    active: true
  }
];

const INITIAL_ADMIN_SETTINGS: AdminSettings = {
  bkashNumber: '',
  nagadNumber: '',
  rocketNumber: '',
  usdtAddress: '',
  binancePayId: '',
  firstDepositBonusAmount: 50,
  minWithdraw: 300,
  referCommissionPercent: 10,
  depositInstructions: 'Minimum deposit ৳200 (bKash/Nagad via EWI PAY) or USDT / Binance Pay ($2–$20,000 +5% Instant Bonus).',
  nextWingoOutcome: 'AUTO',
  nextWingoOutcomes: {
    '30s': 'AUTO',
    '1m': 'AUTO',
    '3m': 'AUTO',
    '5m': 'AUTO'
  },
  queuedWingoOutcomes: {},
  nextEwiWingoOutcomes: { '15s': 'AUTO', '30s': 'AUTO', '1m': 'AUTO', '3m': 'AUTO' },
  queuedEwiWingoOutcomes: {},
  nextK3Outcomes: { '1m': 'AUTO', '3m': 'AUTO', '5m': 'AUTO', '10m': 'AUTO' },
  queuedK3Outcomes: {},
  nextD5Outcomes: { '1m': 'AUTO', '3m': 'AUTO', '5m': 'AUTO', '10m': 'AUTO' },
  queuedD5Outcomes: {},
  wingoSyncPath: 'wingo',
  wingoPattern: '1,2,3,4,5',
  showTopEarners: false,
  appName: 'Deshi Win',
  appLogoUrl: '',
  supportLink: '',
  supportPhone: '',
  siteEnabled: true,
  depositEnabled: true,
  withdrawEnabled: true,
  giftCodeEnabled: true,
  registrationEnabled: true,
  maintenanceMode: false,
  timezoneOffsetMinutes: 360,
  gameControlModes: {
    ewiWingo: 'HIGH_BET_LOSS',
    k3: 'HIGH_BET_LOSS',
    d5: 'HIGH_BET_LOSS',
    mines: 'AUTO',
    binary: 'HIGH_BET_LOSS',
    coinflip: 'HIGH_BET_LOSS'
  },
  minesPattern: 'RANDOM',
  binaryNextCandleBias: 'AUTO',
  marqueeText: 'Notice: Welcome to Deshi Win online entertainment. Fast 24/7 deposits & payouts via EWI PAY (bKash & Nagad) and Binance Pay (+5% USDT Bonus).',
  popupTitle: 'Daily Recharge USDT 5% Bonus',
  popupMessage: 'Recharge via USDT (Binance Pay) today and get an instant +5% Bonus automatically on every deposit!',
  popupImageUrl: '/assets/brand/deshi-announcement-usdt-5.jpg',
  enableSystemPopup: true,
  usdtRateBdt: 120,
  banners: DEFAULT_BANNERS,
  bannersCustomized: false,
  activeGiftCodes: [],
  games: DEFAULT_GAMES,
  broadcasts: [],
  mentors: [],
  mentorLogs: [],
  bannedIps: [],
  mentorBlockedIps: [],
  paymentGateways: [],
  sportsMatches: [
    {
      id: 'sp_cr_ban_ind',
      sport: 'cricket',
      league: 'T20 International Series',
      teamA: 'Bangladesh Tigers',
      teamB: 'India Royals',
      teamAOdds: 2.15,
      teamBOdds: 1.72,
      scoreA: '148/4 (15.2)',
      scoreB: 'Yet to bat',
      statusText: '1st Innings Live',
      status: 'live',
      startTime: 'Live Now',
      updatedAt: 1700000000000
    },
    {
      id: 'sp_cr_aus_eng',
      sport: 'cricket',
      league: 'ODI Champions Clash',
      teamA: 'Australia',
      teamB: 'England',
      teamAOdds: 1.85,
      teamBOdds: 1.98,
      scoreA: '264/6 (44.0)',
      scoreB: 'Target Pending',
      statusText: 'Live Powerplay',
      status: 'live',
      startTime: 'Live Now',
      updatedAt: 1700000000000
    },
    {
      id: 'sp_cr_bpl_com_syl',
      sport: 'cricket',
      league: 'Premier T20 Cup',
      teamA: 'Comilla Victorians',
      teamB: 'Sylhet Strikers',
      teamAOdds: 1.78,
      teamBOdds: 2.08,
      scoreA: '0/0',
      scoreB: '0/0',
      statusText: 'Starts Today 19:30',
      status: 'upcoming',
      startTime: '19:30 BST',
      updatedAt: 1700000000000
    },
    {
      id: 'sp_fb_rma_fcb',
      sport: 'football',
      league: 'La Liga El Clasico',
      teamA: 'Real Madrid',
      teamB: 'FC Barcelona',
      teamAOdds: 1.92,
      teamBOdds: 1.95,
      scoreA: '2',
      scoreB: '1',
      statusText: "68' 2nd Half Live",
      status: 'live',
      startTime: 'Live Now',
      updatedAt: 1700000000000
    },
    {
      id: 'sp_fb_mci_ars',
      sport: 'football',
      league: 'English Premier League',
      teamA: 'Manchester City',
      teamB: 'Arsenal',
      teamAOdds: 1.84,
      teamBOdds: 2.05,
      scoreA: '1',
      scoreB: '1',
      statusText: "52' Live",
      status: 'live',
      startTime: 'Live Now',
      updatedAt: 1700000000000
    },
    {
      id: 'sp_fb_arg_bra',
      sport: 'football',
      league: 'International Friendly',
      teamA: 'Argentina',
      teamB: 'Brazil',
      teamAOdds: 1.88,
      teamBOdds: 1.96,
      scoreA: '0',
      scoreB: '0',
      statusText: 'Kickoff 21:00',
      status: 'upcoming',
      startTime: '21:00 BST',
      updatedAt: 1700000000000
    }
  ],
  activeAdminSession: null,
  adminPhoneHash: DEFAULT_ADMIN_PHONE_HASH,
  adminPasswordHash: DEFAULT_ADMIN_PASS_HASH
};

const INITIAL_REFERRALS: ReferralMember[] = [];

const INITIAL_TRANSACTIONS: Transaction[] = [];

// Helper to calculate VIP level based on cumulative deposits (VIP 1 starts at ৳2,000 -> VIP 9 at ৳15,000,000)
export const calculateVipFromDeposit = (totalDeposited: number): number => {
  for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
    if (totalDeposited >= VIP_TIERS[i].requiredDeposit) return VIP_TIERS[i].level;
  }
  return 0;
};

// Generate shared deterministic candlesticks for all 17 Binary Trading markets prior to first server poll
const buildSeedBinaryMarkets = (): Record<string, BinaryMarketQuote> => {
  return getSyncedBinarySnapshot(BINARY_MARKETS, Date.now()).markets;
};

export const PUBLIC_UNAUTH_TABS = new Set([
  'home',
  'activity',
  'promotion',
  'wallet',
  'account',
  'login',
  'register',
  'registration',
  'customer-service',
  'live-chat',
  'privacy-&-risk',
  'admin',
  'mentor'
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
  const computedLevel = calculateVipFromDeposit(totalDep);
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

    const cleanHash = hash.replace(/^#+/, '').replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '').toLowerCase();
    const cleanPath = pathname.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
    const hasHash = hash.startsWith('#');
    const target = hasHash ? cleanHash : cleanPath;

    if (cleanPath === 'mentor-ewi777-panel' || cleanHash === 'mentor-ewi777-panel' || target === 'mentor-ewi777-panel') {
      return 'mentor';
    }
    if (cleanPath === 'admin-ewi777-panel-009' || cleanHash === 'admin-ewi777-panel-009' || target === 'admin-ewi777-panel-009') {
      return 'admin';
    }
    if (target === 'admin' || cleanPath === 'admin') {
      return isLoggedIn ? 'home' : 'login';
    }

    if (!target || target === 'home') resolved = 'home';
    else if (target === 'wallet') resolved = 'wallet';
    else if (target === 'withdraw') resolved = 'withdraw';
    else if (target === 'deposit') resolved = 'deposit';
    else if (target === 'safe') resolved = 'safe';
    else if (target === 'vip') resolved = 'vip';
    else if (target === 'wingo') resolved = 'wingo';
    else if (target === 'plane') resolved = 'plane';
    else if (target === 'aviator' || target === 'aviator-plane') resolved = 'aviator';
    else if (target === 'luckyjet' || target === 'lucky-jet') resolved = 'luckyjet';
    else if (target === 'coinflip' || target === 'coin-flip') resolved = 'coinflip';
    else if (target === 'gold-market') resolved = 'gold-market';
    else if (target === 'binary' || target === 'binary-market') resolved = 'binary';
    else if (target === 'activity') resolved = 'activity';
    else if (target === 'promotion' || target === 'invite') resolved = 'promotion';
    else if (target === 'account') resolved = 'account';
    else if (target === 'login') resolved = 'login';
    else if (target === 'register' || target === 'registration') resolved = 'register';
    else if (target === 'transaction-history' || target === 'deposit-history' || target === 'withdraw-history') resolved = 'transaction-history';
    else if (target === 'privacy-&-risk' || target === 'privacy-risk' || target === 'privacy-and-risk') resolved = 'privacy-&-risk';
    else if (target === 'live-chat') resolved = 'live-chat';
    else if (target === 'customer-service') resolved = 'customer-service';
    else if (target === 'salary') resolved = 'salary';
    else if (target === 'gifts') resolved = 'gifts';
    else if (target === 'cheking' || target === 'checking' || target === 'attendence' || target === 'attendance') resolved = 'attendence';
    else if (target === 'change-nickname') resolved = 'change-nickname';
    else if (target === 'change-login-password') resolved = 'change-login-password';
    else if (target === 'language') resolved = 'language';
    else if (target === 'mines') resolved = 'mines';
    else if (target === 'k3') resolved = 'k3';
    else if (target === '5d') resolved = '5d';
    else if (target === 'game-statistics') resolved = 'game-statistics';
    else if (target === 'ewi-wingo' || target === 'ewiwingo') resolved = 'ewi-wingo';
    else if (target === 'all-chart' || target === 'allchart' || target === 'all-charts') resolved = 'all-chart';
    else if (target === 'activity-award') resolved = 'activity-award';
    else if (target === 'betting-rebate') resolved = 'betting-rebate';
    else if (target === 'super-jackpot') resolved = 'super-jackpot';
    else if (target === 'first-gift') resolved = 'first-gift';
    else if (target === 'casino') resolved = 'casino';
    else if (target === 'slots') resolved = 'slots';
    else if (target === 'ludo' || target === 'ewi-ludo') resolved = 'ludo';
    else if (target === 'sports' || target === 'live-sports') resolved = 'sports';

    try {
      const sp = new URLSearchParams(window.location.search);
      const qRoom = sp.get('room');
      const hIdx = hash.indexOf('?');
      const hRoom = hIdx >= 0 ? new URLSearchParams(hash.slice(hIdx + 1)).get('room') : null;
      const roomCode = (qRoom || hRoom || '').trim().toUpperCase();
      if (roomCode) {
        sessionStorage.setItem('ewi777_pending_ludo_room', roomCode);
      }
    } catch {}
  } catch {}

  if (!isLoggedIn && !PUBLIC_UNAUTH_TABS.has(resolved)) {
    return 'login';
  }
  return resolved;
};

// Utility to normalize Bangladeshi phone numbers (01XXXXXXXXX for valid BD mobile prefixes)
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
        payout += bet.totalAmount * 1.89;
      }
    } else if (bet.type === 'color') {
      if (bet.value === 'green') {
        if ([1, 3, 7, 9].includes(candidate)) payout += bet.totalAmount * 1.89;
        else if (candidate === 5) payout += bet.totalAmount * 1.5;
      } else if (bet.value === 'red') {
        if ([2, 4, 6, 8].includes(candidate)) payout += bet.totalAmount * 1.89;
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

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function isMentorRouteActive(): boolean {
  try {
    const loc = `${window.location.pathname} ${window.location.hash}`.toLowerCase();
    return loc.includes('mentor-ewi777-panel');
  } catch {
    return false;
  }
}

function isPrivilegedSessionHost(isAdminAuth?: boolean): boolean {
  if (isAdminAuth) return true;
  try {
    const loc = `${window.location.pathname} ${window.location.hash}`.toLowerCase();
    return loc.includes('admin-ewi777-panel-009') || loc.includes('mentor-ewi777-panel');
  } catch {
    return false;
  }
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
            lockedBalance: Number(parsed.lockedBalance) || 0,
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
    safeLocalStorageSet('ewi777_all_bound_numbers', JSON.stringify(globalBoundNumbers.slice(-2000)));
  }, [globalBoundNumbers]);

  const [referrals, setReferrals] = useState<ReferralMember[]>(() => {
    try {
      const saved = localStorage.getItem('win777_referrals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const fakeUids = new Set(['1849102', '1904128', '2019483']);
          return parsed.filter((r: ReferralMember) => r && !fakeUids.has(String(r.uid)));
        }
      }
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
        const loadedGames = withNewGames
          .filter((g: GameItem) => g.id !== 'game_ewi_roulette' && g.slug !== 'ewi-roulette')
          .map((g: GameItem) => {
          if (g.id === 'game_aviator') return { ...g, category: 'Slots' as const, badge: '10000X', price: '10000X' };
          if (g.id === 'game_luckyjet') return { ...g, category: 'Slots' as const, badge: '10000X', price: '10000X' };
          if (g.id === 'game_mines') return { ...g, category: 'Slots' as const };
          if (g.id === 'game_coinflip') return { ...g, category: 'Slots' as const, badge: '1.89X', price: '1.89X' };
          if (g.id === 'game_plane') return { ...g, title: 'PLANE', category: 'Casino' as const, targetTab: 'plane', badge: '20000X', price: '20000X' };
          if (g.id === 'game_ludo') return { ...g, title: 'Deshi Ludo', category: 'Casino' as const, targetTab: 'ludo' };
          if (g.id === 'game_k3') return { ...g, title: 'Deshi K3' };
          if (g.id === 'game_5d') return { ...g, title: 'Deshi 5D' };
          if (g.id === 'game_ewi_wingo') return { ...g, title: 'Deshi WinGo' };
          if (g.id === 'game_gold_market') {
            return {
              ...g,
              imageUrl: g.imageUrl || '/assets/aistudio/image_2c2d654f.png',
              targetTab: 'gold-market'
            };
          }
          return g;
        });
        const hasLegacyRetiredBanner =
          Array.isArray(parsed.banners) &&
          parsed.banners.some((b: any) => String(b?.url || '').includes('image_3c433c14') || String(b?.url || '').includes('image_046bb074'));
        const hasCustomBanners = Boolean(parsed.bannersCustomized) && !hasLegacyRetiredBanner;
        const loadedBanners = hasCustomBanners
          ? sanitizeBannerListClient(parsed.banners)
          : DEFAULT_BANNERS;
        const { adminPhone: _legacyP, adminPassword: _legacyPw, ...cleanParsed } = parsed;
        const rawPhoneH =
          parsed.adminPhoneHash ||
          (_legacyP ? sha256HexSync(normalizePhone(String(_legacyP))) : DEFAULT_ADMIN_PHONE_HASH);
        const rawPassH =
          parsed.adminPasswordHash ||
          (_legacyPw ? sha256HexSync(String(_legacyPw)) : DEFAULT_ADMIN_PASS_HASH);
        const adminPhoneHash = rawPhoneH === OLD_DEFAULT_ADMIN_PHONE_HASH ? DEFAULT_ADMIN_PHONE_HASH : rawPhoneH;
        const adminPasswordHash = rawPassH === OLD_DEFAULT_ADMIN_PASS_HASH ? DEFAULT_ADMIN_PASS_HASH : rawPassH;
        const normalizedAppName =
          !cleanParsed.appName || /^(ewi\s*777|ewi777|hney\s*win|hneywin|honey\s*win|honey)$/i.test(String(cleanParsed.appName).trim())
            ? 'Deshi Win'
            : String(cleanParsed.appName);
        return {
          ...INITIAL_ADMIN_SETTINGS,
          ...cleanParsed,
          appName: normalizedAppName,
          marqueeText:
            typeof cleanParsed.marqueeText === 'string' && cleanParsed.marqueeText
              ? cleanParsed.marqueeText.replace(/Hney Win|EWI 777|EWI777/gi, 'Deshi Win').replace(/\bHney\b/gi, 'Deshi')
              : INITIAL_ADMIN_SETTINGS.marqueeText,
          appLogoUrl: sanitizeAppLogoUrl(cleanParsed.appLogoUrl),
          gameControlModes: {
            ...INITIAL_ADMIN_SETTINGS.gameControlModes!,
            ...(cleanParsed.gameControlModes || {})
          },
          bkashNumber: sanitizeGatewayNumber(cleanParsed.bkashNumber),
          nagadNumber: sanitizeGatewayNumber(cleanParsed.nagadNumber),
          supportPhone: sanitizeGatewayNumber(cleanParsed.supportPhone),
          binancePayId: String(cleanParsed.binancePayId || '').trim(),
          firstDepositBonusAmount:
            typeof cleanParsed.firstDepositBonusAmount === 'number' && cleanParsed.firstDepositBonusAmount >= 0
              ? cleanParsed.firstDepositBonusAmount
              : 50,
          popupTitle:
            typeof cleanParsed.popupTitle === 'string' && cleanParsed.popupTitle.trim()
              ? cleanParsed.popupTitle
              : 'Daily Recharge USDT 5% Bonus',
          popupMessage:
            typeof cleanParsed.popupMessage === 'string' && cleanParsed.popupMessage.trim()
              ? cleanParsed.popupMessage
              : 'Recharge via USDT (Binance Pay) today and get an instant +5% Bonus automatically on every deposit!',
          popupImageUrl:
            typeof cleanParsed.popupImageUrl === 'string' && cleanParsed.popupImageUrl.trim()
              ? cleanParsed.popupImageUrl
              : '/assets/brand/deshi-announcement-usdt-5.jpg',
          enableSystemPopup:
            typeof cleanParsed.enableSystemPopup === 'boolean' ? cleanParsed.enableSystemPopup : true,
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
  const tabHistoryRef = useRef<string[]>([]);
  const activeTabRef = useRef<string>(activeTab);
  activeTabRef.current = activeTab;
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
  const [banNotice, setBanNotice] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ewi777_ban_notice') || null;
    } catch {
      return null;
    }
  });
  const clearBanNotice = () => {
    setBanNotice(null);
    try {
      localStorage.removeItem('ewi777_ban_notice');
    } catch {}
  };
  const [firstDepositModalOpen, setFirstDepositModalOpen] = useState<boolean>(false);
  const [k3Bets, setK3Bets] = useState<K3Bet[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_k3_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const k3BetsRef = useRef<K3Bet[]>(k3Bets);
  k3BetsRef.current = k3Bets;
  const [d5Bets, setD5Bets] = useState<D5Bet[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_d5_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const d5BetsRef = useRef<D5Bet[]>(d5Bets);
  d5BetsRef.current = d5Bets;
  const [coinFlipBets, setCoinFlipBets] = useState<CoinFlipBet[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_coinflip_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [ewiWingoBets, setEwiWingoBets] = useState<EwiWingoBet[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_ewi_wingo_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const ewiWingoBetsRef = useRef<EwiWingoBet[]>(ewiWingoBets);
  ewiWingoBetsRef.current = ewiWingoBets;
  const [ludoBets, setLudoBets] = useState<LudoBetRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_ludo_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [sportsBets, setSportsBets] = useState<SportsBet[]>(() => {
    try {
      const saved = localStorage.getItem('ewi777_sports_bets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const settledSportsBetIdsRef = useRef<Set<string>>(new Set());
  const [visitorIpInfo, setVisitorIpInfo] = useState<{ ip: string; deviceName: string; isBannedIp: boolean }>(() => ({
    ip: '',
    deviceName: getClientDeviceName(),
    isBannedIp: false
  }));
  const settledK3PeriodsRef = useRef<Set<string>>(new Set());
  const settledD5PeriodsRef = useRef<Set<string>>(new Set());
  const settledEwiWingoPeriodsRef = useRef<Set<string>>(new Set());
  const [marketPools, setMarketPools] = useState<Record<string, MarketPoolEntry>>({});
  const marketPoolsRef = useRef<Record<string, MarketPoolEntry>>({});
  marketPoolsRef.current = marketPools;
  const [crashPoolStates, setCrashPoolStates] = useState<Record<'aviator' | 'luckyjet' | 'plane', CrashPoolState | null>>({
    aviator: null,
    luckyjet: null,
    plane: null
  });
  const crashPoolStatesRef = useRef(crashPoolStates);
  crashPoolStatesRef.current = crashPoolStates;
  const rollingCrashFallbackRef = useRef<{ wagered: number; paidOut: number }>({ wagered: 0, paidOut: 0 });
  const theme: 'dark' | 'light' = 'light';
  const setTheme = (_next: 'dark' | 'light') => {};
  const toggleTheme = () => {};

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
      for (let i = 1; i <= 10; i++) {
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
  const [globalLotteryBets, setGlobalLotteryBets] = useState<GlobalLotteryBet[]>([]);

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

  // Compute Daily Sign-In Bonus days (Day 1 ৳1 up to Day 7 ৳7, unlocks at 12:00 AM, resets to Day 1 after Day 7 or missed day)
  const attendance: AttendanceDay[] = React.useMemo(() => {
    const tzOffset =
      typeof adminSettings.timezoneOffsetMinutes === 'number' ? adminSettings.timezoneOffsetMinutes : 360;
    const today = getDateKeyWithOffset(Date.now(), tzOffset);
    const yesterday = getDateKeyWithOffset(Date.now() - 86400000, tzOffset);
    const attState = user.attendanceState || { claimedDays: [], streak: 0 };
    const rawClaimedDays = Array.isArray(attState.claimedDays) ? attState.claimedDays : [];
    const lastClaimDate = attState.lastClaimDate;
    const claimedToday = lastClaimDate === today;
    const missedDay = Boolean(lastClaimDate && lastClaimDate !== today && lastClaimDate !== yesterday);
    const cycleCompletedEarlier = rawClaimedDays.length >= 7 && !claimedToday;
    const effectiveClaimed = missedDay || cycleCompletedEarlier ? [] : rawClaimedDays;

    const nextUnclaimed = ATTENDANCE_TIERS.find((t) => !effectiveClaimed.includes(t.day))?.day ?? null;

    return ATTENDANCE_TIERS.map((tier) => {
      const isClaimed = effectiveClaimed.includes(tier.day);
      if (isClaimed) {
        return {
          day: tier.day,
          requiredDeposit: 0,
          amount: tier.amount,
          claimed: true,
          status: 'claimed' as const,
          lockReason: 'Claimed'
        };
      }

      if (!user.isLoggedIn) {
        return {
          day: tier.day,
          requiredDeposit: 0,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: 'Login required'
        };
      }

      if (claimedToday) {
        return {
          day: tier.day,
          requiredDeposit: 0,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: 'Come back tomorrow (12:00 AM)'
        };
      }

      if (tier.day !== nextUnclaimed) {
        return {
          day: tier.day,
          requiredDeposit: 0,
          amount: tier.amount,
          claimed: false,
          status: 'locked' as const,
          lockReason: `Claim Day ${nextUnclaimed} first`
        };
      }

      return {
        day: tier.day,
        requiredDeposit: 0,
        amount: tier.amount,
        claimed: false,
        status: 'available' as const
      };
    });
  }, [user.isLoggedIn, user.attendanceState, adminSettings.timezoneOffsetMinutes]);

  // Persist states safely without localStorage QuotaExceededError crashes
  useEffect(() => {
    safeLocalStorageSet('win777_current_user', JSON.stringify(user));
    if (user.isLoggedIn && user.id) {
      setAllUsers((prev) => {
        const exists = prev.some((u) => u.id === user.id);
        if (!exists) return prev;
        return prev.map((u) => (u.id === user.id ? { ...u, ...user } : u));
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isPrivilegedSessionHost(isAdminLoggedIn)) return;
    safeLocalStorageSet('win777_all_users', JSON.stringify(allUsers.slice(0, 600)));
  }, [allUsers, isAdminLoggedIn]);

  useEffect(() => {
    safeLocalStorageSet('win777_admin_settings', JSON.stringify(adminSettings));
  }, [adminSettings]);

  useEffect(() => {
    safeLocalStorageSet('win777_admin_auth', isAdminLoggedIn ? 'true' : 'false');
  }, [isAdminLoggedIn]);

  useEffect(() => {
    safeLocalStorageSet('win777_deposit_requests', JSON.stringify(depositRequests.slice(0, 100)));
  }, [depositRequests]);

  useEffect(() => {
    safeLocalStorageSet('ewi777_withdraw_requests', JSON.stringify(withdrawRequests.slice(0, 100)));
  }, [withdrawRequests]);

  useEffect(() => {
    safeLocalStorageSet('win777_referrals', JSON.stringify(referrals.slice(0, 200)));
  }, [referrals]);

  const didInitWinFeedSyncRef = useRef(false);
  const reportedWinTxIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    safeLocalStorageSet('win777_transactions', JSON.stringify(transactions.slice(0, 150)));
    if (!didInitWinFeedSyncRef.current) {
      didInitWinFeedSyncRef.current = true;
      for (const tx of transactions) {
        if (tx?.id) reportedWinTxIdsRef.current.add(tx.id);
      }
      return;
    }
    if (!user.isLoggedIn) return;
    for (const tx of transactions.slice(0, 8)) {
      if (!tx?.id || reportedWinTxIdsRef.current.has(tx.id)) continue;
      reportedWinTxIdsRef.current.add(tx.id);
      const tType = String(tx.type || '');
      const winAmt = Number(tx.amount || 0);
      if (!tType.endsWith('_win') || winAmt <= 0) continue;
      const gameKey =
        tType === 'binary_win'
          ? String(tx.title || '').toLowerCase().includes('gold')
            ? 'gold'
            : 'binary'
          : tType.replace(/_win$/, '');
      fetch(apiUrl('/api/leaderboard/record-win'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `tx_${tx.id}`,
          userId: user.id,
          uid: user.uid,
          phone: user.phone,
          avatar: user.avatar,
          game: gameKey,
          amount: winAmt,
          ts: Date.now()
        })
      }).catch(() => {});
    }
  }, [transactions, user.isLoggedIn, user.id, user.uid, user.phone, user.avatar]);

  useEffect(() => {
    safeLocalStorageSet('win777_bets', JSON.stringify(bets.slice(0, 150)));
  }, [bets]);

  useEffect(() => {
    safeLocalStorageSet('win777_aviator_bets', JSON.stringify(aviatorBets.slice(0, 100)));
  }, [aviatorBets]);

  useEffect(() => {
    safeLocalStorageSet('win777_binary_bets', JSON.stringify(binaryBets.slice(0, 100)));
  }, [binaryBets]);

  useEffect(() => {
    safeLocalStorageSet('win777_language', language);
  }, [language]);

  useEffect(() => {
    safeLocalStorageSet('ewi777_theme', 'light');
    try {
      document.documentElement.classList.remove('dark');
    } catch {}
  }, []);

  useEffect(() => {
    if (!user.isLoggedIn || !user.id) return;
    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {}
    fetch(apiUrl('/api/users/ip-ping'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        uid: user.uid,
        phone: user.phone,
        clientTimezone: tz
      })
    }).catch(() => {});
  }, [user.isLoggedIn, user.id]);

  useEffect(() => {
    safeLocalStorageSet('ewi777_notifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  useEffect(() => {
    safeLocalStorageSet('ewi777_support_messages', JSON.stringify(supportMessages.slice(-200)));
  }, [supportMessages]);

  useEffect(() => {
    safeLocalStorageSet('ewi777_k3_bets', JSON.stringify(k3Bets.slice(0, 150)));
  }, [k3Bets]);

  useEffect(() => {
    safeLocalStorageSet('ewi777_d5_bets', JSON.stringify(d5Bets.slice(0, 150)));
  }, [d5Bets]);

  useEffect(() => {
    safeLocalStorageSet('ewi777_coinflip_bets', JSON.stringify(coinFlipBets.slice(0, 150)));
  }, [coinFlipBets]);

  useEffect(() => {
    safeLocalStorageSet('ewi777_ewi_wingo_bets', JSON.stringify(ewiWingoBets.slice(0, 150)));
  }, [ewiWingoBets]);

  useEffect(() => {
    if (!isPrivilegedSessionHost(isAdminLoggedIn)) return;
    safeLocalStorageSet('ewi777_admin_access_logs', JSON.stringify(adminAccessLogs.slice(0, 200)));
  }, [adminAccessLogs, isAdminLoggedIn]);

  // Auto-reject pending/processing deposits and withdrawals older than 1 hour (refunding expired withdrawals)
  useEffect(() => {
    const resolveTs = (rec: { createdAtMs?: number; id?: string; time?: string }) => {
      if (typeof rec.createdAtMs === 'number' && rec.createdAtMs > 0) return rec.createdAtMs;
      const m = String(rec.id || '').match(/_(\d{13})(?:_|$)/);
      if (m) return Number(m[1]) || Date.now();
      const parsed = rec.time ? Date.parse(rec.time) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
    };
    const sweepTimer = setInterval(() => {
      const now = Date.now();
      for (const dep of depositRequestsRef.current) {
        if ((dep.status === 'pending' || dep.status === 'processing') && now - resolveTs(dep) >= REQUEST_EXPIRY_MS) {
          rejectDepositRef.current(dep.id, 'Expired after 1 hour');
        }
      }
      for (const wd of withdrawRequestsRef.current) {
        if ((wd.status === 'pending' || wd.status === 'processing') && now - resolveTs(wd) >= REQUEST_EXPIRY_MS) {
          updateWithdrawStatusRef.current(wd.id, 'rejected', 'Expired after 1 hour (Refunded)', 0, {
            rejectionReason: 'Expired after 1 hour',
            userMessage: 'সময়সীমা ১ ঘণ্টা অতিক্রম করায় উত্তোলন বাতিল ও ব্যালেন্স ফেরত দেওয়া হয়েছে।'
          });
        }
      }
    }, 30000);
    return () => clearInterval(sweepTimer);
  }, []);

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

  const syncUserEverywhere = (nextUser: User, explicitUpdatedAt?: number): User => {
    const ts = explicitUpdatedAt || Math.max(Date.now(), Number(nextUser.updatedAt || 0));
    const stamped: User = { ...nextUser, updatedAt: ts };
    lastUsersMutationAtRef.current = Date.now();
    if (stamped.id) {
      if (userRef.current?.id === stamped.id) {
        userRef.current = stamped;
      }
      saveUserToFirebase(stamped).catch(() => {});
      fetch(apiUrl('/api/users/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: stamped })
      }).catch(() => {});
    }
    return stamped;
  };

  const matchesTargetUser = (candidate: User, targetId: string, targetPhone?: string): boolean => {
    if (candidate.id === targetId || (candidate.uid && candidate.uid === targetId)) return true;
    const normT = normalizePhone(targetPhone || '');
    if (normT && candidate.phone && normalizePhone(candidate.phone) === normT) return true;
    return false;
  };

  const isAdminLoggedInRef = useRef<boolean>(isAdminLoggedIn);
  isAdminLoggedInRef.current = isAdminLoggedIn;

  const mergeRemoteMatchedUser = (matched: User | null | undefined) => {
    if (!matched || !userRef.current.isLoggedIn || !userRef.current.id) return;
    const curLocalTs = Number(userRef.current.updatedAt || 0);
    const matchedTs = Number(matched.updatedAt || 0);
    const isMatchedStale = Boolean(!matched.isBanned && curLocalTs > 0 && matchedTs > 0 && matchedTs < curLocalTs);
    if (isMatchedStale) return;

    const needsAvatarPush = Boolean(userRef.current.avatar && !matched.avatar);
    if (needsAvatarPush) {
      fetch(apiUrl('/api/users/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userRef.current.id, patch: { avatar: userRef.current.avatar } })
      }).catch(() => {});
      updateUserInFirebase(userRef.current.id, { avatar: userRef.current.avatar }, userRef.current).catch(() => {});
    }

    const resolvedAvatar = matched.avatar || userRef.current.avatar || '';
    const resolvedClaimedFd = matched.claimedFirstDepositTiers || userRef.current.claimedFirstDepositTiers;
    const nextLockedBal = Math.max(0, Number(matched.lockedBalance) || 0);
    const curLockedBal = Math.max(0, Number(userRef.current.lockedBalance) || 0);

    const needsFieldSync =
      matched.balance !== userRef.current.balance ||
      nextLockedBal !== curLockedBal ||
      matched.totalDeposited !== userRef.current.totalDeposited ||
      matched.isBanned !== userRef.current.isBanned ||
      matched.banReason !== userRef.current.banReason ||
      matched.turnoverRequired !== userRef.current.turnoverRequired ||
      matched.role !== userRef.current.role ||
      (matched.pendingDepositBonusCode || '') !== (userRef.current.pendingDepositBonusCode || '') ||
      (matched.lastGiftReason || '') !== (userRef.current.lastGiftReason || '') ||
      (matched.loginPassword && matched.loginPassword !== userRef.current.loginPassword) ||
      resolvedAvatar !== (userRef.current.avatar || '') ||
      JSON.stringify(resolvedClaimedFd || {}) !==
        JSON.stringify(userRef.current.claimedFirstDepositTiers || {});

    const baseUser: User = needsFieldSync
      ? {
          ...userRef.current,
          balance: Number(matched.balance) || 0,
          lockedBalance: nextLockedBal,
          totalDeposited: Number(matched.totalDeposited) || 0,
          totalWithdrawn: Number(matched.totalWithdrawn) || userRef.current.totalWithdrawn || 0,
          vipLevel: matched.vipLevel ?? userRef.current.vipLevel,
          role: matched.role ?? userRef.current.role,
          turnoverRequired: Number(matched.turnoverRequired) || 0,
          isBanned: matched.isBanned,
          banReason: matched.banReason,
          pendingDepositBonusCode: matched.pendingDepositBonusCode,
          creditedDepositBonusCodes: matched.creditedDepositBonusCodes,
          lastGiftReason: matched.lastGiftReason,
          lastGiftCode: matched.lastGiftCode ?? userRef.current.lastGiftCode,
          lastGiftAmount: matched.lastGiftAmount ?? userRef.current.lastGiftAmount,
          lastGiftClaimTime: matched.lastGiftClaimTime ?? userRef.current.lastGiftClaimTime,
          loginPassword: matched.loginPassword || userRef.current.loginPassword,
          avatar: resolvedAvatar,
          claimedFirstDepositTiers: resolvedClaimedFd,
          updatedAt: Math.max(curLocalTs, matchedTs)
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
        syncUserEverywhere(autoVip.updatedUser);
      }
    }
  };

  useEffect(() => {
    let inFlight = false;
    let lastTickMs = 0;

    const syncServerData = async (forceRun = false) => {
      if (inFlight) return;
      if (!forceRun && document.visibilityState === 'hidden') return;

      const isPrivileged = isPrivilegedSessionHost(isAdminLoggedInRef.current);
      const curUser = userRef.current;
      const isLoggedInUser = Boolean(curUser.isLoggedIn && curUser.id);
      const minGap = isPrivileged ? 2400 : isLoggedInUser ? 4200 : 5800;
      const now = Date.now();
      if (!forceRun && now - lastTickMs < minGap) return;

      inFlight = true;
      lastTickMs = now;
      const pollStartedAt = now;

      try {
        const userQs = isLoggedInUser
          ? `userId=${encodeURIComponent(curUser.id)}${curUser.uid ? `&uid=${encodeURIComponent(curUser.uid)}` : ''}${curUser.phone ? `&phone=${encodeURIComponent(curUser.phone)}` : ''}`
          : '';
        const shouldFetchSupport =
          isMentorRouteActive() ||
          (isLoggedInUser && (activeTabRef.current === 'customer-service' || activeTabRef.current === 'live-chat'));

        const [setRes, depRes, wdRes, usrRes, poolRes, refRes, wBetRes, lBetRes, csRes, logRes] = await Promise.all([
          fetch(apiUrl('/api/settings'), { cache: 'no-store' }).catch(() => null),
          isPrivileged || isLoggedInUser
            ? fetch(apiUrl(isPrivileged ? '/api/deposits' : `/api/deposits?${userQs}`), { cache: 'no-store' }).catch(() => null)
            : Promise.resolve(null),
          isPrivileged || isLoggedInUser
            ? fetch(apiUrl(isPrivileged ? '/api/withdraws' : `/api/withdraws?${userQs}`), { cache: 'no-store' }).catch(() => null)
            : Promise.resolve(null),
          isPrivileged || isLoggedInUser
            ? fetch(apiUrl(isPrivileged ? '/api/users' : `/api/users?${userQs}`), { cache: 'no-store' }).catch(() => null)
            : Promise.resolve(null),
          isPrivileged || isLoggedInUser
            ? fetch(apiUrl('/api/market-pools'), { cache: 'no-store' }).catch(() => null)
            : Promise.resolve(null),
          isPrivileged || (isLoggedInUser && curUser.inviteCode)
            ? fetch(
                apiUrl(isPrivileged ? '/api/referrals' : `/api/referrals?inviteCode=${encodeURIComponent(curUser.inviteCode || '')}`),
                { cache: 'no-store' }
              ).catch(() => null)
            : Promise.resolve(null),
          isPrivileged
            ? fetch(apiUrl('/api/wingo/bets'), { cache: 'no-store' }).catch(() => null)
            : Promise.resolve(null),
          isPrivileged
            ? fetch(apiUrl('/api/lottery/bets'), { cache: 'no-store' }).catch(() => null)
            : Promise.resolve(null),
          shouldFetchSupport
            ? fetch(
                apiUrl(isMentorRouteActive() ? '/api/support/messages' : `/api/support/messages?userId=${encodeURIComponent(curUser.id)}`),
                { cache: 'no-store' }
              ).catch(() => null)
            : Promise.resolve(null),
          isPrivileged
            ? fetch(apiUrl('/api/admin/access-logs'), { cache: 'no-store' }).catch(() => null)
            : Promise.resolve(null)
        ]);

        const refCt = refRes?.headers.get('content-type') || '';
        if (refRes && refRes.ok && refCt.includes('application/json')) {
          const refData = await refRes.json().catch(() => null);
          if (refData && Array.isArray(refData.referrals)) {
            setReferrals((prev) => {
              const map = new Map(prev.map((r) => [r.id, r]));
              let changed = false;
              for (const sr of refData.referrals) {
                if (sr?.id && (!map.has(sr.id) || JSON.stringify(map.get(sr.id)) !== JSON.stringify(sr))) {
                  map.set(sr.id, sr);
                  changed = true;
                }
              }
              return changed ? Array.from(map.values()) : prev;
            });
          }
        }

        const poolCt = poolRes?.headers.get('content-type') || '';
        if (poolRes && poolRes.ok && poolCt.includes('application/json')) {
          const poolData = await poolRes.json().catch(() => null);
          if (poolData && poolData.pools && typeof poolData.pools === 'object') {
            setMarketPools((prev) => ({ ...prev, ...poolData.pools }));
          }
        }

        const csCt = csRes?.headers.get('content-type') || '';
        if (csRes && csRes.ok && csCt.includes('application/json')) {
          const csData = await csRes.json().catch(() => null);
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
          const data = await depRes.json().catch(() => null);
          if (data && Array.isArray(data.deposits)) {
            setDepositRequests((prev) => {
              const base = isPrivileged ? prev : prev.filter((d) => d.userId === curUser.id);
              const deduped = dedupeDepositsList([...base, ...data.deposits]);
              if (deduped.length === prev.length && JSON.stringify(deduped) === JSON.stringify(prev)) return prev;
              return deduped;
            });
          }
        }

        const wdCt = wdRes?.headers.get('content-type') || '';
        if (wdRes && wdRes.ok && wdCt.includes('application/json') && lastWithdrawsMutationAtRef.current < pollStartedAt && Date.now() - lastWithdrawsMutationAtRef.current > 2500) {
          const wData = await wdRes.json().catch(() => null);
          if (wData && Array.isArray(wData.withdraws)) {
            const wdRank = (s?: string) => (s === 'completed' || s === 'rejected' ? 3 : s === 'processing' ? 2 : 1);
            setWithdrawRequests((prev) => {
              const scopedPrev = isPrivileged ? prev : prev.filter((w) => w.userId === curUser.id);
              const prevMap = new Map(scopedPrev.map((w) => [w.id, w]));
              let hasChange = scopedPrev.length !== prev.length;
              for (const sw of wData.withdraws) {
                const cur = prevMap.get(sw.id);
                if (!cur) {
                  prevMap.set(sw.id, sw);
                  hasChange = true;
                } else {
                  const winner = wdRank(sw.status) >= wdRank(cur.status) ? sw : cur;
                  const merged: WithdrawRequest = {
                    ...cur,
                    ...sw,
                    ...winner,
                    ewiPayWithdrawId: winner.ewiPayWithdrawId || sw.ewiPayWithdrawId || cur.ewiPayWithdrawId,
                    payoutTrxId: winner.payoutTrxId || sw.payoutTrxId || cur.payoutTrxId,
                    userMessage: winner.userMessage || sw.userMessage || cur.userMessage,
                    rejectionReason: winner.rejectionReason || sw.rejectionReason || cur.rejectionReason,
                    adminNote: winner.adminNote || sw.adminNote || cur.adminNote
                  };
                  if (
                    cur.status !== merged.status ||
                    cur.ewiPayWithdrawId !== merged.ewiPayWithdrawId ||
                    cur.payoutTrxId !== merged.payoutTrxId ||
                    cur.userMessage !== merged.userMessage ||
                    cur.rejectionReason !== merged.rejectionReason ||
                    cur.adminNote !== merged.adminNote
                  ) {
                    prevMap.set(sw.id, merged);
                    hasChange = true;
                  }
                }
              }
              if (!hasChange && prev.length === prevMap.size) return prev;
              return Array.from(prevMap.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
            });
          }
        }

        const wbCt = wBetRes?.headers.get('content-type') || '';
        if (wBetRes && wBetRes.ok && wbCt.includes('application/json')) {
          const wbData = await wBetRes.json().catch(() => null);
          if (wbData && Array.isArray(wbData.bets)) {
            setGlobalWingoBets(wbData.bets);
          }
        }

        const lbCt = lBetRes?.headers.get('content-type') || '';
        if (lBetRes && lBetRes.ok && lbCt.includes('application/json')) {
          const lbData = await lBetRes.json().catch(() => null);
          if (lbData && Array.isArray(lbData.bets)) {
            setGlobalLotteryBets(lbData.bets);
          }
        }

        const setCt = setRes?.headers.get('content-type') || '';
        if (setRes && setRes.ok && setCt.includes('application/json') && lastSettingsPushAtRef.current < pollStartedAt && Date.now() - lastSettingsPushAtRef.current > 2500) {
          const sData = await setRes.json().catch(() => null);
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
              const normalizedGames = mergedGamesList
                .filter((g: GameItem) => g.id !== 'game_ewi_roulette' && g.slug !== 'ewi-roulette')
                .map((g: GameItem) => {
                if (g.id === 'game_aviator') return { ...g, badge: '10000X', price: '10000X' };
                if (g.id === 'game_ludo') return { ...g, title: 'Deshi Ludo', category: 'Casino' as const, targetTab: 'ludo' };
                if (g.id === 'game_k3') return { ...g, title: 'Deshi K3' };
                if (g.id === 'game_5d') return { ...g, title: 'Deshi 5D' };
                if (g.id === 'game_ewi_wingo') return { ...g, title: 'Deshi WinGo' };
                if (g.id === 'game_gold_market') {
                  return {
                    ...g,
                    imageUrl: g.imageUrl || '/assets/aistudio/image_2c2d654f.png',
                    targetTab: 'gold-market'
                  };
                }
                return g;
              });
              const serverHasLegacyBanner =
                Array.isArray(sData.settings.banners) &&
                sData.settings.banners.some((b: any) => String(b?.url || '').includes('image_3c433c14') || String(b?.url || '').includes('image_046bb074'));
              const serverHasBanners =
                Boolean(sData.settings.bannersCustomized) && !serverHasLegacyBanner;
              const resolvedBanners = serverHasBanners
                ? sanitizeBannerListClient(sData.settings.banners)
                : DEFAULT_BANNERS;
              const { adminPhone: _sp, adminPassword: _spw, ...cleanRemote } = sData.settings;
              const rPhoneH =
                cleanRemote.adminPhoneHash ||
                (_sp ? sha256HexSync(normalizePhone(String(_sp))) : prev.adminPhoneHash || DEFAULT_ADMIN_PHONE_HASH);
              const rPassH =
                cleanRemote.adminPasswordHash ||
                (_spw ? sha256HexSync(String(_spw)) : prev.adminPasswordHash || DEFAULT_ADMIN_PASS_HASH);
              const resolvedAppName =
                !cleanRemote.appName || /^(ewi\s*777|ewi777|hney\s*win|hneywin|honey\s*win|honey)$/i.test(String(cleanRemote.appName).trim())
                  ? 'Deshi Win'
                  : String(cleanRemote.appName);
              const merged: AdminSettings = {
                ...INITIAL_ADMIN_SETTINGS,
                ...cleanRemote,
                appName: resolvedAppName,
                marqueeText:
                  typeof cleanRemote.marqueeText === 'string' && cleanRemote.marqueeText
                    ? cleanRemote.marqueeText.replace(/Hney Win|EWI 777|EWI777/gi, 'Deshi Win').replace(/\bHney\b/gi, 'Deshi')
                    : INITIAL_ADMIN_SETTINGS.marqueeText,
                gameControlModes: {
                  ...INITIAL_ADMIN_SETTINGS.gameControlModes!,
                  ...(cleanRemote.gameControlModes || {})
                },
                bkashNumber: sanitizeGatewayNumber(cleanRemote.bkashNumber),
                nagadNumber: sanitizeGatewayNumber(cleanRemote.nagadNumber),
                supportPhone: sanitizeGatewayNumber(cleanRemote.supportPhone),
                binancePayId: String(cleanRemote.binancePayId || '').trim(),
                firstDepositBonusAmount:
                  typeof cleanRemote.firstDepositBonusAmount === 'number' && cleanRemote.firstDepositBonusAmount >= 0
                    ? cleanRemote.firstDepositBonusAmount
                    : 50,
                popupTitle:
                  typeof cleanRemote.popupTitle === 'string' && cleanRemote.popupTitle.trim()
                    ? cleanRemote.popupTitle
                    : 'Daily Recharge USDT 5% Bonus',
                popupMessage:
                  typeof cleanRemote.popupMessage === 'string' && cleanRemote.popupMessage.trim()
                    ? cleanRemote.popupMessage
                    : 'Recharge via USDT (Binance Pay) today and get an instant +5% Bonus automatically on every deposit!',
                popupImageUrl:
                  typeof cleanRemote.popupImageUrl === 'string' && cleanRemote.popupImageUrl.trim()
                    ? cleanRemote.popupImageUrl
                    : '/assets/brand/deshi-announcement-usdt-5.jpg',
                enableSystemPopup:
                  typeof cleanRemote.enableSystemPopup === 'boolean' ? cleanRemote.enableSystemPopup : true,
                adminPhoneHash: rPhoneH === OLD_DEFAULT_ADMIN_PHONE_HASH ? DEFAULT_ADMIN_PHONE_HASH : rPhoneH,
                adminPasswordHash: rPassH === OLD_DEFAULT_ADMIN_PASS_HASH ? DEFAULT_ADMIN_PASS_HASH : rPassH,
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
          const uData = await usrRes.json().catch(() => null);
          if (uData && Array.isArray(uData.users)) {
            if (isPrivileged) {
              setAllUsers((prev) => {
                const map = new Map(prev.map((u) => [u.id, u]));
                let changed = false;
                for (const su of uData.users) {
                  if (deletedUserIdsRef.current.has(su.id)) continue;
                  const cur = map.get(su.id);
                  const curTs = Number(cur?.updatedAt || 0);
                  const suTs = Number(su?.updatedAt || 0);
                  if (cur && curTs > 0 && suTs > 0 && suTs < curTs) continue;
                  if (!cur || JSON.stringify(cur) !== JSON.stringify(su)) {
                    map.set(su.id, su);
                    changed = true;
                  }
                }
                return changed ? Array.from(map.values()) : prev;
              });
            }

            if (userRef.current.isLoggedIn && userRef.current.id) {
              const normCurPhone = normalizePhone(userRef.current.phone || '');
              const matched = uData.users.find(
                (su: User) =>
                  su.id === userRef.current.id ||
                  (userRef.current.uid && su.uid === userRef.current.uid) ||
                  (normCurPhone && su.phone && normalizePhone(su.phone) === normCurPhone)
              );
              mergeRemoteMatchedUser(matched);
            }
          }
        }
      } catch {} finally {
        inFlight = false;
      }
    };

    syncServerDataFnRef.current = () => syncServerData(true);
    syncServerData(true);
    const interval = setInterval(() => syncServerData(false), 1500);
    const onFocusOrVisible = () => {
      if (document.visibilityState !== 'hidden') syncServerData(true);
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, []);

  // Auto-reconcile EWI-Pay pending deposits, member-status, & processing withdrawals without flooding background traffic
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const pollGateways = async () => {
      if (!active || inFlight || document.visibilityState === 'hidden') return;

      const isPrivileged = isPrivilegedSessionHost(isAdminLoggedInRef.current);
      const curUser = userRef.current;
      const siteUserId = String(curUser?.uid || curUser?.id || '').trim();
      const hasPendingDep = depositRequestsRef.current.some(
        (d) => (d.status === 'pending' || d.status === 'processing') && (isPrivileged || d.userId === curUser?.id)
      );
      const hasPendingWd = withdrawRequestsRef.current.some(
        (w) => (w.status === 'processing' || w.status === 'pending') && (isPrivileged || w.userId === curUser?.id)
      );
      const onFinancePage =
        activeTabRef.current === 'deposit' ||
        activeTabRef.current === 'wallet' ||
        activeTabRef.current === 'transaction-history';

      if (!isPrivileged && !(curUser?.isLoggedIn && (hasPendingDep || hasPendingWd || onFinancePage))) {
        return;
      }

      inFlight = true;
      try {
        if (isPrivileged || hasPendingDep || onFinancePage) {
          try {
            await syncEwiPayTransactions();
          } catch {}
        }

        // Also sync member-level deposits & withdrawals (including gateway-initiated withdrawals)
        if (curUser?.isLoggedIn && siteUserId) {
          try {
            const mRes = await fetch(
              apiUrl(`/api/ewi-pay/member-status/${encodeURIComponent(siteUserId)}`),
              { cache: 'no-store' }
            );
            const mCt = mRes.headers.get('content-type') || '';
            const mData = mRes.ok && mCt.includes('application/json') ? await mRes.json().catch(() => null) : null;
            if (mData && active) {
              const mDeps = Array.isArray(mData.deposits) ? mData.deposits : [];
              for (const md of mDeps) {
                const mdOrder = String(md?.orderId || md?.order_id || md?.depositId || md?.id || '').trim();
                const mdSession = String(md?.sessionId || md?.session_id || '').trim();
                const matchedDep = depositRequestsRef.current.find(
                  (d) =>
                    (mdOrder && (d.id === mdOrder || d.orderId === mdOrder || d.trxId === mdOrder.toUpperCase())) ||
                    (mdSession && d.sessionId === mdSession)
                );
                const mdSt = String(md?.status || '').trim().toLowerCase();
                const mdDisplay = String(md?.displayStatus || '').trim().toLowerCase();
                if (matchedDep && (matchedDep.status === 'pending' || matchedDep.status === 'processing')) {
                  if (
                    mdSt === 'completed' ||
                    mdSt === 'approved' ||
                    mdSt === 'paid' ||
                    mdSt === 'success' ||
                    md?.completed === true ||
                    mdDisplay === 'completed'
                  ) {
                    approveDepositRef.current?.(matchedDep.id);
                  } else if (mdSt === 'rejected' || mdSt === 'failed' || md?.rejected === true) {
                    const rej = String(md?.rejectionReason || md?.reason || md?.message || '').trim();
                    rejectDepositRef.current?.(matchedDep.id, rej || undefined);
                  }
                }
              }

              const mWds = Array.isArray(mData.withdrawals) ? mData.withdrawals : [];
              for (const mw of mWds) {
                const mwOrder = String(mw?.orderId || mw?.order_id || '').trim();
                const mwId = String(mw?.withdrawalId || mw?.withdrawal_id || mw?.id || '').trim();
                const mwStatus = String(mw?.status || '').trim().toLowerCase();
                const mwDisplay = String(mw?.displayStatus || '').trim().toLowerCase();
                const payoutTrxId = String(mw?.payoutTrxId || mw?.payout_trx_id || mw?.trxId || '').trim();
                const rejReason = String(mw?.rejectionReason || mw?.reason || mw?.message || '').trim();
                const usrMsg = String(mw?.userMessage || mw?.user_message || '').trim();

                const matchedWd = withdrawRequestsRef.current.find(
                  (w) =>
                    (mwOrder && (w.id === mwOrder || w.orderId === mwOrder)) ||
                    (mwId && (w.ewiPayWithdrawId === mwId || w.id === mwId))
                );

                if (matchedWd) {
                  if (
                    (mwStatus === 'completed' ||
                      mwStatus === 'paid' ||
                      mwStatus === 'approved' ||
                      mwStatus === 'success' ||
                      mw?.completed === true ||
                      mwDisplay.includes('completed')) &&
                    matchedWd.status !== 'completed'
                  ) {
                    updateWithdrawStatusRef.current?.(matchedWd.id, 'completed', undefined, undefined, {
                      payoutTrxId: payoutTrxId || undefined,
                      ewiPayWithdrawId: mwId || matchedWd.ewiPayWithdrawId
                    });
                  } else if (
                    (mwStatus === 'rejected' ||
                      mwStatus === 'failed' ||
                      mwStatus === 'cancelled' ||
                      mwStatus === 'reversed' ||
                      mw?.rejected === true ||
                      mw?.refundRequired === true) &&
                    matchedWd.status !== 'rejected' &&
                    matchedWd.status !== 'completed'
                  ) {
                    updateWithdrawStatusRef.current?.(matchedWd.id, 'rejected', rejReason || undefined, undefined, {
                      userMessage: usrMsg || 'কিছুক্ষণ পর আবার চেষ্টা করুন',
                      rejectionReason: rejReason || undefined,
                      ewiPayWithdrawId: mwId || matchedWd.ewiPayWithdrawId
                    });
                  }
                } else if (mwId && mwStatus === 'completed') {
                  // Gateway-initiated withdrawal completed externally: mirror into history once
                  const syntheticId = (mwOrder || mwId).replace(/[^a-zA-Z0-9_-]/g, '_');
                  const gwWd: WithdrawRequest = {
                    id: syntheticId,
                    ...(mwOrder ? { orderId: mwOrder } : {}),
                    ewiPayWithdrawId: mwId,
                    userId: curUser.id,
                    userName: curUser.nickname || curUser.phone || 'User',
                    userPhone: curUser.phone || curUser.email || '',
                    amount: Math.max(1, Number(mw?.amount) || 0),
                    method: String(mw?.provider || mw?.method || '').toLowerCase().includes('nagad') ? 'Nagad' : 'bKash',
                    number: String(mw?.recipientNumber || mw?.number || curUser.boundBkash || curUser.boundNagad || ''),
                    status: 'completed',
                    time: String(mw?.completedAt || mw?.createdAt || new Date().toLocaleString()),
                    ...(payoutTrxId ? { payoutTrxId } : {})
                  };
                  if (gwWd.amount > 0) {
                    setWithdrawRequests((prev) => (prev.some((x) => x.id === syntheticId) ? prev : [gwWd, ...prev]));
                    saveWithdrawToFirebase(gwWd).catch(() => {});
                  }
                }
              }
            }
          } catch {}
        }

        try {
          const processingWds = withdrawRequestsRef.current.filter(
            (w) =>
              (w.status === 'processing' || w.status === 'pending') &&
              Boolean(w.ewiPayWithdrawId) &&
              (isPrivileged || w.userId === curUser?.id)
          );
          for (const w of processingWds) {
            if (!active || !w.ewiPayWithdrawId) break;
            const mLower = String(w.method || '').toLowerCase();
            const mQuery = mLower.includes('nagad') ? 'nagad' : mLower.includes('bkash') ? 'bkash' : '';
            try {
              const qs = mQuery ? `?method=${encodeURIComponent(mQuery)}` : '';
              const stRes = await fetch(
                apiUrl(`/api/ewi-pay/withdraw-status/${encodeURIComponent(w.ewiPayWithdrawId)}${qs}`),
                { cache: 'no-store' }
              );
              const stCt = stRes.headers.get('content-type') || '';
              const stData = stRes.ok && stCt.includes('application/json') ? await stRes.json().catch(() => null) : null;
              const gwObj = stData?.gateway && typeof stData.gateway === 'object' ? stData.gateway : stData;
              const raw = String(
                gwObj?.status ||
                  gwObj?.withdrawal?.status ||
                  gwObj?.data?.status ||
                  stData?.status ||
                  stData?.withdrawal?.status ||
                  stData?.data?.status ||
                  ''
              )
                .trim()
                .toLowerCase();
              const displayRaw = String(gwObj?.displayStatus || stData?.displayStatus || '').trim().toLowerCase();
              const payoutTrxId = String(
                gwObj?.payoutTrxId ||
                  gwObj?.payout_trx_id ||
                  gwObj?.trxId ||
                  gwObj?.withdrawal?.payoutTrxId ||
                  gwObj?.data?.payoutTrxId ||
                  stData?.payoutTrxId ||
                  ''
              ).trim();
              if (
                raw === 'completed' ||
                raw === 'paid' ||
                raw === 'approved' ||
                raw === 'success' ||
                raw === 'settled' ||
                gwObj?.completed === true ||
                stData?.completed === true ||
                displayRaw.includes('completed')
              ) {
                updateWithdrawStatusRef.current?.(w.id, 'completed', undefined, undefined, {
                  payoutTrxId: payoutTrxId || undefined
                });
              } else if (
                raw === 'rejected' ||
                raw === 'failed' ||
                raw === 'cancelled' ||
                raw === 'reversed' ||
                gwObj?.rejected === true ||
                gwObj?.refundRequired === true ||
                stData?.rejected === true ||
                stData?.refundRequired === true
              ) {
                const reason = String(
                  gwObj?.rejectionReason ||
                    gwObj?.reason ||
                    gwObj?.message ||
                    gwObj?.withdrawal?.reason ||
                    stData?.reason ||
                    stData?.message ||
                    ''
                ).trim();
                const usrMsg = String(gwObj?.userMessage || stData?.userMessage || 'কিছুক্ষণ পর আবার চেষ্টা করুন').trim();
                updateWithdrawStatusRef.current?.(w.id, 'rejected', reason || undefined, undefined, {
                  userMessage: usrMsg,
                  rejectionReason: reason || undefined
                });
              }
            } catch {}
          }
        } catch {}
      } finally {
        inFlight = false;
      }
    };
    const t = setTimeout(pollGateways, 1800);
    const iv = setInterval(pollGateways, 7000);
    return () => {
      active = false;
      clearTimeout(t);
      clearInterval(iv);
    };
  }, []);

  // Scoped Real-Time Firebase Firestore Synchronization (scales cleanly to 10,000+ concurrent players)
  useEffect(() => {
    const isPrivileged = isPrivilegedSessionHost(isAdminLoggedIn);
    const isMentor = isMentorRouteActive();
    const isLoggedIn = Boolean(user.isLoggedIn && user.id);

    // Seed initial appConfig/settings in Firestore once if completely empty
    getAppSettingsFromFirebase()
      .then((existing) => {
        if (!existing) {
          saveAppSettingsToFirebase(adminSettingsRef.current).catch(() => {});
        }
      })
      .catch(() => {});

    const unsubSettings = subscribeAppSettingsInFirebase((remoteSettings) => {
      if (Date.now() - lastSettingsPushAtRef.current < 900) return;
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
        const normalizedGames = mergedGamesList
          .filter((g: GameItem) => g.id !== 'game_ewi_roulette' && g.slug !== 'ewi-roulette')
          .map((g: GameItem) => {
          if (g.id === 'game_aviator') return { ...g, category: 'Slots' as const, badge: '10000X', price: '10000X' };
          if (g.id === 'game_luckyjet') return { ...g, category: 'Slots' as const, badge: '10000X', price: '10000X' };
          if (g.id === 'game_mines') return { ...g, category: 'Slots' as const };
          if (g.id === 'game_coinflip') return { ...g, category: 'Slots' as const, badge: '1.89X', price: '1.89X' };
          if (g.id === 'game_plane') return { ...g, title: 'PLANE', category: 'Casino' as const, targetTab: 'plane', badge: '20000X', price: '20000X' };
          if (g.id === 'game_ludo') return { ...g, title: 'Deshi Ludo', category: 'Casino' as const, targetTab: 'ludo' };
          if (g.id === 'game_k3') return { ...g, title: 'Deshi K3' };
          if (g.id === 'game_5d') return { ...g, title: 'Deshi 5D' };
          if (g.id === 'game_ewi_wingo') return { ...g, title: 'Deshi WinGo' };
          if (g.id === 'game_gold_market') {
            return {
              ...g,
              imageUrl: g.imageUrl || '/assets/aistudio/image_2c2d654f.png',
              targetTab: 'gold-market'
            };
          }
          return g;
        });
        const remoteHasLegacyBanner =
          Array.isArray(remoteSettings.banners) &&
          remoteSettings.banners.some((b: any) => String(b?.url || '').includes('image_3c433c14') || String(b?.url || '').includes('image_046bb074'));
        const remoteHasBanners =
          Boolean(remoteSettings.bannersCustomized) && !remoteHasLegacyBanner;
        const resolvedBanners = remoteHasBanners
          ? sanitizeBannerListClient(remoteSettings.banners)
          : DEFAULT_BANNERS;
        const { adminPhone: _rp, adminPassword: _rpw, ...cleanRemote } = remoteSettings;
        const remPhoneH =
          cleanRemote.adminPhoneHash ||
          (_rp ? sha256HexSync(normalizePhone(String(_rp))) : prev.adminPhoneHash || DEFAULT_ADMIN_PHONE_HASH);
        const remPassH =
          cleanRemote.adminPasswordHash ||
          (_rpw ? sha256HexSync(String(_rpw)) : prev.adminPasswordHash || DEFAULT_ADMIN_PASS_HASH);
        const resolvedAppName =
          !cleanRemote.appName || /^(ewi\s*777|ewi777|hney\s*win|hneywin|honey\s*win|honey)$/i.test(String(cleanRemote.appName).trim())
            ? 'Deshi Win'
            : String(cleanRemote.appName);
        const merged: AdminSettings = {
          ...INITIAL_ADMIN_SETTINGS,
          ...cleanRemote,
          appName: resolvedAppName,
          marqueeText:
            typeof cleanRemote.marqueeText === 'string' && cleanRemote.marqueeText
              ? cleanRemote.marqueeText.replace(/Hney Win|EWI 777|EWI777/gi, 'Deshi Win').replace(/\bHney\b/gi, 'Deshi')
              : INITIAL_ADMIN_SETTINGS.marqueeText,
          appLogoUrl: sanitizeAppLogoUrl(cleanRemote.appLogoUrl),
          gameControlModes: {
            ...INITIAL_ADMIN_SETTINGS.gameControlModes!,
            ...(cleanRemote.gameControlModes || {})
          },
          bkashNumber: sanitizeGatewayNumber(cleanRemote.bkashNumber),
          nagadNumber: sanitizeGatewayNumber(cleanRemote.nagadNumber),
          supportPhone: sanitizeGatewayNumber(cleanRemote.supportPhone),
          binancePayId: String(cleanRemote.binancePayId || '').trim(),
          firstDepositBonusAmount:
            typeof cleanRemote.firstDepositBonusAmount === 'number' && cleanRemote.firstDepositBonusAmount >= 0
              ? cleanRemote.firstDepositBonusAmount
              : 50,
          popupTitle:
            typeof cleanRemote.popupTitle === 'string' && cleanRemote.popupTitle.trim()
              ? cleanRemote.popupTitle
              : 'Daily Recharge USDT 5% Bonus',
          popupMessage:
            typeof cleanRemote.popupMessage === 'string' && cleanRemote.popupMessage.trim()
              ? cleanRemote.popupMessage
              : 'Recharge via USDT (Binance Pay) today and get an instant +5% Bonus automatically on every deposit!',
          popupImageUrl:
            typeof cleanRemote.popupImageUrl === 'string' && cleanRemote.popupImageUrl.trim()
              ? cleanRemote.popupImageUrl
              : '/assets/brand/deshi-announcement-usdt-5.jpg',
          enableSystemPopup:
            typeof cleanRemote.enableSystemPopup === 'boolean' ? cleanRemote.enableSystemPopup : true,
          adminPhoneHash: remPhoneH === OLD_DEFAULT_ADMIN_PHONE_HASH ? DEFAULT_ADMIN_PHONE_HASH : remPhoneH,
          adminPasswordHash: remPassH === OLD_DEFAULT_ADMIN_PASS_HASH ? DEFAULT_ADMIN_PASS_HASH : remPassH,
          games: normalizedGames,
          banners: resolvedBanners,
          bannersCustomized: remoteHasBanners
        };
        if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
        adminSettingsRef.current = merged;
        return merged;
      });
    });

    const unsubs: Array<() => void> = [unsubSettings];

    const mergeDeposits = (fbDeps: DepositRequest[]) => {
      if (Date.now() - lastDepositsMutationAtRef.current < 2200) return;
      setDepositRequests((prev) => {
        const base = isPrivileged ? prev : prev.filter((d) => d.userId === user.id);
        const deduped = dedupeDepositsList([...base, ...fbDeps]);
        if (deduped.length === prev.length && JSON.stringify(deduped) === JSON.stringify(prev)) return prev;
        return deduped;
      });
    };

    const mergeWithdraws = (fbWds: WithdrawRequest[]) => {
      if (Date.now() - lastWithdrawsMutationAtRef.current < 2200) return;
      const wdRank = (s?: string) => (s === 'completed' || s === 'rejected' ? 3 : s === 'processing' ? 2 : 1);
      setWithdrawRequests((prev) => {
        const scopedPrev = isPrivileged ? prev : prev.filter((w) => w.userId === user.id);
        const prevMap = new Map(scopedPrev.map((w) => [w.id, w]));
        let hasChange = scopedPrev.length !== prev.length;
        for (const fw of fbWds) {
          const cur = prevMap.get(fw.id);
          if (!cur) {
            prevMap.set(fw.id, fw);
            hasChange = true;
          } else {
            const winner = wdRank(fw.status) >= wdRank(cur.status) ? fw : cur;
            const merged: WithdrawRequest = {
              ...cur,
              ...fw,
              ...winner,
              ewiPayWithdrawId: winner.ewiPayWithdrawId || fw.ewiPayWithdrawId || cur.ewiPayWithdrawId,
              payoutTrxId: winner.payoutTrxId || fw.payoutTrxId || cur.payoutTrxId,
              userMessage: winner.userMessage || fw.userMessage || cur.userMessage,
              rejectionReason: winner.rejectionReason || fw.rejectionReason || cur.rejectionReason,
              adminNote: winner.adminNote || fw.adminNote || cur.adminNote
            };
            if (
              cur.status !== merged.status ||
              cur.ewiPayWithdrawId !== merged.ewiPayWithdrawId ||
              cur.payoutTrxId !== merged.payoutTrxId ||
              cur.userMessage !== merged.userMessage ||
              cur.rejectionReason !== merged.rejectionReason ||
              cur.adminNote !== merged.adminNote
            ) {
              prevMap.set(fw.id, merged);
              hasChange = true;
            }
          }
        }
        if (!hasChange && prev.length === prevMap.size) return prev;
        return Array.from(prevMap.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
      });
    };

    const mergeSupport = (fbMsgs: SupportMessage[]) => {
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
    };

    const mergeWingoBets = (fbBets: WinGoBet[]) => {
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
    };

    const mergeTransactions = (fbTxs: Transaction[]) => {
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
    };

    const mergeNotifications = (fbNotifs: AppNotification[]) => {
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
    };

    const mergeReferrals = (fbRefs: ReferralMember[]) => {
      setReferrals((prev) => {
        const map = new Map(prev.map((r) => [r.id, r]));
        let changed = false;
        for (const fr of fbRefs) {
          if (fr?.id && (!map.has(fr.id) || JSON.stringify(map.get(fr.id)) !== JSON.stringify(fr))) {
            map.set(fr.id, fr);
            changed = true;
          }
        }
        return changed ? Array.from(map.values()) : prev;
      });
    };

    const mergeSportsBets = (fbBets: SportsBet[]) => {
      setSportsBets((prev) => {
        const map = new Map(prev.map((b) => [b.id, b]));
        let changed = false;
        for (const fb of fbBets) {
          const cur = map.get(fb.id);
          if (!cur || (cur.status === 'pending' && fb.status !== 'pending')) {
            map.set(fb.id, fb);
            changed = true;
          }
        }
        if (!changed && prev.length === map.size) return prev;
        const merged = Array.from(map.values())
          .sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0))
          .slice(0, 150);
        safeLocalStorageSet('ewi777_sports_bets', JSON.stringify(merged));
        return merged;
      });
    };

    if (isPrivileged) {
      unsubs.push(
        subscribeUsersInFirebase((fbUsers) => {
          if (Date.now() - lastUsersMutationAtRef.current < 900) return;
          if (!Array.isArray(fbUsers)) return;

          setAllUsers((prev) => {
            const map = new Map(prev.map((u) => [u.id, u]));
            let changed = false;
            for (const fu of fbUsers) {
              if (!fu?.id || deletedUserIdsRef.current.has(fu.id)) continue;
              const cur = map.get(fu.id);
              const curTs = Number(cur?.updatedAt || 0);
              const fuTs = Number(fu?.updatedAt || 0);
              if (cur && curTs > 0 && fuTs > 0 && fuTs < curTs) continue;
              if (!cur || JSON.stringify(cur) !== JSON.stringify(fu)) {
                map.set(fu.id, fu);
                changed = true;
              }
            }
            return changed ? Array.from(map.values()) : prev;
          });

          if (userRef.current.isLoggedIn && userRef.current.id) {
            const normCurPhone = normalizePhone(userRef.current.phone || '');
            const matched = fbUsers.find(
              (fu) =>
                fu.id === userRef.current.id ||
                (userRef.current.uid && fu.uid === userRef.current.uid) ||
                (normCurPhone && fu.phone && normalizePhone(fu.phone) === normCurPhone)
            );
            mergeRemoteMatchedUser(matched);
          }
        })
      );
      unsubs.push(subscribeDepositsInFirebase(mergeDeposits));
      unsubs.push(subscribeWithdrawsInFirebase(mergeWithdraws));
      if (isMentor) {
        unsubs.push(subscribeSupportMessagesInFirebase(mergeSupport));
      }
      unsubs.push(subscribeWingoBetsInFirebase(mergeWingoBets));
      unsubs.push(subscribeTransactionsInFirebase(mergeTransactions));
      unsubs.push(subscribeNotificationsInFirebase(mergeNotifications));
      unsubs.push(
        subscribeAdminAccessLogsInFirebase((fbLogs) => {
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
        })
      );
      unsubs.push(subscribeReferralsInFirebase(mergeReferrals));
      unsubs.push(subscribeSportsBetsInFirebase(mergeSportsBets));
    } else if (isLoggedIn) {
      unsubs.push(
        subscribeSingleUserInFirebase(user.id, (fu) => {
          if (Date.now() - lastUsersMutationAtRef.current < 900) return;
          if (!fu || deletedUserIdsRef.current.has(fu.id)) return;
          mergeRemoteMatchedUser(fu);
        })
      );
      unsubs.push(subscribeUserDepositsInFirebase(user.id, mergeDeposits));
      unsubs.push(subscribeUserWithdrawsInFirebase(user.id, mergeWithdraws));
      unsubs.push(subscribeUserSupportMessagesInFirebase(user.id, mergeSupport));
      unsubs.push(subscribeUserWingoBetsInFirebase(user.id, mergeWingoBets));
      unsubs.push(subscribeUserTransactionsInFirebase(user.id, mergeTransactions));
      unsubs.push(subscribeUserNotificationsInFirebase(user.id, mergeNotifications));
      if (user.inviteCode) {
        unsubs.push(subscribeUserReferralsInFirebase(user.inviteCode, mergeReferrals));
      }
      unsubs.push(subscribeUserSportsBetsInFirebase(user.id, mergeSportsBets));
    }

    if (isPrivileged || isLoggedIn) {
      unsubs.push(
        subscribeMarketPoolsInFirebase((fbPools) => {
          setMarketPools((prev) => ({ ...prev, ...fbPools }));
        })
      );
      unsubs.push(
        subscribeCrashStateInFirebase('aviator', (st) => {
          setCrashPoolStates((prev) => ({ ...prev, aviator: st }));
        })
      );
      unsubs.push(
        subscribeCrashStateInFirebase('luckyjet', (st) => {
          setCrashPoolStates((prev) => ({ ...prev, luckyjet: st }));
        })
      );
    }

    return () => {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    };
  }, [isAdminLoggedIn, user.isLoggedIn, user.id, user.inviteCode]);

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
      .slice(0, 10);

    return mapped.length > 0 ? mapped : null;
  };

  const applyResolvedWingoOutcome = (mode: WinGoMode, resolvingPeriod: string, resolvedNumber: number, resolvedTime?: string) => {
    const settleKey = `${mode}:${resolvingPeriod}`;
    const pendingForPeriod = betsRef.current.filter(
      (b) => b.periodNumber === resolvingPeriod && b.mode === mode && b.status === 'pending'
    );
    if (settledPeriodsRef.current.has(settleKey) && pendingForPeriod.length === 0) return;
    settledPeriodsRef.current.add(settleKey);
    if (settledPeriodsRef.current.size > 200) {
      const first = settledPeriodsRef.current.values().next().value;
      if (first) settledPeriodsRef.current.delete(first);
    }

    const safeNum = Math.min(9, Math.max(0, Math.round(resolvedNumber)));
    const { color, size } = deriveWingoMeta(safeNum);
    const timeStr = resolvedTime || new Date().toTimeString().slice(0, 8);

    const userRoundBets = pendingForPeriod.filter(
      (b) => !userRef.current.id || b.userId === userRef.current.id
    );

    const evalBetOutcome = (b: WinGoBet): { won: boolean; winAmount: number } => {
      let won = false;
      let odds = 1.89;
      if (b.type === 'number') {
        won = Number(b.value) === safeNum;
        odds = 9;
      } else if (b.type === 'size') {
        won = b.value === size;
        odds = 1.89;
      } else if (b.type === 'color') {
        if (b.value === 'green') {
          if ([1, 3, 7, 9].includes(safeNum)) {
            won = true;
            odds = 1.89;
          } else if (safeNum === 5) {
            won = true;
            odds = 1.5;
          }
        } else if (b.value === 'red') {
          if ([2, 4, 6, 8].includes(safeNum)) {
            won = true;
            odds = 1.89;
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
    userWinTotal = +userWinTotal.toFixed(2);

    const settledBetWrites: WinGoBet[] = [];
    const nextBetsList = betsRef.current.map((b) => {
      if (b.periodNumber === resolvingPeriod && b.mode === mode && b.status === 'pending') {
        const { won, winAmount } = evalBetOutcome(b);
        const nextBet: WinGoBet = {
          ...b,
          status: won ? ('won' as const) : ('lost' as const),
          winAmount,
          resultNumber: safeNum,
          resultColor: color,
          resultSize: size
        };
        settledBetWrites.push(nextBet);
        return nextBet;
      }
      return b;
    });
    betsRef.current = nextBetsList;
    setBets(nextBetsList);
    if (settledBetWrites.length > 0) {
      settledBetWrites.forEach((sb) => saveWingoBetToFirebase(sb).catch(() => {}));
    }

    if (userRoundBets.length > 0 && userRef.current.id) {
      const tzOffset =
        typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number'
          ? adminSettingsRef.current.timezoneOffsetMinutes
          : 360;
      const todayKey = getLocalDateStr(new Date(), tzOffset);
      const prevStreak = userRef.current.lastWinGoStreakDate === todayKey ? Number(userRef.current.winGoStreakCount || 0) : 0;
      const nextStreak = userWinTotal > 0 ? prevStreak + 1 : 0;

      const nextBal = userWinTotal > 0 ? +(Number(userRef.current.balance || 0) + userWinTotal).toFixed(2) : Number(userRef.current.balance || 0);
      const nextTurnoverComp = (userRef.current.turnoverCompleted || 0) + (userWinTotal > 0 ? userWinTotal : 0);

      const atomicUser = syncUserEverywhere({
        ...userRef.current,
        balance: nextBal,
        turnoverCompleted: nextTurnoverComp,
        winGoStreakCount: nextStreak,
        lastWinGoStreakDate: todayKey
      });
      userRef.current = atomicUser;
      setUser(atomicUser);

      if (userWinTotal > 0) {
        const winTx: Transaction = {
          id: `tx_${Date.now()}_${mode}`,
          userId: atomicUser.id,
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
      ].slice(0, 10);
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
      const readInviteParam = (params: URLSearchParams) =>
        params.get('invitationCode') ||
        params.get('inviteCode') ||
        params.get('invite') ||
        params.get('ref') ||
        params.get('r') ||
        params.get('code') ||
        params.get('r_code');

      let code = readInviteParam(searchParams);

      if (!code && hash.includes('?')) {
        const hashQuery = hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        code = readInviteParam(hashParams);
      }

      if (code) {
        setInvitationParam(code.trim());
        sessionStorage.setItem('win777_invite_code', code.trim());
      }

      const pathnameLower = (window.location.pathname || '').toLowerCase();
      const target = resolveCurrentRoute(userRef.current.isLoggedIn);
      setActiveTabRaw(target);
      if (
        !userRef.current.isLoggedIn &&
        target === 'login' &&
        hash !== '#/login' &&
        !hash.toLowerCase().includes('admin-ewi777-panel-009') &&
        !pathnameLower.includes('admin-ewi777-panel-009') &&
        !hash.toLowerCase().includes('mentor-ewi777-panel') &&
        !pathnameLower.includes('mentor-ewi777-panel')
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

  // Auto-logout immediately whenever active user becomes banned
  useEffect(() => {
    if (user.isLoggedIn && user.isBanned) {
      const reasonSuffix = user.banReason ? ` (${user.banReason})` : '';
      const msg = `আপনার আইডিটি ব্যান (Ban) করা হয়েছে${reasonSuffix}। সাপোর্টে যোগাযোগ করুন।`;
      try {
        localStorage.setItem('ewi777_ban_notice', msg);
      } catch {}
      setBanNotice(msg);
      setFirstDepositModalOpen(false);
      setUser({ ...INITIAL_GUEST_USER, isLoggedIn: false });
      showToast('This account has been banned.');
      setActiveTabRaw('login');
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    }
  }, [user.isLoggedIn, user.isBanned, user.banReason]);

  // Reactive Strict Auth Guard
  useEffect(() => {
    if (!user.isLoggedIn && !PUBLIC_UNAUTH_TABS.has(activeTab)) {
      setActiveTabRaw('login');
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    }
  }, [user.isLoggedIn, activeTab]);

  // Instant, race-free Tab Switcher with strict login guard, clean pathname normalization & back stack
  const navigateToTab = (tab: string, pushHistory = true) => {
    const targetTab =
      !userRef.current.isLoggedIn && !PUBLIC_UNAUTH_TABS.has(tab) ? 'login' : tab;
    if (targetTab !== tab) {
      showToast('Please login or register first to access Deshi Win markets!');
    }

    const prevTab = activeTabRef.current;
    if (pushHistory && prevTab && prevTab !== targetTab) {
      const stack = tabHistoryRef.current;
      if (stack[stack.length - 1] !== prevTab) {
        stack.push(prevTab);
        if (stack.length > 30) stack.shift();
      }
    }

    const targetHash =
      targetTab === 'home'
        ? '#/'
        : targetTab === 'admin'
        ? '#/admin-ewi777-panel-009'
        : targetTab === 'mentor'
        ? '#/mentor-ewi777-panel'
        : `#/${targetTab}`;

    try {
      const pLower = (window.location.pathname || '/').toLowerCase();
      if (
        pLower !== '/' &&
        !pLower.includes('admin-ewi777-panel-009') &&
        !pLower.includes('mentor-ewi777-panel')
      ) {
        window.history.replaceState(null, '', `/${targetHash}`);
      } else if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    } catch {
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }

    setIsNavigating(false);
    setActiveTabRaw(targetTab);
    try {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const setActiveTab = (tab: string) => {
    navigateToTab(tab, true);
  };

  const goBack = (fallbackTab = 'home') => {
    const current = activeTabRef.current;
    while (tabHistoryRef.current.length > 0) {
      const candidate = tabHistoryRef.current.pop();
      if (
        candidate &&
        candidate !== current &&
        (userRef.current.isLoggedIn || PUBLIC_UNAUTH_TABS.has(candidate))
      ) {
        navigateToTab(candidate, false);
        return;
      }
    }
    const safeFallback =
      !userRef.current.isLoggedIn && !PUBLIC_UNAUTH_TABS.has(fallbackTab)
        ? 'login'
        : fallbackTab;
    navigateToTab(safeFallback, false);
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
      const bias = (adminSettingsRef.current.binaryNextCandleBias as 'AUTO' | 'BULL' | 'BEAR') || 'AUTO';
      const tzOffset =
        typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number'
          ? adminSettingsRef.current.timezoneOffsetMinutes
          : 360;
      const snap = getSyncedBinarySnapshot(BINARY_MARKETS, Date.now(), bias, tzOffset);
      setBinaryCandleSecRemaining(snap.candleSecRemaining);
      setBinaryMarkets(snap.markets);
    };

    const syncBinaryFromServer = async () => {
      try {
        const res = await fetch(apiUrl('/api/binary/state'), { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          stepLocalBinaryTick();
          return;
        }
        const data = await res.json().catch(() => null);
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
  const allUsersRef = useRef(allUsers);
  allUsersRef.current = allUsers;
  const depositRequestsRef = useRef(depositRequests);
  depositRequestsRef.current = depositRequests;
  const withdrawRequestsRef = useRef(withdrawRequests);
  withdrawRequestsRef.current = withdrawRequests;
  const approveDepositRef = useRef<(id: string) => void>(() => {});
  const rejectDepositRef = useRef<(id: string, note?: string) => void>(() => {});
  const updateWithdrawStatusRef = useRef<
    (
      id: string,
      status: 'processing' | 'completed' | 'rejected',
      note?: string,
      turnoverPenalty?: number,
      meta?: { payoutTrxId?: string; userMessage?: string; rejectionReason?: string; ewiPayWithdrawId?: string }
    ) => void
  >(() => {});
  const binaryMarketsRef = useRef(binaryMarkets);
  binaryMarketsRef.current = binaryMarkets;

  const dedupeDepositsList = (list: DepositRequest[]): DepositRequest[] => {
    const out: DepositRequest[] = [];
    for (const item of list) {
      if (!item || !item.id) continue;
      const idx = out.findIndex(
        (d) =>
          d.id === item.id ||
          (d.orderId && item.orderId && d.orderId === item.orderId) ||
          (d.sessionId && item.sessionId && d.sessionId === item.sessionId) ||
          (d.trxId && item.trxId && d.trxId === item.trxId)
      );
      if (idx === -1) {
        out.push(item);
      } else {
        const cur = out[idx];
        const statusRank = (s?: string) =>
          s === 'approved' ? 3 : s === 'rejected' ? 3 : s === 'processing' ? 2 : 1;
        const winner = statusRank(item.status) > statusRank(cur.status) ? item : cur;
        out[idx] = {
          ...cur,
          ...item,
          ...winner,
          orderId: winner.orderId || item.orderId || cur.orderId,
          sessionId: winner.sessionId || item.sessionId || cur.sessionId,
          userId: winner.userId || cur.userId || item.userId,
          rejectionReason: winner.rejectionReason || item.rejectionReason || cur.rejectionReason
        };
      }
    }
    return out.sort((a, b) => (b.id > a.id ? 1 : -1));
  };

  // 1B. Check and settle active binary bets per asset using shared market price & least-bet rule
  useEffect(() => {
    const binInterval = setInterval(() => {
      const now = Date.now();
      setBinaryBets((prevBets) => {
        const hasExpired = prevBets.some((b) => b.status === 'active' && now >= b.endTime);
        if (!hasExpired) return prevBets;

        let balanceDelta = 0;
        const activeBets = prevBets.filter((b) => b.status === 'active');

        const controlMode = adminSettingsRef.current.gameControlModes?.binary || 'HIGH_BET_LOSS';

        const updated = prevBets.map((bet) => {
          if (bet.status === 'active' && now >= bet.endTime) {
            const spec = BINARY_MARKET_MAP[bet.asset];
            const decimals = spec?.decimals ?? 2;
            const step = spec?.volatility ?? 2.5;
            const liveAssetPrice = binaryMarketsRef.current[bet.asset]?.price ?? bet.entryPrice;

            const assetPool = activeBets.filter((b) => b.asset === bet.asset);
            const cleanAssetId = `binary_${bet.asset.replace(/[^a-zA-Z0-9_-]/g, '_')}_live`;
            const remotePool = marketPoolsRef.current[cleanAssetId];
            const localUp = assetPool.filter((b) => b.direction === 'UP').reduce((s, b) => s + b.amount, 0);
            const localDown = assetPool.filter((b) => b.direction === 'DOWN').reduce((s, b) => s + b.amount, 0);
            const totalUp = Math.max(localUp, Number(remotePool?.selections?.UP || 0));
            const totalDown = Math.max(localDown, Number(remotePool?.selections?.DOWN || 0));

            let strikePrice = liveAssetPrice;
            let isWin = false;

            const ctrl = evaluatePoolControl(controlMode, [
              { key: 'UP', total: totalUp },
              { key: 'DOWN', total: totalDown }
            ]);

            if (ctrl.winningKey && totalUp !== totalDown) {
              const winDir = ctrl.winningKey as 'UP' | 'DOWN';
              isWin = bet.direction === winDir;
              if (winDir === 'UP') {
                strikePrice = +(Math.max(liveAssetPrice, bet.entryPrice + step * (1.2 + Math.random()))).toFixed(decimals);
              } else {
                strikePrice = +(Math.min(liveAssetPrice, bet.entryPrice - step * (1.2 + Math.random()))).toFixed(decimals);
              }
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
            const updated = syncUserEverywhere({
              ...u,
              balance: +(u.balance + balanceDelta).toFixed(2),
              turnoverCompleted: (u.turnoverCompleted || 0) + balanceDelta
            });
            return updated;
          });
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
                    fetch(apiUrl('/api/settings'), {
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
              ].slice(0, 10);

              updatedMarkets[mode] = {
                ...current,
                period: nextPeriodAfterResolve,
                timeRemaining: rem,
                history: dedupedHistory
              };
            } else {
              // Instant real-time resolution: quick 380ms API check then immediate synced settlement
              const fastFallbackNum = getSyncedWinGoNumber(mode, resolvingPeriod);
              const { color: fbColor, size: fbSize } = deriveWingoMeta(fastFallbackNum);
              const fastTimeStr = new Date(now).toTimeString().slice(0, 8);

              updatedMarkets[mode] = {
                ...current,
                period: nextPeriodAfterResolve,
                timeRemaining: rem
              };

              setTimeout(async () => {
                let finalNum: number | undefined = apiLatestResultsRef.current[mode]?.get(resolvingPeriod);
                let finalTime: string | undefined = fastTimeStr;
                if (finalNum === undefined) {
                  for (let attempt = 0; attempt < 2 && finalNum === undefined; attempt++) {
                    if (attempt > 0) {
                      await new Promise<void>((r) => setTimeout(r, 450));
                    }
                    try {
                      const freshList = await Promise.race([
                        fetchWingoModeFromApi(mode),
                        new Promise<null>((resolve) => setTimeout(() => resolve(null), 650))
                      ]);
                      if (freshList && freshList.length > 0) {
                        const lookupMap = new Map<string, number>();
                        freshList.forEach((item) => lookupMap.set(item.periodNumber, item.number));
                        apiLatestResultsRef.current[mode] = lookupMap;
                        const nextP = nextIssueFromLatest(freshList[0].periodNumber);
                        if (nextP) apiNextPeriodRef.current[mode] = nextP;
                        const matched = freshList.find((x) => x.periodNumber === resolvingPeriod);
                        if (matched) {
                          finalNum = matched.number;
                          finalTime = matched.time;
                        }
                      }
                    } catch {}
                  }
                }
                const chosenNum = finalNum !== undefined ? finalNum : fastFallbackNum;
                const meta = finalNum !== undefined ? deriveWingoMeta(chosenNum) : { color: fbColor, size: fbSize };
                applyResolvedWingoOutcome(mode, resolvingPeriod, chosenNum, finalTime);
                setWingoMarkets((prevM) => {
                  const cm = prevM[mode];
                  if (!cm) return prevM;
                  const row: WinGoResult = {
                    periodNumber: resolvingPeriod,
                    number: chosenNum,
                    color: meta.color,
                    size: meta.size,
                    time: finalTime || fastTimeStr,
                    mode
                  };
                  return {
                    ...prevM,
                    [mode]: {
                      ...cm,
                      period: apiNextPeriodRef.current[mode] || cm.period,
                      history: [row, ...cm.history.filter((h) => h.periodNumber !== resolvingPeriod)].slice(0, 10)
                    }
                  };
                });
              }, 0);
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
      let tz = '';
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch {}
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed, password: pass, clientTimezone: tz, deviceName: getClientDeviceName() })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (!data) throw new Error('Invalid JSON');
        if (!res.ok || !data.success) {
          if (res.status === 403 || data.banned || String(data.message || '').toLowerCase().includes('banned')) {
            const reasonSuffix = data.banReason ? ` (${data.banReason})` : '';
            const banMsg = `আপনার আইডিটি ব্যান (Ban) হয়ে গেছে${reasonSuffix}। দয়া করে Customer Care-এ যোগাযোগ করুন।`;
            try {
              localStorage.setItem('ewi777_ban_notice', banMsg);
            } catch {}
            setBanNotice(banMsg);
            return {
              success: false,
              message: banMsg
            };
          }
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
      const reasonSuffix = existing.banReason ? ` (${existing.banReason})` : '';
      const banMsg = `আপনার আইডিটি ব্যান (Ban) হয়ে গেছে${reasonSuffix}। দয়া করে Customer Care-এ যোগাযোগ করুন।`;
      try {
        localStorage.setItem('ewi777_ban_notice', banMsg);
      } catch {}
      setBanNotice(banMsg);
      showToast(banMsg);
      return {
        success: false,
        message: banMsg
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
      deviceName: existing.deviceName || getClientDeviceName(),
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
      fetch(apiUrl('/api/users/sync'), {
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
    clearBanNotice();
    setUser(loggedUser);
    showToast(
      autoVip.totalCredited > 0
        ? `Logged in! VIP Bonus +৳${autoVip.totalCredited.toLocaleString()} auto-credited!`
        : 'Logged in successfully'
    );
    let pendingRoom = '';
    try {
      pendingRoom = (sessionStorage.getItem('ewi777_pending_ludo_room') || '').trim().toUpperCase();
    } catch {}
    if (pendingRoom) {
      setActiveTab('ludo');
      window.location.hash = `#/ludo?room=${encodeURIComponent(pendingRoom)}`;
    } else {
      setActiveTab('home');
      window.location.hash = '#/';
    }
    return { success: true, message: 'Success' };
  };

  // Auth: Register (Strict 1 account per phone number; real invite code validation; password letters+numbers >=8)
  const register = async (phoneOrEmail: string, pass: string, inviteCode?: string) => {
    if (adminSettings.registrationEnabled === false) {
      return { success: false, message: 'New user registration is currently disabled by Administrator' };
    }
    if (!phoneOrEmail || !pass) {
      return { success: false, message: 'Phone number and password are required' };
    }
    if (!PASSWORD_REGEX.test(pass.trim())) {
      return { success: false, message: PASSWORD_RULE_MSG };
    }

    const trimmed = phoneOrEmail.trim();
    const isEmail = trimmed.includes('@');
    const normInput = isEmail ? trimmed.toLowerCase() : normalizePhone(trimmed);

    if (!isEmail && !isValidBdFullPhone(normInput)) {
      return { success: false, message: BD_PHONE_RULE_MSG };
    }

    let fbUsersList: User[] = [];
    try {
      fbUsersList = await fetchAllUsersFromFirebase();
    } catch {}

    const combinedUsers = [...allUsers, ...fbUsersList];

    const existing = combinedUsers.find((u) => {
      const uPhoneNorm = normalizePhone(u.phone || '');
      const uEmailNorm = (u.email || '').toLowerCase();
      return (normInput && uPhoneNorm === normInput) || (isEmail && uEmailNorm === normInput);
    });

    if (existing) {
      return {
        success: false,
        message: 'This phone number already has an account! 1 number can only register 1 ID.'
      };
    }

    const resolvedInviteCode = (
      inviteCode?.trim() ||
      invitationParam ||
      sessionStorage.getItem('win777_invite_code') ||
      ''
    ).trim();

    let matchedReferrer: User | undefined;
    if (resolvedInviteCode) {
      const codeUpper = resolvedInviteCode.toUpperCase();
      matchedReferrer = combinedUsers.find(
        (u) =>
          (u.inviteCode && u.inviteCode.toUpperCase() === codeUpper) ||
          (u.uid && u.uid.toUpperCase() === codeUpper)
      );
      if (!matchedReferrer) {
        return { success: false, message: 'Refer Code is not Valid' };
      }
    }

    const newUid = Math.floor(1000000 + Math.random() * 9000000).toString();
    const tzOffset =
      typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number'
        ? adminSettingsRef.current.timezoneOffsetMinutes
        : 360;
    const nowTimeStr = new Date(Date.now() + tzOffset * 60000).toISOString().replace('T', ' ').slice(0, 19);

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
      referredBy: matchedReferrer ? (matchedReferrer.inviteCode || resolvedInviteCode) : undefined,
      lastLogin: nowTimeStr,
      isLoggedIn: true,
      loginPassword: pass,
      turnoverRequired: 0.00,
      turnoverCompleted: 0.00,
      hasClaimedDepositBonus: false,
      illegalBetCount: 0,
      minesRoundSeq: 0,
      boundWallets: [],
      deviceName: getClientDeviceName(),
      attendanceState: {
        claimedDays: [],
        streak: 0
      }
    };

    try {
      let tz = '';
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch {}
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: newUser, clientTimezone: tz, deviceName: getClientDeviceName() })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data && (!res.ok || !data.success)) {
          return {
            success: false,
            message: data.message || 'This number is already registered! Only 1 account per number is allowed.'
          };
        }
      }
    } catch {
      // Static deploy fallback
    }

    if (matchedReferrer) {
      const refCode = matchedReferrer.inviteCode || matchedReferrer.uid;
      const maskedPhone = normInput.length >= 7 ? normInput.slice(0, 3) + '***' + normInput.slice(-4) : normInput;
      const findUserByCode = (codeVal?: string) => {
        const c = String(codeVal || '').trim().toUpperCase();
        if (!c) return undefined;
        return combinedUsers.find(
          (u) =>
            (u.inviteCode && u.inviteCode.toUpperCase() === c) ||
            (u.uid && u.uid.toUpperCase() === c)
        );
      };

      const createdReferrals: ReferralMember[] = [];
      const newReferral: ReferralMember = {
        id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        referrerCode: refCode,
        phone: maskedPhone,
        uid: newUid,
        nickname: newUser.nickname,
        registrationDate: nowTimeStr,
        commission: 0,
        depositAmount: 0,
        level: 1,
        status: 'active'
      };
      createdReferrals.push(newReferral);

      const l2Upline = findUserByCode(matchedReferrer.referredBy);
      if (l2Upline && l2Upline.id !== matchedReferrer.id && l2Upline.uid !== newUid) {
        const l2Ref: ReferralMember = {
          id: `ref_${Date.now()}_l2_${Math.random().toString(36).slice(2, 5)}`,
          referrerCode: l2Upline.inviteCode || l2Upline.uid,
          phone: maskedPhone,
          uid: newUid,
          nickname: newUser.nickname,
          registrationDate: nowTimeStr,
          commission: 0,
          depositAmount: 0,
          level: 2,
          status: 'active'
        };
        createdReferrals.push(l2Ref);

        const l3Upline = findUserByCode(l2Upline.referredBy);
        if (
          l3Upline &&
          l3Upline.id !== l2Upline.id &&
          l3Upline.id !== matchedReferrer.id &&
          l3Upline.uid !== newUid
        ) {
          const l3Ref: ReferralMember = {
            id: `ref_${Date.now()}_l3_${Math.random().toString(36).slice(2, 5)}`,
            referrerCode: l3Upline.inviteCode || l3Upline.uid,
            phone: maskedPhone,
            uid: newUid,
            nickname: newUser.nickname,
            registrationDate: nowTimeStr,
            commission: 0,
            depositAmount: 0,
            level: 3,
            status: 'active'
          };
          createdReferrals.push(l3Ref);
        }
      }

      setReferrals((prev) => [...createdReferrals, ...prev]);
      createdReferrals.forEach((refItem) => {
        saveReferralToFirebase(refItem).catch(() => {});
        fetch(apiUrl('/api/referrals'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referral: refItem })
        }).catch(() => {});
      });

      setAllUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.id === matchedReferrer!.id) {
            const nextExp = (u.exp || 0) + 100;
            updateUserInFirebase(u.id, { exp: nextExp }, u).catch(() => {});
            return { ...u, exp: nextExp };
          }
          return u;
        })
      );
    }

    saveUserToFirebase(newUser).catch(() => {});
    setAllUsers((prev) => [...prev, newUser]);
    clearBanNotice();
    setUser(newUser);
    showToast('Registration successful! Welcome to Deshi Win.');
    let pendingRoom = '';
    try {
      pendingRoom = (sessionStorage.getItem('ewi777_pending_ludo_room') || '').trim().toUpperCase();
    } catch {}
    if (pendingRoom) {
      setActiveTab('ludo');
      window.location.hash = `#/ludo?room=${encodeURIComponent(pendingRoom)}`;
    } else {
      setActiveTab('home');
      window.location.hash = '#/';
    }
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
      const res = await fetch(apiUrl('/api/admin/access-logs'), {
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
      const res = await fetch(apiUrl('/api/admin/access-logs'), {
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

  // Admin Auth (Direct 1-step login verified against 0199 / EWI7772026 on /admin-ewi777-panel-009)
  const adminLogin = async (phone: string, pass: string) => {
    const cleanPhone = normalizePhone(phone.trim());
    const cleanPass = String(pass || '');
    if (!cleanPhone) {
      return { success: false, message: 'Enter your Administrator number.' };
    }
    if (cleanPass.length < 4) {
      return { success: false, message: 'Administrator password must be at least 4 characters.' };
    }
    let sessionId = '';
    try {
      sessionId = sessionStorage.getItem('ewi777_admin_session_id') || '';
      if (!sessionId) {
        sessionId = `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('ewi777_admin_session_id', sessionId);
      }
    } catch {
      sessionId = `adm_${Date.now()}`;
    }
    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          password: cleanPass,
          sessionId,
          deviceName: getClientDeviceName(),
          route: '/admin-ewi777-panel-009'
        })
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.sessionConflict) {
          return {
            success: false,
            message: data.message || 'Another device is already logged into the Admin Panel!',
            sessionConflict: data.activeSession
          };
        }
        if (res.ok && data.success) {
          if (data.sessionToken) {
            sessionStorage.setItem('ewi777_admin_token', String(data.sessionToken));
          }
          logAdminAccessEntry('login_success', cleanPhone).catch(() => {});
          setIsAdminLoggedIn(true);
          showToast('Welcome to Deshi Win Super Admin.');
          setActiveTab('admin');
          window.location.hash = '#/admin-ewi777-panel-009';
          return {
            success: true,
            requires2FA: false,
            message: 'Admin logged in successfully!'
          };
        }
        logAdminAccessEntry('login_failed', cleanPhone).catch(() => {});
        return { success: false, message: data.message || 'Invalid Admin Number or Password!' };
      }
      const fbSettings = await getAppSettingsFromFirebase().catch(() => null);
      const fbPhoneH =
        fbSettings?.adminPhoneHash && fbSettings.adminPhoneHash !== OLD_DEFAULT_ADMIN_PHONE_HASH
          ? fbSettings.adminPhoneHash
          : undefined;
      const fbPassH =
        fbSettings?.adminPasswordHash && fbSettings.adminPasswordHash !== OLD_DEFAULT_ADMIN_PASS_HASH
          ? fbSettings.adminPasswordHash
          : undefined;
      const expectedPhoneHash = fbPhoneH || adminSettings.adminPhoneHash || DEFAULT_ADMIN_PHONE_HASH;
      const expectedPassHash = fbPassH || adminSettings.adminPasswordHash || DEFAULT_ADMIN_PASS_HASH;
      if (sha256HexSync(cleanPhone) === expectedPhoneHash && sha256HexSync(cleanPass) === expectedPassHash) {
        logAdminAccessEntry('login_success', cleanPhone).catch(() => {});
        setIsAdminLoggedIn(true);
        showToast('Welcome to Deshi Win Super Admin.');
        setActiveTab('admin');
        window.location.hash = '#/admin-ewi777-panel-009';
        return { success: true, requires2FA: false, message: 'Admin logged in successfully!' };
      }
      logAdminAccessEntry('login_failed', cleanPhone).catch(() => {});
      return { success: false, message: 'Invalid Admin Number or Password!' };
    } catch {
      const expectedPhoneHash = adminSettings.adminPhoneHash || DEFAULT_ADMIN_PHONE_HASH;
      const expectedPassHash = adminSettings.adminPasswordHash || DEFAULT_ADMIN_PASS_HASH;
      if (sha256HexSync(cleanPhone) === expectedPhoneHash && sha256HexSync(cleanPass) === expectedPassHash) {
        logAdminAccessEntry('login_success', cleanPhone).catch(() => {});
        setIsAdminLoggedIn(true);
        showToast('Welcome to Deshi Win Super Admin.');
        setActiveTab('admin');
        window.location.hash = '#/admin-ewi777-panel-009';
        return { success: true, requires2FA: false, message: 'Admin logged in successfully!' };
      }
      logAdminAccessEntry('login_failed', cleanPhone).catch(() => {});
      return { success: false, message: 'Invalid Admin Number or Password!' };
    }
  };

  const verifyAdmin2FA = async (phone: string, pass: string, code: string) => {
    const cleanPhone = normalizePhone(phone.trim());
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length !== 8) {
      return { success: false, message: 'Enter the exact 8-character 2FA security code.' };
    }
    try {
      const res = await fetch(apiUrl('/api/admin/verify-2fa'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          password: pass,
          code: cleanCode,
          route: '/admin-ewi777-panel-009'
        })
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : {};
      if (res.ok && data.success) {
        if (data.sessionToken) {
          sessionStorage.setItem('ewi777_admin_token', String(data.sessionToken));
        }
        logAdminAccessEntry('login_success', cleanPhone).catch(() => {});
        setIsAdminLoggedIn(true);
        showToast('2FA Verified! Welcome to Deshi Win Super Admin.');
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
    const sid = (() => {
      try {
        return sessionStorage.getItem('ewi777_admin_session_id') || '';
      } catch {
        return '';
      }
    })();
    sessionStorage.removeItem('ewi777_admin_token');
    if (sid) {
      fetch(apiUrl('/api/admin/sessions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', sessionId: sid })
      }).catch(() => {});
    }
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
    fetch(apiUrl('/api/settings'), {
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
      fetch(apiUrl('/api/users/update'), {
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
    if (!newPassword || !PASSWORD_REGEX.test(newPassword.trim())) {
      return { success: false, message: PASSWORD_RULE_MSG };
    }
    const nextPass = newPassword.trim();
    const updatedUser: User = { ...userRef.current, loginPassword: nextPass };
    setUser(updatedUser);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, loginPassword: nextPass } : u))
    );
    updateUserInFirebase(updatedUser.id, { loginPassword: nextPass }, updatedUser).catch(() => {});
    fetch(apiUrl('/api/users/update'), {
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
      fetch(apiUrl('/api/users/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: updatedUser.id, patch: { avatar: avatarDataUrl } })
      }).catch(() => {});
      fetch(apiUrl('/api/users/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: updatedUser })
      }).catch(() => {});
    }
    showToast('Profile photo saved permanently!');
  };

  // Bind mobile E-Wallet (bKash / Nagad / Upay / SureCash) with global uniqueness across Firebase & server
  const bindWallet = async (
    type: 'bKash' | 'Nagad' | 'Upay' | 'SureCash',
    number: string,
    loginPassword?: string,
    accountName?: string
  ) => {
    if (!user.isLoggedIn) {
      return { success: false, message: 'Please log in first before linking a wallet account.' };
    }

    const rawDigits = String(number || '').replace(/\D/g, '');
    const normalizedBd = normalizePhone(number);
    const cleanNum = isValidBdFullPhone(normalizedBd) ? normalizedBd : rawDigits;
    if (!cleanNum || cleanNum.length < 10 || cleanNum.length > 16) {
      return { success: false, message: 'Please enter a valid 10–16 digit E-Wallet account number.' };
    }

    if (loginPassword !== undefined) {
      if (!loginPassword.trim()) {
        return { success: false, message: 'Please enter your account login password to bind this wallet.' };
      }
      if (user.loginPassword && user.loginPassword !== loginPassword.trim()) {
        return { success: false, message: 'Incorrect login password! Please enter the password you used during registration/login.' };
      }
    }

    const cleanAccName = accountName ? accountName.trim() : undefined;

    // Check if already bound to current user's own wallet list
    const alreadyOwn =
      normalizePhone(user.boundBkash || '') === cleanNum ||
      normalizePhone(user.boundNagad || '') === cleanNum ||
      Boolean(user.boundWallets?.some((w) => (normalizePhone(w.number) || w.number) === cleanNum && w.type === type));
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
            message: 'This number is already registered on another account! Each E-Wallet number can only be linked once.'
          };
        }
        return {
          success: false,
          message: `Number ${cleanNum} is already registered on this platform!`
        };
      }
    } catch {}

    // 2. Check Server API uniqueness
    try {
      const checkRes = await fetch(apiUrl('/api/bound-numbers/check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: cleanNum, userId: user.id })
      });
      const checkCt = checkRes.headers.get('content-type') || '';
      if (checkRes.ok && checkCt.includes('application/json')) {
        const checkData = await checkRes.json().catch(() => null);
        if (checkData?.bound) {
          return {
            success: false,
            message: 'This number is already registered on another account! Each E-Wallet number can only be linked once.'
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
          u.boundWallets?.some((w) => (normalizePhone(w.number) || w.number) === cleanNum))
    );

    if (alreadyInGlobal || alreadyInOtherUsers) {
      return {
        success: false,
        message: 'This number is already registered on another account! Each E-Wallet number can only be linked once.'
      };
    }

    // 4. Persist to Server & Firebase Firestore
    try {
      const regRes = await fetch(apiUrl('/api/bound-numbers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: cleanNum, userId: user.id })
      });
      if (regRes.status === 409) {
        const regCt = regRes.headers.get('content-type') || '';
        const errData = regCt.includes('application/json') ? await regRes.json().catch(() => ({})) : {};
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
        ...(cleanAccName ? { accountName: cleanAccName } : {}),
        userId: user.id,
        userPhone: user.phone || user.email || '',
        createdAt: new Date().toISOString()
      });
    } catch {}

    const newWalletItem = {
      id: `w_${Date.now()}`,
      type,
      number: cleanNum,
      ...(cleanAccName ? { accountName: cleanAccName } : {}),
      addedAt: new Date().toLocaleString()
    };

    const updatedWallets = [...(user.boundWallets || []), newWalletItem];
    const updatedUser: User = {
      ...user,
      boundWallets: updatedWallets,
      boundBkash: type === 'bKash' ? cleanNum : user.boundBkash,
      boundNagad: type === 'Nagad' ? cleanNum : user.boundNagad
    };

    const syncedUser = syncUserEverywhere(updatedUser);
    setUser(syncedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === syncedUser.id ? syncedUser : u)));

    setGlobalBoundNumbers((prev) => (prev.includes(cleanNum) ? prev : [...prev, cleanNum]));
    showToast(`${type} number ${cleanNum} saved successfully!`);
    return { success: true, message: 'Success' };
  };

  const bindUsdtAddress = async (address: string, network: string = 'TRC20') => {
    if (!user.isLoggedIn) {
      return { success: false, message: 'Please log in first.' };
    }
    const cleanAddr = String(address || '').trim();
    if (!cleanAddr || cleanAddr.length < 16 || /\s/.test(cleanAddr)) {
      return { success: false, message: 'Please enter a valid USDT wallet address (min 16 characters, no spaces).' };
    }
    const cleanNet = String(network || 'TRC20').trim().toUpperCase();
    const updatedUser: User = {
      ...user,
      boundUsdt: cleanAddr,
      usdtNetwork: cleanNet,
      updatedAt: Date.now()
    };
    const syncedUser = syncUserEverywhere(updatedUser);
    setUser(syncedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === syncedUser.id ? syncedUser : u)));
    showToast(`USDT (${cleanNet}) address bound successfully!`);
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
      showToast('NOW NOT AVAILABLE');
      return { success: false, message: 'NOW NOT AVAILABLE' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator! Deposits disabled.');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    if (amount < 200) return { success: false, message: 'Minimum deposit is ৳200' };
    if (amount > 50000) return { success: false, message: 'Maximum deposit is ৳50,000' };
    if (!senderNumber.trim() || !trxId.trim()) {
      return { success: false, message: 'Please provide both sender number and Transaction ID (TRX ID)' };
    }

    const nowMs = Date.now();
    const depId = `dep_${nowMs}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const newReq: DepositRequest = {
      id: depId,
      orderId: depId,
      userId: user.id,
      userPhone: senderNumber.trim(),
      method,
      channel,
      amount,
      senderNumber: senderNumber.trim(),
      trxId: trxId.trim().toUpperCase(),
      status: 'pending',
      createdAtMs: nowMs,
      time: new Date(nowMs).toLocaleString()
    };

    lastDepositsMutationAtRef.current = Date.now();
    setDepositRequests((prev) => dedupeDepositsList([newReq, ...prev]));
    saveDepositToFirebase(newReq).catch(() => {});

    fetch(apiUrl('/api/deposits'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq)
    }).catch(() => {});

    const pendingTx: Transaction = {
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
    };
    setTransactions((prev) => [pendingTx, ...prev]);
    saveTransactionToFirebase(pendingTx).catch(() => {});

    showToast('Deposit submitted! Funds will be verified by Administrator and credited.');
    return { success: true, message: 'Submitted' };
  };

  // EWI-Pay Live Checkout Creator (bKash / Nagad / Binance USDT $2-$20,000 +2% Bonus)
  const initiateEwiPayDeposit = async (
    amount: number,
    method: 'bKash' | 'Nagad' | 'USDT',
    channel: string,
    senderNumber?: string,
    usdAmountOverride?: number
  ) => {
    if (adminSettings.depositEnabled === false) {
      showToast('NOW NOT AVAILABLE');
      return { success: false, message: 'NOW NOT AVAILABLE' };
    }
    if (!user.isLoggedIn || !user.id) {
      return { success: false, message: 'Please log in first to deposit!' };
    }
    if (user.isBanned) {
      return { success: false, message: 'This account has been banned. Please contact Customer Care.' };
    }
    const isUsdt = method === 'USDT';
    const usdtRate = Math.max(100, Number(adminSettingsRef.current.usdtRateBdt || 120));
    const usdAmount = isUsdt
      ? +(usdAmountOverride !== undefined ? usdAmountOverride : amount / usdtRate).toFixed(2)
      : undefined;
    const bdtAmount = isUsdt && usdAmount !== undefined ? +(usdAmount * usdtRate).toFixed(2) : amount;

    if (isUsdt) {
      if (!usdAmount || usdAmount < 2) {
        return { success: false, message: 'Minimum Binance / USDT deposit is $2' };
      }
      if (usdAmount > 20000) {
        return { success: false, message: 'Maximum Binance / USDT deposit is $20,000' };
      }
    } else {
      if (bdtAmount < 200) {
        return { success: false, message: 'Minimum deposit is ৳200' };
      }
      if (bdtAmount > 50000) {
        return { success: false, message: 'Maximum deposit is ৳50,000' };
      }
    }

    const userIdTag = user.uid || user.id || 'USER_1';
    const orderId = `DEP_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const providerSlug =
      method === 'bKash' ? 'bkash' : method === 'Nagad' ? 'nagad' : 'usdt';
    const fallbackUrl = `https://ewi-pay.vercel.app/payment/ewi777?amount=${encodeURIComponent(
      String(bdtAmount)
    )}&user_id=${encodeURIComponent(userIdTag)}&method=${providerSlug}`;
    const returnUrl = `${window.location.origin}/#/transaction-history`;
    const callbackUrl = `${window.location.origin}/api/ewi-pay/webhook`;

    try {
      const res = await fetch(apiUrl('/api/ewi-pay/checkout-create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: bdtAmount,
          ...(usdAmount !== undefined ? { usdAmount } : {}),
          siteUserId: userIdTag,
          user_id: userIdTag,
          orderId,
          provider: providerSlug,
          method,
          channel: channel || (isUsdt ? 'Binance Pay' : 'EWI PAY'),
          senderNumber: senderNumber || user.phone || userIdTag,
          callbackUrl,
          returnUrl,
          return_url: returnUrl
        })
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json().catch(() => null) : null;
      if (ct.includes('application/json') && !res.ok && data?.message) {
        return { success: false, message: data.message };
      }
      const depId = orderId;
      const nowMs = Date.now();
      const sessionId = data?.sessionId ? String(data.sessionId) : undefined;
      const paymentUrl = String(data?.paymentUrl || data?.checkoutUrl || fallbackUrl);
      const dep: DepositRequest = {
        id: depId,
        orderId,
        userId: user.id,
        userPhone: senderNumber || user.phone || userIdTag,
        method,
        provider: providerSlug,
        channel: channel || (isUsdt ? 'Binance Pay' : 'EWI PAY'),
        amount: bdtAmount,
        ...(usdAmount !== undefined ? { usdAmount } : {}),
        senderNumber: senderNumber || user.phone || userIdTag,
        trxId: String(data?.deposit?.trxId || orderId).toUpperCase(),
        status: 'pending',
        createdAtMs: nowMs,
        time: new Date(nowMs).toLocaleString(),
        checkoutUrl: paymentUrl,
        ...(sessionId ? { sessionId } : {})
      };
      lastDepositsMutationAtRef.current = Date.now();
      setDepositRequests((prev) => dedupeDepositsList([dep, ...prev]));
      saveDepositToFirebase(dep).catch(() => {});

      const pendingTx: Transaction = {
        id: `tx_${Date.now()}_ewp`,
        userId: user.id,
        type: 'deposit',
        title: isUsdt ? `Binance Pay Deposit ($${usdAmount})` : `EWI PAY Deposit (${method})`,
        detail: isUsdt
          ? `$${usdAmount} USDT • +5% Instant Bonus on completion`
          : `Order: ${orderId} • EWI PAY Checkout`,
        amount: bdtAmount,
        balanceAfter: user.balance,
        time: new Date(nowMs).toLocaleString(),
        status: 'pending',
        method,
        trxId: dep.trxId,
        senderNumber: dep.senderNumber
      };
      setTransactions((prev) => [pendingTx, ...prev]);
      saveTransactionToFirebase(pendingTx).catch(() => {});

      return {
        success: true,
        message: 'Checkout created',
        checkoutUrl: paymentUrl,
        depositId: dep.id
      };
    } catch {
      const depId = orderId;
      const nowMs = Date.now();
      const dep: DepositRequest = {
        id: depId,
        orderId,
        userId: user.id,
        userPhone: senderNumber || user.phone || userIdTag,
        method,
        provider: providerSlug,
        channel: channel || (isUsdt ? 'Binance Pay' : 'EWI PAY'),
        amount: bdtAmount,
        ...(usdAmount !== undefined ? { usdAmount } : {}),
        senderNumber: senderNumber || user.phone || userIdTag,
        trxId: orderId.toUpperCase(),
        status: 'pending',
        createdAtMs: nowMs,
        checkoutUrl: fallbackUrl,
        time: new Date(nowMs).toLocaleString()
      };
      setDepositRequests((prev) => dedupeDepositsList([dep, ...prev]));
      saveDepositToFirebase(dep).catch(() => {});
      return {
        success: true,
        message: 'Checkout link generated',
        checkoutUrl: fallbackUrl,
        depositId: dep.id
      };
    }
  };

  const syncEwiPayTransactions = async () => {
    try {
      const res = await fetch(apiUrl('/api/ewi-pay/transactions'), { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      const data = res.ok && ct.includes('application/json') ? await res.json().catch(() => null) : null;
      const list = Array.isArray(data?.transactions) ? data.transactions : [];
      const newlyApprovedIds: string[] = [];
      const newlyRejectedItems: { id: string; note?: string }[] = [];

      if (list.length > 0) {
        setDepositRequests((prev) => {
          const nextList = [...prev];
          let changed = false;
          for (const item of list) {
            const id = String(item?.orderId || item?.order_id || item?.id || item?.depositId || item?.deposit_id || '').trim();
            const itemSession = item?.sessionId || item?.session_id ? String(item?.sessionId || item?.session_id) : '';
            const itemOrderId = String(item?.orderId || item?.order_id || '').trim();
            const itemTrx = String(item?.trx_id || item?.trxId || itemOrderId || id).toUpperCase();
            if (!id) continue;
            const rawStatus = String(item?.status || 'pending').toLowerCase();
            const displayStatus = String(item?.displayStatus || '').toLowerCase();
            const mappedStatus: DepositRequest['status'] =
              rawStatus === 'approved' ||
              rawStatus === 'completed' ||
              rawStatus === 'success' ||
              rawStatus === 'paid' ||
              item?.completed === true ||
              displayStatus === 'completed'
                ? 'approved'
                : rawStatus === 'rejected' ||
                  rawStatus === 'failed' ||
                  rawStatus === 'cancelled' ||
                  rawStatus === 'expired' ||
                  item?.rejected === true
                ? 'rejected'
                : 'pending';
            const existingIdx = nextList.findIndex(
              (d) =>
                d.id === id ||
                (itemOrderId && (d.id === itemOrderId || d.orderId === itemOrderId)) ||
                (itemSession && d.sessionId === itemSession) ||
                (itemTrx && d.trxId === itemTrx)
            );
            if (existingIdx >= 0) {
              const existing = nextList[existingIdx];
              if (existing.status === 'pending' || existing.status === 'processing') {
                if (mappedStatus === 'approved') {
                  newlyApprovedIds.push(existing.id);
                } else if (mappedStatus === 'rejected') {
                  newlyRejectedItems.push({
                    id: existing.id,
                    note: String(item?.rejectionReason || item?.reason || item?.note || '').trim() || undefined
                  });
                }
              }
              continue;
            }
            const mappedUserId = String(item?.siteUserId || item?.user_id || item?.userId || '').trim();
            const mappedPhone = String(item?.sender_number || item?.siteUserId || item?.user_id || '').trim();
            const isPriv = isPrivilegedSessionHost(isAdminLoggedInRef.current);
            const curUid = userRef.current?.id;
            const curUidNum = userRef.current?.uid;
            const curPhoneNorm = normalizePhone(userRef.current?.phone || '');
            const belongsToCurUser = Boolean(
              curUid &&
                (mappedUserId === curUid ||
                  (curUidNum && mappedUserId === curUidNum) ||
                  (curPhoneNorm && normalizePhone(mappedPhone) === curPhoneNorm))
            );
            if (!isPriv && !belongsToCurUser) continue;

            const mapped: DepositRequest = {
              id,
              ...(itemOrderId ? { orderId: itemOrderId } : {}),
              userId: mappedUserId,
              userPhone: mappedPhone,
              method: (item?.method as any) || 'bKash',
              channel: 'EWI PAY',
              amount: Number(item?.amount) || 0,
              senderNumber: mappedPhone,
              trxId: itemTrx,
              status: mappedStatus,
              createdAtMs: Date.now(),
              time: String(item?.created_at || new Date().toLocaleString()),
              ...(itemSession ? { sessionId: itemSession } : {})
            };
            nextList.unshift(mapped);
            changed = true;
          }
          return changed ? dedupeDepositsList(nextList) : prev;
        });
      }

      // Check active checkout session & unified/method-specific deposit status for pending gateway deposits
      const pendingSessions = depositRequestsRef.current.filter(
        (d) =>
          (d.status === 'pending' || d.status === 'processing') &&
          (Boolean(d.sessionId) || d.id.startsWith('DEP_') || d.id.startsWith('ewipay_') || d.channel?.includes('EWI-Pay') || d.channel?.includes('EWI PAY'))
      );
      for (const dep of pendingSessions) {
        const methodParam = String(dep.method || '').toLowerCase().includes('nagad')
          ? 'nagad'
          : String(dep.method || '').toLowerCase().includes('bkash')
          ? 'bkash'
          : '';
        try {
          let resolvedStatus = '';
          let resolvedReason = '';
          let resolvedCompletedFlag = false;
          let resolvedRejectedFlag = false;
          if (dep.sessionId) {
            const stRes = await fetch(
              apiUrl(`/api/ewi-pay/checkout-status/${encodeURIComponent(dep.sessionId)}`),
              { cache: 'no-store' }
            );
            const stCt = stRes.headers.get('content-type') || '';
            const stData = stRes.ok && stCt.includes('application/json') ? await stRes.json().catch(() => null) : null;
            const gwObj = stData?.gateway && typeof stData.gateway === 'object' ? stData.gateway : stData;
            resolvedStatus = String(
              gwObj?.status ||
                gwObj?.session?.status ||
                gwObj?.deposit?.status ||
                gwObj?.data?.status ||
                stData?.status ||
                ''
            )
              .trim()
              .toLowerCase();
            if (
              gwObj?.completed === true ||
              stData?.completed === true ||
              String(gwObj?.displayStatus || stData?.displayStatus || '').toLowerCase() === 'completed'
            ) {
              resolvedCompletedFlag = true;
            }
            if (gwObj?.rejected === true || stData?.rejected === true) {
              resolvedRejectedFlag = true;
            }
            resolvedReason = String(
              gwObj?.rejectionReason || gwObj?.reason || gwObj?.message || stData?.reason || stData?.message || ''
            ).trim();
          }
          const orderLookupId = dep.orderId || dep.id;
          if (!resolvedCompletedFlag && !resolvedRejectedFlag && (!resolvedStatus || resolvedStatus === 'pending' || resolvedStatus === 'processing')) {
            const qs = methodParam ? `?method=${methodParam}` : '';
            const dRes = await fetch(
              apiUrl(`/api/ewi-pay/deposit-status/${encodeURIComponent(orderLookupId)}${qs}`),
              { cache: 'no-store' }
            );
            const dCt = dRes.headers.get('content-type') || '';
            const dData = dRes.ok && dCt.includes('application/json') ? await dRes.json().catch(() => null) : null;
            const dGw = dData?.gateway && typeof dData.gateway === 'object' ? dData.gateway : dData;
            const depSt = String(
              dGw?.status ||
                dGw?.deposit?.status ||
                dGw?.data?.status ||
                dData?.status ||
                ''
            )
              .trim()
              .toLowerCase();
            if (depSt) resolvedStatus = depSt;
            if (
              dGw?.completed === true ||
              dData?.completed === true ||
              String(dGw?.displayStatus || dData?.displayStatus || '').toLowerCase() === 'completed'
            ) {
              resolvedCompletedFlag = true;
            }
            if (dGw?.rejected === true || dData?.rejected === true) {
              resolvedRejectedFlag = true;
            }
            resolvedReason =
              resolvedReason ||
              String(dGw?.rejectionReason || dGw?.reason || dGw?.message || dData?.reason || dData?.message || '').trim();
          }
          if (
            resolvedCompletedFlag ||
            resolvedStatus === 'completed' ||
            resolvedStatus === 'approved' ||
            resolvedStatus === 'success' ||
            resolvedStatus === 'paid' ||
            resolvedStatus === 'verified'
          ) {
            if (!newlyApprovedIds.includes(dep.id)) newlyApprovedIds.push(dep.id);
          } else if (
            resolvedRejectedFlag ||
            resolvedStatus === 'rejected' ||
            resolvedStatus === 'failed' ||
            resolvedStatus === 'cancelled' ||
            resolvedStatus === 'expired' ||
            resolvedStatus === 'declined'
          ) {
            if (!newlyRejectedItems.some((x) => x.id === dep.id)) {
              newlyRejectedItems.push({ id: dep.id, note: resolvedReason || undefined });
            }
          }
        } catch {}
      }

      if (newlyApprovedIds.length > 0 || newlyRejectedItems.length > 0) {
        setTimeout(() => {
          newlyApprovedIds.forEach((id) => approveDepositRef.current(id));
          newlyRejectedItems.forEach((r) => rejectDepositRef.current(r.id, r.note));
        }, 40);
      }
      return list;
    } catch {
      return [];
    }
  };

  // Auto-Complete / Approve Deposit (Credits exact principal + armed Gift Code + earned VIP tier; NO 50tk auto-collect)
  const approveDeposit = (requestId: string) => {
    const req = depositRequestsRef.current.find((r) => r.id === requestId);
    if (!req || (req.status !== 'pending' && req.status !== 'processing')) return;

    lastDepositsMutationAtRef.current = Date.now();
    lastUsersMutationAtRef.current = Date.now();

    const approvedReq: DepositRequest = { ...req, status: 'approved' };
    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? approvedReq : r))
    );
    updateDepositInFirebase(requestId, { status: 'approved' }, approvedReq).catch(() => {});

    const depositAmt = req.amount;
    const isUsdtDeposit = String(req.method || '').toUpperCase() === 'USDT';
    const usdtBonusCredit = isUsdtDeposit ? +(depositAmt * 0.05).toFixed(2) : 0;
    const depositTurnover = depositAmt * 1;
    const totalTurnoverAdded = depositTurnover;
    const totalCredit = +(depositAmt + usdtBonusCredit).toFixed(2);

    const tzOffset =
      typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number'
        ? adminSettingsRef.current.timezoneOffsetMinutes
        : 360;
    const todayStr = getLocalDateStr(new Date(), tzOffset);
    const vipTxs: Transaction[] = [];
    const vipNotifs: AppNotification[] = [];
    let vipCreditedTotal = 0;

    const normReqPhone = normalizePhone(req.userPhone || req.senderNumber || '');
    const isReqUser = (u: User) =>
      u.id === req.userId ||
      u.uid === req.userId ||
      (normReqPhone !== '' && normalizePhone(u.phone || '') === normReqPhone);

    // Check if target user has an active Pending Deposit Bonus Gift Code (e.g. 200% Deposit Bonus)
    const usersSnapshot = allUsersRef.current;
    const preMatchedUser = usersSnapshot.find(isReqUser) || (isReqUser(userRef.current) ? userRef.current : undefined);
    const pendingGiftCodeStr = String(preMatchedUser?.pendingDepositBonusCode || '').trim().toUpperCase();
    let pendingGiftItem = pendingGiftCodeStr
      ? (adminSettingsRef.current.activeGiftCodes || []).find(
          (c) => c.code.toUpperCase() === pendingGiftCodeStr && c.active !== false && c.rewardType === 'deposit_percent'
        )
      : undefined;
    if (pendingGiftItem && pendingGiftItem.expiresAt && pendingGiftItem.expiresAt > 0 && Date.now() > pendingGiftItem.expiresAt) {
      pendingGiftItem = undefined;
    }
    if (pendingGiftItem && (pendingGiftItem.claimedCount || 0) >= (pendingGiftItem.maxClaims || 1)) {
      pendingGiftItem = undefined;
    }
    const giftBonusPct = pendingGiftItem ? Number(pendingGiftItem.depositBonusPercent || pendingGiftItem.amount || 200) : 0;
    const giftBonusCredit = pendingGiftItem ? +((depositAmt * giftBonusPct) / 100).toFixed(2) : 0;
    const giftBonusTurnover = pendingGiftItem
      ? Number(pendingGiftItem.turnoverAmount && pendingGiftItem.turnoverAmount > 0 ? pendingGiftItem.turnoverAmount : giftBonusCredit)
      : 0;
    const giftBonusReason = pendingGiftItem
      ? String(pendingGiftItem.reason || pendingGiftItem.note || `${giftBonusPct}% Deposit Bonus`).trim()
      : '';

    let creditedTargetUser: User | undefined;

    const applyDepositBonusFields = (u: User): User => {
      const nextCreditedCodes = pendingGiftItem
        ? [...(u.creditedDepositBonusCodes || []), `${pendingGiftItem.code}:${requestId}`]
        : u.creditedDepositBonusCodes;
      return {
        ...u,
        balance: +(u.balance + totalCredit + giftBonusCredit).toFixed(2),
        exp: u.exp + depositAmt,
        totalDeposited: (u.totalDeposited || 0) + depositAmt,
        turnoverRequired: (u.turnoverRequired || 0) + totalTurnoverAdded + giftBonusTurnover,
        ...(pendingGiftItem
          ? {
              pendingDepositBonusCode: '',
              creditedDepositBonusCodes: nextCreditedCodes,
              lastGiftClaimTime: new Date().toLocaleString(),
              lastGiftCode: pendingGiftItem.code,
              lastGiftAmount: giftBonusCredit,
              lastGiftReason: giftBonusReason
            }
          : {}),
        attendanceState: {
          claimedDays: u.attendanceState?.claimedDays || [],
          lastClaimDate: u.attendanceState?.lastClaimDate,
          streak: u.attendanceState?.streak || 0,
          lastDepositDate: todayStr
        }
      };
    };

    setAllUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (isReqUser(u)) {
          const baseUser = applyDepositBonusFields(u);
          const autoVip = applyAutoVipRewards(baseUser);
          vipTxs.push(...autoVip.newTxs);
          vipNotifs.push(...autoVip.newNotifs);
          vipCreditedTotal = autoVip.totalCredited;
          creditedTargetUser = autoVip.updatedUser;
          syncUserEverywhere(autoVip.updatedUser);
          return autoVip.updatedUser;
        }
        return u;
      })
    );

    // Record Gift Code claimant entry if pending deposit bonus gift code just triggered
    if (pendingGiftItem && giftBonusCredit > 0) {
      const targetRefUser = creditedTargetUser || preMatchedUser;
      const claimerKey = normalizePhone(targetRefUser?.phone || req.userPhone || '') || req.userId;
      const claimRec = {
        userId: targetRefUser?.id || req.userId,
        uid: targetRefUser?.uid,
        nickname: targetRefUser?.nickname || 'Member',
        contact: targetRefUser?.phone || targetRefUser?.email || req.userPhone || '',
        amount: giftBonusCredit,
        depositAmount: depositAmt,
        reason: giftBonusReason,
        time: new Date().toLocaleString()
      };
      const nextGiftCodes = (adminSettingsRef.current.activeGiftCodes || []).map((gc) => {
        if (gc.code !== pendingGiftItem!.code) return gc;
        const prevBy = Array.isArray(gc.claimedBy) ? gc.claimedBy : [];
        return {
          ...gc,
          claimedCount: (gc.claimedCount || 0) + 1,
          claimedBy: claimerKey && !prevBy.includes(claimerKey) ? [...prevBy, claimerKey] : prevBy,
          claimRecords: [claimRec, ...(gc.claimRecords || [])]
        };
      });
      updateAdminSettings({ activeGiftCodes: nextGiftCodes });
    }

    // Credit referral deposit commission, Auto Recharge Bonus (1st/2nd/3rd), & Daily Refer Milestone Bonus
    const matchedDepUser = creditedTargetUser || usersSnapshot.find(isReqUser);
    if (matchedDepUser?.referredBy) {
      const refPct = Number(adminSettingsRef.current.referCommissionPercent ?? 10) / 100;
      const refCommissionAmt = +(depositAmt * refPct).toFixed(2);
      setReferrals((prev) =>
        prev.map((r) => {
          if (r.uid === matchedDepUser.uid || r.referrerCode === matchedDepUser.referredBy) {
            const updatedRef: ReferralMember = {
              ...r,
              depositAmount: +(Number(r.depositAmount || 0) + depositAmt).toFixed(2),
              commission: +(Number(r.commission || 0) + refCommissionAmt).toFixed(2)
            };
            saveReferralToFirebase(updatedRef).catch(() => {});
            fetch(apiUrl('/api/referrals'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ referral: updatedRef })
            }).catch(() => {});
            return updatedRef;
          }
          return r;
        })
      );

      const refOwner = usersSnapshot.find(
        (u) => u.inviteCode === matchedDepUser.referredBy || u.uid === matchedDepUser.referredBy
      );
      if (refOwner) {
        // Count prior approved deposits of this downline user (excluding current requestId)
        const priorApprovedCount = depositRequestsRef.current.filter(
          (d) =>
            d.id !== requestId &&
            d.status === 'approved' &&
            (d.userId === matchedDepUser.id ||
              d.userId === matchedDepUser.uid ||
              (normReqPhone !== '' && normalizePhone(d.userPhone || d.senderNumber || '') === normReqPhone))
        ).length;
        const depositOrdinal = priorApprovedCount + 1;

        let rechargeBonus = 0;
        if (depositOrdinal === 1 && depositAmt >= 200) {
          const t1: Array<[number, number]> = [
            [120000, 4088], [60000, 4088], [12000, 1088], [5000, 428],
            [3000, 228], [1000, 128], [500, 68], [200, 38]
          ];
          const hit = t1.find(([minA]) => depositAmt >= minA);
          if (hit) rechargeBonus = hit[1];
        } else if (depositOrdinal === 2 && depositAmt >= 500) {
          const t2: Array<[number, number]> = [
            [120000, 12000], [60000, 6000], [12000, 888], [5000, 488],
            [1000, 188], [500, 98]
          ];
          const hit = t2.find(([minA]) => depositAmt >= minA);
          if (hit) rechargeBonus = hit[1];
        } else if (depositOrdinal === 3 && depositAmt >= 1000) {
          const t3: Array<[number, number]> = [
            [120000, 12000], [60000, 6000], [12000, 1200], [5000, 500], [1000, 100]
          ];
          const hit = t3.find(([minA]) => depositAmt >= minA);
          if (hit) rechargeBonus = hit[1];
        }

        // Daily Refer Bonus (Qualified same-day downline deposits >= ৳500)
        let dailyReferDelta = 0;
        let nextDailyAwarded = refOwner.dailyReferQualifiersDate === todayStr ? Number(refOwner.dailyReferBonusTierAwarded || 0) : 0;
        if (depositAmt >= 500) {
          const downlineCodes = new Set(
            usersSnapshot
              .filter((u) => u.referredBy === refOwner.inviteCode || u.referredBy === refOwner.uid)
              .map((u) => u.id)
          );
          const todayQualifiedUsers = new Set<string>();
          depositRequestsRef.current.forEach((d) => {
            if (d.status === 'approved' && d.amount >= 500 && downlineCodes.has(d.userId)) {
              const dDate = getLocalDateStr(new Date(Date.parse(d.time) || Date.now()), tzOffset);
              if (dDate === todayStr) todayQualifiedUsers.add(d.userId);
            }
          });
          if (downlineCodes.has(matchedDepUser.id)) todayQualifiedUsers.add(matchedDepUser.id);
          const countToday = todayQualifiedUsers.size;
          const dailyTiers: Array<[number, number]> = [
            [300, 45551], [150, 20551], [100, 10551], [80, 7551],
            [50, 4551], [30, 2551], [20, 1551], [10, 751], [5, 351], [3, 151]
          ];
          const dHit = dailyTiers.find(([reqCnt]) => countToday >= reqCnt);
          if (dHit && dHit[1] > nextDailyAwarded) {
            dailyReferDelta = +(dHit[1] - nextDailyAwarded).toFixed(2);
            nextDailyAwarded = dHit[1];
          }
        }

        const totalOwnerCredit = +(refCommissionAmt + rechargeBonus + dailyReferDelta).toFixed(2);
        const ownerBonusTurnover = +(rechargeBonus + dailyReferDelta).toFixed(2);
        if (totalOwnerCredit > 0) {
          const ownerNextBal = +(Number(refOwner.balance || 0) + totalOwnerCredit).toFixed(2);
          const ownerNextTurnover = +((refOwner.turnoverRequired || 0) + ownerBonusTurnover).toFixed(2);
          const updatedOwner = syncUserEverywhere({
            ...refOwner,
            balance: ownerNextBal,
            turnoverRequired: ownerNextTurnover,
            dailyReferQualifiersDate: todayStr,
            dailyReferBonusTierAwarded: nextDailyAwarded
          });
          setAllUsers((prev) => prev.map((u) => (u.id === refOwner.id ? updatedOwner : u)));
          if (rechargeBonus > 0) {
            const rbTx: Transaction = {
              id: `tx_${Date.now()}_recb`,
              userId: refOwner.id,
              type: 'recharge_bonus',
              title: `Recharge Bonus (${depositOrdinal}${depositOrdinal === 1 ? 'st' : depositOrdinal === 2 ? 'nd' : 'rd'} Downline Deposit)`,
              detail: `Downline deposited ৳${depositAmt} • +৳${rechargeBonus} (1x Turnover)`,
              amount: rechargeBonus,
              balanceAfter: ownerNextBal,
              time: new Date().toLocaleString(),
              status: 'success'
            };
            vipTxs.push(rbTx);
            vipNotifs.push({
              id: `notif_${Date.now()}_recb`,
              userId: refOwner.id,
              title: 'Referral Recharge Bonus Credited!',
              message: `Auto-credited +৳${rechargeBonus} bonus (1x turnover) for your referral's deposit #${depositOrdinal}.`,
              type: 'bonus',
              read: false,
              time: new Date().toLocaleString()
            });
          }
          if (dailyReferDelta > 0) {
            const drTx: Transaction = {
              id: `tx_${Date.now()}_dref`,
              userId: refOwner.id,
              type: 'daily_refer_bonus',
              title: 'Daily Refer Bonus Auto-Credited',
              detail: `Same-day referral milestone unlocked • +৳${dailyReferDelta}`,
              amount: dailyReferDelta,
              balanceAfter: ownerNextBal,
              time: new Date().toLocaleString(),
              status: 'success'
            };
            vipTxs.push(drTx);
            vipNotifs.push({
              id: `notif_${Date.now()}_dref`,
              userId: refOwner.id,
              title: 'Daily Refer Milestone Bonus!',
              message: `Auto-credited +৳${dailyReferDelta} for today's active referral depositors!`,
              type: 'bonus',
              read: false,
              time: new Date().toLocaleString()
            });
          }
        }
      }
    }

    if (isReqUser(userRef.current)) {
      setUser((u) => {
        const baseUser = applyDepositBonusFields(u);
        const autoVip = applyAutoVipRewards(baseUser);
        if (vipTxs.length === 0) vipTxs.push(...autoVip.newTxs);
        if (vipNotifs.length === 0) vipNotifs.push(...autoVip.newNotifs);
        if (vipCreditedTotal === 0) vipCreditedTotal = autoVip.totalCredited;
        return syncUserEverywhere(autoVip.updatedUser);
      });
    }

    const timeNow = new Date().toLocaleString();
    const extraGiftTxs: Transaction[] = [];
    if (isUsdtDeposit && usdtBonusCredit > 0) {
      const usdtBonusTx: Transaction = {
        id: `tx_${Date.now()}_usdt5`,
        userId: req.userId,
        type: 'deposit_bonus',
        title: '+5% Binance / USDT Deposit Bonus',
        detail: `5% Auto Bonus on ৳${depositAmt.toFixed(0)} USDT deposit`,
        amount: usdtBonusCredit,
        balanceAfter: +((preMatchedUser?.balance ?? userRef.current.balance) + totalCredit).toFixed(2),
        time: timeNow,
        status: 'success'
      };
      extraGiftTxs.push(usdtBonusTx);
      saveTransactionToFirebase(usdtBonusTx).catch(() => {});
      vipNotifs.push({
        id: `notif_${Date.now()}_usdt5`,
        userId: req.userId,
        title: '+5% USDT Bonus Credited!',
        message: `You received +৳${usdtBonusCredit.toFixed(2)} automatic 5% bonus for your Binance / USDT deposit.`,
        time: timeNow,
        read: false,
        type: 'bonus'
      });
    }
    if (pendingGiftItem && giftBonusCredit > 0) {
      const gTx: Transaction = {
        id: `tx_${Date.now()}_depgift`,
        userId: req.userId,
        type: 'gift',
        title: `${giftBonusPct}% Deposit Gift Bonus (${pendingGiftItem.code})`,
        detail: `${giftBonusReason} • ৳${depositAmt} Deposit × ${giftBonusPct}% (+৳${giftBonusTurnover} Turnover)`,
        amount: giftBonusCredit,
        balanceAfter: +((preMatchedUser?.balance ?? userRef.current.balance) + totalCredit + giftBonusCredit).toFixed(2),
        time: timeNow,
        status: 'success'
      };
      extraGiftTxs.push(gTx);
      saveTransactionToFirebase(gTx).catch(() => {});
      const gNotif: AppNotification = {
        id: `notif_${Date.now()}_depgift`,
        userId: req.userId,
        title: `${giftBonusPct}% Deposit Gift Credited!`,
        message: `Code ${pendingGiftItem.code} credited +৳${giftBonusCredit.toFixed(2)} for your ৳${depositAmt} deposit. Reason: ${giftBonusReason}`,
        time: timeNow,
        read: false,
        type: 'bonus'
      };
      vipNotifs.push(gNotif);
    }

    vipTxs.forEach((vt) => saveTransactionToFirebase(vt).catch(() => {}));

    setTransactions((prev) => [
      ...extraGiftTxs,
      ...vipTxs,
      ...prev.map((t) =>
        t.trxId === req.trxId
          ? {
              ...t,
              status: 'success' as const,
              balanceAfter: +((preMatchedUser?.balance ?? userRef.current.balance) + totalCredit).toFixed(2)
            }
          : t
      )
    ]);

    if (vipNotifs.length > 0) {
      setNotifications((prev) => [...vipNotifs, ...prev].slice(0, 50));
      vipNotifs.forEach((nf) => saveNotificationToFirebase(nf).catch(() => {}));
    }

    fetch(apiUrl('/api/deposits/approve'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId })
    }).catch(() => {});

    if (req.channel?.includes('EWI-Pay') || req.channel?.includes('EWI PAY') || requestId.startsWith('ewipay_')) {
      fetch(apiUrl('/api/ewi-pay/approve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositId: requestId, method: req.method })
      }).catch(() => {});
    }

    confetti({ particleCount: 70, spread: 60 });
    showToast(
      isUsdtDeposit && usdtBonusCredit > 0
        ? `USDT Deposit ৳${depositAmt} + ৳${usdtBonusCredit.toFixed(2)} (+5% Bonus) credited!`
        : giftBonusCredit > 0
        ? `Deposit ৳${depositAmt} complete! +৳${giftBonusCredit.toFixed(0)} (${giftBonusPct}% Gift Bonus) credited!`
        : vipCreditedTotal > 0
        ? `Deposit ৳${depositAmt} complete! +৳${vipCreditedTotal} VIP Bonus auto-credited!`
        : `Deposit ৳${depositAmt} completed & added to wallet!`
    );
  };
  approveDepositRef.current = approveDeposit;

  // Reject Deposit
  const rejectDeposit = (requestId: string, note?: string) => {
    const req = depositRequestsRef.current.find((r) => r.id === requestId);
    if (!req || req.status === 'rejected' || req.status === 'approved') return;

    lastDepositsMutationAtRef.current = Date.now();
    const rejectedReq: DepositRequest = {
      ...req,
      status: 'rejected',
      adminNote: note,
      ...(note ? { rejectionReason: note } : {})
    };
    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? rejectedReq : r))
    );
    updateDepositInFirebase(
      requestId,
      { status: 'rejected', adminNote: note || '', ...(note ? { rejectionReason: note } : {}) },
      rejectedReq
    ).catch(() => {});

    fetch(apiUrl('/api/deposits/reject'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId, note })
    }).catch(() => {});

    if (req.channel?.includes('EWI-Pay') || req.channel?.includes('EWI PAY') || requestId.startsWith('DEP_') || requestId.startsWith('ewipay_')) {
      fetch(apiUrl('/api/ewi-pay/reject'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositId: requestId, note, method: req.method })
      }).catch(() => {});
    }

    setTransactions((prev) =>
      prev.map((t) => (t.trxId === req.trxId ? { ...t, status: 'rejected' as const, ...(note ? { detail: note } : {}) } : t))
    );

    showToast(`Deposit ৳${req.amount} rejected`);
  };
  rejectDepositRef.current = rejectDeposit;

  // Password Recovery via Customer Care Live Chat (never expose passwords directly)
  const requestPasswordRecovery = async (phone: string, note?: string) => {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      return { success: false, message: 'Please enter your registered phone number' };
    }

    try {
      await fetch(apiUrl('/api/password-requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, note: note || 'User requested password recovery via Customer Care' })
      });
    } catch {}

    return {
      success: true,
      message: 'To reset or recover your password, please message Customer Care in Live Chat.'
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

    const bonusAmount = Math.max(0, Number(adminSettingsRef.current.firstDepositBonusAmount ?? 50));
    const addedTurnover = +(bonusAmount * 3).toFixed(2);
    const newBal = +(user.balance + bonusAmount).toFixed(2);
    const newTurnover = (user.turnoverRequired || 0) + addedTurnover;

    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      turnoverRequired: newTurnover,
      hasClaimedDepositBonus: true
    });
    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    const depBonusTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: user.id,
      type: 'deposit_bonus',
      title: 'First Deposit Bonus (1-Time)',
      detail: `৳${bonusAmount.toFixed(0)} Cash (${addedTurnover.toFixed(0)} Taka Turnover)`,
      amount: bonusAmount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [depBonusTx, ...prev]);
    saveTransactionToFirebase(depBonusTx).catch(() => {});

    confetti({ particleCount: 60, spread: 60 });
    showToast(`Claimed ৳${bonusAmount.toFixed(0)} Deposit Bonus! Added ${addedTurnover.toFixed(0)} turnover.`);
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
    const updatedUser = syncUserEverywhere({
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
    });

    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    const vipClaimTx: Transaction = {
      id: `tx_${Date.now()}_vip`,
      userId: user.id,
      type: 'vip_bonus',
      title: `VIP${level} ${type === 'levelUp' ? 'Level-Up' : 'Monthly'} Bonus`,
      detail: `Auto Credited to Wallet: ৳${amount.toLocaleString()}`,
      amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [vipClaimTx, ...prev]);
    saveTransactionToFirebase(vipClaimTx).catch(() => {});

    confetti({ particleCount: 75, spread: 70 });
    showToast(`VIP${level} Bonus of ৳${amount.toLocaleString()} auto-added to your wallet!`);
    return { success: true, message: 'Claimed' };
  };

  // Withdraw Funds (E-Wallet & USDT; enforces Hold balance block & turnover; auto-dispatches bKash/Nagad to EWI-Pay)
  const withdraw = (
    amount: number,
    method: 'bKash' | 'Nagad' | 'Upay' | 'SureCash' | 'USDT',
    loginPass?: string,
    opts?: { accountNumber?: string; accountName?: string; usdAmount?: number; network?: string }
  ) => {
    if (adminSettings.withdrawEnabled === false) {
      showToast('Withdraw system is currently disabled by Administrator!');
      return { success: false, message: 'Withdraw system is currently disabled' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator! Withdrawals disabled.');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    const isUsdt = method === 'USDT';
    const usdtRate = Math.max(80, Number(adminSettings.usdtRateBdt || 120));
    const minWd = isUsdt ? +(10 * usdtRate).toFixed(2) : Math.max(300, Number(adminSettings.minWithdraw) || 300);
    const maxWd = isUsdt ? +(50000 * usdtRate).toFixed(2) : 50000;
    if (amount < minWd) {
      return {
        success: false,
        message: isUsdt
          ? `Minimum USDT withdrawal is 10 USDT (৳${minWd.toLocaleString()})`
          : `Minimum withdrawal is ৳${minWd}`
      };
    }
    if (amount > maxWd) {
      return {
        success: false,
        message: isUsdt ? `Maximum USDT withdrawal is 50,000 USDT` : 'Maximum withdrawal is ৳50,000'
      };
    }
    if (user.balance < amount) return { success: false, message: 'Insufficient wallet balance' };
    const lockedAmt = Math.max(0, Number(user.lockedBalance || 0));
    const withdrawableAmt = Math.max(0, +(user.balance - lockedAmt).toFixed(2));
    if (lockedAmt > 0 && amount > withdrawableAmt) {
      return {
        success: false,
        message: `Withdrawable balance is ৳${withdrawableAmt.toFixed(2)} (৳${lockedAmt.toFixed(2)} balance is on Hold — cannot play or withdraw until Admin releases it)`
      };
    }

    const fallbackBound =
      method === 'USDT'
        ? user.boundUsdt
        : opts?.accountNumber ||
          user.boundWallets?.find((w) => w.type === method)?.number ||
          (method === 'bKash' ? user.boundBkash : method === 'Nagad' ? user.boundNagad : undefined);
    const targetBound = String(opts?.accountNumber || fallbackBound || '').trim();
    if (!targetBound) {
      return {
        success: false,
        message:
          method === 'USDT'
            ? 'Please add your USDT address first before withdrawing.'
            : `Please add your ${method} E-Wallet account first before withdrawing.`
      };
    }

    // Verify login password when supplied
    if (loginPass !== undefined && user.loginPassword && user.loginPassword !== loginPass.trim()) {
      return { success: false, message: 'Incorrect login password! Please enter your real password.' };
    }

    // Check Turnover requirement
    const remainingTurnover = Math.max(0, (user.turnoverRequired || 0) - (user.turnoverCompleted || 0));
    if (remainingTurnover > 0) {
      return {
        success: false,
        message: `Insufficient turnover! Need to bet ৳${remainingTurnover.toFixed(2)} more to withdraw.`
      };
    }

    const newBal = +(user.balance - amount).toFixed(2);
    const updatedUser = syncUserEverywhere({ ...user, balance: newBal });
    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    const nowMs = Date.now();
    const wdOrderId = `WD${nowMs}${Math.floor(1000 + Math.random() * 9000)}`;
    const canGatewayDispatch = method === 'bKash' || method === 'Nagad';
    const computedUsd = isUsdt ? Number((opts?.usdAmount ?? amount / usdtRate).toFixed(2)) : undefined;
    const newWd: WithdrawRequest = {
      id: wdOrderId,
      orderId: wdOrderId,
      userId: user.id,
      userName: opts?.accountName || user.nickname || user.phone || 'User',
      userPhone: user.phone || user.email || '',
      amount,
      ...(computedUsd !== undefined ? { usdAmount: computedUsd } : {}),
      method,
      number: targetBound,
      ...(opts?.accountName ? { accountName: opts.accountName } : {}),
      ...(isUsdt ? { network: opts?.network || user.usdtNetwork || 'TRC20' } : {}),
      status: canGatewayDispatch ? 'processing' : 'pending',
      createdAtMs: nowMs,
      time: new Date(nowMs).toLocaleString()
    };
    lastWithdrawsMutationAtRef.current = nowMs;
    setWithdrawRequests((prev) => [newWd, ...prev.filter((w) => w.id !== wdOrderId && w.orderId !== wdOrderId)]);
    saveWithdrawToFirebase(newWd).catch(() => {});

    fetch(apiUrl('/api/withdraws'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWd)
    }).catch(() => {});

    if (canGatewayDispatch) {
      // Immediately auto-dispatch bKash/Nagad withdrawal request to EWI-Pay Gateway
      const siteUserId = user.uid || user.id;
      const providerSlug = method.toLowerCase();
      const callbackUrl = `${window.location.origin}/api/ewi-pay/webhook`;
      fetch(apiUrl('/api/ewi-pay/withdraw'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUserId,
          user_id: siteUserId,
          userId: user.id,
          orderId: wdOrderId,
          recipientNumber: targetBound,
          accountNumber: targetBound,
          number: targetBound,
          provider: providerSlug,
          method,
          amount,
          callbackUrl,
          autoDispatch: true
        })
      })
        .then((r) =>
          (r.headers.get('content-type') || '').includes('application/json') ? r.json().catch(() => null) : null
        )
        .then((gwData) => {
          const gwId = String(
            gwData?.withdrawalId ||
              gwData?.gateway?.withdrawalId ||
              gwData?.gateway?.withdrawal_id ||
              gwData?.gateway?.id ||
              gwData?.gateway?.withdrawal?.id ||
              gwData?.gateway?.data?.withdrawalId ||
              ''
          ).trim();
          const gwStatus = String(
            gwData?.gateway?.status || gwData?.gateway?.withdrawal?.status || gwData?.status || ''
          )
            .trim()
            .toLowerCase();
          if (gwId) {
            setWithdrawRequests((prev) =>
              prev.map((w) => (w.id === wdOrderId ? { ...w, ewiPayWithdrawId: gwId } : w))
            );
            updateWithdrawInFirebase(
              wdOrderId,
              { ewiPayWithdrawId: gwId },
              { ...newWd, ewiPayWithdrawId: gwId }
            ).catch(() => {});
            fetch(apiUrl('/api/withdraws/update'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: wdOrderId, status: 'processing', ewiPayWithdrawId: gwId })
            }).catch(() => {});
          }
          if (gwStatus === 'completed' || gwData?.gateway?.completed === true) {
            const payoutTrxId = String(gwData?.gateway?.payoutTrxId || gwData?.payoutTrxId || '').trim();
            updateWithdrawStatusRef.current?.(wdOrderId, 'completed', undefined, undefined, {
              payoutTrxId: payoutTrxId || undefined,
              ewiPayWithdrawId: gwId || undefined
            });
          } else if (gwStatus === 'rejected' || gwData?.gateway?.rejected === true || gwData?.gateway?.refundRequired === true) {
            const reason = String(
              gwData?.gateway?.rejectionReason || gwData?.gateway?.reason || gwData?.gateway?.message || ''
            ).trim();
            const usrMsg = String(gwData?.gateway?.userMessage || 'কিছুক্ষণ পর আবার চেষ্টা করুন').trim();
            updateWithdrawStatusRef.current?.(wdOrderId, 'rejected', reason || undefined, undefined, {
              userMessage: usrMsg,
              rejectionReason: reason || undefined,
              ewiPayWithdrawId: gwId || undefined
            });
          }
        })
        .catch(() => {});
    }

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: user.id,
      type: 'withdraw',
      title: isUsdt
        ? `Withdraw ${computedUsd} USDT (${targetBound.slice(0, 6)}...${targetBound.slice(-4)})`
        : `Withdraw to ${method} (${targetBound})`,
      detail: `Order ${wdOrderId} • ${canGatewayDispatch ? 'Processing via EWI PAY' : 'Pending Approval'}`,
      amount: -amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'pending',
      method,
      trxId: wdOrderId
    };

    setTransactions((prev) => [newTx, ...prev]);
    saveTransactionToFirebase(newTx).catch(() => {});
    showToast(
      isUsdt
        ? `USDT withdrawal (${computedUsd} USDT / ৳${amount}) submitted!`
        : `Withdrawal of ৳${amount} submitted! Status: ${canGatewayDispatch ? 'Processing' : 'Pending'}`
    );
    return { success: true, message: 'Success' };
  };

  // Safe Vault (Minimum ৳200 deposit into Safe)
  const transferSafe = (amount: number, direction: 'in' | 'out') => {
    if (amount <= 0) return { success: false, message: 'Invalid amount' };

    if (direction === 'in') {
      if (amount < 200) return { success: false, message: 'Minimum Safe Vault deposit is ৳200' };
      const withdrawableAmt = Math.max(0, +(user.balance - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
      if (user.balance < amount || amount > withdrawableAmt) {
        return { success: false, message: 'Balance on Hold cannot be transferred to Safe Vault until released by Admin' };
      }
      const updatedUser = syncUserEverywhere({
        ...user,
        balance: +(user.balance - amount).toFixed(2),
        safeBalance: +((user.safeBalance || 0) + amount).toFixed(2)
      });
      setUser(updatedUser);
      setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      showToast(`Transferred ৳${amount} into Safe Vault`);
      return { success: true, message: 'Transferred' };
    } else {
      if ((user.safeBalance || 0) < amount) return { success: false, message: 'Insufficient Safe balance' };
      const updatedUser = syncUserEverywhere({
        ...user,
        balance: +(user.balance + amount).toFixed(2),
        safeBalance: +((user.safeBalance || 0) - amount).toFixed(2)
      });
      setUser(updatedUser);
      setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      showToast(`Transferred ৳${amount} out of Safe Vault`);
      return { success: true, message: 'Transferred' };
    }
  };

  // Claim Gift Code (Global Admin-controlled, supports Fixed & 200% Deposit Bonus, Reason display, targetUid, maxClaims, expiry, 1-per-user)
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
    let reasonText = '';
    let rewardTypeResolved: 'fixed' | 'deposit_percent' = 'fixed';
    let depositPctResolved = 0;
    let pendingDeposit = false;
    let qualifyingDepId: string | undefined;

    let handledByServer = false;
    try {
      const res = await fetch(apiUrl('/api/gift-codes/redeem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmed,
          userId: user.id,
          userUid: user.uid,
          phone: user.phone || user.email || user.id,
          nickname: user.nickname
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (!data) throw new Error('Invalid JSON');
        if (!res.ok || !data.success) {
          return { success: false, message: data.message || 'Invalid or expired gift code' };
        }
        handledByServer = true;
        pendingDeposit = Boolean(data.pendingDeposit);
        bonus = Number(data.amount) || 0;
        turnoverReq = Number(data.turnoverAmount ?? data.amount) || 0;
        reasonText = String(data.reason || '');
        rewardTypeResolved = data.rewardType === 'deposit_percent' ? 'deposit_percent' : 'fixed';
        depositPctResolved = Number(data.depositBonusPercent || 0);
        if (data.settings) {
          setAdminSettings((prev) => ({ ...prev, ...data.settings }));
          saveAppSettingsToFirebase({ ...adminSettingsRef.current, ...data.settings }).catch(() => {});
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
      const targetUidRaw = String(active.targetUid || '').trim().toUpperCase();
      if (targetUidRaw && targetUidRaw !== 'ALL') {
        const allowedUids = targetUidRaw.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
        const myUid = String(user.uid || '').trim().toUpperCase();
        if (!myUid || !allowedUids.includes(myUid)) {
          return {
            success: false,
            message: 'This gift code is reserved for a specific UID and is not valid for your account.'
          };
        }
      }
      if (active.minRequiredBalance && user.balance < active.minRequiredBalance) {
        return { success: false, message: `Minimum ৳${active.minRequiredBalance} balance required to claim this code!` };
      }
      const claimerKey = normalizePhone(user.phone || '') || user.id;
      const claimedBy = Array.isArray(active.claimedBy) ? active.claimedBy : [];
      if (claimerKey && claimedBy.includes(claimerKey)) {
        return { success: false, message: 'You have already claimed this gift code!' };
      }

      rewardTypeResolved = active.rewardType === 'deposit_percent' ? 'deposit_percent' : 'fixed';
      depositPctResolved = Number(active.depositBonusPercent || active.amount || 200);
      reasonText = String(active.reason || active.note || (rewardTypeResolved === 'deposit_percent' ? `${depositPctResolved}% Deposit Bonus` : 'Admin Gift Bonus')).trim();

      if (rewardTypeResolved === 'deposit_percent') {
        const normMyPhone = normalizePhone(user.phone || '');
        const recentCutoff = Number(active.createdAt || 0) - 24 * 60 * 60 * 1000;
        const creditedList = Array.isArray(user.creditedDepositBonusCodes) ? user.creditedDepositBonusCodes : [];
        const approvedDeps = depositRequests.filter((d) => {
          if (d.status !== 'approved') return false;
          const depPhone = normalizePhone(d.userPhone || d.senderNumber || '');
          const belongs =
            d.userId === user.id ||
            (user.uid && d.userId === user.uid) ||
            (normMyPhone !== '' && depPhone === normMyPhone);
          if (!belongs) return false;
          if (creditedList.includes(`${trimmed}:${d.id}`)) return false;
          const parsedTs = Date.parse(d.time || '');
          if (Number.isFinite(parsedTs) && recentCutoff > 0 && parsedTs < recentCutoff) return false;
          return d.amount > 0;
        });

        const qualifyingDep = approvedDeps[0];
        if (!qualifyingDep) {
          pendingDeposit = true;
          const activatedUser = syncUserEverywhere({
            ...user,
            pendingDepositBonusCode: trimmed
          });
          setUser(activatedUser);
          const msg = `${depositPctResolved}% Deposit Bonus (${trimmed}) activated! Make a deposit & bonus will auto-credit on approval.`;
          showToast(msg);
          return { success: true, pendingDeposit: true, message: msg };
        }

        qualifyingDepId = qualifyingDep.id;
        bonus = +((qualifyingDep.amount * depositPctResolved) / 100).toFixed(2);
        turnoverReq =
          active.turnoverAmount && Number(active.turnoverAmount) > 0
            ? Number(active.turnoverAmount)
            : bonus;

        const claimRecord = {
          userId: user.id,
          uid: user.uid,
          nickname: user.nickname || 'User',
          contact: user.phone || user.email || '',
          amount: bonus,
          depositAmount: qualifyingDep.amount,
          reason: reasonText,
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
        const nextSettings = { ...adminSettingsRef.current, activeGiftCodes: updatedCodes };
        setAdminSettings(nextSettings);
        saveAppSettingsToFirebase(nextSettings).catch(() => {});
      } else {
        bonus = Number(active.amount) || 0;
        turnoverReq =
          active.turnoverAmount !== undefined && active.turnoverAmount !== null
            ? Number(active.turnoverAmount)
            : bonus;

        const claimRecord = {
          userId: user.id,
          uid: user.uid,
          nickname: user.nickname || 'User',
          contact: user.phone || user.email || '',
          amount: bonus,
          reason: reasonText,
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
        const nextSettings = { ...adminSettingsRef.current, activeGiftCodes: updatedCodes };
        setAdminSettings(nextSettings);
        saveAppSettingsToFirebase(nextSettings).catch(() => {});
      }
    }

    if (pendingDeposit) {
      const activatedUser = syncUserEverywhere({
        ...user,
        pendingDepositBonusCode: trimmed
      });
      setUser(activatedUser);
      const msg = `${depositPctResolved || 200}% Deposit Bonus (${trimmed}) activated! Make a deposit & bonus will auto-credit on approval.`;
      showToast(msg);
      return { success: true, pendingDeposit: true, message: msg };
    }

    const newBal = +(user.balance + bonus).toFixed(2);
    const newTurnover = +((user.turnoverRequired || 0) + turnoverReq).toFixed(2);
    const claimTimeStr = new Date().toLocaleString();
    const nextCredited = qualifyingDepId
      ? [...(user.creditedDepositBonusCodes || []), `${trimmed}:${qualifyingDepId}`]
      : user.creditedDepositBonusCodes;
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      turnoverRequired: newTurnover,
      lastGiftClaimTime: claimTimeStr,
      lastGiftCode: trimmed,
      lastGiftAmount: bonus,
      lastGiftReason: reasonText || user.lastGiftReason,
      pendingDepositBonusCode: user.pendingDepositBonusCode === trimmed ? '' : user.pendingDepositBonusCode,
      ...(nextCredited ? { creditedDepositBonusCodes: nextCredited } : {})
    });
    setUser(updatedUser);

    const giftTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: user.id,
      type: 'gift',
      title: rewardTypeResolved === 'deposit_percent' ? `${depositPctResolved}% Deposit Gift Bonus` : 'Gift Code Claimed',
      detail: `${reasonText ? `${reasonText} • ` : ''}Code: ${trimmed} • +৳${turnoverReq.toFixed(0)} Turnover`,
      amount: bonus,
      balanceAfter: newBal,
      time: claimTimeStr,
      status: 'success'
    };
    setTransactions((prev) => [giftTx, ...prev]);
    saveTransactionToFirebase(giftTx).catch(() => {});

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
    showToast(`Received ৳${bonus.toFixed(2)}!${reasonText ? ` (${reasonText})` : ''}`);
    return { success: true, message: 'Success' };
  };

  // Daily Sign-In Bonus (Day 1 ৳1 -> Day 7 ৳7, unlocks at 12:00 AM, 1x turnover, resets after Day 7 or missed day)
  const claimAttendanceReward = (day: number) => {
    const target = attendance.find((a) => a.day === day);
    if (!target) return { success: false, message: 'Day not found' };
    if (target.status === 'claimed' || target.claimed) {
      return { success: false, message: `Day ${day} bonus has already been claimed!` };
    }
    if (target.status === 'locked') {
      const reason = target.lockReason || 'Come back tomorrow';
      showToast(reason);
      return { success: false, message: reason };
    }

    const tzOffset =
      typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number'
        ? adminSettingsRef.current.timezoneOffsetMinutes
        : 360;
    const today = getDateKeyWithOffset(Date.now(), tzOffset);
    const yesterday = getDateKeyWithOffset(Date.now() - 86400000, tzOffset);
    const prevState = user.attendanceState || { claimedDays: [], streak: 0 };
    const prevDays = Array.isArray(prevState.claimedDays) ? prevState.claimedDays : [];
    const missedDay = Boolean(
      prevState.lastClaimDate && prevState.lastClaimDate !== today && prevState.lastClaimDate !== yesterday
    );
    const cycleRestart = missedDay || (prevDays.length >= 7 && prevState.lastClaimDate !== today);

    const newBal = +(user.balance + target.amount).toFixed(2);
    const newTurnoverReq = +((user.turnoverRequired || 0) + target.amount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      turnoverRequired: newTurnoverReq,
      attendanceState: {
        ...prevState,
        claimedDays: cycleRestart ? [day] : [...prevDays, day],
        lastClaimDate: today,
        streak: cycleRestart ? 1 : (prevState.streak || 0) + 1
      }
    });

    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    const attTx: Transaction = {
      id: `tx_${Date.now()}_att`,
      userId: user.id,
      type: 'attendance_bonus',
      title: `Daily Sign-In Day ${day} Bonus`,
      detail: `৳${target.amount} Bonus Credited (1x turnover)`,
      amount: target.amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [attTx, ...prev]);
    saveTransactionToFirebase(attTx).catch(() => {});

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
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < totalCost) {
      showToast(Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient balance');
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered' : 'Insufficient balance' };
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

    // 3. Check 5+ number trades in same round (3-4 numbers allowed without 3x penalty)
    if (type === 'number') {
      const existingNumbers = new Set(
        existingPeriodBets.filter((b) => b.type === 'number').map((b) => b.value)
      );
      existingNumbers.add(value);
      if (existingNumbers.size >= 5) {
        isIllegalBet = true;
        illegalReason = `Placing bets on 5 or more numbers (${existingNumbers.size} numbers)`;
      }
    }

    let penaltyTurnover = 0;
    if (isIllegalBet) {
      // 3X Turnover penalty on user's entire balance!
      penaltyTurnover = +(Math.max(500, user.balance * 3)).toFixed(2);
    }

    const newBal = +(user.balance - totalCost).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + totalCost,
      turnoverCompleted: (user.turnoverCompleted || 0) + totalCost,
      turnoverRequired: (user.turnoverRequired || 0) + penaltyTurnover,
      illegalBetCount: isIllegalBet ? (user.illegalBetCount || 0) + 1 : user.illegalBetCount
    });
    setUser(updatedUser);

    const nowMs = Date.now();
    const tzOffset = typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number' ? adminSettingsRef.current.timezoneOffsetMinutes : 360;
    const betId = `bet_${nowMs}_${Math.random().toString(36).slice(2, 6)}`;
    const newBet: WinGoBet = {
      id: betId,
      orderNumber: buildLotteryOrderNumber('WG', betId, nowMs),
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
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      orderTime: formatFullOrderTimestamp(nowMs, tzOffset)
    };

    betsRef.current = [newBet, ...betsRef.current];
    setBets((prev) => [newBet, ...prev]);
    setGlobalWingoBets((prev) => [newBet, ...prev].slice(0, 250));
    saveWingoBetToFirebase(newBet).catch(() => {});

    // Push live bet immediately to central server so Admin Panel monitors all phones in real time
    fetch(apiUrl('/api/wingo/bet'), {
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
    txs.forEach((tx) => saveTransactionToFirebase(tx).catch(() => {}));
    return { success: true, message: 'Success' };
  };

  const recordMarketPoolBet = (
    game: 'ewi_wingo' | 'k3' | 'd5' | 'mines' | 'binary' | 'coinflip',
    mode: string,
    period: string,
    selection: string,
    amount: number
  ) => {
    const numAmt = Number(amount) || 0;
    if (numAmt <= 0) return;
    const rawId = `${game}_${mode}_${period}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
    const prevPool = marketPoolsRef.current[rawId] || {
      poolId: rawId,
      game,
      mode,
      period,
      selections: {},
      selectionCounts: {},
      totalAmount: 0,
      updatedAt: Date.now()
    };
    const selKey = String(selection || 'BET').slice(0, 48);
    const nextPool: MarketPoolEntry = {
      ...prevPool,
      selections: {
        ...(prevPool.selections || {}),
        [selKey]: +(Number(prevPool.selections?.[selKey] || 0) + numAmt).toFixed(2)
      },
      selectionCounts: {
        ...(prevPool.selectionCounts || {}),
        [selKey]: (Number(prevPool.selectionCounts?.[selKey] || 0) + 1)
      },
      totalAmount: +(Number(prevPool.totalAmount || 0) + numAmt).toFixed(2),
      updatedAt: Date.now()
    };
    setMarketPools((prev) => ({ ...prev, [rawId]: nextPool }));
    saveMarketPoolInFirebase(nextPool).catch(() => {});
    fetch(apiUrl('/api/market-pools/bet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poolId: rawId, game, mode, period, selection: selKey, amount: numAmt })
    }).catch(() => {});
  };

  // Binary Option Trade across all synchronized global markets (min ৳10, chart tip entry precision)
  const placeBinaryTrade = (
    asset: string,
    direction: 'UP' | 'DOWN',
    amount: number,
    durationSeconds: number,
    entryPriceOverride?: number
  ) => {
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first to trade Binary Market');
      return { success: false, message: 'Login required' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator! Trading is disabled.');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    if (amount < 10) {
      showToast('Minimum Binary trade is ৳10');
      return { success: false, message: 'Minimum Binary trade is ৳10' };
    }
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < amount) {
      showToast(Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient balance');
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered' : 'Insufficient balance' };
    }

    const spec = BINARY_MARKET_MAP[asset];
    const decimals = spec?.decimals ?? 2;
    const payoutRate = spec?.payoutRate ?? 0.90;
    const entryPrice = +(Number(entryPriceOverride ?? binaryMarkets[asset]?.price ?? binaryPrice)).toFixed(decimals);

    const newBal = +(user.balance - amount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + amount,
      turnoverCompleted: (user.turnoverCompleted || 0) + amount
    });
    setUser(updatedUser);

    const now = Date.now();
    const endTime = now + durationSeconds * 1000;
    const newBet: BinaryOptionBet = {
      id: `bin_${now}_${Math.random().toString(36).slice(2, 5)}`,
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
    recordMarketPoolBet('binary', asset, 'live', direction, amount);

    fetch(apiUrl('/api/binary/bet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset, direction, amount, endTime })
    }).catch(() => {});

    const tx: Transaction = {
      id: `tx_${now}`,
      userId: user.id,
      type: 'binary_bet',
      title: `Binary Trade (${direction} ${asset})`,
      detail: `Entry: ${entryPrice.toFixed(decimals)} • Timeframe: ${durationSeconds}s`,
      amount: -amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});

    showToast(`Binary Trade Placed: ${asset} ${direction} @ ${entryPrice.toFixed(decimals)}`);
    return { success: true, message: 'Success' };
  };

  // Shared Silent 30% Pool & Rolling Cap Crash Game Engine (Aviator + Lucky Jet + PLANE)
  const placeCrashBet = async (
    game: 'aviator' | 'luckyjet' | 'plane',
    roundId: string,
    amount: number,
    autoCashout?: number,
    slot?: 1 | 2 | 3
  ) => {
    const label = game === 'luckyjet' ? 'Lucky Jet' : game === 'plane' ? 'PLANE' : 'Aviator';
    if (!user.isLoggedIn || !user.id) {
      showToast(`Please login first to bet on ${label}`);
      return { success: false, message: 'Please log in first' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator!');
      return { success: false, message: 'Account is banned by Administrator' };
    }
    if (amount < 10) {
      showToast(`Minimum ${label} bet is ৳10`);
      return { success: false, message: `Minimum ${label} bet is ৳10` };
    }
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < amount) {
      showToast(Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient wallet balance');
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered' : 'Insufficient balance' };
    }

    const prefix = game === 'luckyjet' ? 'lj' : game === 'plane' ? 'pl' : 'av';
    const betId = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBal = +(user.balance - amount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + amount,
      turnoverCompleted: (user.turnoverCompleted || 0) + amount
    });
    setUser(updatedUser);

    const newBet: AviatorBet = {
      id: betId,
      roundId,
      userId: user.id,
      game,
      amount,
      status: 'active',
      autoCashout: autoCashout && autoCashout >= 1.1 ? autoCashout : undefined,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      ...(slot ? { slot } : {})
    };
    setAviatorBets((prev) => [newBet, ...prev]);

    const txType: Transaction['type'] =
      game === 'luckyjet' ? 'luckyjet_bet' : game === 'plane' ? 'plane_bet' : 'aviator_bet';
    const tx: Transaction = {
      id: `tx_${Date.now()}_${game}`,
      userId: user.id,
      type: txType,
      title: `${label} Bet`,
      detail: `Round #${roundId.slice(-5)}${autoCashout ? ` • Auto @ ${autoCashout.toFixed(2)}x` : ''}`,
      amount: -amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});

    rollingCrashFallbackRef.current.wagered = +(rollingCrashFallbackRef.current.wagered + amount).toFixed(2);

    try {
      const res = await fetch(apiUrl('/api/crash/bet'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game,
          roundId,
          userId: user.id,
          nickname: user.nickname || 'Player',
          amount,
          betId
        })
      });
      const ct = res.headers.get('content-type') || '';
      const data = res.ok && ct.includes('application/json') ? await res.json().catch(() => null) : null;
      if (!data) throw new Error('Static deploy fallback');
      if (data?.pool) {
        setCrashPoolStates((prev) => ({ ...prev, [game]: data.pool }));
        if (game === 'aviator' || game === 'luckyjet') {
          saveCrashStateToFirebase(data.pool).catch(() => {});
        }
      }
    } catch {
      const curPool = crashPoolStatesRef.current[game];
      const basePool: CrashPoolState =
        curPool && curPool.roundId === roundId
          ? curPool
          : {
              game,
              roundId,
              totalPool: 0,
              totalPaidOut: 0,
              maxPayoutCap: 0,
              forcedCrashMultiplier: 0,
              forcedCrashedAtMs: 0,
              bets: [],
              updatedAt: Date.now()
            };
      const hit500Rule = amount >= 500;
      const nextPool: CrashPoolState = {
        ...basePool,
        totalPool: +(basePool.totalPool + amount).toFixed(2),
        maxPayoutCap: +((basePool.totalPool + amount) * 0.3).toFixed(2),
        ...(hit500Rule
          ? {
              forcedCrashMultiplier: 1.0,
              forcedCrashedAtMs: Date.now()
            }
          : {}),
        bets: [
          ...(basePool.bets || []),
          {
            id: betId,
            game,
            roundId,
            userId: user.id,
            nickname: user.nickname || 'Player',
            amount,
            status: 'active',
            placedAt: Date.now()
          }
        ],
        updatedAt: Date.now()
      };
      setCrashPoolStates((prev) => ({ ...prev, [game]: nextPool }));
      if (game === 'aviator' || game === 'luckyjet') {
        saveCrashStateToFirebase(nextPool).catch(() => {});
      }
    }

    showToast(`${label} Bet Placed: ৳${amount}`);
    return { success: true, message: 'Bet placed', betId };
  };

  const cancelCrashBet = async (game: 'aviator' | 'luckyjet' | 'plane', betId: string) => {
    const target = aviatorBets.find((b) => b.id === betId && b.status === 'active');
    if (!target) return { success: false, message: 'No active slot bet to cancel' };

    try {
      await fetch(apiUrl('/api/crash/cancel'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, roundId: target.roundId, betId })
      });
    } catch {}

    rollingCrashFallbackRef.current.wagered = Math.max(
      0,
      +(rollingCrashFallbackRef.current.wagered - target.amount).toFixed(2)
    );
    setAviatorBets((prev) => prev.filter((b) => b.id !== betId));
    const refundedBal = +(Number(userRef.current.balance || 0) + target.amount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...userRef.current,
      balance: refundedBal,
      turnoverCompleted: Math.max(0, (userRef.current.turnoverCompleted || 0) - target.amount)
    });
    setUser(updatedUser);

    const curPool = crashPoolStatesRef.current[game];
    if (curPool && curPool.roundId === target.roundId) {
      const nextPool: CrashPoolState = {
        ...curPool,
        totalPool: Math.max(0, +(curPool.totalPool - target.amount).toFixed(2)),
        maxPayoutCap: Math.max(0, +((curPool.totalPool - target.amount) * 0.3).toFixed(2)),
        bets: (curPool.bets || []).filter((b) => b.id !== betId),
        updatedAt: Date.now()
      };
      setCrashPoolStates((prev) => ({ ...prev, [game]: nextPool }));
      if (game === 'aviator' || game === 'luckyjet') {
        saveCrashStateToFirebase(nextPool).catch(() => {});
      }
    }
    showToast(`Bet cancelled & ৳${target.amount} refunded`);
    return { success: true, message: 'Bet cancelled' };
  };

  const cashOutCrashBet = async (game: 'aviator' | 'luckyjet' | 'plane', betId: string, multiplier: number) => {
    const label = game === 'luckyjet' ? 'Lucky Jet' : game === 'plane' ? 'PLANE' : 'Aviator';
    const target = aviatorBets.find((b) => b.id === betId && b.status === 'active');
    if (!target) return { success: false, winAmount: 0 };

    // Server authoritative silent 30% payout check first
    try {
      const res = await fetch(apiUrl('/api/crash/cashout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game,
          roundId: target.roundId,
          userId: userRef.current.id,
          betId,
          amount: target.amount,
          multiplier
        })
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json().catch(() => null) : null;
      if (!data) throw new Error('Static deploy fallback');
      if (data?.crashed) {
        setAviatorBets((prev) =>
          prev.map((b) => (b.id === betId && b.status === 'active' ? { ...b, status: 'lost', winAmount: 0 } : b))
        );
        return { success: false, winAmount: 0, crashed: true, crashPoint: Number(data.crashPoint || multiplier) };
      }
      if (data?.pool) {
        setCrashPoolStates((prev) => ({ ...prev, [game]: data.pool }));
        if (game === 'aviator' || game === 'luckyjet') {
          saveCrashStateToFirebase(data.pool).catch(() => {});
        }
      }
    } catch {
      // Static deploy fallback: enforce identical silent 30% rolling cap from crashPoolStates
      const curPool = crashPoolStatesRef.current[game];
      const activeBets = (curPool?.bets || []).filter((b) => b.status === 'active');
      const uniqueUsers = new Set(activeBets.map((b) => b.userId)).size;
      const evalRes = evaluateCrash30Cap({
        totalPool: curPool?.totalPool || target.amount,
        totalPaidOut: curPool?.totalPaidOut || 0,
        activeBetAmount: target.amount,
        currentMultiplier: multiplier,
        activePlayerCount: Math.max(1, uniqueUsers),
        rollingWagered: rollingCrashFallbackRef.current.wagered,
        rollingPaidOut: rollingCrashFallbackRef.current.paidOut
      });
      if (evalRes.shouldForceCrash) {
        const crashAt = Math.max(1.0, +(multiplier - 0.01).toFixed(2));
        if (curPool && curPool.roundId === target.roundId) {
          const forcedPool: CrashPoolState = {
            ...curPool,
            forcedCrashMultiplier: crashAt,
            forcedCrashedAtMs: Date.now(),
            bets: (curPool.bets || []).map((b) => (b.status === 'active' ? { ...b, status: 'lost' } : b)),
            updatedAt: Date.now()
          };
          setCrashPoolStates((prev) => ({ ...prev, [game]: forcedPool }));
          if (game === 'aviator' || game === 'luckyjet') {
            saveCrashStateToFirebase(forcedPool).catch(() => {});
          }
        }
        setAviatorBets((prev) =>
          prev.map((b) => (b.id === betId && b.status === 'active' ? { ...b, status: 'lost', winAmount: 0 } : b))
        );
        return { success: false, winAmount: 0, crashed: true, crashPoint: crashAt };
      }
    }

    const winAmount = +(target.amount * multiplier).toFixed(2);
    rollingCrashFallbackRef.current.paidOut = +(rollingCrashFallbackRef.current.paidOut + winAmount).toFixed(2);
    const poolNow = crashPoolStatesRef.current[game];
    if (poolNow && poolNow.roundId === target.roundId) {
      const syncedPool: CrashPoolState = {
        ...poolNow,
        totalPaidOut: +(Number(poolNow.totalPaidOut || 0) + winAmount).toFixed(2),
        bets: (poolNow.bets || []).map((b) =>
          b.id === betId ? { ...b, status: 'cashed_out', cashoutMultiplier: +multiplier.toFixed(2), payoutAmount: winAmount } : b
        ),
        updatedAt: Date.now()
      };
      setCrashPoolStates((prev) => ({ ...prev, [game]: syncedPool }));
      if (game === 'aviator' || game === 'luckyjet') {
        saveCrashStateToFirebase(syncedPool).catch(() => {});
      }
    }
    setAviatorBets((prev) =>
      prev.map((b) =>
        b.id === betId
          ? { ...b, status: 'cashed_out', cashoutMultiplier: +multiplier.toFixed(2), winAmount }
          : b
      )
    );

    const newBal = +(userRef.current.balance + winAmount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...userRef.current,
      balance: newBal,
      turnoverCompleted: (userRef.current.turnoverCompleted || 0) + winAmount
    });
    setUser(updatedUser);

    const winTxType: Transaction['type'] =
      game === 'luckyjet' ? 'luckyjet_win' : game === 'plane' ? 'plane_win' : 'aviator_win';
    const tx: Transaction = {
      id: `tx_${Date.now()}_${game}w`,
      userId: userRef.current.id,
      type: winTxType,
      title: `${label} Cashed Out @ ${multiplier.toFixed(2)}x`,
      detail: `Round #${target.roundId.slice(-5)} • Profit +৳${(winAmount - target.amount).toFixed(2)}`,
      amount: winAmount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});

    confetti({ particleCount: 70, spread: 60 });
    showToast(`Cashed Out @ ${multiplier.toFixed(2)}x! +৳${winAmount.toFixed(2)}`);
    return { success: true, winAmount };
  };

  // Aviator Plane Game Actions (delegates through shared 30% pool engine)
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
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < amount) {
      showToast(Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient wallet balance');
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered' : 'Insufficient balance' };
    }

    const betId = `av_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBal = +(user.balance - amount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + amount,
      turnoverCompleted: (user.turnoverCompleted || 0) + amount
    });
    setUser(updatedUser);

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

    fetch(apiUrl('/api/crash/bet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game: 'aviator',
        roundId,
        userId: user.id,
        nickname: user.nickname || 'Player',
        amount,
        betId
      })
    }).catch(() => {});

    const tx: Transaction = {
      id: `tx_${Date.now()}_avb`,
      userId: user.id,
      type: 'aviator_bet',
      title: 'Aviator Plane Bet',
      detail: `Round #${roundId.slice(-5)}${autoCashout ? ` • Auto @ ${autoCashout.toFixed(2)}x` : ''}`,
      amount: -amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});

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
    const updatedUser = syncUserEverywhere({
      ...userRef.current,
      balance: newBal,
      turnoverCompleted: (userRef.current.turnoverCompleted || 0) + winAmount
    });
    setUser(updatedUser);

    const tx: Transaction = {
      id: `tx_${Date.now()}_avw`,
      userId: userRef.current.id,
      type: 'aviator_win',
      title: `Aviator Cashed Out @ ${multiplier.toFixed(2)}x`,
      detail: `Round #${target.roundId.slice(-5)} • Profit +৳${(winAmount - target.amount).toFixed(2)}`,
      amount: winAmount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});

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
  const incrementMinesRoundSeq = () => {
    if (!userRef.current.id) return;
    const nextSeq = (userRef.current.minesRoundSeq || 0) + 1;
    setUser((u) => syncUserEverywhere({ ...u, minesRoundSeq: nextSeq }));
  };

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
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < amount) {
      showToast(Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient wallet balance');
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered' : 'Insufficient balance' };
    }
    const newBal = +(user.balance - amount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + amount,
      turnoverCompleted: (user.turnoverCompleted || 0) + amount,
      minesRoundSeq: (user.minesRoundSeq || 0) + 1
    });
    setUser(updatedUser);
    recordMarketPoolBet('mines', String(minesCount), 'live', 'BET', amount);
    const tx: Transaction = {
      id: `tx_${Date.now()}_mnb`,
      userId: user.id,
      type: 'mines_bet',
      title: `Mines 777 Bet (${minesCount} Mines)`,
      detail: `25 Tiles • Bet ৳${amount.toFixed(2)}`,
      amount: -amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});
    return { success: true, message: 'Round started' };
  };

  const cashOutMinesWin = (betAmount: number, winAmount: number, multiplier: number, minesCount: number) => {
    const newBal = +(userRef.current.balance + winAmount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...userRef.current,
      balance: newBal,
      turnoverCompleted: (userRef.current.turnoverCompleted || 0) + winAmount
    });
    setUser(updatedUser);
    const tx: Transaction = {
      id: `tx_${Date.now()}_mnw`,
      userId: userRef.current.id,
      type: 'mines_win',
      title: `Mines 777 Win @ ${multiplier.toFixed(2)}x`,
      detail: `${minesCount} Mines • Profit +৳${(winAmount - betAmount).toFixed(2)}`,
      amount: winAmount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});
    confetti({ particleCount: 65, spread: 60 });
    showToast(`Mines 777 Win! +৳${winAmount.toFixed(2)} (${multiplier.toFixed(2)}x)`);
    return { success: true, winAmount };
  };

  // Coin Flip Game Actions (Min ৳10, GOLD vs SILVER EWI777, synced pool + 4-mode control)
  const placeCoinFlipBet = (periodNumber: string, side: 'GOLD' | 'SILVER', amount: number) => {
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first to play Coin Flip');
      return { success: false, message: 'Please log in first' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator!');
      return { success: false, message: 'Account banned' };
    }
    if (amount < 10) {
      showToast('Minimum Coin Flip bet is ৳10');
      return { success: false, message: 'Minimum Coin Flip bet is ৳10' };
    }
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < amount) {
      showToast(Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient wallet balance');
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered' : 'Insufficient balance' };
    }
    const newBal = +(user.balance - amount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + amount,
      turnoverCompleted: (user.turnoverCompleted || 0) + amount
    });
    setUser(updatedUser);
    recordMarketPoolBet('coinflip', 'default', periodNumber, side, amount);

    const betId = `cf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const newBet: CoinFlipBet = {
      id: betId,
      userId: user.id,
      periodNumber,
      side,
      amount,
      status: 'pending',
      time: new Date().toTimeString().slice(0, 8)
    };
    setCoinFlipBets((prev) => [newBet, ...prev]);

    const tx: Transaction = {
      id: `tx_${Date.now()}_cfb`,
      userId: user.id,
      type: 'coinflip_bet',
      title: `Coin Flip Bet (${side})`,
      detail: `Round ${periodNumber.slice(-5)} • ৳${amount.toFixed(2)}`,
      amount: -amount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});
    showToast(`Coin Flip ${side} (Deshi Win) placed: ৳${amount}`);
    return { success: true, message: 'Bet placed', betId };
  };

  const settleCoinFlipRound = (periodNumber: string, resultSide: 'GOLD' | 'SILVER') => {
    let totalWin = 0;
    let totalWager = 0;
    let roundBetCount = 0;
    setCoinFlipBets((prev) =>
      prev.map((b) => {
        if (b.periodNumber !== periodNumber || b.status !== 'pending') return b;
        roundBetCount += 1;
        totalWager += b.amount;
        const won = b.side === resultSide;
        const winAmt = won ? +(b.amount * 1.89).toFixed(2) : 0;
        totalWin += winAmt;
        return { ...b, resultSide, status: won ? 'won' : 'lost', winAmount: winAmt };
      })
    );
    if (totalWin > 0) {
      const nextBal = +(userRef.current.balance + totalWin).toFixed(2);
      const updatedUser = syncUserEverywhere({
        ...userRef.current,
        balance: nextBal,
        turnoverCompleted: (userRef.current.turnoverCompleted || 0) + totalWin
      });
      setUser(updatedUser);
      const tx: Transaction = {
        id: `tx_${Date.now()}_cfw`,
        userId: userRef.current.id,
        type: 'coinflip_win',
        title: `Coin Flip Won (${resultSide})`,
        detail: `Round ${periodNumber.slice(-5)} • +৳${totalWin.toFixed(2)}`,
        amount: totalWin,
        balanceAfter: nextBal,
        time: new Date().toLocaleString(),
        status: 'success'
      };
      setTransactions((prev) => [tx, ...prev]);
      saveTransactionToFirebase(tx).catch(() => {});
      confetti({ particleCount: 70, spread: 60 });
      showToast(`Coin Flip Won (${resultSide})! +৳${totalWin.toFixed(2)}`);
    }
    if (roundBetCount > 0) {
      setWingoResultPopup({
        periodNumber,
        mode: '30s',
        status: totalWin > 0 ? 'won' : 'lost',
        amount: totalWin > 0 ? totalWin : totalWager,
        resultNumber: resultSide === 'GOLD' ? 7 : 2,
        resultColor: resultSide === 'GOLD' ? 'green' : 'red',
        resultSize: resultSide === 'GOLD' ? 'big' : 'small',
        gameLabel: 'Coin Flip Deshi Win',
        badges: [
          {
            label: `${resultSide} Deshi Win`,
            tone: resultSide === 'GOLD' ? 'amber' : 'slate'
          },
          { label: '1.89X', tone: totalWin > 0 ? 'green' : 'red' }
        ]
      });
    }
  };

  // Agent Daily Salary & 3 Level Salary (Apply-Only after meeting conditions; no auto-collect)
  const claimAgentSalary = (tierMembers: number, salaryAmount: number) => {
    if (!user.isLoggedIn || !user.id) {
      return { success: false, message: 'Please log in first' };
    }
    const tzOffset =
      typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number'
        ? adminSettingsRef.current.timezoneOffsetMinutes
        : 360;
    const today = getLocalDateStr(new Date(), tzOffset);
    if (user.lastSalaryClaimDate === today) {
      return { success: false, message: 'You have already applied for today’s agent salary.' };
    }
    const updatedUser = syncUserEverywhere({
      ...user,
      lastSalaryClaimDate: today
    });
    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    showToast(`Agent Salary application (৳${salaryAmount.toLocaleString()}) submitted for verification!`);
    return { success: true, message: `Application submitted for ${tierMembers} members tier` };
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
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      claimedActivityRewards: updatedClaims
    });
    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    const actTx: Transaction = {
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
    };
    setTransactions((prev) => [actTx, ...prev]);
    saveTransactionToFirebase(actTx).catch(() => {});
    confetti({ particleCount: 70, spread: 60 });
    showToast(`Activity Award +৳${rewardAmount.toFixed(2)} credited!`);
    return { success: true, message: 'Award credited' };
  };

  // Real-Time Support Chat Messenger (2-way User <-> Admin/Mentor synced to BOTH Express & Firebase)
  const sendSupportMessage = async (payload: {
    userId: string;
    userUid?: string;
    userNickname?: string;
    userPhone?: string;
    sender: 'user' | 'admin';
    repliedByRole?: 'admin' | 'mentor';
    repliedByName?: string;
    text: string;
    imageUrl?: string;
  }) => {
    if (!payload.userId || (!payload.text.trim() && !payload.imageUrl)) return;
    let savedMsg: SupportMessage | null = null;
    try {
      const res = await fetch(apiUrl('/api/support/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const ct = res.headers.get('content-type') || '';
      const data = res.ok && ct.includes('application/json') ? await res.json().catch(() => null) : null;
      if (data?.success && data.message) {
        savedMsg = data.message;
      }
    } catch {}

    if (!savedMsg) {
      savedMsg = {
        id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        userId: payload.userId,
        userUid: payload.userUid,
        userNickname: payload.userNickname,
        userPhone: payload.userPhone,
        sender: payload.sender,
        ...(payload.repliedByRole ? { repliedByRole: payload.repliedByRole } : {}),
        ...(payload.repliedByName ? { repliedByName: payload.repliedByName } : {}),
        text: payload.text.trim(),
        imageUrl: payload.imageUrl,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        timestamp: Date.now()
      };
    }

    setSupportMessages((prev) => (prev.some((m) => m.id === savedMsg!.id) ? prev : [...prev, savedMsg!]));
    saveSupportMessageToFirebase(savedMsg).catch(() => {});
  };

  // Extra First Deposit Bonus Tier Collector (Strict 1-time lifetime single-tier collect after completed deposit)
  const claimExtraFirstDepositBonus = (tierDeposit: number, bonusAmount: number) => {
    if (!user.isLoggedIn || !user.id) {
      return { success: false, message: 'Please log in first to collect bonus!' };
    }
    const hasCompletedDeposit =
      (Number(user.totalDeposited) || 0) > 0 ||
      depositRequests.some((d) => d.userId === user.id && d.status === 'approved');
    if (!hasCompletedDeposit) {
      return { success: false, message: 'Complete your first deposit first to unlock!' };
    }
    const existingClaims = { ...(user.claimedFirstDepositTiers || {}) };
    if (Object.values(existingClaims).some(Boolean)) {
      return { success: false, message: 'You have already collected your Extra First Deposit Bonus!' };
    }
    const key = String(tierDeposit);
    if ((Number(user.totalDeposited) || 0) < tierDeposit) {
      return { success: false, message: `Deposit at least ৳${tierDeposit.toLocaleString()} to unlock!` };
    }
    existingClaims[key] = true;
    const newBal = +(user.balance + bonusAmount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      claimedFirstDepositTiers: existingClaims
    });
    setUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    const fdTx: Transaction = {
      id: `tx_${Date.now()}_fd`,
      userId: user.id,
      type: 'first_deposit_bonus',
      title: `Extra First Deposit Bonus (৳${tierDeposit.toLocaleString()})`,
      detail: `First deposit tier ৳${tierDeposit.toLocaleString()} reward • +৳${bonusAmount.toFixed(2)}`,
      amount: bonusAmount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [fdTx, ...prev]);
    saveTransactionToFirebase(fdTx).catch(() => {});
    confetti({ particleCount: 75, spread: 60 });
    showToast(`+৳${bonusAmount.toFixed(2)} Extra First Deposit Bonus collected!`);
    return { success: true, message: 'Bonus collected' };
  };

  const popLotteryQueue = (game: 'ewi_wingo' | 'k3' | 'd5', mode: string) => {
    const cur = adminSettingsRef.current;
    let nextSettings: AdminSettings | null = null;
    if (game === 'ewi_wingo') {
      const q = cur.queuedEwiWingoOutcomes?.[mode as EwiWingoMode] || [];
      if (q.length === 0) return;
      nextSettings = {
        ...cur,
        queuedEwiWingoOutcomes: {
          ...(cur.queuedEwiWingoOutcomes || {}),
          [mode]: q.slice(1)
        }
      };
    } else if (game === 'k3') {
      const q = cur.queuedK3Outcomes?.[mode as K3Mode] || [];
      if (q.length === 0) return;
      nextSettings = {
        ...cur,
        queuedK3Outcomes: {
          ...(cur.queuedK3Outcomes || {}),
          [mode]: q.slice(1)
        }
      };
    } else if (game === 'd5') {
      const q = cur.queuedD5Outcomes?.[mode as D5Mode] || [];
      if (q.length === 0) return;
      nextSettings = {
        ...cur,
        queuedD5Outcomes: {
          ...(cur.queuedD5Outcomes || {}),
          [mode]: q.slice(1)
        }
      };
    }
    if (!nextSettings) return;
    lastSettingsPushAtRef.current = Date.now();
    adminSettingsRef.current = nextSettings;
    setAdminSettings(nextSettings);
    saveAppSettingsToFirebase(nextSettings).catch(() => {});
    fetch(apiUrl('/api/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: nextSettings })
    }).catch(() => {});
  };

  // Deshi K3 Dice Lottery Engine
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
      return { success: false, message: 'Please log in first to place Deshi K3 bets!' };
    }
    if (user.isBanned) {
      return { success: false, message: 'Account is banned by Administrator' };
    }
    const totalAmount = +(amount * multiplier).toFixed(2);
    if (totalAmount <= 0 || isNaN(totalAmount)) {
      return { success: false, message: 'Invalid bet amount' };
    }
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < totalAmount) {
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient balance! Please deposit first.' };
    }
    const newBal = +(user.balance - totalAmount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      turnoverCompleted: +(user.turnoverCompleted + totalAmount).toFixed(2),
      exp: user.exp + Math.round(totalAmount)
    });
    setUser(updatedUser);

    recordMarketPoolBet('k3', mode, periodNumber, `${betType}:${selection}`, totalAmount);

    const nowMs = Date.now();
    const tzOffset = typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number' ? adminSettingsRef.current.timezoneOffsetMinutes : 360;
    const betId = `k3_${nowMs}_${Math.random().toString(36).slice(2, 6)}`;
    const betEntry: K3Bet = {
      id: betId,
      orderNumber: buildLotteryOrderNumber('K3', betId, nowMs),
      userId: user.id,
      nickname: user.nickname || 'Player',
      userPhone: user.phone || user.email || '',
      periodNumber,
      mode,
      betType,
      selection,
      amount,
      multiplier,
      totalAmount,
      payoutRate,
      status: 'pending',
      time: new Date().toTimeString().slice(0, 8),
      orderTime: formatFullOrderTimestamp(nowMs, tzOffset)
    };
    k3BetsRef.current = [betEntry, ...k3BetsRef.current];
    setK3Bets((prev) => [betEntry, ...prev]);

    fetch(apiUrl('/api/lottery/bet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...betEntry, game: 'k3' })
    }).catch(() => {});

    const k3BetTx: Transaction = {
      id: `tx_${Date.now()}_k3b`,
      userId: user.id,
      type: 'k3_bet',
      title: `Deshi K3 ${mode} Bet (${selection})`,
      detail: `Period ${periodNumber} • ${betType}`,
      amount: -totalAmount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [k3BetTx, ...prev]);
    saveTransactionToFirebase(k3BetTx).catch(() => {});
    return { success: true, message: 'Bet placed' };
  };

  const settleK3Round = (mode: K3Mode, periodNumber: string, dice: [number, number, number]) => {
    const settleKey = `${mode}:${periodNumber}`;
    if (settledK3PeriodsRef.current.has(settleKey)) return;

    const pendingForRound = k3BetsRef.current.filter(
      (b) => b.periodNumber === periodNumber && b.mode === mode && b.status === 'pending' && (!userRef.current.id || b.userId === userRef.current.id)
    );
    if (pendingForRound.length === 0) return;

    settledK3PeriodsRef.current.add(settleKey);
    if (settledK3PeriodsRef.current.size > 200) {
      const first = settledK3PeriodsRef.current.values().next().value;
      if (first) settledK3PeriodsRef.current.delete(first);
    }

    const sum = dice[0] + dice[1] + dice[2];
    const isBig = sum >= 11;
    const isEven = sum % 2 === 0;
    const sorted = [...dice].sort((a, b) => a - b);
    const allSame = sorted[0] === sorted[1] && sorted[1] === sorted[2];
    const hasPair = sorted[0] === sorted[1] || sorted[1] === sorted[2];
    const allDiff = sorted[0] !== sorted[1] && sorted[1] !== sorted[2];
    const isConsec3 = allDiff && sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];

    const evalK3Bet = (b: K3Bet) => {
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
      return { won, winAmt };
    };

    let totalWinCredit = 0;
    let totalWagered = 0;
    for (const pb of pendingForRound) {
      totalWagered += pb.totalAmount;
      totalWinCredit += evalK3Bet(pb).winAmt;
    }

    k3BetsRef.current = k3BetsRef.current.map((b) => {
      if (b.periodNumber !== periodNumber || b.mode !== mode || b.status !== 'pending') return b;
      const { won, winAmt } = evalK3Bet(b);
      return {
        ...b,
        status: won ? ('won' as const) : ('lost' as const),
        winAmount: winAmt,
        resultDice: dice,
        resultSum: sum
      };
    });
    setK3Bets(k3BetsRef.current);

    if (totalWinCredit > 0) {
      const nextBal = +(userRef.current.balance + totalWinCredit).toFixed(2);
      const updatedUser = syncUserEverywhere({ ...userRef.current, balance: nextBal });
      setUser(updatedUser);
      const k3WinTx: Transaction = {
        id: `tx_${Date.now()}_k3w`,
        userId: userRef.current.id,
        type: 'k3_win',
        title: `Deshi K3 ${mode} Win`,
        detail: `Period ${periodNumber} • Dice ${dice.join('-')} (Sum ${sum})`,
        amount: totalWinCredit,
        balanceAfter: nextBal,
        time: new Date().toLocaleString(),
        status: 'success'
      };
      setTransactions((prev) => [k3WinTx, ...prev]);
      saveTransactionToFirebase(k3WinTx).catch(() => {});
      confetti({ particleCount: 70, spread: 60 });
      showToast(`Deshi K3 Won +৳${totalWinCredit.toFixed(2)}!`);
    }

    setWingoResultPopup({
      periodNumber,
      mode: mode === '10m' ? '5m' : (mode as any),
      status: totalWinCredit > 0 ? 'won' : 'lost',
      amount: totalWinCredit > 0 ? totalWinCredit : totalWagered,
      resultNumber: sum,
      resultColor: isBig ? 'red' : 'green',
      resultSize: isBig ? 'big' : 'small',
      gameLabel: `Deshi K3 ${mode}`,
      badges: [
        { label: `Dice ${dice.join('-')}`, tone: 'amber' },
        { label: isBig ? 'Big' : 'Small', tone: isBig ? 'orange' : 'green' },
        { label: isEven ? 'Even' : 'Odd', tone: isEven ? 'red' : 'violet' },
        { label: String(sum), tone: 'amber' }
      ]
    });
  };

  // Deshi 5D Lottery Engine
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
      return { success: false, message: 'Please log in first to place Deshi 5D bets!' };
    }
    if (user.isBanned) {
      return { success: false, message: 'Account is banned by Administrator' };
    }
    const totalAmount = +(amount * multiplier).toFixed(2);
    if (totalAmount <= 0 || isNaN(totalAmount)) {
      return { success: false, message: 'Invalid bet amount' };
    }
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < totalAmount) {
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient balance! Please deposit first.' };
    }
    const newBal = +(user.balance - totalAmount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      turnoverCompleted: +(user.turnoverCompleted + totalAmount).toFixed(2),
      exp: user.exp + Math.round(totalAmount)
    });
    setUser(updatedUser);

    recordMarketPoolBet('d5', mode, periodNumber, `${position}:${betType}:${selection}`, totalAmount);

    const nowMs = Date.now();
    const tzOffset = typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number' ? adminSettingsRef.current.timezoneOffsetMinutes : 360;
    const betId = `d5_${nowMs}_${Math.random().toString(36).slice(2, 6)}`;
    const betEntry: D5Bet = {
      id: betId,
      orderNumber: buildLotteryOrderNumber('D5', betId, nowMs),
      userId: user.id,
      nickname: user.nickname || 'Player',
      userPhone: user.phone || user.email || '',
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
      time: new Date().toTimeString().slice(0, 8),
      orderTime: formatFullOrderTimestamp(nowMs, tzOffset)
    };
    d5BetsRef.current = [betEntry, ...d5BetsRef.current];
    setD5Bets((prev) => [betEntry, ...prev]);

    fetch(apiUrl('/api/lottery/bet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...betEntry, game: 'd5' })
    }).catch(() => {});

    const d5BetTx: Transaction = {
      id: `tx_${Date.now()}_d5b`,
      userId: user.id,
      type: 'd5_bet',
      title: `Deshi 5D ${mode} Bet (${position}: ${selection})`,
      detail: `Period ${periodNumber}`,
      amount: -totalAmount,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [d5BetTx, ...prev]);
    saveTransactionToFirebase(d5BetTx).catch(() => {});
    return { success: true, message: 'Bet placed' };
  };

  const settleD5Round = (mode: D5Mode, periodNumber: string, digits: [number, number, number, number, number]) => {
    const settleKey = `${mode}:${periodNumber}`;
    if (settledD5PeriodsRef.current.has(settleKey)) return;

    const pendingForRound = d5BetsRef.current.filter(
      (b) => b.periodNumber === periodNumber && b.mode === mode && b.status === 'pending' && (!userRef.current.id || b.userId === userRef.current.id)
    );
    if (pendingForRound.length === 0) return;

    settledD5PeriodsRef.current.add(settleKey);
    if (settledD5PeriodsRef.current.size > 200) {
      const first = settledD5PeriodsRef.current.values().next().value;
      if (first) settledD5PeriodsRef.current.delete(first);
    }

    const sum = digits.reduce((a, b) => a + b, 0);
    const posIndex: Record<'A' | 'B' | 'C' | 'D' | 'E', number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

    const evalD5Bet = (b: D5Bet) => {
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
      return { won, winAmt };
    };

    let totalWinCredit = 0;
    let totalWagered = 0;
    for (const pb of pendingForRound) {
      totalWagered += pb.totalAmount;
      totalWinCredit += evalD5Bet(pb).winAmt;
    }

    d5BetsRef.current = d5BetsRef.current.map((b) => {
      if (b.periodNumber !== periodNumber || b.mode !== mode || b.status !== 'pending') return b;
      const { won, winAmt } = evalD5Bet(b);
      return {
        ...b,
        status: won ? ('won' as const) : ('lost' as const),
        winAmount: winAmt,
        resultDigits: digits,
        resultSum: sum
      };
    });
    setD5Bets(d5BetsRef.current);

    if (totalWinCredit > 0) {
      const nextBal = +(userRef.current.balance + totalWinCredit).toFixed(2);
      const updatedUser = syncUserEverywhere({ ...userRef.current, balance: nextBal });
      setUser(updatedUser);
      const d5WinTx: Transaction = {
        id: `tx_${Date.now()}_d5w`,
        userId: userRef.current.id,
        type: 'd5_win',
        title: `Deshi 5D ${mode} Win`,
        detail: `Period ${periodNumber} • ${digits.join('-')} (Sum ${sum})`,
        amount: totalWinCredit,
        balanceAfter: nextBal,
        time: new Date().toLocaleString(),
        status: 'success'
      };
      setTransactions((prev) => [d5WinTx, ...prev]);
      saveTransactionToFirebase(d5WinTx).catch(() => {});
      confetti({ particleCount: 70, spread: 60 });
      showToast(`Deshi 5D Won +৳${totalWinCredit.toFixed(2)}!`);
    }

    const isSumBig = sum >= 23;
    setWingoResultPopup({
      periodNumber,
      mode: mode === '10m' ? '5m' : (mode as any),
      status: totalWinCredit > 0 ? 'won' : 'lost',
      amount: totalWinCredit > 0 ? totalWinCredit : totalWagered,
      resultNumber: sum,
      resultColor: isSumBig ? 'red' : 'green',
      resultSize: isSumBig ? 'big' : 'small',
      gameLabel: `Deshi 5D ${mode}`,
      badges: [
        { label: digits.join('-'), tone: 'amber' },
        { label: isSumBig ? 'Big' : 'Small', tone: isSumBig ? 'orange' : 'green' },
        { label: `Sum ${sum}`, tone: 'violet' }
      ]
    });
  };

  // Deshi WinGo (Synced fast 15s / 30s / 1m / 3m Market)
  const placeEwiWingoBet = (
    mode: EwiWingoMode,
    periodNumber: string,
    type: 'color' | 'number' | 'size',
    value: string | number,
    amount: number,
    multiplier: number
  ) => {
    if (!user.isLoggedIn || !user.id) {
      showToast('Please login first to place Deshi WinGo bets!');
      return { success: false, message: 'Login required' };
    }
    if (user.isBanned) {
      showToast('This account has been banned. Please contact Customer Care.');
      return { success: false, message: 'Account banned' };
    }
    const tzOffset =
      typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number'
        ? adminSettingsRef.current.timezoneOffsetMinutes
        : 360;
    const liveInfo = getEwiWingoPeriodInfo(mode, Date.now(), tzOffset);
    if (liveInfo.timeRemaining <= 5) {
      showToast('Betting closed for final 5 seconds!');
      return { success: false, message: 'Betting closed for final 5 seconds!' };
    }
    const totalAmount = +(amount * multiplier).toFixed(2);
    if (totalAmount < 10 || isNaN(totalAmount)) {
      return { success: false, message: 'Minimum bet is ৳10' };
    }
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < totalAmount) {
      showToast(Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient balance!');
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered' : 'Insufficient balance' };
    }

    const existingRoundEwiBets = ewiWingoBetsRef.current.filter(
      (b) => b.periodNumber === periodNumber && b.mode === mode && b.userId === user.id
    );
    let isIllegalBet = false;
    let illegalReason = '';
    if (type === 'size') {
      if (value === 'big' && existingRoundEwiBets.some((b) => b.type === 'size' && b.value === 'small')) {
        isIllegalBet = true;
        illegalReason = 'Hedging on both Big & Small simultaneously';
      } else if (value === 'small' && existingRoundEwiBets.some((b) => b.type === 'size' && b.value === 'big')) {
        isIllegalBet = true;
        illegalReason = 'Hedging on both Big & Small simultaneously';
      }
    }
    if (type === 'color') {
      if (value === 'red' && existingRoundEwiBets.some((b) => b.type === 'color' && b.value === 'green')) {
        isIllegalBet = true;
        illegalReason = 'Hedging on both Red & Green simultaneously';
      } else if (value === 'green' && existingRoundEwiBets.some((b) => b.type === 'color' && b.value === 'red')) {
        isIllegalBet = true;
        illegalReason = 'Hedging on both Red & Green simultaneously';
      }
    }
    if (type === 'number') {
      const existingNumbers = new Set(
        existingRoundEwiBets.filter((b) => b.type === 'number').map((b) => b.value)
      );
      existingNumbers.add(value);
      if (existingNumbers.size >= 5) {
        isIllegalBet = true;
        illegalReason = `Placing bets on 5 or more numbers (${existingNumbers.size} numbers)`;
      }
    }
    const penaltyTurnover = isIllegalBet ? +(Math.max(500, user.balance * 3)).toFixed(2) : 0;

    const newBal = +(user.balance - totalAmount).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + totalAmount,
      turnoverCompleted: (user.turnoverCompleted || 0) + totalAmount,
      turnoverRequired: (user.turnoverRequired || 0) + penaltyTurnover,
      illegalBetCount: isIllegalBet ? (user.illegalBetCount || 0) + 1 : user.illegalBetCount
    });
    setUser(updatedUser);

    recordMarketPoolBet('ewi_wingo', mode, periodNumber, `${type}:${String(value)}`, totalAmount);

    const nowMs = Date.now();
    const betId = `ewg_${nowMs}_${Math.random().toString(36).slice(2, 6)}`;
    const newBet: EwiWingoBet = {
      id: betId,
      orderNumber: buildLotteryOrderNumber('DW', betId, nowMs),
      userId: user.id,
      nickname: user.nickname || 'Player',
      userPhone: user.phone || user.email || '',
      periodNumber,
      mode,
      type,
      value,
      amount,
      multiplier,
      totalAmount,
      status: 'pending',
      time: new Date().toTimeString().slice(0, 8),
      orderTime: formatFullOrderTimestamp(nowMs, tzOffset)
    };
    ewiWingoBetsRef.current = [newBet, ...ewiWingoBetsRef.current];
    setEwiWingoBets((prev) => [newBet, ...prev]);

    fetch(apiUrl('/api/lottery/bet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newBet,
        game: 'ewi_wingo',
        betType: type,
        selection: String(value)
      })
    }).catch(() => {});

    const txs: Transaction[] = [
      {
        id: `tx_${Date.now()}_ewgb`,
        userId: user.id,
        type: 'ewi_wingo_bet',
        title: `Deshi WinGo ${mode} Bet (${type}: ${value})`,
        detail: `Period ${periodNumber}`,
        amount: -totalAmount,
        balanceAfter: newBal,
        time: new Date().toLocaleString(),
        status: 'success'
      }
    ];
    if (isIllegalBet) {
      txs.unshift({
        id: `tx_${Date.now()}_ewg_penalty`,
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
        reason: `${illegalReason} (Deshi WinGo ${mode} • Period ${periodNumber.slice(-5)})`,
        type: 'turnover'
      });
    }
    setTransactions((prev) => [...txs, ...prev]);
    txs.forEach((t) => saveTransactionToFirebase(t).catch(() => {}));
    showToast(`Deshi WinGo ${mode} bet placed!`);
    return { success: true, message: 'Bet placed' };
  };

  const settleEwiWingoRound = (mode: EwiWingoMode, periodNumber: string, resolvedNumber: number) => {
    const settleKey = `${mode}:${periodNumber}`;
    if (settledEwiWingoPeriodsRef.current.has(settleKey)) return;

    const safeNum = Math.min(9, Math.max(0, Math.round(resolvedNumber)));
    const { color, size } = getEwiWingoNumberMeta(safeNum);
    const pendingForRound = ewiWingoBetsRef.current.filter(
      (b) => b.periodNumber === periodNumber && b.mode === mode && b.status === 'pending' && (!userRef.current.id || b.userId === userRef.current.id)
    );
    if (pendingForRound.length === 0) return;

    settledEwiWingoPeriodsRef.current.add(settleKey);
    if (settledEwiWingoPeriodsRef.current.size > 200) {
      const first = settledEwiWingoPeriodsRef.current.values().next().value;
      if (first) settledEwiWingoPeriodsRef.current.delete(first);
    }

    let totalWin = 0;
    let totalWager = 0;

    const evalBet = (b: EwiWingoBet) => {
      let won = false;
      let odds = 1.89;
      if (b.type === 'number') {
        won = Number(b.value) === safeNum;
        odds = 9;
      } else if (b.type === 'size') {
        won = b.value === size;
        odds = 1.89;
      } else if (b.type === 'color') {
        if (b.value === 'green') {
          if ([1, 3, 7, 9].includes(safeNum)) { won = true; odds = 1.89; }
          else if (safeNum === 5) { won = true; odds = 1.5; }
        } else if (b.value === 'red') {
          if ([2, 4, 6, 8].includes(safeNum)) { won = true; odds = 1.89; }
          else if (safeNum === 0) { won = true; odds = 1.5; }
        } else if (b.value === 'violet') {
          if ([0, 5].includes(safeNum)) { won = true; odds = 4.5; }
        }
      }
      return { won, winAmount: won ? +(b.totalAmount * odds).toFixed(2) : 0 };
    };

    for (const ub of pendingForRound) {
      totalWager += ub.totalAmount;
      totalWin += evalBet(ub).winAmount;
    }

    ewiWingoBetsRef.current = ewiWingoBetsRef.current.map((b) => {
      if (b.periodNumber !== periodNumber || b.mode !== mode || b.status !== 'pending') return b;
      const { won, winAmount } = evalBet(b);
      return {
        ...b,
        status: won ? ('won' as const) : ('lost' as const),
        winAmount,
        resultNumber: safeNum,
        resultColor: color,
        resultSize: size
      };
    });
    setEwiWingoBets(ewiWingoBetsRef.current);

    if (totalWin > 0) {
      const nextBal = +(userRef.current.balance + totalWin).toFixed(2);
      const updatedUser = syncUserEverywhere({
        ...userRef.current,
        balance: nextBal,
        turnoverCompleted: (userRef.current.turnoverCompleted || 0) + totalWin
      });
      setUser(updatedUser);
      const winTx: Transaction = {
        id: `tx_${Date.now()}_ewgw`,
        userId: userRef.current.id,
        type: 'ewi_wingo_win',
        title: `Deshi WinGo ${mode} Prize Won!`,
        detail: `Period ${periodNumber.slice(-5)} • Result ${safeNum} (${color.toUpperCase()})`,
        amount: totalWin,
        balanceAfter: nextBal,
        time: new Date().toLocaleString(),
        status: 'success'
      };
      setTransactions((prev) => [winTx, ...prev]);
      saveTransactionToFirebase(winTx).catch(() => {});
      confetti({ particleCount: 75, spread: 65 });
      showToast(`Deshi WinGo ${mode} Won! +৳${totalWin.toFixed(2)}`);
    }

    setWingoResultPopup({
      periodNumber,
      mode: mode === '15s' ? '30s' : mode,
      status: totalWin > 0 ? 'won' : 'lost',
      amount: totalWin > 0 ? totalWin : totalWager,
      resultNumber: safeNum,
      resultColor: color,
      resultSize: size,
      gameLabel: `Deshi WinGo ${mode}`
    });
  };

  // WinGo Win Streak Claim (Same day, 12:00 AM reset, 1x/day, 3x turnover)
  const claimWinGoStreakBonus = () => {
    if (!user.isLoggedIn || !user.id) return { success: false, message: 'Login required' };
    const tzOffset = typeof adminSettingsRef.current.timezoneOffsetMinutes === 'number' ? adminSettingsRef.current.timezoneOffsetMinutes : 360;
    const todayStr = getLocalDateStr(new Date(), tzOffset);
    if (user.claimedWinGoStreakDate === todayStr) {
      return { success: false, message: 'Already claimed WinGo Win Streak bonus today (resets at 12:00 AM).' };
    }
    const streak = user.lastWinGoStreakDate === todayStr ? Number(user.winGoStreakCount || 0) : 0;
    if (streak < 3) {
      return { success: false, message: `Current streak today is ${streak}. Reach at least 3 consecutive WinGo wins!` };
    }
    // Evaluate minimum bet across the latest `streak` consecutive won bets
    const wonBets = bets
      .filter((b) => b.userId === user.id && b.status === 'won')
      .slice(0, streak);
    const minStake = wonBets.length >= streak ? Math.min(...wonBets.map((b) => Number(b.totalAmount || 0))) : 0;

    let bonus = 0;
    if (minStake >= 100) {
      if (streak >= 15) bonus = 10000;
      else if (streak >= 10) bonus = 5000;
      else if (streak >= 8 && minStake >= 130) bonus = 1000;
      else if (streak >= 5) bonus = 150;
      else if (streak >= 3) bonus = 30;
    } else if (minStake >= 10) {
      if (streak >= 15) bonus = 1000;
      else if (streak >= 10) bonus = 500;
      else if (streak >= 8) bonus = 100;
      else if (streak >= 5) bonus = 20;
    }

    if (bonus <= 0) {
      return {
        success: false,
        message: 'Streak tier not yet qualified (min ৳100 for 3 wins or ৳10-৳99 for 5+ wins).'
      };
    }

    const turnoverAdded = +(bonus * 3).toFixed(2);
    const nextBal = +(user.balance + bonus).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: nextBal,
      turnoverRequired: +((user.turnoverRequired || 0) + turnoverAdded).toFixed(2),
      claimedWinGoStreakDate: todayStr
    });
    setUser(updatedUser);
    const tx: Transaction = {
      id: `tx_${Date.now()}_wgs`,
      userId: user.id,
      type: 'wingo_streak_bonus',
      title: `WinGo ${streak}-Win Streak Bonus`,
      detail: `Min Bet ৳${minStake} • ৳${bonus} Bonus (3x Turnover ৳${turnoverAdded})`,
      amount: bonus,
      balanceAfter: nextBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});
    confetti({ particleCount: 70, spread: 60 });
    showToast(`WinGo Win Streak Bonus +৳${bonus} credited!`);
    return { success: true, message: `Credited ৳${bonus}!` };
  };

  // Deshi WinGo 6-Step 3X Loss 100% Refund Claim
  const claimWinGoSixStepRefund = () => {
    if (!user.isLoggedIn || !user.id) return { success: false, message: 'Login required' };
    const claimedSet = new Set(user.claimedWingoRefunds || []);
    const myEwi = ewiWingoBets.filter((b) => b.userId === user.id && b.status !== 'pending');
    if (myEwi.length < 6) {
      return { success: false, message: 'Play at least 6 sequential Deshi WinGo rounds following a 3X plan first.' };
    }
    const latestSix = myEwi.slice(0, 6);
    if (!latestSix.every((b) => b.status === 'lost')) {
      return { success: false, message: 'Your latest 6 consecutive Deshi WinGo bets must all be losses for the 100% refund.' };
    }
    const key = latestSix.map((b) => b.id).join(',');
    if (claimedSet.has(key)) {
      return { success: false, message: '100% refund for this 6-step sequence has already been claimed!' };
    }
    const totalLoss = +latestSix.reduce((s, b) => s + Number(b.totalAmount || 0), 0).toFixed(2);
    const nextBal = +(user.balance + totalLoss).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: nextBal,
      claimedWingoRefunds: [...Array.from(claimedSet), key]
    });
    setUser(updatedUser);
    const tx: Transaction = {
      id: `tx_${Date.now()}_wgr`,
      userId: user.id,
      type: 'wingo_refund',
      title: 'Deshi WinGo 6-Step 100% Loss Refund',
      detail: `6 consecutive losses refunded 100% (+৳${totalLoss})`,
      amount: totalLoss,
      balanceAfter: nextBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});
    confetti({ particleCount: 70, spread: 60 });
    showToast(`100% 6-Step Refund +৳${totalLoss.toFixed(2)} credited!`);
    return { success: true, message: `Refunded ৳${totalLoss.toFixed(2)}!` };
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
    const mutationTs = Date.now();
    lastUsersMutationAtRef.current = mutationTs + 2000;
    const target =
      allUsers.find((u) => matchesTargetUser(u, userId)) ||
      (matchesTargetUser(user, userId) ? user : undefined);
    const resolvedId = target?.id || userId;
    setAllUsers((prevUsers) =>
      prevUsers.map((u) =>
        matchesTargetUser(u, resolvedId, target?.phone)
          ? { ...u, turnoverRequired: requiredTurnover, updatedAt: mutationTs }
          : u
      )
    );
    if (matchesTargetUser(user, resolvedId, target?.phone)) {
      setUser((u) => ({ ...u, turnoverRequired: requiredTurnover, updatedAt: mutationTs }));
    }
    updateUserInFirebase(
      resolvedId,
      { turnoverRequired: requiredTurnover, updatedAt: mutationTs },
      target ? { ...target, turnoverRequired: requiredTurnover, updatedAt: mutationTs } : undefined
    ).catch(() => {});
    fetch(apiUrl('/api/users/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: resolvedId,
        userPhone: target?.phone,
        fallbackUser: target,
        patch: { turnoverRequired: requiredTurnover, updatedAt: mutationTs }
      })
    }).catch(() => {});
    showToast(`Turnover updated to ৳${requiredTurnover.toFixed(0)}`);
  };

  // Admin Ban / Unban Any Member (Persisted to BOTH Firebase Firestore + Express API)
  const toggleUserBan = (userId: string, reason?: string) => {
    const mutationTs = Date.now();
    lastUsersMutationAtRef.current = mutationTs + 2000;
    const target =
      allUsers.find((u) => matchesTargetUser(u, userId)) ||
      (matchesTargetUser(user, userId) ? user : undefined);
    const resolvedId = target?.id || userId;
    const nextBanned = target ? !target.isBanned : true;
    const nextReason = nextBanned ? (reason || 'Violation of Platform Fair Play Rules') : '';

    setAllUsers((prevUsers) =>
      prevUsers.map((u) =>
        matchesTargetUser(u, resolvedId, target?.phone)
          ? { ...u, isBanned: nextBanned, banReason: nextReason, updatedAt: mutationTs }
          : u
      )
    );

    if (matchesTargetUser(user, resolvedId, target?.phone)) {
      setUser((u) => ({ ...u, isBanned: nextBanned, banReason: nextReason, updatedAt: mutationTs }));
    }

    updateUserInFirebase(
      resolvedId,
      { isBanned: nextBanned, banReason: nextReason, updatedAt: mutationTs },
      target ? { ...target, isBanned: nextBanned, banReason: nextReason, updatedAt: mutationTs } : undefined
    ).catch(() => {});

    fetch(apiUrl('/api/users/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: resolvedId,
        userPhone: target?.phone,
        fallbackUser: target,
        patch: { isBanned: nextBanned, banReason: nextReason, updatedAt: mutationTs }
      })
    }).catch(() => {});

    showToast(nextBanned ? 'User banned successfully!' : 'User unbanned successfully!');
  };

  const adminModifyUserBalance = (
    userId: string,
    action: 'add' | 'deduct' | 'set',
    amount: number,
    reason?: string,
    opts?: { locked?: boolean; turnover?: number }
  ) => {
    const numAmt = Number(amount) || 0;
    if (numAmt < 0) return { success: false, message: 'Amount cannot be negative' };

    const target =
      allUsers.find((u) => matchesTargetUser(u, userId)) ||
      (matchesTargetUser(user, userId) ? user : null);
    if (!target) return { success: false, message: 'User not found' };

    const resolvedId = target.id || userId;
    const mutationTs = Date.now();
    lastUsersMutationAtRef.current = mutationTs + 2000;

    const curBal = Number(target.balance || 0);
    const curLocked = Number(target.lockedBalance || 0);
    let nextBal = curBal;
    let nextLocked = curLocked;
    if (action === 'add') {
      nextBal = +(curBal + numAmt).toFixed(2);
      if (opts?.locked) {
        nextLocked = +(curLocked + numAmt).toFixed(2);
      }
    } else if (action === 'deduct') {
      nextBal = +Math.max(0, curBal - numAmt).toFixed(2);
      nextLocked = Math.min(curLocked, nextBal);
    } else if (action === 'set') {
      nextBal = +Math.max(0, numAmt).toFixed(2);
      nextLocked = opts?.locked ? nextBal : Math.min(curLocked, nextBal);
    }

    const extraTurnover = Math.max(0, Number(opts?.turnover || 0));
    const nextTurnover = +((target.turnoverRequired || 0) + extraTurnover).toFixed(2);

    setAllUsers((prev) =>
      prev.map((u) =>
        matchesTargetUser(u, resolvedId, target.phone)
          ? { ...u, balance: nextBal, lockedBalance: nextLocked, turnoverRequired: nextTurnover, updatedAt: mutationTs }
          : u
      )
    );
    if (matchesTargetUser(user, resolvedId, target.phone)) {
      setUser((u) => ({ ...u, balance: nextBal, lockedBalance: nextLocked, turnoverRequired: nextTurnover, updatedAt: mutationTs }));
    }

    updateUserInFirebase(
      resolvedId,
      { balance: nextBal, lockedBalance: nextLocked, turnoverRequired: nextTurnover, updatedAt: mutationTs },
      { ...target, balance: nextBal, lockedBalance: nextLocked, turnoverRequired: nextTurnover, updatedAt: mutationTs }
    ).catch(() => {});

    fetch(apiUrl('/api/users/modify-balance'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: resolvedId,
        userPhone: target.phone,
        fallbackUser: { ...target, lockedBalance: nextLocked, turnoverRequired: nextTurnover, updatedAt: mutationTs },
        action,
        amount: numAmt,
        lockedBalance: nextLocked,
        locked: Boolean(opts?.locked),
        turnoverDelta: extraTurnover
      })
    }).catch(() => {});

    const delta = +(nextBal - curBal).toFixed(2);
    const admTx: Transaction = {
      id: `tx_${Date.now()}_adm`,
      userId: resolvedId,
      type: 'admin_adjust',
      title: `Admin ${action.toUpperCase()} Balance${opts?.locked ? ' (On Hold)' : ''}`,
      detail: `${reason?.trim() || 'Balance updated by Super Controller'}${extraTurnover > 0 ? ` • +৳${extraTurnover} Turnover` : ''}`,
      amount: delta,
      balanceAfter: nextBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [admTx, ...prev]);
    saveTransactionToFirebase(admTx).catch(() => {});

    showToast(`Updated ${target.nickname} balance to ৳${nextBal.toFixed(2)}${opts?.locked ? ' (On Hold)' : ''}`);
    return { success: true, message: 'Balance updated' };
  };

  const holdUserBalance = (userId: string, amount?: number, reason?: string) => {
    const target =
      allUsers.find((u) => matchesTargetUser(u, userId)) ||
      (matchesTargetUser(user, userId) ? user : null);
    if (!target) return { success: false, message: 'User not found' };

    const curBal = Math.max(0, Number(target.balance || 0));
    const curLocked = Math.max(0, Number(target.lockedBalance || 0));
    const availableToHold = Math.max(0, +(curBal - curLocked).toFixed(2));
    const requested = amount !== undefined && !isNaN(amount) && amount > 0 ? Number(amount) : curBal;
    const nextLocked = +Math.min(curBal, Math.max(curLocked, amount !== undefined && amount > 0 ? curLocked + requested : curBal)).toFixed(2);

    if (curBal <= 0 || availableToHold <= 0) {
      showToast('No unlocked balance available to hold');
      return { success: false, message: 'No unlocked balance available to hold' };
    }

    const resolvedId = target.id || userId;
    const mutationTs = Date.now();
    lastUsersMutationAtRef.current = mutationTs + 2000;

    setAllUsers((prev) =>
      prev.map((u) =>
        matchesTargetUser(u, resolvedId, target.phone)
          ? { ...u, lockedBalance: nextLocked, updatedAt: mutationTs }
          : u
      )
    );
    if (matchesTargetUser(user, resolvedId, target.phone)) {
      setUser((u) => ({ ...u, lockedBalance: nextLocked, updatedAt: mutationTs }));
    }

    updateUserInFirebase(
      resolvedId,
      { lockedBalance: nextLocked, updatedAt: mutationTs },
      { ...target, lockedBalance: nextLocked, updatedAt: mutationTs }
    ).catch(() => {});

    fetch(apiUrl('/api/users/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: resolvedId,
        userPhone: target.phone,
        fallbackUser: { ...target, lockedBalance: nextLocked, updatedAt: mutationTs },
        patch: { lockedBalance: nextLocked, updatedAt: mutationTs }
      })
    }).catch(() => {});

    const holdTx: Transaction = {
      id: `tx_${mutationTs}_hold`,
      userId: resolvedId,
      type: 'admin_hold',
      title: 'Balance Placed On Hold by Admin',
      detail: reason?.trim() || `৳${nextLocked.toFixed(2)} placed on Hold (Play & Withdraw blocked until Admin releases)`,
      amount: 0,
      balanceAfter: curBal,
      time: new Date().toLocaleString(),
      status: 'pending'
    };
    setTransactions((prev) => [holdTx, ...prev]);
    saveTransactionToFirebase(holdTx).catch(() => {});

    showToast(`৳${nextLocked.toFixed(2)} placed on Hold for ${target.nickname} (Play & Withdraw blocked)`);
    return { success: true, message: 'Balance placed on hold' };
  };

  const releaseLockedBalance = (userId: string, amount?: number) => {
    const mutationTs = Date.now();
    const target =
      allUsers.find((u) => matchesTargetUser(u, userId)) ||
      (matchesTargetUser(user, userId) ? user : undefined);
    const resolvedId = target?.id || userId;
    const curLocked = Math.max(0, Number(target?.lockedBalance || 0));
    if (curLocked <= 0) {
      showToast('No Hold balance remaining to release.');
      return { success: false, message: 'No Hold balance remaining' };
    }
    let releasedAmt = curLocked;
    if (amount !== undefined) {
      const reqAmt = +(Number(amount) || 0).toFixed(2);
      if (reqAmt <= 0) {
        showToast('Enter a valid release amount greater than ৳0');
        return { success: false, message: 'Invalid release amount' };
      }
      releasedAmt = Math.min(curLocked, reqAmt);
    }
    const nextLocked = Math.max(0, +(curLocked - releasedAmt).toFixed(2));
    lastUsersMutationAtRef.current = mutationTs + 2000;
    setAllUsers((prev) =>
      prev.map((u) =>
        matchesTargetUser(u, resolvedId, target?.phone)
          ? { ...u, lockedBalance: nextLocked, updatedAt: mutationTs }
          : u
      )
    );
    if (matchesTargetUser(user, resolvedId, target?.phone)) {
      setUser((u) => ({ ...u, lockedBalance: nextLocked, updatedAt: mutationTs }));
    }
    updateUserInFirebase(
      resolvedId,
      { lockedBalance: nextLocked, updatedAt: mutationTs },
      target ? { ...target, lockedBalance: nextLocked, updatedAt: mutationTs } : undefined
    ).catch(() => {});
    fetch(apiUrl('/api/users/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: resolvedId,
        userPhone: target?.phone,
        fallbackUser: target ? { ...target, lockedBalance: nextLocked, updatedAt: mutationTs } : undefined,
        patch: { lockedBalance: nextLocked, updatedAt: mutationTs }
      })
    }).catch(() => {});

    const relTx: Transaction = {
      id: `tx_${mutationTs}_rel`,
      userId: resolvedId,
      type: 'admin_release',
      title: 'Admin Released Hold Balance',
      detail:
        nextLocked > 0
          ? `৳${releasedAmt.toFixed(2)} released by Admin (Remaining Hold: ৳${nextLocked.toFixed(2)}) — Play & Withdraw unlocked for released balance`
          : `৳${releasedAmt.toFixed(2)} released — Game Play & Withdraw unlocked`,
      amount: 0,
      balanceAfter: Number(target?.balance || 0),
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [relTx, ...prev]);
    saveTransactionToFirebase(relTx).catch(() => {});
    showToast(
      nextLocked > 0
        ? `Released ৳${releasedAmt.toFixed(2)}! Remaining Hold: ৳${nextLocked.toFixed(2)}`
        : `Full Hold ৳${releasedAmt.toFixed(2)} released! User can now play games & withdraw.`
    );
    return { success: true, message: 'Hold released' };
  };

  const adminUpdateUserRole = (userId: string, role: 'USER' | 'VIP' | 'ADMIN') => {
    const mutationTs = Date.now();
    lastUsersMutationAtRef.current = mutationTs + 2000;
    const target =
      allUsers.find((u) => matchesTargetUser(u, userId)) ||
      (matchesTargetUser(user, userId) ? user : undefined);
    const resolvedId = target?.id || userId;
    setAllUsers((prev) =>
      prev.map((u) =>
        matchesTargetUser(u, resolvedId, target?.phone) ? { ...u, role, updatedAt: mutationTs } : u
      )
    );
    if (matchesTargetUser(user, resolvedId, target?.phone)) {
      setUser((u) => ({ ...u, role, updatedAt: mutationTs }));
    }
    updateUserInFirebase(
      resolvedId,
      { role, updatedAt: mutationTs },
      target ? { ...target, role, updatedAt: mutationTs } : undefined
    ).catch(() => {});
    fetch(apiUrl('/api/users/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: resolvedId,
        userPhone: target?.phone,
        fallbackUser: target,
        patch: { role, updatedAt: mutationTs }
      })
    }).catch(() => {});
    showToast(`Role updated to ${role}`);
  };

  const adminDeleteUser = (userId: string) => {
    lastUsersMutationAtRef.current = Date.now() + 2000;
    deletedUserIdsRef.current.add(userId);
    setAllUsers((prev) => prev.filter((u) => u.id !== userId && u.uid !== userId));
    deleteUserFromFirebase(userId).catch(() => {});
    fetch(apiUrl('/api/users/update'), {
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
    saveNotificationToFirebase(entry).catch(() => {});
    showToast('Personal notice sent to user!');
  };

  const updateWithdrawStatus = (
    id: string,
    status: 'processing' | 'completed' | 'rejected',
    note?: string,
    turnoverPenalty?: number,
    meta?: { payoutTrxId?: string; userMessage?: string; rejectionReason?: string; ewiPayWithdrawId?: string }
  ) => {
    const target = withdrawRequestsRef.current.find((w) => w.id === id);
    if (!target) return;
    const prevStatus = target.status;
    if (
      prevStatus === status &&
      (status !== 'rejected' || !note) &&
      !meta?.payoutTrxId &&
      !meta?.ewiPayWithdrawId
    ) {
      return;
    }

    const mutationTs = Date.now();
    lastWithdrawsMutationAtRef.current = mutationTs;
    lastUsersMutationAtRef.current = mutationTs + 2000;

    const resolvedRejectionReason =
      status === 'rejected'
        ? (meta?.rejectionReason?.trim() || note?.trim() || target.rejectionReason || target.adminNote || '')
        : target.rejectionReason;
    const resolvedUserMessage =
      status === 'rejected'
        ? (meta?.userMessage?.trim() || target.userMessage || 'কিছুক্ষণ পর আবার চেষ্টা করুন')
        : target.userMessage;
    const resolvedNote =
      status === 'rejected'
        ? (note?.trim() || resolvedRejectionReason || target.adminNote || resolvedUserMessage)
        : target.adminNote;
    const resolvedPayoutTrxId = meta?.payoutTrxId?.trim() || target.payoutTrxId;
    const resolvedEwiId = meta?.ewiPayWithdrawId?.trim() || target.ewiPayWithdrawId;

    const updatedWd: WithdrawRequest = {
      ...target,
      status,
      ...(resolvedEwiId ? { ewiPayWithdrawId: resolvedEwiId } : {}),
      ...(resolvedPayoutTrxId ? { payoutTrxId: resolvedPayoutTrxId } : {}),
      ...(resolvedNote ? { adminNote: resolvedNote } : {}),
      ...(status === 'rejected' && resolvedUserMessage ? { userMessage: resolvedUserMessage } : {}),
      ...(status === 'rejected' && resolvedRejectionReason ? { rejectionReason: resolvedRejectionReason } : {})
    };
    setWithdrawRequests((prev) => prev.map((w) => (w.id === id ? updatedWd : w)));
    updateWithdrawInFirebase(
      id,
      {
        status,
        ...(resolvedEwiId ? { ewiPayWithdrawId: resolvedEwiId } : {}),
        ...(resolvedPayoutTrxId ? { payoutTrxId: resolvedPayoutTrxId } : {}),
        ...(resolvedNote ? { adminNote: resolvedNote } : {}),
        ...(status === 'rejected' && resolvedUserMessage ? { userMessage: resolvedUserMessage } : {}),
        ...(status === 'rejected' && resolvedRejectionReason ? { rejectionReason: resolvedRejectionReason } : {})
      },
      updatedWd
    ).catch(() => {});

    // Dispatch live EWI-Pay withdrawal payout when Admin marks Processing and it hasn't been dispatched yet
    if (status === 'processing' && !resolvedEwiId) {
      const targetUserObj = allUsersRef.current.find((u) => matchesTargetUser(u, target.userId, target.userPhone));
      const siteUserId = targetUserObj?.uid || target.userId;
      const orderId = target.orderId || target.id;
      fetch(apiUrl('/api/ewi-pay/withdraw'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUserId,
          user_id: siteUserId,
          userId: target.userId,
          orderId,
          recipientNumber: target.number,
          accountNumber: target.number,
          number: target.number,
          provider: String(target.method || '').toLowerCase(),
          method: target.method,
          amount: target.amount,
          callbackUrl: `${window.location.origin}/api/ewi-pay/webhook`,
          autoDispatch: true
        })
      })
        .then((r) =>
          (r.headers.get('content-type') || '').includes('application/json')
            ? r.json().catch(() => null)
            : null
        )
        .then((gwData) => {
          const gwId = String(
            gwData?.withdrawalId ||
              gwData?.gateway?.withdrawalId ||
              gwData?.gateway?.withdrawal_id ||
              gwData?.gateway?.id ||
              gwData?.gateway?.withdrawal?.id ||
              gwData?.gateway?.data?.withdrawalId ||
              gwData?.gateway?.data?.withdrawal_id ||
              gwData?.gateway?.data?.id ||
              ''
          ).trim();
          if (gwId) {
            setWithdrawRequests((prev) =>
              prev.map((w) => (w.id === id ? { ...w, ewiPayWithdrawId: gwId } : w))
            );
            updateWithdrawInFirebase(id, { ewiPayWithdrawId: gwId }, { ...updatedWd, ewiPayWithdrawId: gwId }).catch(() => {});
            fetch(apiUrl('/api/withdraws/update'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, status: 'processing', ewiPayWithdrawId: gwId })
            }).catch(() => {});
            showToast(`Sent to EWI PAY (${gwId}) — auto-syncing completion`);
          } else {
            const errMsg = String(
              gwData?.gateway?.message || gwData?.gateway?.error || gwData?.message || ''
            ).trim();
            showToast(errMsg ? `Processing (Gateway: ${errMsg})` : 'Moved to Processing');
          }
        })
        .catch(() => {
          showToast('Moved to Processing (EWI PAY request queued)');
        });
    }

    if (status === 'completed' && prevStatus !== 'completed') {
      setAllUsers((prev) =>
        prev.map((u) => {
          if (matchesTargetUser(u, target.userId, target.userPhone)) {
            const nextTot = +(Number(u.totalWithdrawn || 0) + target.amount).toFixed(2);
            return syncUserEverywhere({ ...u, totalWithdrawn: nextTot }, mutationTs);
          }
          return u;
        })
      );
      if (matchesTargetUser(userRef.current, target.userId, target.userPhone)) {
        setUser((u) =>
          syncUserEverywhere(
            {
              ...u,
              totalWithdrawn: +(Number(u.totalWithdrawn || 0) + target.amount).toFixed(2)
            },
            mutationTs
          )
        );
      }
      setTransactions((prev) =>
        prev.map((t) =>
          t.trxId === target.id || (t.type === 'withdraw' && t.detail?.includes(target.id))
            ? {
                ...t,
                status: 'success' as const,
                detail: `Completed to ${target.method} (${target.number})${
                  resolvedPayoutTrxId ? ` • TrxID: ${resolvedPayoutTrxId}` : ''
                }`
              }
            : t
        )
      );
    } else if (status === 'rejected' && prevStatus !== 'rejected' && prevStatus !== 'completed') {
      let refundedBalance = target.amount;
      const penaltyAmt = Math.max(0, Number(turnoverPenalty || 0));
      setAllUsers((prev) =>
        prev.map((u) => {
          if (matchesTargetUser(u, target.userId, target.userPhone)) {
            const nextBal = +(Number(u.balance || 0) + target.amount).toFixed(2);
            const nextTr = +((u.turnoverRequired || 0) + penaltyAmt).toFixed(2);
            refundedBalance = nextBal;
            return syncUserEverywhere({ ...u, balance: nextBal, turnoverRequired: nextTr }, mutationTs);
          }
          return u;
        })
      );
      if (matchesTargetUser(userRef.current, target.userId, target.userPhone)) {
        const nextBal = +(Number(userRef.current.balance || 0) + target.amount).toFixed(2);
        const nextTr = +((userRef.current.turnoverRequired || 0) + penaltyAmt).toFixed(2);
        refundedBalance = nextBal;
        setUser((u) => syncUserEverywhere({ ...u, balance: nextBal, turnoverRequired: nextTr }, mutationTs));
      }
      const refundTx: Transaction = {
        id: `tx_${Date.now()}_wdr`,
        userId: target.userId,
        type: 'withdraw_refund',
        title: `Withdraw Rejected & Refunded (${target.method})`,
        detail: `${resolvedNote}${penaltyAmt > 0 ? ` • +৳${penaltyAmt} Turnover Added` : ''}`,
        amount: target.amount,
        balanceAfter: refundedBalance,
        time: new Date().toLocaleString(),
        status: 'success',
        method: target.method,
        trxId: target.id
      };
      const newTxs: Transaction[] = [refundTx];
      if (penaltyAmt > 0) {
        const pTx: Transaction = {
          id: `tx_${Date.now()}_wdtp`,
          userId: target.userId,
          type: 'turnover_penalty',
          title: 'Withdrawal Rejection Turnover',
          detail: `${resolvedNote} • +৳${penaltyAmt} Turnover added`,
          amount: 0,
          balanceAfter: refundedBalance,
          time: new Date().toLocaleString(),
          status: 'success'
        };
        newTxs.push(pTx);
        saveTransactionToFirebase(pTx).catch(() => {});
      }
      setTransactions((prev) => [
        ...newTxs,
        ...prev.map((t) =>
          t.trxId === target.id || (t.type === 'withdraw' && t.detail?.includes(target.id))
            ? { ...t, status: 'rejected' as const, detail: resolvedNote }
            : t
        )
      ]);
      saveTransactionToFirebase(refundTx).catch(() => {});
      const rejNotif: AppNotification = {
        id: `notif_${Date.now()}_wdr`,
        userId: target.userId,
        title: `Withdrawal ৳${target.amount} Rejected & Refunded`,
        message: `৳${target.amount.toFixed(2)} has been refunded to your wallet.${penaltyAmt > 0 ? ` +৳${penaltyAmt} turnover applied.` : ''}`,
        reason: resolvedUserMessage || resolvedNote,
        type: 'system',
        read: false,
        time: new Date().toLocaleString()
      };
      setNotifications((prev) => [rejNotif, ...prev].slice(0, 50));
      saveNotificationToFirebase(rejNotif).catch(() => {});
    }

    fetch(apiUrl('/api/withdraws/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        status,
        ...(resolvedEwiId ? { ewiPayWithdrawId: resolvedEwiId } : {}),
        ...(resolvedPayoutTrxId ? { payoutTrxId: resolvedPayoutTrxId } : {}),
        ...(resolvedNote ? { adminNote: resolvedNote } : {}),
        ...(status === 'rejected' && resolvedUserMessage ? { userMessage: resolvedUserMessage } : {}),
        ...(status === 'rejected' && resolvedRejectionReason ? { rejectionReason: resolvedRejectionReason } : {})
      })
    }).catch(() => {});

    showToast(status === 'completed' ? 'Withdrawal marked as Completed' : `Withdrawal marked as ${status.toUpperCase()}`);
  };
  updateWithdrawStatusRef.current = updateWithdrawStatus;

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

  // Global IP Ban & Security Status Polling
  useEffect(() => {
    let active = true;
    const pollSecurity = async () => {
      try {
        const res = await fetch(apiUrl('/api/security/status'), { cache: 'no-store' }).catch(() => null);
        const ct = res?.headers.get('content-type') || '';
        if (res && res.ok && ct.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (!active || !data) return;
          const ip = String(data.ip || '').trim();
          const bannedList = Array.isArray(adminSettingsRef.current.bannedIps)
            ? adminSettingsRef.current.bannedIps
            : [];
          const isBanned = Boolean(data.isBannedIp) || (ip !== '' && bannedList.includes(ip));
          setVisitorIpInfo({
            ip,
            deviceName: String(data.deviceName || getClientDeviceName()),
            isBannedIp: isBanned
          });
        }
      } catch {}
    };
    pollSecurity();
    const iv = setInterval(pollSecurity, 15000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    if (!visitorIpInfo.ip) return;
    const isBannedNow = Boolean(
      Array.isArray(adminSettings.bannedIps) && adminSettings.bannedIps.includes(visitorIpInfo.ip)
    );
    setVisitorIpInfo((prev) => (prev.isBannedIp === isBannedNow ? prev : { ...prev, isBannedIp: isBannedNow }));
  }, [adminSettings.bannedIps, visitorIpInfo.ip]);

  const banIpGlobally = async (ip: string) => {
    const clean = String(ip || '').trim();
    if (!clean) return;
    const cur = Array.isArray(adminSettingsRef.current.bannedIps) ? adminSettingsRef.current.bannedIps : [];
    const next = cur.includes(clean) ? cur : [...cur, clean];
    updateAdminSettings({ bannedIps: next });
    await fetch(apiUrl('/api/security/ban-ip'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: clean, action: 'ban' })
    }).catch(() => {});
    showToast(`Banned IP ${clean} globally`);
  };

  const unbanIpGlobally = async (ip: string) => {
    const clean = String(ip || '').trim();
    if (!clean) return;
    const cur = Array.isArray(adminSettingsRef.current.bannedIps) ? adminSettingsRef.current.bannedIps : [];
    const next = cur.filter((x) => x !== clean);
    updateAdminSettings({ bannedIps: next });
    await fetch(apiUrl('/api/security/ban-ip'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: clean, action: 'unban' })
    }).catch(() => {});
    showToast(`Unbanned IP ${clean}`);
  };

  const kickAdminSession = async () => {
    updateAdminSettings({ activeAdminSession: null });
    await fetch(apiUrl('/api/admin/sessions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'kick' })
    }).catch(() => {});
    showToast('Active admin session cleared!');
  };

  const placeLudoBet = (stake: number, mode: 'online_2p' | 'online_4p' | LudoRoomMode) => {
    if (!user.isLoggedIn || !user.id) {
      showToast('Please log in first to play Deshi Ludo');
      return { success: false, message: 'Login required' };
    }
    if (user.isBanned) {
      showToast('Your account is banned by Administrator!');
      return { success: false, message: 'Account banned' };
    }
    const cleanStake = +Number(stake || 0).toFixed(2);
    if (cleanStake < 20 || cleanStake > 50000 || isNaN(cleanStake)) {
      return { success: false, message: 'Stake must be between ৳20 and ৳50,000' };
    }
    const playableBal = Math.max(0, +(Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2));
    if (playableBal < cleanStake) {
      showToast(Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered until released!' : 'Insufficient wallet balance!');
      return { success: false, message: Number(user.lockedBalance || 0) > 0 ? 'Holding balance cannot be wagered' : 'Insufficient balance' };
    }

    const newBal = +(user.balance - cleanStake).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + cleanStake,
      turnoverCompleted: (user.turnoverCompleted || 0) + cleanStake
    });
    setUser(updatedUser);

    const tx: Transaction = {
      id: `tx_${Date.now()}_ldb`,
      userId: user.id,
      type: 'ludo_bet',
      title: `Deshi Ludo Entry (${mode.replace('_', ' ').toUpperCase()})`,
      detail: `Match stake ৳${cleanStake.toFixed(0)}`,
      amount: -cleanStake,
      balanceAfter: newBal,
      time: new Date().toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});
    return { success: true, message: 'Ludo match started' };
  };

  const settleLudoMatch = (
    winAmount: number,
    mode: 'online_2p' | 'online_4p' | LudoRoomMode,
    detail: string,
    stake: number,
    isRefund: boolean = false
  ) => {
    const cleanWin = +Math.max(0, Number(winAmount || 0)).toFixed(2);
    if (!isRefund) {
      const rec: LudoBetRecord = {
        id: `ld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: userRef.current.id || 'guest',
        mode,
        stake,
        winAmount: cleanWin,
        status: cleanWin > 0 ? 'won' : 'lost',
        time: new Date().toLocaleTimeString('en-US', { hour12: false })
      };
      setLudoBets((prev) => {
        const next = [rec, ...prev].slice(0, 40);
        safeLocalStorageSet('ewi777_ludo_bets', JSON.stringify(next));
        return next;
      });
    }

    if (cleanWin > 0 && userRef.current.id) {
      const nextBal = +(Number(userRef.current.balance || 0) + cleanWin).toFixed(2);
      const updatedUser = syncUserEverywhere({
        ...userRef.current,
        balance: nextBal,
        turnoverCompleted: isRefund
          ? userRef.current.turnoverCompleted || 0
          : (userRef.current.turnoverCompleted || 0) + cleanWin
      });
      setUser(updatedUser);

      const tx: Transaction = {
        id: `tx_${Date.now()}_ldw`,
        userId: userRef.current.id,
        type: 'ludo_win',
        title: isRefund ? `Deshi Ludo Room Refund (90%)` : `Deshi Ludo Prize Won!`,
        detail: `${detail} • +৳${cleanWin.toFixed(2)}`,
        amount: cleanWin,
        balanceAfter: nextBal,
        time: new Date().toLocaleString(),
        status: 'success'
      };
      setTransactions((prev) => [tx, ...prev]);
      saveTransactionToFirebase(tx).catch(() => {});
      if (isRefund) {
        showToast(`Ludo Refund Credited +৳${cleanWin.toFixed(2)} (90% of ৳${stake})`);
      } else {
        confetti({ particleCount: 75, spread: 65 });
        showToast(`Deshi Ludo Won +৳${cleanWin.toFixed(2)}!`);
      }
    }
  };

  const sportsMatches: SportsMatch[] =
    Array.isArray(adminSettings.sportsMatches) && adminSettings.sportsMatches.length > 0
      ? adminSettings.sportsMatches
      : INITIAL_ADMIN_SETTINGS.sportsMatches || [];

  // Automatic Sports Team Bet Settlement whenever Admin marks a match winner
  useEffect(() => {
    const uidNow = userRef.current?.id;
    if (!uidNow || !sportsBets.length || !sportsMatches.length) return;
    const matchMap = new Map<string, SportsMatch>(sportsMatches.map((m) => [m.id, m]));
    let totalCredit = 0;
    const newlySettled: SportsBet[] = [];
    const wonSummaries: string[] = [];

    const nextList = sportsBets.map((bet) => {
      if (bet.userId !== uidNow || bet.status !== 'pending') return bet;
      if (settledSportsBetIdsRef.current.has(bet.id)) return bet;
      const m = matchMap.get(bet.matchId);
      if (!m || m.status !== 'finished' || (m.winner !== 'teamA' && m.winner !== 'teamB')) return bet;

      settledSportsBetIdsRef.current.add(bet.id);
      const isWinner = bet.selectedTeam === m.winner;
      const winAmount = isWinner ? +((Number(bet.amount) || 0) * (Number(bet.odds) || 1.9)).toFixed(2) : 0;
      const updatedBet: SportsBet = {
        ...bet,
        status: isWinner ? 'won' : 'lost',
        winAmount
      };
      newlySettled.push(updatedBet);
      if (isWinner && winAmount > 0) {
        totalCredit = +(totalCredit + winAmount).toFixed(2);
        wonSummaries.push(`${bet.teamName} (+৳${winAmount.toFixed(2)})`);
      }
      return updatedBet;
    });

    if (newlySettled.length === 0) return;

    setSportsBets(nextList);
    safeLocalStorageSet('ewi777_sports_bets', JSON.stringify(nextList));
    newlySettled.forEach((sb) => saveSportsBetToFirebase(sb).catch(() => {}));

    if (totalCredit > 0) {
      const nextBal = +(Number(userRef.current.balance || 0) + totalCredit).toFixed(2);
      const updatedUser = syncUserEverywhere({
        ...userRef.current,
        balance: nextBal,
        turnoverCompleted: (userRef.current.turnoverCompleted || 0) + totalCredit
      });
      setUser(updatedUser);

      const tx: Transaction = {
        id: `tx_${Date.now()}_spw`,
        userId: uidNow,
        type: 'sports_win',
        title: 'Live Sports Team Win!',
        detail: `${wonSummaries.join(', ')} • Auto Credited`,
        amount: totalCredit,
        balanceAfter: nextBal,
        time: new Date().toLocaleString(),
        status: 'success'
      };
      setTransactions((prev) => [tx, ...prev]);
      saveTransactionToFirebase(tx).catch(() => {});
      confetti({ particleCount: 85, spread: 70 });
      showToast(`Sports Win Auto Credited +৳${totalCredit.toFixed(2)}!`);
    }
  }, [sportsMatches, sportsBets, user.id]);

  const placeSportsBet = async (
    matchId: string,
    selectedTeam: 'teamA' | 'teamB',
    amount: number
  ): Promise<{ success: boolean; message: string }> => {
    if (!user.isLoggedIn || !user.id) {
      return { success: false, message: 'Please log in first to place a sports bet.' };
    }
    const cleanAmt = +Number(amount || 0).toFixed(2);
    if (cleanAmt < 10 || cleanAmt > 50000) {
      return { success: false, message: 'Bet amount must be between ৳10 and ৳50,000.' };
    }
    const lockedAmt = Math.max(0, Number(user.lockedBalance || 0));
    const playable = Math.max(0, +(Number(user.balance || 0) - lockedAmt).toFixed(2));
    if (playable < cleanAmt) {
      return {
        success: false,
        message: lockedAmt > 0
          ? 'Holding balance cannot be wagered until released by Admin!'
          : 'Insufficient playable balance.'
      };
    }
    const match = sportsMatches.find((m) => m.id === matchId);
    if (!match) {
      return { success: false, message: 'Match not found.' };
    }
    if (match.status === 'finished') {
      return { success: false, message: 'Betting is closed — match already finished.' };
    }
    const odds = selectedTeam === 'teamA' ? Number(match.teamAOdds) : Number(match.teamBOdds);
    const teamName = selectedTeam === 'teamA' ? match.teamA : match.teamB;
    const nowMs = Date.now();
    const newBal = +(Number(user.balance || 0) - cleanAmt).toFixed(2);
    const updatedUser = syncUserEverywhere({
      ...user,
      balance: newBal,
      exp: user.exp + cleanAmt,
      turnoverCompleted: (user.turnoverCompleted || 0) + cleanAmt
    });
    setUser(updatedUser);

    const bet: SportsBet = {
      id: `sb_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      matchId: match.id,
      sport: match.sport,
      matchTitle: `${match.teamA} vs ${match.teamB}`,
      selectedTeam,
      teamName,
      odds: +odds.toFixed(2),
      amount: cleanAmt,
      potentialWin: +(cleanAmt * odds).toFixed(2),
      status: 'pending',
      time: new Date(nowMs).toLocaleTimeString('en-US', { hour12: false }),
      createdAtMs: nowMs
    };

    setSportsBets((prev) => {
      const next = [bet, ...prev].slice(0, 150);
      safeLocalStorageSet('ewi777_sports_bets', JSON.stringify(next));
      return next;
    });

    const tx: Transaction = {
      id: `tx_${nowMs}_spb`,
      userId: user.id,
      type: 'sports_bet',
      title: `${match.sport === 'cricket' ? 'Cricket' : 'Football'}: ${teamName}`,
      detail: `${match.teamA} vs ${match.teamB} @ ${odds.toFixed(2)}x`,
      amount: -cleanAmt,
      balanceAfter: newBal,
      time: new Date(nowMs).toLocaleString(),
      status: 'success'
    };
    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirebase(tx).catch(() => {});
    saveSportsBetToFirebase(bet).catch(() => {});

    fetch(apiUrl('/api/sports/bet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bet)
    }).catch(() => {});

    return { success: true, message: `Bet placed on ${teamName} @ ${odds.toFixed(2)}x!` };
  };

  const upsertSportsMatch = async (
    matchInput: Partial<SportsMatch> & { sport: 'cricket' | 'football'; teamA: string; teamB: string }
  ): Promise<void> => {
    const nowMs = Date.now();
    const cleanMatch: SportsMatch = {
      id: String(matchInput.id || `sp_${nowMs}_${Math.random().toString(36).slice(2, 6)}`),
      sport: matchInput.sport === 'football' ? 'football' : 'cricket',
      league: String(matchInput.league || (matchInput.sport === 'football' ? 'Live Football' : 'Live Cricket')).trim(),
      teamA: String(matchInput.teamA).trim(),
      teamB: String(matchInput.teamB).trim(),
      teamAOdds: Math.max(1.05, Number(matchInput.teamAOdds) || 1.85),
      teamBOdds: Math.max(1.05, Number(matchInput.teamBOdds) || 1.95),
      scoreA: String(matchInput.scoreA || ''),
      scoreB: String(matchInput.scoreB || ''),
      statusText: String(matchInput.statusText || 'Live Match'),
      status: matchInput.status === 'finished' ? 'finished' : matchInput.status === 'upcoming' ? 'upcoming' : 'live',
      ...(matchInput.winner === 'teamA' || matchInput.winner === 'teamB' ? { winner: matchInput.winner } : {}),
      startTime: String(matchInput.startTime || 'Live Now'),
      updatedAt: nowMs
    };
    const existing = sportsMatches;
    const idx = existing.findIndex((m) => m.id === cleanMatch.id);
    const nextMatches = idx >= 0 ? existing.map((m, i) => (i === idx ? cleanMatch : m)) : [cleanMatch, ...existing];
    updateAdminSettings({ sportsMatches: nextMatches });
    fetch(apiUrl('/api/sports/upsert-match'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match: cleanMatch })
    }).catch(() => {});
  };

  const settleSportsMatch = async (matchId: string, winner: 'teamA' | 'teamB'): Promise<void> => {
    const nowMs = Date.now();
    const nextMatches = sportsMatches.map((m) => {
      if (m.id !== matchId) return m;
      const winTeam = winner === 'teamA' ? m.teamA : m.teamB;
      return { ...m, status: 'finished' as const, winner, statusText: `${winTeam} Won`, updatedAt: nowMs };
    });
    updateAdminSettings({ sportsMatches: nextMatches });
    fetch(apiUrl('/api/sports/settle'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, winner })
    }).catch(() => {});
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
        globalLotteryBets,
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
        theme,
        setTheme,
        toggleTheme,
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
        ewiWingoBets,
        placeEwiWingoBet,
        settleEwiWingoRound,
        popLotteryQueue,
        setActiveTab,
        goBack,
        setLanguage,
        showToast,
        login,
        register,
        logout,
        adminLogin,
        verifyAdmin2FA,
        adminLogout,
        visitorIpInfo,
        banIpGlobally,
        unbanIpGlobally,
        kickAdminSession,
        ludoBets,
        placeLudoBet,
        settleLudoMatch,
        sportsMatches,
        sportsBets,
        placeSportsBet,
        upsertSportsMatch,
        settleSportsMatch,
        adminAccessLogs,
        logAdminAccessEntry,
        heartbeatAdminAccess,
        updateAdminSettings,
        updateNickname,
        changeLoginPassword,
        updateUserAvatar,
        bindWallet,
        bindUsdtAddress,
        submitDepositRequest,
        initiateEwiPayDeposit,
        syncEwiPayTransactions,
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
        crashPoolStates,
        placeCrashBet,
        cancelCrashBet,
        cashOutCrashBet,
        claimWinGoStreakBonus,
        claimWinGoSixStepRefund,
        placeMinesBet,
        cashOutMinesWin,
        incrementMinesRoundSeq,
        coinFlipBets,
        placeCoinFlipBet,
        settleCoinFlipRound,
        marketPools,
        recordMarketPoolBet,
        claimAgentSalary,
        claimActivityAward,
        getInviteLink,
        copyInviteLink,
        copyInviteCode,
        setUserTurnover,
        toggleUserBan,
        adminModifyUserBalance,
        holdUserBalance,
        releaseLockedBalance,
        adminUpdateUserRole,
        adminDeleteUser,
        adminSendUserNotice,
        updateWithdrawStatus,
        sendBroadcastNotice,
        deleteBroadcastNotice,
        requestPasswordRecovery,
        banNotice,
        clearBanNotice,
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
