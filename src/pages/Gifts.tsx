import React, { useMemo, useState } from 'react';
import { useApp, normalizePhone } from '../context/AppContext';
import { Header } from '../components/Header';
import { Gift, Clock, CheckCircle2, Ticket, ArrowRight, Info } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { PinkGiftIllustration } from '../components/PinkActivityIllustrations';

export const Gifts: React.FC = () => {
  const { user, adminSettings, transactions, claimGiftCode, language, showToast, setActiveTab } = useApp();
  const [giftInput, setGiftInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const giftTransactions = transactions.filter((t) => t.userId === user.id && t.type === 'gift');
  const lastGiftTx = giftTransactions[0];
  const lastGiftTime = user.lastGiftClaimTime || lastGiftTx?.time || '';
  const lastGiftCode = user.lastGiftCode || '';
  const lastGiftAmount = user.lastGiftAmount ?? lastGiftTx?.amount;
  const lastGiftReason = user.lastGiftReason || '';

  const pendingBonusCodeObj = useMemo(() => {
    const pCode = String(user.pendingDepositBonusCode || '').trim().toUpperCase();
    if (!pCode) return null;
    return (
      adminSettings.activeGiftCodes.find((c) => c.code.toUpperCase() === pCode) || {
        code: pCode,
        depositBonusPercent: 200,
        reason: 'Deposit Gift Bonus Active'
      }
    );
  }, [user.pendingDepositBonusCode, adminSettings.activeGiftCodes]);

  // Show active UID-specific gift codes assigned specifically to this user
  const mySpecialOffers = useMemo(() => {
    const myUid = String(user.uid || '').trim().toUpperCase();
    if (!myUid) return [];
    const claimerKey = normalizePhone(user.phone || '') || user.id;
    const now = Date.now();
    return (adminSettings.activeGiftCodes || []).filter((gc) => {
      if (gc.active === false) return false;
      if (gc.expiresAt && gc.expiresAt > 0 && now > gc.expiresAt) return false;
      if ((gc.claimedCount || 0) >= (gc.maxClaims || 1)) return false;
      const targetRaw = String(gc.targetUid || '').trim().toUpperCase();
      if (!targetRaw || targetRaw === 'ALL') return false;
      const allowed = targetRaw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
      if (!allowed.includes(myUid)) return false;
      const claimedBy = Array.isArray(gc.claimedBy) ? gc.claimedBy : [];
      if (claimerKey && claimedBy.includes(claimerKey)) return false;
      return true;
    });
  }, [adminSettings.activeGiftCodes, user.uid, user.phone, user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRedeeming) return;
    if (!giftInput.trim()) {
      showToast('Please enter a gift code');
      return;
    }
    setIsRedeeming(true);
    try {
      const res = await claimGiftCode(giftInput);
      if (res.success) {
        setGiftInput('');
      } else {
        showToast(res.message);
      }
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Header
        title={getTranslation(language, 'gifts')}
        showBack
        onBack={() => {
          setActiveTab('activity');
          window.location.hash = '#/activity';
        }}
      />

      {/* Hero Gift Header */}
      <div className="bg-gradient-to-br from-[#0B2235] via-[#0E314A] to-[#0891B2] px-4 pt-5 pb-12 text-white rounded-b-[2rem] shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-20 h-16 rounded-2xl overflow-hidden border-2 border-white/40 shadow-md flex-shrink-0">
            <PinkGiftIllustration className="w-full h-full" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Gift Code Exchange</h2>
            <p className="text-xs text-cyan-100 mt-0.5 leading-relaxed">
              Redeem official Hney Win fixed rewards or Deposit Bonus codes (up to 200%+).
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-7 space-y-4">
        {/* Active Pending Deposit Bonus Banner */}
        {pendingBonusCodeObj && (
          <div className="bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] rounded-3xl p-4 text-white shadow-md border border-cyan-400/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-200">
                <Ticket className="w-3.5 h-3.5" />
                <span>Deposit Bonus Armed ({pendingBonusCodeObj.code})</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-300 text-slate-950 font-black text-[10px]">
                +{Number((pendingBonusCodeObj as any).depositBonusPercent || (pendingBonusCodeObj as any).amount || 200)}% BONUS
              </span>
            </div>
            {(pendingBonusCodeObj as any).reason || (pendingBonusCodeObj as any).note ? (
              <div className="text-xs text-cyan-100 font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-cyan-200" />
                <span>Reason: {(pendingBonusCodeObj as any).reason || (pendingBonusCodeObj as any).note}</span>
              </div>
            ) : null}
            <p className="text-[11px] text-cyan-50/90 leading-relaxed">
              Complete a deposit now — once approved,{' '}
              <strong>+{Number((pendingBonusCodeObj as any).depositBonusPercent || 200)}% of your deposit amount</strong> will auto-credit to your balance!
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="w-full py-2.5 rounded-xl bg-white text-cyan-800 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
            >
              <span>Deposit Now &amp; Claim Bonus</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Redeem Box */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
            <Ticket className="w-4 h-4 text-cyan-600" />
            <span>Redeem Promotion Code</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={giftInput}
              onChange={(e) => setGiftInput(e.target.value)}
              placeholder="Enter gift code (e.g. HNEYWINVIP)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-extrabold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase tracking-wider"
            />
            <button
              type="submit"
              disabled={isRedeeming}
              className="w-full min-h-[48px] py-3.5 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-sm active:scale-98 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4" />
              <span>{isRedeeming ? 'Verifying Code...' : getTranslation(language, 'receive')}</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Each active code can only be redeemed once per user. Deposit bonus codes can be activated before depositing or claimed right after deposit approval.
          </p>
        </div>

        {/* Personal UID-Targeted Gift Offers from Admin */}
        {mySpecialOffers.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-cyan-700">
              <Gift className="w-4 h-4 text-cyan-600" />
              <span>Exclusive Gift Offers for Your UID</span>
            </div>
            <div className="space-y-2">
              {mySpecialOffers.map((offer) => {
                const isDepPct = offer.rewardType === 'deposit_percent';
                const pct = Number(offer.depositBonusPercent || offer.amount || 200);
                const reasonLabel = offer.reason || offer.note || (isDepPct ? `${pct}% Deposit Bonus` : 'Special VIP Reward');
                return (
                  <div
                    key={offer.code}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-slate-900">{offer.code}</span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-700 font-black text-[10px]">
                          {isDepPct ? `${pct}% DEPOSIT BONUS` : `৳${Number(offer.amount).toFixed(0)}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5 font-semibold">
                        Reason: {reasonLabel}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGiftInput(offer.code)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-[11px] flex-shrink-0 active:scale-95"
                    >
                      Use
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Last Gift Code Status */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-900">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Last Gift Code Received</span>
            </span>
          </div>
          {lastGiftTime ? (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">
                  {lastGiftCode ? `Code: ${lastGiftCode}` : 'Gift Reward'}
                </div>
                {lastGiftReason && (
                  <div className="text-[11px] text-cyan-700 font-bold mt-0.5">
                    Reason: {lastGiftReason}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{lastGiftTime}</div>
              </div>
              {lastGiftAmount !== undefined && (
                <div className="font-black text-emerald-600 font-mono text-sm tabular-nums flex-shrink-0">
                  +৳{Number(lastGiftAmount).toFixed(2)}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 text-center text-xs text-slate-400">
              No gift code claimed yet
            </div>
          )}
        </div>

        {/* Gift Code Claim History */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
            <Clock className="w-4 h-4 text-cyan-600" />
            <span>Claim History</span>
          </div>

          {giftTransactions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Your redeemed gift codes will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {giftTransactions.map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                  <div className="min-w-0 pr-2">
                    <div className="font-extrabold text-slate-900 truncate">{tx.title}</div>
                    <div className="text-[11px] text-cyan-700 font-semibold truncate">{tx.detail}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.time}</div>
                  </div>
                  <div className="font-black text-emerald-600 font-mono tabular-nums flex-shrink-0">
                    +৳{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
