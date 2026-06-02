import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stamp, StampKind } from './Stamp'
import { useStampsStore } from '../../features/stamps/stampsStore'
import { Sparkles, Award, Landmark } from 'lucide-react'

interface StampCeremonyProps {
  onComplete: () => void
}

function playStampSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    
    const ctx = new AudioCtx()
    
    // 1. Heavy Wooden Thud / Bass slam
    const oscThud = ctx.createOscillator()
    const gainThud = ctx.createGain()
    oscThud.connect(gainThud)
    gainThud.connect(ctx.destination)
    
    oscThud.type = 'sine'
    oscThud.frequency.setValueAtTime(120, ctx.currentTime)
    oscThud.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.18)
    
    gainThud.gain.setValueAtTime(1.0, ctx.currentTime)
    gainThud.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22)
    
    oscThud.start()
    oscThud.stop(ctx.currentTime + 0.25)

    // 2. High Crystal Sparkle / Chime
    const oscChime = ctx.createOscillator()
    const gainChime = ctx.createGain()
    oscChime.connect(gainChime)
    gainChime.connect(ctx.destination)
    
    oscChime.type = 'triangle'
    oscChime.frequency.setValueAtTime(880, ctx.currentTime)
    oscChime.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.35)
    
    gainChime.gain.setValueAtTime(0.25, ctx.currentTime)
    gainChime.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    
    oscChime.start()
    oscChime.stop(ctx.currentTime + 0.55)
  } catch (err) {
    console.warn('Web Audio synthesis failed:', err)
  }
}

export function StampCeremony({ onComplete }: StampCeremonyProps) {
  const { pendingCeremony, setPendingCeremony, setCurrentPageIndex } = useStampsStore()
  const [phase, setPhase] = useState<'open' | 'descent' | 'impact' | 'settle' | 'tally'>('open')
  const [shake, setShake] = useState(false)
  const [inkBurst, setInkBurst] = useState(false)

  if (!pendingCeremony) return null

  const category = pendingCeremony.category.toLowerCase()
  let stampKind: StampKind = 'food'
  if (category === 'food') stampKind = 'food'
  else if (category === 'outdoors') stampKind = 'outdoors'
  else if (category === 'nightlife') stampKind = 'nightlife'
  else if (category === 'culture') stampKind = 'culture'
  else if (category === 'fitness') stampKind = 'fitness'
  else if (category === 'gaming') stampKind = 'culture'

  if (pendingCeremony.isPioneer) {
    stampKind = 'gem'
  }

  // Handle the multi-phase timeline
  useEffect(() => {
    // Phase 1: Open & turn book (0 - 450ms)
    setCurrentPageIndex(window.innerWidth >= 900 ? 4 : 5) // Set book to History Page 1
    
    // Phase 2: Descent (450ms)
    const descentTimeout = setTimeout(() => {
      setPhase('descent')
    }, 450)

    // Phase 3: Impact (800ms)
    const impactTimeout = setTimeout(() => {
      setPhase('impact')
      setShake(true)
      setInkBurst(true)
      
      // Haptics & Sound thunk
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 80])
      }
      playStampSound()
      
      setTimeout(() => setShake(false), 250)
    }, 850)

    // Phase 4: Settle (1200ms)
    const settleTimeout = setTimeout(() => {
      setPhase('settle')
    }, 1250)

    // Phase 5: Reward Tally (1600ms)
    const tallyTimeout = setTimeout(() => {
      setPhase('tally')
    }, 1650)

    return () => {
      clearTimeout(descentTimeout)
      clearTimeout(impactTimeout)
      clearTimeout(settleTimeout)
      clearTimeout(tallyTimeout)
    }
  }, [pendingCeremony, setCurrentPageIndex])

  const handleDismiss = () => {
    setPendingCeremony(null)
    onComplete()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/85 backdrop-blur-md px-6 select-none"
      >
        <motion.div
          animate={shake ? {
            x: [0, -10, 10, -8, 8, -4, 4, 0],
            y: [0, 8, -8, 6, -6, 3, -3, 0]
          } : {}}
          transition={{ duration: 0.25 }}
          className="w-full max-w-sm flex flex-col items-center relative"
        >
          {/* Embossed Base paper slot shadow behind */}
          <div className="absolute w-28 h-28 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center bg-white/5 opacity-50 z-0">
            <div className="w-16 h-16 rounded-full border border-dashed border-white/20 opacity-30" />
          </div>

          {/* Radial Ink Burst Splatter */}
          <AnimatePresence>
            {inkBurst && (
              <motion.div
                initial={{ scale: 0.1, opacity: 0 }}
                animate={{ scale: 2.2, opacity: [0.6, 0.8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="absolute w-24 h-24 rounded-full bg-primary/20 pointer-events-none mix-blend-screen z-10"
              />
            )}
          </AnimatePresence>

          {/* Giant Falling / Slashing Stamp */}
          <div className="h-48 flex items-center justify-center z-20">
            <AnimatePresence>
              {(phase === 'descent' || phase === 'impact' || phase === 'settle' || phase === 'tally') && (
                <motion.div
                  initial={{ scale: 2.8, rotate: -25, opacity: 0, y: -60 }}
                  animate={phase === 'impact' 
                    ? { scale: 0.95, rotate: -4, opacity: 1, y: 0 } 
                    : phase === 'settle' || phase === 'tally'
                    ? { scale: 1.05, rotate: -6, opacity: 1, y: 0 }
                    : { scale: 1.8, rotate: -15, opacity: 0.8, y: -20 }
                  }
                  transition={{
                    type: 'spring',
                    stiffness: phase === 'impact' ? 450 : 250,
                    damping: phase === 'impact' ? 22 : 15
                  }}
                >
                  <Stamp 
                    kind={stampKind} 
                    isFoil={pendingCeremony.isPioneer} 
                    size={110} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Celebration Card / XP Tally */}
          <div className="h-32 mt-4 flex items-center justify-center w-full z-30">
            <AnimatePresence>
              {phase === 'tally' && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="w-full bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-2xl text-center space-y-3"
                >
                  <div className="flex justify-center items-center gap-1.5 text-primary">
                    <Sparkles className="w-4 h-4 animate-bounce text-amber-500" />
                    <span className="text-[10px] font-black tracking-widest uppercase">QUEST CERTIFIED!</span>
                    <Sparkles className="w-4 h-4 animate-bounce text-amber-500" />
                  </div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white leading-tight">
                    {pendingCeremony.questName}
                  </h3>

                  {/* XP Grant displays */}
                  <div className="flex justify-center items-center gap-2">
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      +{pendingCeremony.xpAwarded} XP
                    </div>
                    {pendingCeremony.isPioneer && (
                      <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
                        <Landmark className="w-3 h-3" />
                        PIONEER!
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleDismiss}
                    className="w-full py-2.5 rounded-2xl bg-primary text-white font-black text-center shadow-lg hover:bg-primary-hover active:scale-95 transition-all text-xs cursor-pointer"
                  >
                    CLOSE CHRONICLE
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
