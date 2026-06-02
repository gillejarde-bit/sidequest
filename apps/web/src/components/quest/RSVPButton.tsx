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

export function RSVPButton({ questId, currentStatus, isCreator }: RSVPButtonProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showOptions, setShowOptions] = useState(false)

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
    }
  }

  if (isCreator) {
    return (
      <div className="flex-1 py-3.5 rounded-2xl bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 font-black text-center border border-purple-200/20 text-sm">
        You're hosting
      </div>
    )
  }

  if (currentStatus === 'accepted') {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowOptions(true)}
        className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white font-black text-center shadow-lg shadow-green-500/20 text-sm cursor-pointer"
      >
        Going ✓
      </motion.button>
    )
  }

  if (currentStatus === 'declined') {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowOptions(true)}
        className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-black text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm cursor-pointer"
      >
        Declined
      </motion.button>
    )
  }

  if (currentStatus === 'pending') {
    return (
      <>
        <motion.button
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowOptions(true)}
          className="flex-1 py-3.5 rounded-2xl bg-yellow-400 text-yellow-950 font-black text-center shadow-lg shadow-yellow-400/20 text-sm cursor-pointer"
        >
          Invited — Accept?
        </motion.button>

        {/* Action Sheet */}
        <AnimatePresence>
          {showOptions && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOptions(false)}
                className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[1px]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 rounded-t-3xl p-6 z-50 pb-safe transition-colors duration-300 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
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
      </>
    )
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => handleUpdate('accepted')}
      className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-black text-center shadow-lg hover:bg-primary-hover text-sm cursor-pointer"
    >
      Join Quest
    </motion.button>
  )
}
