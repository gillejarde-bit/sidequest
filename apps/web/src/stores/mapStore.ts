import { create } from 'zustand'

interface MapState {
  activeFilters: string[]
  toggleFilter: (filter: string) => void
  setFilters: (filters: string[]) => void
  
  // Fog-of-war states
  revealSet: Set<string>
  setRevealSet: (cells: Set<string> | string[]) => void
  addRevealedCells: (cells: string[]) => void
  
  // Camera/map modes
  followMode: boolean
  setFollowMode: (mode: boolean) => void
  activeDistrictId: string | null
  setActiveDistrictId: (id: string | null) => void
  activeFlight: string | null
  setActiveFlight: (flight: string | null) => void
}

export const useMapStore = create<MapState>((set) => ({
  activeFilters: [],
  toggleFilter: (filter) => set((state) => ({
    activeFilters: state.activeFilters.includes(filter)
      ? state.activeFilters.filter(f => f !== filter)
      : [...state.activeFilters, filter]
  })),
  setFilters: (filters) => set({ activeFilters: filters }),
  
  // Fog-of-war states initial values and actions
  revealSet: new Set<string>(),
  setRevealSet: (cells) => set(() => ({
    revealSet: cells instanceof Set ? cells : new Set(cells)
  })),
  addRevealedCells: (cells) => set((state) => {
    const next = new Set(state.revealSet)
    cells.forEach(c => next.add(c))
    return { revealSet: next }
  }),
  
  // Camera/map modes initial values and actions
  followMode: true,
  setFollowMode: (mode) => set({ followMode: mode }),
  activeDistrictId: null,
  setActiveDistrictId: (id) => set({ activeDistrictId: id }),
  activeFlight: null,
  setActiveFlight: (flight) => set({ activeFlight: flight })
}))
