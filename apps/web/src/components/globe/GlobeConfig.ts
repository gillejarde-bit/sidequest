export const GLOBE_CONFIG = {
  // Total number of geometric shards. Lower this if your laptop struggles.
  INSTANCE_COUNT: 8000, 

  // Sphere parameters
  RADIUS_A: 3.5, // Sparse Globe radius
  RADIUS_B: 3.8, // Dense Globe radius

  // Motion physics
  ROTATION_SPEED_BASE: 0.05, // Constant Y-axis spin speed
  ROTATION_SPEED_MORPH: 0.15, // Speed multiplier during morph phase
  ARC_HEIGHT: 1.5, // Height of the curl-noise curve at progress = 0.5
  STAGGER_AMOUNT: 0.25, // Stagger offset spreading out shard animation

  // Colors
  COLOR_LIME: '#7CFC00',
  COLOR_CYAN: '#29ABE2',
  COLOR_ORANGE: '#FF7A1A',
  COLOR_OCEAN_DIM: '#23253b', // Ocean desaturated color

  // Style
  BG_NAVY: '#11132a'
} as const;
