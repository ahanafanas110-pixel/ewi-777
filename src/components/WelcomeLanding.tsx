import React from 'react';
import { useApp } from '../context/AppContext';
import { Globe, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { CustomerServiceLogo, Ewi777Logo } from './BrandLogos';
import welcomeLightImg from '../assets/images/ewi_welcome_light_1795168518724.jpg';

interface WelcomeLandingProps {
  onOpenLanguage: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({ onOpenLanguage }) => {
  const { language, setActiveTab, adminSettings } = useApp();

  const goTab = (tab: string, hash: string) => {
    setActiveTab(tab);
    window.location.hash = hash;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-white to-[#ECFEFF] text-slate-900 flex flex-col justify-between pb-8">
      {/* Top Bar */}
      <header className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goTab('customer-service', '#/customer-service')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-cyan-200 shadow-xs text-xs font-extrabold text-cyan-800 active:scale-95 transition-transform"
        >
          <CustomerServiceLogo size={24} />
          <span>{language === 'bn' ? 'সাপোর্ট' : 'Care'}</span>
        </button>

        <Ewi777Logo height={44} logoUrl={adminSettings.appLogoUrl} />

        <button
          type="button"
          onClick={onOpenLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs font-bold text-slate-700 active:scale-95 transition-transform"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-700" />
          <span>{language === 'en' ? 'EN' : 'বাংলা'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="px-4 flex-1 flex flex-col items-center justify-center py-4 space-y-5">
        <div className="w-full rounded-3xl overflow-hidden bg-white border border-cyan-200 shadow-[0_14px_36px_rgba(8,145,178,0.14)]">
          <img
            src={welcomeLightImg}
            alt="EWI 777 Official"
            className="w-full h-64 sm:h-72 object-cover block"
          />
        </div>

        <div className="text-center space-y-1.5 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[11px] font-black text-cyan-800 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>EWI 777 Official Portal</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {language === 'bn' ? 'EWI 777-এ স্বাগতম' : 'Welcome to EWI 777'}
          </h1>
          <p className="text-xs font-medium text-slate-600 leading-relaxed max-w-xs mx-auto">
            {language === 'bn'
              ? 'লগইন বা রেজিস্ট্রেশন করে WinGo, EWI Roulette, Casino, Slots ও লাইভ মার্কেট উপভোগ করুন।'
              : 'Sign in or create an account to access WinGo, EWI Roulette, Casino, Slots, and live synchronized markets.'}
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
            <span>{language === 'bn' ? 'লগইন' : 'LOGIN'}</span>
          </button>

          <button
            type="button"
            onClick={() => goTab('register', '#/register')}
            className="w-full py-3.5 rounded-full bg-white border-2 border-cyan-600 text-cyan-800 font-black text-sm tracking-wide shadow-xs hover:bg-cyan-50 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'bn' ? 'রেজিস্ট্রেশন' : 'REGISTER'}</span>
          </button>

          <button
            type="button"
            onClick={() => goTab('customer-service', '#/customer-service')}
            className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-cyan-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <CustomerServiceLogo size={22} />
            <span>{language === 'bn' ? '২৪/৭ কাস্টমার কেয়ার' : '24/7 Customer Care'}</span>
          </button>
        </div>
      </main>

      <footer className="px-4 text-center text-[11px] font-semibold text-slate-400">
        Instant EWI PAY bKash &amp; Nagad • 100% Light Experience
      </footer>
    </div>
  );
};
