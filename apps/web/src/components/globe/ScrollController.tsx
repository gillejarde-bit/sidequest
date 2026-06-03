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
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // standard smooth ease
      infinite: false
    })

    // Connect Lenis scroll events to GSAP's ScrollTrigger ticker
    lenis.on('scroll', ScrollTrigger.update)
    
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
        end: '+=180%', // Pinned scroll distance (180vh)
        scrub: 1.0, // Smooth scrubbing
        pin: true,
        anticipatePin: 1,
        snap: {
          snapTo: [0, 1], // Snap to either start (hero fold) or end (auth card)
          duration: { min: 0.25, max: 0.6 },
          delay: 0.08,
          ease: 'power2.out'
        }
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
      lenis.destroy()
      gsap.ticker.remove(updateRaf)
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, [progressRef])

  return null
}
