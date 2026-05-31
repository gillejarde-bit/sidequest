import { useMapStore } from '../../stores/mapStore'
import { motion } from 'framer-motion'

const FILTERS = ['Quests', 'Friends', 'Gems', 'Food', 'Outdoors', 'Nightlife']

export function FilterBar({ className }: { className?: string }) {
  const { activeFilters, toggleFilter } = useMapStore()

  return (
    <div className={className || "absolute top-4 left-0 right-0 z-10 overflow-x-auto no-scrollbar px-4"}>
      <div className="flex gap-2 w-max">
        {FILTERS.map((filter) => {
          const isActive = activeFilters.includes(filter)
          return (
            <motion.button
              key={filter}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleFilter(filter)}
              className={`relative isolate px-4 py-2 rounded-full text-sm font-semibold transition-colors shadow-sm backdrop-blur-md overflow-hidden ${
                isActive 
                  ? 'text-white border-transparent' 
                  : 'bg-white/90 dark:bg-[#1A1A2E]/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1A1A2E] border'
              }`}
            >
              {isActive && (
                <motion.div 
                  className="absolute inset-0 bg-primary z-[-1]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              {filter}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
