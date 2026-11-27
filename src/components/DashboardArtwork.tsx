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
import aviatorRedPlaneCleanImg from '../assets/images/aviator_red_plane_clean_1795168517074.jpg';

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
    alt="Deshi Wingo"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileEwiK3Icon: React.FC<{ size?: number }> = () => (
  <img
    src={tileEwiK3Img}
    alt="Deshi K3"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block"
  />
);

export const TileEwi5DIcon: React.FC<{ size?: number }> = () => (
  <img
    src={tileEwi5DImg}
    alt="Deshi 5D"
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
    alt="Deshi Ludo"
    referrerPolicy="no-referrer"
    className="w-full h-full rounded-xl object-cover select-none block bg-white"
  />
);

export const TileSportsIcon: React.FC<{ size?: number }> = () => (
  <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#ECFEFF] via-white to-[#CCFBF1] border border-cyan-200 flex items-center justify-center relative overflow-hidden">
    <svg viewBox="0 0 64 64" className="w-9 h-9 drop-shadow-xs">
      <circle cx="24" cy="36" r="14" fill="#FFFFFF" stroke="#0891B2" strokeWidth="2.5" />
      <polygon points="24,27 30,31 28,38 20,38 18,31" fill="#0F172A" />
      <line x1="24" y1="22" x2="24" y2="27" stroke="#0891B2" strokeWidth="1.8" />
      <line x1="30" y1="31" x2="36" y2="29" stroke="#0891B2" strokeWidth="1.8" />
      <line x1="18" y1="31" x2="12" y2="29" stroke="#0891B2" strokeWidth="1.8" />
      <circle cx="44" cy="22" r="9.5" fill="#DC2626" stroke="#991B1B" strokeWidth="2" />
      <path d="M38 17 C42 21, 46 23, 50 27" stroke="#FEF2F2" strokeWidth="1.8" strokeDasharray="2.5 2" fill="none" />
    </svg>
  </div>
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
    className={`relative rounded-2xl bg-gradient-to-br from-[#F0F9FF] via-white to-[#ECFEFF] border border-cyan-300 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0 ${className}`}
  >
    <img
      src={aviatorRedPlaneCleanImg}
      alt="Plane Crash"
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover select-none block"
    />
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
