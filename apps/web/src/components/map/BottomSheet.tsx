import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Users, Star, Navigation, Share } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuestDetail } from '../../hooks/useQuestDetail'
import { getAvatarUrl } from '../../lib/avatar'

export type BottomSheetMode = 'location' | 'quest' | 'gem' | null

interface BottomSheetProps {
  mode: BottomSheetMode
  data: any
  onClose: () => void
  onAction: () => void
}

function QuestBottomSheetContent({ data, onAction }: { data: any, onAction: () => void }) {
  const { data: detailData } = useQuestDetail(data.id)
  const [placeDetails, setPlaceDetails] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let intervalId: any

    const initPlaces = () => {
      if (window.google?.maps?.places) {
        if (intervalId) clearInterval(intervalId)
        
        const service = new window.google.maps.places.PlacesService(document.createElement('div'))
        
        // Use Google Place ID if available, otherwise search by name
        const placeId = detailData?.location?.google_place_id || detailData?.location?.osm_id
        
        if (placeId && placeId.startsWith('ChI')) {
          service.getDetails({
            placeId: placeId,
            fields: ['photos', 'rating', 'user_ratings_total']
          }, (place: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              setPlaceDetails(place)
            } else {
              fallbackSearch(service)
            }
          })
        } else {
          fallbackSearch(service)
        }
      }
    }

    const fallbackSearch = (service: any) => {
      const locationName = detailData?.location?.name
      const lat = detailData?.location?.lat
      const lng = detailData?.location?.lng
      
      if (!locationName) return

      const request: any = {
        query: locationName,
      }
      
      if (lat !== undefined && lng !== undefined) {
        request.location = new window.google.maps.LatLng(lat, lng)
        request.radius = 1000
      }

      service.textSearch(request, (results: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
          setPlaceDetails(results[0])
        }
      })
    }

    if (detailData?.location) {
      if (window.google?.maps?.places) {
        initPlaces()
      } else {
        intervalId = setInterval(initPlaces, 300)
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [detailData?.location?.id, detailData?.location?.name])

  const handleShare = async () => {
    const url = `${window.location.origin}/quest/${data.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const locationName = detailData?.location?.name || ''
  const locationLat = detailData?.location?.lat
  const locationLng = detailData?.location?.lng

  return (
    <div className="space-y-4">
      <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 relative shadow-sm">
        {placeDetails?.photos?.[0] ? (
          <img 
            src={placeDetails.photos[0].getUrl({ maxWidth: 800, maxHeight: 400 })} 
            alt={locationName || data.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          /* Premium themed gradient fallback based on category with clean grid styling */
          <div className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden ${
            data.category?.toLowerCase() === 'food' ? 'bg-gradient-to-br from-amber-400 to-orange-600 dark:from-amber-600 dark:to-orange-950'
            : data.category?.toLowerCase() === 'outdoors' ? 'bg-gradient-to-br from-emerald-400 to-teal-700 dark:from-emerald-600 dark:to-teal-950'
            : data.category?.toLowerCase() === 'nightlife' ? 'bg-gradient-to-br from-indigo-500 to-purple-800 dark:from-indigo-700 dark:to-purple-950'
            : data.category?.toLowerCase() === 'culture' ? 'bg-gradient-to-br from-pink-400 to-rose-600 dark:from-pink-600 dark:to-rose-950'
            : data.category?.toLowerCase() === 'fitness' ? 'bg-gradient-to-br from-blue-400 to-cyan-600 dark:from-blue-600 dark:to-cyan-950'
            : data.category?.toLowerCase() === 'gaming' ? 'bg-gradient-to-br from-violet-400 to-fuchsia-700 dark:from-violet-600 dark:to-fuchsia-950'
            : 'bg-gradient-to-br from-gray-400 to-slate-600 dark:from-gray-700 dark:to-slate-900'
          }`}>
            <div className="absolute inset-0 opacity-10 dark:opacity-20">
              <svg width="100%" height="100%">
                <pattern id="pattern-circles-quest" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="2" fill="white" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#pattern-circles-quest)" />
              </svg>
            </div>
            
            <span className="text-white font-extrabold text-2xl uppercase tracking-wider relative z-10 drop-shadow-md">
              {data.category || 'Adventure'}
            </span>
            <span className="text-white/80 text-xs font-semibold uppercase tracking-widest mt-1 relative z-10 drop-shadow-sm">
              Sidequest POI
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>

      <div className="flex items-start justify-between pr-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{data.title || data.name}</h2>
          
          {locationName && (
            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 mb-2 font-medium">
              <MapPin size={14} className="text-primary" />
              {locationName}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="flex items-center gap-1">
              <Star size={16} className="text-secondary" />
              {data.category}
            </span>
            <span className="flex items-center gap-1">
              <Users size={16} />
              {detailData?.attendee_count || data.joined_count || 1} joined
            </span>
          </div>
          {data.time && (
            <p className="text-sm font-medium text-primary flex items-center gap-1">
              {data.time}
            </p>
          )}
        </div>
      </div>

      {detailData?.attendees && detailData.attendees.length > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex -space-x-2 overflow-hidden">
            {detailData.attendees.slice(0, 5).map((att: any) => (
              <img 
                key={att.user_id} 
                src={getAvatarUrl(att.avatar_url, att.username)} 
                alt={att.username} 
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#1A1A2E] bg-gray-200 dark:bg-gray-700 object-cover"
              />
            ))}
          </div>
          {detailData.attendees.length > 5 && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              +{detailData.attendees.length - 5} more
            </span>
          )}
        </div>
      )}

      {data.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
          {data.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button 
          onClick={onAction}
          className="col-span-2 bg-secondary text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          View Quest
        </button>
        
        {locationLat && locationLng && (
          <a 
            href={`https://maps.google.com/?q=${locationLat},${locationLng}`} 
            target="_blank" 
            rel="noreferrer"
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Navigation size={18} />
            Directions
          </a>
        )}
        
        <button 
          onClick={handleShare}
          className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Share size={18} />
          {copied ? 'Copied!' : 'Invite Others'}
        </button>
      </div>
    </div>
  )
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
        className="absolute bottom-[96px] left-0 right-0 bg-white dark:bg-[#1A1A2E] border-t border-gray-200 dark:border-gray-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 pb-safe touch-none"
      >
        <div className="p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>

          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6" />

          {mode === 'location' ? (
            <div className="space-y-4">
              <div className="w-full h-48 rounded-2xl overflow-hidden mb-4 relative shadow-sm">
                {data.placeDetails?.photos?.[0] ? (
                  <img 
                    src={data.placeDetails.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 })} 
                    alt={data.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  /* Premium themed gradient fallback based on category with clean grid styling */
                  <div className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden ${
                    data.category?.toLowerCase() === 'food' ? 'bg-gradient-to-br from-amber-400 to-orange-600 dark:from-amber-600 dark:to-orange-950'
                    : data.category?.toLowerCase() === 'outdoors' ? 'bg-gradient-to-br from-emerald-400 to-teal-700 dark:from-emerald-600 dark:to-teal-950'
                    : data.category?.toLowerCase() === 'nightlife' ? 'bg-gradient-to-br from-indigo-500 to-purple-800 dark:from-indigo-700 dark:to-purple-950'
                    : data.category?.toLowerCase() === 'culture' ? 'bg-gradient-to-br from-pink-400 to-rose-600 dark:from-pink-600 dark:to-rose-950'
                    : data.category?.toLowerCase() === 'fitness' ? 'bg-gradient-to-br from-blue-400 to-cyan-600 dark:from-blue-600 dark:to-cyan-950'
                    : data.category?.toLowerCase() === 'gaming' ? 'bg-gradient-to-br from-violet-400 to-fuchsia-700 dark:from-violet-600 dark:to-fuchsia-950'
                    : 'bg-gradient-to-br from-gray-400 to-slate-600 dark:from-gray-700 dark:to-slate-900'
                  }`}>
                    <div className="absolute inset-0 opacity-10 dark:opacity-20">
                      <svg width="100%" height="100%">
                        <pattern id="pattern-circles-loc" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="10" cy="10" r="2" fill="white" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#pattern-circles-loc)" />
                      </svg>
                    </div>
                    
                    <span className="text-white font-extrabold text-2xl uppercase tracking-wider relative z-10 drop-shadow-md">
                      {data.category || 'Adventure'}
                    </span>
                    <span className="text-white/80 text-xs font-semibold uppercase tracking-widest mt-1 relative z-10 drop-shadow-sm">
                      Sidequest POI
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              </div>
              <div className="flex items-start justify-between pr-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{data.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={16} />
                      {data.placeDetails?.types?.[0] 
                        ? data.placeDetails.types[0].replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) 
                        : data.category || 'Point of Interest'}
                    </span>
                    
                    {data.placeDetails?.rating && (
                      <span className="flex items-center gap-1 text-yellow-500 font-medium">
                        <Star size={16} className="fill-current" />
                        {data.placeDetails.rating} ({data.placeDetails.user_ratings_total})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {data.description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  {data.description}
                </p>
              )}

              {data.placeDetails?.website && (
                <a 
                  href={data.placeDetails.website} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-block mt-2 text-primary hover:underline text-sm font-medium"
                >
                  Visit Website ↗
                </a>
              )}

              <button 
                onClick={onAction}
                className="w-full mt-6 bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all"
              >
                Quest this spot
              </button>
            </div>
          ) : mode === 'quest' ? (
            <QuestBottomSheetContent data={data} onAction={onAction} />
          ) : mode === 'gem' ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between pr-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{data.name}</h2>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Star size={16} className="text-yellow-500" />
                    Hidden Gem • {data.category}
                  </p>
                </div>
              </div>
              
              {data.description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  {data.description}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => window.location.href = `/quest/create?lat=${data.lat}&lng=${data.lng}&name=${encodeURIComponent(data.name)}&category=${encodeURIComponent(data.category)}`}
                  className="flex-1 bg-white dark:bg-[#1A1A2E] border-2 border-primary text-primary font-bold py-3 rounded-xl hover:bg-primary/10 active:scale-[0.98] transition-all"
                >
                  Quest this spot
                </button>
                <button 
                  onClick={onAction}
                  className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all"
                >
                  View Full Details
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
