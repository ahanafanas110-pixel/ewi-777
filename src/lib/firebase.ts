import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  AdminAccessLog,
  AdminSettings,
  CrashPoolState,
  DepositRequest,
  MarketPoolEntry,
  ReferralMember,
  SupportMessage,
  Transaction,
  User,
  WinGoBet,
  WithdrawRequest,
  AppNotification,
  LudoRoom,
  LudoRoomMessage,
  LudoVoicePeer,
  LudoVoiceSignal,
  SportsBet
} from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function logFirestoreNonFatal(error: unknown, operationType: OperationType, path: string | null) {
  try {
    handleFirestoreError(error, operationType, path);
  } catch {
    // Error structured & logged cleanly without crashing client render loop
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

function sanitizeFirestoreId(rawId: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

// ================= BOUND WALLETS =================
export interface BoundWalletRecord {
  number: string;
  type: 'bKash' | 'Nagad';
  userId: string;
  userPhone?: string;
  createdAt: string;
}

export async function checkBoundWalletInFirebase(cleanNum: string): Promise<BoundWalletRecord | null> {
  const path = `boundWallets/${cleanNum}`;
  try {
    const snap = await getDoc(doc(db, 'boundWallets', cleanNum));
    if (snap.exists()) {
      return snap.data() as BoundWalletRecord;
    }
    return null;
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.GET, path);
    return null;
  }
}

export async function saveBoundWalletInFirebase(record: BoundWalletRecord): Promise<void> {
  const path = `boundWallets/${record.number}`;
  try {
    await setDoc(doc(db, 'boundWallets', record.number), {
      number: record.number,
      type: record.type,
      userId: record.userId,
      ...(record.userPhone ? { userPhone: record.userPhone } : {}),
      createdAt: record.createdAt
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ================= APP SETTINGS (Admin Controlled) =================
export function subscribeAppSettingsInFirebase(
  onUpdate: (settings: Partial<AdminSettings>) => void
): Unsubscribe {
  const path = 'appConfig/settings';
  return onSnapshot(
    doc(db, 'appConfig', 'settings'),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as Partial<AdminSettings>);
      }
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.GET, path);
    }
  );
}

export async function saveAppSettingsToFirebase(settings: AdminSettings): Promise<boolean> {
  const path = 'appConfig/settings';
  try {
    const safeBanners = Array.isArray(settings.banners)
      ? settings.banners.slice(0, 10).map((b) => ({
          ...b,
          url: String(b.url || '').includes('image_06ccef65.png')
            ? '/assets/brand/welcome-200-banner.png'
            : String(b.url || '').slice(0, 320000)
        }))
      : [];
    const { adminPhone: _omitPhone, adminPassword: _omitPass, ...publicSafeSettings } = settings;
    const payload = stripUndefinedDeep({
      ...publicSafeSettings,
      appName: String(settings.appName || 'EWI 777').slice(0, 120),
      appLogoUrl: String(settings.appLogoUrl || '').slice(0, 320000),
      marqueeText: String(settings.marqueeText || '').slice(0, 2000),
      popupTitle: String(settings.popupTitle || '').slice(0, 200),
      popupMessage: String(settings.popupMessage || '').slice(0, 4000),
      popupImageUrl: String(settings.popupImageUrl || '').slice(0, 320000),
      banners: safeBanners,
      updatedAt: Date.now()
    });
    await setDoc(doc(db, 'appConfig', 'settings'), payload, { merge: true });
    return true;
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
    return false;
  }
}

export async function getAppSettingsFromFirebase(): Promise<Partial<AdminSettings> | null> {
  const path = 'appConfig/settings';
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'settings'));
    return snap.exists() ? (snap.data() as Partial<AdminSettings>) : null;
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.GET, path);
    return null;
  }
}

// ================= USERS =================
export function subscribeUsersInFirebase(onUpdate: (users: User[]) => void): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list: User[] = [];
      snap.forEach((d) => {
        const data = d.data() as User;
        if (data && data.id) {
          list.push({
            ...data,
            balance: Math.max(0, Number(data.balance) || 0)
          });
        }
      });
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveUserToFirebase(user: User): Promise<void> {
  if (!user?.id) return;
  const id = sanitizeFirestoreId(user.id);
  const path = `users/${id}`;
  try {
    const payload = stripUndefinedDeep({
      ...user,
      id,
      balance: Math.max(0, Number(user.balance) || 0),
      avatar: String(user.avatar || '').slice(0, 320000),
      nickname: String(user.nickname || 'Player').slice(0, 80)
    });
    await setDoc(doc(db, 'users', id), payload, { merge: true });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

export async function updateUserInFirebase(
  userId: string,
  patch: Partial<User>,
  fallbackUser?: User
): Promise<void> {
  if (!userId) return;
  const id = sanitizeFirestoreId(userId);
  const path = `users/${id}`;
  try {
    const cleanPatch = stripUndefinedDeep({
      ...patch,
      ...(patch.balance !== undefined ? { balance: Math.max(0, Number(patch.balance) || 0) } : {}),
      ...(patch.avatar !== undefined ? { avatar: String(patch.avatar || '').slice(0, 320000) } : {}),
      ...(patch.nickname !== undefined ? { nickname: String(patch.nickname || 'Player').slice(0, 80) } : {})
    });
    if (fallbackUser) {
      const merged = stripUndefinedDeep({
        ...fallbackUser,
        ...cleanPatch,
        id,
        balance: Math.max(0, Number(cleanPatch.balance ?? fallbackUser.balance ?? 0) || 0)
      });
      await setDoc(doc(db, 'users', id), merged, { merge: true });
    } else {
      try {
        await updateDoc(doc(db, 'users', id), cleanPatch);
      } catch {
        await setDoc(doc(db, 'users', id), { id, balance: 0, ...cleanPatch }, { merge: true });
      }
    }
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserFromFirebase(userId: string): Promise<void> {
  if (!userId) return;
  const id = sanitizeFirestoreId(userId);
  const path = `users/${id}`;
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.DELETE, path);
  }
}

export async function fetchAllUsersFromFirebase(): Promise<User[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    const list: User[] = [];
    snap.forEach((d) => {
      const data = d.data() as User;
      if (data && data.id) list.push(data);
    });
    return list;
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.LIST, path);
    return [];
  }
}

// ================= DEPOSITS =================
export function subscribeDepositsInFirebase(onUpdate: (deposits: DepositRequest[]) => void): Unsubscribe {
  const path = 'deposits';
  return onSnapshot(
    collection(db, 'deposits'),
    (snap) => {
      const list: DepositRequest[] = [];
      snap.forEach((d) => {
        const data = d.data() as DepositRequest;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => (b.id > a.id ? 1 : -1));
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveDepositToFirebase(dep: DepositRequest): Promise<void> {
  if (!dep?.id) return;
  const id = sanitizeFirestoreId(dep.id);
  const path = `deposits/${id}`;
  try {
    const payload = stripUndefinedDeep({
      ...dep,
      id,
      amount: Math.max(1, Number(dep.amount) || 1)
    });
    await setDoc(doc(db, 'deposits', id), payload, { merge: true });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

export async function updateDepositInFirebase(
  depositId: string,
  patch: Partial<DepositRequest>,
  fallbackDep?: DepositRequest
): Promise<void> {
  if (!depositId) return;
  const id = sanitizeFirestoreId(depositId);
  const path = `deposits/${id}`;
  try {
    if (fallbackDep) {
      await setDoc(
        doc(db, 'deposits', id),
        stripUndefinedDeep({ ...fallbackDep, ...patch, id }),
        { merge: true }
      );
    } else {
      await updateDoc(doc(db, 'deposits', id), stripUndefinedDeep(patch));
    }
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.UPDATE, path);
  }
}

// ================= WITHDRAWS =================
export function subscribeWithdrawsInFirebase(onUpdate: (withdraws: WithdrawRequest[]) => void): Unsubscribe {
  const path = 'withdraws';
  return onSnapshot(
    collection(db, 'withdraws'),
    (snap) => {
      const list: WithdrawRequest[] = [];
      snap.forEach((d) => {
        const data = d.data() as WithdrawRequest;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => (b.id > a.id ? 1 : -1));
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveWithdrawToFirebase(wd: WithdrawRequest): Promise<void> {
  if (!wd?.id) return;
  const id = sanitizeFirestoreId(wd.id);
  const path = `withdraws/${id}`;
  try {
    const payload = stripUndefinedDeep({
      ...wd,
      id,
      amount: Math.max(1, Number(wd.amount) || 1)
    });
    await setDoc(doc(db, 'withdraws', id), payload, { merge: true });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

export async function updateWithdrawInFirebase(
  withdrawId: string,
  patch: Partial<WithdrawRequest>,
  fallbackWd?: WithdrawRequest
): Promise<void> {
  if (!withdrawId) return;
  const id = sanitizeFirestoreId(withdrawId);
  const path = `withdraws/${id}`;
  try {
    if (fallbackWd) {
      await setDoc(
        doc(db, 'withdraws', id),
        stripUndefinedDeep({ ...fallbackWd, ...patch, id }),
        { merge: true }
      );
    } else {
      await updateDoc(doc(db, 'withdraws', id), stripUndefinedDeep(patch));
    }
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.UPDATE, path);
  }
}

// ================= SUPPORT MESSAGES =================
export function subscribeSupportMessagesInFirebase(
  onUpdate: (messages: SupportMessage[]) => void
): Unsubscribe {
  const path = 'supportMessages';
  const q = query(collection(db, 'supportMessages'), orderBy('timestamp', 'asc'), limit(400));
  return onSnapshot(
    q,
    (snap) => {
      const list: SupportMessage[] = [];
      snap.forEach((d) => {
        const data = d.data() as SupportMessage;
        if (data && data.id) list.push(data);
      });
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveSupportMessageToFirebase(msg: SupportMessage): Promise<void> {
  if (!msg?.id) return;
  const id = sanitizeFirestoreId(msg.id);
  const path = `supportMessages/${id}`;
  try {
    const payload = stripUndefinedDeep({
      ...msg,
      id,
      text: String(msg.text || '').slice(0, 4000),
      ...(msg.imageUrl ? { imageUrl: String(msg.imageUrl).slice(0, 320000) } : {})
    });
    await setDoc(doc(db, 'supportMessages', id), payload);
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.CREATE, path);
  }
}

// ================= PASSWORD RECOVERY TICKETS =================
export interface PasswordRecoveryTicket {
  id: string;
  phone: string;
  userId?: string;
  note?: string;
  matchedPassword?: string;
  status: 'pending' | 'resolved';
  tempPassword?: string;
  time: string;
}

export function subscribePasswordRequestsInFirebase(
  onUpdate: (tickets: PasswordRecoveryTicket[]) => void
): Unsubscribe {
  const path = 'passwordRequests';
  return onSnapshot(
    collection(db, 'passwordRequests'),
    (snap) => {
      const list: PasswordRecoveryTicket[] = [];
      snap.forEach((d) => {
        const data = d.data() as PasswordRecoveryTicket;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => (b.id > a.id ? 1 : -1));
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function savePasswordRequestToFirebase(ticket: PasswordRecoveryTicket): Promise<void> {
  if (!ticket?.id) return;
  const id = sanitizeFirestoreId(ticket.id);
  const path = `passwordRequests/${id}`;
  try {
    await setDoc(doc(db, 'passwordRequests', id), stripUndefinedDeep({ ...ticket, id }), { merge: true });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

// ================= WINGO BETS POOL =================
export function subscribeWingoBetsInFirebase(onUpdate: (bets: WinGoBet[]) => void): Unsubscribe {
  const path = 'wingoBets';
  const q = query(collection(db, 'wingoBets'), limit(250));
  return onSnapshot(
    q,
    (snap) => {
      const list: WinGoBet[] = [];
      snap.forEach((d) => {
        const data = d.data() as WinGoBet;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => (b.id > a.id ? 1 : -1));
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveWingoBetToFirebase(bet: WinGoBet): Promise<void> {
  if (!bet?.id) return;
  const id = sanitizeFirestoreId(bet.id);
  const path = `wingoBets/${id}`;
  try {
    await setDoc(doc(db, 'wingoBets', id), stripUndefinedDeep({ ...bet, id }), { merge: true });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

// ================= TRANSACTIONS & NOTIFICATIONS =================
export function subscribeTransactionsInFirebase(onUpdate: (txs: Transaction[]) => void): Unsubscribe {
  const path = 'transactions';
  const q = query(collection(db, 'transactions'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const list: Transaction[] = [];
      snap.forEach((d) => {
        const data = d.data() as Transaction;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => (b.id > a.id ? 1 : -1));
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveTransactionToFirebase(tx: Transaction): Promise<void> {
  if (!tx?.id) return;
  const id = sanitizeFirestoreId(tx.id);
  const path = `transactions/${id}`;
  try {
    await setDoc(doc(db, 'transactions', id), stripUndefinedDeep({ ...tx, id }));
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.CREATE, path);
  }
}

export function subscribeNotificationsInFirebase(onUpdate: (notifs: AppNotification[]) => void): Unsubscribe {
  const path = 'notifications';
  const q = query(collection(db, 'notifications'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const list: AppNotification[] = [];
      snap.forEach((d) => {
        const data = d.data() as AppNotification;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => (b.id > a.id ? 1 : -1));
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveNotificationToFirebase(notif: AppNotification): Promise<void> {
  if (!notif?.id) return;
  const id = sanitizeFirestoreId(notif.id);
  const path = `notifications/${id}`;
  try {
    await setDoc(
      doc(db, 'notifications', id),
      stripUndefinedDeep({
        ...notif,
        id,
        title: String(notif.title || '').slice(0, 300),
        message: String(notif.message || '').slice(0, 3000)
      }),
      { merge: true }
    );
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

// ================= ADMIN ACCESS & IP LOGS =================
export function subscribeAdminAccessLogsInFirebase(
  onUpdate: (logs: AdminAccessLog[]) => void
): Unsubscribe {
  const path = 'adminAccessLogs';
  const q = query(collection(db, 'adminAccessLogs'), orderBy('enteredAtMs', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const list: AdminAccessLog[] = [];
      snap.forEach((d) => {
        const data = d.data() as AdminAccessLog;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => (Number(b.enteredAtMs) || 0) - (Number(a.enteredAtMs) || 0));
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveAdminAccessLogToFirebase(entry: AdminAccessLog): Promise<void> {
  if (!entry?.id) return;
  const id = sanitizeFirestoreId(entry.id);
  const path = `adminAccessLogs/${id}`;
  try {
    await setDoc(
      doc(db, 'adminAccessLogs', id),
      stripUndefinedDeep({
        id,
        ...(entry.sessionId ? { sessionId: String(entry.sessionId).slice(0, 80) } : {}),
        ip: String(entry.ip || 'Unknown').slice(0, 80),
        enteredAt: String(entry.enteredAt || new Date().toLocaleString('en-GB')).slice(0, 80),
        enteredAtMs: Number(entry.enteredAtMs) || Date.now(),
        ...(entry.lastSeenAtMs !== undefined ? { lastSeenAtMs: Number(entry.lastSeenAtMs) || Date.now() } : {}),
        ...(entry.staySeconds !== undefined ? { staySeconds: Math.max(0, Math.round(Number(entry.staySeconds) || 0)) } : {}),
        action: entry.action || 'visit',
        ...(entry.phoneAttempt ? { phoneAttempt: String(entry.phoneAttempt).slice(0, 64) } : {}),
        ...(entry.userAgent ? { userAgent: String(entry.userAgent).slice(0, 240) } : {}),
        route: String(entry.route || '/admin-ewi777-panel-009').slice(0, 120)
      }),
      { merge: true }
    );
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

// ================= CROSS-DEVICE MARKET BET POOLS =================
export function subscribeMarketPoolsInFirebase(
  onUpdate: (pools: Record<string, MarketPoolEntry>) => void
): Unsubscribe {
  const path = 'marketPools';
  const q = query(collection(db, 'marketPools'), orderBy('updatedAt', 'desc'), limit(60));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, MarketPoolEntry> = {};
      snap.forEach((d) => {
        const data = d.data() as MarketPoolEntry;
        if (data && data.poolId) map[data.poolId] = data;
      });
      onUpdate(map);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveMarketPoolInFirebase(pool: MarketPoolEntry): Promise<void> {
  if (!pool?.poolId) return;
  const id = sanitizeFirestoreId(pool.poolId);
  const path = `marketPools/${id}`;
  try {
    await setDoc(
      doc(db, 'marketPools', id),
      stripUndefinedDeep({ ...pool, poolId: id }),
      { merge: true }
    );
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

// ================= REFERRALS (Cross-Device Team Sync) =================
export function subscribeReferralsInFirebase(
  onUpdate: (referrals: ReferralMember[]) => void
): Unsubscribe {
  const path = 'referrals';
  const q = query(collection(db, 'referrals'), limit(400));
  return onSnapshot(
    q,
    (snap) => {
      const list: ReferralMember[] = [];
      snap.forEach((d) => {
        const data = d.data() as ReferralMember;
        if (data && data.id) list.push(data);
      });
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveReferralToFirebase(refMember: ReferralMember): Promise<void> {
  if (!refMember?.id) return;
  const id = sanitizeFirestoreId(refMember.id);
  const path = `referrals/${id}`;
  try {
    await setDoc(
      doc(db, 'referrals', id),
      stripUndefinedDeep({ ...refMember, id }),
      { merge: true }
    );
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

// ================= SHARED CRASH POOL STATE (AVIATOR & LUCKY JET) =================
export function subscribeCrashStateInFirebase(
  game: 'aviator' | 'luckyjet',
  onUpdate: (state: CrashPoolState) => void
): Unsubscribe {
  const path = `crashState/${game}`;
  return onSnapshot(
    doc(db, 'crashState', game),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as CrashPoolState);
      }
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.GET, path);
    }
  );
}

export async function saveCrashStateToFirebase(state: CrashPoolState): Promise<void> {
  if (!state?.game) return;
  if (state.game !== 'aviator' && state.game !== 'luckyjet') return;
  const gameId = state.game;
  const path = `crashState/${gameId}`;
  try {
    await setDoc(
      doc(db, 'crashState', gameId),
      stripUndefinedDeep({
        ...state,
        game: gameId,
        bets: Array.isArray(state.bets) ? state.bets.slice(0, 60) : []
      }),
      { merge: true }
    );
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

// ================= REAL-TIME PRIVATE LUDO ROOMS =================
export function subscribeLudoRoomsInFirebase(onUpdate: (rooms: LudoRoom[]) => void): Unsubscribe {
  const path = 'ludoRooms';
  const q = query(collection(db, 'ludoRooms'), orderBy('updatedAt', 'desc'), limit(60));
  return onSnapshot(
    q,
    (snap) => {
      const list: LudoRoom[] = [];
      snap.forEach((d) => {
        const data = d.data() as LudoRoom;
        if (data && data.id) list.push(data);
      });
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export function subscribeLudoRoomByIdInFirebase(
  roomId: string,
  onUpdate: (room: LudoRoom | null) => void
): Unsubscribe {
  const cleanId = sanitizeFirestoreId(roomId);
  const path = `ludoRooms/${cleanId}`;
  return onSnapshot(
    doc(db, 'ludoRooms', cleanId),
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as LudoRoom) : null);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.GET, path);
    }
  );
}

export async function saveLudoRoomToFirebase(room: LudoRoom): Promise<void> {
  if (!room?.id) return;
  const id = sanitizeFirestoreId(room.id);
  const path = `ludoRooms/${id}`;
  try {
    await setDoc(doc(db, 'ludoRooms', id), stripUndefinedDeep({ ...room, id }), { merge: true });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

export async function getLudoRoomByIdFromFirebase(roomId: string): Promise<LudoRoom | null> {
  const id = sanitizeFirestoreId(roomId);
  if (!id) return null;
  const path = `ludoRooms/${id}`;
  try {
    const snap = await getDoc(doc(db, 'ludoRooms', id));
    if (!snap.exists()) return null;
    const data = snap.data() as LudoRoom;
    return data && data.id ? data : null;
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.GET, path);
    return null;
  }
}

export async function getLudoRoomsFromFirebase(): Promise<LudoRoom[]> {
  const path = 'ludoRooms';
  try {
    const q = query(collection(db, 'ludoRooms'), orderBy('updatedAt', 'desc'), limit(80));
    const snap = await getDocs(q);
    const list: LudoRoom[] = [];
    snap.forEach((d) => {
      const data = d.data() as LudoRoom;
      if (data && data.id) list.push(data);
    });
    return list;
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.LIST, path);
    return [];
  }
}

export async function findLudoRoomByCodeInFirebase(code: string): Promise<LudoRoom | null> {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return null;
  const rooms = await getLudoRoomsFromFirebase();
  const matches = rooms.filter((r) => String(r.code || '').trim().toUpperCase() === cleanCode);
  if (matches.length === 0) return null;
  const rank = (s?: string) => (s === 'waiting' ? 0 : s === 'playing' ? 1 : s === 'finished' ? 2 : 3);
  matches.sort((a, b) => {
    const dr = rank(a.status) - rank(b.status);
    if (dr !== 0) return dr;
    return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
  });
  return matches[0];
}

export function subscribeLudoRoomMessagesInFirebase(
  roomId: string,
  onUpdate: (messages: LudoRoomMessage[]) => void
): Unsubscribe {
  const id = sanitizeFirestoreId(roomId);
  if (!id) return () => {};
  const path = `ludoRooms/${id}/messages`;
  const q = query(collection(db, 'ludoRooms', id, 'messages'), orderBy('createdAtMs', 'asc'), limit(80));
  return onSnapshot(
    q,
    (snap) => {
      const list: LudoRoomMessage[] = [];
      snap.forEach((d) => {
        const data = d.data() as LudoRoomMessage;
        if (data && data.id) list.push(data);
      });
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function sendLudoRoomMessageToFirebase(
  roomId: string,
  message: LudoRoomMessage
): Promise<void> {
  const rId = sanitizeFirestoreId(roomId);
  const mId = sanitizeFirestoreId(message.id);
  if (!rId || !mId) return;
  const path = `ludoRooms/${rId}/messages/${mId}`;
  const cleanPayload: Record<string, unknown> = {
    id: mId,
    roomId: rId,
    senderId: String(message.senderId || '').slice(0, 128),
    senderName: String(message.senderName || 'Player').slice(0, 80),
    type: message.type,
    createdAtMs: Number(message.createdAtMs || Date.now())
  };
  if (message.senderColor) cleanPayload.senderColor = message.senderColor;
  if (typeof message.text === 'string' && message.text.length > 0) {
    cleanPayload.text = message.text.slice(0, 400);
  }
  if (typeof message.audioData === 'string' && message.audioData.length > 0) {
    cleanPayload.audioData = message.audioData.slice(0, 140000);
  }
  if (typeof message.audioDurationSec === 'number') {
    cleanPayload.audioDurationSec = Math.max(0, Math.min(15, Number(message.audioDurationSec)));
  }
  try {
    await setDoc(doc(db, 'ludoRooms', rId, 'messages', mId), cleanPayload);
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.CREATE, path);
  }
}

export function subscribeLudoVoicePeersInFirebase(
  roomId: string,
  onUpdate: (peers: LudoVoicePeer[]) => void
): Unsubscribe {
  const id = sanitizeFirestoreId(roomId);
  if (!id) return () => {};
  const path = `ludoRooms/${id}/voicePeers`;
  const q = query(collection(db, 'ludoRooms', id, 'voicePeers'), limit(12));
  return onSnapshot(
    q,
    (snap) => {
      const list: LudoVoicePeer[] = [];
      snap.forEach((d) => {
        const data = d.data() as LudoVoicePeer;
        if (data && data.id) list.push(data);
      });
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveLudoVoicePeerToFirebase(
  roomId: string,
  peer: LudoVoicePeer
): Promise<void> {
  const rId = sanitizeFirestoreId(roomId);
  const pId = sanitizeFirestoreId(peer.id || peer.userId);
  if (!rId || !pId) return;
  const path = `ludoRooms/${rId}/voicePeers/${pId}`;
  const cleanPayload: Record<string, unknown> = {
    id: pId,
    roomId: rId,
    userId: String(peer.userId || pId).slice(0, 128),
    name: String(peer.name || 'Player').slice(0, 80),
    micActive: Boolean(peer.micActive),
    updatedAt: Number(peer.updatedAt || Date.now())
  };
  if (peer.color) cleanPayload.color = peer.color;
  try {
    await setDoc(doc(db, 'ludoRooms', rId, 'voicePeers', pId), cleanPayload, { merge: true });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}

export function subscribeLudoVoiceSignalsInFirebase(
  roomId: string,
  onSignals: (signals: LudoVoiceSignal[]) => void
): Unsubscribe {
  const id = sanitizeFirestoreId(roomId);
  if (!id) return () => {};
  const path = `ludoRooms/${id}/voiceSignals`;
  const q = query(collection(db, 'ludoRooms', id, 'voiceSignals'), orderBy('createdAtMs', 'asc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const list: LudoVoiceSignal[] = [];
      snap.forEach((d) => {
        const data = d.data() as LudoVoiceSignal;
        if (data && data.id) list.push(data);
      });
      onSignals(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function sendLudoVoiceSignalToFirebase(
  roomId: string,
  signal: LudoVoiceSignal
): Promise<void> {
  const rId = sanitizeFirestoreId(roomId);
  const sId = sanitizeFirestoreId(signal.id);
  if (!rId || !sId) return;
  const path = `ludoRooms/${rId}/voiceSignals/${sId}`;
  try {
    await setDoc(doc(db, 'ludoRooms', rId, 'voiceSignals', sId), {
      id: sId,
      roomId: rId,
      fromUserId: String(signal.fromUserId).slice(0, 128),
      toUserId: String(signal.toUserId).slice(0, 128),
      kind: signal.kind,
      payload: String(signal.payload).slice(0, 16000),
      createdAtMs: Number(signal.createdAtMs || Date.now())
    });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.CREATE, path);
  }
}

export function subscribeSportsBetsInFirebase(
  onUpdate: (bets: SportsBet[]) => void
): Unsubscribe {
  const path = 'sportsBets';
  const q = query(collection(db, 'sportsBets'), orderBy('createdAtMs', 'desc'), limit(250));
  return onSnapshot(
    q,
    (snap) => {
      const list: SportsBet[] = [];
      snap.forEach((d) => {
        const data = d.data() as SportsBet;
        if (data && data.id) list.push(data);
      });
      onUpdate(list);
    },
    (error) => {
      logFirestoreNonFatal(error, OperationType.LIST, path);
    }
  );
}

export async function saveSportsBetToFirebase(bet: SportsBet): Promise<void> {
  if (!bet?.id) return;
  const id = sanitizeFirestoreId(bet.id);
  const path = `sportsBets/${id}`;
  try {
    await setDoc(doc(db, 'sportsBets', id), stripUndefinedDeep({ ...bet, id }), { merge: true });
  } catch (error) {
    logFirestoreNonFatal(error, OperationType.WRITE, path);
  }
}
