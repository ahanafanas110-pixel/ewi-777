import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check } from 'lucide-react';
import { Language } from '../types';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, showToast } = useApp();

  if (!isOpen) return null;

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    showToast(lang === 'en' ? 'Language switched to English' : 'ভাষা পরিবর্তন করা হয়েছে');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F6F7FB] flex flex-col max-w-md mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-slate-700 hover:text-red-500 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h2 className="text-base font-bold text-slate-800">Language</h2>
        <div className="w-6" />
      </div>

      {/* Language List */}
      <div className="p-4 space-y-3">
        {/* English */}
        <button
          onClick={() => handleSelect('en')}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-100 shadow-xs active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇺🇸</span>
            <span className="font-semibold text-slate-800 text-sm">English</span>
          </div>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
              language === 'en'
                ? 'bg-[#F84545] border-[#F84545] text-white'
                : 'border-slate-300'
            }`}
          >
            {language === 'en' && <Check className="w-4 h-4 stroke-[3]" />}
          </div>
        </button>

        {/* Bengali */}
        <button
          onClick={() => handleSelect('bn')}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-100 shadow-xs active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇧🇩</span>
            <span className="font-semibold text-slate-800 text-sm">বাংলা</span>
          </div>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
              language === 'bn'
                ? 'bg-[#F84545] border-[#F84545] text-white'
                : 'border-slate-300'
            }`}
          >
            {language === 'bn' && <Check className="w-4 h-4 stroke-[3]" />}
          </div>
        </button>
      </div>
    </div>
  );
};
