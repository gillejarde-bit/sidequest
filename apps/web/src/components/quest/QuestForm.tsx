import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, MapPin, Users, Calendar, DollarSign, Globe, Shield, Sparkles, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'

import { useFriends } from '../../hooks/useFriends'
import { useAwardXP } from '../../hooks/useXP'
import { motion } from 'framer-motion'

const CATEGORIES = ['Food', 'Outdoors', 'Nightlife', 'Culture', 'Fitness', 'Gaming']
const VIBES = ['Chill', 'Wild', 'Active', 'Cultural', 'Cozy', 'Chaotic']
const COST_TIERS = [
  { label: 'Free', value: 0 },
  { label: '$', value: 1 },
  { label: '$$', value: 2 },
  { label: '$$$', value: 3 },
]
const PRIVACY_OPTIONS = [
  { label: 'Friends', value: 'friends', icon: Users },
  { label: 'Group', value: 'group', icon: Shield },
  { label: 'Public', value: 'public', icon: Globe },
]

export function QuestForm() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { mutate: awardXP } = useAwardXP()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [name, setName] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string; address: string; place_id: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [category, setCategory] = useState('Food')
  const [vibe, setVibe] = useState('Chill')
  const [startsAt, setStartsAt] = useState('')
  const [costTier, setCostTier] = useState(1)
  const [maxPartySize, setMaxPartySize] = useState(4)
  const [privacy, setPrivacy] = useState('friends')
  const [description, setDescription] = useState('')
  
  // Friends
  const { data: friends = [] } = useFriends()
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const lat = params.get('lat')
    const lng = params.get('lng')
    const queryName = params.get('name')
    const queryCategory = params.get('category')

    if (queryName) {
      setName(queryName)
    }
    if (queryCategory) {
      const capCat = queryCategory.charAt(0).toUpperCase() + queryCategory.slice(1).toLowerCase()
      if (CATEGORIES.includes(capCat)) setCategory(capCat)
    }
    if (lat && lng && queryName) {
      setSelectedLocation({
        name: queryName,
        address: queryName,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        place_id: 'pre-selected'
      })
      if (inputRef.current) inputRef.current.value = queryName
    }

    const initAutocomplete = () => {
      if (window.google?.maps?.places && inputRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['geometry', 'name', 'formatted_address', 'place_id'],
        })

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place.geometry?.location) {
            setSelectedLocation({
              name: place.name || '',
              address: place.formatted_address || '',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              place_id: place.place_id || ''
            })
          }
        })
      }
    }

    if (window.google?.maps?.places) {
      initAutocomplete()
    } else {
      const script = document.createElement('script')
      const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => initAutocomplete()
      document.head.appendChild(script)
    }
  }, [])

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !startsAt) {
      setError('Name and Start Time are required.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      let locationId = null

      // 1. Create Location if selected
      if (selectedLocation) {
        const { data: locData } = await supabase
          .from('locations')
          .insert({
            name: selectedLocation.name,
            address: selectedLocation.address,
            osm_id: selectedLocation.place_id,
            geo: `POINT(${selectedLocation.lng} ${selectedLocation.lat})`
          })
          .select('id')
          .single()

        if (locData) {
          locationId = locData.id
        }
      }

      // 2. Create Quest
      const { data: quest, error: questError } = await supabase
        .from('quests')
        .insert({
          name,
          category: category.toLowerCase(),
          vibe: vibe.toLowerCase(),
          starts_at: new Date(startsAt).toISOString(),
          cost_tier: costTier,
          max_party_size: maxPartySize,
          privacy: privacy.toLowerCase(),
          description,
          creator_id: user!.id,
          location_id: locationId,
          status: 'planned'
        })
        .select('id')
        .single()

      if (questError) throw questError

      // 3. Create Invites
      if (selectedFriends.length > 0) {
        const invites = selectedFriends.map(friendId => ({
          quest_id: quest.id,
          user_id: friendId,
          status: 'pending'
        }))
        const { error: invitesError } = await supabase.from('quest_invites').insert(invites)
        if (invitesError) console.error('Invites error:', invitesError)
      }

      // 4. Award XP
      awardXP({ points: 30, action: 'organize_quest', referenceId: quest.id })

      // 5. Navigate
      navigate({ to: `/quest/${quest.id}` as any }) // Note: we'll route to placeholder or actual quest page later

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create quest')
    } finally {
      setLoading(false)
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-32">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 bg-white/50 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-xl"
      >
        
        {/* Name */}
        <motion.div variants={item} className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" /> Quest Title
          </label>
          <input
            type="text"
            placeholder="e.g. Midnight Ramen Run"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/80 border-0 rounded-2xl p-4 text-lg font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
            required
          />
        </motion.div>

        {/* Location Picker */}
        <motion.div variants={item} className="space-y-2 relative">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" /> Location
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search places with Google..."
              onChange={() => setSelectedLocation(null)}
              className="w-full bg-white/80 border-0 rounded-2xl p-4 pl-12 text-gray-900 shadow-sm focus:ring-2 focus:ring-red-500"
            />
            <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
          </div>
        </motion.div>

        {/* Date + Time */}
        <motion.div variants={item} className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" /> Date & Time
          </label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={e => setStartsAt(e.target.value)}
            className="w-full bg-white/80 border-0 rounded-2xl p-4 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500"
            required
          />
        </motion.div>

        {/* Category */}
        <motion.div variants={item} className="space-y-3">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                  category === cat 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'bg-white/60 text-gray-600 hover:bg-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Vibe */}
        <motion.div variants={item} className="space-y-3">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Vibe</label>
          <div className="flex flex-wrap gap-2">
            {VIBES.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setVibe(v)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                  vibe === v 
                    ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-md' 
                    : 'bg-white/60 text-gray-600 hover:bg-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Cost & Party Size Row */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Cost Tier
            </label>
            <div className="flex bg-white/60 rounded-2xl p-1 shadow-inner">
              {COST_TIERS.map(tier => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setCostTier(tier.value)}
                  className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${
                    costTier === tier.value ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Party Size
            </label>
            <div className="flex items-center justify-between bg-white/60 rounded-2xl p-2 shadow-inner">
              <button type="button" onClick={() => setMaxPartySize(Math.max(2, maxPartySize - 1))} className="w-8 h-8 rounded-xl bg-white shadow-sm font-bold text-gray-600">-</button>
              <span className="font-bold text-lg text-gray-900">{maxPartySize}</span>
              <button type="button" onClick={() => setMaxPartySize(Math.min(20, maxPartySize + 1))} className="w-8 h-8 rounded-xl bg-white shadow-sm font-bold text-gray-600">+</button>
            </div>
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div variants={item} className="space-y-3">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Privacy</label>
          <div className="flex bg-white/60 rounded-2xl p-1 shadow-inner">
            {PRIVACY_OPTIONS.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrivacy(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-sm font-medium rounded-xl transition-all ${
                    privacy === opt.value ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Invite Friends */}
        <motion.div variants={item} className="space-y-3">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-500" /> Invite Squad
          </label>
          
          {!friends || friends.length === 0 ? (
            <div className="bg-white/60 p-4 rounded-2xl border border-dashed border-gray-300 text-center text-sm text-gray-500">
              You don't have any friends yet! Head over to the Social tab to find your squad.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {friends.map(friend => {
                const isSelected = selectedFriends.includes(friend.id)
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-transparent bg-white/60 hover:bg-white'
                    }`}
                  >
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt={friend.username} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                        {(friend.display_name?.[0] || friend.username[0]).toUpperCase()}
                      </div>
                    )}
                    <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {friend.display_name || friend.username}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Description */}
        <motion.div variants={item} className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Details (Optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="What's the plan?"
            className="w-full bg-white/80 border-0 rounded-2xl p-4 text-gray-900 shadow-sm focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </motion.div>

        {error && (
          <motion.div variants={item} className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
            {error}
          </motion.div>
        )}
      </motion.div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>Create Quest <Sparkles className="w-5 h-5" /></>
        )}
      </button>
    </form>
  )
}
