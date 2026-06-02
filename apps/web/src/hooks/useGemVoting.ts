import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

import { usePursuitsStore } from '../features/pursuits/pursuits.store'
import { XP_REWARDS } from '../features/pursuits/pursuits.config'

export function useGemVoting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gemId, vote }: { gemId: string; vote: number }) => {
      const { data, error } = await supabase.rpc('vote_on_gem', {
        p_gem_id: gemId,
        p_vote: vote,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      // Invalidate gems query so it refetches
      queryClient.invalidateQueries({ queryKey: ['gems'] })
      usePursuitsStore.getState().grantPursuitXP(
        [{ pursuit: 'discovery', amount: XP_REWARDS.gemVerify }], 
        { reason: 'Gem Verified' }
      )
    },
  })
}
