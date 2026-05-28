---
description: Guidelines for implementing Supabase Realtime presence, broadcast events, and location throttling.
---
# Realtime Presence Skill

## Channel Naming Conventions
- Quest specific: `quest:{id}`
- Friend updates: `friends:{user_id}`
- Global presence: `global-presence`

## Presence Payload Shape
```typescript
interface PresencePayload {
  user_id: string;
  lat: number;
  lng: number;
  heading: number;
  updated_at: string;
}
```

## Throttle Pattern
- Throttle location updates to a minimum of 10 seconds on the client.
- Use `useRef` and `Date.now()` to track the last sent timestamp.

## Cleanup Pattern
- Always return a cleanup function from `useEffect` to unsubscribe from Realtime channels: `return () => { supabase.removeChannel(channel) }`.

## Golden Rule
- NEVER write location pings to the Postgres database during active broadcasts. Use Supabase Realtime Presence/Broadcast exclusively.
