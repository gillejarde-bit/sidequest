import { create } from 'zustand'

interface MapState {
  activeFilters: string[]
  toggleFilter: (filter: string) => void
  setFilters: (filters: string[]) => void
}

export const useMapStore = create<MapState>((set) => ({
  activeFilters: [],
  toggleFilter: (filter) => set((state) => ({
    activeFilters: state.activeFilters.includes(filter)
      ? state.activeFilters.filter(f => f !== filter)
      : [...state.activeFilters, filter]
  })),
  setFilters: (filters) => set({ activeFilters: filters })
}))
