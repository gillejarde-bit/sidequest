import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, MapPin, ChevronRight, Check } from 'lucide-react'
import { useGemNomination } from '../../hooks/useGemNomination'
import { useGeolocation } from '../../hooks/useGeolocation'

export function GemNominationPage() {
  const navigate = useNavigate()
  const { lat, lng } = useGeolocation()
  const { mutate: nominate, isPending } = useGemNomination()
  
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Viewpoint',
    description: '',
    photos: [] as File[]
  })

  const categories = ['Viewpoint', 'Street Art', 'Historical', 'Nature', 'Architecture', 'Other']

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

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-20">
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur-xl">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate({ to: '/gems' })}
          className="text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <span className="font-medium text-white">Step {step} of 3</span>
        <div className="w-12" /> {/* Spacer */}
      </div>

      <div className="mx-auto max-w-md pt-8">
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
                <h2 className="mb-2 text-2xl font-bold text-white">What did you find?</h2>
                <p className="text-gray-400">Give this hidden gem a catchy name and pick a category.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Secret Rooftop Garden"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          formData.category === cat
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!formData.name}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-black transition-opacity disabled:opacity-50"
              >
                Next <ChevronRight className="h-5 w-5" />
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
                <h2 className="mb-2 text-2xl font-bold text-white">Snap a photo</h2>
                <p className="text-gray-400">Show everyone what makes this spot special.</p>
              </div>

              <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-white/5 transition-colors hover:bg-white/10">
                <Camera className="mb-2 h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Tap to take photo</span>
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
                      key={i}
                      src={URL.createObjectURL(photo)}
                      alt="Preview"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}

              <button
                onClick={handleNext}
                disabled={formData.photos.length === 0}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-black transition-opacity disabled:opacity-50"
              >
                Next <ChevronRight className="h-5 w-5" />
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
                <h2 className="mb-2 text-2xl font-bold text-white">Why is it special?</h2>
                <p className="text-gray-400">Tell others what to look for and why they should visit.</p>
              </div>

              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Best view of the sunset in the city. To find it, go through the alley behind the coffee shop..."
                className="h-32 w-full rounded-xl border border-white/10 bg-white/5 p-4 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <div className="rounded-xl bg-indigo-500/10 p-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <MapPin className="h-5 w-5" />
                  <span className="font-medium">Current Location Saved</span>
                </div>
                <p className="mt-1 text-sm text-indigo-300/70">
                  Your current GPS coordinates will be used as the gem's location.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isPending || !formData.description || !lat || !lng}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : (
                  <>
                    Submit Nomination <Check className="h-5 w-5" />
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
