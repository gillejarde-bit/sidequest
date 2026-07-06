import { formatDistanceToNow } from 'date-fns'
import { SparkleIcon } from '../icons'
import { useGemReviews } from '../../hooks/useGemReviews'

export function GemReviews({ gemId }: { gemId: string }) {
  const { data: reviews, isLoading } = useGemReviews(gemId)

  if (isLoading) {
    return <div className="animate-pulse text-[13px] text-[var(--sq-text-faint)]">Loading reviews...</div>
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="rounded-[var(--sq-r-lg)] border border-dashed border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)]/60 p-4 text-[13px] text-[var(--sq-text-muted)]">
        No reviews yet. Be the first to leave a field note.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] p-4">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {review.profiles?.avatar_url ? (
                <img
                  src={review.profiles.avatar_url}
                  alt={review.profiles.display_name || 'User'}
                  className="h-10 w-10 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/25 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)] text-[13px] font-medium text-[var(--sq-text)]">
                  {review.profiles?.display_name?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <p className="font-medium text-[var(--sq-text)]">{review.profiles?.display_name || 'Anonymous'}</p>
                <p className="text-[11px] text-[var(--sq-text-faint)]">
                  {formatDistanceToNow(new Date(review.created_at || ''), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-[var(--sq-r-pill)] bg-[var(--sq-surface)] px-2.5 py-1 text-[13px] font-medium text-[var(--sq-gold-soft)]">
              <SparkleIcon size={18} active withShadow={false} />
              <span>{review.rating}</span>
            </div>
          </div>

          {review.review_text && (
            <p className="mt-3 text-[13px] leading-6 text-[var(--sq-text-muted)]">{review.review_text}</p>
          )}

          {review.photo_urls && review.photo_urls.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {review.photo_urls.map((url: string, index: number) => (
                <img
                  key={url}
                  src={url}
                  alt={`Review photo ${index + 1}`}
                  className="h-20 w-20 rounded-[var(--sq-r-md)] border border-[var(--sq-hairline)] object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
