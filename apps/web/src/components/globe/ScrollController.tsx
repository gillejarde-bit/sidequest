import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

interface ScrollControllerProps {
  progressRef: React.MutableRefObject<number>
}

export function ScrollController({ progressRef }: ScrollControllerProps) {
  useEffect(() => {
    const scrollObj = { progress: 0 }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero-fold-section',
        scroller: '#foreground-scroll-container',
        start: 'top top',
        end: 'bottom top', // Scrubs over the 100vh height of the first section
        scrub: 1.0, // Smooth scrubbing
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

    // Hero Header fade-out
    tl.to('#hero-text-container', {
      opacity: 0,
      y: -60,
      scale: 0.95,
      ease: 'power1.out'
    }, 0)

    // Scroll instruction fade-out
    tl.to('#scroll-instruction', {
      opacity: 0,
      y: 20,
      ease: 'power1.out'
    }, 0)

    // Onboarding Auth Form card fade-in (cross-fades with hero content)
    tl.fromTo('#auth-card-wrapper', 
      { opacity: 0, y: 80, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, ease: 'power2.out' },
      0.3 // Starts fading in at 30% of scroll to create smooth overlap
    )

    // Clean up
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, [progressRef])

  return null
}
