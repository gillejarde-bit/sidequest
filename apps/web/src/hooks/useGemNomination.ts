import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface NominateArgs {
  name: string
  category: string
  description: string
  lat: number
  lng: number
  address?: string
  photos: File[]
}

export function useGemNomination() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: NominateArgs) => {
      // 1. Upload photos to Supabase Storage bucket 'gems'
      const photoUrls: string[] = []
      
      for (const photo of args.photos) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gems')
          .upload(filePath, photo)

        if (uploadError) {
          console.error("Upload error", uploadError)
          throw uploadError
        } else {
          const { data } = supabase.storage.from('gems').getPublicUrl(uploadData.path)
          photoUrls.push(data.publicUrl)
        }
      }

      // 2. Call nominate_hidden_gem RPC
      const { data, error } = await supabase.rpc('nominate_hidden_gem', {
        p_name: args.name,
        p_category: args.category,
        p_description: args.description,
        p_lat: args.lat,
        p_lng: args.lng,
        p_address: args.address || '',
        p_photo_urls: photoUrls,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gems'] })
    },
  })
}
