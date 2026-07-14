---
phase: 01-location-picker-shareable-shell
reviewed: 2026-07-14T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/app/App.css
  - src/app/App.tsx
  - src/app/LocationDisplay.tsx
  - src/app/LocationPanel.tsx
  - src/geocoding/types.ts
  - src/geocoding/useReverseGeocode.test.ts
  - src/geocoding/useReverseGeocode.ts
  - src/index.css
  - src/lib/coords.test.ts
  - src/lib/coords.ts
  - src/main.tsx
  - src/map/MapView.tsx
  - src/map/useSelectedLocation.test.ts
  - src/map/useSelectedLocation.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Reviewed the location picker + shareable-URL shell (map, URL-state hook, coordinate helpers, reverse-geocode hook, and the location panel UI). No hardcoded secrets, `eval`, `innerHTML`/`dangerouslySetInnerHTML`, empty catch blocks, or leftover debug statements were found on a pattern scan of all 14 files. The reverse-geocode fallback path is genuinely careful about not special-casing failure modes (D-02), and the URL-read path (`readLocationFromUrl`) does validate and clamp correctly.

However, the write path back to the URL (`setLocation`) does **not** apply the same clamping that the read path enforces, which breaks the "shareable via URL" round-trip guarantee for a common, non-exotic Leaflet interaction (panning across repeated world copies, then clicking). There is also a real gap between how `App.tsx` decides "a pin exists" (raw presence of `lat`/`lng` keys) and how `useSelectedLocation` decides the actual coordinates (validated, defaults substituted on failure), which produces a state where a malformed shared link shows a pin at the default center and fires a wasted geocode lookup — the exact behavior the code's own comments say they're trying to avoid.

## Critical Issues

### CR-01: `setLocation` writes unclamped/unwrapped lat/lng to the URL, breaking the shareable-link round trip

**File:** `src/map/useSelectedLocation.ts:98-107`
**Issue:** `readLocationFromUrl` (the read path) validates every field with `parseGuarded`, rejecting any value that `clampLat`/`clampLng`/`clampZoom` would change (`src/map/useSelectedLocation.ts:23-34`). But `setLocation` — the *write* path invoked on every map click/drag (`src/map/MapView.tsx:20,41`, `src/app/App.tsx:32-35`) — only applies `round4`, never `clampLat`/`clampLng`:

```ts
const setLocation = useCallback(
  (lat: number, lng: number, zoom?: number) => {
    setLocationState((prev) => {
      const nextZoom = zoom ?? prev.zoom
      writeLocationToUrl(lat, lng, nextZoom)          // no clamp
      return { lat: round4(lat), lng: round4(lng), zoom: nextZoom } // no clamp
    })
  },
  [],
)
```

Leaflet's default `MapContainer` (no `maxBounds`/`noWrap` set in `src/map/MapView.tsx:74-87`) allows continuous horizontal panning across repeated "world copies." A click after panning past ±180° longitude returns an unwrapped `e.latlng.lng` outside `[-180, 180]` (e.g. `200`, `380`) straight from `ClickHandler` (`src/map/MapView.tsx:17-24`). That raw value flows unclamped into `writeLocationToUrl`, producing a URL like `?lat=..&lng=380&zoom=..`.

When that link is reopened, `readLocationFromUrl` correctly identifies `lng=380` as out-of-range (`clampLng(380) !== 380`) and rejects it, silently falling back to `DEFAULT_CENTER` (`src/lib/coords.ts:6`) instead of the location the original user actually selected and shared. This directly defeats the project's core "shareable via URL" value proposition (see `.claude/CLAUDE.md` constraints) for an interaction pattern (world-wrap panning) that is common, not exotic.

**Fix:** Normalize longitude (wrap, not clamp — longitude is cyclic so clamping to 180 would collapse many distinct real-world points onto the antimeridian) and clamp latitude before storing/writing:

```ts
function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

const setLocation = useCallback(
  (lat: number, lng: number, zoom?: number) => {
    setLocationState((prev) => {
      const nextLat = clampLat(round4(lat))
      const nextLng = round4(wrapLng(lng))
      const nextZoom = zoom ?? prev.zoom
      writeLocationToUrl(nextLat, nextLng, nextZoom)
      return { lat: nextLat, lng: nextLng, zoom: nextZoom }
    })
  },
  [],
)
```

## Warnings

### WR-01: `hasUrlSelection()` checks key presence, not validity — malformed shared link shows a pin at the default center and fires a wasted geocode fetch

**File:** `src/app/App.tsx:16-19, 27-30`
**Issue:** `hasUrlSelection` only checks that both `lat` and `lng` keys are present in the query string:

```ts
function hasUrlSelection(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.has('lat') && params.has('lng')
}
```

It does not run the values through the same `parseGuarded`/clamp validation that `readLocationFromUrl` uses. So a link like `?lat=abc&lng=999` sets `hasSelection = true`, while `useSelectedLocation` resolves `lat`/`lng` to `DEFAULT_CENTER` (both fields fail validation independently). The result: `MapView` renders a `DraggablePin` at the default Czech-Republic center (`src/map/MapView.tsx:83-85`) as if the user had explicitly chosen that spot, and `useReverseGeocode` fires a real lookup against that default center (`src/app/App.tsx:27-30`) — precisely the "wasted BigDataCloud fetch against the default center" the code's own comment says this design is meant to prevent (`src/app/App.tsx:24-26`).

**Fix:** Derive `hasSelection` from the same validated read, e.g. reuse `readLocationFromUrl`'s per-field guard to check both raw params are individually valid before treating the link as carrying an explicit selection:

```ts
function hasUrlSelection(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('lat') || !params.has('lng')) return false
  const lat = parseFloat(params.get('lat')!)
  const lng = parseFloat(params.get('lng')!)
  return (
    Number.isFinite(lat) && clampLat(lat) === lat &&
    Number.isFinite(lng) && clampLng(lng) === lng
  )
}
```

### WR-02: Side effect (`writeLocationToUrl`) executed inside a `useState` updater function

**File:** `src/map/useSelectedLocation.ts:98-107`
**Issue:** `setLocationState((prev) => { ...; writeLocationToUrl(...); return ...})` performs a side effect (writing to browser history) directly inside a functional state updater. React requires updater functions to be pure — under `<StrictMode>` (used in `src/main.tsx:23`), React intentionally invokes updater functions twice in development to surface exactly this kind of impurity. In this case the double call is idempotent (same URL written twice) so it isn't user-visible today, but it's a latent correctness hazard: any future change that makes `writeLocationToUrl` non-idempotent (e.g. adding an analytics ping, or an increment-based unique id) will silently fire twice per state update.
**Fix:** Move the side effect out of the updater, e.g. compute the next value first and call `writeLocationToUrl` after `setLocationState` (or in a `useEffect` keyed on `[lat, lng, zoom]`):

```ts
const setLocation = useCallback((lat: number, lng: number, zoom?: number) => {
  setLocationState((prev) => {
    const nextZoom = zoom ?? prev.zoom
    return { lat: round4(lat), lng: round4(lng), zoom: nextZoom }
  })
}, [])

// Elsewhere: useEffect(() => writeLocationToUrl(lat, lng, zoom), [lat, lng, zoom])
```

### WR-03: Parsed geocode response is untyped (`any`) — `ReverseGeocodeResult` is declared but never used

**File:** `src/geocoding/useReverseGeocode.ts:34-38`, `src/geocoding/types.ts:6-12`
**Issue:** `types.ts` defines `ReverseGeocodeResult` specifically to model "the fields the app actually uses from BigDataCloud's response," but `useReverseGeocode.ts` never imports or applies it:

```ts
const data = await res.json()   // data: any
const parts = [data.city || data.locality, data.principalSubdivision, data.countryName].filter(Boolean)
```

`res.json()` returns `Promise<any>`, so `data.city`, `data.locality`, etc. are all untyped — a rename/typo in a field (e.g. `data.contryName`) would compile silently and just resolve to an empty parts array (falls back to coordinates) rather than being caught at build time. This also leaves `ReverseGeocodeResult` as dead code.
**Fix:**
```ts
const data = (await res.json()) as ReverseGeocodeResult
```

### WR-04: Zoom is never captured from user map interaction — shareable URL can only ever reflect the initial zoom

**File:** `src/map/MapView.tsx` (no zoom-change handler), `src/map/useSelectedLocation.ts:98-107`
**Issue:** `MapContainer`'s `zoom` prop is intentionally read once at mount (documented in `src/map/MapView.tsx:67-72`), and no `zoomend`/`useMapEvents` handler exists to feed the user's subsequent scroll-wheel/zoom-control changes back into `useSelectedLocation`. Every call site for `setLocation` (`handleSelect` in `src/app/App.tsx:32-35`) omits the optional `zoom` argument, so `zoom` in state/URL is fixed forever at whatever `readLocationFromUrl` produced at mount. A user who zooms in/out and then shares the link will share a URL that recreates their pin at the *wrong* zoom level, contradicting the "shareable via URL" goal for the zoom dimension specifically.
**Fix:** Add a zoom-tracking handler alongside `ClickHandler` (e.g. `useMapEvents({ zoomend(e) { onZoomChange(e.target.getZoom()) } })`) and wire it to call `setLocation(lat, lng, newZoom)` so zoom participates in the URL round trip, or explicitly scope this out with a comment if deferred to a later phase.

## Info

### IN-01: `parseGuarded` uses lenient `parseFloat`/`parseInt`, accepting trailing garbage

**File:** `src/map/useSelectedLocation.ts:23-34`
**Issue:** `parseFloat("50.1abc")` returns `50.1` (not `NaN`), and `parseInt("8.9xyz", 10)` returns `8`. Since `parseGuarded` only checks `Number.isFinite` and whether clamping changes the value, a query string like `?lat=50.1garbage&lng=14.4&zoom=8` is silently accepted as `lat=50.1` rather than being rejected as malformed. The current test suite only exercises fully non-numeric strings (`lat=abc`), not partially-numeric ones, so this gap isn't caught by tests either.
**Fix:** Validate with a stricter numeric regex before parsing, e.g. `/^-?\d+(\.\d+)?$/.test(raw)`, or use `Number(raw)` (which returns `NaN` for any trailing non-numeric characters) instead of `parseFloat`/`parseInt`.

### IN-02: Unused CSS custom property `--color-destructive`

**File:** `src/index.css:15`
**Issue:** `--color-destructive: #dc2626;` is declared in the design-token block but never referenced by any of the reviewed `.css` files (`App.css`, `index.css`). Likely reserved for a future error-state UI, but as it stands it's dead CSS.
**Fix:** Either use it in the current error/fallback UI (`.location-display--fallback` could use it, if a distinct "unresolved" affordance is wanted) or remove it until it's needed, with a comment noting it's reserved for a future phase.

### IN-03: Hooks under test only cover their extracted pure helpers, not the hooks themselves

**File:** `src/map/useSelectedLocation.test.ts`, `src/geocoding/useReverseGeocode.test.ts`
**Issue:** `useSelectedLocation.test.ts` tests `readLocationFromUrl`/`writeLocationToUrl` directly but never renders `useSelectedLocation` itself (e.g. via `@testing-library/react`'s `renderHook`) — so the `setLocation` clamping gap (CR-01) and the updater-side-effect issue (WR-02) both live in code paths with zero direct test coverage. Similarly, `useReverseGeocode.test.ts` only tests the extracted `reverseGeocode` function, not the `useReverseGeocode` hook's stale-response race-guard logic (`requestIdRef`, `cancelled` flag) — the most complex logic in the geocoding module.
**Fix:** Add `renderHook`-based tests: one for `useSelectedLocation` asserting that clicking/selecting a location outside `[-180,180]`/`[-90,90]` gets clamped before being written to state/URL, and one for `useReverseGeocode` asserting that a superseded lat/lng change discards the earlier in-flight response.

---

_Reviewed: 2026-07-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
