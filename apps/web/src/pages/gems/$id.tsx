import { Link, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckIcon, ChevronLeftIcon, CompassIcon, FriendsIcon, GemIcon, SparkleIcon } from '../../components/icons'
import { GemRatingForm } from '../../components/gems/GemRatingForm'
import { GemReviews } from '../../components/gems/GemReviews'
import { useGem } from '../../hooks/useGem'

export function GemDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { data: gem, isLoading } = useGem(id)

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--sq-bg)]">
        <div className="h-10 w-10 animate-spin rounded-[var(--sq-r-pill)] border-4 border-[var(--sq-ember-500)] border-t-transparent" />
      </div>
    )
  }

  if (!gem) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--sq-bg)] px-4 text-center text-[var(--sq-text)]">
        Gem not found
      </div>
    )
  }

  const isPending = gem.gem_status === 'pending'
  const isApproved = gem.gem_status === 'approved'
  const allPhotos = [...(gem.photo_urls || []), ...(gem.nomination_photo_urls || [])]
  const progress = Math.min(100, ((gem.vote_count || 0) / (gem.approval_threshold || 5)) * 100)

  return (
    <div className="min-h-[100dvh] bg-[var(--sq-bg)] pb-28 text-[var(--sq-text)]">
      <div className="relative h-80 w-full bg-[var(--sq-surface)]">
        {allPhotos.length > 0 ? (
          <img
            src={allPhotos[0]}
            alt={gem.name}
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <GemIcon size={72} active withShadow />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[var(--sq-bg)] via-[var(--sq-bg)]/45 to-transparent" />

        <Link
          to="/gems"
          aria-label="Back to hidden gems"
          className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-overlay-mid)] text-[var(--sq-text)] backdrop-blur-md"
        >
          <ChevronLeftIcon size={26} withShadow={false} />
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/25 bg-[var(--sq-overlay-mid)] px-3 py-1 text-[11px] font-medium text-[var(--sq-text)] backdrop-blur-md">
              {gem.category}
            </span>
            {isApproved && (
              <span className="flex items-center gap-1 rounded-[var(--sq-r-pill)] border border-[var(--sq-success)]/30 bg-[var(--sq-sage-600)]/30 px-3 py-1 text-[11px] font-medium text-[var(--sq-sage-100)] backdrop-blur-md">
                <CheckIcon size={16} active withShadow={false} />
                Approved
              </span>
            )}
            {isPending && (
              <span className="flex items-center gap-1 rounded-[var(--sq-r-pill)] border border-[var(--sq-warning)]/35 bg-[var(--sq-warning)]/15 px-3 py-1 text-[11px] font-medium text-[var(--sq-gold-soft)] backdrop-blur-md">
                <CompassIcon size={16} active withShadow={false} />
                Pending review
              </span>
            )}
          </div>
          <h1 className="max-w-xl text-[28px] font-medium leading-tight text-[var(--sq-text)]">{gem.name}</h1>
        </div>
      </div>

      <div className="space-y-7 px-4 py-6">
        <div className="grid grid-cols-3 gap-3 rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-3 shadow-[var(--sq-shadow-soft)]">
          <div className="flex flex-col items-center rounded-[var(--sq-r-lg)] bg-[var(--sq-surface)] p-3">
            <SparkleIcon size={30} active={isApproved} withShadow={false} />
            <span className="mt-1 text-[22px] font-medium text-[var(--sq-text)]">{gem.avg_rating?.toFixed(1) || '-'}</span>
            <span className="text-[11px] text-[var(--sq-text-faint)]">Rating</span>
          </div>
          <div className="flex flex-col items-center rounded-[var(--sq-r-lg)] bg-[var(--sq-surface)] p-3">
            <FriendsIcon size={30} active withShadow={false} />
            <span className="mt-1 text-[22px] font-medium text-[var(--sq-text)]">{gem.visit_count || 0}</span>
            <span className="text-[11px] text-[var(--sq-text-faint)]">Visits</span>
          </div>
          <div className="flex flex-col items-center rounded-[var(--sq-r-lg)] bg-[var(--sq-surface)] p-3">
            <CheckIcon size={30} active withShadow={false} />
            <span className="mt-1 text-[22px] font-medium text-[var(--sq-text)]">{gem.vote_count || 0}</span>
            <span className="text-[11px] text-[var(--sq-text-faint)]">Votes</span>
          </div>
        </div>

        {isPending && (
          <div className="rounded-[var(--sq-r-xl)] border border-[var(--sq-warning)]/30 bg-[var(--sq-warning)]/10 p-4">
            <h3 className="mb-2 text-[18px] font-medium text-[var(--sq-gold-soft)]">Community review in progress</h3>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-[var(--sq-r-pill)] bg-[var(--sq-surface)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-[var(--sq-r-pill)] bg-[var(--sq-warning)]"
              />
            </div>
            <p className="text-[13px] text-[var(--sq-text-muted)]">
              {gem.vote_count || 0} / {gem.approval_threshold || 5} votes needed for approval
            </p>
          </div>
        )}

        <section className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-ember-300)]">Field notes</p>
          <h2 className="mb-3 text-[22px] font-medium text-[var(--sq-text)]">About this gem</h2>
          <p className="leading-7 text-[var(--sq-text-muted)]">{gem.description || gem.nomination_description}</p>
        </section>

        {gem.profiles && (
          <section className="flex items-center gap-3 rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] p-4">
            {gem.profiles.avatar_url ? (
              <img src={gem.profiles.avatar_url} alt="Nominator" className="h-12 w-12 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)] text-lg font-medium text-[var(--sq-text)]">
                {gem.profiles.display_name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <p className="text-[13px] text-[var(--sq-text-faint)]">Nominated by</p>
              <p className="font-medium text-[var(--sq-text)]">{gem.profiles.display_name}</p>
            </div>
          </section>
        )}

        {isApproved && (
          <>
            <GemRatingForm gemId={gem.id} />
            <section>
              <h2 className="mb-4 text-[22px] font-medium text-[var(--sq-text)]">Reviews</h2>
              <GemReviews gemId={gem.id} />
            </section>
          </>
        )}
      </div>
    </div>
  )
}
