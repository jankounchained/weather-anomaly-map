// Reverse-geocode display contract shared by the fetch function and the
// useReverseGeocode hook. Only the fields the app actually uses from
// BigDataCloud's response are modeled here (city/locality,
// principalSubdivision, countryName) - kept dependency-free per CLAUDE.md.

/** Parsed subset of BigDataCloud's reverse-geocode-client JSON response. */
export interface ReverseGeocodeResult {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
}

/** Lifecycle status of a useReverseGeocode(lat, lng) lookup. */
export type ReverseGeocodeStatus = 'idle' | 'loading' | 'resolved'

/** Hook return contract: `name` is null when there is no pin yet, or when
 * the lookup failed/timed out - the consumer renders the coordinate
 * fallback in that case (LOC-02, D-02). */
export interface UseReverseGeocodeResult {
  status: ReverseGeocodeStatus
  name: string | null
}
