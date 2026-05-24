import { formatDistanceToNow } from 'date-fns'
import { Star } from 'lucide-react'
import { useGemReviews } from '../../hooks/useGemReviews'

export function GemReviews({ gemId }: { gemId: string }) {
  const { data: reviews, isLoading } = useGemReviews(gemId)

  if (isLoading) {
    return <div className="animate-pulse text-gray-500">Loading reviews...</div>
  }

  if (!reviews || reviews.length === 0) {
    return <div className="text-gray-500">No reviews yet. Be the first to rate!</div>
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-3">
              {review.profiles?.avatar_url ? (
                <img
                  src={review.profiles.avatar_url}
                  alt={review.profiles.display_name || 'User'}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 font-bold text-white">
                  {review.profiles?.display_name?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <p className="font-medium text-white">{review.profiles?.display_name || 'Anonymous'}</p>
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(review.created_at || ''), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-yellow-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">{review.rating}</span>
            </div>
          </div>
          
          {review.review_text && (
            <p className="mt-3 text-sm text-gray-300">{review.review_text}</p>
          )}

          {review.photo_urls && review.photo_urls.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {review.photo_urls.map((url: string, index: number) => (
                <img
                  key={index}
                  src={url}
                  alt={`Review photo ${index + 1}`}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
