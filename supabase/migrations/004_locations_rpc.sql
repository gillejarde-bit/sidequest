-- 004_locations_rpc.sql
-- Creates an RPC to return locations with extracted lat/lng from the PostGIS geo column.
-- The locations table stores coordinates as geography(Point, 4326), which Supabase returns
-- as a WKB hex string via the REST API. This function extracts numeric lat/lng instead.

DROP FUNCTION IF EXISTS get_locations_with_coords();

CREATE OR REPLACE FUNCTION get_locations_with_coords()
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  description text,
  address text,
  is_hidden_gem boolean,
  lat float8,
  lng float8
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    name,
    category,
    description,
    address,
    is_hidden_gem,
    ST_Y(geo::geometry) AS lat,
    ST_X(geo::geometry) AS lng
  FROM locations
$$;

GRANT EXECUTE ON FUNCTION get_locations_with_coords() TO authenticated;
GRANT EXECUTE ON FUNCTION get_locations_with_coords() TO anon;
