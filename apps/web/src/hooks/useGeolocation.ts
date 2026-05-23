import { useState, useEffect, useRef } from 'react'

export interface GeolocationState {
  lat: number | null
  lng: number | null
  heading: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
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

  // Don't throttle the very first reading — only subsequent ones
  const lastUpdateRef = useRef<number>(0)
  const hasFirstReading = useRef(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }))
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now()

        // Always accept the first reading; throttle subsequent ones to 10s
        if (hasFirstReading.current && now - lastUpdateRef.current < 10000) return

        hasFirstReading.current = true
        lastUpdateRef.current = now

        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        })
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

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return state
}
