import React from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { Home as HomeIcon, Coins, ArrowLeftRight, Heart, User as UserIcon } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useApp();

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab === 'home' ? '' : tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    {
      id: 'home',
      label: getTranslation(language, 'home') || 'Home',
      icon: HomeIcon,
      isActive: activeTab === 'home'
    },
    {
      id: 'salary',
      label: language === 'bn' ? 'স্যালারি' : 'Salary',
      icon: Coins,
      isActive: activeTab === 'salary' || activeTab === 'activity'
    },
    {
      id: 'binary',
      label: language === 'bn' ? 'ট্রেড' : 'Trade',
      icon: ArrowLeftRight,
      isActive: activeTab === 'binary' || activeTab === 'gold-market'
    },
    {
      id: 'promotion',
      label: getTranslation(language, 'promotion') || 'Promotion',
      icon: Heart,
      isActive: activeTab === 'promotion'
    },
    {
      id: 'account',
      label: getTranslation(language, 'account') || 'Account',
      icon: UserIcon,
      isActive: activeTab === 'account' || activeTab === 'wallet'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 px-2 pb-2 pt-1 select-none pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-[1.5rem] border border-slate-200/90 shadow-[0_-6px_26px_rgba(15,23,42,0.08)] px-1.5 py-1.5 grid grid-cols-5 items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`min-h-[52px] rounded-2xl flex flex-col items-center justify-center gap-0.5 px-1 transition-all active:scale-95 ${
                item.isActive
                  ? 'bg-cyan-50 border border-cyan-400/70 text-cyan-800 shadow-[0_0_14px_rgba(8,145,178,0.16)]'
                  : 'border border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  item.isActive ? 'text-cyan-700 stroke-[2.4]' : 'text-slate-500 stroke-[1.9]'
                }`}
              />
              <span
                className={`text-[10.5px] leading-none whitespace-nowrap ${
                  item.isActive ? 'font-black text-cyan-800' : 'font-semibold text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
