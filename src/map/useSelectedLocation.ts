import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  clampLat,
  clampLng,
  clampZoom,
  round4,
  wrapLng,
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
const STRICT_SIGNED_DECIMAL = /^-?\d+(\.\d+)?$/

function parseGuarded(
  raw: string | null,
  parse: (value: string) => number,
  clamp: (value: number) => number,
): number | null {
  if (raw === null) return null
  // Reject trailing-garbage numeric strings (e.g. "50.1garbage") before
  // parsing - parseFloat/parseInt would otherwise silently accept the
  // leading numeric prefix and discard the rest (IN-01).
  if (!STRICT_SIGNED_DECIMAL.test(raw)) return null
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
 * True only if the URL carries BOTH a lat and a lng param that each pass
 * the same per-field parseGuarded validation readLocationFromUrl uses
 * (finite and in-range). Reuses parseGuarded rather than duplicating the
 * numeric logic, so "a pin exists" (App) and "the coordinates are valid"
 * (this hook) can never disagree - a malformed shared link (e.g.
 * ?lat=abc&lng=999, or a single valid field) is uniformly no-selection
 * (WR-01).
 */
export function isValidUrlSelection(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): boolean {
  const params = new URLSearchParams(search)
  const lat = parseGuarded(params.get('lat'), (v) => parseFloat(v), clampLat)
  const lng = parseGuarded(params.get('lng'), (v) => parseFloat(v), clampLng)
  return lat !== null && lng !== null
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
  // Mirrors `location` so setLocation can read the current zoom without
  // depending on `location` in its useCallback deps (keeps the callback a
  // stable, referentially-equal function across renders). Updated in an
  // effect rather than during render - mutating a ref while rendering is a
  // react-hooks lint violation ("Cannot access refs during render").
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])

  const setLocation = useCallback((lat: number, lng: number, zoom?: number) => {
    // Normalize at the single write boundary: clamp lat (in-range collapse
    // at the poles is expected), wrap lng (cyclic - a click after
    // world-copy panning must not collapse onto the antimeridian). Every
    // value written to the shared URL is in-range regardless of source
    // (CR-01).
    const nextLat = clampLat(round4(lat))
    const nextLng = round4(wrapLng(lng))
    const nextZoom = zoom ?? locationRef.current.zoom
    // The write side effect runs OUTSIDE the state updater (WR-02) -
    // setLocationState below only computes the next state.
    writeLocationToUrl(nextLat, nextLng, nextZoom)
    setLocationState({ lat: nextLat, lng: nextLng, zoom: nextZoom })
  }, [])

  return { ...location, setLocation }
}
