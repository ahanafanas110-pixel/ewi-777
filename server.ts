import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getSyncedAviatorState, getSyncedBinarySnapshot } from './src/utils/syncedMarkets';
import { BINARY_MARKETS } from './src/constants/markets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared Central JSON Store File
const DATA_FILE = path.join(__dirname, 'server-data.json');

// Server-only 2FA Secret Key (never exposed in client src/)
const ADMIN_2FA_SECRET = process.env.ADMIN_2FA_SECRET || 'EWI777-2FA-CORE-9941-SEC-X82';
const TWOFA_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_ADMIN_PHONE_HASH = '0aab39f411ae77619215a3cd679005519c52baa0758214ec51901ea355d006f1';
const DEFAULT_ADMIN_PASS_HASH = '07882c957ec3bb16b8f5ec021707910625689e5e011811ce855fb5aeeddc1874';

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
  return ip.replace(/^::ffff:/, '') || 'Unknown';
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
  marketPools: Record<string, any>;
  settings: any;
}

const DEFAULT_BANNERS = [
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

const DEFAULT_STORE: ServerStore = {
  deposits: [],
  withdraws: [],
  users: [],
  boundNumbers: [],
  passwordRequests: [],
  wingoBets: [],
  supportMessages: [],
  adminAccessLogs: [],
  marketPools: {},
  settings: {
    bkashNumber: '',
    nagadNumber: '',
    rocketNumber: '',
    usdtAddress: '',
    minWithdraw: 100,
    referCommissionPercent: 10,
    depositInstructions: 'Deposit service is currently NOW NOT AVAILABLE.',
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
    siteEnabled: true,
    depositEnabled: false,
    withdrawEnabled: true,
    giftCodeEnabled: true,
    registrationEnabled: true,
    maintenanceMode: false,
    timezoneOffsetMinutes: 360,
    gameControlModes: {
      k3: 'AUTO',
      d5: 'AUTO',
      mines: 'AUTO',
      binary: 'AUTO'
    },
    binaryNextCandleBias: 'AUTO',
    updatedAt: 0,
    marqueeText: 'Notice: Welcome to EWI 777 online entertainment. Instant referral commission, 24/7 fast withdrawals via Nagad & bKash. Live synchronized WinGo Lottery, EWI K3, EWI 5D, Aviator, Mines & Binary Trading!',
    popupTitle: 'Welcome to EWI 777',
    popupMessage: '',
    enableSystemPopup: false,
    banners: DEFAULT_BANNERS,
    bannersCustomized: false,
    activeGiftCodes: [],
    games: [],
    broadcasts: [],
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

function sanitizeBannerList(banners: any[]) {
  return banners.slice(0, 10).map((b: any) => ({
    ...b,
    url: String(b?.url || '').includes('image_06ccef65.png')
      ? '/assets/brand/welcome-200-banner.png'
      : String(b?.url || '')
  }));
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
      const migratedPhoneHash =
        savedSettings.adminPhoneHash ||
        (savedSettings.adminPhone
          ? sha256HexServer(normalizePhoneServer(String(savedSettings.adminPhone)))
          : DEFAULT_ADMIN_PHONE_HASH);
      const migratedPassHash =
        savedSettings.adminPasswordHash ||
        (savedSettings.adminPassword
          ? sha256HexServer(String(savedSettings.adminPassword))
          : DEFAULT_ADMIN_PASS_HASH);
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
        marketPools: parsed.marketPools && typeof parsed.marketPools === 'object' ? parsed.marketPools : {},
        settings: {
          ...DEFAULT_STORE.settings,
          ...cleanSaved,
          bkashNumber: sanitizeLegacyNumberIfNeeded(cleanSaved.bkashNumber),
          nagadNumber: sanitizeLegacyNumberIfNeeded(cleanSaved.nagadNumber),
          supportPhone: sanitizeLegacyNumberIfNeeded(cleanSaved.supportPhone),
          adminPhoneHash: migratedPhoneHash,
          adminPasswordHash: migratedPassHash,
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

function saveStore(store: ServerStore) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save server data:', err);
  }
}

let store = loadStore();

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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  // =================== GLOBAL API ROUTES ===================

  // 1. Deposits API (Shared across all phones/devices worldwide)
  app.get('/api/deposits', (req, res) => {
    res.json({ success: true, deposits: store.deposits });
  });

  app.post('/api/deposits', (req, res) => {
    if (store.settings.depositEnabled === false) {
      return res.status(403).json({ success: false, message: 'Deposit system is currently disabled by Administrator' });
    }
    const { userId, userPhone, method, channel, amount, senderNumber, trxId } = req.body;
    if (!amount || !senderNumber || !trxId) {
      return res.status(400).json({ success: false, message: 'Missing required deposit fields' });
    }

    const newDep = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: userId || 'guest',
      userPhone: senderNumber.trim(),
      method: method || 'bKash',
      channel: channel || 'App',
      amount: Number(amount),
      senderNumber: senderNumber.trim(),
      trxId: trxId.trim().toUpperCase(),
      status: 'pending',
      time: new Date().toLocaleString()
    };

    store.deposits = [newDep, ...store.deposits];
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

    dep.status = 'approved';

    // Credit user if user exists on server
    const user = store.users.find((u) => u.id === dep.userId || u.phone === dep.userPhone);
    if (user) {
      user.balance = +(Number(user.balance || 0) + dep.amount).toFixed(2);
      user.totalDeposited = +(Number(user.totalDeposited || 0) + dep.amount).toFixed(2);
    }

    saveStore(store);
    res.json({ success: true, deposit: dep });
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
    res.json({ success: true, users: store.users });
  });

  app.post('/api/auth/register', (req, res) => {
    if (store.settings.registrationEnabled === false) {
      return res.status(403).json({ success: false, message: 'New user registration is currently disabled by Administrator' });
    }
    const { user: clientUser } = req.body;
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

    const sanitized = {
      ...clientUser,
      phone: normPhone || clientUser.phone,
      email: normEmail || clientUser.email,
      balance: 0,
      safeBalance: 0,
      totalDeposited: 0,
      turnoverRequired: 0,
      turnoverCompleted: 0,
    };
    store.users.push(sanitized);
    saveStore(store);
    res.json({ success: true, user: sanitized });
  });

  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;
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
        message: `Account is Banned: ${existing.banReason || 'Terms Violation'}. Contact Customer Support.`
      });
    }

    if (existing.loginPassword && existing.loginPassword !== password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect login password! Please try again.'
      });
    }

    res.json({ success: true, user: existing });
  });

  app.post('/api/users/sync', (req, res) => {
    const clientUser = req.body.user;
    if (clientUser && (clientUser.phone || clientUser.email || clientUser.id)) {
      const normPhone = normalizePhoneServer(clientUser.phone || '');
      const idx = store.users.findIndex(
        (u) =>
          u.id === clientUser.id ||
          (normPhone && normalizePhoneServer(u.phone || '') === normPhone)
      );
      if (idx >= 0) {
        const preservedAvatar = clientUser.avatar || store.users[idx].avatar || '';
        store.users[idx] = { ...store.users[idx], ...clientUser, avatar: preservedAvatar };
      } else {
        store.users.push(clientUser);
      }
      saveStore(store);
    }
    res.json({ success: true });
  });

  app.post('/api/users/modify-balance', (req, res) => {
    const { userId, action, amount, userPhone, fallbackUser } = req.body || {};
    const normPhone = normalizePhoneServer(String(userPhone || fallbackUser?.phone || ''));
    let idx = store.users.findIndex(
      (u) => u.id === userId || (normPhone && normalizePhoneServer(u.phone || '') === normPhone)
    );
    if (idx < 0 && fallbackUser && (fallbackUser.id || fallbackUser.phone || fallbackUser.email)) {
      store.users.push({ ...fallbackUser });
      idx = store.users.length - 1;
    }
    if (idx < 0) return res.status(404).json({ success: false, message: 'User not found' });
    const numAmt = Number(amount) || 0;
    const curBal = Number(store.users[idx].balance || 0);
    let nextBal = curBal;
    if (action === 'add') nextBal = +(curBal + numAmt).toFixed(2);
    else if (action === 'deduct') nextBal = +Math.max(0, curBal - numAmt).toFixed(2);
    else if (action === 'set') nextBal = +Math.max(0, numAmt).toFixed(2);
    store.users[idx].balance = nextBal;
    saveStore(store);
    res.json({ success: true, user: store.users[idx] });
  });

  app.post('/api/users/update', (req, res) => {
    const { userId, patch, deleteUser, userPhone, fallbackUser } = req.body || {};
    if (deleteUser) {
      store.users = store.users.filter((u) => u.id !== userId);
      saveStore(store);
      return res.json({ success: true, deleted: true });
    }
    const normPhone = normalizePhoneServer(String(userPhone || fallbackUser?.phone || ''));
    let idx = store.users.findIndex(
      (u) => u.id === userId || (normPhone && normalizePhoneServer(u.phone || '') === normPhone)
    );
    if (idx < 0 && fallbackUser && (fallbackUser.id || fallbackUser.phone || fallbackUser.email)) {
      store.users.push({ ...fallbackUser });
      idx = store.users.length - 1;
    }
    if (idx >= 0 && patch) {
      store.users[idx] = { ...store.users[idx], ...patch };
      saveStore(store);
    }
    res.json({ success: true, user: idx >= 0 ? store.users[idx] : null });
  });

  // 2B. Withdraws API
  app.get('/api/withdraws', (req, res) => {
    res.json({ success: true, withdraws: store.withdraws });
  });

  app.post('/api/withdraws', (req, res) => {
    if (store.settings.withdrawEnabled === false) {
      return res.status(403).json({ success: false, message: 'Withdraw system is currently disabled by Administrator' });
    }
    const { userId, userName, userPhone, amount, method, number } = req.body;
    if (!amount || !number) {
      return res.status(400).json({ success: false, message: 'Missing withdraw fields' });
    }
    const newWd = {
      id: `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: userId || 'guest',
      userName: userName || userPhone || 'User',
      userPhone: userPhone || '',
      amount: Number(amount),
      method: method || 'bKash',
      number: String(number).trim(),
      status: 'pending',
      time: new Date().toLocaleString()
    };
    store.withdraws = [newWd, ...store.withdraws];
    const uIdx = store.users.findIndex((u) => u.id === userId);
    if (uIdx >= 0) {
      store.users[uIdx].balance = +Math.max(0, Number(store.users[uIdx].balance || 0) - Number(amount)).toFixed(2);
    }
    saveStore(store);
    res.json({ success: true, withdraw: newWd });
  });

  app.post('/api/withdraws/update', (req, res) => {
    const { id, status } = req.body;
    const wd = store.withdraws.find((w) => w.id === id);
    if (!wd) return res.status(404).json({ success: false, message: 'Withdraw request not found' });
    const prevStatus = wd.status;
    wd.status = status;

    const uIdx = store.users.findIndex((u) => u.id === wd.userId);
    if (uIdx >= 0) {
      if (status === 'completed' && prevStatus !== 'completed') {
        store.users[uIdx].totalWithdrawn = +(Number(store.users[uIdx].totalWithdrawn || 0) + wd.amount).toFixed(2);
      } else if (status === 'rejected' && prevStatus !== 'rejected') {
        store.users[uIdx].balance = +(Number(store.users[uIdx].balance || 0) + wd.amount).toFixed(2);
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

    const cleanPhone = phone.trim();
    // Look up user's registered password
    const matchedUser = store.users.find(
      (u) => (u.phone && u.phone.includes(cleanPhone)) || u.id === cleanPhone
    );

    const newReq = {
      id: `pw_${Date.now()}`,
      phone: cleanPhone,
      note: note || 'User requested password recovery via Customer Service',
      matchedPassword: matchedUser ? matchedUser.loginPassword : null,
      status: 'pending',
      time: new Date().toLocaleString()
    };

    store.passwordRequests = [newReq, ...store.passwordRequests];
    saveStore(store);

    console.log(`[PASSWORD RECOVERY REQUEST] Phone: ${cleanPhone}`);
    res.json({
      success: true,
      message: 'Support ticket submitted successfully. Customer Service is processing your password recovery.',
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

    const nextSettings = {
      ...store.settings,
      ...incoming,
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
      totalAmount: Number(b.totalAmount) || 0,
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
      (u) => u.id === userId || (phone && normalizePhoneServer(u.phone || '') === normalizePhoneServer(phone))
    );

    const targetUidRaw = String(codeItem.targetUid || '').trim().toUpperCase();
    if (targetUidRaw && targetUidRaw !== 'ALL') {
      const allowedUids = targetUidRaw
        .split(/[\s,;]+/)
        .map((s: string) => s.trim().toUpperCase())
        .filter(Boolean);
      const claimerUid = String(userUid || (uIdx >= 0 ? store.users[uIdx].uid : '') || '').trim().toUpperCase();
      if (!claimerUid || !allowedUids.includes(claimerUid)) {
        return res.status(403).json({
          success: false,
          message: 'This gift code is reserved for a specific UID and is not valid for your account.'
        });
      }
    }

    const minRequired = Number(codeItem.minRequiredBalance || 0);
    if (minRequired > 0 && uIdx >= 0 && Number(store.users[uIdx].balance || 0) < minRequired) {
      return res.status(400).json({ success: false, message: `Minimum ৳${minRequired} balance required to claim this code!` });
    }

    const claimerKey = normalizePhoneServer(phone || '') || String(userId || '').trim();
    const claimedBy: string[] = Array.isArray(codeItem.claimedBy) ? codeItem.claimedBy : [];
    if (claimerKey && claimedBy.includes(claimerKey)) {
      return res.status(400).json({ success: false, message: 'You have already claimed this gift code!' });
    }

    const bonusAmount = Number(codeItem.amount) || 0;
    const turnoverAmount =
      codeItem.turnoverAmount !== undefined && codeItem.turnoverAmount !== null
        ? Number(codeItem.turnoverAmount)
        : bonusAmount;

    const existingRecords = Array.isArray(codeItem.claimRecords) ? codeItem.claimRecords : [];
    const claimRecord = {
      userId: String(userId || 'guest'),
      nickname: nickname || (uIdx >= 0 ? store.users[uIdx].nickname : '') || String(phone || 'User'),
      contact: String(phone || ''),
      amount: bonusAmount,
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
    }

    saveStore(store);
    res.json({
      success: true,
      amount: bonusAmount,
      turnoverAmount,
      settings: store.settings
    });
  });

  // 5C. Admin Two-Step Authentication & Visitor IP Access Logger
  app.get('/api/admin/access-logs', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      detectedIp: extractClientIp(req),
      logs: (store.adminAccessLogs || []).slice(0, 200)
    });
  });

  app.post('/api/admin/access-logs', (req, res) => {
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
    const entry = recordServerAccessLog(req, validAction, req.body?.phoneAttempt, sessionId);
    res.json({
      success: true,
      detectedIp: entry.ip,
      entry,
      logs: (store.adminAccessLogs || []).slice(0, 200)
    });
  });

  app.post('/api/admin/login', (req, res) => {
    const { phone, password, route } = req.body || {};
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
      return res.status(401).json({ success: false, message: 'Invalid Admin Phone or Password!' });
    }
    recordServerAccessLog(req, 'login_step1', inputPhone);
    res.json({ success: true, requires2FA: true });
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
    const { userId, userUid, userNickname, userPhone, sender, text, imageUrl } = req.body || {};
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
                for (let p = 2; p <= 5 && list.length < 50; p++) {
                  const pUrl = `https://draw.ar-lottery01.com/WinGo/${segment}/GetHistoryIssuePage.json?pageNo=${p}&pageSize=50&ts=${Date.now()}`;
                  const pRes = await fetch(pUrl, {
                    headers: {
                      Accept: 'application/json, text/plain, */*',
                      'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                      Referer: 'https://draw.ar-lottery01.com/'
                    }
                  });
                  if (!pRes.ok) break;
                  const pText = await pRes.text();
                  if (!pText.trim().startsWith('{')) break;
                  const pJson = JSON.parse(pText);
                  const extra = pJson?.data?.list || pJson?.list || [];
                  if (!Array.isArray(extra) || extra.length === 0) break;
                  for (const item of extra) {
                    const key = String(item?.issueNumber || item?.issue || '');
                    if (key && !seen.has(key)) {
                      seen.add(key);
                      list.push(item);
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

  // 7. Shared Authoritative Aviator Plane Engine (Identical UTC state across Express server & Vercel static)
  app.get('/api/aviator/state', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      state: getSyncedAviatorState(Date.now())
    });
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
    const { poolId, game, mode, period, selection, amount } = req.body || {};
    const cleanId = String(poolId || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
    const numAmt = Number(amount) || 0;
    if (!cleanId || !game || numAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid market pool bet payload' });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EWI 777 Full-Stack Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
});
