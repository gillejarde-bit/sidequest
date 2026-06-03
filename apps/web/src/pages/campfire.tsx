import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Calendar, MapPin, Flame } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../stores/settingsStore'
import { 
  FeedEvent, 
  BannerRibbon, 
  FeedCard, 
  AICampfireDigest, 
  EmptyCampfire
} from '../components/campfire/CampfireComponents'
import { format } from 'date-fns'

export function CampfirePage() {
  const { user } = useAuthStore()
  const [feed, setFeed] = useState<FeedEvent[]>([])
  const [nextQuest, setNextQuest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiDigestText, setAiDigestText] = useState<string>('')

  const fetchFeedData = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch ranked feed from SQL RPC function using typecasting to any
      const { data, error } = await (supabase.rpc as any)('get_feed', {
        viewer_id: user.id,
        p_limit: 20
      })

      if (error) throw error

      if (data && (data as any[]).length > 0) {
        setFeed(data as FeedEvent[])
      } else {
        // Cold-start fill: Fetch own events if friends feed is empty using typecasting to any
        const { data: ownEvents } = await (supabase.from as any)('feed_events')
          .select('*, profiles:actor_id(username, display_name, avatar_url, level)')
          .eq('actor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (ownEvents && ownEvents.length > 0) {
          const formatted = (ownEvents as any[]).map(e => ({
            id: e.id,
            actor_id: e.actor_id,
            actor_username: e.profiles?.username || 'Wanderer',
            actor_display_name: e.profiles?.display_name || 'Wanderer',
            actor_avatar_url: e.profiles?.avatar_url,
            actor_level: e.profiles?.level || 1,
            type: e.type,
            payload: e.payload,
            created_at: e.created_at,
            score: 1.0,
            reactions: []
          }))
          setFeed(formatted)
        } else {
          // Empty state
          setFeed([])
        }
      }

      // 2. Fetch the next accepted upcoming quest using typecasting to any
      const { data: invites } = await (supabase.from as any)('quest_invites')
        .select(`
          status,
          quest:quest_id (
            id,
            name,
            starts_at,
            category,
            location:location_id (
              name,
              address
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: true })
        .limit(1)

      const upcoming = (invites as any[])?.map(i => i.quest).filter(Boolean)[0]
      if (upcoming) {
        setNextQuest(upcoming)
      } else {
        setNextQuest(null)
      }

    } catch (e) {
      console.error('Error loading campfire feed:', e)
    } finally {
      setLoading(false)
    }
  }

  // Generate a friendly AI Mascot Digest summary (persisted/cached in localStorage for 24h)
  useEffect(() => {
    if (!user) return
    const cacheKey = `campfire_digest_${user.id}_${new Date().toDateString()}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setAiDigestText(cached)
    } else {
      const messages = [
        "Quiet around the fire tonight! Let's get out there—invite a friend to quest in Summerlin, or assemble a Crew to keep the streaks alive.",
        "Your adventure log is looking warm! You have done multiple check-ins recently. Start a new Quest today to claim another stamp for your history book.",
        "Welcome back to the fire! The Henderson area has multiple active locations waiting to be explored. Let's nominate a Hidden Gem to earn Discovery XP!",
        "The hearth is glowing. Add some friends from the side drawer to watch their level progress and follow their trails on your calendar."
      ]
      const chosen = messages[Math.floor(Math.random() * messages.length)]
      localStorage.setItem(cacheKey, chosen)
      setAiDigestText(chosen)
    }
  }, [user])

  // Temporarily disable ember theme so campfire page uses standard light/dark modes
  useEffect(() => {
    const root = document.documentElement
    const currentTheme = useSettingsStore.getState().theme
    
    if (currentTheme === 'ember') {
      root.removeAttribute('data-theme')
    }
    
    return () => {
      const exitTheme = useSettingsStore.getState().theme
      if (exitTheme === 'ember') {
        root.setAttribute('data-theme', 'ember')
      }
    }
  }, [])


  useEffect(() => {
    fetchFeedData()

    // 3. Real-time subscription to feed_events table
    const channel = supabase
      .channel('campfire-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_events' },
        async (payload) => {
          const newEvent = payload.new as any
          
          // Fetch creator profile details to render card cleanly
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url, level')
            .eq('id', newEvent.actor_id)
            .single()

          if (profile) {
            const formatted: FeedEvent = {
              id: newEvent.id,
              actor_id: newEvent.actor_id,
              actor_username: profile.username,
              actor_display_name: profile.display_name || profile.username,
              actor_avatar_url: profile.avatar_url || undefined,
              actor_level: profile.level || 1,
              type: newEvent.type,
              payload: newEvent.payload,
              created_at: newEvent.created_at,
              score: 1.0,
              reactions: []
            }

            // Animate new events to the top of the feed list
            setFeed(prev => [formatted, ...prev])

            // If it is a Foil Crown, trigger the banner flash effect
            if (newEvent.type === 'foil_crown') {
              const header = document.querySelector('.campfire-banner-header')
              if (header) {
                header.classList.add('ember-sweep-effect')
                setTimeout(() => {
                  header.classList.remove('ember-sweep-effect')
                }, 1500)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return (
    <div 
      className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-[100px] w-full"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 relative">
        {/* Banner header */}
        <div className="campfire-banner-header max-w-[600px] mx-auto">
          <BannerRibbon title="The Campfire" />
        </div>

        {/* Outer Responsive Columns Wrapper */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-4">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-2 space-y-5 max-w-[600px] mx-auto w-full">
            {loading ? (
              <div className="p-12 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#EE6C1F] border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* AI Campfire Digest */}
                {aiDigestText && <AICampfireDigest text={aiDigestText} />}

                {/* Feed Event Cards */}
                <AnimatePresence initial={false}>
                  {feed.length > 0 ? (
                    feed.map(event => (
                      <FeedCard key={event.id} event={event} />
                    ))
                  ) : (
                    <EmptyCampfire onActionClick={fetchFeedData} />
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right Rail Sidebar (Visible on large viewports >= 1024px) */}
          <div className="hidden lg:flex flex-col gap-6 w-[300px] shrink-0 sticky top-6">
            
            {/* 1. Next Quest card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/80 rounded-xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />
              
              <h3 className="text-xs font-black uppercase text-[#F0B45C] tracking-widest font-display flex items-center gap-1.5 mb-3">
                <Calendar className="w-4 h-4" />
                Next Quest
              </h3>

              {nextQuest ? (
                <div className="space-y-3 relative z-10 text-left">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">{nextQuest.name}</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                      {format(new Date(nextQuest.starts_at), "EEEE, MMM d @ h:mm a")}
                    </p>
                  </div>
                  
                  {nextQuest.location && (
                    <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800/30">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">
                          {nextQuest.location.name}
                        </p>
                        <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {nextQuest.location.address}
                        </p>
                      </div>
                    </div>
                  )}

                  <Link
                    to="/quest/$id"
                    params={{ id: nextQuest.id }}
                    className="w-full py-2 bg-primary hover:bg-primary-hover text-white text-[11px] font-black rounded-lg active:scale-95 transition-all shadow-md block text-center uppercase tracking-wider font-display border border-transparent"
                  >
                    View Quest Details
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4 relative z-10">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">No upcoming quests scheduled.</p>
                  <Link
                    to="/quest/create"
                    className="inline-block mt-3 text-xs font-black text-primary hover:underline"
                  >
                    + Create a Quest
                  </Link>
                </div>
              )}
            </div>

            {/* 2. Crew Vibe placeholder slot */}
            <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/80 rounded-xl p-5 shadow-xl relative overflow-hidden text-left">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />
              
              <h3 className="text-xs font-black uppercase text-[#F0B45C] tracking-widest font-display flex items-center gap-1.5 mb-2">
                <Flame className="w-4 h-4" />
                Crew Vibe
              </h3>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-bold">
                Quiet flames surround the hearth. Join or form a quest crew to shift the atmosphere and unlock collective group perks!
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
