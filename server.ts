import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  evaluateCrash30Cap,
  getSyncedCrashEngineState,
  getSyncedBinarySnapshot
} from './src/utils/syncedMarkets';
import { BINARY_MARKETS } from './src/constants/markets';
import { getRequestOrigin } from './api/ewi-pay/_config';
import { processEwiPayWebhookPayload } from './api/ewi-pay/_firestoreSync';
import {
  getFirestoreDoc,
  listFirestoreCollection,
  normalizeIpValue,
  parseDeviceNameNode,
  patchFirestoreDoc,
  SESSION_TTL_MS,
  signMentorToken
} from './api/_shared';

const EWI_PAY_DEFAULT_BASE = 'https://ewi-pay.vercel.app';
const EWI_PAY_DEFAULT_KEY = process.env.EWI_PAY_API_KEY || 'ewi_live_ewi777_88789947264e';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared Central JSON Store File
const DATA_FILE = path.join(__dirname, 'server-data.json');

// Server-only 2FA Secret Key (never exposed in client src/)
const ADMIN_2FA_SECRET = process.env.ADMIN_2FA_SECRET || 'EWI777-2FA-CORE-9941-SEC-X82';
const TWOFA_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OLD_DEFAULT_ADMIN_PHONE_HASH = '0aab39f411ae77619215a3cd679005519c52baa0758214ec51901ea355d006f1';
const OLD_DEFAULT_ADMIN_PASS_HASH = '07882c957ec3bb16b8f5ec021707910625689e5e011811ce855fb5aeeddc1874';
const DEFAULT_ADMIN_PHONE_HASH = '27c75197134a88ef96daf2bdb444e3d6a0a394b9fa857b886c42b1988dd75d47';
const DEFAULT_ADMIN_PASS_HASH = 'bfbbb4e8bb9a402d888fd5133a41cf3d2423b82849d05bb63b2be5740f322814';
const REQUEST_EXPIRY_MS = 60 * 60 * 1000;

function sha256HexServer(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

function extractClientIp(req: express.Request): string {
  const xff = req.headers['x-forwarded-for'];
  let ip = '';
  if (typeof xff === 'string' && xff.trim()) {
    ip = xff.split(',')[0].trim();
  } else if (Array.isArray(xff) && xff.length > 0) {
    ip = String(xff[0]).split(',')[0].trim();
  } else if (typeof req.headers['cf-connecting-ip'] === 'string') {
    ip = req.headers['cf-connecting-ip'].trim();
  } else if (typeof req.headers['x-real-ip'] === 'string') {
    ip = req.headers['x-real-ip'].trim();
  } else if (req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  }
  return normalizeIpValue(ip) || 'Unknown';
}

interface IpIntelResult {
  ip: string;
  isVpn: boolean;
  vpnReason?: string;
  country?: string;
  isp?: string;
  timezone?: string;
}

const ipIntelCache = new Map<string, { data: IpIntelResult; expiresAt: number }>();

const VPN_ISP_REGEX = /(vpn|proxy|tor\s|exit\s?node|mullvad|nordvpn|expressvpn|surfshark|proton|cyberghost|windscribe|private\s?internet|pia\b|digitalocean|amazon|aws\b|google\s?cloud|gcp\b|microsoft\s?azure|linode|akamai|vultr|hetzner|ovh|choopa|datacamp|m247|leaseweb|contabo|cloudflare\s?warp|oracle\s?cloud|alibaba\s?cloud|tencent|scaleway)/i;

function isPrivateOrLoopbackIp(ip: string): boolean {
  if (!ip || ip === 'Unknown' || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|fc00:|fe80:)/i.test(ip)) return true;
  return false;
}

async function inspectIpIntelligence(
  ip: string,
  clientTimezone?: string,
  headers?: express.Request['headers']
): Promise<IpIntelResult> {
  const cleanIp = String(ip || '').trim() || 'Unknown';
  const proxyHeaderHint = Boolean(
    headers?.via ||
      headers?.['x-proxy-id'] ||
      headers?.['forwarded'] ||
      (typeof headers?.['x-forwarded-for'] === 'string' && headers['x-forwarded-for'].split(',').length > 2)
  );

  if (isPrivateOrLoopbackIp(cleanIp)) {
    return {
      ip: cleanIp,
      isVpn: proxyHeaderHint,
      ...(proxyHeaderHint ? { vpnReason: 'Multi-hop proxy header detected' } : {}),
      country: 'Local/Private',
      isp: 'Local Network'
    };
  }

  const cached = ipIntelCache.get(cleanIp);
  let baseIntel: IpIntelResult | null = cached && cached.expiresAt > Date.now() ? { ...cached.data } : null;

  if (!baseIntel) {
    baseIntel = { ip: cleanIp, isVpn: false };
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 1800);
      const r = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}?fields=success,country,connection,timezone,security`, {
        signal: ac.signal
      });
      clearTimeout(t);
      if (r.ok) {
        const d: any = await r.json().catch(() => null);
        if (d && d.success !== false) {
          const isp = String(d.connection?.isp || d.connection?.org || '').trim();
          const secVpn = Boolean(d.security?.vpn || d.security?.proxy || d.security?.tor || d.security?.hosting);
          const ispVpn = VPN_ISP_REGEX.test(isp);
          baseIntel = {
            ip: cleanIp,
            isVpn: secVpn || ispVpn,
            country: String(d.country || '').trim() || undefined,
            isp: isp || undefined,
            timezone: String(d.timezone?.id || '').trim() || undefined,
            ...(secVpn
              ? { vpnReason: 'VPN / Proxy / Hosting IP detected' }
              : ispVpn
                ? { vpnReason: `Datacenter/VPN ISP: ${isp.slice(0, 48)}` }
                : {})
          };
        }
      }
    } catch {}

    if (!baseIntel.country) {
      try {
        const ac2 = new AbortController();
        const t2 = setTimeout(() => ac2.abort(), 1800);
        const r2 = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,country,isp,org,proxy,hosting,timezone`, {
          signal: ac2.signal
        });
        clearTimeout(t2);
        if (r2.ok) {
          const d2: any = await r2.json().catch(() => null);
          if (d2 && d2.status === 'success') {
            const isp = String(d2.isp || d2.org || '').trim();
            const flagged = Boolean(d2.proxy || d2.hosting || VPN_ISP_REGEX.test(isp));
            baseIntel = {
              ip: cleanIp,
              isVpn: flagged,
              country: String(d2.country || '').trim() || undefined,
              isp: isp || undefined,
              timezone: String(d2.timezone || '').trim() || undefined,
              ...(flagged ? { vpnReason: d2.proxy ? 'Anonymous Proxy/VPN IP' : `Hosting/Datacenter ISP: ${isp.slice(0, 48)}` } : {})
            };
          }
        }
      } catch {}
    }

    if (ipIntelCache.size >= 4000) {
      const oldestKey = ipIntelCache.keys().next().value;
      if (oldestKey) ipIntelCache.delete(oldestKey);
    }
    ipIntelCache.set(cleanIp, { data: baseIntel, expiresAt: Date.now() + 6 * 3600 * 1000 });
  }

  const reasons: string[] = [];
  if (baseIntel.vpnReason) reasons.push(baseIntel.vpnReason);
  if (proxyHeaderHint) reasons.push('Multi-hop proxy header');

  const tzClient = String(clientTimezone || '').trim();
  const tzIp = String(baseIntel.timezone || '').trim();
  if (tzClient && tzIp && tzClient !== tzIp) {
    const clientRegion = tzClient.split('/')[0];
    const ipRegion = tzIp.split('/')[0];
    if (clientRegion && ipRegion && clientRegion !== ipRegion) {
      reasons.push(`Timezone mismatch (${tzClient} vs ${tzIp})`);
    }
  }

  return {
    ...baseIntel,
    isVpn: baseIntel.isVpn || reasons.length > 0,
    ...(reasons.length > 0 ? { vpnReason: reasons.join(' • ').slice(0, 140) } : {})
  };
}

function computeAdminTotp8(stepOffset = 0): string {
  const step = Math.floor(Date.now() / 30000) + stepOffset;
  const hmac = crypto.createHmac('sha256', ADMIN_2FA_SECRET).update(`EWI777:${step}`).digest();
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += TWOFA_ALPHABET[hmac[i] & 31];
  }
  return code;
}

interface ServerStore {
  deposits: any[];
  withdraws: any[];
  users: any[];
  boundNumbers: string[];
  passwordRequests: any[];
  wingoBets: any[];
  supportMessages: any[];
  adminAccessLogs: any[];
  referrals: any[];
  marketPools: Record<string, any>;
  crashPools: Record<string, any>;
  ludoRooms: Record<string, any>;
  sportsBets: any[];
  notifications: any[];
  crashRolling?: { wagered: number; paidOut: number };
  settings: any;
}

const DEFAULT_BANNERS = [
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
    title: 'Deshi Win USDT 2% Instant Bonus ($2 - $20,000)',
    url: '/assets/brand/deshi-banner-3.jpg',
    link: '#/deposit',
    sortOrder: 3,
    active: true
  }
];

const DEFAULT_STORE: ServerStore = {
  deposits: [],
  withdraws: [],
  users: [],
  boundNumbers: [],
  passwordRequests: [],
  wingoBets: [],
  supportMessages: [],
  adminAccessLogs: [],
  referrals: [],
  marketPools: {},
  crashPools: {},
  ludoRooms: {},
  sportsBets: [],
  notifications: [],
  crashRolling: { wagered: 0, paidOut: 0 },
  settings: {
    bkashNumber: '',
    nagadNumber: '',
    rocketNumber: '',
    usdtAddress: '',
    binancePayId: '',
    firstDepositBonusAmount: 50,
    minWithdraw: 300,
    referCommissionPercent: 10,
    depositInstructions: 'Pay via EWI PAY instant bKash/Nagad gateway. Minimum deposit ৳200.',
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
      k3: 'HIGH_BET_LOSS',
      d5: 'HIGH_BET_LOSS',
      mines: 'AUTO',
      binary: 'HIGH_BET_LOSS',
      coinflip: 'HIGH_BET_LOSS'
    },
    minesPattern: 'RANDOM',
    binaryNextCandleBias: 'AUTO',
    updatedAt: 0,
    marqueeText: 'Notice: Welcome to Deshi Win online entertainment. Fast 24/7 deposits & payouts via bKash, Nagad and Binance Pay.',
    popupTitle: '',
    popupMessage: '',
    popupImageUrl: '',
    enableSystemPopup: false,
    usdtRateBdt: 120,
    banners: DEFAULT_BANNERS,
    bannersCustomized: false,
    activeGiftCodes: [],
    games: [],
    broadcasts: [],
    mentors: [],
    mentorLogs: [],
    bannedIps: [],
    mentorBlockedIps: [],
    paymentGateways: [],
    activeAdminSession: null,
    adminPhoneHash: DEFAULT_ADMIN_PHONE_HASH,
    adminPasswordHash: DEFAULT_ADMIN_PASS_HASH
  }
};

function normalizePhoneServer(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+8800')) cleaned = '0' + cleaned.slice(5);
  else if (cleaned.startsWith('+880')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('8800')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('880')) cleaned = '0' + cleaned.slice(3);
  else if (/^1[3-9]\d{8}$/.test(cleaned)) cleaned = '0' + cleaned;
  return cleaned;
}

function isValidBdPhoneServer(normPhone: string): boolean {
  const clean = String(normPhone || '').trim();
  if (clean.startsWith('+')) {
    return /^\+\d{7,15}$/.test(clean);
  }
  return /^01[3-9]\d{8}$/.test(clean);
}

function sanitizeBannerList(banners: any[]) {
  return banners.slice(0, 10).map((b: any) => {
    const rawUrl = String(b?.url || '');
    const cleanTitle = String(b?.title || '')
      .replace(/Hney Win|EWI 777|EWI777/gi, 'Deshi Win')
      .replace(/\bHney\b/gi, 'Deshi');
    if (rawUrl.includes('image_06ccef65') || rawUrl.includes('welcome-200-banner')) {
      return { ...b, title: cleanTitle, url: '/assets/brand/deshi-banner-2.jpg' };
    }
    if (rawUrl.includes('image_8c5384f7') || rawUrl.includes('image_3c433c14') || rawUrl.includes('image_046bb074')) {
      return { ...b, title: cleanTitle, url: '/assets/brand/deshi-banner-1.jpg' };
    }
    if (rawUrl.includes('image_d2e764e7')) {
      return { ...b, title: cleanTitle, url: '/assets/brand/deshi-banner-3.jpg' };
    }
    return { ...b, title: cleanTitle, url: rawUrl };
  });
}

function redactPublicSettings(s: any) {
  const {
    adminPhone: _ap,
    adminPassword: _apw,
    adminPhoneHash: _aph,
    adminPasswordHash: _apwh,
    ...safe
  } = s || {};
  return safe;
}

function sanitizeLegacyNumberIfNeeded(val: string): string {
  const norm = normalizePhoneServer(String(val || '').trim());
  if (!norm) return '';
  return sha256HexServer(norm) === DEFAULT_ADMIN_PHONE_HASH ? '' : String(val || '').trim();
}

function loadStore(): ServerStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const savedSettings = parsed.settings || {};
      const hasCustomBanners = Boolean(savedSettings.bannersCustomized);
      const rawMigratedPhoneHash =
        savedSettings.adminPhoneHash ||
        (savedSettings.adminPhone
          ? sha256HexServer(normalizePhoneServer(String(savedSettings.adminPhone)))
          : DEFAULT_ADMIN_PHONE_HASH);
      const rawMigratedPassHash =
        savedSettings.adminPasswordHash ||
        (savedSettings.adminPassword
          ? sha256HexServer(String(savedSettings.adminPassword))
          : DEFAULT_ADMIN_PASS_HASH);
      const migratedPhoneHash =
        rawMigratedPhoneHash === OLD_DEFAULT_ADMIN_PHONE_HASH ? DEFAULT_ADMIN_PHONE_HASH : rawMigratedPhoneHash;
      const migratedPassHash =
        rawMigratedPassHash === OLD_DEFAULT_ADMIN_PASS_HASH ? DEFAULT_ADMIN_PASS_HASH : rawMigratedPassHash;
      const { adminPhone: _p, adminPassword: _pw, ...cleanSaved } = savedSettings;
      return {
        ...DEFAULT_STORE,
        ...parsed,
        deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
        withdraws: Array.isArray(parsed.withdraws) ? parsed.withdraws : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
        boundNumbers: Array.isArray(parsed.boundNumbers) ? parsed.boundNumbers : [],
        passwordRequests: Array.isArray(parsed.passwordRequests) ? parsed.passwordRequests : [],
        wingoBets: Array.isArray(parsed.wingoBets) ? parsed.wingoBets : [],
        supportMessages: Array.isArray(parsed.supportMessages) ? parsed.supportMessages : [],
        adminAccessLogs: Array.isArray(parsed.adminAccessLogs) ? parsed.adminAccessLogs : [],
        referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
        marketPools: parsed.marketPools && typeof parsed.marketPools === 'object' ? parsed.marketPools : {},
        crashPools: parsed.crashPools && typeof parsed.crashPools === 'object' ? parsed.crashPools : {},
        ludoRooms: parsed.ludoRooms && typeof parsed.ludoRooms === 'object' ? parsed.ludoRooms : {},
        sportsBets: Array.isArray(parsed.sportsBets) ? parsed.sportsBets : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        crashRolling:
          parsed.crashRolling && typeof parsed.crashRolling === 'object'
            ? {
                wagered: Math.max(0, Number(parsed.crashRolling.wagered) || 0),
                paidOut: Math.max(0, Number(parsed.crashRolling.paidOut) || 0)
              }
            : { wagered: 0, paidOut: 0 },
        settings: {
          ...DEFAULT_STORE.settings,
          ...cleanSaved,
          depositEnabled: typeof cleanSaved.depositEnabled === 'boolean' ? cleanSaved.depositEnabled : true,
          gameControlModes: {
            ...DEFAULT_STORE.settings.gameControlModes,
            ...(cleanSaved.gameControlModes || {})
          },
          bkashNumber: sanitizeLegacyNumberIfNeeded(cleanSaved.bkashNumber),
          nagadNumber: sanitizeLegacyNumberIfNeeded(cleanSaved.nagadNumber),
          supportPhone: sanitizeLegacyNumberIfNeeded(cleanSaved.supportPhone),
          adminPhoneHash: migratedPhoneHash,
          adminPasswordHash: migratedPassHash,
          binancePayId: String(cleanSaved.binancePayId || '').trim(),
          firstDepositBonusAmount:
            typeof cleanSaved.firstDepositBonusAmount === 'number' && cleanSaved.firstDepositBonusAmount >= 0
              ? cleanSaved.firstDepositBonusAmount
              : 50,
          popupTitle: '',
          popupMessage: '',
          popupImageUrl: '',
          enableSystemPopup: false,
          appName:
            !cleanSaved.appName || /^(ewi\s*777|ewi777|hney\s*win|hneywin|honey\s*win|honey)$/i.test(String(cleanSaved.appName).trim())
              ? 'Deshi Win'
              : String(cleanSaved.appName),
          marqueeText:
            typeof cleanSaved.marqueeText === 'string' && cleanSaved.marqueeText
              ? cleanSaved.marqueeText
                  .replace(/Hney Win|EWI 777|EWI777/gi, 'Deshi Win')
                  .replace(/\bHney\b/gi, 'Deshi')
              : DEFAULT_STORE.settings.marqueeText,
          banners: hasCustomBanners
            ? (Array.isArray(cleanSaved.banners) ? sanitizeBannerList(cleanSaved.banners) : DEFAULT_BANNERS)
            : DEFAULT_BANNERS
        }
      };
    }
  } catch (err) {
    console.error('Failed to load server data:', err);
  }
  return { ...DEFAULT_STORE };
}

function trimStoreForScale(target: ServerStore) {
  const now = Date.now();
  if (Array.isArray(target.deposits) && target.deposits.length > 2500) {
    target.deposits = target.deposits.slice(0, 2500);
  }
  if (Array.isArray(target.withdraws) && target.withdraws.length > 2500) {
    target.withdraws = target.withdraws.slice(0, 2500);
  }
  if (Array.isArray(target.wingoBets) && target.wingoBets.length > 500) {
    target.wingoBets = target.wingoBets.slice(0, 500);
  }
  if (Array.isArray(target.sportsBets) && target.sportsBets.length > 1000) {
    target.sportsBets = target.sportsBets.slice(0, 1000);
  }
  if (Array.isArray(target.supportMessages) && target.supportMessages.length > 400) {
    target.supportMessages = target.supportMessages.slice(-400);
  }
  if (Array.isArray(target.notifications) && target.notifications.length > 400) {
    target.notifications = target.notifications.slice(0, 400);
  }
  if (Array.isArray(target.adminAccessLogs) && target.adminAccessLogs.length > 200) {
    target.adminAccessLogs = target.adminAccessLogs.slice(0, 200);
  }
  if (Array.isArray(target.referrals) && target.referrals.length > 5000) {
    target.referrals = target.referrals.slice(0, 5000);
  }
  if (target.marketPools && typeof target.marketPools === 'object') {
    const cutoff = now - 20 * 60 * 1000;
    const prunedPools: Record<string, any> = {};
    for (const [k, v] of Object.entries(target.marketPools)) {
      if (v && Number((v as any).updatedAt || 0) >= cutoff) prunedPools[k] = v;
    }
    target.marketPools = prunedPools;
  }
  if (target.ludoRooms && typeof target.ludoRooms === 'object') {
    const cutoff = now - 2 * 3600 * 1000;
    const entries = Object.entries(target.ludoRooms)
      .filter(([, v]) => v && (Number((v as any).updatedAt || 0) >= cutoff || (v as any).status === 'playing' || (v as any).status === 'waiting'))
      .sort((a, b) => Number((b[1] as any)?.updatedAt || 0) - Number((a[1] as any)?.updatedAt || 0))
      .slice(0, 200);
    target.ludoRooms = Object.fromEntries(entries);
  }
}

let pendingSaveTimer: NodeJS.Timeout | null = null;
let isWritingStore = false;
let dirtyDuringWrite = false;
let lastStoreRef: ServerStore | null = null;

async function flushStoreAsync(target: ServerStore) {
  if (isWritingStore) {
    dirtyDuringWrite = true;
    lastStoreRef = target;
    return;
  }
  isWritingStore = true;
  try {
    trimStoreForScale(target);
    const json = JSON.stringify(target);
    const tmpFile = `${DATA_FILE}.tmp`;
    await fs.promises.writeFile(tmpFile, json, 'utf-8');
    await fs.promises.rename(tmpFile, DATA_FILE);
  } catch (err) {
    console.error('Failed to save server data:', err);
  } finally {
    isWritingStore = false;
    if (dirtyDuringWrite && lastStoreRef) {
      dirtyDuringWrite = false;
      const next = lastStoreRef;
      void flushStoreAsync(next);
    }
  }
}

function flushStoreSync(target: ServerStore) {
  try {
    if (pendingSaveTimer) {
      clearTimeout(pendingSaveTimer);
      pendingSaveTimer = null;
    }
    trimStoreForScale(target);
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(target), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.error('Failed to flush server data synchronously:', err);
  }
}

function saveStore(target: ServerStore) {
  lastStoreRef = target;
  if (pendingSaveTimer) return;
  pendingSaveTimer = setTimeout(() => {
    pendingSaveTimer = null;
    if (lastStoreRef) void flushStoreAsync(lastStoreRef);
  }, 250);
  pendingSaveTimer.unref?.();
}

let store = loadStore();

function getPlayableBalanceServer(u: any): number {
  if (!u) return 0;
  const total = Math.max(0, Number(u.balance) || 0);
  const locked = Math.max(0, Number(u.lockedBalance) || 0);
  return Math.max(0, +(total - locked).toFixed(2));
}

function findUserServer(userId?: string, uid?: string, phone?: string): any | null {
  const cleanId = String(userId || '').trim();
  const cleanUid = String(uid || '').trim();
  const normPhone = normalizePhoneServer(String(phone || ''));
  return (
    (store.users || []).find(
      (u: any) =>
        (cleanId && (u.id === cleanId || u.uid === cleanId)) ||
        (cleanUid && u.uid === cleanUid) ||
        (normPhone && normalizePhoneServer(u.phone || '') === normPhone)
    ) || null
  );
}

function resolveCreatedAtMs(rec: any): number {
  if (typeof rec?.createdAtMs === 'number' && Number.isFinite(rec.createdAtMs) && rec.createdAtMs > 0) {
    return rec.createdAtMs;
  }
  const rawId = String(rec?.id || '');
  const idMatch = rawId.match(/_(\d{13})(?:_|$)/);
  if (idMatch) {
    const parsedIdTs = Number(idMatch[1]);
    if (Number.isFinite(parsedIdTs) && parsedIdTs > 0) return parsedIdTs;
  }
  if (rec?.time) {
    const parsed = Date.parse(String(rec.time));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return Date.now();
}

function sweepExpiredRequests() {
  const now = Date.now();
  let changed = false;

  for (const dep of store.deposits || []) {
    if (dep && (dep.status === 'pending' || dep.status === 'processing')) {
      const ts = resolveCreatedAtMs(dep);
      if (!dep.createdAtMs) dep.createdAtMs = ts;
      if (now - ts >= REQUEST_EXPIRY_MS) {
        dep.status = 'rejected';
        dep.adminNote = 'Expired after 1 hour';
        dep.rejectionReason = 'Expired after 1 hour';
        changed = true;
      }
    }
  }

  for (const wd of store.withdraws || []) {
    if (wd && (wd.status === 'pending' || wd.status === 'processing')) {
      const ts = resolveCreatedAtMs(wd);
      if (!wd.createdAtMs) wd.createdAtMs = ts;
      if (now - ts >= REQUEST_EXPIRY_MS) {
        wd.status = 'rejected';
        wd.adminNote = 'Expired after 1 hour (Refunded)';
        wd.rejectionReason = 'Expired after 1 hour (Refunded)';
        wd.userMessage = 'সময়সীমা ১ ঘণ্টা অতিক্রম করায় উত্তোলন বাতিল ও ব্যালেন্স ফেরত দেওয়া হয়েছে।';
        const uIdx = store.users.findIndex((u: any) => u.id === wd.userId || u.uid === wd.userId);
        if (uIdx >= 0) {
          store.users[uIdx].balance = +(Number(store.users[uIdx].balance || 0) + Number(wd.amount || 0)).toFixed(2);
          store.users[uIdx].updatedAt = now;
        }
        changed = true;
      }
    }
  }

  if (changed) {
    saveStore(store);
  }
}

function recordServerAccessLog(
  req: express.Request,
  action: 'visit' | 'login_step1' | 'login_success' | 'login_failed',
  phoneAttempt?: string,
  sessionId?: string
) {
  const nowMs = Date.now();
  const cleanSession = sessionId ? String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : '';
  if (cleanSession && action === 'visit') {
    const existingIdx = (store.adminAccessLogs || []).findIndex(
      (x: any) => x.sessionId === cleanSession && x.action === 'visit'
    );
    if (existingIdx >= 0) {
      const existing = store.adminAccessLogs[existingIdx];
      existing.lastSeenAtMs = nowMs;
      existing.staySeconds = Math.max(0, Math.round((nowMs - (existing.enteredAtMs || nowMs)) / 1000));
      saveStore(store);
      return existing;
    }
  }
  const entry = {
    id: cleanSession && action === 'visit' ? `log_${cleanSession}` : `log_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
    ...(cleanSession ? { sessionId: cleanSession } : {}),
    ip: extractClientIp(req),
    enteredAt: new Date(nowMs).toLocaleString('en-GB'),
    enteredAtMs: nowMs,
    lastSeenAtMs: nowMs,
    staySeconds: 0,
    action,
    ...(phoneAttempt ? { phoneAttempt: String(phoneAttempt).slice(0, 40) } : {}),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 180),
    route: '/admin-ewi777-panel-009'
  };
  store.adminAccessLogs = [entry, ...(store.adminAccessLogs || []).filter((x: any) => x.id !== entry.id)].slice(0, 250);
  saveStore(store);
  return entry;
}

function resolveListenPort(): number {
  const portArgIdx = process.argv.findIndex((a) => a === '--port' || a === '-p');
  if (portArgIdx >= 0 && process.argv[portArgIdx + 1]) {
    const parsed = parseInt(process.argv[portArgIdx + 1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const eqArg = process.argv.find((a) => a.startsWith('--port='));
  if (eqArg) {
    const parsed = parseInt(eqArg.split('=')[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
  const nginxPort = process.env.NGINX_PORT ? parseInt(process.env.NGINX_PORT, 10) : NaN;
  if (Number.isFinite(envPort) && envPort > 0 && envPort !== nginxPort) {
    return envPort;
  }
  const defaultPort = process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT, 10) : NaN;
  return Number.isFinite(defaultPort) && defaultPort > 0 ? defaultPort : 3000;
}

async function startServer() {
  const app = express();
  const PORT = resolveListenPort();

  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      }
    })
  );
  app.use(express.static(path.join(__dirname, 'public')));

  // Global IP Ban check on API routes (allows /api/security/* and /api/settings GET so client can render lock screen)
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/security/') || req.path === '/settings' && req.method === 'GET' || req.path.startsWith('/ewi-pay/webhook')) {
      return next();
    }
    const clientIp = normalizeIpValue(extractClientIp(req));
    const banned: string[] = Array.isArray(store.settings?.bannedIps)
      ? store.settings.bannedIps.map((x: any) => normalizeIpValue(String(x)))
      : [];
    if (clientIp && clientIp !== 'Unknown' && banned.includes(clientIp)) {
      return res.status(403).json({
        success: false,
        bannedIp: true,
        ip: clientIp,
        message: 'Access denied: Your IP address has been restricted by Administrator.'
      });
    }
    return next();
  });

  // =================== GLOBAL API ROUTES ===================

  // 1. Deposits API (Shared across all phones/devices worldwide)
  app.get('/api/deposits', (req, res) => {
    sweepExpiredRequests();
    const userIdFilter = String(req.query.userId || '').trim();
    const phoneFilter = normalizePhoneServer(String(req.query.phone || ''));
    if (userIdFilter || phoneFilter) {
      const matched = (store.deposits || []).filter((d: any) => {
        if (userIdFilter && (d.userId === userIdFilter || d.senderNumber === userIdFilter)) return true;
        if (phoneFilter) {
          const dp = normalizePhoneServer(String(d.userPhone || d.senderNumber || ''));
          if (dp && dp === phoneFilter) return true;
        }
        return false;
      });
      return res.json({ success: true, deposits: matched.slice(0, 150) });
    }
    res.json({ success: true, deposits: (store.deposits || []).slice(0, 800) });
  });

  app.post('/api/deposits', (req, res) => {
    if (store.settings.depositEnabled === false) {
      return res.status(403).json({ success: false, message: 'Deposit system is currently disabled by Administrator' });
    }
    const { id: clientId, orderId, userId, userPhone, method, channel, amount, senderNumber, trxId, createdAtMs } = req.body;
    if (!amount || !senderNumber || !trxId) {
      return res.status(400).json({ success: false, message: 'Missing required deposit fields' });
    }

    const nowMs = Number(createdAtMs) || Date.now();
    const depId = String(clientId || orderId || `dep_${nowMs}_${Math.random().toString(36).substring(2, 7)}`).trim();
    const cleanTrx = String(trxId).trim().toUpperCase();
    const cleanOrder = String(orderId || depId).trim();

    const newDep = {
      id: depId,
      orderId: cleanOrder,
      userId: userId || 'guest',
      userPhone: String(userPhone || senderNumber).trim(),
      method: method || 'bKash',
      channel: channel || 'App',
      amount: Number(amount),
      senderNumber: String(senderNumber).trim(),
      trxId: cleanTrx,
      status: 'pending',
      createdAtMs: nowMs,
      time: new Date(nowMs).toLocaleString()
    };

    store.deposits = [
      newDep,
      ...(store.deposits || []).filter(
        (d: any) => d.id !== newDep.id && d.orderId !== newDep.orderId && d.trxId !== newDep.trxId
      )
    ];
    saveStore(store);

    console.log(`[DEPOSIT SUBMITTED] ৳${amount} via ${method} (TRX: ${trxId}) from phone: ${senderNumber}`);
    res.json({ success: true, deposit: newDep });
  });

  app.post('/api/deposits/approve', (req, res) => {
    const { id } = req.body;
    const dep = store.deposits.find((d) => d.id === id);
    if (!dep) {
      return res.status(404).json({ success: false, message: 'Deposit not found' });
    }
    if (dep.status === 'approved') {
      return res.json({ success: true, deposit: dep, alreadyApproved: true });
    }

    dep.status = 'approved';
    const isUsdtDeposit = String(dep.method || '').toUpperCase() === 'USDT';
    const usdtAutoBonus = isUsdtDeposit ? +(Number(dep.amount || 0) * 0.02).toFixed(2) : 0;

    // Credit user if user exists on server
    const user = store.users.find((u) => u.id === dep.userId || u.phone === dep.userPhone);
    if (user) {
      user.balance = +(Number(user.balance || 0) + Number(dep.amount || 0) + usdtAutoBonus).toFixed(2);
      user.totalDeposited = +(Number(user.totalDeposited || 0) + Number(dep.amount || 0)).toFixed(2);
      user.updatedAt = Date.now();
    }

    saveStore(store);
    res.json({ success: true, deposit: dep, usdtAutoBonus });
  });

  app.post('/api/deposits/reject', (req, res) => {
    const { id, note } = req.body;
    const dep = store.deposits.find((d) => d.id === id);
    if (!dep) {
      return res.status(404).json({ success: false, message: 'Deposit not found' });
    }

    dep.status = 'rejected';
    dep.adminNote = note;
    saveStore(store);
    res.json({ success: true, deposit: dep });
  });

  // 2. Users & Strict Auth API (Centrally maintained, 1 account per phone)
  app.get('/api/users', (req, res) => {
    const userIdFilter = String(req.query.userId || '').trim();
    const uidFilter = String(req.query.uid || '').trim();
    const phoneFilter = normalizePhoneServer(String(req.query.phone || ''));
    if (userIdFilter || uidFilter || phoneFilter) {
      const matched = (store.users || []).filter(
        (u: any) =>
          (userIdFilter && (u.id === userIdFilter || u.uid === userIdFilter)) ||
          (uidFilter && u.uid === uidFilter) ||
          (phoneFilter && normalizePhoneServer(u.phone || '') === phoneFilter)
      );
      return res.json({ success: true, users: matched });
    }
    res.json({ success: true, users: store.users });
  });

  app.post('/api/auth/register', async (req, res) => {
    if (store.settings.registrationEnabled === false) {
      return res.status(403).json({ success: false, message: 'New user registration is currently disabled by Administrator' });
    }
    const { user: clientUser, clientTimezone } = req.body;
    if (!clientUser) {
      return res.status(400).json({ success: false, message: 'User payload required' });
    }
    const rawPass = String(clientUser.loginPassword || '');
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(rawPass)) {
      return res.status(400).json({
        success: false,
        message: 'The password must be at least 8 digits and must contain letters + numbers'
      });
    }
    const normPhone = normalizePhoneServer(clientUser.phone || '');
    const normEmail = (clientUser.email || '').trim().toLowerCase();

    if (!normEmail && !isValidBdPhoneServer(normPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid mobile number starting with 1.'
      });
    }

    const duplicate = store.users.find((u) => {
      const uPhone = normalizePhoneServer(u.phone || '');
      const uEmail = (u.email || '').trim().toLowerCase();
      return (normPhone && uPhone === normPhone) || (normEmail && uEmail === normEmail);
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This phone number already has an account! Only 1 account per number is allowed.'
      });
    }

    const rawInvite = String(clientUser.referredBy || '').trim();
    let matchedReferrer: any = null;
    if (rawInvite) {
      matchedReferrer = store.users.find(
        (u) =>
          String(u.inviteCode || '').trim().toUpperCase() === rawInvite.toUpperCase() ||
          String(u.uid || '').trim().toUpperCase() === rawInvite.toUpperCase()
      );
      if (!matchedReferrer) {
        return res.status(400).json({
          success: false,
          message: 'Refer Code is not Valid'
        });
      }
    }

    const clientIp = extractClientIp(req);
    const intel = await inspectIpIntelligence(clientIp, clientTimezone, req.headers);
    const resolvedDevice = String(clientUser.deviceName || '').trim() || parseDeviceNameNode(String(req.headers['user-agent'] || ''));

    const sanitized = {
      ...clientUser,
      phone: normPhone || clientUser.phone,
      email: normEmail || clientUser.email,
      referredBy: matchedReferrer ? (matchedReferrer.inviteCode || rawInvite.toUpperCase()) : '',
      balance: 0,
      safeBalance: 0,
      totalDeposited: 0,
      turnoverRequired: 0,
      turnoverCompleted: 0,
      minesRoundSeq: 0,
      registeredIp: clientIp,
      lastIp: clientIp,
      deviceName: resolvedDevice,
      isVpn: intel.isVpn,
      ...(intel.vpnReason ? { vpnReason: intel.vpnReason } : {}),
      ...(intel.country ? { ipCountry: intel.country } : {}),
      ...(intel.isp ? { ipIsp: intel.isp } : {})
    };
    store.users.push(sanitized);

    if (matchedReferrer) {
      const refEntry = {
        id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        referrerCode: matchedReferrer.inviteCode || matchedReferrer.uid,
        phone: sanitized.phone || sanitized.email || '',
        uid: sanitized.uid || sanitized.id,
        nickname: sanitized.nickname || 'Member',
        registrationDate: new Date().toISOString().slice(0, 10),
        commission: 0,
        depositAmount: 0,
        level: 1,
        status: 'active'
      };
      store.referrals = [refEntry, ...(store.referrals || [])];
    }

    saveStore(store);
    res.json({ success: true, user: sanitized });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { identifier, password, clientTimezone, deviceName } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Phone/email and password are required' });
    }
    const trimmed = String(identifier).trim();
    const normInput = trimmed.includes('@') ? trimmed.toLowerCase() : normalizePhoneServer(trimmed);

    const existing = store.users.find((u) => {
      const uPhone = normalizePhoneServer(u.phone || '');
      const uEmail = (u.email || '').trim().toLowerCase();
      return (normInput && (uPhone === normInput || uEmail === normInput)) || u.uid === trimmed;
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Account not found! Only registered IDs can log in. Please register first.'
      });
    }

    if (existing.isBanned) {
      return res.status(403).json({
        success: false,
        banned: true,
        message: 'This account has been banned. Please contact Customer Care.'
      });
    }

    if (existing.loginPassword && existing.loginPassword !== password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect login password! Please try again.'
      });
    }

    const clientIp = extractClientIp(req);
    const intel = await inspectIpIntelligence(clientIp, clientTimezone, req.headers);
    existing.lastIp = clientIp;
    if (!existing.registeredIp) existing.registeredIp = clientIp;
    existing.deviceName = String(deviceName || '').trim() || parseDeviceNameNode(String(req.headers['user-agent'] || '')) || existing.deviceName;
    existing.isVpn = intel.isVpn;
    if (intel.vpnReason) existing.vpnReason = intel.vpnReason;
    else delete existing.vpnReason;
    if (intel.country) existing.ipCountry = intel.country;
    if (intel.isp) existing.ipIsp = intel.isp;
    saveStore(store);

    res.json({ success: true, user: existing });
  });

  app.post('/api/users/ip-ping', async (req, res) => {
    const { userId, uid, phone, clientTimezone } = req.body || {};
    const clientIp = extractClientIp(req);
    const intel = await inspectIpIntelligence(clientIp, clientTimezone, req.headers);
    const normPhone = normalizePhoneServer(String(phone || ''));
    const idx = store.users.findIndex(
      (u) =>
        (userId && u.id === userId) ||
        (uid && u.uid === uid) ||
        (normPhone && normalizePhoneServer(u.phone || '') === normPhone)
    );
    if (idx >= 0) {
      const target = store.users[idx];
      target.lastIp = clientIp;
      if (!target.registeredIp) target.registeredIp = clientIp;
      target.isVpn = intel.isVpn;
      if (intel.vpnReason) target.vpnReason = intel.vpnReason;
      else delete target.vpnReason;
      if (intel.country) target.ipCountry = intel.country;
      if (intel.isp) target.ipIsp = intel.isp;
      saveStore(store);
    }
    res.json({ success: true, intel });
  });

  app.get('/api/security/ip-report', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const ipBuckets = new Map<string, any[]>();
    const vpnUsers: any[] = [];

    for (const u of store.users || []) {
      const primaryIp = String(u.lastIp || u.registeredIp || '').trim();
      const regIp = String(u.registeredIp || '').trim();
      const userSummary = {
        id: u.id,
        uid: u.uid,
        nickname: u.nickname || 'Member',
        phone: u.phone || u.email || '',
        balance: Number(u.balance) || 0,
        registeredIp: regIp || primaryIp || 'Unknown',
        lastIp: primaryIp || 'Unknown',
        deviceName: u.deviceName || '',
        isVpn: Boolean(u.isVpn),
        vpnReason: u.vpnReason || '',
        ipCountry: u.ipCountry || '',
        ipIsp: u.ipIsp || '',
        isBanned: Boolean(u.isBanned),
        lastLogin: u.lastLogin || ''
      };

      if (userSummary.isVpn) {
        vpnUsers.push(userSummary);
      }

      const ipsToTrack = new Set<string>();
      if (primaryIp && primaryIp !== 'Unknown') ipsToTrack.add(primaryIp);
      if (regIp && regIp !== 'Unknown') ipsToTrack.add(regIp);
      ipsToTrack.forEach((ipAddr) => {
        const list = ipBuckets.get(ipAddr) || [];
        if (!list.some((x) => x.id === userSummary.id)) {
          list.push(userSummary);
          ipBuckets.set(ipAddr, list);
        }
      });
    }

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

    res.json({
      success: true,
      multiIpGroups,
      vpnUsers,
      totalTrackedUsers: (store.users || []).length
    });
  });

  const getSyncedMentorSettingsDoc = async (): Promise<Record<string, any>> => {
    const fbDoc = await getFirestoreDoc('appConfig', 'settings').catch(() => null);
    if (fbDoc && typeof fbDoc === 'object') {
      const fbTs = Number(fbDoc.updatedAt || 0);
      const localTs = Number(store.settings?.updatedAt || 0);
      const preferRemote = fbTs >= localTs;
      const merged = preferRemote
        ? { ...store.settings, ...fbDoc }
        : { ...fbDoc, ...store.settings };
      if (preferRemote) {
        store.settings = { ...store.settings, ...merged };
      }
      return merged;
    }
    return store.settings || {};
  };

  app.get('/api/security/status', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const clientIp = normalizeIpValue(extractClientIp(req)) || 'Unknown';
    const deviceName = parseDeviceNameNode(String(req.headers['user-agent'] || ''));
    const settingsDoc = await getSyncedMentorSettingsDoc();
    const banned: string[] = Array.isArray(settingsDoc?.bannedIps)
      ? settingsDoc.bannedIps.map((x: any) => normalizeIpValue(String(x)))
      : [];
    const mentorBlocked = Array.isArray(settingsDoc?.mentorBlockedIps) ? settingsDoc.mentorBlockedIps : [];
    res.json({
      success: true,
      ip: clientIp,
      deviceName,
      isBannedIp: clientIp !== 'Unknown' && banned.includes(clientIp),
      isMentorBlocked:
        clientIp !== 'Unknown' && mentorBlocked.some((b: any) => normalizeIpValue(String(b?.ip || '')) === clientIp)
    });
  });

  app.post('/api/security/ban-ip', (req, res) => {
    const targetIp = normalizeIpValue(String(req.body?.ip || ''));
    const unban = Boolean(req.body?.unban);
    if (!targetIp || targetIp === 'Unknown') {
      return res.status(400).json({ success: false, message: 'Valid IP required' });
    }
    const prev: string[] = Array.isArray(store.settings?.bannedIps)
      ? store.settings.bannedIps.map((x: any) => normalizeIpValue(String(x))).filter(Boolean)
      : [];
    const nextBanned = unban ? prev.filter((x) => x !== targetIp) : Array.from(new Set([...prev, targetIp]));
    store.settings.bannedIps = nextBanned;
    store.settings.updatedAt = Date.now();
    saveStore(store);
    res.json({ success: true, bannedIps: nextBanned });
  });

  app.post('/api/users/sync', (req, res) => {
    const clientUser = req.body.user;
    const clientIp = extractClientIp(req);
    if (clientUser && (clientUser.phone || clientUser.email || clientUser.id)) {
      const normPhone = normalizePhoneServer(clientUser.phone || '');
      const idx = store.users.findIndex(
        (u) =>
          u.id === clientUser.id ||
          (clientUser.uid && u.uid === clientUser.uid) ||
          (normPhone && normalizePhoneServer(u.phone || '') === normPhone)
      );
      if (idx >= 0) {
        const existing = store.users[idx];
        const existingTs = Number(existing.updatedAt || 0);
        const clientTs = Number(clientUser.updatedAt || 0);
        if (existingTs > 0 && clientTs > 0 && clientTs < existingTs) {
          return res.json({ success: true, user: existing, ignoredStale: true });
        }
        const preservedAvatar = clientUser.avatar || existing.avatar || '';
        const mergedTs = Math.max(existingTs, clientTs || Date.now());
        // Keep lockedBalance server-authoritative so stale client snapshots never clear an admin Hold
        const authoritativeLocked =
          existing.lockedBalance !== undefined
            ? Math.max(0, Number(existing.lockedBalance) || 0)
            : Math.max(0, Number(clientUser.lockedBalance) || 0);
        store.users[idx] = {
          ...existing,
          ...clientUser,
          balance: Math.max(0, Number(clientUser.balance ?? existing.balance ?? 0) || 0),
          lockedBalance: authoritativeLocked,
          avatar: preservedAvatar,
          registeredIp: existing.registeredIp || clientUser.registeredIp || (clientIp !== 'Unknown' ? clientIp : undefined),
          lastIp: existing.lastIp || clientUser.lastIp || (clientIp !== 'Unknown' ? clientIp : undefined),
          isVpn: existing.isVpn ?? clientUser.isVpn,
          vpnReason: existing.vpnReason || clientUser.vpnReason,
          ipCountry: existing.ipCountry || clientUser.ipCountry,
          ipIsp: existing.ipIsp || clientUser.ipIsp,
          updatedAt: mergedTs
        };
      } else {
        store.users.push({
          ...clientUser,
          balance: Math.max(0, Number(clientUser.balance) || 0),
          lockedBalance: Math.max(0, Number(clientUser.lockedBalance) || 0),
          registeredIp: clientUser.registeredIp || (clientIp !== 'Unknown' ? clientIp : undefined),
          lastIp: clientUser.lastIp || (clientIp !== 'Unknown' ? clientIp : undefined),
          updatedAt: Number(clientUser.updatedAt || Date.now())
        });
      }
      saveStore(store);
    }
    res.json({ success: true });
  });

  app.post('/api/users/modify-balance', (req, res) => {
    const {
      userId,
      action,
      amount,
      userPhone,
      fallbackUser,
      lockedBalance,
      locked,
      turnoverRequired,
      turnoverDelta
    } = req.body || {};
    const normPhone = normalizePhoneServer(String(userPhone || fallbackUser?.phone || ''));
    let idx = store.users.findIndex(
      (u) =>
        u.id === userId ||
        u.uid === userId ||
        (normPhone && normalizePhoneServer(u.phone || '') === normPhone)
    );
    if (idx < 0 && fallbackUser && (fallbackUser.id || fallbackUser.phone || fallbackUser.email)) {
      store.users.push({ ...fallbackUser });
      idx = store.users.length - 1;
    }
    if (idx < 0) return res.status(404).json({ success: false, message: 'User not found' });
    const numAmt = Number(amount) || 0;
    const curBal = Math.max(0, Number(store.users[idx].balance || 0));
    let nextBal = curBal;
    if (action === 'add') nextBal = +(curBal + numAmt).toFixed(2);
    else if (action === 'deduct') nextBal = +Math.max(0, curBal - numAmt).toFixed(2);
    else if (action === 'set') nextBal = +Math.max(0, numAmt).toFixed(2);
    store.users[idx].balance = nextBal;

    const curLocked = Math.max(0, Number(store.users[idx].lockedBalance || 0));
    if (lockedBalance !== undefined) {
      store.users[idx].lockedBalance = Math.max(0, +(Number(lockedBalance) || 0).toFixed(2));
    } else if (locked === true) {
      if (action === 'add') store.users[idx].lockedBalance = +(curLocked + Math.max(0, numAmt)).toFixed(2);
      else if (action === 'set') store.users[idx].lockedBalance = nextBal;
    } else if (locked === false) {
      store.users[idx].lockedBalance = Math.min(curLocked, nextBal);
    } else if (curLocked > nextBal) {
      store.users[idx].lockedBalance = nextBal;
    }

    if (turnoverRequired !== undefined) {
      store.users[idx].turnoverRequired = Math.max(0, Number(turnoverRequired) || 0);
    } else if (turnoverDelta !== undefined) {
      store.users[idx].turnoverRequired = Math.max(
        0,
        +(Number(store.users[idx].turnoverRequired || 0) + (Number(turnoverDelta) || 0)).toFixed(2)
      );
    }

    store.users[idx].updatedAt = Date.now();
    saveStore(store);
    res.json({ success: true, user: store.users[idx] });
  });

  app.post('/api/users/update', (req, res) => {
    const { userId, patch, deleteUser, userPhone, fallbackUser } = req.body || {};
    if (deleteUser) {
      store.users = store.users.filter((u) => u.id !== userId && u.uid !== userId);
      saveStore(store);
      return res.json({ success: true, deleted: true });
    }
    const normPhone = normalizePhoneServer(String(userPhone || fallbackUser?.phone || ''));
    let idx = store.users.findIndex(
      (u) =>
        u.id === userId ||
        u.uid === userId ||
        (normPhone && normalizePhoneServer(u.phone || '') === normPhone)
    );
    if (idx < 0 && fallbackUser && (fallbackUser.id || fallbackUser.phone || fallbackUser.email)) {
      store.users.push({ ...fallbackUser });
      idx = store.users.length - 1;
    }
    if (idx >= 0 && patch) {
      const normalizedPatch = {
        ...patch,
        ...(patch.balance !== undefined ? { balance: Math.max(0, Number(patch.balance) || 0) } : {}),
        ...(patch.lockedBalance !== undefined
          ? { lockedBalance: Math.max(0, Number(patch.lockedBalance) || 0) }
          : {})
      };
      store.users[idx] = { ...store.users[idx], ...normalizedPatch, updatedAt: Date.now() };
      saveStore(store);
    }
    res.json({ success: true, user: idx >= 0 ? store.users[idx] : null });
  });

  // 2B. Withdraws API
  app.get('/api/withdraws', (req, res) => {
    sweepExpiredRequests();
    const userIdFilter = String(req.query.userId || '').trim();
    const phoneFilter = normalizePhoneServer(String(req.query.phone || ''));
    if (userIdFilter || phoneFilter) {
      const matched = (store.withdraws || []).filter((w: any) => {
        if (userIdFilter && (w.userId === userIdFilter || w.userPhone === userIdFilter)) return true;
        if (phoneFilter) {
          const wp = normalizePhoneServer(String(w.userPhone || ''));
          if (wp && wp === phoneFilter) return true;
        }
        return false;
      });
      return res.json({ success: true, withdraws: matched.slice(0, 150) });
    }
    res.json({ success: true, withdraws: (store.withdraws || []).slice(0, 800) });
  });

  app.post('/api/withdraws', (req, res) => {
    if (store.settings.withdrawEnabled === false) {
      return res.status(403).json({ success: false, message: 'Withdraw system is currently disabled by Administrator' });
    }
    const {
      id: clientId,
      orderId,
      ewiPayWithdrawId,
      status: requestedStatus,
      userId,
      userName,
      userPhone,
      amount,
      method,
      number,
      createdAtMs
    } = req.body;
    const numAmt = Number(amount) || 0;
    const minWd = Math.max(300, Number(store.settings.minWithdraw || 300));
    if (!numAmt || !number) {
      return res.status(400).json({ success: false, message: 'Missing withdraw fields' });
    }
    if (numAmt < minWd || numAmt > 50000) {
      return res.status(400).json({ success: false, message: `Withdrawal amount must be between ৳${minWd} and ৳50,000` });
    }
    const uIdx = store.users.findIndex((u) => u.id === userId || u.uid === userId);
    if (uIdx >= 0) {
      const targetUser = store.users[uIdx];
      const playable = getPlayableBalanceServer(targetUser);
      if (playable < numAmt) {
        return res.status(403).json({
          success: false,
          message:
            Number(targetUser.lockedBalance || 0) > 0
              ? `Insufficient playable balance! ৳${Number(targetUser.lockedBalance || 0).toFixed(2)} is on Hold and cannot be withdrawn or played.`
              : 'Insufficient balance'
        });
      }
    }
    const nowMs = Number(createdAtMs) || Date.now();
    const wdId = String(clientId || orderId || `wd_${nowMs}_${Math.random().toString(36).substring(2, 6)}`).trim();
    const cleanOrder = String(orderId || wdId).trim();
    const initStatus = requestedStatus === 'processing' ? 'processing' : 'pending';
    const newWd = {
      id: wdId,
      orderId: cleanOrder,
      ...(ewiPayWithdrawId ? { ewiPayWithdrawId: String(ewiPayWithdrawId).trim() } : {}),
      userId: userId || 'guest',
      userName: userName || userPhone || 'User',
      userPhone: userPhone || '',
      amount: numAmt,
      method: method || 'bKash',
      number: String(number).trim(),
      status: initStatus,
      createdAtMs: nowMs,
      time: new Date(nowMs).toLocaleString()
    };
    store.withdraws = [
      newWd,
      ...(store.withdraws || []).filter((w: any) => w.id !== wdId && w.orderId !== cleanOrder)
    ];
    if (uIdx >= 0) {
      store.users[uIdx].balance = +Math.max(0, Number(store.users[uIdx].balance || 0) - numAmt).toFixed(2);
      store.users[uIdx].updatedAt = Date.now();
    }
    saveStore(store);
    res.json({ success: true, withdraw: newWd });
  });

  app.post('/api/withdraws/update', (req, res) => {
    const { id, status, adminNote, ewiPayWithdrawId, payoutTrxId, userMessage, rejectionReason } = req.body || {};
    const wd = store.withdraws.find((w) => w.id === id || w.orderId === id || (w.ewiPayWithdrawId && w.ewiPayWithdrawId === id));
    if (!wd) return res.status(404).json({ success: false, message: 'Withdraw request not found' });
    const prevStatus = wd.status;
    if (status) wd.status = status;
    if (typeof adminNote === 'string' && adminNote.trim()) {
      wd.adminNote = adminNote.trim();
    } else if (status === 'rejected' && !wd.adminNote) {
      wd.adminNote = String(rejectionReason || 'আপনি কিছুক্ষণ পর আবার চেষ্টা করুন ধন্যবাদ').trim();
    }
    if (typeof rejectionReason === 'string' && rejectionReason.trim()) {
      wd.rejectionReason = rejectionReason.trim();
    }
    if (typeof userMessage === 'string' && userMessage.trim()) {
      wd.userMessage = userMessage.trim();
    }
    if (typeof ewiPayWithdrawId === 'string' && ewiPayWithdrawId.trim()) {
      wd.ewiPayWithdrawId = ewiPayWithdrawId.trim();
    }
    if (typeof payoutTrxId === 'string' && payoutTrxId.trim()) {
      wd.payoutTrxId = payoutTrxId.trim();
    }

    const uIdx = store.users.findIndex((u) => u.id === wd.userId || u.uid === wd.userId);
    if (uIdx >= 0) {
      if (status === 'completed' && prevStatus !== 'completed') {
        store.users[uIdx].totalWithdrawn = +(Number(store.users[uIdx].totalWithdrawn || 0) + wd.amount).toFixed(2);
        store.users[uIdx].updatedAt = Date.now();
      } else if (status === 'rejected' && prevStatus !== 'rejected') {
        store.users[uIdx].balance = +(Number(store.users[uIdx].balance || 0) + wd.amount).toFixed(2);
        store.users[uIdx].updatedAt = Date.now();
      }
    }
    saveStore(store);
    res.json({ success: true, withdraw: wd });
  });

  // 3. Customer Service Password Recovery Requests
  // "ar keo password vule gele customer service e kotha bole password nite parbe"
  app.get('/api/password-requests', (req, res) => {
    res.json({ success: true, requests: store.passwordRequests });
  });

  app.post('/api/password-requests', (req, res) => {
    const { phone, note } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanPhone = String(phone).trim();
    const newReq = {
      id: `pw_${Date.now()}`,
      phone: cleanPhone,
      note: note || 'User requested password recovery via Customer Care',
      status: 'pending',
      time: new Date().toLocaleString()
    };

    store.passwordRequests = [newReq, ...store.passwordRequests];
    saveStore(store);

    res.json({
      success: true,
      message: 'To reset or recover your password, please message Customer Care in Live Chat.',
      ticket: newReq
    });
  });

  app.post('/api/password-requests/resolve', (req, res) => {
    const { id, tempPassword } = req.body;
    const reqItem = store.passwordRequests.find((r) => r.id === id);
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    reqItem.status = 'resolved';
    if (tempPassword) {
      reqItem.tempPassword = tempPassword;
      const user = store.users.find((u) => u.phone === reqItem.phone);
      if (user) {
        user.loginPassword = tempPassword;
      }
    }

    saveStore(store);
    res.json({ success: true, ticket: reqItem });
  });

  // 4. Bound Wallets Registry (Global 1-number-per-site enforcement)
  const isNumberBoundElsewhere = (cleanNum: string, userId?: string): boolean => {
    const inBound = store.boundNumbers.some((item: any) => {
      if (typeof item === 'string') return normalizePhoneServer(item) === cleanNum;
      if (item && typeof item === 'object') {
        const numMatch = normalizePhoneServer(item.number || '') === cleanNum;
        if (!numMatch) return false;
        return !userId || item.userId !== userId;
      }
      return false;
    });
    if (inBound) return true;
    return store.users.some((u: any) => {
      if (userId && u.id === userId) return false;
      const b1 = normalizePhoneServer(u.boundBkash || '') === cleanNum;
      const b2 = normalizePhoneServer(u.boundNagad || '') === cleanNum;
      const b3 = Array.isArray(u.boundWallets) && u.boundWallets.some((w: any) => normalizePhoneServer(w.number || '') === cleanNum);
      return b1 || b2 || b3;
    });
  };

  app.get('/api/bound-numbers', (req, res) => {
    res.json({ success: true, boundNumbers: store.boundNumbers });
  });

  app.post('/api/bound-numbers/check', (req, res) => {
    const { number, userId } = req.body || {};
    const clean = normalizePhoneServer(String(number || '').trim());
    if (!clean) return res.status(400).json({ success: false, bound: false, message: 'Number required' });
    const boundElsewhere = isNumberBoundElsewhere(clean, userId);
    res.json({ success: true, bound: boundElsewhere });
  });

  app.post('/api/bound-numbers', (req, res) => {
    const { number, userId } = req.body || {};
    if (!number) return res.status(400).json({ success: false, message: 'Number is required' });
    const clean = normalizePhoneServer(String(number).trim());
    if (isNumberBoundElsewhere(clean, userId)) {
      return res.status(409).json({
        success: false,
        message: 'This number is already registered/logged in on another account! Each bKash/Nagad number can only be linked once.'
      });
    }
    const alreadyExists = store.boundNumbers.some(
      (item: any) => normalizePhoneServer(typeof item === 'string' ? item : item?.number || '') === clean
    );
    if (!alreadyExists) {
      store.boundNumbers.push(clean);
      saveStore(store);
    }
    res.json({ success: true });
  });

  // 5. Admin Settings & Global Gift Code Redemption API
  app.get('/api/settings', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, settings: redactPublicSettings(store.settings) });
  });

  app.post('/api/settings', (req, res) => {
    const incoming = { ...(req.body?.settings || {}) };
    if (incoming.adminPhone) {
      const norm = normalizePhoneServer(String(incoming.adminPhone).trim());
      if (norm) incoming.adminPhoneHash = sha256HexServer(norm);
    }
    if (incoming.adminPassword && String(incoming.adminPassword).trim().length >= 4) {
      incoming.adminPasswordHash = sha256HexServer(String(incoming.adminPassword).trim());
    }
    delete incoming.adminPhone;
    delete incoming.adminPassword;

    const touchesPopup =
      'popupTitle' in incoming ||
      'popupMessage' in incoming ||
      'popupImageUrl' in incoming ||
      'enableSystemPopup' in incoming;
    const nextSettings = {
      ...store.settings,
      ...incoming,
      updatedAt: Number(incoming.updatedAt || Date.now()),
      popupCustomized: touchesPopup ? true : Boolean(store.settings.popupCustomized),
      bannersCustomized:
        typeof incoming.bannersCustomized === 'boolean'
          ? incoming.bannersCustomized
          : store.settings.bannersCustomized
    };
    if (Array.isArray(nextSettings.banners)) {
      nextSettings.banners = sanitizeBannerList(nextSettings.banners);
    }
    store.settings = nextSettings;
    saveStore(store);
    res.json({ success: true, settings: redactPublicSettings(store.settings) });
  });

  // 5B. Live Global WinGo Bets Pool API (Syncs all mobile bets into Admin Engine Monitor)
  app.get('/api/wingo/bets', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const modeFilter = req.query.mode ? String(req.query.mode) : '';
    const periodFilter = req.query.period ? String(req.query.period) : '';
    let filtered = store.wingoBets;
    if (modeFilter) filtered = filtered.filter((b) => b.mode === modeFilter);
    if (periodFilter) filtered = filtered.filter((b) => b.periodNumber === periodFilter);
    res.json({ success: true, bets: filtered.slice(0, 250) });
  });

  app.post('/api/wingo/bet', (req, res) => {
    const b = req.body || {};
    if (!b.id || !b.periodNumber || !b.mode || !b.type || b.value === undefined) {
      return res.status(400).json({ success: false, message: 'Missing WinGo bet fields' });
    }
    const totalBet = Number(b.totalAmount) || Number(b.amount) || 0;
    const bettor = findUserServer(b.userId, undefined, b.userPhone);
    if (bettor && getPlayableBalanceServer(bettor) < totalBet) {
      return res.status(403).json({
        success: false,
        message: 'Hold balance cannot be used for betting! Please wait for Admin release.'
      });
    }
    const sanitizedBet = {
      id: String(b.id),
      userId: String(b.userId || 'guest'),
      nickname: String(b.nickname || 'Player'),
      userPhone: String(b.userPhone || ''),
      periodNumber: String(b.periodNumber),
      mode: String(b.mode),
      type: String(b.type),
      value: b.value,
      amount: Number(b.amount) || 0,
      multiplier: Number(b.multiplier) || 1,
      totalAmount: totalBet,
      status: 'pending',
      time: String(b.time || new Date().toTimeString().slice(0, 8))
    };
    store.wingoBets = [sanitizedBet, ...store.wingoBets.filter((x) => x.id !== sanitizedBet.id)].slice(0, 500);
    saveStore(store);
    res.json({ success: true, bet: sanitizedBet });
  });

  app.post('/api/gift-codes/redeem', (req, res) => {
    if (store.settings.giftCodeEnabled === false) {
      return res.status(403).json({ success: false, message: 'Gift Code system is currently disabled by Administrator' });
    }
    const { code, userId, userUid, phone, nickname } = req.body;
    const trimmed = String(code || '').trim().toUpperCase();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Please enter a gift code' });
    }

    const codes = Array.isArray(store.settings.activeGiftCodes) ? store.settings.activeGiftCodes : [];
    const targetIdx = codes.findIndex((c: any) => String(c.code || '').toUpperCase() === trimmed);

    if (targetIdx < 0) {
      return res.status(404).json({ success: false, message: 'Invalid or non-existent gift code' });
    }

    const codeItem = codes[targetIdx];
    const now = Date.now();

    if (codeItem.active === false) {
      return res.status(400).json({ success: false, message: 'This gift code is currently inactive!' });
    }

    if (codeItem.expiresAt && Number(codeItem.expiresAt) > 0 && now > Number(codeItem.expiresAt)) {
      return res.status(400).json({ success: false, message: 'This gift code has expired!' });
    }

    const maxClaims = Number(codeItem.maxClaims) || 1;
    const claimedCount = Number(codeItem.claimedCount) || 0;
    if (claimedCount >= maxClaims) {
      return res.status(400).json({ success: false, message: 'Gift code claim limit has been reached!' });
    }

    const uIdx = store.users.findIndex(
      (u) => u.id === userId || (userUid && u.uid === userUid) || (phone && normalizePhoneServer(u.phone || '') === normalizePhoneServer(phone))
    );
    const matchedServerUser = uIdx >= 0 ? store.users[uIdx] : null;
    const claimerUid = String(userUid || matchedServerUser?.uid || '').trim().toUpperCase();

    const targetUidRaw = String(codeItem.targetUid || '').trim().toUpperCase();
    if (targetUidRaw && targetUidRaw !== 'ALL') {
      const allowedUids = targetUidRaw
        .split(/[\s,;]+/)
        .map((s: string) => s.trim().toUpperCase())
        .filter(Boolean);
      if (!claimerUid || !allowedUids.includes(claimerUid)) {
        return res.status(403).json({
          success: false,
          message: 'This gift code is reserved for a specific UID and is not valid for your account.'
        });
      }
    }

    const minRequired = Number(codeItem.minRequiredBalance || 0);
    if (minRequired > 0 && matchedServerUser && Number(matchedServerUser.balance || 0) < minRequired) {
      return res.status(400).json({ success: false, message: `Minimum ৳${minRequired} balance required to claim this code!` });
    }

    const claimerKey = normalizePhoneServer(phone || '') || String(userId || '').trim();
    const claimedBy: string[] = Array.isArray(codeItem.claimedBy) ? codeItem.claimedBy : [];
    if (claimerKey && claimedBy.includes(claimerKey)) {
      return res.status(400).json({ success: false, message: 'You have already claimed this gift code!' });
    }

    const rewardType = codeItem.rewardType === 'deposit_percent' ? 'deposit_percent' : 'fixed';
    const pct = Number(codeItem.depositBonusPercent || codeItem.amount || 200);
    const reasonText = String(codeItem.reason || codeItem.note || (rewardType === 'deposit_percent' ? `${pct}% Deposit Bonus` : 'Admin Gift Bonus')).trim();

    if (rewardType === 'deposit_percent') {
      const normUserPhone = normalizePhoneServer(phone || matchedServerUser?.phone || '');
      const recentCutoff = Number(codeItem.createdAt || 0) - 24 * 60 * 60 * 1000;
      const approvedDeps = (store.deposits || []).filter((d: any) => {
        if (d.status !== 'approved') return false;
        const depPhone = normalizePhoneServer(d.userPhone || d.senderNumber || '');
        const belongs =
          (userId && d.userId === userId) ||
          (claimerUid && String(d.userId || '').toUpperCase() === claimerUid) ||
          (normUserPhone && depPhone === normUserPhone);
        if (!belongs) return false;
        const creditedList: string[] = Array.isArray(matchedServerUser?.creditedDepositBonusCodes)
          ? matchedServerUser.creditedDepositBonusCodes
          : [];
        if (creditedList.includes(`${trimmed}:${d.id}`)) return false;
        const parsedTs = Date.parse(d.time || '');
        if (Number.isFinite(parsedTs) && recentCutoff > 0 && parsedTs < recentCutoff) return false;
        return Number(d.amount || 0) > 0;
      });

      const qualifyingDep = approvedDeps[0];
      if (!qualifyingDep) {
        if (uIdx >= 0) {
          store.users[uIdx].pendingDepositBonusCode = trimmed;
          store.users[uIdx].updatedAt = Date.now();
          saveStore(store);
        }
        return res.json({
          success: true,
          pendingDeposit: true,
          code: trimmed,
          rewardType: 'deposit_percent',
          depositBonusPercent: pct,
          reason: reasonText,
          amount: 0,
          turnoverAmount: 0,
          message: `${pct}% Deposit Bonus (${trimmed}) activated! Make a deposit now — bonus will auto-credit on approval.`,
          settings: store.settings
        });
      }

      const depAmt = Number(qualifyingDep.amount || 0);
      const bonusAmount = +((depAmt * pct) / 100).toFixed(2);
      const turnoverAmount =
        codeItem.turnoverAmount && Number(codeItem.turnoverAmount) > 0
          ? Number(codeItem.turnoverAmount)
          : bonusAmount;

      const existingRecords = Array.isArray(codeItem.claimRecords) ? codeItem.claimRecords : [];
      const claimRecord = {
        userId: String(userId || 'guest'),
        uid: claimerUid || undefined,
        nickname: nickname || matchedServerUser?.nickname || String(phone || 'User'),
        contact: String(phone || ''),
        amount: bonusAmount,
        depositAmount: depAmt,
        reason: reasonText,
        time: new Date().toLocaleString()
      };

      codes[targetIdx] = {
        ...codeItem,
        claimedCount: claimedCount + 1,
        claimedBy: claimerKey ? [...claimedBy, claimerKey] : claimedBy,
        claimRecords: [claimRecord, ...existingRecords]
      };
      store.settings.activeGiftCodes = codes;

      if (uIdx >= 0) {
        const prevCredited = Array.isArray(store.users[uIdx].creditedDepositBonusCodes)
          ? store.users[uIdx].creditedDepositBonusCodes
          : [];
        store.users[uIdx].balance = +(Number(store.users[uIdx].balance || 0) + bonusAmount).toFixed(2);
        store.users[uIdx].turnoverRequired = +(Number(store.users[uIdx].turnoverRequired || 0) + turnoverAmount).toFixed(2);
        store.users[uIdx].lastGiftClaimTime = claimRecord.time;
        store.users[uIdx].lastGiftCode = trimmed;
        store.users[uIdx].lastGiftAmount = bonusAmount;
        store.users[uIdx].lastGiftReason = reasonText;
        store.users[uIdx].pendingDepositBonusCode = '';
        store.users[uIdx].creditedDepositBonusCodes = [...prevCredited, `${trimmed}:${qualifyingDep.id}`];
        store.users[uIdx].updatedAt = Date.now();
      }

      saveStore(store);
      return res.json({
        success: true,
        pendingDeposit: false,
        code: trimmed,
        rewardType: 'deposit_percent',
        depositBonusPercent: pct,
        depositAmount: depAmt,
        reason: reasonText,
        amount: bonusAmount,
        turnoverAmount,
        settings: store.settings
      });
    }

    const bonusAmount = Number(codeItem.amount) || 0;
    const turnoverAmount =
      codeItem.turnoverAmount !== undefined && codeItem.turnoverAmount !== null
        ? Number(codeItem.turnoverAmount)
        : bonusAmount;

    const existingRecords = Array.isArray(codeItem.claimRecords) ? codeItem.claimRecords : [];
    const claimRecord = {
      userId: String(userId || 'guest'),
      uid: claimerUid || undefined,
      nickname: nickname || matchedServerUser?.nickname || String(phone || 'User'),
      contact: String(phone || ''),
      amount: bonusAmount,
      reason: reasonText,
      time: new Date().toLocaleString()
    };

    codes[targetIdx] = {
      ...codeItem,
      claimedCount: claimedCount + 1,
      claimedBy: claimerKey ? [...claimedBy, claimerKey] : claimedBy,
      claimRecords: [claimRecord, ...existingRecords]
    };
    store.settings.activeGiftCodes = codes;

    if (uIdx >= 0) {
      store.users[uIdx].balance = +(Number(store.users[uIdx].balance || 0) + bonusAmount).toFixed(2);
      store.users[uIdx].turnoverRequired = +(Number(store.users[uIdx].turnoverRequired || 0) + turnoverAmount).toFixed(2);
      store.users[uIdx].lastGiftClaimTime = claimRecord.time;
      store.users[uIdx].lastGiftCode = trimmed;
      store.users[uIdx].lastGiftAmount = bonusAmount;
      store.users[uIdx].lastGiftReason = reasonText;
      store.users[uIdx].updatedAt = Date.now();
    }

    saveStore(store);
    res.json({
      success: true,
      pendingDeposit: false,
      code: trimmed,
      rewardType: 'fixed',
      reason: reasonText,
      amount: bonusAmount,
      turnoverAmount,
      settings: store.settings
    });
  });

  // 5C. Admin Two-Step Authentication & Visitor IP Access Logger
  app.get('/api/admin/access-logs', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const ip = extractClientIp(req);
    const intel = await inspectIpIntelligence(ip, undefined, req.headers);
    res.json({
      success: true,
      detectedIp: ip,
      ipIntel: intel,
      logs: (store.adminAccessLogs || []).slice(0, 200)
    });
  });

  app.post('/api/admin/access-logs', async (req, res) => {
    const action = req.body?.action;
    const sessionId = req.body?.sessionId ? String(req.body.sessionId) : undefined;
    if (action === 'heartbeat' && sessionId) {
      const cleanSession = sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
      const existing = (store.adminAccessLogs || []).find((x: any) => x.sessionId === cleanSession);
      if (existing) {
        const nowMs = Date.now();
        existing.lastSeenAtMs = nowMs;
        existing.staySeconds = Math.max(0, Math.round((nowMs - (existing.enteredAtMs || nowMs)) / 1000));
        saveStore(store);
        return res.json({
          success: true,
          detectedIp: existing.ip,
          entry: existing,
          logs: (store.adminAccessLogs || []).slice(0, 200)
        });
      }
    }
    const validAction =
      action === 'login_step1' || action === 'login_success' || action === 'login_failed'
        ? action
        : 'visit';
    const entry: any = recordServerAccessLog(req, validAction, req.body?.phoneAttempt, sessionId);
    try {
      const intel = await inspectIpIntelligence(entry.ip, req.body?.clientTimezone, req.headers);
      entry.isVpn = intel.isVpn;
      if (intel.vpnReason) entry.vpnReason = intel.vpnReason;
      if (intel.country) entry.country = intel.country;
      if (intel.isp) entry.isp = intel.isp;
      saveStore(store);
    } catch {}
    res.json({
      success: true,
      detectedIp: entry.ip,
      entry,
      logs: (store.adminAccessLogs || []).slice(0, 200)
    });
  });

  app.post('/api/admin/login', (req, res) => {
    const { phone, password, route, sessionId, deviceName, forceTakeover } = req.body || {};
    if (route && String(route) !== '/admin-ewi777-panel-009') {
      recordServerAccessLog(req, 'login_failed', String(phone || ''));
      return res.status(403).json({ success: false, message: 'Unauthorized admin access route!' });
    }
    const rawPhone = String(phone || '').trim();
    const rawPass = String(password || '');
    if (!rawPhone || rawPass.length < 4) {
      return res.status(400).json({ success: false, message: 'Please enter a valid Admin Phone and Password.' });
    }
    const expectedPhoneHash =
      store.settings.adminPhoneHash ||
      (process.env.ADMIN_PHONE ? sha256HexServer(normalizePhoneServer(process.env.ADMIN_PHONE)) : DEFAULT_ADMIN_PHONE_HASH);
    const expectedPassHash =
      store.settings.adminPasswordHash ||
      (process.env.ADMIN_PASSWORD ? sha256HexServer(process.env.ADMIN_PASSWORD) : DEFAULT_ADMIN_PASS_HASH);
    const inputPhone = normalizePhoneServer(rawPhone);

    if (sha256HexServer(inputPhone) !== expectedPhoneHash || sha256HexServer(rawPass) !== expectedPassHash) {
      recordServerAccessLog(req, 'login_failed', inputPhone);
      return res.status(401).json({ success: false, message: 'Invalid Admin Number or Password!' });
    }

    const nowMs = Date.now();
    const clientIp = normalizeIpValue(extractClientIp(req)) || 'Unknown';
    const resolvedDevice = String(deviceName || '').trim() || parseDeviceNameNode(String(req.headers['user-agent'] || ''));
    const active = store.settings.activeAdminSession;
    const incomingSid = String(sessionId || '').trim() || `adm_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
    const isStillAlive =
      active &&
      active.sessionId &&
      active.sessionId !== incomingSid &&
      nowMs - Number(active.lastSeenAtMs || active.loggedInAtMs || 0) < SESSION_TTL_MS;

    if (isStillAlive && !forceTakeover) {
      return res.status(409).json({
        success: false,
        sessionConflict: true,
        activeSession: active,
        message: `Admin is already logged in on ${active.deviceName || 'another device'} (IP: ${active.ip || 'Unknown'}). End that session first.`
      });
    }

    const nextSession = {
      sessionId: incomingSid,
      ip: clientIp,
      deviceName: resolvedDevice,
      loggedInAt: new Date(nowMs).toLocaleString('en-GB'),
      loggedInAtMs: nowMs,
      lastSeenAtMs: nowMs
    };
    store.settings.activeAdminSession = nextSession;
    store.settings.updatedAt = nowMs;
    recordServerAccessLog(req, 'login_success', inputPhone);
    const sessionToken = crypto
      .createHmac('sha256', ADMIN_2FA_SECRET)
      .update(`ADMIN_SESSION:${expectedPhoneHash}:${incomingSid}:${Math.floor(nowMs / 86400000)}`)
      .digest('hex')
      .slice(0, 32);
    res.json({
      success: true,
      requires2FA: false,
      sessionToken,
      sessionId: incomingSid,
      activeSession: nextSession,
      message: 'Admin authenticated'
    });
  });

  app.get('/api/admin/sessions', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const nowMs = Date.now();
    const active = store.settings.activeAdminSession || null;
    const valid =
      active && nowMs - Number(active.lastSeenAtMs || active.loggedInAtMs || 0) < SESSION_TTL_MS ? active : null;
    res.json({ success: true, activeSession: valid });
  });

  app.post('/api/admin/sessions', (req, res) => {
    const { action, sessionId } = req.body || {};
    const nowMs = Date.now();
    const active = store.settings.activeAdminSession || null;
    const valid =
      active && nowMs - Number(active.lastSeenAtMs || active.loggedInAtMs || 0) < SESSION_TTL_MS ? active : null;

    if (action === 'kick' || action === 'logout') {
      if (action === 'logout' && valid && sessionId && valid.sessionId !== sessionId) {
        return res.json({ success: true, activeSession: valid });
      }
      store.settings.activeAdminSession = null;
      store.settings.updatedAt = nowMs;
      saveStore(store);
      return res.json({ success: true, activeSession: null, kicked: action === 'kick' });
    }
    if (action === 'heartbeat') {
      if (valid && sessionId && valid.sessionId !== sessionId) {
        return res.status(409).json({
          success: false,
          kicked: true,
          activeSession: valid,
          message: 'Your admin session was ended.'
        });
      }
      if (valid && (!sessionId || valid.sessionId === sessionId)) {
        store.settings.activeAdminSession = { ...valid, lastSeenAtMs: nowMs };
        saveStore(store);
        return res.json({ success: true, activeSession: store.settings.activeAdminSession });
      }
      return res.json({ success: true, activeSession: valid });
    }
    res.status(400).json({ success: false, message: 'Unsupported session action' });
  });

  // 5D. Mentor Governance & Strict 7-Feature API (Zero money amounts/totals exposed, synced with Firestore)
  const blockMentorIpExpress = async (
    settingsDoc: Record<string, any>,
    clientIp: string,
    reason: string,
    attemptedUsername?: string
  ) => {
    const nowMs = Date.now();
    const prevBlocked = Array.isArray(settingsDoc.mentorBlockedIps) ? settingsDoc.mentorBlockedIps : [];
    const nextBlocked = [
      {
        ip: clientIp,
        reason,
        ...(attemptedUsername ? { attemptedUsername } : {}),
        blockedAt: new Date(nowMs).toLocaleString('en-GB'),
        blockedAtMs: nowMs
      },
      ...prevBlocked.filter((x: any) => normalizeIpValue(String(x?.ip || '')) !== clientIp)
    ].slice(0, 200);
    const nextLogs = [
      {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: 'security',
        mentorName: 'Mentor Gatekeeper',
        mentorUsername: attemptedUsername || 'unknown',
        ip: clientIp,
        action: 'login_failed_blocked',
        detail: reason,
        time: new Date(nowMs).toLocaleString('en-GB'),
        timestamp: nowMs
      },
      ...(Array.isArray(settingsDoc.mentorLogs) ? settingsDoc.mentorLogs : [])
    ].slice(0, 300);
    store.settings.mentorBlockedIps = nextBlocked;
    store.settings.mentorLogs = nextLogs;
    store.settings.updatedAt = nowMs;
    saveStore(store);
    await patchFirestoreDoc('appConfig', 'settings', {
      ...settingsDoc,
      mentorBlockedIps: nextBlocked,
      mentorLogs: nextLogs,
      updatedAt: nowMs
    }).catch(() => false);
  };

  app.post('/api/mentor/login', async (req, res) => {
    const clientIp = normalizeIpValue(extractClientIp(req)) || 'Unknown';
    const settingsDoc = await getSyncedMentorSettingsDoc();
    const bannedIps: string[] = Array.isArray(settingsDoc.bannedIps)
      ? settingsDoc.bannedIps.map((x: any) => normalizeIpValue(String(x)))
      : [];
    if (clientIp !== 'Unknown' && bannedIps.includes(clientIp)) {
      return res.status(403).json({ success: false, bannedIp: true, ip: clientIp, message: 'Your IP address is globally banned.' });
    }
    const blockedList: any[] = Array.isArray(settingsDoc.mentorBlockedIps) ? settingsDoc.mentorBlockedIps : [];
    if (blockedList.some((b) => normalizeIpValue(String(b?.ip || '')) === clientIp)) {
      return res.status(403).json({
        success: false,
        mentorBlocked: true,
        ip: clientIp,
        message: 'This IP has been permanently blocked from Mentor access. Contact Admin to unblock.'
      });
    }
    const username = String(req.body?.username || '').trim().replace(/^@+/, '');
    const password = String(req.body?.password || '');
    if (!username || !password) {
      return res.status(400).json({ success: false, ip: clientIp, message: 'Username and password are required.' });
    }
    const mentors: any[] = Array.isArray(settingsDoc.mentors) ? settingsDoc.mentors : [];
    if (mentors.length === 0) {
      return res.status(400).json({
        success: false,
        ip: clientIp,
        message: 'No Mentor accounts created yet. Ask Admin to create your Mentor account in Admin Panel → Mentors first.'
      });
    }
    const matched = mentors.find(
      (m) =>
        String(m.username || '').trim().replace(/^@+/, '').toLowerCase() === username.toLowerCase() &&
        m.active !== false
    );
    if (!matched || (matched.password !== password && matched.password !== password.trim())) {
      await blockMentorIpExpress(settingsDoc, clientIp, 'Invalid Mentor username or password attempt', username);
      return res.status(403).json({
        success: false,
        mentorBlocked: true,
        ip: clientIp,
        message: 'Invalid Mentor credentials! Your IP has been permanently blocked. Ask Admin to unblock it.'
      });
    }
    const allowedIp = normalizeIpValue(String(matched.allowedIp || ''));
    if (!allowedIp || allowedIp !== clientIp) {
      await blockMentorIpExpress(
        settingsDoc,
        clientIp,
        `IP mismatch for Mentor "${matched.username}" (expected ${allowedIp || 'unset'}, got ${clientIp})`,
        username
      );
      return res.status(403).json({
        success: false,
        mentorBlocked: true,
        ip: clientIp,
        message: `IP mismatch (${clientIp} ≠ authorized ${allowedIp || 'unset'})! Your IP has been permanently blocked.`
      });
    }
    const nowMs = Date.now();
    const nextMentors = mentors.map((m) =>
      m.id === matched.id ? { ...m, lastLoginAt: new Date(nowMs).toLocaleString('en-GB'), lastLoginIp: clientIp } : m
    );
    const nextLogs = [
      {
        id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        mentorId: matched.id,
        mentorName: matched.name,
        mentorUsername: matched.username,
        ip: clientIp,
        action: 'login_success',
        detail: 'Mentor signed in with exact IP match',
        time: new Date(nowMs).toLocaleString('en-GB'),
        timestamp: nowMs
      },
      ...(Array.isArray(settingsDoc.mentorLogs) ? settingsDoc.mentorLogs : [])
    ].slice(0, 300);
    store.settings.mentors = nextMentors;
    store.settings.mentorLogs = nextLogs;
    store.settings.updatedAt = nowMs;
    saveStore(store);
    await patchFirestoreDoc('appConfig', 'settings', {
      ...settingsDoc,
      mentors: nextMentors,
      mentorLogs: nextLogs,
      updatedAt: nowMs
    }).catch(() => false);
    res.json({
      success: true,
      token: signMentorToken(matched.id, clientIp),
      ip: clientIp,
      mentor: {
        id: matched.id,
        name: matched.name,
        username: matched.username,
        allowedIp: matched.allowedIp,
        giftCodeBudget: Number(matched.giftCodeBudget || 0),
        giftCodeSpent: Number(matched.giftCodeSpent || 0)
      }
    });
  });

  app.post('/api/mentor/data', async (req, res) => {
    const clientIp = normalizeIpValue(extractClientIp(req)) || 'Unknown';
    const { mentorId, token } = req.body || {};
    const settingsDoc = await getSyncedMentorSettingsDoc();
    const mentors: any[] = Array.isArray(settingsDoc.mentors) ? settingsDoc.mentors : [];
    const mentor = mentors.find((m) => m.id === mentorId && m.active !== false);
    if (!mentor || normalizeIpValue(String(mentor.allowedIp || '')) !== clientIp || signMentorToken(mentor.id, clientIp) !== token) {
      return res.status(401).json({ success: false, message: 'Mentor session invalid or IP changed.' });
    }
    const [fbUsers, fbWithdraws, fbDeposits, fbMsgs] = await Promise.all([
      listFirestoreCollection('users', 400).catch(() => []),
      listFirestoreCollection('withdraws', 250).catch(() => []),
      listFirestoreCollection('deposits', 300).catch(() => []),
      listFirestoreCollection('supportMessages', 400).catch(() => [])
    ]);
    const userMap = new Map<string, any>();
    (store.users || []).forEach((u: any) => {
      if (u?.id) userMap.set(String(u.id), u);
    });
    fbUsers.forEach(({ id, data }) => {
      userMap.set(String(data.id || id), { ...userMap.get(String(data.id || id)), ...data, id: data.id || id });
    });
    const mergedUsers = Array.from(userMap.values());

    const wdMap = new Map<string, any>();
    (store.withdraws || []).forEach((w: any) => {
      if (w?.id) wdMap.set(String(w.id), w);
    });
    fbWithdraws.forEach(({ id, data }) => {
      wdMap.set(String(data.id || id), { ...wdMap.get(String(data.id || id)), ...data, id: data.id || id });
    });
    const mergedWithdraws = Array.from(wdMap.values());

    const depMap = new Map<string, any>();
    (store.deposits || []).forEach((d: any) => {
      if (d?.id) depMap.set(String(d.id), d);
    });
    fbDeposits.forEach(({ id, data }) => {
      depMap.set(String(data.id || id), { ...depMap.get(String(data.id || id)), ...data, id: data.id || id });
    });
    const mergedDeposits = Array.from(depMap.values());

    const msgMap = new Map<string, any>();
    (store.supportMessages || []).forEach((m: any) => {
      if (m?.id) msgMap.set(String(m.id), m);
    });
    fbMsgs.forEach(({ id, data }) => {
      msgMap.set(String(data.id || id), { ...msgMap.get(String(data.id || id)), ...data, id: data.id || id });
    });
    const mergedMsgs = Array.from(msgMap.values()).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0)).slice(-400);

    const ipCounts = new Map<string, number>();
    mergedUsers.forEach((u) => {
      const ip = normalizeIpValue(String(u.lastIp || u.registeredIp || ''));
      if (ip && ip !== 'Unknown') ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
    });
    const sanitizedUsers = mergedUsers.map((u) => {
      const primaryIp = normalizeIpValue(String(u.lastIp || u.registeredIp || 'Unknown'));
      return {
        id: u.id,
        uid: u.uid || '',
        nickname: u.nickname || 'Member',
        phone: u.phone || u.email || '',
        registeredIp: normalizeIpValue(String(u.registeredIp || '')) || 'Unknown',
        lastIp: primaryIp || 'Unknown',
        deviceName: u.deviceName || 'Unknown Device',
        isVpn: Boolean(u.isVpn),
        vpnReason: u.vpnReason || '',
        ipCountry: u.ipCountry || '',
        ipIsp: u.ipIsp || '',
        sameIpCount: primaryIp !== 'Unknown' ? ipCounts.get(primaryIp) || 1 : 1,
        hasHoldingBalance: Number(u.lockedBalance || 0) > 0,
        turnoverRequired: Number(u.turnoverRequired || 0),
        turnoverCompleted: Number(u.turnoverCompleted || 0),
        createdAt: u.createdAt || '',
        lastLogin: u.lastLogin || '',
        isBanned: Boolean(u.isBanned)
      };
    });
    const sanitizedWithdraws = mergedWithdraws
      .map((w) => ({
        id: w.id,
        orderId: w.orderId || w.id,
        userId: w.userId,
        userName: w.userName,
        userPhone: w.userPhone,
        method: w.method,
        number: w.number,
        status: w.status,
        time: w.time,
        createdAtMs: w.createdAtMs || 0,
        adminNote: w.adminNote || '',
        rejectionReason: w.rejectionReason || '',
        userMessage: w.userMessage || ''
      }))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
    const todayYmd = new Date().toISOString().slice(0, 10);
    const todayRegistrationsCount = mergedUsers.filter((u) => String(u.createdAt || '').startsWith(todayYmd)).length;
    const binarySet = new Set<string>();
    const mfsSet = new Set<string>();
    mergedDeposits.forEach((d) => {
      if (d.status !== 'approved') return;
      const key = String(d.userId || d.userPhone || d.id);
      const m = String(d.method || '').toLowerCase();
      if (m === 'usdt' || m.includes('binary')) binarySet.add(key);
      else if (m === 'bkash' || m === 'nagad' || m === 'rocket') mfsSet.add(key);
    });
    const myGiftCodes = (Array.isArray(settingsDoc.activeGiftCodes) ? settingsDoc.activeGiftCodes : []).filter(
      (g: any) => g.createdByMentorId === mentor.id
    );
    res.json({
      success: true,
      ip: clientIp,
      mentor: {
        id: mentor.id,
        name: mentor.name,
        username: mentor.username,
        allowedIp: mentor.allowedIp,
        giftCodeBudget: Number(mentor.giftCodeBudget || 0),
        giftCodeSpent: Number(mentor.giftCodeSpent || 0)
      },
      countsOnly: {
        todayRegistrationsCount,
        binaryDepositorsCount: binarySet.size,
        bkashNagadDepositorsCount: mfsSet.size
      },
      users: sanitizedUsers,
      withdraws: sanitizedWithdraws,
      supportMessages: mergedMsgs,
      giftCodes: myGiftCodes
    });
  });

  app.post('/api/mentor/action', async (req, res) => {
    const clientIp = normalizeIpValue(extractClientIp(req)) || 'Unknown';
    const { mentorId, token, op } = req.body || {};
    const settingsDoc = await getSyncedMentorSettingsDoc();
    const mentors: any[] = Array.isArray(settingsDoc.mentors) ? settingsDoc.mentors : [];
    const mentor = mentors.find((m) => m.id === mentorId && m.active !== false);
    if (!mentor || normalizeIpValue(String(mentor.allowedIp || '')) !== clientIp || signMentorToken(mentor.id, clientIp) !== token) {
      return res.status(401).json({ success: false, message: 'Mentor session invalid or IP changed.' });
    }
    const nowMs = Date.now();
    const nowStr = new Date(nowMs).toLocaleString('en-GB');
    const pushLog = async (action: string, detail: string, extra?: Record<string, any>, extraSettings?: Record<string, any>) => {
      const nextLogs = [
        {
          id: `mlog_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
          mentorId: mentor.id,
          mentorName: mentor.name,
          mentorUsername: mentor.username,
          ip: clientIp,
          action,
          detail,
          time: nowStr,
          timestamp: nowMs,
          ...(extra || {})
        },
        ...(Array.isArray(settingsDoc.mentorLogs) ? settingsDoc.mentorLogs : [])
      ].slice(0, 300);
      const nextSettings = {
        ...settingsDoc,
        ...(extraSettings || {}),
        mentorLogs: nextLogs,
        updatedAt: nowMs
      };
      store.settings = { ...store.settings, ...nextSettings };
      saveStore(store);
      await patchFirestoreDoc('appConfig', 'settings', nextSettings).catch(() => false);
    };

    if (op === 'support_reply') {
      const { userId, userUid, userNickname, userPhone, text, imageUrl } = req.body;
      if (!userId || (!String(text || '').trim() && !imageUrl)) {
        return res.status(400).json({ success: false, message: 'Message or image required' });
      }
      const msg = {
        id: `cs_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
        userId: String(userId),
        userUid: String(userUid || ''),
        userNickname: String(userNickname || 'Member'),
        userPhone: String(userPhone || ''),
        sender: 'admin',
        repliedByRole: 'mentor',
        repliedByName: mentor.name,
        text: String(text || '').trim().slice(0, 4000),
        ...(typeof imageUrl === 'string' && imageUrl.startsWith('data:image/') ? { imageUrl: imageUrl.slice(0, 320000) } : {}),
        time: new Date(nowMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        timestamp: nowMs
      };
      store.supportMessages = [...store.supportMessages, msg].slice(-500);
      await patchFirestoreDoc('supportMessages', msg.id, msg).catch(() => false);
      await pushLog('support_reply', `Replied to chat (${userUid || userId}): ${msg.text.slice(0, 80)}`, { targetUid: String(userUid || userId) });
      return res.json({ success: true, message: msg });
    }

    if (op === 'withdraw_update') {
      const { withdrawId, status, note } = req.body;
      if (status !== 'processing' && status !== 'rejected') {
        return res.status(403).json({ success: false, message: 'Mentors can only set Processing or Rejected.' });
      }
      const wdLocal = (store.withdraws || []).find((w) => w.id === withdrawId || w.orderId === withdrawId);
      const wdFb = await getFirestoreDoc('withdraws', String(withdrawId || '')).catch(() => null);
      const wd = wdFb || wdLocal;
      if (!wd) return res.status(404).json({ success: false, message: 'Withdraw not found' });
      if (wd.status === 'completed') return res.status(400).json({ success: false, message: 'Already completed' });
      const prevSt = wd.status;
      const cleanNote = String(note || '').trim() || (status === 'rejected' ? 'আপনি কিছুক্ষণ পর আবার চেষ্টা করুন ধন্যবাদ' : 'Processing by Mentor');
      const updatedWd = {
        ...wd,
        status,
        adminNote: cleanNote,
        ...(status === 'rejected' ? { rejectionReason: cleanNote, userMessage: cleanNote } : {})
      };
      if (wdLocal) Object.assign(wdLocal, updatedWd);
      await patchFirestoreDoc('withdraws', String(wd.id || withdrawId), updatedWd).catch(() => false);
      if (status === 'rejected' && prevSt !== 'rejected') {
        const uLocal = (store.users || []).find((x) => x.id === wd.userId || x.uid === wd.userId);
        const uFb = await getFirestoreDoc('users', String(wd.userId || '')).catch(() => null);
        const targetUser = uFb || uLocal;
        if (targetUser) {
          const nextBal = +(Number(targetUser.balance || 0) + Number(wd.amount || 0)).toFixed(2);
          if (uLocal) {
            uLocal.balance = nextBal;
            uLocal.updatedAt = nowMs;
          }
          await patchFirestoreDoc('users', String(targetUser.id || wd.userId), {
            ...targetUser,
            balance: nextBal,
            updatedAt: nowMs
          }).catch(() => false);
        }
      }
      await pushLog('withdraw_updated', `Marked withdrawal ${wd.orderId || withdrawId} as ${status.toUpperCase()} (${cleanNote})`, { targetUid: String(wd.userId || '') });
      return res.json({ success: true });
    }

    if (op === 'release_holding') {
      const targetKey = String(req.body?.userId || '');
      const uLocal = (store.users || []).find((x) => x.id === targetKey || x.uid === targetKey);
      const uFb = await getFirestoreDoc('users', targetKey).catch(() => null);
      const u = uFb || uLocal;
      if (!u) return res.status(404).json({ success: false, message: 'User not found' });
      if (uLocal) {
        uLocal.lockedBalance = 0;
        uLocal.updatedAt = nowMs;
      }
      await patchFirestoreDoc('users', String(u.id || targetKey), { ...u, lockedBalance: 0, updatedAt: nowMs }).catch(() => false);
      await pushLog('holding_released', `Released holding balance for UID ${u.uid || u.id}`, { targetUid: String(u.uid || u.id) });
      return res.json({ success: true });
    }

    if (op === 'adjust_turnover') {
      const targetKey = String(req.body?.userId || '');
      const uLocal = (store.users || []).find((x) => x.id === targetKey || x.uid === targetKey);
      const uFb = await getFirestoreDoc('users', targetKey).catch(() => null);
      const u = uFb || uLocal;
      if (!u) return res.status(404).json({ success: false, message: 'User not found' });
      const nextReq = Math.max(0, Number(req.body?.turnoverRequired ?? u.turnoverRequired ?? 0));
      const nextComp = Math.max(0, Number(req.body?.turnoverCompleted ?? u.turnoverCompleted ?? 0));
      if (uLocal) {
        uLocal.turnoverRequired = nextReq;
        uLocal.turnoverCompleted = nextComp;
        uLocal.updatedAt = nowMs;
      }
      await patchFirestoreDoc('users', String(u.id || targetKey), {
        ...u,
        turnoverRequired: nextReq,
        turnoverCompleted: nextComp,
        updatedAt: nowMs
      }).catch(() => false);
      await pushLog('turnover_adjusted', `Adjusted turnover for UID ${u.uid || u.id}`, { targetUid: String(u.uid || u.id) });
      return res.json({ success: true });
    }

    if (op === 'create_gift_code') {
      const code = String(req.body?.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      const amount = Math.max(1, Number(req.body?.amount) || 0);
      const maxClaims = Math.max(1, Math.floor(Number(req.body?.maxClaims) || 1));
      const turnoverAmount = Math.max(0, Number(req.body?.turnoverAmount) || amount);
      const targetUid = String(req.body?.targetUid || '').trim().toUpperCase();
      const reason = String(req.body?.reason || `Mentor Gift (${mentor.name})`).trim();
      const existing: any[] = Array.isArray(settingsDoc.activeGiftCodes) ? settingsDoc.activeGiftCodes : [];
      if (existing.some((c) => String(c.code || '').toUpperCase() === code)) {
        return res.status(409).json({ success: false, message: 'Gift code already exists!' });
      }
      const totalCost = +(amount * maxClaims).toFixed(2);
      const budget = Number(mentor.giftCodeBudget || 0);
      const spent = Number(mentor.giftCodeSpent || 0);
      if (spent + totalCost > budget) {
        return res.status(403).json({ success: false, message: `Insufficient Mentor Budget! Remaining: ৳${Math.max(0, budget - spent).toFixed(2)}` });
      }
      const newGift = {
        code,
        rewardType: 'fixed',
        amount,
        maxClaims,
        claimedCount: 0,
        turnoverAmount,
        createdAt: nowMs,
        claimedBy: [],
        active: true,
        ...(targetUid ? { targetUid } : {}),
        reason,
        note: `Created by Mentor ${mentor.name}`,
        createdByMentorId: mentor.id,
        createdByMentorName: mentor.name,
        claimRecords: []
      };
      const nextMentors = mentors.map((m) => (m.id === mentor.id ? { ...m, giftCodeSpent: +(spent + totalCost).toFixed(2) } : m));
      await pushLog('gift_code_created', `Created Gift Code ${code} (৳${amount} × ${maxClaims} = ৳${totalCost})`, { code, amount: totalCost, targetUid }, {
        activeGiftCodes: [newGift, ...existing],
        mentors: nextMentors
      });
      return res.json({ success: true, giftCode: newGift, giftCodeSpent: +(spent + totalCost).toFixed(2) });
    }

    if (op === 'send_notice') {
      const { targetUid, title, message } = req.body;
      const cleanTitle = String(title || '').trim();
      const cleanMessage = String(message || '').trim();
      if (!cleanTitle || !cleanMessage) {
        return res.status(400).json({ success: false, message: 'Title and message are required.' });
      }
      let resolvedUserId = 'ALL';
      if (targetUid && String(targetUid).trim().toUpperCase() !== 'ALL') {
        const cleanUid = String(targetUid).trim().toUpperCase();
        const fbUsers = await listFirestoreCollection('users', 400).catch(() => []);
        const allCandidates = [...(store.users || []), ...fbUsers.map((x) => x.data)];
        const matchedUser = allCandidates.find(
          (u: any) =>
            String(u.uid || '').toUpperCase() === cleanUid ||
            String(u.id || '').toUpperCase() === cleanUid ||
            String(u.phone || '') === String(targetUid).trim()
        );
        if (!matchedUser) {
          return res.status(404).json({ success: false, message: `User UID "${cleanUid}" not found.` });
        }
        resolvedUserId = String(matchedUser.id);
      }
      const notif = {
        id: `notif_m_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        userId: resolvedUserId,
        title: cleanTitle.slice(0, 300),
        message: cleanMessage.slice(0, 3000),
        reason: `Sent by Mentor ${mentor.name}`,
        type: 'system',
        read: false,
        time: nowStr
      };
      store.notifications = [notif, ...(store.notifications || [])].slice(0, 200);
      await patchFirestoreDoc('notifications', notif.id, notif).catch(() => false);
      await pushLog('broadcast_sent', `Sent notice "${notif.title}"`, { targetUid: resolvedUserId === 'ALL' ? 'ALL' : String(targetUid || '') });
      return res.json({ success: true });
    }

    if (op === 'change_password') {
      const { currentPassword, newPassword } = req.body;
      if (String(currentPassword || '') !== mentor.password) {
        return res.status(401).json({ success: false, message: 'Current password incorrect' });
      }
      if (!newPassword || String(newPassword).trim().length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      const nextMentors = mentors.map((m) => (m.id === mentor.id ? { ...m, password: String(newPassword).trim() } : m));
      await pushLog('password_changed', `Mentor ${mentor.username} updated password`, undefined, { mentors: nextMentors });
      return res.json({ success: true, message: 'Mentor password updated successfully!' });
    }

    res.status(400).json({ success: false, message: 'Unknown mentor action' });
  });

  // 5E. EWI Ludo Private Friend Rooms API (Store + Firestore dual-synced)
  app.get('/api/ludo/rooms', async (_req, res) => {
    try {
      const fbDocs = await listFirestoreCollection('ludoRooms', 60).catch(() => []);
      for (const { id, data } of fbDocs) {
        if (data && id) {
          const existing = store.ludoRooms?.[id];
          if (!existing || Number(data.updatedAt || 0) >= Number(existing.updatedAt || 0)) {
            store.ludoRooms[id] = { ...data, id };
          }
        }
      }
    } catch {}
    const rooms = Object.values(store.ludoRooms || {})
      .map((r: any) => ({ ...r, password: r.password ? '***' : '' }))
      .sort((a: any, b: any) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    res.json({ success: true, rooms });
  });

  app.post('/api/ludo/create', async (req, res) => {
    const { userId, uid, name, mode, stake, password } = req.body || {};
    const numStake = Number(stake) || 0;
    if (!userId || numStake < 20 || numStake > 50000 || !String(password || '').trim()) {
      return res.status(400).json({ success: false, message: 'Stake must be ৳20–৳50,000 and password is required.' });
    }
    const hostUser = findUserServer(userId, uid);
    if (hostUser && getPlayableBalanceServer(hostUser) < numStake) {
      return res.status(403).json({
        success: false,
        message: 'Hold balance cannot be used for Ludo rooms! Please wait for Admin release.'
      });
    }
    const nowMs = Date.now();
    const maxPlayers = mode === '2p_winner' ? 2 : 4;
    const code = `LUDO${Math.floor(100000 + Math.random() * 900000)}`;
    const roomId = `ludo_${code}_${nowMs}`;
    const room = {
      id: roomId,
      code,
      password: String(password).trim(),
      hostUserId: String(userId),
      hostName: String(name || 'Host'),
      mode: mode === '4p_split' ? '4p_split' : mode === '4p_winner' ? '4p_winner' : '2p_winner',
      maxPlayers,
      stake: numStake,
      status: 'waiting',
      players: [
        { slotIndex: 0, color: 'red', userId: String(userId), uid: String(uid || ''), name: String(name || 'Player 1'), isBot: false, tokens: [-1, -1, -1, -1] }
      ],
      currentTurnIdx: 0,
      createdAt: new Date(nowMs).toLocaleString('en-GB'),
      createdAtMs: nowMs,
      updatedAt: nowMs
    };
    store.ludoRooms[roomId] = room;
    saveStore(store);
    await patchFirestoreDoc('ludoRooms', roomId, room).catch(() => false);
    res.json({ success: true, room });
  });

  app.post('/api/ludo/join', async (req, res) => {
    const { code, password, userId, uid, name } = req.body || {};
    const cleanCode = String(code || '').trim().toUpperCase();
    let roomEntry: any = Object.values(store.ludoRooms || {}).find((r: any) => String(r.code || '').toUpperCase() === cleanCode);
    if (!roomEntry) {
      const fbDocs = await listFirestoreCollection('ludoRooms', 80).catch(() => []);
      const foundFb = fbDocs.find(({ data }) => String(data?.code || '').toUpperCase() === cleanCode);
      if (foundFb?.data) {
        roomEntry = { ...foundFb.data, id: foundFb.id };
        store.ludoRooms[roomEntry.id] = roomEntry;
      }
    }
    if (!roomEntry) return res.status(404).json({ success: false, message: 'Ludo room not found.' });
    if (String(roomEntry.password || '') !== String(password || '').trim()) {
      return res.status(401).json({ success: false, message: 'Incorrect room password!' });
    }
    const joinerUser = findUserServer(userId, uid);
    if (joinerUser && getPlayableBalanceServer(joinerUser) < Number(roomEntry.stake || 0)) {
      return res.status(403).json({
        success: false,
        message: 'Hold balance cannot be used for Ludo rooms! Please wait for Admin release.'
      });
    }
    const players: any[] = Array.isArray(roomEntry.players) ? [...roomEntry.players] : [];
    if (!players.some((p) => p.userId === userId)) {
      if (roomEntry.status !== 'waiting' || players.length >= Number(roomEntry.maxPlayers || 2)) {
        return res.status(409).json({ success: false, message: 'Room is already full, started, or cancelled.' });
      }
      const colors = Number(roomEntry.maxPlayers) === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
      const slotIdx = players.length;
      players.push({
        slotIndex: slotIdx,
        color: colors[slotIdx] || 'blue',
        userId: String(userId),
        uid: String(uid || ''),
        name: String(name || `Player ${slotIdx + 1}`),
        isBot: false,
        tokens: [-1, -1, -1, -1]
      });
      roomEntry.players = players;
      if (players.length >= Number(roomEntry.maxPlayers || 2)) roomEntry.status = 'playing';
      roomEntry.updatedAt = Date.now();
      store.ludoRooms[roomEntry.id] = roomEntry;
      saveStore(store);
      await patchFirestoreDoc('ludoRooms', roomEntry.id, roomEntry).catch(() => false);
    }
    res.json({ success: true, room: roomEntry });
  });

  app.post('/api/ludo/move', async (req, res) => {
    const { roomId, players, currentTurnIdx, lastRoll, status, statusText } = req.body || {};
    let room = store.ludoRooms?.[String(roomId || '')];
    if (!room) {
      room = await getFirestoreDoc('ludoRooms', String(roomId || '')).catch(() => null);
    }
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (Array.isArray(players)) room.players = players;
    if (typeof currentTurnIdx === 'number') room.currentTurnIdx = currentTurnIdx;
    if (typeof lastRoll === 'number') room.lastRoll = lastRoll;
    if (status) room.status = status;
    if (typeof statusText === 'string' && statusText) room.statusText = statusText;
    room.updatedAt = Date.now();
    store.ludoRooms[room.id || String(roomId)] = room;
    saveStore(store);
    await patchFirestoreDoc('ludoRooms', String(room.id || roomId), room).catch(() => false);
    res.json({ success: true, room });
  });

  app.post('/api/ludo/settle', async (req, res) => {
    const { roomId, payouts, winnerUserId, winnerSummary } = req.body || {};
    let room = store.ludoRooms?.[String(roomId || '')];
    if (!room) {
      room = await getFirestoreDoc('ludoRooms', String(roomId || '')).catch(() => null);
    }
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.status === 'finished') {
      return res.json({ success: true, room, alreadySettled: true });
    }
    room.status = 'finished';
    if (winnerUserId) room.winnerUserId = winnerUserId;
    if (winnerSummary) room.winnerSummary = winnerSummary;
    if (Array.isArray(payouts)) room.payouts = payouts;
    room.updatedAt = Date.now();
    store.ludoRooms[room.id || String(roomId)] = room;
    saveStore(store);
    await patchFirestoreDoc('ludoRooms', String(room.id || roomId), room).catch(() => false);
    res.json({ success: true, room });
  });

  app.post('/api/ludo/cancel', async (req, res) => {
    const { roomId, userId } = req.body || {};
    let room = store.ludoRooms?.[String(roomId || '')];
    if (!room) {
      room = await getFirestoreDoc('ludoRooms', String(roomId || '')).catch(() => null);
    }
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (String(room.hostUserId || '') !== String(userId || '')) {
      return res.status(403).json({ success: false, message: 'Only the room host can cancel this room.' });
    }
    if (room.status !== 'waiting') {
      return res.status(409).json({ success: false, message: 'Cannot cancel a match that has already started.' });
    }
    room.status = 'cancelled';
    room.statusText = `Room ${room.code} cancelled — 90% stake refunded.`;
    room.updatedAt = Date.now();
    store.ludoRooms[room.id || String(roomId)] = room;
    saveStore(store);
    await patchFirestoreDoc('ludoRooms', String(room.id || roomId), room).catch(() => false);
    res.json({ success: true, room });
  });

  app.post('/api/ludo/leave', async (req, res) => {
    const { roomId, userId, name } = req.body || {};
    let room = store.ludoRooms?.[String(roomId || '')];
    if (!room) {
      room = await getFirestoreDoc('ludoRooms', String(roomId || '')).catch(() => null);
    }
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.status !== 'waiting') {
      return res.status(409).json({ success: false, message: 'Cannot leave & refund after match started.' });
    }
    const prevPlayers: any[] = Array.isArray(room.players) ? room.players : [];
    const nextPlayers = prevPlayers
      .filter((p) => String(p.userId) !== String(userId || ''))
      .map((p, idx) => ({ ...p, slotIndex: idx }));
    room.players = nextPlayers;
    room.statusText = `${String(name || 'Player')} left room (90% refund).`;
    room.updatedAt = Date.now();
    store.ludoRooms[room.id || String(roomId)] = room;
    saveStore(store);
    await patchFirestoreDoc('ludoRooms', String(room.id || roomId), room).catch(() => false);
    res.json({ success: true, room });
  });

  app.post('/api/ludo/forfeit', async (req, res) => {
    const { roomId, userId, name } = req.body || {};
    let room = store.ludoRooms?.[String(roomId || '')];
    if (!room) {
      room = await getFirestoreDoc('ludoRooms', String(roomId || '')).catch(() => null);
    }
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.status === 'finished' || room.status === 'cancelled') {
      return res.json({ success: true, room, alreadySettled: true });
    }
    if (room.status !== 'playing') {
      return res.json({ success: true, room });
    }

    const prevPlayers: any[] = Array.isArray(room.players) ? room.players : [];
    const nextPlayers = prevPlayers.map((p) =>
      String(p.userId) === String(userId || '')
        ? { ...p, forfeited: true, finishedRank: 99 }
        : p
    );
    const activePlayers = nextPlayers.filter((p) => !p.forfeited && p.finishedRank !== 99);
    const leaverName = String(
      name || prevPlayers.find((p) => String(p.userId) === String(userId || ''))?.name || 'Player'
    );
    const stake = Number(room.stake || 0);
    const nowMs = Date.now();

    if (activePlayers.length <= 1 || room.mode === '2p_winner') {
      const ranked = [...nextPlayers].sort((a, b) => {
        if (Boolean(a.forfeited) !== Boolean(b.forfeited)) return a.forfeited ? 1 : -1;
        const rA = Number(a.finishedRank || 99);
        const rB = Number(b.finishedRank || 99);
        if (rA !== rB) return rA - rB;
        const doneA = Array.isArray(a.tokens) ? a.tokens.filter((t: number) => t === 56).length : 0;
        const doneB = Array.isArray(b.tokens) ? b.tokens.filter((t: number) => t === 56).length : 0;
        if (doneA !== doneB) return doneB - doneA;
        const progA = Array.isArray(a.tokens) ? a.tokens.reduce((s: number, t: number) => s + Math.max(0, t), 0) : 0;
        const progB = Array.isArray(b.tokens) ? b.tokens.reduce((s: number, t: number) => s + Math.max(0, t), 0) : 0;
        return progB - progA;
      });
      const totalPool = room.mode === '2p_winner' ? stake * 2 : stake * 4;
      const payouts = ranked.map((p, idx) => {
        if (p.forfeited) return { userId: p.userId, name: p.name, rank: idx + 1, amount: 0 };
        if (room.mode === '2p_winner') {
          return { userId: p.userId, name: p.name, rank: idx + 1, amount: idx === 0 ? +(stake * 1.9).toFixed(2) : 0 };
        }
        if (room.mode === '4p_winner' || activePlayers.length <= 1) {
          return { userId: p.userId, name: p.name, rank: idx + 1, amount: idx === 0 ? +(totalPool * 0.9).toFixed(2) : 0 };
        }
        const shares = [0.5, 0.25, 0.15, 0];
        return { userId: p.userId, name: p.name, rank: idx + 1, amount: +(totalPool * (shares[idx] || 0)).toFixed(2) };
      });
      const first = payouts[0];
      const summary = `${first?.name || 'Winner'} won ৳${first?.amount || 0} (${leaverName} exited & forfeited)`;
      room.players = nextPlayers;
      room.status = 'finished';
      room.payouts = payouts;
      room.winnerUserId = first?.userId;
      room.winnerSummary = summary;
      room.statusText = summary;
      room.updatedAt = nowMs;
    } else {
      let nextTurn = Number(room.currentTurnIdx || 0) % nextPlayers.length;
      let guard = 0;
      while (
        (nextPlayers[nextTurn]?.forfeited ||
          (Array.isArray(nextPlayers[nextTurn]?.tokens) && nextPlayers[nextTurn].tokens.every((t: number) => t === 56))) &&
        guard < nextPlayers.length
      ) {
        nextTurn = (nextTurn + 1) % nextPlayers.length;
        guard++;
      }
      room.players = nextPlayers;
      room.currentTurnIdx = nextTurn;
      room.statusText = `${leaverName} exited & forfeited! ${nextPlayers[nextTurn]?.name}'s turn`;
      room.updatedAt = nowMs;
    }

    store.ludoRooms[room.id || String(roomId)] = room;
    saveStore(store);
    await patchFirestoreDoc('ludoRooms', String(room.id || roomId), room).catch(() => false);
    res.json({ success: true, room });
  });

  // =================== LIVE CRICKET & FOOTBALL SPORTS ROUTES ===================
  app.get('/api/sports/matches', async (req, res) => {
    try {
      const fbSettings = await getFirestoreDoc('appConfig', 'settings').catch(() => null);
      if (fbSettings && Array.isArray(fbSettings.sportsMatches)) {
        store.settings.sportsMatches = fbSettings.sportsMatches;
      }
    } catch {}
    const matches = Array.isArray(store.settings?.sportsMatches) ? store.settings.sportsMatches : [];
    const userId = String(req.query?.userId || '').trim();
    let bets: any[] = [];
    if (userId) {
      bets = (store.sportsBets || [])
        .filter((b: any) => String(b?.userId || '') === userId)
        .sort((a: any, b: any) => Number(b?.createdAtMs || 0) - Number(a?.createdAtMs || 0));
    }
    res.json({ success: true, matches, bets });
  });

  app.post('/api/sports/bet', async (req, res) => {
    const { userId, matchId, sport, matchTitle, selectedTeam, teamName, odds, amount } = req.body || {};
    const cleanAmount = Number(amount) || 0;
    const cleanOdds = Number(odds) || 0;
    if (!userId || !matchId || (sport !== 'cricket' && sport !== 'football')) {
      return res.status(400).json({ success: false, message: 'Invalid match or user parameters.' });
    }
    if (selectedTeam !== 'teamA' && selectedTeam !== 'teamB') {
      return res.status(400).json({ success: false, message: 'Only Team A or Team B win bets are allowed.' });
    }
    if (cleanAmount < 10 || cleanAmount > 50000 || cleanOdds < 1.05) {
      return res.status(400).json({ success: false, message: 'Stake must be between ৳10 and ৳50,000.' });
    }
    const sportsUser = findUserServer(userId);
    if (sportsUser && getPlayableBalanceServer(sportsUser) < cleanAmount) {
      return res.status(403).json({
        success: false,
        message: 'Hold balance cannot be used for sports betting! Please wait for Admin release.'
      });
    }
    const matches: any[] = Array.isArray(store.settings?.sportsMatches) ? store.settings.sportsMatches : [];
    const foundMatch = matches.find((m: any) => String(m?.id) === String(matchId));
    if (foundMatch && foundMatch.status === 'finished') {
      return res.status(409).json({ success: false, message: 'This match has already finished.' });
    }
    const nowMs = Date.now();
    const betId = `sb_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
    const bet = {
      id: betId,
      userId: String(userId),
      matchId: String(matchId),
      sport: sport === 'football' ? 'football' : 'cricket',
      matchTitle: String(matchTitle || (foundMatch ? `${foundMatch.teamA} vs ${foundMatch.teamB}` : 'Live Match')),
      selectedTeam,
      teamName: String(teamName || (selectedTeam === 'teamA' ? foundMatch?.teamA || 'Team A' : foundMatch?.teamB || 'Team B')),
      odds: +cleanOdds.toFixed(2),
      amount: +cleanAmount.toFixed(2),
      potentialWin: +(cleanAmount * cleanOdds).toFixed(2),
      status: 'pending',
      time: new Date(nowMs).toLocaleTimeString('en-US', { hour12: false }),
      createdAtMs: nowMs
    };
    store.sportsBets = [bet, ...(store.sportsBets || [])].slice(0, 500);
    saveStore(store);
    await patchFirestoreDoc('sportsBets', betId, bet).catch(() => false);
    res.json({ success: true, bet });
  });

  app.post('/api/sports/upsert-match', async (req, res) => {
    const { match } = req.body || {};
    if (!match || !match.teamA || !match.teamB || (match.sport !== 'cricket' && match.sport !== 'football')) {
      return res.status(400).json({ success: false, message: 'Sport, Team A, and Team B are required.' });
    }
    const nowMs = Date.now();
    const existing: any[] = Array.isArray(store.settings?.sportsMatches) ? [...store.settings.sportsMatches] : [];
    const cleanMatch = {
      id: String(match.id || `sp_${nowMs}_${Math.random().toString(36).slice(2, 6)}`),
      sport: match.sport === 'football' ? 'football' : 'cricket',
      league: String(match.league || (match.sport === 'football' ? 'Live Football' : 'Live Cricket')).trim(),
      teamA: String(match.teamA).trim(),
      teamB: String(match.teamB).trim(),
      teamAOdds: Math.max(1.05, Number(match.teamAOdds) || 1.85),
      teamBOdds: Math.max(1.05, Number(match.teamBOdds) || 1.95),
      scoreA: String(match.scoreA || ''),
      scoreB: String(match.scoreB || ''),
      statusText: String(match.statusText || 'Match Live'),
      status: match.status === 'finished' ? 'finished' : match.status === 'upcoming' ? 'upcoming' : 'live',
      ...(match.winner === 'teamA' || match.winner === 'teamB' ? { winner: match.winner } : {}),
      startTime: String(match.startTime || new Date(nowMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })),
      updatedAt: nowMs
    };
    const idx = existing.findIndex((m: any) => String(m?.id) === cleanMatch.id);
    const nextMatches = idx >= 0 ? existing.map((m: any, i: number) => (i === idx ? cleanMatch : m)) : [cleanMatch, ...existing];
    store.settings.sportsMatches = nextMatches;
    saveStore(store);
    await patchFirestoreDoc('appConfig', 'settings', store.settings).catch(() => false);
    res.json({ success: true, match: cleanMatch, matches: nextMatches });
  });

  app.post('/api/sports/settle', async (req, res) => {
    const { matchId, winner } = req.body || {};
    if (!matchId || (winner !== 'teamA' && winner !== 'teamB')) {
      return res.status(400).json({ success: false, message: 'matchId and winner (teamA or teamB) required.' });
    }
    const nowMs = Date.now();
    const existing: any[] = Array.isArray(store.settings?.sportsMatches) ? [...store.settings.sportsMatches] : [];
    let updatedMatch: any = null;
    const nextMatches = existing.map((m: any) => {
      if (String(m?.id) !== String(matchId)) return m;
      const winTeam = winner === 'teamA' ? m.teamA : m.teamB;
      updatedMatch = { ...m, status: 'finished', winner, statusText: `${winTeam} Won`, updatedAt: nowMs };
      return updatedMatch;
    });
    if (updatedMatch) {
      store.settings.sportsMatches = nextMatches;
      await patchFirestoreDoc('appConfig', 'settings', store.settings).catch(() => false);
    }
    let settledCount = 0;
    store.sportsBets = (store.sportsBets || []).map((b: any) => {
      if (String(b?.matchId || '') === String(matchId) && b?.status === 'pending') {
        const won = b.selectedTeam === winner;
        const winAmount = won ? +((Number(b.amount) || 0) * (Number(b.odds) || 1.9)).toFixed(2) : 0;
        const settled = { ...b, status: won ? 'won' : 'lost', winAmount };
        settledCount++;
        patchFirestoreDoc('sportsBets', String(b.id), settled).catch(() => false);
        return settled;
      }
      return b;
    });
    saveStore(store);
    res.json({ success: true, match: updatedMatch, settledCount });
  });

  app.post('/api/admin/verify-2fa', (req, res) => {
    const { phone, password, code, route } = req.body || {};
    if (route && String(route) !== '/admin-ewi777-panel-009') {
      return res.status(403).json({ success: false, message: 'Unauthorized admin access route!' });
    }
    const rawPhone = String(phone || '').trim();
    const rawPass = String(password || '');
    const expectedPhoneHash =
      store.settings.adminPhoneHash ||
      (process.env.ADMIN_PHONE ? sha256HexServer(normalizePhoneServer(process.env.ADMIN_PHONE)) : DEFAULT_ADMIN_PHONE_HASH);
    const expectedPassHash =
      store.settings.adminPasswordHash ||
      (process.env.ADMIN_PASSWORD ? sha256HexServer(process.env.ADMIN_PASSWORD) : DEFAULT_ADMIN_PASS_HASH);
    const inputPhone = normalizePhoneServer(rawPhone);

    if (!inputPhone || sha256HexServer(inputPhone) !== expectedPhoneHash || sha256HexServer(rawPass) !== expectedPassHash) {
      recordServerAccessLog(req, 'login_failed', inputPhone);
      return res.status(401).json({ success: false, message: 'Invalid Admin Phone or Password!' });
    }

    const cleanCode = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length !== 8) {
      return res.status(400).json({ success: false, message: 'Please enter the exact 8-character security code.' });
    }

    const validCodes = [computeAdminTotp8(0), computeAdminTotp8(-1), computeAdminTotp8(1)];
    if (!validCodes.includes(cleanCode)) {
      recordServerAccessLog(req, 'login_failed', inputPhone);
      return res.status(401).json({ success: false, message: 'Invalid or expired 8-character 2FA code!' });
    }

    recordServerAccessLog(req, 'login_success', inputPhone);
    const sessionToken = crypto
      .createHmac('sha256', ADMIN_2FA_SECRET)
      .update(`ADMIN_SESSION:${expectedPhoneHash}:${Math.floor(Date.now() / 86400000)}`)
      .digest('hex')
      .slice(0, 32);

    res.json({ success: true, message: '2FA verified successfully', sessionToken });
  });

  app.get('/api/support/messages', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const userIdFilter = req.query.userId ? String(req.query.userId) : '';
    const msgs = userIdFilter
      ? store.supportMessages.filter((m) => m.userId === userIdFilter)
      : store.supportMessages;
    res.json({ success: true, messages: msgs.slice(-500) });
  });

  app.post('/api/support/messages', (req, res) => {
    const { userId, userUid, userNickname, userPhone, sender, text, imageUrl, repliedByRole, repliedByName } = req.body || {};
    if (!userId || (!String(text || '').trim() && !imageUrl)) {
      return res.status(400).json({ success: false, message: 'Message text or image is required' });
    }

    const msg = {
      id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: String(userId),
      userUid: String(userUid || ''),
      userNickname: String(userNickname || 'Member'),
      userPhone: String(userPhone || ''),
      sender: sender === 'admin' ? 'admin' : 'user',
      ...(repliedByRole ? { repliedByRole: repliedByRole === 'mentor' ? 'mentor' : 'admin' } : {}),
      ...(repliedByName ? { repliedByName: String(repliedByName) } : {}),
      text: String(text || '').trim(),
      imageUrl: typeof imageUrl === 'string' && imageUrl.startsWith('data:image/') ? imageUrl : undefined,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      timestamp: Date.now()
    };

    store.supportMessages = [...store.supportMessages, msg].slice(-500);
    saveStore(store);
    res.json({ success: true, message: msg });
  });

  // 6. External WinGo, K3 & 5D History Proxies with Live Cache Relay & Daily-Aligned 50-Issue Sync
  const seededVal = (seedStr: string, mod: number) => {
    const hash = crypto.createHash('sha256').update(seedStr).digest();
    return hash.readUInt32BE(0) % mod;
  };

  const lotteryUpstreamCache: Record<string, { list: any[]; expiresAt: number }> = {};

  function buildDailyIssueNumber(
    game: 'wingo' | 'k3' | 'd5',
    modeParam: string,
    dur: number,
    issueMs: number
  ): string {
    const d = new Date(issueMs);
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    const utcSecOfDay = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
    const dailyIdx = Math.floor(utcSecOfDay / dur) + 1;

    let prefix = '1000';
    let offset = 10000;
    if (game === 'wingo') {
      prefix = '1000';
      offset =
        modeParam === '30s' ? 50000 : modeParam === '1m' ? 10000 : modeParam === '3m' ? 20000 : 30000;
    } else if (game === 'k3') {
      prefix =
        modeParam === '1m' ? '1010' : modeParam === '3m' ? '1020' : modeParam === '5m' ? '1030' : '1040';
      offset = 10000;
    } else {
      prefix =
        modeParam === '1m' ? '1030' : modeParam === '3m' ? '1031' : modeParam === '5m' ? '1032' : '1033';
      offset = 10000;
    }

    return `${ymd}${prefix}${String(offset + dailyIdx).padStart(5, '0')}`;
  }

  app.post('/api/lottery/cache', (req, res) => {
    const { game, mode, list } = req.body || {};
    if (
      (game === 'wingo' || game === 'k3' || game === 'd5') &&
      typeof mode === 'string' &&
      Array.isArray(list) &&
      list.length > 0 &&
      list[0]?.issueNumber
    ) {
      const key = `${game}:${mode.toLowerCase()}`;
      lotteryUpstreamCache[key] = {
        list: list.slice(0, 50),
        expiresAt: Date.now() + 90_000
      };
    }
    res.json({ success: true });
  });

  app.get('/api/wingo/history', async (req, res) => {
    const modeParam = String(req.query.mode || '30s').toLowerCase();
    const segmentMap: Record<string, string> = {
      '30s': 'WinGo_30S',
      '1m': 'WinGo_1M',
      '3m': 'WinGo_3M',
      '5m': 'WinGo_5M'
    };
    const segment = segmentMap[modeParam] || 'WinGo_30S';
    const url = `https://draw.ar-lottery01.com/WinGo/${segment}/GetHistoryIssuePage.json?pageNo=1&pageSize=50&ts=${Date.now()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Referer: 'https://draw.ar-lottery01.com/'
        }
      });
      clearTimeout(timeoutId);

      if (upstream.ok) {
        const text = await upstream.text();
        if (text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          let list = parsed?.data?.list || parsed?.list || [];
          if (Array.isArray(list) && list.length > 0) {
            if (list.length < 50) {
              try {
                const seen = new Set(list.map((x: any) => String(x?.issueNumber || x?.issue || '')));
                const batchSize = list.length <= 12 ? 10 : 50;
                const extraResults = await Promise.allSettled(
                  [2, 3, 4, 5].map((p) =>
                    fetch(
                      `https://draw.ar-lottery01.com/WinGo/${segment}/GetHistoryIssuePage.json?pageNo=${p}&pageSize=${batchSize}&ts=${Date.now()}`,
                      {
                        headers: {
                          Accept: 'application/json, text/plain, */*',
                          'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                          Referer: 'https://draw.ar-lottery01.com/'
                        }
                      }
                    ).then((r) => (r.ok ? r.text() : ''))
                  )
                );
                for (const resp of extraResults) {
                  if (resp.status !== 'fulfilled' || !resp.value || !resp.value.trim().startsWith('{')) continue;
                  const pJson = JSON.parse(resp.value);
                  const extra = pJson?.data?.list || pJson?.list || [];
                  if (Array.isArray(extra)) {
                    for (const item of extra) {
                      const key = String(item?.issueNumber || item?.issue || '');
                      if (key && !seen.has(key)) {
                        seen.add(key);
                        list.push(item);
                      }
                    }
                  }
                }
              } catch {}
            }
            const sliced = list.slice(0, 50);
            lotteryUpstreamCache[`wingo:${modeParam}`] = {
              list: sliced,
              expiresAt: Date.now() + 90_000
            };
            return res.json({ success: true, list: sliced, source: 'api' });
          }
        }
      }
    } catch {}

    const cached = lotteryUpstreamCache[`wingo:${modeParam}`];
    if (cached && cached.expiresAt > Date.now() && cached.list.length > 0) {
      return res.json({ success: true, list: cached.list, source: 'cache' });
    }

    const dur = modeParam === '30s' ? 30 : modeParam === '1m' ? 60 : modeParam === '3m' ? 180 : 300;
    const nowMs = Date.now();
    const curIdx = Math.floor(Math.floor(nowMs / 1000) / dur);
    const list: any[] = [];
    for (let i = 1; i <= 50; i++) {
      const pIdx = curIdx - i;
      const issueMs = pIdx * dur * 1000;
      const d = new Date(issueMs);
      const issueNumber = buildDailyIssueNumber('wingo', modeParam, dur, issueMs);
      const num = seededVal(`wingo:${modeParam}:${issueNumber}`, 10);
      list.push({
        issueNumber,
        number: String(num),
        time: d.toTimeString().slice(0, 8)
      });
    }
    return res.json({ success: true, list, source: 'synced' });
  });

  app.get('/api/k3/history', async (req, res) => {
    const modeParam = String(req.query.mode || '1m').toLowerCase();
    const segmentMap: Record<string, string> = {
      '1m': 'K3_1M',
      '3m': 'K3_3M',
      '5m': 'K3_5M',
      '10m': 'K3_10M'
    };
    const segment = segmentMap[modeParam] || 'K3_1M';
    const url = `https://draw.ar-lottery01.com/K3/${segment}/GetHistoryIssuePage.json?pageNo=1&pageSize=50&ts=${Date.now()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Referer: 'https://draw.ar-lottery01.com/'
        }
      });
      clearTimeout(timeoutId);

      if (upstream.ok) {
        const text = await upstream.text();
        if (text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          const list = parsed?.data?.list || parsed?.list || [];
          if (Array.isArray(list) && list.length > 0) {
            const sliced = list.slice(0, 50);
            lotteryUpstreamCache[`k3:${modeParam}`] = {
              list: sliced,
              expiresAt: Date.now() + 90_000
            };
            return res.json({ success: true, list: sliced, source: 'api' });
          }
        }
      }
    } catch {}

    const cached = lotteryUpstreamCache[`k3:${modeParam}`];
    if (cached && cached.expiresAt > Date.now() && cached.list.length > 0) {
      return res.json({ success: true, list: cached.list, source: 'cache' });
    }

    const dur = modeParam === '1m' ? 60 : modeParam === '3m' ? 180 : modeParam === '5m' ? 300 : 600;
    const nowMs = Date.now();
    const curIdx = Math.floor(Math.floor(nowMs / 1000) / dur);
    const list: any[] = [];
    for (let i = 1; i <= 50; i++) {
      const pIdx = curIdx - i;
      const issueMs = pIdx * dur * 1000;
      const d = new Date(issueMs);
      const issueNumber = buildDailyIssueNumber('k3', modeParam, dur, issueMs);
      const d1 = seededVal(`k3:${modeParam}:${issueNumber}:1`, 6) + 1;
      const d2 = seededVal(`k3:${modeParam}:${issueNumber}:2`, 6) + 1;
      const d3 = seededVal(`k3:${modeParam}:${issueNumber}:3`, 6) + 1;
      list.push({
        issueNumber,
        number: `${d1},${d2},${d3}`,
        time: d.toTimeString().slice(0, 8)
      });
    }
    return res.json({ success: true, list, source: 'synced' });
  });

  app.get('/api/d5/history', async (req, res) => {
    const modeParam = String(req.query.mode || '1m').toLowerCase();
    const segmentMap: Record<string, string> = {
      '1m': 'D5_1M',
      '3m': 'D5_3M',
      '5m': 'D5_5M',
      '10m': 'D5_10M'
    };
    const segment = segmentMap[modeParam] || 'D5_1M';
    const url = `https://draw.ar-lottery01.com/D5/${segment}/GetHistoryIssuePage.json?pageNo=1&pageSize=50&ts=${Date.now()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Referer: 'https://draw.ar-lottery01.com/'
        }
      });
      clearTimeout(timeoutId);

      if (upstream.ok) {
        const text = await upstream.text();
        if (text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          const list = parsed?.data?.list || parsed?.list || [];
          if (Array.isArray(list) && list.length > 0) {
            const sliced = list.slice(0, 50);
            lotteryUpstreamCache[`d5:${modeParam}`] = {
              list: sliced,
              expiresAt: Date.now() + 90_000
            };
            return res.json({ success: true, list: sliced, source: 'api' });
          }
        }
      }
    } catch {}

    const cached = lotteryUpstreamCache[`d5:${modeParam}`];
    if (cached && cached.expiresAt > Date.now() && cached.list.length > 0) {
      return res.json({ success: true, list: cached.list, source: 'cache' });
    }

    const dur = modeParam === '1m' ? 60 : modeParam === '3m' ? 180 : modeParam === '5m' ? 300 : 600;
    const nowMs = Date.now();
    const curIdx = Math.floor(Math.floor(nowMs / 1000) / dur);
    const list: any[] = [];
    for (let i = 1; i <= 50; i++) {
      const pIdx = curIdx - i;
      const issueMs = pIdx * dur * 1000;
      const d = new Date(issueMs);
      const issueNumber = buildDailyIssueNumber('d5', modeParam, dur, issueMs);
      const digits = [0, 1, 2, 3, 4].map((slot) => seededVal(`d5:${modeParam}:${issueNumber}:${slot}`, 10));
      list.push({
        issueNumber,
        number: digits.join(','),
        time: d.toTimeString().slice(0, 8)
      });
    }
    return res.json({ success: true, list, source: 'synced' });
  });

  // 7. Shared Authoritative Aviator, Lucky Jet & PLANE Crash Engine (Silent 30% Payout Pool & Rolling Cap)
  type CrashGameId = 'aviator' | 'luckyjet' | 'plane';

  function parseCrashGameId(raw: any): CrashGameId {
    if (raw === 'luckyjet') return 'luckyjet';
    if (raw === 'plane') return 'plane';
    return 'aviator';
  }

  function ensureCrashRolling() {
    if (!store.crashRolling || typeof store.crashRolling !== 'object') {
      store.crashRolling = { wagered: 0, paidOut: 0 };
    }
    return store.crashRolling;
  }

  function ensureCrashPoolForRound(game: CrashGameId, roundId: string) {
    if (!store.crashPools || typeof store.crashPools !== 'object') store.crashPools = {};
    const cur = store.crashPools[game];
    if (!cur || cur.roundId !== roundId) {
      store.crashPools[game] = {
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
    }
    return store.crashPools[game];
  }

  function buildAuthoritativeCrashState(game: CrashGameId, nowMs = Date.now()) {
    const base = getSyncedCrashEngineState(game, nowMs);
    const pool = ensureCrashPoolForRound(game, base.roundId);
    const rolling = ensureCrashRolling();

    // Check active bettors & silent 30% pool/rolling payout cap dynamically during flying phase
    if (base.phase === 'flying' && !pool.forcedCrashMultiplier && pool.totalPool > 0) {
      if (pool.totalPaidOut >= pool.maxPayoutCap && pool.totalPaidOut > 0) {
        pool.forcedCrashMultiplier = Math.max(1.0, +(base.currentMultiplier - 0.01).toFixed(2));
        pool.forcedCrashedAtMs = nowMs;
        pool.bets = (pool.bets || []).map((b: any) =>
          b.status === 'active' ? { ...b, status: 'lost' } : b
        );
        pool.updatedAt = nowMs;
        saveStore(store);
      } else {
        const activeBets = (pool.bets || []).filter((b: any) => b.status === 'active');
        if (activeBets.length > 0) {
          const largestActive = Math.max(...activeBets.map((b: any) => Number(b.amount || 0)));
          if (largestActive >= 500) {
            pool.forcedCrashMultiplier = 1.0;
            pool.forcedCrashedAtMs = nowMs;
            pool.bets = (pool.bets || []).map((b: any) =>
              b.status === 'active' ? { ...b, status: 'lost' } : b
            );
            pool.updatedAt = nowMs;
            saveStore(store);
          } else {
            const uniqueUsers = new Set(activeBets.map((b: any) => b.userId)).size;
            const evalRes = evaluateCrash30Cap({
              totalPool: pool.totalPool,
              totalPaidOut: pool.totalPaidOut,
              activeBetAmount: largestActive,
              currentMultiplier: base.currentMultiplier,
              activePlayerCount: uniqueUsers,
              rollingWagered: rolling.wagered,
              rollingPaidOut: rolling.paidOut
            });
            if (evalRes.shouldForceCrash) {
              pool.forcedCrashMultiplier = Math.max(1.0, +(base.currentMultiplier - 0.01).toFixed(2));
              pool.forcedCrashedAtMs = nowMs;
              pool.bets = (pool.bets || []).map((b: any) =>
                b.status === 'active' ? { ...b, status: 'lost' } : b
              );
              pool.updatedAt = nowMs;
              saveStore(store);
            }
          }
        }
      }
    }

    if (pool.forcedCrashMultiplier > 0 && (base.phase === 'flying' || base.phase === 'crashed')) {
      return {
        ...base,
        phase: 'crashed' as const,
        phaseStartedAt: pool.forcedCrashedAtMs || nowMs,
        crashPoint: pool.forcedCrashMultiplier,
        currentMultiplier: pool.forcedCrashMultiplier,
        forcedCrashAt: pool.forcedCrashMultiplier,
        totalPool: pool.totalPool,
        totalPaidOut: pool.totalPaidOut,
        payoutCapRemaining: Math.max(0, +(pool.maxPayoutCap - pool.totalPaidOut).toFixed(2))
      };
    }

    return {
      ...base,
      totalPool: pool.totalPool,
      totalPaidOut: pool.totalPaidOut,
      payoutCapRemaining: Math.max(0, +(pool.maxPayoutCap - pool.totalPaidOut).toFixed(2))
    };
  }

  app.get('/api/aviator/state', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      state: buildAuthoritativeCrashState('aviator', Date.now())
    });
  });

  app.get('/api/crash/state', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const game = parseCrashGameId(req.query.game);
    const state = buildAuthoritativeCrashState(game, Date.now());
    const pool = ensureCrashPoolForRound(game, state.roundId);
    res.json({ success: true, state, pool });
  });

  app.post('/api/crash/bet', (req, res) => {
    const game = parseCrashGameId(req.body?.game);
    const roundId = String(req.body?.roundId || '');
    const userId = String(req.body?.userId || 'guest');
    const nickname = String(req.body?.nickname || 'Player').slice(0, 36);
    const amount = Number(req.body?.amount) || 0;
    const betId = String(req.body?.betId || `cb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    if (!roundId || amount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum bet is ৳10' });
    }
    const crashUser = findUserServer(userId);
    if (crashUser && getPlayableBalanceServer(crashUser) < amount) {
      return res.status(403).json({
        success: false,
        message: 'Hold balance cannot be used for betting! Please wait for Admin release.'
      });
    }
    const pool = ensureCrashPoolForRound(game, roundId);
    if (pool.forcedCrashMultiplier > 0) {
      return res.status(409).json({ success: false, message: 'Round already crashed' });
    }
    const rolling = ensureCrashRolling();
    rolling.wagered = +(Number(rolling.wagered || 0) + amount).toFixed(2);
    if (rolling.wagered > 100000) {
      rolling.wagered = +(rolling.wagered * 0.5).toFixed(2);
      rolling.paidOut = +(rolling.paidOut * 0.5).toFixed(2);
    }

    pool.bets = [
      ...(pool.bets || []).filter((b: any) => b.id !== betId),
      {
        id: betId,
        game,
        roundId,
        userId,
        nickname,
        amount,
        status: 'active',
        placedAt: Date.now()
      }
    ].slice(-60);
    pool.totalPool = +(Number(pool.totalPool || 0) + amount).toFixed(2);
    pool.maxPayoutCap = +(pool.totalPool * 0.30).toFixed(2);
    pool.updatedAt = Date.now();
    saveStore(store);
    res.json({ success: true, pool });
  });

  app.post('/api/crash/cancel', (req, res) => {
    const game = parseCrashGameId(req.body?.game);
    const roundId = String(req.body?.roundId || '');
    const betId = String(req.body?.betId || '');
    const stateNow = getSyncedCrashEngineState(game, Date.now());
    if (stateNow.phase !== 'waiting') {
      return res.status(409).json({ success: false, message: 'Flight already started' });
    }
    const pool = ensureCrashPoolForRound(game, roundId || stateNow.roundId);
    const target = (pool.bets || []).find((b: any) => b.id === betId && b.status === 'active');
    if (target) {
      const rolling = ensureCrashRolling();
      rolling.wagered = Math.max(0, +(Number(rolling.wagered || 0) - Number(target.amount || 0)).toFixed(2));
      pool.bets = (pool.bets || []).filter((b: any) => b.id !== betId);
      pool.totalPool = Math.max(0, +(Number(pool.totalPool || 0) - Number(target.amount || 0)).toFixed(2));
      pool.maxPayoutCap = +(pool.totalPool * 0.30).toFixed(2);
      pool.updatedAt = Date.now();
      saveStore(store);
    }
    res.json({ success: true, cancelled: Boolean(target), pool });
  });

  app.post('/api/crash/cashout', (req, res) => {
    const game = parseCrashGameId(req.body?.game);
    const roundId = String(req.body?.roundId || '');
    const userId = String(req.body?.userId || 'guest');
    const betId = String(req.body?.betId || '');
    const requestedMult = Math.max(1, Number(req.body?.multiplier) || 1);

    const stateNow = buildAuthoritativeCrashState(game, Date.now());
    const pool = ensureCrashPoolForRound(game, roundId || stateNow.roundId);
    const rolling = ensureCrashRolling();

    if (stateNow.phase === 'crashed' || pool.forcedCrashMultiplier > 0) {
      return res.status(409).json({
        success: false,
        crashed: true,
        crashPoint: stateNow.crashPoint || pool.forcedCrashMultiplier
      });
    }

    const betEntry = (pool.bets || []).find(
      (b: any) => (betId ? b.id === betId : b.userId === userId && b.status === 'active')
    );
    const activeAmount = Number(betEntry?.amount || req.body?.amount || 0);
    const uniqueUsers = new Set((pool.bets || []).filter((b: any) => b.status === 'active').map((b: any) => b.userId)).size;

    const evalRes = evaluateCrash30Cap({
      totalPool: pool.totalPool || activeAmount,
      totalPaidOut: pool.totalPaidOut || 0,
      activeBetAmount: activeAmount,
      currentMultiplier: requestedMult,
      activePlayerCount: Math.max(1, uniqueUsers),
      rollingWagered: rolling.wagered,
      rollingPaidOut: rolling.paidOut
    });

    if (evalRes.shouldForceCrash) {
      const crashAt = Math.max(1.0, +(requestedMult - 0.01).toFixed(2));
      pool.forcedCrashMultiplier = crashAt;
      pool.forcedCrashedAtMs = Date.now();
      pool.bets = (pool.bets || []).map((b: any) =>
        b.status === 'active' ? { ...b, status: 'lost' } : b
      );
      pool.updatedAt = Date.now();
      saveStore(store);
      return res.status(409).json({
        success: false,
        crashed: true,
        crashPoint: crashAt
      });
    }

    const winAmount = +(activeAmount * requestedMult).toFixed(2);
    pool.totalPaidOut = +(Number(pool.totalPaidOut || 0) + winAmount).toFixed(2);
    rolling.paidOut = +(Number(rolling.paidOut || 0) + winAmount).toFixed(2);
    if (betEntry) {
      betEntry.status = 'cashed_out';
      betEntry.cashoutMultiplier = requestedMult;
      betEntry.payoutAmount = winAmount;
    }
    pool.updatedAt = Date.now();
    saveStore(store);
    res.json({ success: true, winAmount, multiplier: requestedMult, pool });
  });

  app.post('/api/crash/admin-force', (req, res) => {
    const game = parseCrashGameId(req.body?.game);
    const nowMs = Date.now();
    const stateNow = buildAuthoritativeCrashState(game, nowMs);
    const pool = ensureCrashPoolForRound(game, stateNow.roundId);
    if (stateNow.phase === 'waiting') {
      return res.status(409).json({
        success: false,
        message: 'Flight is waiting for takeoff — wait until FLYING phase to force crash'
      });
    }
    if (stateNow.phase === 'flying') {
      const crashAt = Math.max(1.0, Number(req.body?.multiplier) || stateNow.currentMultiplier || 1.0);
      pool.forcedCrashMultiplier = +crashAt.toFixed(2);
      pool.forcedCrashedAtMs = nowMs;
      pool.bets = (pool.bets || []).map((b: any) =>
        b.status === 'active' ? { ...b, status: 'lost' } : b
      );
      pool.updatedAt = nowMs;
      saveStore(store);
    }
    const nextState = buildAuthoritativeCrashState(game, nowMs);
    res.json({ success: true, state: nextState, pool });
  });

  function fillTemplateId(template: string, id: string): string {
    const enc = encodeURIComponent(id);
    if (/(:idOrOrderId|:withdrawalId|:siteUserId|:sessionId|:depositId|:orderId|:id)/i.test(template)) {
      return template.replace(/(:idOrOrderId|:withdrawalId|:siteUserId|:sessionId|:depositId|:orderId|:id)/gi, enc);
    }
    return `${template.replace(/\/+$/, '')}/${enc}`;
  }

  function normalizeBdPhone11Server(num: any): string {
    const digits = String(num || '').replace(/\D/g, '');
    if (digits.startsWith('880') && digits.length >= 13) return `0${digits.slice(3, 13)}`;
    if (digits.startsWith('0') && digits.length >= 11) return digits.slice(0, 11);
    if (digits.length === 10) return `0${digits}`;
    return digits.slice(0, 11);
  }

  function getServerEwiPayConfig() {
    const raw = (store.settings?.ewiPayConfig && typeof store.settings.ewiPayConfig === 'object'
      ? store.settings.ewiPayConfig
      : {}) as Record<string, any>;
    const baseUrl = String(raw.baseUrl || '').trim().replace(/\/+$/, '') || EWI_PAY_DEFAULT_BASE;
    const siteSlug = String(raw.siteSlug || '').trim() || 'ewi777';
    const apiKey = String(raw.apiKey || '').trim() || EWI_PAY_DEFAULT_KEY;
    return {
      baseUrl,
      siteSlug,
      apiKey,
      bkashCheckoutUrl: String(raw.bkashCheckoutUrl || '').trim() || `${baseUrl}/api/v1/bkash/checkout/create`,
      bkashTransactionsUrl: String(raw.bkashTransactionsUrl || '').trim() || `${baseUrl}/api/v1/bkash/transactions`,
      bkashWithdrawUrl: String(raw.bkashWithdrawUrl || '').trim() || `${baseUrl}/api/v1/bkash/withdrawals/request`,
      bkashWithdrawStatusUrl: String(raw.bkashWithdrawStatusUrl || '').trim() || `${baseUrl}/api/v1/bkash/withdrawals/:id/status`,
      bkashDepositStatusUrl: String(raw.bkashDepositStatusUrl || '').trim() || `${baseUrl}/api/v1/bkash/deposits/:id/status`,
      nagadCheckoutUrl: String(raw.nagadCheckoutUrl || '').trim() || `${baseUrl}/api/v1/nagad/checkout/create`,
      nagadTransactionsUrl: String(raw.nagadTransactionsUrl || '').trim() || `${baseUrl}/api/v1/nagad/transactions`,
      nagadWithdrawUrl: String(raw.nagadWithdrawUrl || '').trim() || `${baseUrl}/api/v1/nagad/withdrawals/request`,
      nagadWithdrawStatusUrl: String(raw.nagadWithdrawStatusUrl || '').trim() || `${baseUrl}/api/v1/nagad/withdrawals/:id/status`,
      nagadDepositStatusUrl: String(raw.nagadDepositStatusUrl || '').trim() || `${baseUrl}/api/v1/nagad/deposits/:id/status`,
      unifiedCheckoutUrl: String(raw.unifiedCheckoutUrl || '').trim() || `${baseUrl}/api/v1/checkout/create`,
      unifiedDepositStatusUrl: `${baseUrl}/api/v1/deposits/:orderId/status`,
      unifiedWithdrawStatusUrl: `${baseUrl}/api/v1/withdrawals/:withdrawalId/status`,
      memberStatusUrl: String(raw.memberStatusUrl || '').trim() || `${baseUrl}/api/v1/member/:siteUserId/status`,
      checkoutStatusUrl: String(raw.checkoutStatusUrl || '').trim() || `${baseUrl}/api/v1/checkout/status/:sessionId`,
      webhookUrl: String(raw.webhookUrl || '').trim()
    };
  }

  // 7B. EWI-Pay Live Deposit & Withdrawal Gateway Proxy (Server-side API Key Injection)
  app.post('/api/ewi-pay/checkout-create', async (req, res) => {
    if (store.settings.depositEnabled === false) {
      return res.status(403).json({ success: false, message: 'NOW NOT AVAILABLE' });
    }
    try {
      const cfg = getServerEwiPayConfig();
      const {
        amount,
        usdAmount,
        user_id,
        userId,
        siteUserId,
        orderId: rawOrderId,
        method,
        provider: rawProvider,
        channel,
        senderNumber,
        callbackUrl: rawCallbackUrl,
        returnUrl,
        return_url
      } = req.body || {};
      const methodStr = String(method || rawProvider || 'bKash');
      const isUsdt = methodStr.toUpperCase() === 'USDT';
      const usdtRate = Math.max(100, Number(store.settings?.usdtRateBdt || 120));
      const numUsd = usdAmount !== undefined ? Number(usdAmount) : 0;
      const numAmt = isUsdt && numUsd > 0 ? +(numUsd * usdtRate).toFixed(2) : Number(amount) || 0;
      const cleanUserId = String(siteUserId || user_id || userId || 'USER_1').trim();
      if (isUsdt) {
        const checkUsd = numUsd > 0 ? numUsd : +(numAmt / usdtRate).toFixed(2);
        if (checkUsd < 2 || checkUsd > 20000) {
          return res.status(400).json({ success: false, message: 'Binance / USDT deposit must be between $2 and $20,000' });
        }
      } else if (numAmt < 200 || numAmt > 50000) {
        return res.status(400).json({ success: false, message: 'Deposit amount must be between ৳200 and ৳50,000' });
      }
      const methodLower = methodStr.toLowerCase();
      const providerSlug = methodLower.includes('bkash')
        ? 'bkash'
        : methodLower.includes('nagad')
        ? 'nagad'
        : isUsdt
        ? 'usdt'
        : '';
      const gatewayEndpoint =
        providerSlug === 'bkash'
          ? cfg.bkashCheckoutUrl
          : providerSlug === 'nagad'
          ? cfg.nagadCheckoutUrl
          : cfg.unifiedCheckoutUrl;
      const uniqueOrderId =
        String(rawOrderId || '')
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '_') ||
        `DEP_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const siteOrigin = getRequestOrigin(req);
      const resolvedCallbackUrl =
        String(rawCallbackUrl || cfg.webhookUrl || '').trim() || `${siteOrigin}/api/ewi-pay/webhook`;
      const resolvedReturnUrl = String(returnUrl || return_url || `${siteOrigin}/#/transaction-history`).trim();
      const methodQuery = providerSlug ? `&method=${encodeURIComponent(providerSlug)}` : '';
      const fallbackUrl = `${cfg.baseUrl}/payment/${encodeURIComponent(cfg.siteSlug)}?amount=${encodeURIComponent(String(numAmt))}&user_id=${encodeURIComponent(cleanUserId)}${methodQuery}`;

      let upstreamJson: any = null;
      let upstreamOk = false;
      try {
        const upRes = await fetch(gatewayEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': cfg.apiKey
          },
          body: JSON.stringify({
            amount: numAmt,
            siteUserId: cleanUserId,
            orderId: uniqueOrderId,
            callbackUrl: resolvedCallbackUrl,
            returnUrl: resolvedReturnUrl,
            ...(providerSlug ? { provider: providerSlug } : {}),
            ...(isUsdt && numUsd > 0 ? { usdAmount: numUsd } : {}),
            site: cfg.siteSlug,
            user_id: cleanUserId,
            method: providerSlug || methodStr,
            channel: channel || 'EWI PAY',
            return_url: resolvedReturnUrl
          })
        });
        upstreamOk = upRes.ok;
        upstreamJson = await upRes.json().catch(() => null);
      } catch {
        upstreamOk = false;
      }

      const paymentUrl =
        upstreamJson?.paymentUrl ||
        upstreamJson?.payment_url ||
        upstreamJson?.checkoutUrl ||
        upstreamJson?.checkout_url ||
        upstreamJson?.data?.paymentUrl ||
        upstreamJson?.data?.payment_url ||
        upstreamJson?.data?.checkoutUrl ||
        upstreamJson?.data?.checkout_url ||
        upstreamJson?.data?.url ||
        fallbackUrl;
      const sessionId =
        upstreamJson?.sessionId ||
        upstreamJson?.session_id ||
        upstreamJson?.data?.sessionId ||
        upstreamJson?.data?.session_id ||
        '';
      const returnedDepId =
        upstreamJson?.depositId ||
        upstreamJson?.deposit_id ||
        upstreamJson?.orderId ||
        upstreamJson?.id ||
        upstreamJson?.data?.depositId ||
        upstreamJson?.data?.id ||
        '';

      const nowMs = Date.now();
      const depRecord = {
        id: uniqueOrderId,
        orderId: uniqueOrderId,
        sessionId: sessionId ? String(sessionId) : String(returnedDepId || uniqueOrderId),
        checkoutUrl: paymentUrl,
        userId: cleanUserId,
        userPhone: String(senderNumber || cleanUserId),
        method: (method || 'bKash') as 'bKash' | 'Nagad' | 'USDT',
        provider: providerSlug || methodLower,
        channel: channel || (isUsdt ? 'Binance Pay' : 'EWI PAY'),
        amount: numAmt,
        ...(isUsdt && numUsd > 0 ? { usdAmount: numUsd } : {}),
        senderNumber: String(senderNumber || cleanUserId),
        trxId: String(upstreamJson?.trx_id || upstreamJson?.trxId || uniqueOrderId).toUpperCase(),
        status: 'pending',
        createdAtMs: nowMs,
        time: new Date(nowMs).toLocaleString()
      };
      store.deposits = [
        depRecord,
        ...(store.deposits || []).filter(
          (d) =>
            d.id !== depRecord.id &&
            d.orderId !== depRecord.orderId &&
            !(depRecord.sessionId && d.sessionId === depRecord.sessionId)
        )
      ];
      saveStore(store);

      res.json({
        success: true,
        upstreamSynced: upstreamOk,
        paymentUrl,
        checkoutUrl: paymentUrl,
        orderId: uniqueOrderId,
        sessionId: depRecord.sessionId,
        depositId: String(returnedDepId || uniqueOrderId),
        deposit: depRecord,
        gateway: upstreamJson
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'EWI PAY checkout error' });
    }
  });

  app.get('/api/ewi-pay/checkout-status/:sessionId', async (req, res) => {
    const sessionId = String(req.params.sessionId || '').trim();
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId required' });
    }
    const cfg = getServerEwiPayConfig();
    try {
      const upRes = await fetch(fillTemplateId(cfg.checkoutStatusUrl, sessionId), {
        headers: { 'x-api-key': cfg.apiKey }
      });
      const json = await upRes.json().catch(() => ({}));
      res.json({ ...(json && typeof json === 'object' ? json : {}), success: upRes.ok, sessionId, gateway: json });
    } catch (err: any) {
      res.status(502).json({ success: false, message: err?.message || 'Checkout status error' });
    }
  });

  app.get('/api/ewi-pay/deposit-status/:id', async (req, res) => {
    const id = String(req.params.id || '').trim();
    const methodLower = String(req.query.method || '').toLowerCase();
    if (!id) return res.status(400).json({ success: false, message: 'deposit id required' });
    const cfg = getServerEwiPayConfig();
    const unifiedUrl = fillTemplateId(cfg.unifiedDepositStatusUrl, id);
    const methodUrl = methodLower.includes('bkash')
      ? fillTemplateId(cfg.bkashDepositStatusUrl, id)
      : methodLower.includes('nagad')
      ? fillTemplateId(cfg.nagadDepositStatusUrl, id)
      : '';
    try {
      let upRes = await fetch(unifiedUrl, { headers: { 'x-api-key': cfg.apiKey } });
      let json = upRes.ok ? await upRes.json().catch(() => ({})) : {};
      const statusStr = String(json?.status || json?.deposit?.status || json?.data?.status || '').toLowerCase();
      if ((!upRes.ok || !statusStr) && methodUrl) {
        const mRes = await fetch(methodUrl, { headers: { 'x-api-key': cfg.apiKey } });
        if (mRes.ok) {
          upRes = mRes;
          json = await mRes.json().catch(() => ({}));
        }
      }
      res.json({
        ...(json && typeof json === 'object' ? json : {}),
        success: upRes.ok,
        depositId: id,
        orderId: id,
        gateway: json
      });
    } catch (err: any) {
      res.status(502).json({ success: false, message: err?.message || 'Deposit status error' });
    }
  });

  app.get('/api/ewi-pay/transactions', async (req, res) => {
    try {
      const cfg = getServerEwiPayConfig();
      const methodFilter = String(req.query.method || '').toLowerCase();
      const rawSources: Array<{ url: string; forcedMethod?: 'bKash' | 'Nagad' }> = [
        { url: cfg.bkashTransactionsUrl, forcedMethod: 'bKash' },
        { url: cfg.nagadTransactionsUrl, forcedMethod: 'Nagad' },
        { url: `${cfg.baseUrl}/api/v1/merchant/transactions` }
      ];
      const sources = rawSources.filter((s) => {
        if (!methodFilter) return true;
        if (methodFilter === 'bkash') return s.forcedMethod === 'bKash' || !s.forcedMethod;
        if (methodFilter === 'nagad') return s.forcedMethod === 'Nagad' || !s.forcedMethod;
        return true;
      });
      const results = await Promise.all(
        sources.map(async ({ url, forcedMethod }) => {
          try {
            const upRes = await fetch(url, { headers: { 'x-api-key': cfg.apiKey } });
            if (!upRes.ok) return [];
            const json = await upRes.json().catch(() => ({}));
            const rows = Array.isArray(json?.transactions)
              ? json.transactions
              : Array.isArray(json?.data)
              ? json.data
              : Array.isArray(json)
              ? json
              : [];
            return rows.map((item: any) => {
              if (!item || typeof item !== 'object') return item;
              const rawM = String(item.method || item.wallet || item.provider || forcedMethod || '').toLowerCase();
              const normM = forcedMethod || (rawM.includes('nagad') ? 'Nagad' : rawM.includes('bkash') ? 'bKash' : item.method);
              return { ...item, method: normM || item.method };
            });
          } catch {
            return [];
          }
        })
      );
      const mergedMap = new Map<string, any>();
      results.flat().forEach((item: any) => {
        if (!item) return;
        const baseId = String(item.id || item.deposit_id || item.depositId || item.sessionId || item.trx_id || item.trxId || '');
        if (!baseId) return;
        const mapKey = `${String(item.method || 'generic').toLowerCase()}:${baseId}`;
        const prev = mergedMap.get(mapKey) || {};
        mergedMap.set(mapKey, { ...prev, ...item });
      });
      res.json({ success: true, transactions: Array.from(mergedMap.values()) });
    } catch (err: any) {
      res.status(502).json({ success: false, transactions: [], message: err?.message || 'Gateway fetch error' });
    }
  });

  app.post('/api/ewi-pay/approve', async (req, res) => {
    const cfg = getServerEwiPayConfig();
    const depositId = String(req.body?.depositId || '').trim();
    const methodLower = String(req.body?.method || '').toLowerCase();
    if (!depositId) return res.status(400).json({ success: false, message: 'depositId required' });
    const primaryUrl = methodLower.includes('bkash')
      ? `${cfg.baseUrl}/api/v1/bkash/transactions/${encodeURIComponent(depositId)}/approve`
      : methodLower.includes('nagad')
      ? `${cfg.baseUrl}/api/v1/nagad/transactions/${encodeURIComponent(depositId)}/approve`
      : `${cfg.baseUrl}/api/v1/merchant/transactions/${encodeURIComponent(depositId)}/approve`;
    try {
      let upRes = await fetch(primaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey }
      });
      if (!upRes.ok && (methodLower.includes('bkash') || methodLower.includes('nagad'))) {
        upRes = await fetch(`${cfg.baseUrl}/api/v1/merchant/transactions/${encodeURIComponent(depositId)}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey }
        });
      }
      const json = await upRes.json().catch(() => ({}));
      res.json({ success: upRes.ok, gateway: json });
    } catch (err: any) {
      res.status(502).json({ success: false, message: err?.message || 'Gateway approve error' });
    }
  });

  app.post('/api/ewi-pay/reject', async (req, res) => {
    const cfg = getServerEwiPayConfig();
    const depositId = String(req.body?.depositId || '').trim();
    const note = String(req.body?.note || '').trim();
    const methodLower = String(req.body?.method || '').toLowerCase();
    if (!depositId) return res.status(400).json({ success: false, message: 'depositId required' });
    const primaryUrl = methodLower.includes('bkash')
      ? `${cfg.baseUrl}/api/v1/bkash/transactions/${encodeURIComponent(depositId)}/reject`
      : methodLower.includes('nagad')
      ? `${cfg.baseUrl}/api/v1/nagad/transactions/${encodeURIComponent(depositId)}/reject`
      : `${cfg.baseUrl}/api/v1/merchant/transactions/${encodeURIComponent(depositId)}/reject`;
    try {
      let upRes = await fetch(primaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey },
        body: JSON.stringify({ note })
      });
      if (!upRes.ok && (methodLower.includes('bkash') || methodLower.includes('nagad'))) {
        upRes = await fetch(`${cfg.baseUrl}/api/v1/merchant/transactions/${encodeURIComponent(depositId)}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey },
          body: JSON.stringify({ note })
        });
      }
      const json = await upRes.json().catch(() => ({}));
      res.json({ success: upRes.ok, gateway: json });
    } catch (err: any) {
      res.status(502).json({ success: false, message: err?.message || 'Gateway reject error' });
    }
  });

  app.post('/api/ewi-pay/withdraw', async (req, res) => {
    try {
      const cfg = getServerEwiPayConfig();
      const {
        amount,
        method,
        provider: rawProvider,
        accountNumber,
        number,
        recipientNumber: rawRecipient,
        userId,
        user_id,
        siteUserId,
        orderId: rawOrderId,
        callbackUrl: rawCallbackUrl,
        autoDispatch
      } = req.body || {};
      const methodStr = String(rawProvider || method || 'bKash');
      const methodLower = methodStr.toLowerCase();
      const providerSlug = methodLower.includes('nagad') ? 'nagad' : 'bkash';
      const withdrawUrl = providerSlug === 'bkash' ? cfg.bkashWithdrawUrl : cfg.nagadWithdrawUrl;
      const cleanUserId = String(siteUserId || user_id || userId || 'USER_1').trim();
      const orderId = String(rawOrderId || `wd_${Date.now()}`).trim();
      const recipientNumber = normalizeBdPhone11Server(rawRecipient || number || accountNumber || '');
      const siteOrigin = getRequestOrigin(req);
      const resolvedCallbackUrl =
        String(rawCallbackUrl || cfg.webhookUrl || '').trim() || `${siteOrigin}/api/ewi-pay/webhook`;

      const upRes = await fetch(withdrawUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey },
        body: JSON.stringify({
          siteUserId: cleanUserId,
          orderId,
          recipientNumber,
          provider: providerSlug,
          amount: Number(amount) || 0,
          callbackUrl: resolvedCallbackUrl,
          autoDispatch: autoDispatch !== undefined ? Boolean(autoDispatch) : true,
          site: cfg.siteSlug,
          user_id: cleanUserId,
          method: providerSlug,
          account_number: recipientNumber,
          accountNumber: recipientNumber,
          wallet_number: recipientNumber
        })
      });
      const json = await upRes.json().catch(() => ({}));
      const withdrawalId = String(
        json?.withdrawalId ||
          json?.withdrawal_id ||
          json?.id ||
          json?.withdrawal?.id ||
          json?.data?.withdrawalId ||
          json?.data?.withdrawal_id ||
          json?.data?.id ||
          ''
      ).trim();
      res.json({ success: upRes.ok, withdrawalId, orderId, provider: providerSlug, gateway: json });
    } catch (err: any) {
      res.status(502).json({ success: false, message: err?.message || 'Gateway withdraw error' });
    }
  });

  app.get('/api/ewi-pay/withdraw-status/:id', async (req, res) => {
    const id = String(req.params.id || '').trim();
    const methodLower = String(req.query.method || '').toLowerCase();
    if (!id) return res.status(400).json({ success: false, message: 'withdrawal id required' });
    const cfg = getServerEwiPayConfig();
    const unifiedUrl = fillTemplateId(cfg.unifiedWithdrawStatusUrl, id);
    const methodUrl = methodLower.includes('bkash')
      ? fillTemplateId(cfg.bkashWithdrawStatusUrl, id)
      : methodLower.includes('nagad')
      ? fillTemplateId(cfg.nagadWithdrawStatusUrl, id)
      : '';
    try {
      let upRes = await fetch(unifiedUrl, { headers: { 'x-api-key': cfg.apiKey } });
      let json = upRes.ok ? await upRes.json().catch(() => ({})) : {};
      const statusStr = String(json?.status || json?.withdrawal?.status || json?.data?.status || '').toLowerCase();
      if ((!upRes.ok || !statusStr) && methodUrl) {
        const mRes = await fetch(methodUrl, { headers: { 'x-api-key': cfg.apiKey } });
        if (mRes.ok) {
          upRes = mRes;
          json = await mRes.json().catch(() => ({}));
        }
      }
      res.json({ ...(json && typeof json === 'object' ? json : {}), success: upRes.ok, withdrawalId: id, gateway: json });
    } catch (err: any) {
      res.status(502).json({ success: false, message: err?.message || 'Withdrawal status error' });
    }
  });

  app.get('/api/ewi-pay/member-status/:siteUserId', async (req, res) => {
    const siteUserId = String(req.params.siteUserId || '').trim();
    if (!siteUserId) return res.status(400).json({ success: false, message: 'siteUserId required' });
    const cfg = getServerEwiPayConfig();
    try {
      const upRes = await fetch(fillTemplateId(cfg.memberStatusUrl, siteUserId), {
        headers: { 'x-api-key': cfg.apiKey }
      });
      const json = await upRes.json().catch(() => ({}));
      const deposits = Array.isArray(json?.deposits)
        ? json.deposits
        : Array.isArray(json?.data?.deposits)
        ? json.data.deposits
        : [];
      const withdrawals = Array.isArray(json?.withdrawals)
        ? json.withdrawals
        : Array.isArray(json?.data?.withdrawals)
        ? json.data.withdrawals
        : [];
      res.json({
        ...(json && typeof json === 'object' ? json : {}),
        success: upRes.ok,
        siteUserId,
        deposits,
        withdrawals,
        gateway: json
      });
    } catch (err: any) {
      res.status(502).json({
        success: false,
        siteUserId,
        deposits: [],
        withdrawals: [],
        message: err?.message || 'Member status error'
      });
    }
  });

  app.post('/api/ewi-pay/webhook', async (req: any, res) => {
    const cfg = getServerEwiPayConfig();
    const sig = String(req.headers['x-ewi-signature'] || '').trim().toLowerCase().replace(/^sha256=/, '');
    const raw = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
    const secret = process.env.EWI_PAY_WEBHOOK_SECRET || cfg.apiKey;
    if (sig) {
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex').toLowerCase();
      let validSig = false;
      if (sig.length === expected.length) {
        try {
          validSig = crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'));
        } catch {
          validSig = false;
        }
      }
      if (!validSig) {
        return res.status(401).json({ ok: false, success: false, message: 'Invalid signature' });
      }
    }

    const evt = String(req.body?.event || req.body?.type || '').toLowerCase();
    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body || {};
    const orderId = String(data?.orderId || data?.order_id || '').trim();
    const depId = String(data?.deposit_id || data?.depositId || orderId || data?.id || '').trim();
    const wdId = String(data?.withdrawal_id || data?.withdrawalId || orderId || data?.id || '').trim();
    const payoutTrxId = String(data?.payoutTrxId || data?.payout_trx_id || data?.trxId || data?.trx_id || '').trim();
    const rejectionReason = String(data?.rejectionReason || data?.reason || data?.note || data?.message || '').trim();
    const userMessage = String(data?.userMessage || data?.user_message || 'কিছুক্ষণ পর আবার চেষ্টা করুন').trim();

    if (evt === 'deposit.approved' && depId) {
      const matchedDep = (store.deposits || []).find(
        (d: any) => d.id === depId || d.orderId === orderId || d.sessionId === depId
      );
      if (matchedDep && matchedDep.status !== 'approved') {
        matchedDep.status = 'approved';
        const depAmt = Number(matchedDep.amount || data?.amount || 0);
        const isUsdt = String(matchedDep.method || '').toUpperCase() === 'USDT';
        const bonus = isUsdt ? +(depAmt * 0.02).toFixed(2) : 0;
        const uIdx = store.users.findIndex((u: any) => u.id === matchedDep.userId || u.uid === matchedDep.userId);
        if (uIdx >= 0 && depAmt > 0) {
          store.users[uIdx].balance = +(Number(store.users[uIdx].balance || 0) + depAmt + bonus).toFixed(2);
          store.users[uIdx].totalDeposited = +(Number(store.users[uIdx].totalDeposited || 0) + depAmt).toFixed(2);
          store.users[uIdx].turnoverRequired = +(Number(store.users[uIdx].turnoverRequired || 0) + depAmt * 1).toFixed(2);
          store.users[uIdx].updatedAt = Date.now();
        }
        saveStore(store);
      }
    } else if (evt === 'deposit.rejected' && depId) {
      const matchedDep = (store.deposits || []).find(
        (d: any) => d.id === depId || d.orderId === orderId || d.sessionId === depId
      );
      if (matchedDep && matchedDep.status !== 'approved' && matchedDep.status !== 'rejected') {
        matchedDep.status = 'rejected';
        matchedDep.rejectionReason = rejectionReason || 'Rejected by EWI PAY Gateway';
        matchedDep.adminNote = matchedDep.rejectionReason;
        saveStore(store);
      }
    } else if (evt.startsWith('withdrawal.') && wdId) {
      const matchedWd = (store.withdraws || []).find(
        (w: any) => w.id === wdId || w.orderId === orderId || w.ewiPayWithdrawId === wdId
      );
      if (matchedWd) {
        const prevSt = matchedWd.status;
        if (evt.includes('completed') && prevSt !== 'completed') {
          matchedWd.status = 'completed';
          if (payoutTrxId) matchedWd.payoutTrxId = payoutTrxId;
          const uIdx = store.users.findIndex((u: any) => u.id === matchedWd.userId || u.uid === matchedWd.userId);
          if (uIdx >= 0) {
            store.users[uIdx].totalWithdrawn = +(Number(store.users[uIdx].totalWithdrawn || 0) + Number(matchedWd.amount || 0)).toFixed(2);
            store.users[uIdx].updatedAt = Date.now();
          }
          saveStore(store);
        } else if (evt.includes('rejected') && prevSt !== 'rejected' && prevSt !== 'completed') {
          matchedWd.status = 'rejected';
          matchedWd.userMessage = userMessage;
          if (rejectionReason) matchedWd.rejectionReason = rejectionReason;
          matchedWd.adminNote = rejectionReason || userMessage;
          const uIdx = store.users.findIndex((u: any) => u.id === matchedWd.userId || u.uid === matchedWd.userId);
          if (uIdx >= 0) {
            store.users[uIdx].balance = +(Number(store.users[uIdx].balance || 0) + Number(matchedWd.amount || 0)).toFixed(2);
            store.users[uIdx].updatedAt = Date.now();
          }
          saveStore(store);
        } else if (evt.includes('processing') && prevSt === 'pending') {
          matchedWd.status = 'processing';
          if (data?.withdrawalId || data?.withdrawal_id) {
            matchedWd.ewiPayWithdrawId = String(data?.withdrawalId || data?.withdrawal_id);
          }
          saveStore(store);
        }
      }
    }

    try {
      await processEwiPayWebhookPayload(req.body);
    } catch {}

    res.status(200).json({ ok: true, success: true, received: evt || 'ok' });
  });

  // 7C. Cross-Device Referrals API
  app.get('/api/referrals', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const inviteCode = String(req.query.inviteCode || '').trim().toUpperCase();
    if (inviteCode) {
      const l1 = (store.referrals || []).filter(
        (r: any) => String(r.referrerCode || '').trim().toUpperCase() === inviteCode
      );
      return res.json({ success: true, referrals: l1.slice(0, 500) });
    }
    res.json({ success: true, referrals: (store.referrals || []).slice(0, 2000) });
  });

  app.post('/api/referrals', (req, res) => {
    const r = req.body?.referral;
    if (!r || !r.id || !r.referrerCode) {
      return res.status(400).json({ success: false, message: 'Invalid referral record' });
    }
    store.referrals = [r, ...(store.referrals || []).filter((x: any) => x.id !== r.id)].slice(0, 5000);
    saveStore(store);
    res.json({ success: true, referral: r });
  });

  // 8. Shared Authoritative Multi-Asset Binary Trading Engine & Cross-Device Market Pools
  app.get('/api/binary/state', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const bias = (store.settings?.binaryNextCandleBias as 'AUTO' | 'BULL' | 'BEAR') || 'AUTO';
    const offsetMin =
      typeof store.settings?.timezoneOffsetMinutes === 'number'
        ? store.settings.timezoneOffsetMinutes
        : 360;
    const snap = getSyncedBinarySnapshot(BINARY_MARKETS, Date.now(), bias, offsetMin);
    res.json({
      success: true,
      serverNow: snap.serverNow,
      candleSecRemaining: snap.candleSecRemaining,
      markets: snap.markets
    });
  });

  app.post('/api/binary/bet', (req, res) => {
    const { userId, amount } = req.body || {};
    const numAmt = Number(amount) || 0;
    const binUser = findUserServer(userId);
    if (binUser && numAmt > 0 && getPlayableBalanceServer(binUser) < numAmt) {
      return res.status(403).json({
        success: false,
        message: 'Hold balance cannot be used for trading! Please wait for Admin release.'
      });
    }
    res.json({ success: true });
  });

  app.get('/api/market-pools', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const cutoff = Date.now() - 20 * 60 * 1000;
    const activePools: Record<string, any> = {};
    for (const [k, v] of Object.entries(store.marketPools || {})) {
      if (v && Number(v.updatedAt || 0) >= cutoff) {
        activePools[k] = v;
      }
    }
    store.marketPools = activePools;
    res.json({ success: true, pools: activePools });
  });

  app.post('/api/market-pools/bet', (req, res) => {
    const { poolId, game, mode, period, selection, amount, userId } = req.body || {};
    const cleanId = String(poolId || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
    const numAmt = Number(amount) || 0;
    if (!cleanId || !game || numAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid market pool bet payload' });
    }
    if (userId) {
      const poolUser = findUserServer(userId);
      if (poolUser && getPlayableBalanceServer(poolUser) < numAmt) {
        return res.status(403).json({
          success: false,
          message: 'Hold balance cannot be used for betting! Please wait for Admin release.'
        });
      }
    }
    if (!store.marketPools || typeof store.marketPools !== 'object') {
      store.marketPools = {};
    }
    const existing = store.marketPools[cleanId] || {
      poolId: cleanId,
      game: String(game),
      mode: String(mode || 'default'),
      period: String(period || ''),
      selections: {},
      totalAmount: 0,
      updatedAt: Date.now()
    };
    const selKey = String(selection || 'BET').slice(0, 48);
    existing.selections = {
      ...(existing.selections || {}),
      [selKey]: +(Number(existing.selections?.[selKey] || 0) + numAmt).toFixed(2)
    };
    existing.totalAmount = +(Number(existing.totalAmount || 0) + numAmt).toFixed(2);
    existing.updatedAt = Date.now();
    store.marketPools[cleanId] = existing;
    saveStore(store);
    res.json({ success: true, pool: existing });
  });

  // Top-level Express error safeguard so malformed payloads never crash the process
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!err) return next();
    console.error('Express API error:', err?.message || err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({ success: false, message: 'Internal server error' });
    }
  });

  // =================== VITE MIDDLEWARE / STATIC FILES ===================
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'));

  if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vitePromise = createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });
  }

  const expiryTimer = setInterval(sweepExpiredRequests, 30000);
  expiryTimer.unref?.();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Deshi Win Full-Stack Server active on http://0.0.0.0:${PORT}`);
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 35000;
  server.keepAliveTimeout = 65000;
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection caught cleanly:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('SIGINT', () => {
  flushStoreSync(store);
  process.exit(0);
});
process.on('SIGTERM', () => {
  flushStoreSync(store);
  process.exit(0);
});
process.on('beforeExit', () => {
  flushStoreSync(store);
});

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
});
