import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { Calendar, MapPin, Tent, MoreHorizontal, ChevronLeft, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import { useFriends } from '../hooks/useFriends'
import { useFriendPresence } from '../hooks/useFriendPresence'
import { useGeolocation } from '../hooks/useGeolocation'
import { 
  FeedEvent, 
  BannerRibbon, 
  FeedCard, 
  AICampfireDigest, 
  EmptyCampfire
} from '../components/campfire/CampfireComponents'
import { format } from 'date-fns'

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

function formatOfflineTime(updatedAt: string | null | undefined): string {
  if (!updatedAt) return 'offline'
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  if (diffMs < 0) return 'offline'
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h offline`
  }
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m ${diffSecs % 60}s offline`
  }
  if (diffMins > 0) {
    return `${diffMins}m ${diffSecs % 60}s offline`
  }
  return `${diffSecs}s offline`
}

export function CampfirePage() {
  const { user, profile } = useAuthStore()
  const [feed, setFeed] = useState<FeedEvent[]>([])
  const [nextQuest, setNextQuest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiDigestText, setAiDigestText] = useState<string>('')

  // Presence and groups sidebar / mobile strip states
  const [sidebarTab, setSidebarTab] = useState<'groups' | 'friends'>('groups')
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [selectedCampfireGroup, setSelectedCampfireGroup] = useState<any | null>(null)
  const [selectedCampfireGroupDetails, setSelectedCampfireGroupDetails] = useState<any | null>(null)

  // Keep a ticking count to force updates to the offline seconds formatting
  const [timeTick, setTimeTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(t => t + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Geolocation and Realtime presence hooks
  const userLoc = useGeolocation()
  const friendsMap = useFriendPresence({
    lat: userLoc.lat,
    lng: userLoc.lng,
    heading: userLoc.heading,
  })

  const { data: friendsList = [] } = useFriends()

  const fetchGroupsAndMembers = async () => {
    if (!user) return
    try {
      const { data: groupData, error: groupError } = await supabase.rpc('get_my_streaks')
      if (groupError) throw groupError
      
      if (groupData && groupData.length > 0) {
        setGroups(groupData)
        const groupIds = groupData.map((g: any) => g.group_id)
        
        // Fetch group members along with their profiles
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select(`
            group_id,
            user_id,
            role,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url,
              level
            )
          `)
          .in('group_id', groupIds)
          
        if (!memberError && memberData) {
          // Fetch last seen timestamps from user_locations for members
          const memberUserIds = memberData.map((m: any) => m.user_id)
          const { data: memberLocs } = await supabase
            .from('user_locations')
            .select('user_id, updated_at')
            .in('user_id', memberUserIds)
            
          const locMap = new Map(memberLocs?.map(l => [l.user_id, l.updated_at]) || [])
          
          const mapped: Record<string, any[]> = {}
          memberData.forEach((m: any) => {
            if (!mapped[m.group_id]) mapped[m.group_id] = []
            if (m.profiles) {
              mapped[m.group_id].push({
                ...m.profiles,
                role: m.role,
                last_seen_at: locMap.get(m.user_id) || null
              })
            }
          })
          setGroupMembers(mapped)
        }
      } else {
        setGroups([])
      }
    } catch (e) {
      console.error('Error fetching groups and members:', e)
    }
  }

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

      // 2. Fetch the next accepted upcoming quest happening soonest
      const { data: upcomingQuests } = await supabase
        .from('quests')
        .select(`
          id,
          name,
          starts_at,
          category,
          location:location_id (
            name,
            address
          ),
          quest_invites!inner (
            status,
            user_id
          )
        `)
        .eq('quest_invites.user_id', user.id)
        .eq('quest_invites.status', 'accepted')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)

      const upcoming = upcomingQuests?.[0]
      if (upcoming) {
        setNextQuest(upcoming)
      } else {
        setNextQuest(null)
      }

      // 3. Load groups and members
      await fetchGroupsAndMembers()

    } catch (e) {
      console.error('Error loading campfire feed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedCampfireGroup) {
      setSelectedCampfireGroupDetails(null)
      return
    }

    const fetchDetails = async () => {
      try {
        const { data: details } = await supabase
          .from('quest_groups')
          .select('group_type, xp, level, description, created_by')
          .eq('id', selectedCampfireGroup.group_id)
          .single()
        
        setSelectedCampfireGroupDetails(details)
      } catch (err) {
        console.error(err)
      }
    }
    fetchDetails()
  }, [selectedCampfireGroup])

  // Generate a friendly AI Mascot Digest summary (persisted/cached in localStorage for 24h)
  useEffect(() => {
    if (!user) return
    const cacheKey = `campfire_digest_${user.id}_${new Date().toDateString()}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setAiDigestText(cached)
    } else {
      const messages = [
        "Quiet around the fire tonight! Let's get out there—invite a friend to quest in Summerlin, or assemble a Group to keep the streaks alive.",
        "Your adventure log is looking warm! You have done multiple check-ins recently. Start a new Quest today to claim another stamp for your history book.",
        "Welcome back to the fire! The Henderson area has multiple active locations waiting to be explored. Let's nominate a Hidden Gem to earn Discovery XP!",
        "The hearth is glowing. Add some friends from the side drawer to watch their level progress and follow their trails on your calendar."
      ]
      const chosen = messages[Math.floor(Math.random() * messages.length)]
      localStorage.setItem(cacheKey, chosen)
      setAiDigestText(chosen)
    }
  }, [user])

  useEffect(() => {
    fetchFeedData()

    // 4. Real-time subscription to feed_events table
    const channel = supabase
      .channel('campfire-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_events' },
        async (payload) => {
          const newEvent = payload.new as any
          
          // Fetch creator profile details to render card cleanly
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url, level')
            .eq('id', newEvent.actor_id)
            .single()

          if (profileData) {
            const formatted: FeedEvent = {
              id: newEvent.id,
              actor_id: newEvent.actor_id,
              actor_username: profileData.username,
              actor_display_name: profileData.display_name || profileData.username,
              actor_avatar_url: profileData.avatar_url || undefined,
              actor_level: profileData.level || 1,
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
      data-theme="ember"
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
                {/* Mobile Friends/Groups Around the Fire Circle */}
                {(friendsList.length > 0 || groups.length > 0) && (
                  <div className="lg:hidden w-full bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/80 rounded-xl p-4 shadow-md overflow-hidden text-left mb-2">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[10px] font-black uppercase text-[#F0B45C] tracking-widest font-display flex items-center gap-1.5">
                        <Tent className="w-3.5 h-3.5" />
                        Around the Fire
                      </h4>
                      
                      {/* Mobile Groups/Friends Toggle */}
                      <div className="flex gap-1.5 bg-gray-50 dark:bg-gray-900/50 p-0.5 rounded-lg text-[9px] font-black uppercase">
                        <button
                          type="button"
                          onClick={() => setSidebarTab('groups')}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer font-bold ${
                            sidebarTab === 'groups' 
                              ? 'bg-primary text-white shadow-sm' 
                              : 'text-gray-450 dark:text-gray-400'
                          }`}
                        >
                          Groups
                        </button>
                        <button
                          type="button"
                          onClick={() => setSidebarTab('friends')}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer font-bold ${
                            sidebarTab === 'friends' 
                              ? 'bg-primary text-white shadow-sm' 
                              : 'text-gray-450 dark:text-gray-400'
                          }`}
                        >
                          Friends
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
                      {sidebarTab === 'groups' ? (
                        groups.length === 0 ? (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold py-2 w-full text-center">No groups joined yet.</p>
                        ) : (
                          groups.map((group) => {
                            const isOnline = (groupMembers[group.group_id] || []).some(m => friendsMap.has(m.id))
                            
                            return (
                              <div 
                                key={group.group_id} 
                                onClick={() => setSelectedCampfireGroup(group)}
                                className="flex flex-col items-center gap-1 shrink-0 snap-start w-14 cursor-pointer"
                              >
                                <div className="relative">
                                  {group.group_avatar ? (
                                    <img 
                                      src={group.group_avatar} 
                                      className={`w-10 h-10 rounded-xl object-cover border-2 ${isOnline ? 'border-[#58CC02]' : 'border-gray-200 dark:border-gray-700'}`} 
                                    />
                                  ) : (
                                    <div 
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2 text-white`}
                                      style={{ backgroundColor: group.group_color || '#6C63FF' }}
                                    >
                                      {group.group_name[0].toUpperCase()}
                                    </div>
                                  )}
                                  {group.current_streak > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full text-[8px] font-black w-4 h-4 flex items-center justify-center shadow">
                                      {group.current_streak}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-bold text-gray-850 dark:text-gray-200 truncate w-full text-center leading-none mt-0.5">
                                  {group.group_name}
                                </span>
                                <span className="text-[7px] font-black text-gray-450 uppercase tracking-wide leading-none mt-0.5">
                                  {group.member_count} mems
                                </span>
                              </div>
                            )
                          })
                        )
                      ) : (
                        <>
                          {/* Current user avatar first */}
                          <div className="flex flex-col items-center gap-1 shrink-0 snap-start w-14">
                            <div className="relative">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-[#58CC02]" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border-2 border-[#58CC02]">
                                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#58CC02] rounded-full border border-white dark:border-gray-800" />
                            </div>
                            <span className="text-[9px] font-bold text-gray-500 truncate w-full text-center">You</span>
                          </div>

                          {/* Active friends */}
                          {friendsList.map((friend) => {
                            const isOnline = friendsMap.has(friend.id)
                            
                            return (
                              <div key={friend.id} className="flex flex-col items-center gap-1 shrink-0 snap-start w-14">
                                <div className="relative">
                                  {friend.avatar_url ? (
                                    <img 
                                      src={friend.avatar_url} 
                                      className={`w-10 h-10 rounded-full object-cover border-2 ${isOnline ? 'border-[#58CC02]' : 'border-gray-200 dark:border-gray-700'}`} 
                                    />
                                  ) : (
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 bg-primary/5 ${isOnline ? 'border-[#58CC02] text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                                      {friend.display_name?.[0]?.toUpperCase() || friend.username[0].toUpperCase()}
                                    </div>
                                  )}
                                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800 ${isOnline ? 'bg-[#58CC02]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                </div>
                                <span className="text-[9px] font-bold text-gray-850 dark:text-gray-200 truncate w-full text-center leading-none">
                                  {friend.display_name || friend.username}
                                </span>
                                <span className="text-[7px] font-black text-gray-450 uppercase tracking-wide leading-none mt-0.5">
                                  {isOnline ? 'Online' : formatOfflineTime(friend.last_seen_at).replace(' offline', '')}
                                </span>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}

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

                  <div className="flex justify-center pt-1 border-t border-gray-100 dark:border-gray-700/50">
                    <Link
                      to="/quests"
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                      title="Go to Quest Book"
                    >
                      <MoreHorizontal className="w-5 h-5 text-gray-400 hover:text-gray-650 dark:hover:text-gray-250" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 relative z-10 space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">No upcoming quests scheduled.</p>
                  <Link
                    to="/quest/create"
                    className="inline-block text-xs font-black text-primary hover:underline"
                  >
                    + Create a Quest
                  </Link>

                  <div className="flex justify-center pt-1 border-t border-gray-100 dark:border-gray-700/50">
                    <Link
                      to="/quests"
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                      title="Go to Quest Book"
                    >
                      <MoreHorizontal className="w-5 h-5 text-gray-400 hover:text-gray-655 dark:hover:text-gray-250" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Around the Fire Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/80 rounded-xl p-5 shadow-xl relative overflow-hidden text-left">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />
              
              <h3 className="text-xs font-black uppercase text-[#F0B45C] tracking-widest font-display flex items-center gap-1.5 mb-3">
                <Tent className="w-4 h-4" />
                Around the Fire
              </h3>

              {/* Sidebar toggle between Groups and Friends */}
              <div className="flex gap-2 mb-3 bg-gray-50 dark:bg-gray-900/50 p-1 rounded-lg text-[10px] font-black uppercase">
                <button
                  onClick={() => setSidebarTab('groups')}
                  className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${sidebarTab === 'groups' ? 'bg-primary text-white shadow-sm' : 'text-gray-450 dark:text-gray-400 hover:text-gray-650 dark:hover:text-gray-200'}`}
                >
                  Groups
                </button>
                <button
                  onClick={() => setSidebarTab('friends')}
                  className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${sidebarTab === 'friends' ? 'bg-primary text-white shadow-sm' : 'text-gray-450 dark:text-gray-400 hover:text-gray-650 dark:hover:text-gray-200'}`}
                >
                  Friends
                </button>
              </div>

              {/* Content rendering */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {sidebarTab === 'groups' ? (
                  groups.length === 0 ? (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold text-center py-4">No groups joined yet.</p>
                  ) : (
                    groups.map((group) => {
                      const members = groupMembers[group.group_id] || []
                      const isExpanded = !!expandedGroups[group.group_id]
                      
                      return (
                        <div key={group.group_id} className="border-b border-gray-105 dark:border-gray-700/50 pb-2 last:border-0 last:pb-0">
                          <div className="w-full flex items-center justify-between py-1">
                            <button
                              onClick={() => setSelectedCampfireGroup(group)}
                              className="flex items-center gap-2 text-left hover:text-primary transition-colors focus:outline-none group/btn cursor-pointer min-w-0 flex-1"
                            >
                              <div 
                                className="w-5 h-5 rounded-md flex items-center justify-center text-white font-extrabold text-[10px] shrink-0"
                                style={{ backgroundColor: group.group_color || '#6C63FF' }}
                              >
                                {group.group_name[0].toUpperCase()}
                              </div>
                              <span className="font-extrabold text-xs text-gray-900 dark:text-white group-hover/btn:text-primary transition-colors line-clamp-1">
                                {group.group_name}
                              </span>
                            </button>
                            <button
                              onClick={() => setExpandedGroups(prev => ({ ...prev, [group.group_id]: !prev[group.group_id] }))}
                              className="text-[10px] font-bold text-gray-450 bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850"
                            >
                              {isExpanded ? 'Hide' : 'Show'}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 pl-3 space-y-2 border-l border-gray-150 dark:border-gray-750">
                              {members.length === 0 ? (
                                <p className="text-[10px] text-gray-450 font-bold">No members found.</p>
                              ) : (
                                members.map((member) => {
                                  const isOnline = friendsMap.has(member.id) || member.id === user?.id
                                  
                                  return (
                                    <div key={member.id} className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {member.avatar_url ? (
                                          <img src={member.avatar_url} alt={member.username} className="w-6 h-6 rounded-full object-cover shrink-0 animate-fade-in" />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 border border-primary/20">
                                            {member.display_name?.[0]?.toUpperCase() || member.username[0].toUpperCase()}
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-tight">
                                            {member.display_name || member.username}
                                          </p>
                                          <p className="text-[8px] text-gray-450 font-bold truncate">@{member.username}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#58CC02]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                        <span className="text-[8px] font-black text-gray-450 uppercase tracking-wide">
                                          {isOnline ? 'Online' : formatOfflineTime(member.last_seen_at)}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )
                ) : (
                  friendsList.length === 0 ? (
                    <p className="text-[11px] text-gray-450 dark:text-gray-500 font-bold text-center py-4">No friends added yet.</p>
                  ) : (
                    friendsList.map((friend) => {
                      const isOnline = friendsMap.has(friend.id)
                      
                      return (
                        <div key={friend.id} className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/50 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {friend.avatar_url ? (
                              <img src={friend.avatar_url} alt={friend.username} className="w-7 h-7 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/20">
                                {friend.display_name?.[0]?.toUpperCase() || friend.username[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">
                                {friend.display_name || friend.username}
                              </p>
                              <p className="text-[9px] text-gray-450 dark:text-gray-400 font-bold truncate">@{friend.username}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#58CC02]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <span className="text-[8px] font-black text-gray-450 uppercase tracking-wide">
                              {isOnline ? 'Online' : formatOfflineTime(friend.last_seen_at)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
      {/* Read timeTick to satisfy TypeScript noUnusedLocals and force re-render ticks */}
      <span className="hidden">{timeTick}</span>

      {/* Group Profile detailed view (Full-Screen Overlay z-[100]) */}
      <Portal>
        <AnimatePresence>
          {selectedCampfireGroup && (
            <motion.div
              initial={{ opacity: 0, y: '10%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '10%' }}
              className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 overflow-y-auto pb-10 flex flex-col text-gray-900 dark:text-white"
            >
              {/* Header banner */}
              <div 
                className="relative pt-12 pb-6 px-6 shadow-sm shrink-0"
                style={{ background: `linear-gradient(to bottom, ${selectedCampfireGroup.group_color || '#6C63FF'}55, transparent)` }}
              >
                <button 
                  onClick={() => setSelectedCampfireGroup(null)}
                  className="absolute top-4 left-4 p-2.5 rounded-full bg-white/60 hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-sm text-gray-800 dark:text-white transition-colors active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={22} strokeWidth={2.5} />
                </button>
                
                <div className="flex flex-col items-center text-center mt-6">
                  {selectedCampfireGroup.group_avatar ? (
                    <img src={selectedCampfireGroup.group_avatar} className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-white dark:border-gray-800" />
                  ) : (
                    <div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-lg"
                      style={{ backgroundColor: selectedCampfireGroup.group_color || '#6C63FF' }}
                    >
                      {selectedCampfireGroup.group_name[0].toUpperCase()}
                    </div>
                  )}
                  
                  <h1 className="mt-3 text-xl font-black text-gray-900 dark:text-white tracking-tight">{selectedCampfireGroup.group_name}</h1>
                  
                  {/* Type Badge */}
                  {selectedCampfireGroupDetails?.group_type && (
                    <span className="mt-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-wider uppercase rounded-full">
                      {selectedCampfireGroupDetails.group_type} Group
                    </span>
                  )}
                </div>
              </div>

              {/* Content card body */}
              <div className="flex-1 max-w-md mx-auto w-full px-4 space-y-5">
                
                {/* Group Description */}
                {selectedCampfireGroupDetails?.description && (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 text-left">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">About the Group</h4>
                    <p className="text-sm font-semibold text-gray-750 dark:text-gray-300 leading-relaxed">{selectedCampfireGroupDetails.description}</p>
                  </div>
                )}

                {/* Group Experience / Level Progression */}
                {selectedCampfireGroupDetails && (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 text-left">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Group Progression</h4>
                        <p className="text-xs text-gray-500 font-bold mt-1">Level {selectedCampfireGroupDetails.level || 1}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-primary">
                          {(selectedCampfireGroupDetails.xp || 0) % 100} / 100 XP
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(selectedCampfireGroupDetails.xp || 0) % 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 mt-2 block text-center">Gains XP from Quest completions together! ⚔️</span>
                  </div>
                )}

                {/* Group Members List */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-3 text-left">
                  <div className="pb-2 border-b border-gray-100 dark:border-gray-700/50">
                    <h3 className="font-extrabold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" /> Members ({(groupMembers[selectedCampfireGroup.group_id] || []).length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {(groupMembers[selectedCampfireGroup.group_id] || []).map((member) => {
                      const isOnline = friendsMap.has(member.id) || member.id === user?.id
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-700/30 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/20">
                                {member.display_name?.[0]?.toUpperCase() || member.username[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate leading-tight">
                                {member.display_name || member.username}
                              </p>
                              <p className="text-[9px] text-gray-450 dark:text-gray-400 font-bold truncate">@{member.username}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black uppercase text-gray-400 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-900 border">
                              {member.role}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#58CC02]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                              <span className="text-[8px] font-black text-gray-450 uppercase tracking-wide">
                                {isOnline ? 'Online' : formatOfflineTime(member.last_seen_at).replace(' offline', '')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  )
}
