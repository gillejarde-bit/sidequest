# Add Migration Workflow
Slash Command: `/add-migration`

## Steps
1. **Write SQL**: Create a new `.sql` file in `supabase/migrations/`. Include both UP and DOWN operations (if applicable).
2. **Apply**: Apply the migration to the local Supabase instance.
3. **Regen Types**: Run `pnpm supabase gen types typescript --linked > src/types/database.types.ts`.
4. **Verify RLS**: Ensure the migration includes RLS policies for any new tables and verify them.
