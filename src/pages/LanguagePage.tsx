import React from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Check, Globe } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { Language } from '../types';

export const LanguagePage: React.FC = () => {
  const { language, setLanguage, setActiveTab, showToast } = useApp();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    showToast(lang === 'en' ? 'Language switched to English' : 'ভাষা বাংলায় পরিবর্তন করা হয়েছে');
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      <Header
        title={getTranslation(language, 'language')}
        showBack
        onBack={() => {
          setActiveTab('account');
          window.location.hash = '#/account';
        }}
      />

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-pink-100 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-pink-50">
            <div className="w-11 h-11 rounded-2xl bg-pink-50 text-[#FF2A7A] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Select Display Language</h2>
              <p className="text-[11px] text-slate-500">Choose your preferred EWI 777 interface language</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleSelect('en')}
              className={`w-full min-h-[60px] flex items-center justify-between p-4 rounded-2xl border transition-all ${
                language === 'en'
                  ? 'border-[#FF2A7A] bg-pink-50/70 text-[#FF2A7A] shadow-xs'
                  : 'border-slate-100 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className="text-2xl">🇺🇸</span>
                <div className="text-left">
                  <div className="font-black text-sm">English</div>
                  <div className="text-[11px] opacity-75">Default international interface</div>
                </div>
              </div>
              {language === 'en' && (
                <span className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </button>

            <button
              onClick={() => handleSelect('bn')}
              className={`w-full min-h-[60px] flex items-center justify-between p-4 rounded-2xl border transition-all ${
                language === 'bn'
                  ? 'border-[#FF2A7A] bg-pink-50/70 text-[#FF2A7A] shadow-xs'
                  : 'border-slate-100 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className="text-2xl">🇧🇩</span>
                <div className="text-left">
                  <div className="font-black text-sm">বাংলা (Bengali)</div>
                  <div className="text-[11px] opacity-75">বাংলাদেশের নিজস্ব ভাষা</div>
                </div>
              </div>
              {language === 'bn' && (
                <span className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
