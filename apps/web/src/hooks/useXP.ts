import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useXPStore } from '../stores/xpStore'
import { getLevelFromXP, getLevelTitle } from '../lib/xp'

export function useXP() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['xp-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not logged in')
      const { data, error } = await supabase.rpc('get_xp_stats', {
        p_user_id: user.id
      })
      if (error) throw error
      return data as any
    },
    staleTime: 10000,
    enabled: !!user
  })
}

export function useAwardXP() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { addXPEvent, triggerLevelUp } = useXPStore()
  
  return useMutation({
    mutationFn: async ({ points, action, referenceId }: { points: number, action: string, referenceId?: string }) => {
      if (!user) throw new Error('Not logged in')
      
      // Get current XP state to check for level up
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .single()
        
      const oldLevel = profile?.level || 1
      const currentXP = profile?.xp || 0
      
      // 1. Insert XP Event
      const { error: eventError } = await supabase.from('xp_events').insert({
        user_id: user.id,
        action_type: action,
        points,
        reference_id: referenceId,
        reference_type: action
      })
      if (eventError) throw eventError

      // 2. Update Profile XP
      const { error: updateError } = await supabase.rpc('update_profile_xp', {
        p_points: points
      })
      if (updateError) throw updateError
      
      const newXP = currentXP + points
      const newLevel = getLevelFromXP(newXP)
      
      // 3. Trigger popup in UI
      addXPEvent(points, action)
      
      // 4. Check for Level Up and Badges
      if (newLevel > oldLevel) {
        const { data: badgeData } = await supabase.rpc(
          'check_and_award_badges',
          { p_user_id: user.id }
        )
        triggerLevelUp({
          newLevel,
          newTitle: getLevelTitle(newLevel),
          newBadges: (badgeData as any)?.new_badges || []
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xp-stats'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    }
  })
}
