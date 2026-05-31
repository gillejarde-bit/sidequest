import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../lib/supabase';
import { useXP } from '../../hooks/useXP';
import { XPBar } from '../../components/xp/XPBar';
import { BadgeGrid } from '../../components/xp/BadgeGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, X, Star, Calendar, Users, Map, Flame, Trophy, Settings as SettingsIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarUrl } from '../../lib/avatar';

const PRESET_COLORS = ['#6C63FF', '#58CC02', '#FF6B6B', '#FFD93D', '#3498DB', '#E67E22'];

export function MeProfile() {
  const { user, profile, initialized } = useAuthStore();
  const { data: xpStats, isLoading: isXpLoading, error: xpError } = useXP();

  // ... (keep the other hooks)

  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: allBadges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data } = await supabase.from('badges').select('*').order('rarity', { ascending: false });
      return data || [];
    }
  });

  const { data: allTitles = [] } = useQuery({
    queryKey: ['titles'],
    queryFn: async () => {
      const { data } = await supabase.from('titles').select('*').order('min_level', { ascending: true });
      return data || [];
    }
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: any) => {
      if (!user) throw new Error('Not logged in');
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['xp-stats'] });
      useAuthStore.getState().fetchProfile(user!.id);
      setIsEditing(false);
    }
  });

  if (!initialized) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 dark:bg-gray-900">
        <h2 className="text-xl font-bold">Please log in to view your profile</h2>
      </div>
    );
  }

  if (xpError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 dark:bg-gray-900 text-red-500">
        <div>Error loading profile: {(xpError as any)?.message || 'Unknown error'}</div>
      </div>
    );
  }

  if (isXpLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 dark:bg-gray-900 text-red-500">
        <div>Profile data not found. Please try logging out and logging back in.</div>
      </div>
    );
  }

  if (!xpStats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 dark:bg-gray-900 text-red-500">
        <div>Could not load XP stats. Please try again later.</div>
      </div>
    );
  }

  const handleEditOpen = () => {
    setEditName(profile.display_name || '');
    setEditBio(profile.bio || '');
    setEditColor(profile.profile_color || '#6C63FF');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfile.mutate({
      display_name: editName,
      bio: editBio,
      profile_color: editColor
    });
  };

  const StatBox = ({ icon: Icon, label, value, color }: any) => (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2`}
    >
      <div className={`p-2 rounded-xl bg-opacity-10`} style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={24} />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value || 0}</div>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
    </motion.div>
  );

  return (
    <div className="min-h-screen pb-24 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* HEADER SECTION */}
      <div 
        className="relative pt-20 pb-8 px-4 flex flex-col items-center text-center shadow-sm"
        style={{ background: `linear-gradient(to bottom, ${profile.profile_color || '#6C63FF'}33, transparent)` }}
      >
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            onClick={handleEditOpen}
            className="p-2 rounded-full bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-sm transition-colors"
          >
            <Edit2 size={20} />
          </button>
          <Link 
            to="/settings"
            className="p-2 rounded-full bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-sm transition-colors"
          >
            <SettingsIcon size={20} />
          </Link>
        </div>

        <div className="relative">
          <img 
            src={getAvatarUrl(profile.avatar_url, profile.username || user?.id)} 
            alt="Avatar"
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white"
          />
          <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm flex items-center gap-1">
            <Star size={12} fill="currentColor" />
            Lvl {xpStats.level}
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-bold">{profile.display_name || 'Anonymous'}</h1>
        <p className="text-gray-500 font-medium">@{profile.username || user?.id?.slice(0, 8)}</p>
        
        {/* Active Title Badge */}
        <div 
          className="mt-3 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide"
          style={{ backgroundColor: `${profile.profile_color || '#6C63FF'}20`, color: profile.profile_color || '#6C63FF' }}
        >
          {profile.title || 'Wanderer'}
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 max-w-md">
            {profile.bio}
          </p>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-8 mt-4">
        {/* XP SECTION */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-lg font-bold">Experience</h2>
              <p className="text-sm text-gray-500">{xpStats.current_xp_in_level} / {xpStats.xp_for_next_level_total - xpStats.xp_to_next_level + xpStats.current_xp_in_level} XP to next level</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(to right, ${profile.profile_color}, #A78BFA)` }}>
                {xpStats.xp}
              </span>
              <span className="text-xs text-gray-500 ml-1 block">Total XP</span>
            </div>
          </div>
          <XPBar xp={xpStats.xp} level={xpStats.level} showDetails={true} />
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatBox icon={Map} label="Attended" value={xpStats.total_quests_attended} color="#3B82F6" />
          <StatBox icon={Calendar} label="Organized" value={xpStats.total_quests_organized} color="#10B981" />
          <StatBox icon={Star} label="Gems Found" value={xpStats.total_gems_found} color="#F59E0B" />
          <StatBox icon={Users} label="Friends" value={(profile as any).friend_count || 0} color="#8B5CF6" />
          <StatBox icon={Flame} label="Curr Streak" value={xpStats.current_streak} color="#EF4444" />
          <StatBox icon={Trophy} label="Best Streak" value={xpStats.longest_streak} color="#F97316" />
        </div>

        {/* TITLES SECTION */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold px-2">Titles</h2>
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x px-2 scrollbar-hide">
            {allTitles.map((t: any) => {
              const isUnlocked = xpStats.level >= t.min_level;
              const isActive = profile.title === t.name;
              return (
                <div 
                  key={t.id} 
                  className={`snap-center shrink-0 w-48 p-4 rounded-2xl border ${isActive ? 'ring-2 shadow-md' : 'opacity-80'} transition-all cursor-pointer`}
                  style={{ 
                    borderColor: isActive ? (profile as any).profile_color : 'var(--color-gray-200)',
                    backgroundColor: isActive ? `${(profile as any).profile_color}10` : 'var(--color-white)',
                  }}
                  onClick={() => {
                    if (isUnlocked && !isActive) updateProfile.mutate({ title: t.name });
                  }}
                >
                  <div className="font-bold mb-1" style={{ color: isUnlocked ? 'inherit' : '#9CA3AF' }}>{t.name}</div>
                  <div className="text-xs text-gray-500">{t.requirement}</div>
                  {!isUnlocked && (
                    <div className="mt-2 text-xs font-semibold text-red-500">Unlocks at Lv {t.min_level}</div>
                  )}
                  {isActive && (
                    <div className="mt-2 text-xs font-semibold" style={{ color: (profile as any).profile_color }}>Active</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BADGES SECTION */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold px-2">Badges</h2>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <BadgeGrid 
              badges={allBadges} 
              earnedBadgeIds={xpStats.badge_ids || []} 
            />
          </div>
        </div>

        {/* RECENT XP */}
        {xpStats.recent_xp_events?.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold px-2">Recent Activity</h2>
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-2 shadow-sm border border-gray-100 dark:border-gray-700">
              {xpStats.recent_xp_events.map((event: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium capitalize">{event.action_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                  </div>
                  <div className="font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm">
                    +{event.points} XP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsEditing(false)}
          >
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Profile</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                  <textarea 
                    value={editBio} 
                    onChange={e => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Color</label>
                  <div className="flex flex-wrap gap-3">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-10 h-10 rounded-full transition-transform ${editColor === color ? 'scale-110 ring-4 ring-offset-2 dark:ring-offset-gray-900' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color, '--tw-ring-color': color } as any}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                  className="w-full py-3.5 mt-4 rounded-xl text-white font-bold shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: editColor }}
                >
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
