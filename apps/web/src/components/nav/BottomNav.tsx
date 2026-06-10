import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth'
import { supabase } from '../../lib/supabase'
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
  ChevronRightIcon
} from '../icons'
import { usePendingRequests } from '../../hooks/useFriends'
import { Z_INDEX } from '../../lib/zIndex'

export function BottomNav() {
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
