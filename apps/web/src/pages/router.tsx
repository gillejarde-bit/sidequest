import { createRootRoute, createRoute, createRouter, redirect, Outlet, Link, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth'
import { Login } from './login'
import { Onboarding } from './onboarding'
import { FriendsPage } from './friends'
import { QuestsPage } from './quests'
import { supabase } from '../lib/supabase'
import { Map as MapIcon, Users, User, Swords, Plus, Settings as SettingsIcon } from 'lucide-react'
import { usePendingRequests } from '../hooks/useFriends'

function BottomNav() {
  const { count } = usePendingRequests()
  const { pathname } = useLocation()
  const { user } = useAuthStore()

  if (!user) return null
  if (['/login', '/onboarding', '/quest/create'].includes(pathname)) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t border-gray-200 z-50 flex items-center justify-between px-6 pb-safe">
      <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/' || pathname === '/map' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <MapIcon className="w-6 h-6" />
      </Link>
      <Link to="/quests" className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/quests') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Swords className="w-6 h-6" />
      </Link>
      
      {/* Center floating button container */}
      <div className="w-14 h-14 relative flex justify-center">
        <Link to="/quest/create" className="absolute -top-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg text-white hover:bg-primary-hover active:scale-95 transition-all z-50">
          <Plus className="w-8 h-8" />
        </Link>
      </div>

      <Link to="/friends" className={`flex flex-col items-center gap-1 transition-colors relative ${pathname === '/friends' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Users className="w-6 h-6" />
        {count > 0 && (
          <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
            {count}
          </span>
        )}
      </Link>
      <Link to="/profile/$id" params={{ id: user.id }} className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/profile') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <User className="w-6 h-6" />
      </Link>
      <Link to="/settings" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/settings' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <SettingsIcon className="w-6 h-6" />
      </Link>
    </div>
  )
}

import { XPPopup } from '../components/xp/XPPopup'
import { LevelUpModal } from '../components/xp/LevelUpModal'

function RootLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
      <XPPopup />
      <LevelUpModal />
    </>
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
