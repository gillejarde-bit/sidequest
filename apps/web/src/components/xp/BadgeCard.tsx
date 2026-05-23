import { getRarityColor } from '../../lib/xp';

interface BadgeProps {
  badge: any;
  earned?: boolean;
  earnedAt?: string;
}

export function BadgeCard({ badge, earned = false, earnedAt }: BadgeProps) {
  const rarityColor = getRarityColor(badge.rarity);
  const isSecret = !earned && (badge.rarity === 'rare' || badge.rarity === 'legendary');

  return (
    <div 
      className={`relative p-5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all duration-300 ${
        earned 
          ? 'bg-white shadow-md hover:shadow-lg' 
          : 'bg-gray-100 grayscale opacity-80'
      }`}
      style={{ borderColor: earned ? rarityColor : '#e5e7eb' }}
    >
      <div className="text-5xl mb-3 drop-shadow-sm">
        {isSecret ? '❓' : badge.emoji}
      </div>
      <h3 className="font-bold text-gray-800 text-sm mb-1">
        {isSecret ? '???' : badge.name}
      </h3>
      {earned && earnedAt && (
        <span className="text-xs text-gray-500 mt-1 font-medium">{earnedAt}</span>
      )}
      {!earned && !isSecret && (
        <span className="text-xs text-gray-400 mt-1 line-clamp-2 px-2">{badge.description}</span>
      )}
      {!earned && (
        <div className="absolute inset-0 bg-black/5 rounded-2xl flex items-center justify-center pointer-events-none">
          <span className="text-3xl opacity-50 text-gray-800 drop-shadow-md">🔒</span>
        </div>
      )}
    </div>
  );
}
