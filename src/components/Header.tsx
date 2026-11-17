import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Mail, Download } from 'lucide-react';
import { Ewi777Logo } from './BrandLogos';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showRightIcons?: boolean;
  onLanguageClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack,
  onBack,
  showRightIcons = true,
  onLanguageClick,
}) => {
  const {
    language,
    adminSettings,
    setActiveTab,
    setShowInstallModal,
    unreadNotificationsCount,
    setIsNotificationOpen,
    markNotificationsRead
  } = useApp();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveTab('home');
      window.location.hash = '#/';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-amber-100 px-3.5 py-2 relative flex items-center justify-between min-h-[66px] shadow-xs">
      <div className="relative z-10 flex items-center gap-2">
        {showBack ? (
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-700 hover:text-[#B45309] active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        ) : !title ? (
          <div className="w-6" />
        ) : null}

        {title && (
          <h1 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h1>
        )}
      </div>

      {!title && (
        <div
          onClick={() => {
            setActiveTab('home');
            window.location.hash = '#/';
          }}
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer active:scale-98 transition-transform max-w-[46%]"
        >
          <Ewi777Logo height={60} logoUrl={adminSettings.appLogoUrl} />
        </div>
      )}

      {showRightIcons && (
        <div className="relative z-10 flex items-center gap-2">
          {onLanguageClick && (
            <button
              onClick={onLanguageClick}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-slate-700 active:scale-95 transition-all"
            >
              {language === 'en' ? (
                <>
                  <span className="text-sm">🇺🇸</span>
                  <span>EN</span>
                </>
              ) : (
                <>
                  <span className="text-sm">🇧🇩</span>
                  <span>বাংলা</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => {
              markNotificationsRead();
              setIsNotificationOpen(true);
            }}
            className="relative p-1.5 text-slate-600 hover:text-[#D97706] active:scale-95 transition-transform"
            aria-label="Notifications"
          >
            <Mail className="w-5 h-5 text-[#D97706]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D97706] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white tabular-nums">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowInstallModal(true)}
            aria-label="Add to Home Screen or Desktop"
            className="p-1.5 text-[#D97706] hover:text-[#B45309] active:scale-95 transition-transform"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      )}
    </header>
  );
};
