import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Map, { NavigationControl, MapRef, Source, Layer, MapLayerMouseEvent } from 'react-map-gl'
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationRow {
  id: string
  name: string
  category: string
  description: string
  address: string
  is_hidden_gem: boolean
  lat: number
  lng: number
}

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

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF6B6B',
  outdoors: '#58CC02',
  nightlife: '#9B59B6',
  fitness: '#E67E22',
  culture: '#3498DB',
  gaming: '#E91E63',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MapPage() {
  const mapRef = useRef<MapRef>(null)
  const navigate = useNavigate()

  const userLoc = useGeolocation()
  const friendsMap = useFriendPresence({
    lat: userLoc.lat,
    lng: userLoc.lng,
    heading: userLoc.heading,
  })

  const [locations, setLocations] = useState<LocationRow[]>([])
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
      // ISSUE 3 FIX: Use RPC to extract lat/lng from PostGIS geography column
      const { data: locData, error: locError } = await supabase.rpc('get_locations_with_coords')
      if (locError) {
        console.error('[Map] locations fetch error:', locError)
      } else {
        console.log('[Map] locations loaded:', locData?.length)
        setLocations((locData as LocationRow[]) ?? [])
      }

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
    }
    fetchData()
  }, [])

  // ── ISSUE 5 FIX: Sync filter state to Mapbox layer visibility ─────────────

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !mapLoaded) return

    // Category-specific: if any category filter is active, filter POIs
    const categoryFilters = activeFilters.filter(f =>
      ['Food', 'Outdoors', 'Nightlife', 'Gems'].includes(f)
    )

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

    if (map.getLayer('locations-layer')) {
      const locVisible = activeFilters.length === 0 || categoryFilters.length > 0
      map.setLayoutProperty('locations-layer', 'visibility', locVisible ? 'visible' : 'none')
    }

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

  const userGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: userLoc.lat !== null && userLoc.lng !== null
      ? [{
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [userLoc.lng, userLoc.lat] },
          properties: {}
        }]
      : []
  }), [userLoc.lat, userLoc.lng])

  const friendsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: Array.from(friendsMap.values()).map(f => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
      properties: { username: f.username, level: f.level }
    }))
  }), [friendsMap])

  const locationsGeoJSON = useMemo(() => {
    // If category filters are active, filter down
    const categoryFilters = activeFilters.filter(f =>
      ['Food', 'Outdoors', 'Nightlife', 'Gems', 'Culture', 'Fitness', 'Gaming'].includes(f)
    )
    const filtered = categoryFilters.length > 0
      ? locations.filter(l => l.category && categoryFilters.map(f => f.toLowerCase()).includes(l.category.toLowerCase()))
      : locations

    return {
      type: 'FeatureCollection' as const,
      features: filtered.map(l => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [l.lng, l.lat] },
        properties: {
          id: l.id,
          name: l.name,
          category: l.category,
          description: l.description,
        }
      }))
    }
  }, [locations, activeFilters])

  const questsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: quests
      .filter((q: any) => q.location_lng && q.location_lat)
      .map((q: any) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [q.location_lng, q.location_lat]
        },
        properties: {
          id: q.id,
          title: q.name,
          category: q.category,
          description: `Starts at ${new Date(q.starts_at).toLocaleString()}`,
          joined_count: q.attendee_count,
        }
      }))
  }), [quests])

  const gemsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: gems.map(g => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [g.lng, g.lat] },
      properties: {
        id: g.id,
        name: g.name,
        category: g.category,
        description: g.description,
      }
    }))
  }), [gems])

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
    const props = feature.properties
    const coords = (feature.geometry as GeoJSON.Point).coordinates
    const layerId = feature.layer?.id

    if (layerId === 'locations-layer') {
      setSelectedLocation({
        id: props?.id,
        name: props?.name,
        category: props?.category,
        description: props?.description,
        lat: coords[1],
        lng: coords[0],
      })
      setSelectedQuest(null)
      setSelectedGem(null)
    } else if (layerId === 'quests-layer') {
      setSelectedQuest({
        id: props?.id,
        name: props?.name,
        category: props?.category,
        description: props?.description,
        max_party_size: props?.max_party_size,
        status: '',
      })
      setSelectedLocation(null)
      setSelectedGem(null)
    } else if (layerId === 'gems-layer' || layerId === 'gems-glow') {
      setSelectedGem({
        id: props?.id,
        name: props?.name,
        category: props?.category,
        description: props?.description,
        lat: coords[1],
        lng: coords[0],
      })
      setSelectedLocation(null)
      setSelectedQuest(null)
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
        interactiveLayerIds={['locations-layer', 'quests-layer', 'gems-layer']}
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

        {/* ISSUE 2 FIX: Custom blue user dot */}
        <Source id="user-location" type="geojson" data={userGeoJSON}>
          {/* Pulse ring */}
          <Layer
            id="user-dot-pulse"
            type="circle"
            paint={{
              'circle-radius': 20,
              'circle-color': '#4A90D9',
              'circle-opacity': 0.15,
            }}
          />
          {/* Solid dot */}
          <Layer
            id="user-dot"
            type="circle"
            paint={{
              'circle-radius': 10,
              'circle-color': '#4A90D9',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#FFFFFF',
              'circle-opacity': 1,
            }}
          />
        </Source>

        {/* ISSUE 3 FIX: Location POIs using circle layer (no custom images needed) */}
        <Source id="locations-source" type="geojson" data={locationsGeoJSON}>
          <Layer
            id="locations-layer"
            type="circle"
            minzoom={10}
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 5,
                15, 10,
              ],
              'circle-color': [
                'match', ['get', 'category'],
                'food', CATEGORY_COLORS.food,
                'outdoors', CATEGORY_COLORS.outdoors,
                'nightlife', CATEGORY_COLORS.nightlife,
                'fitness', CATEGORY_COLORS.fitness,
                'culture', CATEGORY_COLORS.culture,
                'gaming', CATEGORY_COLORS.gaming,
                '#6C63FF',
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
              'circle-opacity': 0.9,
            }}
          />
        </Source>

        {/* Quests */}
        <Source id="quests-source" type="geojson" data={questsGeoJSON}>
          <Layer
            id="quests-layer"
            type="circle"
            paint={{
              'circle-radius': 12,
              'circle-color': '#F5A623',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#FFFFFF',
              'circle-opacity': 0.95,
            }}
          />
        </Source>

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

        {/* Gems */}
        <Source id="gems-source" type="geojson" data={gemsGeoJSON}>
          <Layer
            id="gems-glow"
            type="circle"
            paint={{
              'circle-radius': 25,
              'circle-color': '#6366f1',
              'circle-opacity': 0.4,
              'circle-blur': 0.5,
            }}
          />
          <Layer
            id="gems-layer"
            type="circle"
            paint={{
              'circle-radius': 14,
              'circle-color': '#4f46e5',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#e0e7ff',
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
      {quests.length === 0 && locations.length === 0 && (
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
