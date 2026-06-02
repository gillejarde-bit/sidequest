import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Add types for Google Maps
declare global {
  interface Window {
    google: any
  }
}

interface SearchBarProps {
  onLocationSelect: (lat: number, lng: number, place?: any) => void
  className?: string
}

export function SearchBar({ onLocationSelect, className }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [hasSearch, setHasSearch] = useState(false)

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
      fields: ['geometry', 'name', 'formatted_address', 'rating', 'user_ratings_total', 'website', 'photos', 'types', 'place_id'],
    })

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        setHasSearch(true)
        onLocationSelect(lat, lng, place)
      }
    })
  }

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setHasSearch(false)
    onLocationSelect(0, 0, null) // Signify clear
  }

  return (
    <div className={className || "absolute top-4 right-4 z-10 w-full max-w-[300px] sm:w-80"}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for a location..."
          className="w-full bg-white/90 dark:bg-[#1A1A2E]/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl py-3 pl-12 pr-4 text-gray-900 dark:text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <div className="absolute left-3.5 flex items-center justify-center pointer-events-none">
          {!isReady ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <img src="/logo.png" className="h-6 w-6 object-contain rounded-full border border-gray-100/50 dark:border-gray-800 shadow-sm" alt="Logo" />
          )}
        </div>
        {hasSearch && (
          <button 
            onClick={handleClear}
            className="absolute right-4 p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>
    </div>
  )
}
