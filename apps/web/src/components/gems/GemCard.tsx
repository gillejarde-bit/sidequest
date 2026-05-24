import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { MapPin, Star } from 'lucide-react'
import { VoteButtons } from './VoteButtons'
import { useGemVoting } from '../../hooks/useGemVoting'

interface GemCardProps {
  gem: {
    id: string
    name: string
    category: string
    description: string
    photo_urls: string[]
    distance_meters: number
    gem_status: string
    avg_rating: number
    user_vote: number
  }
}

export function GemCard({ gem }: GemCardProps) {
  const { mutate: vote } = useGemVoting()
  const isPending = gem.gem_status === 'pending'
  const hasVoted = gem.user_vote !== 0

  const handleVote = (voteValue: number) => {
    vote({ gemId: gem.id, vote: voteValue })
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl"
    >
      <Link to={`/gems/$id`} params={{ id: gem.id }} className="block">
        <div className="relative h-48 w-full bg-gray-900">
          {gem.photo_urls && gem.photo_urls.length > 0 ? (
            <img
              src={gem.photo_urls[0]}
              alt={gem.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              No Photo
            </div>
          )}
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
            {gem.category}
          </div>
        </div>
        
        <div className="p-4">
          <div className="mb-1 flex items-start justify-between">
            <h3 className="text-lg font-semibold text-white">{gem.name}</h3>
            {gem.gem_status === 'approved' && (
              <div className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-sm text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                <span>{gem.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="mb-3 flex items-center gap-1 text-sm text-gray-400">
            <MapPin className="h-4 w-4" />
            <span>{formatDistance(gem.distance_meters)} away</span>
          </div>
          <p className="line-clamp-2 text-sm text-gray-300">{gem.description}</p>
        </div>
      </Link>

      {isPending && !hasVoted && (
        <div className="border-t border-white/10 p-4">
          <p className="mb-3 text-center text-sm font-medium text-gray-400">
            Does this look like a real Hidden Gem?
          </p>
          <VoteButtons onVote={handleVote} />
        </div>
      )}
      
      {isPending && hasVoted && (
        <div className="border-t border-white/10 p-4 text-center">
          <p className="text-sm font-medium text-emerald-400">
            Thanks for voting!
          </p>
        </div>
      )}
    </motion.div>
  )
}
