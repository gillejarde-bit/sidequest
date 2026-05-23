import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGeolocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setLoading(false)
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setError(null)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    refresh()
  }, [])

  return { location, error, loading, refresh }
}

import { useAwardXP } from './useXP'

export function useCheckIn(questId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const { mutate: awardXP } = useAwardXP()

  const checkIn = async (lat: number, lng: number) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('check_in_to_quest' as any, {
        p_quest_id: questId,
        p_user_lat: lat,
        p_user_lng: lng
      })
      
      if (rpcError) throw rpcError
      
      if (data && !data.success) {
        setError(data.error === 'too_far' ? `You are ${data.distance_meters}m away` : data.error)
      } else {
        setResult(data)
        awardXP({ points: 20, action: 'attend_quest', referenceId: questId })
      }
      return data
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { checkIn, loading, error, result }
}
