import React from 'react';
import tileWingoImg from '../assets/images/tile_wingo_edited_1795168517740.jpg';
import tileEwiWingoImg from '../assets/images/tile_ewi_wingo_edited_1795168517728.jpg';
import tileEwiK3Img from '../assets/images/tile_ewi_k3_dice_1795168517201.jpg';
import tileEwi5DImg from '../assets/images/tile_ewi_5d_realistic_1795168516865.jpg';
import tileCasinoImg from '../assets/images/tile_casino_roulette_edited_1795168518026.jpg';
import tileSlotsImg from '../assets/images/tile_slots_dragon_edited_1795168517735.jpg';
import tileBinaryImg from '../assets/images/binary_trading_emblem_1795251768060.jpg';
import tileGoldImg from '../assets/images/gold_trading_emblem_1795251766450.jpg';
import tileLudoImg from '../assets/images/ludo_realistic_icon_1795251767143.jpg';

export const TileWingoIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileWingoImg}
    alt="Wingo"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileEwiWingoIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileEwiWingoImg}
    alt="EWI Wingo"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileEwiK3Icon: React.FC<{ size?: number }> = () => (
  <img
    src={tileEwiK3Img}
    alt="EWI K3"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileEwi5DIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileEwi5DImg}
    alt="EWI 5D"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileBinaryIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileBinaryImg}
    alt="Binary Trading"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block bg-slate-50"
  />
);

export const TileGoldIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileGoldImg}
    alt="Gold Trading"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block bg-slate-50"
  />
);

export const TileLudoIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileLudoImg}
    alt="EWI Ludo"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block bg-white"
  />
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
