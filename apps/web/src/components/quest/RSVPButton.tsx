import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'

interface RSVPButtonProps {
  questId: string
  currentStatus?: string | null
  isCreator: boolean
}

function playSuccessChime() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3) // G5
    
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime) // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.35) // C6
    
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    
    osc1.start()
    osc1.stop(ctx.currentTime + 0.6)
    osc2.start()
    osc2.stop(ctx.currentTime + 0.6)
  } catch (err) {
    console.warn(err)
  }
}

export function RSVPButton({ questId, currentStatus, isCreator }: RSVPButtonProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showOptions, setShowOptions] = useState(false)
  const [showSuccessCheck, setShowSuccessCheck] = useState(false)

  const handleUpdate = async (status: 'accepted' | 'declined') => {
    if (!user) return
    setShowOptions(false)

    // Optimistic update
    const previous = queryClient.getQueryData(['quest-detail', questId])
    queryClient.setQueryData(['quest-detail', questId], (old: any) => {
      if (!old) return old
      return { ...old, my_status: status }
    })

    const query = currentStatus
      ? supabase
          .from('quest_invites')
          .update({ status })
          .eq('quest_id', questId)
          .eq('user_id', user.id)
      : supabase
          .from('quest_invites')
          .insert({ quest_id: questId, user_id: user.id, status })

    const { error } = await query

    if (error) {
      // Revert on error
      queryClient.setQueryData(['quest-detail', questId], previous)
      console.error(error)
    } else {
      queryClient.invalidateQueries({ queryKey: ['quest-detail', questId] })
      if (status === 'accepted') {
        setShowSuccessCheck(true)
        playSuccessChime()
        setTimeout(() => {
          setShowSuccessCheck(false)
        }, 1800)
      }
    }
  }

  if (isCreator) {
    return (
      <div className="flex-1 py-3.5 rounded-2xl bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 font-black text-center border border-purple-200/20 text-sm">
        You're hosting
      </div>
    )
  }

  let buttonJSX;
  if (currentStatus === 'accepted') {
    buttonJSX = (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowOptions(true)}
        className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white font-black text-center shadow-lg shadow-green-500/20 text-sm cursor-pointer"
      >
        Going ✓
      </motion.button>
    )
  } else if (currentStatus === 'declined') {
    buttonJSX = (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowOptions(true)}
        className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-black text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm cursor-pointer"
      >
        Declined
      </motion.button>
    )
  } else if (currentStatus === 'pending') {
    buttonJSX = (
      <motion.button
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowOptions(true)}
        className="flex-1 py-3.5 rounded-2xl bg-yellow-400 text-yellow-950 font-black text-center shadow-lg shadow-yellow-400/20 text-sm cursor-pointer"
      >
        Invited — Accept?
      </motion.button>
    )
  } else {
    buttonJSX = (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => handleUpdate('accepted')}
        className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-black text-center shadow-lg hover:bg-primary-hover text-sm cursor-pointer"
      >
        Join Quest
      </motion.button>
    )
  }

  return (
    <>
      {buttonJSX}

      {/* Action Sheet (shared for all states) */}
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 rounded-t-3xl p-6 z-[101] pb-safe transition-colors duration-300 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-black text-center mb-6 text-gray-900 dark:text-white">RSVP to Quest</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => handleUpdate('accepted')} 
                  className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-extrabold text-base active:scale-95 transition-all shadow-lg shadow-green-500/20 cursor-pointer"
                >
                  Accept → Go on this quest!
                </button>
                <button 
                  onClick={() => handleUpdate('declined')} 
                  className="w-full py-4 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 font-extrabold text-base active:scale-95 transition-all cursor-pointer"
                >
                  Decline
                </button>
                <button 
                  onClick={() => setShowOptions(false)} 
                  className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-extrabold text-base active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Giant Green Check RSVP Animation Overlay */}
      <AnimatePresence>
        {showSuccessCheck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.3, rotate: -15, opacity: 0 }}
              animate={{ scale: [0.3, 1.1, 1], rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-150 dark:border-gray-700 shadow-2xl relative"
            >
              {/* Particle Sparks */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1.5, opacity: [0.8, 1, 0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute w-24 h-24 rounded-full border-4 border-green-500/30 pointer-events-none"
              />
              
              {/* Glowing animated green checkmark */}
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/40 relative z-10 border-4 border-green-200 dark:border-green-600">
                <svg 
                  className="w-10 h-10 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth="4"
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: 'easeInOut' }}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              
              <h3 className="text-xl font-black mt-6 text-gray-900 dark:text-white uppercase tracking-wider">
                You're Going! 🎉
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-extrabold tracking-widest mt-1.5 uppercase">
                Meetup Registered
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
