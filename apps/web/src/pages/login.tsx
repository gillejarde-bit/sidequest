import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { motion, useScroll } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

// Symmetrical and geographic continent generator for realistic 3D Earth
const generateEarthMapPoints = () => {
  const pts: any[] = []
  let id = 0

  const addContinentPoints = (
    minLat: number, maxLat: number,
    minLng: number, maxLng: number,
    density: number,
    color: string
  ) => {
    for (let i = 0; i < density; i++) {
      // Direct jittered mapping of continents
      const latDeg = minLat + Math.random() * (maxLat - minLat)
      const lngDeg = minLng + Math.random() * (maxLng - minLng)

      // Convert degrees to spherical radians
      const theta = (lngDeg * Math.PI) / 180 // Longitude
      const phi = (latDeg * Math.PI) / 180  // Latitude

      pts.push({
        id: id++,
        theta,
        phi,
        color,
        size: Math.random() * 5 + 4,
        type: Math.random() > 0.35 ? 'triangle' : 'square',
        rotationOffset: Math.random() * 360
      })
    }
  }

  // Populate actual Earth landmass areas (detailed 3D micro-geometry density)
  // 1. Eurasia (Teal/Green mix for organic land)
  addContinentPoints(10, 75, -20, 140, 110, '#0EA5E9')
  addContinentPoints(20, 60, 30, 120, 70, '#58CC02')

  // 2. Africa (Green/Teal mix)
  addContinentPoints(-35, 35, -15, 50, 90, '#58CC02')
  addContinentPoints(-20, 15, 10, 40, 40, '#0EA5E9')

  // 3. North America
  addContinentPoints(15, 70, -160, -50, 90, '#0EA5E9')
  addContinentPoints(30, 60, -120, -70, 50, '#58CC02')

  // 4. South America
  addContinentPoints(-55, 12, -80, -35, 80, '#58CC02')
  addContinentPoints(-30, 0, -70, -45, 40, '#0EA5E9')

  // 5. Australia
  addContinentPoints(-40, -10, 113, 153, 50, '#F97316')

  // 6. Antarctica & Scattered Islands (warm coordinate nodes)
  addContinentPoints(-85, -70, -180, 180, 40, '#F97316')

  return pts
}

const earthPoints = generateEarthMapPoints()

export function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // 60FPS Continuous Time rotation trigger
  const [time, setTime] = useState(0)
  useEffect(() => {
    let animId: number
    const tick = () => {
      setTime((t) => t + 0.006)
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [])

  // Scroll tracking
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: containerRef })
  
  // Transform scroll progress to interpolation values (0 to 1)
  const [scrollVal, setScrollVal] = useState(0)
  useEffect(() => {
    return scrollYProgress.onChange((v) => {
      setScrollVal(v)
    })
  }, [scrollYProgress])

  // Soft progress curve for flattening transition
  const p = Math.min(scrollVal / 0.75, 1)

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

  // Calculate 3D sphere coordinate projections and interpolate to 2D Mercator map flatlands
  const projectedPoints = earthPoints.map((pt) => {
    const radius = 105 // Sphere Radius
    
    // Slow down spin rotation as the map flattens out (locks at 2D flat)
    const spinAngle = time * (1 - p)
    const currentTheta = pt.theta + spinAngle

    // 1. Calculate 3D Spherical coordinates
    const x3d = Math.cos(pt.phi) * Math.sin(currentTheta)
    const y3d = Math.sin(pt.phi)
    const z3d = Math.cos(pt.phi) * Math.cos(currentTheta) // Depth coordinate

    // 2. 3D Perspective Projection scale factor
    const cameraDist = 220
    const perspectiveScale = cameraDist / (cameraDist + z3d * radius)

    // Projected coordinates of the 3D Sphere on screen
    const xSphere = x3d * radius * perspectiveScale
    const ySphere = -y3d * radius * perspectiveScale // invert Y for screen coords

    // 3. 2D Mercator Flat Map projection target coordinates
    const mapWidth = 320
    const mapHeight = 180
    const xFlat = (pt.theta / Math.PI) * (mapWidth / 2)
    const yFlat = -(pt.phi / (Math.PI / 2)) * (mapHeight / 2) // scale properly

    // 4. Smoothly interpolate between Sphere 3D projection and Flat 2D map
    const finalX = (1 - p) * xSphere + p * xFlat
    const finalY = (1 - p) * ySphere + p * yFlat

    // Points on the back side of the 3D sphere are hidden, but fully visible on the flat map
    const depthOpacity = z3d > 0.1 ? 0.08 : 1
    const finalOpacity = (1 - p) * depthOpacity + p * 1

    return {
      ...pt,
      x: finalX,
      y: finalY,
      opacity: finalOpacity,
      scale: (1 - p) * perspectiveScale + p * 1
    }
  })

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory bg-[#FAFAF8] dark:bg-[#1A1A2E] text-foreground transition-colors duration-300 no-scrollbar"
    >
      {/* SECTION 1: HERO FOLD */}
      <section className="h-screen flex flex-col justify-between items-center py-12 px-6 text-center snap-start relative overflow-hidden">
        {/* Soft coordinate space gridlines background */}
        <div className="absolute inset-0 bg-[radial-gradient(#80808008_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full max-w-lg mx-auto">
          {/* Header Typography */}
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Ready for a <span className="text-[#58CC02]">Sidequest?</span>
          </motion.h1>
          
          {/* Detailed 3D Globe to 2D Unfolding Map SVG Canvas */}
          <div className="relative w-80 h-80 sm:w-[400px] sm:h-[400px] my-2 flex items-center justify-center">
            {/* Pulsing Outer coordinate tracking circle (fades as it flattens) */}
            <div 
              style={{ opacity: (1 - p) * 0.12 }}
              className="absolute w-72 h-72 rounded-full border border-dashed border-[#58CC02] dark:border-[#58CC02] pointer-events-none animate-pulse"
            />
            
            <svg 
              viewBox="-200 -200 400 400" 
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.06))' }}
            >
              {/* Symmetrical gridlines mapping */}
              <line x1="-190" y1="0" x2="190" y2="0" stroke="#808080" strokeOpacity={(1 - p) * 0.05 + p * 0.08} strokeDasharray="4 4" />
              <line x1="0" y1="-190" x2="0" y2="180" stroke="#808080" strokeOpacity={(1 - p) * 0.05 + p * 0.08} strokeDasharray="4 4" />

              {/* Renders dynamic coordinate points */}
              {projectedPoints.map((pt) => {
                const renderMicroShape = () => {
                  const size = pt.size * pt.scale
                  if (pt.type === 'triangle') {
                    const half = size / 2
                    const height = (Math.sqrt(3) / 2) * size
                    return (
                      <polygon 
                        points={`0,${-height/2} ${half},${height/2} ${-half},${height/2}`}
                        fill={pt.color}
                        fillOpacity={pt.opacity}
                      />
                    )
                  } else {
                    const h = size / 2
                    return (
                      <rect 
                        x={-h} 
                        y={-h} 
                        width={size} 
                        height={size} 
                        fill={pt.color} 
                        fillOpacity={pt.opacity} 
                      />
                    )
                  }
                }

                // Smooth rotation of each individual triangle based on time + spin alignment
                const rotation = pt.rotationOffset + time * 35 * (1 - p)

                return (
                  <g
                    key={pt.id}
                    transform={`translate(${pt.x}, ${pt.y}) rotate(${rotation})`}
                  >
                    {renderMicroShape()}
                  </g>
                )
              })}
            </svg>
          </div>

          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-muted text-sm sm:text-base max-w-xs mt-1"
          >
            A real-world social RPG. Scroll down to claim your magic key and enter the map.
          </motion.p>
        </div>

        {/* Pulsing Scroll Indicator */}
        <motion.button
          onClick={scrollToAuth}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1 text-muted hover:text-[#58CC02] transition-colors cursor-pointer z-10"
        >
          <span className="text-[10px] font-black tracking-widest uppercase">Scroll to Flatten Earth</span>
          <ChevronDown className="w-5 h-5 text-[#58CC02]" />
        </motion.button>
      </section>

      {/* SECTION 2: AUTH CONTROLS */}
      <section id="auth-section" className="h-screen flex flex-col justify-center items-center px-6 snap-start bg-gray-50/40 dark:bg-gray-900/10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md w-full bg-white dark:bg-gray-950 p-8 rounded-3xl border border-gray-200/50 dark:border-gray-900 shadow-xl shadow-black/3 dark:shadow-black/25 text-center"
        >
          <h2 className="text-2xl font-black text-foreground mb-1">Create Account / Login</h2>
          <p className="text-muted text-sm mb-6">Start your adventure via Google or a magic link.</p>
          
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
              {/* Google Auth Button */}
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
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-extrabold p-4 rounded-2xl shadow-sm border border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </motion.button>

              <div className="relative py-1.5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100 dark:border-gray-900" /></div>
                <span className="relative px-3 bg-white dark:bg-gray-950 text-xs font-bold uppercase tracking-wider text-muted">or</span>
              </div>

              {/* Magic Link Login */}
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <input 
                  type="email" 
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50/20 dark:bg-gray-950 text-foreground"
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
