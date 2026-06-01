import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Loader2 } from 'lucide-react'
import { useGeolocation, useCheckIn } from '../../hooks/useCheckIn'
import ConfettiExplosion from 'react-confetti-explosion'

import { useAuthStore } from '../../stores/auth'

interface CheckInButtonProps {
  questId: string
  onSuccess: (xpAwarded: number) => void
}

export function CheckInButton({ questId, onSuccess }: CheckInButtonProps) {
  const { location, loading: geoLoading } = useGeolocation()
  const { checkIn, loading: checkInLoading, error } = useCheckIn(questId)
  const { user, fetchProfile } = useAuthStore()
  const [checkedIn, setCheckedIn] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

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

  if (checkedIn) {
    return (
      <div className="relative flex-1">
        {showConfetti && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <ConfettiExplosion
              colors={['#58CC02', '#6C63FF', '#FF6B6B', '#FFD93D']}
              particleCount={80}
              duration={2200}
            />
          </div>
        )}
        <button disabled className="w-full py-3.5 rounded-2xl bg-green-500 text-white font-bold text-center opacity-100 flex justify-center items-center gap-2">
          Checked In ✓
        </button>
      </div>
    )
  }

  if (error && error.includes('too_early')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl py-2 px-3 text-center border border-amber-200/50">
        <span className="font-bold text-xs leading-tight">Check-in Locked 🔒</span>
        <span className="text-[10px] opacity-90 leading-tight mt-0.5">Starts 1 hour before quest time.</span>
      </div>
    )
  }

  if (error && (error.includes('away') || error.includes('too_far'))) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-2xl py-2 px-3 text-center border border-red-200/50 animate-shake">
        <span className="font-bold text-xs leading-tight">Streak Broken! 💔</span>
        <span className="text-[10px] opacity-90 leading-tight mt-0.5">Too far from target location.</span>
      </div>
    )
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleCheckIn}
      disabled={isLoading || !location}
      className="flex-1 py-3.5 rounded-2xl bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold text-center shadow-lg flex justify-center items-center gap-2 disabled:opacity-70"
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
  )
}
