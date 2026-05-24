import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useGem(id: string) {
  return useQuery({
    queryKey: ['gemDetail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          id,
          name,
          category,
          description,
          photo_urls,
          nomination_photo_urls,
          nomination_description,
          gem_status,
          avg_rating,
          vote_count,
          visit_count,
          approval_threshold,
          profiles!locations_nominated_by_fkey(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .eq('is_hidden_gem', true)
        .single()

      if (error) {
        throw error
      }

      return data
    },
    enabled: !!id,
  })
}
