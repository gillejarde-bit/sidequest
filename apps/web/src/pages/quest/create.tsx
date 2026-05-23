import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { QuestForm } from '../../components/quest/QuestForm'

export function CreateQuestPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            to="/" 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-900 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black tracking-tight">New Quest</h1>
          <div className="w-10" /> {/* Balance for centering */}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6">
        <p className="text-gray-500 mb-6 px-2">
          Design your next adventure. Invite your squad and earn XP.
        </p>
        <QuestForm />
      </main>
    </div>
  )
}
