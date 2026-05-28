---
description: PostGIS queries, functions, and patterns for geospatial database operations in PostgreSQL.
---
# PostGIS Queries Skill

## Rules
- Always use `geography(Point, 4326)` for meter-accurate distance calculations. Do not use `geometry`.

## Common Queries

### Quests within X meters
```sql
SELECT * FROM quests q
JOIN locations l ON q.location_id = l.id
WHERE ST_DWithin(
  l.geo, 
  ST_Point(user_lng, user_lat)::geography, 
  radius_in_meters
);
```

### Friends Nearby
Apply the exact same `ST_DWithin` pattern on the user's last known locations if persisted, or use Realtime for live updates.

### Nearest Gems
```sql
SELECT *, ST_Distance(geo, ST_Point(user_lng, user_lat)::geography) as dist
FROM locations
WHERE is_hidden_gem = true
ORDER BY geo <-> ST_Point(user_lng, user_lat)::geography
LIMIT 10;
```
*(Note: `<->` operator uses index for fast nearest neighbor search)*
