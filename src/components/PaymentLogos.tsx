import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

// Official bKash Logo using local brand origami emblem (/assets/brand/bkash-logo.png)
export const BkashLogo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden bg-[#E2136E] flex items-center justify-center shadow-xs flex-shrink-0 border border-pink-200/50`}>
        <img
          src="/assets/brand/bkash-logo.png"
          alt="bKash"
          className="w-full h-full object-cover"
        />
      </div>

      {showText && (
        <span className="font-black tracking-tight text-[#E2136E] font-sans text-sm md:text-base leading-none">
          bKash
        </span>
      )}
    </div>
  );
};

// Official Nagad Logo using local brand emblem (/assets/brand/nagad-logo.png)
export const NagadLogo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-xs flex-shrink-0 border border-orange-200`}>
        <img
          src="/assets/brand/nagad-logo.png"
          alt="Nagad"
          className="w-full h-full object-contain p-0.5"
        />
      </div>

      {showText && (
        <span className="font-black tracking-tight text-[#F15A24] font-sans text-sm md:text-base leading-none">
          Nagad
        </span>
      )}
    </div>
  );
};

// Payment Method Card for Deposit & Withdraw
export const PaymentMethodBadge: React.FC<{
  method: 'bKash' | 'Nagad';
  isSelected?: boolean;
  onClick?: () => void;
  subText?: string;
}> = ({ method, isSelected = false, onClick, subText }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center justify-between ${
        isSelected
          ? method === 'bKash'
            ? 'bg-pink-50/70 border-[#E2136E] ring-2 ring-[#E2136E]/20 shadow-xs'
            : 'bg-orange-50/70 border-[#F7931E] ring-2 ring-[#F7931E]/20 shadow-xs'
          : 'bg-white border-slate-200 hover:border-pink-200'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {method === 'bKash' ? (
          <BkashLogo size="md" showText={false} />
        ) : (
          <NagadLogo size="md" showText={false} />
        )}
        <div>
          <div className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
            <span>{method}</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                method === 'bKash' ? 'bg-[#E2136E]/10 text-[#E2136E]' : 'bg-[#F7931E]/10 text-[#F7931E]'
              }`}
            >
              Official
            </span>
          </div>
          {subText && <div className="text-[10px] text-slate-400 mt-0.5">{subText}</div>}
        </div>
      </div>

      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
          isSelected
            ? method === 'bKash'
              ? 'bg-[#E2136E] border-[#E2136E] text-white'
              : 'bg-[#F7931E] border-[#F7931E] text-white'
            : 'border-slate-300'
        }`}
      >
        {isSelected && <span className="text-[10px] font-black">✓</span>}
      </div>
    </button>
  );
};
