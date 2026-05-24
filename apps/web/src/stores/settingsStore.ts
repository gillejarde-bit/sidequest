import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  shareLocation: boolean
  toggleShareLocation: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark', // Default to sleek night mode
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      shareLocation: true,
      toggleShareLocation: () => set((state) => ({ shareLocation: !state.shareLocation })),
    }),
    {
      name: 'sidequest-settings',
    }
  )
)
