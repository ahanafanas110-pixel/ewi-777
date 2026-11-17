import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { User as UserIcon, CheckCircle2 } from 'lucide-react';
import { getTranslation } from '../utils/i18n';

export const ChangeNickname: React.FC = () => {
  const { user, updateNickname, setActiveTab, language, showToast } = useApp();
  const [nickname, setNickname] = useState(user.nickname || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nickname.trim();
    if (clean.length < 2 || clean.length > 24) {
      showToast('Nickname must be between 2 and 24 characters');
      return;
    }
    updateNickname(clean);
    setActiveTab('account');
    window.location.hash = '#/account';
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      <Header
        title={getTranslation(language, 'changeNickname')}
        showBack
        onBack={() => {
          setActiveTab('account');
          window.location.hash = '#/account';
        }}
      />

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-200 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-amber-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#B45309] flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">Current Nickname</div>
              <div className="text-base font-black text-slate-900">{user.nickname || 'Member'}</div>
              <div className="text-[11px] text-slate-400">UID: {user.uid || 'N/A'}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                New Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                placeholder="Enter display nickname (2-24 chars)"
                className="w-full bg-[#FFFDF7] border border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] py-3.5 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Nickname</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
