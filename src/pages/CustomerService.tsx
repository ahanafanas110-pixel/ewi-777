import React, { useState } from 'react';
import { normalizePhone, useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Send,
  ChevronRight,
  CheckCircle2,
  Copy,
  Wallet,
  Lock,
  Smartphone,
  ShieldCheck,
  Gift,
  Users,
  ExternalLink,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { CustomerServiceLogo } from '../components/BrandLogos';
import { DepositPastelIcon, WithdrawPastelIcon } from '../components/AccountIcons';
import { compressImageFileToDataUrl } from '../utils/imageCompress';

type SupportTopicId =
  | 'deposit_not_received'
  | 'withdrawal_problem'
  | 'change_login_password'
  | 'ewallet_info'
  | 'add_usdt'
  | 'agent_consultation'
  | 'telegram_cs'
  | 'apply_77_bonus'
  | 'join_telegram_channel';

export const CustomerService: React.FC = () => {
  const {
    user,
    depositRequests,
    withdrawRequests,
    adminSettings,
    setActiveTab,
    showToast,
    supportMessages,
    sendSupportMessage
  } = useApp();

  const [viewMode, setViewMode] = useState<'menu' | 'chat'>('menu');
  const [selectedTopic, setSelectedTopic] = useState<SupportTopicId | null>(null);

  const [issueTrxId, setIssueTrxId] = useState('');
  const [issueAmount, setIssueAmount] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [usdtDraft, setUsdtDraft] = useState('');

  const myMessages = user.isLoggedIn && user.id
    ? supportMessages.filter((m) => m.userId === user.id)
    : [];
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const normPhone = normalizePhone(user.phone || '');
  const myDeposits = user.isLoggedIn && user.id
    ? depositRequests.filter(
        (d) =>
          d.userId === user.id ||
          (normPhone && d.senderNumber && normalizePhone(d.senderNumber) === normPhone)
      )
    : [];
  const myWithdraws = user.isLoggedIn && user.id
    ? withdrawRequests.filter(
        (w) =>
          w.userId === user.id ||
          (normPhone && w.userPhone && normalizePhone(w.userPhone) === normPhone)
      )
    : [];
  const remainingTurnover = Math.max(0, (user.turnoverRequired || 0) - (user.turnoverCompleted || 0));

  const telegramChannelLink =
    adminSettings.supportLink?.trim() || 'https://t.me/ewi777official';
  const telegramAgentLink =
    adminSettings.supportLink?.trim() || 'https://t.me/ewi777support';

  const supportItems: Array<{
    id: SupportTopicId;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'deposit_not_received',
      title: 'Deposit Not Received',
      subtitle: 'Check TRX ID status & escalate pending deposit',
      icon: <DepositPastelIcon size={20} />
    },
    {
      id: 'withdrawal_problem',
      title: 'Withdrawal problem',
      subtitle: 'Check queue, turnover requirement & wallet status',
      icon: <WithdrawPastelIcon size={20} />
    },
    {
      id: 'change_login_password',
      title: 'Change Login Password',
      subtitle: 'Reset password or recover forgotten credentials',
      icon: <Lock className="w-4 h-4 stroke-[2.5]" />
    },
    {
      id: 'ewallet_info',
      title: 'E-Wallet Information',
      subtitle: 'bKash & Nagad 1-account wallet binding guide',
      icon: <Smartphone className="w-4 h-4 stroke-[2.5]" />
    },
    {
      id: 'add_usdt',
      title: 'Add USDT Address',
      subtitle: 'Bind TRC20 USDT address for crypto settlement',
      icon: <Wallet className="w-4 h-4 stroke-[2.5]" />
    },
    {
      id: 'agent_consultation',
      title: 'Deshi Win Agent Consultation',
      subtitle: 'Daily agent salary tiers & team commission guide',
      icon: <Users className="w-4 h-4 stroke-[2.5]" />
    },
    {
      id: 'telegram_cs',
      title: 'Telegram Customer Service',
      subtitle: 'Connect directly with live Deshi Win support desk',
      icon: <Send className="w-4 h-4 stroke-[2.3]" />
    },
    {
      id: 'apply_77_bonus',
      title: 'Apply 200% Bonus',
      subtitle: 'Deposit 200% bonus application & gift codes',
      icon: <Gift className="w-4 h-4 stroke-[2.3]" />
    },
    {
      id: 'join_telegram_channel',
      title: 'Join Telegram Channel',
      subtitle: 'Official daily signals, gift codes & updates',
      icon: <Send className="w-4 h-4 stroke-[2.3]" />
    }
  ];

  const handleSendChat = async (textToSend?: string, imageUrlToSend?: string) => {
    const text = (textToSend ?? inputMessage).trim();
    if (!text && !imageUrlToSend) return;
    if (!textToSend) setInputMessage('');

    await sendSupportMessage({
      userId: user.id || 'guest',
      userUid: user.uid || 'GUEST',
      userNickname: user.nickname || user.phone || 'Member',
      userPhone: user.phone || user.email || 'Member',
      sender: 'user',
      text,
      imageUrl: imageUrlToSend
    });
  };

  const handleChatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSendingPhoto(true);
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
      await handleSendChat('', dataUrl);
      showToast('Photo sent to Customer Service');
    } catch {
      showToast('Failed to send photo');
    } finally {
      setIsSendingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmitUrgentTicket = (label: string) => {
    const details = `${label}${issueTrxId ? ` | TRX/Ref: ${issueTrxId}` : ''}${
      issueAmount ? ` | Amount: ৳${issueAmount}` : ''
    }${issueNote ? ` | Note: ${issueNote}` : ''}`;
    setIssueTrxId('');
    setIssueAmount('');
    setIssueNote('');
    setSelectedTopic(null);
    setViewMode('chat');
    handleSendChat(details);
    showToast(`${label} submitted to Live Support!`);
  };

  const copyText = (val: string, msg: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    showToast(msg);
  };

  const activeTopicMeta = supportItems.find((s) => s.id === selectedTopic);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-cyan-100 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => {
            setActiveTab(user.isLoggedIn ? 'account' : 'home');
            window.location.hash = user.isLoggedIn ? '#/account' : '#/';
          }}
          className="p-1.5 -ml-1 rounded-full text-slate-700 hover:bg-cyan-50 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2">
          <CustomerServiceLogo size={28} />
          <h1 className="text-base font-black tracking-tight text-slate-900">
            Deshi Win Customer Service
          </h1>
        </div>

        <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
          24/7 Live
        </span>
      </div>

      {/* Mode Switcher */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl p-1 border border-slate-200 shadow-2xs grid grid-cols-2 gap-1">
          <button
            onClick={() => setViewMode('menu')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === 'menu'
                ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-cyan-50/50'
            }`}
          >
            Self-Service Center
          </button>
          <button
            onClick={() => setViewMode('chat')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === 'chat'
                ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-cyan-50/50'
            }`}
          >
            Live Chat Support
          </button>
        </div>
      </div>

      {viewMode === 'menu' ? (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {supportItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTopic(item.id)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-cyan-50/40 active:bg-cyan-50 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>

          {/* Quick Account Diagnostics Card */}
          <div className="bg-white rounded-3xl p-4 border border-cyan-100 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                <span>Quick Account Status</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                {user.isLoggedIn ? `UID ${user.uid}` : 'Not Logged In'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center tabular-nums">
              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">Pending Dep</div>
                <div className="text-sm font-black text-slate-900">
                  {myDeposits.filter((d) => d.status === 'pending').length}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">Pending WD</div>
                <div className="text-sm font-black text-slate-900">
                  {myWithdraws.filter((w) => w.status === 'pending' || w.status === 'processing').length}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">Turnover Left</div>
                <div className="text-sm font-black text-cyan-700">
                  ৳{remainingTurnover.toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-cyan-100 space-y-3 min-h-[430px] flex flex-col">
            <div className="text-center text-[11px] text-slate-500 font-bold pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Deshi Win Official Live Agent Chat</span>
              <span className="text-[10px] text-emerald-600 font-black">Human Support</span>
            </div>

            <div className="flex-1 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {myMessages.length === 0 ? (
                <div className="text-center py-12 px-4 text-xs text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto">
                    <CustomerServiceLogo size={32} />
                  </div>
                  <p className="font-semibold text-slate-500">
                    Send a message or photo below. An official Deshi Win agent will reply here.
                  </p>
                </div>
              ) : (
                myMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {m.sender === 'admin' && (
                      <span className="text-[10px] font-black text-cyan-700 mb-0.5 px-1">
                        {m.repliedByRole === 'mentor'
                          ? `Mentor • ${m.repliedByName || 'Support'}`
                          : 'Deshi Win Agent'}
                      </span>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs font-semibold leading-relaxed shadow-2xs space-y-2 ${
                        m.sender === 'user'
                          ? 'bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white rounded-tr-xs'
                          : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-xs'
                      }`}
                    >
                      {m.imageUrl && (
                        <img
                          src={m.imageUrl}
                          alt="Support attachment"
                          referrerPolicy="no-referrer"
                          onClick={() => setZoomImageUrl(m.imageUrl!)}
                          className="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer border border-white/30"
                        />
                      )}
                      {m.text && <div className="break-words">{m.text}</div>}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                      {m.timestamp
                        ? new Date(m.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : m.time}
                    </span>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2 pt-2 border-t border-slate-100"
            >
              <label
                title="Send photo from gallery"
                className={`w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center cursor-pointer hover:bg-cyan-100 active:scale-95 flex-shrink-0 ${
                  isSendingPhoto ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleChatPhotoUpload}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Write a message to support agent..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white flex items-center justify-center shadow-xs active:scale-95 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <button
            onClick={() => setZoomImageUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/15 text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomImageUrl}
            alt="Zoomed"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}

      {/* Problem Resolution Drawer */}
      {selectedTopic && activeTopicMeta && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-cyan-100 max-h-[88vh] flex flex-col overflow-hidden text-slate-900">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center">
                  {activeTopicMeta.icon}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">{activeTopicMeta.title}</h3>
                  <p className="text-[11px] text-slate-500">Step-by-step Resolution Guide</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="p-1.5 rounded-full hover:bg-slate-200/70 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {selectedTopic === 'deposit_not_received' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-1.5 text-slate-700 leading-relaxed">
                    <div className="font-black text-cyan-900">How to resolve Deposit Not Received:</div>
                    <p>1. Verify your bKash/Nagad SMS has the exact <strong>10-character TRX ID</strong> or EWI PAY order confirmation.</p>
                    <p>2. Standard deposit verification takes <strong>5 to 30 minutes</strong> during peak hours.</p>
                    <p>3. Submit your TRX / Order ID below to prioritize verification with Finance Support.</p>
                  </div>

                  {myDeposits.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="font-extrabold text-slate-700">Your Recent Deposits:</div>
                      {myDeposits.slice(0, 3).map((d) => (
                        <div key={d.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800">{d.method} · ৳{d.amount}</div>
                            <div className="text-[10px] font-mono text-slate-500">TRX: {d.trxId}</div>
                          </div>
                          <span className={`font-black uppercase text-[10px] ${
                            d.status === 'approved' ? 'text-emerald-600' : d.status === 'rejected' ? 'text-rose-600' : 'text-cyan-700'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2.5 pt-1">
                    <input
                      type="text"
                      value={issueTrxId}
                      onChange={(e) => setIssueTrxId(e.target.value)}
                      placeholder="Enter TRX ID (e.g. 9G7H2K1L8M)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase text-slate-800"
                    />
                    <input
                      type="number"
                      value={issueAmount}
                      onChange={(e) => setIssueAmount(e.target.value)}
                      placeholder="Deposit Amount (৳)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800"
                    />
                    <button
                      onClick={() => handleSubmitUrgentTicket('Deposit Verification Request')}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-md"
                    >
                      Submit Deposit Priority Check
                    </button>
                  </div>
                </>
              )}

              {selectedTopic === 'withdrawal_problem' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-1.5 text-slate-700 leading-relaxed">
                    <div className="font-black text-sky-900">Why Withdrawal might be delayed or blocked:</div>
                    <p>1. <strong>Turnover Requirement:</strong> Your remaining turnover must be ৳0. Current remaining: <strong className="text-cyan-700">৳{remainingTurnover.toFixed(2)}</strong>.</p>
                    <p>2. <strong>Wallet Mismatch:</strong> Ensure your bound bKash/Nagad number is active for Cash-In / Personal.</p>
                    <p>3. <strong>Processing Window:</strong> Payouts settle in 5–15 minutes via EWI PAY.</p>
                  </div>

                  {myWithdraws.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="font-extrabold text-slate-700">Your Recent Withdrawals:</div>
                      {myWithdraws.slice(0, 3).map((w) => (
                        <div key={w.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800">{w.method} · ৳{w.amount}</div>
                            <div className="text-[10px] font-mono text-slate-500">{w.number}</div>
                          </div>
                          <span className="font-black uppercase text-[10px] text-cyan-700">{w.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                    placeholder="Describe withdrawal issue or order number..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800"
                  />
                  <button
                    onClick={() => handleSubmitUrgentTicket('Withdrawal Issue Escalation')}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-md"
                  >
                    Escalate Withdrawal to Live Support
                  </button>
                </>
              )}

              {selectedTopic === 'change_login_password' && (
                <>
                  {user.isLoggedIn && (
                    <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-black text-slate-900">Know your current password?</div>
                        <div className="text-[11px] text-slate-500">Update it instantly inside security settings</div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTopic(null);
                          setActiveTab('change-login-password');
                          window.location.hash = '#/change-login-password';
                        }}
                        className="px-3.5 py-2 rounded-full bg-cyan-600 text-white font-black text-[11px] whitespace-nowrap"
                      >
                        Change Now
                      </button>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="font-black text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-cyan-600" />
                      <span>Password Reset / Recovery</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                      For account security, password recovery is handled directly by our verification desk. To reset or recover your password, please message Customer Care.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopic(null);
                        setViewMode('chat');
                        handleSendChat('Hello, I need help resetting or recovering my account password.');
                      }}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-md active:scale-98"
                    >
                      Message Customer Care →
                    </button>
                  </div>
                </>
              )}

              {selectedTopic === 'ewallet_info' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-slate-700 leading-relaxed">
                    <div className="font-black text-emerald-900">E-Wallet Security & Binding Rules:</div>
                    <p>• Each bKash or Nagad wallet number can only be bound to <strong>one Deshi Win account</strong> globally.</p>
                    <p>• You must verify your <strong>Account Login Password</strong> to add a wallet.</p>
                    <p>• Bound bKash: <strong className="font-mono">{user.boundBkash || 'Not bound yet'}</strong></p>
                    <p>• Bound Nagad: <strong className="font-mono">{user.boundNagad || 'Not bound yet'}</strong></p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTopic(null);
                      setActiveTab('wallet');
                      window.location.hash = '#/wallet';
                    }}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-md"
                  >
                    Open E-Wallet Bind Manager →
                  </button>
                </>
              )}

              {selectedTopic === 'add_usdt' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 space-y-1.5 text-slate-700 leading-relaxed">
                    <div className="font-black text-teal-900">USDT (TRC20) Address Setup:</div>
                    <p>1. Use only <strong>TRON (TRC20)</strong> network addresses starting with <code>T...</code>.</p>
                    <p>2. Platform Deposit USDT Address: <strong className="font-mono">{adminSettings.usdtAddress || 'Available via Support Ticket'}</strong></p>
                    <p>3. Enter your personal TRC20 receiving address below to submit a binding request.</p>
                  </div>
                  <input
                    type="text"
                    value={usdtDraft}
                    onChange={(e) => setUsdtDraft(e.target.value)}
                    placeholder="Paste your TRC20 USDT address (starts with T...)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800"
                  />
                  <button
                    onClick={() => {
                      if (!usdtDraft.trim().startsWith('T') || usdtDraft.trim().length < 20) {
                        showToast('Please enter a valid TRC20 USDT address starting with T');
                        return;
                      }
                      handleSubmitUrgentTicket(`Bind USDT TRC20 Address: ${usdtDraft.trim()}`);
                      setUsdtDraft('');
                    }}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-md"
                  >
                    Submit USDT Address Verification
                  </button>
                </>
              )}

              {selectedTopic === 'agent_consultation' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-1.5 text-slate-700 leading-relaxed">
                    <div className="font-black text-cyan-900">Deshi Win Official 3 Level Salary Consultation:</div>
                    <p>• Earn <strong>3 Level Salary</strong> from <strong>৳300</strong> (5 recharge members / ৳3,000+ team deposit) up to <strong>৳100,000</strong> (1,000 members).</p>
                    <p>• Minimum <strong>25% deposit</strong> under your team &amp; own deposit is strictly required — without 25%, salary cannot be applied or claimed.</p>
                    <p>• Salaries are not credited automatically; click <strong>Apply</strong> once conditions are met.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedTopic(null);
                        setActiveTab('salary');
                        window.location.hash = '#/salary';
                      }}
                      className="py-3 rounded-full bg-slate-900 text-cyan-300 font-black text-xs"
                    >
                      Open Agent Salary →
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTopic(null);
                        setViewMode('chat');
                        handleSendChat('I need Deshi Win Agent Consultation with a Teacher');
                      }}
                      className="py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs"
                    >
                      Ask Teacher Live
                    </button>
                  </div>
                </>
              )}

              {selectedTopic === 'telegram_cs' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-1.5 text-slate-700 leading-relaxed">
                    <div className="font-black text-sky-900">Official Telegram Customer Service:</div>
                    <p>Before messaging our Telegram officer, keep ready:</p>
                    <p>• Your UID: <strong className="font-mono">{user.uid || 'Guest'}</strong></p>
                    {adminSettings.supportPhone ? (
                      <p>• Support Line: <strong className="font-mono">{adminSettings.supportPhone}</strong></p>
                    ) : (
                      <p>• Support Channel: <strong className="font-mono">Official Live Chat &amp; Telegram</strong></p>
                    )}
                    <p>• Deposit/Withdrawal screenshot &amp; TRX ID</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {adminSettings.supportPhone ? (
                      <button
                        onClick={() => copyText(adminSettings.supportPhone || '', 'Support number copied!')}
                        className="py-3 rounded-full bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Phone</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedTopic(null);
                          setViewMode('chat');
                        }}
                        className="py-3 rounded-full bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center gap-1"
                      >
                        <span>Open Live Chat</span>
                      </button>
                    )}
                    <a
                      href={telegramAgentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 rounded-full bg-[#229ED9] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <span>Open Telegram</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </>
              )}

              {selectedTopic === 'apply_77_bonus' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-1.5 text-slate-700 leading-relaxed">
                    <div className="font-black text-cyan-800">How to Claim 200% Deposit Bonus:</div>
                    <p>1. Your account must be registered and logged in.</p>
                    <p>2. Complete a minimum deposit of <strong>৳200</strong> or enter an active 200% Deposit Bonus Gift Code in <strong>/gifts</strong>.</p>
                    <p>3. Submit your application below if you need support assistance activating your bonus.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedTopic(null);
                        setActiveTab('gifts');
                        window.location.hash = '#/gifts';
                      }}
                      className="py-3 rounded-full bg-slate-100 text-slate-800 font-black text-xs"
                    >
                      Open Gift Codes
                    </button>
                    <button
                      onClick={() => handleSubmitUrgentTicket(`Apply 200% Bonus (UID: ${user.uid || 'N/A'})`)}
                      className="py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-md flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apply Now</span>
                    </button>
                  </div>
                </>
              )}

              {selectedTopic === 'join_telegram_channel' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-1.5 text-slate-700 leading-relaxed">
                    <div className="font-black text-sky-900">Deshi Win Official Telegram Channel:</div>
                    <p>• Receive daily WinGo signal alerts &amp; Aviator streak highlights</p>
                    <p>• Get instant drops of limited-claim Gift Codes every day</p>
                    <p>• Stay notified of Deshi Win VIP &amp; Agent salary promotions</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => copyText(telegramChannelLink, 'Channel link copied!')}
                      className="py-3 rounded-full bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </button>
                    <a
                      href={telegramChannelLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 rounded-full bg-[#229ED9] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <span>Join Channel</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
