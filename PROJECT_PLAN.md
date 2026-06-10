# SideQuest — Project Plan & Codebase Analysis

> Combined context from the "Go Side Quest analysis" review chat and the development handoff.
> Last updated: 2026-06-09

## ✅ STATUS UPDATE (2026-06-09): Patches 1–4 IMPLEMENTED

All four patches below have been applied directly to the codebase:

- **Patch 1 (code health):** `BottomNav` extracted to `src/components/nav/BottomNav.tsx`; the five H3 wrapper functions deleted (direct `h3.*` calls now); `maplibre-gl` removed from `package.json` (run `pnpm install` once to prune the lockfile); `any[]` state in `map.tsx` replaced with types derived from `database.types.ts` (`QuestMapItem`, `GemMapItem`, `QuestMapPin`, `GooglePlaceResult`).
- **Patch 2 (design tokens):** overlay tokens (`--sq-overlay-heavy/mid/soft`, `--sq-glass`) added to `tokens.css`; every `#1A1A2E` occurrence replaced with tokens across `map.tsx`, `BottomSheet.tsx`, `SearchBar.tsx`, `Toast.tsx`, `XPPopup.tsx`; `src/styles/DESIGN_SYSTEM.md` created.
- **Patch 3 (fog architecture):** fog computation moved to `src/workers/fogWorker.ts` (Web Worker, off main thread) behind the new `useFogGeometry` hook (`src/hooks/useFogGeometry.ts`); `vite.config.ts` got `worker: { format: 'es' }`; ~155-line fog `useEffect` removed from `map.tsx`.
- **Patch 4 (pursuit visibility):** quest map markers show a pursuit-colored pip; `QuestCard` shows a `[dot] Noun · +20 XP` badge; quest detail page shows an XP-preview block (primary +20, pioneer +15 conditional, vibe secondary +10) above the check-in button.

Remaining open items: findings 5 (poll+realtime redundancy), 7 (auth init race), 10 (offline support), 12 (Las Vegas fallback).

---

## 1. Current State

- pnpm monorepo; frontend at `apps/web/` (React 19 + Vite + Supabase + Mapbox GL).
- `apps/web/.env.local` configured (Supabase URL/anon key, Mapbox token/style, Google Maps key).
- `main` builds successfully (`npm run build` in `apps/web/`).

### Recently completed (map page fixes)
- **Event lock released** — timer bug in `FireLoadingScreen.tsx` left an invisible overlay blocking all map interaction; fixed, map fully interactive.
- **Uncontrolled viewport** — `<Map>` converted to `initialViewState` to avoid conflicts with programmatic camera centering.
- **Ambient glowing hexagon grid** — debounced viewport-center H3 grid over unexplored fog (4px blur, `#EE6C1F` @ 12%).
- **Flickering firelight user torch** — user torch glow scaled up and animated with framer-motion.
- **Zoom control offsets** — Mapbox zoom controls shifted up 170px above recenter button / bottom nav.

---

## 2. Codebase Review — 12 Findings

**Strengths:** Supabase + PostGIS + H3 fog-of-war architecture; clean pure archetype engine (`deriveArchetype.ts`); disciplined `--sq-*` token system; strong craft (custom font, SVG wobble filters, stamp ceremony).

**Problems:**

1. **`map.tsx` is a 1,210-line god component** — fog GeoJSON, quest/gem/friend markers, camera follow, happening-soon panel, search pins, bottom sheet, avatar stacking, loading gate. ~8 responsibilities in one file.
2. **Fog GeoJSON computed on the main thread** — `cellsToMultiPolygon` across 6 resolutions on every `revealSet` change; will jank as explored area grows. Needs a Web Worker.
3. **Both mapbox-gl AND maplibre-gl in dependencies** — only Mapbox is used; ~500KB dead weight.
4. **Two competing dark palettes** — warm `--sq-bg: #1E140E` tokens vs hardcoded cool navy `#1A1A2E` throughout `map.tsx`.
5. **BottomNav polls AND subscribes** for quest invites (React Query 10s poll + Supabase realtime channel). Redundant.
6. **`router.tsx` is 666 lines with BottomNav inside it** — extract.
7. **Auth init race condition** — `auth.ts` and `requireAuth` both call `supabase.auth.getSession()` concurrently on cold load.
8. **Pointless H3 compat wrappers** — five functions that re-call h3-js with identical args. Delete.
9. **Archetype system invisible during quest discovery** — users never see pursuit type or XP before joining. Biggest unrealized engagement hook.
10. **No offline support** — no service worker, no React Query persistence; app fails silently without connectivity.
11. **`any` everywhere in map.tsx** despite generated `database.types.ts`.
12. **Las Vegas fallback location** — `getLastKnownLocation()` defaults to `{-115.1398, 36.1699}` for a global app.

---

## 3. Fix Plan — 4 Ordered Patches

Run in sequence: **1 → 2 → 3 → 4**. Each is independently verifiable.

### PATCH 1 — Code Health
- Extract `BottomNav` from `router.tsx` → `apps/web/src/components/nav/BottomNav.tsx` (no behavior change).
- Delete the 5 H3 wrapper functions in `map.tsx` (lines ~34–52); call `h3.*` directly.
- `pnpm remove maplibre-gl` in `apps/web/`.
- Replace `any`/`any[]` state types in `map.tsx` using `database.types.ts`; add local `QuestMapPin` interface for `selectedQuest`.

**Verify:** BottomNav identical (nav dot animation, More popup, badges); map.tsx compiles; install succeeds without maplibre-gl; no new TS errors.

### PATCH 2 — Design System: Token Unification
- Extend `tokens.css`:
  ```css
  --sq-overlay-heavy: rgba(42, 28, 20, 0.95); /* panels */
  --sq-overlay-mid:   rgba(42, 28, 20, 0.90); /* popups */
  --sq-overlay-soft:  rgba(42, 28, 20, 0.85); /* empty states */
  --sq-glass:         rgba(51, 35, 26, 0.80); /* glass cards */
  ```
- Replace all `#1A1A2E` variants in `map.tsx` (~12 sites):
  - `dark:bg-[#1A1A2E]/95` → `bg-[var(--sq-overlay-heavy)]`
  - `dark:bg-[#1A1A2E]/90` → `bg-[var(--sq-overlay-mid)]`
  - `dark:bg-[#1A1A2E]/85` → `bg-[var(--sq-overlay-soft)]`
  - `dark:bg-[#1A1A2E]` → `bg-[var(--sq-surface)]`
  - `dark:border-gray-800` → `border-[var(--sq-hairline-strong)]`
- Add `apps/web/src/styles/DESIGN_SYSTEM.md` with the naming convention:
  - Always `--sq-*` tokens; never hardcoded hex/rgb in JSX or className (exception: Mapbox GL paint expressions).
  - Surface hierarchy: `--sq-bg` → `--sq-surface` → `--sq-card` → `--sq-card-hover`.
  - Overlay tokens for glassmorphic panels.
  - **Banned:** `#1A1A2E`, any cold navy/purple surface, `dark:bg-[#...]`, raw opacity classes on surfaces, `dark:border-gray-800`.

**Verify:** zero `#1A1A2E` in src/; happening-soon panel, empty state, recenter button render warm brown; no build errors.

### PATCH 3 — Map Architecture: Hook + Web Worker Fog
- Extract fog useEffect (map.tsx ~216–372) → `apps/web/src/hooks/useFogGeometry.ts`:
  ```ts
  export function useFogGeometry(revealSet: Set<string>): {
    fogData: Record<number, GeoJSON.Feature>,
    linesData: Record<number, GeoJSON.FeatureCollection>
  }
  ```
  Hook owns the 150ms debounce.
- Move CPU-heavy compute → `apps/web/src/workers/fogWorker.ts`:
  - Messages: `{ type: 'COMPUTE', cells: string[] }` → `{ type: 'RESULT', fogData, linesData }`.
  - Instantiate once via `new Worker(new URL('../workers/fogWorker.ts', import.meta.url), { type: 'module' })`; terminate on unmount.
  - Worker imports only h3-js (no React/DOM). Move `hashCellToWarmColor` into the worker.
  - Ensure `vite.config.ts` has `worker: { format: 'es' }`.

**Verify:** map.tsx only calls the hook; fog renders at all zooms; DevTools Performance shows no main-thread blocking on revealSet updates.

### PATCH 4 — Product: Surface Pursuit/XP During Quest Discovery
Uses existing `categoryPursuitMap` (food→gastronomy, outdoors→wilds, nightlife→revelry, culture→lore, fitness→athletics, gaming→lore), pursuit colors, and `XP_REWARDS` (checkinPrimary 20, checkinSecondary 10, pioneerBonus 15). No new Supabase queries.

1. **Map quest markers:** 4×4px pursuit-colored pip above the star pin (omit if category unmapped).
2. **QuestCard:** pill badge — `[colored dot] PursuitNoun · +20 XP` (bg = pursuit color @ 15%, text = pursuit color, 10px/800).
3. **Quest detail:** compact "Check in to earn:" XP breakdown above the check-in button, incl. pioneer bonus with "(if first visit)" qualifier.

**Verify:** food quest = amber pip, outdoors = green; badges correct in feed; XP block on detail page; graceful fallback for category `other`/null; no TS/console errors.

---

## 4. Deferred / Future

- **Offline support** — separate architectural decision (IndexedDB persistence? Workbox? Background sync for check-ins?). Needs its own design conversation first.
- **Redundant invite polling (finding 5)**, **auth race (7)**, **Las Vegas fallback (12)** — not yet covered by a patch; schedule after Patch 4.

---

## 5. Security Notes

- Keep `.env.local` gitignored (contains live keys).
- Keys were shared in plaintext during handoff — rotate the Google Maps key and add referrer restrictions.
