import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp, PUBLIC_UNAUTH_TABS, getLocalDateStr } from './context/AppContext';
import { Toast } from './components/Toast';
import { BottomNav } from './components/BottomNav';
import { LanguageModal } from './components/LanguageModal';
import { PageSkeleton } from './components/PageSkeleton';
import { NotificationModal } from './components/NotificationModal';
import { AddToDesktopModal } from './components/AddToDesktop';
import { Ewi777Logo } from './components/BrandLogos';
import { Home } from './pages/Home';
import { Activity } from './pages/Activity';
import { Promotion } from './pages/Promotion';
import { Wallet } from './pages/Wallet';
import { Account } from './pages/Account';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { WinGo } from './pages/WinGo';
import { Deposit } from './pages/Deposit';
import { Safe } from './pages/Safe';
import { Vip } from './pages/Vip';
import { TransactionHistory } from './pages/TransactionHistory';
import { CustomerService } from './pages/CustomerService';
import { Admin } from './pages/Admin';
import { BinaryMarket } from './pages/BinaryMarket';
import { AviatorPlane } from './pages/AviatorPlane';
import { LuckyJetGame } from './pages/LuckyJetGame';
import { CoinFlipGame } from './pages/CoinFlipGame';
import { Salary } from './pages/Salary';
import { Gifts } from './pages/Gifts';
import { Attendance } from './pages/Attendance';
import { ChangeNickname } from './pages/ChangeNickname';
import { ChangeLoginPassword } from './pages/ChangeLoginPassword';
import { LanguagePage } from './pages/LanguagePage';
import { MinesGame } from './pages/MinesGame';
import { ActivityAward } from './pages/ActivityAward';
import { BettingRebate } from './pages/BettingRebate';
import { SuperJackpot } from './pages/SuperJackpot';
import { FirstGift } from './pages/FirstGift';
import { K3Game } from './pages/K3Game';
import { D5Game } from './pages/D5Game';
import { GameStatistics } from './pages/GameStatistics';
import { EwiWinGo } from './pages/EwiWinGo';
import { AllCharts } from './pages/AllCharts';
import { PlaneGame } from './pages/PlaneGame';
import { CasinoLobby } from './pages/CasinoLobby';
import { SlotsLobby } from './pages/SlotsLobby';
import { EwiRoulette } from './pages/EwiRoulette';
import { LudoGame } from './pages/LudoGame';
import { MentorPanel } from './pages/MentorPanel';
import { SportsBetting } from './pages/SportsBetting';
import { WelcomeLanding } from './components/WelcomeLanding';
import { ExtraFirstDepositModal } from './components/AccountIcons';
import { WinGoResultPopupModal } from './components/WinGoAssets';
import { CustomerServiceLogo } from './components/BrandLogos';
import { Wrench, ShieldCheck, Ban, PowerOff, LogOut } from 'lucide-react';

export const ADMIN_ACCESS_ROUTE = '/admin-ewi777-panel-009';
export const MENTOR_ACCESS_ROUTE = '/mentor-ewi777-panel';

const isLegacyAdminPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const h = window.location.hash.replace(/^#+/, '').split('?')[0].replace(/\/+$/, '').toLowerCase();
  return p === '/admin' || h === '/admin' || h === 'admin';
};

export const isAuthorizedAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const h = window.location.hash.replace(/^#+/, '').split('?')[0].replace(/\/+$/, '').toLowerCase();
  return p === ADMIN_ACCESS_ROUTE || h === ADMIN_ACCESS_ROUTE || h === 'admin-ewi777-panel-009';
};

export const isAuthorizedMentorRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const h = window.location.hash.replace(/^#+/, '').split('?')[0].replace(/\/+$/, '').toLowerCase();
  return (
    p === MENTOR_ACCESS_ROUTE ||
    p.startsWith(`${MENTOR_ACCESS_ROUTE}/`) ||
    h === MENTOR_ACCESS_ROUTE ||
    h === 'mentor-ewi777-panel' ||
    h.startsWith(`${MENTOR_ACCESS_ROUTE}/`) ||
    h.startsWith('mentor-ewi777-panel/')
  );
};

const MainApp: React.FC = () => {
  const {
    user,
    depositRequests,
    logout,
    activeTab,
    setActiveTab,
    isNavigating,
    adminSettings,
    wingoResultPopup,
    clearWingoResultPopup,
    setFirstDepositModalOpen,
    visitorIpInfo
  } = useApp();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const lastMainTabRef = useRef<string>('');

  // Draggable Customer Service Floating Icon state
  const [csPos, setCsPos] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.max(12, Math.min(window.innerWidth - 68, (window.innerWidth + Math.min(window.innerWidth, 448)) / 2 - 68)) : 310,
    y: typeof window !== 'undefined' ? Math.max(80, window.innerHeight - 152) : 540
  }));
  const csDragRef = React.useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const handleCsPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    csDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: csPos.x,
      origY: csPos.y,
      moved: false
    };
  };

  const handleCsPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = csDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 6) {
      drag.moved = true;
    }
    const maxX = Math.max(12, window.innerWidth - 62);
    const maxY = Math.max(60, window.innerHeight - 76);
    setCsPos({
      x: Math.max(8, Math.min(maxX, drag.origX + dx)),
      y: Math.max(56, Math.min(maxY, drag.origY + dy))
    });
  };

  const handleCsPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = csDragRef.current;
    csDragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (!drag?.moved) {
      setActiveTab('customer-service');
      window.location.hash = '#/customer-service';
    }
  };

  // Explicitly block legacy /admin path and enforce /admin-ewi777-panel-009
  useEffect(() => {
    const validateAdminRoute = () => {
      if (isLegacyAdminPath()) {
        const targetTab = user.isLoggedIn ? 'home' : 'login';
        if (window.location.pathname.toLowerCase() === '/admin') {
          window.history.replaceState(null, '', '/');
        }
        window.location.hash = targetTab === 'home' ? '#/' : '#/login';
        setActiveTab(targetTab);
        return;
      }
      if (isAuthorizedAdminRoute() && window.location.hash !== `#${ADMIN_ACCESS_ROUTE}`) {
        window.location.hash = `#${ADMIN_ACCESS_ROUTE}`;
      }
      if (isAuthorizedMentorRoute() && window.location.hash !== `#${MENTOR_ACCESS_ROUTE}`) {
        window.location.hash = `#${MENTOR_ACCESS_ROUTE}`;
      }
    };
    validateAdminRoute();
    window.addEventListener('hashchange', validateAdminRoute);
    window.addEventListener('popstate', validateAdminRoute);
    return () => {
      window.removeEventListener('hashchange', validateAdminRoute);
      window.removeEventListener('popstate', validateAdminRoute);
    };
  }, [user.isLoggedIn, setActiveTab]);

  // Trigger Extra First Deposit bonus popup ONLY AFTER user's first deposit is completed and NO tier claimed yet
  useEffect(() => {
    if (!user.isLoggedIn) {
      lastMainTabRef.current = '';
      setFirstDepositModalOpen(false);
      return;
    }

    const curDep = Number(user.totalDeposited) || 0;
    const hasCompletedAnyDeposit =
      curDep > 0 ||
      depositRequests.some((d) => d.userId === user.id && d.status === 'approved');

    const claimedMap = user.claimedFirstDepositTiers || {};
    const hasClaimedAnyTier = Object.values(claimedMap).some(Boolean);

    if (!hasCompletedAnyDeposit || hasClaimedAnyTier) {
      setFirstDepositModalOpen(false);
      return;
    }

    const MAIN_TABS = ['home', 'salary', 'activity', 'promotion', 'wallet', 'account'];
    if (MAIN_TABS.includes(activeTab) && lastMainTabRef.current !== activeTab) {
      lastMainTabRef.current = activeTab;
      const hiddenToday = localStorage.getItem('ewi777_fd_hide_date') === getLocalDateStr();
      if (!hiddenToday) {
        setFirstDepositModalOpen(true);
      }
    }
  }, [
    user.isLoggedIn,
    user.id,
    user.totalDeposited,
    user.claimedFirstDepositTiers,
    depositRequests,
    activeTab,
    setFirstDepositModalOpen
  ]);

  const isAuthBlocked = !user.isLoggedIn && !PUBLIC_UNAUTH_TABS.has(activeTab);

  const renderCurrentView = () => {
    if (!user.isLoggedIn && activeTab === 'home') {
      return <WelcomeLanding onOpenLanguage={() => setShowLanguageModal(true)} />;
    }
    if (isAuthBlocked) {
      return <Login onOpenLanguage={() => setShowLanguageModal(true)} />;
    }
    switch (activeTab) {
      case 'home':
        return <Home onOpenLanguage={() => setShowLanguageModal(true)} />;
      case 'casino':
        return <CasinoLobby />;
      case 'slots':
        return <SlotsLobby />;
      case 'ewi-roulette':
        return <EwiRoulette />;
      case 'activity':
        return <Activity />;
      case 'promotion':
        return <Promotion />;
      case 'wallet':
        return <Wallet />;
      case 'account':
        return <Account onOpenLanguage={() => setShowLanguageModal(true)} />;
      case 'login':
        return <Login onOpenLanguage={() => setShowLanguageModal(true)} />;
      case 'register':
      case 'registration':
        return <Register onOpenLanguage={() => setShowLanguageModal(true)} />;
      case 'wingo':
        return <WinGo />;
      case 'deposit':
        return <Deposit />;
      case 'safe':
        return <Safe />;
      case 'vip':
        return <Vip />;
      case 'transaction-history':
        return <TransactionHistory />;
      case 'customer-service':
        return <CustomerService />;
      case 'admin':
        return isAuthorizedAdminRoute() ? (
          <Admin />
        ) : (
          <Login onOpenLanguage={() => setShowLanguageModal(true)} />
        );
      case 'mentor':
        return isAuthorizedMentorRoute() ? (
          <MentorPanel />
        ) : (
          <Login onOpenLanguage={() => setShowLanguageModal(true)} />
        );
      case 'ludo':
        return <LudoGame />;
      case 'sports':
        return <SportsBetting />;
      case 'gold-market':
        return <BinaryMarket initialMarketMode="gold" />;
      case 'binary':
      case 'binary-market':
        return <BinaryMarket initialMarketMode="binary" />;
      case 'aviator':
      case 'aviator-plane':
        return <AviatorPlane />;
      case 'luckyjet':
        return <LuckyJetGame />;
      case 'plane':
        return <PlaneGame />;
      case 'coinflip':
        return <CoinFlipGame />;
      case 'salary':
        return <Salary />;
      case 'gifts':
        return <Gifts />;
      case 'attendence':
      case 'attendance':
        return <Attendance />;
      case 'change-nickname':
        return <ChangeNickname />;
      case 'change-login-password':
        return <ChangeLoginPassword />;
      case 'language':
        return <LanguagePage />;
      case 'mines':
        return <MinesGame />;
      case 'activity-award':
        return <ActivityAward />;
      case 'betting-rebate':
        return <BettingRebate />;
      case 'super-jackpot':
        return <SuperJackpot />;
      case 'first-gift':
        return <FirstGift />;
      case 'k3':
        return <K3Game />;
      case '5d':
        return <D5Game />;
      case 'ewi-wingo':
        return <EwiWinGo />;
      case 'all-chart':
        return <AllCharts />;
      case 'game-statistics':
        return <GameStatistics />;
      default:
        return <Home onOpenLanguage={() => setShowLanguageModal(true)} />;
    }
  };

  if (activeTab === 'admin' && isAuthorizedAdminRoute()) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 selection:bg-cyan-500 selection:text-white">
        {isNavigating ? <PageSkeleton /> : <Admin />}
        <Toast />
      </div>
    );
  }

  if ((activeTab === 'mentor' || isAuthorizedMentorRoute()) && isAuthorizedMentorRoute()) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 selection:bg-cyan-500 selection:text-white">
        {isNavigating ? <PageSkeleton /> : <MentorPanel />}
        <Toast />
      </div>
    );
  }

  const isGuestWelcome = activeTab === 'home' && !user.isLoggedIn;
  const showBottomNav =
    !isGuestWelcome &&
    [
      'home',
      'all-chart',
      'salary',
      'activity',
      'promotion',
      'wallet',
      'account',
      'customer-service'
    ].includes(activeTab);

  const isSiteOff = adminSettings.siteEnabled === false && !isAuthorizedAdminRoute();
  const isIpBanned = Boolean(visitorIpInfo?.isBannedIp && !isAuthorizedAdminRoute());
  const isUserBanned = Boolean(user.isLoggedIn && user.isBanned);

  if (isIpBanned) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center text-slate-900">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-lg mb-5">
          <Ban className="w-10 h-10" />
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Access Restricted (IP Blocked)</h1>
        <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl mb-3">
          IP: {visitorIpInfo.ip || 'Detected'}
        </p>
        <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
          Your network IP has been restricted from accessing Deshi Win by the platform security administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center bg-slate-200 selection:bg-cyan-500 selection:text-white">
      {/* Mobile Frame Container (Locked Light Mode) */}
      <div className="w-full max-w-md min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col relative shadow-2xl overflow-x-hidden">
        {isSiteOff ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#F8FAFC] to-cyan-50">
            <div className="mb-5 drop-shadow-md">
              <Ewi777Logo height={56} logoUrl={adminSettings.appLogoUrl} />
            </div>
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-lg mb-4">
              <PowerOff className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase mb-2">
              SITE IS NOT COMING
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mb-6">
              {adminSettings.appName || 'Deshi Win'} platform access is currently paused by the administrator. Please check back later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-teal-500 text-white font-black text-xs shadow-md active:scale-95"
            >
              Refresh Status
            </button>
          </div>
        ) : adminSettings.maintenanceMode ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#F8FAFC] to-cyan-50">
            <div className="mb-5 drop-shadow-md">
              <Ewi777Logo height={56} logoUrl={adminSettings.appLogoUrl} />
            </div>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-lg mb-5">
              <Wrench className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">
              {adminSettings.appName || 'Deshi Win'} Maintenance
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mb-6">
              Our platform is currently undergoing scheduled system maintenance and upgrades to serve you faster. Please check back shortly.
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-4 py-2 rounded-full bg-white border border-cyan-300 text-cyan-700 font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Check Status</span>
            </button>
          </div>
        ) : isUserBanned && activeTab !== 'customer-service' ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#F8FAFC] to-rose-50">
            <div className="mb-5 drop-shadow-md">
              <Ewi777Logo height={52} logoUrl={adminSettings.appLogoUrl} />
            </div>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-lg mb-5">
              <Ban className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-1.5">Account Suspended</h1>
            <p className="text-xs font-bold text-rose-700 bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl mb-4 max-w-xs">
              Reason: {user.banReason || 'Restricted by Administrator'}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mb-6">
              Your account access is currently locked. Contact 24/7 Customer Support for verification assistance.
            </p>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={() => {
                  setActiveTab('customer-service');
                  window.location.hash = '#/customer-service';
                }}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#0E7490] to-[#06B6D4] text-white font-black text-xs shadow-md"
              >
                Contact Customer Support
              </button>
              <button
                onClick={() => logout()}
                className="w-full py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {isNavigating ? <PageSkeleton /> : renderCurrentView()}

            {showBottomNav && !isNavigating && <BottomNav />}

            {activeTab !== 'customer-service' &&
              activeTab !== 'login' &&
              activeTab !== 'register' &&
              activeTab !== 'registration' && (
                <button
                  type="button"
                  onPointerDown={handleCsPointerDown}
                  onPointerMove={handleCsPointerMove}
                  onPointerUp={handleCsPointerUp}
                  style={{ left: csPos.x, top: csPos.y, touchAction: 'none' }}
                  aria-label="Customer Service"
                  title="24/7 Customer Service (Drag to move)"
                  className="fixed z-30 w-13 h-13 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing active:scale-95 transition-transform select-none"
                >
                  <CustomerServiceLogo size={50} />
                </button>
              )}
          </>
        )}

        <Toast />
        <NotificationModal />
        <AddToDesktopModal />
        <ExtraFirstDepositModal />
        <WinGoResultPopupModal popup={wingoResultPopup} onClose={clearWingoResultPopup} />
        <LanguageModal
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
