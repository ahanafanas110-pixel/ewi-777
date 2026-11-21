import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiUrl } from '../utils/phoneAndApi';
import { compressImageFileToDataUrl } from '../utils/imageCompress';
import { Ewi777Logo } from '../components/BrandLogos';
import {
  ArrowLeft,
  ArrowUpCircle,
  BarChart3,
  Bell,
  Gift,
  Image as ImageIcon,
  KeyRound,
  Lock,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  Users
} from 'lucide-react';

type MentorTab =
  | 'support'
  | 'withdraws'
  | 'giftcodes'
  | 'stats'
  | 'notices'
  | 'users'
  | 'password';

interface MentorProfile {
  id: string;
  name: string;
  username: string;
  allowedIp: string;
  giftCodeBudget: number;
  giftCodeSpent: number;
}

interface MentorUserRow {
  id: string;
  uid: string;
  nickname: string;
  phone: string;
  registeredIp: string;
  lastIp: string;
  deviceName: string;
  isVpn: boolean;
  vpnReason?: string;
  ipCountry?: string;
  ipIsp?: string;
  sameIpCount: number;
  hasHoldingBalance: boolean;
  turnoverRequired: number;
  turnoverCompleted: number;
  createdAt?: string;
  lastLogin?: string;
  isBanned?: boolean;
}

interface MentorWithdrawRow {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userPhone: string;
  method: string;
  number: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  time: string;
  adminNote?: string;
  rejectionReason?: string;
}

interface MentorSupportMsg {
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

const SESSION_KEY = 'ewi777_mentor_session';

export const MentorPanel: React.FC = () => {
  const { adminSettings, showToast, setActiveTab } = useApp();

  const [mentorSession, setMentorSession] = useState<{
    mentorId: string;
    token: string;
    mentor: MentorProfile;
  } | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isIpBlocked, setIsIpBlocked] = useState(false);

  // Dashboard Data State
  const [activeTab, setTab] = useState<MentorTab>('support');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [countsOnly, setCountsOnly] = useState({
    todayRegistrationsCount: 0,
    binaryDepositorsCount: 0,
    bkashNagadDepositorsCount: 0
  });
  const [users, setUsers] = useState<MentorUserRow[]>([]);
  const [withdraws, setWithdraws] = useState<MentorWithdrawRow[]>([]);
  const [supportMessages, setSupportMessages] = useState<MentorSupportMsg[]>([]);
  const [myGiftCodes, setMyGiftCodes] = useState<any[]>([]);

  // 1. Support Chat State
  const [selectedChatUserId, setSelectedChatUserId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);

  // 2. Withdrawals Filter & Reject Note State
  const [wdFilter, setWdFilter] = useState<'pending' | 'processing' | 'all'>('pending');
  const [wdNoteDrafts, setWdNoteDrafts] = useState<Record<string, string>>({});

  // 3. Gift Code Generator State
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [giftAmtInput, setGiftAmtInput] = useState('50');
  const [giftMaxClaims, setGiftMaxClaims] = useState('1');
  const [giftTurnoverInput, setGiftTurnoverInput] = useState('50');
  const [giftTargetUid, setGiftTargetUid] = useState('');
  const [giftReason, setGiftReason] = useState('Mentor Support Reward');

  // 5. Notices State
  const [noticeTargetUid, setNoticeTargetUid] = useState('ALL');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  // 6. Users Search + Turnover Edit State
  const [userSearch, setUserSearch] = useState('');
  const [turnoverDrafts, setTurnoverDrafts] = useState<Record<string, string>>({});

  // 7. Password Settings State
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  const handleMentorLogout = (reason?: string) => {
    setMentorSession(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    if (reason) setLoginError(reason);
  };

  const fetchMentorData = async (silent = false) => {
    if (!mentorSession) return;
    if (!silent) setIsLoadingData(true);
    try {
      const res = await fetch(apiUrl('/api/mentor/data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentorSession.mentorId,
          token: mentorSession.token
        })
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        if (data?.mentorBlocked) setIsIpBlocked(true);
        handleMentorLogout(data?.message || 'Session expired or IP changed.');
        return;
      }
      if (res.ok && data?.success) {
        if (data.mentor) {
          const nextSess = { ...mentorSession, mentor: data.mentor };
          setMentorSession(nextSess);
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSess));
          } catch {}
        }
        if (data.countsOnly) setCountsOnly(data.countsOnly);
        if (Array.isArray(data.users)) setUsers(data.users);
        if (Array.isArray(data.withdraws)) setWithdraws(data.withdraws);
        if (Array.isArray(data.supportMessages)) setSupportMessages(data.supportMessages);
        if (Array.isArray(data.giftCodes)) setMyGiftCodes(data.giftCodes);
      }
    } catch {
      if (!silent) showToast('Failed to sync Mentor Portal');
    } finally {
      if (!silent) setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!mentorSession) return;
    fetchMentorData(false);
    const iv = window.setInterval(() => fetchMentorData(true), 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorSession?.mentorId, mentorSession?.token]);

  const callMentorAction = async (op: string, payload: Record<string, any>) => {
    if (!mentorSession) return null;
    try {
      const res = await fetch(apiUrl('/api/mentor/action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentorSession.mentorId,
          token: mentorSession.token,
          op,
          ...payload
        })
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        if (data?.mentorBlocked) {
          setIsIpBlocked(true);
          handleMentorLogout(data.message);
        } else {
          showToast(data?.message || 'Action denied');
        }
        return null;
      }
      if (!res.ok || !data?.success) {
        showToast(data?.message || 'Action failed');
        return null;
      }
      return data;
    } catch {
      showToast('Server connection failed');
      return null;
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch(apiUrl('/api/mentor/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data.token || !data.mentor) {
        if (data?.mentorBlocked) setIsIpBlocked(true);
        setLoginError(data?.message || 'Authentication failed.');
        return;
      }
      const nextSess = {
        mentorId: data.mentor.id,
        token: data.token,
        mentor: data.mentor
      };
      setMentorSession(nextSess);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSess));
      } catch {}
      setUsername('');
      setPassword('');
      showToast(`Welcome, ${data.mentor.name}`);
    } catch {
      setLoginError('Unable to reach Mentor security server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Support Threads Derived
  const supportThreads = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userUid: string;
        userNickname: string;
        userPhone: string;
        lastMessage: string;
        lastTimestamp: number;
        hasUnanswered: boolean;
      }
    >();
    supportMessages.forEach((m) => {
      if (!m.userId) return;
      const prev = map.get(m.userId);
      const isUserMsg = m.sender === 'user';
      if (!prev || Number(m.timestamp || 0) >= prev.lastTimestamp) {
        map.set(m.userId, {
          userId: m.userId,
          userUid: m.userUid || prev?.userUid || '',
          userNickname: m.userNickname || prev?.userNickname || 'Member',
          userPhone: m.userPhone || prev?.userPhone || '',
          lastMessage: m.text || (m.imageUrl ? '[Image]' : ''),
          lastTimestamp: Number(m.timestamp || 0),
          hasUnanswered: isUserMsg
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [supportMessages]);

  const filteredWithdraws = useMemo(
    () =>
      withdraws.filter((w) => {
        if (wdFilter === 'all') return true;
        return w.status === wdFilter;
      }),
    [withdraws, wdFilter]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.uid || '').toLowerCase().includes(q) ||
        (u.nickname || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.lastIp || '').toLowerCase().includes(q) ||
        (u.registeredIp || '').toLowerCase().includes(q) ||
        (u.deviceName || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  // =================== LOGIN VIEW (NO SELF SIGNUP) ===================
  if (!mentorSession) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setActiveTab('home');
                window.location.hash = '#/';
              }}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0891B2]" />
              <span className="text-[11px] font-bold text-[#0891B2]">IP-Locked Portal</span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex mx-auto">
              <Ewi777Logo height={56} logoUrl={adminSettings.appLogoUrl} />
            </div>
            <h1 className="font-black text-xl tracking-tight text-slate-900">MENTOR PORTAL</h1>
            <p className="text-xs text-slate-500">
              Authorized Mentors only. Accounts are provisioned by Admin with strict IP matching.
            </p>
          </div>

          {isIpBlocked && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-black">IP PERMANENTLY BLOCKED</div>
                <div className="mt-0.5">
                  Failed login or IP mismatch detected. Ask the Administrator to unblock your IP.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                Mentor Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter assigned username"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 outline-none focus:border-cyan-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                Mentor Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter assigned password"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-900 outline-none focus:border-cyan-600"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-sm disabled:opacity-60"
            >
              {isLoggingIn ? 'Verifying IP & Credentials...' : 'Sign In to Mentor Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const remainingBudget = Math.max(
    0,
    +(Number(mentorSession.mentor.giftCodeBudget || 0) - Number(mentorSession.mentor.giftCodeSpent || 0)).toFixed(2)
  );

  const navTabs: Array<{ id: MentorTab; label: string; icon: React.ReactNode }> = [
    { id: 'support', label: 'Support Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'withdraws', label: 'Withdrawals Queue', icon: <ArrowUpCircle className="w-4 h-4" /> },
    { id: 'giftcodes', label: 'Gift Codes', icon: <Gift className="w-4 h-4" /> },
    { id: 'stats', label: 'Daily Counts', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'notices', label: 'Notices', icon: <Bell className="w-4 h-4" /> },
    { id: 'users', label: 'Users List', icon: <Users className="w-4 h-4" /> },
    { id: 'password', label: 'Password', icon: <KeyRound className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-12">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Ewi777Logo height={36} logoUrl={adminSettings.appLogoUrl} />
          <div>
            <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#0891B2]" />
              <span>MENTOR: {mentorSession.mentor.name}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              @{mentorSession.mentor.username} • IP {mentorSession.mentor.allowedIp}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchMentorData(false)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => handleMentorLogout()}
            className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* 7 Permitted Navigation Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {navTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white border-transparent shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* 1. SUPPORT CHAT */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 bg-white border border-slate-200 rounded-2xl p-3 space-y-2 max-h-[580px] overflow-y-auto">
              <div className="text-xs font-black text-[#0891B2] px-2 pb-2 border-b border-slate-200">
                USER THREADS ({supportThreads.length})
              </div>
              {supportThreads.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">No support chats yet.</div>
              ) : (
                supportThreads.map((th) => (
                  <button
                    key={th.userId}
                    type="button"
                    onClick={() => setSelectedChatUserId(th.userId)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                      selectedChatUserId === th.userId
                        ? 'bg-cyan-50 border-cyan-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 truncate">{th.userNickname}</span>
                      {th.hasUnanswered && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">UID: {th.userUid}</div>
                    <div className="text-[11px] text-slate-700 truncate mt-0.5">{th.lastMessage}</div>
                  </button>
                ))
              )}
            </div>

            <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[500px] max-h-[580px]">
              {(() => {
                const thread = supportThreads.find((t) => t.userId === selectedChatUserId);
                if (!thread) {
                  return (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                      Select a member thread from the left to reply.
                    </div>
                  );
                }
                const msgs = supportMessages.filter((m) => m.userId === thread.userId);
                const sendReply = async (e?: React.FormEvent, imageUrl?: string) => {
                  if (e) e.preventDefault();
                  const cleanText = imageUrl ? '' : replyText.trim();
                  if (!cleanText && !imageUrl) return;
                  if (!imageUrl) setReplyText('');
                  const res = await callMentorAction('support_reply', {
                    userId: thread.userId,
                    userUid: thread.userUid,
                    userNickname: thread.userNickname,
                    userPhone: thread.userPhone,
                    text: cleanText,
                    imageUrl
                  });
                  if (res?.message) {
                    setSupportMessages((prev) => [...prev, res.message]);
                  }
                };

                const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsSendingPhoto(true);
                  try {
                    const dataUrl = await compressImageFileToDataUrl(file, 600, 0.65);
                    if (dataUrl) await sendReply(undefined, dataUrl);
                  } finally {
                    setIsSendingPhoto(false);
                    e.target.value = '';
                  }
                };

                return (
                  <>
                    <div className="pb-2.5 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-black text-sm text-slate-900">{thread.userNickname}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          UID: {thread.userUid} • {thread.userPhone}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[10px] font-black">
                        Mentor Reply Mode
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto py-3 space-y-2">
                      {msgs.map((m) => (
                        <div
                          key={m.id}
                          className={`flex flex-col ${m.sender === 'admin' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs space-y-1.5 ${
                              m.sender === 'admin'
                                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white'
                                : 'bg-slate-50 border border-slate-200 text-slate-800'
                            }`}
                          >
                            {m.imageUrl && (
                              <img
                                src={m.imageUrl}
                                alt="Attachment"
                                className="max-w-[200px] rounded-xl object-cover"
                              />
                            )}
                            {m.text && <div>{m.text}</div>}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-0.5 px-1">
                            {m.sender === 'admin'
                              ? m.repliedByRole === 'mentor'
                                ? `Mentor • ${m.repliedByName || 'Support'}`
                                : 'Admin'
                              : thread.userNickname}{' '}
                            • {m.time}
                          </span>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={(e) => sendReply(e)} className="pt-2.5 border-t border-slate-200 flex gap-2">
                      <label className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-[#0891B2] flex items-center justify-center cursor-pointer flex-shrink-0">
                        <ImageIcon className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isSendingPhoto}
                          onChange={handlePhoto}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type reply as Mentor..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs flex items-center gap-1"
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

        {/* 2. WITHDRAWALS QUEUE (NO MONEY AMOUNTS SHOWN) */}
        {activeTab === 'withdraws' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {(['pending', 'processing', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setWdFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border uppercase ${
                      wdFilter === f
                        ? 'bg-cyan-50 border-cyan-400 text-[#0891B2]'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-slate-500">
                {filteredWithdraws.length} requests (Amounts masked)
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">ORDER ID</th>
                      <th className="px-4 py-3">MEMBER</th>
                      <th className="px-4 py-3">METHOD &amp; NUMBER</th>
                      <th className="px-4 py-3">STATUS</th>
                      <th className="px-4 py-3">NOTE</th>
                      <th className="px-4 py-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredWithdraws.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No matching withdrawal requests.
                        </td>
                      </tr>
                    ) : (
                      filteredWithdraws.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-[#0891B2]">{w.orderId}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{w.userName}</div>
                            <div className="text-[10px] font-mono text-slate-500">{w.userPhone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{w.method}</div>
                            <div className="text-[10px] font-mono text-slate-500">{w.number}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                w.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : w.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-cyan-50 text-[#0891B2]'
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {w.status === 'pending' || w.status === 'processing' ? (
                              <input
                                type="text"
                                value={wdNoteDrafts[w.id] || ''}
                                onChange={(e) => setWdNoteDrafts((p) => ({ ...p, [w.id]: e.target.value }))}
                                placeholder="Reason / note..."
                                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] w-36"
                              />
                            ) : (
                              <span className="text-[11px] text-slate-500">{w.rejectionReason || w.adminNote || '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {w.status === 'pending' || w.status === 'processing' ? (
                              <div className="inline-flex gap-1.5">
                                {w.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const ok = await callMentorAction('withdraw_update', {
                                        withdrawId: w.id,
                                        status: 'processing',
                                        note: wdNoteDrafts[w.id] || 'Processing by Mentor'
                                      });
                                      if (ok) {
                                        showToast('Marked Processing');
                                        fetchMentorData(true);
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[10px] font-black"
                                  >
                                    PROCESSING
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const ok = await callMentorAction('withdraw_update', {
                                      withdrawId: w.id,
                                      status: 'rejected',
                                      note: wdNoteDrafts[w.id] || 'আপনি কিছুক্ষণ পর আবার চেষ্টা করুন ধন্যবাদ'
                                    });
                                    if (ok) {
                                      showToast('Marked Rejected');
                                      fetchMentorData(true);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black"
                                >
                                  REJECT
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
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

        {/* 3. GIFT CODE GENERATOR (BUDGET CAPPED) */}
        {activeTab === 'giftcodes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await callMentorAction('create_gift_code', {
                  code: giftCodeInput.trim().toUpperCase(),
                  amount: Number(giftAmtInput) || 0,
                  maxClaims: Number(giftMaxClaims) || 1,
                  turnoverAmount: Number(giftTurnoverInput) || 0,
                  targetUid: giftTargetUid.trim().toUpperCase(),
                  reason: giftReason.trim()
                });
                if (res?.success) {
                  showToast(`Gift Code ${res.giftCode?.code} Created!`);
                  setGiftCodeInput('');
                  fetchMentorData(true);
                }
              }}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[#0891B2] uppercase">
                  Generate Gift Code (Budget Capped)
                </h3>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[11px] font-mono font-black">
                  Remaining: ৳{remainingBudget.toFixed(0)} / ৳{Number(mentorSession.mentor.giftCodeBudget || 0).toFixed(0)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CODE</label>
                  <input
                    type="text"
                    required
                    value={giftCodeInput}
                    onChange={(e) => setGiftCodeInput(e.target.value.toUpperCase())}
                    placeholder="MNT777GIFT"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-black uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">TARGET UID (Optional)</label>
                  <input
                    type="text"
                    value={giftTargetUid}
                    onChange={(e) => setGiftTargetUid(e.target.value.toUpperCase())}
                    placeholder="Blank = All"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">REWARD PER CLAIM ৳</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={giftAmtInput}
                    onChange={(e) => setGiftAmtInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">MAX CLAIMS</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={giftMaxClaims}
                    onChange={(e) => setGiftMaxClaims(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">TURNOVER ৳</label>
                  <input
                    type="number"
                    min={0}
                    value={giftTurnoverInput}
                    onChange={(e) => setGiftTurnoverInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">REASON</label>
                  <input
                    type="text"
                    value={giftReason}
                    onChange={(e) => setGiftReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs"
              >
                CREATE GIFT CODE
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <h3 className="text-xs font-black text-slate-700 uppercase">
                My Generated Gift Codes ({myGiftCodes.length})
              </h3>
              {myGiftCodes.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">No gift codes created yet.</div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {myGiftCodes.map((g) => (
                    <div
                      key={g.code}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-black text-[#0891B2]">{g.code}</div>
                        <div className="text-[10px] text-slate-500">
                          ৳{g.amount} • {g.claimedCount}/{g.maxClaims} claimed{' '}
                          {g.targetUid ? `• UID ${g.targetUid}` : ''}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black">
                        {g.active !== false ? 'ACTIVE' : 'ENDED'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. DAILY STATS (COUNTS ONLY — ZERO MONETARY TOTALS) */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-[11px] font-black text-slate-500 uppercase">
                Today&apos;s Registrations
              </div>
              <div className="text-3xl font-mono font-black text-[#0891B2] mt-2 tabular-nums">
                {countsOnly.todayRegistrationsCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">New member accounts joined today</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-[11px] font-black text-slate-500 uppercase">
                Binary / USDT Depositors
              </div>
              <div className="text-3xl font-mono font-black text-emerald-600 mt-2 tabular-nums">
                {countsOnly.binaryDepositorsCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Unique accounts via USDT / Binary</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-[11px] font-black text-slate-500 uppercase">
                bKash &amp; Nagad Depositors
              </div>
              <div className="text-3xl font-mono font-black text-rose-600 mt-2 tabular-nums">
                {countsOnly.bkashNagadDepositorsCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Unique accounts via bKash / Nagad</div>
            </div>
          </div>
        )}

        {/* 5. NOTICES (BROADCAST OR UID TARGETED) */}
        {activeTab === 'notices' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await callMentorAction('send_notice', {
                targetUid: noticeTargetUid.trim() || 'ALL',
                title: noticeTitle.trim(),
                message: noticeMessage.trim()
              });
              if (res?.success) {
                showToast('Notification dispatched!');
                setNoticeTitle('');
                setNoticeMessage('');
              }
            }}
            className="max-w-xl bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5"
          >
            <h3 className="text-xs font-black text-[#0891B2] uppercase">Send Broadcast / User Notice</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Target UID (Type &quot;ALL&quot; for everyone, or a member UID)
                </label>
                <input
                  type="text"
                  required
                  value={noticeTargetUid}
                  onChange={(e) => setNoticeTargetUid(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="Official Support Update"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  placeholder="Write announcement message..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs"
              >
                SEND NOTIFICATION
              </button>
            </div>
          </form>
        )}

        {/* 6. REGISTERED USERS LIST (NO BALANCES / DEPOSITS / WITHDRAWALS) */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search UID, phone, IP, or device..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>
              <span className="text-xs font-mono text-slate-500">{filteredUsers.length} members</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">MEMBER</th>
                      <th className="px-4 py-3">DEVICE &amp; IP SECURITY</th>
                      <th className="px-4 py-3">TURNOVER (DONE / REQ)</th>
                      <th className="px-4 py-3 text-right">HOLDING / TURNOVER CONTROLS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{u.nickname}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            UID: {u.uid} • {u.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[11px] font-bold text-slate-800">{u.deviceName}</div>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="text-[10px] font-mono text-[#0891B2]">{u.lastIp}</span>
                            {u.sameIpCount >= 2 && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[9px] font-black">
                                SAME IP ({u.sameIpCount})
                              </span>
                            )}
                            {u.isVpn && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black">
                                USE VPN
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-700">
                          {Number(u.turnoverCompleted || 0).toFixed(0)} /{' '}
                          {Number(u.turnoverRequired || 0).toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {u.hasHoldingBalance && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await callMentorAction('release_holding', { userId: u.id });
                                  if (res?.success) {
                                    showToast(`Released holding lock for ${u.uid}`);
                                    fetchMentorData(true);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black inline-flex items-center gap-1"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Release Holding</span>
                              </button>
                            )}
                            <input
                              type="number"
                              value={turnoverDrafts[u.id] ?? String(u.turnoverRequired || 0)}
                              onChange={(e) =>
                                setTurnoverDrafts((p) => ({ ...p, [u.id]: e.target.value }))
                              }
                              className="w-20 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const val = Math.max(0, Number(turnoverDrafts[u.id] ?? u.turnoverRequired) || 0);
                                const res = await callMentorAction('adjust_turnover', {
                                  userId: u.id,
                                  turnoverRequired: val
                                });
                                if (res?.success) {
                                  showToast(`Updated turnover target for ${u.uid}`);
                                  fetchMentorData(true);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0891B2] text-white text-[10px] font-black"
                            >
                              Set Req
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

        {/* 7. PASSWORD SETTINGS */}
        {activeTab === 'password' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (newPass.trim().length < 6) {
                showToast('New password must be at least 6 characters');
                return;
              }
              if (newPass !== confirmNewPass) {
                showToast('New passwords do not match');
                return;
              }
              const res = await callMentorAction('change_password', {
                currentPassword: curPass,
                newPassword: newPass.trim()
              });
              if (res?.success) {
                showToast('Mentor password updated!');
                setCurPass('');
                setNewPass('');
                setConfirmNewPass('');
              }
            }}
            className="max-w-md bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5"
          >
            <h3 className="text-xs font-black text-[#0891B2] uppercase flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>Change My Mentor Password</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={curPass}
                  onChange={(e) => setCurPass(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmNewPass}
                  onChange={(e) => setConfirmNewPass(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white font-black text-xs"
              >
                UPDATE MENTOR PASSWORD
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
