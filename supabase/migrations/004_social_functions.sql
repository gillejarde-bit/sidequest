-- 004_social_functions.sql
-- RPC functions for the Friends and Social Graph phase

-- 1. RPC function to search users by username
CREATE OR REPLACE FUNCTION search_users(search_term text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  mutual_friend_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.level,
    COUNT(DISTINCT mf.friend_id) as mutual_friend_count
  FROM profiles p
  LEFT JOIN friendships mf 
    ON mf.user_id = auth.uid() 
    AND mf.friend_id = p.id
    AND mf.status = 'accepted'
  WHERE 
    p.username ILIKE '%' || search_term || '%'
    AND p.id != auth.uid()
  GROUP BY p.id, p.username, p.display_name, 
           p.avatar_url, p.level
  LIMIT 20
$$;
GRANT EXECUTE ON FUNCTION search_users TO authenticated;

-- 2. RPC function to get friends with online status
CREATE OR REPLACE FUNCTION get_friends_with_status()
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  xp int,
  quest_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.level,
    p.xp,
    COUNT(DISTINCT qa.quest_id) as quest_count
  FROM profiles p
  INNER JOIN friendships f 
    ON (f.friend_id = p.id AND f.user_id = auth.uid())
    OR (f.user_id = p.id AND f.friend_id = auth.uid())
  LEFT JOIN quest_attendance qa 
    ON qa.user_id = p.id
  WHERE f.status = 'accepted'
    AND p.id != auth.uid()
  GROUP BY p.id, p.username, p.display_name,
           p.avatar_url, p.level, p.xp
$$;
GRANT EXECUTE ON FUNCTION get_friends_with_status TO authenticated;

-- 3. RPC to get pending friend requests
CREATE OR REPLACE FUNCTION get_pending_requests()
RETURNS TABLE (
  friendship_id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    f.id as friendship_id,
    p.id as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.level,
    f.created_at
  FROM friendships f
  INNER JOIN profiles p ON p.id = f.user_id
  WHERE f.friend_id = auth.uid()
    AND f.status = 'pending'
  ORDER BY f.created_at DESC
$$;
GRANT EXECUTE ON FUNCTION get_pending_requests TO authenticated;

-- 4. RLS policies for friendships table (if not already added)
DROP POLICY IF EXISTS "Users can insert their own friendships" ON friendships;
CREATE POLICY "Users can insert their own friendships" ON friendships
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
CREATE POLICY "Users can view their friendships" ON friendships
  FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS "Users can update received friend requests" ON friendships;
CREATE POLICY "Users can update received friend requests" ON friendships
  FOR UPDATE USING (friend_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;
CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE USING (user_id = auth.uid() OR friend_id = auth.uid());

-- 5. Realtime enable on friendships table
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
