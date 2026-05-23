# Sidequest

Sidequest turns everyday hangouts into living quests on a real-world map. Users create Quests (planned social activities anchored to a real location), invite friends, show up, and earn XP. Think: Life360 meets Duolingo meets an open-world RPG.

## Core Loop
Create Quest → Invite Friends → Show Up → Complete → Earn XP → Level Up → Discover More

## Tech Stack
- Frontend: Vite + React 18 + TypeScript (strict mode, no "any"), Tailwind CSS v4, shadcn/ui, Framer Motion, Zustand, TanStack Query v5, TanStack Router, react-maplibre (vis.gl)
- Map tiles: https://www.mapbox.com/ (Wait, using OpenFreeMap in practice for free tiles)
- Backend: Supabase (Postgres + PostGIS, Auth, Realtime, Storage, Edge Functions)
- External APIs: OpenFreeMap, Nominatim, Overpass API, Google Gemini API
- Hosting: Cloudflare Pages
- Package Manager: pnpm

## Hard Rules
1. TypeScript strict mode. Zero `any`. Zero type suppressions.
2. All Supabase tables have RLS enabled and policies defined.
3. Location columns use `geography(Point, 4326)` type with GIST index.
4. Realtime friend location uses Presence/Broadcast ONLY — never Postgres Changes for location pings.
5. Map markers for friends/quests are MapLibre symbol layers, NOT React-rendered HTML markers.
6. Location updates throttled to minimum 10 seconds on client.
7. After every migration: run `pnpm supabase gen types typescript --linked > src/types/database.types.ts`
8. Mobile-first: design for 375px viewport. Scale up, not down.
9. One feature per agent session. Finish it before starting next.
10. Package manager is pnpm only.

## Design System: Playful Minimalism
- Philosophy: Minimal UI, maximum delight.
- Colors:
  - Primary: #58CC02 (Duolingo green)
  - Secondary: #6C63FF (quest purple)
  - Accent: #FF6B6B (warm coral)
  - Surface: #FAFAF8
  - Dark: #1A1A2E
  - Muted: #A8A8B3
- Typography: DM Sans
- Animations: Framer spring defaults { type: "spring", stiffness: 300, damping: 25 }
