import { useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'

// Add types for Google Maps
declare global {
  interface Window {
    google: any
  }
}

interface SearchBarProps {
  onLocationSelect: (lat: number, lng: number, place?: any) => void
}

export function SearchBar({ onLocationSelect }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if script is already loaded
    if (window.google?.maps?.places) {
      initAutocomplete()
      return
    }

    // Otherwise, load it
    const script = document.createElement('script')
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => initAutocomplete()
    document.head.appendChild(script)

    return () => {
      // Cleanup if needed (usually we leave the script there)
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [])

  const initAutocomplete = () => {
    if (!inputRef.current) return
    setIsReady(true)

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name'],
    })

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        onLocationSelect(lat, lng)
      }
    })
  }

  return (
    <div className="absolute top-4 right-4 z-10 w-full max-w-[300px] sm:w-80">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for a location..."
          className="w-full bg-[#1A1A2E]/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl py-3 pl-12 pr-4 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-gray-500"
        />
        <div className="absolute left-4 text-gray-400">
          {!isReady ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>
      </div>
    </div>
  )
}
