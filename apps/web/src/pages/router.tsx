import { createRootRoute, createRoute, createRouter, redirect, Outlet, Link, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth'
import { Login } from './login'
import { Onboarding } from './onboarding'
import { FriendsPage } from './friends'
import { QuestsPage } from './quests'
import { supabase } from '../lib/supabase'
import { Map as MapIcon, Users, User, Swords, Plus, Diamond, Settings as SettingsIcon } from 'lucide-react'
import { usePendingRequests } from '../hooks/useFriends'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../stores/settingsStore'
import { useEffect } from 'react'

function BottomNav() {
  const { count } = usePendingRequests()
  const { pathname } = useLocation()
  const { user } = useAuthStore()

  if (!user) return null
  if (['/login', '/onboarding', '/quest/create'].includes(pathname)) return null

  const activeTab = pathname === '/' || pathname === '/map' ? 'map' 
                  : pathname.startsWith('/quests') ? 'quests' 
                  : pathname.startsWith('/gems') ? 'gems'
                  : pathname === '/friends' ? 'friends'
                  : pathname.startsWith('/profile') ? 'profile' 
                  : pathname === '/settings' ? 'settings' : null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[400px]">
      <div className="flex items-center justify-between px-2 sm:px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-full shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-x-auto no-scrollbar">
        
        <Link to="/" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'map' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <MapIcon className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'map' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        <Link to="/quests" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'quests' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Swords className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'quests' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        <Link to="/gems" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'gems' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Diamond className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'gems' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>
        
        {/* Playful Floating Create Button */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 -mt-6 mx-1 relative z-50 shrink-0">
          <Link to="/quest/create" className="absolute inset-0 bg-primary rounded-full flex items-center justify-center shadow-lg text-white hover:bg-[#46A302] active:scale-90 transition-all border-4 border-gray-50 dark:border-[#1A1A2E]">
            <Plus className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
          </Link>
        </div>

        <Link to="/friends" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'friends' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <Users className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'friends' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
          {count > 0 && (
            <span className="absolute top-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold z-20 shadow-md border-2 border-white dark:border-gray-900">
              {count}
            </span>
          )}
        </Link>

        <Link to="/profile/$id" params={{ id: user.id }} className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'profile' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <User className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'profile' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>

        <Link to="/settings" className="relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 shrink-0">
          {activeTab === 'settings' && (
            <motion.div layoutId="nav-bubble" className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full z-0" />
          )}
          <SettingsIcon className={`w-5 h-5 sm:w-6 sm:h-6 z-10 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} strokeWidth={2.5} />
        </Link>
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
  
  // If profile username is auto-generated default, send to onboarding
  if (profile?.username?.startsWith('user_') && window.location.pathname !== '/onboarding') {
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

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: requireAuth,
  component: SettingsPage
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
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
