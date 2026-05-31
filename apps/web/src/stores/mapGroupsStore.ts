import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MapGroupsState {
  hiddenGroupIds: string[]
  toggleGroupVisibility: (groupId: string) => void
  setHiddenGroups: (ids: string[]) => void
}

export const useMapGroupsStore = create<MapGroupsState>()(
  persist(
    (set) => ({
      hiddenGroupIds: [],
      toggleGroupVisibility: (groupId) =>
        set((state) => ({
          hiddenGroupIds: state.hiddenGroupIds.includes(groupId)
            ? state.hiddenGroupIds.filter((id) => id !== groupId)
            : [...state.hiddenGroupIds, groupId],
        })),
      setHiddenGroups: (ids) => set({ hiddenGroupIds: ids }),
    }),
    {
      name: 'sidequest-map-groups-filter',
    }
  )
)
