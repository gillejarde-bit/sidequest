import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useFriends, useSendFriendRequest, useRespondToRequest } from '../hooks/useFriends'
import { motion } from 'framer-motion'
import type { Database } from '../types/database.types'
import { getAvatarUrl } from '../lib/avatar'
import { deriveArchetype } from '../features/archetype/deriveArchetype'
import { fetchUserPursuitXP } from '../features/pursuits/pursuitsData'
import { AvatarBorder } from '../components/profile/borders'

import { 
  ChevronLeftIcon,
  CheckIcon,
  UserPlusIcon,
  UploadIcon,
  MapIcon,
  CloseIcon,
  CompassIcon,
  SparkleIcon,
  CrewIcon
} from '../components/icons'

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
  const [pursuitXP, setPursuitXP] = useState<Record<string, number>>({})

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

        // Fetch pursuits
        const pursuitsData = await fetchUserPursuitXP(id)
        const xpMap = pursuitsData.reduce((acc, curr) => {
          acc[curr.pursuit_key] = curr.xp
          return acc
        }, {} as Record<string, number>)
        setPursuitXP(xpMap)

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sq-bg)]">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--sq-ember-500)] border-t-transparent rounded-full" />
    </div>
  )
  
  if (!profile) return (
    <div className="p-8 text-center text-[var(--sq-text-muted)] font-black bg-[var(--sq-bg)] min-h-screen">
      Profile not found.
    </div>
  )

  const level = profile.level || 1
  const xp = profile.xp || 0
  const currentLevelXp = (level - 1) * (level - 1) * 100
  const nextLevelXp = level * level * 100
  const progress = Math.min(100, Math.max(0, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))
  const archetype = deriveArchetype(pursuitXP)

  return (
    <div data-theme="ember" className="min-h-screen bg-background text-foreground pb-32 w-full flex flex-col items-center">
      <header className="sticky top-0 z-40 bg-[var(--sq-bg)] border-b border-[var(--sq-hairline-strong)] w-full flex justify-center">
        <div className="max-w-2xl w-full px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => window.history.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline)] text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeftIcon size={20} withShadow={false} />
          </button>
          <div className="w-10" />
        </div>
      </header>

      {/* HEADER BACKGROUND GRADIENT AREA */}
      <div 
        className="w-full flex flex-col items-center pt-8 pb-4 px-6 text-center"
        style={{ background: `linear-gradient(to bottom, ${profile.profile_color || 'var(--sq-sage-500)'}18, transparent)` }}
      >
        <div className="relative mb-6">
          <AvatarBorder level={level} archetype={archetype}>
            {profile.avatar_url ? (
              <img 
                src={getAvatarUrl(profile.avatar_url, profile.username)} 
                alt={profile.username} 
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover bg-white border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" 
              />
            ) : (
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-white border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] flex items-center justify-center">
                <span className="text-4xl sm:text-5xl font-black text-[var(--sq-ember-300)]">{profile.username[0].toUpperCase()}</span>
              </div>
            )}
          </AvatarBorder>
          {isOwnProfile && (
            <label className="absolute bottom-0 right-0 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] p-3 rounded-full cursor-pointer shadow-md hover:scale-105 transition-transform border border-[var(--sq-keyline)] z-20">
              <UploadIcon size={20} withShadow={false} />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
            </label>
          )}
          <div className="absolute -bottom-2 -right-2 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] text-sm font-black px-3 py-1.5 rounded-full border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] flex items-center gap-1.5 z-10">
            <SparkleIcon size={14} active={true} withShadow={false} />
            Lvl {level}
          </div>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--sq-text)]">{profile.display_name || profile.username}</h1>
        <p className="text-base sm:text-lg text-[var(--sq-text-muted)] font-medium mt-1 mb-2">@{profile.username}</p>
        
        {profile.title && (
          <span className="px-3.5 py-1.5 bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] rounded-full text-xs font-black uppercase tracking-wider mb-3 inline-block">
            {profile.title}
          </span>
        )}

        {/* Active Archetype Badge */}
        <motion.div 
          key={archetype.name}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="mt-2 px-6 py-2.5 rounded-full text-base font-black tracking-wide text-white border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center gap-1.5"
          style={{ 
            background: archetype.kind === 'hybrid'
              ? `linear-gradient(135deg, ${archetype.baseColor}, ${archetype.accentColor})`
              : archetype.baseColor
          }}
        >
          {archetype.name}
        </motion.div>

        {/* Level & XP Bar */}
        <div className="w-full max-w-sm mt-6 bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] sq-wobbly-md">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="text-[var(--sq-ember-300)] font-black">Level {level}</span>
            <span className="text-[var(--sq-text-muted)] font-semibold">{xp} / {nextLevelXp} XP</span>
          </div>
          <div className="h-4 bg-[var(--sq-surface)] rounded-full overflow-hidden border border-[var(--sq-hairline)]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-[var(--sq-ember-500)]"
            />
          </div>
        </div>
      </div>

      <main className="max-w-2xl w-full mx-auto px-4 space-y-8 mt-2">
        {/* Friend Action Button */}
        {!isOwnProfile && (
          <div className="flex justify-center">
            {friendStatus === 'none' && (
              <button onClick={handleAddFriend} className="w-56 bg-[var(--sq-ember-500)] hover:bg-[var(--sq-ember-600)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold py-3.5 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer text-sm uppercase tracking-wider">
                <UserPlusIcon size={20} withShadow={false} /> Add Friend
              </button>
            )}
            {friendStatus === 'sent' && (
              <button disabled className="w-56 bg-[var(--sq-surface)] text-[var(--sq-text-muted)] border border-[var(--sq-hairline-strong)] font-extrabold py-3.5 rounded-full flex items-center justify-center gap-2 text-sm uppercase tracking-wider opacity-85">
                Request Sent
              </button>
            )}
            {friendStatus === 'received' && friendshipId && (
              <button onClick={() => respond({ friendshipId, requesterId: id, action: 'accept' })} className="w-56 bg-[var(--sq-sage-500)] hover:bg-[var(--sq-sage-600)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold py-3.5 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer text-sm uppercase tracking-wider">
                <CheckIcon size={20} withShadow={false} /> Accept Request
              </button>
            )}
            {friendStatus === 'friends' && (
              <button onClick={handleRemoveFriend} className="w-56 bg-[var(--sq-surface)] border border-[var(--sq-hairline-strong)] text-[var(--sq-text)] font-extrabold py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-[var(--sq-heart)] hover:text-[var(--sq-keyline)] hover:border-[var(--sq-keyline)] transition-all group active:scale-95 cursor-pointer text-sm uppercase tracking-wider">
                <CheckIcon size={20} withShadow={false} className="group-hover:hidden" />
                <span className="group-hover:hidden">Friends ✓</span>
                <div className="hidden group-hover:block shrink-0">
                  <CloseIcon size={20} withShadow={false} />
                </div>
                <span className="hidden group-hover:inline">Remove</span>
              </button>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 text-center shadow-[var(--sq-shadow-soft)] flex flex-col items-center justify-center gap-3 relative sq-wobbly-md">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
            <div className="p-3 rounded-2xl bg-opacity-10 z-10 text-[var(--sq-sage-500)] bg-[var(--sq-sage-500)]/10">
              <MapIcon size={26} withShadow={false} />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[var(--sq-text)] relative z-10 mt-1">{stats.questCount}</p>
            <p className="text-xs font-black text-[var(--sq-text-muted)] uppercase tracking-wider relative z-10">Quests</p>
          </div>
          
          <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 text-center shadow-[var(--sq-shadow-soft)] flex flex-col items-center justify-center gap-3 relative sq-wobbly-md">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
            <div className="p-3 rounded-2xl bg-opacity-10 z-10 text-[var(--sq-sage-600)] bg-[var(--sq-sage-600)]/10">
              <CrewIcon size={26} withShadow={false} />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[var(--sq-text)] relative z-10 mt-1">{stats.friendCount}</p>
            <p className="text-xs font-black text-[var(--sq-text-muted)] uppercase tracking-wider relative z-10">Friends</p>
          </div>
          
          <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 text-center shadow-[var(--sq-shadow-soft)] flex flex-col items-center justify-center gap-3 relative sq-wobbly-md">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
            <div className="p-3 rounded-2xl bg-opacity-10 z-10 text-[var(--sq-gold)] bg-[var(--sq-gold)]/10">
              <SparkleIcon size={26} withShadow={false} />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[var(--sq-ember-300)] relative z-10 mt-1">{xp}</p>
            <p className="text-xs font-black text-[var(--sq-text-muted)] uppercase tracking-wider relative z-10">Total XP</p>
          </div>
        </div>

        {/* Quest History */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--sq-text-muted)] px-1">Recent Quests</h2>
          <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-4 sm:p-5 shadow-[var(--sq-shadow-soft)] relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-3xl" />
            {recentQuests.length > 0 ? (
              <div className="flex flex-col gap-2 relative z-10">
                {recentQuests.map(q => (
                  <Link key={q.id} to="/quest/$id" params={{ id: q.id }} className="flex items-center gap-4 p-3.5 hover:bg-[var(--sq-surface)] rounded-2xl transition-colors cursor-pointer">
                    <div className="w-12 h-12 rounded-[var(--sq-r-md)] bg-[var(--sq-ember-500)]/10 border border-[var(--sq-ember-500)]/20 flex items-center justify-center text-[var(--sq-ember-300)] shrink-0 shadow-sm">
                      <CompassIcon size={20} active={true} withShadow={false} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="font-extrabold text-base text-[var(--sq-text)] truncate">{q.name}</h3>
                      <p className="text-sm text-[var(--sq-text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                        <MapIcon size={14} withShadow={false} className="inline-block shrink-0" /> 
                        {q.locations?.name || 'Unknown Location'}
                      </p>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--sq-ember-500)] shrink-0 border border-[var(--sq-keyline)] shadow" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[var(--sq-text-muted)] text-sm font-bold relative z-10">
                No quests completed yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
