import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Loader2 } from 'lucide-react'
import { useGeolocation, useCheckIn } from '../../hooks/useCheckIn'
import ConfettiExplosion from 'react-confetti-explosion'

interface CheckInButtonProps {
  questId: string
  onSuccess: (xpAwarded: number) => void
}

export function CheckInButton({ questId, onSuccess }: CheckInButtonProps) {
  const { location, loading: geoLoading } = useGeolocation()
  const { checkIn, loading: checkInLoading, error } = useCheckIn(questId)
  const [checkedIn, setCheckedIn] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const handleCheckIn = async () => {
    if (!location) return
    const res = await checkIn(location.lat, location.lng)
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

  if (error && error.includes('away')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-red-50 text-red-600 rounded-2xl py-2">
        <span className="font-bold text-sm leading-tight">{error}</span>
        <span className="text-xs opacity-80 leading-tight">Get closer to check in</span>
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
