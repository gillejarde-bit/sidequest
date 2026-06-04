import { createRootRoute, createRoute, createRouter, redirect, Outlet, Link, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth'
import { Login } from './login'
import { Onboarding } from './onboarding'
import { FriendsPage } from './friends'
import { QuestsPage } from './quests'
import { supabase } from '../lib/supabase'
import { 
  CampfireIcon, 
  MapIcon, 
  CompassIcon, 
  PlusIcon, 
  FriendsIcon, 
  CalendarIcon, 
  MoreDotsIcon,
  GemIcon,
  StreakFlameIcon,
  SparkleIcon,
  SettingsIcon,
  ChevronRightIcon,
  CloseIcon
} from '../components/icons'
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

  const isMoreActive = activeTab === 'streaks' || activeTab === 'leaderboard' || activeTab === 'profile' || activeTab === 'settings' || activeTab === 'gems'

  const menuItems = [
    {
      label: 'Hidden Gems',
      to: '/gems' as const,
      params: undefined,
      icon: <GemIcon size={20} active={activeTab === 'gems'} withShadow={false} />,
      active: activeTab === 'gems',
      badge: false
    },
    {
      label: 'Group Streaks',
      to: '/streaks' as const,
      params: undefined,
      icon: <StreakFlameIcon size={20} active={activeTab === 'streaks'} withShadow={false} />,
      active: activeTab === 'streaks',
      badge: false
    },
    {
      label: 'Leaderboard',
      to: '/leaderboard' as const,
      params: undefined,
      icon: <SparkleIcon size={20} active={activeTab === 'leaderboard'} withShadow={false} />,
      active: activeTab === 'leaderboard',
      badge: false
    },
    {
      label: 'Profile',
      to: '/profile/$id' as const,
      params: { id: user.id },
      icon: <FriendsIcon size={20} active={activeTab === 'profile'} withShadow={false} />,
      active: activeTab === 'profile',
      badge: false
    },
    {
      label: 'Settings',
      to: '/settings' as const,
      params: undefined,
      icon: <SettingsIcon size={20} active={activeTab === 'settings'} withShadow={false} />,
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
                    <ChevronRightIcon size={14} withShadow={false} className="opacity-45" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bottom Nav Bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-[var(--sq-surface)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-pill)] shadow-[var(--sq-shadow-soft)] relative z-50">
        
        {/* [ ⛺ Campfire ] */}
        <Link to="/" className="relative flex flex-col items-center justify-center w-11 h-11 shrink-0">
          <CampfireIcon active={activeTab === 'campfire'} size={32} />
          {activeTab === 'campfire' && (
            <motion.div 
              layoutId="nav-dot" 
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--sq-ember-500)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </Link>

        {/* [ 🗺 Map ] */}
        <Link to="/map" className="relative flex flex-col items-center justify-center w-11 h-11 shrink-0">
          <MapIcon active={activeTab === 'map'} size={32} />
          {activeTab === 'map' && (
            <motion.div 
              layoutId="nav-dot" 
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--sq-ember-500)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </Link>

        {/* [ ⚔️ Quests ] */}
        <Link to="/quests" className="relative flex flex-col items-center justify-center w-11 h-11 shrink-0">
          <CompassIcon active={activeTab === 'quests'} size={32} />
          {activeTab === 'quests' && (
            <motion.div 
              layoutId="nav-dot" 
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--sq-ember-500)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          {inviteCount > 0 && (
            <span className="absolute top-0 right-0 min-w-4.5 h-4.5 bg-[var(--sq-heart)] text-[var(--sq-text)] text-[9px] rounded-full flex items-center justify-center font-black px-1 border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]">
              {inviteCount}
            </span>
          )}
        </Link>

        {/* [ + Create ] Playful Floating Create Button */}
        <div className="relative w-14 h-14 -mt-8 mx-1 shrink-0 z-50">
          <Link to="/quest/create">
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-14 h-14 rounded-full bg-[var(--sq-ember-500)] border-4 border-[var(--sq-keyline)] flex items-center justify-center shadow-[var(--sq-shadow-glow)] cursor-pointer"
            >
              <PlusIcon active={true} withShadow={false} size={28} className="translate-y-[-0.5px]" />
            </motion.div>
          </Link>
        </div>

        {/* [ 👥 Friends ] */}
        <Link to="/friends" className="relative flex flex-col items-center justify-center w-11 h-11 shrink-0">
          <FriendsIcon active={activeTab === 'friends'} size={32} />
          {activeTab === 'friends' && (
            <motion.div 
              layoutId="nav-dot" 
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--sq-ember-500)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          {count > 0 && (
            <span className="absolute top-0 right-0 min-w-4.5 h-4.5 bg-[var(--sq-heart)] text-[var(--sq-text)] text-[9px] rounded-full flex items-center justify-center font-black px-1 border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]">
              {count}
            </span>
          )}
        </Link>

        {/* [ 📅 Calendar ] */}
        <Link to="/calendar" className="relative flex flex-col items-center justify-center w-11 h-11 shrink-0">
          <CalendarIcon active={activeTab === 'calendar'} size={32} />
          {activeTab === 'calendar' && (
            <motion.div 
              layoutId="nav-dot" 
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--sq-ember-500)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </Link>

        {/* [ ⋯ More ] */}
        <button 
          onClick={() => setShowMore(!showMore)}
          className="relative flex flex-col items-center justify-center w-11 h-11 shrink-0 cursor-pointer focus:outline-none"
        >
          <MoreDotsIcon active={isMoreActive} size={32} />
          {isMoreActive && (
            <motion.div 
              layoutId="nav-dot" 
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--sq-ember-500)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          {count > 0 && (
            <span className="absolute top-0 right-0 min-w-4.5 h-4.5 bg-[var(--sq-heart)] text-[var(--sq-text)] text-[9px] rounded-full flex items-center justify-center font-black px-1 border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]">
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
    if (theme === 'dark' || theme === 'ember') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    if (theme === 'ember') {
      document.documentElement.setAttribute('data-theme', 'ember')
    } else {
      document.documentElement.removeAttribute('data-theme')
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
            className="fixed top-4 left-4 right-4 max-w-[420px] mx-auto bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-4 shadow-[var(--sq-shadow-soft)] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-[var(--sq-r-sm)] bg-[var(--sq-surface)] border border-[var(--sq-hairline)] flex items-center justify-center shrink-0">
                <CompassIcon active={true} size={28} withShadow={false} />
              </div>
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-[var(--sq-ember-400)]">Quest invite!</h4>
                <p className="text-xs text-[var(--sq-text)] font-medium mt-0.5 leading-snug">
                  <span className="text-[var(--sq-ember-300)] font-medium">@{activeToast.creatorName}</span> invited you to <span className="underline decoration-[var(--sq-ember-500)]/45 font-medium">{activeToast.questName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveToast(null)
                  router.navigate({ to: '/quest/$id', params: { id: activeToast.questId } })
                }}
                className="px-3.5 py-2 bg-[var(--sq-ember-500)] hover:bg-[var(--sq-ember-400)] text-[var(--sq-ink)] text-[11px] font-medium rounded-[var(--sq-r-sm)] border border-[var(--sq-keyline)] active:scale-95 transition-all shadow-[var(--sq-shadow-sticker)] uppercase tracking-wider cursor-pointer"
              >
                View
              </button>
              <button
                onClick={() => setActiveToast(null)}
                className="w-8 h-8 rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] text-[var(--sq-text-muted)] flex items-center justify-center active:scale-95 transition-colors cursor-pointer border border-[var(--sq-hairline)]"
              >
                <CloseIcon size={20} withShadow={false} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Outlet />
      <BottomNav />
      <XPPopup />
      <LevelUpModal />

      {/* Global SVG Filters for Clean Hand-Drawn Wobble Outlines */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="clean-wobble-sm">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="clean-wobble-md">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="clean-wobble-lg">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="clean-wobble-pill">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
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
