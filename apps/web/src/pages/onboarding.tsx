import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, User as UserIcon, ChevronRight, ChevronLeft, Upload, Check, AlertTriangle, ZoomIn, ZoomOut, Scissors } from 'lucide-react'
import { getAvatarUrl } from '../lib/avatar'

// Fun emoji fallbacks for profile pictures
const fallbacks = ['🦊', '🐱', '🐼', '🦁', '🐸', '🐨', '🦖', '🦄', '🧙‍♂️', '🥷', '🧑‍🚀', '👾']

export function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, fetchProfile } = useAuthStore()
  
  console.log("SideQuest Onboarding loaded: Dedicated Cropper Page Active")
  
  const defaultUser = profile?.username?.startsWith('user_') ? '' : profile?.username
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [popupMessage, setPopupMessage] = useState<string | null>(null)

  // Step 1: Account Details
  const [username, setUsername] = useState(defaultUser || '')
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')

  // Step 2: Inclusive Identity & Age
  const [birthdate, setBirthdate] = useState('')
  const [genderSelect, setGenderSelect] = useState<'Female' | 'Male' | 'Non-Binary' | 'Prefer not to say' | 'Custom'>('Prefer not to say')
  const [genderCustom, setGenderCustom] = useState('')
  const [pronounsSelect, setPronounsSelect] = useState<'he/him' | 'she/her' | 'they/them' | 'Custom'>('they/them')
  const [pronounsCustom, setPronounsCustom] = useState('')

  // Step 3: Avatar Setup & Geolocation
  const initialAvatarType = profile?.avatar_url && !profile.avatar_url.startsWith('fallback:') ? 'upload' : 'fallback'
  const [avatarType, setAvatarType] = useState<'upload' | 'fallback'>(initialAvatarType)
  const [selectedFallback, setSelectedFallback] = useState('🦊')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cropper states
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [cropZoom, setCropZoom] = useState(1.0)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const [locationState, setLocationState] = useState<'idle' | 'prompting' | 'granted' | 'blocked'>('idle')
  const [loading, setLoading] = useState(false)

  // Calculations for Age Validation
  const calculateAge = (dobString: string) => {
    if (!dobString) return 0
    const today = new Date()
    const birthDate = new Date(dobString)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(birthdate)
  const isUnder13 = birthdate !== '' && age < 13
  const isTeen = birthdate !== '' && age >= 13 && age < 18

  // File selection triggers cropper instead of direct uploading
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log("handleFileChange event triggered!", e.target.files)
      if (!e.target.files || e.target.files.length === 0) {
        console.warn("No files selected or empty change event.")
        return
      }
      const file = e.target.files[0]
      console.log("Selected file info:", { name: file.name, size: file.size, type: file.type })
      
      const reader = new FileReader()
      reader.onload = () => {
        try {
          console.log("FileReader loaded! Setting cropImage data URL state.")
          setCropImage(reader.result as string)
          setCropZoom(1.0)
          setCropOffset({ x: 0, y: 0 })
        } catch (innerErr: any) {
          console.error("FileReader onload inner error:", innerErr)
          setPopupMessage(`File reader onload error: ${innerErr.message || innerErr.toString()}`)
        }
      }
      reader.onerror = (err) => {
        console.error("FileReader error event:", err)
        setPopupMessage(`FileReader failed to read image: ${err.toString()}`)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      console.error("Error in handleFileChange:", err)
      setPopupMessage(`File change error: ${err.message || err.toString()}`)
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
      
      // Set handlers BEFORE src to prevent race conditions on fast cached assets
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

      const previewSize = 288 // 288 matches w-72 (72 * 4 = 288px)
      const ratio = targetSize / previewSize

      ctx.save()
      ctx.translate(targetSize / 2, targetSize / 2)
      ctx.translate(cropOffset.x * ratio, cropOffset.y * ratio)
      ctx.scale(cropZoom, cropZoom)

      const imgRatio = img.naturalWidth / img.naturalHeight
      let drawW = previewSize
      let drawH = previewSize

      if (imgRatio > 1) {
        // Landscape aspect ratio contain
        drawW = previewSize
        drawH = previewSize / imgRatio
      } else {
        // Portrait aspect ratio contain
        drawH = previewSize
        drawW = previewSize * imgRatio
      }

      const finalW = drawW * ratio
      const finalH = drawH * ratio

      ctx.drawImage(img, -finalW / 2, -finalH / 2, finalW, finalH)
      ctx.restore()

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setPopupMessage('Failed to crop image (Blob creation failed).')
          setUploading(false)
          return
        }

        try {
          const fileName = `${user.id}/avatar-${Date.now()}.png`
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, blob, { 
              contentType: 'image/png',
              upsert: true 
            })

          if (uploadError) throw uploadError

          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
          setAvatarUrl(data.publicUrl)
          setAvatarType('upload')
        } catch (err: any) {
          console.error(err)
          setPopupMessage(`Upload error: ${err.message || err.toString()}`)
        } finally {
          setUploading(false)
        }
      }, 'image/png')

    } catch (err: any) {
      console.error('Error cropping image:', err)
      setPopupMessage(`Failed to process image: ${err.message || err.toString()}`)
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

  // Geolocation Request Portal
  const requestLocation = () => {
    setLocationState('prompting')
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationState('granted')
      },
      (error) => {
        console.error("Location access error:", error)
        setLocationState('blocked')
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isUnder13 || locationState !== 'granted') return
    setLoading(true)
    
    const finalGender = genderSelect === 'Custom' ? genderCustom : genderSelect
    const finalPronouns = pronounsSelect === 'Custom' ? pronounsCustom : pronounsSelect
    const finalAvatar = avatarType === 'fallback' ? getAvatarUrl(`fallback:${selectedFallback}`) : avatarUrl

    // Upsert into profiles (id is required, no updated_at column exists in profiles schema)
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id,
        username, 
        display_name: displayName,
        bio,
        birthdate,
        gender: finalGender,
        pronouns: finalPronouns,
        avatar_url: finalAvatar
      } as any)

    if (!error) {
      await fetchProfile(user.id)
      navigate({ to: '/' })
    } else {
      console.error('Profile update error:', error)
      setPopupMessage('Failed to save profile. Make sure your username is unique!')
    }
    setLoading(false)
  }

  const isStep1Valid = username.trim().length >= 3 && displayName.trim().length >= 2
  const isStep2Valid = birthdate !== '' && !isUnder13 && (genderSelect !== 'Custom' || genderCustom.trim().length > 0) && (pronounsSelect !== 'Custom' || pronounsCustom.trim().length > 0)
  const isStep3Valid = locationState === 'granted'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background radial coordinates map overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#58cc0208_1px,transparent_1px)] dark:bg-[radial-gradient(#58cc0205_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-gray-950 p-8 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl shadow-black/5 dark:shadow-black/25 relative z-10"
      >
        {/* Horizontal step bar */}
        <div className="flex justify-between items-center mb-8 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-full border border-gray-100/50 dark:border-gray-800">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`flex-1 text-center py-2 text-xs font-black rounded-full transition-all ${
                step === s 
                  ? 'bg-primary text-white shadow-md' 
                  : step > s 
                  ? 'text-primary font-bold' 
                  : 'text-muted'
              }`}
            >
              Step {s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: ACCOUNT DETAILS */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5"
            >
              <div className="text-center">
                <h1 className="text-2xl font-black text-foreground tracking-tight">Create your Profile</h1>
                <p className="text-muted text-sm mt-1">How should your future crew find you?</p>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <div>
                  <label className="text-xs font-extrabold text-muted uppercase tracking-wider mb-1.5 block">Username</label>
                  <input 
                    type="text" 
                    placeholder="quest_seeker_99"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
                    required
                  />
                  <span className="text-[10px] text-muted mt-1 block">Only letters, numbers, and underscores.</span>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-muted uppercase tracking-wider mb-1.5 block">Display Name</label>
                  <input 
                    type="text" 
                    placeholder="Alex Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-muted uppercase tracking-wider mb-1.5 block">Bio (Optional)</label>
                  <textarea 
                    placeholder="Always hunting for the best coffee gem or outdoor trail in Vegas! 🌲☕"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground resize-none"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="w-full bg-[#58CC02] hover:bg-[#46A302] border-bottom-[4px] border-[#46A302] text-white font-extrabold p-4 rounded-2xl flex items-center justify-center gap-2 mt-4 shadow-md disabled:opacity-50"
              >
                Continue <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2: INCLUSIVE IDENTITY & AGE */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5"
            >
              <div className="text-center">
                <h1 className="text-2xl font-black text-foreground tracking-tight">Tell us about yourself</h1>
                <p className="text-muted text-sm mt-1">We are committed to building an inclusive space.</p>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                {/* Age DOB Input */}
                <div>
                  <label className="text-xs font-extrabold text-muted uppercase tracking-wider mb-1.5 block">Date of Birth</label>
                  <input 
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
                    required
                  />
                  
                  {/* Under 13 Blocking Notice */}
                  {isUnder13 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3.5 text-xs font-bold mt-2 flex gap-2 items-center"
                    >
                      <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                      <span>You must be 13 or older to register on Sidequest.</span>
                    </motion.div>
                  )}

                  {/* Teen Safety advisory notice */}
                  {isTeen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded-xl p-3.5 text-xs font-bold mt-2 flex gap-2 items-start"
                    >
                      <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                      <span><strong>Quest Safely:</strong> Since you are under 18, remember to coordinate quests in public places and let a parent/guardian know where you're heading!</span>
                    </motion.div>
                  )}
                </div>

                {/* Pronouns Choice */}
                <div>
                  <label className="text-xs font-extrabold text-muted uppercase tracking-wider mb-2 block">Pronouns</label>
                  <div className="flex flex-wrap gap-2">
                    {(['he/him', 'she/her', 'they/them', 'Custom'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPronounsSelect(opt)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          pronounsSelect === opt 
                            ? 'bg-primary/10 text-primary border-primary' 
                            : 'bg-transparent text-foreground border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {pronounsSelect === 'Custom' && (
                    <motion.input
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      type="text"
                      placeholder="Enter your pronouns (e.g. ze/zir)"
                      value={pronounsCustom}
                      onChange={(e) => setPronounsCustom(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground mt-2"
                      required
                    />
                  )}
                </div>

                {/* Gender Choice */}
                <div>
                  <label className="text-xs font-extrabold text-muted uppercase tracking-wider mb-2 block">Gender</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Female', 'Male', 'Non-Binary', 'Prefer not to say', 'Custom'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setGenderSelect(opt)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          genderSelect === opt 
                            ? 'bg-primary/10 text-primary border-primary' 
                            : 'bg-transparent text-foreground border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {genderSelect === 'Custom' && (
                    <motion.input
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      type="text"
                      placeholder="How do you identify? (e.g. Genderfluid)"
                      value={genderCustom}
                      onChange={(e) => setGenderCustom(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground mt-2"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 dark:border-gray-800 font-extrabold p-4 rounded-2xl text-foreground flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid}
                  className="flex-1 bg-[#58CC02] hover:bg-[#46A302] border-bottom-[4px] border-[#46A302] text-white font-extrabold p-4 rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  Next <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: AVATAR SETUP & GEOLOCATION */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5"
            >
              <div className="text-center">
                <h1 className="text-2xl font-black text-foreground tracking-tight">Finishing Touches</h1>
                <p className="text-muted text-sm mt-1">Upload a photo and authorize GPS tracking.</p>
              </div>

              <div className="flex flex-col items-center gap-4 mt-2">
                {/* Profile Picture Display Container */}
                <div className="relative w-24 h-24 rounded-full border-4 border-primary/20 bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-4xl shadow-inner overflow-hidden">
                  {avatarType === 'fallback' ? (
                    <img src={getAvatarUrl(`fallback:${selectedFallback}`)} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-muted" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                      Uploading...
                    </div>
                  )}
                </div>

                {/* Avatar Type Selector pills */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAvatarType('fallback')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                      avatarType === 'fallback' ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    Select Icon
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                      avatarType === 'upload' ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Photo
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                </div>

                {/* Fallback picker panel */}
                {avatarType === 'fallback' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-900 w-full"
                  >
                    {fallbacks.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setSelectedFallback(f)}
                        className={`p-2 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 active:scale-90 transition-all flex items-center justify-center border ${
                          selectedFallback === f 
                            ? 'bg-white dark:bg-gray-800 shadow-md border-primary scale-110' 
                            : 'bg-transparent border-transparent'
                        }`}
                      >
                        <img src={getAvatarUrl(`fallback:${f}`)} alt={f} className="w-10 h-10 object-contain" />
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Pulsating Location services check block */}
                <div className="w-full border-t border-gray-100 dark:border-gray-900 pt-4 mt-2">
                  <label className="text-xs font-extrabold text-muted uppercase tracking-wider mb-2.5 block text-center">Location Services</label>
                  
                  {locationState === 'idle' && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={requestLocation}
                      animate={{ boxShadow: ["0 0 0 0 rgba(88,204,2,0.4)", "0 0 0 10px rgba(88,204,2,0)", "0 0 0 0 rgba(88,204,2,0.4)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-full bg-primary hover:bg-[#46A302] border-bottom-[4px] border-[#46A302] text-white font-extrabold p-4 rounded-2xl flex items-center justify-center gap-2 shadow-md"
                    >
                      <MapPin className="w-5 h-5" /> Enable Location Services
                    </motion.button>
                  )}

                  {locationState === 'prompting' && (
                    <div className="w-full bg-gray-100 dark:bg-gray-900 text-muted p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      Awaiting GPS Permission...
                    </div>
                  )}

                  {locationState === 'granted' && (
                    <motion.div 
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="w-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-500 p-4 rounded-2xl flex items-center justify-center gap-2 font-extrabold text-sm shadow-inner"
                    >
                      <Check className="w-5 h-5 text-green-500" /> Location Enabled! Ready to Map
                    </motion.div>
                  )}

                  {locationState === 'blocked' && (
                    <div className="flex flex-col gap-2">
                      <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                        ⚠️ Location Access Blocked
                      </div>
                      <p className="text-[10px] text-muted text-center leading-normal px-2">
                        Please reset the location permission block in your browser settings (click the lock icon in your address bar) and reload.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action layout button panel */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-200 dark:border-gray-800 font-extrabold p-4 rounded-2xl text-foreground flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !isStep3Valid}
                  className="flex-1 bg-[#58CC02] hover:bg-[#46A302] border-bottom-[4px] border-[#46A302] text-white font-extrabold p-4 rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Start Questing ✨'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
            className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0a0d18] text-white select-none animate-fade-in"
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
                <Scissors className="w-5 h-5 text-[#58CC02]" /> Edit Profile Photo
              </h3>
              <div className="w-12" /> {/* spacer for center alignment */}
            </div>

            {/* Main Crop Viewport Center Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
              <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-[#58CC02] shadow-[0_0_30px_rgba(88,204,2,0.2)] bg-gray-950 cursor-move flex items-center justify-center select-none relative"
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
