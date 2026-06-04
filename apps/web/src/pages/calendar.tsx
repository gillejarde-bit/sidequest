import { useState, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { 
  Clock, 
  Loader2,
  Crown,
  MapPin,
  Users,
  CalendarDays,
  Plus
} from 'lucide-react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CrewIcon,
  StickerWrapper
} from '../components/icons'
import { useToastStore } from '../stores/toastStore'
import { Z_INDEX } from '../lib/zIndex'

interface CalendarQuest {
  id: string
  name: string
  category: string
  vibe: string
  starts_at: string
  ends_at: string
  status: string
  location_name: string
  creator_username: string
  my_status: string | null
  attendee_count: number
  is_group_quest: boolean
  group_name: string | null
  group_color: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF9F0A',
  outdoors: '#58CC02',
  nightlife: '#FF3B30',
  culture: '#6C63FF',
  fitness: '#3498DB',
  gaming: '#FFD93D',
  other: '#A8A8B3'
}

const FRIEND_PALETTE = ['#3498DB', '#9B59B6', '#E74C3C', '#2ECC71', '#F1C40F']

export function CalendarPage() {
  const { user, profile } = useAuthStore()
  const { addToast } = useToastStore()
  const navigate = useNavigate()
  
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [quests, setQuests] = useState<CalendarQuest[]>([])
  const [loading, setLoading] = useState(true)
  
  // Month details popup bottom sheet
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedQuests, setSelectedQuests] = useState<CalendarQuest[]>([])

  // Friend & Crew schedules compare state
  const [friendsList, setFriendsList] = useState<any[]>([])
  const [crewsList, setCrewsList] = useState<any[]>([])
  const [showFriendPicker, setShowFriendPicker] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [selectedCrews, setSelectedCrews] = useState<string[]>([])
  const [friendsCalendars, setFriendsCalendars] = useState<Record<string, any>>({})

  // Fetch calendar quests from RPC
  const fetchCalendarData = async () => {
    try {
      setLoading(true)
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString()
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString()

      const { data, error } = await supabase.rpc('get_calendar_quests', {
        p_start: start,
        p_end: end
      })
      if (error) throw error
      setQuests(data as CalendarQuest[] || [])
    } catch (err: any) {
      console.error('Error fetching calendar quests:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch friends list
  const fetchFriends = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user_id,
          friend_id,
          profiles:friend_id(id, username, display_name, avatar_url, profile_color, level),
          profiles_user:user_id(id, username, display_name, avatar_url, profile_color, level)
        `)
        .eq('status', 'accepted')
      
      if (error) throw error
      
      const list = (data || []).map((row: any) => {
        return row.user_id === user.id ? row.profiles : row.profiles_user
      }).filter(Boolean)
      
      setFriendsList(list)
    } catch (err: any) {
      console.error('Error fetching friends:', err.message)
    }
  }

  // Fetch crews list
  const fetchCrews = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase.rpc('get_my_streaks')
      if (error) throw error
      setCrewsList(data || [])
    } catch (err: any) {
      console.error('Error fetching crews:', err.message)
    }
  }

  // Fetch friend calendars
  const fetchSelectedFriendsCalendars = async (friendIds: string[]) => {
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString()
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString()
      
      const results: Record<string, any> = {}
      for (const fId of friendIds) {
        const { data, error } = await supabase.rpc('get_friend_calendar' as any, {
          p_friend_id: fId,
          p_start: start,
          p_end: end
        })
        if (!error && data) {
          results[fId] = data
        }
      }
      setFriendsCalendars(results)
    } catch (err: any) {
      console.error('Error comparing friend calendars:', err.message)
    }
  }

  useEffect(() => {
    fetchCalendarData()
    fetchFriends()
    fetchCrews()
  }, [currentDate])

  useEffect(() => {
    async function resolveAndFetch() {
      const targetUserIds = new Set<string>(selectedFriends)
      
      if (selectedCrews.length > 0) {
        const { data, error } = await supabase
          .from('group_members')
          .select('user_id')
          .in('group_id', selectedCrews)
        
        if (!error && data) {
          data.forEach((m: any) => targetUserIds.add(m.user_id))
        }
      }

      // Always filter out current user from schedules to compare
      targetUserIds.delete(user?.id || '')
      
      const resolvedList = Array.from(targetUserIds)
      if (resolvedList.length > 0) {
        await fetchSelectedFriendsCalendars(resolvedList)
      } else {
        setFriendsCalendars({})
      }
    }
    
    resolveAndFetch()
  }, [selectedFriends, selectedCrews, currentDate, user?.id])

  const handlePrevDate = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000))
    }
  }

  const handleNextDate = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000))
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const numDays = new Date(year, month + 1, 0).getDate()
    
    const days = []
    
    const prevMonthNumDays = new Date(year, month, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthNumDays - i,
        date: new Date(year, month - 1, prevMonthNumDays - i),
        isCurrentMonth: false
      })
    }
    
    for (let i = 1; i <= numDays; i++) {
      days.push({
        day: i,
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }

    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }
    
    return days
  }

  const getQuestsForDay = (dayDate: Date) => {
    return quests.filter(q => {
      const qDate = new Date(q.starts_at)
      return qDate.getFullYear() === dayDate.getFullYear() &&
             qDate.getMonth() === dayDate.getMonth() &&
             qDate.getDate() === dayDate.getDate()
    })
  }

  const getFriendBusyOnDay = (dayDate: Date, friendId: string) => {
    const cal = friendsCalendars[friendId]
    if (!cal || !cal.busy_blocks) return []
    
    return cal.busy_blocks.filter((block: any) => {
      const bStart = new Date(block.starts_at)
      return bStart.getFullYear() === dayDate.getFullYear() &&
             bStart.getMonth() === dayDate.getMonth() &&
             bStart.getDate() === dayDate.getDate()
    })
  }

  const handleDayClick = (dayDate: Date, dayQuests: CalendarQuest[]) => {
    setSelectedDay(dayDate)
    setSelectedQuests(dayQuests)
  }

  const handleRSVP = async (questId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('quest_invites')
        .upsert({
          quest_id: questId,
          user_id: user?.id || '',
          status
        })
      if (error) throw error
      
      addToast({
        message: `RSVP updated! 📅`,
      })
      
      const updated = quests.map(q => q.id === questId ? { ...q, my_status: status } : q)
      setQuests(updated)
      setSelectedQuests(selectedQuests.map(q => q.id === questId ? { ...q, my_status: status } : q))
    } catch (err: any) {
      console.error(err.message)
      addToast({
        message: 'Could not update RSVP',
      })
    }
  }

  const getAgendaItems = () => {
    const grouped: Record<string, CalendarQuest[]> = {}
    quests.forEach(q => {
      const dateStr = new Date(q.starts_at).toDateString()
      if (!grouped[dateStr]) grouped[dateStr] = []
      grouped[dateStr].push(q)
    })
    return Object.entries(grouped).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
  }

  const getFreeTimeHints = () => {
    if (Object.keys(friendsCalendars).length === 0) return null
    
    // Check next Saturday afternoon 12pm-5pm
    const sat = new Date()
    sat.setDate(sat.getDate() + (6 - sat.getDay()))
    sat.setHours(12, 0, 0, 0)
    
    let satBusy = false
    quests.forEach(q => {
      const qStart = new Date(q.starts_at)
      if (qStart.getFullYear() === sat.getFullYear() && qStart.getMonth() === sat.getMonth() && qStart.getDate() === sat.getDate()) {
        if (qStart.getHours() >= 12 && qStart.getHours() <= 17) satBusy = true
      }
    })
    
    Object.keys(friendsCalendars).forEach(fId => {
      const cal = friendsCalendars[fId]
      if (cal?.busy_blocks) {
        cal.busy_blocks.forEach((block: any) => {
          const bStart = new Date(block.starts_at)
          if (bStart.getFullYear() === sat.getFullYear() && bStart.getMonth() === sat.getMonth() && bStart.getDate() === sat.getDate()) {
            if (bStart.getHours() >= 12 && bStart.getHours() <= 17) satBusy = true
          }
        })
      }
    })
    
    if (!satBusy) {
      return "Everyone's free Saturday afternoon ✓"
    }
    
    // Check next Sunday afternoon
    const sun = new Date()
    sun.setDate(sun.getDate() + (7 - sun.getDay()))
    sun.setHours(12, 0, 0, 0)
    let sunBusy = false
    quests.forEach(q => {
      const qStart = new Date(q.starts_at)
      if (qStart.getFullYear() === sun.getFullYear() && qStart.getMonth() === sun.getMonth() && qStart.getDate() === sun.getDate()) {
        if (qStart.getHours() >= 12 && qStart.getHours() <= 17) sunBusy = true
      }
    })
    Object.keys(friendsCalendars).forEach(fId => {
      const cal = friendsCalendars[fId]
      if (cal?.busy_blocks) {
        cal.busy_blocks.forEach((block: any) => {
          const bStart = new Date(block.starts_at)
          if (bStart.getFullYear() === sun.getFullYear() && bStart.getMonth() === sun.getMonth() && bStart.getDate() === sun.getDate()) {
            if (bStart.getHours() >= 12 && bStart.getHours() <= 17) sunBusy = true
          }
        })
      }
    })
    
    if (!sunBusy) {
      return "Everyone's free Sunday afternoon ✓"
    }
    
    return "Check weekday evenings for overlapping free slots!"
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const today = new Date()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-[100dvh] bg-[var(--sq-bg)] text-[var(--sq-text)] transition-colors duration-300">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--sq-bg)]/80 backdrop-blur-xl border-b border-[var(--sq-hairline)]">
        <div className="max-w-md mx-auto px-4 pt-4 pb-2">
          
          <div className="flex items-center justify-between">
            <Link 
              to="/map"
              className="w-10 h-10 flex items-center justify-center bg-[var(--sq-surface)] text-[var(--sq-text)] border border-[var(--sq-hairline)] sq-wobbly-md active:scale-95 transition-all shadow-[var(--sq-shadow-soft)]"
            >
              <ChevronLeftIcon size={20} withShadow={false} />
            </Link>
            
            {/* Title / Date navigation */}
            <div className="flex items-center gap-1.5 font-medium text-[var(--sq-text)]">
              <button onClick={handlePrevDate} className="p-1.5 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] hover:bg-[var(--sq-card-hover)] text-[var(--sq-text)] rounded-full transition-colors cursor-pointer">
                <ChevronLeftIcon size={16} withShadow={false} />
              </button>
              <span className="text-base tracking-tight font-medium lowercase first-letter:uppercase">{monthName}</span>
              <button onClick={handleNextDate} className="p-1.5 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] hover:bg-[var(--sq-card-hover)] text-[var(--sq-text)] rounded-full transition-colors cursor-pointer">
                <ChevronRightIcon size={16} withShadow={false} />
              </button>
            </div>
            
            <Link 
              to="/quest/create"
              className="w-10 h-10 flex items-center justify-center bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] sq-wobbly-md active:scale-95 transition-all"
            >
              <PlusIcon size={20} active={true} withShadow={false} />
            </Link>
          </div>

          {/* Sliding segment selector */}
          <div className="mt-4 flex bg-[var(--sq-surface)] border border-[var(--sq-hairline-strong)] p-1 rounded-full relative overflow-hidden sq-wobbly-pill shadow-[var(--sq-shadow-soft)]">
            <div 
              className="absolute top-1 bottom-1 bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-full transition-all duration-300 ease-out z-0 sq-wobbly-pill"
              style={{
                left: `${viewMode === 'month' ? 2 : 51}%`,
                width: '47%',
              }}
            />
            {['month', 'agenda'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`flex-1 py-2 text-xs font-medium capitalize tracking-wider rounded-full relative z-10 transition-colors cursor-pointer ${viewMode === mode ? 'text-[var(--sq-ember-400)] font-medium' : 'text-[var(--sq-text-muted)] hover:text-[var(--sq-text)]'}`}
              >
                {mode === 'month' ? 'Month' : 'Agenda'}
              </button>
            ))}
          </div>

        </div>
      </header>
 
      {/* Main View Container */}
      <main className="max-w-md mx-auto p-4 pb-32">
        
        {/* Schedule Compare Trigger */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => {
              fetchFriends()
              fetchCrews()
              setShowFriendPicker(true)
            }}
            className="flex items-center gap-2 bg-[var(--sq-sage-500)] hover:bg-[var(--sq-sage-600)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] px-4 py-2 rounded-full active:scale-95 transition-all cursor-pointer text-xs font-medium uppercase tracking-wider sq-wobbly-pill"
          >
            <CrewIcon size={18} active={true} withShadow={false} />
            Compare schedules
          </button>
          {(selectedFriends.length > 0 || selectedCrews.length > 0) && (
            <button
              onClick={() => {
                setSelectedFriends([])
                setSelectedCrews([])
              }}
              className="text-[10px] text-[var(--sq-heart)] font-medium bg-[var(--sq-surface)] border border-[var(--sq-hairline)] px-3.5 py-1.5 rounded-full cursor-pointer hover:bg-[var(--sq-card-hover)] transition-colors sq-wobbly-pill"
            >
              Clear comparison
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <StickerWrapper withShadow={false}>
              <Loader2 className="w-8 h-8 text-[var(--sq-ember-500)] animate-spin" />
            </StickerWrapper>
            <p className="text-sm text-gray-400 font-semibold">Aligning schedule...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* MONTH VIEW */}
            {viewMode === 'month' && (
              <motion.div
                key="month"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60"
              >
                {/* Friend/Crew Schedule Comparison Legend */}
                {(selectedFriends.length > 0 || selectedCrews.length > 0) && (
                  <div className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 space-y-2">
                    <p className="text-[10px] font-black text-gray-450 dark:text-gray-450 uppercase tracking-wider">Comparing Schedules ({selectedFriends.length} friends, {selectedCrews.length} crews)</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedCrews.map((cId) => {
                        const crewInfo = crewsList.find(c => c.group_id === cId)
                        return (
                          <div key={cId} className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-xl text-[10px] font-extrabold border border-indigo-150 dark:border-indigo-900/50">
                            <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: crewInfo?.group_color || '#6C63FF' }} />
                            <span>👥 {crewInfo?.group_name || 'Crew'}</span>
                          </div>
                        )
                      })}
                      {selectedFriends.map((fId, fIdx) => {
                        const friendInfo = friendsList.find(f => f.id === fId)
                        const color = FRIEND_PALETTE[fIdx % FRIEND_PALETTE.length]
                        return (
                          <div key={fId} className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-xl text-[10px] font-extrabold border border-gray-150 dark:border-gray-700">
                            <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: color }} />
                            <span>{friendInfo?.display_name || friendInfo?.username}</span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Free hint */}
                    {getFreeTimeHints() && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/20 py-1.5 px-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950/30 flex items-center gap-1.5">
                        <span>💡</span>
                        <span>{getFreeTimeHints()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center text-xs font-black text-gray-400 dark:text-gray-500 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx}>{day}</div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-3 gap-x-1 mt-3">
                  {daysInMonth.map((dayObj, idx) => {
                    const dayQuests = getQuestsForDay(dayObj.date)
                    const isToday = today.getFullYear() === dayObj.date.getFullYear() &&
                                    today.getMonth() === dayObj.date.getMonth() &&
                                    today.getDate() === dayObj.date.getDate()
                    
                    // Friend and Crew overlaps
                    const busyFriends: any[] = []
                    Object.keys(friendsCalendars).forEach((fId, fIdx) => {
                      const friendBusy = getFriendBusyOnDay(dayObj.date, fId)
                      if (friendBusy.length > 0) {
                        const friendInfo = friendsList.find(f => f.id === fId)
                        busyFriends.push({
                          id: fId,
                          color: FRIEND_PALETTE[fIdx % FRIEND_PALETTE.length],
                          info: friendInfo,
                          blocks: friendBusy
                        })
                      }
                    })
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDayClick(dayObj.date, dayQuests)}
                        className={`min-h-[64px] flex flex-col items-center justify-between p-1.5 rounded-2xl transition-all relative ${
                          dayObj.isCurrentMonth 
                            ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' 
                            : 'opacity-25 pointer-events-none'
                        } ${isToday ? 'bg-primary/10 border border-primary/20 text-primary font-black shadow-sm' : ''}`}
                      >
                        <span className="text-xs font-bold">{dayObj.day}</span>

                        {/* Event and Friend Dots */}
                        <div className="flex flex-col items-center gap-0.5 mt-1 w-full shrink-0">
                          {/* Main quest dots */}
                          <div className="flex items-center justify-center gap-0.5 h-1.5">
                            {dayQuests.slice(0, 3).map((q) => (
                              <div 
                                key={q.id} 
                                className="w-1.5 h-1.5 rounded-full shrink-0" 
                                style={{ backgroundColor: q.group_color || CATEGORY_COLORS[q.category] || CATEGORY_COLORS.other }}
                              />
                            ))}
                            {dayQuests.length > 3 && (
                              <span className="text-[6px] text-gray-400 font-black">+{dayQuests.length - 3}</span>
                            )}
                          </div>
                          
                          {/* Friend busy dots */}
                          {busyFriends.length > 0 && (
                            <div className="flex items-center justify-center gap-0.5 h-1.5 mt-0.5">
                              {busyFriends.slice(0, 3).map((bf) => (
                                <div
                                  key={bf.id}
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: bf.color }}
                                />
                              ))}
                              {busyFriends.length > 3 && (
                                <span className="text-[6px] text-gray-400 font-black">+{busyFriends.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
 
            {/* AGENDA VIEW */}
            {viewMode === 'agenda' && (
              <motion.div
                key="agenda"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {getAgendaItems().length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center space-y-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <StickerWrapper withShadow={false}>
                      <CalendarDays className="w-12 h-12 text-gray-300 mx-auto" />
                    </StickerWrapper>
                    <p className="text-gray-400 font-bold">No upcoming quests scheduled in your planner yet!</p>
                    <Link
                      to="/quest/create"
                      className="inline-block px-5 py-2.5 bg-primary hover:bg-[#46A302] text-white font-extrabold rounded-2xl active:scale-95 transition-all text-xs"
                    >
                      Organize a Quest
                    </Link>
                  </div>
                ) : (
                  getAgendaItems().map(([dateStr, dayQuests]) => {
                    const isAgToday = new Date(dateStr).toDateString() === today.toDateString()
                    const displayDayTitle = isAgToday ? 'Today' : new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                    
                    return (
                      <div key={dateStr} className="space-y-3">
                        <h3 className="text-sm font-black tracking-wide text-gray-400 uppercase flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isAgToday ? 'bg-primary animate-pulse' : 'bg-gray-300'}`} />
                          {displayDayTitle}
                        </h3>

                        <div className="space-y-3.5">
                          {dayQuests.map((q) => {
                            const startTime = new Date(q.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            const color = q.group_color || CATEGORY_COLORS[q.category] || CATEGORY_COLORS.other
                            const isCreator = q.creator_username === user?.email?.split('@')[0] || (profile?.username && q.creator_username === profile.username)
                            
                            return (
                              <motion.div
                                key={q.id}
                                whileHover={{ y: -2 }}
                                className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700/80 shadow-sm flex items-start gap-4"
                              >
                                {/* Left Time Block */}
                                <div className="text-center shrink-0">
                                  <p className="text-base font-black text-gray-900 dark:text-white tracking-tight">{startTime}</p>
                                  <span 
                                    className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-white mt-1"
                                    style={{ backgroundColor: color }}
                                  >
                                    {q.category}
                                  </span>
                                </div>

                                {/* Right details block */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h4 
                                      onClick={() => navigate({ to: `/quest/${q.id}` })}
                                      className="font-black text-gray-900 dark:text-white cursor-pointer hover:text-primary transition-colors truncate text-sm"
                                    >
                                      {q.name}
                                    </h4>
                                    {isCreator && (
                                      <StickerWrapper withShadow={false}>
                                        <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                                      </StickerWrapper>
                                    )}
                                  </div>

                                  <p className="text-xs text-gray-400 font-semibold flex items-center gap-1 mt-1 truncate">
                                    <StickerWrapper withShadow={false}>
                                      <MapPin className="w-3.5 h-3.5 text-gray-300" />
                                    </StickerWrapper>
                                    {q.location_name}
                                  </p>

                                  <div className="mt-3 flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-lg">
                                      <StickerWrapper withShadow={false}>
                                        <Users className="w-3 h-3 text-gray-350" />
                                      </StickerWrapper>
                                      {q.attendee_count} going
                                    </div>
                                    {q.group_name && (
                                      <div 
                                        className="text-[10px] font-black px-2 py-0.5 rounded-lg text-white"
                                        style={{ backgroundColor: q.group_color || '#6C63FF' }}
                                      >
                                        👥 {q.group_name}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* RSVP state styling indicator */}
                                <div className="self-center">
                                  {isCreator ? (
                                    <div className="text-[10px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 px-2.5 py-1.5 rounded-xl border border-purple-100">
                                      Host Crown
                                    </div>
                                  ) : q.my_status === 'accepted' ? (
                                    <div className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1.5 rounded-xl shadow-sm">
                                      Going ✓
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleDayClick(new Date(q.starts_at), [q])}
                                      className="text-[10px] font-black border-2 border-dashed border-primary text-primary hover:bg-primary/5 px-2.5 py-1.5 rounded-xl cursor-pointer"
                                    >
                                      Invited
                                    </button>
                                  )}
                                </div>

                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

      {/* Friend Picker Modal */}
      <AnimatePresence>
        {showFriendPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: Z_INDEX.popups_menus - 5 }}
              onClick={() => setShowFriendPicker(false)}
              className="fixed inset-0 bg-black/45 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              style={{ zIndex: Z_INDEX.popups_menus }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-150 dark:border-gray-700 shadow-2xl focus:outline-none"
            >
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Compare Schedules</h3>
              <p className="text-xs text-gray-400 font-bold mb-4">Select friends and crews to overlay busy slots on your calendar.</p>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar mb-6 pr-1">
                {/* Crews Section */}
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    👥 Crews
                  </h4>
                  {crewsList.length === 0 ? (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold text-center py-2 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl">No crews joined yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {crewsList.map((crew) => {
                        const isSelected = selectedCrews.includes(crew.group_id)
                        return (
                          <button
                            key={crew.group_id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCrews(selectedCrews.filter(id => id !== crew.group_id))
                              } else {
                                setSelectedCrews([...selectedCrews, crew.group_id])
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all text-left ${
                              isSelected 
                                ? 'bg-primary/5 border-primary/45 text-primary' 
                                : 'bg-gray-50/30 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-xl text-white font-black flex items-center justify-center text-xs" 
                                style={{ backgroundColor: crew.group_color || '#6C63FF' }}
                              >
                                {crew.group_name[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{crew.group_name}</p>
                                <p className="text-[9px] text-gray-400 font-bold mt-1">{crew.member_count} members</p>
                              </div>
                            </div>
                            
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                              {isSelected && <span className="text-[8px] font-black">✓</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Friends Section */}
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    👤 Friends
                  </h4>
                  {friendsList.length === 0 ? (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold text-center py-2 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl">No accepted friends yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {friendsList.map((friend) => {
                        const isSelected = selectedFriends.includes(friend.id)
                        return (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedFriends(selectedFriends.filter(id => id !== friend.id))
                              } else {
                                setSelectedFriends([...selectedFriends, friend.id])
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all text-left ${
                              isSelected 
                                ? 'bg-primary/5 border-primary/45 text-primary' 
                                : 'bg-gray-50/30 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {friend.avatar_url ? (
                                <img src={friend.avatar_url} className="w-8 h-8 rounded-xl object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-xl text-white font-bold flex items-center justify-center text-xs" style={{ backgroundColor: friend.profile_color || '#6C63FF' }}>
                                  {friend.username[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{friend.display_name || friend.username}</p>
                                <p className="text-[9px] text-gray-400 font-bold mt-1">Level {friend.level}</p>
                              </div>
                            </div>
                            
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                              {isSelected && <span className="text-[8px] font-black">✓</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowFriendPicker(false)}
                className="w-full py-3 bg-primary text-white font-extrabold rounded-2xl shadow-lg active:scale-95 transition-all text-sm cursor-pointer"
              >
                Compare ({selectedFriends.length + selectedCrews.length})
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Day Details Bottom Sheet Drawer (Anchored ABOVE bottom nav) */}
      <AnimatePresence>
        {selectedDay && (
          <>
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: Z_INDEX.bottom_sheets - 5 }}
              onClick={() => setSelectedDay(null)}
              className="fixed inset-0 bg-black/45 backdrop-blur-sm"
            />
            {/* Floating Sheet */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ zIndex: Z_INDEX.bottom_sheets }}
              className="fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-150 dark:border-gray-700 focus:outline-none"
            >
              <div className="w-12 h-1.5 bg-gray-255 dark:bg-gray-700 rounded-full mx-auto mb-5" />
              
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    {selectedQuests.length} planned quests
                  </p>
                </div>
                
                <Link
                  to="/quest/create"
                  className="flex items-center gap-1 bg-primary text-white text-xs font-black px-3.5 py-2 rounded-2xl active:scale-95 transition-transform"
                >
                  <StickerWrapper withShadow={false}>
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </StickerWrapper>
                  Quest
                </Link>
              </div>

              {/* Day's Quests List */}
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                {selectedQuests.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-sm text-gray-400 font-bold">No quests planned for this day.</p>
                    <p className="text-[11px] text-gray-300">Tap "+ Quest" above to organize one!</p>
                  </div>
                ) : (
                  selectedQuests.map((q) => {
                    const isCreator = q.creator_username === user?.email?.split('@')[0] || (profile?.username && q.creator_username === profile.username)
                    const color = q.group_color || CATEGORY_COLORS[q.category] || CATEGORY_COLORS.other
                    const timeRange = new Date(q.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <div 
                        key={q.id} 
                        className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 
                                onClick={() => { setSelectedDay(null); navigate({ to: `/quest/${q.id}` }) }}
                                className="font-extrabold text-sm text-gray-950 dark:text-white hover:text-primary cursor-pointer transition-colors"
                              >
                                {q.name}
                              </h4>
                              {isCreator && (
                                <StickerWrapper withShadow={false}>
                                  <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                </StickerWrapper>
                              )}
                            </div>
                            
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-1">
                              <StickerWrapper withShadow={false}>
                                <Clock className="w-3 h-3 text-gray-300" />
                              </StickerWrapper>
                              {timeRange} • {q.location_name}
                            </p>
                          </div>

                          <div 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: color }}
                          />
                        </div>

                        {/* RSVPs section */}
                        <div className="mt-4 flex items-center gap-2">
                          {isCreator ? (
                            <span className="text-xs font-black text-purple-600 bg-purple-50 dark:bg-purple-950/20 px-3 py-1.5 rounded-xl border border-purple-100">
                              Host Crown
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRSVP(q.id, 'accepted')}
                                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all active:scale-95 ${q.my_status === 'accepted' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'}`}
                              >
                                Going
                              </button>
                              <button
                                onClick={() => handleRSVP(q.id, 'declined')}
                                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all active:scale-95 ${q.my_status === 'declined' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'}`}
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>

                      </div>
                    )
                  })
                )}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
