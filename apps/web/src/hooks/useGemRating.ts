import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface RateGemArgs {
  gemId: string
  rating: number
  review?: string
  photos?: File[]
}

export function useGemRating() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: RateGemArgs) => {
      let photoUrls: string[] = []
      
      if (args.photos) {
        for (const photo of args.photos) {
          const fileExt = photo.name.split('.').pop()
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('gems')
            .upload(fileName, photo)

          if (uploadError) {
            console.error("Upload error", uploadError)
            throw uploadError
          } else {
            const { data } = supabase.storage.from('gems').getPublicUrl(uploadData.path)
            photoUrls.push(data.publicUrl)
          }
        }
      }

      const { data, error } = await supabase.rpc('rate_hidden_gem', {
        p_gem_id: args.gemId,
        p_rating: args.rating,
        p_review: args.review || '',
        p_photo_urls: photoUrls,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gemReviews', variables.gemId] })
      queryClient.invalidateQueries({ queryKey: ['gemDetail', variables.gemId] })
    },
  })
}
