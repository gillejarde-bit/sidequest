import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useGems(lat?: number, lng?: number, radius?: number, status?: string) {
  return useQuery({
    queryKey: ['gems', lat, lng, radius, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hidden_gems', {
        p_lat: lat,
        p_lng: lng,
        p_radius_meters: radius,
        p_status: status
      })

      if (error) {
        throw error
      }

      return data
    },
    enabled: lat !== undefined && lng !== undefined,
  })
}
