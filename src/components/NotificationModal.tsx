import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, X, AlertCircle, Gift, Info, Trash2 } from 'lucide-react';

export const NotificationModal: React.FC = () => {
  const {
    notifications,
    isNotificationOpen,
    setIsNotificationOpen,
    clearNotifications
  } = useApp();

  if (!isNotificationOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl border border-amber-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h3 className="font-black text-base tracking-tight">Notifications</h3>
            {notifications.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-black tabular-nums">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsNotificationOpen(false)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FFFDF7]">
          {notifications.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D97706] flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <div className="text-sm font-extrabold text-slate-700">No notifications yet</div>
              <p className="text-xs text-slate-400">
                Account updates, turnover notices, and rewards will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-2xl border shadow-2xs space-y-1.5 ${
                  n.type === 'turnover'
                    ? 'bg-white border-amber-200'
                    : n.type === 'bonus'
                    ? 'bg-white border-emerald-200'
                    : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        n.type === 'turnover'
                          ? 'bg-amber-50 text-[#D97706]'
                          : n.type === 'bonus'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {n.type === 'turnover' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : n.type === 'bonus' ? (
                        <Gift className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>
                    <span className="font-black text-xs text-slate-800">{n.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {n.time.split(',')[1]?.trim() || n.time}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-700 leading-relaxed pl-9">
                  {n.message}
                </p>

                {n.reason && (
                  <div className="ml-9 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-[#B45309]">
                    Reason: {n.reason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-white border-t border-amber-100">
          <button
            type="button"
            onClick={() => setIsNotificationOpen(false)}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#F59E0B] text-white font-black text-xs shadow-sm active:scale-98"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
