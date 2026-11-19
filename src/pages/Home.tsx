import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { AddToDesktop } from '../components/AddToDesktop';
import {
  Volume2,
  Trophy,
  ChevronRight,
  ArrowRight,
  Gamepad2,
  X,
  Coins
} from 'lucide-react';
import {
  WingoBallsLogo,
  AviatorPlaneLogo,
  MinesGameLogo,
  GoldMarketLogo,
  EwiWingoLogo
} from '../components/BrandLogos';
import { WinGoBall } from '../components/WinGoAssets';
import { GameItem } from '../types';
import lotteryGameIconImg from '../assets/images/game_icon_lottery_3d_1794734298193.jpg';
import aviatorGameIconImg from '../assets/images/game_icon_aviator_3d_1794734299543.jpg';
import minesGameIconImg from '../assets/images/game_icon_mines_3d_1794734301052.jpg';
import luckyJetPilotImg from '../assets/images/lucky_jet_pilot_1794905505516.jpg';
import { EwiCoinBadgePair } from '../components/CoinFlipArtwork';

interface HomeProps {
  onOpenLanguage: () => void;
}

const ALLOWED_TABS = [
  'home',
  'wingo',
  'ewi-wingo',
  'k3',
  '5d',
  'aviator',
  'luckyjet',
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
  'account'
];

export const Home: React.FC<HomeProps> = ({ onOpenLanguage }) => {
  const {
    setActiveTab,
    adminSettings,
    binaryMarkets,
    binaryPrice,
    timeRemaining,
    currentPeriod,
    historyResults,
    wingoMarkets,
    setActiveWingoMode,
    showToast
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<'all' | 'slots' | 'original' | 'lottery' | 'hot' | 'casino'>('all');
  const [bannerIdx, setBannerIdx] = useState<number>(0);
  const [activeCustomGame, setActiveCustomGame] = useState<GameItem | null>(null);

  interface BannerItem {
    id: string;
    title: string;
    url?: string;
    subtitle?: string;
    tag?: string;
    gradient?: string;
    badge?: string;
    action?: string;
    targetTab?: string;
    link?: string;
    icon?: string;
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
      subtitle: 'Official Event Promotion',
      tag: 'OFFICIAL',
      action: 'Check Details',
      targetTab: 'activity'
    }));

  const fallbackOfficialBanners: BannerItem[] = [
    {
      id: 'hero_official_crown',
      title: 'EWI 777 Official',
      url: '/assets/aistudio/image_046bb074.png',
      targetTab: 'wingo'
    },
    {
      id: 'hero_welcome_200_bonus',
      title: 'EWI 777 Welcome Bonus up to 200%',
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
    }, 2500);
    return () => clearInterval(timer);
  }, [allBanners.length]);

  const topEarners = [
    { rank: 1, name: 'SUL***MAN', amount: '৳4,850,210.00', referrals: 482, tag: 'Grand Champion' },
    { rank: 2, name: 'AL***MIN', amount: '৳4,230,000.00', referrals: 419, tag: 'VIP 9 Master' },
    { rank: 3, name: 'KHA***LID', amount: '৳3,980,500.00', referrals: 388, tag: 'Top Referral' },
    { rank: 4, name: 'FAR***HAN', amount: '৳3,950,120.00', referrals: 351, tag: 'VIP Elite' },
    { rank: 5, name: 'ROY***NER', amount: '৳3,920,000.00', referrals: 320, tag: 'Super Agent' },
    { rank: 6, name: 'SAK***AN', amount: '৳3,858,414.84', referrals: 295, tag: 'Pro Earner' },
    { rank: 7, name: 'HAS***AN', amount: '৳3,817,671.00', referrals: 270, tag: 'Agency Partner' },
    { rank: 8, name: 'TAH***MID', amount: '৳3,540,190.00', referrals: 245, tag: 'High Earner' },
    { rank: 9, name: 'NAD***EEM', amount: '৳3,210,850.00', referrals: 210, tag: 'Elite Agent' },
    { rank: 10, name: 'ZAY***ED', amount: '৳2,980,400.00', referrals: 198, tag: 'Rising Star' }
  ];

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
          'game_binary',
          'game_gold_market',
          'game_mines',
          'game_coinflip'
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
    if ('targetTab' in currentBanner && currentBanner.targetTab) {
      goTab(currentBanner.targetTab);
    } else {
      goTab('wingo');
    }
  };

  const handleGameClick = () => goTab('wingo');

  const handleGoldMarketClick = () => {
    if (!isGameActive('game_gold_market') && !isGameActive('game_binary')) {
      showToast('Gold Market is currently offline for maintenance');
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

  const handleAviatorClick = () => {
    if (!isGameActive('game_aviator')) {
      showToast('Aviator Plane is currently offline for maintenance');
      return;
    }
    goTab('aviator');
  };

  const handleLuckyJetClick = () => {
    if (!isGameActive('game_luckyjet')) {
      showToast('Lucky Jet is currently offline for maintenance');
      return;
    }
    goTab('luckyjet');
  };

  const handleMinesClick = () => {
    if (!isGameActive('game_mines')) {
      showToast('Mines 777 is currently offline for maintenance');
      return;
    }
    goTab('mines');
  };

  const handleCoinFlipClick = () => {
    if (!isGameActive('game_coinflip')) {
      showToast('Coin Flip is currently offline for maintenance');
      return;
    }
    goTab('coinflip');
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

  const handleCategoryPress = (cat: 'slots' | 'original' | 'lottery' | 'hot' | 'casino') => {
    setActiveCategory((prev) => (prev === cat ? 'all' : cat));
  };

  const showLotterySection = activeCategory === 'all' || activeCategory === 'lottery' || activeCategory === 'hot';
  const showOriginalSection = activeCategory === 'all' || activeCategory === 'original' || activeCategory === 'hot' || activeCategory === 'casino';
  const showSlotsSection = activeCategory === 'all' || activeCategory === 'slots' || activeCategory === 'hot' || activeCategory === 'casino';

  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      {/* Top App Header */}
      <Header onLanguageClick={onOpenLanguage} />

      <div className="px-4 pt-3 space-y-4">
        {/* Official Hero Banner Carousel */}
        <div className="relative rounded-3xl overflow-hidden shadow-md bg-[#161006] select-none border border-amber-200/40">
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
                className="relative h-48 sm:h-52 w-full flex-shrink-0 cursor-pointer overflow-hidden"
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
        </div>

        {/* Marquee Announcement Ticker (Luxury Gold) */}
        <div className="bg-white rounded-2xl px-3.5 py-2.5 border border-amber-100 shadow-xs flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-amber-50 text-[#B45309] flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex-1 overflow-hidden whitespace-nowrap text-xs text-slate-600 font-medium">
            <div className="animate-marquee inline-block">
              {adminSettings.marqueeText ||
                'Notice: Welcome to EWI 777 online entertainment. Instant referral commission, 24/7 fast deposits & withdrawals via Nagad & bKash. Live synchronized WinGo, EWI K3, EWI 5D, Aviator, Lucky Jet, Coin Flip & XAU/USD Gold Trading!'}
            </div>
          </div>
          <button
            onClick={() => goTab('activity')}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-amber-50 text-[#B45309] hover:bg-amber-100 font-bold text-[11px] active:scale-95 transition-all"
          >
            Detail
          </button>
        </div>

        {/* 5-Icon Category Strip + Gold Trading & Binary Split Cards */}
        <div className="space-y-2.5">
          <div className="bg-gradient-to-b from-white to-[#FFFBEB] rounded-3xl px-2 py-2.5 border border-amber-200/80 shadow-xs grid grid-cols-5 gap-1">
            <button
              type="button"
              onClick={() => handleCategoryPress('slots')}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
                activeCategory === 'slots' ? 'bg-amber-100/80 ring-1 ring-amber-400' : 'hover:bg-amber-50/60'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200/80 flex items-center justify-center overflow-hidden shadow-2xs">
                <EwiCoinBadgePair size={24} />
              </div>
              <span className={`text-[10.5px] font-extrabold whitespace-nowrap ${activeCategory === 'slots' ? 'text-[#B45309]' : 'text-slate-800'}`}>
                Slots
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryPress('original')}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
                activeCategory === 'original' ? 'bg-amber-100/80 ring-1 ring-amber-400' : 'hover:bg-amber-50/60'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-300/50 flex items-center justify-center overflow-hidden shadow-2xs">
                <img
                  src={aviatorGameIconImg}
                  alt="Original"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className={`text-[10.5px] font-extrabold whitespace-nowrap ${activeCategory === 'original' ? 'text-[#B45309]' : 'text-slate-800'}`}>
                Original
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryPress('lottery')}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
                activeCategory === 'lottery' ? 'bg-amber-100/80 ring-1 ring-amber-400' : 'hover:bg-amber-50/60'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/80 flex items-center justify-center overflow-hidden shadow-2xs">
                <img
                  src={lotteryGameIconImg}
                  alt="Lottery"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className={`text-[10.5px] font-extrabold whitespace-nowrap ${activeCategory === 'lottery' ? 'text-[#B45309]' : 'text-slate-800'}`}>
                Lottery
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryPress('hot')}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
                activeCategory === 'hot' ? 'bg-amber-100/80 ring-1 ring-amber-400' : 'hover:bg-amber-50/60'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 border border-amber-300/80 flex items-center justify-center overflow-hidden shadow-2xs">
                <img
                  src={luckyJetPilotImg}
                  alt="Hot Slots"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className={`text-[10.5px] font-extrabold whitespace-nowrap ${activeCategory === 'hot' ? 'text-[#B45309]' : 'text-slate-800'}`}>
                Hot Slots
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryPress('casino')}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
                activeCategory === 'casino' ? 'bg-amber-100/80 ring-1 ring-amber-400' : 'hover:bg-amber-50/60'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-300/80 flex items-center justify-center overflow-hidden shadow-2xs">
                <img
                  src={minesGameIconImg}
                  alt="Casino"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className={`text-[10.5px] font-extrabold whitespace-nowrap ${activeCategory === 'casino' ? 'text-[#B45309]' : 'text-slate-800'}`}>
                Casino
              </span>
            </button>
          </div>

          {/* 2 Split Luxury Quick-Launch Cards: GOLD Trading & Binary */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleGoldMarketClick}
              className="text-left bg-gradient-to-br from-white via-[#FFFBEB] to-[#FEF3C7] rounded-2xl p-3 border border-amber-200/90 shadow-xs hover:border-amber-400 active:scale-98 transition-all flex items-center justify-between gap-2 overflow-hidden"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-black tracking-tight text-[#B45309] leading-tight">
                  GOLD
                </div>
                <div className="text-[13px] font-black tracking-tight text-slate-900 leading-tight">
                  Trading
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap">
                  Real Market
                </div>
              </div>
              <div className="w-13 h-12 rounded-xl overflow-hidden border border-amber-300/80 bg-[#1A1205] flex-shrink-0 shadow-xs">
                <img
                  src="/assets/aistudio/image_2c2d654f.png"
                  alt="Gold Trading"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            <button
              type="button"
              onClick={handleBinaryClick}
              className="text-left bg-gradient-to-br from-white via-[#FFFDF7] to-amber-50/90 rounded-2xl p-3 border border-amber-200/90 shadow-xs hover:border-amber-400 active:scale-98 transition-all flex items-center justify-between gap-2 overflow-hidden"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-black tracking-tight text-slate-900 leading-tight">
                  Binary
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap">
                  Higher · Lower
                </div>
                <div className="text-[10px] font-mono font-black text-emerald-700 mt-1 tabular-nums">
                  Up to 92%
                </div>
              </div>
              <div className="w-13 h-12 rounded-xl overflow-hidden bg-[#071121] border border-amber-300/80 flex items-center justify-center flex-shrink-0 shadow-xs">
                <img
                  src="/assets/aistudio/image_5d8112e0.png"
                  alt="Binary Trading"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 1: Win Go + EWI WinGo + EWI K3 + EWI 5D Lottery Suite */}
        {showLotterySection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <WingoBallsLogo size={20} />
                <span>Synchronized Lottery Markets</span>
              </h3>
              <span className="text-[11px] font-bold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Next: {timeRemaining}s
              </span>
            </div>

            {/* Featured Hero WinGo Card */}
            <div
              onClick={handleGameClick}
              className="bg-white rounded-3xl p-4 border border-amber-100 shadow-xs cursor-pointer hover:border-amber-300 transition-all active:scale-99"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center shadow-xs">
                    <WingoBallsLogo size={34} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-slate-800">Win Go 30s / 1m / 3m / 5m</span>
                      <span className="px-2 py-0.2 rounded-full bg-amber-100 text-[#B45309] text-[10px] font-black uppercase">
                        HOT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Period: {currentPeriod}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400">DRAW IN</div>
                  <div className="text-xl font-mono font-black text-[#B45309]">
                    {timeRemaining}s
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-amber-50">
                <div className="flex items-center gap-1.5">
                  {historyResults.slice(0, 5).map((res) => (
                    <WinGoBall key={res.periodNumber} number={res.number} size="sm" />
                  ))}
                </div>

                <button className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#B45309] to-[#D97706] text-white font-black text-xs shadow-xs flex items-center gap-1">
                  <span>Bet Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Lottery Mode Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => {
                  setActiveWingoMode('30s');
                  handleGameClick();
                }}
                className="bg-white rounded-3xl p-3.5 border border-amber-100 shadow-xs cursor-pointer hover:border-amber-300 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800">Win Go 30 Sec</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-[#B45309] text-[9px] font-black uppercase">
                    FAST
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Draw in {wingoMarkets['30s']?.timeRemaining ?? 0}s
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#B45309]">30s Round</span>
                  <span className="text-[11px] font-bold text-slate-600">Enter →</span>
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveWingoMode('1m');
                  handleGameClick();
                }}
                className="bg-white rounded-3xl p-3.5 border border-amber-100 shadow-xs cursor-pointer hover:border-amber-300 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800">Win Go 1 Min</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Draw in {wingoMarkets['1m']?.timeRemaining ?? 0}s
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#B45309]">1m Draw</span>
                  <span className="text-[11px] font-bold text-slate-600">Enter →</span>
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveWingoMode('3m');
                  handleGameClick();
                }}
                className="bg-white rounded-3xl p-3.5 border border-amber-100 shadow-xs cursor-pointer hover:border-amber-300 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800">Win Go 3 Min</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Draw in {wingoMarkets['3m']?.timeRemaining ?? 0}s
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#B45309]">3m Round</span>
                  <span className="text-[11px] font-bold text-slate-600">Enter →</span>
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveWingoMode('5m');
                  handleGameClick();
                }}
                className="bg-white rounded-3xl p-3.5 border border-amber-100 shadow-xs cursor-pointer hover:border-amber-300 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800">Win Go 5 Min</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Draw in {wingoMarkets['5m']?.timeRemaining ?? 0}s
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#B45309]">5m Round</span>
                  <span className="text-[11px] font-bold text-slate-600">Enter →</span>
                </div>
              </div>

              {/* EWI K3 Card */}
              <div
                onClick={() => goTab('k3')}
                className="bg-gradient-to-br from-amber-50 to-white rounded-3xl p-3.5 border border-amber-200 shadow-xs cursor-pointer hover:border-[#D97706] transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-[#B45309] text-white text-[10px] font-black">
                      K3
                    </span>
                    <span>EWI K3</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-[#B45309] text-[9px] font-black uppercase">
                    NEW
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mb-2">
                  1m / 3m / 5m / 10m • 3 Dice
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#B45309]">Up to 207X</span>
                  <span className="text-[11px] font-bold text-slate-700">Enter →</span>
                </div>
              </div>

              {/* EWI 5D Card */}
              <div
                onClick={() => goTab('5d')}
                className="bg-gradient-to-br from-amber-50 to-white rounded-3xl p-3.5 border border-amber-200 shadow-xs cursor-pointer hover:border-[#D97706] transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-gradient-to-br from-[#B45309] to-[#D97706] text-white text-[10px] font-black">
                      5D
                    </span>
                    <span>EWI 5D</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-[#B45309] text-[9px] font-black uppercase">
                    NEW
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mb-2">
                  1m / 3m / 5m / 10m • A-E Balls
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#B45309]">Up to 9X</span>
                  <span className="text-[11px] font-bold text-slate-700">Enter →</span>
                </div>
              </div>
              {/* EWI WinGo Card */}
              <div
                onClick={() => goTab('ewi-wingo')}
                className="bg-gradient-to-br from-amber-50 to-white rounded-3xl p-3.5 border border-amber-200 shadow-xs cursor-pointer hover:border-[#D97706] transition-all active:scale-98 col-span-2"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                    <EwiWingoLogo size={24} />
                    <span>EWI WinGo Fast</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white text-[9px] font-black uppercase">
                    15s · 30s · 1m · 3m
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Exclusive Official High-Speed Draw · 1.89X &amp; 9X</span>
                  <span className="text-[11px] font-black text-[#B45309]">Enter →</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Separated Gold Market (XAU/USD) & Binary Trading */}
        {showOriginalSection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#D97706] rounded-full inline-block" />
                <span>Gold Trading &amp; Binary Markets</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>

            {/* Dedicated XAU/USD Gold Trading Card (Ivory-Gold Luxury Style) */}
            <div
              onClick={handleGoldMarketClick}
              className="bg-gradient-to-br from-white via-[#FFFDF7] to-[#FEF3C7] rounded-3xl p-4 text-slate-900 shadow-sm border border-amber-200 cursor-pointer active:scale-99 transition-all hover:border-amber-400"
            >
              <div className="flex items-center gap-3.5 mb-3.5">
                <div className="w-24 h-20 rounded-2xl overflow-hidden border border-amber-300 shadow-xs flex-shrink-0 bg-[#1A1205]">
                  <img
                    src="/assets/aistudio/image_2c2d654f.png"
                    alt="999.9 Fine Gold XAU/USD"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white text-[9px] font-black uppercase tracking-wider">
                      XAU/USD GOLD
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      90% Payout
                    </span>
                  </div>
                  <div className="font-black text-base text-slate-900 mt-1 truncate">
                    Gold Market
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-lg font-mono font-black text-[#B45309] tabular-nums">
                      ${(binaryMarkets['XAU/USD']?.price ?? binaryPrice).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Spot Gold Live</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <div className="py-2 rounded-xl bg-emerald-600 text-white font-black text-xs text-center flex items-center justify-center gap-1 shadow-2xs">
                  <span>▲ BUY GOLD</span>
                  <span className="text-[10px] text-emerald-100">+90%</span>
                </div>
                <div className="py-2 rounded-xl bg-rose-600 text-white font-black text-xs text-center flex items-center justify-center gap-1 shadow-2xs">
                  <span>▼ SELL GOLD</span>
                  <span className="text-[10px] text-rose-100">+90%</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-amber-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Exclusive XAU/USD • Min Trade ৳10</span>
                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white font-black flex items-center gap-1 shadow-xs">
                  <span>Trade Gold</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Dedicated Binary Trading Card (Crypto / Forex / Indices) */}
            <div
              onClick={handleBinaryClick}
              className="bg-gradient-to-br from-white via-[#FFFDF7] to-amber-50 rounded-3xl p-4 text-slate-900 shadow-sm border border-amber-200 cursor-pointer active:scale-99 transition-all hover:border-amber-400"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-14 h-12 rounded-2xl overflow-hidden bg-[#071121] border border-amber-300 flex items-center justify-center shadow-2xs flex-shrink-0">
                    <img
                      src="/assets/aistudio/image_5d8112e0.png"
                      alt="Binary Trading"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-slate-900">Binary Trading</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#B45309] text-[9px] font-black uppercase">
                        16+ ASSETS
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      BTC/USDT • ETH • EUR/USD • GBP/USD • US30
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-mono font-black text-[#B45309] tabular-nums">
                    ${(binaryMarkets['BTC/USDT']?.price ?? 84250).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-black">Up to 92% Payout</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {['5s', '15s', '30s', '1m', '5m', '15m', '30m', '1h', '12h', '24h'].map((tf) => (
                  <span
                    key={tf}
                    className="px-2.5 py-1 rounded-xl bg-amber-50 text-[#92400E] font-mono text-[10px] font-extrabold border border-amber-200"
                  >
                    {tf}
                  </span>
                ))}
              </div>

              <div className="pt-2.5 border-t border-amber-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Crypto, Forex &amp; Indices • Min ৳10</span>
                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#B45309] to-[#D97706] text-white font-black flex items-center gap-1 shadow-xs">
                  <span>Open Binary</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Aviator Plane Showcase (Luxury Ivory-Gold) */}
        {showOriginalSection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <AviatorPlaneLogo size={20} />
                <span>Aviator Plane Crash Game</span>
              </h3>
              <span className="text-[11px] font-bold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Up to 10,000X
              </span>
            </div>

            <div
              onClick={handleAviatorClick}
              className="bg-gradient-to-br from-white via-[#FFFDF7] to-amber-50 rounded-3xl p-4 text-slate-900 shadow-sm border border-amber-200 cursor-pointer active:scale-99 transition-all hover:border-amber-400"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-300 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs">
                    <img
                      src={aviatorGameIconImg}
                      alt="Aviator Plane"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-base text-slate-900">Aviator Plane</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                        LIVE
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      Live Multiplier Flight • Cash Out Anytime
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono font-black text-[#B45309]">10,000x</div>
                  <div className="text-[10px] text-emerald-600 font-black">Max Payout</div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-amber-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Min Bet ৳10 • 3 Simultaneous Trade Slots</span>
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black flex items-center gap-1 shadow-xs">
                  <span>Play Plane</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: Mines 777 Showcase (Luxury Ivory-Gold) */}
        {(showSlotsSection || showOriginalSection) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <MinesGameLogo size={20} />
                <span>Mines 777 Diamond Hunt</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Up to 500X
              </span>
            </div>

            <div
              onClick={handleMinesClick}
              className="bg-gradient-to-br from-white via-[#FFFDF7] to-amber-50 rounded-3xl p-4 text-slate-900 shadow-sm border border-amber-200 cursor-pointer active:scale-99 transition-all hover:border-amber-400"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-300 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs">
                    <img
                      src={minesGameIconImg}
                      alt="Mines 777"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-black text-base text-slate-900">Mines 777</div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      5x5 Grid • Pick Gems &amp; Cash Out Anytime
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono font-black text-[#B45309]">500X</div>
                  <div className="text-[10px] text-emerald-600 font-black">Max Multiplier</div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-amber-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Instant Settlement • Min Bet ৳10</span>
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black flex items-center gap-1 shadow-xs">
                  <span>Play Mines</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* EWI 777 Originals & Trading Grid (Luxury Ivory-Gold) */}
        {(showOriginalSection || showSlotsSection) && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#B45309]" />
                <span>EWI 777 Originals</span>
              </h3>
              {activeCategory !== 'all' && (
                <button
                  onClick={() => setActiveCategory('all')}
                  className="text-[11px] font-bold text-[#B45309] underline whitespace-nowrap"
                >
                  Show All
                </button>
              )}
            </div>

            {/* Lucky Jet Card */}
            {showOriginalSection && (
              <div
                onClick={handleLuckyJetClick}
                className="bg-gradient-to-br from-white via-[#FFFDF7] to-amber-50 rounded-3xl p-4 text-slate-900 shadow-sm border border-amber-200 flex items-center justify-between cursor-pointer active:scale-98 transition-all hover:border-amber-400"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <img
                      src={luckyJetPilotImg}
                      alt="Lucky Jet"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-slate-900 truncate">Lucky Jet</span>
                      <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-[#B45309] to-[#F59E0B] text-white text-[9px] font-black">
                        HOT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold truncate">
                      Jetpack Multiplier Flight • 3 Simultaneous Trade Slots!
                    </div>
                  </div>
                </div>
                <span className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-xs flex-shrink-0 shadow-xs">
                  Fly →
                </span>
              </div>
            )}

            {/* Coin Flip Gold/Silver Card */}
            {(showOriginalSection || showSlotsSection) && (
              <div
                onClick={handleCoinFlipClick}
                className="bg-gradient-to-br from-white via-[#FFFDF7] to-[#FEF3C7] rounded-3xl p-4 text-slate-900 shadow-sm border border-amber-200 flex items-center justify-between cursor-pointer active:scale-98 transition-all hover:border-amber-400"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100/80 border border-amber-300 flex items-center justify-center flex-shrink-0 p-1 shadow-2xs">
                    <EwiCoinBadgePair size={36} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-slate-900 truncate">Coin Flip (Gold / Silver)</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[#92400E] text-[9px] font-black">
                        1.89X
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold truncate">
                      Flip Gold EWI777 vs Silver EWI777 • Min ৳10!
                    </div>
                  </div>
                </div>
                <span className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-xs flex-shrink-0 shadow-xs">
                  Flip →
                </span>
              </div>
            )}
          </div>
        )}

        {/* Real-Time Top Earners & Referral Leaderboard */}
        {adminSettings.showTopEarners && (
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-amber-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-50">
              <div className="flex items-center gap-2 font-black text-xs text-slate-800">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Top Earners &amp; Referral Champions</span>
              </div>
              <span className="text-[10px] text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                Live Referral Rankings
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {topEarners.map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-amber-50/50 transition-colors border border-transparent hover:border-amber-100"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                        item.rank === 1
                          ? 'bg-amber-400 text-slate-900 shadow-2xs ring-2 ring-amber-200'
                          : item.rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : item.rank === 3
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600 text-[10px]'
                      }`}
                    >
                      {item.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800">{item.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-[#B45309] font-bold">
                          {item.tag}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Invited: <strong className="text-slate-600 font-bold">{item.referrals} members</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-600 font-mono">
                      {item.amount}
                    </div>
                    <div className="text-[10px] text-slate-400">Referral &amp; Game Income</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Admin-Added Games */}
        {customAdminGames.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#B45309]" />
                <span>Featured Games</span>
              </h3>
              <span className="text-[10px] font-bold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {customAdminGames.length} Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {customAdminGames.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleCustomGameClick(g)}
                  className="bg-white rounded-3xl p-3 border border-amber-100 shadow-xs cursor-pointer hover:border-amber-300 transition-all active:scale-98 flex flex-col gap-2"
                >
                  <div className="relative h-24 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 overflow-hidden flex items-center justify-center">
                    {g.imageUrl ? (
                      <img src={g.imageUrl} alt={g.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className="w-8 h-8 text-[#B45309]" />
                    )}
                    {g.badge && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-[#B45309] text-white text-[9px] font-black uppercase">
                        {g.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-800 truncate">{g.title}</div>
                      <div className="text-[10px] text-slate-400">{g.category}</div>
                    </div>
                    <span className="text-[11px] font-black text-[#B45309]">Play →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add To Desktop PWA Prompt */}
        <AddToDesktop />
      </div>

      {/* Custom Game Embedded Frame Modal */}
      {activeCustomGame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-md h-[85vh] bg-slate-950 rounded-3xl overflow-hidden border border-amber-500/35 flex flex-col shadow-2xl">
            <div className="bg-gradient-to-r from-[#B45309] to-[#D97706] px-4 py-3 text-white flex items-center justify-between">
              <div className="font-black text-sm truncate">{activeCustomGame.title}</div>
              <button
                onClick={() => setActiveCustomGame(null)}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-900">
              {activeCustomGame.url ? (
                <iframe
                  src={activeCustomGame.url}
                  title={activeCustomGame.title}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <iframe
                  srcDoc={activeCustomGame.htmlCode || ''}
                  title={activeCustomGame.title}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
