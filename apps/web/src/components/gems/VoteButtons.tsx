import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import ConfettiExplosion from 'react-confetti-explosion'

interface VoteButtonsProps {
  onVote: (vote: number) => void
  disabled?: boolean
}

export function VoteButtons({ onVote, disabled }: VoteButtonsProps) {
  const [isExploding, setIsExploding] = useState(false)

  const handleApprove = () => {
    setIsExploding(true)
    onVote(1)
  }

  const handleSkip = () => {
    onVote(-1)
  }

  return (
    <div className="flex items-center justify-center gap-4">
      {isExploding && <ConfettiExplosion force={0.8} duration={3000} particleCount={250} width={1600} />}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSkip}
        disabled={disabled}
        className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
      >
        <X className="h-5 w-5" />
        Skip
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleApprove}
        disabled={disabled}
        className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-600 disabled:opacity-50"
      >
        <Check className="h-5 w-5" />
        Approve
      </motion.button>
    </div>
  )
}
