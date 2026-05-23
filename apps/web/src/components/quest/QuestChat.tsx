import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle } from 'lucide-react'
import { useQuestChat } from '../../hooks/useQuestChat'
import { useAuthStore } from '../../stores/auth'
import { formatDistanceToNow } from 'date-fns'

interface QuestChatProps {
  questId: string
  isParticipant: boolean
  previewOnly?: boolean
}

export function QuestChat({ questId, isParticipant, previewOnly = false }: QuestChatProps) {
  const { messages, isLoading, sendMessage, sending } = useQuestChat(questId)
  const { user } = useAuthStore()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!previewOnly && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, previewOnly])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !isParticipant || sending) return
    sendMessage(text)
    setText('')
  }

  const displayMessages = previewOnly ? messages.slice(-3) : messages

  if (!isParticipant && messages.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-500 text-sm">
        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        Join the quest to unlock party chat!
      </div>
    )
  }

  return (
    <div className={`flex flex-col bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 ${previewOnly ? '' : 'h-[500px]'}`}>
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${previewOnly ? 'max-h-[250px]' : ''}`}>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {displayMessages.map((msg: any) => {
              const isMe = msg.sender_id === user?.id
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {!isMe && (
                    <div className="shrink-0">
                      {msg.profiles?.avatar_url ? (
                        <img src={msg.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 text-[10px] font-bold text-gray-500 flex items-center justify-center">
                          {msg.profiles?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="text-[10px] text-gray-500 ml-1 mb-0.5">{msg.profiles?.display_name || msg.profiles?.username}</span>}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-[#58CC02]/10 text-green-900 rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'}`}>
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {!previewOnly && (
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={!isParticipant || sending}
            placeholder={isParticipant ? "Message the party..." : "Join quest to chat"}
            className="flex-1 bg-gray-50 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!text.trim() || !isParticipant || sending}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  )
}
