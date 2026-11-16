import React from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';

const NavHomeIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="13.5" r="6" fill={active ? '#FFCCD2' : '#E2E8F0'} />
    <path
      d="M4.5 10.5L12 4.5L19.5 10.5V19C19.5 19.5523 19.0523 20 18.5 20H5.5C4.94772 20 4.5 19.5523 4.5 19V10.5Z"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.8 20V14.5C9.8 13.9477 10.2477 13.5 10.8 13.5H13.2C13.7523 13.5 14.2 13.9477 14.2 14.5V20"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NavActivityIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="13" r="6" fill={active ? '#FFCCD2' : '#E2E8F0'} />
    <rect
      x="5"
      y="6.5"
      width="14"
      height="13.5"
      rx="3.5"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.9"
    />
    <path
      d="M9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

const NavWalletIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11.5" cy="13.5" r="6" fill={active ? '#FFCCD2' : '#E2E8F0'} />
    <path
      d="M7 8L12 4.8L16.5 8"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="4.5"
      y="8"
      width="15"
      height="11.5"
      rx="3.2"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.9"
    />
    <path
      d="M15 13.75H19.5"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <circle cx="16.2" cy="13.75" r="1.1" fill={active ? '#FF5959' : '#7A869A'} />
  </svg>
);

const NavAccountIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12.5" r="6" fill={active ? '#FFCCD2' : '#E2E8F0'} />
    <path
      d="M18 6.5H12C8.41015 6.5 5.5 9.41015 5.5 13C5.5 16.5899 8.41015 19.5 12 19.5C15.5899 19.5 18.5 16.5899 18.5 13V11.2"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <path
      d="M9.8 14C10.4 14.9 11.15 15.3 12 15.3C12.85 15.3 13.6 14.9 14.2 14"
      stroke={active ? '#FF5959' : '#7A869A'}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useApp();

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab === 'home' ? '' : tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 h-[68px] select-none pointer-events-auto">
      {/* Curved Notched White Background Surface */}
      <svg
        viewBox="0 0 375 68"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full drop-shadow-[0_-6px_18px_rgba(15,23,42,0.08)]"
      >
        <path
          d="M0,18 Q0,0 18,0 L134,0 C148,0 154,11 161,22 C169,34 178,38 187.5,38 C197,38 206,34 214,22 C221,11 227,0 241,0 L357,0 Q375,0 375,18 L375,68 L0,68 Z"
          fill="#FFFFFF"
        />
      </svg>

      {/* Nav Items */}
      <div className="relative z-10 grid grid-cols-5 items-end h-full pb-2 px-1">
        {/* Home */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
        >
          <NavHomeIcon active={activeTab === 'home'} />
          <span
            className={`text-[11px] font-semibold leading-none ${
              activeTab === 'home' ? 'text-[#FF5959]' : 'text-[#7A869A]'
            }`}
          >
            {getTranslation(language, 'home')}
          </span>
        </button>

        {/* Activity */}
        <button
          type="button"
          onClick={() => handleNav('activity')}
          className="flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
        >
          <NavActivityIcon active={activeTab === 'activity'} />
          <span
            className={`text-[11px] font-semibold leading-none ${
              activeTab === 'activity' ? 'text-[#FF5959]' : 'text-[#7A869A]'
            }`}
          >
            {getTranslation(language, 'activity')}
          </span>
        </button>

        {/* Center Raised Coral-Pink Promotion Diamond */}
        <div className="flex flex-col items-center justify-end relative">
          <button
            type="button"
            onClick={() => handleNav('promotion')}
            aria-label="Promotion"
            className="w-[54px] h-[54px] -mt-9 rounded-full bg-gradient-to-b from-[#FF7B7B] to-[#FF575F] shadow-[0_6px_16px_rgba(255,87,95,0.42)] ring-[3.5px] ring-white flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg width="26" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7 2H21L26 8.5L14 22L2 8.5L7 2Z"
                fill="white"
              />
              <path d="M5.5 8.5H22.5" stroke="#FF5E65" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10.5 9.5L14 17.5L17.5 9.5" stroke="#FF5E65" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span
            className={`text-[11px] font-semibold leading-none mt-1.5 ${
              activeTab === 'promotion' ? 'text-[#FF5959]' : 'text-[#7A869A]'
            }`}
          >
            {getTranslation(language, 'promotion')}
          </span>
        </div>

        {/* Wallet */}
        <button
          type="button"
          onClick={() => handleNav('wallet')}
          className="flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
        >
          <NavWalletIcon active={activeTab === 'wallet'} />
          <span
            className={`text-[11px] font-semibold leading-none ${
              activeTab === 'wallet' ? 'text-[#FF5959]' : 'text-[#7A869A]'
            }`}
          >
            {getTranslation(language, 'wallet')}
          </span>
        </button>

        {/* Account */}
        <button
          type="button"
          onClick={() => handleNav('account')}
          className="flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
        >
          <NavAccountIcon active={activeTab === 'account'} />
          <span
            className={`text-[11px] font-semibold leading-none ${
              activeTab === 'account' ? 'text-[#FF5959]' : 'text-[#7A869A]'
            }`}
          >
            {getTranslation(language, 'account')}
          </span>
        </button>
      </div>
    </nav>
  );
};
