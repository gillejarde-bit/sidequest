import { type ChangeEvent, type FormEvent, type MouseEvent, type TouchEvent, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  CrewIcon,
  FriendsIcon,
  HeartIcon,
  PlusIcon,
  ScissorsIcon,
  StreakFlameIcon,
  UploadIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../components/icons'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
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

interface StreakProfileExtras {
  lives?: number
  previous_streak?: number
}

interface RestoreStreakResponse {
  success?: boolean
  restored_streak?: number
  new_lives?: number
  error?: string
}

const presetColors = [
  'var(--sq-ember-500)',
  'var(--sq-gold)',
  'var(--sq-sage-500)',
  'var(--sq-heart)',
  'var(--sq-warning)',
  'var(--sq-ember-600)',
]

function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-[var(--sq-text-muted)]">
      <span className="h-4 w-4 animate-spin rounded-[var(--sq-r-pill)] border-2 border-[var(--sq-ember-500)] border-t-transparent" />
      {label && <span>{label}</span>}
    </div>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function StreaksPage() {
  const { profile, user } = useAuthStore()
  const { addToast } = useToastStore()
  const [streaks, setStreaks] = useState<StreakGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupColor, setGroupColor] = useState(presetColors[0])
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [crewAvatarUrl, setCrewAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [cropZoom, setCropZoom] = useState(1.0)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [popupMessage, setPopupMessage] = useState<string | null>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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
    } catch (err: unknown) {
      console.error(err)
      setPopupMessage(`File selection error: ${getErrorMessage(err, 'Unable to select this file')}`)
    }
  }

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

      const previewSize = 256
      const ratio = targetSize / previewSize
      ctx.save()
      ctx.translate(targetSize / 2, targetSize / 2)
      ctx.translate(cropOffset.x * ratio, cropOffset.y * ratio)
      ctx.scale(cropZoom, cropZoom)

      const imgRatio = img.naturalWidth / img.naturalHeight
      const drawW = imgRatio > 1 ? previewSize : previewSize * imgRatio
      const drawH = imgRatio > 1 ? previewSize / imgRatio : previewSize
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
            .upload(fileName, blob, { contentType: 'image/png', upsert: true })

          if (uploadError) throw uploadError

          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
          setCrewAvatarUrl(data.publicUrl)
        } catch (err: unknown) {
          console.error(err)
          setPopupMessage(`Upload failed: ${getErrorMessage(err, 'Unable to upload this image')}`)
        } finally {
          setUploading(false)
        }
      }, 'image/png')
    } catch (err: unknown) {
      console.error(err)
      setPopupMessage(`Crop failed: ${getErrorMessage(err, 'Unable to crop this image')}`)
      setUploading(false)
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - cropOffset.x,
        y: e.touches[0].clientY - cropOffset.y
      })
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    setCropOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y })
  }

  const fetchStreaksData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_my_streaks')
      if (error) throw error
      setStreaks(data as StreakGroup[] || [])
    } catch (err: unknown) {
      console.error('Error fetching streaks:', getErrorMessage(err, 'Unable to fetch streaks'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    void supabase.rpc('get_my_streaks').then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        console.error('Error fetching streaks:', error.message)
        setLoading(false)
        return
      }
      setStreaks(data as StreakGroup[] || [])
      setLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const handleRestoreStreak = async () => {
    try {
      setRestoring(true)
      const { data, error } = await supabase.rpc('restore_streak_with_life' as never)
      if (error) throw error
      const res = data as RestoreStreakResponse
      if (res && res.success) {
        addToast({ message: `Streak revived to ${res.restored_streak} days. Remaining lives: ${res.new_lives}` })
        fetchStreaksData()
        if (user) {
          await useAuthStore.getState().fetchProfile(user.id)
        }
      } else {
        throw new Error(res?.error || 'Failed to restore streak')
      }
    } catch (err: unknown) {
      console.error(err)
      addToast({ message: getErrorMessage(err, 'Failed to restore streak') })
    } finally {
      setRestoring(false)
    }
  }

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return

    try {
      setCreating(true)
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

      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          user_id: user?.id || '',
          role: 'creator'
        })

      if (memberErr) throw memberErr

      addToast({ message: `The ${groupName} flame is lit. Keep it fed.` })
      setGroupName('')
      setGroupDesc('')
      setCrewAvatarUrl('')
      setGroupColor(presetColors[0])
      setIsCreateModalOpen(false)
      fetchStreaksData()
    } catch (err: unknown) {
      console.error('Error creating group:', getErrorMessage(err, 'Failed to create group'))
      addToast({ message: getErrorMessage(err, 'Failed to create group') })
    } finally {
      setCreating(false)
    }
  }

  const getFlameStyles = (streak: number) => {
    if (streak <= 2) return { tier: 'Cold coals', tone: 'text-[var(--sq-text-faint)]', fill: false }
    if (streak <= 6) return { tier: 'Kindling', tone: 'text-[var(--sq-ember-300)]', fill: true }
    if (streak <= 13) return { tier: 'Steady burn', tone: 'text-[var(--sq-ember-400)]', fill: true }
    if (streak <= 29) return { tier: 'Roaring fire', tone: 'text-[var(--sq-ember-500)]', fill: true }
    if (streak <= 49) return { tier: 'Wildfire', tone: 'text-[var(--sq-gold-soft)]', fill: true }
    return { tier: 'Eternal flame', tone: 'text-[var(--sq-banner)]', fill: true }
  }

  const overallStreak = profile?.current_streak || 0
  const overallLongest = profile?.longest_streak || 0
  const profileExtras = profile as unknown as StreakProfileExtras | null
  const lives = profileExtras?.lives ?? 3
  const livesPercent = Math.round((lives / 3) * 100)

  return (
    <div className="min-h-[100dvh] bg-[var(--sq-bg)] pb-32 text-[var(--sq-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--sq-hairline)] bg-[var(--sq-overlay-heavy)] px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] shadow-[var(--sq-shadow-soft)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between">
          <Link to="/map" aria-label="Back to map" className="flex h-11 w-11 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] active:scale-95">
            <ChevronLeftIcon size={26} withShadow={false} />
          </Link>
          <div className="flex items-center gap-2">
            <StreakFlameIcon size={34} active withShadow={false} />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--sq-ember-300)]">Streaks hub</p>
              <h1 className="text-[22px] font-medium">Crew flame</h1>
            </div>
          </div>
          <button type="button" aria-label="Create crew" onClick={() => setIsCreateModalOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/35 bg-[var(--sq-ember-500)] shadow-[var(--sq-shadow-sticker)] active:scale-95">
            <PlusIcon size={24} active withShadow={false} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-4 pt-6">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-5 shadow-[var(--sq-shadow-soft)]">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)]/20" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--sq-r-lg)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)]">
                <HeartIcon size={32} active={lives > 0} withShadow={false} />
              </div>
              <div>
                <h2 className="text-[18px] font-medium">Hearth lives</h2>
                <p className="mt-1 text-[13px] text-[var(--sq-text-muted)]">{lives} of 3 hearts still glowing</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <HeartIcon key={i} size={24} active={i < lives} withShadow={false} />
              ))}
            </div>
          </div>
          <div className="relative mt-4 border-t border-[var(--sq-hairline)] pt-3">
            <div className="h-2.5 overflow-hidden rounded-[var(--sq-r-pill)] bg-[var(--sq-surface)]">
              <div className="h-full rounded-[var(--sq-r-pill)] bg-[var(--sq-heart)] transition-all duration-500" style={{ width: `${livesPercent}%` }} />
            </div>
            <p className="mt-3 text-[13px] leading-6 text-[var(--sq-text-muted)]">Skip a planned quest and a heart cools down. Show up with your crew to keep the fire alive.</p>
          </div>
        </motion.section>

        {profile && profile.current_streak === 0 && (profileExtras?.previous_streak ?? 0) > 0 && (profileExtras?.lives ?? 0) > 0 && (
          <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[var(--sq-r-xl)] border border-[var(--sq-heart)]/35 bg-[var(--sq-heart)]/10 p-5 text-center shadow-[var(--sq-shadow-soft)]">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)]">
              <HeartIcon size={36} active withShadow={false} />
            </div>
            <h3 className="text-[18px] font-medium text-[var(--sq-text)]">Your flame went out</h3>
            <p className="mt-2 text-[13px] leading-6 text-[var(--sq-text-muted)]">The embers of your {profileExtras?.previous_streak}-day flame are still warm. One life brings it back.</p>
            <button type="button" onClick={handleRestoreStreak} disabled={restoring} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--sq-r-pill)] bg-[var(--sq-heart)] px-4 py-3 text-[13px] font-medium text-[var(--sq-text)] transition-opacity disabled:opacity-50">
              {restoring ? <LoadingSpinner /> : (
                <>
                  <HeartIcon size={22} active withShadow={false} />
                  Rekindle with 1 life
                </>
              )}
            </button>
          </motion.section>
        )}

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative overflow-hidden rounded-[var(--sq-r-xl)] border border-[var(--sq-keyline)]/20 bg-[radial-gradient(circle_at_78%_12%,var(--sq-gold-soft)_0,transparent_28%),linear-gradient(135deg,var(--sq-ember-600),var(--sq-card)_58%,var(--sq-surface))] p-6 shadow-[var(--sq-shadow-glow)]">
          <div className="absolute right-4 top-4 opacity-70">
            <StreakFlameIcon size={76} active withShadow />
          </div>
          <p className="relative inline-flex rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-bg)]/35 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-banner)]">Your flame has burned for</p>
          <div className="relative mt-4 flex items-baseline gap-2">
            <span className="text-[64px] font-bold leading-none text-[var(--sq-text)]">{overallStreak}</span>
            <span className="text-[22px] font-medium text-[var(--sq-banner)]">days</span>
          </div>
          <div className="relative mt-6 flex items-end justify-between border-t border-[var(--sq-keyline)]/15 pt-4">
            <div>
              <p className="text-[13px] text-[var(--sq-text-muted)]">Brightest blaze</p>
              <p className="mt-1 text-[18px] font-medium text-[var(--sq-text)]">{overallLongest} days</p>
            </div>
            {overallStreak >= 5 && <span className="rounded-[var(--sq-r-pill)] bg-[var(--sq-sage-600)] px-3 py-1 text-[11px] font-medium text-[var(--sq-sage-100)]">Blazing</span>}
          </div>
        </motion.section>

        <div className="flex items-center justify-between pt-1">
          <h2 className="flex items-center gap-2 text-[18px] font-medium">
            <FriendsIcon size={26} active withShadow={false} />
            Crew flames
          </h2>
          <span className="rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline)] bg-[var(--sq-surface)] px-3 py-1 text-[11px] font-medium text-[var(--sq-text-muted)]">{streaks.length} {streaks.length === 1 ? 'crew' : 'crews'}</span>
        </div>

        {loading ? (
          <div className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] py-12">
            <LoadingSpinner label="Stoking the coals..." />
          </div>
        ) : streaks.length === 0 ? (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[var(--sq-r-xl)] border border-dashed border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-8 text-center shadow-[var(--sq-shadow-soft)]">
            <CrewIcon size={58} active withShadow />
            <p className="mt-4 text-[13px] font-medium leading-6 text-[var(--sq-text-muted)]">No crew, no fire. Light one with your people and every quest you finish together feeds the same shared flame.</p>
            <button type="button" onClick={() => setIsCreateModalOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)] px-5 py-3 text-[13px] font-medium text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] active:scale-95">
              <PlusIcon size={20} active withShadow={false} />
              Light a crew flame
            </button>
          </motion.section>
        ) : (
          <div className="space-y-4">
            {streaks.map((crew, idx) => {
              const flame = getFlameStyles(crew.current_streak)
              const percent = Math.min(100, Math.round((crew.current_streak / crew.next_milestone) * 100))
              const lastQuestDate = crew.last_quest_at ? new Date(crew.last_quest_at).toLocaleDateString() : 'Never'

              return (
                <motion.article key={crew.group_id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="relative overflow-hidden rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-5 shadow-[var(--sq-shadow-soft)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--sq-r-lg)] border border-[var(--sq-keyline)]/25 text-[18px] font-medium text-[var(--sq-text)]" style={{ backgroundColor: crew.group_color }}>
                        {crew.group_avatar ? <img src={crew.group_avatar} alt="" className="h-full w-full object-cover" /> : crew.group_name[0]?.toUpperCase()}
                        {crew.streak_frozen && <span className="absolute -right-1 -top-1 rounded-[var(--sq-r-pill)] bg-[var(--sq-sage-600)] px-1.5 py-0.5 text-[9px] text-[var(--sq-sage-100)]">Safe</span>}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[18px] font-medium text-[var(--sq-text)]">{crew.group_name}</h3>
                        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--sq-text-faint)]">
                          <FriendsIcon size={16} withShadow={false} />
                          {crew.member_count} {crew.member_count === 1 ? 'keeper' : 'keepers'} - last fed {lastQuestDate}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="inline-flex items-center gap-1 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 bg-[var(--sq-surface)] px-3 py-1.5">
                        <StreakFlameIcon size={20} active={flame.fill} withShadow={false} />
                        <span className={`text-[14px] font-medium ${flame.tone}`}>{crew.current_streak}</span>
                      </div>
                      <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--sq-text-faint)]">{flame.tier}</p>
                    </div>
                  </div>

                  {crew.is_at_risk && (
                    <div className="mt-4 rounded-[var(--sq-r-lg)] border border-[var(--sq-heart)]/35 bg-[var(--sq-heart)]/10 p-3 text-[13px] text-[var(--sq-text-muted)]">
                      <div className="flex items-center gap-2 font-medium text-[var(--sq-heart)]">
                        <HeartIcon size={18} active withShadow={false} />
                        The flame is flickering
                      </div>
                      <p className="mt-1 pl-7 text-[12px]">{crew.days_until_break} {crew.days_until_break === 1 ? 'day' : 'days'} to feed the fire before it costs a life.</p>
                    </div>
                  )}

                  <div className="mt-4 border-t border-[var(--sq-hairline)] pt-3">
                    <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-[var(--sq-text-faint)]">
                      <span>Next blaze at {crew.next_milestone} days</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-[var(--sq-r-pill)] bg-[var(--sq-surface)]">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-[var(--sq-r-pill)] bg-gradient-to-r from-[var(--sq-ember-500)] to-[var(--sq-gold-soft)]" />
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        )}
      </main>

      <AnimatePresence>
        {isCreateModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="fixed inset-0 z-50 bg-[rgba(30,20,14,0.65)] backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 350, damping: 25 }} className="fixed inset-x-4 bottom-8 z-50 max-w-md rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-6 shadow-[var(--sq-shadow-soft)] sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-ember-300)]">New crew</p>
                  <h2 className="mt-1 flex items-center gap-2 text-[22px] font-medium">
                    <StreakFlameIcon size={30} active withShadow={false} />
                    Light a crew flame
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-[var(--sq-text-muted)]">Gather your people. Every quest you finish together feeds one shared flame.</p>
                </div>
                <button type="button" aria-label="Close create crew dialog" onClick={() => setIsCreateModalOpen(false)} className="rounded-[var(--sq-r-pill)] bg-[var(--sq-surface)] p-2">
                  <CloseIcon size={22} withShadow={false} />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="flex flex-col items-center gap-2.5">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="relative flex h-24 w-24 flex-col items-center justify-center overflow-hidden rounded-[var(--sq-r-pill)] border-4 border-dashed border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] text-center transition-colors hover:bg-[var(--sq-card-hover)]" style={crewAvatarUrl ? { borderStyle: 'solid', borderColor: groupColor } : {}}>
                    {crewAvatarUrl ? (
                      <img src={crewAvatarUrl} alt="Group icon preview" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UploadIcon size={28} active withShadow={false} />
                        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--sq-text-faint)]">Crew crest</span>
                      </>
                    )}
                    {uploading && <div className="absolute inset-0 flex items-center justify-center bg-[var(--sq-bg)]/70"><LoadingSpinner /></div>}
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[13px] font-medium text-[var(--sq-ember-300)] active:scale-95">{crewAvatarUrl ? 'Change photo' : 'Choose a crew crest'}</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-text-faint)]">Crew name</label>
                  <input type="text" required value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="The taco Tuesday alliance" className="w-full rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] px-4 py-3 text-[var(--sq-text)] placeholder:text-[var(--sq-text-faint)] focus:border-[var(--sq-ember-400)] focus:outline-none focus:ring-1 focus:ring-[var(--sq-ember-400)]" />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-text-faint)]">Crew vibe</label>
                  <textarea value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Food spots, night hikes, arcade raids..." rows={2} className="w-full resize-none rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] px-4 py-3 text-[var(--sq-text)] placeholder:text-[var(--sq-text-faint)] focus:border-[var(--sq-ember-400)] focus:outline-none focus:ring-1 focus:ring-[var(--sq-ember-400)]" />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-text-faint)]">Crew color</label>
                  <div className="flex items-center gap-2.5">
                    {presetColors.map((color) => (
                      <button key={color} type="button" aria-label="Choose crew color" onClick={() => setGroupColor(color)} className={`h-8 w-8 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20 transition-transform active:scale-90 ${groupColor === color ? 'ring-4 ring-[var(--sq-ember-300)] ring-offset-2 ring-offset-[var(--sq-card)]' : ''}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="w-1/2 rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] py-3 text-[13px] font-medium text-[var(--sq-text-muted)] active:scale-95">Cancel</button>
                  <button type="submit" disabled={creating} className="flex w-1/2 items-center justify-center gap-2 rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)] py-3 text-[13px] font-medium text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] active:scale-95 disabled:opacity-50">
                    {creating ? <LoadingSpinner /> : (
                      <>
                        <StreakFlameIcon size={20} active withShadow={false} />
                        Light flame
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {popupMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,20,14,0.65)] px-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="flex w-full max-w-sm flex-col gap-4 rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-6 text-center shadow-[var(--sq-shadow-soft)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--sq-r-pill)] bg-[var(--sq-heart)]/10 text-[var(--sq-heart)]">
                <HeartIcon size={30} active withShadow={false} />
              </div>
              <div>
                <h3 className="text-[18px] font-medium text-[var(--sq-text)]">Notice</h3>
                <p className="mt-2 text-[13px] leading-6 text-[var(--sq-text-muted)]">{popupMessage}</p>
              </div>
              <button type="button" onClick={() => setPopupMessage(null)} className="w-full rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)] p-3.5 text-[13px] font-medium text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] active:scale-95">Got it</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropImage && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-[150] flex select-none flex-col justify-between bg-[var(--sq-bg)] text-[var(--sq-text)]">
            <div className="flex w-full items-center justify-between border-b border-[var(--sq-hairline)] bg-[var(--sq-overlay-heavy)] px-6 py-5 backdrop-blur-md">
              <button type="button" onClick={() => setCropImage(null)} className="flex items-center gap-1 text-[13px] font-medium text-[var(--sq-text-muted)] active:scale-95">
                <ChevronLeftIcon size={22} withShadow={false} />
                Back
              </button>
              <h3 className="flex items-center gap-2 text-center text-[18px] font-medium">
                <ScissorsIcon size={24} active withShadow={false} />
                Edit crew icon
              </h3>
              <div className="w-12" />
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-2 sm:p-6">
              <div className="relative flex h-64 w-64 cursor-move select-none items-center justify-center overflow-hidden rounded-[var(--sq-r-pill)] border-4 border-[var(--sq-ember-500)] bg-[var(--sq-surface)] shadow-[var(--sq-shadow-glow)]" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleMouseUp}>
                <img src={cropImage} alt="Crop preview" style={{ transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`, transformOrigin: 'center center' }} className="pointer-events-none absolute h-full w-full select-none object-contain" />
                <div className="pointer-events-none absolute inset-0 rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/20" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[var(--sq-keyline)]/10" />
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[var(--sq-keyline)]/10" />
              </div>
              <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-text-faint)]">Drag to reposition</p>
            </div>

            <div className="mx-auto flex w-full max-w-md shrink-0 flex-col gap-4 px-6 pb-6">
              <div className="rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] p-4">
                <div className="flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sq-text-faint)]">
                  <span>Zoom level</span>
                  <span>{Math.round(cropZoom * 100)}%</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ZoomOutIcon size={22} withShadow={false} />
                  <input type="range" min="1.0" max="3.0" step="0.05" value={cropZoom} onChange={(e) => setCropZoom(parseFloat(e.target.value))} className="h-1.5 flex-1 cursor-pointer appearance-none rounded-[var(--sq-r-pill)] bg-[var(--sq-surface)] accent-[var(--sq-ember-500)] focus:outline-none" />
                  <ZoomInIcon size={22} withShadow={false} />
                </div>
              </div>

              <div className="flex w-full gap-4">
                <button type="button" onClick={() => setCropImage(null)} className="flex-1 rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] py-4 text-center text-[13px] font-medium text-[var(--sq-text-muted)]">Cancel</button>
                <button type="button" onClick={handlePerformCrop} className="flex flex-1 items-center justify-center gap-2 rounded-[var(--sq-r-pill)] bg-[var(--sq-ember-500)] py-4 text-center text-[13px] font-medium text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] active:scale-[0.98]">
                  <CheckIcon size={20} active withShadow={false} />
                  Save and continue
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
