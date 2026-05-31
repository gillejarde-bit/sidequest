import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { SceneContainer } from '../components/globe/SceneContainer'
import { ScrollController } from '../components/globe/ScrollController'

export function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Shared progress ref between React, GSAP ScrollTrigger, and R3F InstancedMesh
  const progressRef = useRef<number>(0)

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
    <div className="relative bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1d1e43] via-[#0b0c1b] to-[#040409] min-h-screen text-white font-sans overflow-x-hidden selection:bg-primary/20">
      
      {/* Scroll-driven Canvas container pinned by GSAP */}
      <div 
        id="globe-hero-container" 
        className="w-full h-screen relative flex items-center justify-center overflow-hidden"
      >
        {/* Cosmic stellar dust background overlay grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1.5px,transparent_1.5px)] [background-size:32px_32px] pointer-events-none" />

        {/* 3D R3F Canvas Container (Houses the Globe, Stars, Ring, and Effects) */}
        <SceneContainer progressRef={progressRef} />

        {/* 1. HERO CONTENT OVERLAY (Fades out on scroll with Liquid Glass card) */}
        <div 
          id="hero-text-container" 
          className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center pointer-events-none z-10"
        >
          {/* Liquid Glass HUD panel card */}
          <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.4)] rounded-3xl p-8 sm:p-10 max-w-md w-full mx-auto flex flex-col items-center">
            <h1 
              className="text-4xl sm:text-5xl font-black tracking-tight"
              style={{ 
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '-1.5px',
              }}
            >
              Ready for a <span className="text-[#7CFC00] drop-shadow-[0_0_15px_rgba(124,252,0,0.3)]">Sidequest?</span>
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-4 font-medium leading-relaxed">
              Discover local secrets, coordinate events with your crew, and level up in a living real-world map.
            </p>
          </div>
        </div>

        {/* Scroll Instruction indicator (Fades out on scroll) */}
        <div 
          id="scroll-instruction" 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-400 cursor-pointer pointer-events-none z-10"
        >
          <span className="text-[10px] font-black tracking-widest uppercase text-[#7CFC00] drop-shadow-[0_0_8px_rgba(124,252,0,0.2)]">Scroll to Morph Earth</span>
          <ChevronDown className="w-5 h-5 text-[#7CFC00] animate-bounce" />
        </div>

        {/* 2. AUTHENTICATION BOX OVERLAY (Fades in on scroll with Liquid Glass card) */}
        <div 
          id="auth-card-wrapper" 
          className="absolute inset-0 flex items-center justify-center px-6 z-20 hidden"
        >
          {/* Stunning Liquid Glass Card */}
          <div className="max-w-md w-full bg-[#161a38]/30 border border-white/10 backdrop-blur-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_16px_48px_rgba(0,0,0,0.6)] p-8 sm:p-10 rounded-3xl text-center flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Access Guild Portal</h2>
              <p className="text-gray-400 text-xs mt-1">Ready to start your next social adventure?</p>
            </div>
            
            {status === 'success' ? (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="bg-[#7CFC00]/10 border border-[#7CFC00]/25 text-[#7CFC00] font-bold p-5 rounded-2xl shadow-inner backdrop-blur-md"
              >
                ✨ Magic link sent! Check your email inbox.
              </motion.div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Custom Glassmorphic Google Button */}
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
                  className="w-full flex items-center justify-center gap-3 bg-white text-black font-extrabold p-4 rounded-2xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </motion.button>

                <div className="relative py-1 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
                  <span className="relative px-3 bg-[#131631]/80 backdrop-blur-md rounded-full border border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500">or</span>
                </div>

                {/* Glassmorphic Magic Link input */}
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <input 
                    type="email" 
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#7CFC00]/30 focus:border-[#7CFC00]/30 bg-black/40 text-white placeholder-gray-500 shadow-inner transition-all text-sm font-medium"
                    required
                  />
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#7CFC00] hover:bg-[#6be400] border-bottom-[4px] border-[#5ebd00] text-black font-black p-4 rounded-2xl transition-all shadow-lg shadow-[#7CFC00]/10 flex items-center justify-center gap-1.5"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Requesting Portal...' : 'Send Magic Link ✨'}
                  </motion.button>
                  
                  {status === 'error' && (
                    <p className="text-red-400 text-xs mt-1 font-bold">
                      ⚠️ {errorMessage || 'Failed to send link'}
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GSAP ScrollTrigger & Lenis smooth scroll manager */}
      <ScrollController progressRef={progressRef} />
    </div>
  )
}
