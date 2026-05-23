import { create } from 'zustand'

export interface XPEvent {
  id: string
  points: number
  action: string
  timestamp: number
}

export interface LevelUpEvent {
  newLevel: number
  newTitle: string
  newBadges: string[]
}

interface XPStore {
  pendingXP: XPEvent[]
  levelUpEvent: LevelUpEvent | null
  newBadges: string[]
  addXPEvent: (points: number, action: string) => void
  clearXPEvent: (id: string) => void
  triggerLevelUp: (event: LevelUpEvent) => void
  clearLevelUp: () => void
  addNewBadge: (badgeId: string) => void
  clearNewBadges: () => void
}

export const useXPStore = create<XPStore>((set) => ({
  pendingXP: [],
  levelUpEvent: null,
  newBadges: [],
  addXPEvent: (points, action) => set((state) => ({
    pendingXP: [...state.pendingXP, {
      id: Math.random().toString(36).substring(7),
      points,
      action,
      timestamp: Date.now()
    }]
  })),
  clearXPEvent: (id) => set((state) => ({
    pendingXP: state.pendingXP.filter(e => e.id !== id)
  })),
  triggerLevelUp: (event) => set({ levelUpEvent: event }),
  clearLevelUp: () => set({ levelUpEvent: null }),
  addNewBadge: (badgeId) => set((state) => ({
    newBadges: [...state.newBadges, badgeId]
  })),
  clearNewBadges: () => set({ newBadges: [] })
}))
