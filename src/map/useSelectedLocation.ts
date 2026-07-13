import { useCallback, useState } from 'react'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  clampLat,
  clampLng,
  clampZoom,
  round4,
} from '../lib/coords'

export interface SelectedLocation {
  lat: number
  lng: number
  zoom: number
}

/**
 * Parse a single numeric URL param, guarded by Number.isFinite AND the
 * corresponding clamp helper (V5 input validation). Any missing, malformed,
 * or out-of-range value is treated as invalid and the caller substitutes
 * the field's own default rather than a silently-clamped value.
 */
function parseGuarded(
  raw: string | null,
  parse: (value: string) => number,
  clamp: (value: number) => number,
): number | null {
  if (raw === null) return null
  const value = parse(raw)
  if (!Number.isFinite(value)) return null
  // If clamping changes the value, it was out of range -> invalid.
  if (clamp(value) !== value) return null
  return value
}

/**
 * Read lat/lng/zoom from the URL query string. Reads once (call at mount
 * only) since MapContainer's center/zoom props are immutable after mount
 * (Pattern 2). Any missing/malformed/out-of-range field falls back to the
 * Czech Republic default (D-05) for that field.
 */
export function readLocationFromUrl(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): SelectedLocation {
  const params = new URLSearchParams(search)

  const lat = parseGuarded(
    params.get('lat'),
    (v) => parseFloat(v),
    clampLat,
  )
  const lng = parseGuarded(
    params.get('lng'),
    (v) => parseFloat(v),
    clampLng,
  )
  const zoom = parseGuarded(
    params.get('zoom'),
    (v) => parseInt(v, 10),
    clampZoom,
  )

  return {
    lat: lat ?? DEFAULT_CENTER.lat,
    lng: lng ?? DEFAULT_CENTER.lng,
    zoom: zoom ?? DEFAULT_ZOOM,
  }
}

/**
 * Write lat/lng/zoom to the URL query string via history.replaceState
 * (never pushState/location assignment - Pitfall 2/Anti-Patterns). Lat/lng
 * are rounded to 4 decimals (D-10) before writing.
 */
export function writeLocationToUrl(
  lat: number,
  lng: number,
  zoom: number,
): void {
  const params = new URLSearchParams(window.location.search)
  params.set('lat', String(round4(lat)))
  params.set('lng', String(round4(lng)))
  params.set('zoom', String(zoom))
  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, '', newUrl)
}

/**
 * Single source of truth for the selected lat/lng/zoom. Reads the URL once
 * at mount into state and exposes a setter that updates state and writes
 * through to the URL. No duplicate location state should exist elsewhere.
 */
export function useSelectedLocation() {
  const [location, setLocationState] = useState<SelectedLocation>(() =>
    readLocationFromUrl(),
  )

  const setLocation = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      setLocationState((prev) => {
        const nextZoom = zoom ?? prev.zoom
        writeLocationToUrl(lat, lng, nextZoom)
        return { lat: round4(lat), lng: round4(lng), zoom: nextZoom }
      })
    },
    [],
  )

  return { ...location, setLocation }
}
