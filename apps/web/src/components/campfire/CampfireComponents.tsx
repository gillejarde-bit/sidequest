import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import { formatDistanceToNow } from 'date-fns'
import { 
  StreakFlameIcon, 
  GemIcon, 
  HeartIcon, 
  CalendarIcon, 
  SparkleIcon, 
  FriendsIcon, 
  EmberSleepIcon 
} from '../icons'

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
    <div className="relative mx-auto my-6 px-8 py-3.5 bg-[var(--sq-ember-500)] text-[var(--sq-keyline)] sq-wobbly-md shadow-[var(--sq-shadow-sticker)] text-center overflow-hidden border-2 border-[var(--sq-keyline)]">
      {/* Paper Grain Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.06] pointer-events-none" />
      
      <h2 className="text-xl font-medium uppercase tracking-widest font-display text-shadow drop-shadow-sm">
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
    <div className="flex gap-2 pt-3 border-t border-[var(--sq-hairline)] mt-4">
      {(['flame', 'gem', 'paw'] as const).map(kind => {
        const count = getReactionCount(kind)
        const isActive = activeReaction === kind
        
        let icon = <StreakFlameIcon size={20} active={isActive} withShadow={false} />
        let btnStyle = "hover:bg-[var(--sq-surface)] text-[var(--sq-text-muted)] hover:text-[var(--sq-ember-400)] border border-[var(--sq-hairline)]"
        let activeStyle = "bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]"
        
        if (kind === 'gem') {
          icon = <GemIcon size={20} active={isActive} withShadow={false} />
          btnStyle = "hover:bg-[var(--sq-surface)] text-[var(--sq-text-muted)] hover:text-[var(--sq-sage-500)] border border-[var(--sq-hairline)]"
          activeStyle = "bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]"
        } else if (kind === 'paw') {
          icon = <HeartIcon size={20} active={isActive} withShadow={false} />
          btnStyle = "hover:bg-[var(--sq-surface)] text-[var(--sq-text-muted)] hover:text-[var(--sq-gold)] border border-[var(--sq-hairline)]"
          activeStyle = "bg-[var(--sq-gold)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]"
        }

        return (
          <motion.button
            key={kind}
            onClick={() => toggleReaction(kind)}
            whileTap={{ scale: 0.92 }}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
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
      className={`relative w-full bg-[var(--sq-card)] border sq-wobbly-md p-5 shadow-[var(--sq-shadow-soft)] flex flex-col gap-3 group transition-all hover:bg-[var(--sq-card-hover)] ${
        isFoil 
          ? 'border-[var(--sq-gold)] shadow-[var(--sq-shadow-glow)]' 
          : isGem 
          ? 'border-[var(--sq-sage-500)]' 
          : 'border-[var(--sq-hairline-strong)]'
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
              <img src={actor_avatar_url} className="w-11 h-11 rounded-[var(--sq-r-md)] object-cover border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" />
            ) : (
              <div className="w-11 h-11 rounded-[var(--sq-r-md)] bg-[var(--sq-surface)] border-2 border-[var(--sq-keyline)] flex items-center justify-center font-medium text-[var(--sq-ember-300)] text-lg uppercase shadow-[var(--sq-shadow-sticker)]">
                {actor_username[0]}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] rounded-md text-[8px] px-1 font-medium border border-[var(--sq-keyline)] leading-none py-0.5 shadow-md">
              L{actor_level}
            </div>
          </Link>

          <div className="text-left">
            <h4 className="font-medium text-sm text-[var(--sq-text)] flex items-center gap-1.5 leading-tight">
              @{actor_username}
              {crew_name && (
                <span 
                  className="text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase leading-none shadow-sm shrink-0" 
                  style={{ backgroundColor: `${crew_color}18`, borderColor: crew_color, color: crew_color }}
                >
                  {crew_name}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-[var(--sq-text-muted)] font-medium mt-0.5">{timeAgo}</p>
          </div>
        </div>

        {/* Dynamic Crown/Pioneer Badges */}
        {isFoil && (
          <div className="bg-[var(--sq-gold)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] text-[9px] font-medium rounded-[var(--sq-r-sm)] px-2 py-0.5 flex items-center gap-1 uppercase tracking-wide shrink-0 shadow-[var(--sq-shadow-sticker)]">
            <SparkleIcon size={14} active={true} withShadow={false} />
            Foil Crown
          </div>
        )}
        {isPioneer && (
          <div className="bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] text-[9px] font-medium rounded-[var(--sq-r-sm)] px-2 py-0.5 flex items-center gap-1 uppercase tracking-wide shrink-0 shadow-[var(--sq-shadow-sticker)]">
            <GemIcon size={14} active={true} withShadow={false} />
            Pioneer Mint
          </div>
        )}
      </div>

      {/* Main Event Body Narrative Content */}
      <div className="text-sm text-[var(--sq-text)] font-medium leading-relaxed relative z-10 text-left">
        {type === 'quest_complete' && (
          <p>
            Checked in at <span className="text-[var(--sq-ember-300)] font-medium">{payload.location_name || 'Secret Spot'}</span> for the quest <span className="underline decoration-[var(--sq-ember-500)]/30 font-medium">{payload.quest_name}</span>. Mapped to <span className="text-[var(--sq-gold)] font-medium uppercase text-xs">{payload.category}</span>.
          </p>
        )}
        {type === 'pioneer_mint' && (
          <p>
            👑 Minted a <span className="text-[var(--sq-sage-500)] font-medium">Pioneer badge</span>! The very first explorer to establish a presence at <span className="text-[var(--sq-ember-300)] font-medium">{payload.location_name}</span>.
          </p>
        )}
        {type === 'foil_crown' && (
          <p>
            ✨ Evolved a <span className="text-[var(--sq-gold)] font-medium">Foil Crown</span> in <span className="uppercase text-xs font-medium text-[var(--sq-gold)]">{payload.category}</span> during their meetup at <span className="text-[var(--sq-ember-300)] font-medium">{payload.location_name}</span>!
          </p>
        )}
        {type === 'archetype_unlock' && (
          <p>
            🎉 Character stats evolved! Advanced to <span className="text-[var(--sq-ember-300)] font-medium">Level {payload.level}</span>.
          </p>
        )}
        {type === 'gem_nominated' && (
          <div className="space-y-2">
            <p>
              🔍 Nominated a new <span className="text-[var(--sq-sage-500)] font-medium">Hidden Gem</span>: <span className="text-[var(--sq-ember-300)] font-medium">{payload.gem_name}</span>.
            </p>
            {payload.description && (
              <p className="text-xs text-[var(--sq-text-muted)] italic bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-lg p-2.5">
                "{payload.description}"
              </p>
            )}
          </div>
        )}
        {type === 'streak_milestone' && (
          <p>
            🔥 The group <span className="text-[var(--sq-ember-300)] font-medium">@{payload.group_name}</span> reached a roaring <span className="text-[var(--sq-ember-400)] font-medium text-base">{payload.streak}-day streak</span>!
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
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium bg-[var(--sq-sage-500)] hover:bg-[var(--sq-sage-600)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] rounded-[var(--sq-r-sm)] active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
          >
            <CalendarIcon size={16} active={true} withShadow={false} />
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
      className="bg-[var(--sq-card)] border-l-4 border-l-[var(--sq-ember-500)] border-t border-r border-b border-[var(--sq-hairline-strong)] sq-wobbly-md p-5 shadow-[var(--sq-shadow-soft)] flex gap-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />
      
      {/* Randall Mascot image / avatar */}
      <div className="w-12 h-12 rounded-[var(--sq-r-md)] bg-[var(--sq-surface)] flex items-center justify-center shrink-0 border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]">
        <SparkleIcon size={24} active={true} withShadow={false} />
      </div>

      <div className="flex-1 space-y-1 relative z-10 text-left">
        <h4 className="text-[10px] font-medium uppercase text-[var(--sq-ember-400)] tracking-widest font-display leading-none">Campfire Briefing</h4>
        <p className="text-xs text-[var(--sq-text)] font-medium leading-relaxed mt-1">
          {text}
        </p>
      </div>
    </motion.div>
  )
}

// 5. EmptyCampfire: Cold-start helper with Mascot sleeping next to a dead campfire + friendly CTAs + Quest History timeline
export function EmptyCampfire({ 
  onActionClick,
  historyItems = [],
  loadingHistory = false
}: { 
  onActionClick: () => void;
  historyItems?: any[];
  loadingHistory?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] sq-wobbly-lg shadow-[var(--sq-shadow-soft)] space-y-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none" />

      {/* Randall Asleep Sticker Graphic */}
      <div 
        onClick={onActionClick}
        title="Tap to refresh the fire"
        className="w-24 h-24 rounded-full bg-[var(--sq-surface)] border-4 border-[var(--sq-keyline)] flex items-center justify-center relative shadow-[var(--sq-shadow-sticker)] cursor-pointer hover:scale-105 transition-transform"
      >
        <EmberSleepIcon size={56} active={false} withShadow={false} />
      </div>

      <div className="space-y-2 relative z-10 max-w-sm">
        <h3 className="text-lg font-medium font-display text-[var(--sq-text)] tracking-wide">Quiet around the fire...</h3>
        <p className="text-xs text-[var(--sq-text-muted)] font-medium leading-relaxed">
          Invite friends to SideQuest or assemble your Group to see details of their adventures recorded here.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-center relative z-10">
        <Link
          to="/friends"
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--sq-ember-500)] hover:bg-[var(--sq-ember-600)] text-[var(--sq-ink)] text-xs font-medium sq-wobbly-pill border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
        >
          <FriendsIcon size={16} active={true} withShadow={false} />
          Add friends
        </Link>
        
        <Link
          to="/friends"
          search={{ tab: 'groups' } as any}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--sq-sage-500)] hover:bg-[var(--sq-sage-600)] text-[var(--sq-ink)] text-xs font-medium sq-wobbly-pill border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
        >
          <FriendsIcon size={16} active={true} withShadow={false} />
          Assemble group
        </Link>
      </div>

      {/* Recent Activity Timeline - Limit to most recent 5 elements scrollable */}
      <div className="w-full pt-6 border-t border-[var(--sq-hairline-strong)] relative z-10 text-left">
        <h4 className="text-xs font-medium uppercase text-[var(--sq-gold)] tracking-widest font-display mb-4">
          Recent quest activity
        </h4>
        
        {loadingHistory ? (
          <div className="py-4 flex justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--sq-ember-500)] border-t-transparent rounded-full" />
          </div>
        ) : historyItems.length === 0 ? (
          <p className="text-xs text-[var(--sq-text-muted)] italic text-center py-2">
            No recent quest activity. Start one now!
          </p>
        ) : (
          /* Restrict to max-h and custom premium scrollbar with exactly 5 items max height scrolling comfortable nice looking UI */
          <div className="max-h-[220px] overflow-y-auto pr-1.5 scrollbar-premium space-y-4 relative pl-4">
            {historyItems.slice(0, 10).map((item) => {
              const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })
              const isCreated = item.type === 'created'
              
              return (
                <div key={item.id} className="flex gap-3 items-start relative">
                  {/* Avatar / Timeline node */}
                  <Link 
                    to="/profile/$id" 
                    params={{ id: item.user.id }}
                    className="relative z-10 shrink-0 w-7 h-7 rounded-full overflow-hidden border-2 border-[var(--sq-keyline)] bg-[var(--sq-surface)] flex items-center justify-center shadow-sm"
                  >
                    {item.user.avatar_url ? (
                      <img src={item.user.avatar_url} alt={item.user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-medium text-[var(--sq-text-muted)]">
                        {item.user.username[0].toUpperCase()}
                      </span>
                    )}
                  </Link>
                  
                  {/* Text details */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-xs font-medium text-[var(--sq-text)] leading-snug">
                      <Link to="/profile/$id" params={{ id: item.user.id }} className="font-medium text-[var(--sq-ember-300)] hover:underline transition-colors mr-1">
                        @{item.user.username}
                      </Link>
                      {isCreated ? 'created quest ' : 'completed quest '}
                      <Link to="/quest/$id" params={{ id: item.questId }} className="font-medium underline text-[var(--sq-ember-400)] hover:opacity-85 transition-opacity">
                        {item.questName}
                      </Link>
                    </p>
                    <span className="text-[9px] text-[var(--sq-text-faint)] mt-1 block">
                      {timeAgo}
                    </span>
                  </div>
                  
                  {/* Badge Icon */}
                  <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border shadow-sm ${
                    isCreated 
                      ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border-[var(--sq-keyline)]' 
                      : 'bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border-[var(--sq-keyline)]'
                  }`}>
                    {isCreated ? '+' : '✓'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
