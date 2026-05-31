---
name: frontend-design
description: Guidelines from Anthropic for creating unique, premium frontend UIs that avoid generic AI-slop layouts, overused font stacks, and predictable designs.
---
# Frontend Design by Anthropic

Avoid generic, standard "AI-slop" designs (e.g., standard Inter font, plain white grids, simple purple-to-blue gradients, or just stacking cards without a clear narrative). Commit to high-fidelity, highly distinctive interfaces.

## 1. Aesthetic Commitments
* **Bold Conceptual Tone:** Commit fully to a coherent design style (e.g., Playful Minimalism, Brutalism, Retro-Futurism, or Premium Dark Mode).
* **Harmonious Palettes:** Avoid raw primary/secondary colors. Use custom HSL or curated semantic tokens (e.g., Duolingo Green `#58CC02`, Quest Purple `#6C63FF`).
* **Visual Depth:** Incorporate subtle gradient meshes, noise overlays, textured grain, thin borders, and layered drop shadows to make interfaces feel tactile and alive.

## 2. Distinctive Typography
* **Banned Fonts:** Banish overused, generic fonts such as *Inter*, *Roboto*, *Arial*, and *Space Grotesk*.
* **Characterful Alternatives:** Choose distinct typefaces with strong personality (e.g., *DM Sans*, *Outfit*, *Clash Display*, or premium geometric grotesque fonts) that define the app's character.
* **Typographic Scale:** Establish striking contrast between huge header displays and compact, clean reading sizes with generous tracking and line-heights.

## 3. Spatial Composition & Overlap
* Avoid building pages by simply stacking rectangular cards. Use overlapping layers, asymmetrical alignments, and grid-breaking elements.
* Give elements breathing room with generous padding. Space is a first-class design element.

## 4. Micro-Animations & Motion
* Integrate spring-physics motion (Framer Motion) on interactive states (hovers, taps, slide-ins).
* Ensure animations feel responsive and snappy rather than sluggish (e.g., `{ type: "spring", stiffness: 300, damping: 25 }`).
