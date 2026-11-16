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
  X
} from 'lucide-react';
import { WingoBallsLogo, BinaryMarketLogo, AviatorPlaneLogo, MinesGameLogo } from '../components/BrandLogos';
import { WinGoBall } from '../components/WinGoAssets';
import { GameItem } from '../types';
import heroBannerImg from '../assets/images/ewi777_hero_banner_1794683642451.jpg';
import asiaWelcomeBannerImg from '../assets/images/ewi777_banner_real_logo_1794734301859.jpg';
import lotteryGameIconImg from '../assets/images/game_icon_lottery_3d_1794734298193.jpg';
import aviatorGameIconImg from '../assets/images/game_icon_aviator_3d_1794734299543.jpg';
import minesGameIconImg from '../assets/images/game_icon_mines_3d_1794734301052.jpg';

interface HomeProps {
  onOpenLanguage: () => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenLanguage }) => {
  const {
    setActiveTab,
    adminSettings,
    binaryPrice,
    timeRemaining,
    currentPeriod,
    historyResults,
    wingoMarkets,
    setActiveWingoMode,
    showToast
  } = useApp();

  const [activeMode, setActiveMode] = useState<'lottery' | 'aviator' | 'binary' | 'mines'>('lottery');
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

  // Official Bespoke EWI 777 Hero Banners (up to 10 active admin-managed banners)
  const fallbackOfficialBanners: BannerItem[] = [
    {
      id: 'hero_official_crown',
      title: 'EWI 777 Official',
      url: heroBannerImg,
      targetTab: 'wingo'
    },
    {
      id: 'hero_welcome_200_bonus',
      title: 'EWI 777 Welcome Bonus up to 200%',
      url: '/assets/brand/welcome-200-banner.png',
      targetTab: 'deposit'
    },
    {
      id: 'hero_ewi777_asia_welcome',
      title: "EWI 777 — Welcome to Asia's Best Entertainment Website",
      url: asiaWelcomeBannerImg,
      targetTab: 'wingo'
    }
  ];

  const allBanners: BannerItem[] =
    adminActiveBanners.length > 0
      ? adminActiveBanners.slice(0, 10)
      : fallbackOfficialBanners;

  // Auto-cycle hero banner every 2 seconds when multiple banners exist (no manual controls)
  useEffect(() => {
    if (allBanners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % allBanners.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [allBanners.length]);

  // Verified Top 10 Earners & Referral Champions (toggleable from Admin panel, hidden until launch)
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
    { rank: 10, name: 'ZAY***ED', amount: '৳2,980,400.00', referrals: 198, tag: 'Rising Star' },
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
        !['game_wingo_30s', 'game_wingo_1m', 'game_wingo_3m', 'game_wingo_5m', 'game_k3', 'game_5d', 'game_aviator', 'game_binary', 'game_mines'].includes(g.id)
    )
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const handleBannerAction = () => {
    const link = currentBanner.link?.trim();
    if (link) {
      const cleanTab = link.replace(/^#?\//, '').trim();
      if (['home', 'wingo', 'k3', '5d', 'aviator', 'binary', 'mines', 'activity', 'promotion', 'salary', 'gifts', 'attendence', 'wallet', 'deposit', 'vip', 'safe', 'account'].includes(cleanTab)) {
        setActiveTab(cleanTab);
        window.location.hash = `#/${cleanTab}`;
        return;
      }
    }
    if ('targetTab' in currentBanner && currentBanner.targetTab) {
      setActiveTab(currentBanner.targetTab);
      window.location.hash = `#/${currentBanner.targetTab}`;
    } else {
      setActiveTab('wingo');
      window.location.hash = '#/wingo';
    }
  };

  const handleGameClick = () => {
    setActiveTab('wingo');
    window.location.hash = '#/wingo';
  };

  const handleBinaryClick = () => {
    if (!isGameActive('game_binary')) {
      showToast('Binary Market is currently offline for maintenance');
      return;
    }
    setActiveTab('binary');
    window.location.hash = '#/binary';
  };

  const handleAviatorClick = () => {
    if (!isGameActive('game_aviator')) {
      showToast('Aviator Plane is currently offline for maintenance');
      return;
    }
    setActiveTab('aviator');
    window.location.hash = '#/aviator';
  };

  const handleMinesClick = () => {
    if (!isGameActive('game_mines')) {
      showToast('Mines 777 is currently offline for maintenance');
      return;
    }
    setActiveTab('mines');
    window.location.hash = '#/mines';
  };

  const handleCustomGameClick = (g: GameItem) => {
    if (g.targetTab) {
      setActiveTab(g.targetTab);
      window.location.hash = `#/${g.targetTab}`;
      return;
    }
    if (g.htmlCode || g.url) {
      setActiveCustomGame(g);
      return;
    }
    showToast(`${g.title} is ready`);
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      {/* Top App Header */}
      <Header onLanguageClick={onOpenLanguage} />

      <div className="px-4 pt-3 space-y-4">
        {/* Automatic Official Hero Banner Carousel (Auto-rotates every 2s, no manual switching) */}
        <div className="relative rounded-3xl overflow-hidden shadow-md bg-[#120804] select-none">
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
                    if (['home', 'wingo', 'k3', '5d', 'aviator', 'binary', 'mines', 'activity', 'promotion', 'salary', 'gifts', 'attendence', 'wallet', 'deposit', 'vip', 'safe', 'account'].includes(cleanTab)) {
                      setActiveTab(cleanTab);
                      window.location.hash = `#/${cleanTab}`;
                      return;
                    }
                  }
                  if (banner.targetTab) {
                    setActiveTab(banner.targetTab);
                    window.location.hash = `#/${banner.targetTab}`;
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

        {/* Marquee Announcement Ticker (Pink Theme) */}
        <div className="bg-white rounded-2xl px-3.5 py-2.5 border border-pink-100/80 shadow-xs flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-pink-50 text-[#FF2A7A] flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex-1 overflow-hidden whitespace-nowrap text-xs text-slate-600 font-medium">
            <div className="animate-marquee inline-block">
              {adminSettings.marqueeText ||
                'Notice: Welcome to EWI 777 online entertainment. Instant referral commission, 24/7 fast deposits & withdrawals via Nagad & bKash. Live synchronized WinGo Lottery & Binary Trading!'}
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('activity');
              window.location.hash = '#/activity';
            }}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-pink-50 text-[#FF2A7A] hover:bg-pink-100 font-bold text-[11px] active:scale-95 transition-all"
          >
            Detail
          </button>
        </div>

        {/* Quad-Mode Selector: WinGo, Aviator, Binary & Mines 777 */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveMode('lottery')}
            className={`rounded-2xl px-1.5 py-2.5 transition-all duration-200 flex flex-col items-center text-center justify-between min-h-[106px] active:scale-[0.97] ${
              activeMode === 'lottery'
                ? 'bg-gradient-to-b from-[#FF2A7A] to-[#D90452] text-white shadow-lg shadow-pink-500/25 ring-2 ring-[#FF2A7A]/35'
                : 'bg-white border border-pink-100/90 text-slate-800 shadow-xs hover:border-pink-200'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/10 bg-[#A855F7] flex items-center justify-center">
              <img
                src={lotteryGameIconImg}
                alt="Win Go Lottery"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full mt-1.5">
              <div className="font-black text-[11px] leading-tight tracking-tight whitespace-nowrap">
                Win Go
              </div>
              <div
                className={`text-[9px] font-bold mt-0.5 whitespace-nowrap ${
                  activeMode === 'lottery' ? 'text-pink-100' : 'text-slate-400'
                }`}
              >
                30s-5m
              </div>
            </div>
            <div
              className={`w-5 h-1 rounded-full mt-1 transition-all ${
                activeMode === 'lottery' ? 'bg-white/90' : 'bg-pink-100'
              }`}
            />
          </button>

          <button
            onClick={() => setActiveMode('aviator')}
            className={`rounded-2xl px-1.5 py-2.5 transition-all duration-200 flex flex-col items-center text-center justify-between min-h-[106px] active:scale-[0.97] ${
              activeMode === 'aviator'
                ? 'bg-gradient-to-b from-[#E11D48] to-[#881337] text-white shadow-lg shadow-rose-500/25 ring-2 ring-rose-500/35'
                : 'bg-white border border-pink-100/90 text-slate-800 shadow-xs hover:border-pink-200'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/15 bg-[#1B1B1E] flex items-center justify-center">
              <img
                src={aviatorGameIconImg}
                alt="Aviator"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full mt-1.5">
              <div className="font-black text-[11px] leading-tight tracking-tight whitespace-nowrap">
                Aviator
              </div>
              <div
                className={`text-[9px] font-bold mt-0.5 whitespace-nowrap ${
                  activeMode === 'aviator' ? 'text-rose-100' : 'text-slate-400'
                }`}
              >
                10,000X
              </div>
            </div>
            <div
              className={`w-5 h-1 rounded-full mt-1 transition-all ${
                activeMode === 'aviator' ? 'bg-white/90' : 'bg-pink-100'
              }`}
            />
          </button>

          <button
            onClick={() => setActiveMode('binary')}
            className={`rounded-2xl px-1.5 py-2.5 transition-all duration-200 flex flex-col items-center text-center justify-between min-h-[106px] active:scale-[0.97] ${
              activeMode === 'binary'
                ? 'bg-gradient-to-b from-[#7C3AED] to-[#4C1D95] text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/35'
                : 'bg-white border border-pink-100/90 text-slate-800 shadow-xs hover:border-pink-200'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/15 bg-[#0C0F1A] flex items-center justify-center">
              <BinaryMarketLogo size={48} className="rounded-none" />
            </div>
            <div className="w-full mt-1.5">
              <div className="font-black text-[11px] leading-tight tracking-tight whitespace-nowrap">
                Binary
              </div>
              <div
                className={`text-[9px] font-bold mt-0.5 whitespace-nowrap ${
                  activeMode === 'binary' ? 'text-purple-100' : 'text-slate-400'
                }`}
              >
                90% Pay
              </div>
            </div>
            <div
              className={`w-5 h-1 rounded-full mt-1 transition-all ${
                activeMode === 'binary' ? 'bg-white/90' : 'bg-pink-100'
              }`}
            />
          </button>

          <button
            onClick={() => setActiveMode('mines')}
            className={`rounded-2xl px-1.5 py-2.5 transition-all duration-200 flex flex-col items-center text-center justify-between min-h-[106px] active:scale-[0.97] ${
              activeMode === 'mines'
                ? 'bg-gradient-to-b from-[#059669] to-[#065F46] text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/35'
                : 'bg-white border border-pink-100/90 text-slate-800 shadow-xs hover:border-pink-200'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/10 bg-[#C24F3A] flex items-center justify-center">
              <img
                src={minesGameIconImg}
                alt="Mines 777"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full mt-1.5">
              <div className="font-black text-[11px] leading-tight tracking-tight whitespace-nowrap">
                Mines 777
              </div>
              <div
                className={`text-[9px] font-bold mt-0.5 whitespace-nowrap ${
                  activeMode === 'mines' ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                5x5 Gems
              </div>
            </div>
            <div
              className={`w-5 h-1 rounded-full mt-1 transition-all ${
                activeMode === 'mines' ? 'bg-white/90' : 'bg-pink-100'
              }`}
            />
          </button>
        </div>

        {/* SECTION 1: Win Go Lottery Suite (All Pure Lottery Games) */}
        {activeMode === 'lottery' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <WingoBallsLogo size={20} />
                <span>Synchronized Lottery Markets</span>
              </h3>
              <span className="text-[11px] font-bold text-[#FF2A7A] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                Next: {timeRemaining}s
              </span>
            </div>

            {/* Featured Hero WinGo Card */}
            <div
              onClick={handleGameClick}
              className="bg-white rounded-3xl p-4 border border-pink-100 shadow-xs cursor-pointer hover:border-pink-300 transition-all active:scale-99"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-pink-50 flex items-center justify-center shadow-xs">
                    <WingoBallsLogo size={34} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-slate-800">Win Go 30s / 1m / 3m / 5m</span>
                      <span className="px-2 py-0.2 rounded-full bg-pink-50 text-[#FF2A7A] text-[10px] font-black uppercase">
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
                  <div className="text-xl font-mono font-black text-[#FF2A7A]">
                    {timeRemaining}s
                  </div>
                </div>
              </div>

              {/* Live Number and Color Balls Preview */}
              <div className="flex items-center justify-between pt-2 border-t border-pink-50">
                <div className="flex items-center gap-1.5">
                  {historyResults.slice(0, 5).map((res) => (
                    <WinGoBall key={res.periodNumber} number={res.number} size="sm" />
                  ))}
                </div>

                <button className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-black text-xs shadow-xs flex items-center gap-1">
                  <span>Bet Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Other Lottery Mode Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Win Go 30 Sec */}
              <div
                onClick={() => {
                  setActiveWingoMode('30s');
                  handleGameClick();
                }}
                className="bg-white rounded-3xl p-3.5 border border-pink-100 shadow-xs cursor-pointer hover:border-pink-300 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800">Win Go 30 Sec</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-pink-100 text-[#FF2A7A] text-[9px] font-black uppercase">
                    FAST
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Draw in {wingoMarkets['30s']?.timeRemaining ?? 0}s
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF2A7A]">30s Round</span>
                  <span className="text-[11px] font-bold text-slate-600">Enter →</span>
                </div>
              </div>

              {/* Win Go 1 Min */}
              <div
                onClick={() => {
                  setActiveWingoMode('1m');
                  handleGameClick();
                }}
                className="bg-white rounded-3xl p-3.5 border border-pink-100 shadow-xs cursor-pointer hover:border-pink-300 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800">Win Go 1 Min</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Draw in {wingoMarkets['1m']?.timeRemaining ?? 0}s
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF2A7A]">1m Draw</span>
                  <span className="text-[11px] font-bold text-slate-600">Enter →</span>
                </div>
              </div>

              {/* Win Go 3 Min */}
              <div
                onClick={() => {
                  setActiveWingoMode('3m');
                  handleGameClick();
                }}
                className="bg-white rounded-3xl p-3.5 border border-pink-100 shadow-xs cursor-pointer hover:border-pink-300 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800">Win Go 3 Min</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Draw in {wingoMarkets['3m']?.timeRemaining ?? 0}s
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF2A7A]">3m Round</span>
                  <span className="text-[11px] font-bold text-slate-600">Enter →</span>
                </div>
              </div>

              {/* Win Go 5 Min */}
              <div
                onClick={() => {
                  setActiveWingoMode('5m');
                  handleGameClick();
                }}
                className="bg-white rounded-3xl p-3.5 border border-pink-100 shadow-xs cursor-pointer hover:border-pink-300 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800">Win Go 5 Min</span>
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Draw in {wingoMarkets['5m']?.timeRemaining ?? 0}s
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF2A7A]">5m Round</span>
                  <span className="text-[11px] font-bold text-slate-600">Enter →</span>
                </div>
              </div>

              {/* K3 Lottery Card */}
              <div
                onClick={() => {
                  setActiveTab('k3');
                  window.location.hash = '#/k3';
                }}
                className="bg-gradient-to-br from-[#FFF0F6] to-white rounded-3xl p-3.5 border border-pink-200 shadow-xs cursor-pointer hover:border-[#FF2A7A] transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-[#FF2A7A] text-white text-[10px] font-black">
                      K3
                    </span>
                    <span>K3 Lottery</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-pink-100 text-[#FF2A7A] text-[9px] font-black uppercase">
                    NEW
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mb-2">
                  1m / 3m / 5m / 10m • 3 Dice
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF2A7A]">Up to 207X</span>
                  <span className="text-[11px] font-bold text-slate-700">Enter →</span>
                </div>
              </div>

              {/* 5D Lottery Card */}
              <div
                onClick={() => {
                  setActiveTab('5d');
                  window.location.hash = '#/5d';
                }}
                className="bg-gradient-to-br from-[#FFF0F6] to-white rounded-3xl p-3.5 border border-pink-200 shadow-xs cursor-pointer hover:border-[#FF2A7A] transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-gradient-to-br from-[#FF2A7A] to-[#FF5A92] text-white text-[10px] font-black">
                      5D
                    </span>
                    <span>5D Lottery</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-pink-100 text-[#FF2A7A] text-[9px] font-black uppercase">
                    NEW
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mb-2">
                  1m / 3m / 5m / 10m • A-E Balls
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF2A7A]">Up to 9X</span>
                  <span className="text-[11px] font-bold text-slate-700">Enter →</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Binary Market Live Trading Showcase */}
        {activeMode === 'binary' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#7209B7] rounded-full inline-block" />
                <span>Binary Options Trading</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>

            {/* Binary Showcase Card */}
            <div
              onClick={handleBinaryClick}
              className="bg-gradient-to-b from-[#1a0b16] to-[#0d050c] rounded-3xl p-5 text-white shadow-md border border-pink-900/40 cursor-pointer active:scale-99 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center p-0.5 shadow-xs flex-shrink-0">
                    <BinaryMarketLogo size={36} />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white flex items-center gap-1.5">
                      <span>17+ Global Markets Binary</span>
                    </div>
                    <div className="text-[10px] text-pink-300">Crypto • Forex • Gold • Indices</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-mono font-black text-[#FF4B91]">
                    ${binaryPrice.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">90% Payout Rate</div>
                </div>
              </div>

              {/* Supported Timeframes Badge Row */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {['15s', '30s', '1m', '3m', '5m', '15m', '30m'].map((tf) => (
                  <span
                    key={tf}
                    className="px-2.5 py-1 rounded-xl bg-white/10 text-white font-mono text-[10px] font-extrabold border border-white/10"
                  >
                    {tf}
                  </span>
                ))}
              </div>

              {/* Visual UP / DOWN simulation buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-xs text-center flex items-center justify-center gap-1">
                  <span>▲ CALL / UP</span>
                  <span className="text-[10px] text-emerald-300">+90%</span>
                </div>
                <div className="py-2.5 rounded-2xl bg-[#FF2A7A]/20 border border-[#FF2A7A]/40 text-[#FF4B91] font-black text-xs text-center flex items-center justify-center gap-1">
                  <span>▼ PUT / DOWN</span>
                  <span className="text-[10px] text-pink-300">+90%</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Click to open Live Chart</span>
                <span className="text-[#FF4B91] font-black flex items-center gap-1">
                  <span>Trade Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Aviator Plane Crash Game Showcase */}
        {activeMode === 'aviator' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <AviatorPlaneLogo size={20} />
                <span>Aviator Plane Crash Game</span>
              </h3>
              <span className="text-[11px] font-bold text-[#FF2A7A] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                Up to 10,000X
              </span>
            </div>

            <div
              onClick={handleAviatorClick}
              className="bg-gradient-to-b from-[#250819] to-[#12040D] rounded-3xl p-5 text-white shadow-md border border-pink-500/35 cursor-pointer active:scale-99 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center flex-shrink-0">
                    <AviatorPlaneLogo size={38} />
                  </div>
                  <div>
                    <div className="font-black text-base text-white">Aviator Plane</div>
                    <div className="text-[11px] text-pink-200">Live Multiplier Flight • Cash Out Anytime</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-black text-amber-300">10,000.00x</div>
                  <div className="text-[10px] text-emerald-400 font-bold">Max Payout</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {['1.85x', '3.42x', '12.10x', '2.15x', '6.80x'].map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-full bg-white/10 text-pink-100 font-mono text-[10px] font-black border border-white/10"
                  >
                    {m}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-pink-200/80 font-medium">Min Bet ৳10 • Auto Cashout Supported</span>
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-black flex items-center gap-1 shadow-xs">
                  <span>Play Plane</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: Mines 777 Instant Gem Game Showcase */}
        {activeMode === 'mines' && (
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
              className="bg-gradient-to-b from-[#08221D] to-[#04100E] rounded-3xl p-5 text-white shadow-md border border-emerald-500/35 cursor-pointer active:scale-99 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                    <MinesGameLogo size={38} />
                  </div>
                  <div>
                    <div className="font-black text-base text-white">Mines 777</div>
                    <div className="text-[11px] text-emerald-200">5x5 Grid • Pick Gems &amp; Cash Out Anytime</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-black text-amber-300">98.5%</div>
                  <div className="text-[10px] text-emerald-400 font-bold">RTP Rate</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {['1 Mine', '3 Mines', '5 Mines', '10 Mines'].map((m) => (
                  <span
                    key={m}
                    className="py-1.5 rounded-xl bg-white/10 text-emerald-100 font-mono text-[10px] font-black text-center border border-white/10"
                  >
                    {m}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-emerald-200/80 font-medium">Instant Settlement • Min Bet ৳10</span>
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black flex items-center gap-1 shadow-xs">
                  <span>Play Mines</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Featured Aviator Plane & Mines Quick Cards */}
        {activeMode !== 'aviator' && (
          <div
            onClick={handleAviatorClick}
            className="bg-gradient-to-r from-[#230719] via-[#3A0C27] to-[#FF2A7A] rounded-3xl p-4 text-white shadow-md border border-pink-400/30 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <AviatorPlaneLogo size={34} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-white truncate">Aviator Plane</span>
                  <span className="px-1.5 py-0.5 rounded bg-yellow-300 text-slate-900 text-[9px] font-black">
                    HOT
                  </span>
                </div>
                <div className="text-[11px] text-pink-100 truncate">
                  Place bet &amp; cash out before the plane flies away!
                </div>
              </div>
            </div>
            <span className="px-3.5 py-2 rounded-full bg-white text-[#FF2A7A] font-black text-xs flex-shrink-0 shadow-sm">
              Play →
            </span>
          </div>
        )}

        {activeMode !== 'mines' && (
          <div
            onClick={handleMinesClick}
            className="bg-gradient-to-r from-[#06211B] via-[#0B3B2E] to-[#059669] rounded-3xl p-4 text-white shadow-md border border-emerald-400/30 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <MinesGameLogo size={34} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-white truncate">Mines 777</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-300 text-slate-900 text-[9px] font-black">
                    NEW
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100 truncate">
                  Reveal diamonds &amp; cash out instant multipliers!
                </div>
              </div>
            </div>
            <span className="px-3.5 py-2 rounded-full bg-white text-emerald-700 font-black text-xs flex-shrink-0 shadow-sm">
              Play →
            </span>
          </div>
        )}

        {/* Real-Time Top Earners & Referral Leaderboard (Toggled from Admin Panel; Hidden by default until official launch) */}
        {adminSettings.showTopEarners && (
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-pink-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-pink-50">
              <div className="flex items-center gap-2 font-black text-xs text-slate-800">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Top Earners & Referral Champions</span>
              </div>
              <span className="text-[10px] text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full font-bold">
                Live Referral Rankings
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {topEarners.map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-pink-50/50 transition-colors border border-transparent hover:border-pink-100"
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
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-100 text-[#FF2A7A] font-bold">
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
                    <div className="text-[10px] text-slate-400">Referral & Game Income</div>
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
                <Gamepad2 className="w-4 h-4 text-[#FF2A7A]" />
                <span>Featured Games</span>
              </h3>
              <span className="text-[10px] font-bold text-[#FF2A7A] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                {customAdminGames.length} Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {customAdminGames.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleCustomGameClick(g)}
                  className="bg-white rounded-3xl p-3 border border-pink-100 shadow-xs cursor-pointer hover:border-pink-300 transition-all active:scale-98 flex flex-col gap-2"
                >
                  <div className="relative h-24 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 overflow-hidden flex items-center justify-center">
                    {g.imageUrl ? (
                      <img src={g.imageUrl} alt={g.title} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className="w-8 h-8 text-[#FF2A7A]" />
                    )}
                    {g.badge && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-[#FF2A7A] text-white text-[9px] font-black uppercase">
                        {g.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-800 truncate">{g.title}</div>
                      <div className="text-[10px] text-slate-400">{g.category}</div>
                    </div>
                    <span className="text-[11px] font-black text-[#FF2A7A]">Play →</span>
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
          <div className="w-full max-w-md h-[85vh] bg-slate-950 rounded-3xl overflow-hidden border border-pink-500/30 flex flex-col shadow-2xl">
            <div className="bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] px-4 py-3 text-white flex items-center justify-between">
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
