import { createRootRoute, createRoute, createRouter, redirect, Outlet, Link, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth'
import { Login } from './login'
import { Onboarding } from './onboarding'
import { FriendsPage } from './friends'
import { QuestsPage } from './quests'
import { supabase } from '../lib/supabase'
import { Map as MapIcon, Users, User, Plus, Settings as SettingsIcon, MoreHorizontal, Flame, Calendar, ChevronRight, Swords, Diamond, Trophy } from 'lucide-react'
import { usePendingRequests } from '../hooks/useFriends'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../stores/settingsStore'
import { useEffect, useState } from 'react'
import { Z_INDEX } from '../lib/zIndex'
import { useQuery } from '@tanstack/react-query'

function BottomNav() {
  const { count } = usePendingRequests()
  const { pathname } = useLocation()
  const { user } = useAuthStore()
  const [showMore, setShowMore] = useState(false)

  // Real-time polling for pending quest invites
  const { data: inviteCount = 0 } = useQuery({
    queryKey: ['pending-quest-invites-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0
      const { count: exactCount, error } = await supabase
        .from('quest_invites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')
      if (error) return 0
      return exactCount || 0
    },
    enabled: !!user?.id,
    refetchInterval: 10000 // Poll every 10 seconds for real-time responsiveness
  })

  if (!user) return null
  if (['/login', '/onboarding'].includes(pathname) || pathname.startsWith('/quest/')) return null

  const activeTab = pathname === '/' ? 'campfire'
                  : pathname === '/map' ? 'map' 
                  : pathname.startsWith('/quests') ? 'quests'
                  : pathname === '/streaks' ? 'streaks' 
                  : pathname === '/calendar' ? 'calendar'
                  : pathname === '/friends' ? 'friends'
                  : pathname.startsWith('/gems') ? 'gems'
                  : pathname.startsWith('/leaderboard') ? 'leaderboard'
                  : pathname.startsWith('/profile') ? 'profile' 
                  : pathname === '/settings' ? 'settings' : null

  const isMoreActive = activeTab === 'friends' || activeTab === 'leaderboard' || activeTab === 'profile' || activeTab === 'settings' || activeTab === 'gems'

  const menuItems = [
    {
      label: 'Hidden Gems',
      to: '/gems' as const,
      params: undefined,
      icon: <Diamond className="w-4 h-4 text-cyan-500" />,
      active: activeTab === 'gems',
      badge: false
    },
    {
      label: 'Friends',
      to: '/friends' as const,
      params: undefined,
      icon: <Users className="w-4 h-4 text-emerald-500" />,
      active: activeTab === 'friends',
      badge: true
    },
    {
      label: 'Leaderboard',
      to: '/leaderboard' as const,
      params: undefined,
      icon: <Trophy className="w-4 h-4 text-amber-500" />,
      active: activeTab === 'leaderboard',
      badge: false
    },
    {
      label: 'Profile',
      to: '/profile/$id' as const,
      params: { id: user.id },
      icon: <User className="w-4 h-4 text-indigo-500" />,
      active: activeTab === 'profile',
      badge: false
    },
    {
      label: 'Settings',
      to: '/settings' as const,
      params: undefined,
      icon: <SettingsIcon className="w-4 h-4 text-gray-500" />,
      active: activeTab === 'settings',
      badge: false
    }
  ]

  return (
    <div 
      className="fixed bottom-6 left-0 right-0 mx-auto w-[95%] max-w-[420px]"
      style={{ zIndex: Z_INDEX.bottom_nav }}
    >
      
      {/* Click Outside Scrim */}
      {showMore && (
        <div 
          className="fixed inset-0 z-40 bg-black/10 dark:bg-black/25 backdrop-blur-[0.5px]"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Glassmorphic More Popup Menu */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            style={{ zIndex: Z_INDEX.popups_menus }}
            className="absolute bottom-20 right-2 w-48 bg-white/90 dark:bg-background/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl p-2 space-y-1"
          >
            {menuItems.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={item.to}
                  params={item.params}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-black transition-colors cursor-pointer ${
                    item.active 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-gray-650 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {item.badge && count > 0 && (
                      <span className="bg-red-500 text-white rounded-full text-[8px] px-1.5 py-0.5 font-bold shadow-sm">
                        {count}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 opacity-45" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bottom Nav Bar */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-3 bg-white dark:bg-background border border-gray-100 dark:border-gray-800 rounded-full shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-x-auto no-scrollbar relative z-50">
        
        {/* [ 🔥 Campfire ] */}
        <Link to="/" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'campfire' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Flame className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'campfire' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        {/* [ 🗺 Map ] */}
        <Link to="/map" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'map' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <MapIcon className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'map' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        {/* [ ⚔️ Quests ] */}
        <Link to="/quests" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'quests' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Swords className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'quests' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
          {inviteCount > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold z-20 shadow-md border-2 border-white dark:border-gray-900 animate-pulse">
              {inviteCount}
            </span>
          )}
        </Link>

        {/* [ + Create ] Playful Floating Create Button */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 -mt-6 mx-1 relative z-50 shrink-0">
          <Link to="/quest/create" className="absolute inset-0 bg-primary rounded-full flex items-center justify-center shadow-lg text-white hover:bg-[#46A302] active:scale-90 transition-all border-4 border-gray-50 dark:border-[#1A1A2E]">
            <Plus className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
          </Link>
        </div>

        {/* [ 🔥 Streaks ] */}
        <Link to="/streaks" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'streaks' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Flame className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'streaks' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        {/* [ 📅 Calendar ] */}
        <Link to="/calendar" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'calendar' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Calendar className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'calendar' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        {/* [ ⋯ More ] */}
        <button 
          onClick={() => setShowMore(!showMore)}
          className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0 cursor-pointer focus:outline-none"
        >
          {isMoreActive && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <MoreHorizontal className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${isMoreActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
          {count > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold z-20 shadow-md border-2 border-white dark:border-gray-900">
              {count}
            </span>
          )}
        </button>

      </div>
    </div>
  )
}

import { XPPopup } from '../components/xp/XPPopup'
import { LevelUpModal } from '../components/xp/LevelUpModal'

function RootLayout() {
  const { theme } = useSettingsStore()
  const { user } = useAuthStore()
  const [activeToast, setActiveToast] = useState<{ questId: string; questName: string; creatorName: string } | null>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (!activeToast) return
    const timer = setTimeout(() => {
      setActiveToast(null)
    }, 8000)
    return () => clearTimeout(timer)
  }, [activeToast])

  // Real-time quest invite listener
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`user-invites-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quest_invites',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newInvite = payload.new as { quest_id: string | null; status: string }
          if (!newInvite || !newInvite.quest_id || newInvite.status !== 'pending') return

          // Play an elegant real-time invite arpeggio audio chime
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const playNote = (freq: number, start: number, duration: number) => {
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.type = 'sine'
              osc.frequency.setValueAtTime(freq, start)
              gain.gain.setValueAtTime(0, start)
              gain.gain.linearRampToValueAtTime(0.15, start + 0.05)
              gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.start(start)
              osc.stop(start + duration)
            }
            const now = ctx.currentTime
            playNote(523.25, now, 0.4) // C5
            playNote(659.25, now + 0.1, 0.5) // E5
            playNote(783.99, now + 0.2, 0.6) // G5
          } catch (e) {
            console.error('Audio failed to play', e)
          }

          // Fetch quest details robustly using separate queries
          const { data: questData, error: questError } = await supabase
            .from('quests')
            .select('name, creator_id')
            .eq('id', newInvite.quest_id)
            .single()

          if (questError || !questData || !questData.creator_id) return

          const { data: creatorData, error: creatorError } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('id', questData.creator_id)
            .single()

          const creatorName = !creatorError && creatorData 
            ? (creatorData.display_name || creatorData.username) 
            : 'Someone'

          setActiveToast({
            questId: newInvite.quest_id,
            questName: questData.name,
            creatorName: creatorName
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="min-h-[100dvh] bg-background text-foreground transition-colors duration-300">
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{ zIndex: 9999 }}
            className="fixed top-4 left-4 right-4 max-w-[420px] mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 animate-pulse">
                <Swords className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-primary">Quest Invite! ⚔️</h4>
                <p className="text-xs text-gray-700 dark:text-gray-200 font-bold mt-0.5 leading-snug">
                  <span className="text-primary font-black">@{activeToast.creatorName}</span> invited you to <span className="underline decoration-primary/45 font-black">{activeToast.questName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveToast(null)
                  router.navigate({ to: '/quest/$id', params: { id: activeToast.questId } })
                }}
                className="px-3.5 py-2 bg-primary hover:bg-[#46A302] text-white text-[11px] font-black rounded-xl active:scale-95 transition-all shadow-md cursor-pointer uppercase tracking-wider"
              >
                View
              </button>
              <button
                onClick={() => setActiveToast(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Outlet />
      <BottomNav />
      <XPPopup />
      <LevelUpModal />
    </div>
  )
}

export const rootRoute = createRootRoute({
  component: RootLayout
})

const requireAuth = async () => {
  // Ensure auth is initialized before checking
  if (!useAuthStore.getState().initialized) {
    const { data } = await supabase.auth.getSession()
    useAuthStore.getState().setSession(data.session)
    if (data.session?.user) {
      await useAuthStore.getState().fetchProfile(data.session.user.id)
    }
    useAuthStore.setState({ initialized: true })
  }
  
  const { session, profile } = useAuthStore.getState()
  if (!session) {
    throw redirect({ to: '/login' })
  }
  
  // If profile is null (or username is auto-generated default, or birthdate is missing), send to onboarding
  const username = profile?.username
  const needsOnboarding = !profile || !username || username.startsWith('user_') || !(profile as any).birthdate
  
  if (needsOnboarding && window.location.pathname !== '/onboarding') {
     throw redirect({ to: '/onboarding' })
  }
}

import { MapPage } from './map'
import { CreateQuestPage } from './quest/create'
import { CampfirePage } from './campfire'

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: requireAuth,
  component: CampfirePage,
})

export const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/map',
  beforeLoad: requireAuth,
  component: MapPage,
})

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (useAuthStore.getState().session && useAuthStore.getState().initialized) {
      throw redirect({ to: '/' })
    }
  },
  component: Login,
})

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: async () => {
    if (!useAuthStore.getState().initialized) {
      const { data } = await supabase.auth.getSession()
      useAuthStore.getState().setSession(data.session)
      if (data.session?.user) {
        await useAuthStore.getState().fetchProfile(data.session.user.id)
      }
      useAuthStore.setState({ initialized: true })
    }

    const { session } = useAuthStore.getState()
    if (!session) throw redirect({ to: '/login' })
  },
  component: Onboarding,
})

import { MeProfile } from './profile/me'

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/$id',
  beforeLoad: requireAuth,
  component: MeProfile,
})

export const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  beforeLoad: requireAuth,
  component: FriendsPage
})

export const questsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quests',
  beforeLoad: requireAuth,
  component: QuestsPage
})

export const createQuestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quest/create',
  beforeLoad: requireAuth,
  component: CreateQuestPage,
})

import { QuestDetail } from './quest/detail'
import { GemsFeedPage } from './gems'
import { GemNominationPage } from './gems/nominate'
import { GemDetailPage } from './gems/$id'
import { SettingsPage } from './settings'
import { StreaksPage } from './streaks'
import { CalendarPage } from './calendar'
import { LeaderboardPage } from './leaderboard'

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: requireAuth,
  component: SettingsPage
})

export const streaksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/streaks',
  beforeLoad: requireAuth,
  component: StreaksPage
})

export const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  beforeLoad: requireAuth,
  component: CalendarPage
})

export const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaderboard',
  beforeLoad: requireAuth,
  component: LeaderboardPage
})

export const questDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quest/$id',
  beforeLoad: requireAuth,
  component: QuestDetail
})

export const gemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gems',
  beforeLoad: requireAuth,
  component: GemsFeedPage
})

export const gemNominateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gems/nominate',
  beforeLoad: requireAuth,
  component: GemNominationPage
})

export const gemDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gems/$id',
  beforeLoad: requireAuth,
  component: GemDetailPage
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  mapRoute,
  loginRoute,
  onboardingRoute,
  profileRoute,
  friendsRoute,
  questsRoute,
  createQuestRoute,
  questDetailRoute,
  gemsRoute,
  gemNominateRoute,
  gemDetailRoute,
  settingsRoute,
  streaksRoute,
  calendarRoute,
  leaderboardRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
