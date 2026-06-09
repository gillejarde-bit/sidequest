import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/auth'
import { useStampsStore } from '../../features/stamps/stampsStore'
import { usePursuitsStore } from '../../features/pursuits/pursuits.store'
import { deriveArchetype } from '../../features/archetype/deriveArchetype'
import { Stamp, StampKind } from './Stamp'
import { QuestCard } from './QuestCard'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { 
  PlusIcon, 
  CompassIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  SparkleIcon, 
  GemIcon 
} from '../icons'

interface QuestBookProps {
  upcomingQuests: any[]
  inviteQuests: any[]
  myQuests: any[]
  isLoading: boolean
  onCeremonyComplete?: () => void
}

export function QuestBook({ upcomingQuests, inviteQuests, myQuests, isLoading, onCeremonyComplete }: QuestBookProps) {
  const { user, profile } = useAuthStore()
  
  const stamps = useStampsStore(state => state.stamps)
  const fetchUserStamps = useStampsStore(state => state.fetchUserStamps)
  const stampsLoading = useStampsStore(state => state.loading)
  const hasMore = useStampsStore(state => state.hasMore)
  const currentPageIndex = useStampsStore(state => state.currentPageIndex)
  const setCurrentPageIndex = useStampsStore(state => state.setCurrentPageIndex)
  const pendingCeremony = useStampsStore(state => state.pendingCeremony)

  const pursuitXP = usePursuitsStore(state => state.pursuitXP)
  const activeArchetype = deriveArchetype(pursuitXP)

  const [isWide, setIsWide] = useState(false)
  const [shake, setShake] = useState(false)
  const [ceremonyPhase, setCeremonyPhase] = useState<'open' | 'descent' | 'impact' | 'settle' | 'tally'>('open')

  const [prevPageIndex, setPrevPageIndex] = useState(currentPageIndex)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (currentPageIndex !== prevPageIndex) {
      setDirection(currentPageIndex > prevPageIndex ? 'forward' : 'backward')
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setPrevPageIndex(currentPageIndex)
      }, 550)
      return () => clearTimeout(timer)
    }
  }, [currentPageIndex, prevPageIndex])

  // Auto-navigate to History Page 1 if there's a pending ceremony
  useEffect(() => {
    if (pendingCeremony) {
      setCurrentPageIndex(isWide ? 4 : 5)
    }
  }, [pendingCeremony, isWide, setCurrentPageIndex])
  const historyScrollRef = useRef<HTMLDivElement>(null)

  // Listen to screen size to toggle single vs dual page
  useEffect(() => {
    const handleResize = () => {
      setIsWide(window.innerWidth >= 900)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load stamps on mount
  useEffect(() => {
    if (user?.id) {
      fetchUserStamps(user.id, true)
    }
  }, [user?.id, fetchUserStamps])

  // Infinite scroll trigger for stamps on Page 6+
  const handleHistoryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!user?.id || stampsLoading || !hasMore) return
    const target = e.currentTarget
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 60) {
      fetchUserStamps(user.id)
    }
  }

  const nextPage = () => {
    const step = isWide ? 2 : 1
    const maxPage = 5 + Math.max(1, Math.ceil(stamps.length / 6))
    if (currentPageIndex + step <= maxPage) {
      setCurrentPageIndex(currentPageIndex + step)
    }
  }

  const prevPage = () => {
    const step = isWide ? 2 : 1
    if (currentPageIndex - step >= 0) {
      setCurrentPageIndex(currentPageIndex - step)
    }
  }

  const renderPageContent = (pageIdx: number) => {
    switch (pageIdx) {
      case 0: // PAGE 1: Frontispiece
        return (
          <div className="flex flex-col h-full justify-between p-6 text-[var(--sq-ink)]">
            <div className="text-center mt-4">
              <span className="text-[10px] font-medium tracking-widest text-[var(--sq-ember-600)] uppercase">Official Chronicle</span>
              <h2 className="text-xl font-medium mt-2 tracking-tight">Quester's Book</h2>
              <div className="w-12 h-1 bg-[var(--sq-ember-500)]/20 mx-auto mt-3 rounded-full" />
            </div>

            {/* Profile Crest Showcase */}
            <div className="flex flex-col items-center my-6 relative">
              <div className="w-24 h-24 rounded-[var(--sq-r-md)] overflow-hidden border-4 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] relative bg-[var(--sq-surface)] sq-wobbly-md">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-medium text-[var(--sq-text-muted)] text-3xl">
                    {profile?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <p className="font-medium text-sm text-[var(--sq-ink)]">
                  @{profile?.username || 'explorer'}
                </p>
                <p className="text-[10px] font-medium text-[var(--sq-ember-600)] uppercase tracking-widest mt-1">
                  Level {profile?.level || 1} {activeArchetype?.name || 'Wanderer'}
                </p>
              </div>
            </div>

            {/* Stats list */}
            <div className="space-y-2.5 bg-[var(--sq-surface)]/5 rounded-2xl p-4 border border-[var(--sq-ink)]/10">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-[var(--sq-stats-text-muted)]">Quests Completed</span>
                <span className="text-[var(--sq-stats-text)]">{stamps.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-[var(--sq-stats-text-muted)]">Pioneer Mints</span>
                <span className="text-[var(--sq-stats-text)]">
                  {stamps.filter(s => s.is_pioneer).length}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-[var(--sq-stats-text-muted)]">Foil Crowns</span>
                <span className="text-[var(--sq-stats-text)]">
                  {stamps.filter(s => s.is_foil).length}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-[var(--sq-stats-text-muted)]">Member Since</span>
                <span className="text-[var(--sq-stats-text)]">
                  {profile?.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : 'Recently'}
                </span>
              </div>
            </div>

            <div className="text-[9px] text-center font-medium text-[var(--sq-ink)]/40 tracking-wider">
              SideQuest Corp · Chronicle Vol. I
            </div>
          </div>
        )

      case 1: // PAGE 2: Table of Contents
        return (
          <div className="flex flex-col h-full justify-between p-6 text-[var(--sq-ink)]">
            <div className="text-center mt-4">
              <h2 className="text-xl font-medium uppercase tracking-wider">Contents</h2>
              <div className="w-8 h-0.5 bg-[var(--sq-ink)]/20 mx-auto mt-2" />
            </div>

            <div className="space-y-1 my-auto pr-2">
              <TOCItem 
                index="I." 
                label="Upcoming Quests" 
                count={upcomingQuests.length} 
                onClick={() => setCurrentPageIndex(isWide ? 2 : 2)} 
              />
              <TOCItem 
                index="II." 
                label="Quest Invites" 
                count={inviteQuests.length} 
                onClick={() => setCurrentPageIndex(isWide ? 2 : 3)} 
                isRedBadge={true}
              />
              <TOCItem 
                index="III." 
                label="My Quests" 
                count={myQuests.length} 
                onClick={() => setCurrentPageIndex(isWide ? 4 : 4)} 
              />
              <TOCItem 
                index="IV." 
                label="History of Quests" 
                count={stamps.length} 
                onClick={() => setCurrentPageIndex(isWide ? 4 : 5)} 
              />
            </div>

            <div className="flex justify-center mb-2">
              <Link to="/quest/create" className="flex items-center gap-2 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] font-medium py-2.5 px-6 rounded-full border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] hover:bg-[var(--sq-ember-400)] active:scale-95 transition-all text-xs">
                <PlusIcon size={16} active={false} withShadow={false} />
                Create New Quest
              </Link>
            </div>
          </div>
        )

      case 2: // PAGE 3: Upcoming Quests
        return (
          <div className="flex flex-col h-full p-6 text-[var(--sq-ink)]">
            <div className="mb-4 text-left">
              <span className="text-[9px] font-medium tracking-widest text-[var(--sq-ember-600)] uppercase">Chapter I</span>
              <h2 className="text-lg font-medium text-[var(--sq-ink)]">Upcoming Quests</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[calc(100%-60px)] scrollbar-premium">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-[var(--sq-ember-500)] border-t-transparent rounded-full" /></div>
              ) : upcomingQuests.length === 0 ? (
                <EmptyPageContent icon="⚔️" text="No upcoming adventures" />
              ) : (
                upcomingQuests.map(q => <QuestCard key={q.id} quest={q} />)
              )}
            </div>
          </div>
        )

      case 3: // PAGE 4: Quest Invites
        return (
          <div className="flex flex-col h-full p-6 text-[var(--sq-ink)]">
            <div className="mb-4 text-left">
              <span className="text-[9px] font-medium tracking-widest text-[var(--sq-ember-600)] uppercase">Chapter II</span>
              <h2 className="text-lg font-medium text-[var(--sq-ink)]">Quest Invites</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[calc(100%-60px)] scrollbar-premium">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-[var(--sq-ember-500)] border-t-transparent rounded-full" /></div>
              ) : inviteQuests.length === 0 ? (
                <EmptyPageContent icon="✉️" text="No pending invitations" />
              ) : (
                inviteQuests.map(q => <QuestCard key={q.id} quest={q} />)
              )}
            </div>
          </div>
        )

      case 4: // PAGE 5: My Quests
        return (
          <div className="flex flex-col h-full p-6 text-[var(--sq-ink)]">
            <div className="mb-4 text-left">
              <span className="text-[9px] font-medium tracking-widest text-[var(--sq-ember-600)] uppercase">Chapter III</span>
              <h2 className="text-lg font-medium text-[var(--sq-ink)]">My Quests</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[calc(100%-60px)] scrollbar-premium">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-[var(--sq-ember-500)] border-t-transparent rounded-full" /></div>
              ) : myQuests.length === 0 ? (
                <EmptyPageContent icon="🛡️" text="No organizing quests" />
              ) : (
                myQuests.map(q => <QuestCard key={q.id} quest={q} />)
              )}
            </div>
          </div>
        )

      default: // PAGE 5+: History Pages (Chronological Stamp Grid)
        const stampPageIndex = pageIdx - 5
        const stampsPerPage = 6
        const startStampIdx = stampPageIndex * stampsPerPage
        const pageStamps = stamps.slice(startStampIdx, startStampIdx + stampsPerPage)
        const slots = Array.from({ length: 6 })

        return (
          <div className="flex flex-col h-full p-5 justify-between text-[var(--sq-ink)]">
            <div className="mb-3 text-left">
              <span className="text-[9px] font-medium tracking-widest text-[var(--sq-ember-600)] uppercase">Chapter IV · Chronicles</span>
              <h2 className="text-lg font-medium text-[var(--sq-ink)]">History of Quests</h2>
            </div>

            {stamps.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="w-16 h-16 rounded-[var(--sq-r-md)] bg-[var(--sq-surface)]/10 flex items-center justify-center text-2xl mb-4 border-2 border-dashed border-[var(--sq-ink)]/20">📖</div>
                <h3 className="font-medium text-[var(--sq-ink)] mb-1 text-sm">Your book is unwritten</h3>
                <p className="text-[11px] text-[var(--sq-ink)]/60 leading-normal max-w-[200px]">Complete your first quest to earn your first stamp!</p>
              </div>
            ) : (
              <div 
                ref={pageIdx === currentPageIndex ? historyScrollRef : null}
                onScroll={handleHistoryScroll}
                className="flex-1 overflow-y-auto scrollbar-premium grid grid-cols-2 gap-x-3 gap-y-4 py-2 pr-1 max-h-[calc(100%-50px)]"
              >
                {slots.map((_, idx) => {
                  const stampIdx = startStampIdx + idx
                  const stamp = stamps[stampIdx]
                  
                  if (stamp) {
                    if (stampIdx === 0 && pendingCeremony) {
                      return (
                        <CeremonyStampSlot
                          key={stamp.id}
                          stamp={stamp}
                          setShake={setShake}
                          onPhaseChange={setCeremonyPhase}
                        />
                      )
                    }
                    return (
                      <div key={stamp.id} className="flex flex-col items-center justify-center p-1.5 bg-[var(--sq-surface)]/5 rounded-2xl border border-[var(--sq-ink)]/10 text-center relative group shadow-[var(--sq-shadow-sticker)]">
                        <Stamp 
                          kind={stamp.stamp_kind as StampKind} 
                          isFoil={stamp.is_foil} 
                          size={64} 
                        />
                        <div className="mt-2 text-left w-full px-1">
                          <p className="text-[9px] font-medium text-[var(--sq-ink)] line-clamp-1 uppercase tracking-tight">
                            {stamp.district || 'Quest'}
                          </p>
                          <p className="text-[7px] font-medium text-[var(--sq-ink)]/40 mt-0.5">
                            {format(new Date(stamp.earned_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                    )
                  }

                  // Render an empty embossed placeholder slot
                  return (
                    <div 
                      key={`empty-${idx}`} 
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-[var(--sq-ink)]/20 text-center select-none"
                    >
                      <div className="w-12 h-12 rounded-full border border-dashed border-[var(--sq-ink)]/20 flex items-center justify-center opacity-30">
                        <CompassIcon size={24} active={false} withShadow={false} className="opacity-20" />
                      </div>
                      <div className="w-10 h-1.5 bg-[var(--sq-ink)]/10 rounded-full mt-3 opacity-30" />
                    </div>
                  )
                })}
              </div>
            )}
            
            {stamps.length > 0 && (
              <div className="text-[8px] text-center text-[var(--sq-ink)]/50 font-medium tracking-widest mt-2 uppercase">
                Stamps {startStampIdx + 1} - {Math.min(stamps.length, startStampIdx + pageStamps.length)} of {stamps.length}
              </div>
            )}
          </div>
        )
    }
  }

  const leftPageIndex = isWide ? currentPageIndex : currentPageIndex
  const rightPageIndex = leftPageIndex + 1

  return (
    <div className="w-full flex flex-col items-center select-none px-4 max-w-4xl mx-auto relative">
      {/* Table of Contents Bookmark Ribbon */}
      {currentPageIndex > 1 && (
        <button
          onClick={() => setCurrentPageIndex(isWide ? 0 : 1)}
          className="absolute -top-3 right-8 z-30 flex flex-col items-center text-[var(--sq-ember-500)] filter drop-shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          {/* Custom SVG Bookmark Ribbon to remove lucide dependency */}
          <svg width="24" height="40" viewBox="0 0 24 40">
            <path d="M0,0 L24,0 L24,40 L12,32 L0,40 Z" fill="var(--sq-ember-500)" stroke="var(--sq-keyline)" strokeWidth="1.5" />
          </svg>
          <span className="text-[7px] font-medium text-[var(--sq-keyline)] absolute top-1.5 tracking-tight uppercase">TOC</span>
        </button>
      )}

      {/* Main Physical Fake Book Mockup Frame */}
      <motion.div 
        animate={shake ? {
          x: [0, -6, 6, -4, 4, -2, 2, 0],
          y: [0, 4, -4, 3, -3, 1, -1, 0]
        } : {}}
        transition={{ duration: 0.25 }}
        className={`
          w-full bg-[var(--sq-bg)] border-8 border-[var(--sq-ink)] rounded-[var(--sq-r-lg)] relative shadow-2xl overflow-hidden
          aspect-[3.2/4] max-h-[calc(100dvh-180px)] flex transition-colors duration-300
        `}
      >
        {/* Leather texture backdrop details */}
        <div className="absolute inset-0 pointer-events-none bg-black/[0.04] dark:bg-white/[0.02]" />

        <div className="flex-1 flex relative" style={{ perspective: "2000px", transformStyle: "preserve-3d" }}>
          {isWide ? (
            // DUAL PAGE (WIDE SCREEN) SPREAD WITH 3D PAGE-FLIP
            <div className="w-full h-full flex relative" style={{ transformStyle: "preserve-3d" }}>
              {/* Left Page Container (Always mounted, index changes dynamically) */}
              <div 
                className="w-1/2 h-full bg-[var(--sq-banner)] relative shadow-inner flex flex-col justify-between overflow-hidden shrink-0"
                style={{ width: 'calc(50% + 1px)', marginRight: '-1px' }}
              >
                {renderPageContent(isAnimating ? (direction === 'forward' ? prevPageIndex : currentPageIndex) : currentPageIndex)}
                <div className="absolute bottom-4 left-4 text-[9px] font-medium text-[var(--sq-ink)]/40">
                  {(isAnimating ? (direction === 'forward' ? prevPageIndex : currentPageIndex) : currentPageIndex) + 1}
                </div>
              </div>

              {/* Right Page Container (Always mounted, index changes dynamically) */}
              <div 
                className="w-1/2 h-full bg-[var(--sq-banner)] relative shadow-inner flex flex-col justify-between overflow-hidden shrink-0"
                style={{ width: 'calc(50% + 1px)', marginLeft: '-1px' }}
              >
                {renderPageContent(isAnimating ? (direction === 'forward' ? currentPageIndex + 1 : prevPageIndex + 1) : currentPageIndex + 1)}
                <div className="absolute bottom-4 right-4 text-[9px] font-medium text-[var(--sq-ink)]/40">
                  {(isAnimating ? (direction === 'forward' ? currentPageIndex + 1 : prevPageIndex + 1) : currentPageIndex + 1) + 1}
                </div>
              </div>

              {/* Flipping Page Container (Only rendered during transition) */}
              <AnimatePresence>
                {isAnimating && (
                  <motion.div
                    key={`flip-${prevPageIndex}-${currentPageIndex}`}
                    initial={direction === 'forward' ? { rotateY: 0 } : { rotateY: -180 }}
                    animate={direction === 'forward' ? { rotateY: -180 } : { rotateY: 0 }}
                    exit={direction === 'forward' ? { rotateY: -180 } : { rotateY: 0 }}
                    transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
                    style={{
                      transformOrigin: direction === 'forward' ? 'left center' : 'right center',
                      transformStyle: 'preserve-3d',
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      width: 'calc(50% + 1px)',
                      left: direction === 'forward' ? '50%' : '0%',
                      zIndex: 30,
                      pointerEvents: 'none'
                    }}
                  >
                    {/* Front side of flipping page */}
                    <div
                      className="absolute inset-0 bg-[var(--sq-banner)] shadow-inner flex flex-col justify-between overflow-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg) translateZ(0.5px)',
                      }}
                    >
                      {renderPageContent(direction === 'forward' ? prevPageIndex + 1 : currentPageIndex + 1)}
                      <div className="absolute bottom-4 right-4 text-[9px] font-medium text-[var(--sq-ink)]/40">
                        {(direction === 'forward' ? prevPageIndex + 1 : currentPageIndex + 1) + 1}
                      </div>
                    </div>

                    {/* Back side of flipping page */}
                    <div
                      className="absolute inset-0 bg-[var(--sq-banner)] shadow-inner flex flex-col justify-between overflow-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg) translateZ(0.5px)',
                      }}
                    >
                      {renderPageContent(direction === 'forward' ? currentPageIndex : prevPageIndex)}
                      <div className="absolute bottom-4 left-4 text-[9px] font-medium text-[var(--sq-ink)]/40">
                        {(direction === 'forward' ? currentPageIndex : prevPageIndex) + 1}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Absolute Center Creased gutter (sitting above everything including the flipping page) */}
              <div 
                className="absolute left-1/2 top-0 bottom-0 w-8 pointer-events-none z-40"
                style={{ transform: 'translateX(-50%) translateZ(10px)', transformStyle: 'preserve-3d' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--sq-ink)]/10 via-[var(--sq-ink)]/25 to-[var(--sq-ink)]/10" />
                <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-[var(--sq-ink)]/30 -translate-x-1/2" />
              </div>
            </div>
          ) : (
            // SINGLE PAGE (MOBILE VIEWPORT) WITH 3D PAGE-FLIP
            <div className="w-full h-full relative" style={{ transformStyle: "preserve-3d" }}>
              {/* Static Page Container (Always mounted, preloads target page) */}
              <div className="w-full h-full bg-[var(--sq-banner)] relative shadow-inner flex flex-col justify-between overflow-hidden">
                {renderPageContent(currentPageIndex)}
                <div className="absolute bottom-4 right-4 text-[9px] font-medium text-[var(--sq-ink)]/40">
                  {currentPageIndex + 1}
                </div>
              </div>

              {/* Flipping page (Only rendered during transition) */}
              <AnimatePresence>
                {isAnimating && (
                  <motion.div
                    key={`flip-single-${prevPageIndex}-${currentPageIndex}`}
                    initial={direction === 'forward' ? { rotateY: 0 } : { rotateY: -180 }}
                    animate={direction === 'forward' ? { rotateY: -180 } : { rotateY: 0 }}
                    exit={direction === 'forward' ? { rotateY: -180 } : { rotateY: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    style={{
                      transformOrigin: 'left center',
                      transformStyle: 'preserve-3d',
                      position: 'absolute',
                      inset: 0,
                      zIndex: 30,
                      pointerEvents: 'none'
                    }}
                  >
                    {/* Front side of flipping page */}
                    <div
                      className="absolute inset-0 bg-[var(--sq-banner)] shadow-inner flex flex-col justify-between overflow-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg) translateZ(0.5px)',
                      }}
                    >
                      {renderPageContent(direction === 'forward' ? prevPageIndex : currentPageIndex)}
                      <div className="absolute bottom-4 right-4 text-[9px] font-medium text-[var(--sq-ink)]/40">
                        {(direction === 'forward' ? prevPageIndex : currentPageIndex) + 1}
                      </div>
                    </div>

                    {/* Back side of flipping page */}
                    <div
                      className="absolute inset-0 bg-[var(--sq-banner)] shadow-inner flex flex-col justify-between overflow-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg) translateZ(0.5px)',
                      }}
                    >
                      {renderPageContent(direction === 'forward' ? currentPageIndex : prevPageIndex)}
                      <div className="absolute bottom-4 right-4 text-[9px] font-medium text-[var(--sq-ink)]/40">
                        {(direction === 'forward' ? currentPageIndex : prevPageIndex) + 1}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Dynamic page turn navigation overlays (Left/Right overlay buttons) */}
        {currentPageIndex > 0 && (
          <button
            onClick={prevPage}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline)] shadow-md flex items-center justify-center active:scale-90 transition-all z-30 cursor-pointer text-[var(--sq-text)]"
          >
            <ChevronLeftIcon size={20} active={false} withShadow={false} />
          </button>
        )}

        {(isWide ? rightPageIndex < 5 + Math.max(1, Math.ceil(stamps.length / 6)) : currentPageIndex < 5 + Math.max(1, Math.ceil(stamps.length / 6))) && (
          <button
            onClick={nextPage}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline)] shadow-md flex items-center justify-center active:scale-90 transition-all z-30 cursor-pointer text-[var(--sq-text)]"
          >
            <ChevronRightIcon size={20} active={false} withShadow={false} />
          </button>
        )}
      </motion.div>

      {/* Loose Leaf Parchment Certificate / XP Tally Card Overlay */}
      <AnimatePresence>
        {pendingCeremony && ceremonyPhase === 'tally' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: '-30%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, y: '-30%' }}
            className="absolute z-50 top-1/2 left-1/2 -translate-x-1/2 bg-[var(--sq-banner)] border-4 border-[var(--sq-ink)] rounded-[var(--sq-r-lg)] p-5 shadow-2xl text-center space-y-4 w-[85%] max-w-sm transition-colors duration-300 shadow-amber-950/25"
          >
            <div className="flex justify-center items-center gap-1.5 text-[var(--sq-ember-600)]">
              <SparkleIcon size={16} active={true} withShadow={false} className="animate-bounce" />
              <span className="text-[10px] font-medium tracking-widest uppercase">Quest Certified!</span>
              <SparkleIcon size={16} active={true} withShadow={false} className="animate-bounce" />
            </div>
            
            <h3 className="font-medium text-base text-[var(--sq-ink)] leading-tight">
              {pendingCeremony.questName}
            </h3>

            <div className="flex justify-center items-center gap-2">
              <div className="bg-[var(--sq-ember-500)]/15 text-[var(--sq-ember-600)] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <SparkleIcon size={14} active={true} withShadow={false} />
                +{pendingCeremony.xpAwarded} XP
              </div>
              {pendingCeremony.isPioneer && (
                <div className="bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] px-3 py-1 rounded-full text-[9px] font-medium tracking-wider uppercase flex items-center gap-1 shadow">
                  <GemIcon size={12} active={true} withShadow={false} />
                  Pioneer!
                </div>
              )}
            </div>

            <button
              onClick={() => {
                useStampsStore.getState().setPendingCeremony(null)
                if (onCeremonyComplete) onCeremonyComplete()
              }}
              className="w-full py-2.5 rounded-2xl bg-[var(--sq-ink)] hover:bg-[var(--sq-bg)] text-[var(--sq-keyline)] font-medium text-center shadow-lg active:scale-95 transition-all text-xs cursor-pointer border border-[var(--sq-keyline)]"
            >
              Close Chronicle
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function playStampSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    
    const oscThud = ctx.createOscillator()
    const gainThud = ctx.createGain()
    oscThud.connect(gainThud)
    gainThud.connect(ctx.destination)
    oscThud.type = 'sine'
    oscThud.frequency.setValueAtTime(120, ctx.currentTime)
    oscThud.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.18)
    gainThud.gain.setValueAtTime(1.0, ctx.currentTime)
    gainThud.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22)
    oscThud.start()
    oscThud.stop(ctx.currentTime + 0.25)

    const oscChime = ctx.createOscillator()
    const gainChime = ctx.createGain()
    oscChime.connect(gainChime)
    gainChime.connect(ctx.destination)
    oscChime.type = 'triangle'
    oscChime.frequency.setValueAtTime(880, ctx.currentTime)
    oscChime.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.35)
    gainChime.gain.setValueAtTime(0.25, ctx.currentTime)
    gainChime.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    oscChime.start()
    oscChime.stop(ctx.currentTime + 0.55)
  } catch (err) {
    console.warn('Web Audio synthesis failed:', err)
  }
}

interface CeremonyStampSlotProps {
  stamp: any
  setShake: (shake: boolean) => void
  onPhaseChange: (phase: 'open' | 'descent' | 'impact' | 'settle' | 'tally') => void
}

function CeremonyStampSlot({ stamp, setShake, onPhaseChange }: CeremonyStampSlotProps) {
  const pendingCeremony = useStampsStore(state => state.pendingCeremony)
  const [phase, setPhase] = useState<'open' | 'descent' | 'impact' | 'settle' | 'tally'>('open')
  const [inkBurst, setInkBurst] = useState(false)

  useEffect(() => {
    if (!pendingCeremony) return

    onPhaseChange('open')

    const descentTimeout = setTimeout(() => {
      setPhase('descent')
      onPhaseChange('descent')
    }, 450)

    const impactTimeout = setTimeout(() => {
      setPhase('impact')
      onPhaseChange('impact')
      setInkBurst(true)
      setShake(true)
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 80])
      }
      playStampSound()
      
      setTimeout(() => setShake(false), 250)
    }, 850)

    const settleTimeout = setTimeout(() => {
      setPhase('settle')
      onPhaseChange('settle')
    }, 1250)

    const tallyTimeout = setTimeout(() => {
      setPhase('tally')
      onPhaseChange('tally')
    }, 1650)

    return () => {
      clearTimeout(descentTimeout)
      clearTimeout(impactTimeout)
      clearTimeout(settleTimeout)
      clearTimeout(tallyTimeout)
    }
  }, [pendingCeremony])

  return (
    <div className="flex flex-col items-center justify-center p-1.5 bg-[var(--sq-surface)]/5 rounded-2xl border border-[var(--sq-ink)]/10 text-center relative w-full h-full min-h-[92px]">
      {(phase === 'open' || phase === 'descent') && (
        <div className="absolute w-12 h-12 rounded-full border-2 border-dashed border-[var(--sq-ink)]/20 flex items-center justify-center bg-gray-100/10 opacity-60 z-0">
          <div className="w-8 h-8 rounded-full border border-dashed border-[var(--sq-ink)]/20 opacity-40 animate-pulse" />
        </div>
      )}

      <AnimatePresence>
        {inkBurst && (
          <motion.div
            initial={{ scale: 0.1, opacity: 0 }}
            animate={{ scale: 2.2, opacity: [0.6, 0.8, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute w-12 h-12 rounded-full bg-[var(--sq-ember-500)]/20 pointer-events-none mix-blend-screen z-10"
          />
        )}
      </AnimatePresence>

      <div className="h-16 w-16 flex items-center justify-center relative">
        <AnimatePresence>
          {(phase === 'descent' || phase === 'impact' || phase === 'settle' || phase === 'tally') && (
            <motion.div
              initial={{ scale: 4.8, rotate: -25, opacity: 0, y: -80 }}
              animate={phase === 'impact' 
                ? { scale: 0.95, rotate: -4, opacity: 1, y: 0 } 
                : phase === 'settle' || phase === 'tally'
                ? { scale: 1.05, rotate: -6, opacity: 1, y: 0 }
                : { scale: 2.5, rotate: -15, opacity: 0.8, y: -20 }
              }
              transition={{
                type: 'spring',
                stiffness: phase === 'impact' ? 450 : 250,
                damping: phase === 'impact' ? 22 : 15
              }}
              className="z-20 relative"
            >
              <Stamp 
                kind={stamp.stamp_kind as StampKind} 
                isFoil={stamp.is_foil} 
                size={54} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-2 text-left w-full px-1 z-10">
        <p className="text-[9px] font-medium text-[var(--sq-ink)] line-clamp-1 uppercase tracking-tight">
          {stamp.district || 'Quest'}
        </p>
        <p className="text-[7px] font-medium text-[var(--sq-ink)]/40 mt-0.5">
          {format(new Date(stamp.earned_at), 'dd MMM yyyy')}
        </p>
      </div>
    </div>
  )
}

// Sub-components to keep layout clean
function TOCItem({ index, label, count, onClick, isRedBadge }: { index: string; label: string; count: number; onClick: () => void; isRedBadge?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex justify-between items-center py-3 border-b border-dashed border-[var(--sq-ink)]/15 hover:bg-[var(--sq-surface)]/10 px-2 rounded-xl transition-colors cursor-pointer text-left sq-wobbly-sm"
    >
      <div className="flex gap-2.5 items-center">
        <span className="text-[10px] font-medium text-[var(--sq-ember-600)] w-4">{index}</span>
        <span className="text-xs font-medium text-[var(--sq-ink)]">{label}</span>
      </div>
      <div className="flex gap-1.5 items-center">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          isRedBadge && count > 0 
            ? 'bg-[var(--sq-heart)] text-[var(--sq-keyline)] animate-pulse border border-[var(--sq-keyline)]' 
            : 'bg-[var(--sq-surface)]/10 text-[var(--sq-ink)]/50'
        }`}>
          {count}
        </span>
        <ChevronRightIcon size={14} active={false} withShadow={false} className="opacity-30" />
      </div>
    </button>
  )
}

function EmptyPageContent({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center my-auto opacity-70">
      <span className="text-3xl mb-2">{icon}</span>
      <p className="text-xs font-medium text-[var(--sq-ink)]/40 uppercase tracking-widest">{text}</p>
    </div>
  )
}
