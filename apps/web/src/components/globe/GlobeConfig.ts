export const GLOBE_CONFIG = {
  // Total number of geometric shards. Lower this if your laptop struggles.
  INSTANCE_COUNT: 8000, 

  // Sphere parameters
  RADIUS_A: 3.5, // Sparse Globe radius
  RADIUS_B: 3.8, // Dense Globe radius

  // Motion physics
  ROTATION_SPEED_BASE: 0.04, // Constant Y-axis spin speed
  ROTATION_SPEED_MORPH: 0.12, // Speed multiplier during morph phase
  ARC_HEIGHT: 1.5, // Height of the curl-noise curve at progress = 0.5
  STAGGER_AMOUNT: 0.25, // Stagger offset spreading out shard animation

  // Colors customized for realistic Earth (land) and Water (ocean)
  COLOR_EARTH_FOREST: '#22C55E',  // Rich vibrant forest land green
  COLOR_EARTH_EMERALD: '#10B981', // Glowing emerald mountain green
  COLOR_EARTH_SAND: '#EAB308',    // Sandy gold coastlines & desert land

  COLOR_OCEAN_DEEP: '#1D4ED8',    // Deep sapphire water blue
  COLOR_OCEAN_SHALLOW: '#06B6D4', // Turquoise/cyan shallow coastal waters

  // Style
  BG_COSMOS: '#070710'
} as const;
