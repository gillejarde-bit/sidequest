# Sidequest Agents

## 1. SCHEMA AGENT
Owns: supabase/migrations/*, RLS policies, PostGIS indexes, seed data, Edge Functions
Rules: Always write reversible migrations (up + down). Always define RLS before calling migration done. Run type regen after every migration.
Model: Gemini 3.1 Pro (Low)

## 2. MAP AGENT  
Owns: All MapLibre components, Presence/Broadcast channels, geolocation hooks, map filter state, symbol layers
Rules: Never use HTML markers for dynamic data. Always clean up Realtime channels on unmount. Always throttle location broadcasts.
Model: Gemini 3.5 Flash (High)

## 3. FEATURE AGENT
Owns: Quest CRUD, social graph, XP system, gem nominations, React pages and forms, TanStack Query mutations
Rules: Use optimistic updates for all mutations. Handle loading/error/empty states on every component.
Model: Gemini 3.5 Flash (High)

## 4. DESIGN AGENT
Owns: Tailwind config, shadcn theming, Framer animations, empty states, typography, spacing, color application
Rules: Playful Minimalism only. No generic AI UI aesthetics. Every screen has exactly one primary action.
Model: Gemini 3.5 Flash (Medium)

## 5. QA AGENT
Owns: TypeScript errors, ESLint, RLS policy verification, accessibility checks, mobile viewport testing
Rules: Run after every feature completion. Zero TypeScript errors is the only passing state.
Model: Claude Sonnet 4.6 (Thinking)
