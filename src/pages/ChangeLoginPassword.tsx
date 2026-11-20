import React, { useState } from 'react';
import { useApp, PASSWORD_REGEX, PASSWORD_RULE_MSG } from '../context/AppContext';
import { Header } from '../components/Header';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { getTranslation } from '../utils/i18n';

export const ChangeLoginPassword: React.FC = () => {
  const { changeLoginPassword, setActiveTab, language, showToast } = useApp();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const showRuleHint = newPassword.length > 0 && !PASSWORD_REGEX.test(newPassword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_REGEX.test(newPassword)) {
      showToast(PASSWORD_RULE_MSG);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match');
      return;
    }
    const res = changeLoginPassword(oldPassword, newPassword);
    if (!res.success) {
      showToast(res.message);
      return;
    }
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setActiveTab('account');
    window.location.hash = '#/account';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Header
        title={getTranslation(language, 'changePasswordHeader')}
        showBack
        onBack={() => {
          setActiveTab('account');
          window.location.hash = '#/account';
        }}
      />

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Account Security</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Update your login password. Your wallet bind verification will use your new password.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Current Login Password
              </label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pr-10 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                New Login Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters with letters + numbers"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pr-10 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {showRuleHint && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{PASSWORD_RULE_MSG}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] py-3.5 rounded-2xl bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-sm shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Save New Password</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab('customer-service');
                window.location.hash = '#/customer-service';
              }}
              className="text-xs font-bold text-cyan-700 hover:underline"
            >
              Forgot your current password? Contact Customer Service →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
