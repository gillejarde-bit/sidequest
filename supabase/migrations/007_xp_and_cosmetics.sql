-- 007_xp_and_cosmetics.sql

-- 1. Add cosmetics columns to profiles:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title text DEFAULT 'Wanderer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badge_ids text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_color text DEFAULT '#6C63FF';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS map_flair text DEFAULT 'default';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_quests_organized int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_quests_attended int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_gems_found int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak int DEFAULT 0;

-- 2. Create badges lookup table:
CREATE TABLE IF NOT EXISTS badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL,
  requirement_type text NOT NULL,
  requirement_value int NOT NULL,
  xp_reward int DEFAULT 0,
  rarity text DEFAULT 'common'
);

INSERT INTO badges (id, name, description, icon, category, requirement_type, requirement_value, xp_reward, rarity) VALUES
('first_quest', 'First Quest', 'Completed your first quest', '⚔️', 'quest', 'quests_attended', 1, 50, 'common'),
('quest_5', 'Quest Veteran', 'Attended 5 quests', '🎖️', 'quest', 'quests_attended', 5, 100, 'uncommon'),
('quest_25', 'Quest Legend', 'Attended 25 quests', '🏆', 'quest', 'quests_attended', 25, 250, 'rare'),
('organizer', 'Party Leader', 'Organized your first quest', '👑', 'social', 'quests_organized', 1, 75, 'common'),
('organizer_10', 'Quest Master', 'Organized 10 quests', '🧭', 'social', 'quests_organized', 10, 200, 'uncommon'),
('social_5', 'Crew Builder', 'Made 5 friends', '🤝', 'social', 'friends_count', 5, 100, 'common'),
('social_20', 'Social Butterfly', 'Made 20 friends', '🦋', 'social', 'friends_count', 20, 300, 'rare'),
('gem_finder', 'Gem Hunter', 'Found your first hidden gem', '💎', 'exploration', 'gems_found', 1, 150, 'uncommon'),
('gem_5', 'Treasure Seeker', 'Found 5 hidden gems', '✨', 'exploration', 'gems_found', 5, 400, 'rare'),
('explorer', 'City Explorer', 'Visited 10 unique locations', '🗺️', 'exploration', 'unique_locations', 10, 200, 'uncommon'),
('streak_7', 'Week Warrior', '7 day quest streak', '🔥', 'streak', 'streak_days', 7, 300, 'uncommon'),
('streak_30', 'Monthly Legend', '30 day quest streak', '⚡', 'streak', 'streak_days', 30, 1000, 'legendary'),
('night_owl', 'Night Owl', 'Completed a quest after midnight', '🦉', 'special', 'special', 1, 100, 'uncommon'),
('early_bird', 'Early Bird', 'Completed a quest before 8am', '🐦', 'special', 'special', 1, 100, 'uncommon'),
('pioneer', 'Pioneer', 'First to quest at a new location', '🚀', 'exploration', 'pioneer_count', 1, 200, 'rare')
ON CONFLICT (id) DO NOTHING;

-- 3. Create user_badges table:
CREATE TABLE IF NOT EXISTS user_badges (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id text REFERENCES badges(id),
  earned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select all user_badges"
ON user_badges FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own user_badges"
ON user_badges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;

-- 4. Titles unlock system:
CREATE TABLE IF NOT EXISTS titles (
  id text PRIMARY KEY,
  name text NOT NULL,
  requirement text NOT NULL,
  min_level int DEFAULT 1
);

INSERT INTO titles (id, name, requirement, min_level) VALUES
('wanderer', 'Wanderer', 'Default title', 1),
('adventurer', 'Adventurer', 'Reach level 5', 5),
('explorer', 'Explorer', 'Reach level 10', 10),
('quest_knight', 'Quest Knight', 'Reach level 15', 15),
('quest_master', 'Quest Master', 'Reach level 20', 20),
('legend', 'Legend', 'Reach level 30', 30),
('party_leader', 'Party Leader', 'Organize 10 quests', 1),
('gem_hunter', 'Gem Hunter', 'Find 5 hidden gems', 1),
('night_stalker', 'Night Stalker', '5 night quests', 1),
('pioneer', 'The Pioneer', 'Pioneer 3 locations', 1)
ON CONFLICT (id) DO NOTHING;

-- 5. RPC to get full XP stats:
CREATE OR REPLACE FUNCTION get_xp_stats(p_user_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'xp', p.xp,
    'level', p.level,
    'title', p.title,
    'badge_ids', p.badge_ids,
    'profile_color', p.profile_color,
    'current_xp_in_level', 
      p.xp - (((p.level - 1) * (p.level - 1)) * 100),
    'xp_to_next_level',
      (p.level * p.level * 100) - 
      (((p.level - 1) * (p.level - 1)) * 100),
    'xp_for_next_level_total',
      p.level * p.level * 100,
    'total_quests_organized', p.total_quests_organized,
    'total_quests_attended', p.total_quests_attended,
    'total_gems_found', p.total_gems_found,
    'longest_streak', p.longest_streak,
    'current_streak', p.current_streak,
    'recent_xp_events', (
      SELECT json_agg(json_build_object(
        'action_type', sub.action_type,
        'points', sub.points,
        'created_at', sub.created_at
      ))
      FROM (
        SELECT action_type, points, created_at
        FROM xp_events
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) sub
    ),
    'badges', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', b.id,
        'name', b.name,
        'description', b.description,
        'icon', b.icon,
        'rarity', b.rarity,
        'earned_at', ub.earned_at
      )), '[]'::json)
      FROM user_badges ub
      JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = p_user_id
    )
  )
  FROM profiles p
  WHERE p.id = p_user_id
$$;
GRANT EXECUTE ON FUNCTION get_xp_stats TO authenticated;

-- 6. RPC to check and award badges:
CREATE OR REPLACE FUNCTION check_and_award_badges(
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_friend_count int;
  v_new_badges text[] := '{}';
  v_badge_xp int := 0;
BEGIN
  SELECT * INTO v_profile 
  FROM profiles WHERE id = p_user_id;
  
  SELECT COUNT(*) INTO v_friend_count
  FROM friendships
  WHERE (user_id = p_user_id OR friend_id = p_user_id)
  AND status = 'accepted';

  -- quests attended badges
  IF v_profile.total_quests_attended >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, 'first_quest')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || 'first_quest';
      v_badge_xp := v_badge_xp + 50;
    END IF;
  END IF;

  IF v_profile.total_quests_attended >= 5 THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, 'quest_5')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || 'quest_5';
      v_badge_xp := v_badge_xp + 100;
    END IF;
  END IF;

  IF v_profile.total_quests_organized >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, 'organizer')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || 'organizer';
      v_badge_xp := v_badge_xp + 75;
    END IF;
  END IF;

  IF v_friend_count >= 5 THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, 'social_5')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || 'social_5';
      v_badge_xp := v_badge_xp + 100;
    END IF;
  END IF;

  IF v_profile.total_gems_found >= 1 THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, 'gem_finder')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || 'gem_finder';
      v_badge_xp := v_badge_xp + 150;
    END IF;
  END IF;

  -- Award badge XP if any new badges earned
  IF v_badge_xp > 0 THEN
    INSERT INTO xp_events
      (user_id, action_type, points, reference_type)
    VALUES
      (p_user_id, 'badge_earned', v_badge_xp, 'badge');

    UPDATE profiles
    SET xp = xp + v_badge_xp,
        badge_ids = badge_ids || v_new_badges,
        level = floor(sqrt((xp + v_badge_xp) / 100.0)) + 1
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'new_badges', v_new_badges,
    'badge_xp', v_badge_xp
  );
END;
$$;
GRANT EXECUTE ON FUNCTION check_and_award_badges TO authenticated;

-- Helper to actually add XP to a profile easily:
CREATE OR REPLACE FUNCTION update_profile_xp(p_points int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET xp = xp + p_points,
      level = floor(sqrt((xp + p_points) / 100.0)) + 1
  WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION update_profile_xp TO authenticated;
