import { motion } from 'framer-motion';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  const isGolden = currentStreak >= 7;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
      {currentStreak > 0 ? (
        <div className="relative mb-3">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute inset-0 rounded-full blur-xl ${
              isGolden ? 'bg-yellow-400' : 'bg-orange-500'
            }`}
            style={{ zIndex: 0 }}
          />
          <div className="text-7xl relative z-10 drop-shadow-xl" style={{ filter: isGolden ? 'hue-rotate(20deg) brightness(1.2)' : 'none' }}>
            🔥
          </div>
        </div>
      ) : (
        <div className="text-7xl mb-3 opacity-20 grayscale">🔥</div>
      )}
      
      <div className="text-center z-10 relative">
        <div className="font-extrabold text-3xl text-gray-900 tracking-tight">
          {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
        </div>
        <div className="text-sm text-gray-500 font-bold mt-1 tracking-wide uppercase">
          Longest: {longestStreak}
        </div>
      </div>
    </div>
  );
}
