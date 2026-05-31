---
name: vercel-react-best-practices
description: Official rules from Vercel for optimizing React and Next.js performance, bundle sizes, caching strategies, and data-fetching patterns.
---
# Vercel React Best Practices

A performance-first guide to building efficient, fast, and bundle-optimized React/Vite applications.

## 1. Eliminate Data-Fetching Waterfalls
* **Never Sequential:** Avoid fetching data inside nested components where child requests are blocked by parent requests.
* **Batching & Parallelism:** Fetch initial layout requirements in parallel at the page level, or leverage parallelized TanStack Query queries (`useQueries`).
* **Optimistic Updates:** Implement optimistic UI updates for interactive actions to hide server round-trip latency.

## 2. Re-Render & State Management Optimizations
* **State Co-location:** Keep state as close as possible to the component that uses it. Do not elevate state globally unless multiple separate subtrees require it.
* **Optimize Zustand Stores:** Use granular selectors to prevent components from re-rendering on unrelated store updates:
  ```typescript
  // GOOD: Component only re-renders if activeFilters changes
  const activeFilters = useMapStore((state) => state.activeFilters);
  ```
* **Avoid Unnecessary useState:** Use `useRef` for values that do not affect the visible layout (e.g., throttling timers, map instances, intervals, network connection caches).

## 3. Client-Side Performance
* **Dynamic Imports:** Use React lazy-loading (`React.lazy` or dynamic imports) for complex pages or heavy components (like Mapbox GL canvas layers or chart elements) to decrease the initial JS bundle size.
* **Component Memoization:** Use `useMemo` and `useCallback` strategically to wrap intensive computation or reference-based inputs passed to deeply nested child components.
