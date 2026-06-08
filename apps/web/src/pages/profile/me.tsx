import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../lib/supabase';
import { useXP } from '../../hooks/useXP';

import { BadgeGrid as CustomBadgeGrid } from '../../components/profile/badges';
import { usePursuitsStore } from '../../features/pursuits/pursuits.store';
import { fetchUserPursuitXP } from '../../features/pursuits/pursuitsData';
import { archetypeLore } from '../../features/pursuits/lore.config';
import { pursuits, PursuitKey } from '../../features/pursuits/pursuits.config';
import { AvatarBorder } from '../../components/profile/borders';
import { ExperienceBreakdown } from '../../components/profile/ExperienceBreakdown';
import { ProfileDevPanel } from '../../components/profile/ProfileDevPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarUrl } from '../../lib/avatar';

import { 
  CloseIcon, 
  SparkleIcon, 
  CalendarIcon, 
  CrewIcon, 
  MapIcon, 
  StreakFlameIcon, 
  GemIcon, 
  SettingsIcon, 
  ChevronRightIcon, 
  ScissorsIcon
} from '../../components/icons';

const PRESET_COLORS = ['#6C63FF', '#58CC02', '#FF6B6B', '#FFD93D', '#3498DB', '#E67E22'];

export function MeProfile() {
  const { user, profile, initialized } = useAuthStore();
  const { data: xpStats, isLoading: isXpLoading, error: xpError } = useXP();

  // Pursuits PoC store extraction
  const { 
    activeBorderId, 
    unlockedBadgeIds, 
    getTotalXP, 
    getLevel, 
    getXPProgress, 
    getArchetype,
    hydrateStore
  } = usePursuitsStore();

  const { data: pursuitsData, isLoading: isPursuitsLoading } = useQuery({
    queryKey: ['user-pursuits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return fetchUserPursuitXP(user.id);
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (pursuitsData) {
      hydrateStore(pursuitsData);
    }
  }, [pursuitsData, hydrateStore]);

  const totalXP = getTotalXP();
  const derivedLevel = getLevel();
  const { xpIntoCurrentLevel, xpForNextLevelTotal, progressPercent } = getXPProgress();
  const archetype = getArchetype();
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isProfileLoreExpanded, setIsProfileLoreExpanded] = useState(false);

  // Resolve archetype reason
  const getArchetypeReason = () => {
    if (archetype.kind === 'default') {
      return 'You are at the start of your journey! Earn XP in any pursuit to unlock custom classes.';
    }
    
    const sorted = Object.entries(usePursuitsStore.getState().pursuitXP)
      .map(([key, xp]) => ({ key: key as PursuitKey, xp: xp ?? 0 }))
      .sort((a, b) => b.xp - a.xp);

    const p1 = sorted[0];
    const p2 = sorted[1];

    if (archetype.kind === 'pure') {
      const leadingNoun = pursuits[p1.key].noun;
      if (!p2 || p2.xp === 0) {
        return `A pure ${leadingNoun} focused entirely on your passion for this pursuit.`;
      }
      return `A pure ${leadingNoun} driven primarily by your dedication to ${leadingNoun}.`;
    } else {
      const ratioVal = (p1.xp / p2.xp).toFixed(2);
      return `Hybrid of ${pursuits[p1.key].noun} (Primary) and ${pursuits[p2.key].noun} (Secondary). Domination ratio is ${ratioVal}x (hybrid resolves under 1.4x).`;
    }
  };

  // Resolve archetype lore
  const getArchetypeLoreItem = () => {
    if (archetype.kind === 'default') {
      return archetypeLore['wanderer'];
    } else if (archetype.kind === 'pure') {
      return archetype.primary ? archetypeLore[archetype.primary] : null;
    } else {
      const sortedPair = [archetype.primary, archetype.secondary].sort().join('+');
      return archetypeLore[sortedPair] || null;
    }
  };

  const archetypeLoreItem = getArchetypeLoreItem();

  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: userGroups = [] } = useQuery<any[]>({
    queryKey: ['user-groups-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase
        .from('quest_groups')
        .select('id, name, description, group_color, avatar_url, streak, member_count, level, xp, group_type') as any);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user?.id
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
      <div className="flex-1 flex items-center justify-center h-full min-h-screen bg-[var(--sq-bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--sq-ember-500)]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-[var(--sq-bg)] text-[var(--sq-text)]">
        <h2 className="text-xl font-bold">Please log in to view your profile</h2>
      </div>
    );
  }

  if (xpError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-[var(--sq-bg)] text-[var(--sq-heart)]">
        <div>Error loading profile: {(xpError as any)?.message || 'Unknown error'}</div>
      </div>
    );
  }

  if (isXpLoading || isPursuitsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-screen bg-[var(--sq-bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--sq-ember-500)]"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-[var(--sq-bg)] text-[var(--sq-heart)]">
        <div>Profile data not found. Please try logging out and logging back in.</div>
      </div>
    );
  }

  if (!xpStats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-[var(--sq-bg)] text-[var(--sq-heart)]">
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
      className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-4 text-center shadow-[var(--sq-shadow-soft)] flex flex-col items-center justify-center gap-2 relative sq-wobbly-md cursor-pointer"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
      <div className="p-2 rounded-xl bg-opacity-10 z-10" style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={24} withShadow={false} />
      </div>
      <div className="text-2xl font-black text-[var(--sq-text)] z-10">{value || 0}</div>
      <div className="text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider z-10">{label}</div>
    </motion.div>
  );

  return (
    <div data-theme="ember" className="min-h-screen pb-24 bg-background text-foreground transition-colors duration-300 w-full">
      {/* HEADER SECTION */}
      <div 
        className="relative pt-20 pb-8 px-4 flex flex-col items-center text-center shadow-sm"
        style={{ background: `linear-gradient(to bottom, ${profile.profile_color || 'var(--sq-sage-500)'}22, transparent)` }}
      >
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          <button 
            onClick={handleEditOpen}
            className="p-2.5 rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline)] text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] transition-all active:scale-95 cursor-pointer"
          >
            <ScissorsIcon size={20} withShadow={false} />
          </button>
          <Link 
            to="/settings"
            className="p-2.5 rounded-full bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] border border-[var(--sq-hairline)] text-[var(--sq-text)] shadow-[var(--sq-shadow-sticker)] transition-all active:scale-95 cursor-pointer"
          >
            <SettingsIcon size={20} withShadow={false} />
          </Link>
        </div>

        <div className="relative">
          <AvatarBorder borderId={activeBorderId} level={derivedLevel} archetype={archetype}>
            <img 
              src={getAvatarUrl(profile.avatar_url, profile.username || user?.id)} 
              alt="Avatar"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover bg-white border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]"
            />
          </AvatarBorder>
          <div className="absolute -bottom-2 -right-2 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] text-xs font-black px-2 py-1 rounded-full border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] flex items-center gap-1">
            <SparkleIcon size={12} active={true} withShadow={false} />
            Lvl {derivedLevel}
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-black text-[var(--sq-text)]">{profile.display_name || 'Anonymous'}</h1>
        <p className="text-sm text-[var(--sq-text-muted)] font-medium">@{profile.username || user?.id?.slice(0, 8)}</p>
        
        {/* Active Archetype Badge */}
        <motion.div 
          key={archetype.name}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="mt-3 px-4 py-1.5 rounded-full text-sm font-black tracking-wide text-white border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center gap-1.5"
          style={{ 
            background: archetype.kind === 'hybrid'
              ? `linear-gradient(135deg, ${archetype.baseColor}, ${archetype.accentColor})`
              : archetype.baseColor
          }}
          onClick={() => setIsBreakdownOpen(true)}
        >
          {archetype.name}
        </motion.div>

        {/* Archetype blurb */}
        {archetypeLoreItem && (
          <div className="mt-4 max-w-sm text-center px-4 flex flex-col items-center">
            <p className="text-xs text-[var(--sq-text)] font-semibold leading-relaxed">
              {archetypeLoreItem.short}
            </p>
            <AnimatePresence initial={false}>
              {isProfileLoreExpanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[var(--sq-text-muted)] mt-2 text-[11px] leading-relaxed text-center flex flex-col gap-1.5 bg-[var(--sq-surface)]/40 p-3 rounded-2xl border border-[var(--sq-hairline-strong)] w-full"
                >
                  <p className="leading-relaxed font-medium">{archetypeLoreItem.long}</p>
                  <p className="text-[10px] text-[var(--sq-text-faint)] font-semibold italic">({getArchetypeReason()})</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <button
              onClick={() => setIsProfileLoreExpanded(!isProfileLoreExpanded)}
              className="text-[10px] font-black uppercase tracking-wider mt-2 hover:underline focus:outline-none cursor-pointer inline-flex items-center gap-0.5"
              style={{ color: archetype.baseColor }}
            >
              {isProfileLoreExpanded ? 'Read Less ▲' : 'Read More ▼'}
            </button>
          </div>
        )}

        {profile.bio && (
          <p className="mt-4 text-sm text-[var(--sq-text-muted)] max-w-md">
            {profile.bio}
          </p>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 space-y-6 mt-4">
        {/* XP SECTION */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => setIsBreakdownOpen(true)}
          className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 shadow-[var(--sq-shadow-soft)] cursor-pointer active:scale-[0.99] transition-all relative sq-wobbly-md"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-[var(--sq-r-lg)]" />
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[var(--sq-text-muted)]">Experience</h2>
              <p className="text-xs text-[var(--sq-text-faint)] mt-1">{xpIntoCurrentLevel} / {xpForNextLevelTotal} XP (Level Progress)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(to right, ${archetype.baseColor}, ${archetype.accentColor})` }}>
                {totalXP}
              </span>
              <span className="text-[10px] text-gray-500 ml-1 block font-black uppercase">Total XP</span>
            </div>
          </div>
          
          <div className="h-3 bg-[var(--sq-surface)] rounded-full overflow-hidden relative z-10 border border-[var(--sq-hairline)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="h-full rounded-full"
              style={{ 
                background: `linear-gradient(to right, ${archetype.baseColor}, ${archetype.accentColor})`
              }}
            />
          </div>
          <p className="text-[9px] text-[var(--sq-text-faint)] mt-2 text-right relative z-10 font-bold uppercase tracking-wider">Tap to view Experience Breakdown</p>
        </motion.div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 gap-4">
          <StatBox icon={MapIcon} label="Attended" value={xpStats.total_quests_attended} color="var(--sq-sage-500)" />
          <StatBox icon={CalendarIcon} label="Organized" value={xpStats.total_quests_organized} color="var(--sq-ember-400)" />
          <StatBox icon={SparkleIcon} label="Gems Found" value={xpStats.total_gems_found} color="var(--sq-gold)" />
          <StatBox icon={CrewIcon} label="Friends" value={(profile as any).friend_count || 0} color="var(--sq-sage-600)" />
          <StatBox icon={StreakFlameIcon} label="Curr Streak" value={xpStats.current_streak} color="var(--sq-ember-500)" />
          <StatBox icon={GemIcon} label="Best Streak" value={xpStats.longest_streak} color="var(--sq-gold-soft)" />
        </div>

        {/* FEATURED GROUP SECTION */}
        {userGroups.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--sq-text-muted)] px-1">Featured Group</h2>
            <div>
              <Link 
                to="/friends"
                className="block bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-5 shadow-[var(--sq-shadow-soft)] hover:bg-[var(--sq-card-hover)] hover:shadow-md transition-all active:scale-[0.99] relative sq-wobbly-md"
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-2xl" />
                
                <div className="flex items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {userGroups[0].avatar_url ? (
                      <img src={userGroups[0].avatar_url} className="w-12 h-12 rounded-[var(--sq-r-md)] object-cover shrink-0 border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)]" alt="Group Icon" />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-[var(--sq-r-md)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] flex items-center justify-center text-white font-black text-xl shrink-0"
                        style={{ backgroundColor: userGroups[0].group_color || 'var(--sq-sage-500)' }}
                      >
                        {userGroups[0].name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <h3 className="font-extrabold text-sm text-[var(--sq-text)] truncate leading-tight">
                        {userGroups[0].name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-[var(--sq-sage-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] text-[8px] font-black tracking-wider uppercase rounded-full">
                          {userGroups[0].group_type || 'Social'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <CrewIcon size={12} withShadow={false} />
                          {userGroups[0].member_count} members
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          Lvl {userGroups[0].level || 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {userGroups[0].streak > 0 && (
                      <div className="flex items-center gap-0.5 bg-[var(--sq-ember-500)] text-[var(--sq-ink)] border border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">
                        <StreakFlameIcon size={14} active={true} withShadow={false} />
                        <span>{userGroups[0].streak}</span>
                      </div>
                    )}
                    <ChevronRightIcon size={20} withShadow={false} />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* TITLES SECTION */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--sq-text-muted)] px-1">Titles</h2>
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x px-1 scrollbar-premium">
            {allTitles.map((t: any) => {
              const isUnlocked = derivedLevel >= t.min_level;
              const isActive = profile.title === t.name;
              return (
                <div 
                  key={t.id} 
                  className={`snap-center shrink-0 w-48 p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isActive 
                      ? 'bg-[var(--sq-surface)] border-2 border-[var(--sq-ember-500)] shadow-[var(--sq-shadow-sticker)] text-[var(--sq-text)]' 
                      : 'bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] text-[var(--sq-text-muted)] opacity-70'
                  }`}
                  onClick={() => {
                    if (isUnlocked && !isActive) updateProfile.mutate({ title: t.name });
                  }}
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-2xl" />
                  
                  <div className="font-extrabold mb-1 text-sm relative z-10" style={{ color: isUnlocked ? 'inherit' : 'var(--sq-text-faint)' }}>{t.name}</div>
                  <div className="text-xs text-[var(--sq-text-muted)] relative z-10 leading-snug">{t.requirement}</div>
                  {!isUnlocked && (
                    <div className="mt-2 text-[10px] font-black uppercase tracking-wide text-[var(--sq-heart)] relative z-10">Unlocks at Lv {t.min_level}</div>
                  )}
                  {isActive && (
                    <div className="mt-2 text-[10px] font-black uppercase tracking-wide text-[var(--sq-ember-300)] relative z-10">Active</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BADGES SECTION */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--sq-text-muted)] px-1">Badges</h2>
          <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-6 shadow-[var(--sq-shadow-soft)] relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-3xl" />
            <CustomBadgeGrid 
              unlockedBadgeIds={unlockedBadgeIds} 
            />
          </div>
        </div>

        {/* RECENT XP */}
        {xpStats.recent_xp_events?.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--sq-text-muted)] px-1">Recent Activity</h2>
            <div className="bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-[var(--sq-r-lg)] p-4 shadow-[var(--sq-shadow-soft)] relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-3xl" />
              <div className="flex flex-col gap-3 relative z-10">
                {xpStats.recent_xp_events.map((event: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border-b border-[var(--sq-hairline-strong)]/30 last:border-0 last:pb-0">
                    <div className="flex flex-col text-left">
                      <span className="font-extrabold text-sm text-[var(--sq-text)] capitalize">{event.action_type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-[var(--sq-text-muted)] mt-0.5">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="font-black text-xs text-[var(--sq-ember-300)] bg-[var(--sq-ember-500)]/10 px-3 py-1 rounded-full border border-[var(--sq-ember-500)]/20 shadow-sm">
                      +{event.points} XP
                    </div>
                  </div>
                ))}
              </div>
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1E140E]/80 backdrop-blur-sm p-4"
            onClick={() => setIsEditing(false)}
          >
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[var(--sq-card)] border border-[var(--sq-hairline-strong)] rounded-t-3xl sm:rounded-3xl p-6 shadow-xl relative"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-[0.03] pointer-events-none rounded-t-3xl sm:rounded-3xl" />
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-lg font-black text-[var(--sq-text)]">Edit Profile</h3>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="p-2 bg-[var(--sq-surface)] hover:bg-[var(--sq-card-hover)] rounded-full text-[var(--sq-text)] cursor-pointer"
                >
                  <CloseIcon size={20} withShadow={false} />
                </button>
              </div>

              <div className="space-y-5 relative z-10">
                <div>
                  <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">Display Name</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-[var(--sq-r-md)] font-semibold text-[var(--sq-text)] placeholder-[var(--sq-text-faint)] focus:outline-none focus:border-[var(--sq-ember-500)] transition-colors text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">Bio</label>
                  <textarea 
                    value={editBio} 
                    onChange={e => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--sq-surface)] border border-[var(--sq-hairline)] rounded-[var(--sq-r-md)] font-semibold text-[var(--sq-text)] placeholder-[var(--sq-text-faint)] focus:outline-none focus:border-[var(--sq-ember-500)] transition-colors text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--sq-text-muted)] uppercase tracking-wider mb-1.5">Profile Color</label>
                  <div className="flex flex-wrap gap-3">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-10 h-10 rounded-full transition-transform cursor-pointer ${
                          editColor === color ? 'scale-110 ring-4 ring-[var(--sq-ember-500)] ring-offset-2 dark:ring-offset-gray-900' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color } as any}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                  className="w-full py-3.5 mt-4 rounded-full text-[var(--sq-ink)] border-2 border-[var(--sq-keyline)] shadow-[var(--sq-shadow-sticker)] font-black uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer"
                  style={{ backgroundColor: editColor }}
                >
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEV DEMO HARNESS PANEL */}
      {import.meta.env.DEV && <ProfileDevPanel />}

      {/* EXPERIENCE BREAKDOWN MODAL */}
      <ExperienceBreakdown isOpen={isBreakdownOpen} onClose={() => setIsBreakdownOpen(false)} />
    </div>
  );
}
