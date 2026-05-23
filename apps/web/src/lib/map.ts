

export const getMapConfig = () => ({
  mapboxAccessToken: import.meta.env.VITE_MAPBOX_TOKEN,
  mapStyle: import.meta.env.VITE_MAPBOX_STYLE,
  antialias: true,
})
