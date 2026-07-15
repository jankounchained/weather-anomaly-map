// useCurrentWeather hook (CURR-01) - mirrors useReverseGeocode's idle/
// loading/resolved contract exactly (RESEARCH.md Anti-Patterns, PATTERNS.md
// "Async hook lifecycle"). Status/data are derived at render time from a
// single resolved-lookup object; only the async `.then`/`.catch`
// continuation ever calls setState (eslint-plugin-react-hooks 7.x
// set-state-in-effect rule - already hit and fixed in Phase 1).
// requestIdRef + a local `cancelled` flag guard against stale responses
// from rapid pin drags. Plain useState/useEffect only - no data-fetching
// library (CLAUDE.md).
import { useEffect, useRef, useState } from 'react'
import { getCurrentWeather, localDateFrom } from './client'
import type { DailySeries, UseCurrentWeatherResult, WeatherStatus } from './types'

interface ResolvedWeather {
  lat: number
  lng: number
  tempC: number | null
  localDate: string | null
  units: string | null
  recentDaily: DailySeries | null
}

/**
 * Resolves lat/lng to today's current temperature whenever both are
 * non-null, exposing an idle/loading/resolved status. Pass `null` for
 * lat/lng before a pin has been placed - status stays 'idle' and no fetch
 * fires (avoids a wasted forecast fetch against the default map center).
 * On a fetch failure, resolves with `tempC`/`localDate`/`units` all null so
 * the consumer can render its error/fallback branch (generic API-failure
 * handling, Claude's discretion per CONTEXT.md) rather than throwing an
 * unhandled rejection.
 */
export function useCurrentWeather(
  lat: number | null,
  lng: number | null,
): UseCurrentWeatherResult {
  const [resolved, setResolved] = useState<ResolvedWeather | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (lat === null || lng === null) return
    const requestId = ++requestIdRef.current
    let cancelled = false

    getCurrentWeather(lat, lng)
      .then((response) => {
        if (cancelled || requestIdRef.current !== requestId) return
        setResolved({
          lat,
          lng,
          tempC: response.current.temperature_2m,
          localDate: localDateFrom(response.current.time),
          units: response.current_units.temperature_2m,
          recentDaily: response.daily
            ? {
                time: response.daily.time,
                values: response.daily.temperature_2m_mean,
              }
            : null,
        })
      })
      .catch(() => {
        if (cancelled || requestIdRef.current !== requestId) return
        setResolved({
          lat,
          lng,
          tempC: null,
          localDate: null,
          units: null,
          recentDaily: null,
        })
      })

    return () => {
      cancelled = true
    }
  }, [lat, lng])

  if (lat === null || lng === null) {
    return {
      status: 'idle',
      tempC: null,
      localDate: null,
      units: null,
      recentDaily: null,
    }
  }
  if (resolved && resolved.lat === lat && resolved.lng === lng) {
    return {
      status: 'resolved',
      tempC: resolved.tempC,
      localDate: resolved.localDate,
      units: resolved.units,
      recentDaily: resolved.recentDaily,
    }
  }

  const status: WeatherStatus = 'loading'
  return {
    status,
    tempC: null,
    localDate: null,
    units: null,
    recentDaily: null,
  }
}
