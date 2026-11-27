import React, { useId } from 'react';

interface EwiCoinFaceProps {
  side: 'GOLD' | 'SILVER';
  size?: number;
  className?: string;
}

export const EwiCoinFace: React.FC<EwiCoinFaceProps> = ({
  side,
  size = 160,
  className = ''
}) => {
  const uid = useId().replace(/:/g, '');
  const isGold = side === 'GOLD';

  const outerRimId = `cf_outer_${uid}`;
  const midTrackId = `cf_track_${uid}`;
  const domeId = `cf_dome_${uid}`;
  const sheenId = `cf_sheen_${uid}`;
  const innerStrokeId = `cf_istroke_${uid}`;
  const arcTopId = `cf_arc_top_${uid}`;
  const arcRightId = `cf_arc_right_${uid}`;
  const arcBottomId = `cf_arc_bottom_${uid}`;
  const arcLeftId = `cf_arc_left_${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      className={`select-none ${className}`}
      role="img"
      aria-label={`${isGold ? 'Gold' : 'Silver'} Deshi Win Coin`}
    >
      <defs>
        {/* Outer specular bevel ring */}
        <linearGradient id={outerRimId} x1="12%" y1="8%" x2="88%" y2="92%">
          {isGold ? (
            <>
              <stop offset="0%" stopColor="#FFFDE4" />
              <stop offset="28%" stopColor="#FDE047" />
              <stop offset="68%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#92400E" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="28%" stopColor="#E2E8F0" />
              <stop offset="68%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </>
          )}
        </linearGradient>

        {/* Recessed rim track */}
        <linearGradient id={midTrackId} x1="15%" y1="10%" x2="85%" y2="90%">
          {isGold ? (
            <>
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="45%" stopColor="#FBBF24" />
              <stop offset="85%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#B45309" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="45%" stopColor="#DCE6F2" />
              <stop offset="85%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#64748B" />
            </>
          )}
        </linearGradient>

        {/* Raised center dome medallion */}
        <radialGradient id={domeId} cx="35%" cy="30%" r="70%">
          {isGold ? (
            <>
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#FACC15" />
              <stop offset="75%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="35%" stopColor="#E2E8F0" />
              <stop offset="75%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </>
          )}
        </radialGradient>

        {/* Inner dome rim highlight */}
        <linearGradient id={innerStrokeId} x1="15%" y1="10%" x2="85%" y2="90%">
          {isGold ? (
            <>
              <stop offset="0%" stopColor="#FEF9C3" />
              <stop offset="50%" stopColor="#B45309" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFFBEB" stopOpacity="0.85" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#64748B" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.9" />
            </>
          )}
        </linearGradient>

        {/* Diagonal glossy light sheen across upper dome */}
        <linearGradient id={sheenId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.58" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Curved text paths matching the 4 quadrants */}
        <path id={arcTopId} d="M 38,120 A 82,82 0 0,1 120,38" />
        <path id={arcRightId} d="M 120,38 A 82,82 0 0,1 202,120" />
        <path id={arcBottomId} d="M 202,120 A 82,82 0 0,1 120,202" />
        <path id={arcLeftId} d="M 120,202 A 82,82 0 0,1 38,120" />

        <clipPath id={`cf_clip_${uid}`}>
          <circle cx="120" cy="120" r="68" />
        </clipPath>
      </defs>

      {/* Outer Coin Bezel */}
      <circle
        cx="120"
        cy="120"
        r="116"
        fill={`url(#${outerRimId})`}
        stroke={isGold ? '#78350F' : '#334155'}
        strokeWidth="2"
      />

      {/* Recessed Ring Track */}
      <circle
        cx="120"
        cy="120"
        r="105"
        fill={`url(#${midTrackId})`}
        stroke={isGold ? '#FEF08A' : '#FFFFFF'}
        strokeWidth="2.5"
        strokeOpacity="0.65"
      />

      {/* 4 Engraved Stars at Cardinal Points */}
      {[
        { cx: 120, cy: 29 },
        { cx: 211, cy: 120 },
        { cx: 120, cy: 211 },
        { cx: 29, cy: 120 }
      ].map((pt, idx) => (
        <text
          key={idx}
          x={pt.cx}
          y={pt.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fontWeight="900"
          fill={isGold ? '#9A5404' : '#58697E'}
        >
          ★
        </text>
      ))}

      {/* Curved Engraved "PLAY AND WIN" around perimeter */}
      {[arcTopId, arcRightId, arcBottomId, arcLeftId].map((pathId, idx) => (
        <text
          key={idx}
          fontSize="11.5"
          fontWeight="800"
          letterSpacing="1.6"
          fill={isGold ? '#9A5404' : '#58697E'}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            PLAY AND WIN
          </textPath>
        </text>
      ))}

      {/* Inner Raised Dome */}
      <circle
        cx="120"
        cy="120"
        r="69"
        fill={`url(#${domeId})`}
        stroke={`url(#${innerStrokeId})`}
        strokeWidth="3"
      />

      {/* Specular Diagonal Light Streaks */}
      <g clipPath={`url(#cf_clip_${uid})`}>
        <path
          d="M 42,96 L 116,28 L 146,28 L 62,118 Z"
          fill={`url(#${sheenId})`}
        />
        <path
          d="M 74,126 L 154,40 L 168,48 L 86,138 Z"
          fill="#FFFFFF"
          fillOpacity="0.22"
        />
      </g>

      {/* Engraved Italic Bold DESHI WIN Center Emblem */}
      <g transform="translate(120 122) skewX(-9)">
        <text
          x="0"
          y="2.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="24"
          fontWeight="900"
          letterSpacing="-0.5"
          fontFamily="'Arial Black', Impact, system-ui, sans-serif"
          fill={isGold ? '#FEF08A' : '#F8FAFC'}
          fillOpacity="0.65"
        >
          DESHI WIN
        </text>
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="24"
          fontWeight="900"
          letterSpacing="-0.5"
          fontFamily="'Arial Black', Impact, system-ui, sans-serif"
          fill={isGold ? '#A15B07' : '#5B6D82'}
          stroke={isGold ? '#854D0E' : '#475569'}
          strokeWidth="0.6"
        >
          DESHI WIN
        </text>
      </g>
    </svg>
  );
};

export const EwiCoinBadgePair: React.FC<{ size?: number }> = ({ size = 44 }) => {
  const coinPx = Math.round(size * 0.72);
  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div className="absolute right-0 bottom-0.5 drop-shadow">
        <EwiCoinFace side="SILVER" size={coinPx} />
      </div>
      <div className="absolute left-0 top-0.5 drop-shadow-md">
        <EwiCoinFace side="GOLD" size={coinPx} />
      </div>
    </div>
  );
};
