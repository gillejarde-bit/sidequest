// Live weather for the World HUD. Open-Meteo: free, keyless, CORS-friendly.
// Keyed on the player's GPS. Used by the top-of-map time/weather pill.

export interface WeatherNow {
  tempF: number
  code: number // WMO weather code
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherNow | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}` +
      `&longitude=${lng.toFixed(3)}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } }
    const c = j.current
    if (!c || c.temperature_2m == null || c.weather_code == null) return null
    return { tempF: Math.round(c.temperature_2m), code: c.weather_code }
  } catch {
    return null
  }
}

/** Short human label for a WMO weather code. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Cloudy'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code >= 85 && code <= 86) return 'Snow'
  if (code >= 95) return 'Storm'
  return 'Clear'
}

/** Coarse icon bucket for a WMO code (mapped to a lucide icon in the view). */
export type WeatherKind = 'clear' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm'
export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return 'clear'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'rain'
  if (code >= 85 && code <= 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloud'
}
