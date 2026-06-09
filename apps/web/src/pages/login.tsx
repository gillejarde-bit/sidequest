import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronDown } from 'lucide-react'
import { SceneContainer } from '../components/globe/SceneContainer'
import { ScrollController } from '../components/globe/ScrollController'

class WebGLErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("WebGL / Canvas loading crash caught gracefully:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 bg-gradient-to-tr from-[#000000] via-[#15100C] to-[#000000] opacity-80 z-0" />
      )
    }
    return this.props.children
  }
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSignInMode, setIsSignInMode] = useState(false)
  
  // High-performance progress ref scrubbed by GSAP
  const progressRef = useRef(0)

  // Mode A: Magic Link Sign Up submit
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

  // Mode B: Email & Password Sign In submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error("Supabase Sign In Error:", error)
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('success')
      // Successfully authenticated! Force direct redirect to '/' (which triggers requireAuth onboarding routing)
      window.location.href = '/'
    }
  }

  return (
    <div className="login-page-wrapper relative min-h-screen bg-[#000000] text-white font-sans overflow-x-hidden selection:bg-primary/20 no-scrollbar">
      
      {/* 3D Morphing Globe Scroll Timeline Controller */}
      <ScrollController progressRef={progressRef} />
      
      {/* Pinned Hero Section (Height is 100vh, pins during scroll) */}
      <div 
        id="globe-hero-container"
        className="w-full h-screen relative overflow-hidden flex flex-col justify-between items-center py-12 px-6 text-center"
      >
        {/* Soft coordinate space gridlines background - Ember Orange instead of white */}
        <div className="absolute inset-0 bg-[radial-gradient(#EE6C1F08_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none z-10" />

        {/* 3D R3F Canvas Container (Stays in the background) wrapped in WebGL safety boundary */}
        <WebGLErrorBoundary>
          <SceneContainer progressRef={progressRef} />
        </WebGLErrorBoundary>

        {/* 1. HERO FOLD: Title & Description (Fades out on scroll) */}
        <div 
          id="hero-text-container"
          className="flex-1 flex flex-col justify-center items-center relative z-20 w-full max-w-lg mx-auto pointer-events-none mt-20 px-4"
        >
          <div 
            id="hero-card"
            className="bg-[#120B06]/65 border border-white/10 p-8 sm:p-10 rounded-[28px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] text-center flex flex-col gap-3"
            style={{ backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)' }}
          >
            <h1 
              className="text-4xl sm:text-5xl font-black tracking-tight"
              style={{ fontFamily: "'SideQuest Sans', system-ui, sans-serif" }}
            >
              Ready for a <span className="text-[#EE6C1F] drop-shadow-[0_0_15px_rgba(238,108,31,0.35)]">Sidequest?</span>
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm max-w-xs mx-auto">
              A real-world social RPG. Scroll down to claim your magic key and enter the map.
            </p>
          </div>
        </div>

        {/* 2. AUTH CONTROLS: Login Card (Fades in on scroll) */}
        <div 
          id="auth-card-wrapper"
          className="absolute inset-0 z-30 flex items-center justify-center px-6 pointer-events-auto"
          style={{ display: 'none' }} // Controlled by GSAP ScrollController
        >
          <div 
            id="auth-card"
            className="max-w-md w-full border border-white/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] p-8 sm:p-10 rounded-[28px] text-center flex flex-col gap-6"
            style={{ backgroundColor: 'rgba(18, 11, 6, 0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
          >
            <div id="auth-card-content" className="flex flex-col gap-6 w-full text-center" style={{ opacity: 0 }}>
              <div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">
                  {isSignInMode ? 'Sign In to Guild' : 'Access Guild Portal'}
                </h2>
                <p className="text-gray-300 text-xs mt-1 font-normal">
                  {isSignInMode ? 'Welcome back, adventurer!' : 'Ready to start your next social adventure?'}
                </p>
              </div>
              
              {status === 'success' && !isSignInMode ? (
                <div className="bg-[#EE6C1F]/10 border border-[#EE6C1F]/25 text-[#EE6C1F] font-semibold p-5 rounded-2xl shadow-inner backdrop-blur-md">
                  ✨ Magic link sent! Check your email inbox.
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Custom Glassmorphic Google Button */}
                  <button
                    onClick={async () => {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: window.location.origin
                        }
                      })
                      if (error) console.error('Google login error:', error)
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold p-4 rounded-2xl shadow-lg hover:bg-gray-100 active:scale-98 transition-all cursor-pointer"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="relative py-1 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
                    <span className="relative px-3 bg-[#000000] rounded-full border border-white/5 text-[9px] font-semibold uppercase tracking-widest text-gray-500">or</span>
                  </div>

                  {isSignInMode ? (
                    /* Mode B: Email & Password Sign In */
                    <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                      <input 
                        type="email" 
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#EE6C1F]/30 focus:border-[#EE6C1F]/30 bg-black/40 text-white placeholder-gray-500 shadow-inner transition-all text-sm font-normal text-left"
                        required
                      />
                      <input 
                        type="password" 
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#EE6C1F]/30 focus:border-[#EE6C1F]/30 bg-black/40 text-white placeholder-gray-500 shadow-inner transition-all text-sm font-normal text-left"
                        required
                      />
                      
                      <button 
                        className="w-full bg-[#EE6C1F] hover:bg-[#d95814] text-white font-semibold p-4 rounded-2xl transition-all shadow-lg shadow-[#EE6C1F]/10 flex items-center justify-center gap-1.5 cursor-pointer"
                        disabled={status === 'loading'}
                      >
                        {status === 'loading' ? 'Authenticating...' : 'Sign In'}
                      </button>
                    </form>
                  ) : (
                    /* Mode A: Magic Link Sign Up */
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                      <input 
                        type="email" 
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#EE6C1F]/30 focus:border-[#EE6C1F]/30 bg-black/40 text-white placeholder-gray-500 shadow-inner transition-all text-sm font-normal text-left"
                        required
                      />
                      
                      <button 
                        className="w-full bg-[#EE6C1F] hover:bg-[#d95814] text-white font-semibold p-4 rounded-2xl transition-all shadow-lg shadow-[#EE6C1F]/10 flex items-center justify-center gap-1.5 cursor-pointer"
                        disabled={status === 'loading'}
                      >
                        {status === 'loading' ? 'Requesting Portal...' : 'Send Magic Link ✨'}
                      </button>
                    </form>
                  )}

                  {status === 'error' && (
                    <p className="text-red-400 text-xs mt-1 font-bold text-center">
                      ⚠️ {errorMessage || 'Authentication failed'}
                    </p>
                  )}

                  {/* Mode Toggle Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSignInMode(!isSignInMode)
                      setStatus('idle')
                      setErrorMessage('')
                    }}
                    className="text-xs text-[#EE6C1F] hover:underline cursor-pointer transition-all mt-2"
                  >
                    {isSignInMode ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. SCROLL INSTRUCTION (Fades out on scroll) */}
        <button
          id="scroll-instruction"
          onClick={() => {
            const lenis = (window as any).lenis
            if (lenis) {
              lenis.scrollTo(lenis.limit, {
                duration: 1.2,
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
              })
            } else {
              window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
              })
            }
          }}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#EE6C1F] transition-colors cursor-pointer z-20"
        >
          <span className="text-[10px] font-black tracking-widest uppercase text-[#EE6C1F] drop-shadow-[0_0_8px_rgba(238,108,31,0.2)]">Scroll to Unfold Map</span>
          <ChevronDown className="w-5 h-5 text-[#EE6C1F]" />
        </button>
      </div>
    </div>
  )
}
