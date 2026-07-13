// BigDataCloud reverse-geocoding fetch + hook (D-01, LOC-02).
// AbortController-based ~3s timeout with a graceful fallback (D-02):
// every non-2xx (including the documented 402 fair-use response),
// network error, or abort/timeout resolves to `null` via the same path -
// no special-case branching (Pitfall 3). The caller renders the rounded
// coordinates when `name` is null. No data-fetching library, no proxy/
// backend - a direct browser fetch (CLAUDE.md, PLAT-02).
import { useEffect, useRef, useState } from 'react'
import type { ReverseGeocodeStatus, UseReverseGeocodeResult } from './types'

const TIMEOUT_MS = 3000

/**
 * Resolve lat/lng to a display place-name string, or null on any failure
 * (non-2xx, network error, abort/timeout, or no usable name fields).
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const url = new URL(
      'https://api.bigdatacloud.net/data/reverse-geocode-client',
    )
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lng))
    url.searchParams.set('localityLanguage', 'en')

    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null // includes 402 fair-use ban -> fall back

    const data = await res.json()
    const parts = [data.city || data.locality, data.principalSubdivision, data.countryName].filter(
      Boolean,
    )
    return parts.length > 0 ? parts.join(', ') : null
  } catch {
    return null // network error or abort/timeout -> fall back
  } finally {
    clearTimeout(timeoutId)
  }
}

interface ResolvedLookup {
  lat: number
  lng: number
  name: string | null
}

/**
 * Resolves lat/lng to a place name whenever both are non-null, exposing an
 * idle/loading/resolved status. Pass `null` for lat/lng before a pin has
 * been placed - status stays 'idle' and no fetch fires (avoids a wasted
 * lookup against the default map center). `name` is null when the lookup
 * failed/timed out - the consumer shows the coordinate fallback in that
 * case (D-02). Status/name are derived from render-time comparison rather
 * than set synchronously in the effect body, so only the async lookup
 * continuation (inside the `.then` callback) ever calls setState. Plain
 * useState/useEffect only - no data-fetching library (CLAUDE.md).
 */
export function useReverseGeocode(
  lat: number | null,
  lng: number | null,
): UseReverseGeocodeResult {
  const [resolved, setResolved] = useState<ResolvedLookup | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (lat === null || lng === null) return
    const requestId = ++requestIdRef.current
    let cancelled = false

    reverseGeocode(lat, lng).then((name) => {
      // Ignore stale responses from a superseded/cancelled lat/lng change.
      if (cancelled || requestIdRef.current !== requestId) return
      setResolved({ lat, lng, name })
    })

    return () => {
      cancelled = true
    }
  }, [lat, lng])

  if (lat === null || lng === null) {
    return { status: 'idle', name: null }
  }
  if (resolved && resolved.lat === lat && resolved.lng === lng) {
    return { status: 'resolved', name: resolved.name }
  }

  const status: ReverseGeocodeStatus = 'loading'
  return { status, name: null }
}
