import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { MapPin, Calendar, ChevronLeft, Users, Navigation } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { useQuestDetail } from '../../hooks/useQuestDetail'
import { RSVPButton } from '../../components/quest/RSVPButton'
import { CheckInButton } from '../../components/quest/CheckInButton'
import { QuestChat } from '../../components/quest/QuestChat'
import { format, isToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from '../../lib/supabase'

const CATEGORY_COLORS: Record<string, { bg: string, text: string }> = {
  Food: { bg: 'bg-[#FF6B6B]/15', text: 'text-[#FF6B6B]' },
  Outdoors: { bg: 'bg-[#58CC02]/15', text: 'text-[#58CC02]' },
  Nightlife: { bg: 'bg-[#9B59B6]/15', text: 'text-[#9B59B6]' },
  Culture: { bg: 'bg-[#3498DB]/15', text: 'text-[#3498DB]' },
  Fitness: { bg: 'bg-[#E67E22]/15', text: 'text-[#E67E22]' },
  Gaming: { bg: 'bg-[#E91E63]/15', text: 'text-[#E91E63]' },
  Default: { bg: 'bg-[#6C63FF]/15', text: 'text-[#6C63FF]' }
}

export function QuestDetail() {
  const { id } = useParams({ from: '/quest/$id' })
  const { } = useAuthStore()
  const { data, isLoading } = useQuestDetail(id)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!data?.location) return

    // Mini Map initialization
    const map = new maplibregl.Map({
      container: 'quest-mini-map',
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      center: [data.location.lng, data.location.lat],
      zoom: 15,
      interactive: false
    })

    const el = document.createElement('div')
    el.className = 'w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg'
    
    new maplibregl.Marker(el)
      .setLngLat([data.location.lng, data.location.lat])
      .addTo(map)

    return () => map.remove()
  }, [data?.location])

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  if (!data) return <div className="p-8 text-center">Quest not found</div>

  const { quest, location, creator, attendees, my_status, is_creator, user_attended } = data
  const colors = CATEGORY_COLORS[quest.category] || CATEGORY_COLORS.Default
  const cost = '$'.repeat(quest.cost_tier) || 'Free'
  const isParticipant = my_status === 'accepted' || is_creator
  const showCheckIn = isParticipant && !user_attended && isToday(new Date(quest.starts_at))

  return (
    <div className="min-h-screen bg-gray-50 pb-[100px]">
      {/* 1. HERO MAP (Static Image from Mapbox API for performance) */}
      <div className="relative h-[200px] w-full bg-gray-200 overflow-hidden">
        <button onClick={() => window.history.back()} className="absolute top-safe-4 left-4 z-10 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg active:scale-95">
          <ChevronLeft className="w-6 h-6 text-gray-900 pr-1" />
        </button>
        
        {location && (
          <img 
            src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+58CC02(${location.lng},${location.lat})/${location.lng},${location.lat},15,0/800x400?access_token=${import.meta.env.VITE_MAPBOX_KEY}`}
            alt="Map"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/20 to-transparent" />
      </div>

      {/* 2. QUEST INFO */}
      <div className="px-6 -mt-6 relative z-10 space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-3">{quest.name}</h1>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${colors.bg} ${colors.text}`}>
              {quest.category}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
              {quest.vibe}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
              {cost}
            </span>
          </div>

          <div className="space-y-4 bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:opacity-70 active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{location.name}</p>
                <p className="text-sm text-gray-500 line-clamp-1">Tap for directions</p>
              </div>
            </a>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{format(new Date(quest.starts_at), "EEEE, MMMM d")}</p>
                <p className="text-sm text-gray-500">{format(new Date(quest.starts_at), "h:mm a")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{data.attendee_count} attending</p>
                  <p className="text-sm text-gray-500">
                    {quest.max_party_size ? `Max party size: ${quest.max_party_size}` : 'Unlimited party size'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {quest.description && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{quest.description}</p>
          </div>
        )}

        {/* 3. CREATOR */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-2">Organized by</h3>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <Link to="/profile/$id" params={{ id: creator.id }} className="block p-4 active:bg-gray-50">
              <div className="flex items-center gap-3">
                <img src={creator.avatar_url || ''} alt="" className="w-12 h-12 rounded-full object-cover bg-gray-100" />
                <div>
                  <h4 className="font-bold text-gray-900">{creator.display_name || creator.username}</h4>
                  <p className="text-sm text-gray-500">Level {creator.level || 1} Host</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 4. ATTENDEES */}
        <div className="space-y-3">
          <div className="flex justify-between items-end ml-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">The Party</h3>
            <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{data.attendee_count} going</span>
          </div>
          
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex overflow-x-auto gap-4 pb-2 snap-x hide-scrollbar">
              {attendees && attendees.map((att: any, i: number) => (
                <motion.div 
                  key={att.user_id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="snap-start shrink-0 text-center w-16"
                >
                  <Link to="/profile/$id" params={{ id: att.user_id }}>
                    <div className="w-14 h-14 mx-auto bg-gray-100 rounded-full mb-1 overflow-hidden">
                      {att.avatar_url ? (
                        <img src={att.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                          {att.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-gray-600 truncate">{att.display_name || att.username}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
            {is_creator && data.invited && data.invited.length > data.attendee_count && (
              <div className="mt-3 text-xs text-center text-gray-400 font-medium border-t border-gray-100 pt-3">
                + {data.invited.length - data.attendee_count} pending invites
              </div>
            )}
          </div>
        </div>

        {/* 5. MINI MAP */}
        <div className="space-y-3">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div id="quest-mini-map" className="w-full h-[180px]" />
            <a 
              href={`https://maps.google.com/?q=${location.lat},${location.lng}`} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-white text-primary font-bold active:bg-gray-50 border-t border-gray-100"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </a>
          </div>
        </div>

        {/* 6. QUEST CHAT */}
        <div className="space-y-3 pb-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-2">Party Chat</h3>
          <QuestChat questId={quest.id} isParticipant={isParticipant} previewOnly={false} />
        </div>

        {/* 7. DANGER ZONE */}
        {is_creator && (
          <div className="space-y-3 pb-8">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider ml-2">Danger Zone</h3>
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-red-100 overflow-hidden">
              <AnimatePresence mode="wait">
                {!showDeleteConfirm ? (
                  <motion.button
                    key="btn"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
                  >
                    Delete Quest
                  </motion.button>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-red-600 font-bold text-center">
                      Are you absolutely sure? This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const { error } = await supabase.from('quests').delete().eq('id', quest.id);
                          if (!error) window.location.href = '/quests';
                          else alert('Error deleting quest: ' + error.message);
                        }}
                        className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-md hover:bg-red-600 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 flex gap-3">
        {showCheckIn && (
          <CheckInButton 
            questId={quest.id} 
            onSuccess={() => {
              // The component handles confetti internally, we just invalidate
            }} 
          />
        )}
        <RSVPButton questId={quest.id} currentStatus={my_status} isCreator={is_creator} />
      </div>
    </div>
  )
}
