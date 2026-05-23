import { getProgressInLevel, getXPForLevel, getXPForNextLevel } from '../../lib/xp';

interface XPBarProps {
  xp: number;
  level: number;
  showDetails?: boolean;
}

export function XPBar({ xp, level, showDetails = false }: XPBarProps) {
  const progress = getProgressInLevel(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForNextLevel(level);

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      {showDetails && (
        <div className="flex justify-between text-xs text-gray-500 font-medium">
          <span>{currentLevelXP} XP</span>
          <span>{nextLevelXP} XP</span>
        </div>
      )}
    </div>
  );
}
