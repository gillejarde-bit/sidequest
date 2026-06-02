import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Star } from 'lucide-react';
import { usePursuitsStore } from '../../features/pursuits/pursuits.store';
import { pursuits, PursuitKey, LEVEL_CURVE_K } from '../../features/pursuits/pursuits.config';
import { pursuitLore, archetypeLore } from '../../features/pursuits/lore.config';
import { PursuitEmblem } from './Emblems';

interface ExperienceBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const springConfig = { type: 'spring', stiffness: 300, damping: 30 } as const;

export function ExperienceBreakdown({ isOpen, onClose }: ExperienceBreakdownProps) {
  const { pursuitXP, getTotalXP, getLevel, getXPProgress, getArchetype } = usePursuitsStore();
  const [selectedPursuitKey, setSelectedPursuitKey] = useState<PursuitKey | null>(null);
  const [isLoreExpanded, setIsLoreExpanded] = useState(false);

  const totalXP = getTotalXP();
  const level = getLevel();
  const { xpIntoCurrentLevel, xpForNextLevelTotal, progressPercent } = getXPProgress();
  const archetype = getArchetype();

  // 1. Build sorted array of pursuits by XP descending
  const sortedPursuits = Object.entries(pursuits).map(([key, def]) => {
    const xp = pursuitXP[key as PursuitKey] ?? 0;
    return {
      xp,
      ...def,
      key: key as PursuitKey
    };
  }).sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    // Stable tie-break by key order
    return a.key.localeCompare(b.key);
  });

  // Calculate reason text for active archetype (derivation line)
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
        return `A pure ${leadingNoun} focused entirely on your passion for this pursuit.`;
      }
      return `A pure ${leadingNoun} driven primarily by your dedication to ${leadingNoun}.`;
    } else {
      const ratioVal = (p1.xp / p2.xp).toFixed(2);
      return `Hybrid of ${pursuits[p1.key].noun} (Primary) and ${pursuits[p2.key].noun} (Secondary). Domination ratio is ${ratioVal}x (hybrid resolves under 1.4x).`;
    }
  };

  // Resolve archetype lore
  const getArchetypeLoreItem = () => {
    if (archetype.kind === 'default') {
      return archetypeLore['wanderer'];
    } else if (archetype.kind === 'pure') {
      return archetype.primary ? archetypeLore[archetype.primary] : null;
    } else {
      const sortedPair = [archetype.primary, archetype.secondary].sort().join('+');
      return archetypeLore[sortedPair] || null;
    }
  };

  const archetypeLoreItem = getArchetypeLoreItem();

  // Pursuit level calculation
  const getPursuitLevel = (xp: number) => {
    return Math.floor(Math.sqrt(xp / LEVEL_CURVE_K)) + 1;
  };

  const selectedPursuit = selectedPursuitKey ? pursuits[selectedPursuitKey] : null;
  const selectedXP = selectedPursuitKey ? (pursuitXP[selectedPursuitKey] ?? 0) : 0;
  const selectedLevel = selectedPursuitKey ? getPursuitLevel(selectedXP) : 1;
  const selectedLore = selectedPursuitKey ? pursuitLore[selectedPursuitKey] : null;

  return (
    <div className="relative">
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
              className="relative w-full max-w-md h-[85vh] bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden pointer-events-auto"
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

                  {/* Narrative Archetype blurb + expandable details */}
                  <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-800/80 pt-3">
                    <span className="font-extrabold text-gray-700 dark:text-gray-200">Status: </span>
                    {archetypeLoreItem?.short}

                    {archetypeLoreItem && (
                      <div className="mt-2">
                        <AnimatePresence initial={false}>
                          {isLoreExpanded ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-gray-500 dark:text-gray-400 mt-1 pl-2.5 border-l-2 text-[11px] leading-relaxed flex flex-col gap-2"
                              style={{ borderColor: `${archetype.baseColor}40` }}
                            >
                              <p className="leading-relaxed">{archetypeLoreItem.long}</p>
                              <p className="text-[10px] text-gray-400 font-medium italic">({getArchetypeReason()})</p>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                        <button
                          onClick={() => setIsLoreExpanded(!isLoreExpanded)}
                          className="text-[10px] font-black uppercase tracking-wider mt-1.5 hover:underline focus:outline-none cursor-pointer flex items-center gap-0.5"
                          style={{ color: archetype.baseColor }}
                        >
                          {isLoreExpanded ? 'Read Less ▲' : 'Read More ▼'}
                        </button>
                      </div>
                    )}
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
                  <div className="flex justify-between items-center px-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">Active Pursuits</h4>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Tap for details</span>
                  </div>
                  <div className="space-y-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
                    {sortedPursuits.map((p, idx) => {
                      const progress = totalXP > 0 ? (p.xp / totalXP) * 100 : 0;
                      
                      return (
                        <div 
                          key={p.key} 
                          className="space-y-2 cursor-pointer p-2 -m-2 rounded-2xl hover:bg-gray-100/50 dark:hover:bg-gray-800/30 active:scale-[0.99] transition-all"
                          onClick={() => setSelectedPursuitKey(p.key)}
                        >
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full shrink-0" 
                                style={{ backgroundColor: p.color }}
                              />
                              <span className="font-bold text-gray-900 dark:text-white">{p.noun}</span>
                              <span className="text-xs text-gray-450 capitalize font-medium">({p.key})</span>
                            </div>
                            <div className="font-bold text-gray-900 dark:text-white flex items-baseline gap-1">
                              <span>{p.xp}</span>
                              <span className="text-xs text-gray-405 font-normal">XP</span>
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

      {/* Pursuit Detail Panel overlay */}
      <AnimatePresence>
        {selectedPursuitKey && selectedPursuit && selectedLore && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            {/* Inner Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPursuitKey(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Inner Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springConfig}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t border-gray-100 dark:border-gray-850 z-10 flex flex-col items-center text-center gap-4 max-h-[80vh] overflow-y-auto pointer-events-auto"
            >
              <button
                onClick={() => setSelectedPursuitKey(null)}
                className="absolute top-4 right-4 p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95 z-20"
              >
                <X size={18} className="text-gray-500" />
              </button>

              {/* Emblem */}
              <div className="mt-4">
                <PursuitEmblem 
                  emblemKey={selectedLore.emblemKey} 
                  color={selectedPursuit.color} 
                  className="w-24 h-24" 
                />
              </div>

              {/* Title & Noun */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pursuit Profile</span>
                <h4 className="text-2xl font-black tracking-tight mt-0.5" style={{ color: selectedPursuit.color }}>
                  {selectedPursuit.noun}
                </h4>
                <p className="text-xs text-gray-500 font-bold capitalize mt-0.5">
                  ({selectedPursuitKey})
                </p>
              </div>

              {/* Tagline */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-center w-full">
                <p className="text-sm font-extrabold italic text-gray-700 dark:text-gray-200 leading-relaxed">
                  "{selectedLore.tagline}"
                </p>
              </div>

              {/* XP and Level Stats */}
              <div className="flex gap-4 w-full py-1 justify-center">
                <div className="bg-gray-50 dark:bg-gray-800/30 px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 text-center flex-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-450">Current Level</p>
                  <p className="text-lg font-black text-gray-800 dark:text-white mt-0.5">Lv {selectedLevel}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/30 px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 text-center flex-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-450">Pursuit Progress</p>
                  <p className="text-lg font-black text-gray-800 dark:text-white mt-0.5">{selectedXP} XP</p>
                </div>
              </div>

              {/* Body explanation */}
              <div className="text-sm text-gray-650 dark:text-gray-300 leading-relaxed text-left max-w-md border-t border-gray-100 dark:border-gray-800 pt-4 px-1">
                {selectedLore.body}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
