import React from 'react';

export const PinkGiftIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  return (
    <svg
      viewBox="0 0 260 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="pg_bg_grad" x1="0" y1="0" x2="260" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0E7490" />
          <stop offset="50%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        <radialGradient id="pg_glow" cx="130" cy="70" r="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#A5F3FC" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="pg_box_front" x1="85" y1="58" x2="175" y2="125" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0E7490" />
          <stop offset="100%" stopColor="#164E63" />
        </linearGradient>

        <linearGradient id="pg_lid_grad" x1="75" y1="42" x2="185" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>

        <linearGradient id="pg_gold_ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF8D1" />
          <stop offset="35%" stopColor="#FFD700" />
          <stop offset="70%" stopColor="#FFB800" />
          <stop offset="100%" stopColor="#D99000" />
        </linearGradient>

        <linearGradient id="pg_gold_coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF9D2" />
          <stop offset="50%" stopColor="#FFD000" />
          <stop offset="100%" stopColor="#E09500" />
        </linearGradient>

        <filter id="pg_drop_shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#083344" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect width="260" height="140" fill="url(#pg_bg_grad)" />
      <circle cx="130" cy="70" r="75" fill="url(#pg_glow)" />

      <circle cx="35" cy="25" r="18" fill="#FFFFFF" fillOpacity="0.08" />
      <circle cx="230" cy="115" r="28" fill="#FFFFFF" fillOpacity="0.07" />
      <circle cx="215" cy="25" r="14" fill="#FFFFFF" fillOpacity="0.06" />

      <g transform="translate(42, 75) rotate(-18)" filter="url(#pg_drop_shadow)">
        <ellipse cx="0" cy="0" rx="14" ry="12" fill="url(#pg_gold_coin)" />
        <ellipse cx="0" cy="0" rx="10.5" ry="9" stroke="#FFF7B8" strokeWidth="1.2" fill="none" opacity="0.9" />
        <text x="0" y="3.5" fill="#7A4E00" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">৳</text>
      </g>

      <g transform="translate(68, 30) rotate(14)">
        <ellipse cx="0" cy="0" rx="9" ry="8" fill="url(#pg_gold_coin)" />
        <ellipse cx="0" cy="0" rx="6.5" ry="5.8" stroke="#FFF7B8" strokeWidth="0.8" fill="none" />
      </g>

      <g transform="translate(210, 68) rotate(16)" filter="url(#pg_drop_shadow)">
        <ellipse cx="0" cy="0" rx="16" ry="13.5" fill="url(#pg_gold_coin)" />
        <ellipse cx="0" cy="0" rx="12" ry="10" stroke="#FFF7B8" strokeWidth="1.4" fill="none" opacity="0.9" />
        <text x="0" y="4" fill="#7A4E00" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">৳</text>
      </g>

      <g transform="translate(195, 112) rotate(-12)">
        <ellipse cx="0" cy="0" rx="8" ry="7" fill="url(#pg_gold_coin)" />
        <ellipse cx="0" cy="0" rx="5.8" ry="5" stroke="#FFF7B8" strokeWidth="0.8" fill="none" />
      </g>

      <ellipse cx="130" cy="122" rx="48" ry="8" fill="#083344" fillOpacity="0.32" />

      <g filter="url(#pg_drop_shadow)">
        <rect x="90" y="60" width="80" height="58" rx="8" fill="url(#pg_box_front)" />
        <rect x="91" y="61" width="78" height="56" rx="7" stroke="#A5F3FC" strokeWidth="1" fill="none" opacity="0.45" />
        <rect x="122" y="60" width="16" height="58" fill="url(#pg_gold_ribbon)" />
        <line x1="130" y1="60" x2="130" y2="118" stroke="#FFE978" strokeWidth="1" opacity="0.8" />
        <rect x="90" y="82" width="80" height="15" fill="url(#pg_gold_ribbon)" />
        <line x1="90" y1="89.5" x2="170" y2="89.5" stroke="#FFE978" strokeWidth="1" opacity="0.8" />
        <rect x="83" y="44" width="94" height="20" rx="5" fill="url(#pg_lid_grad)" />
        <rect x="84" y="45" width="92" height="18" rx="4" stroke="#A5F3FC" strokeWidth="1" fill="none" opacity="0.6" />
        <rect x="122" y="44" width="16" height="20" fill="url(#pg_gold_ribbon)" />
        <line x1="130" y1="44" x2="130" y2="64" stroke="#FFE978" strokeWidth="1" opacity="0.8" />
        <path d="M130 46 C114 30 96 36 106 48 C114 56 126 50 130 46 Z" fill="url(#pg_gold_ribbon)" stroke="#FFE66B" strokeWidth="0.8" />
        <path d="M130 46 C146 30 164 36 154 48 C146 56 134 50 130 46 Z" fill="url(#pg_gold_ribbon)" stroke="#FFE66B" strokeWidth="0.8" />
        <circle cx="130" cy="46" r="6" fill="#FFE552" stroke="#B87700" strokeWidth="0.8" />
        <circle cx="130" cy="46" r="3.5" fill="#FFAA00" />
        <path d="M127 49 Q118 62 112 68 Q118 64 125 51 Z" fill="url(#pg_gold_ribbon)" />
        <path d="M133 49 Q142 62 148 68 Q142 64 135 51 Z" fill="url(#pg_gold_ribbon)" />
      </g>

      <circle cx="60" cy="110" r="1.5" fill="#FFFFFF" opacity="0.7" />
      <circle cx="198" cy="42" r="1.5" fill="#A5F3FC" opacity="0.8" />
      <circle cx="102" cy="28" r="1.8" fill="#FFFFFF" opacity="0.8" />
    </svg>
  );
};

export const PinkAttendanceIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  return (
    <svg
      viewBox="0 0 260 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="pa_bg_grad" x1="0" y1="0" x2="260" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0E7490" />
          <stop offset="50%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        <radialGradient id="pa_glow" cx="130" cy="70" r="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#A5F3FC" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="pa_gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF9D2" />
          <stop offset="50%" stopColor="#FFD000" />
          <stop offset="100%" stopColor="#E09500" />
        </linearGradient>

        <linearGradient id="pa_cal_header" x1="85" y1="36" x2="175" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#164E63" />
        </linearGradient>

        <filter id="pa_drop_shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#083344" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect width="260" height="140" fill="url(#pa_bg_grad)" />
      <circle cx="130" cy="70" r="75" fill="url(#pa_glow)" />

      <circle cx="30" cy="30" r="16" fill="#FFFFFF" fillOpacity="0.08" />
      <circle cx="230" cy="115" r="26" fill="#FFFFFF" fillOpacity="0.07" />

      <g transform="translate(46, 68) rotate(-14)" filter="url(#pa_drop_shadow)">
        <rect x="-18" y="-12" width="36" height="24" rx="4" fill="url(#pa_gold)" />
        <circle cx="-18" cy="0" r="3.5" fill="#0E7490" />
        <circle cx="18" cy="0" r="3.5" fill="#0E7490" />
        <rect x="-15" y="-9" width="30" height="18" rx="2" stroke="#FFF7B8" strokeWidth="0.8" fill="none" opacity="0.7" />
        <text x="0" y="4" fill="#7A4E00" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">Day 1 ৳1</text>
      </g>

      <g transform="translate(214, 76) rotate(16)" filter="url(#pa_drop_shadow)">
        <rect x="-18" y="-12" width="36" height="24" rx="4" fill="url(#pa_gold)" />
        <circle cx="-18" cy="0" r="3.5" fill="#0E7490" />
        <circle cx="18" cy="0" r="3.5" fill="#0E7490" />
        <rect x="-15" y="-9" width="30" height="18" rx="2" stroke="#FFF7B8" strokeWidth="0.8" fill="none" opacity="0.7" />
        <text x="0" y="4" fill="#7A4E00" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">Day 7 ৳7</text>
      </g>

      <g transform="translate(68, 28) rotate(12)">
        <ellipse cx="0" cy="0" rx="9" ry="8" fill="url(#pa_gold)" />
        <text x="0" y="3" fill="#7A4E00" fontSize="7" fontWeight="900" textAnchor="middle">৳</text>
      </g>
      <g transform="translate(202, 34) rotate(-10)">
        <ellipse cx="0" cy="0" rx="10" ry="8.5" fill="url(#pa_gold)" />
        <text x="0" y="3" fill="#7A4E00" fontSize="8" fontWeight="900" textAnchor="middle">৳</text>
      </g>

      <ellipse cx="130" cy="122" rx="52" ry="8" fill="#083344" fillOpacity="0.32" />

      <g filter="url(#pa_drop_shadow)">
        <rect x="88" y="40" width="84" height="78" rx="10" fill="#ECFEFF" />
        <rect x="88" y="36" width="84" height="80" rx="10" fill="#FFFFFF" />
        <path d="M88 46 C88 40.477 92.477 36 98 36 L162 36 C167.523 36 172 40.477 172 46 L172 58 L88 58 Z" fill="url(#pa_cal_header)" />
        <text x="130" y="49" fill="#FFFFFF" fontSize="8.5" fontWeight="900" letterSpacing="0.8" textAnchor="middle" fontFamily="sans-serif">
          DAILY SIGN-IN
        </text>
        {[98, 114, 130, 146, 162].map((x, i) => (
          <g key={i}>
            <rect x={x - 2.5} y="32" width="5" height="10" rx="2.5" fill="url(#pa_gold)" stroke="#D48800" strokeWidth="0.6" />
            <circle cx={x} cy="42" r="1.5" fill="#083344" opacity="0.35" />
          </g>
        ))}

        {[100, 120, 140, 160].map((cx, i) => (
          <g key={i} transform={`translate(${cx}, 68)`}>
            <rect x="-8" y="-7" width="16" height="14" rx="3.5" fill="#E8F8F0" stroke="#10B981" strokeWidth="0.8" />
            <path d="M-3.5 0 L-1 2.5 L3.5 -2" stroke="#10B981" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}

        <g transform="translate(100, 88)">
          <rect x="-8" y="-7" width="16" height="14" rx="3.5" fill="#ECFEFF" stroke="#0891B2" strokeWidth="1" />
          <text x="0" y="3.5" fill="#0E7490" fontSize="7.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">5</text>
        </g>

        <g transform="translate(120, 88)">
          <rect x="-8" y="-7" width="16" height="14" rx="3.5" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.8" />
          <text x="0" y="3.5" fill="#94A3B8" fontSize="7.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">6</text>
        </g>

        <g transform="translate(148, 88)">
          <rect x="-14" y="-7" width="28" height="14" rx="4" fill="url(#pa_gold)" />
          <text x="0" y="3.5" fill="#7A4E00" fontSize="7.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">৳1-৳7</text>
        </g>

        <rect x="94" y="102" width="72" height="6" rx="3" fill="#CFFAFE" />
        <rect x="94" y="102" width="46" height="6" rx="3" fill="#0891B2" />
      </g>

      <g transform="translate(178, 86) rotate(32)" filter="url(#pa_drop_shadow)">
        <rect x="-3" y="-18" width="6" height="26" rx="1" fill="#FFD000" stroke="#D49000" strokeWidth="0.5" />
        <rect x="-3" y="-22" width="6" height="4" rx="1" fill="#0891B2" />
        <rect x="-3" y="-19" width="6" height="2" fill="#CBD5E1" />
        <polygon points="-3,8 3,8 0,14" fill="#FDE68A" />
        <polygon points="-1,12 1,12 0,14" fill="#334155" />
      </g>

      <circle cx="62" cy="112" r="1.5" fill="#FFFFFF" opacity="0.7" />
      <circle cx="118" cy="24" r="1.6" fill="#A5F3FC" opacity="0.8" />
    </svg>
  );
};
