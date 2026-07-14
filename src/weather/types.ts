// Open-Meteo forecast display contract shared by the fetch client and the
// useCurrentWeather hook. Only the fields the app actually uses from the
// forecast endpoint's response are modeled here - kept dependency-free per
// CLAUDE.md.

/** Parsed subset of Open-Meteo's /v1/forecast JSON response. */
export interface CurrentWeatherResponse {
  /** Location-local UTC offset in seconds (timezone=auto). */
  utc_offset_seconds: number
  /** IANA timezone name resolved by timezone=auto. */
  timezone: string
  current: {
    /** "YYYY-MM-DDTHH:mm", already location-local when timezone=auto. */
    time: string
    /** Current air temperature at 2m, in the unit given by current_units. */
    temperature_2m: number
  }
  current_units: {
    /** Unit string (e.g. "°C") for current.temperature_2m. */
    temperature_2m: string
  }
}

/** Lifecycle status of a useCurrentWeather(lat, lng) lookup. */
export type WeatherStatus = 'idle' | 'loading' | 'resolved'

/** Hook return contract: `tempC`/`localDate`/`units` are null before a pin
 * exists (idle), while loading, or when the fetch failed/malformed - the
 * consumer renders its error/fallback branch in that case. */
export interface UseCurrentWeatherResult {
  status: WeatherStatus
  tempC: number | null
  localDate: string | null
  units: string | null
}
