import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, X, RotateCcw, ShieldAlert, Award, Star, Palette } from 'lucide-react';
import { usePursuitsStore } from '../../features/pursuits/pursuits.store';
import { pursuits, PursuitKey } from '../../features/pursuits/pursuits.config';
import { ALL_MOCK_BADGES } from './badges';

const springConfig = { type: 'spring', stiffness: 300, damping: 30 } as const;

export function ProfileDevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  
  const { 
    pursuitXP, 
    activeBorderId, 
    unlockedBadgeIds, 
    addXP, 
    resetXP, 
    setBorder, 
    toggleBadge 
  } = usePursuitsStore();

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-24 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-amber-500 text-white font-bold shadow-lg hover:bg-amber-600 transition-colors"
        >
          <Sliders size={20} className={isOpen ? 'rotate-90' : ''} style={{ transition: 'transform 0.3s ease' }} />
          <span>Dev Panel</span>
        </motion.button>
      </div>

      {/* Slide-over Control Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
            {/* Dark background click-away helper */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-auto"
            />

            {/* Panel drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={springConfig}
              className="relative w-full max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 p-6 pointer-events-auto flex flex-col overflow-hidden pt-12"
            >
              {/* Dev Only Warning Tag */}
              <div className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 absolute top-0 left-0 right-0 text-center flex items-center justify-center gap-1">
                <ShieldAlert size={12} />
                <span>Antigravity Dev Portal — Proof of Concept Only</span>
              </div>

              {/* Header */}
              <div className="flex justify-between items-center mb-6 mt-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                  🛠️ Live Demo Harness
                </h3>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Scrollable controls */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-16 scrollbar-thin">
                {/* Global Reset */}
                <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl border border-red-100 dark:border-red-900/30">
                  <div className="text-xs font-bold text-red-700 dark:text-red-400">Reset All State</div>
                  <button 
                    onClick={resetXP}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors active:scale-95"
                  >
                    <RotateCcw size={12} />
                    <span>Reset to 0</span>
                  </button>
                </div>

                {/* Section 1: Avatar Border override */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Palette size={14} />
                    <span>Avatar Border Override</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/40 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                    {['standard', 'level', 'archetype'].map(bId => (
                      <button
                        key={bId}
                        onClick={() => setBorder(bId)}
                        className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                          activeBorderId === bId 
                            ? 'bg-amber-500 text-white shadow-sm' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {bId}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: Badge Toggles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Award size={14} />
                    <span>Badge Locks</span>
                  </h4>
                  <div className="space-y-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                    {ALL_MOCK_BADGES.map(badge => {
                      const isUnlocked = unlockedBadgeIds.includes(badge.id);
                      return (
                        <div key={badge.id} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-700 dark:text-gray-300">{badge.name}</span>
                          <button
                            onClick={() => toggleBadge(badge.id)}
                            className={`px-3 py-1 rounded-lg font-bold transition-all active:scale-95 ${
                              isUnlocked
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300'
                            }`}
                          >
                            {isUnlocked ? 'Unlocked' : 'Locked'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Pursuit XP Injector */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Star size={14} />
                    <span>Pursuit XP Injector</span>
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(pursuits).map(([key, def]) => {
                      const xp = pursuitXP[key as PursuitKey] ?? 0;
                      
                      return (
                        <div key={key} className="bg-gray-50 dark:bg-gray-800/20 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold flex items-center gap-1.5" style={{ color: def.color }}>
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: def.color }} />
                              {def.noun}
                            </span>
                            <span className="font-black text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-700">
                              {xp} <span className="text-[10px] text-gray-400 font-normal">XP</span>
                            </span>
                          </div>
                          
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => addXP(key as PursuitKey, 10)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            >
                              +10 XP
                            </button>
                            <button
                              onClick={() => addXP(key as PursuitKey, 50)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            >
                              +50 XP
                            </button>
                            <button
                              onClick={() => addXP(key as PursuitKey, 100)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            >
                              +100 XP
                            </button>
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
    </>
  );
}
