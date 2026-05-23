import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export function useQuestChat(questId: string) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['quest-chat', questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, profiles:sender_id(username, avatar_url, display_name)')
        .eq('quest_id', questId)
        .order('created_at', { ascending: false })
        .limit(50)
        
      if (error) throw error
      // Reverse so newest is at the bottom visually
      return data.reverse()
    },
    enabled: !!questId
  })

  useEffect(() => {
    if (!questId) return

    const channel = supabase
      .channel(`quest-chat-${questId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `quest_id=eq.${questId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['quest-chat', questId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [questId, queryClient])

  const { mutate: sendMessage, isPending: sending } = useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error('Not logged in')
      const { error } = await supabase
        .from('chat_messages')
        .insert({ quest_id: questId, sender_id: user.id, body })
      if (error) throw error
    }
  })

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    sendMessage,
    sending
  }
}
