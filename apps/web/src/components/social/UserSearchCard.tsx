import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckIcon, UserPlusIcon } from '../icons'
import { ProfilePopup } from './ProfilePopup'
import { useSendFriendRequest } from '../../hooks/useFriends'
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
        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-700/50 hover:bg-[var(--sq-card-hover)] transition-colors relative"
      >
        {/* Paper Grain Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />

        <button onClick={() => setShowProfile(true)} className="shrink-0 text-left active:scale-95 transition-transform cursor-pointer z-10">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.username} 
              className="w-12 h-12 rounded-[var(--sq-r-md)] object-cover border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" 
            />
          ) : (
            <div className="w-12 h-12 rounded-[var(--sq-r-md)] bg-[var(--sq-surface)] border-2 border-[var(--sq-keyline)] text-[var(--sq-ember-300)] flex items-center justify-center font-black text-lg shadow-[var(--sq-shadow-sticker)] uppercase">
              {(user.display_name?.[0] || user.username[0]).toUpperCase()}
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0 z-10">
          <button onClick={() => setShowProfile(true)} className="text-left w-full group cursor-pointer">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-gray-955 dark:text-white truncate group-hover:text-[var(--sq-ember-300)] transition-colors">
                {user.display_name || user.username}
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-sm shrink-0 uppercase tracking-wider">
                Lv {user.level || 1}
              </span>
            </div>
            <p className="text-xs text-gray-450 dark:text-gray-455 truncate mt-0.5">@{user.username}</p>
          </button>
          {user.mutual_friend_count > 0 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-semibold">
              {user.mutual_friend_count} mutual friend{user.mutual_friend_count > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="z-10">
          <AnimatePresence mode="wait">
            {status === 'none' ? (
              <motion.button
                key="add"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleAdd}
                className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--sq-ember-500)] hover:bg-[var(--sq-ember-600)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <UserPlusIcon size={16} withShadow={false} /> Add
              </motion.button>
            ) : status === 'sent' ? (
              <motion.button
                key="sent"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                disabled
                className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--sq-surface)] text-[var(--sq-text-muted)] border border-[var(--sq-hairline-strong)] font-extrabold uppercase tracking-wider text-[11px]"
              >
                Sent
              </motion.button>
            ) : status === 'received' ? (
              <motion.button
                key="received"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                disabled
                className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--sq-surface)] text-[var(--sq-text-muted)] border border-[var(--sq-hairline-strong)] font-extrabold uppercase tracking-wider text-[11px]"
              >
                Pending
              </motion.button>
            ) : (
              <motion.button
                key="friends"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                disabled
                className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1"
              >
                <CheckIcon size={16} withShadow={false} /> Friends
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      {showProfile && <ProfilePopup userId={user.id} onClose={() => setShowProfile(false)} />}
    </>
  )
}

