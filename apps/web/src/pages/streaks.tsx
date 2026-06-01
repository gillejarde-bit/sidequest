import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import { 
  Flame, 
  Users, 
  Plus, 
  AlertTriangle, 
  Sparkles, 
  Check, 
  Loader2,
  ChevronLeft,
  Heart,
  ZoomIn,
  ZoomOut,
  Scissors,
  Upload
} from 'lucide-react'
import { useToastStore } from '../stores/toastStore'

interface StreakGroup {
  group_id: string
  group_name: string
  group_color: string
  group_avatar: string | null
  current_streak: number
  longest_streak: number
  last_quest_at: string | null
  streak_frozen: boolean
  member_count: number
  days_until_break: number
  next_milestone: number
  is_at_risk: boolean
}

export function StreaksPage() {
  const { profile, user } = useAuthStore()
  const { addToast } = useToastStore()
  const [streaks, setStreaks] = useState<StreakGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Create group form state
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupColor, setGroupColor] = useState('#6C63FF')
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)

  // Crew Avatar states
  const [crewAvatarUrl, setCrewAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cropper states
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [cropZoom, setCropZoom] = useState(1.0)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [popupMessage, setPopupMessage] = useState<string | null>(null)

  // File selection triggers cropper instead of direct uploading
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        setCropImage(reader.result as string)
        setCropZoom(1.0)
        setCropOffset({ x: 0, y: 0 })
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      console.error(err)
      setPopupMessage(`File selection error: ${err.message}`)
    }
  }

  // Perform crop on HTML5 Canvas and upload to Supabase Storage
  const handlePerformCrop = async () => {
    if (!cropImage || !user) return
    setUploading(true)
    const srcToCrop = cropImage
    setCropImage(null)

    try {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = (err) => reject(new Error('Image failed to load: ' + err))
        img.src = srcToCrop
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not create canvas context')

      const targetSize = 400
      canvas.width = targetSize
      canvas.height = targetSize

      ctx.fillStyle = 'rgba(0, 0, 0, 0)'
      ctx.fillRect(0, 0, targetSize, targetSize)

      const previewSize = 288 // matches w-72 preview
      const ratio = targetSize / previewSize

      ctx.save()
      ctx.translate(targetSize / 2, targetSize / 2)
      ctx.translate(cropOffset.x * ratio, cropOffset.y * ratio)
      ctx.scale(cropZoom, cropZoom)

      const imgRatio = img.naturalWidth / img.naturalHeight
      let drawW = previewSize
      let drawH = previewSize

      if (imgRatio > 1) {
        drawW = previewSize
        drawH = previewSize / imgRatio
      } else {
        drawH = previewSize
        drawW = previewSize * imgRatio
      }

      const finalW = drawW * ratio
      const finalH = drawH * ratio

      ctx.drawImage(img, -finalW / 2, -finalH / 2, finalW, finalH)
      ctx.restore()

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setPopupMessage('Failed to crop image.')
          setUploading(false)
          return
        }

        try {
          const fileName = `${user.id}/crew-${Date.now()}.png`
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, blob, { 
              contentType: 'image/png',
              upsert: true 
            })

          if (uploadError) throw uploadError

          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
          setCrewAvatarUrl(data.publicUrl)
        } catch (err: any) {
          console.error(err)
          setPopupMessage(`Upload failed: ${err.message}`)
        } finally {
          setUploading(false)
        }
      }, 'image/png')

    } catch (err: any) {
      console.error(err)
      setPopupMessage(`Crop failed: ${err.message}`)
      setUploading(false)
    }
  }

  // Mouse & Touch Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setCropOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - cropOffset.x,
        y: e.touches[0].clientY - cropOffset.y
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    setCropOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    })
  }

  const handleRestoreStreak = async () => {
    try {
      setRestoring(true)
      const { data, error } = await supabase.rpc('restore_streak_with_life' as any)
      if (error) throw error
      const res = data as any
      if (res && res.success) {
        addToast({
          message: `✨ Streak revived to ${res.restored_streak} days! Remaining: ${res.new_lives} ❤️`,
        })
        fetchStreaksData()
        if (user) {
          await useAuthStore.getState().fetchProfile(user.id)
        }
      } else {
        throw new Error(res?.error || 'Failed to restore streak')
      }
    } catch (err: any) {
      console.error(err)
      addToast({
        message: err.message || 'Failed to restore streak'
      })
    } finally {
      setRestoring(false)
    }
  }

  const presetColors = ['#58CC02', '#6C63FF', '#FF6B6B', '#FFD93D', '#3498DB', '#E67E22']

  const fetchStreaksData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_my_streaks')
      if (error) throw error
      setStreaks(data as StreakGroup[] || [])
    } catch (err: any) {
      console.error('Error fetching streaks:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStreaksData()
  }, [])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return

    try {
      setCreating(true)
      
      // 1. Insert the quest group
      const { data: newGroup, error: groupErr } = await supabase
        .from('quest_groups')
        .insert({
          name: groupName.trim(),
          description: groupDesc.trim() || null,
          group_color: groupColor,
          avatar_url: crewAvatarUrl || null,
          created_by: user?.id,
          streak: 0,
          longest_streak: 0,
          member_count: 1
        })
        .select()
        .single()

      if (groupErr) throw groupErr

      // 2. Insert creator into group members
      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          user_id: user?.id || '',
          role: 'creator'
        })

      if (memberErr) throw memberErr

      addToast({
        message: `Group "${groupName}" created! 👥`,
      })

      setGroupName('')
      setGroupDesc('')
      setCrewAvatarUrl('')
      setIsCreateModalOpen(false)
      fetchStreaksData()
    } catch (err: any) {
      console.error('Error creating group:', err.message)
      addToast({
        message: err.message || 'Failed to create group',
      })
    } finally {
      setCreating(false)
    }
  }

  const getFlameStyles = (streak: number) => {
    if (streak <= 2) return { color: '#A8A8B3', bgClass: 'bg-gray-100 dark:bg-gray-800 text-gray-400' }
    if (streak <= 6) return { color: '#E67E22', bgClass: 'bg-orange-100 dark:bg-orange-950/30 text-orange-500' }
    if (streak <= 13) return { color: '#FF6B35', bgClass: 'bg-amber-100 dark:bg-amber-950/30 text-amber-500 font-bold' }
    if (streak <= 29) return { color: '#FF3B30', bgClass: 'bg-red-100 dark:bg-red-950/30 text-red-500 font-bold shadow-lg shadow-red-500/20' }
    if (streak <= 49) return { color: '#FFD93D', bgClass: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-500 font-bold shadow-lg shadow-yellow-500/20 animate-pulse' }
    return { color: 'rainbow', bgClass: 'bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white font-extrabold shadow-lg animate-pulse' }
  }

  const overallStreak = profile?.current_streak || 0
  const overallLongest = profile?.longest_streak || 0

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            to="/map"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500 animate-bounce" fill="currentColor" />
            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Streaks Hub</h1>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-md mx-auto p-4 pt-6 pb-32 space-y-6">
        
        {/* RPG Lives Status Tracking (Absolute Top) */}
        {(() => {
          const lives = (profile as any)?.lives ?? 3
          const livesPercent = Math.round((lives / 3) * 100)
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-500">
                    <Heart className="w-5 h-5" fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
                      Life
                      <span className="text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-500 px-2 py-0.5 rounded-md">
                        Active
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-0.5">{lives} / 3 Hearts remaining</p>
                  </div>
                </div>
                
                {/* Visual Hearts Row */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart 
                      key={i} 
                      className={`w-5 h-5 transition-all ${
                        i < lives 
                          ? 'text-red-500 fill-current animate-pulse' 
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                      style={i < lives ? { animationDelay: `${i * 0.2}s` } : {}}
                    />
                  ))}
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all duration-500" 
                    style={{ width: `${livesPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-300 font-semibold mt-2.5 leading-relaxed">
                  Missing planned quests reduces your hearts. Recharge by attending group events or verifying hidden gems!
                </p>
              </div>
            </motion.div>
          )
        })()}

        {/* Streak Restoration Alert Card */}
        {profile && profile.current_streak === 0 && (profile as any).previous_streak > 0 && (profile as any).lives > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-3xl p-5 shadow-lg flex flex-col items-center text-center space-y-4"
          >
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center text-red-500">
              <Heart className="w-6 h-6 animate-bounce" fill="currentColor" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-white text-base">Your Streak is Broken! 💔</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">
                You didn't check in on time or were too far. Save your <span className="text-orange-500">{(profile as any).previous_streak}-day streak</span> before it's gone forever!
              </p>
            </div>
            <button
              onClick={handleRestoreStreak}
              disabled={restoring}
              className="w-full py-3.5 bg-red-500 hover:bg-red-650 disabled:opacity-50 text-white font-extrabold rounded-2xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-500/25"
            >
              {restoring ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Heart className="w-4.5 h-4.5 fill-current" />
                  Use 1 Life to Restore
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Personal Streak Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/10"
        >
          {/* Decorative Sparkles */}
          <div className="absolute top-2 right-2 opacity-35">
            <Sparkles className="w-16 h-16 text-white/40" />
          </div>

          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black tracking-wider uppercase bg-white/20 px-2.5 py-1 rounded-full text-white/95">
                Active Personal Streak
              </span>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-6xl font-black tracking-tight">{overallStreak}</span>
                <span className="text-xl font-bold text-orange-100">days</span>
              </div>
            </div>
            
            {/* Animated Flame Icon */}
            <motion.div
              animate={{ 
                scale: [1, 1.08, 0.96, 1.04, 1],
                rotate: [0, 3, -3, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="p-3 bg-white/20 rounded-2xl"
            >
              <Flame className="w-12 h-12 text-white" fill="currentColor" />
            </motion.div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-orange-50">
            <div>
              <p className="opacity-75">Personal Best</p>
              <p className="font-extrabold text-white text-lg">{overallLongest} days 🔥</p>
            </div>
            {overallStreak >= 5 && (
              <span className="bg-emerald-500/30 px-3 py-1 rounded-xl text-xs font-black">
                ON FIRE!
              </span>
            )}
          </div>
        </motion.div>

        {/* Section Title */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Crew Streaks
          </h2>
          <span className="text-xs text-gray-400 font-bold bg-gray-200/50 dark:bg-gray-800 px-2 py-1 rounded-lg">
            {streaks.length} Joined
          </span>
        </div>

        {/* Loading / Empty states */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-gray-400 font-semibold">Loading your crew streaks...</p>
          </div>
        ) : streaks.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-dashed border-gray-200 dark:border-gray-700 text-center space-y-4 shadow-sm"
          >
            <p className="text-gray-400 font-bold">You aren't in any quest groups yet! Start a Crew to build streaks together.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-primary hover:bg-[#46A302] text-white font-extrabold rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
            >
              Create New Crew
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {streaks.map((crew, idx) => {
              const { color: flameColor, bgClass } = getFlameStyles(crew.current_streak)
              const percent = Math.min(100, Math.round((crew.current_streak / crew.next_milestone) * 100))
              const isRainbow = flameColor === 'rainbow'
              const lastQuestDate = crew.last_quest_at ? new Date(crew.last_quest_at).toLocaleDateString() : 'Never'

              return (
                <motion.div
                  key={crew.group_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Crew Badge/Color */}
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg relative overflow-hidden shrink-0"
                        style={{ backgroundColor: crew.group_color }}
                      >
                        {crew.group_avatar ? (
                          <img src={crew.group_avatar} className="w-full h-full object-cover" />
                        ) : (
                          crew.group_name[0].toUpperCase()
                        )}
                        {crew.streak_frozen && (
                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 text-[8px] z-10">
                            ❄️
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-black text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {crew.group_name}
                        </h3>
                        <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5 mt-0.5">
                          <Users className="w-3.5 h-3.5" />
                          {crew.member_count} members • Last quest: {lastQuestDate}
                        </p>
                      </div>
                    </div>

                    {/* Streak Badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl ${isRainbow ? 'bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white font-extrabold shadow-lg animate-pulse' : bgClass}`}>
                        <motion.div
                          animate={{ 
                            scale: [1, 1.08, 0.96, 1.04, 1],
                            rotate: [0, 3, -3, 1, 0]
                          }}
                          transition={{
                            duration: 1.5 + Math.random(),
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Flame 
                            className="w-4.5 h-4.5" 
                            fill={isRainbow ? 'currentColor' : flameColor} 
                            stroke={isRainbow ? 'none' : flameColor} 
                          />
                        </motion.div>
                        <span className="text-sm font-black tracking-tight">{crew.current_streak}</span>
                      </div>
                      {crew.is_at_risk && (
                        <div className="flex items-center gap-1 text-[9px] text-red-500 font-black bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-950/50 mt-1">
                          <Heart className="w-2.5 h-2.5 fill-current" />
                          <span>-1 Life</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Warning message if at risk */}
                  {crew.is_at_risk && (
                    <div className="mt-3 flex flex-col gap-1 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 p-2.5 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-950/30">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>⚠️ At risk — missing this costs a life</span>
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-300 pl-5">
                        {crew.days_until_break} days left to quest!
                      </span>
                    </div>
                  )}

                  {/* Progress Milestone Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">
                      <span>Next milestone: {crew.next_milestone} days</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[#8BF131]"
                        style={isRainbow ? { background: 'linear-gradient(90deg, #ff007f, #7f00ff, #007fff)' } : {}}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

      </main>

      {/* Create Crew Modal Dialog */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <>
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
            />
            {/* Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700 focus:outline-none"
            >
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <Users className="w-6 h-6 text-primary" />
                Assemble a New Crew
              </h2>
              <p className="text-xs font-semibold text-gray-400 mb-5">
                Rally your friends to tackle quests together, maintain a unified streak flame, and earn exclusive team rewards!
              </p>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="flex flex-col items-center gap-2.5 mb-6">
                  {/* Crew Icon Circular Selector Container */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-full border-4 border-dashed border-gray-200 dark:border-gray-700/85 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden group hover:border-primary/50 transition-colors shadow-inner"
                    style={crewAvatarUrl ? { borderStyle: 'solid', borderColor: groupColor } : {}}
                  >
                    {crewAvatarUrl ? (
                      <img src={crewAvatarUrl} alt="Crew Icon Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-1 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Upload Pic</span>
                      </>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-black text-primary hover:text-[#46A302] active:scale-95 transition-all"
                  >
                    {crewAvatarUrl ? 'Change Photo' : 'Choose Crew Icon'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Crew Name
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Taco Tuesday Alliance"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Description / Vibe
                  </label>
                  <textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Describe your crew's focus..."
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Crew Banner Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setGroupColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform active:scale-90 ${groupColor === color ? 'ring-4 ring-primary ring-offset-2 dark:ring-offset-gray-800 scale-105' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-1/2 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 font-extrabold rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-1/2 py-3 bg-primary hover:bg-[#46A302] disabled:bg-primary/50 text-white font-extrabold rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-primary/25"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                        Assemble
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Premium Glassmorphic in-page popup modal replacing ugly browser alerts */}
      <AnimatePresence>
        {popupMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="max-w-sm w-full bg-white dark:bg-gray-950 p-6 rounded-3xl border border-gray-200 dark:border-gray-900 shadow-2xl text-center flex flex-col gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Notice</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  {popupMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPopupMessage(null)}
                className="w-full bg-[#58CC02] hover:bg-[#46A302] border-bottom-[4px] border-[#46A302] text-white font-extrabold p-3.5 rounded-2xl shadow-md cursor-pointer transition-all active:scale-98"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Full-Screen Dedicated Photo Cropper Page */}
      <AnimatePresence>
        {cropImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0a0d18] text-white select-none"
          >
            {/* Top Bar Header */}
            <div className="w-full flex items-center justify-between px-6 py-5 border-b border-white/5 bg-gray-950/20 backdrop-blur-md">
              <button 
                type="button" 
                onClick={() => setCropImage(null)}
                className="text-white/60 hover:text-white text-sm font-extrabold flex items-center gap-1 active:scale-95 transition-transform"
              >
                ← Back
              </button>
              <h3 className="text-lg font-black tracking-tight text-center text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#58CC02]" /> Edit Crew Icon
              </h3>
              <div className="w-12" /> {/* spacer for center alignment */}
            </div>

            {/* Main Crop Viewport Center Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
              <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-[#58CC02] shadow-[0_0_30px_rgba(88,204,2,0.2)] bg-gray-950 cursor-move flex items-center justify-center select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                <img
                  src={cropImage}
                  alt="Crop preview"
                  style={{
                    transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                    transformOrigin: 'center center',
                  }}
                  className="absolute w-full h-full object-contain pointer-events-none select-none"
                />

                {/* Aesthetic alignment overlay rules */}
                <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/10 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/10 pointer-events-none" />
              </div>
              <p className="text-xs text-white/50 mt-6 tracking-wide uppercase font-bold">
                Drag to Reposition
              </p>
            </div>

            {/* Bottom Controls Panel */}
            <div className="w-full max-w-md mx-auto px-6 pb-8 flex flex-col gap-6 bg-gradient-to-t from-[#0a0d18] to-transparent">
              {/* Zoom slider controls */}
              <div className="w-full flex flex-col gap-2 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center text-xs text-white/60 font-black px-1">
                  <span>ZOOM LEVEL</span>
                  <span>{Math.round(cropZoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-white/40" />
                  <input 
                    type="range" 
                    min="1.0" 
                    max="3.0" 
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#58CC02] focus:outline-none"
                  />
                  <ZoomIn className="w-4 h-4 text-white/40" />
                </div>
              </div>

              {/* Actions button panel */}
              <div className="flex gap-4 w-full">
                <button
                  type="button"
                  onClick={() => setCropImage(null)}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-white font-extrabold py-4 rounded-2xl transition-colors cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePerformCrop}
                  className="flex-1 bg-[#58CC02] hover:bg-[#46A302] border-bottom-[4px] border-[#46A302] text-white font-extrabold py-4 rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                >
                  Save & Continue
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
