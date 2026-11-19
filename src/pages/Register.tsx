import React, { useState, useEffect } from 'react';
import { useApp, PASSWORD_REGEX, PASSWORD_RULE_MSG } from '../context/AppContext';
import { ArrowLeft, Smartphone, Lock, Eye, EyeOff, Gift, Check, AlertCircle } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { Ewi777Logo } from '../components/BrandLogos';
import { SliderCaptchaModal } from '../components/SliderCaptchaModal';
import {
  isValidBdLocalTenDigits,
  normalizeBdDigitsInput
} from '../utils/phoneAndApi';

interface RegisterProps {
  onOpenLanguage?: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onOpenLanguage }) => {
  const { user, register, setActiveTab, language, showToast, invitationParam, adminSettings } = useApp();
  const registrationDisabled = adminSettings.registrationEnabled === false;
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(true);
  const [countryCode, setCountryCode] = useState('+880');

  const [passwordError, setPasswordError] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const urlCode =
      invitationParam ||
      sessionStorage.getItem('win777_invite_code') ||
      '';
    if (urlCode) {
      setInviteCode(urlCode);
    }
  }, [invitationParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setPasswordError('');
    setInviteError('');

    if (!phoneNumber.trim()) {
      showToast('Please enter your phone number');
      return;
    }
    if (countryCode === '+880' && !isValidBdLocalTenDigits(phoneNumber)) {
      showToast('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setPasswordError(PASSWORD_RULE_MSG);
      showToast(PASSWORD_RULE_MSG);
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }
    if (!agreePrivacy) {
      showToast('Please agree to Privacy Agreement');
      return;
    }

    setCaptchaOpen(true);
  };

  const handleCaptchaVerified = async () => {
    setCaptchaOpen(false);
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const cleaned = phoneNumber.trim();
      const fullPhone = cleaned.startsWith('+') ? cleaned : `${countryCode}${cleaned.replace(/^0+/, '')}`;
      const res = await register(fullPhone, password, inviteCode.trim());
      if (!res.success) {
        const upper = res.message.toUpperCase();
        if (upper.includes('INVITE CODE') || upper.includes('REFER CODE')) {
          setInviteError('Refer Code is not Valid');
        }
        showToast(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const showPwLiveError = password.length > 0 && !PASSWORD_REGEX.test(password);

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex flex-col pb-24">
      {/* Luxury Gold Header */}
      <div className="bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white pt-3 pb-8 px-4 rounded-b-[2rem] shadow-md">
        <div className="relative flex items-center justify-between min-h-[62px] mb-4">
          <button
            onClick={() => {
              if (user.isLoggedIn) {
                setActiveTab('home');
                window.location.hash = '#/';
              } else {
                setActiveTab('login');
                window.location.hash = '#/login';
              }
            }}
            className="relative z-10 p-1 -ml-1 text-white hover:opacity-80 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

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
            {getTranslation(language, 'register')}
          </h2>
          <p className="text-xs text-amber-100 leading-relaxed font-normal">
            Please register by phone number
          </p>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-200">
          <div className="border-b border-amber-100 mb-6 flex justify-center">
            <div className="pb-3 flex flex-col items-center gap-1 text-sm font-bold relative text-[#D97706]">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-[#D97706] flex items-center justify-center">
                <Smartphone className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span>Register your phone</span>
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#D97706] rounded-full" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number */}
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
                </div>

                <div className="relative flex-1">
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
                    placeholder={countryCode === '+880' ? '1XXXXXXXXX' : getTranslation(language, 'pleaseEnterPhone')}
                    className="w-full bg-[#FFFDF7] border border-amber-200 rounded-xl px-3 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Set Password */}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder={getTranslation(language, 'password')}
                  className="w-full bg-[#FFFDF7] border border-amber-200 rounded-xl px-3 py-3 pr-10 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              {(showPwLiveError || passwordError) && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-rose-500 leading-snug">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{passwordError || PASSWORD_RULE_MSG}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                <div className="w-5 h-5 rounded bg-amber-50 text-[#D97706] flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>{getTranslation(language, 'confirmPassword')}</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={getTranslation(language, 'confirmPassword')}
                  className="w-full bg-[#FFFDF7] border border-amber-200 rounded-xl px-3 py-3 pr-10 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Invite code */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                <div className="w-5 h-5 rounded bg-amber-50 text-[#D97706] flex items-center justify-center">
                  <Gift className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>{getTranslation(language, 'inviteCode')}</span>
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  if (inviteError) setInviteError('');
                }}
                placeholder={getTranslation(language, 'pleaseEnterInvite')}
                className={`w-full bg-[#FFFDF7] border rounded-xl px-3 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                  inviteError ? 'border-rose-400 focus:ring-rose-500' : 'border-amber-200 focus:ring-amber-500'
                }`}
              />
              {inviteError && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-black text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}
              {inviteCode && !inviteError && (
                <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Referral Invitation Code Entered ({inviteCode})</span>
                </div>
              )}
            </div>

            {/* Privacy Agreement */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setAgreePrivacy(!agreePrivacy)}
                  className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center transition-colors flex-shrink-0 ${
                    agreePrivacy ? 'bg-[#D97706] text-white' : 'border border-slate-300'
                  }`}
                >
                  {agreePrivacy && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs text-slate-600 leading-tight">
                  I have read and agree{' '}
                  <span className="text-[#D97706] font-semibold">【Privacy Agreement】</span>
                </span>
              </label>
            </div>

            {registrationDisabled && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                New user registrations are currently paused by the administrator.
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={registrationDisabled || isSubmitting}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-bold text-sm shadow-md active:scale-98 transition-all hover:brightness-105 tracking-wide disabled:opacity-50"
              >
                {registrationDisabled ? 'Registration Paused' : getTranslation(language, 'register')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  window.location.hash = '#/login';
                }}
                className="w-full py-3.5 rounded-full border border-amber-300 text-[#B45309] font-bold text-sm hover:bg-amber-50 active:scale-98 transition-all flex items-center justify-center gap-1"
              >
                <span>I have an account</span>
                <span className="font-extrabold underline">Login</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <SliderCaptchaModal
        isOpen={captchaOpen}
        onSuccess={handleCaptchaVerified}
        onClose={() => setCaptchaOpen(false)}
      />
    </div>
  );
};
