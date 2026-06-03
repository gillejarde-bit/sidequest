import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toastStore'
import { useAwardXP } from './useXP'
import { usePursuitsStore } from '../features/pursuits/pursuits.store'
import { XP_REWARDS } from '../features/pursuits/pursuits.config'

export interface Friend {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  level: number
  xp: number
  quest_count: number
  last_seen_at?: string | null
}

export interface PendingRequest {
  friendship_id: string
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  level: number
  created_at: string
}

export function useFriends() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async (): Promise<Friend[]> => {
      const { data: friends, error } = await supabase.rpc('get_friends_with_status' as any)
      if (error) throw error
      
      if (friends && friends.length > 0) {
        const friendIds = friends.map((f: any) => f.id)
        const { data: locations, error: locError } = await supabase
          .from('user_locations')
          .select('user_id, updated_at')
          .in('user_id', friendIds)

        if (!locError && locations) {
          const locMap = new Map(locations.map(l => [l.user_id, l.updated_at]))
          return friends.map((f: any) => ({
            ...f,
            last_seen_at: locMap.get(f.id) || null
          }))
        }
      }
      
      return friends || []
    },
    staleTime: 30000,
    enabled: !!user
  })
}

export function usePendingRequests() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { addToast } = useToastStore()

  const query = useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async (): Promise<PendingRequest[]> => {
      const { data, error } = await supabase.rpc('get_pending_requests' as any)
      if (error) throw error
      return data || []
    },
    enabled: !!user
  })

  useEffect(() => {
    if (!user) return

    const channelId = `friendships_changes_${user.id}_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${user.id}`
        },
        async (payload) => {
          if (payload.new.status === 'pending') {
            // Fetch the requester's profile to get their username for the toast
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', payload.new.user_id)
              .single()

            if (profile) {
              addToast({
                message: `👋 ${profile.username} wants to go on a quest with you!`,
                avatarUrl: profile.avatar_url || undefined
              })
            }
            queryClient.invalidateQueries({ queryKey: ['pending-requests', user?.id] })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.status === 'accepted') {
            queryClient.invalidateQueries({ queryKey: ['friends', user?.id] })
            queryClient.invalidateQueries({ queryKey: ['pending-requests', user?.id] })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient, addToast])

  return {
    requests: query.data || [],
    count: query.data?.length || 0,
    isLoading: query.isLoading
  }
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (targetId: string) => {
      if (!user) throw new Error('Not logged in')
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetId,
          status: 'pending'
        })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] })
    }
  })
}

export function useRespondToRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { mutate: awardXP } = useAwardXP()

  return useMutation({
    mutationFn: async ({ friendshipId, requesterId, action }: { friendshipId: string, requesterId: string, action: 'accept' | 'decline' }) => {
      if (!user) throw new Error('Not logged in')
      
      if (action === 'accept') {
        const { error: updateError } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendshipId)
        
        if (updateError) throw updateError

        const { error: insertError } = await supabase
          .from('friendships')
          .insert({
            user_id: user.id,
            friend_id: requesterId,
            status: 'accepted'
          })
        // Ignore unique constraint error if it already exists
        if (insertError && insertError.code !== '23505') {
          console.error(insertError)
        }
        
        // Award XP to the current user
        awardXP({ points: 10, action: 'make_friend', referenceId: requesterId })
        
        // Award Pursuits XP to fellowship
        usePursuitsStore.getState().grantPursuitXP(
          [{ pursuit: 'fellowship', amount: XP_REWARDS.friendAccepted }], 
          { reason: 'Friend Accepted' }
        )
        
      } else {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'blocked' })
          .eq('id', friendshipId)
        if (error) throw error
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests', user?.id] })
      if (action === 'accept') {
        queryClient.invalidateQueries({ queryKey: ['friends', user?.id] })
      }
    }
  })
}
