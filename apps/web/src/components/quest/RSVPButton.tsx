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

    const { error } = await supabase
      .from('quest_invites')
      .upsert({ quest_id: questId, user_id: user.id, status })

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
      <div className="flex-1 py-3.5 rounded-2xl bg-purple-100 text-purple-700 font-bold text-center">
        You're hosting
      </div>
    )
  }

  if (currentStatus === 'accepted') {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white font-bold text-center shadow-lg shadow-green-500/20"
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
        className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold text-center hover:bg-gray-50"
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
          className="flex-1 py-3.5 rounded-2xl bg-yellow-400 text-yellow-900 font-bold text-center shadow-lg shadow-yellow-400/20"
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
                className="fixed inset-0 bg-black/40 z-50"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 pb-safe"
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-bold text-center mb-6">RSVP to Quest</h3>
                <div className="space-y-3">
                  <button onClick={() => handleUpdate('accepted')} className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold text-lg active:scale-95 transition-transform">
                    Accept → Go on this quest!
                  </button>
                  <button onClick={() => handleUpdate('declined')} className="w-full py-4 rounded-2xl bg-red-100 text-red-600 font-bold text-lg active:scale-95 transition-transform">
                    Decline
                  </button>
                  <button onClick={() => setShowOptions(false)} className="w-full py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold text-lg active:scale-95 transition-transform">
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
      className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold text-center shadow-lg hover:bg-primary-hover"
    >
      Join Quest
    </motion.button>
  )
}
