import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
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
import { 
  CampfireIcon, 
  CalendarIcon, 
  MapIcon, 
  MoreDotsIcon, 
  ChevronLeftIcon, 
  FriendsIcon 
} from '../components/icons'
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
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

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

  const fetchQuestHistory = async () => {
    if (!user) return
    setLoadingHistory(true)
    try {
      const friendIds = friendsList.map(f => f.id)
      const allUserIds = [user.id, ...friendIds]

      // 1. Fetch recent quests created by user or friends
      const { data: createdQuests, error: createdErr } = await supabase
        .from('quests')
        .select(`
          id,
          name,
          created_at,
          creator_id,
          profiles:creator_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('creator_id', allUserIds)
        .order('created_at', { ascending: false })
        .limit(10)

      if (createdErr) throw createdErr

      // 2. Fetch recent quest completions (attendance) by user or friends
      const { data: completedQuests, error: completedErr } = await supabase
        .from('quest_attendance')
        .select(`
          arrived_at,
          quest_id,
          user_id,
          quests:quest_id (
            name
          ),
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('user_id', allUserIds)
        .order('arrived_at', { ascending: false })
        .limit(10)

      if (completedErr) throw completedErr

      // 3. Map to unified HistoryItem and sort chronologically
      const items: any[] = []

      if (createdQuests) {
        createdQuests.forEach((q: any) => {
          if (q.profiles) {
            items.push({
              id: `create-${q.id}`,
              type: 'created',
              questId: q.id,
              questName: q.name,
              timestamp: q.created_at,
              user: q.profiles
            })
          }
        })
      }

      if (completedQuests) {
        completedQuests.forEach((c: any) => {
          if (c.profiles && c.quests) {
            items.push({
              id: `complete-${c.quest_id}-${c.user_id}-${c.arrived_at}`,
              type: 'completed',
              questId: c.quest_id,
              questName: c.quests.name,
              timestamp: c.arrived_at,
              user: c.profiles
            })
          }
        })
      }

      // Sort DESC by timestamp
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setHistoryItems(items)
    } catch (err) {
      console.error('Error fetching quest history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (user && !loading) {
      fetchQuestHistory()
    }
  }, [user, friendsList, loading])

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
                  <div className="lg:hidden w-full bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-4 shadow-[var(--sq-shadow-soft)] sq-wobbly-md overflow-hidden text-left mb-2">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[10px] font-medium uppercase text-[var(--sq-gold)] tracking-widest font-display flex items-center gap-1.5">
                        <CampfireIcon size={16} active={true} withShadow={false} />
                        Around the Fire
                      </h4>
                      
                      {/* Mobile Groups/Friends Toggle */}
                      <div className="flex gap-1.5 bg-[var(--sq-surface)] p-0.5 rounded-lg text-[9px] font-medium uppercase border border-[var(--sq-hairline)]">
                        <button
                          type="button"
                          onClick={() => setSidebarTab('groups')}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            sidebarTab === 'groups' 
                              ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] shadow-sm font-medium' 
                              : 'text-[var(--sq-text-muted)]'
                          }`}
                        >
                          Groups
                        </button>
                        <button
                          type="button"
                          onClick={() => setSidebarTab('friends')}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            sidebarTab === 'friends' 
                              ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] shadow-sm font-medium' 
                              : 'text-[var(--sq-text-muted)]'
                          }`}
                        >
                          Friends
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
                      {sidebarTab === 'groups' ? (
                        groups.length === 0 ? (
                          <p className="text-[10px] text-[var(--sq-text-muted)] font-medium py-2 w-full text-center">No groups joined yet.</p>
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
                                      className={`w-10 h-10 rounded-[var(--sq-r-md)] object-cover border-2 shadow-[var(--sq-shadow-sticker)] ${isOnline ? 'border-[var(--sq-success)]' : 'border-[var(--sq-keyline)]'}`} 
                                    />
                                  ) : (
                                    <div 
                                      className={`w-10 h-10 rounded-[var(--sq-r-md)] flex items-center justify-center font-medium text-sm border-2 text-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]`}
                                      style={{ backgroundColor: group.group_color || '#6C63FF', borderColor: 'var(--sq-keyline)' }}
                                    >
                                      {group.group_name[0].toUpperCase()}
                                    </div>
                                  )}
                                  {group.current_streak > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] rounded-full text-[8px] font-medium w-4.5 h-4.5 flex items-center justify-center border border-[var(--sq-keyline)] shadow">
                                      {group.current_streak}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-medium text-[var(--sq-text)] truncate w-full text-center leading-none mt-0.5">
                                  {group.group_name}
                                </span>
                                <span className="text-[7px] font-medium text-[var(--sq-text-muted)] uppercase tracking-wide leading-none mt-0.5">
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
                                <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--sq-success)]" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[var(--sq-surface)] text-[var(--sq-ember-300)] flex items-center justify-center font-medium text-sm border-2 border-[var(--sq-success)]">
                                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[var(--sq-success)] rounded-full border border-[var(--sq-keyline)]" />
                            </div>
                            <span className="text-[9px] font-medium text-[var(--sq-text-muted)] truncate w-full text-center">You</span>
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
                                      className={`w-10 h-10 rounded-full object-cover border-2 ${isOnline ? 'border-[var(--sq-success)]' : 'border-[var(--sq-hairline-strong)]'}`} 
                                    />
                                  ) : (
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm border-2 bg-[var(--sq-surface)] ${isOnline ? 'border-[var(--sq-success)] text-[var(--sq-ember-300)]' : 'border-[var(--sq-hairline-strong)] text-[var(--sq-text-muted)]'}`}>
                                      {friend.display_name?.[0]?.toUpperCase() || friend.username[0].toUpperCase()}
                                    </div>
                                  )}
                                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[var(--sq-keyline)] ${isOnline ? 'bg-[var(--sq-success)]' : 'bg-gray-650'}`} />
                                </div>
                                <span className="text-[9px] font-medium text-[var(--sq-text)] truncate w-full text-center leading-none">
                                  {friend.display_name || friend.username}
                                </span>
                                <span className="text-[7px] font-medium text-[var(--sq-text-faint)] uppercase tracking-wide leading-none mt-0.5">
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
                    <EmptyCampfire 
                      onActionClick={fetchFeedData} 
                      historyItems={historyItems}
                      loadingHistory={loadingHistory}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>          {/* Right Rail Sidebar (Visible on large viewports >= 1024px) */}
          <div className="hidden lg:flex flex-col gap-6 w-[300px] shrink-0 sticky top-6">
            
            {/* 1. Next Quest card */}
            <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] sq-wobbly-md relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />
              
              <h3 className="text-xs font-medium uppercase text-[var(--sq-gold)] tracking-widest font-display flex items-center gap-1.5 mb-3">
                <CalendarIcon size={18} active={true} withShadow={false} />
                Next Quest
              </h3>

              {nextQuest ? (
                <div className="space-y-3 relative z-10 text-left">
                  <div>
                    <h4 className="font-medium text-sm text-[var(--sq-text)] line-clamp-1">{nextQuest.name}</h4>
                    <p className="text-[10px] text-[var(--sq-text-muted)] font-medium mt-0.5">
                      {format(new Date(nextQuest.starts_at), "EEEE, MMM d @ h:mm a")}
                    </p>
                  </div>
                  
                  {nextQuest.location && (
                    <div className="flex items-start gap-2 bg-[var(--sq-surface)] p-2.5 rounded-lg border border-[var(--sq-hairline)]">
                      <MapIcon size={18} active={true} withShadow={false} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-[var(--sq-text)] leading-tight line-clamp-1">
                          {nextQuest.location.name}
                        </p>
                        <p className="text-[9px] text-[var(--sq-text-muted)] truncate mt-0.5">
                          {nextQuest.location.address}
                        </p>
                      </div>
                    </div>
                  )}

                  <Link
                    to="/quest/$id"
                    params={{ id: nextQuest.id }}
                    className="w-full py-2 bg-[var(--sq-ember-500)] hover:bg-[var(--sq-ember-400)] text-[var(--sq-ink)] text-[11px] font-medium rounded-[var(--sq-r-sm)] border-2 border-[var(--sq-keyline)] active:scale-95 transition-all shadow-[var(--sq-shadow-sticker)] block text-center uppercase tracking-wider font-display"
                  >
                    View Quest Details
                  </Link>

                  <div className="flex justify-center pt-1 border-t border-[var(--sq-hairline)]">
                    <Link
                      to="/quests"
                      className="p-1.5 hover:bg-[var(--sq-surface)] rounded-full transition-colors flex items-center justify-center cursor-pointer"
                      title="Go to Quest Book"
                    >
                      <MoreDotsIcon size={20} active={false} withShadow={false} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 relative z-10 space-y-3">
                  <p className="text-xs text-[var(--sq-text-muted)] font-medium">No upcoming quests scheduled.</p>
                  <Link
                    to="/quest/create"
                    className="inline-block text-xs font-medium text-[var(--sq-ember-300)] hover:underline"
                  >
                    + Create a Quest
                  </Link>

                  <div className="flex justify-center pt-1 border-t border-[var(--sq-hairline)]">
                    <Link
                      to="/quests"
                      className="p-1.5 hover:bg-[var(--sq-surface)] rounded-full transition-colors flex items-center justify-center cursor-pointer"
                      title="Go to Quest Book"
                    >
                      <MoreDotsIcon size={20} active={false} withShadow={false} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Around the Fire Card */}
            <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] sq-wobbly-md relative overflow-hidden text-left">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />
              
              <h3 className="text-xs font-medium uppercase text-[var(--sq-gold)] tracking-widest font-display flex items-center gap-1.5 mb-3">
                <CampfireIcon size={18} active={true} withShadow={false} />
                Around the Fire
              </h3>

              {/* Sidebar toggle between Groups and Friends */}
              <div className="flex gap-2 mb-3 bg-[var(--sq-surface)] p-1 rounded-lg text-[10px] font-medium uppercase border border-[var(--sq-hairline)]">
                <button
                  onClick={() => setSidebarTab('groups')}
                  className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${sidebarTab === 'groups' ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] font-medium shadow-sm' : 'text-[var(--sq-text-muted)] hover:text-[var(--sq-text)]'}`}
                >
                  Groups
                </button>
                <button
                  onClick={() => setSidebarTab('friends')}
                  className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${sidebarTab === 'friends' ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] font-medium shadow-sm' : 'text-[var(--sq-text-muted)] hover:text-[var(--sq-text)]'}`}
                >
                  Friends
                </button>
              </div>

              {/* Content rendering */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {sidebarTab === 'groups' ? (
                  groups.length === 0 ? (
                    <p className="text-[11px] text-[var(--sq-text-muted)] font-medium text-center py-4">No groups joined yet.</p>
                  ) : (
                    groups.map((group) => {
                      const members = groupMembers[group.group_id] || []
                      const isExpanded = !!expandedGroups[group.group_id]
                      
                      return (
                        <div key={group.group_id} className="border-b border-[var(--sq-hairline)] pb-2 last:border-0 last:pb-0">
                          <div className="w-full flex items-center justify-between py-1">
                            <button
                              onClick={() => setSelectedCampfireGroup(group)}
                              className="flex items-center gap-2 text-left hover:text-[var(--sq-ember-300)] transition-colors focus:outline-none group/btn cursor-pointer min-w-0 flex-1"
                            >
                              <div 
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--sq-keyline)] font-medium text-[10px] shrink-0 border border-[var(--sq-keyline)] shadow"
                                style={{ backgroundColor: group.group_color || '#6C63FF' }}
                              >
                                {group.group_name[0].toUpperCase()}
                              </div>
                              <span className="font-medium text-xs text-[var(--sq-text)] group-hover/btn:text-[var(--sq-ember-300)] transition-colors line-clamp-1">
                                {group.group_name}
                                {group.group_code && (
                                  <span className="text-[10px] text-[var(--sq-text-muted)] font-medium ml-1.5">
                                    #{group.group_code}
                                  </span>
                                )}
                              </span>
                            </button>
                            <button
                              onClick={() => setExpandedGroups(prev => ({ ...prev, [group.group_id]: !prev[group.group_id] }))}
                              className="text-[10px] font-medium text-[var(--sq-text-muted)] bg-[var(--sq-surface)] px-1.5 py-0.5 rounded border border-[var(--sq-hairline)] cursor-pointer hover:bg-[var(--sq-card-hover)]"
                            >
                              {isExpanded ? 'Hide' : 'Show'}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 pl-3 space-y-2 border-l border-[var(--sq-hairline-strong)]">
                              {members.length === 0 ? (
                                <p className="text-[10px] text-[var(--sq-text-muted)] font-medium">No members found.</p>
                              ) : (
                                members.map((member) => {
                                  const isOnline = friendsMap.has(member.id) || member.id === user?.id
                                  
                                  return (
                                    <div key={member.id} className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {member.avatar_url ? (
                                          <img src={member.avatar_url} alt={member.username} className="w-6 h-6 rounded-full object-cover shrink-0 animate-fade-in" />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-[var(--sq-surface)] text-[var(--sq-ember-300)] flex items-center justify-center text-[10px] font-medium shrink-0 border border-[var(--sq-hairline)]">
                                            {member.display_name?.[0]?.toUpperCase() || member.username[0].toUpperCase()}
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-xs font-medium text-[var(--sq-text)] truncate leading-tight">
                                            {member.display_name || member.username}
                                          </p>
                                          <p className="text-[8px] text-[var(--sq-text-muted)] font-medium truncate">@{member.username}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[var(--sq-success)]' : 'bg-gray-650'}`} />
                                        <span className="text-[8px] font-medium text-[var(--sq-text-faint)] uppercase tracking-wide">
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
                    <p className="text-[11px] text-[var(--sq-text-muted)] font-medium text-center py-4">No friends added yet.</p>
                  ) : (
                    friendsList.map((friend) => {
                      const isOnline = friendsMap.has(friend.id)
                      
                      return (
                        <div key={friend.id} className="flex items-center justify-between gap-2 border-b border-[var(--sq-hairline)] pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {friend.avatar_url ? (
                              <img src={friend.avatar_url} alt={friend.username} className="w-7 h-7 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[var(--sq-surface)] text-[var(--sq-ember-300)] flex items-center justify-center text-xs font-medium shrink-0 border border-[var(--sq-hairline)]">
                                {friend.display_name?.[0]?.toUpperCase() || friend.username[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-medium text-[var(--sq-text)] truncate leading-tight">
                                {friend.display_name || friend.username}
                              </p>
                              <p className="text-[9px] text-[var(--sq-text-muted)] font-medium truncate">@{friend.username}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[var(--sq-success)]' : 'bg-gray-650'}`} />
                            <span className="text-[8px] font-medium text-[var(--sq-text-faint)] uppercase tracking-wide">
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
      <Portal>
        <AnimatePresence>
          {selectedCampfireGroup && (
            <motion.div
              initial={{ opacity: 0, y: '10%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '10%' }}
              className="fixed inset-0 z-[100] bg-[var(--sq-bg)] overflow-y-auto pb-10 flex flex-col text-[var(--sq-text)]"
            >
              {/* Header banner */}
              <div 
                className="relative pt-12 pb-6 px-6 shadow-sm shrink-0"
                style={{ background: `linear-gradient(to bottom, ${selectedCampfireGroup.group_color || '#6C63FF'}33, transparent)` }}
              >
                <button 
                  onClick={() => setSelectedCampfireGroup(null)}
                  className="absolute top-4 left-4 p-2.5 rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] text-[var(--sq-text)] transition-colors active:scale-95 cursor-pointer border border-[var(--sq-hairline)]"
                >
                  <ChevronLeftIcon size={24} active={false} withShadow={false} />
                </button>
                
                <div className="flex flex-col items-center text-center mt-6">
                  {selectedCampfireGroup.group_avatar ? (
                    <img src={selectedCampfireGroup.group_avatar} className="w-20 h-20 rounded-[var(--sq-r-md)] object-cover shadow-lg border-4 border-[var(--sq-keyline)]" />
                  ) : (
                    <div 
                      className="w-20 h-20 rounded-[var(--sq-r-md)] flex items-center justify-center text-[var(--sq-keyline)] font-medium text-4xl shadow-lg border-4 border-[var(--sq-keyline)]"
                      style={{ backgroundColor: selectedCampfireGroup.group_color || '#6C63FF' }}
                    >
                      {selectedCampfireGroup.group_name[0].toUpperCase()}
                    </div>
                  )}
                  
                  <h1 className="mt-3 text-xl font-medium text-[var(--sq-text)] tracking-tight">
                    {selectedCampfireGroup.group_name}
                    {selectedCampfireGroup.group_code && (
                      <span className="text-sm text-[var(--sq-text-muted)] font-medium ml-2">
                        #{selectedCampfireGroup.group_code}
                      </span>
                    )}
                  </h1>
                  
                  {/* Type Badge */}
                  {selectedCampfireGroupDetails?.group_type && (
                    <span className="mt-1.5 px-3 py-1 bg-[var(--sq-ember-500)]/15 border border-[var(--sq-ember-500)]/30 text-[var(--sq-ember-400)] text-[10px] font-medium tracking-wider uppercase rounded-full">
                      {selectedCampfireGroupDetails.group_type} Group
                    </span>
                  )}
                </div>
              </div>

              {/* Content card body */}
              <div className="flex-1 max-w-md mx-auto w-full px-4 space-y-5">
                
                {/* Group Description */}
                {selectedCampfireGroupDetails?.description && (
                  <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] sq-wobbly-md text-left">
                    <h4 className="text-[10px] font-medium uppercase text-[var(--sq-text-muted)] tracking-wider mb-1.5">About the Group</h4>
                    <p className="text-sm font-medium text-[var(--sq-text)] leading-relaxed">{selectedCampfireGroupDetails.description}</p>
                  </div>
                )}

                {/* Group Experience / Level Progression */}
                {selectedCampfireGroupDetails && (
                  <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] sq-wobbly-md text-left">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h4 className="text-[10px] font-medium uppercase text-[var(--sq-text-muted)] tracking-wider">Group Progression</h4>
                        <p className="text-xs text-[var(--sq-text-muted)] font-medium mt-1">Level {selectedCampfireGroupDetails.level || 1}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-[var(--sq-ember-400)]">
                          {(selectedCampfireGroupDetails.xp || 0) % 100} / 100 XP
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-[var(--sq-surface)] rounded-full overflow-hidden border border-[var(--sq-hairline)]">
                      <div 
                        className="h-full rounded-full bg-[var(--sq-ember-500)]"
                        style={{ width: `${(selectedCampfireGroupDetails.xp || 0) % 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-[var(--sq-text-faint)] mt-2 block text-center">Gains XP from Quest completions together! ⚔️</span>
                  </div>
                )}

                {/* Group Members List */}
                <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] sq-wobbly-md space-y-3 text-left">
                  <div className="pb-2 border-b border-[var(--sq-hairline)]">
                    <h3 className="font-medium text-sm text-[var(--sq-text)] flex items-center gap-1.5">
                      <FriendsIcon size={18} active={true} withShadow={false} /> Members ({(groupMembers[selectedCampfireGroup.group_id] || []).length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {(groupMembers[selectedCampfireGroup.group_id] || []).map((member) => {
                      const isOnline = friendsMap.has(member.id) || member.id === user?.id
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between gap-2 border-b border-[var(--sq-hairline-strong)]/30 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2.5 min-w-0 text-left">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[var(--sq-surface)] text-[var(--sq-ember-300)] flex items-center justify-center text-xs font-medium shrink-0 border border-[var(--sq-hairline)]">
                                {member.display_name?.[0]?.toUpperCase() || member.username[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[var(--sq-text)] truncate leading-tight">
                                {member.display_name || member.username}
                              </p>
                              <p className="text-[9px] text-[var(--sq-text-muted)] font-medium truncate">@{member.username}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-medium uppercase text-[var(--sq-text-muted)] px-1.5 py-0.5 rounded bg-[var(--sq-surface)] border border-[var(--sq-hairline)]">
                              {member.role}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[var(--sq-success)]' : 'bg-gray-650'}`} />
                              <span className="text-[8px] font-medium text-[var(--sq-text-faint)] uppercase tracking-wide">
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
