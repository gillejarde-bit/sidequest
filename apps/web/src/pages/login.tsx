import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

function GeometryAnimation() {
  const squares = Array.from({ length: 12 })
  return (
    <div className="relative w-64 h-64 mx-auto my-8 flex items-center justify-center overflow-hidden rounded-3xl border border-primary/15 bg-primary/5 dark:bg-primary/5 shadow-inner">
      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#58cc020a_1px,transparent_1px),linear-gradient(to_bottom,#58cc020a_1px,transparent_1px)] bg-[size:16px_16px]" />
      
      {/* Coordinate axes */}
      <div className="absolute w-full border-t border-dashed border-[#58CC02]/20" />
      <div className="absolute h-full border-l border-dashed border-[#58CC02]/20" />
      
      {/* Radar sweeping circle animation */}
      <motion.div 
        className="absolute w-48 h-48 rounded-full border border-teal-500/10"
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute w-24 h-24 rounded-full border border-[#58CC02]/10"
        animate={{ scale: [1.2, 0.6, 1.2], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      {/* Dynamic Floating Squares */}
      {squares.map((_, i) => {
        const size = Math.random() * 20 + 10
        const isTeal = Math.random() > 0.5
        return (
          <motion.div
            key={i}
            className={`absolute rounded-md ${
              isTeal 
                ? 'bg-teal-500/15 dark:bg-teal-400/20 border border-teal-500/40 shadow-sm' 
                : 'bg-[#58CC02]/15 dark:bg-[#58CC02]/20 border border-[#58CC02]/40 shadow-sm'
            }`}
            style={{
              width: size,
              height: size,
              left: `${Math.random() * 70 + 15}%`,
              top: `${Math.random() * 70 + 15}%`,
            }}
            animate={{
              y: [0, Math.random() * -30 - 15, 0],
              x: [0, Math.random() * 20 - 10, 0],
              rotate: [0, Math.random() * 180 + 90, 0],
              scale: [1, Math.random() * 0.3 + 0.85, 1],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )
      })}
      
      {/* Center glowing node */}
      <div className="absolute w-3.5 h-3.5 bg-[#58CC02] border-2 border-white dark:border-gray-900 rounded-full shadow-lg" />
    </div>
  )
}

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

  const scrollToAuth = () => {
    document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-background no-scrollbar">
      {/* SECTION 1: HERO FOLD */}
      <section className="h-screen flex flex-col justify-between items-center py-10 px-6 text-center snap-start relative">
        <div className="flex-1 flex flex-col justify-center items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="text-6xl mb-4"
          >
            🗺️
          </motion.div>
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-foreground tracking-tight"
          >
            Ready for a <span className="text-primary">Sidequest?</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted text-base sm:text-lg max-w-sm mt-3"
          >
            Turn everyday hangouts into living RPG quests with your friends.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <GeometryAnimation />
          </motion.div>
        </div>

        {/* Pulsing Scroll Indicator */}
        <motion.button
          onClick={scrollToAuth}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1 text-muted hover:text-primary transition-colors cursor-pointer"
        >
          <span className="text-xs font-bold tracking-wider uppercase">Scroll to Enter</span>
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      </section>

      {/* SECTION 2: AUTH CONTROLS */}
      <section id="auth-section" className="h-screen flex flex-col justify-center items-center px-6 snap-start bg-gray-50/50 dark:bg-gray-900/30">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md w-full bg-white dark:bg-gray-950 p-8 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl shadow-black/5 dark:shadow-black/20 text-center"
        >
          <h2 className="text-2xl font-extrabold text-foreground mb-1">Create Account / Login</h2>
          <p className="text-muted text-sm mb-6">Access your dashboard via Google or a magic email link.</p>
          
          {status === 'success' ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-primary/10 border border-primary/20 text-primary font-bold p-5 rounded-2xl"
            >
              ✨ Magic link sent! Check your email inbox.
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Sleek Google Auth Pill */}
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
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-extrabold p-4 rounded-2xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </motion.button>

              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100 dark:border-gray-900" /></div>
                <span className="relative px-3 bg-white dark:bg-gray-950 text-xs font-bold uppercase tracking-wider text-muted">or</span>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <input 
                  type="email" 
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50/50 dark:bg-gray-950 text-foreground"
                  required
                />
                
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[#58CC02] hover:bg-[#46A302] border-bottom-[4px] border-[#46A302] text-white font-extrabold p-4 rounded-2xl transition-all shadow-md"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Sending Link...' : 'Send Magic Link ✨'}
                </motion.button>
                
                {status === 'error' && (
                  <p className="text-red-500 text-xs mt-1 font-bold">
                    ⚠️ {errorMessage || 'Failed to send link'}
                  </p>
                )}
              </form>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  )
}
