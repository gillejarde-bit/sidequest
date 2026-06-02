import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Star } from 'lucide-react';
import { usePursuitsStore } from '../../features/pursuits/pursuits.store';
import { pursuits, PursuitKey, ARCHETYPE_DOMINANCE_RATIO } from '../../features/pursuits/pursuits.config';

interface ExperienceBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
}

// Consistent spring configuration for cohesive animation rhythm
const springConfig = { type: 'spring', stiffness: 300, damping: 30 } as const;

export function ExperienceBreakdown({ isOpen, onClose }: ExperienceBreakdownProps) {
  const { pursuitXP, getTotalXP, getLevel, getXPProgress, getArchetype } = usePursuitsStore();

  const totalXP = getTotalXP();
  const level = getLevel();
  const { xpIntoCurrentLevel, xpForNextLevelTotal, progressPercent } = getXPProgress();
  const archetype = getArchetype();

  // 1. Build sorted array of pursuits by XP descending
  const sortedPursuits = Object.entries(pursuits).map(([key, def]) => {
    const xp = pursuitXP[key as PursuitKey] ?? 0;
    return {
      ...def,
      xp
    };
  }).sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    // Stable tie-break by key order
    return a.key.localeCompare(b.key);
  });

  // Calculate reason text for active archetype
  const getArchetypeReason = () => {
    if (archetype.kind === 'default') {
      return 'You are at the start of your journey! Earn XP in any pursuit to unlock custom classes.';
    }
    
    // Sort pursuits by XP again to get the top 2
    const sorted = Object.entries(pursuitXP)
      .map(([key, xp]) => ({ key: key as PursuitKey, xp: xp ?? 0 }))
      .sort((a, b) => b.xp - a.xp);

    const p1 = sorted[0];
    const p2 = sorted[1];

    if (archetype.kind === 'pure') {
      const leadingNoun = pursuits[p1.key].noun;
      if (!p2 || p2.xp === 0) {
        return `${leadingNoun} — Sole active class with experience points.`;
      }
      const ratioVal = (p1.xp / p2.xp).toFixed(2);
      return `${leadingNoun} — ${pursuits[p1.key].noun} experience dominates ${pursuits[p2.key].noun} by ${ratioVal}x (threshold is ${ARCHETYPE_DOMINANCE_RATIO}x).`;
    } else {
      const ratioVal = (p1.xp / p2.xp).toFixed(2);
      return `${archetype.name} — Hybrid of ${pursuits[p1.key].noun} (Primary) and ${pursuits[p2.key].noun} (Secondary). Domination ratio is ${ratioVal}x (hybrid resolves under ${ARCHETYPE_DOMINANCE_RATIO}x).`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Blur Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            className="relative w-full max-w-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-white/20 dark:border-gray-800/50 p-6 z-10 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div 
                  className="p-2 rounded-xl bg-purple-500/10 text-purple-500"
                  style={{ color: archetype.baseColor, backgroundColor: `${archetype.baseColor}15` }}
                >
                  <Award size={24} />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Experience Breakdown</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin">
              {/* Level & XP card */}
              <div 
                className="p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all"
                style={{ 
                  borderColor: `${archetype.baseColor}20`,
                  background: `linear-gradient(135deg, ${archetype.baseColor}08, ${archetype.accentColor}08)`
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-400">Current Archetype</span>
                    <h4 
                      className="text-2xl font-black mt-0.5 tracking-tight bg-clip-text text-transparent"
                      style={{ backgroundImage: `linear-gradient(to right, ${archetype.baseColor}, ${archetype.accentColor})` }}
                    >
                      {archetype.name}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-400">Total Level</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Star size={20} className="text-yellow-500 fill-yellow-500" />
                      Lv {level}
                    </span>
                  </div>
                </div>

                {/* Formula Breakdown explanation */}
                <div className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 dark:border-gray-800/80 pt-3">
                  <strong>Status:</strong> {getArchetypeReason()}
                </div>

                {/* Level Up progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-gray-500">
                    <span>{xpIntoCurrentLevel} XP in Level</span>
                    <span>Goal: {xpForNextLevelTotal} XP</span>
                  </div>
                  <div className="h-3 bg-gray-200/60 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ ...springConfig, delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ 
                        background: `linear-gradient(to right, ${archetype.baseColor}, ${archetype.accentColor})`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Total XP: {totalXP}</span>
                    <span>{progressPercent.toFixed(0)}% Complete</span>
                  </div>
                </div>
              </div>

              {/* Pursuits Breakdown */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white px-1">Active Pursuits</h4>
                <div className="space-y-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
                  {sortedPursuits.map((p, idx) => {
                    const progress = totalXP > 0 ? (p.xp / totalXP) * 100 : 0;
                    
                    return (
                      <div key={p.key} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="font-bold text-gray-900 dark:text-white">{p.noun}</span>
                            <span className="text-xs text-gray-400 capitalize">({p.key})</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {p.xp} <span className="text-xs text-gray-400 font-normal">XP</span>
                          </div>
                        </div>

                        {/* Pursuit progress bar */}
                        <div className="h-2 bg-gray-200/50 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${p.xp > 0 ? Math.max(5, progress) : 0}%` }}
                            transition={{ ...springConfig, delay: 0.1 + idx * 0.05 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
