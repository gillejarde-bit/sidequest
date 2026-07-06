import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CompassIcon, GemIcon, SparkleIcon } from '../icons'
import { useGemVoting } from '../../hooks/useGemVoting'
import { VoteButtons } from './VoteButtons'

export interface GemFeedItem {
  id: string
  name: string
  category: string
  description: string
  photo_urls?: string[] | null
  distance_meters?: number | null
  gem_status: string
  avg_rating?: number | null
  user_vote?: number | null
}

interface GemCardProps {
  gem: GemFeedItem
}

export function GemCard({ gem }: GemCardProps) {
  const { mutate: vote } = useGemVoting()
  const isPending = gem.gem_status === 'pending'
  const hasVoted = (gem.user_vote ?? 0) !== 0
  const photoUrl = gem.photo_urls?.[0]

  const handleVote = (voteValue: number) => {
    vote({ gemId: gem.id, vote: voteValue })
  }

  const formatDistance = (meters?: number | null) => {
    if (meters == null || !Number.isFinite(meters)) return 'Distance unknown'
    if (meters < 1000) return `${Math.round(meters)} m away`
    return `${(meters / 1000).toFixed(1)} km away`
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="overflow-hidden rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] shadow-[var(--sq-shadow-soft)]"
    >
      <Link to="/gems/$id" params={{ id: gem.id }} className="block">
        <div className="relative h-52 w-full bg-[var(--sq-surface)]">
          {photoUrl ? (
            <img src={photoUrl} alt={gem.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <GemIcon size={64} active withShadow />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--sq-bg)] via-transparent to-transparent opacity-85" />
          <span className="absolute left-3 top-3 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/25 bg-[var(--sq-overlay-mid)] px-3 py-1 text-[11px] font-medium text-[var(--sq-text)] backdrop-blur-md">
            {gem.category}
          </span>
          {gem.gem_status === 'approved' && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-[var(--sq-r-pill)] border border-[var(--sq-gold)]/35 bg-[var(--sq-bg)]/80 px-2.5 py-1 text-[11px] font-medium text-[var(--sq-gold-soft)] backdrop-blur-md">
              <SparkleIcon size={17} active withShadow={false} />
              {gem.avg_rating != null ? gem.avg_rating.toFixed(1) : '-'}
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--sq-r-lg)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)]">
              <GemIcon size={32} active={gem.gem_status === 'approved'} withShadow={false} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-1 text-[18px] font-medium text-[var(--sq-text)]">{gem.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--sq-text-muted)]">
                <CompassIcon size={18} withShadow={false} />
                <span>{formatDistance(gem.distance_meters)}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-[var(--sq-text-muted)]">{gem.description}</p>
        </div>
      </Link>

      {isPending && !hasVoted && (
        <div className="border-t border-[var(--sq-hairline)] bg-[var(--sq-surface)]/55 p-4">
          <p className="mb-3 text-center text-[13px] font-medium text-[var(--sq-text-muted)]">
            Does this feel like a true hidden gem?
          </p>
          <VoteButtons onVote={handleVote} />
        </div>
      )}

      {isPending && hasVoted && (
        <div className="border-t border-[var(--sq-hairline)] bg-[var(--sq-surface)]/55 p-4 text-center">
          <p className="text-[13px] font-medium text-[var(--sq-success)]">Thanks for helping the camp decide.</p>
        </div>
      )}
    </motion.article>
  )
}
