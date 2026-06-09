import React, { useEffect, useRef } from 'react'

interface FogLayerProps {
  map?: any
  userLocation?: any
  onFirstFramePaint?: () => void
}

interface EmberParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  pulseSpeed: number
  pulseOffset: number
}

export const FogLayer: React.FC<FogLayerProps> = ({ onFirstFramePaint }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const emberSpriteCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const embersRef = useRef<EmberParticle[]>([])
  const animationFrameIdRef = useRef<number | null>(null)
  const isVisibleRef = useRef<boolean>(true)
  const reducedMotionRef = useRef<boolean>(false)

  // Track page visibility to pause animation loops when backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible'
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Build ember radial gradient sprite once (pre-rasterized for 60fps drawImage calls)
  const buildEmberSprite = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const sctx = canvas.getContext('2d')
    if (!sctx) return
    
    const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    grad.addColorStop(0, 'rgba(238, 108, 31, 0.75)') // Ember color
    grad.addColorStop(0.3, 'rgba(238, 108, 31, 0.35)')
    grad.addColorStop(1, 'transparent')
    
    sctx.fillStyle = grad
    sctx.beginPath()
    sctx.arc(16, 16, 16, 0, Math.PI * 2)
    sctx.fill()
    
    emberSpriteCanvasRef.current = canvas
  }

  // Initialize ember particles
  const initEmbers = (w: number, h: number) => {
    const count = 40
    const list: EmberParticle[] = []
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: -0.05 - Math.random() * 0.1,
        vy: -0.03 - Math.random() * 0.08,
        size: 4 + Math.random() * 8,
        alpha: 0.1 + Math.random() * 0.4,
        pulseSpeed: 0.001 + Math.random() * 0.002,
        pulseOffset: Math.random() * Math.PI * 2
      })
    }
    embersRef.current = list
  }

  // Draw loop
  const drawEmbers = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      initEmbers(width, height)
    }

    ctx.clearRect(0, 0, width, height)

    // Draw drifting embers using the pre-rasterized sprite
    const emberSprite = emberSpriteCanvasRef.current
    if (emberSprite && embersRef.current.length > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      
      embersRef.current.forEach(p => {
        const pulse = Math.sin(Date.now() * p.pulseSpeed + p.pulseOffset) * 0.15
        const currentAlpha = Math.max(0.05, Math.min(0.8, p.alpha + pulse))
        
        ctx.globalAlpha = currentAlpha
        ctx.drawImage(emberSprite, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      })
      
      ctx.restore()
    }
  }

  useEffect(() => {
    buildEmberSprite()

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mediaQuery.matches
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
    }
    mediaQuery.addEventListener('change', handleMotionChange)

    let lastTime = performance.now()
    const animLoop = (now: number) => {
      const delta = now - lastTime
      lastTime = now

      if (isVisibleRef.current && !reducedMotionRef.current) {
        const w = canvasRef.current?.width || 0
        const h = canvasRef.current?.height || 0
        if (w > 0 && h > 0) {
          if (embersRef.current.length === 0) {
            initEmbers(w, h)
          }
          embersRef.current.forEach(p => {
            p.x = (p.x + p.vx * delta + w) % w
            p.y = (p.y + p.vy * delta + h) % h
          })
          drawEmbers()
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(animLoop)
    }

    animationFrameIdRef.current = requestAnimationFrame(animLoop)

    // Trigger paint callback to release loading screen transition
    const timer = setTimeout(() => {
      onFirstFramePaint?.()
    }, 100)

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange)
      clearTimeout(timer)
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    }
  }, [onFirstFramePaint])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 3 }}
    />
  )
}
