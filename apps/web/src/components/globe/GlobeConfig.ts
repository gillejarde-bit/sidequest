export const GLOBE_CONFIG = {
  // Target tile count for the Goldberg Polyhedron (Hexasphere)
  TILE_COUNT: 1800, 

  // Sphere radius
  RADIUS: 3.5, 

  // Low hex prism dimensions (extrusion is ~2% of radius)
  HEX_HEIGHT: 0.08,
  HEX_RADIUS: 0.09,

  // Land additional extrusion uplift (~15% terrain elevation)
  LAND_EXTRUSION_ADD: 0.035,

  // Sweep transition speed (Terminator sunrise sweep speed)
  SWEEP_SPEED: 0.38, 

  // Constant Y-axis auto-rotation speed (rad/s)
  ROTATION_SPEED: 0.03,

  // Colors
  COLOR_BLACK_STATE: '#1a1c26', // Near-black starting state
  COLOR_OCEAN_TARGET: '#2167b4', // Deep blue ocean target
  COLOR_LAND_TARGET: '#4aa856',  // Green land target
  COLOR_ATMOSPHERE: '#5aa6ff',   // Subtle blue Fresnel atmosphere glow

  // Post-processing
  BLOOM_INTENSITY: 0.6
} as const;
