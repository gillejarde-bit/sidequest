import { type FormEvent, useState } from 'react'
import { CheckIcon, SparkleIcon, UploadIcon } from '../icons'
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

  const handleSubmit = (e: FormEvent) => {
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
    <form onSubmit={handleSubmit} className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-4 shadow-[var(--sq-shadow-soft)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--sq-r-lg)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)]">
          <SparkleIcon size={32} active withShadow={false} />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-ember-300)]">Field note</p>
          <h3 className="text-[18px] font-medium text-[var(--sq-text)]">Rate this gem</h3>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => {
          const active = score <= (hoverRating || rating)

          return (
            <button
              key={score}
              type="button"
              aria-label={`Rate ${score} out of 5`}
              onMouseEnter={() => setHoverRating(score)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(score)}
              className="rounded-[var(--sq-r-md)] p-1 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--sq-ember-400)]"
            >
              <SparkleIcon size={34} active={active} withShadow={active} />
            </button>
          )
        })}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Share what made this spot worth finding..."
        className="mb-4 w-full rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] p-3 text-[var(--sq-text)] placeholder:text-[var(--sq-text-faint)] focus:border-[var(--sq-ember-400)] focus:outline-none focus:ring-1 focus:ring-[var(--sq-ember-400)]"
        rows={3}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] px-4 py-2 text-[13px] font-medium text-[var(--sq-text-muted)] transition-colors hover:bg-[var(--sq-card-hover)]">
          <UploadIcon size={20} withShadow={false} />
          <span>Add photos</span>
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
          <span className="text-[13px] text-[var(--sq-text-muted)]">{photos.length} photos selected</span>
        )}

        <button
          type="submit"
          disabled={isPending || rating === 0}
          className="ml-auto flex items-center gap-2 rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)] px-5 py-2.5 text-[13px] font-medium text-[var(--sq-text)] transition-colors hover:bg-[var(--sq-ember-600)] disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : (
            <>
              <CheckIcon size={20} active withShadow={false} />
              Submit
            </>
          )}
        </button>
      </div>
    </form>
  )
}
