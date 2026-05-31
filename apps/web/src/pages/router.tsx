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

function BottomNav() {
  const { count } = usePendingRequests()
  const { pathname } = useLocation()
  const { user } = useAuthStore()
  const [showMore, setShowMore] = useState(false)

  if (!user) return null
  if (['/login', '/onboarding', '/quest/create'].includes(pathname)) return null

  const activeTab = pathname === '/' || pathname === '/map' ? 'map' 
                  : pathname.startsWith('/quests') ? 'quests'
                  : pathname === '/streaks' ? 'streaks' 
                  : pathname === '/calendar' ? 'calendar'
                  : pathname === '/friends' ? 'friends'
                  : pathname.startsWith('/gems') ? 'gems'
                  : pathname.startsWith('/leaderboard') ? 'leaderboard'
                  : pathname.startsWith('/profile') ? 'profile' 
                  : pathname === '/settings' ? 'settings' : null

  const isMoreActive = activeTab === 'friends' || activeTab === 'leaderboard' || activeTab === 'profile' || activeTab === 'settings'

  const menuItems = [
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
        
        {/* [ 🗺 Map ] */}
        <Link to="/" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
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
        </Link>

        {/* [ 🔥 Streaks ] */}
        <Link to="/streaks" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'streaks' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Flame className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'streaks' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        {/* [ + Create ] Playful Floating Create Button */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 -mt-6 mx-1 relative z-50 shrink-0">
          <Link to="/quest/create" className="absolute inset-0 bg-primary rounded-full flex items-center justify-center shadow-lg text-white hover:bg-[#46A302] active:scale-90 transition-all border-4 border-gray-50 dark:border-[#1A1A2E]">
            <Plus className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
          </Link>
        </div>

        {/* [ 📅 Calendar ] */}
        <Link to="/calendar" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'calendar' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Calendar className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'calendar' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        {/* [ 💎 Hidden Gems ] */}
        <Link to="/gems" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'gems' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Diamond className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'gems' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
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

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="min-h-[100dvh] bg-background text-foreground transition-colors duration-300">
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

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: requireAuth,
  component: MapPage,
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
