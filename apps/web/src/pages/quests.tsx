import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { QuestBook } from '../components/quest/QuestBook'

export function QuestsPage() {

  // Single high-performance fetch for all quest feed items
  const { data: allQuests = [], isLoading, refetch } = useQuery({
    queryKey: ['quests-book-data'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_quests' as any)
      if (error) throw error
      return data || []
    }
  })

  // Filter quest feeds client-side into chunks mapped to the Quest Book pages
  const upcomingQuests = allQuests.filter((q: any) => q.status === 'planned' && q.my_status !== 'pending')
  const inviteQuests = allQuests.filter((q: any) => q.my_status === 'pending')
  const myQuests = allQuests.filter((q: any) => q.my_status === 'creator' || q.my_status === 'accepted')

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-36 pt-4 relative">
      
      {/* Book header */}
      <header className="max-w-md mx-auto px-6 mb-6 text-center">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center justify-center gap-2">
          📖 Quest Book
        </h1>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
          Open your chronicle of completed memories
        </p>
      </header>

      {/* Main Quest Book Shell */}
      <main className="w-full">
        <QuestBook 
          upcomingQuests={upcomingQuests}
          inviteQuests={inviteQuests}
          myQuests={myQuests}
          isLoading={isLoading}
          onCeremonyComplete={refetch}
        />
      </main>
    </div>
  )
}
