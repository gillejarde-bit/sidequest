import React from 'react';
import { motion } from 'framer-motion';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: (props: { locked: boolean }) => React.ReactNode;
  rarity: 'common' | 'rare' | 'legendary';
}

// 1. Gem Hunter Badge - Cyan Diamond SVG
export function GemHunterIcon({ locked }: { locked: boolean }) {
  const color = locked ? '#9CA3AF' : '#06B6D4'; // Cyan-500
  const bg = locked ? '#F3F4F6' : '#ECFEFF';
  const border = locked ? '#D1D5DB' : '#A5F3FC';

  return (
    <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill={bg} stroke={border} strokeWidth="3" />
      {/* Cel-shaded diamond geometry */}
      <path d="M32 12 L48 28 L32 52 L16 28 Z" fill={color} stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 12 L38 28 L32 52 Z" fill="#FFFFFF" fillOpacity="0.3" />
      <circle cx="32" cy="28" r="4" fill="#FFFFFF" fillOpacity="0.7" />
    </svg>
  );
}

// 2. Early Bird Badge - Warm Morning Sun SVG
export function EarlyBirdIcon({ locked }: { locked: boolean }) {
  const color = locked ? '#9CA3AF' : '#F59E0B'; // Amber-500
  const bg = locked ? '#F3F4F6' : '#FEF3C7';
  const border = locked ? '#D1D5DB' : '#FDE68A';

  return (
    <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill={bg} stroke={border} strokeWidth="3" />
      {/* Sun rising over mountain silhouette */}
      <path d="M14 48 C 20 40, 44 40, 50 48" fill="#10B981" fillOpacity={locked ? 0.3 : 1} /> {/* Mountain hill */}
      <circle cx="32" cy="34" r="12" fill={color} stroke="#FFFFFF" strokeWidth="2" />
      {/* Sun Rays */}
      <path d="M32 14 V20 M32 44 V48 M14 34 H20 M44 34 H48" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 3. City Explorer Badge - Compass/Map Landmark SVG
export function CityExplorerIcon({ locked }: { locked: boolean }) {
  const color = locked ? '#9CA3AF' : '#8B5CF6'; // Violet-500
  const bg = locked ? '#F3F4F6' : '#F5F3FF';
  const border = locked ? '#D1D5DB' : '#DDD6FE';

  return (
    <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill={bg} stroke={border} strokeWidth="3" />
      {/* Map pin / Compass badge */}
      <circle cx="32" cy="32" r="16" stroke={color} strokeWidth="3.5" fill="#FFFFFF" />
      {/* Compass Needle */}
      <path d="M32 20 L36 32 L32 44 L28 32 Z" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M32 20 L36 32 L32 32 Z" fill="#EF4444" fillOpacity={locked ? 0.4 : 1} /> {/* North Needle Red */}
      <circle cx="32" cy="32" r="3" fill="#FFFFFF" />
    </svg>
  );
}

// 4. Quest Master Badge - Golden Crown SVG
export function QuestMasterIcon({ locked }: { locked: boolean }) {
  const color = locked ? '#9CA3AF' : '#EF4444'; // Red Accent Jewels
  const bg = locked ? '#F3F4F6' : '#FFF5F5';
  const border = locked ? '#D1D5DB' : '#FEE2E2';

  return (
    <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill={bg} stroke={border} strokeWidth="3" />
      {/* Crown SVG */}
      <path d="M16 46 L12 24 L24 34 L32 16 L40 34 L52 24 L48 46 Z" fill="#F59E0B" fillOpacity={locked ? 0.3 : 1} stroke="#D97706" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Gems on Crown points */}
      <circle cx="12" cy="24" r="2.5" fill={color} />
      <circle cx="32" cy="16" r="2.5" fill={color} />
      <circle cx="52" cy="24" r="2.5" fill={color} />
      {/* Bottom Trim */}
      <rect x="18" y="42" width="28" height="4" rx="2" fill="#D97706" />
    </svg>
  );
}

export const ALL_MOCK_BADGES: BadgeDefinition[] = [
  {
    id: 'gem_hunter',
    name: 'Gem Hunter',
    description: 'Find a hidden gem in the city',
    icon: ({ locked }) => <GemHunterIcon locked={locked} />,
    rarity: 'rare'
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Check in to a quest before 8:00 AM',
    icon: ({ locked }) => <EarlyBirdIcon locked={locked} />,
    rarity: 'common'
  },
  {
    id: 'city_explorer',
    name: 'City Explorer',
    description: 'Attend quests in 3 different neighborhoods',
    icon: ({ locked }) => <CityExplorerIcon locked={locked} />,
    rarity: 'rare'
  },
  {
    id: 'quest_master',
    name: 'Quest Master',
    description: 'Organize or attend 10 custom quests',
    icon: ({ locked }) => <QuestMasterIcon locked={locked} />,
    rarity: 'legendary'
  }
];

interface BadgeGridProps {
  unlockedBadgeIds: string[];
}

export function BadgeGrid({ unlockedBadgeIds }: BadgeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
      {ALL_MOCK_BADGES.map(badge => {
        const isUnlocked = unlockedBadgeIds.includes(badge.id);
        
        return (
          <motion.div
            key={badge.id}
            whileHover={{ y: isUnlocked ? -3 : 0 }}
            className={`flex flex-col items-center justify-center p-5 rounded-[var(--sq-r-lg)] border transition-all ${
              isUnlocked 
                ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm' 
                : 'bg-gray-50/50 dark:bg-gray-900/40 border-dashed border-gray-200 dark:border-gray-800 opacity-60'
            }`}
          >
            <div className="relative mb-2.5">
              {badge.icon({ locked: !isUnlocked })}
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg className="w-6 h-6 text-gray-400 bg-white dark:bg-gray-800 p-0.5 rounded-full shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className={`text-sm font-black text-center ${isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
              {badge.name}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1.5 leading-tight max-w-[130px]">
              {badge.description}
            </div>
            
            {isUnlocked && (
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-2.5 ${
                badge.rarity === 'legendary' 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                  : badge.rarity === 'rare'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400'
              }`}>
                {badge.rarity}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
