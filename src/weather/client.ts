// Open-Meteo forecast + archive fetch clients (CURR-01, ANOM-04).
// AbortController-based timeouts, matching the geocode call's shape.
// Unlike reverseGeocode, failures are NOT swallowed into a silent
// fallback: a fetch failure needs its own distinct error state
// (RESEARCH.md Security Domain V5), so both a non-2xx response and a
// malformed/missing expected field throw rather than resolving to
// null/undefined/NaN. Both hosts are always https:// literals, never
// derived from user input (T-02-02, T-02-06). No data-fetching library,
// no proxy/backend - a direct browser fetch (CLAUDE.md, PLAT-02).
import type { ArchiveDailyResponse, CurrentWeatherResponse } from './types'

const CURRENT_TIMEOUT_MS = 3000
// Larger payload than the forecast call (30-year daily series) - RESEARCH
// Open Question 2 recommends 8-10s rather than reusing the 3s geocode/
// forecast timeout verbatim.
const ARCHIVE_TIMEOUT_MS = 8000

/**
 * Fetch today's current temperature AND the 7 most recent daily means
 * (past_days=6, forecast_days=1) for lat/lng from Open-Meteo's forecast
 * endpoint - a single request, D-13/VIZ-01 (RESEARCH.md Pattern 1: sourcing
 * the 7 actual daily values from the forecast API, not the archive/
 * reanalysis endpoint, sidesteps the archive's few-day observation lag).
 * Throws (does not return null) on a non-2xx response, a malformed/missing
 * current.temperature_2m field, or a malformed daily field - missing,
 * non-array time/temperature_2m_mean, mismatched array lengths, or an
 * empty time array (V5 defensive parsing, T-03-01). Individual null values
 * inside temperature_2m_mean are allowed - a legitimately-null day is
 * handled downstream by computeTrendDay's unusable-marker path (D-14).
 */
export async function getCurrentWeather(
  lat: number,
  lng: number,
): Promise<CurrentWeatherResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CURRENT_TIMEOUT_MS)
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lng))
    url.searchParams.set('current', 'temperature_2m')
    url.searchParams.set('daily', 'temperature_2m_mean')
    url.searchParams.set('past_days', '6')
    url.searchParams.set('forecast_days', '1')
    url.searchParams.set('timezone', 'auto')

    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`forecast fetch failed: ${res.status}`)
    }

    const data = (await res.json()) as CurrentWeatherResponse
    if (
      !data.current ||
      typeof data.current.temperature_2m !== 'number' ||
      !Number.isFinite(data.current.temperature_2m)
    ) {
      throw new Error('forecast fetch failed: missing temperature_2m')
    }
    if (
      !data.daily ||
      !Array.isArray(data.daily.time) ||
      data.daily.time.length === 0 ||
      !Array.isArray(data.daily.temperature_2m_mean) ||
      data.daily.time.length !== data.daily.temperature_2m_mean.length
    ) {
      throw new Error('forecast fetch failed: malformed daily series')
    }

    return data
  } finally {
    clearTimeout(timeoutId)
  }
}

/** "Today" in the pin's local calendar (Pitfall 5): splits Open-Meteo's
 * "YYYY-MM-DDTHH:mm" current.time (already location-local per
 * timezone=auto) on 'T' and takes the date portion. */
export function localDateFrom(currentTime: string): string {
  return currentTime.split('T')[0]!
}

/**
 * Fetch a 30-*complete*-past-calendar-year daily archive series for lat/lng
 * (ANOM-04). Bounds the query to [currentYear-30, currentYear-1], never
 * touching the current (partial) year, so "today" can never leak into its
 * own baseline (Pitfall 1 / RESEARCH.md Pattern 1) - the archive endpoint
 * is reserved for the baseline only; CURR-01's live temperature always
 * comes from getCurrentWeather. Accepts a `variable` param from day one
 * (STACK.md future-proofing) even though v1 only calls it with
 * 'temperature_2m_mean'. Throws (does not return null) on a non-2xx
 * response or a missing/empty daily series (V5 defensive parsing, T-02-05)
 * - an empty/malformed series must never reach anomaly.ts.
 */
export async function getHistoricalBaseline(
  lat: number,
  lng: number,
  variable: string = 'temperature_2m_mean',
): Promise<ArchiveDailyResponse> {
  const endYear = new Date().getUTCFullYear() - 1
  const startYear = endYear - 29 // 30 complete past years inclusive

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ARCHIVE_TIMEOUT_MS)
  try {
    const url = new URL('https://archive-api.open-meteo.com/v1/archive')
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lng))
    url.searchParams.set('start_date', `${startYear}-01-01`)
    url.searchParams.set('end_date', `${endYear}-12-31`)
    url.searchParams.set('daily', variable)
    url.searchParams.set('timezone', 'auto')

    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`archive fetch failed: ${res.status}`)
    }

    const data = (await res.json()) as ArchiveDailyResponse
    const series = data.daily?.[variable]
    if (
      !data.daily ||
      !Array.isArray(data.daily.time) ||
      data.daily.time.length === 0 ||
      !Array.isArray(series) ||
      series.length === 0
    ) {
      throw new Error('archive fetch failed: empty or missing daily series')
    }

    return data
  } finally {
    clearTimeout(timeoutId)
  }
}
