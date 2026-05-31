import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { 
  ChevronLeft, 
  Flame, 
  Trophy, 
  Users, 
  Award, 
  Sparkles, 
  Crown, 
  Loader2 
} from 'lucide-react'
import { Z_INDEX } from '../lib/zIndex'

interface PersonalStreakRank {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  level: number
  current_streak: number
  longest_streak: number
}

interface GroupStreakRank {
  id: string
  name: string
  group_color: string
  avatar_url: string | null
  streak: number
  longest_streak: number
  member_count: number
}

interface LeaderboardData {
  personal_streaks: PersonalStreakRank[]
  group_streaks: GroupStreakRank[]
  my_rank_personal: number
}

export function LeaderboardPage() {
  const { user, profile } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState<'personal' | 'crews'>('personal')
  const [data, setData] = useState<LeaderboardData>({
    personal_streaks: [],
    group_streaks: [],
    my_rank_personal: 1
  })
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchLeaderboards = async () => {
    try {
      setLoading(true)
      
      // 1. Fetch leaderboard ranking data from RPC
      const { data: rankData, error: rankError } = await supabase.rpc('get_leaderboards' as any)
      if (rankError) throw rankError
      
      // 2. Fetch user's crews to highlight them
      const { data: crewData, error: crewError } = await supabase.rpc('get_my_streaks')
      if (!crewError && crewData) {
        const ids = new Set((crewData as any[]).map(c => c.group_id))
        setMyGroupIds(ids)
      }

      setData(rankData as LeaderboardData || {
        personal_streaks: [],
        group_streaks: [],
        my_rank_personal: 1
      })
    } catch (err: any) {
      console.error('Error fetching leaderboards:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboards()
  }, [])

  const getFlameStyles = (streak: number) => {
    if (streak <= 2) return { color: '#A8A8B3', bgClass: 'bg-gray-150 dark:bg-gray-800 text-gray-400' }
    if (streak <= 6) return { color: '#E67E22', bgClass: 'bg-orange-100 dark:bg-orange-950/30 text-orange-500' }
    if (streak <= 13) return { color: '#FF6B35', bgClass: 'bg-amber-100 dark:bg-amber-950/30 text-amber-500 font-bold' }
    if (streak <= 29) return { color: '#FF3B30', bgClass: 'bg-red-100 dark:bg-red-950/30 text-red-500 font-bold' }
    if (streak <= 49) return { color: '#FFD93D', bgClass: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-500 font-bold shadow-lg shadow-yellow-500/10' }
    return { color: 'rainbow', bgClass: 'bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white font-extrabold shadow-sm' }
  }

  // Personal top 3 podium lists
  const personalTop3 = data.personal_streaks.slice(0, 3)
  const personalList = data.personal_streaks.slice(3)

  // Crews top 3 podium lists
  const crewTop3 = data.group_streaks.slice(0, 3)
  const crewList = data.group_streaks.slice(3)

  const isCurrentUserInTop50 = data.personal_streaks.some(p => p.id === user?.id)

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
            
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
              <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Leaderboards</h1>
            </div>
            
            <div className="w-10" />
          </div>

          {/* Tab switches */}
          <div className="mt-4 flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl relative">
            <div 
              className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-xl shadow-sm transition-all duration-300 ease-out z-0"
              style={{
                left: `${activeTab === 'personal' ? 4 : 50}%`,
                width: '46%',
              }}
            />
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 py-2 text-xs font-black capitalize tracking-wider rounded-xl relative z-10 transition-colors cursor-pointer ${activeTab === 'personal' ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}
            >
              Personal 🔥
            </button>
            <button
              onClick={() => setActiveTab('crews')}
              className={`flex-1 py-2 text-xs font-black capitalize tracking-wider rounded-xl relative z-10 transition-colors cursor-pointer ${activeTab === 'crews' ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}
            >
              Crews 🔥
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 pb-36">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-gray-400 font-semibold">Tallying daily flames...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* PERSONAL TAB */}
            {activeTab === 'personal' && (
              <motion.div
                key="personal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* My Rank Banner if not in Top 3 */}
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-3xl p-4 text-white shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-yellow-100" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-yellow-100">Your Current Standing</h4>
                      <p className="text-base font-black">You are ranked <span className="text-lg">#{data.my_rank_personal}</span> overall</p>
                    </div>
                  </div>
                  <Sparkles className="w-6 h-6 text-white/50 animate-pulse" />
                </div>

                {/* Podium Top 3 */}
                {personalTop3.length > 0 && (
                  <div className="flex items-end justify-center gap-2 pt-6 pb-2">
                    
                    {/* 2nd Place */}
                    {personalTop3[1] && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center flex-1 max-w-[100px]"
                      >
                        <div className="relative">
                          {personalTop3[1].avatar_url ? (
                            <img src={personalTop3[1].avatar_url} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-300" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg" style={{ backgroundColor: '#A8A8B3' }}>
                              {personalTop3[1].username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -top-2 -right-2 bg-slate-300 text-slate-800 text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">2</span>
                        </div>
                        <p className="text-[10px] font-black text-center truncate w-full mt-2 text-gray-900 dark:text-white">
                          {personalTop3[1].display_name || personalTop3[1].username}
                        </p>
                        <div className="flex items-center gap-0.5 text-[10px] text-gray-400 font-bold">
                          <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" />
                          <span>{personalTop3[1].current_streak}</span>
                        </div>
                      </motion.div>
                    )}

                    {/* 1st Place */}
                    {personalTop3[0] && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center flex-1 max-w-[120px] -mt-6 z-10"
                      >
                        <div className="relative">
                          <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-500 animate-bounce" fill="currentColor" />
                          {personalTop3[0].avatar_url ? (
                            <img src={personalTop3[0].avatar_url} className="w-18 h-18 rounded-3xl object-cover border-4 border-yellow-400" />
                          ) : (
                            <div className="w-18 h-18 rounded-3xl flex items-center justify-center text-white font-black text-2xl border-4 border-yellow-400" style={{ backgroundColor: '#FFD93D' }}>
                              {personalTop3[0].username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md">1</span>
                        </div>
                        <p className="text-xs font-black text-center truncate w-full mt-2 text-gray-900 dark:text-white">
                          {personalTop3[0].display_name || personalTop3[0].username}
                        </p>
                        <div className="flex items-center gap-0.5 text-[11px] text-orange-650 font-black">
                          <Flame className="w-4 h-4 text-orange-500 fill-current animate-pulse" />
                          <span>{personalTop3[0].current_streak}</span>
                        </div>
                      </motion.div>
                    )}

                    {/* 3rd Place */}
                    {personalTop3[2] && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-center flex-1 max-w-[100px]"
                      >
                        <div className="relative">
                          {personalTop3[2].avatar_url ? (
                            <img src={personalTop3[2].avatar_url} className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-600" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg" style={{ backgroundColor: '#D35400' }}>
                              {personalTop3[2].username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">3</span>
                        </div>
                        <p className="text-[10px] font-black text-center truncate w-full mt-2 text-gray-900 dark:text-white">
                          {personalTop3[2].display_name || personalTop3[2].username}
                        </p>
                        <div className="flex items-center gap-0.5 text-[10px] text-gray-400 font-bold">
                          <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" />
                          <span>{personalTop3[2].current_streak}</span>
                        </div>
                      </motion.div>
                    )}

                  </div>
                )}

                {/* Ranked List */}
                <div className="space-y-2.5">
                  {personalList.map((player, idx) => {
                    const isSelf = player.id === user?.id
                    const rank = idx + 4
                    const { color: flameColor, bgClass } = getFlameStyles(player.current_streak)
                    const isRainbow = flameColor === 'rainbow'

                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          isSelf 
                            ? 'bg-primary/10 border-primary shadow-md' 
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/80 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-gray-400 w-5">{rank}</span>
                          
                          {player.avatar_url ? (
                            <img src={player.avatar_url} className="w-9 h-9 rounded-xl object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl text-white font-black flex items-center justify-center text-xs" style={{ backgroundColor: isSelf ? '#58CC02' : '#6C63FF' }}>
                              {player.username[0].toUpperCase()}
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-black text-gray-900 dark:text-white leading-none">
                              {player.display_name || player.username}
                            </p>
                            <p className="text-[9px] text-gray-400 font-bold mt-1">Level {player.level}</p>
                          </div>
                        </div>

                        {/* Flame Streak */}
                        <div className={`flex items-center gap-0.5 px-2.5 py-1 rounded-xl ${isRainbow ? 'bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white font-extrabold animate-pulse' : bgClass}`}>
                          <Flame 
                            className="w-3.5 h-3.5 fill-current" 
                            style={!isRainbow ? { color: flameColor } : {}}
                          />
                          <span className="text-[11px] font-black">{player.current_streak}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Sticky Row for User if outside Top 50 */}
                {!isCurrentUserInTop50 && user && (
                  <div 
                    style={{ zIndex: Z_INDEX.bottom_nav - 5 }}
                    className="fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-primary text-white border-2 border-white/20 p-3.5 rounded-3xl shadow-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-white/70 w-5">#{data.my_rank_personal}</span>
                      <div className="w-9 h-9 rounded-xl bg-white/20 text-white font-black flex items-center justify-center text-xs border border-white/20">
                        {profile?.username ? profile.username[0].toUpperCase() : 'Y'}
                      </div>
                      <div>
                        <p className="text-xs font-black leading-none">{profile?.display_name || profile?.username || 'You'}</p>
                        <p className="text-[9px] text-white/70 font-bold mt-1">Level {profile?.level || 1}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 px-2.5 py-1 bg-white/20 rounded-xl text-[11px] font-black">
                      <Flame className="w-3.5 h-3.5 fill-current text-white animate-pulse" />
                      <span>{profile?.current_streak || 0}</span>
                    </div>
                  </div>
                )}

              </motion.div>
            )}

            {/* CREWS TAB */}
            {activeTab === 'crews' && (
              <motion.div
                key="crews"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Podium Top 3 */}
                {crewTop3.length > 0 && (
                  <div className="flex items-end justify-center gap-2 pt-6 pb-2">
                    
                    {/* 2nd Place */}
                    {crewTop3[1] && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center flex-1 max-w-[100px]"
                      >
                        <div className="relative">
                          {crewTop3[1].avatar_url ? (
                            <img src={crewTop3[1].avatar_url} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-300" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg border-2 border-slate-300" style={{ backgroundColor: crewTop3[1].group_color }}>
                              {crewTop3[1].name[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -top-2 -right-2 bg-slate-300 text-slate-800 text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">2</span>
                        </div>
                        <p className="text-[10px] font-black text-center truncate w-full mt-2 text-gray-900 dark:text-white">
                          {crewTop3[1].name}
                        </p>
                        <div className="flex items-center gap-0.5 text-[10px] text-gray-400 font-bold">
                          <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" />
                          <span>{crewTop3[1].streak}</span>
                        </div>
                      </motion.div>
                    )}

                    {/* 1st Place */}
                    {crewTop3[0] && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center flex-1 max-w-[120px] -mt-6 z-10"
                      >
                        <div className="relative">
                          <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-500 animate-bounce" fill="currentColor" />
                          {crewTop3[0].avatar_url ? (
                            <img src={crewTop3[0].avatar_url} className="w-18 h-18 rounded-3xl object-cover border-4 border-yellow-400" />
                          ) : (
                            <div className="w-18 h-18 rounded-3xl flex items-center justify-center text-white font-black text-2xl border-4 border-yellow-400" style={{ backgroundColor: crewTop3[0].group_color }}>
                              {crewTop3[0].name[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md">1</span>
                        </div>
                        <p className="text-xs font-black text-center truncate w-full mt-2 text-gray-900 dark:text-white">
                          {crewTop3[0].name}
                        </p>
                        <div className="flex items-center gap-0.5 text-[11px] text-orange-650 font-black">
                          <Flame className="w-4 h-4 text-orange-500 fill-current animate-pulse" />
                          <span>{crewTop3[0].streak}</span>
                        </div>
                      </motion.div>
                    )}

                    {/* 3rd Place */}
                    {crewTop3[2] && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-center flex-1 max-w-[100px]"
                      >
                        <div className="relative">
                          {crewTop3[2].avatar_url ? (
                            <img src={crewTop3[2].avatar_url} className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-600" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg border-2 border-amber-600" style={{ backgroundColor: crewTop3[2].group_color }}>
                              {crewTop3[2].name[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">3</span>
                        </div>
                        <p className="text-[10px] font-black text-center truncate w-full mt-2 text-gray-900 dark:text-white">
                          {crewTop3[2].name}
                        </p>
                        <div className="flex items-center gap-0.5 text-[10px] text-gray-400 font-bold">
                          <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" />
                          <span>{crewTop3[2].streak}</span>
                        </div>
                      </motion.div>
                    )}

                  </div>
                )}

                {/* Ranked List */}
                <div className="space-y-2.5">
                  {crewList.map((crew, idx) => {
                    const isMember = myGroupIds.has(crew.id)
                    const rank = idx + 4
                    const { color: flameColor, bgClass } = getFlameStyles(crew.streak)
                    const isRainbow = flameColor === 'rainbow'

                    return (
                      <motion.div
                        key={crew.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          isMember 
                            ? 'bg-indigo-500/10 border-indigo-500 shadow-md animate-pulse' 
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/80 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-gray-400 w-5">{rank}</span>
                          
                          {crew.avatar_url ? (
                            <img src={crew.avatar_url} className="w-9 h-9 rounded-xl object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl text-white font-black flex items-center justify-center text-xs" style={{ backgroundColor: crew.group_color }}>
                              {crew.name[0].toUpperCase()}
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-black text-gray-900 dark:text-white leading-none">
                              {crew.name}
                            </p>
                            <p className="text-[9px] text-gray-450 dark:text-gray-400 font-bold mt-1 flex items-center gap-1">
                              <Users className="w-3 h-3 text-gray-300" />
                              {crew.member_count} members
                            </p>
                          </div>
                        </div>

                        {/* Flame Streak */}
                        <div className={`flex items-center gap-0.5 px-2.5 py-1 rounded-xl ${isRainbow ? 'bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white font-extrabold' : bgClass}`}>
                          <Flame 
                            className="w-3.5 h-3.5 fill-current" 
                            style={!isRainbow ? { color: flameColor } : {}}
                          />
                          <span className="text-[11px] font-black">{crew.streak}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

    </div>
  )
}
