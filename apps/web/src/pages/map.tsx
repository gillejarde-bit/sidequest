import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Map, { NavigationControl, MapRef, Source, Layer, MapLayerMouseEvent, Marker } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { useSettingsStore } from '../stores/settingsStore'
import { supabase } from '../lib/supabase'

import { useGeolocation } from '../hooks/useGeolocation'
import { useFriendPresence } from '../hooks/useFriendPresence'
import { useFriends } from '../hooks/useFriends'
import { FilterBar } from '../components/map/FilterBar'
import { BottomSheet } from '../components/map/BottomSheet'
import { SearchBar } from '../components/map/SearchBar'
import { useMapStore } from '../stores/mapStore'
import { useMapGroupsStore } from '../stores/mapGroupsStore'
import { useAuthStore } from '../stores/auth'
import { getAvatarUrl } from '../lib/avatar'
import { Z_INDEX } from '../lib/zIndex'
import { Clock, MapPin, AlertCircle, Diamond, Locate, Map as MapIcon, Layers, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestRow {
  id: string
  name: string
  category: string | null
  description?: string | null
  status: string
  max_party_size?: number | null
  locations?: { lat: number | null; lng: number | null } | null
}

interface SelectedLocation {
  id: string
  name: string
  category: string
  description?: string
  lat: number
  lng: number
  placeDetails?: any // Google Place object
}

// ─── Category Colors ──────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

function getTimeUntil(dateStr: string) {
  const diffMs = new Date(dateStr).getTime() - Date.now()
  if (diffMs < 0) return 'Started'
  
  const diffHrs = diffMs / (1000 * 60 * 60)
  if (diffHrs < 1) {
    const mins = Math.round(diffMs / (1000 * 60))
    return `starts in ${mins}m!`
  }
  if (diffHrs < 24) {
    const hrs = Math.floor(diffHrs)
    const mins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `in ${hrs}h ${mins}m`
  }
  
  const startsDate = new Date(dateStr)
  return startsDate.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric' })
}

export function MapPage() {
  const mapRef = useRef<MapRef>(null)
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const userLoc = useGeolocation()
  const friendsMap = useFriendPresence({
    lat: userLoc.lat,
    lng: userLoc.lng,
    heading: userLoc.heading,
  })

  const { hiddenGroupIds } = useMapGroupsStore()
  const [groupMembers, setGroupMembers] = useState<{ group_id: string; user_id: string }[]>([])

  const [quests, setQuests] = useState<QuestRow[]>([])
  const [questAttendees, setQuestAttendees] = useState<Record<string, { username: string; avatar_url: string | null }[]>>({})

  useEffect(() => {
    if (quests.length === 0) return

    async function fetchAttendees() {
      const questIds = quests.map(q => q.id)
      const { data, error } = await supabase
        .from('quest_invites')
        .select(`
          quest_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .in('quest_id', questIds)
        .eq('status', 'accepted')

      if (!error && data) {
        const mapping: Record<string, { username: string; avatar_url: string | null }[]> = {}
        data.forEach((row: any) => {
          const questId = row.quest_id
          const profile = row.profiles
          if (profile) {
            const prof = Array.isArray(profile) ? profile[0] : profile
            if (prof) {
              if (!mapping[questId]) mapping[questId] = []
              mapping[questId].push({
                username: prof.username,
                avatar_url: prof.avatar_url
              })
            }
          }
        })
        setQuestAttendees(mapping)
      }
    }

    fetchAttendees()
  }, [quests])

  const getQuestPartyAvatars = useCallback((questId: string, creatorUsername: string | null, creatorAvatar: string | null) => {
    const list: { username: string; avatar_url: string | null }[] = []
    
    // Add creator first
    list.push({
      username: creatorUsername || 'Host',
      avatar_url: creatorAvatar
    })
    
    // Add other accepted attendees
    const attendeesList = questAttendees[questId] || []
    attendeesList.forEach(att => {
      if (att.username !== creatorUsername) {
        list.push(att)
      }
    })
    
    return list
  }, [questAttendees])

  const [gems, setGems] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)
  const [selectedQuest, setSelectedQuest] = useState<QuestRow | null>(null)
  const [selectedGem, setSelectedGem] = useState<any | null>(null)
  const [searchResultPin, setSearchResultPin] = useState<{lat: number, lng: number, place?: any} | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
  const [showEmptyState, setShowEmptyState] = useState(true)

  const hasCenteredOnUserRef = useRef(false)

  useEffect(() => {
    if (userLoc.lat !== null && userLoc.lng !== null && mapLoaded && !hasCenteredOnUserRef.current) {
      hasCenteredOnUserRef.current = true
      mapRef.current?.flyTo({
        center: [userLoc.lng, userLoc.lat],
        zoom: 14,
        duration: 1500
      })
    }
  }, [userLoc.lat, userLoc.lng, mapLoaded])

  const { activeFilters } = useMapStore()
  const { theme } = useSettingsStore()

  // Track if map style is ready to accept config properties
  const [styleLoaded, setStyleLoaded] = useState(false)

  const [isSoonPanelCollapsed, setIsSoonPanelCollapsed] = useState(false)

  const happeningSoonQuests = useMemo(() => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    return quests.filter((q: any) => {
      const qTime = new Date(q.starts_at).getTime()
      const timeDiff = qTime - now
      return timeDiff > 0 && timeDiff <= oneDay && (q.my_status === 'accepted' || q.my_status === 'creator')
    }).sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }, [quests])

  const handleSoonQuestTap = (q: any) => {
    if (q.location_lng && q.location_lat) {
      mapRef.current?.flyTo({
        center: [q.location_lng, q.location_lat],
        zoom: 15,
        duration: 1500
      })
      setSelectedQuest({
        id: q.id,
        title: q.name,
        name: q.name,
        category: q.category,
        time: `Starts ${getTimeUntil(q.starts_at)}`,
        description: q.description,
        joined_count: q.attendee_count,
      } as any)
    }
  }

  const handleRecenter = useCallback(() => {
    if (userLoc.lat !== null && userLoc.lng !== null) {
      mapRef.current?.flyTo({
        center: [userLoc.lng, userLoc.lat],
        zoom: 15,
        duration: 1500
      })
    }
  }, [userLoc.lat, userLoc.lng])

  const handleToggleViewMode = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    if (viewMode === '3d') {
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000
      })
      setViewMode('2d')
    } else {
      map.easeTo({
        pitch: 60,
        duration: 1000
      })
      setViewMode('3d')
    }
  }, [viewMode])

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      const { data: questData, error: questError } = await supabase.rpc('get_my_quests' as any, { filter_status: null })
      if (questError) {
        console.error('[Map] quests fetch error:', questError)
      } else {
        setQuests((questData as any[]) ?? [])
      }

      const { data: gemsData, error: gemsError } = await supabase.rpc('get_hidden_gems', { p_status: 'all' })
      if (gemsError) {
        console.error('[Map] gems fetch error:', gemsError)
      } else {
        setGems(gemsData ?? [])
      }

      // Fetch group memberships to filter friends on map
      const { data: gmData, error: gmError } = await supabase
        .from('group_members')
        .select('group_id, user_id')
      if (gmError) {
        console.error('[Map] group members fetch error:', gmError)
      } else {
        setGroupMembers(gmData || [])
      }
    }
    fetchData()
  }, [])

  // ── ISSUE 5 FIX: Sync filter state to Mapbox layer visibility ─────────────

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !mapLoaded) return

    const simpleLayerToggles: Array<{ filter: string; layerId: string }> = [
      { filter: 'Quests', layerId: 'quests-layer' },
      { filter: 'Friends', layerId: 'friends-layer' },
    ]

    simpleLayerToggles.forEach(({ filter, layerId }) => {
      if (map.getLayer(layerId)) {
        // If no filters active at all = show everything
        const visible = activeFilters.length === 0 || activeFilters.includes(filter)
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
      }
    })

    if (map.getLayer('gems-layer')) {
      const gemsVisible = activeFilters.length === 0 || activeFilters.includes('Gems')
      map.setLayoutProperty('gems-layer', 'visibility', gemsVisible ? 'visible' : 'none')
      map.setLayoutProperty('gems-glow', 'visibility', gemsVisible ? 'visible' : 'none')
    }
  }, [activeFilters, mapLoaded])

  // Sine wave animation for gem glow
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      const map = mapRef.current?.getMap();
      if (map && mapLoaded && map.getLayer('gems-glow')) {
        const time = performance.now();
        const baseRadius = 25;
        const radius = baseRadius + Math.sin(time / 200) * 10;
        map.setPaintProperty('gems-glow', 'circle-radius', radius);
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [mapLoaded]);



  const { data: friendshipsList = [] } = useFriends()

  // Helper to calculate Haversine distance in meters
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3 // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  const friendsList = useMemo(() => {
    return Array.from(friendsMap.values()).filter(f => {
      // 1. Must explicitly share location (privacy safety check)
      if (!f.share_location) return false

      // 2. Filter based on their selected scope:
      if (f.location_sharing_scope === 'friends') {
        // Must be reciprocal accepted friends
        const isFriend = friendshipsList.some(friend => friend.id === f.user_id)
        if (!isFriend) return false
      } else if (f.location_sharing_scope === 'crews') {
        // Must share at least one active, non-hidden crew
        const friendGroups = groupMembers.filter(gm => gm.user_id === f.user_id).map(gm => gm.group_id)
        const myGroups = groupMembers.filter(gm => gm.user_id === profile?.id).map(gm => gm.group_id)
        const shareCrew = friendGroups.some(groupId => myGroups.includes(groupId) && !hiddenGroupIds.includes(groupId))
        if (!shareCrew) return false
      } else if (f.location_sharing_scope === 'nearby') {
        // Must be within 5km of the current user
        if (userLoc.lat === null || userLoc.lng === null) return false
        const distance = calculateDistance(userLoc.lat, userLoc.lng, f.lat, f.lng)
        if (distance > 5000) return false // 5km limit
      } else {
        // Safe default: hide if anything else
        return false
      }

      return true
    })
  }, [friendsMap, groupMembers, hiddenGroupIds, friendshipsList, userLoc.lat, userLoc.lng, profile?.id, calculateDistance])



  // ── ISSUE 4 FIX: Map click handler ────────────────────────────────────────

  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    const features = event.features
    if (!features || features.length === 0) {
      setSelectedLocation(null)
      setSelectedQuest(null)
      setSelectedGem(null)
      setSearchResultPin(null)
      return
    }

    const feature = features[0]
    const layerId = feature.layer?.id

    if (layerId === 'search-pin-layer') {
      // already handled
    }
  }, [])

  const handleMapMouseEnter = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = 'pointer'
    }
  }, [])

  const handleMapMouseLeave = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = ''
    }
  }, [])

  // ── Derived bottom sheet state ─────────────────────────────────────────────

  const sheetMode = selectedLocation ? 'location' : selectedQuest ? 'quest' : selectedGem ? 'gem' : null
  const sheetData = selectedLocation ?? selectedQuest ?? selectedGem ?? null

  return (
    <div className="relative w-full h-[100dvh] bg-dark overflow-hidden">
      
      {/* Floating control overlay stacked at the top */}
      <div 
        className="absolute top-4 left-4 right-4 pointer-events-none flex flex-col gap-3"
        style={{ zIndex: Z_INDEX.map_ui }}
      >
        <div className="pointer-events-auto flex items-center justify-between w-full">
          <SearchBar 
            className="w-full max-w-[280px] sm:max-w-xs"
            onLocationSelect={(lat, lng, place) => {
              if (!place) {
                setSearchResultPin(null)
                if (selectedLocation?.id === 'search-result' || selectedLocation?.category === 'Search Result') {
                  setSelectedLocation(null)
                }
                return
              }
              setSearchResultPin({ lat, lng, place })
              setSelectedLocation({
                id: place?.place_id || 'search-result',
                name: place?.name || place?.formatted_address?.split(',')[0] || 'Selected Location',
                category: 'Search Result',
                lat,
                lng,
                placeDetails: place
              })
              mapRef.current?.flyTo({
                center: [lng, lat],
                zoom: 15,
                duration: 2000
              })
            }}
          />
        </div>
        
        <FilterBar className="pointer-events-auto w-full overflow-x-auto no-scrollbar flex gap-2" />

        {/* Subtle no quests pill shown if user dismissed the empty state */}
        {!showEmptyState && quests.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-auto self-start bg-white/90 dark:bg-[#1A1A2E]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-150 dark:border-gray-800 shadow-md flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-650 animate-pulse" />
            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              0 Active Quests Nearby
            </span>
          </motion.div>
        )}
      </div>

      {/* Happening Soon collapsible panel in top right corner */}
      {happeningSoonQuests.length > 0 && (
        <div 
          className="absolute top-4 right-4 pointer-events-auto bg-white/95 dark:bg-[#1A1A2E]/95 backdrop-blur-xl border border-gray-150 dark:border-gray-800 rounded-3xl p-3 shadow-xl transition-all w-full max-w-[280px] md:max-w-[320px]"
          style={{ zIndex: Z_INDEX.map_ui }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Happening Soon ({happeningSoonQuests.length})
            </span>
            
            <button
              type="button"
              onClick={() => setIsSoonPanelCollapsed(!isSoonPanelCollapsed)}
              className="text-[9px] font-black text-primary hover:underline cursor-pointer focus:outline-none"
            >
              {isSoonPanelCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>

          <AnimatePresence>
            {!isSoonPanelCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto no-scrollbar py-1">
                  {happeningSoonQuests.map((q: any) => {
                    const diffMs = new Date(q.starts_at).getTime() - Date.now()
                    const startsSoon = diffMs > 0 && diffMs < 60 * 60 * 1000 // < 1 hour
                    const timeUntilStr = getTimeUntil(q.starts_at)
                    
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleSoonQuestTap(q)}
                        className={`w-full p-2.5 rounded-xl border transition-all text-left cursor-pointer bg-gray-50/50 dark:bg-gray-900/50 ${
                          startsSoon
                            ? 'border-red-500 shadow-md shadow-red-500/10 animate-pulse'
                            : 'border-gray-100 dark:border-gray-800 hover:bg-gray-150/40 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <h4 className="text-xs font-black text-gray-900 dark:text-white truncate leading-tight">{q.name}</h4>
                        <p className={`text-[9px] font-extrabold mt-0.5 flex items-center gap-1 ${startsSoon ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                          <Clock className="w-2.5 h-2.5" />
                          <span>{startsSoon ? 'starts soon! ' : ''}{timeUntilStr}</span>
                        </p>
                        <p className="text-[8px] text-gray-450 dark:text-gray-450 font-bold mt-0.5 truncate flex items-center gap-0.5">
                          <MapPin className="w-2 h-2" />
                          {q.location_name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -115.1398,
          latitude: 36.1699,
          zoom: 12,
          pitch: 60, // Added pitch for 3D buildings
        }}
        mapStyle={theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        antialias={true}
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
        onMove={() => {
          const map = mapRef.current?.getMap()
          if (map) {
            const pitch = map.getPitch()
            const mode = pitch < 15 ? '2d' : '3d'
            setViewMode(mode)
          }
        }}
        onLoad={() => {
          setMapLoaded(true)
          const map = mapRef.current?.getMap()
          if (map) {
            try {
              map.setLayoutProperty('poi-label', 'visibility', 'none')
              map.setLayoutProperty('transit-label', 'visibility', 'none')
            } catch(e) {}
          }
        }}
        onStyleData={() => {
          const map = mapRef.current?.getMap()
          if (map && map.isStyleLoaded() && !styleLoaded) {
            setStyleLoaded(true)
            try {
              map.setLayoutProperty('poi-label', 'visibility', 'none')
              map.setLayoutProperty('transit-label', 'visibility', 'none')
            } catch(e) {}
          }
        }}
        onMouseEnter={handleMapMouseEnter}
        onMouseLeave={handleMapMouseLeave}
        interactiveLayerIds={[]}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* 3D Buildings */}
        <Layer
          id="3d-buildings"
          source="composite"
          source-layer="building"
          filter={['==', 'extrude', 'true']}
          type="fill-extrusion"
          minzoom={15}
          paint={{
            'fill-extrusion-color': theme === 'dark' ? '#1f2937' : '#f3f4f6',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.8
          }}
        />

        {/* User Location Marker */}
        {userLoc.lat !== null && userLoc.lng !== null && (
          <Marker longitude={userLoc.lng} latitude={userLoc.lat} anchor="center">
            <div className="relative flex items-center justify-center">
              {/* Pulse ring */}
              <motion.div 
                animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-12 h-12 bg-blue-500 rounded-full"
              />
              {/* Avatar / Person Icon */}
              <div className="w-10 h-10 bg-white rounded-full p-0.5 shadow-lg relative z-10 border-2 border-blue-500">
                {profile?.avatar_url ? (
                  <img src={getAvatarUrl(profile.avatar_url, profile.username)} alt="You" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'You'}
                  </div>
                )}
              </div>
            </div>
          </Marker>
        )}

        {/* Quests Markers */}
        {quests.map((q: any) => {
          if (!q.location_lng || !q.location_lat) return null
          
          const avatars = getQuestPartyAvatars(q.id, q.creator_username, q.creator_avatar)
          const totalPeople = avatars.length
          const displayAvatars = totalPeople >= 5 ? avatars.slice(0, 4) : avatars
          const extraCount = totalPeople >= 5 ? totalPeople - 4 : 0

          return (
            <Marker 
              key={`quest-${q.id}`} 
              longitude={q.location_lng} 
              latitude={q.location_lat} 
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                setSelectedQuest({
                  id: q.id,
                  title: q.name,
                  name: q.name,
                  category: q.category,
                  time: `Starts at ${new Date(q.starts_at).toLocaleString()}`,
                  description: q.description,
                  joined_count: q.attendee_count,
                } as any)
                setSelectedLocation(null)
                setSelectedGem(null)
              }}
            >
              <div className="flex flex-col items-center group cursor-pointer">
                {/* Star Pin */}
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,166,35,0.6)] border-2 border-white transition-transform group-hover:scale-110">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                
                {/* Avatars overlapping stack */}
                {totalPeople > 0 && (
                  <div className="flex -space-x-1.5 mt-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-0.5 rounded-full shadow-md border border-gray-100 dark:border-gray-800 transition-transform group-hover:scale-105 z-10">
                    {displayAvatars.map((av, index) => (
                      <div key={index} className="w-4 h-4 rounded-full border border-white dark:border-gray-900 overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        <img 
                          src={getAvatarUrl(av.avatar_url, av.username)} 
                          alt={av.username} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <div className="w-4 h-4 rounded-full bg-orange-500 text-white text-[7px] font-black flex items-center justify-center border border-white dark:border-gray-900 shrink-0 shadow-sm">
                        +{extraCount}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Marker>
          )
        })}

        {/* Gems Markers */}
        {(activeFilters.length === 0 || activeFilters.includes('Gems')) && gems.map((g: any) => {
          const isPending = g.gem_status === 'pending'
          return (
            <Marker
              key={`gem-${g.id}`}
              longitude={g.lng}
              latitude={g.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                setSelectedGem(g)
                setSelectedLocation(null)
                setSelectedQuest(null)
              }}
            >
              {isPending ? (
                /* Pending nominated gem: flashing amber warning icon */
                <div className="relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <div className="absolute w-9 h-9 bg-amber-500 rounded-full animate-ping opacity-45" />
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.7)] border-2 border-amber-200 z-10 animate-pulse">
                    <AlertCircle className="w-5 h-5 text-white stroke-[3.5]" />
                  </div>
                </div>
              ) : (
                /* Completed/Approved nominated gem: blue diamond icon */
                <div className="relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <div className="absolute w-9 h-9 bg-blue-500 rounded-full animate-ping opacity-40" />
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.7)] border-2 border-blue-200 z-10">
                    <Diamond className="w-4.5 h-4.5 text-white fill-white" />
                  </div>
                </div>
              )}
            </Marker>
          )
        })}

        {/* Friends */}
        {(activeFilters.length === 0 || activeFilters.includes('Friends')) && friendsList.map((f) => (
          <Marker 
            key={`friend-${f.user_id}`} 
            longitude={f.lng} 
            latitude={f.lat} 
            anchor="center"
          >
            <div className="relative flex items-center justify-center group cursor-pointer">
              {/* Green pulsing presence ring */}
              <motion.div 
                animate={{ scale: [1, 1.25], opacity: [0.4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-10 h-10 bg-[#58CC02] rounded-full"
              />
              {/* Avatar Container */}
              <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-lg relative z-10 border-2 border-[#58CC02] transition-transform group-hover:scale-110">
                <img 
                  src={getAvatarUrl(f.avatar_url, f.username)} 
                  alt={f.username} 
                  className="w-full h-full rounded-full object-cover" 
                />
                {/* Level badge */}
                <span className="absolute -bottom-1 -right-1 bg-[#58CC02] text-white text-[7px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-white dark:border-gray-900 shadow-sm">
                  {f.level || 1}
                </span>
              </div>
              
              {/* Hover Name Tag */}
              <div className="absolute -top-7 bg-gray-900/90 dark:bg-white/90 backdrop-blur-sm text-white dark:text-gray-900 px-2 py-0.5 rounded-lg text-[9px] font-extrabold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md border border-white/10 dark:border-gray-200 z-50">
                @{f.username}
              </div>
            </div>
          </Marker>
        ))}

        {/* Search Result Pin */}
        {searchResultPin && (
          <Source id="search-pin" type="geojson" data={{
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [searchResultPin.lng, searchResultPin.lat] },
              properties: {}
            }]
          }}>
            <Layer
              id="search-pin-layer"
              type="circle"
              paint={{
                'circle-radius': 10,
                'circle-color': '#EF4444', // Google Red
                'circle-stroke-width': 3,
                'circle-stroke-color': '#FFFFFF',
              }}
            />
          </Source>
        )}
      </Map>

      {/* Breathing vignette overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.4)] z-0"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 2D/3D View toggle floating button */}
      <motion.button
        type="button"
        onClick={handleToggleViewMode}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          y: sheetMode ? -340 : 0
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="absolute right-4 bottom-44 w-12 h-12 rounded-full shadow-lg flex items-center justify-center border cursor-pointer pointer-events-auto transition-all bg-white border-gray-150 text-gray-800 dark:bg-[#1A1A2E] dark:border-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
        style={{ zIndex: Z_INDEX.map_ui }}
        title={viewMode === '3d' ? 'Switch to 2D view' : 'Switch to 3D view'}
      >
        {viewMode === '3d' ? (
          <MapIcon className="w-5 h-5 text-primary" />
        ) : (
          <Layers className="w-5 h-5 text-primary" />
        )}
      </motion.button>

      {/* Re-center floating button */}
      <motion.button
        type="button"
        onClick={handleRecenter}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          y: sheetMode ? -340 : 0
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="absolute right-4 bottom-28 w-12 h-12 rounded-full shadow-lg flex items-center justify-center border cursor-pointer pointer-events-auto transition-all bg-white border-gray-150 text-gray-800 dark:bg-[#1A1A2E] dark:border-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
        style={{ zIndex: Z_INDEX.map_ui }}
        title="Re-center map"
      >
        <Locate 
          className={`w-6 h-6 text-primary transition-transform duration-500 ${
            userLoc.loading ? 'animate-spin' : ''
          }`} 
        />
      </motion.button>

      {/* Empty state */}
      {quests.length === 0 && gems.length === 0 && showEmptyState && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center z-0"
        >
          <div className="bg-white/90 dark:bg-[#1A1A2E]/85 backdrop-blur-md px-6 py-4 pr-10 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl relative pointer-events-auto">
            <button 
              onClick={() => setShowEmptyState(false)}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-gray-450 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg">No quests nearby... yet.</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Be the first to start an adventure 🧭</p>
          </div>
        </motion.div>
      )}



      {/* ISSUE 4 FIX: BottomSheet with real action handler */}
      <BottomSheet
        mode={sheetMode}
        data={sheetData}
        onClose={() => {
          setSelectedLocation(null)
          setSelectedQuest(null)
          setSelectedGem(null)
          // Also clear the search pin if they dismiss the bottom sheet,
          // so it doesn't leave a dead pin on the map.
          if (searchResultPin) {
            setSearchResultPin(null)
          }
        }}
        onAction={() => {
          if (selectedLocation) {
            navigate({
              to: '/quest/create',
              search: {
                lat: selectedLocation.lat,
                lng: selectedLocation.lng,
                name: selectedLocation.name,
                category: selectedLocation.category,
                place_id: selectedLocation.id, // we saved place_id in selectedLocation.id for search results
              } as any,
            })
          } else if (selectedQuest) {
            navigate({
              to: '/quest/$id',
              params: { id: selectedQuest.id }
            })
          } else if (selectedGem) {
            navigate({
              to: '/gems/$id',
              params: { id: selectedGem.id }
            })
          }
        }}
      />
    </div>
  )
}
