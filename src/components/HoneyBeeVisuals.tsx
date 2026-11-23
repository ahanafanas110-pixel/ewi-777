import React, { useId } from 'react';

interface AnimatedHoneyBeeProps {
  size?: number;
  flight?: 'hover' | 'orbit' | 'static';
  flip?: boolean;
  delayMs?: number;
  className?: string;
}

/**
 * Crisp animated Honey Bee sprite with fluttering translucent wings & golden amber stripes.
 */
export const AnimatedHoneyBee: React.FC<AnimatedHoneyBeeProps> = ({
  size = 28,
  flight = 'hover',
  flip = false,
  delayMs = 0,
  className = ''
}) => {
  const uid = useId().replace(/:/g, '');
  const bodyGradId = `beeBodyGold-${uid}`;
  const wingGradId = `beeWingGrad-${uid}`;

  const flightClass =
    flight === 'orbit'
      ? 'bee-orbit-flight'
      : flight === 'hover'
      ? 'bee-hover-flight'
      : '';

  return (
    <span
      className={`inline-flex items-center justify-center pointer-events-none select-none ${flightClass} ${className}`}
      style={{
        width: size,
        height: size,
        animationDelay: delayMs ? `${delayMs}ms` : undefined
      }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: flip ? 'scaleX(-1)' : undefined,
          filter: 'drop-shadow(0 2px 4px rgba(180, 83, 9, 0.28))'
        }}
      >
        <defs>
          <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id={wingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
            <stop offset="55%" stopColor="#E0F2FE" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Left & Right Fluttering Wings */}
        <g className="bee-wing-l">
          <ellipse
            cx="26"
            cy="22"
            rx="11"
            ry="6.8"
            transform="rotate(-32 26 22)"
            fill={`url(#${wingGradId})`}
            stroke="#94A3B8"
            strokeWidth="1.2"
          />
          <path
            d="M21 20 Q27 21 31 25"
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
        <g className="bee-wing-r">
          <ellipse
            cx="39"
            cy="21"
            rx="10"
            ry="6.2"
            transform="rotate(24 39 21)"
            fill={`url(#${wingGradId})`}
            stroke="#94A3B8"
            strokeWidth="1.2"
          />
          <path
            d="M34 23 Q39 20 44 19"
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        {/* Tiny Legs */}
        <path
          d="M26 42 L23 48 M33 43 L32 49 M40 42 L43 48"
          stroke="#1E293B"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Stinger */}
        <path d="M49 36 L55 37 L49 39 Z" fill="#1E293B" />

        {/* Plump Golden Abdomen */}
        <ellipse
          cx="36"
          cy="36"
          rx="14"
          ry="10.5"
          fill={`url(#${bodyGradId})`}
          stroke="#451A03"
          strokeWidth="1.8"
        />

        {/* Dark Honey Stripes */}
        <path
          d="M30 27.5 C28.5 32 28.5 40 30 44.5"
          stroke="#1E293B"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M37 26 C35.5 31 35.5 41 37 45.8"
          stroke="#1E293B"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M43.5 28.5 C42.5 32.5 42.5 39.5 43.5 43.5"
          stroke="#1E293B"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Head */}
        <circle cx="20.5" cy="34" r="7.5" fill="#1E293B" stroke="#451A03" strokeWidth="1.4" />
        {/* Bright Eye + Cheek */}
        <circle cx="18.2" cy="32.5" r="2.2" fill="#FFFFFF" />
        <circle cx="17.8" cy="32.5" r="1.1" fill="#0F172A" />
        <circle cx="17.4" cy="32" r="0.45" fill="#FFFFFF" />
        <ellipse cx="20.5" cy="36.2" rx="1.8" ry="1.1" fill="#F59E0B" opacity="0.85" />

        {/* Antennae */}
        <path
          d="M17.5 27 C15.5 22.5 12.5 21.5 11.5 22.5"
          stroke="#1E293B"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="11.2" cy="22.6" r="1.4" fill="#F59E0B" />
        <path
          d="M20.5 26.8 C19.5 22 17.5 19.5 16 20"
          stroke="#1E293B"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="15.8" cy="20.2" r="1.4" fill="#F59E0B" />
      </svg>
    </span>
  );
};

interface HoneycombHiveHomeProps {
  variant?: 'banner' | 'mini' | 'pill';
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Golden Beehive Home ("Bee er Home") with hexagonal honeycomb cluster, dripping honey & animated bees.
 */
export const HoneycombHiveHome: React.FC<HoneycombHiveHomeProps> = ({
  variant = 'banner',
  title = 'Hney Win Beehive Sanctuary',
  subtitle = 'Fresh Golden Honey • Sweet Daily Wins',
  className = ''
}) => {
  const uid = useId().replace(/:/g, '');
  const miniGoldId = `hiveMiniGold-${uid}`;
  const miniHoneyId = `hiveMiniHoney-${uid}`;
  const bannerGoldId = `hiveBannerGold-${uid}`;
  const bannerHoneyId = `hiveBannerHoney-${uid}`;

  if (variant === 'mini') {
    return (
      <div className={`relative inline-flex items-center gap-1.5 select-none pointer-events-none ${className}`}>
        <div className="relative flex items-center justify-center">
          <svg
            width="42"
            height="38"
            viewBox="0 0 88 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_2px_6px_rgba(245,158,11,0.35)]"
          >
            <defs>
              <linearGradient id={miniGoldId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id={miniHoneyId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>
            {/* Background Hexagon Cell Cluster */}
            <polygon
              points="18,12 28,6 38,12 38,24 28,30 18,24"
              fill={`url(#${miniHoneyId})`}
              fillOpacity="0.9"
              stroke="#FEF08A"
              strokeWidth="1.5"
              className="hive-hex-shimmer"
            />
            <polygon
              points="52,16 62,10 72,16 72,28 62,34 52,28"
              fill={`url(#${miniHoneyId})`}
              fillOpacity="0.85"
              stroke="#FEF08A"
              strokeWidth="1.5"
              className="hive-hex-shimmer"
            />
            {/* Branch */}
            <path d="M12 18 Q44 10 76 17" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
            {/* Skep Beehive Home */}
            <ellipse cx="44" cy="24" rx="18" ry="6.5" fill={`url(#${miniGoldId})`} stroke="#92400E" strokeWidth="1.5" />
            <ellipse cx="44" cy="34" rx="23" ry="7.5" fill={`url(#${miniGoldId})`} stroke="#92400E" strokeWidth="1.5" />
            <ellipse cx="44" cy="45" rx="25" ry="8" fill={`url(#${miniGoldId})`} stroke="#92400E" strokeWidth="1.5" />
            <ellipse cx="44" cy="56" rx="22" ry="7.5" fill={`url(#${miniGoldId})`} stroke="#92400E" strokeWidth="1.5" />
            <ellipse cx="44" cy="65" rx="16" ry="5.5" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />
            {/* Arched Doorway */}
            <path
              d="M37 64 L37 50 C37 45.5 51 45.5 51 50 L51 64 Z"
              fill="#291205"
              stroke="#FEF08A"
              strokeWidth="1.5"
            />
            {/* Honey Drip */}
            <path
              d="M27 42 C27 48 25 53 28 53 C31 53 29 48 29 42 Z"
              fill="#FDE047"
              className="honey-drip-anim"
            />
          </svg>
          <AnimatedHoneyBee size={18} flight="orbit" className="absolute -top-2 -right-2" />
          <AnimatedHoneyBee size={15} flight="hover" flip delayMs={650} className="absolute -bottom-1 -left-2" />
        </div>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B2235] via-[#0E314A] to-[#0891B2] border border-amber-300/45 px-3.5 py-2 text-white shadow-sm flex items-center justify-between gap-2 ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <HoneycombHiveHome variant="mini" />
          <div className="min-w-0">
            <div className="text-xs font-black text-amber-200 tracking-tight truncate">
              {title}
            </div>
            <div className="text-[10px] font-semibold text-cyan-100/90 truncate">
              {subtitle}
            </div>
          </div>
        </div>
        <AnimatedHoneyBee size={24} flight="hover" delayMs={250} className="flex-shrink-0" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B2235] via-[#0F354D] to-[#0891B2] border border-amber-300/40 px-4 py-3.5 text-white shadow-md ${className}`}
    >
      {/* Subtle Golden Honeycomb Mesh Accent on Right */}
      <svg
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-20"
        width="136"
        height="88"
        viewBox="0 0 136 88"
        fill="none"
      >
        <polygon points="20,10 34,2 48,10 48,26 34,34 20,26" stroke="#FCD34D" strokeWidth="2" fill="#F59E0B" fillOpacity="0.25" />
        <polygon points="52,10 66,2 80,10 80,26 66,34 52,26" stroke="#FCD34D" strokeWidth="2" />
        <polygon points="84,10 98,2 112,10 112,26 98,34 84,26" stroke="#FCD34D" strokeWidth="2" fill="#F59E0B" fillOpacity="0.3" />
        <polygon points="36,36 50,28 64,36 64,52 50,60 36,52" stroke="#FCD34D" strokeWidth="2" fill="#F59E0B" fillOpacity="0.35" />
        <polygon points="68,36 82,28 96,36 96,52 82,60 68,52" stroke="#FCD34D" strokeWidth="2" />
        <polygon points="100,36 114,28 128,36 128,52 114,60 100,52" stroke="#FCD34D" strokeWidth="2" fill="#F59E0B" fillOpacity="0.25" />
      </svg>

      <div className="relative z-10 flex items-center justify-between gap-3">
        {/* Left: Full Beehive Sanctuary Artwork */}
        <div className="relative flex-shrink-0">
          <svg
            width="68"
            height="62"
            viewBox="0 0 112 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_4px_12px_rgba(245,158,11,0.38)]"
          >
            <defs>
              <linearGradient id={bannerGoldId} x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor="#FEF9C3" />
                <stop offset="45%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id={bannerHoneyId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>

            {/* Wooden Branch + Leaves */}
            <path d="M8 22 Q56 10 104 20" stroke="#78350F" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="22" cy="14" rx="10" ry="4.5" transform="rotate(-24 22 14)" fill="#22C55E" />
            <ellipse cx="92" cy="14" rx="9" ry="4" transform="rotate(20 92 14)" fill="#16A34A" />

            {/* Background Hexagonal Honeycomb Cells */}
            <polygon
              points="10,44 22,37 34,44 34,58 22,65 10,58"
              fill={`url(#${bannerHoneyId})`}
              stroke="#FEF08A"
              strokeWidth="1.6"
              className="hive-hex-shimmer"
            />
            <polygon
              points="78,44 90,37 102,44 102,58 90,65 78,58"
              fill={`url(#${bannerHoneyId})`}
              stroke="#FEF08A"
              strokeWidth="1.6"
              className="hive-hex-shimmer"
            />

            {/* Main Golden Skep Beehive Home */}
            <ellipse cx="56" cy="28" rx="21" ry="7.5" fill={`url(#${bannerGoldId})`} stroke="#92400E" strokeWidth="1.6" />
            <ellipse cx="56" cy="40" rx="28" ry="8.5" fill={`url(#${bannerGoldId})`} stroke="#92400E" strokeWidth="1.6" />
            <ellipse cx="56" cy="53" rx="31" ry="9" fill={`url(#${bannerGoldId})`} stroke="#92400E" strokeWidth="1.6" />
            <ellipse cx="56" cy="66" rx="28" ry="8.5" fill={`url(#${bannerGoldId})`} stroke="#92400E" strokeWidth="1.6" />
            <ellipse cx="56" cy="78" rx="22" ry="7" fill="#B45309" stroke="#78350F" strokeWidth="1.6" />

            {/* Warm Glowing Beehive Home Doorway */}
            <path
              d="M46 78 L46 58 C46 51.5 66 51.5 66 58 L66 78 Z"
              fill="#291205"
              stroke="#FDE047"
              strokeWidth="2"
            />

            {/* Liquid Golden Honey Drip */}
            <path
              d="M34 49 C34 57 31 64 35.5 64 C40 64 37 57 37 49 Z"
              fill="#FEF08A"
              className="honey-drip-anim"
            />
            <path
              d="M74 52 C74 60 72 67 76 67 C80 67 77.5 60 77.5 52 Z"
              fill="#FDE047"
              className="honey-drip-anim"
            />
          </svg>
          <AnimatedHoneyBee size={22} flight="orbit" className="absolute -top-2 -right-2" />
          <AnimatedHoneyBee size={18} flight="hover" flip delayMs={500} className="absolute bottom-0 -left-2" />
        </div>

        {/* Center Text */}
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
            <span>Hney Win • Honey Hive</span>
          </div>
          <div className="text-sm font-black text-white tracking-tight truncate mt-0.5">
            {title}
          </div>
          <div className="text-[11px] font-semibold text-cyan-100/90 truncate mt-0.5">
            {subtitle}
          </div>
        </div>

        {/* Right Floating Guard Bee */}
        <AnimatedHoneyBee size={30} flight="hover" flip delayMs={350} className="flex-shrink-0" />
      </div>
    </div>
  );
};
