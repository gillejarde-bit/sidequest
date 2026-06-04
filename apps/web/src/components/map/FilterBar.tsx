import { useMapStore } from '../../stores/mapStore'
import { motion } from 'framer-motion'
import { 
  CompassIcon, 
  FriendsIcon, 
  GemIcon, 
  CampfireIcon, 
  MapIcon, 
  SparkleIcon 
} from '../icons'

const FILTERS = ['Quests', 'Friends', 'Gems', 'Food', 'Outdoors', 'Nightlife']

function getFilterIcon(filter: string, isActive: boolean) {
  switch (filter) {
    case 'Quests':
      return <CompassIcon size={16} active={isActive} withShadow={false} />
    case 'Friends':
      return <FriendsIcon size={16} active={isActive} withShadow={false} />
    case 'Gems':
      return <GemIcon size={16} active={isActive} withShadow={false} />
    case 'Food':
      return <CampfireIcon size={16} active={isActive} withShadow={false} />
    case 'Outdoors':
      return <MapIcon size={16} active={isActive} withShadow={false} />
    case 'Nightlife':
    default:
      return <SparkleIcon size={16} active={isActive} withShadow={false} />
  }
}

export function FilterBar({ className }: { className?: string }) {
  const { activeFilters, toggleFilter } = useMapStore()

  return (
    <div className={className || "absolute top-4 left-0 right-0 z-10 overflow-x-auto no-scrollbar px-4"}>
      <div className="flex gap-2 w-max py-1">
        {FILTERS.map((filter) => {
          const isActive = activeFilters.includes(filter)
          return (
            <motion.button
              key={filter}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleFilter(filter)}
              className={`relative px-4 py-1.5 text-xs font-medium transition-all shadow-[var(--sq-shadow-sticker)] flex items-center gap-1.5 cursor-pointer border-2 sq-wobbly-pill ${
                isActive 
                  ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border-[var(--sq-keyline)]' 
                  : 'bg-[var(--sq-surface)] text-[var(--sq-text-muted)] border-[var(--sq-hairline-strong)] hover:bg-[var(--sq-card-hover)]'
              }`}
            >
              {getFilterIcon(filter, isActive)}
              <span>{filter}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
