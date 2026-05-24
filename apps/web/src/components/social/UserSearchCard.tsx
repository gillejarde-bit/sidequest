import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, UserPlus } from 'lucide-react'
import { useSendFriendRequest } from '../../hooks/useFriends'
import { ProfilePopup } from './ProfilePopup'
import { supabase } from '../../lib/supabase'

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
  const [status, setStatus] = useState<'none' | 'sent' | 'friends' | 'received'>('none')
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    async function checkStatus() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data } = await supabase
        .from('friendships')
        .select('status, user_id, friend_id')
        .or(`and(user_id.eq.${auth.user.id},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${auth.user.id})`)
        .maybeSingle()

      if (data) {
        if (data.status === 'accepted') setStatus('friends')
        else if (data.status === 'pending') {
          if (data.user_id === auth.user.id) setStatus('sent')
          else setStatus('received')
        }
      }
    }
    checkStatus()
  }, [user.id])

  const handleAdd = () => {
    sendRequest(user.id, {
      onSuccess: () => setStatus('sent')
    })
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 transition-colors"
      >
        <button onClick={() => setShowProfile(true)} className="shrink-0 text-left active:scale-95 transition-transform">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center font-bold text-lg transition-colors">
              {user.display_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <button onClick={() => setShowProfile(true)} className="text-left w-full group">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                {user.display_name || user.username}
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 shrink-0 transition-colors">
                Lv {user.level || 1}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate transition-colors">@{user.username}</p>
          </button>
          {user.mutual_friend_count > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 transition-colors">{user.mutual_friend_count} mutual friends</p>
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
            className="shrink-0 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-bold text-sm flex items-center gap-1 transition-colors"
          >
            Sent
          </motion.button>
        ) : status === 'received' ? (
          <motion.button
            key="received"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            disabled
            className="shrink-0 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center gap-1 border border-blue-200 dark:border-blue-800 transition-colors"
          >
            Pending
          </motion.button>
        ) : (
          <motion.button
            key="friends"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            disabled
            className="shrink-0 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-sm flex items-center gap-1 border border-green-200 dark:border-green-800 transition-colors"
          >
            <Check className="w-4 h-4" /> Friends
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
    {showProfile && <ProfilePopup userId={user.id} onClose={() => setShowProfile(false)} />}
    </>
  )
}
