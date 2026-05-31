# 🗺️ 3D Micro-Geometry Earth Globe

This component renders an ultra-premium, scroll-driven 3D spinning globe made of thousands of micro-geometry crystalline shards that dynamically unfold and reassemble (staggered & morphing via orthogonal arcs) into a dense, detailed Mercator world map.

---

## 🛠️ How to Swap Shard Shapes

To customize the geometric mesh of individual shards, open **[GlobeField.tsx](file:///c:/Users/Aailx/Desktop/APP/sidequest/apps/web/src/components/globe/GlobeField.tsx)** and replace the child geometry element inside the `<instancedMesh>`:

### 1. Icosahedron Shards (Crystalline look)
```tsx
<icosahedronGeometry args={[0.035, 0]} />
```

### 2. Rectangular Box Shards
```tsx
<boxGeometry args={[0.02, 0.02, 0.08]} />
```

### 3. Directional Prism (Default)
```tsx
<coneGeometry args={[0.02, 0.08, 4]} />
```

---

## 🎛️ Tuning Parameters

All performance settings, sphere boundaries, speeds, and color tokens can be tuned inside **[GlobeConfig.ts](file:///c:/Users/Aailx/Desktop/APP/sidequest/apps/web/src/components/globe/GlobeConfig.ts)**:

```typescript
export const GLOBE_CONFIG = {
  // Total shards count. Decrease to 5000 or 6000 for low-end devices.
  INSTANCE_COUNT: 8000, 

  // Sphere Radii
  RADIUS_A: 3.5, // Sparse sphere radius
  RADIUS_B: 3.8, // Dense sphere radius

  // Motion physics
  ROTATION_SPEED_BASE: 0.05, 
  ROTATION_SPEED_MORPH: 0.15,
  ARC_HEIGHT: 1.5, // Curl-noise arc elevation peak
  STAGGER_AMOUNT: 0.25, // Stagger delays spreading out the transformation

  // Colors
  COLOR_LIME: '#7CFC00',
  COLOR_CYAN: '#29ABE2',
  COLOR_ORANGE: '#FF7A1A',
  COLOR_OCEAN_DIM: '#23253b', 
}
```
