import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'

export function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    
    if (error) {
      console.error("Supabase Login Error:", error)
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card p-8 rounded-2xl shadow-sm text-center"
      >
        <div className="text-5xl mb-6">🗺️</div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Ready for a Sidequest?</h1>
        <p className="text-muted mb-8">Enter your email to get a magic login link.</p>
        
        {status === 'success' ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-primary/10 text-primary font-bold p-4 rounded-xl">
            ✨ Magic link sent! Check your inbox.
          </motion.div>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="email" 
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-secondary bg-transparent"
              required
            />
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-primary text-primary-foreground font-bold p-4 rounded-xl"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
            </motion.button>
            {status === 'error' && (
              <p className="text-accent text-sm mt-2">
                Error: {errorMessage || 'Failed to send link'}
              </p>
            )}
          </form>
        )}
      </motion.div>
    </div>
  )
}
