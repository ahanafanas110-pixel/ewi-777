import React, { useMemo, useState } from 'react';
import { ArrowLeft, Trophy, CheckCircle2, Clock, XCircle, Plus, CircleDot } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { SportsMatch } from '../types';

export const SportsBetting: React.FC = () => {
  const {
    user,
    setActiveTab,
    sportsMatches,
    sportsBets,
    placeSportsBet,
    showToast
  } = useApp();

  const [sportFilter, setSportFilter] = useState<'all' | 'cricket' | 'football'>('all');
  const [selectedSlip, setSelectedSlip] = useState<{
    match: SportsMatch;
    side: 'teamA' | 'teamB';
  } | null>(null);
  const [stakeInput, setStakeInput] = useState<string>('100');
  const [submitting, setSubmitting] = useState(false);

  const filteredMatches = useMemo(() => {
    const orderRank = (s: SportsMatch['status']) => (s === 'live' ? 0 : s === 'upcoming' ? 1 : 2);
    return [...sportsMatches]
      .filter((m) => sportFilter === 'all' || m.sport === sportFilter)
      .sort((a, b) => {
        const dr = orderRank(a.status) - orderRank(b.status);
        if (dr !== 0) return dr;
        return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
      });
  }, [sportsMatches, sportFilter]);

  const userBets = useMemo(
    () => sportsBets.filter((b) => b.userId === user.id),
    [sportsBets, user.id]
  );

  const liveCount = sportsMatches.filter((m) => m.status === 'live').length;
  const cricketCount = sportsMatches.filter((m) => m.sport === 'cricket').length;
  const footballCount = sportsMatches.filter((m) => m.sport === 'football').length;

  const cleanStake = Math.max(0, Number(stakeInput) || 0);
  const selectedOdds = selectedSlip
    ? selectedSlip.side === 'teamA'
      ? Number(selectedSlip.match.teamAOdds)
      : Number(selectedSlip.match.teamBOdds)
    : 1;
  const selectedTeamName = selectedSlip
    ? selectedSlip.side === 'teamA'
      ? selectedSlip.match.teamA
      : selectedSlip.match.teamB
    : '';
  const estimatedReturn = +(cleanStake * selectedOdds).toFixed(2);

  const handleConfirmBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlip || submitting) return;
    if (cleanStake < 10 || cleanStake > 50000) {
      showToast('Bet amount must be between ৳10 and ৳50,000');
      return;
    }
    setSubmitting(true);
    try {
      const res = await placeSportsBet(selectedSlip.match.id, selectedSlip.side, cleanStake);
      showToast(res.message);
      if (res.success) {
        setSelectedSlip(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-cyan-100 px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-slate-900 truncate">Live Sports</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-black uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {liveCount} Live
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-500 truncate">
              Cricket &amp; Football • Team Win Only (Auto Payout)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-cyan-50 border border-cyan-200">
            <span className="text-[11px] font-black text-cyan-800 tabular-nums">
              ৳{Number(user.balance || 0).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('deposit')}
              className="w-5 h-5 rounded-full bg-[#0891B2] text-white flex items-center justify-center"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-3.5 pt-3 space-y-4">
        {/* Info Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#ECFEFF] via-white to-[#F0FDFA] border border-cyan-200 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black text-cyan-900">Team-Only Winner Market</div>
            <p className="text-[11px] text-slate-600 font-medium">
              Pick Team A or Team B directly. Winnings auto-credit to your wallet immediately on match result.
            </p>
          </div>
          <Trophy className="w-8 h-8 text-amber-500 flex-shrink-0" />
        </div>

        {/* Sport Filter Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setSportFilter('all')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              sportFilter === 'all'
                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({sportsMatches.length})
          </button>
          <button
            type="button"
            onClick={() => setSportFilter('cricket')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              sportFilter === 'cricket'
                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Cricket ({cricketCount})
          </button>
          <button
            type="button"
            onClick={() => setSportFilter('football')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              sportFilter === 'football'
                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Football ({footballCount})
          </button>
        </div>

        {/* Matches Feed */}
        <div className="space-y-3">
          {filteredMatches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500 font-semibold">
              No matches available right now. Check back soon!
            </div>
          ) : (
            filteredMatches.map((m) => {
              const isFinished = m.status === 'finished';
              const isSelectedA = selectedSlip?.match.id === m.id && selectedSlip.side === 'teamA';
              const isSelectedB = selectedSlip?.match.id === m.id && selectedSlip.side === 'teamB';

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3"
                >
                  {/* Top Meta */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          m.sport === 'cricket'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {m.sport === 'cricket' ? 'Cricket' : 'Football'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 truncate">{m.league}</span>
                    </div>

                    {m.status === 'live' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-black uppercase flex-shrink-0">
                        <CircleDot className="w-2.5 h-2.5 animate-pulse" />
                        LIVE
                      </span>
                    ) : m.status === 'upcoming' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase flex-shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {m.startTime}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase flex-shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        FINISHED
                      </span>
                    )}
                  </div>

                  {/* Teams & Live Scoreboard */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 min-w-0 truncate">
                        {m.teamA}
                        {m.winner === 'teamA' && (
                          <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </span>
                      <span className="text-xs font-mono font-black text-[#0891B2] flex-shrink-0">
                        {m.scoreA || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 min-w-0 truncate">
                        {m.teamB}
                        {m.winner === 'teamB' && (
                          <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </span>
                      <span className="text-xs font-mono font-black text-[#0891B2] flex-shrink-0">
                        {m.scoreB || '-'}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>{m.statusText || 'Match Active'}</span>
                      <span className="text-cyan-700 uppercase">Pick Winner Only</span>
                    </div>
                  </div>

                  {/* Strictly Two Team Win Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isFinished}
                      onClick={() => setSelectedSlip({ match: m, side: 'teamA' })}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                        isFinished
                          ? m.winner === 'teamA'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : isSelectedA
                          ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] border-[#0891B2] text-white shadow-sm'
                          : 'bg-cyan-50/60 hover:bg-cyan-50 border-cyan-200 text-slate-900 active:scale-98'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`text-[9px] font-bold uppercase ${isSelectedA ? 'text-cyan-100' : 'text-slate-500'}`}>
                          Team A Win
                        </div>
                        <div className="text-xs font-black truncate">{m.teamA}</div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-black flex-shrink-0 ${
                          isSelectedA ? 'bg-white/20 text-white' : 'bg-white border border-cyan-200 text-[#0891B2]'
                        }`}
                      >
                        {Number(m.teamAOdds || 1.85).toFixed(2)}x
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isFinished}
                      onClick={() => setSelectedSlip({ match: m, side: 'teamB' })}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                        isFinished
                          ? m.winner === 'teamB'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : isSelectedB
                          ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] border-[#0891B2] text-white shadow-sm'
                          : 'bg-cyan-50/60 hover:bg-cyan-50 border-cyan-200 text-slate-900 active:scale-98'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`text-[9px] font-bold uppercase ${isSelectedB ? 'text-cyan-100' : 'text-slate-500'}`}>
                          Team B Win
                        </div>
                        <div className="text-xs font-black truncate">{m.teamB}</div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-black flex-shrink-0 ${
                          isSelectedB ? 'bg-white/20 text-white' : 'bg-white border border-cyan-200 text-[#0891B2]'
                        }`}
                      >
                        {Number(m.teamBOdds || 1.95).toFixed(2)}x
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* My Team Bet Slips */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide">My Sports Slips</h2>
            <span className="text-[10px] font-bold text-slate-500">{userBets.length} Total</span>
          </div>
          {userBets.length === 0 ? (
            <div className="text-center py-5 text-[11px] text-slate-500 font-medium">
              Tap any team above to place your first live Cricket or Football team bet.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
              {userBets.slice(0, 25).map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                        {b.sport}
                      </span>
                      <span className="font-black text-slate-900 truncate">{b.teamName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {b.matchTitle} • {b.odds.toFixed(2)}x • {b.time}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-black text-slate-900">৳{Number(b.amount).toFixed(0)}</div>
                    {b.status === 'won' ? (
                      <div className="text-[10px] font-black text-emerald-600 inline-flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        +৳{Number(b.winAmount || b.potentialWin).toFixed(2)}
                      </div>
                    ) : b.status === 'lost' ? (
                      <div className="text-[10px] font-black text-rose-500 inline-flex items-center gap-0.5">
                        <XCircle className="w-3 h-3" />
                        Lost
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-amber-600">
                        Est ৳{Number(b.potentialWin).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Bet Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <form
            onSubmit={handleConfirmBet}
            className="bg-white border border-cyan-200 rounded-3xl w-full max-w-md p-4 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <div className="text-[10px] font-black uppercase text-[#0891B2]">
                  {selectedSlip.match.sport === 'cricket' ? 'Cricket Team Win' : 'Football Team Win'}
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {selectedTeamName} @ {selectedOdds.toFixed(2)}x
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold">
                  {selectedSlip.match.teamA} vs {selectedSlip.match.teamB}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                Stake Amount (৳10 – ৳50,000)
              </label>
              <input
                type="number"
                min={10}
                max={50000}
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-black text-base text-slate-900 focus:outline-none focus:border-[#0891B2]"
              />
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {[50, 100, 500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStakeInput(String(amt))}
                    className={`py-1.5 rounded-lg text-[11px] font-black border ${
                      Number(stakeInput) === amt
                        ? 'bg-cyan-50 border-[#0891B2] text-[#0891B2]'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    ৳{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-800">Auto-Credit Win Payout</span>
              <span className="font-mono font-black text-sm text-emerald-700">৳{estimatedReturn.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-md active:scale-99 transition-all disabled:opacity-60"
            >
              {submitting ? 'Placing Bet...' : `Confirm Team Bet • ৳${cleanStake.toFixed(0)}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
