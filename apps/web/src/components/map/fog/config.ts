// Temporary release switch for fog-of-war. Keep shared so flat map and
// world/minimap can be reverted together with a one-line change.
export const FOG_OF_WAR_ENABLED = false

export const FOG_CONFIG = {
  // H3 indexing parameters
  H3_RESOLUTION: 10,           // Resolution ~10 (~65m edge-to-edge size)
  TORCH_RING_K: 1,             // k-ring disk size to reveal around player (k=1 means current cell + 6 neighbors)

  // Zoom-scaled visual units (defined in METERS, converted to pixels on render)
  BLUR_RADIUS_METERS: 22,      // Softness edge blur radius (feathering)
  HEX_OVERLAP_METERS: 5,       // Hexagon scaling overlap to eliminate grid lines and seams
  TORCH_GLOW_METERS: 60,       // Radial ember-colored light pool centered at user

  // Geolocation throttle and filters
  DISTANCE_FILTER_METERS: 4,   // Ignore sub-meter position jitter less than 4 meters
  SPEED_LIMIT_MPS: 150,        // Anti-teleport speed limit (150 m/s = ~540 km/h) to reject GPS spoofs

  // Cozy brand color tokens (from §2 brand tokens)
  COLORS: {
    FORGE_BLACK: '#140D09',
    SMOKE: ['#1D130D', '#241A12', '#2B1D13', '#0F0A07'],
    EMBER: '#EE6C1F',
    EMBER_DEEP: '#4A2710',
    FOIL_GOLD: '#F0B45C',
    PARCHMENT: '#F0E2C8',
    DUSTY_SAGE: '#8A9A7B',
    MUTED_TEAL: '#3E7C77',
    SOFT_BROWN: '#9C7A55',
  }
}
