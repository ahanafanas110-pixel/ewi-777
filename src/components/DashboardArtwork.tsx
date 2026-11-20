import React from 'react';
import tileWingoImg from '../assets/images/tile_wingo_edited_1795168517740.jpg';
import tileEwiWingoImg from '../assets/images/tile_ewi_wingo_edited_1795168517728.jpg';
import tileEwiK3Img from '../assets/images/tile_ewi_k3_dice_1795168517201.jpg';
import tileEwi5DImg from '../assets/images/tile_ewi_5d_realistic_1795168516865.jpg';
import tileCasinoImg from '../assets/images/tile_casino_roulette_edited_1795168518026.jpg';
import tileSlotsImg from '../assets/images/tile_slots_dragon_edited_1795168517735.jpg';

export const TileWingoIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileWingoImg}
    alt="Wingo"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileEwiWingoIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileEwiWingoImg}
    alt="EWI Wingo"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileEwiK3Icon: React.FC<{ size?: number }> = () => (
  <img
    src={tileEwiK3Img}
    alt="EWI K3"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileEwi5DIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileEwi5DImg}
    alt="EWI 5D"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileBinaryIcon: React.FC<{ size?: number }> = ({ size = 54 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none">
    <path d="M8 46L22 33L34 39L54 18" stroke="#0891B2" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="22" x2="16" y2="50" stroke="#0891B2" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="12" y="29" width="8" height="14" rx="2" fill="#06B6D4" />
    <line x1="27" y1="14" x2="27" y2="45" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="23" y="20" width="8" height="18" rx="2" fill="#10B981" />
    <line x1="38" y1="20" x2="38" y2="50" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="34" y="27" width="8" height="15" rx="2" fill="#F43F5E" />
    <line x1="49" y1="10" x2="49" y2="41" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="45" y="15" width="8" height="18" rx="2" fill="#14B8A6" />
  </svg>
);

export const TileGoldIcon: React.FC<{ size?: number }> = ({ size = 54 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none">
    <defs>
      <linearGradient id="goldBarLight" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    <rect x="10" y="11" width="44" height="28" rx="6" fill="#ECFEFF" stroke="#0891B2" strokeOpacity="0.65" strokeWidth="1.5" />
    <path d="M14 32L23 25L31 28L46 16" stroke="#0891B2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M41 16H46V21" stroke="#0891B2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 36L40 31L54 37L38 43L24 36Z" fill="#FEF08A" stroke="#D97706" strokeWidth="1" />
    <path d="M24 36L38 43V50L24 43V36Z" fill="#B45309" />
    <path d="M38 43L54 37V44L38 50V43Z" fill="#D97706" />
    <path d="M9 40L27 35L42 42L24 48L9 40Z" fill="url(#goldBarLight)" stroke="#FEF9C3" strokeWidth="1" />
    <path d="M9 40L24 48V55L9 47V40Z" fill="#92400E" />
    <path d="M24 48L42 42V49L24 55V48Z" fill="#D97706" />
  </svg>
);

export const TileCasinoIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileCasinoImg}
    alt="Casino"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileSlotsIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileSlotsImg}
    alt="Slots"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const PlaneGameLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 44,
  className = ''
}) => (
  <div
    style={{ width: size, height: size }}
    className={`relative rounded-2xl bg-gradient-to-br from-[#ECFEFF] via-[#E0F2FE] to-[#CFFAFE] border border-cyan-400 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0 ${className}`}
  >
    <svg width={Math.round(size * 0.85)} height={Math.round(size * 0.85)} viewBox="0 0 64 64" fill="none">
      <path d="M8 46 Q 28 40 52 18" stroke="#E11D48" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.75" />
      <g transform="translate(10, 12) rotate(-14 22 20)">
        <path d="M6 20 L38 14 L46 20 L38 25 L6 23 Z" fill="#E11D48" stroke="#FB7185" strokeWidth="1.2" />
        <rect x="16" y="10" width="22" height="5" rx="2.5" fill="#0891B2" />
        <rect x="14" y="23" width="20" height="4.5" rx="2.2" fill="#0E7490" />
        <line x1="47" y1="12" x2="47" y2="28" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="49" cy="49" r="9.5" fill="#0891B2" stroke="#FFFFFF" strokeWidth="1.4" />
      <text x="49" y="52.5" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900">৳</text>
    </svg>
  </div>
);

export const MarketSparkline: React.FC<{ positive?: boolean; className?: string }> = ({
  positive = true,
  className = ''
}) => (
  <svg viewBox="0 0 84 28" className={`w-20 h-7 flex-shrink-0 ${className}`} fill="none">
    <path
      d={
        positive
          ? 'M2 22 L12 18 L20 21 L30 13 L40 16 L50 8 L60 11 L72 4 L82 6'
          : 'M2 6 L12 11 L22 9 L32 17 L44 14 L54 21 L66 18 L76 24 L82 22'
      }
      stroke={positive ? '#059669' : '#E11D48'}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
