// useHistoricalBaseline hook (ANOM-04) - mirrors useCurrentWeather's/
// useReverseGeocode's idle/loading/resolved contract exactly (RESEARCH.md
// Anti-Patterns, PATTERNS.md "Async hook lifecycle"), with a third
// dependency (`variable`) added to the resolved-lookup key and the effect
// dependency array (STACK.md's useHistoricalBaseline(lat, lon, variable)
// shape). Status/data are derived at render time from a single
// resolved-lookup object; only the async `.then`/`.catch` continuation
// ever calls setState (eslint-plugin-react-hooks 7.x set-state-in-effect
// rule). requestIdRef + a local `cancelled` flag guard against stale
// responses from rapid pin drags. Plain useState/useEffect only - no
// data-fetching library (CLAUDE.md).
import { useEffect, useRef, useState } from 'react'
import { getHistoricalBaseline } from './client'
import type { DailySeries, UseHistoricalBaselineResult, WeatherStatus } from './types'

interface ResolvedBaseline {
  lat: number
  lng: number
  variable: string
  daily: DailySeries | null
}

/**
 * Resolves lat/lng/variable to the 30-complete-past-year day-of-year daily
 * archive series whenever lat/lng are non-null, exposing an idle/loading/
 * resolved status. Pass `null` for lat/lng before a pin has been placed -
 * status stays 'idle' and no fetch fires (avoids a wasted archive fetch
 * against the default map center). On a fetch failure, resolves with
 * `daily` null so the consumer can render its error/fallback branch
 * (generic API-failure handling, Claude's discretion per CONTEXT.md)
 * rather than throwing an unhandled rejection.
 */
export function useHistoricalBaseline(
  lat: number | null,
  lng: number | null,
  variable: string = 'temperature_2m_mean',
): UseHistoricalBaselineResult {
  const [resolved, setResolved] = useState<ResolvedBaseline | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (lat === null || lng === null) return
    const requestId = ++requestIdRef.current
    let cancelled = false

    getHistoricalBaseline(lat, lng, variable)
      .then((response) => {
        if (cancelled || requestIdRef.current !== requestId) return
        setResolved({
          lat,
          lng,
          variable,
          daily: {
            time: response.daily.time,
            values: response.daily[variable] as (number | null)[],
          },
        })
      })
      .catch(() => {
        if (cancelled || requestIdRef.current !== requestId) return
        setResolved({ lat, lng, variable, daily: null })
      })

    return () => {
      cancelled = true
    }
  }, [lat, lng, variable])

  if (lat === null || lng === null) {
    return { status: 'idle', daily: null }
  }
  if (
    resolved &&
    resolved.lat === lat &&
    resolved.lng === lng &&
    resolved.variable === variable
  ) {
    return { status: 'resolved', daily: resolved.daily }
  }

  const status: WeatherStatus = 'loading'
  return { status, daily: null }
}
