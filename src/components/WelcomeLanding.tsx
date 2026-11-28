import React from 'react';
import { useApp } from '../context/AppContext';
import { Globe, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { CustomerServiceLogo, Ewi777Logo } from './BrandLogos';
import welcomeLightImg from '../assets/images/ewi_welcome_light_1795168518724.jpg';
import { getLanguageBadge, getTranslation } from '../utils/i18n';

interface WelcomeLandingProps {
  onOpenLanguage: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({ onOpenLanguage }) => {
  const { language, setActiveTab, adminSettings } = useApp();
  const langBadge = getLanguageBadge(language);

  const goTab = (tab: string, hash: string) => {
    setActiveTab(tab);
    window.location.hash = hash;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between pb-8">
      {/* Top Bar */}
      <header className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2 bg-white">
        <button
          type="button"
          onClick={() => goTab('customer-service', '#/customer-service')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-cyan-200 shadow-xs text-xs font-extrabold text-cyan-800 active:scale-95 transition-transform"
        >
          <CustomerServiceLogo size={24} />
          <span>{getTranslation(language, 'supportCare')}</span>
        </button>

        <div className="px-3.5 py-1.5 rounded-2xl bg-white border border-cyan-100 shadow-2xs flex items-center justify-center">
          <Ewi777Logo height={48} logoUrl={adminSettings.appLogoUrl} />
        </div>

        <button
          type="button"
          onClick={onOpenLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs font-bold text-slate-700 active:scale-95 transition-transform"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-700" />
          <span>{langBadge.flag} {langBadge.short}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="px-4 flex-1 flex flex-col items-center justify-center py-2 space-y-4 max-w-md mx-auto w-full bg-white">
        <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[768/1030] mx-auto overflow-hidden select-none pointer-events-none bg-white">
          <img
            src={welcomeLightImg}
            alt="Deshi Win Official"
            className="w-full h-full object-cover object-top mix-blend-multiply [mask-image:radial-gradient(ellipse_78%_76%_at_50%_48%,black_44%,transparent_94%)] [-webkit-mask-image:radial-gradient(ellipse_78%_76%_at_50%_48%,black_44%,transparent_94%)] block"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_78%_at_50%_48%,transparent_46%,rgba(255,255,255,0.85)_78%,#FFFFFF_100%)]"
          />
        </div>

        <div className="text-center space-y-1.5 px-2 -mt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[11px] font-black text-cyan-800 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>{getTranslation(language, 'welcomePortalTag')}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {getTranslation(language, 'welcomeTitle')}
          </h1>
          <p className="text-xs font-medium text-slate-600 leading-relaxed max-w-xs mx-auto">
            {getTranslation(language, 'welcomeSubtitle')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3 pt-1">
          <button
            type="button"
            onClick={() => goTab('login', '#/login')}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0E7490] via-[#0891B2] to-[#06B6D4] text-white font-black text-sm tracking-wide shadow-[0_10px_24px_rgba(8,145,178,0.28)] active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>{getTranslation(language, 'welcomeLoginBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => goTab('register', '#/register')}
            className="w-full py-3.5 rounded-full bg-white border-2 border-cyan-600 text-cyan-800 font-black text-sm tracking-wide shadow-xs hover:bg-cyan-50 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>{getTranslation(language, 'welcomeRegisterBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => goTab('customer-service', '#/customer-service')}
            className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-cyan-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <CustomerServiceLogo size={22} />
            <span>{getTranslation(language, 'welcomeCareBtn')}</span>
          </button>
        </div>
      </main>

      <footer className="px-4 text-center text-[11px] font-semibold text-slate-400">
        Instant EWI PAY bKash &amp; Nagad • 100% Light Experience
      </footer>
    </div>
  );
};
