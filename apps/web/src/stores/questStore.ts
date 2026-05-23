import { create } from 'zustand'

export interface LocationResult {
  place_id: string | number
  display_name: string
  lat: string
  lon: string
}

interface QuestState {
  searchResults: LocationResult[]
  isSearching: boolean
  searchLocation: (query: string) => Promise<void>
  clearResults: () => void
}

export const useQuestStore = create<QuestState>((set) => ({
  searchResults: [],
  isSearching: false,
  searchLocation: async (query: string) => {
    if (!query || query.length < 3) {
      set({ searchResults: [] })
      return
    }
    set({ isSearching: true })
    try {
      const token = import.meta.env.VITE_MAPBOX_TOKEN
      if (!token) {
        console.error('Mapbox token is missing')
        set({ searchResults: [], isSearching: false })
        return
      }

      // Use Mapbox Search Box API v1 for fresher POI data
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(
          query
        )}&access_token=${token}&limit=5`
      )
      const data = await response.json()
      
      if (data.features) {
        const mappedResults: LocationResult[] = data.features.map((f: any) => ({
          place_id: f.properties?.mapbox_id || f.id || Math.random().toString(),
          display_name: f.properties?.name 
            ? (f.properties.full_address && !f.properties.full_address.startsWith(f.properties.name) 
                ? `${f.properties.name}, ${f.properties.full_address}` 
                : f.properties.name) 
            : (f.properties?.full_address || f.text),
          lon: f.geometry?.coordinates[0]?.toString() || f.center[0]?.toString(),
          lat: f.geometry?.coordinates[1]?.toString() || f.center[1]?.toString()
        }))
        set({ searchResults: mappedResults, isSearching: false })
      } else {
        set({ searchResults: [], isSearching: false })
      }
    } catch (error) {
      console.error('Error fetching location:', error)
      set({ searchResults: [], isSearching: false })
    }
  },
  clearResults: () => set({ searchResults: [] })
}))
