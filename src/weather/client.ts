// Open-Meteo forecast fetch client (CURR-01).
// AbortController-based ~3s timeout, matching the geocode call's shape - the
// forecast payload is tiny. Unlike reverseGeocode, failures are NOT
// swallowed into a silent fallback: a current-weather fetch failure needs
// its own distinct error state (RESEARCH.md Security Domain V5), so both a
// non-2xx response and a malformed/missing temperature_2m field throw
// rather than resolving to null/undefined/NaN. The forecast host is always
// an https:// literal, never derived from user input (T-02-02). No data-
// fetching library, no proxy/backend - a direct browser fetch (CLAUDE.md,
// PLAT-02).
import type { CurrentWeatherResponse } from './types'

const CURRENT_TIMEOUT_MS = 3000

/**
 * Fetch today's current temperature for lat/lng from Open-Meteo's forecast
 * endpoint. Throws (does not return null) on a non-2xx response or a
 * malformed/missing current.temperature_2m field (V5 defensive parsing).
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
