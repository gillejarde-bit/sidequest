import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, ChevronRightIcon, CompassIcon, GemIcon, UploadIcon } from '../../components/icons'
import { useGemNomination } from '../../hooks/useGemNomination'
import { useGeolocation } from '../../hooks/useGeolocation'

const categories = ['Food', 'Outdoors', 'Nightlife', 'Culture', 'Fitness', 'Gaming', 'Other']

export function GemNominationPage() {
  const navigate = useNavigate()
  const { lat, lng } = useGeolocation()
  const { mutate: nominate, isPending, error: nominationError } = useGemNomination()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Food',
    description: '',
    photos: [] as File[]
  })

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleSubmit = () => {
    if (!lat || !lng) return

    nominate({
      ...formData,
      lat,
      lng,
    }, {
      onSuccess: () => {
        navigate({ to: '/gems' })
      }
    })
  }

  const stepTitles = ['Name the find', 'Add a photo', 'Tell the story']

  return (
    <div className="min-h-[100dvh] bg-[var(--sq-bg)] px-4 pb-28 pt-24 text-[var(--sq-text)]">
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--sq-hairline)] bg-[var(--sq-overlay-heavy)] px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(step - 1) : navigate({ to: '/gems' })}
            className="rounded-[var(--sq-r-pill)] px-3 py-2 text-[13px] font-medium text-[var(--sq-text-muted)] transition-colors hover:bg-[var(--sq-card-hover)] hover:text-[var(--sq-text)]"
          >
            Cancel
          </button>
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-ember-300)]">Step {step} of 3</p>
            <p className="text-[13px] font-medium text-[var(--sq-text)]">{stepTitles[step - 1]}</p>
          </div>
          <div className="w-14" />
        </div>
      </div>

      <div className="mx-auto max-w-md">
        <div className="mb-8 rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] p-4 shadow-[var(--sq-shadow-soft)]">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--sq-r-lg)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)]">
              <GemIcon size={34} active withShadow={false} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-ember-300)]">Nomination</p>
              <h1 className="text-[22px] font-medium">Share a hidden gem</h1>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-2 rounded-[var(--sq-r-pill)] ${item <= step ? 'bg-[var(--sq-ember-500)]' : 'bg-[var(--sq-surface)]'}`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="mb-2 text-[28px] font-medium text-[var(--sq-text)]">What did you find?</h2>
                <p className="text-[16px] leading-7 text-[var(--sq-text-muted)]">Give this spot a name and choose the corner of the camp it belongs to.</p>
              </div>

              <div className="space-y-5 rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] p-4">
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[var(--sq-text-muted)]">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Secret rooftop garden"
                    className="w-full rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] p-3 text-[var(--sq-text)] placeholder:text-[var(--sq-text-faint)] focus:border-[var(--sq-ember-400)] focus:outline-none focus:ring-1 focus:ring-[var(--sq-ember-400)]"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-[13px] font-medium text-[var(--sq-text-muted)]">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const active = formData.category === cat

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={`rounded-[var(--sq-r-pill)] border px-4 py-2 text-[13px] font-medium transition-colors ${
                            active
                              ? 'border-[var(--sq-keyline)]/25 bg-[var(--sq-ember-500)] text-[var(--sq-text)]'
                              : 'border-[var(--sq-hairline)] bg-[var(--sq-surface)] text-[var(--sq-text-muted)] hover:bg-[var(--sq-card-hover)]'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!formData.name}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)] px-4 py-3 font-medium text-[var(--sq-text)] transition-opacity hover:bg-[var(--sq-ember-600)] disabled:opacity-50"
              >
                Next
                <ChevronRightIcon size={22} active withShadow={false} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="mb-2 text-[28px] font-medium text-[var(--sq-text)]">Snap a photo</h2>
                <p className="text-[16px] leading-7 text-[var(--sq-text-muted)]">A good photo turns a rumor into a real little treasure map.</p>
              </div>

              <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-[var(--sq-r-xl)] border-2 border-dashed border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] transition-colors hover:bg-[var(--sq-card-hover)]">
                <UploadIcon size={48} active withShadow />
                <span className="mt-3 text-[13px] font-medium text-[var(--sq-text-muted)]">Tap to add a photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFormData({ ...formData, photos: Array.from(e.target.files) })
                    }
                  }}
                />
              </label>

              {formData.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {formData.photos.map((photo, i) => (
                    <img
                      key={`${photo.name}-${i}`}
                      src={URL.createObjectURL(photo)}
                      alt="Preview"
                      className="h-24 w-24 rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline)] object-cover"
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={formData.photos.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)] px-4 py-3 font-medium text-[var(--sq-text)] transition-opacity hover:bg-[var(--sq-ember-600)] disabled:opacity-50"
              >
                Next
                <ChevronRightIcon size={22} active withShadow={false} />
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="mb-2 text-[28px] font-medium text-[var(--sq-text)]">Why is it special?</h2>
                <p className="text-[16px] leading-7 text-[var(--sq-text-muted)]">Tell the crew what to look for and why it is worth the walk.</p>
              </div>

              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Best view of the sunset in the city. Look for the tiny stairwell behind the coffee shop..."
                className="h-36 w-full rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-4 text-[var(--sq-text)] placeholder:text-[var(--sq-text-faint)] focus:border-[var(--sq-ember-400)] focus:outline-none focus:ring-1 focus:ring-[var(--sq-ember-400)]"
              />

              <div className="rounded-[var(--sq-r-xl)] border border-[var(--sq-sage-500)]/30 bg-[var(--sq-sage-600)]/20 p-4">
                <div className="flex items-center gap-2 text-[var(--sq-sage-100)]">
                  <CompassIcon size={24} active withShadow={false} />
                  <span className="font-medium">Current location saved</span>
                </div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--sq-text-muted)]">
                  Your current GPS coordinates will mark where this gem lives.
                </p>
              </div>

              {nominationError && (
                <div className="rounded-[var(--sq-r-lg)] border border-[var(--sq-heart)]/40 bg-[var(--sq-heart)]/10 p-4 text-[13px] font-medium leading-relaxed text-[var(--sq-heart)]">
                  {(nominationError as Error).message || 'Failed to submit nomination. Please try again.'}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !formData.description || !lat || !lng}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)] px-4 py-3 font-medium text-[var(--sq-text)] transition-opacity hover:bg-[var(--sq-ember-600)] disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : (
                  <>
                    Submit nomination
                    <CheckIcon size={22} active withShadow={false} />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
