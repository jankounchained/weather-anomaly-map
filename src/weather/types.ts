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
  /** The 7 most recent daily means (past_days=6 + forecast_days=1),
   * oldest->today, sourced from the SAME forecast request as `current`
   * (D-13, VIZ-01) - avoids the archive endpoint's few-day observation lag.
   * Optional/structurally mirrors ArchiveDailyResponse's daily shape, but
   * with a fixed `temperature_2m_mean` key since this endpoint's variable
   * is fixed for v1 (getCurrentWeather always requests exactly this one). */
  daily?: {
    time: string[]
    temperature_2m_mean: (number | null)[]
  }
}

/** Lifecycle status of a useCurrentWeather(lat, lng) lookup. */
export type WeatherStatus = 'idle' | 'loading' | 'resolved'

/** Hook return contract: `tempC`/`localDate`/`units`/`recentDaily` are null
 * before a pin exists (idle), while loading, or when the fetch
 * failed/malformed - the consumer renders its error/fallback branch in
 * that case. `recentDaily` reuses `DailySeries` (not a new type) - see
 * ArchiveDailyResponse/DailySeries below (VIZ-01, D-13). */
export interface UseCurrentWeatherResult {
  status: WeatherStatus
  tempC: number | null
  localDate: string | null
  units: string | null
  recentDaily: DailySeries | null
}

/** Parsed subset of Open-Meteo's /v1/archive JSON response. Only the
 * fields the baseline fetch actually uses are modeled - kept
 * dependency-free per CLAUDE.md. `daily`'s second key is dynamic (named
 * after the requested `variable`), so it's indexed rather than fixed to
 * `temperature_2m_mean` - callers read it via `daily[variable]`. */
export interface ArchiveDailyResponse {
  utc_offset_seconds?: number
  timezone?: string
  daily: {
    time: string[]
    [variable: string]: string[] | (number | null)[]
  }
}

/** A normalized daily series - `values` already resolved from the
 * archive's dynamic `daily[variable]` key - so anomaly.ts consumes it
 * without knowing the archive's variable-specific field name. */
export interface DailySeries {
  time: string[]
  values: (number | null)[]
}

/** Hook return contract: `daily` is null before a pin exists (idle), while
 * loading, or when the archive fetch failed/malformed - the consumer
 * renders its error/fallback branch in that case. */
export interface UseHistoricalBaselineResult {
  status: WeatherStatus
  daily: DailySeries | null
}
