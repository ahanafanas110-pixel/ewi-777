import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, ArrowRight, Plus, ShieldCheck } from 'lucide-react';
import { CustomerServiceLogo } from '../components/BrandLogos';
import { PlaneGameLogo, TileLudoIcon } from '../components/DashboardArtwork';
import casinoTileImg from '../assets/images/tile_casino_roulette_edited_1795168518026.jpg';

export const CasinoLobby: React.FC = () => {
  const { user, adminSettings, setActiveTab, showToast } = useApp();

  const isGameActive = (id: string) => {
    const games = adminSettings.games;
    if (!games || games.length === 0) return true;
    const found = games.find((g) => g.id === id);
    return found ? found.active : true;
  };

  const goTab = (tab: string, hash: string) => {
    setActiveTab(tab);
    window.location.hash = hash;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Light Mode Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTab('home', '#/')}
            className="p-1.5 -ml-1 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 leading-tight">Casino Lobby</h1>
            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">Live Rooms &amp; Crash</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {user.isLoggedIn && (
            <div className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-slate-100 border border-slate-200">
              <span className="text-[11px] font-black text-cyan-700">৳</span>
              <span className="text-xs font-extrabold tabular-nums text-slate-900 max-w-[70px] truncate">
                {Math.max(0, (user.balance || 0) - (user.lockedBalance || 0)).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => goTab('deposit', '#/deposit')}
                className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center active:scale-90"
                aria-label="Deposit"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => goTab('customer-service', '#/customer-service')}
            className="p-1 rounded-full bg-cyan-50 border border-cyan-200 active:scale-95"
            aria-label="Customer Care"
          >
            <CustomerServiceLogo size={28} />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Highlight Banner Card */}
        <div className="rounded-3xl bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] p-4 text-white shadow-md border border-amber-300/30 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/15 text-[10px] font-black uppercase tracking-wider text-amber-200">
              <ShieldCheck className="w-3 h-3" />
              <span>Deshi Win Casino</span>
            </div>
            <h2 className="text-lg font-black leading-tight">Live Casino Collection</h2>
            <p className="text-[11px] text-cyan-50 font-medium">
              Play Deshi Ludo multiplayer boards &amp; PLANE Crash in crisp Taka (৳) rooms.
            </p>
          </div>
          <img
            src={casinoTileImg}
            alt="Casino"
            className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-300/50 shadow-md flex-shrink-0"
          />
        </div>

        {/* Game 1: DESHI LUDO */}
        <div
          onClick={() => {
            if (!isGameActive('game_ludo')) {
              showToast('Deshi Ludo is currently offline for maintenance');
              return;
            }
            goTab('ludo', '#/ludo');
          }}
          className="bg-white rounded-3xl p-4 border border-cyan-200 shadow-sm hover:border-cyan-400 cursor-pointer active:scale-99 transition-all space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-cyan-200 flex-shrink-0 shadow-xs">
                <TileLudoIcon />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-base text-slate-900">DESHI LUDO</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                    NEW
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[9px] font-black uppercase">
                    2P / 4P
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                  Online Tables &amp; Password Rooms • Stakes ৳20–৳50,000
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-sm font-mono font-black text-cyan-700 tabular-nums">1.9x / 90%</div>
              <div className="text-[10px] text-emerald-600 font-black">Instant Win</div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold">৳20 → ৳38 (2P) • 4P Split Mode</span>
            <span className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white font-black flex items-center gap-1 shadow-xs whitespace-nowrap">
              <span>Play Ludo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Game 2: PLANE */}
        <div
          onClick={() => {
            if (!isGameActive('game_plane')) {
              showToast('PLANE is currently offline for maintenance');
              return;
            }
            goTab('plane', '#/plane');
          }}
          className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm hover:border-cyan-400 cursor-pointer active:scale-99 transition-all space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <PlaneGameLogo size={56} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-base text-slate-900">PLANE</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                    HOT
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[9px] font-black uppercase">
                    TAKA ৳
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                  Flight Multiplier Crash • 3 Simultaneous Bet Slots
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-base font-mono font-black text-cyan-700 tabular-nums">10,000x</div>
              <div className="text-[10px] text-emerald-600 font-black">Max Win</div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold">Min Bet ৳10 • Instant Cash Out</span>
            <span className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white font-black flex items-center gap-1 shadow-xs whitespace-nowrap">
              <span>Play PLANE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
