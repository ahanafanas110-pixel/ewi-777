import React from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Check, Globe } from 'lucide-react';
import { getTranslation, LANGUAGE_OPTIONS } from '../utils/i18n';
import { Language } from '../types';

export const LanguagePage: React.FC = () => {
  const { language, setLanguage, setActiveTab, showToast } = useApp();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    const meta = LANGUAGE_OPTIONS.find((o) => o.code === lang);
    showToast(meta?.switchToast || 'Language updated');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Header
        title={getTranslation(language, 'language')}
        showBack
        onBack={() => {
          setActiveTab('account');
          window.location.hash = '#/account';
        }}
      />

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {getTranslation(language, 'selectDisplayLanguage')}
              </h2>
              <p className="text-[11px] text-slate-500">
                {getTranslation(language, 'choosePreferredLanguage')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {LANGUAGE_OPTIONS.map((opt) => {
              const isoCode =
                opt.code === 'en' ? 'US' : opt.code === 'bn' ? 'BD' : opt.code === 'hi' ? 'IN' : 'PK';
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleSelect(opt.code)}
                  className={`w-full min-h-[60px] flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    language === opt.code
                      ? 'border-cyan-600 bg-cyan-50/70 text-cyan-800 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-8 text-center text-base font-black tracking-tight flex-shrink-0">
                      {isoCode}
                    </span>
                    <div className="text-left min-w-0">
                      <div className="font-black text-sm truncate">{opt.nativeName}</div>
                      <div className="text-[11px] opacity-75 truncate">{opt.subtitle}</div>
                    </div>
                  </div>
                  {language === opt.code && (
                    <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
