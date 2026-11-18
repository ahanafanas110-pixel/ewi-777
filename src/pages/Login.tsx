import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Smartphone, Mail, Lock, Eye, EyeOff, Check, ShieldCheck, Ban } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { Ewi777Logo, CustomerServiceLogo } from '../components/BrandLogos';
import { EventRewardsModal } from '../components/AccountIcons';
import { SliderCaptchaModal } from '../components/SliderCaptchaModal';
import { normalizeBdDigitsInput } from '../utils/phoneAndApi';

interface LoginProps {
  onOpenLanguage?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onOpenLanguage }) => {
  const {
    user,
    login,
    setActiveTab,
    language,
    showToast,
    adminSettings,
    banNotice,
    clearBanNotice
  } = useApp();
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(true);
  const [countryCode, setCountryCode] = useState('+880');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [showEventRewards, setShowEventRewards] = useState<boolean>(!user.isLoggedIn);
  const [banAlert, setBanAlert] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setBanAlert(null);
    clearBanNotice();
    const target =
      authMode === 'phone'
        ? phoneNumber.trim().startsWith('+') || phoneNumber.trim().startsWith('0')
          ? phoneNumber.trim()
          : `${countryCode}${phoneNumber.trim()}`
        : email.trim();
    if (!target || !password) {
      showToast('Please enter phone/email and password');
      return;
    }
    setPendingTarget(target);
    setCaptchaOpen(true);
  };

  const handleCaptchaVerified = async () => {
    setCaptchaOpen(false);
    if (!pendingTarget || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await login(pendingTarget, password, rememberPassword);
      if (!res.success) {
        if (res.message.toLowerCase().includes('banned')) {
          setBanAlert('This account has been banned. Please contact Customer Care.');
        }
        showToast(res.message);
      }
    } finally {
      setIsSubmitting(false);
      setPendingTarget(null);
    }
  };

  const activeBanText = banAlert || banNotice;

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex flex-col pb-24">
      {/* Luxury Gold Gradient Header */}
      <div className="bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white pt-3 pb-8 px-4 rounded-b-[2rem] shadow-md">
        <div className="relative flex items-center justify-between min-h-[62px] mb-4">
          {user.isLoggedIn ? (
            <button
              onClick={() => {
                setActiveTab('home');
                window.location.hash = '#/';
              }}
              className="relative z-10 p-1 -ml-1 text-white hover:opacity-80 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <div className="relative z-10 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-amber-200" />
            </div>
          )}

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
            <Ewi777Logo height={62} logoUrl={adminSettings.appLogoUrl} />
          </div>

          <button
            onClick={onOpenLanguage}
            className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-white hover:bg-white/30 active:scale-95 transition-all"
          >
            <span>{language === 'en' ? '🇺🇸' : '🇧🇩'}</span>
            <span>{language === 'en' ? 'EN' : 'বাংলা'}</span>
          </button>
        </div>

        <div className="px-1 mt-2">
          <h2 className="text-2xl font-black tracking-tight mb-2">
            {getTranslation(language, 'login')}
          </h2>
          <p className="text-xs text-amber-100 leading-relaxed font-normal">
            Please log in with your phone number or email
            <br />
            If you forget your password, please contact customer service
          </p>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-200">
          {activeBanText && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2 shadow-2xs">
              <div className="flex items-start gap-2 text-xs font-black">
                <Ban className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{activeBanText}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearBanNotice();
                  setBanAlert(null);
                  setActiveTab('customer-service');
                  window.location.hash = '#/customer-service';
                }}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-2xs active:scale-98"
              >
                Contact Customer Care →
              </button>
            </div>
          )}

          <div className="mb-4 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-[#B45309] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Account login or registration is required to enter WinGo, Aviator &amp; Gold Markets.</span>
          </div>

          {/* Tabs: Phone Number vs Email */}
          <div className="grid grid-cols-2 border-b border-amber-100 mb-6">
            <button
              type="button"
              onClick={() => setAuthMode('phone')}
              className={`pb-3 flex flex-col items-center gap-1 text-sm font-bold relative transition-colors ${
                authMode === 'phone' ? 'text-[#D97706]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  authMode === 'phone' ? 'bg-amber-50 text-[#D97706]' : 'text-slate-400'
                }`}
              >
                <Smartphone className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span>{getTranslation(language, 'phoneNumber')}</span>
              {authMode === 'phone' && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#D97706] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('email')}
              className={`pb-3 flex flex-col items-center gap-1 text-sm font-bold relative transition-colors ${
                authMode === 'email' ? 'text-[#B45309]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  authMode === 'email' ? 'bg-amber-50 text-[#B45309]' : 'text-slate-400'
                }`}
              >
                <Mail className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span>{getTranslation(language, 'email')}</span>
              {authMode === 'email' && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#B45309] rounded-full" />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'phone' ? (
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <div className="w-5 h-5 rounded bg-amber-50 text-[#D97706] flex items-center justify-center">
                    <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span>{getTranslation(language, 'phoneNumber')}</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative min-w-[85px]">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full bg-[#FFFDF7] border border-amber-200 rounded-xl px-3 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none"
                    >
                      <option value="+880">+880</option>
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>

                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={countryCode === '+880' ? 10 : 14}
                    value={phoneNumber}
                    onChange={(e) => {
                      const val =
                        countryCode === '+880'
                          ? normalizeBdDigitsInput(e.target.value)
                          : e.target.value.replace(/\D/g, '').slice(0, 14);
                      setPhoneNumber(val);
                    }}
                    placeholder={countryCode === '+880' ? '17XXXXXXXX (10 digits)' : getTranslation(language, 'pleaseEnterPhone')}
                    className="flex-1 bg-[#FFFDF7] border border-amber-200 rounded-xl px-3 py-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <div className="w-5 h-5 rounded bg-amber-50 text-[#D97706] flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span>{getTranslation(language, 'email')}</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={getTranslation(language, 'pleaseEnterEmail')}
                  className="w-full bg-[#FFFDF7] border border-amber-200 rounded-xl px-3 py-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                <div className="w-5 h-5 rounded bg-amber-50 text-[#D97706] flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>{getTranslation(language, 'password')}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={getTranslation(language, 'pleaseEnterPassword')}
                  className="w-full bg-[#FFFDF7] border border-amber-200 rounded-xl px-3 py-3 pr-10 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRememberPassword(!rememberPassword)}
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                    rememberPassword ? 'bg-[#D97706] text-white' : 'border border-slate-300'
                  }`}
                >
                  {rememberPassword && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-slate-600 font-medium">
                  {getTranslation(language, 'rememberPassword')}
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('customer-service');
                  window.location.hash = '#/customer-service';
                }}
                className="text-[#D97706] font-semibold hover:underline"
              >
                {getTranslation(language, 'forgotPassword')}
              </button>
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-bold text-sm shadow-md active:scale-98 transition-all hover:brightness-105 tracking-wide disabled:opacity-60"
              >
                {isSubmitting ? 'Logging in...' : getTranslation(language, 'login')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  window.location.hash = '#/registration';
                }}
                className="w-full py-3.5 rounded-full border border-amber-300 text-[#B45309] font-bold text-sm hover:bg-amber-50 active:scale-98 transition-all"
              >
                {getTranslation(language, 'register')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('customer-service');
                  window.location.hash = '#/customer-service';
                }}
                className="w-full py-2.5 rounded-full bg-slate-50 hover:bg-amber-50/70 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <CustomerServiceLogo size={24} />
                <span>24/7 Customer Service</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <SliderCaptchaModal
        isOpen={captchaOpen}
        onSuccess={handleCaptchaVerified}
        onClose={() => {
          setCaptchaOpen(false);
          setPendingTarget(null);
        }}
      />

      <EventRewardsModal
        isOpen={showEventRewards && !user.isLoggedIn}
        onLoginClick={() => setShowEventRewards(false)}
        onContinueBrowsing={() => setShowEventRewards(false)}
      />
    </div>
  );
};
