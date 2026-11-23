import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AddToDesktop } from '../components/AddToDesktop';
import {
  Volume2,
  Gamepad2,
  X,
  Plus,
  Headphones
} from 'lucide-react';
import { Ewi777Logo } from '../components/BrandLogos';
import { HoneycombHiveHome } from '../components/HoneyBeeVisuals';
import {
  TileWingoIcon,
  TileEwiWingoIcon,
  TileEwiK3Icon,
  TileEwi5DIcon,
  TileBinaryIcon,
  TileGoldIcon,
  TileCasinoIcon,
  TileSlotsIcon,
  TileLudoIcon,
  TileSportsIcon
} from '../components/DashboardArtwork';
import { GameItem } from '../types';

interface HomeProps {
  onOpenLanguage: () => void;
}

const ALLOWED_TABS = [
  'home',
  'wingo',
  'ewi-wingo',
  'k3',
  '5d',
  'casino',
  'slots',
  'aviator',
  'luckyjet',
  'plane',
  'ewi-roulette',
  'roulette',
  'ludo',
  'sports',
  'binary',
  'gold-market',
  'mines',
  'coinflip',
  'activity',
  'promotion',
  'salary',
  'all-chart',
  'gifts',
  'attendence',
  'wallet',
  'deposit',
  'vip',
  'safe',
  'account',
  'customer-service'
];

export const Home: React.FC<HomeProps> = ({ onOpenLanguage }) => {
  const {
    user,
    language,
    setActiveTab,
    adminSettings,
    showToast
  } = useApp();

  const [bannerIdx, setBannerIdx] = useState<number>(0);
  const [activeCustomGame, setActiveCustomGame] = useState<GameItem | null>(null);

  interface BannerItem {
    id: string;
    title: string;
    url?: string;
    targetTab?: string;
    link?: string;
  }

  const adminActiveBanners: BannerItem[] = (adminSettings.banners || [])
    .filter((b) => b.active !== false)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((b) => ({
      id: b.id,
      title: b.title,
      url: String(b.url || '').includes('image_06ccef65.png')
        ? '/assets/brand/welcome-200-banner.png'
        : b.url,
      link: b.link,
      targetTab: 'activity'
    }));

  const fallbackOfficialBanners: BannerItem[] = [
    {
      id: 'hero_official_crown',
      title: 'Hney Win Super Jackpot',
      url: '/assets/aistudio/image_046bb074.png',
      targetTab: 'wingo'
    },
    {
      id: 'hero_welcome_200_bonus',
      title: 'Hney Win Welcome Bonus up to 200%',
      url: '/assets/brand/welcome-200-banner.png',
      targetTab: 'deposit'
    },
    {
      id: 'hero_usdt_binance_bonus',
      title: 'Recharge USDT Get 2% Bonus',
      url: '/assets/aistudio/image_d2e764e7.png',
      targetTab: 'deposit'
    }
  ];

  const allBanners: BannerItem[] =
    adminActiveBanners.length > 0 ? adminActiveBanners.slice(0, 10) : fallbackOfficialBanners;

  useEffect(() => {
    if (allBanners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % allBanners.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [allBanners.length]);

  const currentBanner = allBanners[bannerIdx % allBanners.length] || allBanners[0];

  const isGameActive = (id: string) => {
    const games = adminSettings.games;
    if (!games || games.length === 0) return true;
    const found = games.find((g) => g.id === id);
    return found ? found.active : true;
  };

  const customAdminGames = (adminSettings.games || [])
    .filter(
      (g) =>
        g.active &&
        ![
          'game_wingo_30s',
          'game_wingo_1m',
          'game_wingo_3m',
          'game_wingo_5m',
          'game_ewi_wingo',
          'game_k3',
          'game_5d',
          'game_aviator',
          'game_luckyjet',
          'game_plane',
          'game_binary',
          'game_gold_market',
          'game_mines',
          'game_coinflip',
          'game_ewi_roulette',
          'game_ludo'
        ].includes(g.id)
    )
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const goTab = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab === 'home' ? '' : tab}`;
  };

  const handleBannerAction = () => {
    const link = currentBanner.link?.trim();
    if (link) {
      const cleanTab = link.replace(/^#?\//, '').trim();
      if (ALLOWED_TABS.includes(cleanTab)) {
        goTab(cleanTab);
        return;
      }
    }
    if (currentBanner.targetTab) {
      goTab(currentBanner.targetTab);
    } else {
      goTab('wingo');
    }
  };

  const handleGoldMarketClick = () => {
    if (!isGameActive('game_gold_market') && !isGameActive('game_binary')) {
      showToast('Gold Trading is currently offline for maintenance');
      return;
    }
    goTab('gold-market');
  };

  const handleBinaryClick = () => {
    if (!isGameActive('game_binary')) {
      showToast('Binary Trading is currently offline for maintenance');
      return;
    }
    goTab('binary');
  };

  const handleCustomGameClick = (g: GameItem) => {
    if (g.targetTab) {
      goTab(g.targetTab);
      return;
    }
    if (g.htmlCode || g.url) {
      setActiveCustomGame(g);
      return;
    }
    showToast(`${g.title} is ready`);
  };

  const HOME_TILES = [
    { id: 'wingo', label: 'Wingo', icon: <TileWingoIcon size={54} />, onClick: () => goTab('wingo') },
    { id: 'ewi-wingo', label: 'Hney Wingo', icon: <TileEwiWingoIcon size={54} />, onClick: () => goTab('ewi-wingo') },
    { id: 'k3', label: 'Hney K3', icon: <TileEwiK3Icon size={54} />, onClick: () => goTab('k3') },
    { id: '5d', label: 'Hney 5D', icon: <TileEwi5DIcon size={54} />, onClick: () => goTab('5d') },
    { id: 'binary', label: 'Binary Trading', icon: <TileBinaryIcon size={54} />, onClick: handleBinaryClick },
    { id: 'gold', label: 'Gold Trading', icon: <TileGoldIcon size={54} />, onClick: handleGoldMarketClick },
    { id: 'casino', label: 'Casino', icon: <TileCasinoIcon size={54} />, onClick: () => goTab('casino') },
    { id: 'slots', label: 'Slots', icon: <TileSlotsIcon size={54} />, onClick: () => goTab('slots') }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      {/* Light Mode Top Bar with Customer Care, Official Logo, Balance & Language */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-cyan-100 px-3 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goTab('customer-service')}
          aria-label="Customer Service"
          className="w-9 h-9 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shadow-xs active:scale-95 transition-all flex-shrink-0"
        >
          <Headphones className="w-4 h-4" />
        </button>

        {/* Centered Official Hney Win Crown Logo */}
        <div
          onClick={() => goTab('home')}
          className="flex items-center justify-center cursor-pointer active:scale-98 transition-transform relative"
        >
          <Ewi777Logo height={44} logoUrl={adminSettings.appLogoUrl} />
        </div>

        {/* Right Balance + Deposit + Language */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {user.isLoggedIn ? (
            <div className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-slate-100 border border-slate-200 shadow-xs">
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-700 text-[10px] font-black flex items-center justify-center">
                ৳
              </span>
              <span className="text-xs font-extrabold tabular-nums text-slate-900 max-w-[64px] truncate">
                {user.balance.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => goTab('deposit')}
                aria-label="Deposit"
                className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => goTab('login')}
              className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-[11px] font-black shadow-xs whitespace-nowrap active:scale-95"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={onOpenLanguage}
            className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 active:scale-95 transition-all whitespace-nowrap"
          >
            <span>{language === 'en' ? '🇬🇧' : '🇧🇩'}</span>
            <span>{language === 'en' ? 'EN' : 'বাংলা'}</span>
          </button>
        </div>
      </header>

      <div className="px-3.5 pt-3 space-y-4">
        {/* Hero Banner Carousel */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-cyan-200 shadow-sm select-none">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${(bannerIdx % allBanners.length) * 100}%)`
            }}
          >
            {allBanners.map((banner, idx) => (
              <div
                key={banner.id || idx}
                onClick={() => {
                  const link = banner.link?.trim();
                  if (link) {
                    const cleanTab = link.replace(/^#?\//, '').trim();
                    if (ALLOWED_TABS.includes(cleanTab)) {
                      goTab(cleanTab);
                      return;
                    }
                  }
                  if (banner.targetTab) {
                    goTab(banner.targetTab);
                  } else {
                    handleBannerAction();
                  }
                }}
                className="relative h-44 sm:h-48 w-full flex-shrink-0 cursor-pointer overflow-hidden"
              >
                <img
                  src={banner.url}
                  alt={banner.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {allBanners.length > 1 && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/55 backdrop-blur-sm">
              {allBanners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setBannerIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === bannerIdx % allBanners.length
                      ? 'w-4 bg-cyan-400'
                      : 'w-1.5 bg-white/45'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Marquee Announcement Bar (Directly Below Hero Carousel) */}
        <div className="bg-white rounded-2xl px-3 py-2 border border-cyan-100 shadow-xs flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-700 flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex-1 overflow-hidden whitespace-nowrap text-xs text-slate-600 font-medium">
            <div className="animate-marquee inline-block">
              {adminSettings.marqueeText ||
                'Notice: Welcome to Hney Win Official! Play Hney Ludo & PLANE in Casino, Hney Roulette, Lucky Jet & Aviator in Slots, instant bKash/Nagad deposits & withdrawals.'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => goTab('activity')}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-bold text-[11px] active:scale-95 whitespace-nowrap"
          >
            Detail
          </button>
        </div>

        {/* Hney Win Beehive Sanctuary Strip */}
        <HoneycombHiveHome
          variant="pill"
          title="Hney Win • Golden Honey Hive"
          subtitle="WinGo • Hney WinGo • Hney K3 • Hney 5D"
        />

        {/* 4×2 Locked Square Tile Grid with Water-Drop Gloss */}
        <div className="grid grid-cols-4 gap-2.5">
          {HOME_TILES.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={tile.onClick}
              className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
            >
              <div className="relative w-full aspect-square rounded-2xl flex items-center justify-center p-1 bg-white border border-cyan-100 shadow-[0_6px_16px_rgba(8,145,178,0.10)] group-hover:border-cyan-400 overflow-hidden transition-all">
                <div className="w-full h-full rounded-xl overflow-hidden">{tile.icon}</div>
                {/* Water-drop specular sheen overlay */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/55 via-transparent to-cyan-400/10"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-2 -left-2 w-9 h-9 rounded-full bg-white/40 blur-[2px]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2 right-2 w-2 h-2 rounded-full bg-white/75 shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                />
              </div>
              <span className="text-[11px] font-bold tracking-tight text-center leading-tight whitespace-nowrap truncate max-w-full text-slate-700">
                {tile.label}
              </span>
            </button>
          ))}
        </div>

        {/* Featured Hney Ludo Card */}
        <div
          onClick={() => {
            if (!isGameActive('game_ludo')) {
              showToast('Hney Ludo is currently offline for maintenance');
              return;
            }
            goTab('ludo');
          }}
          className="bg-white rounded-3xl p-3.5 border border-cyan-200 shadow-xs hover:border-cyan-400 cursor-pointer active:scale-99 transition-all flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-cyan-200 shadow-xs flex-shrink-0">
              <TileLudoIcon />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/45 via-transparent to-cyan-400/10" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-slate-900">HNEY LUDO</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase">
                  NEW
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold truncate">
                Online 2P/4P &amp; Private Friends Rooms • ৳20–৳50,000
              </p>
            </div>
          </div>
          <span className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs whitespace-nowrap shadow-xs">
            Play Ludo →
          </span>
        </div>

        {/* Featured Live Cricket & Football Card */}
        <div
          onClick={() => {
            if (!isGameActive('game_sports')) {
              showToast('Live Sports betting is currently offline for maintenance');
              return;
            }
            goTab('sports');
          }}
          className="bg-white rounded-3xl p-3.5 border border-cyan-200 shadow-xs hover:border-cyan-400 cursor-pointer active:scale-99 transition-all flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-cyan-200 shadow-xs flex-shrink-0">
              <TileSportsIcon />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-slate-900">LIVE CRICKET &amp; FOOTBALL</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold truncate">
                Team Win Market Only • Instant Auto Wallet Credit
              </p>
            </div>
          </div>
          <span className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs whitespace-nowrap shadow-xs">
            Bet Live →
          </span>
        </div>

        {/* Custom Admin-Added Games */}
        {customAdminGames.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-cyan-600" />
                <span>Featured Games</span>
              </h3>
              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                {customAdminGames.length} Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {customAdminGames.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleCustomGameClick(g)}
                  className="bg-white rounded-3xl p-3 border border-slate-200 shadow-xs cursor-pointer hover:border-cyan-400 transition-all active:scale-98 flex flex-col gap-2"
                >
                  <div className="relative h-24 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center">
                    {g.imageUrl ? (
                      <img src={g.imageUrl} alt={g.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className="w-8 h-8 text-cyan-600" />
                    )}
                    {g.badge && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-cyan-600 text-white text-[9px] font-black uppercase">
                        {g.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-800 truncate">{g.title}</div>
                      <div className="text-[10px] text-slate-400">{g.category}</div>
                    </div>
                    <span className="text-[11px] font-black text-cyan-600">Play →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AddToDesktop />
      </div>

      {/* Custom Game Embedded Frame Modal */}
      {activeCustomGame && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-md h-[85vh] bg-white rounded-3xl overflow-hidden border border-cyan-200 flex flex-col shadow-2xl">
            <div className="bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-3 text-white flex items-center justify-between">
              <div className="font-black text-sm truncate">{activeCustomGame.title}</div>
              <button
                onClick={() => setActiveCustomGame(null)}
                className="p-1 rounded-full bg-white/15 hover:bg-white/25 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-50">
              {activeCustomGame.url ? (
                <iframe
                  src={activeCustomGame.url}
                  title={activeCustomGame.title}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div
                  className="p-5 text-slate-900 text-sm"
                  dangerouslySetInnerHTML={{ __html: activeCustomGame.htmlCode || '' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
