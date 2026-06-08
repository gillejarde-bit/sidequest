import { useState, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSettingsStore } from '../stores/settingsStore'
import { useAuthStore } from '../stores/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { getAvatarUrl } from '../lib/avatar'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  SettingsIcon, 
  StreakFlameIcon,
  SunIcon,
  MoonIcon,
  MapIcon,
  CalendarIcon,
  BellIcon,
  ShieldIcon,
  VolumeIcon,
  LogOutIcon
} from '../components/icons'

export function SettingsPage() {
  const { 
    theme, 
    setTheme,
    shareLocation, 
    setShareLocation, 
    locationSharingScope, 
    setLocationSharingScope 
  } = useSettingsStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()

  // Local notification toggle states
  const [pushEnabled, setPushEnabled] = useState(true)
  const [questInvitesEnabled, setQuestInvitesEnabled] = useState(true)
  const [soundsEnabled, setSoundsEnabled] = useState(false)

  // Calendar visibility local state
  const [calendarVis, setCalendarVis] = useState((profile as any)?.calendar_visibility || 'friends')
  const [savingCal, setSavingCal] = useState(false)
  const [savingLoc, setSavingLoc] = useState(false)

  // Synchronize database location preferences to Zustand store on load
  useEffect(() => {
    if (profile) {
      if ((profile as any).share_location !== undefined && (profile as any).share_location !== null) {
        setShareLocation((profile as any).share_location)
      }
      if ((profile as any).location_sharing_scope) {
        setLocationSharingScope((profile as any).location_sharing_scope as any)
      }
    }
  }, [profile])

  const handleLocationSharingToggle = async () => {
    const newVal = !shareLocation
    setShareLocation(newVal)
    if (!user) return
    setSavingLoc(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ share_location: newVal } as any)
        .eq('id', user.id)
      if (error) throw error
    } catch (err: any) {
      console.error('Error updating location sharing:', err.message)
    } finally {
      setSavingLoc(false)
    }
  }

  const handleLocationScopeChange = async (scope: 'friends' | 'crews' | 'nearby') => {
    setLocationSharingScope(scope)
    if (!user) return
    setSavingLoc(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ location_sharing_scope: scope } as any)
        .eq('id', user.id)
      if (error) throw error
    } catch (err: any) {
      console.error('Error updating location scope:', err.message)
    } finally {
      setSavingLoc(false)
    }
  }

  const handleVisibilityChange = async (val: string) => {
    if (!user) return
    setCalendarVis(val)
    setSavingCal(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ calendar_visibility: val } as any)
        .eq('id', user.id)
      if (error) throw error
    } catch (err: any) {
      console.error('Error updating calendar visibility:', err.message)
    } finally {
      setSavingCal(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

  return (
    <div data-theme="ember" className="min-h-[100dvh] bg-background text-foreground pb-24 w-full flex flex-col items-center">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--sq-bg)] border-b border-[var(--sq-hairline-strong)] w-full flex justify-center">
        <div className="max-w-2xl w-full px-4 h-16 flex items-center justify-between">
          <Link 
            to="/map"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline)] text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeftIcon size={20} withShadow={false} />
          </Link>
          <div className="flex items-center gap-2">
            <SettingsIcon size={24} active={true} withShadow={false} />
            <h1 className="text-xl font-black tracking-tight text-[var(--sq-text)]">Settings</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Settings Options */}
      <main className="max-w-2xl w-full mx-auto p-4 pt-6 pb-32 space-y-8">
        
        {/* Profile Card / Link */}
        {user && profile && (
          <Link
            to="/profile/$id"
            params={{ id: user.id }}
            className="block bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 shadow-[var(--sq-shadow-soft)] hover:bg-[var(--sq-card-hover)] hover:shadow-md transition-all active:scale-[0.99] relative sq-wobbly-md cursor-pointer"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  <img 
                    src={getAvatarUrl(profile.avatar_url, profile.username)} 
                    alt={profile.display_name || ''} 
                    className="w-16 h-16 rounded-[var(--sq-r-md)] object-cover border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]"
                  />
                ) : (
                  <div 
                    className="w-16 h-16 rounded-[var(--sq-r-md)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] flex items-center justify-center font-black text-xl text-white"
                    style={{ backgroundColor: profile.profile_color || '#6C63FF' }}
                  >
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
                
                <div className="text-left">
                  <h3 className="font-black text-lg text-[var(--sq-text)] leading-tight">
                    {profile.display_name || profile.username}
                  </h3>
                  <p className="text-xs text-[var(--sq-text-muted)] font-black uppercase tracking-wider mt-1.5">
                    Level {profile.level || 1} • @{profile.username}
                  </p>
                </div>
              </div>

              <ChevronRightIcon size={20} withShadow={false} className="opacity-60" />
            </div>
          </Link>
        )}

        {/* Preferences / Toggles */}
        <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 shadow-[var(--sq-shadow-soft)] relative sq-wobbly-md space-y-6">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
          
          <h4 className="text-xs font-black text-[var(--sq-text-muted)] uppercase tracking-wider relative z-10 px-1">Appearance & Map</h4>
          
          {/* Theme Selection */}
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center">
                {theme === 'ember' ? (
                  <StreakFlameIcon size={26} active={true} withShadow={false} />
                ) : theme === 'dark' ? (
                  <MoonIcon size={26} active={true} withShadow={false} />
                ) : (
                  <SunIcon size={26} active={true} withShadow={false} />
                )}
              </div>
              <div className="text-left">
                <h3 className="font-black text-[var(--sq-text)] text-sm">Theme Selection</h3>
                <p className="text-xs text-[var(--sq-text-muted)] font-bold mt-0.5">Pick your chronicle layout style</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-2xl">
              {[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'Ember', value: 'ember' }
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value as any)}
                  className={`py-2.5 px-3 text-xs font-black rounded-xl capitalize transition-all cursor-pointer ${
                    theme === t.value
                      ? t.value === 'ember'
                        ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]'
                        : t.value === 'dark'
                        ? 'bg-[var(--sq-secondary)] text-white border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]'
                        : 'bg-[var(--sq-accent)] text-white border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]'
                      : 'text-[var(--sq-text-muted)] hover:bg-[var(--sq-card-hover)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Share location Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--sq-hairline-strong)]/30 relative z-10">
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center">
                <MapIcon size={26} active={shareLocation} withShadow={false} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-[var(--sq-text)] text-sm">Location sharing</h3>
                <p className="text-xs text-[var(--sq-text-muted)] font-bold mt-0.5">Ghost mode turns off visibility</p>
              </div>
            </div>
            
            <button 
              onClick={handleLocationSharingToggle}
              className={`w-14 h-8 rounded-full p-1 border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] transition-colors duration-200 ease-in-out cursor-pointer ${shareLocation ? 'bg-[var(--sq-sage-500)]' : 'bg-[var(--sq-surface)]'}`}
            >
              <motion.div 
                layout
                className="w-5 h-5 bg-white rounded-full border border-[var(--sq-keyline)]"
                animate={{ x: shareLocation ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Location Sharing Sub-Setting Scope */}
          <AnimatePresence>
             {shareLocation && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 transition={{ duration: 0.25 }}
                 className="pt-4 border-t border-[var(--sq-hairline-strong)]/30 space-y-3 overflow-hidden relative z-10"
               >
                 <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider">Share Location With</span>
                 </div>
                 <div className="grid grid-cols-3 gap-2 p-1.5 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-2xl">
                   {[
                     { label: 'Friends', value: 'friends' },
                     { label: 'Crews', value: 'crews' },
                     { label: 'Nearby', value: 'nearby' }
                   ].map((scope) => (
                     <button
                       key={scope.value}
                       type="button"
                       disabled={savingLoc}
                       onClick={() => handleLocationScopeChange(scope.value as any)}
                       className={`py-2 px-3 text-xs font-black rounded-xl capitalize transition-all cursor-pointer ${
                         locationSharingScope === scope.value
                           ? 'bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]'
                           : 'text-[var(--sq-text-muted)] hover:bg-[var(--sq-card-hover)]'
                       }`}
                     >
                       {scope.label}
                     </button>
                   ))}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

          {/* Calendar Visibility */}
          <div className="pt-4 border-t border-[var(--sq-hairline-strong)]/30 relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="shrink-0 flex items-center justify-center">
                <CalendarIcon size={26} active={calendarVis !== 'private'} withShadow={false} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-[var(--sq-text)] text-sm">Calendar Visibility</h3>
                <p className="text-xs text-[var(--sq-text-muted)] font-bold mt-0.5">Control who can view your planner</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-2xl">
              {['private', 'friends', 'public'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={savingCal}
                  onClick={() => handleVisibilityChange(mode)}
                  className={`py-2.5 px-3 text-xs font-black rounded-xl capitalize transition-all cursor-pointer ${
                    calendarVis === mode
                      ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]'
                      : 'text-[var(--sq-text-muted)] hover:bg-[var(--sq-card-hover)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 shadow-[var(--sq-shadow-soft)] relative sq-wobbly-md space-y-6">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
          
          <h4 className="text-xs font-black text-[var(--sq-text-muted)] uppercase tracking-wider relative z-10 px-1">Alerts & Notifications</h4>

          {/* Push Notifications Toggle */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center">
                <BellIcon size={26} active={pushEnabled} withShadow={false} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-[var(--sq-text)] text-sm">Push Alerts</h3>
                <p className="text-xs text-[var(--sq-text-muted)] font-bold mt-0.5">Get instant quest invites</p>
              </div>
            </div>
            
            <button 
              onClick={() => setPushEnabled(!pushEnabled)}
              className={`w-14 h-8 rounded-full p-1 border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] transition-colors duration-200 ease-in-out cursor-pointer ${pushEnabled ? 'bg-[var(--sq-ember-500)]' : 'bg-[var(--sq-surface)]'}`}
            >
              <motion.div 
                layout
                className="w-5 h-5 bg-white rounded-full border border-[var(--sq-keyline)]"
                animate={{ x: pushEnabled ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Quest Invites Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--sq-hairline-strong)]/30 relative z-10">
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center">
                <ShieldIcon size={26} active={questInvitesEnabled} withShadow={false} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-[var(--sq-text)] text-sm">Auto Accept Invites</h3>
                <p className="text-xs text-[var(--sq-text-muted)] font-bold mt-0.5">Only for approved Crews</p>
              </div>
            </div>
            
            <button 
              onClick={() => setQuestInvitesEnabled(!questInvitesEnabled)}
              className={`w-14 h-8 rounded-full p-1 border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] transition-colors duration-200 ease-in-out cursor-pointer ${questInvitesEnabled ? 'bg-[var(--sq-ember-500)]' : 'bg-[var(--sq-surface)]'}`}
            >
              <motion.div 
                layout
                className="w-5 h-5 bg-white rounded-full border border-[var(--sq-keyline)]"
                animate={{ x: questInvitesEnabled ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--sq-hairline-strong)]/30 relative z-10">
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center">
                <VolumeIcon size={26} active={soundsEnabled} withShadow={false} />
              </div>
               <div className="text-left">
                 <h3 className="font-black text-[var(--sq-text)] text-sm">Haptic Sound Effects</h3>
                 <p className="text-xs text-[var(--sq-text-muted)] font-bold mt-0.5">Play sounds on XP gains</p>
               </div>
            </div>
            
            <button 
              onClick={() => setSoundsEnabled(!soundsEnabled)}
              className={`w-14 h-8 rounded-full p-1 border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] transition-colors duration-200 ease-in-out cursor-pointer ${soundsEnabled ? 'bg-[var(--sq-ember-500)]' : 'bg-[var(--sq-surface)]'}`}
            >
              <motion.div 
                layout
                className="w-5 h-5 bg-white rounded-full border border-[var(--sq-keyline)]"
                animate={{ x: soundsEnabled ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Sign Out Card */}
        <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 shadow-[var(--sq-shadow-soft)] relative sq-wobbly-md">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
          <button
            onClick={handleSignOut}
            className="w-full py-4 bg-[var(--sq-accent)] hover:bg-[var(--sq-heart)] active:scale-95 text-white border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-black rounded-[var(--sq-r-md)] transition-all flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <LogOutIcon size={22} withShadow={false} />
            <span>Sign Out of Account</span>
          </button>
        </div>

        {/* App Version Info Footer */}
        <div className="text-center text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-widest pt-4 relative z-10">
          <p>Version 2.4.0 (Spring Season)</p>
          <p className="mt-1 opacity-70">Built with ❤️ by Team SideQuest</p>
        </div>

      </main>
    </div>
  )
}
