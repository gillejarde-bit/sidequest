import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeftIcon, CrewIcon, FriendsIcon, SparkleIcon, StreakFlameIcon } from '../components/icons'
import { Z_INDEX } from '../lib/zIndex'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

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

interface MyStreakRow {
  group_id: string
}

type LeaderboardTab = 'personal' | 'groups'

const emptyLeaderboard: LeaderboardData = {
  personal_streaks: [],
  group_streaks: [],
  my_rank_personal: 1,
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function getFlameStyles(streak: number) {
  if (streak <= 2) return { tier: 'Cold coals', tone: 'text-[var(--sq-text-faint)]', active: false }
  if (streak <= 6) return { tier: 'Kindling', tone: 'text-[var(--sq-ember-300)]', active: true }
  if (streak <= 13) return { tier: 'Steady burn', tone: 'text-[var(--sq-ember-400)]', active: true }
  if (streak <= 29) return { tier: 'Roaring fire', tone: 'text-[var(--sq-ember-500)]', active: true }
  if (streak <= 49) return { tier: 'Wildfire', tone: 'text-[var(--sq-gold-soft)]', active: true }
  return { tier: 'Eternal flame', tone: 'text-[var(--sq-banner)]', active: true }
}

function LoadingState() {
  return (
    <div className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] py-16">
      <div className="flex flex-col items-center justify-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-[var(--sq-r-pill)] border-4 border-[var(--sq-ember-500)] border-t-transparent" />
        <p className="text-[13px] font-medium text-[var(--sq-text-muted)]">Tallying daily flames...</p>
      </div>
    </div>
  )
}

function RankAvatar({
  name,
  imageUrl,
  color,
  size = 'md',
}: {
  name: string
  imageUrl?: string | null
  color: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass = size === 'lg'
    ? 'h-20 w-20 rounded-[var(--sq-r-xl)] text-[28px]'
    : size === 'md'
      ? 'h-14 w-14 rounded-[var(--sq-r-lg)] text-[18px]'
      : 'h-10 w-10 rounded-[var(--sq-r-md)] text-[13px]'

  if (imageUrl) {
    return <img src={imageUrl} alt="" className={`${sizeClass} border border-[var(--sq-keyline)]/25 object-cover`} />
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center border border-[var(--sq-keyline)]/25 font-medium text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)]`}
      style={{ backgroundColor: color }}
    >
      {name[0]?.toUpperCase() || '?'}
    </div>
  )
}

function StreakPill({ streak }: { streak: number }) {
  const flame = getFlameStyles(streak)

  return (
    <div className="inline-flex items-center gap-1 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)] px-3 py-1.5">
      <StreakFlameIcon size={19} active={flame.active} withShadow={false} />
      <span className={`text-[13px] font-medium ${flame.tone}`}>{streak}</span>
    </div>
  )
}

function PodiumSlot({
  rank,
  name,
  imageUrl,
  color,
  streak,
  delay,
  featured = false,
}: {
  rank: 1 | 2 | 3
  name: string
  imageUrl?: string | null
  color: string
  streak: number
  delay: number
  featured?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 320, damping: 26 }}
      className={`flex flex-1 flex-col items-center ${featured ? 'z-10 -mt-7 max-w-[124px]' : 'max-w-[104px]'}`}
    >
      <div className="relative">
        {featured && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2">
            <SparkleIcon size={36} active withShadow />
          </div>
        )}
        <RankAvatar name={name} imageUrl={imageUrl} color={color} size={featured ? 'lg' : 'md'} />
        <span className={`absolute -right-2 -top-2 flex items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/40 text-[10px] font-medium shadow-[var(--sq-shadow-sticker)] ${featured ? 'h-7 w-7 bg-[var(--sq-gold)] text-[var(--sq-ink)]' : 'h-6 w-6 bg-[var(--sq-surface)] text-[var(--sq-text)]'}`}>
          {rank}
        </span>
      </div>
      <p className="mt-3 w-full truncate text-center text-[12px] font-medium text-[var(--sq-text)]">{name}</p>
      <StreakPill streak={streak} />
    </motion.div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <section className="rounded-[var(--sq-r-xl)] border border-dashed border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-8 text-center shadow-[var(--sq-shadow-soft)]">
      <StreakFlameIcon size={58} active withShadow />
      <p className="mt-4 text-[13px] font-medium leading-6 text-[var(--sq-text-muted)]">{label}</p>
    </section>
  )
}

export function LeaderboardPage() {
  const { user, profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('personal')
  const [data, setData] = useState<LeaderboardData>(emptyLeaderboard)
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchLeaderboards() {
      try {
        setLoading(true)
        const { data: rankData, error: rankError } = await supabase.rpc('get_leaderboards' as never)
        if (rankError) throw rankError

        const { data: crewData, error: crewError } = await supabase.rpc('get_my_streaks')
        if (!crewError && crewData && isMounted) {
          const ids = new Set((crewData as MyStreakRow[]).map((crew) => crew.group_id))
          setMyGroupIds(ids)
        }

        if (isMounted) {
          setData((rankData as LeaderboardData) || emptyLeaderboard)
        }
      } catch (err: unknown) {
        console.error('Error fetching leaderboards:', getErrorMessage(err, 'Unable to fetch leaderboards'))
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void fetchLeaderboards()

    return () => {
      isMounted = false
    }
  }, [])

  const personalTop3 = data.personal_streaks.slice(0, 3)
  const personalList = data.personal_streaks.slice(3)
  const crewTop3 = data.group_streaks.slice(0, 3)
  const crewList = data.group_streaks.slice(3)
  const isCurrentUserInTop50 = data.personal_streaks.some((player) => player.id === user?.id)

  return (
    <div className="min-h-[100dvh] bg-[var(--sq-bg)] pb-36 text-[var(--sq-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--sq-hairline)] bg-[var(--sq-overlay-heavy)] px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] shadow-[var(--sq-shadow-soft)] backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <div className="flex h-14 items-center justify-between">
            <Link to="/map" aria-label="Back to map" className="flex h-11 w-11 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] active:scale-95">
              <ChevronLeftIcon size={26} withShadow={false} />
            </Link>

            <div className="flex items-center gap-2">
              <SparkleIcon size={34} active withShadow={false} />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--sq-ember-300)]">Camp legends</p>
                <h1 className="text-[22px] font-medium">Leaderboards</h1>
              </div>
            </div>

            <div className="w-11" />
          </div>

          <nav className="mt-4 grid grid-cols-2 gap-2 rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-bg)]/70 p-1.5">
            {(['personal', 'groups'] as LeaderboardTab[]).map((tab) => {
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative rounded-[var(--sq-r-lg)] px-3 py-2.5 text-left transition-colors ${active ? 'text-[var(--sq-ink)]' : 'text-[var(--sq-text-muted)] hover:text-[var(--sq-text)]'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="leaderboard-active-tab"
                      className="absolute inset-0 rounded-[var(--sq-r-lg)] bg-[var(--sq-banner)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2 text-[13px] font-medium">
                    {tab === 'personal' ? <StreakFlameIcon size={19} active={active} withShadow={false} /> : <CrewIcon size={19} active={active} withShadow={false} />}
                    {tab === 'personal' ? 'Personal' : 'Crews'}
                  </span>
                  <span className={`relative mt-0.5 block text-[10px] ${active ? 'text-[var(--sq-ink)]/70' : 'text-[var(--sq-text-faint)]'}`}>
                    {tab === 'personal' ? 'Solo streaks' : 'Shared flames'}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-4 pt-6">
        {loading ? (
          <LoadingState />
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'personal' && (
              <motion.div key="personal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                <section className="relative overflow-hidden rounded-[var(--sq-r-xl)] border border-[var(--sq-keyline)]/20 bg-[radial-gradient(circle_at_80%_20%,var(--sq-gold-soft)_0,transparent_26%),linear-gradient(135deg,var(--sq-ember-600),var(--sq-card)_58%,var(--sq-surface))] p-5 shadow-[var(--sq-shadow-glow)]">
                  <div className="absolute right-4 top-4 opacity-60">
                    <SparkleIcon size={68} active withShadow />
                  </div>
                  <p className="relative text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-banner)]">Your current standing</p>
                  <div className="relative mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[16px] text-[var(--sq-text-muted)]">You are ranked</p>
                      <p className="text-[44px] font-bold leading-none text-[var(--sq-text)]">#{data.my_rank_personal}</p>
                    </div>
                    <StreakPill streak={profile?.current_streak || 0} />
                  </div>
                </section>

                {personalTop3.length > 0 ? (
                  <section className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] px-4 pb-5 pt-9 shadow-[var(--sq-shadow-soft)]">
                    <div className="flex items-end justify-center gap-2">
                      {personalTop3[1] && <PodiumSlot rank={2} name={personalTop3[1].display_name || personalTop3[1].username} imageUrl={personalTop3[1].avatar_url} color="var(--sq-text-faint)" streak={personalTop3[1].current_streak} delay={0.1} />}
                      {personalTop3[0] && <PodiumSlot rank={1} name={personalTop3[0].display_name || personalTop3[0].username} imageUrl={personalTop3[0].avatar_url} color="var(--sq-gold)" streak={personalTop3[0].current_streak} delay={0} featured />}
                      {personalTop3[2] && <PodiumSlot rank={3} name={personalTop3[2].display_name || personalTop3[2].username} imageUrl={personalTop3[2].avatar_url} color="var(--sq-ember-600)" streak={personalTop3[2].current_streak} delay={0.2} />}
                    </div>
                  </section>
                ) : (
                  <EmptyState label="No personal streaks have reached the board yet. The first flame is still waiting to be lit." />
                )}

                <div className="space-y-2.5">
                  {personalList.map((player, idx) => {
                    const isSelf = player.id === user?.id
                    const rank = idx + 4

                    return (
                      <motion.article key={player.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className={`flex items-center justify-between rounded-[var(--sq-r-xl)] border p-3.5 shadow-[var(--sq-shadow-soft)] ${isSelf ? 'border-[var(--sq-ember-400)] bg-[var(--sq-ember-500)]/12' : 'border-[var(--sq-hairline)] bg-[var(--sq-card)]'}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-7 text-[13px] font-medium text-[var(--sq-text-faint)]">#{rank}</span>
                          <RankAvatar name={player.display_name || player.username} imageUrl={player.avatar_url} color={isSelf ? 'var(--sq-ember-500)' : 'var(--sq-sage-600)'} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-[var(--sq-text)]">{player.display_name || player.username}</p>
                            <p className="mt-1 text-[10px] text-[var(--sq-text-faint)]">Level {player.level}</p>
                          </div>
                        </div>
                        <StreakPill streak={player.current_streak} />
                      </motion.article>
                    )
                  })}
                </div>

                {!isCurrentUserInTop50 && user && (
                  <div style={{ zIndex: Z_INDEX.bottom_nav - 5 }} className="fixed bottom-24 left-4 right-4 mx-auto flex max-w-md items-center justify-between rounded-[var(--sq-r-xl)] border border-[var(--sq-keyline)]/25 bg-[var(--sq-ember-500)] p-3.5 text-[var(--sq-text)] shadow-[var(--sq-shadow-glow)]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-9 text-[13px] font-medium">#{data.my_rank_personal}</span>
                      <RankAvatar name={profile?.display_name || profile?.username || 'You'} color="var(--sq-ember-600)" size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{profile?.display_name || profile?.username || 'You'}</p>
                        <p className="mt-1 text-[10px] text-[var(--sq-banner)]">Level {profile?.level || 1}</p>
                      </div>
                    </div>
                    <StreakPill streak={profile?.current_streak || 0} />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'groups' && (
              <motion.div key="groups" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                {crewTop3.length > 0 ? (
                  <section className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] px-4 pb-5 pt-9 shadow-[var(--sq-shadow-soft)]">
                    <p className="mb-8 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-ember-300)]">Top crew flames</p>
                    <div className="flex items-end justify-center gap-2">
                      {crewTop3[1] && <PodiumSlot rank={2} name={crewTop3[1].name} imageUrl={crewTop3[1].avatar_url} color={crewTop3[1].group_color} streak={crewTop3[1].streak} delay={0.1} />}
                      {crewTop3[0] && <PodiumSlot rank={1} name={crewTop3[0].name} imageUrl={crewTop3[0].avatar_url} color={crewTop3[0].group_color} streak={crewTop3[0].streak} delay={0} featured />}
                      {crewTop3[2] && <PodiumSlot rank={3} name={crewTop3[2].name} imageUrl={crewTop3[2].avatar_url} color={crewTop3[2].group_color} streak={crewTop3[2].streak} delay={0.2} />}
                    </div>
                  </section>
                ) : (
                  <EmptyState label="No crew has claimed the board yet. A shared flame could still become the first legend." />
                )}

                <div className="space-y-2.5">
                  {crewList.map((crew, idx) => {
                    const isMember = myGroupIds.has(crew.id)
                    const rank = idx + 4

                    return (
                      <motion.article key={crew.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className={`flex items-center justify-between rounded-[var(--sq-r-xl)] border p-3.5 shadow-[var(--sq-shadow-soft)] ${isMember ? 'border-[var(--sq-sage-500)] bg-[var(--sq-sage-600)]/18' : 'border-[var(--sq-hairline)] bg-[var(--sq-card)]'}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-7 text-[13px] font-medium text-[var(--sq-text-faint)]">#{rank}</span>
                          <RankAvatar name={crew.name} imageUrl={crew.avatar_url} color={crew.group_color} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-[var(--sq-text)]">{crew.name}</p>
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--sq-text-faint)]">
                              <FriendsIcon size={14} withShadow={false} />
                              {crew.member_count} members
                            </p>
                          </div>
                        </div>
                        <StreakPill streak={crew.streak} />
                      </motion.article>
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
