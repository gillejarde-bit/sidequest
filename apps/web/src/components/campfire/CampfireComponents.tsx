import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Flame, Diamond, PawPrint, Calendar, Sparkles, UserPlus, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import { formatDistanceToNow } from 'date-fns'

export interface FeedReaction {
  kind: 'flame' | 'gem' | 'paw'
  user_id: string
  username: string
}

export interface FeedEvent {
  id: string
  actor_id: string
  actor_username: string
  actor_display_name: string
  actor_avatar_url?: string
  actor_level: number
  crew_id?: string
  crew_name?: string
  crew_color?: string
  type: string
  payload: any
  lat?: number
  lng?: number
  created_at: string
  score: number
  reactions: FeedReaction[]
}

// Global Spring Presets matching physics rules
export const springs = {
  stamp: { type: 'spring' as const, stiffness: 380, damping: 24 },
  pop: { type: 'spring' as const, stiffness: 450, damping: 15 },
  fade: { duration: 0.2 }
}

// 1. BannerRibbon: Styled medieval/RPG header ribbon
export function BannerRibbon({ title }: { title: string }) {
  return (
    <div className="relative mx-auto my-6 px-8 py-3.5 bg-primary text-white rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 text-center overflow-hidden">
      {/* Paper Grain Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.06] pointer-events-none" />
      
      <h2 className="text-2xl font-extrabold uppercase tracking-widest font-display text-shadow drop-shadow-md">
        {title}
      </h2>
    </div>
  )
}

// 2. ReactionBar: Flame | Gem | Paw reactions with optimistic pop updates
export function ReactionBar({ eventId, initialReactions }: { eventId: string; initialReactions: FeedReaction[] }) {
  const { user } = useAuthStore()
  const [reactions, setReactions] = useState<FeedReaction[]>(initialReactions)
  const [activeReaction, setActiveReaction] = useState<'flame' | 'gem' | 'paw' | null>(null)

  useEffect(() => {
    if (!user) return
    const mine = reactions.find(r => r.user_id === user.id)
    setActiveReaction(mine ? mine.kind : null)
  }, [reactions, user])

  const toggleReaction = async (kind: 'flame' | 'gem' | 'paw') => {
    if (!user) return
    
    const existsIndex = reactions.findIndex(r => r.user_id === user.id && r.kind === kind)
    const username = user.email ? user.email.split('@')[0] : 'friend'
    
    // Optimistic state update
    let updatedReactions = [...reactions]
    if (existsIndex >= 0) {
      updatedReactions.splice(existsIndex, 1)
      setReactions(updatedReactions)
      
      // Delete reaction on server using typecast to any
      await (supabase.from as any)('feed_reactions')
        .delete()
        .eq('feed_event_id', eventId)
        .eq('user_id', user.id)
        .eq('kind', kind)
    } else {
      // Remove any other reaction this user might have on this event to avoid spamming multiple kinds
      updatedReactions = updatedReactions.filter(r => r.user_id !== user.id)
      updatedReactions.push({ kind, user_id: user.id, username })
      setReactions(updatedReactions)
      
      // Insert reaction on server using typecast to any
      await (supabase.from as any)('feed_reactions')
        .insert({ feed_event_id: eventId, user_id: user.id, kind })
    }
  }

  const getReactionCount = (kind: 'flame' | 'gem' | 'paw') => {
    return reactions.filter(r => r.kind === kind).length
  }

  return (
    <div className="flex gap-2 pt-3 border-t border-gray-150 dark:border-gray-700/80 mt-4">
      {(['flame', 'gem', 'paw'] as const).map(kind => {
        const count = getReactionCount(kind)
        const isActive = activeReaction === kind
        
        let icon = <Flame className="w-4 h-4" />
        let btnStyle = "hover:bg-primary/10 text-gray-500 dark:text-gray-400 hover:text-primary"
        let activeStyle = "bg-primary/20 text-primary border-primary/40"
        
        if (kind === 'gem') {
          icon = <Diamond className="w-4 h-4" />
          btnStyle = "hover:bg-[#239B8E]/10 text-gray-550 dark:text-gray-400 hover:text-[#239B8E]"
          activeStyle = "bg-[#239B8E]/20 text-[#239B8E] border-[#239B8E]/40"
        } else if (kind === 'paw') {
          icon = <PawPrint className="w-4 h-4" />
          btnStyle = "hover:bg-[#F0B45C]/10 text-gray-550 dark:text-gray-400 hover:text-[#F0B45C]"
          activeStyle = "bg-[#F0B45C]/20 text-[#F0B45C] border-[#F0B45C]/40"
        }

        return (
          <motion.button
            key={kind}
            onClick={() => toggleReaction(kind)}
            whileTap={{ scale: 0.9 }}
            className={`px-3 py-1.5 rounded-full border border-transparent text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              isActive ? activeStyle : btnStyle
            }`}
          >
            {icon}
            {count > 0 && <span>{count}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}

// 3. FeedCard: Base quest-log entry with support for all variants
export function FeedCard({ event }: { event: FeedEvent }) {
  const { actor_username, actor_avatar_url, actor_level, type, payload, created_at, crew_name, crew_color } = event
  const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true })
  
  // Custom display badge for Archetype/Foil
  const isFoil = type === 'foil_crown'
  const isPioneer = type === 'pioneer_mint'
  const isGem = type === 'gem_nominated'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.stamp}
      className={`relative w-full bg-white dark:bg-gray-800 border rounded-xl p-5 shadow-lg flex flex-col gap-3 group transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
        isFoil 
          ? 'border-[#F0B45C] shadow-[0_0_15px_rgba(240,180,92,0.15)]' 
          : isGem 
          ? 'border-[#239B8E]' 
          : 'border-gray-150 dark:border-gray-700/80'
      }`}
    >
      {/* Paper Grain Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none rounded-xl" />
      
      {/* Card Header info */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3">
          {/* Rounded square avatar */}
          <Link to="/profile/$id" params={{ id: event.actor_id }} className="relative shrink-0 active:scale-95 transition-transform block">
            {actor_avatar_url ? (
              <img src={actor_avatar_url} className="w-11 h-11 rounded-xl object-cover border-2 border-gray-150 dark:border-gray-750" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center font-black font-display text-primary text-lg uppercase">
                {actor_username[0]}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-md text-[8px] px-1 font-extrabold border border-gray-150 dark:border-gray-750 leading-none py-0.5 font-display shadow-md">
              L{actor_level}
            </div>
          </Link>

          <div>
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 font-display leading-tight">
              @{actor_username}
              {crew_name && (
                <span 
                  className="text-[9px] px-1.5 py-0.5 rounded border font-extrabold uppercase font-body leading-none shadow-sm shrink-0" 
                  style={{ backgroundColor: `${crew_color}18`, borderColor: crew_color, color: crew_color }}
                >
                  {crew_name}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">{timeAgo}</p>
          </div>
        </div>

        {/* Dynamic Crown/Pioneer Badges */}
        {isFoil && (
          <div className="bg-gradient-to-r from-[#F0B45C]/15 to-[#F0B45C]/5 border border-[#F0B45C]/30 text-[#F0B45C] text-[9px] font-black rounded-lg px-2 py-1 flex items-center gap-1 uppercase tracking-wide shrink-0 shadow-sm animate-pulse">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            Foil Crown
          </div>
        )}
        {isPioneer && (
          <div className="bg-[#239B8E]/15 border border-[#239B8E]/30 text-[#239B8E] text-[9px] font-black rounded-lg px-2 py-1 flex items-center gap-1 uppercase tracking-wide shrink-0 shadow-sm">
            <Diamond className="w-3.5 h-3.5" />
            Pioneer Mint
          </div>
        )}
      </div>

      {/* Main Event Body Narrative Content */}
      <div className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed relative z-10">
        {type === 'quest_complete' && (
          <p>
            Checked in at <span className="text-primary font-extrabold font-display">{payload.location_name || 'Secret Spot'}</span> for the quest <span className="underline decoration-primary/30 font-black">{payload.quest_name}</span>. Mapped to <span className="text-[#F0B45C] font-extrabold uppercase text-xs">{payload.category}</span>.
          </p>
        )}
        {type === 'pioneer_mint' && (
          <p>
            👑 Minted a <span className="text-[#239B8E] font-black">Pioneer badge</span>! The very first explorer to establish a presence at <span className="text-primary font-extrabold font-display">{payload.location_name}</span>.
          </p>
        )}
        {type === 'foil_crown' && (
          <p>
            ✨ Evolved a <span className="text-[#F0B45C] font-black">Foil Crown</span> in <span className="uppercase text-xs font-bold text-[#F0B45C]">{payload.category}</span> during their meetup at <span className="text-primary font-extrabold font-display">{payload.location_name}</span>!
          </p>
        )}
        {type === 'archetype_unlock' && (
          <p>
            🎉 Character stats evolved! Advanced to <span className="text-primary font-black font-display text-base">Level {payload.level}</span>.
          </p>
        )}
        {type === 'gem_nominated' && (
          <div className="space-y-2">
            <p>
              🔍 Nominated a new <span className="text-[#239B8E] font-black">Hidden Gem</span>: <span className="text-primary font-extrabold font-display">{payload.gem_name}</span>.
            </p>
            {payload.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/30 rounded-lg p-2.5">
                "{payload.description}"
              </p>
            )}
          </div>
        )}
        {type === 'streak_milestone' && (
          <p>
            🔥 The crew <span className="text-primary font-black">@{payload.group_name}</span> reached a roaring <span className="text-primary font-extrabold font-display text-base">{payload.streak}-day streak</span>!
          </p>
        )}
        {type === 'streak_revived' && (
          <p>
            ❤️ Saved by the hearth! Eased active streaks and kept the flame alive.
          </p>
        )}
      </div>

      {/* Foil Shimmer effect on cards */}
      {isFoil && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none mix-blend-color-dodge z-0">
          <div 
            className="w-full h-full opacity-10"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(240,180,92,0.8) 50%, rgba(255,255,255,0) 70%)',
              backgroundSize: '250% 250%',
              animation: 'foilSweep 6s ease-in-out infinite'
            }}
          />
        </div>
      )}

      {/* StrandCard Action button (Follow their Trail) */}
      {(type === 'quest_complete' || type === 'gem_nominated') && payload.quest_id && (
        <div className="relative z-10 flex gap-2 mt-2">
          <button
            onClick={async () => {
              // OPTIONAL: Call existing quest-scheduling / calendar flows using typecast to any
              try {
                const { error } = await (supabase.from as any)('quest_invites').insert({
                  quest_id: payload.quest_id,
                  user_id: event.actor_id,
                  status: 'accepted'
                })
                if (!error) {
                  alert('Trail followed! Added to your schedule.')
                } else {
                  alert('Could not follow trail: ' + error.message)
                }
              } catch (e) {
                console.error(e)
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black bg-[#239B8E] hover:bg-[#239B8E]/80 text-white rounded-lg active:scale-95 transition-all shadow-md cursor-pointer uppercase tracking-wider font-display border border-transparent"
          >
            <Calendar className="w-3.5 h-3.5" />
            Follow their Trail
          </button>
        </div>
      )}

      {/* ReactBar */}
      <ReactionBar eventId={event.id} initialReactions={event.reactions} />
    </motion.div>
  )
}

// 4. AICampfireDigest: Daily digest/briefing card from Randall
export function AICampfireDigest({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 border-l-4 border-primary border-t border-r border-b border-gray-150 dark:border-gray-700/80 rounded-xl p-5 shadow-xl flex gap-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />
      
      {/* Randall Mascot image / avatar */}
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/30 shadow-md">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>

      <div className="flex-1 space-y-1 relative z-10 text-left">
        <h4 className="text-[10px] font-black uppercase text-primary tracking-widest font-display leading-none">Campfire Briefing 🔥</h4>
        <p className="text-xs text-gray-800 dark:text-gray-200 font-medium leading-relaxed mt-1">
          {text}
        </p>
      </div>
    </motion.div>
  )
}

// 5. EmptyCampfire: Cold-start helper with Mascot sleeping next to a dead campfire + friendly CTAs
export function EmptyCampfire({ onActionClick }: { onActionClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/80 rounded-xl shadow-xl space-y-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />

      {/* Randall Asleep Graphic */}
      <div 
        onClick={onActionClick}
        title="Tap to refresh the fire"
        className="w-24 h-24 rounded-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-150 dark:border-gray-700/80 flex items-center justify-center text-5xl relative shadow-inner animate-pulse cursor-pointer hover:scale-105 transition-transform"
      >
        💤
      </div>

      <div className="space-y-2 relative z-10 max-w-sm">
        <h3 className="text-lg font-black font-display text-gray-900 dark:text-white tracking-wide">Quiet around the fire...</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
          Invite friends to SideQuest or assemble your Crew to see details of their adventures recorded here.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-center relative z-10">
        <Link
          to="/friends"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl active:scale-95 transition-all shadow-md cursor-pointer uppercase tracking-wider font-display border border-transparent"
        >
          <UserPlus className="w-4 h-4" />
          Add Friends
        </Link>
        
        <Link
          to="/streaks"
          className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:bg-secondary/80 text-white text-xs font-black rounded-xl active:scale-95 transition-all shadow-md cursor-pointer uppercase tracking-wider font-display border border-transparent"
        >
          <Users className="w-4 h-4" />
          Assemble Crew
        </Link>
      </div>
    </div>
  )
}
