import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface ProfilePopupProps {
  userId: string
  onClose: () => void
}

export function ProfilePopup({ userId, onClose }: ProfilePopupProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [userId])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        >
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profile ? (
            <div className="relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/30 text-white rounded-full flex items-center justify-center z-10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Header Banner */}
              <div className="h-24 bg-gradient-to-r from-primary to-purple-600 relative">
                <div className="absolute -bottom-10 left-6">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 object-cover bg-white dark:bg-gray-800" />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center text-2xl font-bold">
                      {(profile.display_name?.[0] || profile.username?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div className="pt-12 pb-6 px-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {profile.display_name || profile.username}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">@{profile.username}</p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="flex items-center gap-2 text-primary font-bold mb-1">
                      <Trophy className="w-4 h-4" /> Level {profile.level || 1}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-1 overflow-hidden">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, ((profile.xp || 0) % 100))}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{profile.xp || 0} XP</p>
                  </div>
                  
                  <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="flex items-center gap-2 text-amber-500 font-bold mb-1">
                      <Star className="w-4 h-4" /> Quests
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{profile.quest_count || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              User not found
              <button onClick={onClose} className="block mt-4 text-primary font-bold mx-auto">Close</button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
