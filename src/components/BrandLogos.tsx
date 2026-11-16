import React from 'react';
import aviatorGameIconImg from '../assets/images/game_icon_aviator_3d_1794734299543.jpg';
import minesGameIconImg from '../assets/images/game_icon_mines_3d_1794734301052.jpg';

/**
 * Pink Safe Plate Logo
 * Matches user reference image (image_97de5120.png / image_9f9ad84d.png):
 * Rounded square plate with 4 corner rivet screws and a center sunken circle,
 * rendered in a luxury hot-pink / rose-gold metallic gradient instead of yellow.
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
        {/* Outer Pink Plate Gradient */}
        <linearGradient id="pinkPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA6C4" />
          <stop offset="35%" stopColor="#FF4B91" />
          <stop offset="70%" stopColor="#FF2A7A" />
          <stop offset="100%" stopColor="#D90452" />
        </linearGradient>

        {/* Center Sunken Circle Gradient (Depression/Indentation) */}
        <radialGradient id="pinkSunkenHole" cx="48%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#FF758F" />
          <stop offset="45%" stopColor="#E6004C" />
          <stop offset="85%" stopColor="#9E0033" />
          <stop offset="100%" stopColor="#730024" />
        </radialGradient>

        {/* Rivet Screws Radial */}
        <radialGradient id="pinkRivet" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFE0EB" />
          <stop offset="50%" stopColor="#FF4B91" />
          <stop offset="100%" stopColor="#A80038" />
        </radialGradient>

        <filter id="pinkPlateShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#B3003B" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Main Rounded Square Beveled Plate */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="22"
        fill="url(#pinkPlateGrad)"
        filter="url(#pinkPlateShadow)"
        stroke="#FFBBD0"
        strokeWidth="2.5"
      />

      {/* Subtle Inner Bevel Line */}
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="18"
        fill="none"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="1.2"
      />

      {/* 4 Corner Rivet Screws / Dots */}
      <g>
        <circle cx="25" cy="25" r="5.5" fill="url(#pinkRivet)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
        <circle cx="75" cy="25" r="5.5" fill="url(#pinkRivet)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
        <circle cx="25" cy="75" r="5.5" fill="url(#pinkRivet)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
        <circle cx="75" cy="75" r="5.5" fill="url(#pinkRivet)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
      </g>

      {/* Center Sunken Circle Well */}
      <circle
        cx="50"
        cy="50"
        r="23"
        fill="url(#pinkSunkenHole)"
        stroke="#FFA0BE"
        strokeWidth="2.5"
      />
      {/* Sunken Circle Inner Shadow Ring */}
      <circle
        cx="50"
        cy="50"
        r="18"
        fill="none"
        stroke="#59001C"
        strokeWidth="2"
        opacity="0.5"
      />
    </svg>
  );
};

/**
 * 3 Glossy Lottery Balls Emblem (Red 9, Violet 0, Green 4)
 * Matches user reference image (image_dbd0fbf2.png / image_0d4d255a.png):
 * Re-imagined into a sharp, responsive SVG for EWI 777 brand identity.
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
        {/* Ball 1: Red Sphere (Number 9) */}
        <radialGradient id="ballRed" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#FFA6A6" />
          <stop offset="25%" stopColor="#FF385C" />
          <stop offset="70%" stopColor="#E6002A" />
          <stop offset="100%" stopColor="#7A0012" />
        </radialGradient>

        {/* Ball 2: Violet Sphere (Number 0) */}
        <radialGradient id="ballViolet" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#DFC2FF" />
          <stop offset="30%" stopColor="#8A4FFF" />
          <stop offset="75%" stopColor="#5E17EB" />
          <stop offset="100%" stopColor="#2E0880" />
        </radialGradient>

        {/* Ball 3: Green Sphere (Number 4) */}
        <radialGradient id="ballGreen" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#C4FFE4" />
          <stop offset="30%" stopColor="#00D287" />
          <stop offset="75%" stopColor="#00A865" />
          <stop offset="100%" stopColor="#005230" />
        </radialGradient>

        {/* Ball Specular Highlights */}
        <radialGradient id="ballHighlight" cx="30%" cy="25%" r="45%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        <filter id="ballDropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Green Ball 4 (bottom left) */}
      <g filter="url(#ballDropShadow)">
        <circle cx="34" cy="70" r="19" fill="url(#ballGreen)" />
        <circle cx="34" cy="70" r="19" fill="url(#ballHighlight)" />
        {/* White circle patch for number */}
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

      {/* Violet Ball 0 (bottom right) */}
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

      {/* Red Ball 9 (top center / main ball) */}
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
 * Full EWI 777 Branded Logo
 */
export const Ewi777Logo: React.FC<{
  showText?: boolean;
  textColor?: string;
  className?: string;
  ballSize?: number;
  height?: number;
  logoUrl?: string;
}> = ({
  className = '',
  height = 52,
  logoUrl
}) => {
  const src = logoUrl?.trim() ? logoUrl.trim() : '/ewi777-logo-transparent.png';
  return (
    <div className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}>
      <img
        src={src}
        alt="EWI 777"
        style={{ height }}
        referrerPolicy="no-referrer"
        className="w-auto max-w-full object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.28)]"
      />
    </div>
  );
};

/**
 * Transparent Luxury Metallic Wordmark for Colored Headers (Pink/Dark)
 */
export const Ewi777TransparentWordmark: React.FC<{ height?: number; className?: string }> = ({
  height = 24,
  className = ''
}) => {
  return (
    <svg
      height={height}
      viewBox="0 0 185 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block w-auto select-none ${className}`}
    >
      <defs>
        <linearGradient id="ewiGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF4B8" />
          <stop offset="45%" stopColor="#FFD24C" />
          <stop offset="100%" stopColor="#D4941A" />
        </linearGradient>
        <linearGradient id="ewiSilverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <filter id="ewiWordShadow" x="-8%" y="-12%" width="116%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#5C0023" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#ewiWordShadow)">
        <text
          x="4"
          y="33"
          fill="url(#ewiGoldGrad)"
          stroke="#7A4900"
          strokeWidth="1.2"
          fontSize="33"
          fontWeight="900"
          fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"
          letterSpacing="-1"
        >
          EWI
        </text>
        <text
          x="84"
          y="33"
          fill="url(#ewiSilverGrad)"
          stroke="#475569"
          strokeWidth="1"
          fontSize="34"
          fontWeight="900"
          fontStyle="italic"
          fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"
          letterSpacing="-1.5"
        >
          777
        </text>
      </g>
    </svg>
  );
};

/**
 * Pure Transparent-Background 3D Lottery Balls Logo (No white box!)
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
      className={`inline-flex items-center justify-center flex-shrink-0 select-none rounded-xl bg-gradient-to-br from-[#161922] to-[#0B0D12] border border-amber-400/35 shadow-xs ${className}`}
    >
      <svg
        width={Math.round(size * 0.68)}
        height={Math.round(size * 0.68)}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="7" y1="6" x2="7" y2="25" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
        <rect x="4.5" y="10" width="5" height="10" rx="1.5" fill="#34D399" />
        <line x1="16" y1="9" x2="16" y2="27" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
        <rect x="13.5" y="13" width="5" height="9" rx="1.5" fill="#FB7185" />
        <line x1="25" y1="4" x2="25" y2="22" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
        <rect x="22.5" y="7" width="5" height="10" rx="1.5" fill="#FBBF24" />
      </svg>
    </div>
  );
};

/**
 * Crisp Transparent-Background Real Aviator Stunt Plane Logo (No dark box, no cut-off edges)
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
 * Mines 777 Game 3D Emblem (matches Home card icon everywhere)
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
 * Pink Customer Service Mascot (Transparent background — zero black circle, zero yellow)
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
      className={`inline-block flex-shrink-0 select-none drop-shadow-[0_4px_10px_rgba(255,42,122,0.38)] ${className}`}
    >
      <defs>
        <linearGradient id="csPinkOuter" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FF75A8" />
          <stop offset="50%" stopColor="#FF2A7A" />
          <stop offset="100%" stopColor="#D80054" />
        </linearGradient>
        <linearGradient id="csPinkInner" x1="25%" y1="20%" x2="75%" y2="85%">
          <stop offset="0%" stopColor="#FF8FB8" />
          <stop offset="100%" stopColor="#FF2A7A" />
        </linearGradient>
      </defs>
      {/* Crisp white outer aura halo for visibility over any background */}
      <circle cx="50" cy="50" r="44" fill="#FFFFFF" fillOpacity="0.95" />
      {/* Pink Outer Ring */}
      <circle cx="50" cy="50" r="39" stroke="url(#csPinkOuter)" strokeWidth="5.5" fill="none" />
      {/* Pink Speech-Bubble Mascot Silhouette */}
      <path
        d="M50 18C32.3 18 18 31.7 18 48.7C18 57.6 22 65.6 28.4 71.1L21 81.5L36.5 76.7C40.7 78.4 45.2 79.3 50 79.3C67.7 79.3 82 65.6 82 48.7C82 31.7 67.7 18 50 18Z"
        fill="url(#csPinkOuter)"
      />
      {/* Cute Cowlick Accent */}
      <path
        d="M44 26C48 16 58 14 63 20C57 21 54 25 54 30Z"
        fill="#FFFFFF"
      />
      {/* Inner Mascot Face Cutout */}
      <circle cx="50" cy="49" r="22" fill="#FFF0F5" />
      {/* Mascot Pink Ring Frame */}
      <circle cx="50" cy="49" r="19" fill="url(#csPinkInner)" />
      {/* Expressive Glowing White Eyes */}
      <rect x="39" y="42" width="6.5" height="13" rx="3.25" fill="#FFFFFF" />
      <rect x="54.5" y="42" width="6.5" height="13" rx="3.25" fill="#FFFFFF" />
      <circle cx="42.2" cy="46" r="1.4" fill="#FF2A7A" />
      <circle cx="57.7" cy="46" r="1.4" fill="#FF2A7A" />
    </svg>
  );
};
