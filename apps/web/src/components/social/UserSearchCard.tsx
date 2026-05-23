import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { Check, UserPlus } from 'lucide-react'
import { useSendFriendRequest } from '../../hooks/useFriends'

interface UserSearchCardProps {
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    level: number
    mutual_friend_count: number
  }
}

export function UserSearchCard({ user }: UserSearchCardProps) {
  const { mutate: sendRequest } = useSendFriendRequest()
  const [status, setStatus] = useState<'none' | 'sent' | 'friends'>('none')

  const handleAdd = () => {
    sendRequest(user.id, {
      onSuccess: () => setStatus('sent')
    })
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 bg-white border-b border-gray-100"
    >
      <Link to="/profile/$id" params={{ id: user.id }} className="shrink-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.username} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-lg">
            {user.display_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link to="/profile/$id" params={{ id: user.id }}>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 truncate">
              {user.display_name || user.username}
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
              Lv {user.level || 1}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">@{user.username}</p>
        </Link>
        {user.mutual_friend_count > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">{user.mutual_friend_count} mutual friends</p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {status === 'none' ? (
          <motion.button
            key="add"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={handleAdd}
            className="shrink-0 px-3 py-1.5 rounded-full border-2 border-primary text-primary font-bold text-sm flex items-center gap-1 active:scale-95 transition-transform"
          >
            <UserPlus className="w-4 h-4" /> Add
          </motion.button>
        ) : status === 'sent' ? (
          <motion.button
            key="sent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            disabled
            className="shrink-0 px-3 py-1.5 rounded-full bg-gray-100 text-gray-400 font-bold text-sm flex items-center gap-1"
          >
            Sent
          </motion.button>
        ) : (
          <motion.button
            key="friends"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            disabled
            className="shrink-0 px-3 py-1.5 rounded-full bg-green-50 text-green-600 font-bold text-sm flex items-center gap-1 border border-green-200"
          >
            <Check className="w-4 h-4" /> Friends
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
