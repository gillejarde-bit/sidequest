import { useState } from 'react'
import { Star, Upload, Send } from 'lucide-react'
import { useGemRating } from '../../hooks/useGemRating'

interface GemRatingFormProps {
  gemId: string
  onSuccess?: () => void
}

export function GemRatingForm({ gemId, onSuccess }: GemRatingFormProps) {
  const { mutate: rateGem, isPending } = useGemRating()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState('')
  const [photos, setPhotos] = useState<File[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    rateGem({ gemId, rating, review, photos }, {
      onSuccess: () => {
        setRating(0)
        setReview('')
        setPhotos([])
        onSuccess?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-semibold text-white">Rate this Gem</h3>
      
      <div className="mb-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hoverRating || rating)
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-gray-600'
              } transition-colors`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Share your experience..."
        className="mb-4 w-full rounded-xl border border-white/10 bg-black/50 p-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        rows={3}
      />

      <div className="flex items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5">
          <Upload className="h-4 w-4" />
          <span>Add Photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                setPhotos(Array.from(e.target.files))
              }
            }}
          />
        </label>
        
        {photos.length > 0 && (
          <span className="text-sm text-gray-400">{photos.length} photos selected</span>
        )}

        <div className="flex-1" />

        <button
          type="submit"
          disabled={isPending || rating === 0}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : (
            <>
              <Send className="h-4 w-4" />
              Submit
            </>
          )}
        </button>
      </div>
    </form>
  )
}
