import { useMemo, useState, type ReactNode } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { MapPin, Calendar, ChevronLeft, Navigation, Check, Plus, Heart, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { useQuestDetail } from '../../hooks/useQuestDetail'
import { RSVPButton } from '../../components/quest/RSVPButton'
import { CheckInButton } from '../../components/quest/CheckInButton'
import { QuestChat } from '../../components/quest/QuestChat'
import { CategoryHero } from '../../components/quest/CategoryHero'
import { useFriends } from '../../hooks/useFriends'
import { useGeolocation } from '../../hooks/useGeolocation'
import { format, isToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Map, { Marker, Source, Layer } from 'react-map-gl'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '../../lib/supabase'
import { categoryPursuitMap, pursuits, vibePursuitNudge, XP_REWARDS } from '../../features/pursuits/pursuits.config'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

import cozyStyle from '../../components/map/fog/sidequest-cozy-style.json'

type Tab = 'details' | 'party' | 'chat'

function Tag({ children, tone = 'ember' }: { children: ReactNode; tone?: 'ember' | 'muted' | 'success' }) {
  const cls =
    tone === 'success'
      ? 'bg-[var(--sq-success)]/15 text-[var(--sq-success)]'
      : tone === 'muted'
      ? 'bg-[var(--sq-surface)] text-[var(--sq-text-muted)]'
      : 'bg-[var(--sq-ember-500)]/15 text-[var(--sq-ember-400)]'
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  )
}

export function QuestDetail() {
  const { id } = useParams({ from: '/quest/$id' })
  const { profile } = useAuthStore()
  const { data, isLoading, refetch } = useQuestDetail(id)
  const geo = useGeolocation()
  const [tab, setTab] = useState<Tab>('details')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showInvitePopup, setShowInvitePopup] = useState(false)
  const [invitingState, setInvitingState] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({})
  const { data: friendsList = [], isLoading: friendsLoading } = useFriends()

  const location = data?.location
  const hasUser = geo.lat != null && geo.lng != null

  // Straight-line route preview (turn-by-turn happens in the maps deep-link).
  const routeData = useMemo<GeoJSON.Feature | null>(() => {
    if (!location || !hasUser) return null
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[geo.lng!, geo.lat!], [location.lng, location.lat]] },
    }
  }, [location, hasUser, geo.lat, geo.lng])

  const directionsUrl = location
    ? `https://www.google.com/maps/dir/?api=1&${hasUser ? `origin=${geo.lat},${geo.lng}&` : ''}destination=${location.lat},${location.lng}&travelmode=walking`
    : '#'

  if (isLoading) return <div className="flex h-[100dvh] items-center justify-center bg-[var(--sq-bg)]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--sq-ember-500)] border-t-transparent" /></div>
  if (!data) return <div className="flex h-[100dvh] items-center justify-center bg-[var(--sq-bg)] text-[var(--sq-text)]">Quest not found</div>

  const { quest, creator, attendees, my_status, is_creator, user_attended } = data
  const cost = '$'.repeat(quest.cost_tier) || 'Free'
  const isParticipant = my_status === 'accepted' || is_creator
  const showCheckIn = isParticipant && isToday(new Date(quest.starts_at))

  // XP preview (no extra queries — uses already-loaded category/vibe)
  const primaryPursuitKey = quest.category ? categoryPursuitMap[String(quest.category).toLowerCase()] : undefined
  const primaryPursuit = primaryPursuitKey ? pursuits[primaryPursuitKey] : undefined
  const secondaryPursuitKey = quest.vibe ? vibePursuitNudge[String(quest.vibe).toLowerCase()] : undefined
  const secondaryPursuit = secondaryPursuitKey && secondaryPursuitKey !== primaryPursuitKey ? pursuits[secondaryPursuitKey] : undefined
  const discoveryPursuit = pursuits.discovery

  const TabButton = ({ value, label }: { value: Tab; label: string }) => (
    <button
      onClick={() => setTab(value)}
      className={`relative flex-1 cursor-pointer py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors ${
        tab === value ? 'text-[var(--sq-ember-400)]' : 'text-[var(--sq-text-faint)] hover:text-[var(--sq-text-muted)]'
      }`}
    >
      {label}
      {tab === value && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--sq-ember-500)]" />}
    </button>
  )

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--sq-bg)] text-[var(--sq-text)]">
      {/* ── Low-poly category hero ── */}
      <div className="relative h-[148px] shrink-0 overflow-hidden">
        <CategoryHero category={quest.category} className="absolute inset-0 h-full w-full" />
        <button
          onClick={() => window.history.back()}
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sq-hairline-strong)] bg-[var(--sq-bg)]/70 backdrop-blur-md active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-[var(--sq-text)]" />
        </button>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--sq-bg)] via-[var(--sq-bg)]/85 to-transparent px-5 pb-3 pt-12">
          <h1 className="text-2xl font-black leading-tight text-[var(--sq-text)] line-clamp-2">{quest.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Tag>{quest.category}</Tag>
            {quest.vibe && <Tag tone="muted">{quest.vibe}</Tag>}
            <Tag tone="success">{cost}</Tag>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex shrink-0 items-stretch border-b border-[var(--sq-hairline)] bg-[var(--sq-bg)] px-2">
        <TabButton value="details" label="Details" />
        <TabButton value="party" label={`Party · ${data.attendee_count}`} />
        <TabButton value="chat" label="Chat" />
      </div>

      {/* ── Content ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* DETAILS */}
        {tab === 'details' && (
          <div className="h-full overflow-y-auto px-4 py-3 space-y-3">
            <div className="rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] divide-y divide-[var(--sq-hairline)]">
              {location && (
                <a href={directionsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3.5 active:scale-[0.99] transition-transform">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sq-ember-500)]/12 text-[var(--sq-ember-400)]"><MapPin className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[var(--sq-text)]">{location.name}</p>
                    <p className="text-xs text-[var(--sq-text-muted)]">Tap for directions</p>
                  </div>
                  <Navigation className="h-4 w-4 shrink-0 text-[var(--sq-text-faint)]" />
                </a>
              )}
              <div className="flex items-center gap-3 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sq-gold)]/12 text-[var(--sq-gold-soft)]"><Calendar className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="font-bold text-[var(--sq-text)]">{format(new Date(quest.starts_at), 'EEEE, MMMM d')}</p>
                  <p className="text-xs text-[var(--sq-text-muted)]">{format(new Date(quest.starts_at), 'h:mm a')}</p>
                </div>
              </div>
              <Link to="/profile/$id" params={{ id: creator.id }} className="flex items-center gap-3 p-3.5 active:scale-[0.99] transition-transform">
                <img src={creator.avatar_url || ''} alt="" className="h-9 w-9 shrink-0 rounded-full border border-[var(--sq-hairline)] bg-[var(--sq-surface)] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[var(--sq-text)]">{creator.display_name || creator.username}</p>
                  <p className="text-xs text-[var(--sq-text-muted)]">Level {creator.level || 1} Host</p>
                </div>
                <span className="rounded-full bg-[var(--sq-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--sq-text-muted)]">{data.attendee_count} going</span>
              </Link>
            </div>

            {quest.description && (
              <p className="line-clamp-3 px-1 text-sm leading-relaxed text-[var(--sq-text-muted)] whitespace-pre-wrap">{quest.description}</p>
            )}

            {/* Directions: route preview + deep-link */}
            {location && (
              <div className="overflow-hidden rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline)] bg-[var(--sq-card)]">
                <div className="h-[140px] w-full">
                  <Map
                    initialViewState={{ longitude: location.lng, latitude: location.lat, zoom: 14 }}
                    mapStyle={cozyStyle as any}
                    pitch={0}
                    bearing={0}
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                    interactive={false}
                    style={{ width: '100%', height: '100%' }}
                    onLoad={(e) => {
                      const map = e.target
                      try {
                        map.setLayoutProperty('poi-label', 'visibility', 'none')
                        map.setLayoutProperty('transit-label', 'visibility', 'none')
                      } catch { /* style may lack these layers */ }
                      if (hasUser && location) {
                        const b = new mapboxgl.LngLatBounds([geo.lng!, geo.lat!], [location.lng, location.lat])
                        map.fitBounds(b, { padding: 38, maxZoom: 15, duration: 0 })
                      }
                      map.resize()
                    }}
                  >
                    {routeData && (
                      <Source id="route" type="geojson" data={routeData}>
                        <Layer
                          id="route-line"
                          type="line"
                          paint={{ 'line-color': '#F2741E', 'line-width': 3, 'line-dasharray': [1.6, 1.2] }}
                          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                        />
                      </Source>
                    )}
                    <Marker longitude={location.lng} latitude={location.lat} anchor="bottom">
                      <div className="flex flex-col items-center">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--sq-keyline)] bg-[var(--sq-gold)] text-[12px] text-[var(--sq-ink)] shadow-[0_0_8px_rgba(246,166,35,0.7)]">⚑</span>
                      </div>
                    </Marker>
                    {hasUser && (
                      <Marker longitude={geo.lng!} latitude={geo.lat!} anchor="center">
                        <span className="block h-3.5 w-3.5 rounded-full border-2 border-[var(--sq-keyline)] bg-[var(--sq-ember-500)] shadow-[0_0_8px_rgba(242,116,30,0.8)]" />
                      </Marker>
                    )}
                  </Map>
                </div>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 border-t border-[var(--sq-hairline)] py-3 text-sm font-black uppercase tracking-wider text-[var(--sq-ember-400)] hover:bg-[var(--sq-card-hover)] active:scale-[0.99] transition-all"
                >
                  <Navigation className="h-4 w-4" />
                  Get Directions
                </a>
              </div>
            )}
          </div>
        )}

        {/* PARTY */}
        {tab === 'party' && (
          <div className="h-full overflow-y-auto px-4 py-3 space-y-3">
            <div className="rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline)] bg-[var(--sq-card)] p-4">
              <div className="flex flex-wrap gap-3">
                {attendees && attendees.map((att: any, i: number) => (
                  <motion.div key={att.user_id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className="w-16 text-center">
                    <Link to="/profile/$id" params={{ id: att.user_id }}>
                      <div className="relative mx-auto mb-1 h-14 w-14">
                        <div className="h-full w-full overflow-hidden rounded-full border border-[var(--sq-hairline)] bg-[var(--sq-surface)]">
                          {att.avatar_url ? (
                            <img src={att.avatar_url} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-bold text-[var(--sq-text-faint)]">{att.username[0].toUpperCase()}</div>
                          )}
                        </div>
                        <div className={`absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--sq-bg)] ${att.has_attended ? 'bg-[var(--sq-gold)] text-[var(--sq-ink)]' : 'bg-[var(--sq-success)] text-white'}`}>
                          <Check className="h-3 w-3 stroke-[3.5]" />
                        </div>
                      </div>
                      <p className="truncate text-[10px] font-bold text-[var(--sq-text-muted)]">{att.display_name || att.username}</p>
                    </Link>
                  </motion.div>
                ))}
                {is_creator && (
                  <div className="w-16 text-center">
                    <button onClick={() => setShowInvitePopup(true)} className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[var(--sq-ember-500)] text-[var(--sq-ember-400)] hover:bg-[var(--sq-ember-500)]/10 active:scale-95 transition-all cursor-pointer">
                      <Plus className="h-6 w-6 stroke-[3]" />
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--sq-ember-400)]">Invite</p>
                  </div>
                )}
              </div>
              {is_creator && data.invited && data.invited.length > data.attendee_count && (
                <div className="mt-3 border-t border-[var(--sq-hairline)] pt-3 text-center text-xs font-medium text-[var(--sq-text-faint)]">
                  + {data.invited.length - data.attendee_count} pending invites
                </div>
              )}
            </div>

            {is_creator && (
              <div className="rounded-[var(--sq-r-lg)] border border-[var(--sq-heart)]/25 bg-[var(--sq-card)] p-4">
                <AnimatePresence mode="wait">
                  {!showDeleteConfirm ? (
                    <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(true)} className="flex w-full items-center justify-center gap-2 rounded-[var(--sq-r-md)] bg-[var(--sq-heart)]/10 py-3 font-bold text-[var(--sq-heart)] hover:bg-[var(--sq-heart)]/20 transition-colors">
                      <Trash2 className="h-4 w-4" /> Delete Quest
                    </motion.button>
                  ) : (
                    <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      <p className="text-center text-sm font-bold text-[var(--sq-heart)]">Delete this quest? This cannot be undone.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-[var(--sq-r-md)] bg-[var(--sq-surface)] py-3 font-bold text-[var(--sq-text-muted)] hover:bg-[var(--sq-card-hover)] transition-colors">Cancel</button>
                        <button onClick={async () => { const { error } = await supabase.from('quests').delete().eq('id', quest.id); if (!error) window.location.href = '/quests'; else alert('Error deleting quest: ' + error.message) }} className="flex-1 rounded-[var(--sq-r-md)] bg-[var(--sq-heart)] py-3 font-bold text-white shadow-md transition-colors">Confirm</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* CHAT */}
        {tab === 'chat' && (
          <div className="h-full overflow-y-auto p-4">
            <QuestChat questId={quest.id} isParticipant={isParticipant} previewOnly={false} />
          </div>
        )}
      </div>

      {/* ── Action bar ── */}
      <div className="shrink-0 border-t border-[var(--sq-hairline)] bg-[var(--sq-surface)] p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {showCheckIn && !user_attended && primaryPursuit && (
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sq-text-faint)]">Check in to earn:</span>
            <span className="flex items-center gap-1 text-[11px] font-extrabold" style={{ color: primaryPursuit.color }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: primaryPursuit.color }} />
              {primaryPursuit.noun} +{XP_REWARDS.checkinPrimary} XP
            </span>
            <span className="flex items-center gap-1 text-[11px] font-extrabold" style={{ color: discoveryPursuit.color }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: discoveryPursuit.color }} />
              {discoveryPursuit.noun} +{XP_REWARDS.pioneerBonus} XP <span className="font-medium text-[var(--sq-text-faint)]">(if first visit)</span>
            </span>
            {secondaryPursuit && (
              <span className="flex items-center gap-1 text-[11px] font-extrabold" style={{ color: secondaryPursuit.color }}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: secondaryPursuit.color }} />
                {secondaryPursuit.noun} +{XP_REWARDS.checkinSecondary} XP
              </span>
            )}
          </div>
        )}
        <div className="flex gap-3">
          {showCheckIn && (
            <CheckInButton
              questId={quest.id}
              initialCheckedIn={user_attended}
              category={quest.category}
              vibe={quest.vibe}
              creatorId={creator.id}
              isFellowshipEligible={quest.privacy === 'group' || quest.is_group_quest || quest.max_party_size >= 3 || (attendees && attendees.length >= 3)}
              locationName={location?.name}
              questName={quest?.name}
              onSuccess={() => { refetch() }}
            />
          )}
          <RSVPButton questId={quest.id} currentStatus={my_status} isCreator={is_creator} />
        </div>
      </div>

      {/* ── Streak recovery banner ── */}
      <AnimatePresence>
        {profile && (profile as any).current_streak === 0 && (profile as any).previous_streak > 0 && (profile as any).lives > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-[96px] left-4 right-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-2xl border border-[var(--sq-heart)]/30 bg-gradient-to-r from-[var(--sq-heart)]/95 to-[var(--sq-ember-500)]/95 p-3 text-white shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5">
              <Heart className="h-5 w-5 shrink-0 animate-pulse fill-current text-red-100" />
              <div className="text-left">
                <p className="text-[11px] font-black uppercase leading-none tracking-wider text-red-100">Streak Broken! 💔</p>
                <p className="mt-0.5 text-[10px] leading-tight opacity-90">Revive your {(profile as any).previous_streak}-day flame with 1 Life.</p>
              </div>
            </div>
            <button
              onClick={async () => { try { const { data: rd, error } = await supabase.rpc('restore_streak_with_life' as any); if (error) throw error; if (rd && (rd as any).success) { await useAuthStore.getState().fetchProfile(profile.id) } } catch (e) { console.error(e) } }}
              className="shrink-0 cursor-pointer rounded-xl bg-white px-3.5 py-1.5 text-[10px] font-black text-[var(--sq-heart)] shadow-md active:scale-95"
            >
              RESTORE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invite friends modal ── */}
      <AnimatePresence>
        {showInvitePopup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInvitePopup(false)} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 350, damping: 28 }} className="fixed bottom-0 left-0 right-0 z-[101] flex max-h-[80vh] flex-col rounded-t-3xl border-t border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] p-6 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
              <div className="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-[var(--sq-hairline-strong)]" />
              <h3 className="mb-6 shrink-0 text-center text-xl font-black text-[var(--sq-text)]">Invite Friends</h3>
              <div className="flex-1 space-y-3 overflow-y-auto pb-4">
                {friendsLoading ? (
                  <div className="py-8 text-center text-xs font-bold text-[var(--sq-text-faint)]">Loading friends...</div>
                ) : friendsList.length === 0 ? (
                  <div className="py-8 text-center text-xs font-bold text-[var(--sq-text-faint)]">You don't have any friends yet!</div>
                ) : (
                  friendsList.map((friend) => {
                    const isAttending = attendees?.some((att: any) => att.user_id === friend.id)
                    const isInvited = data.invited?.some((inv: any) => inv.user_id === friend.id)
                    return (
                      <div key={friend.id} className="flex items-center justify-between rounded-2xl border border-[var(--sq-hairline)] bg-[var(--sq-card)] p-3.5">
                        <div className="flex items-center gap-3">
                          <img src={friend.avatar_url || ''} alt="" className="h-10 w-10 rounded-full border border-[var(--sq-hairline)] bg-[var(--sq-surface)] object-cover" />
                          <div>
                            <h4 className="text-sm font-bold text-[var(--sq-text)]">@{friend.username}</h4>
                            <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[var(--sq-text-faint)]">Level {friend.level}</p>
                          </div>
                        </div>
                        {isAttending ? (
                          <span className="rounded-xl bg-[var(--sq-success)]/15 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[var(--sq-success)]">Going</span>
                        ) : isInvited ? (
                          <span className="rounded-xl bg-[var(--sq-gold)]/15 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[var(--sq-gold-soft)]">Pending</span>
                        ) : (
                          <button
                            disabled={invitingState[friend.id] === 'sending' || invitingState[friend.id] === 'sent'}
                            onClick={async () => {
                              setInvitingState((prev) => ({ ...prev, [friend.id]: 'sending' }))
                              const { error } = await supabase.from('quest_invites').insert({ quest_id: quest.id, user_id: friend.id, status: 'pending' })
                              if (!error) { setInvitingState((prev) => ({ ...prev, [friend.id]: 'sent' })); refetch() }
                              else { setInvitingState((prev) => ({ ...prev, [friend.id]: 'error' })); alert('Error sending invite: ' + (error.message || 'Check your RLS policy.')) }
                            }}
                            className={`cursor-pointer rounded-xl px-4 py-1.5 text-xs font-black shadow-md active:scale-95 transition-all ${
                              invitingState[friend.id] === 'sending' ? 'cursor-not-allowed bg-[var(--sq-surface)] text-[var(--sq-text-faint)]'
                              : invitingState[friend.id] === 'sent' ? 'cursor-not-allowed bg-[var(--sq-success)]/15 text-[var(--sq-success)]'
                              : invitingState[friend.id] === 'error' ? 'bg-[var(--sq-heart)] text-white'
                              : 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] hover:bg-[var(--sq-ember-400)]'
                            }`}
                          >
                            {invitingState[friend.id] === 'sending' ? 'Sending...' : invitingState[friend.id] === 'sent' ? 'Sent!' : invitingState[friend.id] === 'error' ? 'Retry' : 'Invite'}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              <button onClick={() => setShowInvitePopup(false)} className="w-full shrink-0 cursor-pointer rounded-2xl bg-[var(--sq-card)] py-4 text-base font-extrabold text-[var(--sq-text-muted)] hover:bg-[var(--sq-card-hover)] active:scale-95 transition-all">
                Done
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
