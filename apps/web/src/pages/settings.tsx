import { Link } from '@tanstack/react-router'
import { ChevronLeft, Moon, Sun, Settings as SettingsIcon } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { motion } from 'framer-motion'

export function SettingsPage() {
  const { theme, toggleTheme } = useSettingsStore()

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            to="/profile/$id"
            params={{ id: 'me' }} // Fallback, router will handle
            onClick={(e) => {
              e.preventDefault()
              window.history.back()
            }}
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

      <main className="max-w-md mx-auto p-4 pt-6 pb-32 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-100 text-orange-600'}`}>
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Light / Dark Mode</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Global application theme</p>
              </div>
            </div>
            
            {/* iOS Style Toggle */}
            <button 
              onClick={toggleTheme}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <motion.div 
                layout
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: theme === 'dark' ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
