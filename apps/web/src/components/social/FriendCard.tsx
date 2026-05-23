import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Friend } from '../../hooks/useFriends'

interface FriendCardProps {
  friend: Friend
  isOnline: boolean
}

export function FriendCard({ friend, isOnline }: FriendCardProps) {
  return (
    <Link to="/profile/$id" params={{ id: friend.id }}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 bg-white hover:bg-gray-50 border-b border-gray-100 transition-colors"
      >
        <div className="relative shrink-0">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt={friend.username} className="w-11 h-11 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
              {friend.display_name?.[0]?.toUpperCase() || friend.username[0].toUpperCase()}
            </div>
          )}
          <motion.div 
            initial={false}
            animate={{ scale: isOnline ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-[#58CC02]' : 'bg-gray-300'}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 truncate">
              {friend.display_name || friend.username}
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
              Lv {friend.level || 1}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">@{friend.username}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-gray-400">
            {friend.quest_count || 0} quests
          </span>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </div>
      </motion.div>
    </Link>
  )
}
