import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Loader2 } from 'lucide-react'
import { useGeolocation, useCheckIn } from '../../hooks/useCheckIn'
import ConfettiExplosion from 'react-confetti-explosion'
import { useAuthStore } from '../../stores/auth'
import { useNavigate } from '@tanstack/react-router'
import { useStampsStore } from '../../features/stamps/stampsStore'

interface CheckInButtonProps {
  questId: string
  initialCheckedIn?: boolean
  onSuccess: (xpAwarded: number) => void
  category?: string
  vibe?: string
  creatorId?: string
  isFellowshipEligible?: boolean
  locationName?: string
  questName?: string
}

export function CheckInButton({ 
  questId, 
  initialCheckedIn = false, 
  onSuccess,
  category,
  vibe,
  creatorId,
  isFellowshipEligible,
  locationName,
  questName
}: CheckInButtonProps) {
  const { location, loading: geoLoading } = useGeolocation()
  const { checkIn, loading: checkInLoading, error } = useCheckIn(questId)
  const { user, fetchProfile } = useAuthStore()
  const navigate = useNavigate()
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setCheckedIn(initialCheckedIn)
  }, [initialCheckedIn])

  const handleCheckIn = async () => {
    if (!location || !user) return
    const res = await checkIn(location.lat, location.lng, { 
      category: category || '', 
      vibe: vibe || '', 
      creatorId: creatorId || '',
      isFellowshipEligible: isFellowshipEligible || false,
      locationName: locationName || '',
      questName: questName || ''
    })

    // Always refresh profile state to capture updated streak and lives!
    await fetchProfile(user.id)

    if (res && res.success) {
      setCheckedIn(true)
      setShowConfetti(true)

      // Set pending ceremony in the stamps store
      useStampsStore.getState().setPendingCeremony({
        questId,
        category: category || 'Default',
        vibe: vibe || 'Chill',
        isPioneer: res.is_pioneer || false,
        xpAwarded: res.xp_awarded || 20,
        district: locationName || 'Unknown District',
        questName: questName || 'Quest'
      })

      onSuccess(res.xp_awarded)

      // Navigate to /quests after 1.2 seconds of confetti burst
      setTimeout(() => {
        navigate({ to: '/quests' })
      }, 1200)
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

        {error && !error.includes('away') && !error.includes('too_far') && !error.includes('too_early') && (
          <motion.div 
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="w-full bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3 rounded-2xl border border-red-200/50 text-left flex flex-col gap-0.5 text-xs font-semibold leading-relaxed"
          >
            <span className="font-extrabold text-red-600 flex items-center gap-1">⚠️ Check-in Failed</span>
            <span className="text-[10px] opacity-90 leading-normal">
              {error}
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
