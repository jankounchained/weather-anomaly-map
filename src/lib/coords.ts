// Pure coordinate helpers shared by the map, the URL-state module, and the
// (Plan 02) location display fallback. Kept dependency-free per CLAUDE.md
// ("hand-roll, don't add a dependency" for a handful of lines of math).

/** Default map center: geographic center of Czechia (D-05). */
export const DEFAULT_CENTER = { lat: 49.8175, lng: 15.473 }

/** Default zoom level, frames the whole country (Claude's discretion). */
export const DEFAULT_ZOOM = 7

/** Leaflet's practically supported integer zoom range. */
const MIN_ZOOM = 1
const MAX_ZOOM = 20

/** Round a coordinate to 4 decimal places (~11m precision, D-10). */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

/** Clamp a latitude into the valid [-90, 90] range. */
export function clampLat(lat: number): number {
  return Math.min(90, Math.max(-90, lat))
}

/** Clamp a longitude into the valid [-180, 180] range. */
export function clampLng(lng: number): number {
  return Math.min(180, Math.max(-180, lng))
}

/**
 * Wrap a cyclic longitude into the valid [-180, 180] range (CR-01).
 * Unlike clampLng, this preserves distinct real-world points instead of
 * collapsing everything past the antimeridian onto 180/-180 - e.g. a click
 * reporting 200 (after panning across a repeated world copy) wraps to -160,
 * not 180. Idempotent for values already in range.
 */
export function wrapLng(lng: number): number {
  // Short-circuit for in-range values: the modulo arithmetic below is
  // exact for genuinely cyclic (out-of-range) input, but floating-point
  // error in the intermediate +180/-180 shift can perturb an already
  // in-range value by ~1e-13 (e.g. 14.42 -> 14.419999999999959). Returning
  // early keeps wrapLng exactly idempotent for the common case.
  if (lng >= -180 && lng <= 180) return lng
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

/** Clamp a zoom level into Leaflet's valid integer zoom range. */
export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/** Format lat/lng as the rounded "lat, lng" fallback display string. */
export function formatCoords(lat: number, lng: number): string {
  return `${round4(lat)}, ${round4(lng)}`
}
