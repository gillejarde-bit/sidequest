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
import { usePursuitsStore } from '../features/pursuits/pursuits.store'
import { XP_REWARDS, pursuitTagMap, pursuitVibeMap } from '../features/pursuits/pursuits.config'
import { useAuthStore } from '../stores/auth'

export function useCheckIn(questId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const { mutate: awardXP } = useAwardXP()

  const checkIn = async (
    lat: number,
    lng: number,
    questInfo?: { category: string; vibe: string; creatorId: string }
  ) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('check_in_to_quest' as any, {
        p_quest_id: questId,
        p_lat: lat,
        p_lng: lng
      })
      
      if (rpcError) throw rpcError
      
      if (data && !data.success) {
        setError(data.error === 'too_far' ? `You are ${data.distance_meters}m away` : data.error)
      } else {
        setResult(data)
        
        // 1. Award legacy XP
        awardXP({ points: 20, action: 'attend_quest', referenceId: questId })

        // 2. Award Pursuits XP
        const currentUserId = useAuthStore.getState().user?.id;
        const grants: { pursuit: any; amount: number }[] = [];

        // Primary Category pursuit XP
        const primaryCat = questInfo?.category?.toLowerCase() || '';
        const primaryPursuit = pursuitTagMap[primaryCat] || 'fellowship'; // defaults to fellowship
        grants.push({ pursuit: primaryPursuit, amount: XP_REWARDS.checkinPrimary });

        // Secondary Vibe pursuit XP
        const vibeLower = questInfo?.vibe?.toLowerCase() || '';
        const secondaryPursuit = pursuitVibeMap[vibeLower];
        // Only grant if secondary exists and is different from primary
        if (secondaryPursuit && secondaryPursuit !== primaryPursuit) {
          grants.push({ pursuit: secondaryPursuit, amount: XP_REWARDS.checkinSecondary });
        }

        // Pioneer Bonus
        if (data.is_pioneer) {
          grants.push({ pursuit: 'discovery', amount: XP_REWARDS.pioneerBonus });
        }

        // Host Quest Bonus
        if (questInfo?.creatorId && currentUserId === questInfo.creatorId) {
          grants.push({ pursuit: 'fellowship', amount: XP_REWARDS.hostQuest });
        }

        // Trigger unified grantPursuitXP
        usePursuitsStore.getState().grantPursuitXP(grants, { reason: 'Check-in' });
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

