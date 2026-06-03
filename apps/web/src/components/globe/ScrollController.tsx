import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

interface ScrollControllerProps {
  progressRef: React.MutableRefObject<number>
}

export function ScrollController({ progressRef }: ScrollControllerProps) {
  useEffect(() => {
    // 1. Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // standard smooth ease
      infinite: false
    })

    // Expose lenis globally for interactive controls (like the scroll arrow)
    ;(window as any).lenis = lenis

    let isSnapping = false

    // Connect Lenis scroll events to GSAP's ScrollTrigger ticker and handle instant snapping
    lenis.on('scroll', (e: any) => {
      ScrollTrigger.update()

      if (isSnapping) return

      const scrollY = e.scroll
      const maxScroll = lenis.limit

      if (maxScroll <= 0) return

      // Snapping threshold: if user scrolls even 5px away from the endpoints,
      // snap immediately to the target fold based on scroll direction.
      if (scrollY > 5 && scrollY < maxScroll - 5) {
        if (e.direction === 1) {
          isSnapping = true
          lenis.scrollTo(maxScroll, {
            duration: 0.85,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            onComplete: () => {
              isSnapping = false
            }
          })
        } else if (e.direction === -1) {
          isSnapping = true
          lenis.scrollTo(0, {
            duration: 0.85,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            onComplete: () => {
              isSnapping = false
            }
          })
        }
      }
    })
    
    const updateRaf = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(updateRaf)
    gsap.ticker.lagSmoothing(0)

    // 2. Build scroll-driven morphing timeline
    const scrollObj = { progress: 0 }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#globe-hero-container',
        start: 'top top',
        end: '+=80%', // Comfortably paced scroll distance (80vh)
        scrub: 1.0, // Smooth scrubbing
        pin: true,
        anticipatePin: 1
      }
    })

    // Scrub the progress value from 0 to 1
    tl.to(scrollObj, {
      progress: 1,
      ease: 'none',
      onUpdate: () => {
        progressRef.current = scrollObj.progress
      }
    }, 0)

    // Hero Header fade-out (0.0 -> 0.35)
    tl.to('#hero-text-container', {
      opacity: 0,
      y: -60,
      scale: 0.95,
      ease: 'power1.out'
    }, 0)

    // Scroll instruction fade-out (0.0 -> 0.2)
    tl.to('#scroll-instruction', {
      opacity: 0,
      y: 20,
      ease: 'power1.out'
    }, 0)

    // Onboarding Auth Form card fade-in (0.65 -> 1.0)
    tl.fromTo('#auth-card-wrapper', 
      { opacity: 0, y: 80, scale: 0.96, display: 'none' },
      { opacity: 1, y: 0, scale: 1, display: 'flex', ease: 'power2.out' },
      0.65
    )

    // Clean up
    return () => {
      ;(window as any).lenis = null
      lenis.destroy()
      gsap.ticker.remove(updateRaf)
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, [progressRef])

  return null
}
