import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settingsStore'

export interface FriendPresence {
  user_id: string
  lat: number
  lng: number
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

export function useFriendPresence({ lat, lng, heading }: UseFriendPresenceArgs) {
  const { user, profile } = useAuthStore()
  const { shareLocation, locationSharingScope } = useSettingsStore()
  const [friends, setFriends] = useState<Map<string, FriendPresence>>(new Map())
  const lastBroadcastRef = useRef<number>(0)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const channelRef = useRef<any>(null)

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
          // Broadcast initial position immediately on subscribe only if coordinates are loaded
          const storeState = useSettingsStore.getState()
          if (storeState.shareLocation && lat !== null && lng !== null) {
            await channel.track({
              user_id: userId,
              lat,
              lng,
              heading: heading ?? null,
              updated_at: new Date().toISOString(),
              username: profile?.username ?? 'explorer',
              avatar_url: profile?.avatar_url ?? '',
              level: profile?.level ?? 1,
              share_location: true,
              location_sharing_scope: storeState.locationSharingScope,
            })
          }
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id]) // Only re-create channel when user changes

  // Handle shareLocation / locationSharingScope changes to track/untrack dynamically
  useEffect(() => {
    if (!channelRef.current || !user?.id) return
    
    if (shareLocation) {
      if (lat !== null && lng !== null) {
        channelRef.current.track({
          user_id: user.id,
          lat,
          lng,
          heading,
          updated_at: new Date().toISOString(),
          username: profile?.username ?? 'explorer',
          avatar_url: profile?.avatar_url ?? '',
          level: profile?.level ?? 1,
          share_location: true,
          location_sharing_scope: locationSharingScope,
        })
      }
    } else {
      channelRef.current.untrack()
    }
  }, [shareLocation, locationSharingScope, user?.id, profile?.username, profile?.level])

  // Throttled position broadcast (separate effect so channel isn't torn down on position change)
  useEffect(() => {
    if (!user?.id || !channelRef.current || lat === null || lng === null) return
    if (!shareLocation) return

    const now = Date.now()
    const posChanged =
      lastPosRef.current?.lat !== lat || lastPosRef.current?.lng !== lng

    if (posChanged && now - lastBroadcastRef.current >= 10000) {
      channelRef.current.track({
        user_id: user.id,
        lat,
        lng,
        heading,
        updated_at: new Date().toISOString(),
        username: profile?.username ?? 'explorer',
        avatar_url: profile?.avatar_url ?? '',
        level: profile?.level ?? 1,
        share_location: true,
        location_sharing_scope: locationSharingScope,
      })

      lastBroadcastRef.current = now
      lastPosRef.current = { lat, lng }
    }
  }, [user?.id, lat, lng, heading, profile?.username, profile?.level, shareLocation, locationSharingScope])

  return friends
}
