import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { motion } from 'framer-motion'

export function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, fetchProfile } = useAuthStore()
  
  // If profile is already set to something custom, use it, else blank
  const defaultUser = profile?.username?.startsWith('user_') ? '' : profile?.username
  const [username, setUsername] = useState(defaultUser || '')
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    
    const { error } = await supabase
      .from('profiles')
      .update({ username, display_name: displayName })
      .eq('id', user.id)

    if (!error) {
      await fetchProfile(user.id)
      navigate({ to: '/' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card p-8 rounded-2xl shadow-sm"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Set up your profile</h1>
        <p className="text-muted mb-8 text-center text-sm">How should your friends find you?</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-bold text-muted mb-1 block">Username</label>
            <input 
              type="text" 
              placeholder="quest_master_99"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full p-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-secondary bg-transparent"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-muted mb-1 block">Display Name</label>
            <input 
              type="text" 
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-secondary bg-transparent"
              required
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-primary text-primary-foreground font-bold p-4 rounded-xl mt-4"
            disabled={loading || !username || !displayName}
          >
            {loading ? 'Saving...' : 'Start Questing'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
