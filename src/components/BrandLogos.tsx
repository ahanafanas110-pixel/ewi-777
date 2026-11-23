import React from 'react';
import aviatorGameIconImg from '../assets/images/game_icon_aviator_3d_1794734299543.jpg';
import minesGameIconImg from '../assets/images/game_icon_mines_3d_1794734301052.jpg';
import goldMarketIconImg from '../assets/images/gold_trading_emblem_1795251766450.jpg';

/**
 * Crisp Cyan/Slate Safe Plate Logo (keeps PinkSafePlateLogo export name for compatibility)
 */
export const PinkSafePlateLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="goldPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="40%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>

        <radialGradient id="goldSunkenHole" cx="48%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="55%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>

        <radialGradient id="goldRivet" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ECFEFF" />
          <stop offset="55%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0E7490" />
        </radialGradient>

        <filter id="goldPlateShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#0E7490" floodOpacity="0.3" />
        </filter>
      </defs>

      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="22"
        fill="url(#goldPlateGrad)"
        filter="url(#goldPlateShadow)"
        stroke="#CFFAFE"
        strokeWidth="2.5"
      />

      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="18"
        fill="none"
        stroke="rgba(255, 255, 255, 0.55)"
        strokeWidth="1.2"
      />

      <g>
        <circle cx="25" cy="25" r="5.5" fill="url(#goldRivet)" stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
        <circle cx="75" cy="25" r="5.5" fill="url(#goldRivet)" stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
        <circle cx="25" cy="75" r="5.5" fill="url(#goldRivet)" stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
        <circle cx="75" cy="75" r="5.5" fill="url(#goldRivet)" stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
      </g>

      <circle
        cx="50"
        cy="50"
        r="23"
        fill="url(#goldSunkenHole)"
        stroke="#CFFAFE"
        strokeWidth="2.5"
      />
      <circle
        cx="50"
        cy="50"
        r="18"
        fill="none"
        stroke="#0F172A"
        strokeWidth="2"
        opacity="0.35"
      />
    </svg>
  );
};

/**
 * 3 Glossy Lottery Balls Emblem (Red 9, Violet 0, Green 4)
 */
export const BrandBallsLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 select-none ${className}`}
    >
      <defs>
        <radialGradient id="ballRed" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#FFA6A6" />
          <stop offset="25%" stopColor="#FF385C" />
          <stop offset="70%" stopColor="#E6002A" />
          <stop offset="100%" stopColor="#7A0012" />
        </radialGradient>

        <radialGradient id="ballViolet" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#DFC2FF" />
          <stop offset="30%" stopColor="#8A4FFF" />
          <stop offset="75%" stopColor="#5E17EB" />
          <stop offset="100%" stopColor="#2E0880" />
        </radialGradient>

        <radialGradient id="ballGreen" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#C4FFE4" />
          <stop offset="30%" stopColor="#00D287" />
          <stop offset="75%" stopColor="#00A865" />
          <stop offset="100%" stopColor="#005230" />
        </radialGradient>

        <radialGradient id="ballHighlight" cx="30%" cy="25%" r="45%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        <filter id="ballDropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      <g filter="url(#ballDropShadow)">
        <circle cx="34" cy="70" r="19" fill="url(#ballGreen)" />
        <circle cx="34" cy="70" r="19" fill="url(#ballHighlight)" />
        <circle cx="34" cy="70" r="10.5" fill="#FFFFFF" opacity="0.95" />
        <text
          x="34"
          y="74"
          textAnchor="middle"
          fill="#00804C"
          fontSize="12.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          4
        </text>
      </g>

      <g filter="url(#ballDropShadow)">
        <circle cx="72" cy="66" r="21" fill="url(#ballViolet)" />
        <circle cx="72" cy="66" r="21" fill="url(#ballHighlight)" />
        <circle cx="72" cy="66" r="11.5" fill="#FFFFFF" opacity="0.95" />
        <text
          x="72"
          y="71"
          textAnchor="middle"
          fill="#5E17EB"
          fontSize="14"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          0
        </text>
      </g>

      <g filter="url(#ballDropShadow)">
        <circle cx="62" cy="30" r="24" fill="url(#ballRed)" />
        <circle cx="62" cy="30" r="24" fill="url(#ballHighlight)" />
        <circle cx="62" cy="30" r="13" fill="#FFFFFF" opacity="0.95" />
        <text
          x="62"
          y="35.5"
          textAnchor="middle"
          fill="#E6002A"
          fontSize="16"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          9
        </text>
      </g>
    </svg>
  );
};

/**
 * Full Hney Win Branded Honey Bee Emblem + Animated Wordmark (exports kept as Ewi777Logo for compatibility)
 */
export const Ewi777Logo: React.FC<{
  showText?: boolean;
  textColor?: string;
  className?: string;
  ballSize?: number;
  height?: number;
  logoUrl?: string;
}> = ({
  showText = true,
  className = '',
  height = 44,
  logoUrl
}) => {
  const trimmed = logoUrl?.trim() || '';
  const hasCustomOverride =
    Boolean(trimmed) &&
    !trimmed.includes('ewi777-logo-transparent') &&
    !trimmed.includes('hney-win-logo') &&
    !trimmed.toLowerCase().includes('ewi777');

  if (hasCustomOverride) {
    return (
      <div className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}>
        <img
          src={trimmed}
          alt="Hney Win"
          style={{ height }}
          referrerPolicy="no-referrer"
          className="w-auto max-w-full object-contain drop-shadow-[0_3px_10px_rgba(8,145,178,0.22)]"
        />
      </div>
    );
  }

  const badgeSize = Math.max(30, Math.round(height * 0.96));
  const wordHeight = Math.max(24, Math.round(height * 0.72));
  const miniBeeSize = Math.max(15, Math.round(height * 0.42));

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 flex-shrink-0 select-none ${className}`}
      role="img"
      aria-label="Hney Win"
    >
      {/* Official Transparent Honey Bee Circular Emblem */}
      <div
        className="relative flex-shrink-0 honey-crest-float"
        style={{ width: badgeSize, height: badgeSize }}
      >
        <img
          src="/hney-win-logo.png"
          alt="Hney Win Honey Bee Crest"
          width={badgeSize}
          height={badgeSize}
          className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
        />
      </div>

      {/* Contrasting Wordmark + Fluttering Mini Bee */}
      {showText && (
        <div className="relative flex items-center flex-shrink-0">
          <svg
            height={wordHeight}
            viewBox="0 0 132 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-auto drop-shadow-[0_2px_5px_rgba(11,34,53,0.32)]"
          >
            <defs>
              <linearGradient id="hwBeeHney" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#CFFAFE" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
              <linearGradient id="hwBeeWin" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FEF9C3" />
                <stop offset="50%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>
            <text
              x="2"
              y="22.5"
              fill="url(#hwBeeHney)"
              stroke="#0B2235"
              strokeWidth="4.2"
              paintOrder="stroke fill"
              strokeLinejoin="round"
              fontSize="21.5"
              fontWeight="900"
              fontStyle="italic"
              fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"
              letterSpacing="-0.5"
            >
              Hney
            </text>
            <text
              x="61"
              y="22.5"
              fill="url(#hwBeeWin)"
              stroke="#451A03"
              strokeWidth="4.2"
              paintOrder="stroke fill"
              strokeLinejoin="round"
              fontSize="21.5"
              fontWeight="900"
              fontStyle="italic"
              fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"
              letterSpacing="-0.5"
            >
              Win
            </text>
            <text
              x="3"
              y="31.5"
              fill="#FDE047"
              stroke="#0B2235"
              strokeWidth="2.4"
              paintOrder="stroke fill"
              fontSize="6.8"
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
              letterSpacing="1.8"
            >
              HONEY • CLUB
            </text>
          </svg>

          {/* Animated Fluttering Bee perched beside Win */}
          <span
            className="bee-hover-flight pointer-events-none -ml-2 -mt-4 flex-shrink-0"
            style={{ width: miniBeeSize, height: miniBeeSize }}
            aria-hidden="true"
          >
            <svg width={miniBeeSize} height={miniBeeSize} viewBox="0 0 64 64" fill="none">
              <g className="bee-wing-l">
                <ellipse
                  cx="26"
                  cy="22"
                  rx="11"
                  ry="6.5"
                  transform="rotate(-30 26 22)"
                  fill="#FFFFFF"
                  fillOpacity="0.92"
                  stroke="#94A3B8"
                  strokeWidth="1.4"
                />
              </g>
              <g className="bee-wing-r">
                <ellipse
                  cx="39"
                  cy="21"
                  rx="10"
                  ry="6"
                  transform="rotate(24 39 21)"
                  fill="#E0F2FE"
                  fillOpacity="0.88"
                  stroke="#94A3B8"
                  strokeWidth="1.4"
                />
              </g>
              <ellipse cx="36" cy="36" rx="14" ry="10.5" fill="#FACC15" stroke="#451A03" strokeWidth="2.2" />
              <path d="M30 27.5 C28.5 32 28.5 40 30 44.5" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
              <path d="M38 26.5 C36.5 31 36.5 41 38 45" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
              <circle cx="20.5" cy="34" r="7.5" fill="#0F172A" />
              <circle cx="18" cy="32.5" r="2" fill="#FFFFFF" />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Compact Honey Bee Emblem + Wordmark for Light/Gradient Sub-Headers
 */
export const Ewi777TransparentWordmark: React.FC<{ height?: number; className?: string }> = ({
  height = 24,
  className = ''
}) => {
  return (
    <span className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <img
        src="/hney-win-logo.png"
        alt="Hney Win"
        width={height + 4}
        height={height + 4}
        className="object-contain honey-crest-float drop-shadow-xs"
        style={{ width: height + 4, height: height + 4 }}
      />
      <svg
        height={height}
        viewBox="0 0 116 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block w-auto select-none"
      >
        <defs>
          <linearGradient id="ewiGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ECFEFF" />
            <stop offset="50%" stopColor="#67E8F9" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="ewiSilverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF9C3" />
            <stop offset="65%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        <text
          x="2"
          y="24"
          fill="url(#ewiGoldGrad)"
          stroke="#0F172A"
          strokeWidth="3.4"
          paintOrder="stroke fill"
          fontSize="22"
          fontWeight="900"
          fontStyle="italic"
          fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"
          letterSpacing="-0.6"
        >
          Hney
        </text>
        <text
          x="60"
          y="24"
          fill="url(#ewiSilverGrad)"
          stroke="#451A03"
          strokeWidth="3.4"
          paintOrder="stroke fill"
          fontSize="22"
          fontWeight="900"
          fontStyle="italic"
          fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"
          letterSpacing="-0.6"
        >
          Win
        </text>
      </svg>
    </span>
  );
};

/**
 * Pure Transparent-Background 3D Lottery Balls Logo
 */
export const WingoBallsLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = ''
}) => {
  return <BrandBallsLogo size={size} className={className} />;
};

/**
 * Binary Market Crisp Candlestick Icon
 */
export const BinaryMarketLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = ''
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center flex-shrink-0 select-none rounded-xl bg-gradient-to-br from-[#ECFEFF] to-[#E0F2FE] border border-cyan-300 shadow-xs ${className}`}
    >
      <svg
        width={Math.round(size * 0.68)}
        height={Math.round(size * 0.68)}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="7" y1="6" x2="7" y2="25" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <rect x="4.5" y="10" width="5" height="10" rx="1.5" fill="#10B981" />
        <line x1="16" y1="9" x2="16" y2="27" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
        <rect x="13.5" y="13" width="5" height="9" rx="1.5" fill="#F43F5E" />
        <line x1="25" y1="4" x2="25" y2="22" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" />
        <rect x="22.5" y="7" width="5" height="10" rx="1.5" fill="#06B6D4" />
      </svg>
    </div>
  );
};

/**
 * Crisp Real Aviator Stunt Plane Logo
 */
export const AviatorPlaneLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <img
      src={aviatorGameIconImg}
      alt="Aviator"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
      className={`inline-block flex-shrink-0 select-none rounded-xl object-cover shadow-xs ${className}`}
    />
  );
};

/**
 * Mines 777 Game 3D Emblem
 */
export const MinesGameLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <img
      src={minesGameIconImg}
      alt="Mines 777"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
      className={`inline-block flex-shrink-0 select-none rounded-xl object-cover shadow-xs ${className}`}
    />
  );
};

/**
 * Cyan/Teal Customer Service Mascot
 */
export const CustomerServiceLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 44,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 select-none drop-shadow-[0_4px_10px_rgba(8,145,178,0.32)] ${className}`}
    >
      <defs>
        <linearGradient id="csCyanOuter" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>
        <linearGradient id="csCyanInner" x1="25%" y1="20%" x2="75%" y2="85%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill="#FFFFFF" fillOpacity="0.98" />
      <circle cx="50" cy="50" r="39" stroke="url(#csCyanOuter)" strokeWidth="5.5" fill="none" />
      <path
        d="M50 18C32.3 18 18 31.7 18 48.7C18 57.6 22 65.6 28.4 71.1L21 81.5L36.5 76.7C40.7 78.4 45.2 79.3 50 79.3C67.7 79.3 82 65.6 82 48.7C82 31.7 67.7 18 50 18Z"
        fill="url(#csCyanOuter)"
      />
      <path d="M44 26C48 16 58 14 63 20C57 21 54 25 54 30Z" fill="#FFFFFF" />
      <circle cx="50" cy="49" r="22" fill="#ECFEFF" />
      <circle cx="50" cy="49" r="19" fill="url(#csCyanInner)" />
      <rect x="39" y="42" width="6.5" height="13" rx="3.25" fill="#FFFFFF" />
      <rect x="54.5" y="42" width="6.5" height="13" rx="3.25" fill="#FFFFFF" />
      <circle cx="42.2" cy="46" r="1.4" fill="#0E7490" />
      <circle cx="57.7" cy="46" r="1.4" fill="#0E7490" />
    </svg>
  );
};

/**
 * Gold Market Card Emblem (ES-imported Gold Bars asset)
 */
export const GoldMarketLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <img
      src={goldMarketIconImg}
      alt="Gold Market"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
      className={`inline-block flex-shrink-0 select-none rounded-xl object-cover border border-cyan-300 shadow-xs ${className}`}
    />
  );
};

/**
 * Cyan-Accented 3D Lottery Ball Emblem for EWI WinGo
 */
export const EwiWingoLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center flex-shrink-0 select-none rounded-xl bg-gradient-to-br from-[#0E7490] via-[#0891B2] to-[#06B6D4] border border-cyan-200 shadow-xs p-0.5 ${className}`}
    >
      <BrandBallsLogo size={Math.round(size * 0.84)} />
    </div>
  );
};


