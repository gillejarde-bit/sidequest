# Sidequest - Session Implementation Summary

This document provides a comprehensive overview of all architectural phases, database updates, hooks, and frontend features implemented during this development session.

---

## 🗺️ Project Overview & Architecture
Sidequest is a mobile-first, real-world RPG that turns everyday hangouts into living quests. Users discover locations, coordinate quests with friends, broadcast their real-time location, and earn XP to level up.

---

## 🛠️ Phase 1 & 2: Database Schema, Map Core, & Geolocation

### 1. Database Migrations (`supabase/migrations/003_locations_and_presence.sql`)
* **User Locations (`user_locations`):** Created a table to track real-time locations (`lat`, `lng`, `heading`, `updated_at`).
* **Row-Level Security (RLS):** 
  * Users can only insert/update their own location.
  * All authenticated users can read other users' locations.
* **Las Vegas POI Seeding:** Seeded the database with 20 real Las Vegas Points of Interest (POIs) using high-precision coordinates (e.g., Red Rock Canyon, Fremont Street, Springs Preserve, Velveteen Rabbit) mapped to specific categories (`food`, `outdoors`, `nightlife`, etc.).

### 2. Geolocation Hook (`src/hooks/useGeolocation.ts`)
* Utilizes `navigator.geolocation.watchPosition` to track the user's GPS coordinates.
* Features a smart throttle of `10 seconds` to optimize battery life and minimize excessive database/API requests.

### 3. Realtime Friend Presence (`src/hooks/useFriendPresence.ts`)
* Integrates with Supabase Presence Channels (`friend-presence`) to broadcast coordinate changes.
* Broadcasts are throttled to a minimum of 10-second intervals and only trigger if the user has physically moved.
* Restores real-time friend positions on a local reactive Map.

### 4. Interactive Mapbox View (`src/pages/map.tsx`)
* Centers on Las Vegas coordinate systems.
* Renders **Friend Dots** (custom canvas layer with a bright green circle `#58CC02` and white borders) and **Quest Pins** as performant Symbol Layers instead of heavy React HTML nodes.
* **Map Filter Bar (`FilterBar.tsx`):** Lets users toggle visible map items (Quests, Friends, Hidden Gems, Food, Outdoors).

---

## 🛡️ Phase 3 & 4: Quest Creation & Attendance Flow

### 1. Quest Form Creator (`src/components/quest/QuestForm.tsx`)
* Form supporting location selection (using Nominatim OpenStreetMap API with local caching in Zustand).
* Customizable quest name, category pills (Food, Outdoors, Nightlife, Culture, Fitness, Gaming), vibe selection (Chill, Cozy, Active, Wild), date/time pickers, max party sizes, and cost tiers (`Free`, `$`, `$$`, `$$$`).
* Integrates directly with the `friendships` table to let users invite friends via checkable listings.

### 2. Database Action Integration
* Inserts new quests into the `quests` database table.
* Dispatches `quest_invites` rows for invited friends.
* Awards organizing users with XP events (`action_type: 'organize_quest'`, `30 XP`).

---

## 🏆 Phase 5: XP Core System & UI Celebrations

### 1. XP Calculations Engine (`src/lib/xp.ts`)
* Standardizes game math rules:
  * **Level Equation:** `Level = Math.floor(Math.sqrt(XP / 100)) + 1`
  * **Dynamic Titles:** Wanderer (Level 1+), Adventurer (5+), Explorer (10+), Quest Knight (15+), Quest Master (20+), Legend (30+).
  * **Rewards Chart:** attending quests (+20 XP), organizing (+30 XP), making friends (+10 XP), discovering locations (+25 XP), and finding hidden gems (+50 XP).

### 2. State Management (`src/stores/xpStore.ts`)
* A global Zustand store handling queue arrays for `pendingXP` events, badge alerts, and `levelUp` celebrations.

### 3. gamified UI Components (`src/components/xp/`)
* **`XPPopup.tsx`:** Floating animated toast pops up near the bottom of the screen when XP is earned (Framer Motion transitions, stacks elegantly, auto-dismisses).
* **`LevelUpModal.tsx`:** Full-screen modal that triggers with standard particle confetti explosions (`ConfettiExplosion`), sound-like cues, level counters, and bouncers.
* **`XPBar.tsx`:** Custom green-gradient level progress bar representing progress toward the next level milestone.
* **`BadgeCard.tsx` & `BadgeGrid.tsx`:** Renders collected badges (colored borders corresponding to `common`, `uncommon`, `rare`, and `legendary` rarities) and locks unearned ones in a sleek grayscale overlay.

---

## 💎 Phase 6: Hidden Gems & Discovery Feed

### 1. Database & Tables (`supabase/migrations/`)
* Added table `hidden_gems` (`id`, `creator_id`, `name`, `geo`, `description`, `status` [pending, approved, rejected]).
* Created custom Postgres RPC functions to query nearby gems within dynamic distance buffers and allow community consensus voting.

### 2. Nominating Hidden Gems (`src/pages/gems/nominate.tsx`)
* A multi-step flow that guides the user to pick a location on the map, take/upload a photo directly to Supabase Storage, and describe its unique vibe.

### 3. Discovery Feed (`src/pages/gems.tsx` & `src/components/gems/`)
* **Tabs:** Switch between `Nearby Gems` (approved spots nearby) and `Pending Gems` (spots awaiting verification).
* **`GemCard.tsx`:** Displays beautiful card representations containing distances, categories, and voting action triggers.
* **`VoteButtons.tsx`:** Pill actions for approving or skipping pending nominations, featuring quick confetti feedback on approval.

### 4. Approved Gems Glowing Map Layer
* Integrates approved gems onto the Mapbox canvas using a custom `gem-icon` design.
* Includes a **custom glowing breathing animation** using a calculated sine-wave cycle via `map.setPaintProperty` that pulses every 50ms for high-end visual feedback.

---

## 💅 Phase 7: UI Polishing & Google Places Integrations

### 1. Interactive Quest Popups (`src/components/map/BottomSheet.tsx`)
* Shows rich, comprehensive metadata when clicking a Quest Pin on the map.
* Displays: Quest title, location name, formatted start times, category indicators, and invited attendee profile avatars.
* **Action Controls:**
  * **View Quest:** Navigates directly to full details page.
  * **Get Directions:** Deep-links directly to Google Maps navigation route coordinates.
  * **Invite Others:** Copies the deep-link directly to user clipboard and emits positive interactive UI success states.

### 2. Intelligent Hero Photo Search Fallbacks
* **The Bug:** Seeded points did not save Google Place IDs, leaving Quest headers empty.
* **The Fix:** Implemented a robust fallback that loads the Google Places script asynchronously, detects missing place IDs, and runs a localized Google Places **Text Search** using the location's `name` and coordinates inside a 1km radius to instantly fetch real user photo reviews.
* **Category fallback gradients:** If Google has no photo, it displays a premium, custom CSS linear gradient keyed directly to the category style (e.g. emerald to teal for Outdoors, indigo to purple for Nightlife) covered in a premium circular geometric texture overlay.

### 3. Ergonomic Sheet Placement
* Shifted the sheet layout upwards from `bottom-[80px]` to `bottom-[96px]` (`bottom-24`).
* This establishes a beautiful **central overlap** where the floating circular navigation `+` button fits elegantly over the bottom sheet's central line, while keeping other action sheets spacious, high-fidelity, and fully accessible in both **Light and Dark modes**.
