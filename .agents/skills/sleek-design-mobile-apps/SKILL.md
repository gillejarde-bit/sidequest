---
name: sleek-design-mobile-apps
description: Design system guidelines for creating sleek, premium, mobile-first layouts featuring bento grids, glassmorphism, floating sheets, and spring gestures.
---
# Sleek Mobile App Design

A comprehensive set of principles to create stunning, premium, tactile mobile layouts.

## 1. Bento Grids & Card Frameworks
* **Content Segmentation:** Group controls and displays into clean, differently-sized rectangular containers (Bento grid style) to organize complex data.
* **Unified Border Radius:** Use consistent, rounded edges (e.g., `rounded-2xl` or `16px`) to make layout systems cohesive and premium.

## 2. Sleek Glassmorphism & Translucency
* **Atmospheric Backdrop Filters:** Create premium overlays using semi-transparent white or dark sheets coupled with intense blur backdrops:
  ```css
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  ```
* **Inner Borders (Glow):** Apply 1px semi-transparent top borders to mimic realistic physical glass catching light.

## 3. Gestures & Floating Shells
* **Sheet Physics:** Animate overlay sheet entries and gestures using highly-responsive springs (stiffness 300, damping 25/30) to feel organic to the touch.
* **Floating Components:** Position main actions (like bottom tabs or floating action buttons) slightly away from screen edges with rich shadows to emphasize depth layers.
