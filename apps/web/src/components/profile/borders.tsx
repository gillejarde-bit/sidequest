import React from 'react';
import { DerivedArchetype } from '../../features/archetype/deriveArchetype';

interface BorderProps {
  level: number;
  archetype: DerivedArchetype;
  children: React.ReactNode;
}

export function StandardBorder({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative p-1">
      {/* Decent, flat notched vector border */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="47" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" strokeDasharray="12 4 4 4" />
        <circle cx="50" cy="50" r="47" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 20" />
      </svg>
      {children}
    </div>
  );
}

export function LevelTierBorder({ level, children }: { level: number; children: React.ReactNode }) {
  // Determine tier colors and dasharray designs based on level bands
  let tierColor = '#CD7F32'; // Bronze
  let secondaryColor = '#8C5A2B';
  let dash = '256';

  if (level >= 30) {
    tierColor = '#22D3EE'; // Platinum / Cyan-400
    secondaryColor = '#0891B2';
    dash = '12 6 24 6';
  } else if (level >= 20) {
    tierColor = '#FBBF24'; // Gold / Amber-400
    secondaryColor = '#D97706';
    dash = '20 4 10 4';
  } else if (level >= 10) {
    tierColor = '#9CA3AF'; // Silver / Gray-400
    secondaryColor = '#4B5563';
    dash = '40 6';
  }

  return (
    <div className="relative p-2.5">
      {/* Cel-shaded Level-Tier Ring */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none scale-105" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft thick base rim */}
        <circle cx="60" cy="60" r="54" stroke={secondaryColor} strokeWidth="6" />
        {/* Lighter front rim */}
        <circle cx="60" cy="60" r="54" stroke={tierColor} strokeWidth="4" strokeLinecap="round" strokeDasharray={dash} />
        {/* Notched emblem embellishments at cardnals */}
        <path d="M60 2 L63 8 H57 Z" fill={tierColor} />
        <path d="M60 118 L63 112 H57 Z" fill={tierColor} />
        <path d="M2 60 L8 63 V57 Z" fill={tierColor} />
        <path d="M118 60 L112 63 V57 Z" fill={tierColor} />
      </svg>
      {children}
    </div>
  );
}

export function ArchetypeBorder({ archetype, children }: BorderProps) {
  const isHybrid = archetype.kind === 'hybrid';
  
  return (
    <div className="relative p-2">
      {/* Dynamic vector border using HSL colors resolved from active pursuits */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none scale-105" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="archetype-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={archetype.baseColor} />
            <stop offset="100%" stopColor={isHybrid ? archetype.accentColor : archetype.baseColor} />
          </linearGradient>
          
          <filter id="subtle-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={archetype.baseColor} floodOpacity="0.4" />
          </filter>
        </defs>
        
        {/* Outer glowing trace ring */}
        <circle cx="50" cy="50" r="45" stroke="url(#archetype-grad)" strokeWidth="4" filter="url(#subtle-glow)" />
        {/* Inner high-contrast rim */}
        <circle cx="50" cy="50" r="41" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="30 8" strokeLinecap="round" />
      </svg>
      {children}
    </div>
  );
}

export function AvatarBorder({ borderId, level, archetype, children }: { borderId: string; level: number; archetype: DerivedArchetype; children: React.ReactNode }) {
  switch (borderId) {
    case 'archetype':
      return <ArchetypeBorder level={level} archetype={archetype}>{children}</ArchetypeBorder>;
    case 'level':
      return <LevelTierBorder level={level}>{children}</LevelTierBorder>;
    default:
      return <StandardBorder>{children}</StandardBorder>;
  }
}
