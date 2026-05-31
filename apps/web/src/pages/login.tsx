import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

// Generate high-fidelity symmetric "Medieval Micro-Geometry" points (2D SVG format)
const generateMicroGeometryPoints = () => {
  const pts: any[] = []
  let id = 0
  
  // 1. Compass Rose (Concentric Orbits)
  const compassRings = [
    { radius: 14, count: 8, color: '#58CC02', type: 'triangle' },
    { radius: 30, count: 16, color: '#0EA5E9', type: 'triangle' },
    { radius: 52, count: 24, color: '#F97316', type: 'square' },
  ]
  
  compassRings.forEach((ring) => {
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2
      const cx = Math.cos(angle) * ring.radius
      const cy = Math.sin(angle) * ring.radius
      
      // When unfolded, Compass rose points scatter/expand segmentally
      const tx = Math.cos(angle) * (ring.radius * 2.8)
      const ty = Math.sin(angle) * (ring.radius * 2.8)
      
      pts.push({
        id: id++,
        x: cx,
        y: cy,
        targetX: tx,
        targetY: ty,
        color: ring.color,
        type: ring.type,
        rotation: (angle * 180) / Math.PI,
        size: ring.type === 'triangle' ? 7 : 5
      })
    }
  })

  // 2. Symmetric Filigree Frame (Top, Bottom, Left, Right lines of triangles)
  const borderDensity = 14
  for (let i = 0; i < borderDensity; i++) {
    const t = (i / (borderDensity - 1)) * 2 - 1 // Normalized from -1 to 1
    
    // Top Decorative Border
    const topY = -75 + (Math.sin((t + 1) * Math.PI) * 8)
    const topTY = -170 + (Math.sin((t + 1) * Math.PI) * 16)
    pts.push({
      id: id++,
      x: t * 75,
      y: topY,
      targetX: t * 170,
      targetY: topTY,
      color: '#58CC02',
      type: 'triangle',
      rotation: 0,
      size: 6
    })

    // Bottom Decorative Border
    const bottomY = 75 - (Math.sin((t + 1) * Math.PI) * 8)
    const bottomTY = 170 - (Math.sin((t + 1) * Math.PI) * 16)
    pts.push({
      id: id++,
      x: t * 75,
      y: bottomY,
      targetX: t * 170,
      targetY: bottomTY,
      color: '#58CC02',
      type: 'triangle',
      rotation: 180,
      size: 6
    })

    // Left Wing Frame
    const leftX = -75 - (Math.cos(t * Math.PI / 2) * 8)
    const leftTX = -170 - (Math.cos(t * Math.PI / 2) * 16)
    pts.push({
      id: id++,
      x: leftX,
      y: t * 55,
      targetX: leftTX,
      targetY: t * 140,
      color: '#0EA5E9',
      type: 'triangle',
      rotation: 90,
      size: 6
    })

    // Right Wing Frame
    const rightX = 75 + (Math.cos(t * Math.PI / 2) * 8)
    const rightTX = 170 + (Math.cos(t * Math.PI / 2) * 16)
    pts.push({
      id: id++,
      x: rightX,
      y: t * 55,
      targetX: rightTX,
      targetY: t * 140,
      color: '#0EA5E9',
      type: 'triangle',
      rotation: -90,
      size: 6
    })
  }

  // 3. Coordinate Dot Grid (Floating map elements)
  const gridPositions = [
    { x: -45, y: -45 }, { x: 45, y: -45 },
    { x: -45, y: 45 }, { x: 45, y: 45 }
  ]
  gridPositions.forEach((pos) => {
    pts.push({
      id: id++,
      x: pos.x,
      y: pos.y,
      targetX: pos.x * 2.5,
      targetY: pos.y * 2.5,
      color: '#F97316',
      type: 'square',
      rotation: 45,
      size: 4
    })
  })

  return pts
}

const pointsData = generateMicroGeometryPoints()

export function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Scroll Container Ref for dynamic tracking
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Track scroll position of the custom snap container
  const { scrollYProgress } = useScroll({ container: containerRef })

  // Maps scroll progress to CSS variables for pure transform animations
  const progress = useTransform(scrollYProgress, [0, 0.8], [0, 1])

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
    <div 
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#111630] via-[#0a0d18] to-[#05060b] text-white font-sans overflow-x-hidden selection:bg-primary/20 no-scrollbar"
    >
      {/* SECTION 1: HERO FOLD */}
      <section className="h-screen flex flex-col justify-between items-center py-12 px-6 text-center snap-start relative overflow-hidden">
        {/* Soft coordinate space gridlines background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1.5px,transparent_1.5px)] [background-size:32px_32px] pointer-events-none" />

        <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full max-w-lg mx-auto">
          {/* Header Typography */}
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Ready for a <span className="text-[#7CFC00] drop-shadow-[0_0_15px_rgba(124,252,0,0.35)]">Sidequest?</span>
          </motion.h1>
          
          {/* 2D SVG Micro-Geometry Map (Fits perfectly, doesn't overflow) */}
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 my-4 flex items-center justify-center">
            {/* Soft backdrop map contours */}
            <motion.div 
              style={{ opacity: useTransform(scrollYProgress, [0, 0.8], [0.03, 0.15]) }}
              className="absolute inset-0 rounded-full border border-dashed border-[#58CC02] dark:border-[#58CC02] pointer-events-none"
            />
            
            <motion.svg 
              viewBox="-200 -200 400 400" 
              className="w-full h-full"
              style={{ 
                '--progress': progress,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.05))'
              } as any}
            >
              {/* Dynamic Coordinate Gridlines */}
              <line x1="-180" y1="0" x2="180" y2="0" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
              <line x1="0" y1="-180" x2="0" y2="180" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
              
              {/* Symmetrical central circular rings */}
              <circle cx="0" cy="0" r="75" fill="none" stroke="#58cc02" strokeOpacity="0.06" strokeWidth="1" />
              <circle cx="0" cy="0" r="170" fill="none" stroke="#0ea5e9" strokeOpacity="0.04" strokeWidth="1" />

              {/* Renders Micro-Geometry Assets using triangle polygons */}
              {pointsData.map((pt) => {
                const renderShape = () => {
                  if (pt.type === 'triangle') {
                    // Sleek equilateral triangle polygon
                    const half = pt.size / 2
                    const height = (Math.sqrt(3) / 2) * pt.size
                    return (
                      <polygon 
                        points={`0,${-height/2} ${half},${height/2} ${-half},${height/2}`}
                        fill={pt.color}
                        fillOpacity="0.95"
                      />
                    )
                  } else if (pt.type === 'square') {
                    const h = pt.size / 2
                    return (
                      <rect 
                        x={-h} 
                        y={-h} 
                        width={pt.size} 
                        height={pt.size} 
                        fill={pt.color} 
                        fillOpacity="0.95" 
                      />
                    )
                  } else {
                    return (
                      <circle 
                        r={pt.size / 2} 
                        fill={pt.color} 
                        fillOpacity="0.9" 
                      />
                    )
                  }
                }

                return (
                  <g
                    key={pt.id}
                    style={{
                      transform: `
                        translate(
                          calc(${pt.x}px + (${pt.targetX - pt.x}px * var(--progress))), 
                          calc(${pt.y}px + (${pt.targetY - pt.y}px * var(--progress)))
                        )
                        rotate(calc(${pt.rotation}deg + (360deg * var(--progress))))
                      `,
                      transformOrigin: '0 0',
                      transition: 'transform 0.08s ease-out'
                    }}
                  >
                    {renderShape()}
                  </g>
                )
              })}
            </motion.svg>
          </div>

          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-gray-400 text-xs sm:text-sm max-w-xs mt-1"
          >
            A real-world social RPG. Scroll down to claim your magic key and enter the map.
          </motion.p>
        </div>

        {/* Pulsing Scroll Indicator */}
        <motion.button
          onClick={scrollToAuth}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#7CFC00] transition-colors cursor-pointer z-10"
        >
          <span className="text-[10px] font-black tracking-widest uppercase text-[#7CFC00] drop-shadow-[0_0_8px_rgba(124,252,0,0.2)]">Scroll to Unfold Map</span>
          <ChevronDown className="w-5 h-5 text-[#7CFC00]" />
        </motion.button>
      </section>

      {/* SECTION 2: AUTH CONTROLS */}
      <section id="auth-section" className="h-screen flex flex-col justify-center items-center px-6 snap-start bg-gray-50/50 dark:bg-gray-900/10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md w-full bg-white/[0.06] backdrop-blur-[16px] backdrop-saturate-[120%] border-[0.5px] border-white/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] p-8 sm:p-10 rounded-[20px] text-center flex flex-col gap-6"
        >
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Access Guild Portal</h2>
            <p className="text-gray-300 text-xs mt-1">Ready to start your next social adventure?</p>
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
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold p-4 rounded-2xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all"
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
                  className="w-full bg-[#7CFC00] hover:bg-[#6be400] border-bottom-[4px] border-[#5ebd00] text-black font-semibold p-4 rounded-2xl transition-all shadow-lg shadow-[#7CFC00]/10 flex items-center justify-center gap-1.5"
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
        </motion.div>
      </section>
    </div>
  )
}
