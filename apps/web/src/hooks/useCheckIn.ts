import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAwardXP } from './useXP'
import { usePursuitsStore } from '../features/pursuits/pursuits.store'
import { 
  XP_RULES, 
  categoryPursuitMap, 
  vibePursuitNudge, 
  DIMINISHING_RETURNS_CURVE, 
  PursuitKey 
} from '../features/pursuits/pursuits.config'
import { 
  fetchUserCheckInDistanceKm, 
  fetchTodayCheckInCount 
} from '../features/pursuits/pursuitsData'
import { useAuthStore } from '../stores/auth'
import { useStampsStore } from '../features/stamps/stampsStore'

export function useGeolocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setLoading(false)
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setError(null)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    refresh()
  }, [])

  return { location, error, loading, refresh }
}

export function useCheckIn(questId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const { mutate: awardXP } = useAwardXP()

  const checkIn = async (
    lat: number,
    lng: number,
    questInfo?: { 
      category: string; 
      vibe: string; 
      creatorId: string;
      isFellowshipEligible?: boolean;
      locationName?: string;
      questName?: string;
    }
  ) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('check_in_to_quest' as any, {
        p_quest_id: questId,
        p_lat: lat,
        p_lng: lng
      })
      
      if (rpcError) throw rpcError
      
      if (data && !data.success) {
        setError(data.error === 'too_far' ? `You are ${Math.round(data.distance || 0)}m away` : data.error)
      } else {
        setResult(data)
        
        // 1. Award legacy XP
        awardXP({ points: 20, action: 'attend_quest', referenceId: questId })

        // 2. Award Pursuits XP
        const currentUserId = useAuthStore.getState().user?.id;
        if (currentUserId) {
          // Asynchronously query Wayfaring distance and Today checkin counts
          const [distanceKm, todayCheckInCount] = await Promise.all([
            fetchUserCheckInDistanceKm(lat, lng),
            fetchTodayCheckInCount(currentUserId)
          ]);

          const category = questInfo?.category?.toLowerCase() || '';
          const vibe = questInfo?.vibe?.toLowerCase() || '';
          const isFellowshipEligible = questInfo?.isFellowshipEligible || false;

          // 2.1 Calculate Layer 1: Topic Pursuit (with Gaming Tie-Break rule)
          let topicPursuit: PursuitKey = 'fellowship'; // Default fallback
          if (category === 'gaming') {
            if (vibe === 'active') {
              topicPursuit = 'athletics';
            } else if (vibe === 'cozy') {
              topicPursuit = 'fellowship';
            } else {
              topicPursuit = 'lore';
            }
          } else {
            topicPursuit = categoryPursuitMap[category] || 'fellowship';
          }

          // Initialize allocations record
          const allocations: Partial<Record<PursuitKey, number>> = {};
          const addAlloc = (key: PursuitKey, amount: number) => {
            allocations[key] = Math.max(allocations[key] ?? 0, amount);
          };

          // Apply topic pursuit XP
          addAlloc(topicPursuit, XP_RULES.topicFull);

          // Apply Layer 2 vibe nudge (small secondary nudge)
          const nudge = vibePursuitNudge[vibe];
          if (nudge) {
            addAlloc(nudge, XP_RULES.vibeNudge);
          }

          // Apply Wayfaring property bonus
          if (distanceKm > XP_RULES.wayfaringMinKm) {
            addAlloc('wayfaring', XP_RULES.propertyBonus);
          }

          // Apply Fellowship property bonus
          if (isFellowshipEligible) {
            addAlloc('fellowship', XP_RULES.propertyBonus);
          }

          // Apply Discovery / Pioneer bonus
          if (data.is_pioneer) {
            addAlloc('discovery', XP_RULES.pioneerBonus);
          }

          // Apply Host Quest bonus
          if (questInfo?.creatorId && currentUserId === questInfo.creatorId) {
            addAlloc('fellowship', XP_RULES.hostQuest);
          }

          // 2.2 Deduplicate and Cap at 3 pursuits
          // Keep topic pursuit and take up to 2 other highest allocations
          const topicAmount = allocations[topicPursuit] || XP_RULES.topicFull;
          delete allocations[topicPursuit];

          const otherAllocs = Object.entries(allocations)
            .map(([key, val]) => ({ key: key as PursuitKey, amount: val as number }))
            .sort((a, b) => b.amount - a.amount);

          const finalGrants: { pursuit: PursuitKey; amount: number }[] = [
            { pursuit: topicPursuit, amount: topicAmount }
          ];

          otherAllocs.slice(0, 2).forEach(alloc => {
            finalGrants.push({ pursuit: alloc.key, amount: alloc.amount });
          });

          // 2.3 Soft Daily Diminishing Returns scaling
          // Use todayCheckInCount (already includes current checkin) to index the curve
          const multiplierIndex = Math.max(0, todayCheckInCount - 1);
          const multiplier = DIMINISHING_RETURNS_CURVE[multiplierIndex] !== undefined
            ? DIMINISHING_RETURNS_CURVE[multiplierIndex]
            : 0.25; // 25% floor

          const scaledGrants = finalGrants.map(g => ({
            pursuit: g.pursuit,
            amount: Math.max(1, Math.round(g.amount * multiplier))
          }));

          // Trigger unified grantPursuitXP
          // TODO: move XP authority server-side
          usePursuitsStore.getState().grantPursuitXP(scaledGrants, { reason: 'Check-in' });

          // 2.4 Atomically record Stamp log
          let stampKind = 'food';
          if (category === 'food') stampKind = 'food';
          else if (category === 'outdoors') stampKind = 'outdoors';
          else if (category === 'nightlife') stampKind = 'nightlife';
          else if (category === 'culture') stampKind = 'culture';
          else if (category === 'fitness') stampKind = 'fitness';
          else if (category === 'gaming') stampKind = 'culture'; // Gaming maps to culture by default

          let isFoil = false;
          let isPioneer = false;
          if (data.is_pioneer) {
            stampKind = 'gem';
            isFoil = true;
            isPioneer = true;
          }

          const stampRecord = {
            user_id: currentUserId,
            quest_id: questId,
            stamp_kind: stampKind,
            is_foil: isFoil,
            is_pioneer: isPioneer,
            district: questInfo?.locationName || 'Unknown District',
            first_visit: isPioneer,
          };

          // TODO: move stamp+XP authority server-side
          await useStampsStore.getState().persistStamp(stampRecord);
          useStampsStore.getState().addStampOptimistically({
            ...stampRecord,
            id: crypto.randomUUID(),
            earned_at: new Date().toISOString()
          });
        }
      }
      return data
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { checkIn, loading, error, result }
}
