import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import { 
  Flame, 
  Users, 
  Plus, 
  AlertTriangle, 
  Sparkles, 
  Check, 
  Loader2,
  ChevronLeft
} from 'lucide-react'
import { useToastStore } from '../stores/toastStore'

interface StreakGroup {
  group_id: string
  group_name: string
  group_color: string
  group_avatar: string | null
  current_streak: number
  longest_streak: number
  last_quest_at: string | null
  streak_frozen: boolean
  member_count: number
  days_until_break: number
  next_milestone: number
  is_at_risk: boolean
}

export function StreaksPage() {
  const { profile, user } = useAuthStore()
  const { addToast } = useToastStore()
  const [streaks, setStreaks] = useState<StreakGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Create group form state
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupColor, setGroupColor] = useState('#6C63FF')
  const [creating, setCreating] = useState(false)

  const presetColors = ['#58CC02', '#6C63FF', '#FF6B6B', '#FFD93D', '#3498DB', '#E67E22']

  const fetchStreaksData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_my_streaks')
      if (error) throw error
      setStreaks(data as StreakGroup[] || [])
    } catch (err: any) {
      console.error('Error fetching streaks:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStreaksData()
  }, [])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return

    try {
      setCreating(true)
      
      // 1. Insert the quest group
      const { data: newGroup, error: groupErr } = await supabase
        .from('quest_groups')
        .insert({
          name: groupName.trim(),
          description: groupDesc.trim() || null,
          group_color: groupColor,
          created_by: user?.id,
          streak: 0,
          longest_streak: 0,
          member_count: 1
        })
        .select()
        .single()

      if (groupErr) throw groupErr

      // 2. Insert creator into group members
      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          user_id: user?.id || '',
          role: 'creator'
        })

      if (memberErr) throw memberErr

      addToast({
        message: `Group "${groupName}" created! 👥`,
      })

      setGroupName('')
      setGroupDesc('')
      setIsCreateModalOpen(false)
      fetchStreaksData()
    } catch (err: any) {
      console.error('Error creating group:', err.message)
      addToast({
        message: err.message || 'Failed to create group',
      })
    } finally {
      setCreating(false)
    }
  }

  const getFlameStyles = (streak: number) => {
    if (streak <= 2) return { color: '#A8A8B3', bgClass: 'bg-gray-100 dark:bg-gray-800 text-gray-400' }
    if (streak <= 6) return { color: '#E67E22', bgClass: 'bg-orange-100 dark:bg-orange-950/30 text-orange-500' }
    if (streak <= 13) return { color: '#FF6B35', bgClass: 'bg-amber-100 dark:bg-amber-950/30 text-amber-500 font-bold' }
    if (streak <= 29) return { color: '#FF3B30', bgClass: 'bg-red-100 dark:bg-red-950/30 text-red-500 font-bold shadow-lg shadow-red-500/20' }
    if (streak <= 49) return { color: '#FFD93D', bgClass: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-500 font-bold shadow-lg shadow-yellow-500/20 animate-pulse' }
    return { color: 'rainbow', bgClass: 'bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white font-extrabold shadow-lg animate-pulse' }
  }

  const overallStreak = profile?.current_streak || 0
  const overallLongest = profile?.longest_streak || 0

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            to="/map"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500 animate-bounce" fill="currentColor" />
            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Streaks Hub</h1>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-md mx-auto p-4 pt-6 pb-32 space-y-6">
        
        {/* Personal Streak Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/10"
        >
          {/* Decorative Sparkles */}
          <div className="absolute top-2 right-2 opacity-35">
            <Sparkles className="w-16 h-16 text-white/40" />
          </div>

          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black tracking-wider uppercase bg-white/20 px-2.5 py-1 rounded-full text-white/95">
                Active Personal Streak
              </span>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-6xl font-black tracking-tight">{overallStreak}</span>
                <span className="text-xl font-bold text-orange-100">days</span>
              </div>
            </div>
            
            {/* Animated Flame Icon */}
            <motion.div
              animate={{ 
                scale: [1, 1.08, 0.96, 1.04, 1],
                rotate: [0, 3, -3, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="p-3 bg-white/20 rounded-2xl"
            >
              <Flame className="w-12 h-12 text-white" fill="currentColor" />
            </motion.div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-orange-50">
            <div>
              <p className="opacity-75">Personal Best</p>
              <p className="font-extrabold text-white text-lg">{overallLongest} days 🔥</p>
            </div>
            {overallStreak >= 5 && (
              <span className="bg-emerald-500/30 px-3 py-1 rounded-xl text-xs font-black">
                ON FIRE!
              </span>
            )}
          </div>
        </motion.div>

        {/* Section Title */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Crew Streaks
          </h2>
          <span className="text-xs text-gray-400 font-bold bg-gray-200/50 dark:bg-gray-800 px-2 py-1 rounded-lg">
            {streaks.length} Joined
          </span>
        </div>

        {/* Loading / Empty states */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-gray-400 font-semibold">Loading your crew streaks...</p>
          </div>
        ) : streaks.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-dashed border-gray-200 dark:border-gray-700 text-center space-y-4 shadow-sm"
          >
            <p className="text-gray-400 font-bold">You aren't in any quest groups yet! Start a Crew to build streaks together.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-primary hover:bg-[#46A302] text-white font-extrabold rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
            >
              Create New Crew
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {streaks.map((crew, idx) => {
              const { color: flameColor, bgClass } = getFlameStyles(crew.current_streak)
              const percent = Math.min(100, Math.round((crew.current_streak / crew.next_milestone) * 100))
              const isRainbow = flameColor === 'rainbow'
              const lastQuestDate = crew.last_quest_at ? new Date(crew.last_quest_at).toLocaleDateString() : 'Never'

              return (
                <motion.div
                  key={crew.group_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Crew Badge/Color */}
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg relative"
                        style={{ backgroundColor: crew.group_color }}
                      >
                        {crew.group_name[0].toUpperCase()}
                        {crew.streak_frozen && (
                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 text-[8px]">
                            ❄️
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-black text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {crew.group_name}
                        </h3>
                        <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5 mt-0.5">
                          <Users className="w-3.5 h-3.5" />
                          {crew.member_count} members • Last quest: {lastQuestDate}
                        </p>
                      </div>
                    </div>

                    {/* Streak Badge */}
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl ${isRainbow ? 'bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white font-extrabold shadow-lg animate-pulse' : bgClass}`}>
                      <motion.div
                        animate={{ 
                          scale: [1, 1.08, 0.96, 1.04, 1],
                          rotate: [0, 3, -3, 1, 0]
                        }}
                        transition={{
                          duration: 1.5 + Math.random(),
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Flame 
                          className="w-4.5 h-4.5" 
                          fill={isRainbow ? 'currentColor' : flameColor} 
                          stroke={isRainbow ? 'none' : flameColor} 
                        />
                      </motion.div>
                      <span className="text-sm font-black tracking-tight">{crew.current_streak}</span>
                    </div>
                  </div>

                  {/* Warning message if at risk */}
                  {crew.is_at_risk && (
                    <div className="mt-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 p-2.5 rounded-2xl text-xs font-bold border border-amber-100 dark:border-amber-950/30">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Streak at risk! {crew.days_until_break} days left to do a quest!</span>
                    </div>
                  )}

                  {/* Progress Milestone Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">
                      <span>Next milestone: {crew.next_milestone} days</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[#8BF131]"
                        style={isRainbow ? { background: 'linear-gradient(90deg, #ff007f, #7f00ff, #007fff)' } : {}}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

      </main>

      {/* Create Crew Modal Dialog */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <>
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
            />
            {/* Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700 focus:outline-none"
            >
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <Users className="w-6 h-6 text-primary" />
                Assemble a New Crew
              </h2>
              <p className="text-xs font-semibold text-gray-400 mb-5">
                Rally your friends to tackle quests together, maintain a unified streak flame, and earn exclusive team rewards!
              </p>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Crew Name
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Taco Tuesday Alliance"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Description / Vibe
                  </label>
                  <textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Describe your crew's focus..."
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Crew Banner Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setGroupColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform active:scale-90 ${groupColor === color ? 'ring-4 ring-primary ring-offset-2 dark:ring-offset-gray-800 scale-105' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-1/2 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 font-extrabold rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-1/2 py-3 bg-primary hover:bg-[#46A302] disabled:bg-primary/50 text-white font-extrabold rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-primary/25"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                        Assemble
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
