import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useFriends, usePendingRequests, useRespondToRequest } from '../hooks/useFriends'
import { useMapGroupsStore } from '../stores/mapGroupsStore'
import { FriendCard } from '../components/social/FriendCard'
import { UserSearchCard } from '../components/social/UserSearchCard'
import { useAuthStore } from '../stores/auth'
import { BannerRibbon } from '../components/campfire/CampfireComponents'
import { 
  SearchIcon, 
  StreakFlameIcon, 
  CrewIcon, 
  PlusIcon, 
  ChevronLeftIcon, 
  CheckIcon,
  UploadIcon,
  ScissorsIcon,
  ZoomInIcon,
  ZoomOutIcon,
  CompassIcon,
  FriendsIcon
} from '../components/icons'

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      // Fallback below
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const generateGroupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

type Tab = 'friends' | 'groups' | 'requests' | 'find'

export function FriendsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('friends')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab') as Tab
    if (tabParam && ['friends', 'groups', 'requests', 'find'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  return (
    <div data-theme="ember" className="min-h-[100dvh] bg-background text-foreground transition-colors duration-300 pb-24 w-full">
      <header className="sticky top-0 z-40 bg-[var(--sq-bg)] border-b border-[var(--sq-hairline-strong)] pt-safe transition-colors duration-300">
        <div className="max-w-md mx-auto">
          <BannerRibbon title="Social" />
          
          <div className="flex p-1 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-full mx-4 mb-4 gap-1">
            <TabButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} label="Friends" />
            <TabButton active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} label="Groups" />
            <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="Requests" badge />
            <TabButton active={activeTab === 'find'} onClick={() => setActiveTab('find')} label="Find" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'friends' && <FriendsTab key="friends" onGoFind={() => setActiveTab('find')} />}
          {activeTab === 'groups' && <GroupsTab key="groups" />}
          {activeTab === 'requests' && <RequestsTab key="requests" />}
          {activeTab === 'find' && <FindTab key="find" />}
        </AnimatePresence>
      </main>
    </div>
  )
}

function TabButton({ active, onClick, label, badge }: { active: boolean, onClick: () => void, label: string, badge?: boolean }) {
  const { count } = usePendingRequests()
  
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-full transition-all cursor-pointer relative ${
        active 
          ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] scale-105' 
          : 'text-[var(--sq-text-muted)] hover:text-[var(--sq-text)]'
      }`}
    >
      <div className="flex items-center justify-center gap-1.5">
        {label}
        {badge && count > 0 && (
          <span className="bg-[var(--sq-heart)] text-[var(--sq-keyline)] text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-[var(--sq-keyline)] font-black">
            {count}
          </span>
        )}
      </div>
    </button>
  )
}

function FriendsTab({ onGoFind }: { onGoFind: () => void }) {
  const { data: friends, isLoading } = useFriends()

  if (isLoading) return (
    <div className="p-8 flex justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--sq-ember-500)] border-t-transparent rounded-full" />
    </div>
  )

  if (!friends || friends.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-8 shadow-[var(--sq-shadow-soft)] text-center max-w-sm mx-auto mt-8 relative"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none rounded-[var(--sq-r-lg)]" />
        <div className="w-20 h-20 bg-[var(--sq-surface)] border-4 border-[var(--sq-keyline)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[var(--sq-shadow-sticker)]">
          <FriendsIcon size={44} active={true} withShadow={false} />
        </div>
        <h2 className="text-lg font-extrabold text-[var(--sq-text)] mb-2">No friends yet</h2>
        <p className="text-xs text-[var(--sq-text-muted)] mb-6 leading-relaxed">
          Adventure is better together. Find your friends and start questing!
        </p>
        <button 
          onClick={onGoFind} 
          className="w-full py-3 bg-[var(--sq-ember-500)] hover:bg-[var(--sq-ember-600)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold uppercase tracking-wider rounded-full active:scale-95 transition-all cursor-pointer"
        >
          Find Friends
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col gap-3 pb-6"
    >
      {friends.map((friend, i) => (
        <motion.div 
          key={friend.id} 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: i * 0.04 }}
        >
          {/* Mock isOnline to false for now, would sync with Realtime presence */}
          <FriendCard friend={friend} isOnline={false} />
        </motion.div>
      ))}
    </motion.div>
  )
}

function RequestsTab() {
  const { requests, isLoading } = usePendingRequests()
  const { mutate: respond } = useRespondToRequest()

  if (isLoading) return (
    <div className="p-8 flex justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--sq-ember-500)] border-t-transparent rounded-full" />
    </div>
  )

  if (requests.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="p-8 text-center text-[var(--sq-text-muted)] font-bold mt-8"
      >
        No pending requests.
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 pb-6">
      <AnimatePresence>
        {requests.map((req) => (
          <motion.div 
            key={req.friendship_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, overflow: 'hidden' }}
            className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-4 shadow-[var(--sq-shadow-soft)] relative"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
              {req.avatar_url ? (
                <img 
                  src={req.avatar_url} 
                  alt={req.username} 
                  className="w-12 h-12 rounded-[var(--sq-r-md)] object-cover border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" 
                />
              ) : (
                <div className="w-12 h-12 rounded-[var(--sq-r-md)] bg-[var(--sq-surface)] border-2 border-[var(--sq-keyline)] text-[var(--sq-ember-300)] flex items-center justify-center font-black text-lg shadow-[var(--sq-shadow-sticker)] uppercase">
                  {(req.display_name?.[0] || req.username[0]).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-extrabold text-sm text-[var(--sq-text)]">{req.display_name || req.username}</h3>
                <p className="text-xs text-[var(--sq-text-muted)] mt-0.5">@{req.username}</p>
              </div>
            </div>
            <div className="flex gap-2.5 relative z-10">
              <button 
                onClick={() => respond({ friendshipId: req.friendship_id, requesterId: req.user_id, action: 'accept' })}
                className="flex-1 py-2.5 bg-[var(--sq-sage-500)] hover:bg-[var(--sq-sage-600)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold uppercase tracking-wider rounded-full active:scale-95 transition-all cursor-pointer text-xs"
              >
                Accept
              </button>
              <button 
                onClick={() => respond({ friendshipId: req.friendship_id, requesterId: req.user_id, action: 'decline' })}
                className="flex-1 py-2.5 bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] text-[var(--sq-text-muted)] border-2 border-[var(--sq-hairline-strong)] font-extrabold uppercase tracking-wider rounded-full active:scale-95 transition-all cursor-pointer text-xs"
              >
                Decline
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

function FindTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setSearching(true)
        const { data } = await supabase.rpc('search_users' as any, { search_term: query })
        setResults((data as any[]) || [])
        setSearching(false)
      } else {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
      <div className="relative">
        <div className="absolute left-4 top-3 z-10 flex items-center justify-center h-8">
          <SearchIcon size={22} withShadow={false} />
        </div>
        <input 
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-full py-3.5 pl-12 pr-12 text-[var(--sq-text)] font-semibold placeholder-[var(--sq-text-faint)] focus:outline-none focus:border-[var(--sq-ember-500)] transition-colors text-sm"
        />
        {searching && (
          <div className="absolute right-4 top-4 w-5 h-5 border-2 border-[var(--sq-ember-500)] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <div className="flex flex-col gap-3 pb-6">
        <AnimatePresence>
          {results.map((user) => (
            <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UserSearchCard user={user} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {query.length >= 2 && results.length === 0 && !searching && (
          <div className="p-8 text-center text-[var(--sq-text-muted)] font-bold bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)]">
            No users found matching "{query}"
          </div>
        )}
      </div>
    </motion.div>
  )
}

function GroupsTab() {
  const { user } = useAuthStore()
  const { hiddenGroupIds, toggleGroupVisibility } = useMapGroupsStore()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { data: friendsList = [] } = useFriends()

  // Creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupType, setGroupType] = useState('Social')
  const [groupColor, setGroupColor] = useState('#6C63FF')
  const [crewAvatarUrl, setCrewAvatarUrl] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [inviteSearchQuery, setInviteSearchQuery] = useState('')
  const [inviteOverlaySearchQuery, setInviteOverlaySearchQuery] = useState('')

  // Join state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  // Cropper states
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [cropZoom, setCropZoom] = useState(1.0)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile Details state
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null)
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<any | null>(null)
  const [groupMembersList, setGroupMembersList] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [showInviteOverlay, setShowInviteOverlay] = useState(false)

  const presetColors = ['#58CC02', '#6C63FF', '#FF6B6B', '#FFD93D', '#3498DB', '#E67E22']
  const groupTypes = ['Social', 'Outdoors', 'Fitness', 'Nightlife', 'Culture', 'Casual', 'Competitive']

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_my_streaks')
      if (error) throw error
      setGroups(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  // Fetch full details and members when a group is selected
  useEffect(() => {
    if (!selectedGroup) {
      setSelectedGroupDetails(null)
      setGroupMembersList([])
      return
    }

    const fetchDetailsAndMembers = async () => {
      try {
        setLoadingMembers(true)
        
        // 1. Get group metadata (xp, level, group_type, description)
        const { data: details } = await supabase
          .from('quest_groups')
          .select('group_type, xp, level, description, created_by')
          .eq('id', selectedGroup.group_id)
          .single()
        
        setSelectedGroupDetails(details)

        // 2. Get members
        const { data: members } = await supabase
          .from('group_members')
          .select(`
            user_id,
            role,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url,
              level
            )
          `)
          .eq('group_id', selectedGroup.group_id)

        if (members) {
          setGroupMembersList(members.map((m: any) => ({
            ...m.profiles,
            role: m.role
          })))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchDetailsAndMembers()
  }, [selectedGroup])

  const handlePerformCrop = async () => {
    if (!cropImage || !user) return
    setUploading(true)
    const srcToCrop = cropImage
    setCropImage(null)

    try {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
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

      const previewSize = 256
      const ratio = targetSize / previewSize

      ctx.save()
      ctx.translate(targetSize / 2, targetSize / 2)
      ctx.translate(cropOffset.x * ratio, cropOffset.y * ratio)
      ctx.scale(cropZoom, cropZoom)

      const imgRatio = img.naturalWidth / img.naturalHeight
      let drawW = previewSize
      let drawH = previewSize

      if (imgRatio > 1) {
        drawW = previewSize
        drawH = previewSize / imgRatio
      } else {
        drawH = previewSize
        drawW = previewSize * imgRatio
      }

      const finalW = drawW * ratio
      const finalH = drawH * ratio

      ctx.drawImage(img, -finalW / 2, -finalH / 2, finalW, finalH)
      ctx.restore()

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setUploading(false)
          return
        }

        try {
          const fileName = `${user.id}/group-avatar-${Date.now()}.png`
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, blob, { 
              contentType: 'image/png',
              upsert: true 
            })

          if (uploadError) throw uploadError

          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
          setCrewAvatarUrl(data.publicUrl)
        } catch (err: any) {
          console.error(err)
        } finally {
          setUploading(false)
        }
      }, 'image/png')

    } catch (err: any) {
      console.error(err)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = () => {
      setCropImage(reader.result as string)
      setCropZoom(1.0)
      setCropOffset({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return

    try {
      setCreating(true)
      const groupId = generateUUID()
      const groupCode = generateGroupCode()
      
      // 1. Insert the quest group
      const { error: groupErr } = await supabase
        .from('quest_groups')
        .insert({
          id: groupId,
          name: groupName.trim(),
          description: groupDesc.trim() || null,
          group_color: groupColor,
          avatar_url: crewAvatarUrl || null,
          group_type: groupType,
          group_code: groupCode,
          xp: 0,
          level: 1,
          created_by: user?.id,
          streak: 0,
          longest_streak: 0,
          member_count: 1 + selectedFriends.length
        } as any)

      if (groupErr) throw groupErr

      // 2. Insert creator into group members
      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user?.id || '',
          role: 'creator'
        })

      if (memberErr) throw memberErr

      // 3. Insert other selected friends
      if (selectedFriends.length > 0) {
        const inserts = selectedFriends.map(friendId => ({
          group_id: groupId,
          user_id: friendId,
          role: 'member'
        }))
        const { error: membersErr } = await supabase
          .from('group_members')
          .insert(inserts)
        if (membersErr) throw membersErr
      }

      setGroupName('')
      setGroupDesc('')
      setCrewAvatarUrl('')
      setSelectedFriends([])
      setInviteSearchQuery('')
      setIsCreateModalOpen(false)
      fetchGroups()
    } catch (err: any) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) {
      setJoinError('Code must be exactly 6 characters.')
      return
    }

    try {
      setJoining(true)
      setJoinError(null)

      // 1. Fetch group by code
      const { data: group, error: fetchErr } = await supabase
        .from('quest_groups')
        .select('id, name, member_count')
        .eq('group_code', code)
        .maybeSingle()

      if (fetchErr) throw fetchErr
      if (!group) {
        setJoinError('No Group found with that code.')
        return
      }

      // 2. Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', group.id)
        .eq('user_id', user?.id || '')
        .maybeSingle()

      if (existingMember) {
        setJoinError('You are already a member of this Group!')
        return
      }

      // 3. Insert membership
      const { error: joinErr } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user?.id || '',
          role: 'member'
        })

      if (joinErr) throw joinErr

      // 4. Update member count
      await supabase
        .from('quest_groups')
        .update({ member_count: (group.member_count || 0) + 1 } as any)
        .eq('id', group.id)

      setJoinCode('')
      setIsJoinModalOpen(false)
      fetchGroups()
    } catch (err: any) {
      console.error(err)
      setJoinError(err.message || 'Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  const handleInviteFriendToGroup = async (friendId: string) => {
    if (!selectedGroup) return
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: selectedGroup.group_id,
          user_id: friendId,
          role: 'member'
        })
      if (error) throw error
      
      // Refresh member list
      const { data: members } = await supabase
        .from('group_members')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            level
          )
        `)
        .eq('group_id', selectedGroup.group_id)

      if (members) {
        setGroupMembersList(members.map((m: any) => ({
          ...m.profiles,
          role: m.role
        })))
      }
      setShowInviteOverlay(false)
      fetchGroups()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--sq-ember-500)] border-t-transparent rounded-full" />
      </div>
    )
  }

  const isCreatorOfSelectedGroup = selectedGroupDetails?.created_by === user?.id
  const nonGroupFriends = friendsList.filter(f => !groupMembersList.some(m => m.id === f.id))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 pb-6">
      
      {/* Create & Join Buttons side by side */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-4 bg-[var(--sq-surface)] border-2 border-dashed border-[var(--sq-ember-500)] text-[var(--sq-ember-300)] hover:bg-[var(--sq-card-hover)] font-black rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-2xl" />
          <PlusIcon size={18} withShadow={false} />
          Assemble Group
        </button>
        <button
          onClick={() => setIsJoinModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-4 bg-[var(--sq-surface)] border-2 border-dashed border-[var(--sq-sage-500)] text-[var(--sq-sage-500)] hover:bg-[var(--sq-card-hover)] font-black rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-2xl" />
          <CrewIcon size={18} withShadow={false} />
          Join with Code
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-8 shadow-[var(--sq-shadow-soft)] text-center mt-6 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.04] pointer-events-none rounded-[var(--sq-r-lg)]" />
          <div className="w-20 h-20 bg-[var(--sq-surface)] border-4 border-[var(--sq-keyline)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[var(--sq-shadow-sticker)]">
            <CrewIcon size={44} active={true} withShadow={false} />
          </div>
          <h2 className="text-lg font-bold text-[var(--sq-text)] mb-2">No Groups joined yet</h2>
          <p className="text-xs text-[var(--sq-text-muted)] leading-relaxed">
            Assemble your first group above to start questing together!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group, i) => {
            const isVisible = !hiddenGroupIds.includes(group.group_id)
            
            return (
              <motion.div 
                key={group.group_id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-855 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:bg-[var(--sq-card-hover)] hover:shadow-md transition-all cursor-pointer relative"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-2xl" />

                <div className="flex items-center gap-3 relative z-10">
                  {group.group_avatar ? (
                    <img 
                      src={group.group_avatar} 
                      className="w-10 h-10 rounded-[var(--sq-r-md)] object-cover border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" 
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-[var(--sq-r-md)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] flex items-center justify-center text-white font-black text-lg"
                      style={{ backgroundColor: group.group_color || 'var(--sq-sage-500)' }}
                    >
                      {group.group_name[0].toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h3 className="font-extrabold text-[var(--sq-text)] text-sm leading-tight">
                      {group.group_name}
                      {group.group_code && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-bold ml-1.5">
                          #{group.group_code}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-450 font-semibold flex items-center gap-1 mt-0.5">
                      <CrewIcon size={14} withShadow={false} />
                      {group.member_count} members
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 relative z-10" onClick={e => e.stopPropagation()}>
                  {/* Flame Streak Badge */}
                  {group.current_streak > 0 && (
                    <div className="flex items-center gap-0.5 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">
                      <StreakFlameIcon size={14} active={true} withShadow={false} />
                      <span>{group.current_streak}</span>
                    </div>
                  )}

                  {/* Map Visibility Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-405 uppercase">Map</span>
                    <button
                      onClick={() => toggleGroupVisibility(group.group_id)}
                      className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                        isVisible ? 'bg-[var(--sq-ember-500)] border border-[var(--sq-keyline)] shadow' : 'bg-[var(--sq-surface)] border border-[var(--sq-hairline-strong)]'
                      }`}
                    >
                      <motion.div
                        layout
                        className="w-5.5 h-5.5 bg-[var(--sq-keyline)] border border-[var(--sq-ink)] rounded-full shadow-md"
                        animate={{ x: isVisible ? 18 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
      {/* Assemble a New Group Modal */}
      <Portal>
        <AnimatePresence>
          {isCreateModalOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.55 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreateModalOpen(false)}
                className="fixed inset-0 z-[140] bg-[#1E140E]/80 backdrop-blur-sm pointer-events-auto"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[140] max-w-md bg-[var(--sq-card)] rounded-3xl shadow-2xl p-6 border border-[var(--sq-hairline-strong)] max-h-[85vh] overflow-y-auto"
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-3xl" />
                
                <h2 className="text-xl font-black text-[var(--sq-text)] flex items-center gap-2 mb-2 relative z-10">
                  <CrewIcon size={24} active={true} withShadow={false} className="text-[var(--sq-ember-500)]" />
                  Assemble Group
                </h2>
                <p className="text-xs font-semibold text-[var(--sq-text-muted)] mb-5 relative z-10 leading-relaxed">
                  Rally your friends to tackle quests together, maintain a unified streak flame, and earn exclusive team rewards!
                </p>

                <form onSubmit={handleCreateGroupSubmit} className="space-y-4 relative z-10">
                  <div className="flex flex-col items-center gap-2.5 mb-6">
                    {/* Group Icon Circular Selector */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-24 h-24 rounded-[var(--sq-r-lg)] border-4 border-dashed border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden group hover:border-[var(--sq-ember-500)]/50 transition-colors shadow-inner"
                      style={crewAvatarUrl ? { borderStyle: 'solid', borderColor: groupColor } : {}}
                    >
                      {crewAvatarUrl ? (
                        <img src={crewAvatarUrl} alt="Group Icon Preview" className="w-full h-full object-cover border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" />
                      ) : (
                        <>
                          <UploadIcon size={24} withShadow={false} />
                          <span className="text-[9px] font-black text-[var(--sq-text-muted)] uppercase tracking-wide mt-1">Upload Pic</span>
                        </>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-black text-[var(--sq-ember-300)] hover:text-[var(--sq-ember-400)] active:scale-95 transition-all"
                    >
                      {crewAvatarUrl ? 'Change Photo' : 'Choose Group Icon'}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">
                      Group Name
                    </label>
                    <input
                      type="text"
                      required
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Taco Tuesday Alliance"
                      className="w-full px-4 py-3 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-[var(--sq-r-md)] font-semibold text-[var(--sq-text)] placeholder-[var(--sq-text-faint)] focus:outline-none focus:border-[var(--sq-ember-500)] transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">
                      Group Type
                    </label>
                    <select
                      value={groupType}
                      onChange={(e) => setGroupType(e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-[var(--sq-r-md)] font-semibold text-[var(--sq-text)] focus:outline-none focus:border-[var(--sq-ember-500)] transition-colors text-sm"
                    >
                      {groupTypes.map((type) => (
                        <option key={type} value={type} className="bg-[var(--sq-surface)]">{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">
                      Description / Vibe
                    </label>
                    <textarea
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      placeholder="Describe your group's focus..."
                      rows={2}
                      className="w-full px-4 py-3 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-[var(--sq-r-md)] font-semibold text-[var(--sq-text)] placeholder-[var(--sq-text-faint)] focus:outline-none focus:border-[var(--sq-ember-500)] transition-colors text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">
                      Group Banner Color
                    </label>
                    <div className="flex items-center gap-2.5">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setGroupColor(color)}
                          className={`w-8 h-8 rounded-full transition-transform active:scale-90 ${
                            groupColor === color ? 'ring-4 ring-[var(--sq-ember-500)] ring-offset-2 dark:ring-offset-gray-900 scale-105' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">
                      Invite Friends to Group
                    </label>
                    {friendsList.length === 0 ? (
                      <p className="text-xs text-[var(--sq-text-muted)] italic">No friends available to invite yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Search friends input */}
                        <div className="relative">
                          <div className="absolute left-3.5 top-2.5 z-10 flex items-center justify-center h-6">
                            <SearchIcon size={18} withShadow={false} />
                          </div>
                          <input 
                            type="text"
                            placeholder="Search friends by username..."
                            value={inviteSearchQuery}
                            onChange={(e) => setInviteSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-full font-semibold text-[var(--sq-text)] placeholder-[var(--sq-text-faint)] focus:outline-none focus:border-[var(--sq-ember-500)] transition-colors text-xs"
                          />
                        </div>

                        {/* Avatars Grid Selector */}
                        <div className="max-h-[160px] overflow-y-auto border border-[var(--sq-hairline)] rounded-2xl p-3 bg-[var(--sq-surface)] scrollbar-premium">
                          {friendsList.filter(f => {
                            const query = inviteSearchQuery.toLowerCase()
                            return f.username.toLowerCase().includes(query) || (f.display_name && f.display_name.toLowerCase().includes(query))
                          }).length === 0 ? (
                            <p className="text-xs text-[var(--sq-text-muted)] italic text-center py-4">No friends found matching "{inviteSearchQuery}"</p>
                          ) : (
                            <div className="grid grid-cols-4 gap-2">
                              {friendsList.filter(f => {
                                const query = inviteSearchQuery.toLowerCase()
                                return f.username.toLowerCase().includes(query) || (f.display_name && f.display_name.toLowerCase().includes(query))
                              }).map((friend) => {
                                const isSelected = selectedFriends.includes(friend.id)
                                return (
                                  <button
                                    key={friend.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedFriends(prev => prev.filter(id => id !== friend.id))
                                      } else {
                                        setSelectedFriends(prev => [...prev, friend.id])
                                      }
                                    }}
                                    className="flex flex-col items-center gap-1.5 p-1 rounded-xl relative transition-all active:scale-95 cursor-pointer group"
                                  >
                                    <div className="relative">
                                      {friend.avatar_url ? (
                                        <img 
                                          src={friend.avatar_url} 
                                          alt={friend.username} 
                                          className={`w-11 h-11 rounded-[var(--sq-r-md)] object-cover border-2 transition-all ${
                                            isSelected 
                                              ? 'ring-4 ring-[var(--sq-ember-500)] border-transparent scale-105 shadow-md' 
                                              : 'border-[var(--sq-hairline-strong)] opacity-80'
                                          }`} 
                                        />
                                      ) : (
                                        <div className={`w-11 h-11 rounded-[var(--sq-r-md)] flex items-center justify-center font-black text-sm border-2 transition-all ${
                                          isSelected 
                                            ? 'ring-4 ring-[var(--sq-ember-500)] border-transparent scale-105 shadow-md bg-[var(--sq-ember-500)]/20 text-[var(--sq-ember-300)]' 
                                            : 'bg-[var(--sq-surface)] text-[var(--sq-text-muted)] border-[var(--sq-hairline-strong)] opacity-80'
                                        }`}>
                                          {(friend.display_name?.[0] || friend.username[0]).toUpperCase()}
                                        </div>
                                      )}
                                      
                                      {/* Highlight Selected Badge */}
                                      {isSelected && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] rounded-full flex items-center justify-center w-4.5 h-4.5 shadow border border-[var(--sq-keyline)]">
                                          <CheckIcon size={12} withShadow={false} />
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-bold text-[var(--sq-text)] text-center truncate w-12 leading-tight">
                                      {friend.display_name || friend.username}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="w-1/2 py-3 bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline-strong)] text-[var(--sq-text-muted)] font-extrabold rounded-full active:scale-95 transition-all text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="w-1/2 py-3 bg-[var(--sq-ember-500)] hover:bg-[var(--sq-ember-600)] disabled:opacity-50 text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold rounded-full active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {creating ? (
                        <div className="animate-spin w-4 h-4 border-2 border-[var(--sq-ink)] border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <CheckIcon size={16} withShadow={false} />
                          Assemble
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>

      {/* Join Group Modal */}
      <Portal>
        <AnimatePresence>
          {isJoinModalOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.55 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsJoinModalOpen(false)
                  setJoinCode('')
                  setJoinError(null)
                }}
                className="fixed inset-0 z-[140] bg-[#1E140E]/80 backdrop-blur-sm pointer-events-auto"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[140] max-w-sm bg-[var(--sq-card)] rounded-3xl shadow-2xl p-6 border border-[var(--sq-hairline-strong)]"
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-3xl" />
                
                <h2 className="text-xl font-black text-[var(--sq-text)] flex items-center gap-2 mb-2 relative z-10">
                  <CrewIcon size={24} active={true} withShadow={false} className="text-[var(--sq-sage-500)]" />
                  Join Group
                </h2>
                <p className="text-xs font-semibold text-[var(--sq-text-muted)] mb-5 relative z-10 leading-relaxed">
                  Enter the 6-character unique group code (e.g., ABC123) sent by your friends to join their Group instantly!
                </p>

                <form onSubmit={handleJoinGroup} className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">
                      Group Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. ABC123"
                      className="w-full px-4 py-3 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-[var(--sq-r-md)] font-black tracking-widest text-center text-[var(--sq-text)] placeholder-[var(--sq-text-faint)] focus:outline-none focus:border-[var(--sq-sage-500)] transition-colors text-lg uppercase"
                    />
                  </div>

                  {joinError && (
                    <div className="p-3 text-xs font-semibold bg-red-950/20 text-[var(--sq-heart)] rounded-xl border border-[var(--sq-heart)]/20">
                      {joinError}
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsJoinModalOpen(false)
                        setJoinCode('')
                        setJoinError(null)
                      }}
                      className="w-1/2 py-3 bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline-strong)] text-[var(--sq-text-muted)] font-extrabold rounded-full active:scale-95 transition-all text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={joining}
                      className="w-1/2 py-3 bg-[var(--sq-sage-500)] hover:bg-[var(--sq-sage-600)] disabled:opacity-50 text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold rounded-full active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {joining ? (
                        <div className="animate-spin w-4 h-4 border-2 border-[var(--sq-ink)] border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <CheckIcon size={16} withShadow={false} />
                          Join Group
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>

      {/* Image Cropper dedicated full-screen view */}
      <Portal>
        <AnimatePresence>
          {cropImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[150] flex flex-col justify-between bg-[var(--sq-bg)] text-[var(--sq-text)] select-none"
            >
              <div className="w-full flex items-center justify-between px-6 py-5 border-b border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)]/20 backdrop-blur-md">
                <button 
                  type="button" 
                  onClick={() => setCropImage(null)}
                  className="text-[var(--sq-text-muted)] hover:text-[var(--sq-text)] text-sm font-extrabold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-black tracking-tight text-center flex items-center gap-2">
                  <ScissorsIcon size={20} withShadow={false} /> Edit Group Icon
                </h3>
                <div className="w-12" />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 relative min-h-0">
                <div 
                  className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-[var(--sq-ember-500)] shadow-[var(--sq-shadow-glow)] bg-[var(--sq-surface)] cursor-move flex items-center justify-center select-none"
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
                  <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/10 pointer-events-none" />
                  <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/10 pointer-events-none" />
                </div>
                <p className="text-[10px] text-[var(--sq-text-muted)] mt-4 sm:mt-6 tracking-wide uppercase font-black">
                  Drag to Reposition
                </p>
              </div>

              <div className="w-full max-w-md mx-auto px-6 pb-4 sm:pb-8 flex flex-col gap-4 sm:gap-6 bg-gradient-to-t from-[var(--sq-bg)] to-transparent shrink-0">
                <div className="w-full flex flex-col gap-2 bg-[var(--sq-surface)]/40 p-4 rounded-2xl border border-[var(--sq-hairline)]">
                  <div className="flex justify-between items-center text-[10px] text-[var(--sq-text-muted)] font-black px-1">
                    <span>ZOOM LEVEL</span>
                    <span>{Math.round(cropZoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ZoomOutIcon size={16} withShadow={false} />
                    <input 
                      type="range" 
                      min="1.0" 
                      max="3.0" 
                      step="0.05"
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--sq-ember-500)] focus:outline-none bg-[var(--sq-surface)]"
                    />
                    <ZoomInIcon size={16} withShadow={false} />
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    type="button"
                    onClick={() => setCropImage(null)}
                    className="flex-1 border border-[var(--sq-hairline-strong)] hover:bg-[var(--sq-surface)] text-[var(--sq-text-muted)] font-extrabold py-4 rounded-full transition-colors cursor-pointer text-center text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePerformCrop}
                    className="flex-1 bg-[var(--sq-ember-500)] hover:bg-[var(--sq-ember-600)] text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-extrabold py-4 rounded-full transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Group Profile detailed view */}
      <Portal>
        <AnimatePresence>
          {selectedGroup && (
            <motion.div
              initial={{ opacity: 0, y: '10%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '10%' }}
              className="fixed inset-0 z-[100] bg-[var(--sq-bg)] overflow-y-auto pb-10 flex flex-col"
            >
              {/* Header banner */}
              <div 
                className="relative pt-12 pb-6 px-6 shadow-sm shrink-0"
                style={{ background: `linear-gradient(to bottom, ${selectedGroup.group_color || 'var(--sq-sage-500)'}35, transparent)` }}
              >
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="absolute top-4 left-4 p-2.5 rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline)] text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] transition-colors active:scale-95 cursor-pointer"
                >
                  <ChevronLeftIcon size={20} withShadow={false} />
                </button>
                
                <div className="flex flex-col items-center text-center mt-6">
                  {selectedGroup.group_avatar ? (
                    <img src={selectedGroup.group_avatar} className="w-20 h-20 rounded-[var(--sq-r-lg)] object-cover shadow-lg border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" />
                  ) : (
                    <div 
                      className="w-20 h-20 rounded-[var(--sq-r-lg)] flex items-center justify-center text-white font-black text-4xl shadow-lg border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]"
                      style={{ backgroundColor: selectedGroup.group_color || '#6C63FF' }}
                    >
                      {selectedGroup.group_name[0].toUpperCase()}
                    </div>
                  )}
                  
                  <h1 className="mt-3 text-xl font-black text-[var(--sq-text)] tracking-tight">
                    {selectedGroup.group_name}
                    {selectedGroup.group_code && (
                      <span className="text-sm text-[var(--sq-text-muted)] font-extrabold ml-2">
                        #{selectedGroup.group_code}
                      </span>
                    )}
                  </h1>
                  
                  {/* Type Badge */}
                  {selectedGroupDetails?.group_type && (
                    <span className="mt-1.5 px-3 py-1 bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] text-[10px] font-black tracking-wider uppercase rounded-full">
                      {selectedGroupDetails.group_type} Group
                    </span>
                  )}
                </div>
              </div>

              {/* Content card body */}
              <div className="flex-1 max-w-md mx-auto w-full px-4 space-y-5">
                
                {/* Group Description */}
                {selectedGroupDetails?.description && (
                  <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
                    <h4 className="text-[10px] font-black uppercase text-[var(--sq-text-muted)] tracking-wider mb-1.5">About the Group</h4>
                    <p className="text-sm font-semibold text-[var(--sq-text)] leading-relaxed relative z-10">{selectedGroupDetails.description}</p>
                  </div>
                )}

                {/* Group Experience / Level Progression */}
                {selectedGroupDetails && (
                  <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
                    <div className="flex justify-between items-end mb-3 relative z-10">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-[var(--sq-text-muted)] tracking-wider">Group Progression</h4>
                        <p className="text-xs text-[var(--sq-text)] font-bold mt-1">Level {selectedGroupDetails.level || 1}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-[var(--sq-ember-300)]">
                          {(selectedGroupDetails.xp || 0) % 100} / 100 XP
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-[var(--sq-surface)] rounded-full overflow-hidden relative z-10">
                      <div 
                        className="h-full rounded-full bg-[var(--sq-ember-500)]"
                        style={{ width: `${(selectedGroupDetails.xp || 0) % 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-[var(--sq-text-muted)] mt-2 block text-center relative z-10 flex items-center justify-center gap-0.5">
                      Gains XP from Quest completions together! 
                      <CompassIcon size={12} active={true} withShadow={false} className="inline-block" />
                    </span>
                  </div>
                )}

                {/* Group Members List */}
                <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] relative space-y-3">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--sq-hairline-strong)] relative z-10">
                    <h3 className="font-extrabold text-sm text-[var(--sq-text)] flex items-center gap-1.5">
                      <CrewIcon size={16} active={true} withShadow={false} className="text-[var(--sq-ember-500)]" /> Members ({groupMembersList.length})
                    </h3>
                    {isCreatorOfSelectedGroup && (
                      <button
                        onClick={() => setShowInviteOverlay(true)}
                        className="text-xs font-black text-[var(--sq-ember-300)] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        + Invite Friend
                      </button>
                    )}
                  </div>

                  {loadingMembers ? (
                    <div className="py-6 flex justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-[var(--sq-ember-500)] border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-3 relative z-10">
                      {groupMembersList.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-2 border-b border-[var(--sq-hairline-strong)]/30 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0 border border-[var(--sq-keyline)]" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[var(--sq-surface)] text-[var(--sq-ember-300)] flex items-center justify-center text-xs font-bold shrink-0 border border-[var(--sq-hairline)]">
                                {(member.display_name?.[0] || member.username[0]).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-[var(--sq-text)] truncate leading-tight">
                                {member.display_name || member.username}
                              </p>
                              <p className="text-[9px] text-[var(--sq-text-muted)] font-bold truncate">@{member.username}</p>
                            </div>
                          </div>

                          <span className="text-[8px] font-black uppercase text-[var(--sq-text-muted)] px-1.5 py-0.5 rounded bg-[var(--sq-surface)] border border-[var(--sq-hairline-strong)]">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Invite Member overlay */}
      <Portal>
        <AnimatePresence>
          {showInviteOverlay && (
            <>
              <div 
                className="fixed inset-0 z-[110] bg-[#1E140E]/80 backdrop-blur-sm pointer-events-auto"
                onClick={() => {
                  setShowInviteOverlay(false)
                  setInviteOverlaySearchQuery('')
                }}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[120] max-w-sm bg-[var(--sq-card)] rounded-3xl p-6 border border-[var(--sq-hairline-strong)] space-y-4 shadow-2xl"
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-3xl" />
                
                <div className="flex justify-between items-center pb-2 border-b border-[var(--sq-hairline-strong)] relative z-10">
                  <h3 className="font-extrabold text-sm text-[var(--sq-text)]">Invite Friends to Group</h3>
                  <button 
                    onClick={() => {
                      setShowInviteOverlay(false)
                      setInviteOverlaySearchQuery('')
                    }} 
                    className="text-xs text-[var(--sq-text-muted)] font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {nonGroupFriends.length > 0 && (
                  <div className="relative z-10">
                    <div className="absolute left-3 top-2 z-10 flex items-center justify-center h-6">
                      <SearchIcon size={18} withShadow={false} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Search friends by username..."
                      value={inviteOverlaySearchQuery}
                      onChange={(e) => setInviteOverlaySearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-full font-semibold text-[var(--sq-text)] placeholder-[var(--sq-text-faint)] focus:outline-none focus:border-[var(--sq-ember-500)] transition-colors text-xs"
                    />
                  </div>
                )}

                <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 relative z-10 scrollbar-premium">
                  {nonGroupFriends.length === 0 ? (
                    <p className="text-xs text-[var(--sq-text-muted)] italic text-center py-6">All your friends are already in this group!</p>
                  ) : nonGroupFriends.filter(f => {
                    const query = inviteOverlaySearchQuery.toLowerCase()
                    return f.username.toLowerCase().includes(query) || (f.display_name && f.display_name.toLowerCase().includes(query))
                  }).length === 0 ? (
                    <p className="text-xs text-[var(--sq-text-muted)] italic text-center py-6">No friends found matching "{inviteOverlaySearchQuery}"</p>
                  ) : (
                    nonGroupFriends.filter(f => {
                      const query = inviteOverlaySearchQuery.toLowerCase()
                      return f.username.toLowerCase().includes(query) || (f.display_name && f.display_name.toLowerCase().includes(query))
                    }).map((friend) => (
                      <div 
                        key={friend.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--sq-surface)] cursor-pointer transition-colors"
                        onClick={() => {
                          handleInviteFriendToGroup(friend.id)
                          setInviteOverlaySearchQuery('')
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} className="w-7 h-7 rounded-full object-cover border border-[var(--sq-keyline)]" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[var(--sq-surface)] text-[var(--sq-ember-300)] flex items-center justify-center text-xs font-bold border border-[var(--sq-hairline)]">
                              {(friend.display_name?.[0] || friend.username[0]).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-bold text-[var(--sq-text)]">
                            {friend.display_name || friend.username}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-[var(--sq-ember-300)] uppercase">Add</span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>

    </motion.div>
  )
}
