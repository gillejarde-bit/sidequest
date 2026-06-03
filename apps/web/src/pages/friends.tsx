import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Flame, Loader2, Users, Plus, ChevronLeft, Scissors, ZoomIn, ZoomOut, Upload, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useFriends, usePendingRequests, useRespondToRequest } from '../hooks/useFriends'
import { useMapGroupsStore } from '../stores/mapGroupsStore'
import { FriendCard } from '../components/social/FriendCard'
import { UserSearchCard } from '../components/social/UserSearchCard'
import { useAuthStore } from '../stores/auth'

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
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 pt-safe transition-colors duration-300">
        <h1 className="text-2xl font-black px-6 py-4 text-gray-900 dark:text-white">Social</h1>
        
        <div className="flex px-4 relative">
          <TabButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} label="Friends" />
          <TabButton active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} label="Groups" />
          <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="Requests" badge />
          <TabButton active={activeTab === 'find'} onClick={() => setActiveTab('find')} label="Find" />
        </div>
      </header>

      <main className="max-w-md mx-auto">
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
      className={`flex-1 pb-4 relative text-sm font-bold transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}
    >
      <div className="flex items-center justify-center gap-1.5">
        {label}
        {badge && count > 0 && (
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {count}
          </span>
        )}
      </div>
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  )
}

function FriendsTab({ onGoFind }: { onGoFind: () => void }) {
  const { data: friends, isLoading } = useFriends()

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  if (!friends || friends.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center mt-12">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👥</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No friends yet</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Adventure is better together. Find your friends and start questing!</p>
        <button onClick={onGoFind} className="bg-primary text-white font-bold py-3 px-8 rounded-full hover:bg-primary-hover active:scale-95 transition-all">
          Find Friends →
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-900 transition-colors duration-300">
      {friends.map((friend, i) => (
        <motion.div key={friend.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
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

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  if (requests.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-gray-500 mt-8">
        No pending requests.
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
      <AnimatePresence>
        {requests.map((req) => (
          <motion.div 
            key={req.friendship_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, overflow: 'hidden' }}
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              {req.avatar_url ? (
                <img src={req.avatar_url} alt={req.username} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center font-bold text-lg">
                  {req.username[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white">{req.display_name || req.username}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{req.username}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => respond({ friendshipId: req.friendship_id, requesterId: req.user_id, action: 'accept' })}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-all"
              >
                Accept
              </button>
              <button 
                onClick={() => respond({ friendshipId: req.friendship_id, requesterId: req.user_id, action: 'decline' })}
                className="flex-1 border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 border-0 rounded-2xl py-3 pl-12 pr-4 shadow-sm text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary transition-colors duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        {searching && (
          <div className="absolute right-4 top-3.5 w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <AnimatePresence>
          {results.map((user) => (
            <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UserSearchCard user={user} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {query.length >= 2 && results.length === 0 && !searching && (
          <div className="p-8 text-center text-gray-500">
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
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    )
  }

  const isCreatorOfSelectedGroup = selectedGroupDetails?.created_by === user?.id
  const nonGroupFriends = friendsList.filter(f => !groupMembersList.some(m => m.id === f.id))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-900 transition-colors duration-305 px-4 pt-4 space-y-4">
      
      {/* Create & Join Buttons side by side */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-4 bg-primary/10 border-2 border-dashed border-primary hover:bg-primary/20 text-primary font-black rounded-2xl transition-all cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Assemble Group
        </button>
        <button
          onClick={() => setIsJoinModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-4 bg-secondary/10 border-2 border-dashed border-secondary hover:bg-secondary/20 text-secondary font-black rounded-2xl transition-all cursor-pointer text-xs"
        >
          <Users className="w-4 h-4" strokeWidth={2.5} />
          Join with Code
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="p-8 text-center mt-6">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👥</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Groups joined yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Assemble your first group above to start questing together!</p>
        </div>
      ) : (
        groups.map((group, i) => {
          const isVisible = !hiddenGroupIds.includes(group.group_id)
          
          return (
            <motion.div 
              key={group.group_id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-105 dark:border-gray-700/50 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedGroup(group)}
            >
              <div className="flex items-center gap-3">
                {group.group_avatar ? (
                  <img src={group.group_avatar} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                    style={{ backgroundColor: group.group_color || '#6C63FF' }}
                  >
                    {group.group_name[0].toUpperCase()}
                  </div>
                )}

                <div>
                  <h3 className="font-extrabold text-gray-950 dark:text-white text-sm leading-tight">
                    {group.group_name}
                    {group.group_code && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-bold ml-1.5">
                        #{group.group_code}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 font-semibold flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                    {group.member_count} members
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                {/* Flame Streak Badge */}
                {group.current_streak > 0 && (
                  <div className="flex items-center gap-0.5 bg-orange-100 dark:bg-orange-950/30 text-orange-500 font-bold px-2 py-0.5 rounded-lg text-xs">
                    <Flame className="w-3.5 h-3.5" fill="currentColor" />
                    <span>{group.current_streak}</span>
                  </div>
                )}

                {/* Map Visibility Switch */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Map</span>
                  <button
                    onClick={() => toggleGroupVisibility(group.group_id)}
                    className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${isVisible ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <motion.div
                      layout
                      className="w-6 h-6 bg-white rounded-full shadow-md"
                      animate={{ x: isVisible ? 20 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })
      )}
      {/* Assemble a New Group Modal */}
      <Portal>
        <AnimatePresence>
          {isCreateModalOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreateModalOpen(false)}
                className="fixed inset-0 z-[140] bg-black pointer-events-auto"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[140] max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700 max-h-[85vh] overflow-y-auto"
              >
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <Users className="w-6 h-6 text-primary" />
                  Assemble a New Group
                </h2>
                <p className="text-xs font-semibold text-gray-400 mb-5">
                  Rally your friends to tackle quests together, maintain a unified streak flame, and earn exclusive team rewards!
                </p>

                <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                  <div className="flex flex-col items-center gap-2.5 mb-6">
                    {/* Group Icon Circular Selector */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-24 h-24 rounded-full border-4 border-dashed border-gray-200 dark:border-gray-700/85 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden group hover:border-primary/50 transition-colors shadow-inner"
                      style={crewAvatarUrl ? { borderStyle: 'solid', borderColor: groupColor } : {}}
                    >
                      {crewAvatarUrl ? (
                        <img src={crewAvatarUrl} alt="Group Icon Preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-1 group-hover:text-primary transition-colors" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Upload Pic</span>
                        </>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-black text-primary hover:text-[#46A302] active:scale-95 transition-all"
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
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Group Name
                    </label>
                    <input
                      type="text"
                      required
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Taco Tuesday Alliance"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-450 focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Group Type
                    </label>
                    <select
                      value={groupType}
                      onChange={(e) => setGroupType(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors text-sm"
                    >
                      {groupTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Description / Vibe
                    </label>
                    <textarea
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      placeholder="Describe your group's focus..."
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-450 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Group Banner Color
                    </label>
                    <div className="flex items-center gap-2.5">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setGroupColor(color)}
                          className={`w-8 h-8 rounded-full transition-transform active:scale-90 ${groupColor === color ? 'ring-4 ring-primary ring-offset-2 dark:ring-offset-gray-800 scale-105' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Invite Friends to Group
                    </label>
                    {friendsList.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No friends available to invite yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Search friends input */}
                        <div className="relative">
                          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                          <input 
                            type="text"
                            placeholder="Search friends by username..."
                            value={inviteSearchQuery}
                            onChange={(e) => setInviteSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-55 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-405 focus:outline-none focus:border-primary transition-colors text-xs"
                          />
                        </div>

                        {/* Avatars Grid Selector */}
                        <div className="max-h-[160px] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-2xl p-3 bg-gray-55 dark:bg-gray-900">
                          {friendsList.filter(f => {
                            const query = inviteSearchQuery.toLowerCase()
                            return f.username.toLowerCase().includes(query) || (f.display_name && f.display_name.toLowerCase().includes(query))
                          }).length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center py-4">No friends found matching "{inviteSearchQuery}"</p>
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
                                          className={`w-11 h-11 rounded-full object-cover border-2 transition-all ${
                                            isSelected 
                                              ? 'ring-4 ring-primary border-transparent scale-105 shadow-md' 
                                              : 'border-gray-250 dark:border-gray-700/80 opacity-80'
                                          }`} 
                                        />
                                      ) : (
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                                          isSelected 
                                            ? 'ring-4 ring-primary border-transparent scale-105 shadow-md bg-primary/20 text-primary' 
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-250 opacity-80'
                                        }`}>
                                          {(friend.display_name?.[0] || friend.username[0]).toUpperCase()}
                                        </div>
                                      )}
                                      
                                      {/* Highlight Selected Badge */}
                                      {isSelected && (
                                        <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full flex items-center justify-center w-4 h-4 shadow-sm border border-white dark:border-gray-800">
                                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 text-center truncate w-12 leading-tight">
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
                      className="w-1/2 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 font-extrabold rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="w-1/2 py-3 bg-primary hover:bg-[#46A302] disabled:bg-primary/50 text-white font-extrabold rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-primary/25"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" strokeWidth={2.5} />
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
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsJoinModalOpen(false)
                  setJoinCode('')
                  setJoinError(null)
                }}
                className="fixed inset-0 z-[140] bg-black pointer-events-auto"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[140] max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700"
              >
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <Users className="w-6 h-6 text-secondary" />
                  Join Group
                </h2>
                <p className="text-xs font-semibold text-gray-400 mb-5">
                  Enter the 6-character unique group code (e.g., ABC123) sent by your friends to join their Group instantly!
                </p>

                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Group Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. ABC123"
                      className="w-full px-4 py-3 bg-gray-55 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-black tracking-widest text-center text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-secondary transition-colors text-lg uppercase"
                    />
                  </div>

                  {joinError && (
                    <div className="p-3 text-xs font-semibold bg-red-50 text-red-600 rounded-xl border border-red-100">
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
                      className="w-1/2 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 font-extrabold rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={joining}
                      className="w-1/2 py-3 bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-white font-extrabold rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-secondary/25"
                    >
                      {joining ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" strokeWidth={2.5} />
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

      {/* Image Cropper dedicated full-screen view (z-[150] avoids nav bar blockage) */}
      <Portal>
        <AnimatePresence>
          {cropImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[150] flex flex-col justify-between bg-[#0a0d18] text-white select-none"
            >
              <div className="w-full flex items-center justify-between px-6 py-5 border-b border-white/5 bg-gray-950/20 backdrop-blur-md">
                <button 
                  type="button" 
                  onClick={() => setCropImage(null)}
                  className="text-white/60 hover:text-white text-sm font-extrabold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-black tracking-tight text-center text-white flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-[#58CC02]" /> Edit Group Icon
                </h3>
                <div className="w-12" />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 relative min-h-0">
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-[#58CC02] shadow-[0_0_30px_rgba(88,204,2,0.2)] bg-gray-950 cursor-move flex items-center justify-center select-none"
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
                <p className="text-xs text-white/50 mt-4 sm:mt-6 tracking-wide uppercase font-bold">
                  Drag to Reposition
                </p>
              </div>

              <div className="w-full max-w-md mx-auto px-6 pb-4 sm:pb-8 flex flex-col gap-4 sm:gap-6 bg-gradient-to-t from-[#0a0d18] to-transparent shrink-0">
                <div className="w-full flex flex-col gap-2 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center text-xs text-white/60 font-black px-1">
                    <span>ZOOM LEVEL</span>
                    <span>{Math.round(cropZoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-white/40" />
                    <input 
                      type="range" 
                      min="1.0" 
                      max="3.0" 
                      step="0.05"
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#58CC02] focus:outline-none"
                    />
                    <ZoomIn className="w-4 h-4 text-white/40" />
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    type="button"
                    onClick={() => setCropImage(null)}
                    className="flex-1 border border-white/10 hover:bg-white/5 text-white font-extrabold py-4 rounded-2xl transition-colors cursor-pointer text-center text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePerformCrop}
                    className="flex-1 bg-[#58CC02] hover:bg-[#46A302] border-bottom-[4px] border-[#46A302] text-white font-extrabold py-4 rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Group Profile detailed view (Full-Screen Overlay z-[100]) */}
      <Portal>
        <AnimatePresence>
          {selectedGroup && (
            <motion.div
              initial={{ opacity: 0, y: '10%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '10%' }}
              className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 overflow-y-auto pb-10 flex flex-col"
            >
              {/* Header banner */}
              <div 
                className="relative pt-12 pb-6 px-6 shadow-sm shrink-0"
                style={{ background: `linear-gradient(to bottom, ${selectedGroup.group_color || '#6C63FF'}55, transparent)` }}
              >
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="absolute top-4 left-4 p-2.5 rounded-full bg-white/60 hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-sm text-gray-800 dark:text-white transition-colors active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={22} strokeWidth={2.5} />
                </button>
                
                <div className="flex flex-col items-center text-center mt-6">
                  {selectedGroup.group_avatar ? (
                    <img src={selectedGroup.group_avatar} className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-white dark:border-gray-800" />
                  ) : (
                    <div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-lg"
                      style={{ backgroundColor: selectedGroup.group_color || '#6C63FF' }}
                    >
                      {selectedGroup.group_name[0].toUpperCase()}
                    </div>
                  )}
                  
                  <h1 className="mt-3 text-xl font-black text-gray-900 dark:text-white tracking-tight">
                    {selectedGroup.group_name}
                    {selectedGroup.group_code && (
                      <span className="text-sm text-gray-400 dark:text-gray-505 font-extrabold ml-2">
                        #{selectedGroup.group_code}
                      </span>
                    )}
                  </h1>
                  
                  {/* Type Badge */}
                  {selectedGroupDetails?.group_type && (
                    <span className="mt-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-wider uppercase rounded-full">
                      {selectedGroupDetails.group_type} Group
                    </span>
                  )}
                </div>
              </div>

              {/* Content card body */}
              <div className="flex-1 max-w-md mx-auto w-full px-4 space-y-5">
                
                {/* Group Description */}
                {selectedGroupDetails?.description && (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">About the Group</h4>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">{selectedGroupDetails.description}</p>
                  </div>
                )}

                {/* Group Experience / Level Progression */}
                {selectedGroupDetails && (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Group Progression</h4>
                        <p className="text-xs text-gray-500 font-bold mt-1">Level {selectedGroupDetails.level || 1}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-primary">
                          {(selectedGroupDetails.xp || 0) % 100} / 100 XP
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(selectedGroupDetails.xp || 0) % 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 mt-2 block text-center">Gains XP from Quest completions together! ⚔️</span>
                  </div>
                )}

                {/* Group Members List */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                    <h3 className="font-extrabold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" /> Members ({groupMembersList.length})
                    </h3>
                    {isCreatorOfSelectedGroup && (
                      <button
                        onClick={() => setShowInviteOverlay(true)}
                        className="text-xs font-black text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        + Invite Friend
                      </button>
                    )}
                  </div>

                  {loadingMembers ? (
                    <div className="py-6 flex justify-center">
                      <Loader2 className="animate-spin w-6 h-6 text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupMembersList.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-700/30 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/20">
                                {member.display_name?.[0]?.toUpperCase() || member.username[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate leading-tight">
                                {member.display_name || member.username}
                              </p>
                              <p className="text-[9px] text-gray-450 dark:text-gray-400 font-bold truncate">@{member.username}</p>
                            </div>
                          </div>

                          <span className="text-[9px] font-black uppercase text-gray-400 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-900 border">
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

      {/* Invite Member overlay overlay (z-[110]) */}
      <Portal>
        <AnimatePresence>
          {showInviteOverlay && (
            <>
              <div 
                className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm pointer-events-auto"
                onClick={() => {
                  setShowInviteOverlay(false)
                  setInviteOverlaySearchQuery('')
                }}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[120] max-w-sm bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-150 dark:border-gray-700 space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Invite Friends to Group</h3>
                  <button 
                    onClick={() => {
                      setShowInviteOverlay(false)
                      setInviteOverlaySearchQuery('')
                    }} 
                    className="text-xs text-gray-400 font-bold"
                  >
                    Close
                  </button>
                </div>

                {nonGroupFriends.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search friends by username..."
                      value={inviteOverlaySearchQuery}
                      onChange={(e) => setInviteOverlaySearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors text-xs"
                    />
                  </div>
                )}

                <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
                  {nonGroupFriends.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-6">All your friends are already in this group!</p>
                  ) : nonGroupFriends.filter(f => {
                    const query = inviteOverlaySearchQuery.toLowerCase()
                    return f.username.toLowerCase().includes(query) || (f.display_name && f.display_name.toLowerCase().includes(query))
                  }).length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-6">No friends found matching "{inviteOverlaySearchQuery}"</p>
                  ) : (
                    nonGroupFriends.filter(f => {
                      const query = inviteOverlaySearchQuery.toLowerCase()
                      return f.username.toLowerCase().includes(query) || (f.display_name && f.display_name.toLowerCase().includes(query))
                    }).map((friend) => (
                      <div 
                        key={friend.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                        onClick={() => {
                          handleInviteFriendToGroup(friend.id)
                          setInviteOverlaySearchQuery('')
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
                              {friend.display_name?.[0]?.toUpperCase() || friend.username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-bold text-gray-750 dark:text-gray-200">
                            {friend.display_name || friend.username}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-primary uppercase">Add</span>
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

