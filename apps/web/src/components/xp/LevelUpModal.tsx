import { motion } from 'framer-motion';
import { useXPStore } from '../../stores/xpStore';
import ConfettiExplosion from 'react-confetti-explosion';

export function LevelUpModal() {
  const { levelUpEvent, clearLevelUp } = useXPStore();

  if (!levelUpEvent) return null;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[2000]" onClick={clearLevelUp}>
      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <ConfettiExplosion force={0.8} duration={3000} particleCount={250} />
        
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } }
          }}
          className="text-center flex flex-col items-center"
        >
          <motion.h1 
            variants={{
              hidden: { opacity: 0, y: -20 },
              visible: { opacity: 1, y: 0 }
            }}
            className="text-5xl font-bold text-yellow-400 mb-6 drop-shadow-lg"
          >
            LEVEL UP!
          </motion.h1>
          
          <motion.div 
            variants={{
              hidden: { opacity: 0, scale: 0.5 },
              visible: { opacity: 1, scale: 1 }
            }}
            className="text-8xl font-extrabold text-white mb-8 drop-shadow-xl"
          >
            {levelUpEvent.newLevel}
          </motion.div>

          {levelUpEvent.newTitle && (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full font-bold mb-8 shadow-lg inline-block"
            >
              {levelUpEvent.newTitle}
            </motion.div>
          )}

          {levelUpEvent.newBadges && levelUpEvent.newBadges.length > 0 && (
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 }
              }}
              className="flex justify-center gap-4 mt-4"
            >
              {levelUpEvent.newBadges.map((badge: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", bounce: 0.5, delay: i * 0.1 + 0.5 }}
                  className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-2xl flex flex-col items-center border border-gray-700 shadow-xl"
                >
                  <span className="text-4xl mb-3 drop-shadow-md">{badge.emoji}</span>
                  <span className="text-sm font-bold text-gray-200">{badge.name}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
        
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={clearLevelUp}
          className="mt-12 bg-white text-black px-10 py-4 rounded-full font-bold hover:bg-gray-200 transition shadow-xl"
        >
          Awesome!
        </motion.button>
      </div>
    </div>
  );
}
