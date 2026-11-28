import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check } from 'lucide-react';
import { Language } from '../types';
import { getTranslation, LANGUAGE_OPTIONS } from '../utils/i18n';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, showToast } = useApp();

  if (!isOpen) return null;

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    const meta = LANGUAGE_OPTIONS.find((o) => o.code === lang);
    showToast(meta?.switchToast || 'Language updated');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col max-w-md mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="bg-white px-4 py-3 border-b border-cyan-100 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="relative z-20 p-2 -ml-1.5 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-cyan-600 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h2 className="text-base font-bold text-slate-800">
          {getTranslation(language, 'language')}
        </h2>
        <div className="w-6" />
      </div>

      {/* Language List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {LANGUAGE_OPTIONS.map((opt) => {
          const isoCode =
            opt.code === 'en' ? 'US' : opt.code === 'bn' ? 'BD' : opt.code === 'hi' ? 'IN' : 'PK';
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code)}
              className={`w-full bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between border shadow-xs active:scale-98 transition-all ${
                language === opt.code
                  ? 'border-cyan-500 bg-cyan-50/40'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-8 text-center text-base font-black text-slate-800 tracking-tight flex-shrink-0">
                  {isoCode}
                </span>
                <div className="text-left min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{opt.nativeName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{opt.subtitle}</div>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                  language === opt.code
                    ? 'bg-cyan-600 border-cyan-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {language === opt.code && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
