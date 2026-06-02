-- Database Migration: Quest pursuit PostGIS distance calculations

CREATE OR REPLACE FUNCTION public.get_user_checkin_distance_km(p_lat float8, p_lng float8)
RETURNS float8
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_centroid geography;
  v_distance_meters float8;
BEGIN
  -- Compute the centroid of the user's previous quest attendances
  SELECT ST_Centroid(ST_Collect(l.geo::geometry))::geography INTO v_centroid
  FROM public.quest_attendance qa
  JOIN public.quests q ON q.id = qa.quest_id
  JOIN public.locations l ON l.id = q.location_id
  WHERE qa.user_id = auth.uid();

  -- If the user has no past check-ins, return 0 (no distance bonus for first check-in)
  IF v_centroid IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate ST_Distance between centroid and current check-in location (in meters)
  SELECT ST_Distance(v_centroid, ST_Point(p_lng, p_lat)::geography) INTO v_distance_meters;

  -- Return distance in kilometers
  RETURN v_distance_meters / 1000.0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_checkin_distance_km TO authenticated;
