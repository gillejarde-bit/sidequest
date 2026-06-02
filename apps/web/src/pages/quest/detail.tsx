import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { MapPin, Calendar, ChevronLeft, Users, Navigation, Star, Heart, Check } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settingsStore'
import { useQuestDetail } from '../../hooks/useQuestDetail'
import { RSVPButton } from '../../components/quest/RSVPButton'
import { CheckInButton } from '../../components/quest/CheckInButton'
import { QuestChat } from '../../components/quest/QuestChat'
import { format, isToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Map, { Marker } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
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
  const { profile } = useAuthStore()
  const { theme } = useSettingsStore()
  const { data, isLoading, refetch } = useQuestDetail(id)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [placeDetails, setPlaceDetails] = useState<any>(null)

  useEffect(() => {
    if (!data?.location?.osm_id) return

    const initPlaces = () => {
      if (window.google?.maps?.places) {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'))
        service.getDetails({
          placeId: data.location.osm_id,
          fields: ['photos', 'rating', 'user_ratings_total']
        }, (place: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            setPlaceDetails(place)
          }
        })
      }
    }

    if (window.google?.maps?.places) {
      initPlaces()
    } else {
      const script = document.createElement('script')
      const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => initPlaces()
      document.head.appendChild(script)
    }
  }, [data?.location?.osm_id])

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  if (!data) return <div className="p-8 text-center">Quest not found</div>

  const { quest, location, creator, attendees, my_status, is_creator, user_attended } = data
  const colors = CATEGORY_COLORS[quest.category] || CATEGORY_COLORS.Default
  const cost = '$'.repeat(quest.cost_tier) || 'Free'
  const isParticipant = my_status === 'accepted' || is_creator
  const showCheckIn = isParticipant && isToday(new Date(quest.starts_at))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-[100px] transition-colors duration-300">
      {/* 1. HERO IMAGE (Google Places Photo or Mapbox Fallback) */}
      <div className="relative h-[200px] w-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <button onClick={() => window.history.back()} className="absolute top-safe-4 left-4 z-10 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white pr-1" />
        </button>
        
        {placeDetails?.photos?.[0] ? (
          <img 
            src={placeDetails.photos[0].getUrl({ maxWidth: 800, maxHeight: 400 })}
            alt={data?.location?.name}
            className="w-full h-full object-cover"
          />
        ) : location ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
            <span className="text-white/50 font-bold text-lg tracking-widest uppercase">Secret Location</span>
          </div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-gray-900 via-gray-50/20 dark:via-gray-900/20 to-transparent transition-colors duration-300" />
      </div>

      {/* 2. QUEST INFO */}
      <div className="px-6 -mt-6 relative z-10 space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight mb-3">{quest.name}</h1>
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
            {placeDetails?.rating && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                {placeDetails.rating} ({placeDetails.user_ratings_total})
              </span>
            )}
          </div>

          <div className="space-y-4 bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:opacity-70 active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{location.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">Tap for directions</p>
              </div>
            </a>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{format(new Date(quest.starts_at), "EEEE, MMMM d")}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(quest.starts_at), "h:mm a")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{data.attendee_count} attending</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {quest.max_party_size ? `Max party size: ${quest.max_party_size}` : 'Unlimited party size'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {quest.description && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{quest.description}</p>
          </div>
        )}

        {/* 3. CREATOR */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-2">Organized by</h3>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
            <Link to="/profile/$id" params={{ id: creator.id }} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <img src={creator.avatar_url || ''} alt="" className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{creator.display_name || creator.username}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Level {creator.level || 1} Host</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 4. ATTENDEES */}
        <div className="space-y-3">
          <div className="flex justify-between items-end ml-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">The Party</h3>
            <span className="text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{data.attendee_count} going</span>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
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
                    <div className="relative w-14 h-14 mx-auto mb-1">
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        {att.avatar_url ? (
                          <img src={att.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 dark:text-gray-500">
                            {att.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* RSVP going / check-in attendance indicator badges */}
                      <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border border-white dark:border-gray-800 flex items-center justify-center shadow-sm ${
                        att.has_attended 
                          ? 'bg-amber-500 text-white border-yellow-300 animate-pulse' 
                          : 'bg-green-500 text-white'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate flex items-center justify-center gap-0.5 mt-1">
                      {att.display_name || att.username}
                      {att.has_attended && <span className="text-amber-500 font-extrabold shrink-0">★</span>}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
            {is_creator && data.invited && data.invited.length > data.attendee_count && (
              <div className="mt-3 text-xs text-center text-gray-400 dark:text-gray-500 font-medium border-t border-gray-100 dark:border-gray-700 pt-3">
                + {data.invited.length - data.attendee_count} pending invites
              </div>
            )}
          </div>
        </div>

        {/* 5. MINI MAP */}
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="w-full h-[180px] pointer-events-none">
              <Map
                initialViewState={{
                  longitude: location.lng,
                  latitude: location.lat,
                  zoom: 15
                }}
                mapStyle={theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'}
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                interactive={false}
                onLoad={(e) => {
                  const map = e.target;
                  try {
                    map.setLayoutProperty('poi-label', 'visibility', 'none');
                    map.setLayoutProperty('transit-label', 'visibility', 'none');
                  } catch (err) {}
                }}
              >
                <Marker longitude={location.lng} latitude={location.lat}>
                  <div className="w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg" />
                </Marker>
              </Map>
            </div>
            <a 
              href={`https://maps.google.com/?q=${location.lat},${location.lng}`} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-white dark:bg-gray-800 text-primary font-bold hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700 transition-colors"
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
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden transition-colors">
              <AnimatePresence mode="wait">
                {!showDeleteConfirm ? (
                  <motion.button
                    key="btn"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
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
                    <p className="text-sm text-red-600 dark:text-red-400 font-bold text-center">
                      Are you absolutely sure? This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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

      {/* STREAK RECOVERY ALERT BANNER (Floating above bottom bar if streak broken) */}
      <AnimatePresence>
        {profile && (profile as any).current_streak === 0 && (profile as any).previous_streak > 0 && (profile as any).lives > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-[88px] left-4 right-4 z-40 bg-gradient-to-r from-red-500/95 to-orange-500/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border border-red-400/30 max-w-md mx-auto"
          >
            <div className="flex items-center gap-2.5">
              <Heart className="w-5 h-5 fill-current animate-pulse text-red-100 shrink-0" />
              <div className="text-left">
                <p className="text-[11px] font-black tracking-wider uppercase leading-none text-red-100">Streak Broken! 💔</p>
                <p className="text-[10px] opacity-90 mt-0.5 leading-tight">Revive your {(profile as any).previous_streak}-day flame with 1 Life.</p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  const { data, error } = await supabase.rpc('restore_streak_with_life' as any)
                  if (error) throw error
                  if (data && (data as any).success) {
                    await useAuthStore.getState().fetchProfile(profile.id)
                  }
                } catch (e: any) {
                  console.error(e)
                }
              }}
              className="px-3.5 py-1.5 bg-white text-red-600 text-[10px] font-black rounded-xl hover:bg-red-50 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
            >
              RESTORE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 flex gap-3 transition-colors">
        {showCheckIn && (
          <CheckInButton 
            questId={quest.id}
            initialCheckedIn={user_attended}
            category={quest.category}
            vibe={quest.vibe}
            creatorId={creator.id}
            isFellowshipEligible={
              quest.privacy === 'group' || 
              quest.is_group_quest || 
              quest.max_party_size >= 3 || 
              (attendees && attendees.length >= 3)
            }
            locationName={location?.name}
            questName={quest?.name}
            onSuccess={() => {
              refetch()
            }} 
          />
        )}
        <RSVPButton questId={quest.id} currentStatus={my_status} isCreator={is_creator} />
      </div>
    </div>
  )
}
