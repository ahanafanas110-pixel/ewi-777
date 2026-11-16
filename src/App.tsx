import React, { useState, useEffect } from 'react';
import { AppProvider, useApp, PUBLIC_UNAUTH_TABS } from './context/AppContext';
import { Toast } from './components/Toast';
import { BottomNav } from './components/BottomNav';
import { LanguageModal } from './components/LanguageModal';
import { PageSkeleton } from './components/PageSkeleton';
import { NotificationModal } from './components/NotificationModal';
import { AddToDesktopModal } from './components/AddToDesktop';
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
import { ExtraFirstDepositModal } from './components/AccountIcons';
import { CustomerServiceLogo } from './components/BrandLogos';
import { Megaphone, Wrench, ShieldCheck, X } from 'lucide-react';

export const ADMIN_ACCESS_ROUTE = '/admin-ewi777-panel-009';

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

const MainApp: React.FC = () => {
  const { user, activeTab, setActiveTab, isNavigating, adminSettings } = useApp();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [dismissedPopupKey, setDismissedPopupKey] = useState<string>('');
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashFading, setSplashFading] = useState<boolean>(false);

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

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 1750);
    const hideTimer = setTimeout(() => setShowSplash(false), 2050);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

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
    };
    validateAdminRoute();
    window.addEventListener('hashchange', validateAdminRoute);
    window.addEventListener('popstate', validateAdminRoute);
    return () => {
      window.removeEventListener('hashchange', validateAdminRoute);
      window.removeEventListener('popstate', validateAdminRoute);
    };
  }, [user.isLoggedIn, setActiveTab]);

  const isAuthBlocked = !user.isLoggedIn && !PUBLIC_UNAUTH_TABS.has(activeTab);

  const renderCurrentView = () => {
    if (isAuthBlocked) {
      return <Login onOpenLanguage={() => setShowLanguageModal(true)} />;
    }
    switch (activeTab) {
      case 'home':
        return <Home onOpenLanguage={() => setShowLanguageModal(true)} />;
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
      case 'binary':
      case 'binary-market':
        return <BinaryMarket />;
      case 'aviator':
      case 'aviator-plane':
        return <AviatorPlane />;
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
      default:
        return <Home onOpenLanguage={() => setShowLanguageModal(true)} />;
    }
  };

  if (activeTab === 'admin' && isAuthorizedAdminRoute()) {
    return (
      <div className="min-h-screen w-full bg-[#070E1B] text-white selection:bg-[#FF2A7A] selection:text-white">
        {isNavigating ? <PageSkeleton /> : <Admin />}
        <Toast />
      </div>
    );
  }

  const showBottomNav =
    user.isLoggedIn && ['home', 'activity', 'promotion', 'wallet', 'account'].includes(activeTab);
  const popupKey = `${adminSettings.popupTitle || ''}::${adminSettings.popupMessage || ''}`;
  const showSystemPopup =
    Boolean(adminSettings.enableSystemPopup) &&
    Boolean(adminSettings.popupMessage?.trim()) &&
    dismissedPopupKey !== popupKey;

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center selection:bg-[#FF2A7A] selection:text-white">
      {/* 2-Second Official EWI 777 Crown Entry Splash Screen */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-[100] bg-gradient-to-b from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] flex flex-col items-center justify-center p-6 transition-opacity duration-300 ${
            splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="w-full max-w-sm flex flex-col items-center space-y-5">
            <img
              src="/ewi777-logo-transparent.png"
              alt={adminSettings.appName || 'EWI 777'}
              referrerPolicy="no-referrer"
              className="w-80 max-w-[85vw] object-contain drop-shadow-[0_14px_30px_rgba(0,0,0,0.3)]"
            />
            <div className="w-44 h-1.5 rounded-full bg-white/30 overflow-hidden shadow-inner">
              <div
                className="h-full bg-white rounded-full transition-all duration-[1800ms] ease-out"
                style={{ width: splashFading ? '100%' : '88%' }}
              />
            </div>
            <div className="text-xs font-black tracking-widest uppercase text-white/90">
              {adminSettings.appName || 'EWI 777'} Official
            </div>
          </div>
        </div>
      )}

      {/* Mobile Frame Container */}
      <div className="w-full max-w-md min-h-screen bg-[#FFF8FA] flex flex-col relative shadow-2xl overflow-x-hidden">
        {adminSettings.maintenanceMode ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FFF8FA] to-pink-50">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF2A7A] to-[#FF5A92] text-white flex items-center justify-center shadow-lg mb-5">
              <Wrench className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">
              {adminSettings.appName || 'EWI 777'} Maintenance
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mb-6">
              Our platform is currently undergoing scheduled system maintenance and upgrades to serve you faster. Please check back shortly.
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-4 py-2 rounded-full bg-white border border-pink-200 text-[#FF2A7A] font-bold text-xs flex items-center gap-1.5 shadow-xs hover:bg-pink-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Check Status</span>
            </button>
          </div>
        ) : (
          <>
            {isNavigating ? <PageSkeleton /> : renderCurrentView()}

            {showBottomNav && !isNavigating && <BottomNav />}

            {activeTab !== 'customer-service' && activeTab !== 'login' && activeTab !== 'register' && activeTab !== 'registration' && (
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

        {/* System Announcement Popup (Controlled from Admin Broadcast Tab) */}
        {!adminSettings.maintenanceMode && showSystemPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-pink-100">
              <div className="bg-gradient-to-r from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-sm tracking-tight">
                    {adminSettings.popupTitle || 'System Announcement'}
                  </h3>
                </div>
                <button
                  onClick={() => setDismissedPopupKey(popupKey)}
                  className="p-1 rounded-full hover:bg-white/20 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {adminSettings.popupMessage}
                </p>
                <button
                  onClick={() => setDismissedPopupKey(popupKey)}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-black text-xs shadow-md active:scale-98 transition-all"
                >
                  I Know
                </button>
              </div>
            </div>
          </div>
        )}

        <Toast />
        <NotificationModal />
        <AddToDesktopModal />
        <ExtraFirstDepositModal />
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
