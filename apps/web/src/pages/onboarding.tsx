import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, User as UserIcon, ChevronRight, ChevronLeft, Upload, Check, AlertTriangle } from 'lucide-react'

// Fun emoji fallbacks for profile pictures
const fallbacks = ['🦊', '🐱', '🐼', '🦁', '🐸', '🐨', '🦖', '🦄', '🧙‍♂️', '🥷', '🧑‍🚀', '👾']

export function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, fetchProfile } = useAuthStore()
  
  const defaultUser = profile?.username?.startsWith('user_') ? '' : profile?.username
  const [step, setStep] = useState<1 | 2 | 3>(1)

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
  const [avatarType, setAvatarType] = useState<'upload' | 'fallback'>('fallback')
  const [selectedFallback, setSelectedFallback] = useState('🦊')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Upload Custom Avatar to Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return
    const file = e.target.files[0]
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setAvatarUrl(data.publicUrl)
      setAvatarType('upload')
    } catch (err) {
      console.error('Error uploading avatar:', err)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
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
    const finalAvatar = avatarType === 'fallback' ? `fallback:${selectedFallback}` : avatarUrl

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
        avatar_url: finalAvatar,
        updated_at: new Date().toISOString()
      } as any)

    if (!error) {
      await fetchProfile(user.id)
      navigate({ to: '/' })
    } else {
      console.error('Profile update error:', error)
      alert('Failed to save profile. Make sure your username is unique!')
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
                    <span>{selectedFallback}</span>
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
                    onChange={handleAvatarUpload}
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
                        className={`text-2xl p-1 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 active:scale-90 transition-all ${
                          selectedFallback === f ? 'bg-white dark:bg-gray-800 shadow-sm border border-primary/20 scale-110' : ''
                        }`}
                      >
                        {f}
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
    </div>
  )
}
