import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  initialized: boolean
  setSession: (session: Session | null) => void
  fetchProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  fetchProfile: async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      set({ profile: data })
    }
  }
}))

// Initialize auth state listener
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session)
  if (session?.user) {
    useAuthStore.getState().fetchProfile(session.user.id).finally(() => {
      useAuthStore.setState({ initialized: true })
    })
  } else {
    useAuthStore.setState({ initialized: true })
  }
})

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
  if (session?.user) {
    useAuthStore.getState().fetchProfile(session.user.id)
  } else {
    useAuthStore.setState({ profile: null })
  }
})
