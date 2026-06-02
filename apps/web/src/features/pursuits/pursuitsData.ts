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

