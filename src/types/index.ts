export type Language = 'en' | 'bn';

export type WinGoMode = '30s' | '1m' | '3m' | '5m';
export type EwiWingoMode = '15s' | '30s' | '1m' | '3m';

export interface User {
  id: string;
  uid: string;
  phone?: string;
  email?: string;
  nickname: string;
  avatar: string;
  balance: number;
  safeBalance: number;
  lockedBalance?: number;
  vipLevel: number;
  exp: number;
  totalDeposited: number;
  inviteCode: string;
  referredBy?: string;
  lastLogin: string;
  isLoggedIn: boolean;
  loginPassword?: string;
  boundBkash?: string;
  boundNagad?: string;
  boundWallets?: Array<{ id: string; type: 'bKash' | 'Nagad'; number: string; addedAt: string }>;
  turnoverRequired: number;
  turnoverCompleted: number;
  hasClaimedDepositBonus?: boolean;
  lastGiftClaimTime?: string;
  lastGiftCode?: string;
  lastGiftAmount?: number;
  lastGiftReason?: string;
  pendingDepositBonusCode?: string;
  creditedDepositBonusCodes?: string[];
  illegalBetCount?: number;
  isBanned?: boolean;
  banReason?: string;
  role?: 'USER' | 'VIP' | 'ADMIN';
  totalWithdrawn?: number;
  createdAt?: string;
  claimedVipBonuses?: Record<string, boolean>;
  vipMonthlyLastClaim?: Record<string, number>;
  lastSalaryClaimDate?: string;
  claimedActivityRewards?: Record<string, string>;
  claimedFirstDepositTiers?: Record<string, boolean>;
  winGoStreakCount?: number;
  lastWinGoStreakDate?: string;
  claimedWinGoStreakDate?: string;
  dailyReferQualifiersDate?: string;
  dailyReferBonusTierAwarded?: number;
  claimedWingoRefunds?: string[];
  minesRoundSeq?: number;
  attendanceState?: {
    claimedDays: number[];
    lastClaimDate?: string;
    lastDepositDate?: string;
    streak: number;
  };
  registeredIp?: string;
  lastIp?: string;
  isVpn?: boolean;
  vpnReason?: string;
  ipCountry?: string;
  ipIsp?: string;
  deviceName?: string;
  updatedAt?: number;
}

export interface SupportMessage {
  id: string;
  userId: string;
  userUid?: string;
  userNickname?: string;
  userPhone?: string;
  sender: 'user' | 'admin';
  repliedByRole?: 'admin' | 'mentor';
  repliedByName?: string;
  text: string;
  imageUrl?: string;
  time: string;
  timestamp: number;
}

export type K3Mode = '1m' | '3m' | '5m' | '10m';
export type D5Mode = '1m' | '3m' | '5m' | '10m';

export interface K3Result {
  periodNumber: string;
  dice: [number, number, number];
  sum: number;
  size: 'Big' | 'Small';
  parity: 'Even' | 'Odd';
  pattern: string;
  time: string;
}

export interface K3Bet {
  id: string;
  userId?: string;
  mode: K3Mode;
  periodNumber: string;
  betType: string;
  selection: string;
  amount: number;
  multiplier: number;
  totalAmount: number;
  payoutRate?: number;
  winAmount?: number;
  status: 'pending' | 'won' | 'lost';
  time: string;
}

export interface D5Result {
  periodNumber: string;
  digits: [number, number, number, number, number];
  sum: number;
  size: 'Big' | 'Small';
  parity: 'Even' | 'Odd';
  time: string;
}

export interface D5Bet {
  id: string;
  userId?: string;
  mode: D5Mode;
  periodNumber: string;
  position: 'A' | 'B' | 'C' | 'D' | 'E' | 'SUM';
  betType?: 'size' | 'parity' | 'digit';
  selection: string;
  amount: number;
  multiplier: number;
  totalAmount: number;
  payoutRate?: number;
  winAmount?: number;
  status: 'pending' | 'won' | 'lost';
  time: string;
}

export interface ReferralMember {
  id: string;
  referrerCode: string;
  phone: string;
  uid: string;
  nickname: string;
  registrationDate: string;
  commission: number;
  depositAmount: number;
  level: 1 | 2 | 3;
  status: 'active' | 'pending';
}

export interface Transaction {
  id: string;
  userId: string;
  type:
    | 'deposit'
    | 'withdraw'
    | 'rebate'
    | 'gift'
    | 'lottery_win'
    | 'lottery_bet'
    | 'binary_win'
    | 'binary_bet'
    | 'aviator_win'
    | 'aviator_bet'
    | 'safe_in'
    | 'safe_out'
    | 'commission'
    | 'deposit_bonus'
    | 'first_deposit_bonus'
    | 'attendance_bonus'
    | 'vip_bonus'
    | 'salary_bonus'
    | 'activity_award'
    | 'mines_bet'
    | 'mines_win'
    | 'k3_bet'
    | 'k3_win'
    | 'd5_bet'
    | 'd5_win'
    | 'luckyjet_bet'
    | 'luckyjet_win'
    | 'plane_bet'
    | 'plane_win'
    | 'coinflip_bet'
    | 'coinflip_win'
    | 'ewi_wingo_bet'
    | 'ewi_wingo_win'
    | 'recharge_bonus'
    | 'daily_refer_bonus'
    | 'wingo_streak_bonus'
    | 'wingo_refund'
    | 'turnover_penalty'
    | 'roulette_bet'
    | 'roulette_win'
    | 'ludo_bet'
    | 'ludo_win'
    | 'sports_bet'
    | 'sports_win';
  title: string;
  detail?: string;
  amount: number;
  balanceAfter: number;
  time: string;
  status: 'success' | 'pending' | 'rejected';
  method?: string;
  trxId?: string;
  senderNumber?: string;
}

export interface DepositRequest {
  id: string;
  orderId?: string;
  sessionId?: string;
  checkoutUrl?: string;
  userId: string;
  userPhone: string;
  method: 'bKash' | 'Nagad' | 'USDT';
  provider?: string;
  channel: string;
  amount: number;
  usdAmount?: number;
  senderNumber: string;
  trxId: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  time: string;
  createdAtMs?: number;
  adminNote?: string;
  rejectionReason?: string;
}

export interface WinGoResult {
  periodNumber: string;
  number: number;
  color: 'green' | 'red' | 'violet' | 'red-violet' | 'green-violet';
  size: 'big' | 'small';
  time: string;
  mode?: WinGoMode;
  premium?: string;
  source?: 'api' | 'local';
}

export interface WinGoBet {
  id: string;
  userId: string;
  nickname?: string;
  userPhone?: string;
  periodNumber: string;
  mode: WinGoMode;
  type: 'color' | 'number' | 'size';
  value: string | number;
  amount: number;
  multiplier: number;
  totalAmount: number;
  winAmount?: number;
  status: 'pending' | 'won' | 'lost';
  time: string;
}

export interface EwiWingoBet {
  id: string;
  userId: string;
  nickname?: string;
  userPhone?: string;
  periodNumber: string;
  mode: EwiWingoMode;
  type: 'color' | 'number' | 'size';
  value: string | number;
  amount: number;
  multiplier: number;
  totalAmount: number;
  winAmount?: number;
  status: 'pending' | 'won' | 'lost';
  time: string;
}

export interface WinGoMarketState {
  period: string;
  timeRemaining: number;
  history: WinGoResult[];
  durationSeconds: number;
}

export interface Candle {
  time: number;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BinaryOptionBet {
  id: string;
  userId: string;
  asset: string;
  direction: 'UP' | 'DOWN';
  entryPrice: number;
  exitPrice?: number;
  strikePrice?: number;
  amount: number;
  payoutRate: number; // e.g. 0.90 for 90%
  winAmount?: number;
  durationSeconds: number; // 15, 30, 60, 180, 300, 900, 1800
  startTime: number;
  endTime: number;
  status: 'active' | 'won' | 'lost';
}

export interface AttendanceDay {
  day: number;
  requiredDeposit: number;
  amount: number;
  claimed: boolean;
  date?: string;
  status?: 'claimed' | 'available' | 'locked';
  lockReason?: string;
}

export type MarketControlMode =
  | 'AUTO'
  | 'HIGH_BET_LOSS'
  | 'HIGH_BET_WIN'
  | 'LOW_BET_WIN'
  | 'LOW_BET_LOSS';

export type MinesPatternMode =
  | 'RANDOM'
  | 'FIRST_WIN_SECOND_LOSS'
  | 'THREE_WIN_TEN_LOSS';

export interface MarketPoolEntry {
  poolId: string;
  game: 'k3' | 'd5' | 'mines' | 'binary' | 'coinflip';
  mode: string;
  period: string;
  selections: Record<string, number>;
  totalAmount: number;
  betCount?: number;
  updatedAt: number;
}

export interface GiftCodeItem {
  code: string;
  rewardType?: 'fixed' | 'deposit_percent';
  amount: number;
  depositBonusPercent?: number;
  maxClaims: number;
  claimedCount: number;
  turnoverAmount?: number;
  durationMinutes?: number;
  expiresAt?: number;
  createdAt?: number;
  claimedBy?: string[];
  active?: boolean;
  minRequiredBalance?: number;
  targetUid?: string;
  reason?: string;
  note?: string;
  claimRecords?: Array<{
    userId: string;
    uid?: string;
    nickname: string;
    contact: string;
    amount: number;
    depositAmount?: number;
    reason?: string;
    time: string;
  }>;
}

export interface WinGoPopupResult {
  periodNumber: string;
  mode: WinGoMode;
  status: 'won' | 'lost';
  amount: number;
  resultNumber: number;
  resultColor: 'green' | 'red' | 'violet' | 'red-violet' | 'green-violet';
  resultSize: 'big' | 'small';
  gameLabel?: string;
  badges?: Array<{ label: string; tone?: 'green' | 'red' | 'violet' | 'amber' | 'orange' | 'slate' }>;
}

export interface AviatorBet {
  id: string;
  roundId: string;
  userId: string;
  game?: 'aviator' | 'luckyjet' | 'plane';
  slot?: 1 | 2 | 3;
  amount: number;
  status: 'active' | 'cashed_out' | 'lost';
  cashoutMultiplier?: number;
  winAmount?: number;
  autoCashout?: number;
  time: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  reason?: string;
  type: 'turnover' | 'system' | 'bonus';
  read: boolean;
  time: string;
}

export interface WithdrawRequest {
  id: string;
  orderId?: string;
  ewiPayWithdrawId?: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Rocket' | 'USDT';
  number: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  time: string;
  createdAtMs?: number;
  adminNote?: string;
  payoutTrxId?: string;
  userMessage?: string;
  rejectionReason?: string;
}

export interface GameItem {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  category: 'Lottery' | 'Crash' | 'Trading' | 'Slots' | 'PVC' | 'Casino';
  url?: string;
  htmlCode?: string;
  badge?: string;
  price?: string;
  sortOrder: number;
  active: boolean;
  featured: boolean;
  targetTab?: string;
}

export interface BroadcastNotice {
  id: string;
  title: string;
  message: string;
  target: 'all' | 'vip' | 'active';
  time: string;
}

export interface AdminSettings {
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber?: string;
  usdtAddress?: string;
  binancePayId?: string;
  firstDepositBonusAmount?: number;
  minWithdraw?: number;
  referCommissionPercent?: number;
  depositInstructions: string;
  nextWingoOutcome: 'AUTO' | 'RED' | 'GREEN' | 'VIOLET' | number;
  nextWingoOutcomes?: Record<WinGoMode, 'AUTO' | 'RED' | 'GREEN' | 'VIOLET' | number>;
  queuedWingoOutcomes?: Partial<Record<WinGoMode, number[]>>;
  wingoSyncPath?: string;
  wingoPattern?: string;
  showTopEarners?: boolean;
  appName?: string;
  appLogoUrl?: string;
  supportLink?: string;
  supportPhone?: string;
  siteEnabled?: boolean;
  depositEnabled?: boolean;
  withdrawEnabled?: boolean;
  giftCodeEnabled?: boolean;
  registrationEnabled?: boolean;
  maintenanceMode?: boolean;
  timezoneOffsetMinutes?: number;
  gameControlModes?: {
    k3: MarketControlMode;
    d5: MarketControlMode;
    mines: MarketControlMode;
    binary: MarketControlMode;
    coinflip?: MarketControlMode;
  };
  minesPattern?: MinesPatternMode;
  binaryNextCandleBias?: 'AUTO' | 'BULL' | 'BEAR';
  updatedAt?: number;
  marqueeText?: string;
  popupTitle?: string;
  popupMessage?: string;
  popupImageUrl?: string;
  enableSystemPopup?: boolean;
  usdtRateBdt?: number;
  banners: Array<{
    id: string;
    url: string;
    title: string;
    link?: string;
    sortOrder?: number;
    active?: boolean;
  }>;
  bannersCustomized?: boolean;
  activeGiftCodes: GiftCodeItem[];
  games?: GameItem[];
  broadcasts?: BroadcastNotice[];
  ewiPayConfig?: EwiPayApiConfig;
  mentors?: MentorAccount[];
  mentorLogs?: MentorActivityLog[];
  bannedIps?: string[];
  mentorBlockedIps?: Array<{
    ip: string;
    reason: string;
    attemptedUsername?: string;
    blockedAt: string;
    blockedAtMs: number;
  }>;
  paymentGateways?: PaymentGatewaySlot[];
  sportsMatches?: SportsMatch[];
  activeAdminSession?: ActiveAdminSession | null;
  adminPhone?: string;
  adminPassword?: string;
  adminPhoneHash?: string;
  adminPasswordHash?: string;
}

export interface MentorAccount {
  id: string;
  name: string;
  username: string;
  password: string;
  allowedIp: string;
  giftCodeBudget: number;
  giftCodeSpent: number;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

export interface MentorActivityLog {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorUsername: string;
  ip: string;
  action:
    | 'login_success'
    | 'login_failed_blocked'
    | 'gift_code_created'
    | 'withdraw_updated'
    | 'holding_released'
    | 'turnover_adjusted'
    | 'support_reply'
    | 'broadcast_sent'
    | 'password_changed';
  detail: string;
  amount?: number;
  targetUid?: string;
  code?: string;
  time: string;
  timestamp: number;
}

export interface PaymentGatewaySlot {
  id: string;
  name: string;
  type: 'bkash' | 'nagad' | 'rocket' | 'usdt' | 'bank' | 'custom';
  accountNumber: string;
  accountLabel?: string;
  instructions?: string;
  minAmount?: number;
  maxAmount?: number;
  active: boolean;
}

export interface ActiveAdminSession {
  sessionId: string;
  ip: string;
  deviceName: string;
  loggedInAt: string;
  loggedInAtMs: number;
  lastSeenAtMs: number;
}

export interface EwiPayApiConfig {
  baseUrl?: string;
  siteSlug?: string;
  apiKey?: string;
  unifiedCheckoutUrl?: string;
  memberStatusUrl?: string;
  webhookUrl?: string;
  bkashCheckoutUrl?: string;
  bkashTransactionsUrl?: string;
  bkashWithdrawUrl?: string;
  bkashWithdrawStatusUrl?: string;
  bkashDepositStatusUrl?: string;
  nagadCheckoutUrl?: string;
  nagadTransactionsUrl?: string;
  nagadWithdrawUrl?: string;
  nagadWithdrawStatusUrl?: string;
  nagadDepositStatusUrl?: string;
  checkoutStatusUrl?: string;
}

export interface AdminAccessLog {
  id: string;
  sessionId?: string;
  ip: string;
  enteredAt: string;
  enteredAtMs: number;
  lastSeenAtMs?: number;
  staySeconds?: number;
  action: 'visit' | 'login_step1' | 'login_success' | 'login_failed';
  phoneAttempt?: string;
  userAgent?: string;
  route: string;
  isVpn?: boolean;
  vpnReason?: string;
  country?: string;
  isp?: string;
}

export type BinaryMarketCategory = 'Crypto' | 'Forex' | 'Commodities' | 'Indices';

export interface BinaryMarketConfig {
  symbol: string;
  name: string;
  category: BinaryMarketCategory;
  basePrice: number;
  decimals: number;
  volatility: number;
  payoutRate: number;
}

export interface BinaryMarketQuote {
  symbol: string;
  price: number;
  candles: Candle[];
  changePct: number;
}

export interface AviatorServerState {
  roundId: string;
  phase: 'waiting' | 'flying' | 'crashed';
  phaseStartedAt: number;
  serverNow: number;
  crashPoint: number;
  countdownRemaining: number;
  currentMultiplier: number;
  crashHistory: number[];
  maxMultiplier: number;
  forcedCrashAt?: number;
  forcedReason?: string;
  totalPool?: number;
  totalPaidOut?: number;
  payoutCapRemaining?: number;
}

export interface CrashRoundBetEntry {
  id: string;
  betId?: string;
  game: 'aviator' | 'luckyjet' | 'plane';
  roundId: string;
  userId: string;
  nickname: string;
  amount: number;
  status: 'active' | 'cashed_out' | 'lost';
  cashoutMultiplier?: number;
  payoutAmount?: number;
  placedAt: number;
}

export interface CrashPoolState {
  game: 'aviator' | 'luckyjet' | 'plane';
  roundId: string;
  totalPool: number;
  totalPaidOut: number;
  maxPayoutCap: number;
  forcedCrashMultiplier: number;
  forcedCrashedAtMs: number;
  forcedReason?: string;
  bets: CrashRoundBetEntry[];
  updatedAt: number;
}

export interface CoinFlipBet {
  id: string;
  userId: string;
  periodNumber: string;
  side: 'GOLD' | 'SILVER';
  amount: number;
  resultSide?: 'GOLD' | 'SILVER';
  winAmount?: number;
  status: 'pending' | 'won' | 'lost';
  time: string;
}

export type RouletteBetType =
  | 'straight'
  | 'split'
  | 'street'
  | 'corner'
  | 'sixline'
  | 'dozen'
  | 'column'
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high';

export interface RouletteBet {
  id: string;
  userId?: string;
  roundId: string;
  betType: RouletteBetType;
  numbers: number[];
  label: string;
  amount: number;
  payoutMultiplier: number;
  status: 'pending' | 'won' | 'lost';
  winAmount?: number;
  winningNumber?: number;
  time: string;
}

export interface LudoPlayer {
  slotIndex: number;
  color: 'red' | 'green' | 'yellow' | 'blue';
  userId: string;
  uid?: string;
  name: string;
  isBot?: boolean;
  tokens: number[]; // -1 = yard, 0..51 = shared track steps from home entry, 52..57 = home column, 57 = finished
  finishedRank?: number;
}

export type LudoRoomMode = '2p_winner' | '4p_winner' | '4p_split';

export interface LudoRoom {
  id: string;
  code: string;
  password: string;
  hostUserId: string;
  hostName: string;
  mode: LudoRoomMode;
  maxPlayers: 2 | 4;
  stake: number;
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  players: LudoPlayer[];
  currentTurnIdx: number;
  lastRoll?: number;
  winnerUserId?: string;
  winnerSummary?: string;
  payouts?: Array<{ userId: string; name: string; rank: number; amount: number }>;
  createdAt: string;
  createdAtMs: number;
  updatedAt: number;
}

export interface LudoBetRecord {
  id: string;
  userId: string;
  mode: 'online_2p' | 'online_4p' | LudoRoomMode;
  stake: number;
  winAmount: number;
  status: 'won' | 'lost';
  time: string;
}

export interface SportsMatch {
  id: string;
  sport: 'cricket' | 'football';
  league: string;
  teamA: string;
  teamB: string;
  teamAOdds: number;
  teamBOdds: number;
  scoreA: string;
  scoreB: string;
  statusText: string;
  status: 'live' | 'upcoming' | 'finished';
  winner?: 'teamA' | 'teamB';
  startTime: string;
  updatedAt: number;
}

export interface SportsBet {
  id: string;
  userId: string;
  matchId: string;
  sport: 'cricket' | 'football';
  matchTitle: string;
  selectedTeam: 'teamA' | 'teamB';
  teamName: string;
  odds: number;
  amount: number;
  potentialWin: number;
  winAmount?: number;
  status: 'pending' | 'won' | 'lost';
  time: string;
  createdAtMs: number;
}
