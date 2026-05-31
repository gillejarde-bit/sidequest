import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  Crown, 
  Plus, 
  Loader2,
  CalendarDays
} from 'lucide-react'
import { useToastStore } from '../stores/toastStore'

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

export function CalendarPage() {
  const { user, profile } = useAuthStore()
  const { addToast } = useToastStore()
  const navigate = useNavigate()
  
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [quests, setQuests] = useState<CalendarQuest[]>([])
  const [loading, setLoading] = useState(true)
  
  // Month details popup bottom sheet
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedQuests, setSelectedQuests] = useState<CalendarQuest[]>([])

  const weekScrollRef = useRef<HTMLDivElement>(null)

  // Fetch calendar quests from RPC
  const fetchCalendarData = async () => {
    try {
      setLoading(true)
      // Query range: 35 days before to 35 days after the current date to cover all views safely
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

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate])

  const handlePrevDate = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000))
    }
  }

  const handleNextDate = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))
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
    
    // Fill previous month days (blank/disabled)
    const prevMonthNumDays = new Date(year, month, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthNumDays - i,
        date: new Date(year, month - 1, prevMonthNumDays - i),
        isCurrentMonth: false
      })
    }
    
    // Fill current month days
    for (let i = 1; i <= numDays; i++) {
      days.push({
        day: i,
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }

    // Fill next month days
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
      
      // Update local states
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

  // Week View dates (Starts on Sunday of current date's week)
  const getWeekDates = (date: Date) => {
    const currentDay = date.getDay()
    const startOfWeek = new Date(date.getTime() - currentDay * 24 * 60 * 60 * 1000)
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000)
      return d
    })
  }

  // Group agenda items by date string
  const getAgendaItems = () => {
    const grouped: Record<string, CalendarQuest[]> = {}
    quests.forEach(q => {
      const dateStr = new Date(q.starts_at).toDateString()
      if (!grouped[dateStr]) grouped[dateStr] = []
      grouped[dateStr].push(q)
    })
    return Object.entries(grouped).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
  }

  const weekDates = getWeekDates(currentDate)
  const daysInMonth = getDaysInMonth(currentDate)
  const today = new Date()

  // Format month name
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 pt-4 pb-2">
          
          <div className="flex items-center justify-between">
            <Link 
              to="/map"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            
            {/* Title / Date navigation */}
            <div className="flex items-center gap-1.5 font-black text-gray-900 dark:text-white">
              <button onClick={handlePrevDate} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <span className="text-base tracking-tight">{monthName}</span>
              <button onClick={handleNextDate} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <Link 
              to="/quest/create"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Sliding segment selector */}
          <div className="mt-4 flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl relative">
            <div 
              className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-xl shadow-sm transition-all duration-300 ease-out z-0"
              style={{
                left: `${viewMode === 'month' ? 4 : viewMode === 'week' ? 33.3 : 66.6}%`,
                width: '31%',
              }}
            />
            {['month', 'week', 'agenda'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`flex-1 py-2 text-xs font-black capitalize tracking-wider rounded-xl relative z-10 transition-colors cursor-pointer ${viewMode === mode ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                {mode}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* Main View Container */}
      <main className="max-w-md mx-auto p-4 pb-32">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handleDayClick(dayObj.date, dayQuests)}
                        className={`min-h-[56px] flex flex-col items-center justify-between p-1.5 rounded-2xl transition-all relative ${
                          dayObj.isCurrentMonth 
                            ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' 
                            : 'opacity-25 pointer-events-none'
                        } ${isToday ? 'bg-primary/10 border border-primary/20 text-primary font-black shadow-sm' : ''}`}
                      >
                        <span className="text-xs font-bold">{dayObj.day}</span>

                        {/* Event Dots */}
                        <div className="flex items-center justify-center gap-0.5 mt-1 h-3">
                          {dayQuests.slice(0, 3).map((q) => (
                            <div 
                              key={q.id} 
                              className="w-1.5 h-1.5 rounded-full shrink-0" 
                              style={{ backgroundColor: q.group_color || CATEGORY_COLORS[q.category] || CATEGORY_COLORS.other }}
                            />
                          ))}
                          {dayQuests.length > 3 && (
                            <span className="text-[7px] text-gray-400 font-extrabold">+{dayQuests.length - 3}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
              <motion.div
                key="week"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden"
              >
                {/* Horizontal Scroll Columns wrapper */}
                <div 
                  ref={weekScrollRef}
                  className="flex overflow-x-auto gap-4 pb-2 no-scrollbar scroll-smooth"
                >
                  {weekDates.map((weekDate, wIdx) => {
                    const dayQuests = getQuestsForDay(weekDate)
                    const isToday = today.getFullYear() === weekDate.getFullYear() &&
                                    today.getMonth() === weekDate.getMonth() &&
                                    today.getDate() === weekDate.getDate()
                    const dayName = weekDate.toLocaleString('default', { weekday: 'short' })
                    
                    return (
                      <div 
                        key={wIdx} 
                        className={`min-w-[120px] bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 relative ${isToday ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/5' : ''}`}
                      >
                        <div className="text-center pb-2 border-b border-gray-200 dark:border-gray-850">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{dayName}</p>
                          <p className={`text-base font-black tracking-tight mt-0.5 ${isToday ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                            {weekDate.getDate()}
                          </p>
                        </div>

                        {/* Quests listed vertically inside day column */}
                        <div className="mt-3 space-y-2 h-[260px] overflow-y-auto no-scrollbar">
                          {dayQuests.length === 0 ? (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold text-center pt-8">No quests</p>
                          ) : (
                            dayQuests.map((q) => {
                              const qTime = new Date(q.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              const color = q.group_color || CATEGORY_COLORS[q.category] || CATEGORY_COLORS.other
                              
                              return (
                                <Link
                                  key={q.id}
                                  to="/quest/$id"
                                  params={{ id: q.id }}
                                  className="block p-2 rounded-xl text-left transition-all hover:scale-[1.02] border border-transparent shadow-sm"
                                  style={{ 
                                    backgroundColor: `${color}15`, 
                                    borderLeftColor: color, 
                                    borderLeftWidth: '3px' 
                                  }}
                                >
                                  <p className="text-[9px] font-black tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {qTime}
                                  </p>
                                  <p className="text-[11px] font-black text-gray-950 dark:text-white truncate mt-0.5">{q.name}</p>
                                </Link>
                              )
                            })
                          )}
                        </div>

                        {/* Red Line for current time indicator */}
                        {isToday && (
                          <div 
                            className="absolute left-0 right-0 h-0.5 bg-red-500/60 z-10 flex items-center justify-end"
                            style={{
                              top: `${60 + (today.getHours() / 24) * 220}px`
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 -mr-1" />
                          </div>
                        )}

                      </div>
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
                    <CalendarDays className="w-12 h-12 text-gray-300 mx-auto" />
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
                                    {isCreator && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                                  </div>

                                  <p className="text-xs text-gray-400 font-semibold flex items-center gap-1 mt-1 truncate">
                                    <MapPin className="w-3.5 h-3.5 text-gray-300" />
                                    {q.location_name}
                                  </p>

                                  <div className="mt-3 flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-lg">
                                      <Users className="w-3 h-3 text-gray-350" />
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
                                      Crown Host
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

      {/* Day Details Bottom Sheet Drawer */}
      <AnimatePresence>
        {selectedDay && (
          <>
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-800 rounded-t-3xl p-6 z-50 shadow-2xl border-t border-gray-100 dark:border-gray-700 pb-safe"
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
              
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
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Quest
                </Link>
              </div>

              {/* Day's Quests List */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
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
                        className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl"
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
                              {isCreator && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                            </div>
                            
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-gray-300" />
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
