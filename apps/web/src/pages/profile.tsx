import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useFriends, useSendFriendRequest, useRespondToRequest } from '../hooks/useFriends'
import { motion } from 'framer-motion'
import { Camera, ChevronLeft, Check, UserPlus, ShieldAlert, Award, MapPin } from 'lucide-react'
import type { Database } from '../types/database.types'
import { getAvatarUrl } from '../lib/avatar'

type Profile = Database['public']['Tables']['profiles']['Row']

export function Profile() {
  const { id } = useParams({ from: '/profile/$id' })
  const { user: currentUser, fetchProfile: refreshCurrentUser } = useAuthStore()
  
  const { data: myFriends } = useFriends()
  const { mutate: sendRequest } = useSendFriendRequest()
  const { mutate: respond } = useRespondToRequest()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ questCount: 0, friendCount: 0 })
  const [recentQuests, setRecentQuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const isOwnProfile = currentUser?.id === id

  const [friendStatus, setFriendStatus] = useState<'none' | 'sent' | 'received' | 'friends'>('none')
  const [friendshipId, setFriendshipId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
      setProfile(data)

      if (data) {
        // Fetch stats
        const { count: qCount } = await supabase.from('quest_attendance').select('*', { count: 'exact', head: true }).eq('user_id', id)
        const { count: fCount } = await supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('status', 'accepted').or(`user_id.eq.${id},friend_id.eq.${id}`)
        setStats({ questCount: qCount || 0, friendCount: fCount || 0 })

        // Fetch recent quests
        const { data: qData } = await supabase
          .from('quest_attendance')
          .select('quests(*, locations(*))')
          .eq('user_id', id)
          .limit(10)
        
        if (qData) {
          const validQuests = qData.map(q => q.quests).filter(q => q && q.status === 'completed')
          setRecentQuests(validQuests)
        }

        // Fetch relationship status if not own profile
        if (!isOwnProfile && currentUser) {
          const { data: relData } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${currentUser.id})`)
            .single()

          if (relData) {
            setFriendshipId(relData.id)
            if (relData.status === 'accepted') setFriendStatus('friends')
            else if (relData.user_id === currentUser.id) setFriendStatus('sent')
            else setFriendStatus('received')
          } else {
            setFriendStatus('none')
            setFriendshipId(null)
          }

          // Fetch mutual friends (basic intersection for now)
          const { data: mfData } = await supabase.rpc('search_users' as any, { search_term: data.username })
          if (mfData && (mfData as any[]).length > 0) {
            // we can use the search RPC which returns mutual count, but we need the actual friends.
            // For now, let's just do a simple query or skip it if too complex
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [id, currentUser])

  // Sync state with React Query hooks mutations optimistically
  useEffect(() => {
    if (!isOwnProfile && currentUser && myFriends) {
      if (myFriends.find(f => f.id === id)) setFriendStatus('friends')
    }
  }, [myFriends, id])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !isOwnProfile || !currentUser) return
    setUploading(true)
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `${currentUser.id}/avatar.${fileExt}`
    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id)
      if (updateError) throw updateError
      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null)
      refreshCurrentUser(currentUser.id)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleAddFriend = () => {
    sendRequest(id, { onSuccess: () => setFriendStatus('sent') })
  }

  const handleRemoveFriend = async () => {
    if (friendshipId) {
      await supabase.from('friendships').delete().eq('id', friendshipId)
      setFriendStatus('none')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  if (!profile) return <div className="p-8 text-center text-gray-500">Profile not found.</div>

  const level = profile.level || 1
  const xp = profile.xp || 0
  const currentLevelXp = (level - 1) * (level - 1) * 100
  const nextLevelXp = level * level * 100
  const progress = Math.min(100, Math.max(0, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => window.history.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-900 active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-4 border-white shadow-md">
              {profile.avatar_url ? (
                <img src={getAvatarUrl(profile.avatar_url, profile.username)} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-gray-500">{profile.username[0].toUpperCase()}</span>
              )}
            </div>
            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-md hover:scale-105 transition-transform">
                <Camera size={16} />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>
          
          <h1 className="text-2xl font-black text-gray-900">{profile.display_name || profile.username}</h1>
          <p className="text-gray-500 font-medium mb-1">@{profile.username}</p>
          {profile.title && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">
              {profile.title}
            </span>
          )}

          {/* Level & XP Bar */}
          <div className="w-full max-w-xs mt-2">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-purple-600">Level {level}</span>
              <span className="text-gray-500">{xp} / {nextLevelXp} XP</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#58CC02] to-[#4CAF50]"
              />
            </div>
          </div>
        </div>

        {/* Friend Action Button */}
        {!isOwnProfile && (
          <div className="flex justify-center">
            {friendStatus === 'none' && (
              <button onClick={handleAddFriend} className="w-48 bg-white border-2 border-primary text-primary font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
                <UserPlus className="w-5 h-5" /> Add Friend
              </button>
            )}
            {friendStatus === 'sent' && (
              <button disabled className="w-48 bg-gray-100 text-gray-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                Request Sent
              </button>
            )}
            {friendStatus === 'received' && friendshipId && (
              <button onClick={() => respond({ friendshipId, requesterId: id, action: 'accept' })} className="w-48 bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 shadow-md">
                <Check className="w-5 h-5" /> Accept Request
              </button>
            )}
            {friendStatus === 'friends' && (
              <button onClick={handleRemoveFriend} className="w-48 bg-green-50 border border-green-200 text-green-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors group">
                <Check className="w-5 h-5 group-hover:hidden" />
                <span className="group-hover:hidden">Friends ✓</span>
                <ShieldAlert className="w-5 h-5 hidden group-hover:block" />
                <span className="hidden group-hover:inline">Remove</span>
              </button>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-xl font-black text-gray-900">{stats.questCount}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quests</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-xl font-black text-gray-900">{stats.friendCount}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Friends</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-xl font-black text-primary">{xp}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total XP</p>
          </div>
        </div>

        {/* Quest History */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 px-1">Recent Quests</h2>
          <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100">
            {recentQuests.length > 0 ? (
              recentQuests.map(q => (
                <Link key={q.id} to="/quest/$id" params={{ id: q.id }} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{q.name}</h3>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {q.locations?.name || 'Unknown Location'}
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400 text-sm">
                No quests completed yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
