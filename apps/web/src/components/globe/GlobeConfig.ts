export const GLOBE_CONFIG = {
  // Total number of dynamic crystalline shards
  INSTANCE_COUNT: 13500, 

  // Sphere boundaries adjusted so it fits perfectly on standard viewports without overflowing
  RADIUS_A: 2.3, // Sparse Globe radius
  RADIUS_B: 2.6, // Dense Globe radius

  // Motion physics
  ROTATION_SPEED_BASE: 0.05, // Constant Y-axis spin speed
  ROTATION_SPEED_MORPH: 0.15, // Speed multiplier during morph phase
  ARC_HEIGHT: 1.5, // Height of the curl-noise curve at progress = 0.5
  STAGGER_AMOUNT: 0.25, // Stagger offset spreading out shard animation

  // Vibrant landmass colors mapped to Ember theme palette
  COLOR_LIME: '#EE6C1F',      // Phoenix Ember Orange
  COLOR_CYAN: '#F4862E',      // Ember Bright Orange
  COLOR_ORANGE: '#F0B45C',    // Foil Gold
  COLOR_OCEAN_DIM: '#29201A', // Hearth Brown

  // Space style
  BG_COSMOS: '#1B1410',
  BLOOM_INTENSITY: 1.2
} as const;
