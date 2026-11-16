import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getTranslation } from '../utils/i18n';
import {
  Download,
  Smartphone,
  Monitor,
  Apple,
  CheckCircle2,
  X,
  Share,
  MoreVertical,
  PlusSquare,
  ExternalLink
} from 'lucide-react';

export const AddToDesktop: React.FC = () => {
  const { language, setShowInstallModal } = useApp();
  const { canNativeInstall, isInstalled, triggerNativeInstall } = usePWAInstall();

  const handleClick = async () => {
    if (canNativeInstall) {
      const outcome = await triggerNativeInstall();
      if (outcome === 'accepted') return;
    }
    setShowInstallModal(true);
  };

  return (
    <div className="flex justify-center my-4 px-4">
      <button
        onClick={handleClick}
        className="w-full max-w-xs py-3 px-6 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-black text-sm shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2.5"
      >
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
          {isInstalled ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : (
            <Download className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          )}
        </div>
        <span>
          {isInstalled
            ? 'App Installed on Device ✓'
            : getTranslation(language, 'addToDesktop')}
        </span>
      </button>
    </div>
  );
};

export const AddToDesktopModal: React.FC = () => {
  const { showInstallModal, setShowInstallModal, showToast } = useApp();
  const { canNativeInstall, isInstalled, isIOS, isAndroid, isDesktop, triggerNativeInstall } =
    usePWAInstall();

  const defaultTab: 'desktop' | 'android' | 'ios' = isIOS
    ? 'ios'
    : isAndroid
    ? 'android'
    : isDesktop
    ? 'desktop'
    : 'android';

  const [guideTab, setGuideTab] = useState<'desktop' | 'android' | 'ios'>(defaultTab);

  if (!showInstallModal) return null;

  const handleNativeInstall = async () => {
    const res = await triggerNativeInstall();
    if (res === 'accepted') {
      showToast('EWI 777 shortcut added to your device!');
      setShowInstallModal(false);
    } else if (res === 'unavailable') {
      showToast('Follow the quick steps below to pin the shortcut!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-pink-100 max-h-[92vh] flex flex-col">
        {/* Top Pink Header with App Icon Preview */}
        <div className="bg-gradient-to-r from-[#FF2A7A] via-[#FF4B91] to-[#FF758F] p-5 text-white relative">
          <button
            onClick={() => setShowInstallModal(false)}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <img
              src="/pwa-192x192.png"
              alt="EWI 777 App Icon"
              className="w-14 h-14 rounded-2xl shadow-lg border-2 border-white/60 bg-white flex-shrink-0"
            />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-yellow-200">
                Home Screen & Desktop App
              </div>
              <h3 className="text-lg font-black leading-tight">Install EWI 777 Shortcut</h3>
              <p className="text-[11px] text-pink-100 mt-0.5">
                Launch EWI 777 full-screen from your Desktop or Home Screen in 1 tap.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Native 1-Click Install CTA when available */}
          {canNativeInstall && !isInstalled && (
            <button
              type="button"
              onClick={handleNativeInstall}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Install EWI 777 Shortcut Now</span>
            </button>
          )}

          {isInstalled && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>EWI 777 is already installed as an app shortcut on this device!</span>
            </div>
          )}

          {/* Platform Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 bg-pink-50/80 p-1 rounded-2xl border border-pink-100">
            <button
              type="button"
              onClick={() => setGuideTab('desktop')}
              className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                guideTab === 'desktop'
                  ? 'bg-white text-[#FF2A7A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setGuideTab('android')}
              className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                guideTab === 'android'
                  ? 'bg-white text-[#FF2A7A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setGuideTab('ios')}
              className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                guideTab === 'ios'
                  ? 'bg-white text-[#FF2A7A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iPhone</span>
            </button>
          </div>

          {/* Step-by-Step Illustrated Guide */}
          {guideTab === 'desktop' && (
            <div className="space-y-2.5 text-xs">
              <div className="font-black text-slate-800 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-[#FF2A7A]" />
                <span>How to Create a Desktop Shortcut (Chrome / Edge):</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Open this page in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> and look at the top-right corner of the address bar for the{' '}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-pink-100 text-[#FF2A7A] font-bold">
                    <Download className="w-3 h-3" /> Install
                  </span>{' '}
                  icon.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Or click the browser menu{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 font-bold text-slate-800">
                    <MoreVertical className="w-3 h-3" />
                  </span>{' '}
                  → <strong>Cast, save, and share</strong> → <strong>Create shortcut...</strong> (or <strong>Install EWI 777</strong>).
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Check <strong>&quot;Open as window&quot;</strong> and click <strong>Create</strong>. Your EWI 777 shortcut icon will appear directly on your Desktop &amp; Taskbar!
                </div>
              </div>
            </div>
          )}

          {guideTab === 'android' && (
            <div className="space-y-2.5 text-xs">
              <div className="font-black text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#FF2A7A]" />
                <span>How to Add to Android Home Screen (Chrome):</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Tap the <strong>3-dot menu</strong>{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 font-bold text-slate-800">
                    <MoreVertical className="w-3 h-3" />
                  </span>{' '}
                  at the top-right corner of Chrome.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Select{' '}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-100 text-[#FF2A7A] font-bold">
                    <PlusSquare className="w-3 h-3" /> Add to Home screen
                  </span>{' '}
                  or <strong>Install app</strong>.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Tap <strong>Install / Add</strong>. The EWI 777 icon is now pinned to your phone&apos;s Home Screen!
                </div>
              </div>
            </div>
          )}

          {guideTab === 'ios' && (
            <div className="space-y-2.5 text-xs">
              <div className="font-black text-slate-800 flex items-center gap-1.5">
                <Apple className="w-4 h-4 text-[#FF2A7A]" />
                <span>How to Add to iPhone / iPad Home Screen (Safari):</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Open this site in <strong>Safari</strong> and tap the{' '}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                    <Share className="w-3 h-3" /> Share
                  </span>{' '}
                  button at the bottom bar.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Scroll down and tap{' '}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-100 text-[#FF2A7A] font-bold">
                    <PlusSquare className="w-3 h-3" /> Add to Home Screen
                  </span>
                  .
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF2A7A] text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="text-slate-700 leading-relaxed">
                  Tap <strong>Add</strong> in the top-right corner to place the EWI 777 shortcut icon on your Home Screen.
                </div>
              </div>
            </div>
          )}

          {/* Direct Copy URL Box for Opening Outside Embedded Frames */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase text-slate-400">App URL</div>
              <div className="text-[11px] font-mono text-slate-700 truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.origin).catch(() => {});
                showToast('App URL copied! Paste in Chrome/Safari to pin shortcut.');
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 text-[#FF2A7A] font-black text-[11px] flex items-center gap-1 flex-shrink-0 active:scale-95"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Copy URL</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowInstallModal(false)}
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#FF5A92] text-white font-black text-xs shadow-md active:scale-98"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
