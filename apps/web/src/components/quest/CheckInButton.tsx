import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Loader2 } from 'lucide-react'
import { useGeolocation, useCheckIn } from '../../hooks/useCheckIn'
import ConfettiExplosion from 'react-confetti-explosion'
import { useAuthStore } from '../../stores/auth'

interface CheckInButtonProps {
  questId: string
  initialCheckedIn?: boolean
  onSuccess: (xpAwarded: number) => void
}

export function CheckInButton({ questId, initialCheckedIn = false, onSuccess }: CheckInButtonProps) {
  const { location, loading: geoLoading } = useGeolocation()
  const { checkIn, loading: checkInLoading, error } = useCheckIn(questId)
  const { user, fetchProfile } = useAuthStore()
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setCheckedIn(initialCheckedIn)
  }, [initialCheckedIn])

  const handleCheckIn = async () => {
    if (!location || !user) return
    const res = await checkIn(location.lat, location.lng)
    
    // Always refresh profile state to capture updated streak and lives!
    await fetchProfile(user.id)

    if (res && res.success) {
      setCheckedIn(true)
      setShowConfetti(true)
      onSuccess(res.xp_awarded)
    }
  }

  const isLoading = geoLoading || checkInLoading

  return (
    <div className="flex-1 flex flex-col gap-2.5 relative">
      {showConfetti && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <ConfettiExplosion
            colors={['#58CC02', '#6C63FF', '#FF6B6B', '#FFD93D']}
            particleCount={80}
            duration={2200}
          />
        </div>
      )}

      {/* Dynamic Warning Alert Banners */}
      <AnimatePresence>
        {error && (error.includes('away') || error.includes('too_far')) && (
          <motion.div 
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="w-full bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 p-3 rounded-2xl border border-amber-200/50 text-left flex flex-col gap-0.5 text-xs font-semibold leading-relaxed"
          >
            <span className="font-extrabold text-amber-600 flex items-center gap-1">📍 Get closer to meetup!</span>
            <span className="text-[10px] opacity-90 leading-normal">
              Please get within 500m of the target location within 1 hour of the meetup time.
            </span>
          </motion.div>
        )}

        {error && error.includes('too_early') && (
          <motion.div 
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="w-full bg-blue-50 dark:bg-blue-950/20 text-blue-750 dark:text-blue-400 p-3 rounded-2xl border border-blue-200/50 text-left flex flex-col gap-0.5 text-xs font-semibold leading-relaxed"
          >
            <span className="font-extrabold text-blue-600 flex items-center gap-1">🔒 Check-in Locked</span>
            <span className="text-[10px] opacity-90 leading-normal">
              Check-ins are only available starting 1 hour before the meetup starts.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {checkedIn ? (
        <button disabled className="w-full py-3.5 rounded-2xl bg-green-500 text-white font-black text-center opacity-100 flex justify-center items-center gap-2 shadow-lg shadow-green-500/20">
          Checked In ✓
        </button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleCheckIn}
          disabled={isLoading || !location}
          className="w-full py-3.5 rounded-2xl bg-[#3498DB] hover:bg-[#2980B9] text-white font-black text-center shadow-lg flex justify-center items-center gap-2 disabled:opacity-70 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <MapPin className="w-5 h-5" />
              Check In
            </>
          )}
        </motion.button>
      )}
    </div>
  )
}
