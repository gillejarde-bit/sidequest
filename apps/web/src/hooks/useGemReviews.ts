import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useGemReviews(gemId: string) {
  return useQuery({
    queryKey: ['gemReviews', gemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gem_ratings')
        .select(`
          id,
          rating,
          review_text,
          photo_urls,
          created_at,
          profiles (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('gem_id', gemId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data
    },
    enabled: !!gemId,
  })
}
