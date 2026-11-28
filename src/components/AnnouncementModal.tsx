import React, { useEffect, useState } from 'react';
import { X, Check, Megaphone, ArrowRight } from 'lucide-react';
import { getLocalDateStr, useApp } from '../context/AppContext';

export const DEFAULT_ANNOUNCEMENT_POSTER = '/assets/brand/deshi-announcement-usdt-5.jpg';

export const AnnouncementModal: React.FC = () => {
  const { user, activeTab, adminSettings, setActiveTab } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [hideToday, setHideToday] = useState(false);
  const shownThisSessionRef = React.useRef(false);

  const isEnabled = adminSettings.enableSystemPopup !== false;
  const posterUrl =
    String(adminSettings.popupImageUrl || '').trim() || DEFAULT_ANNOUNCEMENT_POSTER;
  const title =
    String(adminSettings.popupTitle || '').trim() || 'Daily Recharge USDT +5% Bonus';
  const message =
    String(adminSettings.popupMessage || '').trim() ||
    'Recharge via USDT (Binance Pay) and receive an instant +5% Bonus automatically on every approved deposit!';

  useEffect(() => {
    if (!user.isLoggedIn || !isEnabled) {
      setIsOpen(false);
      return;
    }
    if (activeTab !== 'home') return;
    if (shownThisSessionRef.current) return;
    const hiddenDate = localStorage.getItem('ewi777_announce_hide_date');
    if (hiddenDate === getLocalDateStr()) return;

    shownThisSessionRef.current = true;
    setHideToday(false);
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [user.isLoggedIn, activeTab, isEnabled]);

  useEffect(() => {
    const onOpen = () => {
      setHideToday(false);
      setIsOpen(true);
    };
    window.addEventListener('deshi-open-announcement', onOpen);
    return () => window.removeEventListener('deshi-open-announcement', onOpen);
  }, []);

  const handleClose = () => {
    if (hideToday) {
      localStorage.setItem('ewi777_announce_hide_date', getLocalDateStr());
    }
    setIsOpen(false);
  };

  if (!isOpen || !isEnabled) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[348px] rounded-3xl overflow-hidden bg-white border border-amber-300/80 shadow-[0_24px_60px_rgba(15,23,42,0.38)] flex flex-col max-h-[84vh]"
      >
        {/* Top Announcement Header */}
        <div className="bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] px-4 py-3 text-white flex items-center justify-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-200 flex-shrink-0" />
          <h3 className="text-sm font-black tracking-wide uppercase truncate">Announcement</h3>
        </div>

        {/* Poster + Copy */}
        <div className="overflow-y-auto flex-1 bg-white">
          <div className="relative bg-slate-950 overflow-hidden">
            <img
              src={posterUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[340px] object-cover object-top block select-none"
            />
          </div>

          <div className="p-4 space-y-2.5 text-center">
            <div className="text-sm font-black text-slate-900 leading-snug">{title}</div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
              {message}
            </p>

            <button
              type="button"
              onClick={() => {
                handleClose();
                setActiveTab('deposit');
                window.location.hash = '#/deposit';
              }}
              className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-xs shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Deposit USDT &amp; Get +5% Bonus</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setHideToday((v) => !v)}
            className="flex items-center gap-2 text-[11px] font-bold text-slate-600 select-none"
          >
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                hideToday
                  ? 'bg-cyan-600 border-cyan-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {hideToday && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </span>
            <span>No more reminders today</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-full bg-slate-900 text-white font-black text-[11px] hover:bg-slate-800 active:scale-95"
          >
            Confirm
          </button>
        </div>
      </div>

      {/* Bottom Circular X Close Button */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close announcement"
        className="mt-3.5 w-9 h-9 rounded-full border-2 border-white/85 text-white flex items-center justify-center bg-black/45 hover:bg-black/65 active:scale-95 transition-all shadow-lg"
      >
        <X className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
