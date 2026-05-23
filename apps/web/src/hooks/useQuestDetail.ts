import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useQuestDetail(questId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['quest-detail', questId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_quest_detail' as any, { quest_id: questId })
      if (error) throw error
      return data
    },
    staleTime: 30000,
    enabled: !!questId
  })

  // Realtime subscription for invites/RSVPs
  useEffect(() => {
    if (!questId) return

    const channel = supabase
      .channel(`quest-invites-${questId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quest_invites',
          filter: `quest_id=eq.${questId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['quest-detail', questId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [questId, queryClient])

  return query
}
