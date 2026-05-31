---
name: web-design-guidelines
description: Core web design principles focusing on semantic HTML, color harmony, typography systems, dark/light modes, and universal accessibility.
---
# Universal Web Design Guidelines

High-fidelity standards for designing modern, responsive, and globally accessible web applications.

## 1. Cohesive Typography & Sizing
* **Font Scales:** Use an exact geometric typographic scale (e.g., base of `16px` scaling to `1.25x` for display headings).
* **Line Heights:** Use proportional line-heights (`1.2` for headings, `1.5` to `1.6` for readable body text).
* **Whitespace Rhythm:** Implement a consistent spacing system (e.g., a baseline grid of `4px` / `8px` multiples) to balance layout composition.

## 2. Dynamic Theming (Light / Dark Mode)
* **CSS Custom Variables:** Define tokens using HSL colors to allow smooth, real-time transitions:
  ```css
  :root {
    --bg-primary: 0 0% 98%;
    --text-primary: 240 10% 3.9%;
  }
  .dark {
    --bg-primary: 240 10% 3.9%;
    --text-primary: 0 0% 98%;
  }
  ```
* **Contrast Compliance:** Ensure text-to-background contrast passes standard WCAG AAA/AA ratings (minimum `4.5:1` for regular text).
* **Dynamic Media Adjustments:** Mute bright images and glowing gradients slightly in dark mode using CSS filters to avoid eye strain.

## 3. Responsive Layout System
* **Mobile-First Design:** Write styling for a standard `375px` viewport, then scale elements up to tablet (`768px`) and desktop (`1024px+`) screens.
* **Semantic HTML:** Always use semantic elements (`<main>`, `<section>`, `<article>`, `<header>`, `<footer>`, `<nav>`) to establish logical structural trees for accessibility and search indexing.
