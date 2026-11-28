import React from 'react';
import { X, ShieldAlert, AlertTriangle, BookOpen, ArrowLeft, ExternalLink } from 'lucide-react';
import { Language } from '../types';

interface RiskDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export const RiskDisclosureModal: React.FC<RiskDisclosureModalProps> = ({
  isOpen,
  onClose,
  language = 'en'
}) => {
  if (!isOpen) return null;

  const isBn = language === 'bn';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-cyan-200 overflow-hidden flex flex-col max-h-[86vh] text-slate-900"
      >
        <div className="px-5 py-4 bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight">
                {isBn ? 'প্রাইভেসি ও ঝুঁকি সতর্কতা চুক্তি' : 'Privacy Agreement & Risk Disclosure'}
              </h3>
              <p className="text-[11px] text-cyan-50 font-semibold">
                Deshi Win Official Policy Notice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3.5 text-xs leading-relaxed text-slate-700">
          <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-cyan-600 flex-shrink-0" />
              <span>Financial Risk &amp; Zero Authority Liability Notice</span>
            </div>
            <p className="font-semibold text-slate-700">
              Trading (Binary / Gold Market) and prediction games (WinGo, Deshi K3, Deshi 5D, Casino, Slots) involve real financial risk and may result in loss of capital.
            </p>
            <p className="font-semibold text-slate-700">
              Deshi Win Authority and Management are not responsible for any financial loss incurred during gameplay or trading. All participation is strictly voluntary and at your own personal risk.
            </p>
          </div>

          <div className="space-y-2 bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
            <div className="font-black text-slate-900">1. Risk Responsibility & Voluntary Participation</div>
            <p>
              All users confirm they are 18+ years old and participate voluntarily with disposable funds only. Deshi Win Authority is not liable for any trading loss, network interruption on the user side, or prediction outcome.
            </p>
          </div>

          <div className="space-y-2 bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
            <div className="font-black text-slate-900">2. Account Integrity, Single-IP & Anti-VPN Policy</div>
            <p>
              Using VPNs/proxies, opening multiple accounts from the same device or IP address, or abusing bonus rules is strictly prohibited. Violating accounts are automatically flagged and permanently banned without prior notice.
            </p>
          </div>

          <div className="space-y-2 bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
            <div className="font-black text-slate-900">3. Data Privacy & Wallet Protection</div>
            <p>
              Your phone number, password, and bound e-wallet/USDT details are encrypted and never shared with third parties. Never share your login password or OTP with anyone.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#0891B2] via-[#06B6D4] to-[#0D9488] text-white font-black text-xs shadow-sm active:scale-98"
          >
            {isBn ? 'বুঝেছি ও সম্মত আছি' : 'I Understand & Agree'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRiskDisclosure: () => void;
}

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenRiskDisclosure
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col text-slate-900">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 -ml-1 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-600" />
          <h2 className="text-base font-black text-slate-900 tracking-tight">Beginner&apos;s Guide</h2>
        </div>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl w-full mx-auto space-y-4 text-[13px] leading-relaxed text-slate-700 pb-12">
        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">1. How to Register</h3>
          <ul className="space-y-1 text-slate-600">
            <li>- Fill Your Phone Number</li>
            <li>- Set Your Own Password (8+ characters with letters &amp; numbers)</li>
            <li>- Confirm The Password</li>
            <li>- Fill Your Recommendation / Invite Code (optional)</li>
            <li>- Click I Have Read And Agree (Privacy Agreement)</li>
            <li>- Click Register</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">2. How to Betting</h3>
          <p className="text-slate-600">
            Click Start Game then choose WinGo / Deshi WinGo / Deshi K3 / Deshi 5D (30s, 1 min, 3 min, or 5 min).
          </p>
          <ul className="space-y-0.5 text-slate-600 font-medium">
            <li><span className="font-bold text-emerald-700">Green:</span> if the result shows 1, 3, 7, 9</li>
            <li><span className="font-bold text-rose-700">Red:</span> if the result shows 2, 4, 6, 8</li>
            <li><span className="font-bold text-violet-700">Violet:</span> if the result shows 0 or 5</li>
            <li><span className="font-bold text-sky-700">Small:</span> if the result shows 0, 1, 2, 3, 4</li>
            <li><span className="font-bold text-amber-700">Big:</span> if the result shows 5, 6, 7, 8, 9</li>
          </ul>
          <p className="text-xs text-rose-700 font-semibold pt-1">
            This platform does not allow illegal hedging bets (e.g. betting Big &amp; Small together or Red &amp; Green together simultaneously). Choosing 5 or more numbers activates 3X turnover requirement.
          </p>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">3. How to Recharge</h3>
          <p className="text-slate-600">
            Click Deposit / Wallet Icon, choose your payment method: <strong>bKash</strong>, <strong>Nagad</strong>, or <strong>USDT (Binance Pay +5% Instant Bonus)</strong>, enter the amount, and complete verification.
          </p>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">4. How to Withdraw</h3>
          <ul className="space-y-1 text-slate-600">
            <li>- Click Wallet Icon, then click Withdraw Button</li>
            <li>- Make sure your Total Turnover Requirement reaches Zero (৳0)</li>
            <li>- Select or bind your bKash / Nagad / USDT account</li>
            <li>- Input the Amount You Want To Withdraw</li>
            <li>- Input Your Login Password and confirm</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">5. Orders</h3>
          <p className="text-slate-600">
            When betting completes you can click <strong>Game History</strong> or <strong>My Bets</strong> to inspect full order receipt details, payouts, and check the live Chart Trend.
          </p>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">6. Promotion</h3>
          <ul className="space-y-1 text-slate-600">
            <li>- Share your own invitation link to build Level 1, Level 2 &amp; Level 3 referrals and earn live rebate commission.</li>
            <li>- Unlock 3 Level Agent Daily Salary starting from <strong>5 recharge members (৳300/day)</strong> up to <strong>৳100,000</strong> (minimum 25% team &amp; own deposit required).</li>
            <li>- Open Promotion Poster / QR Card anytime to copy your unique code.</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">7. Account Security</h3>
          <ul className="space-y-1 text-slate-600">
            <li>- Go to Account page, tap Change Login Password</li>
            <li>- Re-enter your current Login Password</li>
            <li>- Enter a strong new password and confirm</li>
            <li>- Click Save Changes</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">8. Forgot Password</h3>
          <p className="text-slate-600">
            If you forget your Login Password, please contact Deshi Win 24/7 Live Chat Support immediately with your Game UID.
          </p>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">9. App Download</h3>
          <p className="text-slate-600">
            Scroll down on the Home screen and tap <strong>Add to Mobile / Desktop</strong> to install Deshi Win on your home screen for fast one-tap access.
          </p>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-cyan-200 shadow-2xs space-y-2">
          <h3 className="font-black text-slate-900 text-sm">10. About &amp; Risk Disclosure</h3>
          <p className="text-slate-600">
            Click below for complete details regarding our Privacy Policy and Financial Risk Disclosure Agreement.
          </p>
          <button
            type="button"
            onClick={onOpenRiskDisclosure}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 font-black text-xs hover:bg-cyan-100 active:scale-98"
          >
            <span>Open Privacy &amp; Risk (/privacy-&amp;-risk)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
          <h3 className="font-black text-slate-900 text-sm">11. Gift</h3>
          <ul className="space-y-1 text-slate-600">
            <li>- Click Gift Exchange inside Account or Activity</li>
            <li>- Input your unique Redemption Gift Code</li>
            <li>- Click Receive to credit instant bonus or activate deposit boost</li>
          </ul>
        </section>
      </div>
    </div>
  );
};
