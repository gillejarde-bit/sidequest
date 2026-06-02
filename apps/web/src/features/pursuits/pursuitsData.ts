import { supabase } from '../../lib/supabase';

export interface UserPursuitXPRecord {
  user_id: string;
  pursuit_key: string;
  xp: number;
  updated_at: string;
}

/**
 * Hydrates and fetches user pursuit XP profiles from the database.
 * Falls back to empty array if no records exist.
 */
export async function fetchUserPursuitXP(userId: string): Promise<UserPursuitXPRecord[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('user_pursuit_xp')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user pursuits:', error);
      return [];
    }

    return (data as UserPursuitXPRecord[]) || [];
  } catch (err) {
    console.error('Failed to retrieve user pursuits:', err);
    return [];
  }
}

/**
 * Atomically increments pursuit XP in Supabase.
 * Uses a security definer RPC function.
 */
export async function persistPursuitXP(pursuit: string, amount: number): Promise<{ success: boolean; error?: any }> {
  try {
    // TODO: move XP authority server-side
    const { error } = await (supabase as any).rpc('grant_pursuit_xp', {
      p_pursuit: pursuit,
      p_amount: amount
    });

    if (error) {
      console.error(`Error persisting XP grant for ${pursuit}:`, error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error(`Exception persisting XP grant for ${pursuit}:`, err);
    return { success: false, error: err };
  }
}

/**
 * Resolves the user's distance in kilometers from their past check-ins centroid.
 * Uses PostGIS ST_Centroid database calculation.
 */
export async function fetchUserCheckInDistanceKm(lat: number, lng: number): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('get_user_checkin_distance_km', {
      p_lat: lat,
      p_lng: lng
    });

    if (error) {
      console.error('Error fetching user check-in distance:', error);
      return 0;
    }

    return Number(data) || 0;
  } catch (err) {
    console.error('Failed to resolve check-in distance:', err);
    return 0;
  }
}

/**
 * Resolves the total check-in count for the current user today.
 * Used to compute soft daily diminishing returns.
 */
export async function fetchTodayCheckInCount(userId: string): Promise<number> {
  try {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { count, error } = await (supabase as any)
      .from('quest_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('arrived_at', `${todayStr}T00:00:00.000Z`);

    if (error) {
      console.error('Error fetching today check-in count:', error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error('Failed to retrieve today check-in count:', err);
    return 0;
  }
}

