import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useGems } from '../hooks/useGems'
import { useGeolocation } from '../hooks/useGeolocation'
import { GemCard, type GemFeedItem } from '../components/gems/GemCard'
import { CompassIcon, GemIcon, MapIcon, PlusIcon } from '../components/icons'

type GemsTab = 'nearby' | 'pending'

const tabs: Array<{ id: GemsTab; label: string; helper: string }> = [
  { id: 'nearby', label: 'Nearby gems', helper: 'Approved finds near your trail' },
  { id: 'pending', label: 'Pending nominations', helper: 'Help the camp decide' },
]

export function GemsFeedPage() {
  const [activeTab, setActiveTab] = useState<GemsTab>('nearby')
  const { lat, lng } = useGeolocation()

  const { data: gems, isLoading } = useGems(
    lat ?? undefined,
    lng ?? undefined,
    50000,
    activeTab === 'nearby' ? 'approved' : 'pending'
  )

  const emptyCopy = activeTab === 'nearby'
    ? 'No approved gems are glowing nearby yet. Nominate the first one.'
    : 'No nominations need votes right now. The coals are calm.'

  return (
    <div className="min-h-[100dvh] bg-[var(--sq-bg)] pb-36 text-[var(--sq-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--sq-hairline)] bg-[var(--sq-overlay-heavy)] px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] shadow-[var(--sq-shadow-soft)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <GemIcon size={38} active withShadow={false} />
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--sq-ember-400)]">Campfire finds</p>
              <h1 className="truncate text-[22px] font-medium text-[var(--sq-text)]">Hidden gems</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/gems/nominate"
              aria-label="Nominate a hidden gem"
              className="flex h-11 w-11 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/40 bg-[var(--sq-ember-500)] shadow-[var(--sq-shadow-sticker)] transition-transform hover:scale-105 active:scale-95"
            >
              <PlusIcon size={24} active withShadow={false} />
            </Link>
            <Link
              to="/map"
              aria-label="Open map"
              className="flex h-11 w-11 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] shadow-[var(--sq-shadow-soft)] transition-transform hover:scale-105 active:scale-95"
            >
              <MapIcon size={28} withShadow={false} />
            </Link>
          </div>
        </div>

        <nav className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-2 rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-bg)]/70 p-1.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative rounded-[var(--sq-r-lg)] px-3 py-2.5 text-left transition-colors ${
                  active ? 'text-[var(--sq-ink)]' : 'text-[var(--sq-text-muted)] hover:text-[var(--sq-text)]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="gems-active-tab"
                    className="absolute inset-0 rounded-[var(--sq-r-lg)] bg-[var(--sq-banner)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative block text-[13px] font-medium">{tab.label}</span>
                <span className={`relative mt-0.5 block text-[10px] ${active ? 'text-[var(--sq-ink)]/70' : 'text-[var(--sq-text-faint)]'}`}>
                  {tab.helper}
                </span>
              </button>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-5">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)]"
              />
            ))}
          </div>
        ) : !gems || gems.length === 0 ? (
          <section className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] px-6 py-12 text-center shadow-[var(--sq-shadow-soft)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/30 bg-[var(--sq-surface)]">
              <CompassIcon size={42} active withShadow={false} />
            </div>
            <h2 className="text-[22px] font-medium text-[var(--sq-text)]">No gems found</h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[var(--sq-text-muted)]">{emptyCopy}</p>
            <Link
              to="/gems/nominate"
              className="mt-6 inline-flex items-center gap-2 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/35 bg-[var(--sq-ember-500)] px-5 py-3 text-[13px] font-medium text-[var(--sq-ink)] shadow-[var(--sq-shadow-sticker)] transition-transform hover:scale-[1.02] active:scale-95"
            >
              <PlusIcon size={20} active withShadow={false} />
              Nominate a gem
            </Link>
          </section>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {(gems as GemFeedItem[]).map((gem) => (
                <GemCard key={gem.id} gem={gem} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
