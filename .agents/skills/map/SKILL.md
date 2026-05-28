---
name: map
description: Guidelines for implementing Mapbox maps, markers, clustering, and map styles in React.
---
# Mapbox React Skill

## Map Instance
- Access the map instance via `useRef<MapRef>(null)` and `useMap()` hook from `react-map-gl`. Do NOT store the map instance in `useState`.
- Clean up channels on unmount.

## Markers: Symbol Layer vs HTML Marker
- For 1-10 static points: `<Marker>` (HTML) is acceptable.
- For dynamic data (friends, quests, >10 points): ALWAYS use a GeoJSON `<Source>` and `<Layer type="symbol">`. HTML markers cause massive performance cliffs at 50+ features.

## Naming Conventions
- Source IDs: `quests-source`, `friends-source`
- Layer IDs: `quests-layer`, `friends-layer`

## Clustering
- Enable clustering on the `<Source cluster={true} clusterRadius={50} clusterMaxZoom={14}>` for datasets with >100 features.

## Tiles & Map Style
- Use Mapbox Studio custom style URL via `.env.local` (`VITE_MAPBOX_STYLE`).
- Mapbox Token MUST be accessed via `import.meta.env.VITE_MAPBOX_TOKEN`.
- Throttle location broadcasts to 10s.
