import { Link } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { format } from 'date-fns'

interface QuestCardProps {
  quest: any
}

const CATEGORY_COLORS: Record<string, { border: string, bg: string, text: string }> = {
  Food: { border: 'border-l-[#FF6B6B]', bg: 'bg-[#FF6B6B]/15', text: 'text-[#FF6B6B]' },
  Outdoors: { border: 'border-l-[#58CC02]', bg: 'bg-[#58CC02]/15', text: 'text-[#58CC02]' },
  Nightlife: { border: 'border-l-[#9B59B6]', bg: 'bg-[#9B59B6]/15', text: 'text-[#9B59B6]' },
  Culture: { border: 'border-l-[#3498DB]', bg: 'bg-[#3498DB]/15', text: 'text-[#3498DB]' },
  Fitness: { border: 'border-l-[#E67E22]', bg: 'bg-[#E67E22]/15', text: 'text-[#E67E22]' },
  Gaming: { border: 'border-l-[#E91E63]', bg: 'bg-[#E91E63]/15', text: 'text-[#E91E63]' },
  Default: { border: 'border-l-[#6C63FF]', bg: 'bg-[#6C63FF]/15', text: 'text-[#6C63FF]' }
}

export function QuestCard({ quest }: QuestCardProps) {
  const colors = CATEGORY_COLORS[quest.category] || CATEGORY_COLORS.Default
  const cost = '$'.repeat(quest.cost_tier) || 'Free'
  
  // Status badge display logic
  let statusBadge = null
  if (quest.my_status === 'accepted') statusBadge = <span className="text-green-600 font-bold text-sm">Going ✓</span>
  else if (quest.my_status === 'pending') statusBadge = <span className="text-yellow-600 font-bold text-sm">Invited</span>
  else if (quest.my_status === 'creator') statusBadge = <span className="text-purple-600 font-bold text-sm">Organizing</span>
  else statusBadge = <span className="text-gray-400 font-bold text-sm">Public</span>

  return (
    <Link to="/quest/$id" params={{ id: quest.id }} className="block">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${colors.border} border-l-[4px] hover:shadow-md transition-all duration-300`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1 pr-4 transition-colors">{quest.name}</h3>
          <div className="shrink-0">{statusBadge}</div>
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm transition-colors">
            <MapPin className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-500 shrink-0 transition-colors" />
            <span className="line-clamp-1">{quest.location_name}</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm transition-colors">
            {format(new Date(quest.starts_at), "EEEE, MMM d · h:mm a")}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${colors.bg} ${colors.text} transition-colors`}>
              {quest.category}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
              {quest.vibe}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 transition-colors">
              {cost}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {quest.creator_avatar && (
              <img src={quest.creator_avatar} alt="host" className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 -mr-2 relative z-10 transition-colors" />
            )}
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 transition-colors">
              +{quest.attendee_count || 0}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
