import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Trophy,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Flame,
  Shield,
  TrendingUp,
  Ticket,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { SportsMatch } from '../types';

const TEAM_PALETTES: Array<{ primary: string; secondary: string; accent: string }> = [
  { primary: '#047857', secondary: '#064E3B', accent: '#34D399' },
  { primary: '#1D4ED8', secondary: '#1E3A8A', accent: '#60A5FA' },
  { primary: '#B91C1C', secondary: '#7F1D1D', accent: '#F87171' },
  { primary: '#B45309', secondary: '#78350F', accent: '#FBBF24' },
  { primary: '#0369A1', secondary: '#0C4A6E', accent: '#38BDF8' },
  { primary: '#6D28D9', secondary: '#4C1D95', accent: '#A78BFA' }
];

function getTeamTheme(name: string) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('bangladesh')) return { primary: '#006A4E', secondary: '#004A36', accent: '#F42A41' };
  if (lower.includes('india')) return { primary: '#1D4ED8', secondary: '#1E3A8A', accent: '#F97316' };
  if (lower.includes('australia')) return { primary: '#CA8A04', secondary: '#065F46', accent: '#FDE047' };
  if (lower.includes('england')) return { primary: '#1E40AF', secondary: '#0F172A', accent: '#EF4444' };
  if (lower.includes('real madrid')) return { primary: '#334155', secondary: '#0F172A', accent: '#FBBF24' };
  if (lower.includes('barcelona')) return { primary: '#991B1B', secondary: '#1E3A8A', accent: '#F59E0B' };
  if (lower.includes('manchester')) return { primary: '#0284C7', secondary: '#075985', accent: '#BAE6FD' };
  if (lower.includes('arsenal')) return { primary: '#DC2626', secondary: '#7F1D1D', accent: '#FDE68A' };
  if (lower.includes('argentina')) return { primary: '#0EA5E9', secondary: '#0369A1', accent: '#F8FAFC' };
  if (lower.includes('brazil')) return { primary: '#EAB308', secondary: '#15803D', accent: '#FEF08A' };
  if (lower.includes('comilla')) return { primary: '#DC2626', secondary: '#7F1D1D', accent: '#FBBF24' };
  if (lower.includes('sylhet')) return { primary: '#059669', secondary: '#064E3B', accent: '#6EE7B7' };

  let hash = 0;
  for (let i = 0; i < lower.length; i++) hash = (hash * 31 + lower.charCodeAt(i)) | 0;
  return TEAM_PALETTES[Math.abs(hash) % TEAM_PALETTES.length];
}

function getTeamCode(name: string): string {
  const words = (name || 'TM').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return (words[0] || 'TM').slice(0, 3).toUpperCase();
}

const TeamCrest: React.FC<{ name: string; sport: 'cricket' | 'football'; size?: 'sm' | 'md' | 'lg'; isWinner?: boolean }> = ({
  name,
  sport,
  size = 'md',
  isWinner = false
}) => {
  const theme = getTeamTheme(name);
  const code = getTeamCode(name);
  const dims = size === 'lg' ? 'w-12 h-12 text-xs' : size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-10 h-10 text-[11px]';

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <div
        className={`${dims} rounded-2xl flex items-center justify-center font-black text-white shadow-md relative overflow-hidden border border-white/25`}
        style={{
          background: `linear-gradient(145deg, ${theme.primary}, ${theme.secondary})`
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5 opacity-90"
          style={{ backgroundColor: theme.accent }}
        />
        <span className="tracking-tight relative z-10 drop-shadow-xs">{code}</span>
        {sport === 'cricket' ? (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white/15" />
        ) : (
          <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-white/15" />
        )}
      </div>
      {isWinner && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm ring-2 ring-white">
          <Trophy className="w-2.5 h-2.5 stroke-[2.6]" />
        </span>
      )}
    </div>
  );
};

const CricketIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M16.5 3.5L20.5 7.5L10.5 17.5L6.5 13.5L16.5 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M6.5 13.5L3.5 20.5L10.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="17.5" cy="17.5" r="2.5" fill="currentColor" />
  </svg>
);

const FootballIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7.5L15.5 10.2L14.2 14.5H9.8L8.5 10.2L12 7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 3V7.5M15.5 10.2L20.5 9M14.2 14.5L17.5 19M9.8 14.5L6.5 19M8.5 10.2L3.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Live Broadcast Pitch Graphic for Cricket & Football */
const LivePitchRadar: React.FC<{ match: SportsMatch; pulseStep: number }> = ({ match, pulseStep }) => {
  const isLive = match.status === 'live';
  const ballOffset = (pulseStep % 4) * 14;

  if (match.sport === 'cricket') {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#042F22] via-[#064E3B] to-[#022C22] border border-emerald-400/25 p-2.5">
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-emerald-200/90 mb-1.5">
          <span className="inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
            {isLive ? 'Live Ground Tracker' : match.status === 'upcoming' ? 'Match Preview' : 'Full Time Ground'}
          </span>
          <span className="font-mono text-amber-300">{match.statusText || 'Live Innings'}</span>
        </div>

        <svg viewBox="0 0 320 96" className="w-full h-[78px] block">
          {/* Outer Cricket Stadium Oval */}
          <ellipse cx="160" cy="48" rx="148" ry="42" fill="#065F46" stroke="#34D399" strokeOpacity="0.45" strokeWidth="1.5" />
          <ellipse cx="160" cy="48" rx="116" ry="33" fill="#047857" stroke="#A7F3D0" strokeOpacity="0.25" strokeDasharray="4 4" strokeWidth="1" />
          {/* 30-Yard Inner Ring */}
          <ellipse cx="160" cy="48" rx="72" ry="22" fill="#059669" fillOpacity="0.45" stroke="#ECFDF5" strokeOpacity="0.45" strokeDasharray="3 3" strokeWidth="1" />
          {/* Center Clay Pitch */}
          <rect x="132" y="39" width="56" height="18" rx="4" fill="#D6B47B" stroke="#FEF3C7" strokeWidth="0.9" />
          {/* Batting Creases & Wickets */}
          <line x1="140" y1="40" x2="140" y2="56" stroke="#FFFFFF" strokeWidth="1" />
          <line x1="180" y1="40" x2="180" y2="56" stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="137" cy="48" r="1.4" fill="#1E293B" />
          <circle cx="183" cy="48" r="1.4" fill="#1E293B" />
          {/* Boundary Shot Trajectory Animation when Live */}
          {isLive && (
            <>
              <path
                d={`M 178 48 Q ${210 + ballOffset} 18 ${256 + (pulseStep % 2) * 16} ${30 + (pulseStep % 3) * 10}`}
                fill="none"
                stroke="#FDE047"
                strokeWidth="1.6"
                strokeDasharray="3 3"
              />
              <circle
                cx={236 + (pulseStep % 3) * 14}
                cy={32 + (pulseStep % 2) * 18}
                r="4"
                fill="#EF4444"
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
            </>
          )}
          {/* Fielders Dots */}
          <circle cx="96" cy="30" r="2.2" fill="#E2E8F0" />
          <circle cx="112" cy="66" r="2.2" fill="#E2E8F0" />
          <circle cx="212" cy="28" r="2.2" fill="#E2E8F0" />
          <circle cx="222" cy="64" r="2.2" fill="#E2E8F0" />
          <circle cx="160" cy="20" r="2.2" fill="#E2E8F0" />
        </svg>
      </div>
    );
  }

  // Football Striped Pitch
  const atkSide = pulseStep % 2 === 0 ? 1 : -1;
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#072E21] via-[#0B4631] to-[#052319] border border-emerald-400/25 p-2.5">
      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-emerald-200/90 mb-1.5">
        <span className="inline-flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-rose-400 animate-ping' : 'bg-slate-400'}`} />
          {isLive ? (atkSide > 0 ? `${getTeamCode(match.teamA)} Attacking` : `${getTeamCode(match.teamB)} Pressing`) : match.statusText}
        </span>
        <span className="font-mono text-amber-300">{match.statusText || 'Live Match'}</span>
      </div>

      <svg viewBox="0 0 320 96" className="w-full h-[78px] block">
        {/* Alternating Mowed Pitch Stripes */}
        <rect x="10" y="6" width="300" height="84" rx="6" fill="#065F46" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
          <rect
            key={idx}
            x={10 + idx * 37.5}
            y="6"
            width="37.5"
            height="84"
            fill={idx % 2 === 0 ? '#047857' : '#065F46'}
          />
        ))}
        {/* Pitch White Lines */}
        <rect x="10" y="6" width="300" height="84" rx="4" fill="none" stroke="#ECFDF5" strokeOpacity="0.65" strokeWidth="1.4" />
        <line x1="160" y1="6" x2="160" y2="90" stroke="#ECFDF5" strokeOpacity="0.65" strokeWidth="1.4" />
        <circle cx="160" cy="48" r="18" fill="none" stroke="#ECFDF5" strokeOpacity="0.65" strokeWidth="1.3" />
        <circle cx="160" cy="48" r="2" fill="#ECFDF5" />
        {/* Left & Right Penalty Areas */}
        <rect x="10" y="24" width="36" height="48" fill="none" stroke="#ECFDF5" strokeOpacity="0.65" strokeWidth="1.3" />
        <rect x="10" y="35" width="14" height="26" fill="none" stroke="#ECFDF5" strokeOpacity="0.65" strokeWidth="1.2" />
        <rect x="274" y="24" width="36" height="48" fill="none" stroke="#ECFDF5" strokeOpacity="0.65" strokeWidth="1.3" />
        <rect x="296" y="35" width="14" height="26" fill="none" stroke="#ECFDF5" strokeOpacity="0.65" strokeWidth="1.2" />
        {/* Live Ball & Passing Pulse */}
        {isLive && (
          <>
            <circle
              cx={160 + atkSide * (48 + (pulseStep % 3) * 18)}
              cy={48 + ((pulseStep % 3) - 1) * 14}
              r="11"
              fill="#FDE047"
              fillOpacity="0.18"
            />
            <circle
              cx={160 + atkSide * (48 + (pulseStep % 3) * 18)}
              cy={48 + ((pulseStep % 3) - 1) * 14}
              r="4.2"
              fill="#FFFFFF"
              stroke="#0F172A"
              strokeWidth="1.2"
            />
          </>
        )}
      </svg>
    </div>
  );
};

export const SportsBetting: React.FC = () => {
  const {
    user,
    setActiveTab,
    goBack,
    sportsMatches,
    sportsBets,
    placeSportsBet,
    showToast
  } = useApp();

  const [sportFilter, setSportFilter] = useState<'all' | 'cricket' | 'football'>('all');
  const [sectionTab, setSectionTab] = useState<'markets' | 'slips'>('markets');
  const [expandedPitchId, setExpandedPitchId] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<{
    match: SportsMatch;
    side: 'teamA' | 'teamB';
  } | null>(null);
  const [stakeInput, setStakeInput] = useState<string>('100');
  const [submitting, setSubmitting] = useState(false);
  const [pulseStep, setPulseStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPulseStep((s) => (s + 1) % 12), 2200);
    return () => clearInterval(id);
  }, []);

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

  const featuredLiveMatch = useMemo(() => {
    return (
      filteredMatches.find((m) => m.status === 'live') ||
      filteredMatches[0] ||
      null
    );
  }, [filteredMatches]);

  const userBets = useMemo(
    () => sportsBets.filter((b) => b.userId === user.id),
    [sportsBets, user.id]
  );

  const pendingBetsCount = userBets.filter((b) => b.status === 'pending').length;
  const totalWonAmount = userBets
    .filter((b) => b.status === 'won')
    .reduce((sum, b) => sum + Number(b.winAmount || b.potentialWin || 0), 0);

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

  const renderOddsBar = (oddsA: number, oddsB: number) => {
    const pA = 1 / Math.max(1.05, oddsA);
    const pB = 1 / Math.max(1.05, oddsB);
    const pctA = Math.round((pA / (pA + pB)) * 100);
    const pctB = 100 - pctA;
    return { pctA, pctB };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      {/* Broadcast Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-cyan-100 px-3 py-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => goBack('home')}
            className="relative z-20 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all cursor-pointer flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-slate-900 truncate tracking-tight">DESHI SPORTSBOOK</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-black uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {liveCount} Live
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-500 truncate">
              Cricket &amp; Football • Team Win Auto-Payout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(user.lockedBalance || 0) > 0 && (
            <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-800 tabular-nums">
              Hold ৳{(user.lockedBalance || 0).toFixed(0)}
            </span>
          )}
          <div className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-cyan-50 border border-cyan-200">
            <span className="text-[11px] font-black text-cyan-800 tabular-nums">
              ৳{Math.max(0, Number(user.balance || 0) - Math.max(0, Number(user.lockedBalance || 0))).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('deposit')}
              className="w-5 h-5 rounded-full bg-[#0891B2] text-white flex items-center justify-center active:scale-90"
              aria-label="Deposit"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-3.5 pt-3 space-y-3.5">
        {/* Featured Stadium Broadcast Hero Card */}
        {featuredLiveMatch && (
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#061822] via-[#0B2D3D] to-[#083B2E] text-white border border-cyan-500/30 shadow-xl p-4 space-y-3">
            {/* Stadium Top Spotlight */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] font-black uppercase text-amber-300">
                  {featuredLiveMatch.sport === 'cricket' ? <CricketIcon className="w-3 h-3" /> : <FootballIcon className="w-3 h-3" />}
                  <span>Featured {featuredLiveMatch.sport}</span>
                </span>
                <span className="text-[11px] font-bold text-cyan-100/90 truncate">{featuredLiveMatch.league}</span>
              </div>

              {featuredLiveMatch.status === 'live' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE TV
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[9px] font-black uppercase">
                  <Clock className="w-2.5 h-2.5" />
                  {featuredLiveMatch.startTime}
                </span>
              )}
            </div>

            {/* Teams Head-to-Head Scoreboard */}
            <div className="grid grid-cols-7 items-center gap-2 py-1">
              <div className="col-span-3 flex flex-col items-center text-center gap-1.5">
                <TeamCrest
                  name={featuredLiveMatch.teamA}
                  sport={featuredLiveMatch.sport}
                  size="lg"
                  isWinner={featuredLiveMatch.winner === 'teamA'}
                />
                <div className="text-xs font-black leading-tight line-clamp-2">{featuredLiveMatch.teamA}</div>
                <div className="text-sm font-mono font-black text-cyan-300 tabular-nums">
                  {featuredLiveMatch.scoreA || '-'}
                </div>
              </div>

              <div className="col-span-1 flex flex-col items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-black text-amber-300">
                  VS
                </span>
              </div>

              <div className="col-span-3 flex flex-col items-center text-center gap-1.5">
                <TeamCrest
                  name={featuredLiveMatch.teamB}
                  sport={featuredLiveMatch.sport}
                  size="lg"
                  isWinner={featuredLiveMatch.winner === 'teamB'}
                />
                <div className="text-xs font-black leading-tight line-clamp-2">{featuredLiveMatch.teamB}</div>
                <div className="text-sm font-mono font-black text-cyan-300 tabular-nums">
                  {featuredLiveMatch.scoreB || '-'}
                </div>
              </div>
            </div>

            {/* Live Pitch Radar Graphic */}
            <LivePitchRadar match={featuredLiveMatch} pulseStep={pulseStep} />

            {/* Hero Quick Team Bet Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                disabled={featuredLiveMatch.status === 'finished'}
                onClick={() => setSelectedSlip({ match: featuredLiveMatch, side: 'teamA' })}
                className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 flex items-center justify-between gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                <span className="text-[11px] font-black truncate">{featuredLiveMatch.teamA}</span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono text-xs font-black flex-shrink-0">
                  {Number(featuredLiveMatch.teamAOdds || 1.85).toFixed(2)}x
                </span>
              </button>
              <button
                type="button"
                disabled={featuredLiveMatch.status === 'finished'}
                onClick={() => setSelectedSlip({ match: featuredLiveMatch, side: 'teamB' })}
                className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 flex items-center justify-between gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                <span className="text-[11px] font-black truncate">{featuredLiveMatch.teamB}</span>
                <span className="px-2 py-0.5 rounded-lg bg-cyan-400 text-slate-950 font-mono text-xs font-black flex-shrink-0">
                  {Number(featuredLiveMatch.teamBOdds || 1.95).toFixed(2)}x
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Markets vs My Slips Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setSectionTab('markets')}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              sectionTab === 'markets'
                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Live Markets ({filteredMatches.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSectionTab('slips')}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              sectionTab === 'slips'
                ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Slips ({userBets.length})</span>
            {pendingBetsCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${sectionTab === 'slips' ? 'bg-white text-cyan-800' : 'bg-amber-100 text-amber-700'}`}>
                {pendingBetsCount}
              </span>
            )}
          </button>
        </div>

        {sectionTab === 'markets' && (
          <>
            {/* Sport Filter Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSportFilter('all')}
                className={`py-2.5 px-2 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                  sportFilter === 'all'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>All ({sportsMatches.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSportFilter('cricket')}
                className={`py-2.5 px-2 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                  sportFilter === 'cricket'
                    ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                <CricketIcon className="w-3.5 h-3.5" />
                <span>Cricket ({cricketCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSportFilter('football')}
                className={`py-2.5 px-2 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                  sportFilter === 'football'
                    ? 'bg-sky-700 border-sky-700 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300'
                }`}
              >
                <FootballIcon className="w-3.5 h-3.5" />
                <span>Football ({footballCount})</span>
              </button>
            </div>

            {/* Match Cards Feed */}
            <div className="space-y-3">
              {filteredMatches.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500 font-semibold">
                  No matches available right now. Check back soon!
                </div>
              ) : (
                filteredMatches.map((m) => {
                  const isFinished = m.status === 'finished';
                  const isSelectedA = selectedSlip?.match.id === m.id && selectedSlip.side === 'teamA';
                  const isSelectedB = selectedSlip?.match.id === m.id && selectedSlip.side === 'teamB';
                  const oddsA = Number(m.teamAOdds || 1.85);
                  const oddsB = Number(m.teamBOdds || 1.95);
                  const { pctA, pctB } = renderOddsBar(oddsA, oddsB);
                  const isExpanded = expandedPitchId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={`bg-white rounded-3xl border p-3.5 shadow-xs space-y-3 transition-all ${
                        m.status === 'live'
                          ? 'border-cyan-200 ring-1 ring-cyan-100/80'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* League & Status Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              m.sport === 'cricket'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {m.sport === 'cricket' ? (
                              <CricketIcon className="w-2.5 h-2.5" />
                            ) : (
                              <FootballIcon className="w-2.5 h-2.5" />
                            )}
                            {m.sport}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 truncate">{m.league}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {m.status === 'live' && (
                            <button
                              type="button"
                              onClick={() => setExpandedPitchId(isExpanded ? null : m.id)}
                              className="px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[9px] font-black uppercase"
                            >
                              {isExpanded ? 'Hide Field' : 'Live Field'}
                            </button>
                          )}
                          {m.status === 'live' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-black uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                              LIVE
                            </span>
                          ) : m.status === 'upcoming' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase">
                              <Clock className="w-2.5 h-2.5" />
                              {m.startTime}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              FINAL
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Broadcast Match Scoreboard Box */}
                      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/40 border border-slate-200/80 p-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TeamCrest
                              name={m.teamA}
                              sport={m.sport}
                              size="md"
                              isWinner={m.winner === 'teamA'}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 truncate">{m.teamA}</div>
                              <div className="text-[10px] font-semibold text-slate-500">Home / Team A</div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono font-black text-[#0891B2] tabular-nums flex-shrink-0">
                            {m.scoreA || '-'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TeamCrest
                              name={m.teamB}
                              sport={m.sport}
                              size="md"
                              isWinner={m.winner === 'teamB'}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 truncate">{m.teamB}</div>
                              <div className="text-[10px] font-semibold text-slate-500">Away / Team B</div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono font-black text-[#0891B2] tabular-nums flex-shrink-0">
                            {m.scoreB || '-'}
                          </span>
                        </div>

                        {/* Implied Win Probability Bar */}
                        <div className="space-y-1 pt-1 border-t border-slate-200/70">
                          <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase">
                            <span className="text-cyan-800">{getTeamCode(m.teamA)} {pctA}%</span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <TrendingUp className="w-2.5 h-2.5 text-cyan-600" />
                              {m.statusText || 'Match Active'}
                            </span>
                            <span className="text-teal-800">{pctB}% {getTeamCode(m.teamB)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden flex">
                            <div
                              className="bg-gradient-to-r from-[#0891B2] to-[#06B6D4] transition-all"
                              style={{ width: `${pctA}%` }}
                            />
                            <div
                              className="bg-gradient-to-r from-[#14B8A6] to-[#0D9488] transition-all"
                              style={{ width: `${pctB}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Optional Expandable Pitch Radar on Match Card */}
                      {isExpanded && <LivePitchRadar match={m} pulseStep={pulseStep} />}

                      {/* Strictly Team A vs Team B Win Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isFinished}
                          onClick={() => setSelectedSlip({ match: m, side: 'teamA' })}
                          className={`min-h-[48px] p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                            isFinished
                              ? m.winner === 'teamA'
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : isSelectedA
                              ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] border-[#0891B2] text-white shadow-md'
                              : 'bg-cyan-50/70 hover:bg-cyan-50 border-cyan-200 text-slate-900 active:scale-98'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className={`text-[9px] font-bold uppercase ${isSelectedA ? 'text-cyan-100' : 'text-slate-500'}`}>
                              {m.winner === 'teamA' ? 'Winner' : 'Pick Team'}
                            </div>
                            <div className="text-xs font-black truncate">{m.teamA}</div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-xl text-xs font-mono font-black flex-shrink-0 ${
                              isSelectedA ? 'bg-white/20 text-white' : 'bg-white border border-cyan-200 text-[#0891B2]'
                            }`}
                          >
                            {oddsA.toFixed(2)}x
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={isFinished}
                          onClick={() => setSelectedSlip({ match: m, side: 'teamB' })}
                          className={`min-h-[48px] p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                            isFinished
                              ? m.winner === 'teamB'
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : isSelectedB
                              ? 'bg-gradient-to-r from-[#0891B2] to-[#0D9488] border-[#0891B2] text-white shadow-md'
                              : 'bg-cyan-50/70 hover:bg-cyan-50 border-cyan-200 text-slate-900 active:scale-98'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className={`text-[9px] font-bold uppercase ${isSelectedB ? 'text-cyan-100' : 'text-slate-500'}`}>
                              {m.winner === 'teamB' ? 'Winner' : 'Pick Team'}
                            </div>
                            <div className="text-xs font-black truncate">{m.teamB}</div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-xl text-xs font-mono font-black flex-shrink-0 ${
                              isSelectedB ? 'bg-white/20 text-white' : 'bg-white border border-cyan-200 text-[#0891B2]'
                            }`}
                          >
                            {oddsB.toFixed(2)}x
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* My Sports Slips Section */}
        {sectionTab === 'slips' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Total Slips</div>
                <div className="text-base font-black text-slate-900 tabular-nums">{userBets.length}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Pending</div>
                <div className="text-base font-black text-amber-600 tabular-nums">{pendingBetsCount}</div>
              </div>
              <div className="bg-white rounded-2xl border border-emerald-200 p-3 text-center">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Won Payout</div>
                <div className="text-base font-black text-emerald-600 tabular-nums">৳{totalWonAmount.toFixed(0)}</div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide">Sports Ticket History</h2>
                <span className="text-[10px] font-bold text-cyan-700">Auto-Credit Enabled</span>
              </div>

              {userBets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-medium space-y-2">
                  <Trophy className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Tap any Cricket or Football team to place your first winning ticket.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
                  {userBets.slice(0, 30).map((b) => (
                    <div
                      key={b.id}
                      className={`rounded-2xl border p-3 flex items-center justify-between gap-2 text-xs ${
                        b.status === 'won'
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : b.status === 'lost'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-cyan-50/50 border-cyan-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <TeamCrest name={b.teamName} sport={b.sport} size="sm" isWinner={b.status === 'won'} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-cyan-800">
                              {b.sport}
                            </span>
                            <span className="font-black text-slate-900 truncate">{b.teamName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {b.matchTitle} • {b.odds.toFixed(2)}x • {b.time}
                          </div>
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
        )}
      </div>

      {/* Team Bet Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <form
            onSubmit={handleConfirmBet}
            className="bg-white border border-cyan-200 rounded-3xl w-full max-w-md p-4 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <TeamCrest name={selectedTeamName} sport={selectedSlip.match.sport} size="md" />
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase text-[#0891B2] flex items-center gap-1">
                    {selectedSlip.match.sport === 'cricket' ? 'Cricket Team Win' : 'Football Team Win'}
                  </div>
                  <h3 className="text-sm font-black text-slate-900 truncate">
                    {selectedTeamName} @ {selectedOdds.toFixed(2)}x
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">
                    {selectedSlip.match.teamA} vs {selectedSlip.match.teamB}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
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
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-black text-base text-slate-900 focus:outline-none focus:border-[#0891B2]"
              />
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {[50, 100, 500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStakeInput(String(amt))}
                    className={`py-2 rounded-xl text-[11px] font-black border transition-all ${
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

            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Auto-Credit Win Payout</span>
              <span className="font-mono font-black text-base text-emerald-700 tabular-nums">
                ৳{estimatedReturn.toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-md active:scale-99 transition-all disabled:opacity-60"
            >
              {submitting ? 'Placing Bet...' : `Confirm Team Bet • ৳${cleanStake.toFixed(0)}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
