import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRightIcon } from '../icons'
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
      <button onClick={() => setShowProfile(true)} className="w-full text-left focus:outline-none cursor-pointer">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-700/50 hover:bg-[var(--sq-card-hover)] transition-colors relative"
        >
          {/* Paper Grain Overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />

          <div className="relative shrink-0 z-10">
            {friend.avatar_url ? (
              <img 
                src={friend.avatar_url} 
                alt={friend.username} 
                className="w-11 h-11 rounded-[var(--sq-r-md)] object-cover border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" 
              />
            ) : (
              <div className="w-11 h-11 rounded-[var(--sq-r-md)] bg-[var(--sq-surface)] border-2 border-[var(--sq-keyline)] flex items-center justify-center font-black text-lg text-[var(--sq-ember-300)] uppercase shadow-[var(--sq-shadow-sticker)]">
                {(friend.display_name?.[0] || friend.username[0]).toUpperCase()}
              </div>
            )}
            
            {/* Status dot */}
            <motion.div 
              initial={false}
              animate={{ scale: isOnline ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--sq-keyline)] bg-[var(--sq-success)] shadow"
            />
          </div>

          <div className="flex-1 min-w-0 z-10">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-gray-955 dark:text-white truncate">
                {friend.display_name || friend.username}
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-sm shrink-0 uppercase tracking-wider">
                Lv {friend.level || 1}
              </span>
            </div>
            <p className="text-xs text-gray-450 dark:text-gray-455 truncate mt-0.5">@{friend.username}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0 z-10">
            <span className="text-xs font-semibold text-gray-450 dark:text-gray-500">
              {friend.quest_count || 0} quests
            </span>
            <ChevronRightIcon size={20} withShadow={false} />
          </div>
        </motion.div>
      </button>
      {showProfile && <ProfilePopup userId={friend.id} onClose={() => setShowProfile(false)} />}
    </>
  )
}

