import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Map, { NavigationControl, MapRef, Source, Layer, MapLayerMouseEvent, Marker } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { useSettingsStore } from '../stores/settingsStore'
import { supabase } from '../lib/supabase'

import { useGeolocation } from '../hooks/useGeolocation'
import { useFriendPresence } from '../hooks/useFriendPresence'
import { FilterBar } from '../components/map/FilterBar'
import { BottomSheet } from '../components/map/BottomSheet'
import { SearchBar } from '../components/map/SearchBar'
import { useMapStore } from '../stores/mapStore'
import { useMapGroupsStore } from '../stores/mapGroupsStore'
import { useAuthStore } from '../stores/auth'
import { getAvatarUrl } from '../lib/avatar'

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
  const [gems, setGems] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)
  const [selectedQuest, setSelectedQuest] = useState<QuestRow | null>(null)
  const [selectedGem, setSelectedGem] = useState<any | null>(null)
  const [searchResultPin, setSearchResultPin] = useState<{lat: number, lng: number, place?: any} | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const { activeFilters } = useMapStore()
  const { theme } = useSettingsStore()

  // Track if map style is ready to accept config properties
  const [styleLoaded, setStyleLoaded] = useState(false)

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      const { data: questData, error: questError } = await supabase.rpc('get_my_quests' as any, { filter_status: null })
      if (questError) {
        console.error('[Map] quests fetch error:', questError)
      } else {
        setQuests((questData as any[]) ?? [])
      }

      const { data: gemsData, error: gemsError } = await supabase.rpc('get_hidden_gems', { p_status: 'approved' })
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



  // ── GeoJSON Sources ────────────────────────────────────────────────────────

  const friendsGeoJSON = useMemo(() => {
    const filteredFriends = Array.from(friendsMap.values()).filter(f => {
      // Find all groups this friend belongs to
      const friendGroups = groupMembers.filter(gm => gm.user_id === f.user_id).map(gm => gm.group_id)
      
      // If the friend is not in any group, they are visible by default
      if (friendGroups.length === 0) return true
      
      // Otherwise, they must belong to at least one group that is NOT hidden
      return friendGroups.some(groupId => !hiddenGroupIds.includes(groupId))
    })

    return {
      type: 'FeatureCollection' as const,
      features: filteredFriends.map(f => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
        properties: { username: f.username, level: f.level }
      }))
    }
  }, [friendsMap, groupMembers, hiddenGroupIds])



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
      <FilterBar />
      <SearchBar 
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
        {quests.map((q: any) => q.location_lng && q.location_lat && (
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
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,166,35,0.6)] border-2 border-white cursor-pointer hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
          </Marker>
        ))}

        {/* Gems Markers */}
        {gems.map((g: any) => (
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
            <div className="relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
              <div className="absolute w-10 h-10 bg-indigo-500 rounded-full animate-ping opacity-40" />
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.6)] border-2 border-indigo-200 z-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
            </div>
          </Marker>
        ))}

        {/* Friends */}
        <Source id="friends-source" type="geojson" data={friendsGeoJSON}>
          <Layer
            id="friends-layer"
            type="circle"
            paint={{
              'circle-radius': 12,
              'circle-color': '#58CC02',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#FFFFFF',
              'circle-opacity': 1,
            }}
          />
        </Source>

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

      {/* Empty state */}
      {quests.length === 0 && gems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center z-0"
        >
          <div className="bg-white/90 dark:bg-[#1A1A2E]/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
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
