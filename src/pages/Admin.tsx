import React, { useEffect, useMemo, useState } from 'react';
import { useApp, getLeastBetWinningNumber, normalizePhone, DEFAULT_BANNERS, sha256HexSync } from '../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Flame,
  Image as ImageIcon,
  Megaphone,
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  Settings,
  LogOut,
  Search,
  Download,
  Plus,
  Edit3,
  Trash2,
  Power,
  Star,
  Code2,
  Copy,
  X,
  DollarSign,
  Sliders,
  Bell,
  Ban,
  CheckCircle2,
  XCircle,
  KeyRound,
  Lock,
  Phone,
  ShieldCheck,
  CreditCard,
  History,
  ArrowLeft,
  Layers,
  RefreshCw,
  Upload,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Globe,
  Clock,
  ShieldAlert,
  Wifi,
  Rocket
} from 'lucide-react';
import { Ewi777Logo } from '../components/BrandLogos';
import { compressImageFileToDataUrl } from '../utils/imageCompress';
import { getNextBinaryCandlePreview, formatOffsetLabel } from '../utils/syncedMarkets';
import { apiUrl } from '../utils/phoneAndApi';
import { BINARY_MARKET_MAP } from '../constants/markets';
import {
  GameItem,
  GiftCodeItem,
  MarketControlMode,
  MinesPatternMode,
  User,
  WinGoBet,
  WinGoMode
} from '../types';

type AdminNavTab =
  | 'dashboard'
  | 'users'
  | 'games'
  | 'wingo'
  | 'banners'
  | 'broadcast'
  | 'deposits'
  | 'withdraws'
  | 'giftcodes'
  | 'support'
  | 'access_logs'
  | 'settings';

function formatElapsedDuration(enteredAtMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - (Number(enteredAtMs) || nowMs)) / 1000));
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins < 60) return `${mins}m ${secs}s ago`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m ago`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h ago`;
}

function formatStaySeconds(staySeconds?: number, lastSeenAtMs?: number, enteredAtMs?: number): string {
  const derived =
    typeof staySeconds === 'number' && staySeconds >= 0
      ? Math.round(staySeconds)
      : lastSeenAtMs && enteredAtMs
      ? Math.max(0, Math.round((lastSeenAtMs - enteredAtMs) / 1000))
      : 0;
  if (derived < 60) return `${derived}s`;
  const mins = Math.floor(derived / 60);
  const secs = derived % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

export const Admin: React.FC = () => {
  const {
    user,
    adminSettings,
    isAdminLoggedIn,
    adminLogin,
    adminLogout,
    updateAdminSettings,
    depositRequests,
    withdrawRequests,
    approveDeposit,
    rejectDeposit,
    updateWithdrawStatus,
    allUsers,
    referrals,
    transactions,
    setUserTurnover,
    toggleUserBan,
    adminModifyUserBalance,
    releaseLockedBalance,
    adminUpdateUserRole,
    adminDeleteUser,
    adminSendUserNotice,
    sendBroadcastNotice,
    deleteBroadcastNotice,
    setActiveTab,
    showToast,
    wingoMarkets,
    bets,
    globalWingoBets,
    syncServerDataNow,
    syncEwiPayTransactions,
    marketPools,
    supportMessages,
    sendSupportMessage,
    adminAccessLogs,
    logAdminAccessEntry,
    heartbeatAdminAccess
  } = useApp();

  // Admin Login Form (Direct 1-Step Verification)
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Support Chat Inbox State
  const [selectedChatUserId, setSelectedChatUserId] = useState<string>('');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminChatZoomUrl, setAdminChatZoomUrl] = useState<string | null>(null);
  const [isAdminSendingPhoto, setIsAdminSendingPhoto] = useState(false);

  // Navigation & Live Clock (1s interval powers real-time visitor elapsed timers)
  const [navTab, setNavTab] = useState<AdminNavTab>('dashboard');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [nowStr, setNowStr] = useState<string>(() => new Date().toLocaleString('en-GB'));
  const [tickStr, setTickStr] = useState<string>(() => new Date().toTimeString().slice(0, 8));

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setNowMs(d.getTime());
      setNowStr(d.toLocaleString('en-GB'));
      setTickStr(d.toTimeString().slice(0, 8));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Automatically record every visitor IP + Entry Time + live stay duration when entering /admin-ewi777-panel-009
  useEffect(() => {
    let sid = '';
    try {
      sid = sessionStorage.getItem('ewi_admin_visit_sid') || '';
      if (!sid) {
        sid = `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('ewi_admin_visit_sid', sid);
      }
    } catch {
      sid = `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    logAdminAccessEntry('visit', undefined, sid).catch(() => {});
    const hbInterval = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        heartbeatAdminAccess(sid).catch(() => {});
      }
    }, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        heartbeatAdminAccess(sid).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(hbInterval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =================== ALL USERS STATE ===================
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'USER' | 'VIP' | 'ADMIN' | 'BANNED'>('ALL');
  const [controlUser, setControlUser] = useState<User | null>(null);
  const [balanceModalUser, setBalanceModalUser] = useState<User | null>(null);
  const [balAction, setBalAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [balAmount, setBalAmount] = useState('');
  const [balReason, setBalReason] = useState('');
  const [balLocked, setBalLocked] = useState(false);
  const [balTurnover, setBalTurnover] = useState('');
  const [txHistoryModalUser, setTxHistoryModalUser] = useState<User | null>(null);
  const [cardsModalUser, setCardsModalUser] = useState<User | null>(null);
  const [noticeModalUser, setNoticeModalUser] = useState<User | null>(null);
  const [personalNoticeText, setPersonalNoticeText] = useState('');
  const [turnoverDraft, setTurnoverDraft] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);

  // =================== GAMES MANAGEMENT STATE ===================
  const [gameSearch, setGameSearch] = useState('');
  const [htmlModalGame, setHtmlModalGame] = useState<GameItem | null>(null);
  const [editGameModal, setEditGameModal] = useState<Partial<GameItem> | null>(null);

  // =================== WINGO ENGINE STATE ===================
  const [selectedWingoMode, setSelectedWingoMode] = useState<WinGoMode>('1m');
  const [wingoSyncPath, setWingoSyncPath] = useState(adminSettings.wingoSyncPath || 'wingo');
  const [wingoPattern, setWingoPattern] = useState(adminSettings.wingoPattern || '1,2,3,4,5');
  const [showSyncDataModal, setShowSyncDataModal] = useState(false);

  // =================== BANNERS STATE ===================
  const [bannerModal, setBannerModal] = useState<{
    id?: string;
    title: string;
    url: string;
    link: string;
    sortOrder: number;
    active: boolean;
  } | null>(null);

  // =================== BROADCAST STATE ===================
  const [brdTitle, setBrdTitle] = useState('');
  const [brdMessage, setBrdMessage] = useState('');
  const [brdTarget, setBrdTarget] = useState<'all' | 'vip' | 'active'>('all');
  const [marqueeDraft, setMarqueeDraft] = useState(adminSettings.marqueeText || '');
  const [popupTitleDraft, setPopupTitleDraft] = useState(adminSettings.popupTitle || '');
  const [popupMsgDraft, setPopupMsgDraft] = useState(adminSettings.popupMessage || '');
  const [popupImageDraft, setPopupImageDraft] = useState(adminSettings.popupImageUrl || '');
  const [isUploadingPopupImg, setIsUploadingPopupImg] = useState(false);
  const [popupEnabledDraft, setPopupEnabledDraft] = useState(Boolean(adminSettings.enableSystemPopup));

  // =================== DEPOSITS & WITHDRAWS FILTER STATE ===================
  const [depSearch, setDepSearch] = useState('');
  const [depFilter, setDepFilter] = useState<'pending' | 'processing' | 'approved' | 'rejected' | 'all'>('pending');
  const [wdFilter, setWdFilter] = useState<'pending' | 'processing' | 'completed' | 'rejected' | 'all'>('pending');
  const [rejectWithdrawModal, setRejectWithdrawModal] = useState<{
    id: string;
    userName: string;
    amount: number;
  } | null>(null);
  const [rejectWithdrawReason, setRejectWithdrawReason] = useState<string>(
    'আপনি কিছুক্ষণ পর আবার চেষ্টা করুন ধন্যবাদ'
  );
  const [rejectTurnoverPenalty, setRejectTurnoverPenalty] = useState('');

  // =================== GIFT CODES STATE ===================
  const [giftSearch, setGiftSearch] = useState('');
  const [targetUserSearch, setTargetUserSearch] = useState('');
  const [claimHistoryCode, setClaimHistoryCode] = useState<GiftCodeItem | null>(null);
  const [giftModal, setGiftModal] = useState<{
    isEdit: boolean;
    originalCode?: string;
    code: string;
    rewardType: 'fixed' | 'deposit_percent';
    amount: string;
    depositBonusPercent: string;
    maxClaims: string;
    turnoverAmount: string;
    expiryDate: string;
    minRequiredBalance: string;
    targetUid: string;
    reason: string;
    note: string;
    active: boolean;
  } | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState('5');
  const [bulkRewardType, setBulkRewardType] = useState<'fixed' | 'deposit_percent'>('fixed');
  const [bulkAmount, setBulkAmount] = useState('100');
  const [bulkDepositPercent, setBulkDepositPercent] = useState('200');
  const [bulkMaxClaims, setBulkMaxClaims] = useState('1');
  const [bulkTurnover, setBulkTurnover] = useState('100');
  const [bulkReason, setBulkReason] = useState('VIP Gift Reward');
  const [bulkNote, setBulkNote] = useState('VIP Gift');

  // =================== APP SETTINGS STATE ===================
  const [bkashNum, setBkashNum] = useState(adminSettings.bkashNumber);
  const [nagadNum, setNagadNum] = useState(adminSettings.nagadNumber);
  const [rocketNum, setRocketNum] = useState(adminSettings.rocketNumber || '');
  const [usdtAddr, setUsdtAddr] = useState(adminSettings.usdtAddress || '');
  const [binancePayIdDraft, setBinancePayIdDraft] = useState(adminSettings.binancePayId || '');
  const [firstDepBonusDraft, setFirstDepBonusDraft] = useState(
    String(adminSettings.firstDepositBonusAmount ?? 50)
  );
  const [minWd, setMinWd] = useState(String(Math.max(300, adminSettings.minWithdraw || 300)));
  const [referPct, setReferPct] = useState(String(adminSettings.referCommissionPercent ?? 10));
  const [depositInstr, setDepositInstr] = useState(adminSettings.depositInstructions);

  // EWI-Pay Deposit & Withdraw API Configuration Drafts (Admin Editable)
  const [ewiBaseUrl, setEwiBaseUrl] = useState(adminSettings.ewiPayConfig?.baseUrl || 'https://ewi-pay.vercel.app');
  const [ewiSiteSlug, setEwiSiteSlug] = useState(adminSettings.ewiPayConfig?.siteSlug || 'ewi777');
  const [ewiApiKey, setEwiApiKey] = useState(adminSettings.ewiPayConfig?.apiKey || '');
  const [showEwiApiKey, setShowEwiApiKey] = useState(false);
  const [ewiCheckoutStatusUrl, setEwiCheckoutStatusUrl] = useState(
    adminSettings.ewiPayConfig?.checkoutStatusUrl || 'https://ewi-pay.vercel.app/api/v1/checkout/status/:sessionId'
  );
  const [ewiBkashCheckoutUrl, setEwiBkashCheckoutUrl] = useState(
    adminSettings.ewiPayConfig?.bkashCheckoutUrl || 'https://ewi-pay.vercel.app/api/v1/bkash/checkout/create'
  );
  const [ewiBkashDepositStatusUrl, setEwiBkashDepositStatusUrl] = useState(
    adminSettings.ewiPayConfig?.bkashDepositStatusUrl || 'https://ewi-pay.vercel.app/api/v1/bkash/deposits/:id/status'
  );
  const [ewiBkashTxUrl, setEwiBkashTxUrl] = useState(
    adminSettings.ewiPayConfig?.bkashTransactionsUrl || 'https://ewi-pay.vercel.app/api/v1/bkash/transactions'
  );
  const [ewiBkashWithdrawUrl, setEwiBkashWithdrawUrl] = useState(
    adminSettings.ewiPayConfig?.bkashWithdrawUrl || 'https://ewi-pay.vercel.app/api/v1/bkash/withdrawals/request'
  );
  const [ewiBkashWithdrawStatusUrl, setEwiBkashWithdrawStatusUrl] = useState(
    adminSettings.ewiPayConfig?.bkashWithdrawStatusUrl || 'https://ewi-pay.vercel.app/api/v1/bkash/withdrawals/:id/status'
  );
  const [ewiNagadCheckoutUrl, setEwiNagadCheckoutUrl] = useState(
    adminSettings.ewiPayConfig?.nagadCheckoutUrl || 'https://ewi-pay.vercel.app/api/v1/nagad/checkout/create'
  );
  const [ewiNagadDepositStatusUrl, setEwiNagadDepositStatusUrl] = useState(
    adminSettings.ewiPayConfig?.nagadDepositStatusUrl || 'https://ewi-pay.vercel.app/api/v1/nagad/deposits/:id/status'
  );
  const [ewiNagadTxUrl, setEwiNagadTxUrl] = useState(
    adminSettings.ewiPayConfig?.nagadTransactionsUrl || 'https://ewi-pay.vercel.app/api/v1/nagad/transactions'
  );
  const [ewiNagadWithdrawUrl, setEwiNagadWithdrawUrl] = useState(
    adminSettings.ewiPayConfig?.nagadWithdrawUrl || 'https://ewi-pay.vercel.app/api/v1/nagad/withdrawals/request'
  );
  const [ewiNagadWithdrawStatusUrl, setEwiNagadWithdrawStatusUrl] = useState(
    adminSettings.ewiPayConfig?.nagadWithdrawStatusUrl || 'https://ewi-pay.vercel.app/api/v1/nagad/withdrawals/:id/status'
  );
  const [ewiUnifiedCheckoutUrl, setEwiUnifiedCheckoutUrl] = useState(
    adminSettings.ewiPayConfig?.unifiedCheckoutUrl || 'https://ewi-pay.vercel.app/api/v1/checkout/create'
  );
  const [ewiMemberStatusUrl, setEwiMemberStatusUrl] = useState(
    adminSettings.ewiPayConfig?.memberStatusUrl || 'https://ewi-pay.vercel.app/api/v1/member/:siteUserId/status'
  );
  const [isSyncingWithdraws, setIsSyncingWithdraws] = useState(false);

  const [appNameDraft, setAppNameDraft] = useState(adminSettings.appName || 'EWI 777');
  const [appLogoDraft, setAppLogoDraft] = useState(adminSettings.appLogoUrl || '');
  const [supportLinkDraft, setSupportLinkDraft] = useState(adminSettings.supportLink || '');
  const [supportPhoneDraft, setSupportPhoneDraft] = useState(adminSettings.supportPhone || '');
  const [adminLoginPhoneDraft, setAdminLoginPhoneDraft] = useState('');
  const [adminLoginPassDraft, setAdminLoginPassDraft] = useState('');
  const [ipSearch, setIpSearch] = useState('');
  const [ipReport, setIpReport] = useState<{
    multiIpGroups: Array<{
      ip: string;
      count: number;
      hasVpn: boolean;
      country: string;
      isp: string;
      users: any[];
    }>;
    vpnUsers: any[];
    totalTrackedUsers: number;
  } | null>(null);
  const [isLoadingIpReport, setIsLoadingIpReport] = useState(false);
  const [confirmBanIp, setConfirmBanIp] = useState<string | null>(null);
  const [crashControlGame, setCrashControlGame] = useState<'aviator' | 'luckyjet' | 'plane'>('aviator');
  const [crashLiveData, setCrashLiveData] = useState<{ state: any; pool: any } | null>(null);
  const [isCrashForcing, setIsCrashForcing] = useState(false);

  const [depEnabled, setDepEnabled] = useState(adminSettings.depositEnabled !== false);
  const [wdEnabled, setWdEnabled] = useState(adminSettings.withdrawEnabled !== false);
  const [giftEnabled, setGiftEnabled] = useState(adminSettings.giftCodeEnabled !== false);
  const [regEnabled, setRegEnabled] = useState(adminSettings.registrationEnabled !== false);
  const [maintMode, setMaintMode] = useState(Boolean(adminSettings.maintenanceMode));
  const [siteEnabledDraft, setSiteEnabledDraft] = useState(adminSettings.siteEnabled !== false);
  const [tzOffsetDraft, setTzOffsetDraft] = useState<number>(adminSettings.timezoneOffsetMinutes ?? 360);
  const [ctrlK3, setCtrlK3] = useState<MarketControlMode>(adminSettings.gameControlModes?.k3 || 'AUTO');
  const [ctrlD5, setCtrlD5] = useState<MarketControlMode>(adminSettings.gameControlModes?.d5 || 'AUTO');
  const [ctrlMines, setCtrlMines] = useState<MarketControlMode>(adminSettings.gameControlModes?.mines || 'AUTO');
  const [ctrlBinary, setCtrlBinary] = useState<MarketControlMode>(adminSettings.gameControlModes?.binary || 'AUTO');
  const [ctrlCoinFlip, setCtrlCoinFlip] = useState<MarketControlMode>(adminSettings.gameControlModes?.coinflip || 'AUTO');
  const [minesPatternDraft, setMinesPatternDraft] = useState<MinesPatternMode>(adminSettings.minesPattern || 'RANDOM');
  const [binaryBiasDraft, setBinaryBiasDraft] = useState<'AUTO' | 'BULL' | 'BEAR'>(adminSettings.binaryNextCandleBias || 'AUTO');

  // Keep draft inputs hydrated whenever server settings sync or admin logs in
  const settingsSyncSignature = JSON.stringify({
    bkash: adminSettings.bkashNumber,
    nagad: adminSettings.nagadNumber,
    rocket: adminSettings.rocketNumber,
    usdt: adminSettings.usdtAddress,
    binancePayId: adminSettings.binancePayId,
    firstDepBonus: adminSettings.firstDepositBonusAmount,
    minWd: adminSettings.minWithdraw,
    refer: adminSettings.referCommissionPercent,
    instr: adminSettings.depositInstructions,
    appName: adminSettings.appName,
    logo: adminSettings.appLogoUrl,
    supLink: adminSettings.supportLink,
    supPhone: adminSettings.supportPhone,
    dep: adminSettings.depositEnabled,
    wd: adminSettings.withdrawEnabled,
    gift: adminSettings.giftCodeEnabled,
    reg: adminSettings.registrationEnabled,
    maint: adminSettings.maintenanceMode,
    siteEn: adminSettings.siteEnabled,
    tz: adminSettings.timezoneOffsetMinutes,
    ctrl: adminSettings.gameControlModes,
    mPat: adminSettings.minesPattern,
    bBias: adminSettings.binaryNextCandleBias,
    marquee: adminSettings.marqueeText,
    pTitle: adminSettings.popupTitle,
    pMsg: adminSettings.popupMessage,
    pEn: adminSettings.enableSystemPopup,
    wPath: adminSettings.wingoSyncPath,
    wPat: adminSettings.wingoPattern,
    ewiPay: adminSettings.ewiPayConfig
  });
  useEffect(() => {
    setBkashNum(adminSettings.bkashNumber || '');
    setNagadNum(adminSettings.nagadNumber || '');
    setRocketNum(adminSettings.rocketNumber || '');
    setUsdtAddr(adminSettings.usdtAddress || '');
    setBinancePayIdDraft(adminSettings.binancePayId || '');
    setFirstDepBonusDraft(String(adminSettings.firstDepositBonusAmount ?? 50));
    setMinWd(String(Math.max(300, adminSettings.minWithdraw || 300)));
    setReferPct(String(adminSettings.referCommissionPercent ?? 10));
    setDepositInstr(adminSettings.depositInstructions || '');
    const ep = adminSettings.ewiPayConfig;
    const base = String(ep?.baseUrl || 'https://ewi-pay.vercel.app').trim().replace(/\/+$/, '') || 'https://ewi-pay.vercel.app';
    setEwiBaseUrl(base);
    setEwiSiteSlug(ep?.siteSlug || 'ewi777');
    setEwiApiKey(ep?.apiKey || '');
    setEwiCheckoutStatusUrl(ep?.checkoutStatusUrl || `${base}/api/v1/checkout/status/:sessionId`);
    setEwiBkashCheckoutUrl(ep?.bkashCheckoutUrl || `${base}/api/v1/bkash/checkout/create`);
    setEwiBkashDepositStatusUrl(ep?.bkashDepositStatusUrl || `${base}/api/v1/bkash/deposits/:id/status`);
    setEwiBkashTxUrl(ep?.bkashTransactionsUrl || `${base}/api/v1/bkash/transactions`);
    setEwiBkashWithdrawUrl(ep?.bkashWithdrawUrl || `${base}/api/v1/bkash/withdrawals/request`);
    setEwiBkashWithdrawStatusUrl(ep?.bkashWithdrawStatusUrl || `${base}/api/v1/bkash/withdrawals/:id/status`);
    setEwiNagadCheckoutUrl(ep?.nagadCheckoutUrl || `${base}/api/v1/nagad/checkout/create`);
    setEwiNagadDepositStatusUrl(ep?.nagadDepositStatusUrl || `${base}/api/v1/nagad/deposits/:id/status`);
    setEwiNagadTxUrl(ep?.nagadTransactionsUrl || `${base}/api/v1/nagad/transactions`);
    setEwiNagadWithdrawUrl(ep?.nagadWithdrawUrl || `${base}/api/v1/nagad/withdrawals/request`);
    setEwiNagadWithdrawStatusUrl(ep?.nagadWithdrawStatusUrl || `${base}/api/v1/nagad/withdrawals/:id/status`);
    setEwiUnifiedCheckoutUrl(ep?.unifiedCheckoutUrl || `${base}/api/v1/checkout/create`);
    setEwiMemberStatusUrl(ep?.memberStatusUrl || `${base}/api/v1/member/:siteUserId/status`);
    setAppNameDraft(adminSettings.appName || 'EWI 777');
    setAppLogoDraft(adminSettings.appLogoUrl || '');
    setSupportLinkDraft(adminSettings.supportLink || '');
    setSupportPhoneDraft(adminSettings.supportPhone || '');
    setDepEnabled(adminSettings.depositEnabled !== false);
    setWdEnabled(adminSettings.withdrawEnabled !== false);
    setGiftEnabled(adminSettings.giftCodeEnabled !== false);
    setRegEnabled(adminSettings.registrationEnabled !== false);
    setMaintMode(Boolean(adminSettings.maintenanceMode));
    setSiteEnabledDraft(adminSettings.siteEnabled !== false);
    setTzOffsetDraft(adminSettings.timezoneOffsetMinutes ?? 360);
    setCtrlK3(adminSettings.gameControlModes?.k3 || 'AUTO');
    setCtrlD5(adminSettings.gameControlModes?.d5 || 'AUTO');
    setCtrlMines(adminSettings.gameControlModes?.mines || 'AUTO');
    setCtrlBinary(adminSettings.gameControlModes?.binary || 'AUTO');
    setCtrlCoinFlip(adminSettings.gameControlModes?.coinflip || 'AUTO');
    setMinesPatternDraft(adminSettings.minesPattern || 'RANDOM');
    setBinaryBiasDraft(adminSettings.binaryNextCandleBias || 'AUTO');
    setMarqueeDraft(adminSettings.marqueeText || '');
    setPopupTitleDraft(adminSettings.popupTitle || '');
    setPopupMsgDraft(adminSettings.popupMessage || '');
    setPopupEnabledDraft(Boolean(adminSettings.enableSystemPopup));
    setWingoSyncPath(adminSettings.wingoSyncPath || 'wingo');
    setWingoPattern(adminSettings.wingoPattern || '1,2,3,4,5');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminLoggedIn, settingsSyncSignature]);

  // =================== PASSWORD RECOVERY TICKETS ===================
  const [pwRequests, setPwRequests] = useState<any[]>([]);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const loadPwReqs = async () => {
      try {
        const res = await fetch(apiUrl('/api/password-requests'), { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (data?.success && Array.isArray(data.requests)) {
            setPwRequests(data.requests);
            return;
          }
        }
      } catch {}
      try {
        const saved = localStorage.getItem('ewi777_pw_requests');
        if (saved) setPwRequests(JSON.parse(saved));
      } catch {}
    };
    loadPwReqs();
    const timer = setInterval(loadPwReqs, 4000);
    return () => clearInterval(timer);
  }, [isAdminLoggedIn]);

  // =================== COMPUTED STATS ===================
  const gamesList = adminSettings.games || [];
  const totalUserBalance = useMemo(
    () => allUsers.reduce((sum, u) => sum + (Number(u.balance) || 0), 0),
    [allUsers]
  );
  const bannedCount = useMemo(() => allUsers.filter((u) => u.isBanned).length, [allUsers]);
  const pendingDepCount = useMemo(
    () => depositRequests.filter((d) => d.status === 'pending').length,
    [depositRequests]
  );
  const pendingWdCount = useMemo(
    () => withdrawRequests.filter((w) => w.status === 'pending' || w.status === 'processing').length,
    [withdrawRequests]
  );
  const giftClaimedTotal = useMemo(
    () =>
      adminSettings.activeGiftCodes.reduce(
        (sum, c) => sum + (Number(c.amount) || 0) * (Number(c.claimedCount) || 0),
        0
      ),
    [adminSettings.activeGiftCodes]
  );
  const activeBannersCount = useMemo(
    () => (adminSettings.banners || []).filter((b) => b.active !== false).length,
    [adminSettings.banners]
  );
  const recentGiftClaims = useMemo(() => {
    const records: Array<{ code: string; nickname: string; contact: string; amount: number; time: string }> = [];
    adminSettings.activeGiftCodes.forEach((c) => {
      (c.claimRecords || []).forEach((rec) => {
        records.push({
          code: c.code,
          nickname: rec.nickname,
          contact: rec.contact,
          amount: rec.amount,
          time: rec.time
        });
      });
    });
    return records.slice(0, 8);
  }, [adminSettings.activeGiftCodes]);

  const supportThreads = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userUid: string;
        userNickname: string;
        userPhone: string;
        lastMessage: string;
        lastTime: number;
        count: number;
        hasUnanswered: boolean;
      }
    >();
    supportMessages.forEach((m) => {
      const existing = map.get(m.userId);
      const ts = Number(m.timestamp) || Date.now();
      const preview = m.text?.trim() ? m.text.trim() : m.imageUrl ? '[Photo Attachment]' : '';
      if (!existing || ts >= existing.lastTime) {
        map.set(m.userId, {
          userId: m.userId,
          userUid: m.userUid || existing?.userUid || 'GUEST',
          userNickname: m.sender === 'user' ? m.userNickname || existing?.userNickname || 'Member' : existing?.userNickname || m.userNickname || 'Member',
          userPhone: m.sender === 'user' ? m.userPhone || existing?.userPhone || '' : existing?.userPhone || m.userPhone || '',
          lastMessage: preview,
          lastTime: ts,
          count: (existing?.count || 0) + 1,
          hasUnanswered: m.sender === 'user'
        });
      } else {
        existing.count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastTime - a.lastTime);
  }, [supportMessages]);

  const unansweredSupportCount = useMemo(
    () => supportThreads.filter((t) => t.hasUnanswered).length,
    [supportThreads]
  );

  useEffect(() => {
    if (!selectedChatUserId && supportThreads.length > 0) {
      setSelectedChatUserId(supportThreads[0].userId);
    }
  }, [selectedChatUserId, supportThreads]);

  const fetchIpSecurityReport = React.useCallback(async () => {
    setIsLoadingIpReport(true);
    try {
      const res = await fetch(apiUrl('/api/security/ip-report'), { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setIpReport({
            multiIpGroups: Array.isArray(data.multiIpGroups) ? data.multiIpGroups : [],
            vpnUsers: Array.isArray(data.vpnUsers) ? data.vpnUsers : [],
            totalTrackedUsers: Number(data.totalTrackedUsers) || 0
          });
        }
      }
    } catch {
      // fallback derived cleanly from allUsers below
    } finally {
      setIsLoadingIpReport(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminLoggedIn) return;
    fetchIpSecurityReport();
  }, [isAdminLoggedIn, fetchIpSecurityReport]);

  useEffect(() => {
    if (isAdminLoggedIn && (navTab === 'access_logs' || navTab === 'users')) {
      fetchIpSecurityReport();
    }
  }, [isAdminLoggedIn, navTab, fetchIpSecurityReport]);

  useEffect(() => {
    if (!isAdminLoggedIn || navTab !== 'wingo') return;
    let active = true;
    const pollCrash = async () => {
      try {
        const res = await fetch(apiUrl(`/api/crash/state?game=${crashControlGame}`), {
          cache: 'no-store'
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (active && data?.success) {
            setCrashLiveData({ state: data.state, pool: data.pool });
          }
        }
      } catch {}
    };
    pollCrash();
    const timer = setInterval(pollCrash, 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAdminLoggedIn, navTab, crashControlGame]);

  const effectiveIpReport = useMemo(() => {
    const ipBuckets = new Map<string, any[]>();
    const vpnMap = new Map<string, any>();

    const upsertUserIntoBuckets = (raw: any) => {
      if (!raw || !raw.id) return;
      const liveMatch = allUsers.find(
        (x) => x.id === raw.id || (raw.uid && x.uid === raw.uid) || (raw.phone && x.phone === raw.phone)
      );
      const merged = liveMatch ? { ...raw, ...liveMatch } : raw;
      const primaryIp = String(merged.lastIp || merged.registeredIp || '').trim();
      const regIp = String(merged.registeredIp || '').trim();
      const summary = {
        id: merged.id,
        uid: merged.uid || 'N/A',
        nickname: merged.nickname || 'Member',
        phone: merged.phone || merged.email || '',
        balance: Number(merged.balance) || 0,
        registeredIp: regIp || primaryIp || 'Unknown',
        lastIp: primaryIp || 'Unknown',
        isVpn: Boolean(merged.isVpn || merged.vpnDetected),
        vpnReason: merged.vpnReason || '',
        ipCountry: merged.ipCountry || '',
        ipIsp: merged.ipIsp || '',
        isBanned: Boolean(merged.isBanned),
        lastLogin: merged.lastLogin || ''
      };
      if (summary.isVpn) {
        vpnMap.set(summary.id, summary);
      }
      const ips = new Set<string>();
      if (primaryIp && primaryIp !== 'Unknown') ips.add(primaryIp);
      if (regIp && regIp !== 'Unknown') ips.add(regIp);
      ips.forEach((ipAddr) => {
        const list = ipBuckets.get(ipAddr) || [];
        if (!list.some((x) => x.id === summary.id)) {
          list.push(summary);
          ipBuckets.set(ipAddr, list);
        }
      });
    };

    allUsers.forEach(upsertUserIntoBuckets);
    (ipReport?.vpnUsers || []).forEach(upsertUserIntoBuckets);
    (ipReport?.multiIpGroups || []).forEach((g) => (g.users || []).forEach(upsertUserIntoBuckets));

    const multiIpGroups = Array.from(ipBuckets.entries())
      .filter(([, usersList]) => usersList.length >= 2)
      .map(([ip, usersList]) => ({
        ip,
        count: usersList.length,
        hasVpn: usersList.some((x) => x.isVpn),
        country: usersList.find((x) => x.ipCountry)?.ipCountry || '',
        isp: usersList.find((x) => x.ipIsp)?.ipIsp || '',
        users: usersList
      }))
      .sort((a, b) => b.count - a.count);

    return {
      ipBuckets,
      multiIpGroups,
      vpnUsers: Array.from(vpnMap.values()),
      totalTrackedUsers: Math.max(allUsers.length, ipReport?.totalTrackedUsers || 0)
    };
  }, [allUsers, ipReport]);

  const getUserIpClusterCount = (u: Partial<User>): number => {
    const ips = [u.lastIp, u.registeredIp].filter((x): x is string => Boolean(x && x !== 'Unknown'));
    let maxCount = 0;
    ips.forEach((ipAddr) => {
      const len = effectiveIpReport.ipBuckets.get(ipAddr)?.length || 0;
      if (len > maxCount) maxCount = len;
    });
    return maxCount;
  };

  const handleInspectSecurityUser = (summary: any) => {
    const found =
      allUsers.find(
        (u) =>
          u.id === summary.id ||
          (summary.uid && u.uid === summary.uid) ||
          (summary.phone && u.phone === summary.phone)
      ) || ({
        ...summary,
        safeBalance: 0,
        vipLevel: 0,
        exp: 0,
        totalDeposited: 0,
        inviteCode: '',
        avatar: '',
        isLoggedIn: false,
        turnoverRequired: 0,
        turnoverCompleted: 0
      } as User);
    setControlUser(found);
    setTurnoverDraft(String(found.turnoverRequired || 0));
  };

  const handleBanAllOnIp = (ipAddr: string, clusterUsers: any[]) => {
    const unbannedTargets = clusterUsers.filter((cu) => {
      const live = allUsers.find((u) => u.id === cu.id || (cu.uid && u.uid === cu.uid));
      return live ? !live.isBanned : !cu.isBanned;
    });
    if (unbannedTargets.length === 0) {
      showToast(`All accounts on ${ipAddr} are already banned`);
      setConfirmBanIp(null);
      return;
    }
    unbannedTargets.forEach((cu) => {
      toggleUserBan(cu.id, `Multi-account cluster detected on IP ${ipAddr}`);
    });
    setConfirmBanIp(null);
    showToast(`Banned ${unbannedTargets.length} accounts sharing IP ${ipAddr}`);
    setTimeout(() => fetchIpSecurityReport(), 400);
  };

  const handleForceCrashNow = async () => {
    if (isCrashForcing) return;
    setIsCrashForcing(true);
    try {
      const res = await fetch(apiUrl('/api/crash/admin-force'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: crashControlGame })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        showToast(data?.message || 'Unable to force crash right now');
      } else {
        setCrashLiveData({ state: data.state, pool: data.pool });
        showToast(`${crashControlGame.toUpperCase()} crashed at ${Number(data.state?.crashPoint || 1).toFixed(2)}x`);
      }
    } catch {
      showToast('Crash server unavailable');
    } finally {
      setIsCrashForcing(false);
    }
  };

  // =================== HANDLERS ===================
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyingLogin) return;
    setLoginError(null);

    if (!adminPhone.trim() || !adminPass.trim()) {
      setLoginError('Please enter both Admin Phone and Password');
      return;
    }
    setIsVerifyingLogin(true);
    try {
      const res = await adminLogin(adminPhone.trim(), adminPass.trim());
      if (!res.success) {
        setLoginError(res.message);
      } else {
        setLoginError(null);
        setAdminPhone('');
        setAdminPass('');
      }
    } finally {
      setIsVerifyingLogin(false);
    }
  };

  const copyTextSafely = (text: string, label = 'Copied!') => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(label))
        .catch(() => {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast(label);
          } catch {
            showToast('Copy failed');
          }
        });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(label);
      } catch {
        showToast('Copy failed');
      }
    }
  };

  const handleExportUsersCsv = () => {
    const header = ['UID', 'Nickname', 'Phone', 'Email', 'Balance', 'Deposited', 'Withdrawn', 'Role', 'Status', 'Joined'];
    const rows = allUsers.map((u) => [
      u.uid,
      `"${(u.nickname || '').replace(/"/g, '""')}"`,
      u.phone || '',
      u.email || '',
      Number(u.balance || 0).toFixed(2),
      Number(u.totalDeposited || 0).toFixed(2),
      Number(u.totalWithdrawn || 0).toFixed(2),
      u.role || (u.vipLevel > 0 ? 'VIP' : 'USER'),
      u.isBanned ? 'BANNED' : 'ACTIVE',
      u.createdAt || u.lastLogin || ''
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ewi777_users_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Users CSV exported!');
  };

  const handleForceOutcome = (outcome: 'AUTO' | 'RED' | 'GREEN' | 'VIOLET' | number) => {
    updateAdminSettings({
      nextWingoOutcome: outcome,
      nextWingoOutcomes: {
        ...(adminSettings.nextWingoOutcomes || { '30s': 'AUTO', '1m': 'AUTO', '3m': 'AUTO', '5m': 'AUTO' }),
        [selectedWingoMode]: outcome
      }
    });
    showToast(`FORCE RESULT -> WinGo ${selectedWingoMode}: ${outcome}`);
  };

  const handleQueueNumber = (num: number) => {
    const curQueue = adminSettings.queuedWingoOutcomes?.[selectedWingoMode] || [];
    const nextQueue = [...curQueue, num];
    updateAdminSettings({
      queuedWingoOutcomes: {
        ...(adminSettings.queuedWingoOutcomes || {}),
        [selectedWingoMode]: nextQueue
      }
    });
    showToast(`Queued #${num} for WinGo ${selectedWingoMode} (${nextQueue.length} in queue)`);
  };

  const handleClearQueue = () => {
    updateAdminSettings({
      queuedWingoOutcomes: {
        ...(adminSettings.queuedWingoOutcomes || {}),
        [selectedWingoMode]: []
      }
    });
    showToast(`Queue cleared for WinGo ${selectedWingoMode}`);
  };

  const handleSaveGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGameModal?.title?.trim()) {
      showToast('Game title is required');
      return;
    }
    const existing = adminSettings.games || [];
    const slug =
      editGameModal.slug?.trim() ||
      editGameModal.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (editGameModal.id) {
      const updated = existing.map((g) =>
        g.id === editGameModal.id ? ({ ...g, ...editGameModal, slug } as GameItem) : g
      );
      updateAdminSettings({ games: updated });
      showToast('Game updated successfully!');
    } else {
      const created: GameItem = {
        id: `game_${Date.now()}`,
        slug,
        title: editGameModal.title.trim(),
        imageUrl: editGameModal.imageUrl?.trim() || '',
        category: (editGameModal.category as any) || 'Slots',
        url: editGameModal.url?.trim() || '',
        htmlCode: editGameModal.htmlCode || '',
        badge: editGameModal.badge?.trim() || 'HOT',
        price: editGameModal.price?.trim() || '',
        sortOrder: Number(editGameModal.sortOrder) || existing.length + 1,
        active: editGameModal.active !== false,
        featured: Boolean(editGameModal.featured),
        targetTab: editGameModal.targetTab || 'wingo'
      };
      updateAdminSettings({ games: [...existing, created] });
      showToast('New game added!');
    }
    setEditGameModal(null);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerModal?.url.trim()) {
      showToast('Banner Image URL or upload is required');
      return;
    }
    const cur = adminSettings.banners || [];
    if (!bannerModal.id && cur.length >= 10) {
      showToast('Maximum 10 banners allowed! Edit or delete an existing banner first.');
      return;
    }
    if (bannerModal.id) {
      const next = cur
        .map((b) =>
          b.id === bannerModal.id
            ? {
                ...b,
                title: bannerModal.title.trim() || 'Official Banner',
                url: bannerModal.url.trim(),
                link: bannerModal.link.trim(),
                sortOrder: bannerModal.sortOrder,
                active: bannerModal.active
              }
            : b
        )
        .slice(0, 10);
      updateAdminSettings({ banners: next });
      showToast('Banner updated & synced!');
    } else {
      const created = {
        id: `ban_${Date.now()}`,
        title: bannerModal.title.trim() || 'Official Promotion',
        url: bannerModal.url.trim(),
        link: bannerModal.link.trim(),
        sortOrder: bannerModal.sortOrder,
        active: bannerModal.active
      };
      updateAdminSettings({ banners: [created, ...cur].slice(0, 10) });
      showToast('Banner published to all phones!');
    }
    setBannerModal(null);
  };

  const generateGiftCodeName = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return `EWI777${suffix}`;
  };

  const handleSaveGiftCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftModal) return;
    const codeUpper = giftModal.code.trim().toUpperCase();
    if (!codeUpper) {
      showToast('Gift code cannot be empty');
      return;
    }
    const isDepPct = giftModal.rewardType === 'deposit_percent';
    const depPct = Math.max(1, Number(giftModal.depositBonusPercent) || 200);
    const amt = isDepPct ? depPct : Math.max(1, Number(giftModal.amount) || 0);
    const maxC = Math.max(1, Number(giftModal.maxClaims) || 1);
    const turn = Math.max(0, Number(giftModal.turnoverAmount) || 0);
    const minBal = Math.max(0, Number(giftModal.minRequiredBalance) || 0);
    const expiresAt = giftModal.expiryDate ? new Date(giftModal.expiryDate).getTime() : 0;
    const reasonClean = giftModal.reason.trim() || giftModal.note.trim() || (isDepPct ? `${depPct}% Deposit Bonus` : 'Admin Gift Bonus');

    const existingList = adminSettings.activeGiftCodes;
    const cleanTargetUid = giftModal.targetUid.trim().toUpperCase();
    if (giftModal.isEdit && giftModal.originalCode) {
      const updated = existingList.map((c) =>
        c.code === giftModal.originalCode
          ? {
              ...c,
              code: codeUpper,
              rewardType: giftModal.rewardType,
              amount: amt,
              depositBonusPercent: isDepPct ? depPct : undefined,
              maxClaims: maxC,
              turnoverAmount: turn,
              expiresAt: isNaN(expiresAt) ? 0 : expiresAt,
              minRequiredBalance: minBal,
              targetUid: cleanTargetUid || undefined,
              reason: reasonClean,
              note: giftModal.note.trim() || reasonClean,
              active: giftModal.active
            }
          : c
      );
      updateAdminSettings({ activeGiftCodes: updated });
      showToast(`Gift code ${codeUpper} updated!`);
    } else {
      const created: GiftCodeItem = {
        code: codeUpper,
        rewardType: giftModal.rewardType,
        amount: amt,
        ...(isDepPct ? { depositBonusPercent: depPct } : {}),
        maxClaims: maxC,
        claimedCount: 0,
        turnoverAmount: turn,
        expiresAt: isNaN(expiresAt) ? 0 : expiresAt,
        createdAt: Date.now(),
        claimedBy: [],
        claimRecords: [],
        active: giftModal.active,
        minRequiredBalance: minBal,
        targetUid: cleanTargetUid || undefined,
        reason: reasonClean,
        note: giftModal.note.trim() || reasonClean
      };
      updateAdminSettings({
        activeGiftCodes: [created, ...existingList.filter((c) => c.code !== codeUpper)]
      });
      showToast(`Gift code ${codeUpper} created!`);
    }
    setTargetUserSearch('');
    setGiftModal(null);
  };

  const handleBulkGenerateCodes = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.min(50, Math.max(1, Number(bulkCount) || 1));
    const isDepPct = bulkRewardType === 'deposit_percent';
    const depPct = Math.max(1, Number(bulkDepositPercent) || 200);
    const amt = isDepPct ? depPct : Math.max(1, Number(bulkAmount) || 100);
    const maxC = Math.max(1, Number(bulkMaxClaims) || 1);
    const turn = Math.max(0, Number(bulkTurnover) || 0);
    const reasonClean = bulkReason.trim() || bulkNote.trim() || (isDepPct ? `${depPct}% Deposit Bonus` : 'VIP Gift Reward');
    const generated: GiftCodeItem[] = [];
    for (let i = 0; i < count; i++) {
      generated.push({
        code: generateGiftCodeName(),
        rewardType: bulkRewardType,
        amount: amt,
        ...(isDepPct ? { depositBonusPercent: depPct } : {}),
        maxClaims: maxC,
        claimedCount: 0,
        turnoverAmount: turn,
        createdAt: Date.now() + i,
        claimedBy: [],
        claimRecords: [],
        active: true,
        minRequiredBalance: 0,
        reason: reasonClean,
        note: bulkNote.trim() || reasonClean
      });
    }
    updateAdminSettings({
      activeGiftCodes: [...generated, ...adminSettings.activeGiftCodes]
    });
    setBulkModalOpen(false);
    showToast(`Generated ${count} ${isDepPct ? `${depPct}% Deposit Bonus` : 'Gift'} codes!`);
  };

  const handleResolvePwTicket = async (id: string, matchedPassword: string | null) => {
    const newPass = tempPasswords[id] || matchedPassword || '123456';
    try {
      await fetch(apiUrl('/api/password-requests/resolve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tempPassword: newPass })
      });
    } catch {}
    const updated = pwRequests.map((r) =>
      r.id === id ? { ...r, status: 'resolved', tempPassword: newPass } : r
    );
    setPwRequests(updated);
    localStorage.setItem('ewi777_pw_requests', JSON.stringify(updated));
    showToast(`Password recovery resolved (${newPass})`);
  };

  // =================== LOGIN VIEW ===================
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab(user.isLoggedIn ? 'home' : 'login')}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-95"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="text-[11px] font-bold text-emerald-700">Protected Route</span>
            </div>
          </div>

          <div className="text-center space-y-2.5">
            <div className="inline-flex mx-auto">
              <Ewi777Logo height={68} logoUrl={adminSettings.appLogoUrl} />
            </div>
            <h1 className="font-black text-xl tracking-tight text-slate-900">SUPER CONTROLLER</h1>
            <p className="text-xs text-slate-500">
              Enter Administrator Phone &amp; Password to open EWI 777 Control Center
            </p>
          </div>

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-600" />
                <span>Admin Mobile Number</span>
              </label>
              <input
                type="tel"
                required
                value={adminPhone}
                onChange={(e) => {
                  setAdminPhone(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                placeholder="Enter Admin Phone"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-600" />
                <span>Admin Password</span>
              </label>
              <div className="relative">
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  required
                  value={adminPass}
                  onChange={(e) => {
                    setAdminPass(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="Enter Admin Password"
                  className="w-full px-4 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass((p) => !p)}
                  aria-label={showAdminPass ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1"
                >
                  {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingLogin}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-sm active:scale-98 transition-all hover:brightness-105 disabled:opacity-60"
            >
              {isVerifyingLogin ? 'Verifying...' : 'Open Super Controller'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =================== FILTERED LISTS ===================
  const filteredUsers = allUsers.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (u.nickname || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q) ||
      (u.lastIp || '').toLowerCase().includes(q) ||
      (u.registeredIp || '').toLowerCase().includes(q) ||
      (u.ipCountry || '').toLowerCase().includes(q) ||
      (u.ipIsp || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;
    const role = u.role || (u.vipLevel > 0 ? 'VIP' : 'USER');
    if (userRoleFilter === 'ALL') return true;
    if (userRoleFilter === 'BANNED') return Boolean(u.isBanned);
    return role === userRoleFilter;
  });

  const filteredGames = gamesList
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((g) => {
      const q = gameSearch.trim().toLowerCase();
      return !q || g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
    });

  const filteredDeposits = depositRequests.filter((d) => {
    const q = depSearch.trim().toLowerCase();
    const matchesQ =
      !q ||
      (d.userPhone || '').toLowerCase().includes(q) ||
      (d.trxId || '').toLowerCase().includes(q) ||
      (d.senderNumber || '').toLowerCase().includes(q) ||
      (d.orderId || '').toLowerCase().includes(q) ||
      (d.sessionId || '').toLowerCase().includes(q) ||
      (d.id || '').toLowerCase().includes(q);
    if (!matchesQ) return false;
    if (depFilter === 'all') return true;
    return d.status === depFilter;
  });

  const filteredWithdraws = withdrawRequests.filter((w) => {
    if (wdFilter === 'all') return true;
    return w.status === wdFilter;
  });

  const filteredGiftCodes = adminSettings.activeGiftCodes.filter((c) => {
    const q = giftSearch.trim().toLowerCase();
    return (
      !q ||
      c.code.toLowerCase().includes(q) ||
      (c.note || '').toLowerCase().includes(q) ||
      (c.reason || '').toLowerCase().includes(q) ||
      (c.targetUid || '').toLowerCase().includes(q)
    );
  });

  const navItems: Array<{ id: AdminNavTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'All Users', icon: <Users className="w-4 h-4" /> },
    { id: 'games', label: 'Games', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'wingo', label: 'Wingo Engine', icon: <Flame className="w-4 h-4" /> },
    { id: 'banners', label: 'Banners', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'deposits', label: 'Deposits', icon: <ArrowDownCircle className="w-4 h-4" />, badge: pendingDepCount || undefined },
    { id: 'withdraws', label: 'Withdraws', icon: <ArrowUpCircle className="w-4 h-4" />, badge: pendingWdCount || undefined },
    { id: 'giftcodes', label: 'Gift Codes', icon: <Gift className="w-4 h-4" /> },
    { id: 'support', label: 'Support Chat', icon: <MessageSquare className="w-4 h-4" />, badge: unansweredSupportCount || undefined },
    { id: 'access_logs', label: 'IP & Entry Logs', icon: <Globe className="w-4 h-4" />, badge: adminAccessLogs.length || undefined },
    { id: 'settings', label: 'App Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const tabTitles: Record<AdminNavTab, string> = {
    dashboard: 'DASHBOARD',
    users: 'ALL USERS',
    games: 'GAMES MANAGEMENT',
    wingo: 'WINGO ENGINE',
    banners: 'BANNERS',
    broadcast: 'SYSTEM BROADCAST',
    deposits: 'DEPOSITS',
    withdraws: 'WITHDRAWS',
    giftcodes: 'GIFT CODES',
    support: 'SUPPORT CHAT INBOX',
    access_logs: 'VISITOR IP & ENTRY TIMELINE',
    settings: 'APP SETTINGS'
  };

  // Current WinGo Market Data
  const activeMarket = wingoMarkets[selectedWingoMode];
  const latestWingoResult = activeMarket?.history?.[0];
  const activePeriod = activeMarket?.period || '';
  const activeRem = activeMarket?.timeRemaining || 0;
  const activeQueue = adminSettings.queuedWingoOutcomes?.[selectedWingoMode] || [];
  const forcedSetting =
    adminSettings.nextWingoOutcomes?.[selectedWingoMode] ??
    adminSettings.nextWingoOutcome ??
    'AUTO';

  const getBallBg = (num: number) => {
    if (num === 0) return 'bg-gradient-to-br from-rose-500 to-purple-600';
    if (num === 5) return 'bg-gradient-to-br from-emerald-500 to-purple-600';
    if ([1, 3, 7, 9].includes(num)) return 'bg-emerald-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row font-sans">
      {/* =================== LEFT FIXED SIDEBAR (DESKTOP) =================== */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 z-30">
        {/* Brand Box */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0">
              <Ewi777Logo height={44} logoUrl={adminSettings.appLogoUrl} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black tracking-wider text-slate-900 truncate">
                CONTROLLER
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Synced Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const active = navTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNavTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab(user.isLoggedIn ? 'home' : 'login')}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to App</span>
          </button>
          <button
            type="button"
            onClick={adminLogout}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-black flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =================== MAIN CONTENT AREA =================== */}
      <div className="flex-1 md:pl-60 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab(user.isLoggedIn ? 'home' : 'login')}
              className="md:hidden p-1.5 rounded-lg bg-slate-100 text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-base md:text-lg font-black tracking-wider bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] bg-clip-text text-transparent">
              {tabTitles[navTab]}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">{nowStr}</span>
            <button
              type="button"
              onClick={adminLogout}
              className="md:hidden px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Nav Strip */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto px-3 py-2 bg-white border-b border-slate-200 no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setNavTab(item.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold ${
                navTab === item.id
                  ? 'bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 rounded-full bg-rose-600 text-white text-[9px] font-black">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* =================== TAB BODY =================== */}
        <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1400px] w-full mx-auto">
          {/* ---------------- 1. DASHBOARD ---------------- */}
          {navTab === 'dashboard' && (
            <div className="space-y-5">
              {/* Row 1 KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider">TOTAL USERS</div>
                  <div className="text-2xl font-black text-cyan-700 font-mono mt-1">{allUsers.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider">TOTAL GAMES</div>
                  <div className="text-2xl font-black text-cyan-700 font-mono mt-1">{gamesList.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider">TOTAL BALANCE</div>
                  <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                    ৳{totalUserBalance.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider">BANNED USERS</div>
                  <div className="text-2xl font-black text-rose-500 font-mono mt-1">{bannedCount}</div>
                </div>
              </div>

              {/* Row 2 KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider">PENDING DEP</div>
                  <div className="text-2xl font-black text-cyan-700 font-mono mt-1">{pendingDepCount}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider">PENDING WD</div>
                  <div className="text-2xl font-black text-rose-600 font-mono mt-1">{pendingWdCount}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider">GIFT CLAIMED ৳</div>
                  <div className="text-2xl font-black text-cyan-700 font-mono mt-1">
                    ৳{giftClaimedTotal.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider">ACTIVE BANNERS</div>
                  <div className="text-2xl font-black text-cyan-700 font-mono mt-1">{activeBannersCount}</div>
                </div>
              </div>

              {/* Row 3 Recent Activity Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Deposits */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-cyan-700 tracking-wider">↘ RECENT DEPOSITS</h3>
                    <button
                      type="button"
                      onClick={() => setNavTab('deposits')}
                      className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {depositRequests.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">No deposits yet</div>
                    ) : (
                      depositRequests.slice(0, 8).map((d) => (
                        <div
                          key={d.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{d.userPhone || d.senderNumber}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ৳{d.amount.toFixed(2)} • {d.method}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              d.status === 'approved'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                : d.status === 'rejected'
                                ? 'bg-rose-50 border border-rose-200 text-rose-600'
                                : 'bg-cyan-50 text-cyan-700'
                            }`}
                          >
                            {d.status === 'approved' ? 'COMPLETE' : d.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Withdraws */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-rose-600 tracking-wider">↗ RECENT WITHDRAWS</h3>
                    <button
                      type="button"
                      onClick={() => setNavTab('withdraws')}
                      className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {withdrawRequests.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">No withdraws yet</div>
                    ) : (
                      withdrawRequests.slice(0, 8).map((w) => (
                        <div
                          key={w.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{w.userName || w.userPhone}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ৳{w.amount.toFixed(2)} • {w.method}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              w.status === 'completed'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                : w.status === 'rejected'
                                ? 'bg-rose-50 border border-rose-200 text-rose-600'
                                : w.status === 'processing'
                                ? 'bg-cyan-500/20 text-cyan-700'
                                : 'bg-blue-500/20 text-cyan-700'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Gift Claims */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-cyan-700 tracking-wider">🎁 RECENT GIFT CLAIMS</h3>
                    <button
                      type="button"
                      onClick={() => setNavTab('giftcodes')}
                      className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {recentGiftClaims.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">No gift claims yet</div>
                    ) : (
                      recentGiftClaims.map((rc, i) => (
                        <div
                          key={`${rc.code}_${i}`}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{rc.nickname || rc.contact}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{rc.code}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-700 text-[10px] font-black font-mono">
                            +৳{rc.amount.toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Live Admin Panel Visitor IP & Entry Duration Feed */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-700" />
                    <h3 className="text-xs font-black text-cyan-700 tracking-wider uppercase">
                      RECENT ADMIN VISITORS (IP & ENTRY TIME)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNavTab('access_logs')}
                    className="text-[10px] text-slate-700 hover:text-cyan-700 font-bold px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    Open Full IP Monitor ({adminAccessLogs.length}) →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {adminAccessLogs.length === 0 ? (
                    <div className="col-span-full text-xs text-slate-500 py-5 text-center">
                      No IP access entries recorded yet.
                    </div>
                  ) : (
                    adminAccessLogs.slice(0, 6).map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-black text-slate-900 flex items-center gap-1.5">
                            <span className="text-cyan-700">{log.ip}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            Entry: {log.enteredAt}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              log.action === 'login_success'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                : log.action === 'login_failed'
                                ? 'bg-rose-50 border border-rose-200 text-rose-600'
                                : log.action === 'login_step1'
                                ? 'bg-cyan-50 text-cyan-700'
                                : 'bg-blue-500/20 text-cyan-700'
                            }`}
                          >
                            {log.action.replace('_', ' ')}
                          </span>
                          <div className="text-[10px] text-cyan-700 font-mono font-bold mt-1">
                            {formatElapsedDuration(log.enteredAtMs, nowMs)} • Stay {formatStaySeconds(log.staySeconds, log.lastSeenAtMs, log.enteredAtMs)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- 2. ALL USERS ---------------- */}
          {navTab === 'users' && (
            <div className="space-y-4">
              {/* Filter & Actions Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search user..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-cyan-400"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="ALL">All Users</option>
                    <option value="USER">USER</option>
                    <option value="VIP">VIP</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="BANNED">BANNED</option>
                  </select>
                  <span className="text-xs text-slate-500 font-mono">{filteredUsers.length} registered</span>
                </div>

                <button
                  onClick={handleExportUsersCsv}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-black text-slate-900 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-700" />
                  <span>EXPORT CSV</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">USER</th>
                        <th className="px-4 py-3">UID</th>
                        <th className="px-4 py-3">PASSWORD</th>
                        <th className="px-4 py-3">BALANCE</th>
                        <th className="px-4 py-3">DEPOSIT</th>
                        <th className="px-4 py-3">WITHDRAW</th>
                        <th className="px-4 py-3">ROLE</th>
                        <th className="px-4 py-3">JOINED</th>
                        <th className="px-4 py-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-500">
                            No users match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const role = u.role || (u.vipLevel > 0 ? 'VIP' : 'USER');
                          return (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white font-black text-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {u.avatar ? (
                                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      (u.nickname || 'U')[0].toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                                      <span>{u.nickname}</span>
                                      {u.isBanned && (
                                        <span className="px-1.5 py-0.2 rounded bg-rose-600 text-[9px] text-white font-black">
                                          BANNED
                                        </span>
                                      )}
                                      {u.isVpn && (
                                        <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 border border-rose-500/50 text-[9px] text-rose-700 font-black">
                                          VPN
                                        </span>
                                      )}
                                      {(() => {
                                        const ipCount = getUserIpClusterCount(u);
                                        if (ipCount < 2) return null;
                                        return (
                                          <span className="px-1.5 py-0.2 rounded bg-cyan-50 border border-cyan-300 text-[9px] text-cyan-700 font-black tabular-nums">
                                            {ipCount} IDs on IP
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {u.phone || u.email || u.id}
                                      {(u.lastIp || u.registeredIp) && (
                                        <span className="ml-1.5 text-cyan-700/80">
                                          · {u.lastIp || u.registeredIp}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-700">{u.uid}</td>
                              <td className="px-4 py-3 font-mono">
                                {u.loginPassword ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(u.loginPassword || '').catch(() => {});
                                      showToast(`Copied password for ${u.uid}`);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-cyan-700 text-[11px] font-bold"
                                    title="Click to copy password"
                                  >
                                    <span>{u.loginPassword}</span>
                                    <Copy className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono font-black text-cyan-700">
                                ৳{Number(u.balance || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                                ৳{Number(u.totalDeposited || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-rose-600">
                                ৳{Number(u.totalWithdrawn || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                    role === 'ADMIN'
                                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                      : role === 'VIP'
                                      ? 'bg-cyan-50 text-cyan-700'
                                      : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                  }`}
                                >
                                  {role}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                                {(u.createdAt || u.lastLogin || '').slice(0, 10) || '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setControlUser(u);
                                      setTurnoverDraft(String(u.turnoverRequired || 0));
                                    }}
                                    className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white active:scale-95"
                                    title="User Control"
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setBalanceModalUser(u);
                                      setBalAction('add');
                                      setBalAmount('');
                                      setBalReason('');
                                      setBalLocked(false);
                                      setBalTurnover('');
                                    }}
                                    className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white active:scale-95"
                                    title="Modify Balance"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- 3. GAMES MANAGEMENT ---------------- */}
          {navTab === 'games' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={gameSearch}
                      onChange={(e) => setGameSearch(e.target.value)}
                      placeholder="Search game..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-cyan-400"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{filteredGames.length} games</span>
                </div>

                <button
                  onClick={() =>
                    setEditGameModal({
                      title: '',
                      imageUrl: '',
                      category: 'Slots',
                      url: '',
                      htmlCode: '',
                      badge: 'HOT',
                      price: '',
                      sortOrder: gamesList.length + 1,
                      active: true,
                      featured: false
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD GAME</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">LOGO</th>
                        <th className="px-4 py-3">NAME</th>
                        <th className="px-4 py-3">CATEGORY</th>
                        <th className="px-4 py-3">STATUS</th>
                        <th className="px-4 py-3">FEATURED</th>
                        <th className="px-4 py-3 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredGames.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 border border-slate-200 flex items-center justify-center overflow-hidden font-black text-xs text-slate-900">
                              {g.imageUrl ? (
                                <img src={g.imageUrl} alt={g.title} className="w-full h-full object-cover" />
                              ) : (
                                g.title.slice(0, 2).toUpperCase()
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{g.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono">/{g.slug}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                              {g.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                                g.active
                                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                  : 'bg-rose-50 border border-rose-200 text-rose-600'
                              }`}
                            >
                              {g.active ? 'LIVE' : 'OFFLINE'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {g.featured ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-700 text-[10px] font-black">
                                ★ FEATURED
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setHtmlModalGame(g)}
                                className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white"
                                title="View HTML Source"
                              >
                                <Code2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditGameModal({ ...g })}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
                                title="Edit Game"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const next = gamesList.map((item) =>
                                    item.id === g.id ? { ...item, featured: !item.featured } : item
                                  );
                                  updateAdminSettings({ games: next });
                                  showToast(!g.featured ? 'Featured ★' : 'Unfeatured');
                                }}
                                className={`p-2 rounded-lg ${
                                  g.featured
                                    ? 'bg-cyan-100 text-cyan-700'
                                    : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                                }`}
                                title="Toggle Featured"
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const next = gamesList.map((item) =>
                                    item.id === g.id ? { ...item, active: !item.active } : item
                                  );
                                  updateAdminSettings({ games: next });
                                  showToast(!g.active ? 'LIVE' : 'OFFLINE');
                                }}
                                className={`p-2 rounded-lg ${
                                  g.active
                                    ? 'bg-emerald-600/25 text-emerald-700'
                                    : 'bg-rose-600/25 text-rose-700'
                                }`}
                                title="Toggle Live / Offline"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const next = gamesList.filter((item) => item.id !== g.id);
                                  updateAdminSettings({ games: next });
                                  showToast('Game deleted');
                                }}
                                className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                                title="Delete Game"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- 4. WINGO ENGINE ---------------- */}
          {navTab === 'wingo' && (
            <div className="space-y-4">
              {/* Top Sync Path Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-black text-cyan-700 tracking-wider">⚡ USER APP SYNC PATH</div>
                <div className="text-[11px] text-slate-500">
                  Live market synchronization for WinGo 30s, 1m, 3m, and 5m. Set instant or queued outcomes below.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={wingoSyncPath}
                    onChange={(e) => setWingoSyncPath(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateAdminSettings({ wingoSyncPath });
                      showToast('Sync path saved!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black"
                  >
                    SAVE PATH
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const t0 = performance.now();
                      try {
                        const r = await fetch(apiUrl('/api/settings'), { cache: 'no-store' });
                        const ct = r.headers.get('content-type') || '';
                        const ms = Math.round(performance.now() - t0);
                        showToast(r.ok && ct.includes('application/json') ? `Sync live OK (${ms}ms)` : `Firebase Sync Active (${ms}ms)`);
                      } catch {
                        showToast('Sync endpoint unreachable');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-500/40 text-emerald-700 text-xs font-black"
                  >
                    TEST WRITE
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSyncDataModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-700 text-xs font-black"
                  >
                    VIEW DATA
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                  {['wingo/30s', 'wingo/1m', 'wingo/3m', 'wingo/5m', 'wingo/data'].map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-cyan-50 border border-blue-800/60 text-cyan-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mode Selector Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-500">WINGO TYPE:</span>
                  <select
                    value={selectedWingoMode}
                    onChange={(e) => setSelectedWingoMode(e.target.value as WinGoMode)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="30s">Wingo 30s</option>
                    <option value="1m">Wingo 1 Minute</option>
                    <option value="3m">Wingo 3 Minutes</option>
                    <option value="5m">Wingo 5 Minutes</option>
                  </select>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      forcedSetting === 'AUTO'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                        : 'bg-cyan-50 text-cyan-700'
                    }`}
                  >
                    {forcedSetting === 'AUTO' ? 'AUTO' : `FORCED: ${forcedSetting}`}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-500">Tick: {tickStr}</span>
              </div>

              {/* Dual Column: Force Result Now + Queue Next Result */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Force Result Now */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-slate-900">⚡ FORCE RESULT NOW</div>
                    <span className="text-[10px] text-slate-500">Instant Sync to App</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CURRENT RESULT</div>
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg ${getBallBg(
                            latestWingoResult?.number ?? 0
                          )}`}
                        >
                          {latestWingoResult?.number ?? 0}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">PERIOD ID</div>
                        <div className="text-sm font-mono font-black text-cyan-700">{activePeriod}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          NEXT IN:{' '}
                          <span className="text-rose-600 font-black">
                            {String(Math.floor(activeRem / 60)).padStart(2, '0')}:
                            {String(activeRem % 60).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-center min-w-[72px]">
                      <div className="text-[9px] font-black text-purple-700 uppercase">QUEUED</div>
                      <div className="text-sm font-mono font-black text-slate-900 mt-0.5">
                        {activeQueue.length > 0 ? activeQueue[0] : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Quick Color Force */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleForceOutcome('RED')}
                      className={`py-2.5 rounded-xl font-black text-xs text-white transition-all ${
                        forcedSetting === 'RED'
                          ? 'bg-rose-600 ring-2 ring-rose-300'
                          : 'bg-rose-600/80 hover:bg-rose-600'
                      }`}
                    >
                      🔴 RED NOW
                    </button>
                    <button
                      onClick={() => handleForceOutcome('GREEN')}
                      className={`py-2.5 rounded-xl font-black text-xs text-white transition-all ${
                        forcedSetting === 'GREEN'
                          ? 'bg-emerald-600 ring-2 ring-emerald-300'
                          : 'bg-emerald-600/80 hover:bg-emerald-600'
                      }`}
                    >
                      🟢 GREEN NOW
                    </button>
                    <button
                      onClick={() => handleForceOutcome('VIOLET')}
                      className={`py-2.5 rounded-xl font-black text-xs text-white transition-all ${
                        forcedSetting === 'VIOLET'
                          ? 'bg-purple-600 ring-2 ring-purple-300'
                          : 'bg-purple-600/80 hover:bg-purple-600'
                      }`}
                    >
                      🟣 VIOLET NOW
                    </button>
                  </div>

                  {/* Force Exact Number */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                      FORCE EXACT NUMBER (OR RESET AUTO)
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                          key={n}
                          onClick={() => handleForceOutcome(n)}
                          className={`py-2.5 rounded-xl font-mono font-black text-sm border transition-all ${
                            forcedSetting === n
                              ? 'bg-cyan-600 border-cyan-300 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-cyan-500'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleForceOutcome('AUTO')}
                      className={`mt-2 w-full py-2 rounded-xl font-black text-xs border transition-all ${
                        forcedSetting === 'AUTO'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      ↺ RESET TO AUTO (LEAST-BET / LIVE ENGINE)
                    </button>
                  </div>
                </div>

                {/* Right: Queue Next Result */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-slate-900">⏱ QUEUE NEXT RESULT</div>
                    <span className="text-[10px] text-slate-500">Auto Applies on Next Shift</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        onClick={() => handleQueueNumber(n)}
                        className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-400 font-mono font-black text-sm text-slate-900 active:scale-95"
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  {activeQueue.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-purple-700 mr-1">QUEUE:</span>
                      {activeQueue.map((qNum, i) => (
                        <span
                          key={i}
                          className={`w-6 h-6 rounded-full text-xs font-black text-white flex items-center justify-center ${getBallBg(
                            qNum
                          )}`}
                        >
                          {qNum}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleClearQueue}
                    className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-black"
                  >
                    ✕ CLEAR QUEUE
                  </button>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">MODE</label>
                      <select
                        value={forcedSetting === 'AUTO' ? 'Auto' : 'Manual'}
                        onChange={(e) => {
                          if (e.target.value === 'Auto') {
                            handleForceOutcome('AUTO');
                          } else if (forcedSetting === 'AUTO') {
                            handleForceOutcome('GREEN');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                      >
                        <option value="Auto">Auto</option>
                        <option value="Manual">Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        PERIOD (sec)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={activeMarket?.durationSeconds || 60}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">PATTERN</label>
                      <input
                        type="text"
                        value={wingoPattern}
                        onChange={(e) => setWingoPattern(e.target.value)}
                        onBlur={() => updateAdminSettings({ wingoPattern })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Bet Distribution Monitor (All Connected Phones Real-Time Pool) */}
              {(() => {
                const mergedRoundMap = new Map<string, WinGoBet>();
                [...globalWingoBets, ...bets].forEach((b) => {
                  if (b.periodNumber === activePeriod && b.mode === selectedWingoMode && b.status === 'pending') {
                    mergedRoundMap.set(b.id, b);
                  }
                });
                const roundBets = Array.from(mergedRoundMap.values());
                const totalRoundPool = roundBets.reduce((acc, b) => acc + b.totalAmount, 0);

                const numAmounts: Record<number, { amount: number; count: number }> = {};
                for (let i = 0; i <= 9; i++) {
                  const matching = roundBets.filter((b) => b.type === 'number' && Number(b.value) === i);
                  numAmounts[i] = {
                    amount: matching.reduce((acc, b) => acc + b.totalAmount, 0),
                    count: matching.length
                  };
                }

                const greenBets = roundBets.filter((b) => b.type === 'color' && b.value === 'green');
                const violetBets = roundBets.filter((b) => b.type === 'color' && b.value === 'violet');
                const redBets = roundBets.filter((b) => b.type === 'color' && b.value === 'red');
                const bigBets = roundBets.filter((b) => b.type === 'size' && b.value === 'big');
                const smallBets = roundBets.filter((b) => b.type === 'size' && b.value === 'small');

                const greenAmt = greenBets.reduce((acc, b) => acc + b.totalAmount, 0);
                const violetAmt = violetBets.reduce((acc, b) => acc + b.totalAmount, 0);
                const redAmt = redBets.reduce((acc, b) => acc + b.totalAmount, 0);
                const bigAmt = bigBets.reduce((acc, b) => acc + b.totalAmount, 0);
                const smallAmt = smallBets.reduce((acc, b) => acc + b.totalAmount, 0);

                const smartLeastNum = getLeastBetWinningNumber(roundBets);

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-cyan-700">
                          LIVE BET POOL — WINGO {selectedWingoMode.toUpperCase()} (৳{totalRoundPool.toFixed(2)})
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {roundBets.length} live bets across all mobile devices • Period {activePeriod}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-black">
                          {totalRoundPool === 0 ? 'Random (৳0 Pool)' : `Smart Least Target: #${smartLeastNum}`}
                        </span>
                        <button
                          onClick={() => syncServerDataNow()}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-cyan-700"
                          title="Sync Live Bets Now"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Color Pool Breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col">
                        <span className="text-[10px] font-bold text-emerald-700">GREEN ({greenBets.length})</span>
                        <span className="font-black text-slate-900 text-sm mt-0.5">৳{greenAmt.toFixed(0)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-col">
                        <span className="text-[10px] font-bold text-purple-700">VIOLET ({violetBets.length})</span>
                        <span className="font-black text-slate-900 text-sm mt-0.5">৳{violetAmt.toFixed(0)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col">
                        <span className="text-[10px] font-bold text-rose-700">RED ({redBets.length})</span>
                        <span className="font-black text-slate-900 text-sm mt-0.5">৳{redAmt.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Big / Small Pool Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                        <span className="text-cyan-700 font-bold">BIG 5-9 ({bigBets.length})</span>
                        <span className="font-black text-slate-900">৳{bigAmt.toFixed(0)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                        <span className="text-cyan-700 font-bold">SMALL 0-4 ({smallBets.length})</span>
                        <span className="font-black text-slate-900">৳{smallAmt.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Numbers 0-9 Breakdown (Click any number to Force Result) */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                        NUMBERS 0-9 WAGERED (CLICK TO FORCE)
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center font-mono">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <button
                            key={n}
                            onClick={() => handleForceOutcome(n)}
                            className={`p-2 rounded-xl border transition-all active:scale-95 ${
                              forcedSetting === n
                                ? 'bg-cyan-50 border-cyan-400'
                                : n === smartLeastNum && totalRoundPool > 0
                                ? 'bg-cyan-50 border-cyan-500'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-600'
                            }`}
                          >
                            <div className="font-black text-slate-900">{n}</div>
                            <div className="text-[10px] text-cyan-700 font-bold">৳{numAmounts[n]?.amount || 0}</div>
                            <div className="text-[9px] text-slate-500">{numAmounts[n]?.count || 0}x</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Mobile Bettors Feed */}
                    {roundBets.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1.5 max-h-48 overflow-y-auto">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                          ACTIVE MOBILE BETS ({roundBets.length})
                        </div>
                        {roundBets.map((rb) => (
                          <div
                            key={rb.id}
                            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900">{rb.userPhone || rb.nickname || 'Player'}</span>
                              <span className="mx-1.5 text-slate-600">•</span>
                              <span className="font-black uppercase text-cyan-700">
                                {rb.type}: {String(rb.value).toUpperCase()}
                              </span>
                            </div>
                            <div className="font-mono font-black text-cyan-700 flex-shrink-0">
                              ৳{rb.totalAmount.toFixed(0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 4-MODE MARKET & GAME ENGINE CONTROLLER + BINARY NEXT CANDLE PREVIEW */}
              {(() => {
                const goldSpec = BINARY_MARKET_MAP['XAU/USD'];
                const btcSpec = BINARY_MARKET_MAP['BTC/USDT'];
                const goldNext = goldSpec
                  ? getNextBinaryCandlePreview(goldSpec, binaryBiasDraft, nowMs, tzOffsetDraft)
                  : null;
                const btcNext = btcSpec
                  ? getNextBinaryCandlePreview(btcSpec, binaryBiasDraft, nowMs, tzOffsetDraft)
                  : null;
                const controlOptions: Array<{ value: MarketControlMode; label: string }> = [
                  { value: 'AUTO', label: 'AUTO (Balanced RNG)' },
                  { value: 'HIGH_BET_LOSS', label: 'HIGH BET LOSS (Low Side Wins)' },
                  { value: 'HIGH_BET_WIN', label: 'HIGH BET WIN (Heavy Side Wins)' },
                  { value: 'LOW_BET_WIN', label: 'LOW BET WIN (Minority Side Wins)' },
                  { value: 'LOW_BET_LOSS', label: 'LOW BET LOSS (Minority Side Loses)' }
                ];

                return (
                  <div className="bg-white border border-cyan-200 rounded-2xl p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-black text-cyan-700 tracking-wider">
                          4-MODE MARKET &amp; GAME ENGINE CONTROLLER
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Control EWI K3, EWI 5D, Mines 777, Binary &amp; Gold Market, and Coin Flip live payout pools.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-emerald-600">
                        Live Pool Sync ({Object.keys(marketPools || {}).length} active pools)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">EWI K3 MODE</label>
                        <select
                          value={ctrlK3}
                          onChange={(e) => setCtrlK3(e.target.value as MarketControlMode)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                        >
                          {controlOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">EWI 5D MODE</label>
                        <select
                          value={ctrlD5}
                          onChange={(e) => setCtrlD5(e.target.value as MarketControlMode)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                        >
                          {controlOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">MINES 777 MODE</label>
                        <select
                          value={ctrlMines}
                          onChange={(e) => setCtrlMines(e.target.value as MarketControlMode)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                        >
                          {controlOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">BINARY &amp; GOLD MODE</label>
                        <select
                          value={ctrlBinary}
                          onChange={(e) => setCtrlBinary(e.target.value as MarketControlMode)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                        >
                          {controlOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">COIN FLIP MODE</label>
                        <select
                          value={ctrlCoinFlip}
                          onChange={(e) => setCtrlCoinFlip(e.target.value as MarketControlMode)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                        >
                          {controlOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">MINES PATTERN</label>
                        <select
                          value={minesPatternDraft}
                          onChange={(e) => setMinesPatternDraft(e.target.value as MinesPatternMode)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-cyan-700 font-bold"
                        >
                          <option value="RANDOM">RANDOM (Fair / 4-Mode)</option>
                          <option value="FIRST_WIN_SECOND_LOSS">1st Safe → 2nd Boom</option>
                          <option value="THREE_WIN_TEN_LOSS">3 Win Rounds → 10 Loss Rounds</option>
                        </select>
                      </div>
                    </div>

                    {/* Binary Next Candle Bias + Live Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-end bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          BINARY NEXT CANDLE BIAS
                        </label>
                        <select
                          value={binaryBiasDraft}
                          onChange={(e) => setBinaryBiasDraft(e.target.value as 'AUTO' | 'BULL' | 'BEAR')}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-xs"
                        >
                          <option value="AUTO">AUTO (Natural Chart)</option>
                          <option value="BULL">FORCE BULL (Green Up)</option>
                          <option value="BEAR">FORCE BEAR (Red Down)</option>
                        </select>
                      </div>

                      {goldNext && (
                        <div className="p-2.5 rounded-xl bg-white border border-amber-500/25 flex items-center justify-between text-xs">
                          <div>
                            <div className="text-[10px] font-bold text-cyan-700">
                              NEXT XAU/USD CANDLE ({goldNext.timeLabel} {formatOffsetLabel(tzOffsetDraft)})
                            </div>
                            <div className="text-[11px] font-mono text-slate-700 mt-0.5">
                              O: {goldNext.open.toFixed(2)} → C: {goldNext.close.toFixed(2)}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-lg font-black text-[11px] ${
                              goldNext.direction === 'BULL'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                : 'bg-rose-50 border border-rose-200 text-rose-600'
                            }`}
                          >
                            {goldNext.direction === 'BULL' ? '▲ BULL GREEN' : '▼ BEAR RED'} ({goldNext.secUntilNext}s)
                          </span>
                        </div>
                      )}

                      {btcNext && (
                        <div className="p-2.5 rounded-xl bg-white border border-cyan-500/25 flex items-center justify-between text-xs">
                          <div>
                            <div className="text-[10px] font-bold text-cyan-700">
                              NEXT BTC/USDT CANDLE ({btcNext.timeLabel})
                            </div>
                            <div className="text-[11px] font-mono text-slate-700 mt-0.5">
                              O: {btcNext.open.toFixed(2)} → C: {btcNext.close.toFixed(2)}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-lg font-black text-[11px] ${
                              btcNext.direction === 'BULL'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                : 'bg-rose-50 border border-rose-200 text-rose-600'
                            }`}
                          >
                            {btcNext.direction === 'BULL' ? '▲ BULL GREEN' : '▼ BEAR RED'}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateAdminSettings({
                          gameControlModes: {
                            k3: ctrlK3,
                            d5: ctrlD5,
                            mines: ctrlMines,
                            binary: ctrlBinary,
                            coinflip: ctrlCoinFlip
                          },
                          minesPattern: minesPatternDraft,
                          binaryNextCandleBias: binaryBiasDraft
                        })
                      }
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] hover:brightness-110 text-white font-black text-xs shadow-md"
                    >
                      SAVE ENGINE CONTROLS &amp; APPLY LIVE
                    </button>
                  </div>
                );
              })()}

              {/* CRASH GAME CONTROLS (AVIATOR PLANE / LUCKY JET / PLANE) */}
              {(() => {
                const st = crashLiveData?.state;
                const pl = crashLiveData?.pool;
                const activeBets = Array.isArray(pl?.bets)
                  ? pl.bets.filter((b: any) => b.status === 'active')
                  : [];
                const phase = st?.phase || 'waiting';
                const crashHistory: number[] = Array.isArray(st?.crashHistory) ? st.crashHistory : [];
                const gameTabs: Array<{ id: 'aviator' | 'luckyjet' | 'plane'; label: string }> = [
                  { id: 'aviator', label: 'Aviator Plane' },
                  { id: 'luckyjet', label: 'Lucky Jet' },
                  { id: 'plane', label: 'PLANE' }
                ];

                return (
                  <div className="bg-white border border-cyan-500/30 rounded-2xl p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Rocket className="w-4 h-4 text-cyan-700" />
                        <div>
                          <h3 className="text-xs font-black text-cyan-700 tracking-wider">
                            CRASH GAME LIVE CONTROLS
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Monitor active bet pools and trigger instant round crash across Aviator Plane, Lucky Jet &amp; PLANE.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        {gameTabs.map((gt) => (
                          <button
                            key={gt.id}
                            type="button"
                            onClick={() => setCrashControlGame(gt.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
                              crashControlGame === gt.id
                                ? 'bg-cyan-500/20 text-cyan-700 border border-cyan-400/40'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            {gt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">PHASE</div>
                        <div
                          className={`text-xs font-black mt-1 uppercase ${
                            phase === 'flying'
                              ? 'text-emerald-600'
                              : phase === 'crashed'
                              ? 'text-rose-600'
                              : 'text-cyan-700'
                          }`}
                        >
                          {phase}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">MULTIPLIER</div>
                        <div className="text-sm font-mono font-black text-cyan-700 tabular-nums mt-0.5">
                          {Number(st?.currentMultiplier || 1).toFixed(2)}x
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">ROUND POOL</div>
                        <div className="text-sm font-mono font-black text-slate-900 tabular-nums mt-0.5">
                          ৳{Number(pl?.totalPool || st?.totalPool || 0).toFixed(0)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">PAID OUT</div>
                        <div className="text-sm font-mono font-black text-cyan-700 tabular-nums mt-0.5">
                          ৳{Number(pl?.totalPaidOut || st?.totalPaidOut || 0).toFixed(0)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">ACTIVE BETS</div>
                        <div className="text-sm font-mono font-black text-emerald-600 tabular-nums mt-0.5">
                          {activeBets.length}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] font-mono text-slate-500">
                        Round ID: <span className="text-slate-800 font-bold">{st?.roundId || '—'}</span>
                        {phase === 'waiting' && st?.countdownRemaining !== undefined && (
                          <span className="ml-2 text-cyan-700">· Takeoff in {Number(st.countdownRemaining).toFixed(1)}s</span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={phase !== 'flying' || isCrashForcing}
                        onClick={handleForceCrashNow}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-100 disabled:text-slate-500 text-white text-xs font-black whitespace-nowrap transition-all active:scale-95"
                      >
                        {isCrashForcing
                          ? 'Crashing...'
                          : phase === 'flying'
                          ? `Force Crash ${crashControlGame.toUpperCase()} Now`
                          : 'Waiting for Flight'}
                      </button>
                    </div>

                    {crashHistory.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 mr-1">RECENT:</span>
                        {crashHistory.slice(0, 10).map((m, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black tabular-nums ${
                              m >= 2
                                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-700 border border-rose-500/30'
                            }`}
                          >
                            {Number(m).toFixed(2)}x
                          </span>
                        ))}
                      </div>
                    )}

                    {activeBets.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1.5 max-h-40 overflow-y-auto">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                          LIVE {crashControlGame.toUpperCase()} BETTORS ({activeBets.length})
                        </div>
                        {activeBets.map((b: any) => (
                          <div
                            key={b.id}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-800 truncate">
                              {b.nickname || b.userId}
                            </span>
                            <span className="font-mono font-black text-cyan-700 tabular-nums">
                              ৳{Number(b.amount || 0).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ---------------- 5. BANNERS ---------------- */}
          {navTab === 'banners' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-slate-500 font-mono">
                  {(adminSettings.banners || []).length} / 10 banners (Synced to All Phones)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      updateAdminSettings({
                        banners: DEFAULT_BANNERS,
                        bannersCustomized: false
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-cyan-700 text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>RESTORE 3 DEFAULT</span>
                  </button>
                  <button
                    onClick={() => {
                      if ((adminSettings.banners || []).length >= 10) {
                        showToast('Maximum 10 banners limit reached. Delete an existing banner first.');
                        return;
                      }
                      setBannerModal({
                        title: '',
                        url: '',
                        link: '#/wingo',
                        sortOrder: (adminSettings.banners || []).length + 1,
                        active: true
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADD BANNER</span>
                  </button>
                </div>
              </div>

              {(adminSettings.banners || []).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-500">
                  No custom banners added yet. Click "+ ADD BANNER" above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(adminSettings.banners || []).map((b) => (
                    <div
                      key={b.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
                    >
                      <div className="h-36 bg-slate-50 relative">
                        <img src={b.url} alt={b.title} className="w-full h-full object-cover" />
                        <span
                          className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-black ${
                            b.active !== false
                              ? 'bg-emerald-500 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {b.active !== false ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <div className="p-3.5 space-y-3">
                        <div>
                          <div className="font-black text-sm text-slate-900">{b.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Link: {b.link || 'Home Default'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const next = (adminSettings.banners || []).map((item) =>
                                item.id === b.id ? { ...item, active: item.active === false } : item
                              );
                              updateAdminSettings({ banners: next });
                            }}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600/30"
                            title="Enable / Disable"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setBannerModal({
                                id: b.id,
                                title: b.title,
                                url: b.url,
                                link: b.link || '',
                                sortOrder: b.sortOrder || 0,
                                active: b.active !== false
                              })
                            }
                            className="p-2 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200"
                            title="Edit Banner"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              updateAdminSettings({
                                banners: (adminSettings.banners || []).filter((x) => x.id !== b.id)
                              });
                            }}
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                            title="Delete Banner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- 6. BROADCAST ---------------- */}
          {navTab === 'broadcast' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Send Broadcast */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-black text-cyan-700 tracking-wider">SEND BROADCAST</h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">TITLE</label>
                      <input
                        type="text"
                        value={brdTitle}
                        onChange={(e) => setBrdTitle(e.target.value)}
                        placeholder="Announcement title"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">MESSAGE</label>
                      <textarea
                        rows={4}
                        value={brdMessage}
                        onChange={(e) => setBrdMessage(e.target.value)}
                        placeholder="Write broadcast notice..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">TARGET</label>
                      <select
                        value={brdTarget}
                        onChange={(e) => setBrdTarget(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                      >
                        <option value="all">All Users</option>
                        <option value="vip">VIP Users</option>
                        <option value="active">Active Bettors</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (!brdTitle.trim() || !brdMessage.trim()) {
                          showToast('Please enter title and message');
                          return;
                        }
                        sendBroadcastNotice(brdTitle, brdMessage, brdTarget);
                        setBrdTitle('');
                        setBrdMessage('');
                      }}
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black"
                    >
                      SEND NOTICE
                    </button>
                  </div>
                </div>

                {/* Popup / Marquee */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-black text-cyan-700 tracking-wider">POPUP / MARQUEE ANNOUNCEMENT</h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        MARQUEE TEXT
                      </label>
                      <input
                        type="text"
                        value={marqueeDraft}
                        onChange={(e) => setMarqueeDraft(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        POPUP TITLE
                      </label>
                      <input
                        type="text"
                        value={popupTitleDraft}
                        onChange={(e) => setPopupTitleDraft(e.target.value)}
                        placeholder="ANNOUNCEMENT"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        POPUP POSTER IMAGE (GALLERY UPLOAD OR URL)
                      </label>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <label
                          className={`px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                            isUploadingPopupImg ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingPopupImg ? 'Compressing...' : 'Upload Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingPopupImg(true);
                              try {
                                const steps: Array<[number, number]> = [
                                  [720, 0.8],
                                  [560, 0.7],
                                  [440, 0.58]
                                ];
                                let dataUrl = '';
                                for (const [dim, q] of steps) {
                                  dataUrl = await compressImageFileToDataUrl(file, dim, q);
                                  if (dataUrl.length <= 280000) break;
                                }
                                if (!dataUrl || dataUrl.length > 315000) {
                                  showToast('Photo too large; choose a smaller image.');
                                  return;
                                }
                                setPopupImageDraft(dataUrl);
                                showToast('Announcement photo uploaded. Click Save Config.');
                              } catch {
                                showToast('Failed to read image file');
                              } finally {
                                setIsUploadingPopupImg(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                        {popupImageDraft && (
                          <button
                            type="button"
                            onClick={() => setPopupImageDraft('')}
                            className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 border border-rose-700 text-rose-700 text-xs font-bold hover:bg-rose-100"
                          >
                            Clear Photo
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={popupImageDraft}
                        onChange={(e) => setPopupImageDraft(e.target.value)}
                        placeholder="/assets/aistudio/image_d2e764e7.png or data:image..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                      {popupImageDraft && (
                        <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                          <img
                            src={popupImageDraft}
                            alt="Popup Preview"
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                          />
                          <div className="text-[11px] text-slate-700 font-semibold">
                            Announcement poster preview ready
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        POPUP MESSAGE
                      </label>
                      <textarea
                        rows={3}
                        value={popupMsgDraft}
                        onChange={(e) => setPopupMsgDraft(e.target.value)}
                        placeholder="Write multiline announcement notice..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={popupEnabledDraft}
                        onChange={(e) => setPopupEnabledDraft(e.target.checked)}
                        className="rounded"
                      />
                      <span>Enable System Popup</span>
                    </label>
                    <button
                      onClick={() => {
                        updateAdminSettings({
                          marqueeText: marqueeDraft,
                          popupTitle: popupTitleDraft,
                          popupMessage: popupMsgDraft,
                          popupImageUrl: popupImageDraft,
                          enableSystemPopup: popupEnabledDraft
                        });
                      }}
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black"
                    >
                      SAVE POPUP &amp; CONFIG
                    </button>
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <h3 className="text-xs font-black text-slate-500 tracking-wider">HISTORY</h3>
                {(adminSettings.broadcasts || []).length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center">No broadcast history yet</div>
                ) : (
                  <div className="space-y-2">
                    {(adminSettings.broadcasts || []).map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900">{b.title}</div>
                          <div className="text-[11px] text-slate-700">{b.message}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {b.time} • Target: {b.target}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteBroadcastNotice(b.id)}
                          className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------- 7. DEPOSITS ---------------- */}
          {navTab === 'deposits' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={depSearch}
                      onChange={(e) => setDepSearch(e.target.value)}
                      placeholder="Search phone, TrxID, or Order ID..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                    />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        syncEwiPayTransactions();
                        showToast('Synced live EWI-Pay transactions');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] hover:brightness-110 text-white text-xs font-black flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync EWI-Pay Live</span>
                    </button>
                    <span className="text-xs text-slate-500 font-mono">{filteredDeposits.length} requests</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {([
                    { id: 'pending', label: 'Pending' },
                    { id: 'processing', label: 'Processing' },
                    { id: 'approved', label: 'Completed' },
                    { id: 'rejected', label: 'Rejected' },
                    { id: 'all', label: 'All' }
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDepFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        depFilter === tab.id
                          ? 'bg-cyan-50 border-blue-500 text-cyan-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">USER</th>
                        <th className="px-4 py-3">AMOUNT</th>
                        <th className="px-4 py-3">METHOD</th>
                        <th className="px-4 py-3">TrxID</th>
                        <th className="px-4 py-3">DATE</th>
                        <th className="px-4 py-3">STATUS</th>
                        <th className="px-4 py-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredDeposits.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500">
                            No Deposits Found
                          </td>
                        </tr>
                      ) : (
                        filteredDeposits.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{d.userPhone}</div>
                              <div className="text-[10px] text-slate-500 font-mono">From: {d.senderNumber}</div>
                            </td>
                            <td className="px-4 py-3 font-mono font-black text-emerald-600">
                              ৳{d.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{d.method}</td>
                            <td className="px-4 py-3 font-mono font-bold text-cyan-700">
                              <div>{d.trxId}</div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                Order: {d.orderId || d.id}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{d.time}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  d.status === 'approved'
                                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                    : d.status === 'rejected'
                                    ? 'bg-rose-50 border border-rose-200 text-rose-600'
                                    : d.status === 'processing'
                                    ? 'bg-cyan-500/20 text-cyan-700'
                                    : 'bg-cyan-50 text-cyan-700'
                                }`}
                              >
                                {d.status === 'approved'
                                  ? 'Completed'
                                  : d.status === 'rejected'
                                  ? 'Rejected'
                                  : d.status === 'processing'
                                  ? 'Processing'
                                  : 'Pending'}
                              </span>
                              {d.status === 'rejected' && (d.rejectionReason || d.adminNote) && (
                                <div className="text-[10px] text-rose-600 mt-1 max-w-[180px] break-words">
                                  {d.rejectionReason || d.adminNote}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {d.status === 'pending' || d.status === 'processing' ? (
                                <div className="inline-flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => approveDeposit(d.id)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black"
                                  >
                                    APPROVE
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => rejectDeposit(d.id, 'Rejected by Super Controller')}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black"
                                  >
                                    REJECT
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- 8. WITHDRAWS ---------------- */}
          {navTab === 'withdraws' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { id: 'pending', label: 'Pending' },
                    { id: 'processing', label: 'Processing' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'rejected', label: 'Rejected' },
                    { id: 'all', label: 'All' }
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setWdFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        wdFilter === tab.id
                          ? 'bg-cyan-50 border-blue-500 text-cyan-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isSyncingWithdraws}
                    onClick={async () => {
                      setIsSyncingWithdraws(true);
                      try {
                        const processingItems = withdrawRequests.filter(
                          (w) => (w.status === 'processing' || w.status === 'pending') && Boolean(w.ewiPayWithdrawId)
                        );
                        let updatedCount = 0;
                        for (const w of processingItems) {
                          if (!w.ewiPayWithdrawId) continue;
                          const qs = `?method=${encodeURIComponent(w.method || 'bKash')}`;
                          const res = await fetch(
                            apiUrl(`/api/ewi-pay/withdraw-status/${encodeURIComponent(w.ewiPayWithdrawId)}${qs}`),
                            { cache: 'no-store' }
                          );
                          const stData = res.ok ? await res.json().catch(() => null) : null;
                          const gwObj = stData?.gateway && typeof stData.gateway === 'object' ? stData.gateway : stData;
                          const rawStatus = String(
                            gwObj?.status ||
                              gwObj?.withdrawal?.status ||
                              gwObj?.data?.status ||
                              stData?.status ||
                              ''
                          )
                            .trim()
                            .toLowerCase();
                          const displayRaw = String(gwObj?.displayStatus || stData?.displayStatus || '').trim().toLowerCase();
                          const payoutTrxId = String(
                            gwObj?.payoutTrxId || gwObj?.payout_trx_id || gwObj?.trxId || stData?.payoutTrxId || ''
                          ).trim();
                          if (
                            rawStatus === 'completed' ||
                            rawStatus === 'approved' ||
                            rawStatus === 'paid' ||
                            rawStatus === 'success' ||
                            gwObj?.completed === true ||
                            stData?.completed === true ||
                            displayRaw.includes('completed')
                          ) {
                            updateWithdrawStatus(w.id, 'completed', undefined, undefined, {
                              payoutTrxId: payoutTrxId || undefined
                            });
                            updatedCount += 1;
                          } else if (
                            rawStatus === 'rejected' ||
                            rawStatus === 'failed' ||
                            rawStatus === 'cancelled' ||
                            gwObj?.rejected === true ||
                            gwObj?.refundRequired === true ||
                            stData?.rejected === true
                          ) {
                            const reason = String(
                              gwObj?.rejectionReason ||
                                gwObj?.reason ||
                                gwObj?.withdrawal?.reason ||
                                gwObj?.message ||
                                'Rejected by EWI-Pay Gateway'
                            ).trim();
                            const usrMsg = String(gwObj?.userMessage || stData?.userMessage || 'কিছুক্ষণ পর আবার চেষ্টা করুন').trim();
                            updateWithdrawStatus(w.id, 'rejected', reason || undefined, undefined, {
                              userMessage: usrMsg,
                              rejectionReason: reason || undefined
                            });
                            updatedCount += 1;
                          }
                        }
                        await syncServerDataNow();
                        showToast(
                          updatedCount > 0
                            ? `Synced ${updatedCount} withdrawal(s) from EWI-Pay`
                            : processingItems.length > 0
                            ? `Checked ${processingItems.length} processing withdrawal(s) — still in queue`
                            : 'Refreshed withdrawal list'
                        );
                      } catch {
                        showToast('Failed to check EWI-Pay withdrawal status');
                      } finally {
                        setIsSyncingWithdraws(false);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] hover:brightness-110 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWithdraws ? 'animate-spin' : ''}`} />
                    <span>{isSyncingWithdraws ? 'Checking...' : 'Sync EWI-Pay Withdraws'}</span>
                  </button>
                  <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                    {filteredWithdraws.length} requests
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">USER</th>
                        <th className="px-4 py-3">AMOUNT</th>
                        <th className="px-4 py-3">METHOD</th>
                        <th className="px-4 py-3">NUMBER</th>
                        <th className="px-4 py-3">DATE</th>
                        <th className="px-4 py-3">STATUS</th>
                        <th className="px-4 py-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredWithdraws.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500">
                            No Withdraw Requests Found
                          </td>
                        </tr>
                      ) : (
                        filteredWithdraws.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{w.userName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{w.userPhone}</div>
                            </td>
                            <td className="px-4 py-3 font-mono font-black text-rose-600">
                              ৳{w.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{w.method}</td>
                            <td className="px-4 py-3 font-mono font-bold text-cyan-700">{w.number}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{w.time}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  w.status === 'completed'
                                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                    : w.status === 'rejected'
                                    ? 'bg-rose-50 border border-rose-200 text-rose-600'
                                    : w.status === 'processing'
                                    ? 'bg-cyan-500/20 text-cyan-700'
                                    : 'bg-blue-500/20 text-cyan-700'
                                }`}
                              >
                                {w.status === 'completed'
                                  ? 'Completed'
                                  : w.status === 'rejected'
                                  ? 'Rejected'
                                  : w.status === 'processing'
                                  ? 'Processing'
                                  : 'Pending'}
                              </span>
                              {w.ewiPayWithdrawId && (
                                <div className="text-[10px] font-mono text-cyan-700/90 mt-1">
                                  EWI-Pay: {w.ewiPayWithdrawId}
                                </div>
                              )}
                              {w.payoutTrxId && (
                                <div className="text-[10px] font-mono text-emerald-700/95 mt-0.5">
                                  TrxID: {w.payoutTrxId}
                                </div>
                              )}
                              {w.status === 'rejected' && (w.rejectionReason || w.adminNote) && (
                                <div className="text-[10px] text-rose-600 mt-1 max-w-[180px] break-words">
                                  {w.rejectionReason || w.adminNote}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {w.status === 'pending' || w.status === 'processing' ? (
                                <div className="inline-flex gap-1">
                                  {(w.status === 'pending' || (w.status === 'processing' && !w.ewiPayWithdrawId)) && (
                                    <button
                                      type="button"
                                      onClick={() => updateWithdrawStatus(w.id, 'processing')}
                                      title="Send withdrawal request to EWI-Pay & mark Processing"
                                      className="px-2 py-1 rounded-md bg-cyan-50 border border-cyan-300 text-cyan-700 text-[10px] font-black whitespace-nowrap"
                                    >
                                      {w.status === 'processing' ? 'RETRY EWI-PAY' : 'PROC → EWI-PAY'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => updateWithdrawStatus(w.id, 'completed')}
                                    className="px-2 py-1 rounded-md bg-emerald-600/30 border border-emerald-500/40 text-emerald-700 text-[10px] font-black whitespace-nowrap"
                                  >
                                    PAY DONE
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectWithdrawReason('আপনি কিছুক্ষণ পর আবার চেষ্টা করুন ধন্যবাদ');
                                      setRejectTurnoverPenalty('');
                                      setRejectWithdrawModal({
                                        id: w.id,
                                        userName: w.userName,
                                        amount: w.amount
                                      });
                                    }}
                                    className="px-2 py-1 rounded-md bg-rose-600/30 border border-rose-500/40 text-rose-700 text-[10px] font-black"
                                  >
                                    REJECT
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- 9. GIFT CODES ---------------- */}
          {navTab === 'giftcodes' && (
            <div className="space-y-4">
              {/* Top Search & Create Buttons */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={giftSearch}
                      onChange={(e) => setGiftSearch(e.target.value)}
                      placeholder="Search gift code..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {adminSettings.activeGiftCodes.length} codes
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUserSearch('');
                      setGiftModal({
                        isEdit: false,
                        code: generateGiftCodeName(),
                        rewardType: 'deposit_percent',
                        amount: '200',
                        depositBonusPercent: '200',
                        maxClaims: '1',
                        turnoverAmount: '0',
                        expiryDate: '',
                        minRequiredBalance: '0',
                        targetUid: '',
                        reason: '200% Deposit Bonus Reward',
                        note: '200% Deposit Bonus',
                        active: true
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-slate-900 text-xs font-black flex items-center gap-1 shadow-sm"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>+ 200% DEP BONUS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 text-xs font-black flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-700" />
                    <span>+ BULK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUserSearch('');
                      setGiftModal({
                        isEdit: false,
                        code: generateGiftCodeName(),
                        rewardType: 'fixed',
                        amount: '500',
                        depositBonusPercent: '200',
                        maxClaims: '50',
                        turnoverAmount: '500',
                        expiryDate: '',
                        minRequiredBalance: '0',
                        targetUid: '',
                        reason: 'Special Admin Gift Reward',
                        note: '',
                        active: true
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>CREATE</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Cards */}
              {(() => {
                const codes = adminSettings.activeGiftCodes;
                const activeCount = codes.filter(
                  (c) =>
                    c.active !== false &&
                    c.claimedCount < c.maxClaims &&
                    (!c.expiresAt || c.expiresAt === 0 || Date.now() <= c.expiresAt)
                ).length;
                const totalClaims = codes.reduce((s, c) => s + (c.claimedCount || 0), 0);
                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-slate-500">TOTAL</div>
                      <div className="text-2xl font-black text-purple-700 font-mono mt-1">{codes.length}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-slate-500">ACTIVE</div>
                      <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{activeCount}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-slate-500">CLAIMS</div>
                      <div className="text-2xl font-black text-cyan-700 font-mono mt-1">{totalClaims}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-slate-500">PAID ৳</div>
                      <div className="text-2xl font-black text-cyan-700 font-mono mt-1">
                        ৳{giftClaimedTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Gift Codes Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">CODE</th>
                        <th className="px-4 py-3">REWARD</th>
                        <th className="px-4 py-3">CLAIMED / MAX</th>
                        <th className="px-4 py-3">EXPIRY</th>
                        <th className="px-4 py-3">REASON &amp; TARGET USER</th>
                        <th className="px-4 py-3">STATUS</th>
                        <th className="px-4 py-3 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredGiftCodes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500">
                            No gift codes created yet. Click "+ 200% DEP BONUS" or "+ CREATE" above!
                          </td>
                        </tr>
                      ) : (
                        filteredGiftCodes.map((gc) => {
                          const isExpired = Boolean(gc.expiresAt && gc.expiresAt > 0 && Date.now() > gc.expiresAt);
                          const isExhausted = (gc.claimedCount || 0) >= (gc.maxClaims || 1);
                          const isInactive = gc.active === false;
                          const isDepPct = gc.rewardType === 'deposit_percent';
                          const pctVal = Number(gc.depositBonusPercent || gc.amount || 200);
                          const claimedDisplay = Math.max(Number(gc.claimedCount || 0), Array.isArray(gc.claimRecords) ? gc.claimRecords.length : 0);
                          const targetUserMatch = gc.targetUid
                            ? allUsers.find((u) => String(u.uid || '').toUpperCase() === String(gc.targetUid || '').toUpperCase())
                            : undefined;
                          const statusLabel = isInactive
                            ? 'INACTIVE'
                            : isExpired
                            ? 'EXPIRED'
                            : isExhausted
                            ? 'EXHAUSTED'
                            : 'ACTIVE';
                          return (
                            <tr key={gc.code} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="font-mono font-black text-slate-900">{gc.code}</div>
                                <button
                                  type="button"
                                  onClick={() => copyTextSafely(gc.code, `Copied ${gc.code}`)}
                                  className="text-[10px] text-cyan-700 hover:underline mt-0.5 flex items-center gap-1"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy</span>
                                </button>
                              </td>
                              <td className="px-4 py-3 font-mono font-black">
                                {isDepPct ? (
                                  <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-[11px]">
                                    +{pctVal}% DEPOSIT
                                  </span>
                                ) : (
                                  <span className="text-cyan-700">৳{Number(gc.amount).toFixed(2)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => setClaimHistoryCode(gc)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-300 text-cyan-700 font-mono font-black text-[11px] flex items-center gap-1.5"
                                >
                                  <Users className="w-3 h-3" />
                                  <span>{claimedDisplay} / {gc.maxClaims}</span>
                                </button>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                                {gc.expiresAt && gc.expiresAt > 0
                                  ? new Date(gc.expiresAt).toLocaleString()
                                  : 'No Expiry'}
                              </td>
                              <td className="px-4 py-3 text-slate-700 max-w-[230px]">
                                <div className="font-semibold text-slate-900 truncate">
                                  {gc.reason || gc.note || `Turnover: ৳${gc.turnoverAmount ?? gc.amount}`}
                                </div>
                                <div className="text-[10px] font-mono text-cyan-700 mt-0.5 truncate">
                                  User: {gc.targetUid ? `${targetUserMatch ? `${targetUserMatch.nickname} · ` : ''}${gc.targetUid}` : 'ALL USERS'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                    statusLabel === 'ACTIVE'
                                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                      : statusLabel === 'INACTIVE'
                                      ? 'bg-cyan-50 text-cyan-700'
                                      : 'bg-rose-50 border border-rose-200 text-rose-600'
                                  }`}
                                >
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setClaimHistoryCode(gc)}
                                    className="px-2 py-1.5 rounded-lg bg-cyan-600 text-white text-[10px] font-black flex items-center gap-1"
                                    title="View Claimants"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>{claimedDisplay}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTargetUserSearch('');
                                      setGiftModal({
                                        isEdit: true,
                                        originalCode: gc.code,
                                        code: gc.code,
                                        rewardType: gc.rewardType === 'deposit_percent' ? 'deposit_percent' : 'fixed',
                                        amount: String(gc.amount),
                                        depositBonusPercent: String(gc.depositBonusPercent || gc.amount || 200),
                                        maxClaims: String(gc.maxClaims),
                                        turnoverAmount: String(gc.turnoverAmount ?? gc.amount),
                                        expiryDate:
                                          gc.expiresAt && gc.expiresAt > 0
                                            ? new Date(gc.expiresAt).toISOString().slice(0, 16)
                                            : '',
                                        minRequiredBalance: String(gc.minRequiredBalance || 0),
                                        targetUid: gc.targetUid || '',
                                        reason: gc.reason || gc.note || '',
                                        note: gc.note || '',
                                        active: gc.active !== false
                                      });
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
                                    title="Edit Gift Code"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = adminSettings.activeGiftCodes.map((x) =>
                                        x.code === gc.code ? { ...x, active: x.active === false } : x
                                      );
                                      updateAdminSettings({ activeGiftCodes: next });
                                      showToast(gc.active === false ? 'ACTIVATED' : 'DEACTIVATED');
                                    }}
                                    className={`p-1.5 rounded-lg ${
                                      gc.active !== false
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-cyan-50 text-cyan-700'
                                    }`}
                                    title="Activate / Deactivate"
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateAdminSettings({
                                        activeGiftCodes: adminSettings.activeGiftCodes.filter(
                                          (x) => x.code !== gc.code
                                        )
                                      });
                                      showToast(`Gift code ${gc.code} deleted`);
                                    }}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                                    title="Delete Gift Code"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- 10. APP SETTINGS ---------------- */}
          {navTab === 'settings' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Local Payment Gateway */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-black text-cyan-700 tracking-wider">LOCAL PAYMENT GATEWAY</h3>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        bKash Personal / Agent Number
                      </label>
                      <input
                        type="text"
                        value={bkashNum}
                        onChange={(e) => setBkashNum(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Nagad Personal / Agent Number
                      </label>
                      <input
                        type="text"
                        value={nagadNum}
                        onChange={(e) => setNagadNum(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Rocket / Upay Number
                      </label>
                      <input
                        type="text"
                        value={rocketNum}
                        onChange={(e) => setRocketNum(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        USDT (TRC20 Wallet Address)
                      </label>
                      <input
                        type="text"
                        value={usdtAddr}
                        onChange={(e) => setUsdtAddr(e.target.value)}
                        placeholder="T..."
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Binance Pay ID (Merchant ID shown on Deposit page)
                      </label>
                      <input
                        type="text"
                        value={binancePayIdDraft}
                        onChange={(e) => setBinancePayIdDraft(e.target.value)}
                        placeholder="Enter merchant Binance Pay ID"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">
                          Min Withdraw ৳
                        </label>
                        <input
                          type="number"
                          value={minWd}
                          onChange={(e) => setMinWd(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">
                          First Dep Bonus ৳
                        </label>
                        <input
                          type="number"
                          value={firstDepBonusDraft}
                          onChange={(e) => setFirstDepBonusDraft(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">
                          Refer Commission %
                        </label>
                        <input
                          type="number"
                          value={referPct}
                          onChange={(e) => setReferPct(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Deposit Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={depositInstr}
                        onChange={(e) => setDepositInstr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <button
                      onClick={() =>
                        updateAdminSettings({
                          bkashNumber: bkashNum.trim(),
                          nagadNumber: nagadNum.trim(),
                          rocketNumber: rocketNum.trim(),
                          usdtAddress: usdtAddr.trim(),
                          binancePayId: binancePayIdDraft.trim(),
                          firstDepositBonusAmount: Math.max(0, Number(firstDepBonusDraft) || 0),
                          minWithdraw: Math.max(300, Number(minWd) || 300),
                          referCommissionPercent: Math.max(0, Number(referPct) || 0),
                          depositInstructions: depositInstr.trim()
                        })
                      }
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs"
                    >
                      SAVE GATEWAY NUMBERS
                    </button>
                  </div>
                </div>

                {/* App Identity */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-black text-cyan-700 tracking-wider">APP IDENTITY</h3>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">APP NAME</label>
                      <input
                        type="text"
                        value={appNameDraft}
                        onChange={(e) => setAppNameDraft(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">APP LOGO URL (Leave blank for Official Crown Logo)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={appLogoDraft}
                          onChange={(e) => setAppLogoDraft(e.target.value)}
                          placeholder="Leave blank for Official EWI 777 Crown Logo"
                          className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAppLogoDraft('');
                            updateAdminSettings({ appLogoUrl: '' });
                            showToast('Restored Official Crown Logo everywhere!');
                          }}
                          className="px-3 py-2 rounded-xl bg-cyan-600/25 border border-cyan-300 text-cyan-700 font-black text-[11px] hover:bg-cyan-600/40 whitespace-nowrap"
                        >
                          Use Official Logo
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        SUPPORT LINK (Telegram)
                      </label>
                      <input
                        type="text"
                        value={supportLinkDraft}
                        onChange={(e) => setSupportLinkDraft(e.target.value)}
                        placeholder="https://t.me/..."
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        PHONE / WHATSAPP
                      </label>
                      <input
                        type="text"
                        value={supportPhoneDraft}
                        onChange={(e) => setSupportPhoneDraft(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                      />
                    </div>
                    <button
                      onClick={() =>
                        updateAdminSettings({
                          appName: appNameDraft.trim() || 'EWI 777',
                          appLogoUrl: appLogoDraft.trim(),
                          supportLink: supportLinkDraft.trim(),
                          supportPhone: supportPhoneDraft.trim()
                        })
                      }
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs mt-2"
                    >
                      SAVE IDENTITY
                    </button>
                  </div>
                </div>
              </div>

              {/* EWI-Pay Deposit & Withdraw API Configuration */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-cyan-700 tracking-wider flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      <span>EWI-PAY DEPOSIT &amp; WITHDRAW API SETTINGS</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure live bKash &amp; Nagad checkout, deposit verification, and auto-withdraw API endpoints.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const base = ewiBaseUrl.trim().replace(/\/+$/, '') || 'https://ewi-pay.vercel.app';
                        setEwiBaseUrl(base);
                        setEwiCheckoutStatusUrl(`${base}/api/v1/checkout/status/:sessionId`);
                        setEwiBkashCheckoutUrl(`${base}/api/v1/bkash/checkout/create`);
                        setEwiBkashDepositStatusUrl(`${base}/api/v1/bkash/deposits/:id/status`);
                        setEwiBkashTxUrl(`${base}/api/v1/bkash/transactions`);
                        setEwiBkashWithdrawUrl(`${base}/api/v1/bkash/withdrawals/request`);
                        setEwiBkashWithdrawStatusUrl(`${base}/api/v1/bkash/withdrawals/:id/status`);
                        setEwiNagadCheckoutUrl(`${base}/api/v1/nagad/checkout/create`);
                        setEwiNagadDepositStatusUrl(`${base}/api/v1/nagad/deposits/:id/status`);
                        setEwiNagadTxUrl(`${base}/api/v1/nagad/transactions`);
                        setEwiNagadWithdrawUrl(`${base}/api/v1/nagad/withdrawals/request`);
                        setEwiNagadWithdrawStatusUrl(`${base}/api/v1/nagad/withdrawals/:id/status`);
                        setEwiUnifiedCheckoutUrl(`${base}/api/v1/checkout/create`);
                        setEwiMemberStatusUrl(`${base}/api/v1/member/:siteUserId/status`);
                        showToast('Generated all endpoint URLs from Base URL');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-700 text-[11px] font-black whitespace-nowrap hover:bg-cyan-600/30"
                    >
                      Fill From Base URL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defBase = 'https://ewi-pay.vercel.app';
                        setEwiBaseUrl(defBase);
                        setEwiSiteSlug('ewi777');
                        setEwiCheckoutStatusUrl(`${defBase}/api/v1/checkout/status/:sessionId`);
                        setEwiBkashCheckoutUrl(`${defBase}/api/v1/bkash/checkout/create`);
                        setEwiBkashDepositStatusUrl(`${defBase}/api/v1/bkash/deposits/:id/status`);
                        setEwiBkashTxUrl(`${defBase}/api/v1/bkash/transactions`);
                        setEwiBkashWithdrawUrl(`${defBase}/api/v1/bkash/withdrawals/request`);
                        setEwiBkashWithdrawStatusUrl(`${defBase}/api/v1/bkash/withdrawals/:id/status`);
                        setEwiNagadCheckoutUrl(`${defBase}/api/v1/nagad/checkout/create`);
                        setEwiNagadDepositStatusUrl(`${defBase}/api/v1/nagad/deposits/:id/status`);
                        setEwiNagadTxUrl(`${defBase}/api/v1/nagad/transactions`);
                        setEwiNagadWithdrawUrl(`${defBase}/api/v1/nagad/withdrawals/request`);
                        setEwiNagadWithdrawStatusUrl(`${defBase}/api/v1/nagad/withdrawals/:id/status`);
                        setEwiUnifiedCheckoutUrl(`${defBase}/api/v1/checkout/create`);
                        setEwiMemberStatusUrl(`${defBase}/api/v1/member/:siteUserId/status`);
                        showToast('Restored default EWI777 API endpoints (click Save to apply)');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-300 text-cyan-700 text-[11px] font-black whitespace-nowrap hover:bg-cyan-100"
                    >
                      Reset EWI777 Defaults
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">API Base URL</label>
                    <input
                      type="text"
                      value={ewiBaseUrl}
                      onChange={(e) => setEwiBaseUrl(e.target.value)}
                      placeholder="https://ewi-pay.vercel.app"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Merchant Site Slug</label>
                    <input
                      type="text"
                      value={ewiSiteSlug}
                      onChange={(e) => setEwiSiteSlug(e.target.value)}
                      placeholder="ewi777"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Gateway x-api-key
                    </label>
                    <div className="relative">
                      <input
                        type={showEwiApiKey ? 'text' : 'password'}
                        value={ewiApiKey}
                        onChange={(e) => setEwiApiKey(e.target.value)}
                        placeholder="Leave blank to keep default key"
                        className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEwiApiKey((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                        aria-label="Toggle API key visibility"
                      >
                        {showEwiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Checkout Status URL
                    </label>
                    <input
                      type="text"
                      value={ewiCheckoutStatusUrl}
                      onChange={(e) => setEwiCheckoutStatusUrl(e.target.value)}
                      placeholder="https://.../api/v1/checkout/status/:sessionId"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                  {/* bKash API Group */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-pink-500/25 space-y-2.5">
                    <div className="text-[11px] font-black text-pink-400 tracking-wider uppercase">
                      bKash Dedicated API Endpoints
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Create bKash Checkout (POST)
                      </label>
                      <input
                        type="text"
                        value={ewiBkashCheckoutUrl}
                        onChange={(e) => setEwiBkashCheckoutUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Check bKash Deposit Status (GET)
                      </label>
                      <input
                        type="text"
                        value={ewiBkashDepositStatusUrl}
                        onChange={(e) => setEwiBkashDepositStatusUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        bKash Transactions List (GET)
                      </label>
                      <input
                        type="text"
                        value={ewiBkashTxUrl}
                        onChange={(e) => setEwiBkashTxUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        bKash Withdraw Request (POST)
                      </label>
                      <input
                        type="text"
                        value={ewiBkashWithdrawUrl}
                        onChange={(e) => setEwiBkashWithdrawUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        bKash Withdraw Status (GET)
                      </label>
                      <input
                        type="text"
                        value={ewiBkashWithdrawStatusUrl}
                        onChange={(e) => setEwiBkashWithdrawStatusUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Nagad API Group */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-orange-500/25 space-y-2.5">
                    <div className="text-[11px] font-black text-orange-400 tracking-wider uppercase">
                      Nagad Dedicated API Endpoints
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Create Nagad Checkout (POST)
                      </label>
                      <input
                        type="text"
                        value={ewiNagadCheckoutUrl}
                        onChange={(e) => setEwiNagadCheckoutUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Check Nagad Deposit Status (GET)
                      </label>
                      <input
                        type="text"
                        value={ewiNagadDepositStatusUrl}
                        onChange={(e) => setEwiNagadDepositStatusUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Nagad Transactions List (GET)
                      </label>
                      <input
                        type="text"
                        value={ewiNagadTxUrl}
                        onChange={(e) => setEwiNagadTxUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Nagad Withdraw Request (POST)
                      </label>
                      <input
                        type="text"
                        value={ewiNagadWithdrawUrl}
                        onChange={(e) => setEwiNagadWithdrawUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Nagad Withdraw Status (GET)
                      </label>
                      <input
                        type="text"
                        value={ewiNagadWithdrawStatusUrl}
                        onChange={(e) => setEwiNagadWithdrawStatusUrl(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Unified Checkout URL (POST)
                    </label>
                    <input
                      type="text"
                      value={ewiUnifiedCheckoutUrl}
                      onChange={(e) => setEwiUnifiedCheckoutUrl(e.target.value)}
                      placeholder="https://ewi-pay.vercel.app/api/v1/checkout/create"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Member Status Sync URL (GET)
                    </label>
                    <input
                      type="text"
                      value={ewiMemberStatusUrl}
                      onChange={(e) => setEwiMemberStatusUrl(e.target.value)}
                      placeholder="https://ewi-pay.vercel.app/api/v1/member/:siteUserId/status"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      2-Way HTTPS Webhook Receiver (X-EWI-Signature)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/api/ewi-pay/webhook`}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-emerald-500/40 font-mono text-emerald-700 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(`${window.location.origin}/api/ewi-pay/webhook`).catch(() => {});
                          showToast('Webhook URL copied!');
                        }}
                        className="px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-500/40 text-emerald-700 text-[10px] font-black whitespace-nowrap"
                      >
                        COPY
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const cleanBase = ewiBaseUrl.trim().replace(/\/+$/, '') || 'https://ewi-pay.vercel.app';
                    updateAdminSettings({
                      ewiPayConfig: {
                        baseUrl: cleanBase,
                        siteSlug: ewiSiteSlug.trim() || 'ewi777',
                        apiKey: ewiApiKey.trim(),
                        unifiedCheckoutUrl: ewiUnifiedCheckoutUrl.trim() || `${cleanBase}/api/v1/checkout/create`,
                        memberStatusUrl: ewiMemberStatusUrl.trim() || `${cleanBase}/api/v1/member/:siteUserId/status`,
                        webhookUrl: `${window.location.origin}/api/ewi-pay/webhook`,
                        checkoutStatusUrl: ewiCheckoutStatusUrl.trim() || `${cleanBase}/api/v1/checkout/status/:sessionId`,
                        bkashCheckoutUrl: ewiBkashCheckoutUrl.trim() || `${cleanBase}/api/v1/bkash/checkout/create`,
                        bkashDepositStatusUrl: ewiBkashDepositStatusUrl.trim() || `${cleanBase}/api/v1/bkash/deposits/:id/status`,
                        bkashTransactionsUrl: ewiBkashTxUrl.trim() || `${cleanBase}/api/v1/bkash/transactions`,
                        bkashWithdrawUrl: ewiBkashWithdrawUrl.trim() || `${cleanBase}/api/v1/bkash/withdrawals/request`,
                        bkashWithdrawStatusUrl: ewiBkashWithdrawStatusUrl.trim() || `${cleanBase}/api/v1/bkash/withdrawals/:id/status`,
                        nagadCheckoutUrl: ewiNagadCheckoutUrl.trim() || `${cleanBase}/api/v1/nagad/checkout/create`,
                        nagadDepositStatusUrl: ewiNagadDepositStatusUrl.trim() || `${cleanBase}/api/v1/nagad/deposits/:id/status`,
                        nagadTransactionsUrl: ewiNagadTxUrl.trim() || `${cleanBase}/api/v1/nagad/transactions`,
                        nagadWithdrawUrl: ewiNagadWithdrawUrl.trim() || `${cleanBase}/api/v1/nagad/withdrawals/request`,
                        nagadWithdrawStatusUrl: ewiNagadWithdrawStatusUrl.trim() || `${cleanBase}/api/v1/nagad/withdrawals/:id/status`
                      }
                    });
                    showToast('Saved EWI-Pay Deposit & Withdraw API Configuration!');
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] hover:brightness-110 text-white font-black text-xs"
                >
                  SAVE EWI-PAY API CONFIG
                </button>
              </div>

              {/* Secret Admin Panel Credentials */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-black text-cyan-700 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>CHANGE ADMIN LOGIN CREDENTIALS</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-cyan-700">
                    Protected Route Active • SHA-256 Hashed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Leave blank to keep existing credentials. New values are hashed (SHA-256) before saving — zero plaintext numbers or passwords are ever exposed.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      New Admin Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={adminLoginPhoneDraft}
                      onChange={(e) => setAdminLoginPhoneDraft(e.target.value)}
                      placeholder="Enter new admin phone"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      New Admin Password (Optional)
                    </label>
                    <input
                      type="password"
                      value={adminLoginPassDraft}
                      onChange={(e) => setAdminLoginPassDraft(e.target.value)}
                      placeholder="Enter new password (min 4 chars)"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = normalizePhone(adminLoginPhoneDraft.trim()) || adminLoginPhoneDraft.trim();
                    const cleanPass = adminLoginPassDraft.trim();
                    if (!cleanPhone && !cleanPass) {
                      showToast('Enter a new Admin Phone or Password to update');
                      return;
                    }
                    if (cleanPhone && cleanPhone.length < 7) {
                      showToast('Enter a valid Admin Phone number');
                      return;
                    }
                    if (cleanPass && cleanPass.length < 4) {
                      showToast('Password must be at least 4 characters');
                      return;
                    }
                    const patch: Record<string, string> = {};
                    if (cleanPhone) patch.adminPhoneHash = sha256HexSync(cleanPhone);
                    if (cleanPass) patch.adminPasswordHash = sha256HexSync(cleanPass);
                    updateAdminSettings(patch);
                    setAdminLoginPhoneDraft('');
                    setAdminLoginPassDraft('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs"
                >
                  SAVE ADMIN CREDENTIALS
                </button>
              </div>

              {/* Global System Switches */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black text-cyan-700 tracking-wider">GLOBAL SYSTEM SWITCHES</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Master Site Power</label>
                    <select
                      value={siteEnabledDraft ? 'ON' : 'OFF'}
                      onChange={(e) => setSiteEnabledDraft(e.target.value === 'ON')}
                      className={`w-full px-3 py-2.5 rounded-xl bg-slate-50 border font-black ${
                        siteEnabledDraft
                          ? 'border-emerald-500/60 text-emerald-600'
                          : 'border-rose-500/60 text-rose-600'
                      }`}
                    >
                      <option value="ON">SITE ON (Live)</option>
                      <option value="OFF">SITE OFF (SITE IS NOT COMING)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">System Timezone</label>
                    <select
                      value={String(tzOffsetDraft)}
                      onChange={(e) => setTzOffsetDraft(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-cyan-700"
                    >
                      <option value="360">UTC+6:00 Bangladesh (Dhaka)</option>
                      <option value="330">UTC+5:30 India (IST)</option>
                      <option value="0">UTC+0:00 Universal (UTC)</option>
                      <option value="240">UTC+4:00 UAE (Dubai)</option>
                      <option value="480">UTC+8:00 Singapore (SGT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Deposit System</label>
                    <select
                      value={depEnabled ? 'ENABLED' : 'DISABLED'}
                      onChange={(e) => setDepEnabled(e.target.value === 'ENABLED')}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                    >
                      <option value="ENABLED">ENABLED</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Withdraw System</label>
                    <select
                      value={wdEnabled ? 'ENABLED' : 'DISABLED'}
                      onChange={(e) => setWdEnabled(e.target.value === 'ENABLED')}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                    >
                      <option value="ENABLED">ENABLED</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Gift Code Claim</label>
                    <select
                      value={giftEnabled ? 'ENABLED' : 'DISABLED'}
                      onChange={(e) => setGiftEnabled(e.target.value === 'ENABLED')}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                    >
                      <option value="ENABLED">ENABLED</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">User Registration</label>
                    <select
                      value={regEnabled ? 'ENABLED' : 'DISABLED'}
                      onChange={(e) => setRegEnabled(e.target.value === 'ENABLED')}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                    >
                      <option value="ENABLED">ENABLED</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-cyan-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintMode}
                    onChange={(e) => setMaintMode(e.target.checked)}
                    className="rounded"
                  />
                  <span>Enable System Maintenance Mode</span>
                </label>

                <button
                  onClick={() =>
                    updateAdminSettings({
                      siteEnabled: siteEnabledDraft,
                      timezoneOffsetMinutes: tzOffsetDraft,
                      depositEnabled: depEnabled,
                      withdrawEnabled: wdEnabled,
                      giftCodeEnabled: giftEnabled,
                      registrationEnabled: regEnabled,
                      maintenanceMode: maintMode
                    })
                  }
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] hover:brightness-110 text-white font-black text-xs"
                >
                  SAVE GLOBAL SYSTEM
                </button>
              </div>

              {/* Password Recovery Tickets */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-cyan-700 tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" />
                    <span>PASSWORD RECOVERY REQUESTS</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    {pwRequests.filter((r) => r.status === 'pending').length} pending
                  </span>
                </div>
                {pwRequests.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center">No recovery tickets submitted</div>
                ) : (
                  <div className="space-y-2">
                    {pwRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-slate-900">{req.phone}</div>
                          <div className="text-[10px] text-slate-500">{req.note} • {req.time}</div>
                        </div>
                        {req.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tempPasswords[req.id] ?? req.matchedPassword ?? ''}
                              onChange={(e) =>
                                setTempPasswords((p) => ({ ...p, [req.id]: e.target.value }))
                              }
                              placeholder="Temp password"
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-900 w-32"
                            />
                            <button
                              onClick={() => handleResolvePwTicket(req.id, req.matchedPassword)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-[11px]"
                            >
                              RESOLVE
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-black">
                            RESOLVED ({req.tempPassword})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================== SUPPORT CHAT INBOX =================== */}
          {navTab === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Threads Sidebar */}
              <div className="md:col-span-4 bg-white border border-slate-200 rounded-2xl p-3 space-y-2 max-h-[640px] overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200">
                  <span className="text-xs font-black text-cyan-700 tracking-wider">
                    USER THREADS ({supportThreads.length})
                  </span>
                  {unansweredSupportCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                      {unansweredSupportCount} Unanswered
                    </span>
                  )}
                </div>

                {supportThreads.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No customer support messages yet.
                  </div>
                ) : (
                  supportThreads.map((thread) => {
                    const active = selectedChatUserId === thread.userId;
                    return (
                      <button
                        key={thread.userId}
                        onClick={() => setSelectedChatUserId(thread.userId)}
                        className={`w-full p-3 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                          active
                            ? 'bg-cyan-600/20 border-cyan-400/60'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-200'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D97706] to-[#B45309] text-slate-900 font-black text-xs flex items-center justify-center flex-shrink-0">
                          {(thread.userNickname || 'M')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {thread.userNickname}
                            </span>
                            {thread.hasUnanswered && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">
                            UID: {thread.userUid} {thread.userPhone ? `• ${thread.userPhone}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-700 truncate mt-1">
                            {thread.lastMessage || 'New message'}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Conversation Panel */}
              <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[540px] max-h-[640px]">
                {(() => {
                  const activeThread = supportThreads.find((t) => t.userId === selectedChatUserId);
                  if (!activeThread) {
                    return (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                        Select a user thread from the left to view messages & reply.
                      </div>
                    );
                  }
                  const threadMsgs = supportMessages.filter((m) => m.userId === activeThread.userId);

                  const handleSendAdminReply = async (e?: React.FormEvent, imageUrl?: string) => {
                    if (e) e.preventDefault();
                    const text = imageUrl ? '' : adminReplyText.trim();
                    if (!text && !imageUrl) return;
                    if (!imageUrl) setAdminReplyText('');
                    await sendSupportMessage({
                      userId: activeThread.userId,
                      userUid: activeThread.userUid,
                      userNickname: activeThread.userNickname,
                      userPhone: activeThread.userPhone,
                      sender: 'admin',
                      text,
                      imageUrl
                    });
                  };

                  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsAdminSendingPhoto(true);
                    try {
                      const steps: Array<[number, number]> = [
                        [720, 0.72],
                        [520, 0.62],
                        [400, 0.5]
                      ];
                      let dataUrl = '';
                      for (const [maxDim, quality] of steps) {
                        dataUrl = await compressImageFileToDataUrl(file, maxDim, quality);
                        if (dataUrl.length <= 280000) break;
                      }
                      if (!dataUrl || dataUrl.length > 340000) {
                        showToast('Image too large even after compression');
                        return;
                      }
                      await handleSendAdminReply(undefined, dataUrl);
                      showToast('Photo reply sent to user');
                    } catch {
                      showToast('Failed to send photo');
                    } finally {
                      setIsAdminSendingPhoto(false);
                      e.target.value = '';
                    }
                  };

                  return (
                    <>
                      <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-black text-sm text-slate-900">
                            {activeThread.userNickname}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            UID: {activeThread.userUid} • Phone: {activeThread.userPhone || 'N/A'}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-black">
                          2-Way Live Sync
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                        {threadMsgs.map((m) => (
                          <div
                            key={m.id}
                            className={`flex flex-col ${m.sender === 'admin' ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs space-y-2 ${
                                m.sender === 'admin'
                                  ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white'
                                  : 'bg-slate-50 border border-slate-200 text-slate-800'
                              }`}
                            >
                              {m.imageUrl && (
                                <img
                                  src={m.imageUrl}
                                  alt="Attachment"
                                  referrerPolicy="no-referrer"
                                  onClick={() => setAdminChatZoomUrl(m.imageUrl!)}
                                  className="max-w-[220px] max-h-[220px] rounded-xl object-cover cursor-pointer border border-white/20"
                                />
                              )}
                              {m.text && <div className="break-words">{m.text}</div>}
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5 px-1">
                              {m.sender === 'admin' ? 'Admin' : activeThread.userNickname} •{' '}
                              {m.timestamp
                                ? new Date(m.timestamp).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                  })
                                : m.time}
                            </span>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={(e) => handleSendAdminReply(e)} className="pt-3 border-t border-slate-200 flex items-center gap-2">
                        <label
                          title="Send photo from gallery"
                          className={`w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-cyan-700 flex items-center justify-center cursor-pointer hover:border-cyan-400 flex-shrink-0 ${
                            isAdminSendingPhoto ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <ImageIcon className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAdminPhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="text"
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          placeholder="Type official admin reply..."
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </form>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          {/* =================== VISITOR IP, MULTI-ACCOUNT & VPN SECURITY MONITOR =================== */}
          {navTab === 'access_logs' && (
            <div className="space-y-4">
              {/* Security KPI Strip + Refresh */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-cyan-200 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black text-cyan-700 uppercase tracking-wider">
                      Same-IP Multi-Account Clusters
                    </div>
                    <div className="text-2xl font-mono font-black text-slate-900 tabular-nums mt-1">
                      {effectiveIpReport.multiIpGroups.length}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-600/15 text-cyan-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white border border-rose-500/35 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black text-rose-700 uppercase tracking-wider">
                      VPN / Proxy Flagged Accounts
                    </div>
                    <div className="text-2xl font-mono font-black text-slate-900 tabular-nums mt-1">
                      {effectiveIpReport.vpnUsers.length}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-700 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white border border-cyan-500/30 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black text-cyan-700 uppercase tracking-wider">
                      Tracked Accounts / IP Logs
                    </div>
                    <div className="text-2xl font-mono font-black text-slate-900 tabular-nums mt-1">
                      {effectiveIpReport.totalTrackedUsers} / {adminAccessLogs.length}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-700 flex items-center justify-center">
                    <Wifi className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Search & Scan Controls */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={ipSearch}
                      onChange={(e) => setIpSearch(e.target.value)}
                      placeholder="Search by IP, ISP, Country, UID or Phone..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-cyan-400"
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                    {adminAccessLogs.length} entries
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isLoadingIpReport}
                  onClick={() => {
                    syncServerDataNow();
                    fetchIpSecurityReport();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingIpReport ? 'animate-spin' : ''}`} />
                  <span>REFRESH SECURITY SCAN</span>
                </button>
              </div>

              {/* 1. SAME-IP MULTI-ACCOUNT CLUSTERS */}
              <div className="bg-white border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-cyan-700 uppercase tracking-wider">
                      Same-IP Multi-Account Clusters ({effectiveIpReport.multiIpGroups.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      IP addresses used by 2 or more registered member accounts. Inspect individual accounts or ban an entire cluster.
                    </p>
                  </div>
                </div>

                {effectiveIpReport.multiIpGroups.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                    No multi-account IP clusters detected across tracked accounts.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {effectiveIpReport.multiIpGroups
                      .filter((grp) => {
                        const q = ipSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          grp.ip.toLowerCase().includes(q) ||
                          (grp.isp || '').toLowerCase().includes(q) ||
                          (grp.country || '').toLowerCase().includes(q) ||
                          grp.users.some(
                            (m) =>
                              (m.uid || '').toLowerCase().includes(q) ||
                              (m.nickname || '').toLowerCase().includes(q) ||
                              (m.phone || '').toLowerCase().includes(q)
                          )
                        );
                      })
                      .map((grp) => {
                        const unbannedCount = grp.users.filter((cu) => {
                          const live = allUsers.find((u) => u.id === cu.id || (cu.uid && u.uid === cu.uid));
                          return live ? !live.isBanned : !cu.isBanned;
                        }).length;
                        return (
                          <div
                            key={grp.ip}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-mono font-black text-cyan-700">{grp.ip}</span>
                                <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 font-black text-[10px] tabular-nums">
                                  {grp.count} accounts
                                </span>
                                {grp.hasVpn && (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-black text-[10px]">
                                    VPN DETECTED
                                  </span>
                                )}
                                {(grp.isp || grp.country) && (
                                  <span className="text-[11px] text-slate-500">
                                    {[grp.isp, grp.country].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {confirmBanIp === grp.ip ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleBanAllOnIp(grp.ip, grp.users)}
                                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black whitespace-nowrap"
                                    >
                                      Confirm Ban ({unbannedCount})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmBanIp(null)}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold whitespace-nowrap"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={unbannedCount === 0}
                                    onClick={() => setConfirmBanIp(grp.ip)}
                                    className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 disabled:bg-slate-100 disabled:text-slate-500 text-white text-[11px] font-black flex items-center gap-1 whitespace-nowrap"
                                  >
                                    <Ban className="w-3 h-3" />
                                    <span>
                                      {unbannedCount === 0 ? 'All Banned' : `Ban All on IP (${unbannedCount})`}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {grp.users.map((m) => {
                                const liveMatch = allUsers.find((u) => u.id === m.id || (m.uid && u.uid === m.uid));
                                const isMemberBanned = Boolean(liveMatch ? liveMatch.isBanned : m.isBanned);
                                const isMemberVpn = Boolean(liveMatch ? liveMatch.isVpn : m.isVpn);
                                return (
                                  <div
                                    key={m.id}
                                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                        <span className="truncate">{m.nickname}</span>
                                        {isMemberVpn && (
                                          <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black">
                                            VPN
                                          </span>
                                        )}
                                        {isMemberBanned && (
                                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black">
                                            BANNED
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] font-mono text-slate-500 truncate">
                                        UID: {m.uid} · {m.phone || 'N/A'} · ৳{Number(m.balance || 0).toFixed(0)}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleInspectSecurityUser(m)}
                                      className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-black flex-shrink-0 whitespace-nowrap"
                                    >
                                      Inspect
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* 2. VPN / PROXY FLAGGED ACCOUNTS */}
              <div className="bg-white border border-rose-500/30 rounded-2xl p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-black text-rose-700 uppercase tracking-wider">
                    VPN / Proxy Flagged Accounts ({effectiveIpReport.vpnUsers.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Members flagged for VPN, datacenter proxy, or Tor/relay traffic based on network heuristics.
                  </p>
                </div>

                {effectiveIpReport.vpnUsers.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                    No VPN or proxy-flagged accounts detected right now.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">MEMBER</th>
                          <th className="px-3 py-2.5">IP &amp; NETWORK</th>
                          <th className="px-3 py-2.5">DETECTION REASON</th>
                          <th className="px-3 py-2.5 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {effectiveIpReport.vpnUsers
                          .filter((vu) => {
                            const q = ipSearch.trim().toLowerCase();
                            if (!q) return true;
                            return (
                              (vu.nickname || '').toLowerCase().includes(q) ||
                              (vu.uid || '').toLowerCase().includes(q) ||
                              (vu.phone || '').toLowerCase().includes(q) ||
                              (vu.lastIp || '').toLowerCase().includes(q) ||
                              (vu.ipIsp || '').toLowerCase().includes(q) ||
                              (vu.ipCountry || '').toLowerCase().includes(q) ||
                              (vu.vpnReason || '').toLowerCase().includes(q)
                            );
                          })
                          .map((vu) => {
                            const liveMatch = allUsers.find((u) => u.id === vu.id || (vu.uid && u.uid === vu.uid));
                            const isVpnBanned = Boolean(liveMatch ? liveMatch.isBanned : vu.isBanned);
                            return (
                              <tr key={vu.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{vu.nickname}</span>
                                    {isVpnBanned && (
                                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-[9px] text-white font-black">
                                        BANNED
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500">
                                    UID: {vu.uid} · {vu.phone || 'N/A'}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 font-mono">
                                  <div className="text-cyan-700 font-bold">{vu.lastIp || vu.registeredIp}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {[vu.ipIsp, vu.ipCountry].filter(Boolean).join(' · ') || 'Network unknown'}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="inline-block px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-700 text-[10px] font-bold">
                                    {vu.vpnReason || 'VPN / Proxy Flagged'}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleInspectSecurityUser(vu)}
                                      className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-black whitespace-nowrap"
                                    >
                                      Inspect
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleUserBan(
                                          vu.id,
                                          vu.vpnReason
                                            ? `VPN / Proxy detected: ${vu.vpnReason}`
                                            : 'VPN / Proxy usage prohibited'
                                        )
                                      }
                                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap ${
                                        isVpnBanned
                                          ? 'bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100'
                                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                                      }`}
                                    >
                                      {isVpnBanned ? 'Unban' : 'Ban'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. ACCESS LOGS TIMELINE TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">IP &amp; VPN SECURITY</th>
                        <th className="px-4 py-3">STATUS / ACTION</th>
                        <th className="px-4 py-3">ENTRY TIME</th>
                        <th className="px-4 py-3">ELAPSED DURATION (কতক্ষণ আগে)</th>
                        <th className="px-4 py-3">IDENTITY</th>
                        <th className="px-4 py-3">DEVICE / BROWSER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(() => {
                        const q = ipSearch.trim().toLowerCase();
                        const filtered = adminAccessLogs.filter(
                          (l) =>
                            !q ||
                            (l.ip || '').toLowerCase().includes(q) ||
                            (l.action || '').toLowerCase().includes(q) ||
                            (l.userAgent || '').toLowerCase().includes(q) ||
                            (l.phoneAttempt || '').toLowerCase().includes(q) ||
                            (l.isp || '').toLowerCase().includes(q) ||
                            (l.country || '').toLowerCase().includes(q)
                        );
                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-slate-500">
                                No admin panel access logs match your filter.
                              </td>
                            </tr>
                          );
                        }
                        return filtered.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-black text-cyan-700">
                                  {log.ip || 'Unknown'}
                                </span>
                                {log.isVpn ? (
                                  <span
                                    title={log.vpnReason || 'VPN / Proxy Detected'}
                                    className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 border border-rose-500/40 text-rose-700 text-[9px] font-black uppercase"
                                  >
                                    VPN / PROXY
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 text-[9px] font-black uppercase">
                                    CLEAN
                                  </span>
                                )}
                              </div>
                              {(log.isp || log.country || log.vpnReason) && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {[log.isp, log.country].filter(Boolean).join(' · ')}
                                  {log.isVpn && log.vpnReason ? ` (${log.vpnReason})` : ''}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                  log.action === 'login_success'
                                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                    : log.action === 'login_failed'
                                    ? 'bg-rose-50 border border-rose-200 text-rose-600'
                                    : log.action === 'login_step1'
                                    ? 'bg-cyan-50 text-cyan-700'
                                    : 'bg-blue-500/20 text-cyan-700'
                                }`}
                              >
                                {log.action.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-800">
                              {log.enteredAt}
                            </td>
                            <td className="px-4 py-3 font-mono font-black text-cyan-700">
                              <div className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-cyan-700" />
                                <span>{formatElapsedDuration(log.enteredAtMs, nowMs)}</span>
                              </div>
                              <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                                Stayed: {formatStaySeconds(log.staySeconds, log.lastSeenAtMs, log.enteredAtMs)}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-700">
                              {log.phoneAttempt || 'Visitor'}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                              {log.userAgent || 'Browser'}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SUPPORT CHAT IMAGE ZOOM LIGHTBOX */}
      {adminChatZoomUrl && (
        <div
          onClick={() => setAdminChatZoomUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <button
            onClick={() => setAdminChatZoomUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={adminChatZoomUrl}
            alt="Zoomed support"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain"
          />
        </div>
      )}

      {/* =================== MODALS =================== */}

      {/* 1. USER CONTROL MODAL */}
      {controlUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-700 tracking-wider">USER CONTROL</h3>
              <button
                type="button"
                onClick={() => setControlUser(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Header */}
            {(() => {
              const liveUser = allUsers.find((x) => x.id === controlUser.id) || controlUser;
              const role = liveUser.role || (liveUser.vipLevel > 0 ? 'VIP' : 'USER');
              const userTxns = transactions.filter((t) => t.userId === liveUser.id);
              const userRefs = referrals.filter((r) => r.referrerCode === liveUser.inviteCode);
              const boundCount =
                (liveUser.boundWallets?.length || 0) +
                (liveUser.boundBkash && !liveUser.boundWallets?.length ? 1 : 0) +
                (liveUser.boundNagad && !liveUser.boundWallets?.length ? 1 : 0);

              return (
                <>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] text-white font-black flex items-center justify-center overflow-hidden">
                        {liveUser.avatar ? (
                          <img src={liveUser.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (liveUser.nickname || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900">{liveUser.nickname}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {liveUser.phone || liveUser.email}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">UID: {liveUser.uid}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-black">
                      {role}
                    </span>
                  </div>

                  {/* 4 Stat Boxes */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[9px] font-bold text-slate-500">BAL</div>
                      <div className="text-xs font-mono font-black text-cyan-700 mt-0.5">
                        ৳{Number(liveUser.balance || 0).toFixed(0)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[9px] font-bold text-slate-500">DEP</div>
                      <div className="text-xs font-mono font-black text-emerald-600 mt-0.5">
                        ৳{Number(liveUser.totalDeposited || 0).toFixed(0)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[9px] font-bold text-slate-500">WD</div>
                      <div className="text-xs font-mono font-black text-rose-600 mt-0.5">
                        ৳{Number(liveUser.totalWithdrawn || 0).toFixed(0)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[9px] font-bold text-slate-500">REFS</div>
                      <div className="text-xs font-mono font-black text-purple-700 mt-0.5">
                        {userRefs.length}
                      </div>
                    </div>
                  </div>

                  {/* Assign Role */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">ASSIGN ROLE</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['USER', 'VIP', 'ADMIN'] as const).map((r) => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => adminUpdateUserRole(liveUser.id, r)}
                          className={`py-2 rounded-xl text-xs font-black border transition-all ${
                            role === r
                              ? 'bg-cyan-50 border-blue-400 text-cyan-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meta Info & IP Security Telemetry */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1 font-mono">
                    <div>
                      Ref Code: <span className="text-cyan-700 font-bold">{liveUser.inviteCode}</span> ·
                      Referred By: {liveUser.referredBy || '—'}
                    </div>
                    <div>
                      Joined: {(liveUser.createdAt || liveUser.lastLogin || '').slice(0, 10) || '—'} · Cards:{' '}
                      {boundCount} · Txns: {userTxns.length}
                    </div>
                    <div>
                      Turnover: ৳{Number(liveUser.turnoverCompleted || 0).toFixed(0)} / ৳
                      {Number(liveUser.turnoverRequired || 0).toFixed(0)}
                    </div>
                    <div className="pt-1 border-t border-slate-200 mt-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span>
                          Reg IP: <strong className="text-cyan-700">{liveUser.registeredIp || '—'}</strong> · Last IP:{' '}
                          <strong className="text-cyan-700">{liveUser.lastIp || '—'}</strong>
                        </span>
                        {liveUser.isVpn ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 border border-rose-500/40 text-rose-700 text-[9px] font-black">
                            VPN: {liveUser.vpnReason || 'FLAGGED'}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 text-[9px] font-black">
                            CLEAN IP
                          </span>
                        )}
                      </div>
                      {(liveUser.ipIsp || liveUser.ipCountry || getUserIpClusterCount(liveUser) >= 2) && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500">
                            {[liveUser.ipIsp, liveUser.ipCountry].filter(Boolean).join(' · ') || 'Network'}
                            {getUserIpClusterCount(liveUser) >= 2 && (
                              <span className="ml-1.5 text-cyan-700 font-bold">
                                ({getUserIpClusterCount(liveUser)} IDs sharing this IP)
                              </span>
                            )}
                          </span>
                          {(liveUser.isVpn || getUserIpClusterCount(liveUser) >= 2) && !liveUser.isBanned && (
                            <button
                              type="button"
                              onClick={() =>
                                toggleUserBan(
                                  liveUser.id,
                                  liveUser.isVpn
                                    ? `VPN / Proxy detected: ${liveUser.vpnReason || 'Proxy traffic'}`
                                    : `Multi-account IP violation (${liveUser.lastIp || liveUser.registeredIp})`
                                )
                              }
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black whitespace-nowrap"
                            >
                              Quick Ban
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 mt-1">
                      <span>
                        Locked Balance:{' '}
                        <strong className={Number(liveUser.lockedBalance || 0) > 0 ? 'text-cyan-700' : 'text-slate-700'}>
                          ৳{Number(liveUser.lockedBalance || 0).toFixed(2)}
                        </strong>
                      </span>
                      {Number(liveUser.lockedBalance || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            releaseLockedBalance(liveUser.id);
                            setControlUser((prev) =>
                              prev && prev.id === liveUser.id ? { ...prev, lockedBalance: 0 } : prev
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-amber-400 text-slate-950 font-black text-[10px] whitespace-nowrap active:scale-95"
                        >
                          Release Locked
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Turnover Override */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={turnoverDraft}
                      onChange={(e) => setTurnoverDraft(e.target.value)}
                      placeholder="Required turnover ৳"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setUserTurnover(liveUser.id, Math.max(0, Number(turnoverDraft) || 0))}
                      className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black"
                    >
                      SET TURNOVER
                    </button>
                  </div>

                  {/* 6 Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setBalanceModalUser(liveUser);
                        setBalAction('add');
                        setBalAmount('');
                        setBalReason('');
                        setBalLocked(false);
                        setBalTurnover('');
                      }}
                      className="py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black flex items-center justify-center gap-1.5"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>BALANCE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxHistoryModalUser(liveUser)}
                      className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black flex items-center justify-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5 text-cyan-700" />
                      <span>TXNS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardsModalUser(liveUser)}
                      className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                      <span>CARDS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleUserBan(liveUser.id, 'Restricted by Super Controller')}
                      className={`py-2.5 rounded-xl font-black flex items-center justify-center gap-1.5 border ${
                        liveUser.isBanned
                          ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-700'
                          : 'bg-rose-50 border-rose-600/50 text-rose-700'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{liveUser.isBanned ? 'UNBAN' : 'BAN'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeModalUser(liveUser);
                        setPersonalNoticeText('');
                      }}
                      className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black flex items-center justify-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5 text-cyan-700" />
                      <span>NOTICE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyTextSafely(liveUser.uid || liveUser.id, 'User UID copied!')}
                      className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-cyan-700" />
                      <span>COPY KEY</span>
                    </button>
                  </div>

                  {/* Delete Account */}
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteUser(liveUser)}
                    className="w-full py-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-black flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DELETE ACCOUNT</span>
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2. MODIFY BALANCE MODAL (z-[60] so it renders cleanly ABOVE User Control modal) */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-cyan-700 tracking-wider">MODIFY BALANCE</h3>
                <div className="text-xs text-slate-700 mt-0.5">
                  {balanceModalUser.nickname} — Current{' '}
                  <span className="text-emerald-600 font-mono font-black">
                    ৳{Number(balanceModalUser.balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBalanceModalUser(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ACTION</label>
                <select
                  value={balAction}
                  onChange={(e) => setBalAction(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-cyan-500 font-bold text-slate-900"
                >
                  <option value="add">+ ADD BALANCE</option>
                  <option value="deduct">- DEDUCT BALANCE</option>
                  <option value="set">= SET BALANCE</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">AMOUNT ৳</label>
                <input
                  type="number"
                  value={balAmount}
                  onChange={(e) => setBalAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  CUSTOM TURNOVER REQUIREMENT (৳ OPTIONAL)
                </label>
                <input
                  type="number"
                  min={0}
                  value={balTurnover}
                  onChange={(e) => setBalTurnover(e.target.value)}
                  placeholder="0 (adds extra turnover target)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={balLocked}
                  onChange={(e) => setBalLocked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-amber-500"
                />
                <div>
                  <div className="text-[11px] font-black text-cyan-700">Locked (Non-Withdrawable)</div>
                  <div className="text-[10px] text-slate-500">
                    User can play games with this amount, but cannot withdraw until released.
                  </div>
                </div>
              </label>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">REASON</label>
                <input
                  type="text"
                  value={balReason}
                  onChange={(e) => setBalReason(e.target.value)}
                  placeholder="Optional admin note..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const amt = Number(balAmount);
                  if (balAmount.trim() === '' || isNaN(amt) || amt < 0) {
                    showToast('Please enter a valid amount');
                    return;
                  }
                  const extraTurnover = Math.max(0, Number(balTurnover) || 0);
                  const res = adminModifyUserBalance(balanceModalUser.id, balAction, amt, balReason, {
                    locked: balLocked,
                    turnover: extraTurnover > 0 ? extraTurnover : undefined
                  });
                  if (!res.success) {
                    showToast(res.message);
                    return;
                  }
                  setBalanceModalUser(null);
                  setControlUser((prev) => {
                    if (!prev || prev.id !== balanceModalUser.id) return prev;
                    const cur = Number(prev.balance || 0);
                    const curLocked = Number(prev.lockedBalance || 0);
                    const next =
                      balAction === 'add'
                        ? cur + amt
                        : balAction === 'deduct'
                        ? Math.max(0, cur - amt)
                        : amt;
                    const nextLocked =
                      balAction === 'add'
                        ? balLocked
                          ? curLocked + amt
                          : curLocked
                        : balAction === 'deduct'
                        ? Math.min(curLocked, next)
                        : balLocked
                        ? next
                        : Math.min(curLocked, next);
                    const nextTurnover = Number(prev.turnoverRequired || 0) + extraTurnover;
                    return {
                      ...prev,
                      balance: next,
                      lockedBalance: nextLocked,
                      turnoverRequired: nextTurnover
                    };
                  });
                }}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs"
              >
                APPLY TRANSACTION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. USER TXNS SUB-MODAL */}
      {txHistoryModalUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-cyan-700">TRANSACTION HISTORY</h3>
                <div className="text-[11px] text-slate-500">
                  {txHistoryModalUser.nickname} — Total{' '}
                  {transactions.filter((t) => t.userId === txHistoryModalUser.id).length}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTxHistoryModalUser(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {transactions.filter((t) => t.userId === txHistoryModalUser.id).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No Transactions Recorded</div>
              ) : (
                transactions
                  .filter((t) => t.userId === txHistoryModalUser.id)
                  .slice(0, 30)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{t.title}</div>
                        <div className="text-[10px] text-slate-500">{t.detail}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{t.time}</div>
                      </div>
                      <span
                        className={`font-mono font-black ${
                          t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {t.amount >= 0 ? '+' : ''}৳{t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. USER BOUND CARDS SUB-MODAL */}
      {cardsModalUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-700">BOUND WALLETS / CARDS</h3>
              <button
                type="button"
                onClick={() => setCardsModalUser(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {(cardsModalUser.boundWallets || []).length > 0 ? (
                cardsModalUser.boundWallets!.map((w) => (
                  <div key={w.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                    <span className={`font-black ${w.type === 'bKash' ? 'text-[#E2136E]' : 'text-cyan-700'}`}>{w.type}</span>
                    <span className="font-mono text-slate-900">{w.number}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center py-4">
                  bKash: {cardsModalUser.boundBkash || 'Not bound'} • Nagad:{' '}
                  {cardsModalUser.boundNagad || 'Not bound'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. PERSONAL NOTICE SUB-MODAL */}
      {noticeModalUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-700">PERSONAL NOTICE</h3>
              <button
                type="button"
                onClick={() => setNoticeModalUser(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500">Send to: {noticeModalUser.nickname}</div>
            <textarea
              rows={3}
              value={personalNoticeText}
              onChange={(e) => setPersonalNoticeText(e.target.value)}
              placeholder="Write personal message..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
            />
            <button
              type="button"
              onClick={() => {
                if (!personalNoticeText.trim()) {
                  showToast('Write a message first');
                  return;
                }
                adminSendUserNotice(noticeModalUser.id, personalNoticeText);
                setNoticeModalUser(null);
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-600 text-white font-black text-xs"
            >
              SEND PERSONAL NOTICE
            </button>
          </div>
        </div>
      )}

      {/* 6. DELETE USER CONFIRM MODAL */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white border border-rose-700/60 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-rose-600">DELETE USER ACCOUNT?</h3>
            <p className="text-xs text-slate-700">
              Permanently remove <strong>{confirmDeleteUser.nickname}</strong> ({confirmDeleteUser.phone || confirmDeleteUser.email})?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  adminDeleteUser(confirmDeleteUser.id);
                  setConfirmDeleteUser(null);
                  setControlUser(null);
                }}
                className="py-2.5 rounded-xl bg-rose-600 text-white font-black text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. HTML SOURCE MODAL */}
      {htmlModalGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-cyan-700">HTML SOURCE</h3>
                <div className="text-[11px] text-slate-500">{htmlModalGame.title}</div>
              </div>
              <button
                type="button"
                onClick={() => setHtmlModalGame(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-emerald-700 max-h-64 overflow-auto whitespace-pre-wrap">
              {htmlModalGame.htmlCode || `<!-- No custom HTML code configured for ${htmlModalGame.title} -->`}
            </pre>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyTextSafely(htmlModalGame.htmlCode || '', 'Code Copied!')}
                className="py-2.5 rounded-xl bg-cyan-600 text-white font-black text-xs"
              >
                COPY CODE
              </button>
              <button
                type="button"
                onClick={() => setHtmlModalGame(null)}
                className="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ADD / EDIT GAME MODAL */}
      {editGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <form
            onSubmit={handleSaveGame}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-700">
                {editGameModal.id ? 'EDIT GAME' : 'ADD NEW GAME'}
              </h3>
              <button
                type="button"
                onClick={() => setEditGameModal(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">TITLE *</label>
              <input
                type="text"
                required
                value={editGameModal.title || ''}
                onChange={(e) => setEditGameModal({ ...editGameModal, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">IMAGE URL</label>
              <input
                type="text"
                value={editGameModal.imageUrl || ''}
                onChange={(e) => setEditGameModal({ ...editGameModal, imageUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">CATEGORY</label>
              <select
                value={editGameModal.category || 'Slots'}
                onChange={(e) => setEditGameModal({ ...editGameModal, category: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              >
                <option value="Lottery">Lottery</option>
                <option value="Crash">Crash</option>
                <option value="Trading">Trading</option>
                <option value="Slots">Slots</option>
                <option value="PVC">PVC</option>
                <option value="Casino">Casino</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">URL</label>
              <input
                type="text"
                value={editGameModal.url || ''}
                onChange={(e) => setEditGameModal({ ...editGameModal, url: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">HTML CODE</label>
              <textarea
                rows={3}
                value={editGameModal.htmlCode || ''}
                onChange={(e) => setEditGameModal({ ...editGameModal, htmlCode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">BADGE</label>
                <input
                  type="text"
                  value={editGameModal.badge || ''}
                  onChange={(e) => setEditGameModal({ ...editGameModal, badge: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">PRICE / X</label>
                <input
                  type="text"
                  value={editGameModal.price || ''}
                  onChange={(e) => setEditGameModal({ ...editGameModal, price: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">SORT ORDER</label>
                <input
                  type="number"
                  value={editGameModal.sortOrder ?? 0}
                  onChange={(e) =>
                    setEditGameModal({ ...editGameModal, sortOrder: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
            </div>
            <div className="flex items-center gap-5 pt-1">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={editGameModal.active !== false}
                  onChange={(e) => setEditGameModal({ ...editGameModal, active: e.target.checked })}
                />
                <span>Active</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(editGameModal.featured)}
                  onChange={(e) => setEditGameModal({ ...editGameModal, featured: e.target.checked })}
                />
                <span>Featured</span>
              </label>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-cyan-600 text-white font-black">
              SAVE GAME
            </button>
          </form>
        </div>
      )}

      {/* 9. BANNER MODAL (MAX 10 + PREVIEW + PRESET ROUTES) */}
      {bannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <form
            onSubmit={handleSaveBanner}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-700">
                {bannerModal.id ? 'EDIT BANNER' : `ADD NEW BANNER (${(adminSettings.banners || []).length}/10)`}
              </h3>
              <button
                type="button"
                onClick={() => setBannerModal(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {bannerModal.url && (
              <div className="h-28 rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                <img src={bannerModal.url} alt="Banner Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">TITLE</label>
              <input
                type="text"
                value={bannerModal.title}
                onChange={(e) => setBannerModal({ ...bannerModal, title: e.target.value })}
                placeholder="e.g. Welcome Bonus 500%"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">IMAGE URL OR UPLOAD *</label>
              <input
                type="text"
                value={bannerModal.url}
                onChange={(e) => setBannerModal({ ...bannerModal, url: e.target.value })}
                placeholder="https://... or upload image below"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
              <label className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-cyan-700 font-bold cursor-pointer hover:bg-slate-200">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image from Device</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const compressed = await compressImageFileToDataUrl(file, 1200, 0.82);
                      setBannerModal((prev) => (prev ? { ...prev, url: compressed } : prev));
                      showToast('Banner image ready!');
                    } catch {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setBannerModal((prev) => (prev ? { ...prev, url: reader.result as string } : prev));
                      };
                      reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">TARGET PAGE LINK</label>
              <input
                type="text"
                value={bannerModal.link}
                onChange={(e) => setBannerModal({ ...bannerModal, link: e.target.value })}
                placeholder="#/wingo, #/deposit, #/aviator"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[
                  { label: 'WinGo', href: '#/wingo' },
                  { label: 'K3', href: '#/k3' },
                  { label: '5D', href: '#/5d' },
                  { label: 'Aviator', href: '#/aviator' },
                  { label: 'Binary', href: '#/binary' },
                  { label: 'Deposit', href: '#/deposit' },
                  { label: 'Activity', href: '#/activity' },
                  { label: 'VIP', href: '#/vip' }
                ].map((preset) => (
                  <button
                    key={preset.href}
                    type="button"
                    onClick={() => setBannerModal({ ...bannerModal, link: preset.href })}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                      bannerModal.link === preset.href
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">SORT ORDER</label>
              <input
                type="number"
                value={bannerModal.sortOrder}
                onChange={(e) => setBannerModal({ ...bannerModal, sortOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
            </div>
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={bannerModal.active}
                onChange={(e) => setBannerModal({ ...bannerModal, active: e.target.checked })}
              />
              <span>Active on Home Carousel</span>
            </label>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black">
              SAVE BANNER
            </button>
          </form>
        </div>
      )}

      {/* 10. GIFT CODE CREATE / EDIT MODAL */}
      {giftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <form
            onSubmit={handleSaveGiftCode}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-5 space-y-3 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-700">
                {giftModal.isEdit ? 'EDIT GIFT CODE' : 'CREATE GIFT CODE'}
              </h3>
              <button
                type="button"
                onClick={() => setGiftModal(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reward Type Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">REWARD MODE</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGiftModal({ ...giftModal, rewardType: 'fixed' })}
                  className={`py-2 rounded-xl font-black border text-[11px] ${
                    giftModal.rewardType === 'fixed'
                      ? 'bg-cyan-50 border-blue-400 text-cyan-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  Fixed Bonus (৳)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setGiftModal({
                      ...giftModal,
                      rewardType: 'deposit_percent',
                      depositBonusPercent: giftModal.depositBonusPercent || '200',
                      reason: giftModal.reason || '200% Deposit Bonus Reward'
                    })
                  }
                  className={`py-2 rounded-xl font-black border text-[11px] ${
                    giftModal.rewardType === 'deposit_percent'
                      ? 'bg-cyan-100 border-cyan-500 text-cyan-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  Deposit Bonus (%)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">GIFT CODE *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={giftModal.code}
                  onChange={(e) => setGiftModal({ ...giftModal, code: e.target.value.toUpperCase() })}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-black text-slate-900 uppercase"
                />
                <button
                  type="button"
                  onClick={() => setGiftModal({ ...giftModal, code: generateGiftCodeName() })}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-cyan-700 font-black"
                >
                  GEN
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {giftModal.rewardType === 'deposit_percent' ? (
                <div>
                  <label className="text-[10px] font-bold text-cyan-700 block mb-1">DEPOSIT BONUS %</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={giftModal.depositBonusPercent}
                    onChange={(e) => setGiftModal({ ...giftModal, depositBonusPercent: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-amber-500/50 font-mono font-black text-cyan-700"
                  />
                  <div className="flex gap-1 mt-1">
                    {['100', '150', '200', '300'].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setGiftModal({ ...giftModal, depositBonusPercent: pct })}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                          giftModal.depositBonusPercent === pct
                            ? 'bg-cyan-600 text-slate-950 border-amber-300'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">AMOUNT ৳</label>
                  <input
                    type="number"
                    required
                    value={giftModal.amount}
                    onChange={(e) => setGiftModal({ ...giftModal, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">MAX USES</label>
                <input
                  type="number"
                  required
                  value={giftModal.maxClaims}
                  onChange={(e) => setGiftModal({ ...giftModal, maxClaims: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  TURNOVER ৳ {giftModal.rewardType === 'deposit_percent' ? '(0 = Auto 1x)' : ''}
                </label>
                <input
                  type="number"
                  value={giftModal.turnoverAmount}
                  onChange={(e) => setGiftModal({ ...giftModal, turnoverAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  MIN REQUIRED BALANCE
                </label>
                <input
                  type="number"
                  value={giftModal.minRequiredBalance}
                  onChange={(e) => setGiftModal({ ...giftModal, minRequiredBalance: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">EXPIRY DATE</label>
              <input
                type="datetime-local"
                value={giftModal.expiryDate}
                onChange={(e) => setGiftModal({ ...giftModal, expiryDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
              />
            </div>

            {/* Select Target User Dropdown + Manual UID */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-cyan-700 uppercase">
                  SELECT TARGET USER (OPTIONAL)
                </label>
                {giftModal.targetUid && (
                  <button
                    type="button"
                    onClick={() => setGiftModal({ ...giftModal, targetUid: '' })}
                    className="text-[10px] font-bold text-cyan-700 hover:underline"
                  >
                    Reset to ALL
                  </button>
                )}
              </div>
              <input
                type="text"
                value={targetUserSearch}
                onChange={(e) => setTargetUserSearch(e.target.value)}
                placeholder="Search user by Nickname, UID or Phone..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-900"
              />
              <select
                value={giftModal.targetUid}
                onChange={(e) => setGiftModal({ ...giftModal, targetUid: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-amber-200"
              >
                <option value="">ALL USERS (Anyone can redeem)</option>
                {allUsers
                  .filter((u) => {
                    const q = targetUserSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (u.nickname || '').toLowerCase().includes(q) ||
                      (u.uid || '').toLowerCase().includes(q) ||
                      (u.phone || '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 60)
                  .map((u) => (
                    <option key={u.id} value={u.uid}>
                      {u.nickname || 'User'} · UID {u.uid} · {u.phone || u.email}
                    </option>
                  ))}
              </select>
              <input
                type="text"
                value={giftModal.targetUid}
                onChange={(e) => setGiftModal({ ...giftModal, targetUid: e.target.value.toUpperCase() })}
                placeholder="Or enter UID(s): e.g. EWI700012 (Blank = ALL)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-cyan-700 uppercase"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-cyan-700 block mb-1">
                GIFT REASON (SHOWN TO USER WHEN CLAIMING) *
              </label>
              <input
                type="text"
                value={giftModal.reason}
                onChange={(e) => setGiftModal({ ...giftModal, reason: e.target.value, note: e.target.value })}
                placeholder="e.g. 200% Deposit Bonus Reward / VIP Compensation"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['200% Deposit Bonus', 'VIP Loyalty Gift', 'Loss Recovery Bonus', 'Special Event Gift'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setGiftModal({ ...giftModal, reason: preset, note: preset })}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] text-slate-700 font-bold"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={giftModal.active}
                onChange={(e) => setGiftModal({ ...giftModal, active: e.target.checked })}
              />
              <span>Active</span>
            </label>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black">
              SAVE GIFT CODE
            </button>
          </form>
        </div>
      )}

      {/* 11. GIFT CODE CLAIM HISTORY MODAL */}
      {claimHistoryCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-cyan-700">CLAIM HISTORY &amp; CLAIMANTS</h3>
                <div className="text-[11px] text-slate-700 font-mono">
                  {claimHistoryCode.code} — {Math.max(claimHistoryCode.claimedCount || 0, (claimHistoryCode.claimRecords || []).length)} / {claimHistoryCode.maxClaims} Claimed
                </div>
                {(claimHistoryCode.reason || claimHistoryCode.note) && (
                  <div className="text-[10px] text-cyan-700 font-semibold mt-0.5">
                    Reason: {claimHistoryCode.reason || claimHistoryCode.note}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setClaimHistoryCode(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {(claimHistoryCode.claimRecords || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No one has claimed this code yet</div>
              ) : (
                claimHistoryCode.claimRecords!.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{rec.nickname}</span>
                        {rec.uid && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[9px] font-mono text-cyan-700">
                            {rec.uid}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{rec.contact}</div>
                      {rec.depositAmount ? (
                        <div className="text-[10px] text-cyan-700 font-mono">
                          On ৳{Number(rec.depositAmount).toFixed(0)} Deposit
                        </div>
                      ) : null}
                      <div className="text-[10px] text-slate-500">{rec.time}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-black text-emerald-600">+৳{rec.amount.toFixed(2)}</div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-black">
                        CLAIMED
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 12. BULK GIFT CODE MODAL */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <form
            onSubmit={handleBulkGenerateCodes}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-700">BULK GENERATE CODES</h3>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBulkRewardType('fixed')}
                className={`py-2 rounded-xl font-black border text-[11px] ${
                  bulkRewardType === 'fixed'
                    ? 'bg-cyan-50 border-blue-400 text-cyan-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                Fixed ৳
              </button>
              <button
                type="button"
                onClick={() => setBulkRewardType('deposit_percent')}
                className={`py-2 rounded-xl font-black border text-[11px] ${
                  bulkRewardType === 'deposit_percent'
                    ? 'bg-cyan-100 border-cyan-500 text-cyan-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                Deposit % (200%)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">QUANTITY (MAX 50)</label>
                <input
                  type="number"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  {bulkRewardType === 'deposit_percent' ? 'BONUS %' : 'AMOUNT ৳'}
                </label>
                <input
                  type="number"
                  value={bulkRewardType === 'deposit_percent' ? bulkDepositPercent : bulkAmount}
                  onChange={(e) =>
                    bulkRewardType === 'deposit_percent'
                      ? setBulkDepositPercent(e.target.value)
                      : setBulkAmount(e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">USES PER CODE</label>
                <input
                  type="number"
                  value={bulkMaxClaims}
                  onChange={(e) => setBulkMaxClaims(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">TURNOVER ৳</label>
                <input
                  type="number"
                  value={bulkTurnover}
                  onChange={(e) => setBulkTurnover(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">GIFT REASON (SHOWN TO USER)</label>
              <input
                type="text"
                value={bulkReason}
                onChange={(e) => {
                  setBulkReason(e.target.value);
                  setBulkNote(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-cyan-600 text-white font-black">
              GENERATE CODES
            </button>
          </form>
        </div>
      )}

      {/* 13. WINGO LIVE SYNC DATA MODAL */}
      {showSyncDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-700">WINGO LIVE SYNC JSON</h3>
              <button
                onClick={() => setShowSyncDataModal(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-cyan-700 max-h-72 overflow-auto">
              {JSON.stringify(
                {
                  path: wingoSyncPath,
                  mode: selectedWingoMode,
                  period: activePeriod,
                  timeRemaining: activeRem,
                  forcedOutcome: forcedSetting,
                  queued: activeQueue,
                  latestHistory: activeMarket?.history?.slice(0, 5) || []
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}

      {/* 14. REJECT WITHDRAWAL WITH REASON MODAL */}
      {rejectWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-rose-600">REJECT WITHDRAWAL</h3>
              <button
                type="button"
                onClick={() => setRejectWithdrawModal(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <div>
                User: <strong className="text-slate-900">{rejectWithdrawModal.userName}</strong>
              </div>
              <div>
                Refund Amount: <strong className="font-mono text-emerald-600">৳{rejectWithdrawModal.amount.toFixed(2)}</strong>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">
                Rejection Reason (Shown to User)
              </label>
              <textarea
                rows={3}
                value={rejectWithdrawReason}
                onChange={(e) => setRejectWithdrawReason(e.target.value)}
                placeholder="আপনি কিছুক্ষণ পর আবার চেষ্টা করুন ধন্যবাদ"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">
                Add Turnover Penalty (৳ Optional)
              </label>
              <input
                type="number"
                min={0}
                value={rejectTurnoverPenalty}
                onChange={(e) => setRejectTurnoverPenalty(e.target.value)}
                placeholder="0 (no extra turnover)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRejectWithdrawModal(null)}
                className="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const reason = rejectWithdrawReason.trim() || 'আপনি কিছুক্ষণ পর আবার চেষ্টা করুন ধন্যবাদ';
                  const penalty = Math.max(0, Number(rejectTurnoverPenalty) || 0);
                  updateWithdrawStatus(rejectWithdrawModal.id, 'rejected', reason, penalty > 0 ? penalty : undefined);
                  setRejectWithdrawModal(null);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
