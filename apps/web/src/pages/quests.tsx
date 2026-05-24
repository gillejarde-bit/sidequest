import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { QuestCard } from '../components/quest/QuestCard'
import { Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'

type FilterStatus = 'planned' | 'active' | 'completed'
type Tab = 'upcoming' | 'invites' | 'my_quests' | 'past'

export function QuestsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['quests-feed', activeTab],
    queryFn: async () => {
      let filterStatus: FilterStatus | null = null
      if (activeTab === 'upcoming') filterStatus = 'planned'
      if (activeTab === 'past') filterStatus = 'completed'

      // Actually the RPC handles the filter, but we need to fetch all logic
      const { data, error } = await supabase.rpc('get_my_quests' as any, { filter_status: filterStatus })
      if (error) throw error

      if (activeTab === 'my_quests') {
        // Only show quests I created or accepted
        return data.filter((q: any) => q.my_status === 'accepted' || q.my_status === 'creator')
      }

      if (activeTab === 'invites') {
        return data.filter((q: any) => q.my_status === 'pending')
      }

      return data
    }
  })

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-32">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 pt-safe transition-colors duration-300">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Quests</h1>
        </div>
        
        <div className="flex px-4 relative overflow-x-auto hide-scrollbar whitespace-nowrap">
          <TabButton active={activeTab === 'upcoming'} onClick={() => setActiveTab('upcoming')} label="Upcoming" />
          <TabButton active={activeTab === 'invites'} onClick={() => setActiveTab('invites')} label="Invites" />
          <TabButton active={activeTab === 'my_quests'} onClick={() => setActiveTab('my_quests')} label="Mine" />
          <TabButton active={activeTab === 'past'} onClick={() => setActiveTab('past')} label="Past" />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : quests.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-12 p-8">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚔️</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {activeTab === 'past' ? 'No completed quests yet' : activeTab === 'invites' ? 'No pending invites' : 'No quests yet'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {activeTab === 'past' ? 'Get out there and complete some quests!' : activeTab === 'invites' ? "You're all caught up!" : 'Create your first adventure and invite your squad.'}
            </p>
            <Link to="/quest/create" className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-full hover:bg-primary-hover active:scale-95 transition-all">
              <Plus className="w-5 h-5" />
              Create Quest
            </Link>
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.06 }
              }
            }}
          >
            {quests.map((quest: any) => (
              <motion.div 
                key={quest.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
              >
                <QuestCard quest={quest} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 pb-4 relative text-sm font-bold transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}
    >
      {label}
      {active && (
        <motion.div
          layoutId="quest-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  )
}
