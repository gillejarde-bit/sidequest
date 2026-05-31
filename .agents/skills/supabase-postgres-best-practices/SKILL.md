---
name: supabase-postgres-best-practices
description: Standards for writing Supabase migrations, idempotent database schemas, secure RLS policies, seed scripts, and Postgres PostGIS configurations.
---
# Supabase & Postgres Best Practices

A guide to constructing secure, fast, and idempotent PostgreSQL schemas and integrations inside Supabase.

## 1. Idempotency & Safety
* **Reversible & Idempotent Migrations:** Every migration must be safe to execute multiple times without error. Always use `DROP TABLE IF EXISTS`, `DROP POLICY IF EXISTS`, and `ON CONFLICT DO NOTHING` statements.
* **Explicit schema references:** Always specify target schemas explicitly (typically `public.`) when defining functions or triggers to prevent path execution hijacking.

## 2. Row-Level Security (RLS) & Policies
* **RLS is Mandatory:** Always enable RLS on every table created:
  ```sql
  ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
  ```
* **Granular Policies:** Separate insert, select, update, and delete access. Never use wildcard operations for broad access. Use specific `USING` and `WITH CHECK` clauses:
  ```sql
  CREATE POLICY "Users can edit their own locations"
  ON public.user_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  ```

## 3. Spatial Data & PostGIS Performance
* **Correct Geography Types:** Store spatial points using `geography(Point, 4326)` for accurate distance calculation on the earth's surface.
* **GIST Indexing:** Create GIST indexes on spatial columns to keep distance buffer and containment operations extremely fast:
  ```sql
  CREATE INDEX IF NOT EXISTS user_locations_geo_idx ON public.user_locations USING gist (geo);
  ```
* **Performance-First RPCs:** Restrict RPC operations using spatial index constraints (like `ST_DWithin` or bounding box queries) before executing complex joins.
