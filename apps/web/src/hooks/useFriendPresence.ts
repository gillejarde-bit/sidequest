import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settingsStore'

export interface FriendPresence {
  user_id: string
  lat: number | null
  lng: number | null
  heading: number | null
  updated_at: string
  username: string
  avatar_url: string
  level: number
  share_location?: boolean
  location_sharing_scope?: string
}

interface UseFriendPresenceArgs {
  lat: number | null
  lng: number | null
  heading: number | null
}

const DEFAULT_LAT = 36.1699
const DEFAULT_LNG = -115.1398

export function useFriendPresence({ lat, lng, heading }: UseFriendPresenceArgs) {
  const { user, profile } = useAuthStore()
  const { shareLocation, locationSharingScope } = useSettingsStore()
  const [friends, setFriends] = useState<Map<string, FriendPresence>>(new Map())
  const lastBroadcastRef = useRef<number>(0)
  const lastPosRef = useRef<{ lat: number | null; lng: number | null } | null>(null)
  const channelRef = useRef<any>(null)

  const broadcastAndPersist = async (force = false) => {
    if (!channelRef.current || !user?.id) return
    const now = Date.now()
    if (!force && now - lastBroadcastRef.current < 10000) return

    const shouldShareLoc = shareLocation && lat !== null && lng !== null
    const payload = {
      user_id: user.id,
      lat: shouldShareLoc ? lat : null,
      lng: shouldShareLoc ? lng : null,
      heading: shouldShareLoc ? (heading ?? null) : null,
      updated_at: new Date().toISOString(),
      username: profile?.username ?? 'explorer',
      avatar_url: profile?.avatar_url ?? '',
      level: profile?.level ?? 1,
      share_location: shouldShareLoc,
      location_sharing_scope: locationSharingScope,
    }

    try {
      await channelRef.current.track(payload)
      lastBroadcastRef.current = now
      lastPosRef.current = { lat, lng }

      // Also persist last seen in database so it functions offline
      await supabase.from('user_locations').upsert({
        user_id: user.id,
        lat: shouldShareLoc ? lat : DEFAULT_LAT,
        lng: shouldShareLoc ? lng : DEFAULT_LNG,
        heading: shouldShareLoc ? (heading ?? null) : null,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Error broadcasting presence or locations:', err)
    }
  }

  useEffect(() => {
    if (!user?.id) return

    const userId = user.id

    const channel = supabase.channel('global-presence', {
      config: {
        presence: { key: userId },
      },
    })

    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const newFriends = new Map<string, FriendPresence>()

        for (const id in state) {
          if (id !== userId) {
            // @ts-ignore - Supabase presence state is untyped
            const presenceData = state[id][0] as FriendPresence
            if (presenceData) {
              newFriends.set(id, presenceData)
            }
          }
        }
        setFriends(newFriends)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await broadcastAndPersist(true)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Track position or settings changes and broadcast
  useEffect(() => {
    if (!channelRef.current || !user?.id) return
    const posChanged = lastPosRef.current?.lat !== lat || lastPosRef.current?.lng !== lng
    if (posChanged) {
      broadcastAndPersist(false)
    }
  }, [lat, lng, heading, shareLocation, locationSharingScope, user?.id, profile?.username, profile?.level])

  return friends
}
