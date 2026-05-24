import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, Plus, Compass } from 'lucide-react'
import { useGems } from '../hooks/useGems'
import { useGeolocation } from '../hooks/useGeolocation'
import { GemCard } from '../components/gems/GemCard'

export function GemsFeedPage() {
  const [activeTab, setActiveTab] = useState<'nearby' | 'pending'>('nearby')
  const { lat, lng } = useGeolocation()
  
  const { data: gems, isLoading } = useGems(
    lat ?? undefined,
    lng ?? undefined,
    50000, // 50km radius
    activeTab === 'nearby' ? 'approved' : 'pending'
  )

  return (
    <div className="min-h-screen bg-black pb-20 pt-16">
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="h-6 w-6 text-indigo-500" />
            Hidden Gems
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/gems/nominate"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <Plus className="h-5 w-5" />
            </Link>
            <Link
              to="/map"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <Map className="h-5 w-5" />
            </Link>
          </div>
        </div>
        
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => setActiveTab('nearby')}
            className={`relative pb-2 text-sm font-medium transition-colors ${
              activeTab === 'nearby' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Nearby Gems
            {activeTab === 'nearby' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`relative pb-2 text-sm font-medium transition-colors ${
              activeTab === 'pending' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Pending Nominations
            {activeTab === 'pending' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>
        </div>
      </div>

      <div className="p-4 pt-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : !gems || gems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-white/5 p-4 text-indigo-500">
              <Compass className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-white">No gems found</h3>
            <p className="text-gray-400">
              {activeTab === 'nearby' 
                ? "There are no approved gems near you yet. Be the first to nominate one!"
                : "There are no pending nominations to vote on right now."}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {gems.map((gem: any) => (
                <GemCard key={gem.id} gem={gem} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
