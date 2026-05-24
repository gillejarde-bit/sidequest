import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { Friend } from '../../hooks/useFriends'
import { ProfilePopup } from './ProfilePopup'

interface FriendCardProps {
  friend: Friend
  isOnline: boolean
}

export function FriendCard({ friend, isOnline }: FriendCardProps) {
  const [showProfile, setShowProfile] = useState(false)

  return (
    <>
      <button onClick={() => setShowProfile(true)} className="w-full text-left focus:outline-none">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 transition-colors"
        >
          <div className="relative shrink-0">
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt={friend.username} className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 transition-colors">
                {friend.display_name?.[0]?.toUpperCase() || friend.username[0].toUpperCase()}
              </div>
            )}
            <motion.div 
              initial={false}
              animate={{ scale: isOnline ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${isOnline ? 'bg-[#58CC02]' : 'bg-gray-300 dark:bg-gray-600'} transition-colors`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white truncate transition-colors">
                {friend.display_name || friend.username}
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 shrink-0 transition-colors">
                Lv {friend.level || 1}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate transition-colors">@{friend.username}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 transition-colors">
              {friend.quest_count || 0} quests
            </span>
            <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 transition-colors" />
          </div>
        </motion.div>
      </button>
      {showProfile && <ProfilePopup userId={friend.id} onClose={() => setShowProfile(false)} />}
    </>
  )
}
