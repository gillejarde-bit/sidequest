import { create } from 'zustand'
import { supabase } from '../../lib/supabase'

export interface QuestStampRecord {
  id: string
  user_id: string
  quest_id: string | null
  stamp_kind: string
  is_foil: boolean
  is_pioneer: boolean
  district: string | null
  first_visit: boolean
  earned_at: string
}

export interface PendingCeremony {
  questId: string
  category: string
  vibe: string
  isPioneer: boolean
  xpAwarded: number
  district: string
  questName: string
}

interface StampsState {
  stamps: QuestStampRecord[]
  loading: boolean
  hasMore: boolean
  pendingCeremony: PendingCeremony | null
  currentPageIndex: number
  
  // Actions
  setPendingCeremony: (ceremony: PendingCeremony | null) => void
  setCurrentPageIndex: (page: number) => void
  fetchUserStamps: (userId: string, reset?: boolean) => Promise<void>
  persistStamp: (stamp: Omit<QuestStampRecord, 'id' | 'earned_at'>) => Promise<void>
  addStampOptimistically: (stamp: QuestStampRecord) => void
}

export const useStampsStore = create<StampsState>((set, get) => ({
  stamps: [],
  loading: false,
  hasMore: true,
  pendingCeremony: null,
  currentPageIndex: 0, // Opens to Frontispiece/TOC

  setPendingCeremony: (ceremony) => set({ pendingCeremony: ceremony }),
  
  setCurrentPageIndex: (page) => set({ currentPageIndex: page }),

  fetchUserStamps: async (userId, reset = false) => {
    if (get().loading) return
    
    set({ loading: true })
    const limit = 12 // Chunk size for pagination
    const offset = reset ? 0 : get().stamps.length

    try {
      const { data, error } = await (supabase as any)
        .from('quest_stamps')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      const fetchedStamps = (data as any[]) || []
      
      set((state) => ({
        stamps: reset ? fetchedStamps : [...state.stamps, ...fetchedStamps],
        hasMore: fetchedStamps.length === limit,
        loading: false
      }))
    } catch (err) {
      console.error('Error loading quest stamps:', err)
      set({ loading: false })
    }
  },

  persistStamp: async (stamp) => {
    try {
      // TODO: move stamp+XP authority server-side
      const { error } = await (supabase as any)
        .from('quest_stamps')
        .insert([stamp])

      if (error) throw error
    } catch (err) {
      console.error('Error persisting quest stamp:', err)
    }
  },

  addStampOptimistically: (stamp) => {
    set((state) => {
      // Check if stamp already exists
      const exists = state.stamps.some(s => s.quest_id === stamp.quest_id)
      if (exists) return state
      
      return {
        stamps: [stamp, ...state.stamps]
      }
    })
  }
}))
