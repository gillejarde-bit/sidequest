import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Users, Star } from 'lucide-react'

export type BottomSheetMode = 'location' | 'quest' | null

interface BottomSheetProps {
  mode: BottomSheetMode
  data: any
  onClose: () => void
  onAction: () => void
}

export function BottomSheet({ mode, data, onClose, onAction }: BottomSheetProps) {
  if (!mode || !data) return null

  return (
    <AnimatePresence>
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, { offset, velocity }) => {
          if (offset.y > 100 || velocity.y > 500) {
            onClose()
          }
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute bottom-[64px] left-0 right-0 bg-[#1A1A2E] border-t border-gray-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 pb-safe touch-none"
      >
        <div className="p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-800 text-gray-400"
          >
            <X size={20} />
          </button>

          <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6" />

          {mode === 'location' ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between pr-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{data.name}</h2>
                  <p className="text-gray-400 flex items-center gap-1">
                    <MapPin size={16} />
                    {data.category || 'Point of Interest'}
                  </p>
                </div>
              </div>
              
              {data.description && (
                <p className="text-gray-300 text-sm leading-relaxed">
                  {data.description}
                </p>
              )}

              <button 
                onClick={onAction}
                className="w-full mt-6 bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all"
              >
                Quest this spot
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between pr-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{data.title}</h2>
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Star size={16} className="text-secondary" />
                      {data.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {data.joined_count || 1} joined
                    </span>
                  </div>
                </div>
              </div>

              {data.description && (
                <p className="text-gray-300 text-sm leading-relaxed">
                  {data.description}
                </p>
              )}

              <button 
                onClick={onAction}
                className="w-full mt-6 bg-secondary text-dark font-bold py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
              >
                View Quest
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
