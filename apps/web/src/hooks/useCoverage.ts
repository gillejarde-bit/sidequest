import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface CoverageRow {
  id: string
  user_id: string
  h3_cell: string
  district_id: string | null
  explored_at: string
}

export function useCoverage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useQuery<string[]>({
    queryKey: ['user_coverage', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      
      const { data, error } = await (supabase as any)
        .from('user_coverage')
        .select('h3_cell')
        .eq('user_id', profile.id)

      if (error) {
        console.error('[useCoverage] Error fetching user coverage:', error)
        throw error
      }
      return (data as any[]).map((row) => row.h3_cell)
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache stale time
  })

  const addCoverageMutation = useMutation({
    mutationFn: async (cells: string[]) => {
      if (!profile?.id || cells.length === 0) return []
      
      const rows = cells.map(cell => ({
        user_id: profile.id,
        h3_cell: cell,
        district_id: null,
      }))

      // Use upsert to handle ON CONFLICT DO NOTHING (ignore duplicates)
      const { data, error } = await (supabase as any)
        .from('user_coverage')
        .upsert(rows, { onConflict: 'user_id,h3_cell' })
        .select()

      if (error) {
        console.error('[useCoverage] Error upserting coverage:', error)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_coverage', profile?.id] })
    },
  })

  return {
    coverage: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addCoverage: addCoverageMutation.mutateAsync,
    isAdding: addCoverageMutation.isPending,
  }
}
