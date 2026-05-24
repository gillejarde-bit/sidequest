import { useParams, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, Users, CheckCircle, Clock } from 'lucide-react'
import { useGem } from '../../hooks/useGem'
import { GemReviews } from '../../components/gems/GemReviews'
import { GemRatingForm } from '../../components/gems/GemRatingForm'

export function GemDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { data: gem, isLoading } = useGem(id)

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-black"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>
  }

  if (!gem) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-white">Gem not found</div>
  }

  const isPending = gem.gem_status === 'pending'
  const isApproved = gem.gem_status === 'approved'
  
  // Combine all photos
  const allPhotos = [...(gem.photo_urls || []), ...(gem.nomination_photo_urls || [])]

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="relative h-72 w-full bg-gray-900">
        {allPhotos.length > 0 ? (
          <img
            src={allPhotos[0]}
            alt={gem.name}
            className="h-full w-full object-cover opacity-80"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            No Photo Available
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <Link
          to="/gems"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {gem.category}
            </span>
            {isApproved && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md">
                <CheckCircle className="h-3 w-3" /> Approved
              </span>
            )}
            {isPending && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400 backdrop-blur-md">
                <Clock className="h-3 w-3" /> Pending Review
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">{gem.name}</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
          <div className="flex flex-col items-center">
            <Star className={`mb-1 h-6 w-6 ${isApproved ? 'text-yellow-500' : 'text-gray-500'}`} />
            <span className="text-xl font-bold text-white">{gem.avg_rating?.toFixed(1) || '-'}</span>
            <span className="text-xs text-gray-400">Rating</span>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div className="flex flex-col items-center">
            <Users className="mb-1 h-6 w-6 text-indigo-400" />
            <span className="text-xl font-bold text-white">{gem.visit_count || 0}</span>
            <span className="text-xs text-gray-400">Visits</span>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div className="flex flex-col items-center">
            <CheckCircle className="mb-1 h-6 w-6 text-emerald-400" />
            <span className="text-xl font-bold text-white">{gem.vote_count || 0}</span>
            <span className="text-xs text-gray-400">Votes</span>
          </div>
        </div>

        {isPending && (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <h3 className="mb-2 font-medium text-yellow-500">Community Review in Progress</h3>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-black/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((gem.vote_count || 0) / (gem.approval_threshold || 5)) * 100)}%` }}
                className="h-full bg-yellow-500"
              />
            </div>
            <p className="text-sm text-yellow-500/80">
              {gem.vote_count || 0} / {gem.approval_threshold || 5} votes needed for approval
            </p>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-lg font-semibold text-white">About this Gem</h2>
          <p className="text-gray-300 leading-relaxed">{gem.description || gem.nomination_description}</p>
        </div>

        {gem.profiles && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4">
            {gem.profiles.avatar_url ? (
              <img src={gem.profiles.avatar_url} alt="Nominator" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg font-bold text-white">
                {gem.profiles.display_name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400">Nominated by</p>
              <p className="font-medium text-white">{gem.profiles.display_name}</p>
            </div>
          </div>
        )}

        {isApproved && (
          <>
            <GemRatingForm gemId={gem.id} />
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">Reviews</h2>
              <GemReviews gemId={gem.id} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
