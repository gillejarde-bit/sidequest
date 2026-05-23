# New Feature Workflow
Slash Command: `/new-feature`

## Steps
1. **Schema**: Define any new tables, columns, or RLS policies needed in Supabase. Apply migration.
2. **Type Regen**: Run `pnpm supabase gen types typescript --linked > src/types/database.types.ts`.
3. **Feature**: Build the React components, forms, TanStack Query hooks, Zustand slices. Use optimistic updates.
4. **Design**: Apply Playful Minimalism styling (Tailwind classes, Framer Motion animations).
5. **QA**: Run full TypeScript and ESLint checks. Verify accessibility and mobile viewports.
