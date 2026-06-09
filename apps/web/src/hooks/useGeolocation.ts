import { useState, useEffect, useRef } from 'react'
import { Geolocation } from '@capacitor/geolocation'
import { useMapStore } from '../stores/mapStore'

export interface GeolocationState {
  lat: number | null
  lng: number | null
  heading: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
}

// Helper to calculate Haversine distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    heading: null,
    accuracy: null,
    error: null,
    loading: true,
  })

  // Read the active flight bypass setting from Zustand map store
  const activeFlight = useMapStore((s: any) => s.activeFlight || null)
  const lastPosRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null)

  useEffect(() => {
    let watchId: any = null
    let isCapacitor = false

    try {
      isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined
    } catch (e) {}

    const handleNewPosition = (coords: { latitude: number; longitude: number; accuracy: number; heading: number | null }, timestamp: number) => {
      const now = timestamp
      const lat = coords.latitude
      const lng = coords.longitude

      if (lastPosRef.current) {
        const lastPos = lastPosRef.current
        const distance = getDistance(lastPos.lat, lastPos.lng, lat, lng)
        const timeDiffSeconds = (now - lastPos.timestamp) / 1000

        // 1. Throttle jitter: Ignore movements less than 4 meters to prevent bouncing
        if (distance < 4.0) {
          return
        }

        // 2. Anti-teleport validation: Reject impossible speeds (e.g. mock location jumps)
        if (timeDiffSeconds > 0) {
          const speed = distance / timeDiffSeconds // meters per second
          const speedLimit = 150.0 // 150 m/s = 540 km/h (standard aviation limit)
          
          if (speed > speedLimit && !activeFlight) {
            console.warn(`[Geolocation] Rejected teleport spoof! Speed: ${speed.toFixed(2)} m/s (Limit: ${speedLimit} m/s)`)
            return
          }
        }
      }

      // Accept coordinate update
      lastPosRef.current = { lat, lng, timestamp: now }
      setState({
        lat,
        lng,
        heading: coords.heading ?? null,
        accuracy: coords.accuracy,
        error: null,
        loading: false,
      })
    }

    if (isCapacitor) {
      Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (position, err) => {
          if (err) {
            console.error('[Geolocation] Capacitor watch error:', err)
            setState(s => ({ ...s, error: err.message, loading: false }))
            startWebFallback()
          } else if (position) {
            handleNewPosition(position.coords, position.timestamp)
          }
        }
      ).then((id) => {
        watchId = id
      })
    } else {
      startWebFallback()
    }

    function startWebFallback() {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }))
        return
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          handleNewPosition(position.coords, position.timestamp)
        },
        (error) => {
          setState(s => ({ ...s, error: error.message, loading: false }))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    }

    return () => {
      if (watchId !== null) {
        if (isCapacitor) {
          Geolocation.clearWatch({ id: watchId }).catch(console.error)
        } else {
          navigator.geolocation.clearWatch(watchId)
        }
      }
    }
  }, [activeFlight])

  return state
}
