import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, ArrowRight, Clock, Plus, ShieldCheck } from 'lucide-react';
import { CustomerServiceLogo } from '../components/BrandLogos';
import { EwiCoinBadgePair } from '../components/CoinFlipArtwork';
import { getEwiRouletteState } from '../utils/syncedMarkets';
import luckyJetPilotCleanImg from '../assets/images/lucky_jet_pilot_clean_1795168517207.jpg';
import aviatorRedPlaneCleanImg from '../assets/images/aviator_red_plane_clean_1795168517074.jpg';
import minesGameIconImg from '../assets/images/game_icon_mines_3d_1794734301052.jpg';
import slotsTileImg from '../assets/images/tile_slots_dragon_edited_1795168517735.jpg';
import rouletteWheelImg from '../assets/images/roulette_wheel_icon_1795251767913.jpg';

const RouletteWheelLogo: React.FC = () => (
  <div className="w-14 h-14 rounded-2xl bg-white border border-cyan-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs">
    <img
      src={rouletteWheelImg}
      alt="EWI Roulette"
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover select-none block"
    />
  </div>
);

export const SlotsLobby: React.FC = () => {
  const { user, adminSettings, setActiveTab, showToast } = useApp();
  const [rouletteState, setRouletteState] = useState(() =>
    getEwiRouletteState(Date.now(), adminSettings.timezoneOffsetMinutes ?? 360)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRouletteState(getEwiRouletteState(Date.now(), adminSettings.timezoneOffsetMinutes ?? 360));
    }, 1000);
    return () => clearInterval(id);
  }, [adminSettings.timezoneOffsetMinutes]);

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

  const handleLaunch = (id: string, tab: string, title: string) => {
    if (!isGameActive(id)) {
      showToast(`${title} is currently offline for maintenance`);
      return;
    }
    goTab(tab, `#/${tab}`);
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
            <h1 className="text-base font-black text-slate-900 leading-tight">Slots &amp; Arcade</h1>
            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">5 Instant Games</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {user.isLoggedIn && (
            <div className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-slate-100 border border-slate-200">
              <span className="text-[11px] font-black text-cyan-700">৳</span>
              <span className="text-xs font-extrabold tabular-nums text-slate-900 max-w-[70px] truncate">
                {user.balance.toFixed(2)}
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
        {/* Banner Header */}
        <div className="rounded-3xl bg-gradient-to-r from-[#0E7490] via-[#0891B2] to-[#06B6D4] p-4 text-white shadow-md flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              <span>EWI Slots Hub</span>
            </div>
            <h2 className="text-lg font-black leading-tight">Roulette, Lucky Jet, Aviator &amp; More</h2>
            <p className="text-[11px] text-cyan-50 font-medium">
              Instant round settlements, European Auto-Roulette and multi-slot play in Taka (৳).
            </p>
          </div>
          <img
            src={slotsTileImg}
            alt="Slots"
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/50 shadow-md flex-shrink-0"
          />
        </div>

        {/* 4 Slots Games */}
        <div className="grid grid-cols-1 gap-3">
          {/* Lucky Jet */}
          <div
            onClick={() => handleLaunch('game_luckyjet', 'luckyjet', 'Lucky Jet')}
            className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-cyan-400 cursor-pointer active:scale-99 transition-all flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={luckyJetPilotCleanImg}
                alt="Lucky Jet"
                className="w-14 h-14 rounded-2xl object-cover border border-cyan-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base text-slate-900">Lucky Jet</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[9px] font-black uppercase">
                    3 SLOTS
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate">Up to 10,000x • Fast Cash Out</p>
              </div>
            </div>
            <span className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white font-black text-xs flex items-center gap-1 flex-shrink-0">
              <span>Play</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Aviator Plane */}
          <div
            onClick={() => handleLaunch('game_aviator', 'aviator', 'Aviator Plane')}
            className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-cyan-400 cursor-pointer active:scale-99 transition-all flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={aviatorRedPlaneCleanImg}
                alt="Aviator Plane"
                className="w-14 h-14 rounded-2xl object-cover border border-rose-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base text-slate-900">Aviator Plane</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                    HOT
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate">Up to 10,000x • Real-time Flight</p>
              </div>
            </div>
            <span className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white font-black text-xs flex items-center gap-1 flex-shrink-0">
              <span>Play</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Mines 777 */}
          <div
            onClick={() => handleLaunch('game_mines', 'mines', 'Mines 777')}
            className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-cyan-400 cursor-pointer active:scale-99 transition-all flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={minesGameIconImg}
                alt="Mines 777"
                className="w-14 h-14 rounded-2xl object-cover border border-emerald-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base text-slate-900">Mines 777</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase">
                    500X
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate">5×5 Gems Grid • Instant Cashout</p>
              </div>
            </div>
            <span className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white font-black text-xs flex items-center gap-1 flex-shrink-0">
              <span>Play</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Coin Flip */}
          <div
            onClick={() => handleLaunch('game_coinflip', 'coinflip', 'Coin Flip')}
            className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-cyan-400 cursor-pointer active:scale-99 transition-all flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center flex-shrink-0">
                <EwiCoinBadgePair size={42} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base text-slate-900">Coin Flip</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[9px] font-black uppercase">
                    1.89X
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate">Gold vs Silver • 30s Synced Rounds</p>
              </div>
            </div>
            <span className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white font-black text-xs flex items-center gap-1 flex-shrink-0">
              <span>Flip</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* EWI ROULETTE */}
          <div
            onClick={() => handleLaunch('game_ewi_roulette', 'ewi-roulette', 'EWI ROULETTE')}
            className="bg-white rounded-3xl p-4 border border-cyan-200 shadow-xs hover:border-cyan-400 cursor-pointer active:scale-99 transition-all space-y-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <RouletteWheelLogo />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-base text-slate-900">EWI ROULETTE</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                      LIVE 36X
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold truncate">
                    European Auto-Roulette • Straight, Racetrack &amp; Stats
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 font-mono font-black text-[11px] tabular-nums">
                  <Clock className="w-3 h-3" />
                  <span>{rouletteState.phaseRemaining}s</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {rouletteState.history.slice(0, 6).map((item) => (
                  <span
                    key={item.roundId}
                    className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center text-white flex-shrink-0 tabular-nums ${
                      item.color === 'green'
                        ? 'bg-emerald-600'
                        : item.color === 'red'
                        ? 'bg-rose-600'
                        : 'bg-slate-800'
                    }`}
                  >
                    {item.number}
                  </span>
                ))}
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white font-black text-xs flex items-center gap-1 flex-shrink-0">
                <span>Play</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
