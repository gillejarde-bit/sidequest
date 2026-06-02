import React from 'react';

interface EmblemProps {
  color: string;
  className?: string;
}

// 1. Gastronomy: Flame-kissed fork & spoon / Simmering pot
export function GastronomyEmblem({ color, className = "w-24 h-24" }: EmblemProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill={`${color}15`} stroke={color} strokeWidth="3" />
      {/* Flame silhouette */}
      <path d="M32 12C38 18 42 26 38 36C34 46 22 46 22 36C22 28 26 20 32 12Z" fill={color} fillOpacity="0.3" />
      {/* Simmering Pot / Bowl */}
      <path d="M16 36C16 46 48 46 48 36H16Z" fill={color} stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
      <rect x="22" y="32" width="20" height="4" rx="2" fill="#FFFFFF" />
      {/* Steam rising */}
      <path d="M24 20C24 20 26 24 24 26" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 18C32 18 34 22 32 24" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 20C40 20 42 24 40 26" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 2. Wilds: Leaf / Pine Mountain leaf trio
export function WildsEmblem({ color, className = "w-24 h-24" }: EmblemProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill={`${color}15`} stroke={color} strokeWidth="3" />
      {/* Mountains behind */}
      <path d="M14 44 L28 22 L40 44 Z" fill={color} fillOpacity="0.2" />
      <path d="M26 44 L38 16 L50 44 Z" fill={color} fillOpacity="0.3" />
      {/* Three overlapping stylized leaves */}
      <path d="M32 18C32 18 44 26 42 38C40 48 24 48 22 38C20 26 32 18 32 18Z" fill={color} stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 20V44" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 30L38 26M32 36L40 32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 3. Revelry: Starburst / Clinking Cups
export function RevelryEmblem({ color, className = "w-24 h-24" }: EmblemProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill={`${color}15`} stroke={color} strokeWidth="3" />
      {/* Starburst rays */}
      <path d="M32 12V20M32 44V52M12 32H20M44 32H52M18 18L24 24M40 40L46 46M46 18L40 24M24 40L18 46" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      {/* Clinking Glasses */}
      <g transform="rotate(-15 32 32)">
        <path d="M24 24 L20 44 H30 L28 24 Z" fill={color} stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="18" y="28" width="6" height="12" rx="2" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      </g>
      <g transform="scale(-1 1) translate(-64 0) rotate(-15 32 32)">
        <path d="M24 24 L20 44 H30 L28 24 Z" fill={color} stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="18" y="28" width="6" height="12" rx="2" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      </g>
      {/* Star sparkle in center */}
      <path d="M32 20L34 26L40 28L34 30L32 36L30 30L24 28L30 26Z" fill="#FFFFFF" />
    </svg>
  );
}

// 4. Athletics: Laurel + Lightning Bolt
export function AthleticsEmblem({ color, className = "w-24 h-24" }: EmblemProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill={`${color}15`} stroke={color} strokeWidth="3" />
      {/* Laurel wreath branches */}
      <path d="M18 44C16 38 16 28 24 22M46 44C48 38 48 28 40 22" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Stylized high-performance Lightning Bolt */}
      <path d="M38 12 L22 34 H32 L26 52 L42 30 H32 Z" fill={color} stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

// 5. Lore: Open Tome / Quill
export function LoreEmblem({ color, className = "w-24 h-24" }: EmblemProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill={`${color}15`} stroke={color} strokeWidth="3" />
      {/* Glowing background */}
      <circle cx="32" cy="32" r="16" fill={color} fillOpacity="0.1" />
      {/* Open Book */}
      <path d="M32 42C32 42 24 38 14 40V20C24 18 32 22 32 22C32 22 40 18 50 20V40C40 38 32 42 32 42Z" fill={color} stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Page center fold crease */}
      <path d="M32 22V42" stroke="#FFFFFF" strokeWidth="2" />
      {/* Pages lines */}
      <path d="M18 26H26M18 30H26M18 34H24M38 26H46M38 30H46M38 34H44" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      {/* Sparkles of wisdom */}
      <path d="M32 10L33 13L36 14L33 15L32 18L31 15L28 14L31 13Z" fill={color} />
    </svg>
  );
}

// 6. Wayfaring: Compass Rose
export function WayfaringEmblem({ color, className = "w-24 h-24" }: EmblemProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill={`${color}15`} stroke={color} strokeWidth="3" />
      {/* Compass Outer ticks */}
      <circle cx="32" cy="32" r="20" stroke={color} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
      {/* North marker */}
      <path d="M32 8L35 14H29Z" fill={color} />
      {/* Compass Star Pointer */}
      <path d="M32 16 L36 32 L32 48 L28 32 Z" fill={color} stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 32 L32 28 L48 32 L32 36 Z" fill={color} fillOpacity="0.4" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
      {/* Shading/Depth slice on pointer */}
      <path d="M32 16 L36 32 H32 Z" fill="#FFFFFF" fillOpacity="0.3" />
      <path d="M32 32 L48 32 L32 36 Z" fill="#FFFFFF" fillOpacity="0.3" />
      <circle cx="32" cy="32" r="3.5" fill="#FFFFFF" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// 7. Fellowship: Hearth / Interlocking Rings
export function FellowshipEmblem({ color, className = "w-24 h-24" }: EmblemProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill={`${color}15`} stroke={color} strokeWidth="3" />
      {/* Heart behind */}
      <path d="M32 46C32 46 16 36 16 26C16 18 23 14 32 22C41 14 48 18 48 26C48 36 32 46 32 46Z" fill={color} fillOpacity="0.25" />
      {/* Interlocking Rings */}
      <circle cx="26" cy="32" r="11" stroke="#FFFFFF" strokeWidth="3" fill="none" />
      <circle cx="26" cy="32" r="11" stroke={color} strokeWidth="2" fill="none" />
      
      <circle cx="38" cy="32" r="11" stroke="#FFFFFF" strokeWidth="3" fill="none" />
      <circle cx="38" cy="32" r="11" stroke={color} strokeWidth="2" fill="none" />
      
      {/* Interlock visual correction */}
      <path d="M32 23.3C34.2 24.8 35.8 27.2 36.6 30" stroke="#FFFFFF" strokeWidth="3" fill="none" />
      <path d="M32 23.3C34.2 24.8 35.8 27.2 36.6 30" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  );
}

// 8. Discovery: Faceted Gem
export function DiscoveryEmblem({ color, className = "w-24 h-24" }: EmblemProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill={`${color}15`} stroke={color} strokeWidth="3" />
      {/* Faceted gemstone silhouette */}
      <path d="M32 12 L48 24 L32 52 L16 24 Z" fill={color} stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 12 L38 24 L32 52 Z" fill="#FFFFFF" fillOpacity="0.25" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M16 24 H48" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M24 24 L32 12" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M40 24 L32 12" stroke="#FFFFFF" strokeWidth="1.5" />
      {/* Specular Glint */}
      <circle cx="26" cy="20" r="2" fill="#FFFFFF" />
    </svg>
  );
}

// Emblem map lookup
export const emblemMap: Record<string, React.ComponentType<EmblemProps>> = {
  gastronomy: GastronomyEmblem,
  wilds: WildsEmblem,
  revelry: RevelryEmblem,
  athletics: AthleticsEmblem,
  lore: LoreEmblem,
  wayfaring: WayfaringEmblem,
  fellowship: FellowshipEmblem,
  discovery: DiscoveryEmblem
};

interface PursuitEmblemProps {
  emblemKey: string;
  color: string;
  className?: string;
}

export function PursuitEmblem({ emblemKey, color, className }: PursuitEmblemProps) {
  const Component = emblemMap[emblemKey];
  if (!Component) return null;
  return <Component color={color} className={className} />;
}
