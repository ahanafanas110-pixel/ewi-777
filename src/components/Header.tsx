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
    <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-3.5 py-2 relative flex items-center justify-between min-h-[66px] shadow-xs">
      <div className="relative z-10 flex items-center gap-2">
        {showBack ? (
          <button
            onClick={handleBack}
            className="p-1 -ml-1 text-slate-700 hover:text-red-500 active:scale-95 transition-transform"
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
        <div className="relative z-10 flex items-center gap-2.5">
          {onLanguageClick && (
            <button
              onClick={onLanguageClick}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50/70 border border-pink-100 text-xs font-bold text-slate-700 active:scale-95 transition-all"
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

          {/* Mail / Notifications */}
          <button
            onClick={() => {
              markNotificationsRead();
              setIsNotificationOpen(true);
            }}
            className="relative p-1 text-slate-600 hover:text-[#FF2A7A] active:scale-95 transition-transform"
            aria-label="Notifications"
          >
            <Mail className="w-5 h-5 text-pink-500" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF2A7A] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Download / Install App Shortcut icon */}
          <button
            onClick={() => setShowInstallModal(true)}
            aria-label="Add to Home Screen or Desktop"
            className="p-1 text-[#FF2A7A] hover:text-pink-600 active:scale-95 transition-transform"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      )}
    </header>
  );
};
