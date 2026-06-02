import React from 'react';
import { DerivedArchetype } from '../../features/archetype/deriveArchetype';

interface AvatarBorderProps {
  borderId?: string; // Kept for backward compatibility
  level: number;
  archetype: DerivedArchetype;
  children: React.ReactNode;
}

export function AvatarBorder({ level, archetype, children }: AvatarBorderProps) {
  const isHybrid = archetype.kind === 'hybrid';
  const isWanderer = archetype.kind === 'default';

  // 1. Resolve archetype colors
  const primaryColor = isWanderer ? '#9CA3AF' : archetype.baseColor;
  const secondaryColor = isWanderer ? '#9CA3AF' : (isHybrid ? archetype.accentColor : archetype.baseColor);

  // 2. Resolve level-tier embellishment colors and dash patterns
  let tierColor = '#CD7F32'; // Bronze
  let dash = '256';
  let hasTierEmbellishment = level > 1; // Only show outer tier if level > 1, newcomers are simple

  if (level >= 30) {
    tierColor = '#22D3EE'; // Platinum / Cyan-400
    dash = '12 6 24 6';
  } else if (level >= 20) {
    tierColor = '#FBBF24'; // Gold / Amber-400
    dash = '20 4 10 4';
  } else if (level >= 10) {
    tierColor = '#9CA3AF'; // Silver / Gray-400
    dash = '40 6';
  }

  // Unique gradient ID per instance to prevent SVG namespace collisions
  const gradId = React.useId().replace(/:/g, '-');

  return (
    <div className="relative p-2.5 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full pointer-events-none scale-105" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`grad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          
          <filter id={`glow-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={primaryColor} floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Level-Tier Outer Ring (conveys tier) */}
        {hasTierEmbellishment && (
          <>
            <circle cx="60" cy="60" r="54" stroke={tierColor} strokeWidth="3" strokeLinecap="round" strokeDasharray={dash} opacity="0.8" />
            {/* cardinal notches for epic look */}
            <path d="M60 2 L62 7 H58 Z" fill={tierColor} />
            <path d="M60 118 L62 113 H58 Z" fill={tierColor} />
            <path d="M2 60 L7 62 V58 Z" fill={tierColor} />
            <path d="M118 60 L113 62 V58 Z" fill={tierColor} />
          </>
        )}

        {/* 2. Archetype Inner Ring (conveys class colors) */}
        <circle cx="60" cy="60" r="46" stroke={`url(#grad-${gradId})`} strokeWidth="4" filter={`url(#glow-${gradId})`} />
        
        {/* Inner white dashes for premium contrast */}
        <circle cx="60" cy="60" r="41" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="16 6" strokeLinecap="round" opacity="0.8" />
      </svg>
      {children}
    </div>
  );
}
