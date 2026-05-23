# MapLibre React Skill

## Map Instance
- Access the map instance via `useRef` and `useMap()` hook from `@vis.gl/react-maplibre`. Do NOT store the map instance in `useState`.

## Markers: Symbol Layer vs HTML Marker
- For 1-10 static points: `<Marker>` (HTML) is acceptable.
- For dynamic data (friends, quests, >10 points): ALWAYS use a GeoJSON `<Source>` and `<Layer type="symbol">`. HTML markers cause massive performance cliffs at 50+ features.

## Naming Conventions
- Source IDs: `quests-source`, `friends-source`
- Layer IDs: `quests-layer`, `friends-layer`

## Clustering
- Enable clustering on the `<Source cluster={true} clusterRadius={50} clusterMaxZoom={14}>` for datasets with >100 features.

## Tiles
- Use OpenFreeMap style URL: `https://tiles.openfreemap.org/styles/liberty`
- Nominatim geocoding: Cache results and respect 1 req/sec limit.
