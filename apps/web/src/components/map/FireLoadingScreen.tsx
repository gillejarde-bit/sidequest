import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface FireLoadingScreenProps {
  isReady: boolean
  onExitComplete: () => void
}

export const FireLoadingScreen: React.FC<FireLoadingScreenProps> = ({
  isReady,
  onExitComplete,
}) => {
  const [phase, setPhase] = useState<'spark' | 'idle' | 'bloom' | 'done'>('spark')
  const [reducedMotion, setReducedMotion] = useState(false)

  // Detect accessibility preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [])

  // Timing state machine for transitions
  useEffect(() => {
    if (phase === 'spark') {
      const timer = setTimeout(() => {
        setPhase('idle')
      }, 500) // spark ignition duration
      return () => clearTimeout(timer)
    }
  }, [phase])

  useEffect(() => {
    if (isReady && (phase === 'idle' || phase === 'spark')) {
      setPhase('bloom')
      const timer = setTimeout(() => {
        setPhase('done')
        onExitComplete()
      }, 700) // bloom sequence duration
      return () => clearTimeout(timer)
    }
  }, [isReady, phase, onExitComplete])

  if (phase === 'done') return null

  // Pre-generate ember configurations for the animated stream
  const emberCount = reducedMotion ? 0 : 15
  const embers = Array.from({ length: emberCount }).map((_, i) => ({
    id: i,
    size: Math.random() * 4 + 3,
    delay: Math.random() * 2,
    duration: Math.random() * 2 + 1.5,
    xStart: Math.random() * 40 - 20, // random offset from center
  }))

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'bloom' ? 0 : 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="absolute inset-0 w-full h-[100dvh] bg-[#140D09] flex flex-col items-center justify-center overflow-hidden"
      style={{ zIndex: 100 }}
    >
      {/* Background Bloom Glow: expands rapidly when map is ready */}
      {phase === 'bloom' && !reducedMotion && (
        <motion.div
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: 3.5, opacity: 0.85 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="absolute w-64 h-64 rounded-full bg-gradient-to-r from-[#EE6C1F]/45 to-[#F6962B]/10 blur-3xl"
        />
      )}

      <div className="relative flex flex-col items-center justify-center select-none">
        {/* Animated SVG Flame & Spark */}
        {phase === 'spark' ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
            className="w-3 h-3 bg-[#EE6C1F] rounded-full shadow-[0_0_15px_#EE6C1F]"
          />
        ) : (
          <motion.div
            animate={phase === 'bloom' ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeIn' }}
          >
            {/* SVG Campaign campfire design */}
            <svg
              viewBox="0 0 100 120"
              className="w-24 h-28 filter drop-shadow-[0_0_22px_rgba(238,108,31,0.55)]"
            >
              {/* Outer Layer: Ember Flame */}
              <motion.path
                d="M50,12 C72,42 82,75 72,95 C62,110 38,110 28,95 C18,75 28,42 50,12 Z"
                fill="#EE6C1F"
                animate={
                  reducedMotion
                    ? {}
                    : {
                        scaleY: [1.0, 1.12, 0.96, 1.06, 1.0],
                        scaleX: [1.0, 0.92, 1.08, 0.96, 1.0],
                        skewX: [0, 2, -2, 1, 0],
                      }
                }
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ originX: '50px', originY: '95px' }}
              />
              {/* Middle Layer: Golden Flame */}
              <motion.path
                d="M50,32 C64,55 72,75 64,90 C56,101 44,101 36,90 C28,75 36,55 50,32 Z"
                fill="#F6962B"
                animate={
                  reducedMotion
                    ? {}
                    : {
                        scaleY: [1.0, 0.92, 1.12, 1.04, 1.0],
                        scaleX: [1.0, 1.08, 0.92, 0.96, 1.0],
                        skewX: [0, -2, 2, -1, 0],
                      }
                }
                transition={{
                  duration: 1.7,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ originX: '50px', originY: '90px' }}
              />
              {/* Inner Core: Cream Flame */}
              <motion.path
                d="M50,52 C58,68 62,80 58,88 C54,95 46,95 42,88 C38,80 42,68 50,52 Z"
                fill="#F6EAD4"
                animate={
                  reducedMotion
                    ? {}
                    : {
                        scaleY: [1.0, 1.06, 0.94, 1.0],
                        scaleX: [1.0, 0.94, 1.06, 1.0],
                      }
                }
                transition={{
                  duration: 1.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ originX: '50px', originY: '88px' }}
              />
            </svg>
          </motion.div>
        )}

        {/* Embers stream */}
        {phase === 'idle' &&
          !reducedMotion &&
          embers.map((emb) => (
            <motion.div
              key={emb.id}
              className="absolute bottom-20 rounded-full"
              style={{
                width: emb.size,
                height: emb.size,
                backgroundColor: '#EE6C1F',
                boxShadow: '0 0 6px #F6962B',
                left: `calc(50% + ${emb.xStart}px)`,
              }}
              animate={{
                y: [-10, -190],
                x: [0, Math.sin(emb.id) * 25, Math.cos(emb.id) * 18],
                opacity: [0, 0.85, 0],
                scale: [1, 0.4],
              }}
              transition={{
                duration: emb.duration,
                repeat: Infinity,
                delay: emb.delay,
                ease: 'easeOut',
              }}
            />
          ))}

        {/* Campaign caption */}
        <motion.p
          animate={phase === 'bloom' ? { opacity: 0 } : { opacity: 0.85 }}
          transition={{ duration: 0.35 }}
          className="text-[#F6EAD4] font-black text-[11px] uppercase tracking-[0.25em] mt-8 select-none text-center"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Stoking the campfire...
        </motion.p>
      </div>
    </motion.div>
  )
}
