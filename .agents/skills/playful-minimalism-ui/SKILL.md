---
description: Philosophy and guidelines for creating playful, minimalist UI with vibrant colors and Framer Motion animations.
---
# Playful Minimalism UI Skill

## Philosophy
Minimal UI, maximum delight. Playful Minimalism only. No generic AI UI aesthetics. "One primary action per screen" rule.

## Colors & Theming
- Primary: `#58CC02` (Success, XP, CTAs)
- Secondary: `#6C63FF` (Map pins, highlights)
- Accent: `#FF6B6B` (Alerts, gems, energy)
- Surface: `#FAFAF8`
- Dark: `#1A1A2E`
- Muted: `#A8A8B3`

## Typography
- DM Sans, rounded, friendly, clear.

## Animations (Framer Motion)
- Use spring physics for all interactions.
- Default transition: `{ type: "spring", stiffness: 300, damping: 25 }`
- Hover states: Slight scale up (`whileHover={{ scale: 1.05 }}`)
- Tap states: Slight scale down (`whileTap={{ scale: 0.95 }}`)
- XP events: Bounce animation + number counter
- Level up: Full-screen confetti

## Component Patterns
- All cards/buttons: `rounded-2xl` minimum.
- Shadows: Soft, layered (`shadow-sm`, `shadow-md`), no hard drop shadows.
- Empty states: Include illustration + single line of personality copy.
