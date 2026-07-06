import { useState } from 'react'
import { motion } from 'framer-motion'
import ConfettiExplosion from 'react-confetti-explosion'
import { CheckIcon, CloseIcon } from '../icons'

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
    <div className="relative flex items-center justify-center gap-3">
      {isExploding && <ConfettiExplosion force={0.8} duration={3000} particleCount={180} width={1200} />}
      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSkip}
        disabled={disabled}
        className="flex items-center gap-2 rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] px-5 py-3 text-[13px] font-medium text-[var(--sq-text-muted)] transition-colors hover:bg-[var(--sq-card-hover)] disabled:opacity-50"
      >
        <CloseIcon size={20} withShadow={false} />
        Not quite
      </motion.button>
      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleApprove}
        disabled={disabled}
        className="flex items-center gap-2 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/25 bg-[var(--sq-ember-500)] px-5 py-3 text-[13px] font-medium text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] transition-colors hover:bg-[var(--sq-ember-600)] disabled:opacity-50"
      >
        <CheckIcon size={20} active withShadow={false} />
        Approve
      </motion.button>
    </div>
  )
}
