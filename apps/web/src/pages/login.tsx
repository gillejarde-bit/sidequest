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
          <div className="flex flex-col gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin
                  }
                })
                if (error) console.error('Google login error:', error)
              }}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold p-4 rounded-xl shadow-sm border border-gray-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </motion.button>

            <div className="relative py-2 flex items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-4 text-muted text-sm">or</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

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
          </div>
        )}
      </motion.div>
    </div>
  )
}
