import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  shareLocation: boolean
  setShareLocation: (val: boolean) => void
  toggleShareLocation: () => void
  locationSharingScope: 'friends' | 'crews' | 'nearby'
  setLocationSharingScope: (scope: 'friends' | 'crews' | 'nearby') => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark', // Default to sleek night mode
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      shareLocation: false, // Default to false (Ghost Mode) for safety on signup
      setShareLocation: (shareLocation) => set({ shareLocation }),
      toggleShareLocation: () => set((state) => ({ shareLocation: !state.shareLocation })),
      locationSharingScope: 'friends', // Default to Friends only
      setLocationSharingScope: (locationSharingScope) => set({ locationSharingScope }),
    }),
    {
      name: 'sidequest-settings',
    }
  )
)
