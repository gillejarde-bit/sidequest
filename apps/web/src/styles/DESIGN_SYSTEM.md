# SideQuest Design System — Naming Convention

## The rule
Always use --sq-* tokens for colors, never hardcode hex or rgb values in JSX
or className strings. The only exception is Mapbox GL layer paint expressions
(which require literal strings).

## Surface hierarchy (warm dark, always)
--sq-bg          Page background (deepest)
--sq-surface     Elevated surface (bottom nav, sidebars)
--sq-card        Card / sheet background
--sq-card-hover  Card hover / pressed state

## Overlay tokens (for glassmorphic panels with backdrop-blur)
--sq-overlay-heavy  Panels (95% opacity)
--sq-overlay-mid    Popups, dropdowns (90%)
--sq-overlay-soft   Empty states, toasts (85%)
--sq-glass          Glassmorphic cards (80%)

## BANNED
Never use: #1A1A2E, #1A1A3E, dark:bg-[#...], any cold navy/purple surface.
Never use: raw opacity classes on surface colors. Use the overlay tokens.
Never use: dark:border-gray-800. Use border-[var(--sq-hairline-strong)].
