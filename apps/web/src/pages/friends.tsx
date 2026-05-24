import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useFriends, usePendingRequests, useRespondToRequest } from '../hooks/useFriends'
import { FriendCard } from '../components/social/FriendCard'
import { UserSearchCard } from '../components/social/UserSearchCard'

type Tab = 'friends' | 'requests' | 'find'

export function FriendsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('friends')

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 pt-safe transition-colors duration-300">
        <h1 className="text-2xl font-black px-6 py-4 text-gray-900 dark:text-white">Social</h1>
        
        <div className="flex px-4 relative">
          <TabButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} label="Friends" />
          <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="Requests" badge />
          <TabButton active={activeTab === 'find'} onClick={() => setActiveTab('find')} label="Find" />
        </div>
      </header>

      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'friends' && <FriendsTab key="friends" onGoFind={() => setActiveTab('find')} />}
          {activeTab === 'requests' && <RequestsTab key="requests" />}
          {activeTab === 'find' && <FindTab key="find" />}
        </AnimatePresence>
      </main>
    </div>
  )
}

function TabButton({ active, onClick, label, badge }: { active: boolean, onClick: () => void, label: string, badge?: boolean }) {
  const { count } = usePendingRequests()
  
  return (
    <button
      onClick={onClick}
      className={`flex-1 pb-4 relative text-sm font-bold transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}
    >
      <div className="flex items-center justify-center gap-1.5">
        {label}
        {badge && count > 0 && (
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {count}
          </span>
        )}
      </div>
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  )
}

function FriendsTab({ onGoFind }: { onGoFind: () => void }) {
  const { data: friends, isLoading } = useFriends()

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  if (!friends || friends.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center mt-12">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👥</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No friends yet</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Adventure is better together. Find your crew and start questing!</p>
        <button onClick={onGoFind} className="bg-primary text-white font-bold py-3 px-8 rounded-full hover:bg-primary-hover active:scale-95 transition-all">
          Find Friends →
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-900 transition-colors duration-300">
      {friends.map((friend, i) => (
        <motion.div key={friend.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          {/* Mock isOnline to false for now, would sync with Realtime presence */}
          <FriendCard friend={friend} isOnline={false} />
        </motion.div>
      ))}
    </motion.div>
  )
}

function RequestsTab() {
  const { requests, isLoading } = usePendingRequests()
  const { mutate: respond } = useRespondToRequest()

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  if (requests.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-gray-500 mt-8">
        No pending requests.
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
      <AnimatePresence>
        {requests.map((req) => (
          <motion.div 
            key={req.friendship_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, overflow: 'hidden' }}
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              {req.avatar_url ? (
                <img src={req.avatar_url} alt={req.username} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center font-bold text-lg">
                  {req.username[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white">{req.display_name || req.username}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{req.username}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => respond({ friendshipId: req.friendship_id, requesterId: req.user_id, action: 'accept' })}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-all"
              >
                Accept
              </button>
              <button 
                onClick={() => respond({ friendshipId: req.friendship_id, requesterId: req.user_id, action: 'decline' })}
                className="flex-1 border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
              >
                Decline
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

function FindTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setSearching(true)
        const { data } = await supabase.rpc('search_users' as any, { search_term: query })
        setResults((data as any[]) || [])
        setSearching(false)
      } else {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 border-0 rounded-2xl py-3 pl-12 pr-4 shadow-sm text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary transition-colors duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        {searching && (
          <div className="absolute right-4 top-3.5 w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <AnimatePresence>
          {results.map((user) => (
            <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UserSearchCard user={user} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {query.length >= 2 && results.length === 0 && !searching && (
          <div className="p-8 text-center text-gray-500">
            No users found matching "{query}"
          </div>
        )}
      </div>
    </motion.div>
  )
}
