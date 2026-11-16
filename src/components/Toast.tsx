import React from 'react';
import { useApp } from '../context/AppContext';
import { Check } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-[120] animate-fade-in">
      <div className="bg-[#333333]/90 text-white px-5 py-4 rounded-xl flex flex-col items-center gap-2 shadow-2xl backdrop-blur-sm min-w-[130px] border border-white/10">
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
          <Check className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <span className="text-sm font-medium tracking-wide text-center">{toastMessage}</span>
      </div>
    </div>
  );
};
