import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { getTranslation } from '../utils/i18n';

export const ChangeLoginPassword: React.FC = () => {
  const { changeLoginPassword, setActiveTab, language, showToast } = useApp();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      showToast('New password must be at least 6 characters');
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
    <div className="min-h-screen bg-[#FFF8FA] pb-24">
      <Header
        title={getTranslation(language, 'changePasswordHeader')}
        showBack
        onBack={() => {
          setActiveTab('account');
          window.location.hash = '#/account';
        }}
      />

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-pink-100 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-pink-50">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#FF2A7A] flex items-center justify-center flex-shrink-0">
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
                  className="w-full bg-[#FFF8FA] border border-pink-200 rounded-2xl px-4 py-3 pr-10 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF2A7A]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400"
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
                  placeholder="Minimum 6 characters"
                  className="w-full bg-[#FFF8FA] border border-pink-200 rounded-2xl px-4 py-3 pr-10 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF2A7A]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
                className="w-full bg-[#FFF8FA] border border-pink-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF2A7A]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] py-3.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
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
              className="text-xs font-bold text-[#FF2A7A] hover:underline"
            >
              Forgot your current password? Contact Customer Service →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
