import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { 
  ChevronLeft, 
  Moon, 
  Sun, 
  Settings as SettingsIcon, 
  MapPin, 
  LogOut, 
  Bell, 
  Heart, 
  ChevronRight,
  Shield,
  Volume2
} from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useAuthStore } from '../stores/auth'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export function SettingsPage() {
  const { theme, toggleTheme, shareLocation, toggleShareLocation } = useSettingsStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()

  // Local notification toggle states
  const [pushEnabled, setPushEnabled] = useState(true)
  const [questInvitesEnabled, setQuestInvitesEnabled] = useState(true)
  const [soundsEnabled, setSoundsEnabled] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

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
            <SettingsIcon className="w-5 h-5 text-gray-900 dark:text-white" />
            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Settings</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Settings Options */}
      <main className="max-w-md mx-auto p-4 pt-6 pb-32 space-y-6">
        
        {/* Profile Card / Link */}
        {user && profile && (
          <Link
            to="/profile/$id"
            params={{ id: user.id }}
            className="block bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.display_name || ''} 
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white"
                    style={{ backgroundColor: profile.profile_color || '#6C63FF' }}
                  >
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
                
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white leading-tight">
                    {profile.display_name || profile.username}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">
                    Level {profile.level || 1} • {profile.username}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        )}

        {/* RPG Lives Status Tracking */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-500">
                <Heart className="w-5 h-5" fill="currentColor" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  RPG Lives Tracker
                  <span className="text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-650 px-2 py-0.5 rounded-md">
                    Full
                  </span>
                </h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">3 / 3 Hearts remaining</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-750 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full w-full" />
            </div>
            <p className="text-[10px] text-gray-400 font-semibold mt-2">
              Missing planned quests reduces your health. Recharge hearts by attending group events or verifying hidden gems!
            </p>
          </div>
        </div>

        {/* Preferences / Toggles */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 space-y-5">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Appearance & Map</h4>
          
          {/* Dark theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-100 text-orange-600'}`}>
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Light / Dark Theme</h3>
                <p className="text-xs text-gray-400 font-bold">Flip the world style</p>
              </div>
            </div>
            
            <button 
              onClick={toggleTheme}
              className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <motion.div 
                layout
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: theme === 'dark' ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Share location Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Location sharing</h3>
                <p className="text-xs text-gray-400 font-bold">Ghost mode turns off visibility</p>
              </div>
            </div>
            
            <button 
              onClick={toggleShareLocation}
              className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${shareLocation ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <motion.div 
                layout
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: shareLocation ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 space-y-5">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Alerts & Notifications</h4>

          {/* Push Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Push Alerts</h3>
                <p className="text-xs text-gray-400 font-bold">Get instant quest invites</p>
              </div>
            </div>
            
            <button 
              onClick={() => setPushEnabled(!pushEnabled)}
              className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${pushEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <motion.div 
                layout
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: pushEnabled ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Quest Invites Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Auto Accept Invites</h3>
                <p className="text-xs text-gray-400 font-bold">Only for approved Crews</p>
              </div>
            </div>
            
            <button 
              onClick={() => setQuestInvitesEnabled(!questInvitesEnabled)}
              className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${questInvitesEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <motion.div 
                layout
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: questInvitesEnabled ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Haptic Sound Effects</h3>
                <p className="text-xs text-gray-400 font-bold">Play sounds on XP gains</p>
              </div>
            </div>
            
            <button 
              onClick={() => setSoundsEnabled(!soundsEnabled)}
              className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${soundsEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <motion.div 
                layout
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: soundsEnabled ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Sign Out Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80">
          <button
            onClick={handleSignOut}
            className="w-full py-4 bg-red-500 hover:bg-red-600 active:scale-98 text-white font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-500/15"
          >
            <LogOut className="w-5 h-5" />
            Sign Out of Account
          </button>
        </div>

        {/* App Version Info Footer */}
        <div className="text-center text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-widest pt-4">
          <p>Version 2.4.0 (Spring Season)</p>
          <p className="mt-1 opacity-70">Built with ❤️ by Team SideQuest</p>
        </div>

      </main>
    </div>
  )
}
