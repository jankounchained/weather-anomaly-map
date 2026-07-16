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
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Re-reviewed the location picker + shareable-URL shell after plan 01-04's gap-closure pass. The prior review's `CR-01` (unclamped/unwrapped write path breaking the shareable-URL round trip), `WR-01` (`hasSelection` disagreeing with the URL hook's own validation), `WR-02` (side effect inside a `useState` updater), `WR-03` (untyped geocode response), `IN-01` (lenient trailing-garbage parsing), and `IN-02` (undocumented unused CSS token) are all verifiably fixed in the current code: `setLocation` now clamps latitude and wraps longitude at the single write boundary, `isValidUrlSelection` reuses the same `parseGuarded` validation as the read path, the URL write happens outside the state updater, the geocode response is cast to `ReverseGeocodeResult`, a strict `^-?\d+(\.\d+)?$` regex rejects trailing-garbage numerics, and `--color-destructive` now carries a "reserved for later" comment. `IN-03` is only partially closed — see IN-03 below.

No hardcoded secrets, `eval`, `innerHTML`/`dangerouslySetInnerHTML`, empty catch blocks, or debug artifacts were found. All dynamic text renders through ordinary JSX text nodes (no raw-HTML sink), consistent with the code's own XSS-avoidance comments.

This pass surfaces four Warnings (a still-open zoom round-trip gap carried forward from the prior review as `WR-04`, plus three new gaps — an unmemoized map-event handlers object causing listener churn, an unvalidated write path for lat/lng, and a decimal-zoom truncation edge case) and four Info items. None of these are security or data-loss issues; they are correctness/robustness gaps and code-quality nits.

## Warnings

### WR-01: `ClickHandler` passes a brand-new handlers object to `useMapEvents` on every render, causing the map's click listener to be torn down and rebuilt constantly

**File:** `src/map/MapView.tsx:17-24`
**Issue:** `useMapEvents` (react-leaflet) keys its listener-binding effect on referential identity of the handlers object it's given (`node_modules/react-leaflet/lib/hooks.js:22-34`: `useEffect(() => { map.on(handlers); return () => map.off(handlers) }, [map, handlers])`). `ClickHandler` passes an inline object literal every render:

```tsx
function ClickHandler({ onSelect }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}
```

Since this object is a new reference every render, the effect's cleanup (`map.off(oldHandlers)`) and re-run (`map.on(newHandlers)`) fire on **every** render of `MapView`/`App` — not just when `onSelect` actually changes. In this app, `App` re-renders on every `useReverseGeocode` status transition (idle→loading→resolved happens on every single pin placement), so the map's click listener is unbound and rebound repeatedly per click. `DraggablePin` in the same file correctly memoizes its `eventHandlers` with `useMemo(..., [onSelect])` (`src/map/MapView.tsx:35-46`) — `ClickHandler` should follow the same pattern for consistency and to avoid needless listener churn.
**Fix:**
```tsx
function ClickHandler({ onSelect }: ClickHandlerProps) {
  const handlers = useMemo(
    () => ({
      click(e: LeafletMouseEvent) {
        onSelect(e.latlng.lat, e.latlng.lng)
      },
    }),
    [onSelect],
  )
  useMapEvents(handlers)
  return null
}
```

### WR-02: `setLocation` writes to the shared URL without validating `lat`/`lng` are finite numbers

**File:** `src/map/useSelectedLocation.ts:132-145`
**Issue:** The read path (`parseGuarded`, `src/map/useSelectedLocation.ts:26-41`) explicitly checks `Number.isFinite(value)` before accepting a URL-sourced coordinate. The write path has no equivalent guard:

```ts
const setLocation = useCallback((lat: number, lng: number, zoom?: number) => {
  const nextLat = clampLat(round4(lat))
  const nextLng = round4(wrapLng(lng))
  ...
  writeLocationToUrl(nextLat, nextLng, nextZoom)
  setLocationState({ lat: nextLat, lng: nextLng, zoom: nextZoom })
}, [])
```

`clampLat(NaN)` and `wrapLng(NaN)` both evaluate to `NaN` (e.g. `Math.min(90, Math.max(-90, NaN))` is `NaN`), and `String(NaN)` is `"NaN"`. If any future caller of `setLocation` (or a regression in `MapView`'s event wiring) ever passes a non-finite value, `"NaN"` would be written straight into the shareable URL query string with no defensive rejection — the exact class of bug the read path was hardened against. Today's only callers (`ClickHandler`'s `e.latlng.lat/lng` and `DraggablePin`'s `marker.getLatLng()`) always supply real numbers, so this isn't currently reachable, but it's a real asymmetry between the read and write boundaries of the same module.
**Fix:**
```ts
const setLocation = useCallback((lat: number, lng: number, zoom?: number) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  const nextLat = clampLat(round4(lat))
  ...
}, [])
```

### WR-03: Zoom URL parameter silently accepts and truncates decimal values instead of rejecting them

**File:** `src/map/useSelectedLocation.ts:24-41, 64-68`
**Issue:** `parseGuarded`'s validity regex (`STRICT_SIGNED_DECIMAL = /^-?\d+(\.\d+)?$/`) is shared across lat, lng, and zoom, and deliberately allows decimal strings (needed for lat/lng). For zoom, the parse function is `parseInt(v, 10)`, which truncates rather than rejects a decimal string:

```ts
const zoom = parseGuarded(params.get('zoom'), (v) => parseInt(v, 10), clampZoom)
```

A shared link like `?lat=50.1&lng=14.4&zoom=7.9` passes the regex (it's a syntactically valid decimal), `parseInt("7.9", 10)` silently truncates to `7`, and since `clampZoom(7) === 7` the value is accepted as "valid" — even though the raw input was never actually round-tripped. This contradicts the module's own documented contract ("Any missing, malformed, or out-of-range value is treated as invalid") and isn't caught by the existing test suite, which only exercises decimal trailing-garbage on `lat`, never a decimal `zoom`.
**Fix:** Round-trip-check the parsed value against the raw string for integer-only fields, or use an integer-only regex for zoom:
```ts
const STRICT_INTEGER = /^-?\d+$/
const zoom = parseGuarded(params.get('zoom'), (v) => parseInt(v, 10), clampZoom, STRICT_INTEGER)
```

### WR-04: Zoom is never captured from user map interaction — shareable URL can only ever reflect the initial zoom (carried forward, still open)

**File:** `src/map/MapView.tsx` (no zoom-change handler), `src/app/App.tsx:26-29`
**Issue:** This is unchanged from the prior review pass and was not addressed by plan 01-04. `MapContainer`'s `zoom` prop is intentionally read once at mount (by design, per the comment at `src/map/MapView.tsx:67-72`), and no `zoomend` handler feeds the user's subsequent scroll-wheel/zoom-control changes back into `useSelectedLocation`. `handleSelect` in `App.tsx` never passes the optional third `zoom` argument to `setLocation`, so `zoom` in state/URL is fixed forever at whatever `readLocationFromUrl` produced at mount. A user who zooms in/out and then shares the link will share a URL that recreates their pin at the *wrong* zoom level.
**Fix:** Add a zoom-tracking handler alongside `ClickHandler` (e.g. `useMapEvents({ zoomend(e) { onZoomChange(e.target.getZoom()) } })`) wired to call `setLocation(lat, lng, newZoom)`, or explicitly scope zoom out of the shareable-URL contract for this phase with a note in `PROJECT.md`/`ROADMAP.md` so it isn't silently forgotten.

## Info

### IN-01: `handleSelect` in `App.tsx` is not memoized, compounding WR-01's listener-churn issue

**File:** `src/app/App.tsx:26-29`
**Issue:** `const handleSelect = (nextLat, nextLng) => { setLocation(...); setHasSelection(true) }` is a fresh closure on every render, unlike `setLocation` (stable via `useCallback` in `useSelectedLocation`). It's passed straight through as `MapView`'s `onSelect` prop, which is a dependency of `DraggablePin`'s memoized `eventHandlers` (`src/map/MapView.tsx:35-46`) — so that memoization never actually pays off, and `DraggablePin`'s drag handler is recreated every render too. Functionally harmless today (the closure always calls the same stable underlying setters), but it defeats the memoization already in place elsewhere in the same file.
**Fix:** `const handleSelect = useCallback((nextLat: number, nextLng: number) => { setLocation(nextLat, nextLng); setHasSelection(true) }, [setLocation])`.

### IN-02: Unused CSS custom properties `--font-size-display`, `--font-weight-display`, `--line-height-display`

**File:** `src/index.css:35-37`
**Issue:** These three design tokens are declared but never referenced by any of the reviewed `.css` files, and (unlike `--color-destructive` at line 17) carry no comment explaining they're reserved for a later phase.
**Fix:** Either use them where a "display"-scale heading is needed, or add a one-line comment noting they're reserved for a future phase (matching the pattern already used for `--color-destructive`).

### IN-03: `useReverseGeocode` hook's stale-response race-guard logic still has zero direct test coverage (partially closed)

**File:** `src/geocoding/useReverseGeocode.test.ts`, `src/geocoding/useReverseGeocode.ts:67-99`
**Issue:** Plan 01-04 closed the `useSelectedLocation` half of this finding (there's now a `renderHook`-based `describe('useSelectedLocation', ...)` block covering the clamp/wrap write path). The `useReverseGeocode` half remains open: `useReverseGeocode.test.ts` still only imports and exercises the extracted `reverseGeocode(lat, lng)` function, never the `useReverseGeocode` hook itself. The hook's most complex logic — the `requestIdRef` stale-response guard and the `cancelled` unmount guard (`src/geocoding/useReverseGeocode.ts:74-88`) — has no test asserting that a superseded lat/lng change discards an earlier in-flight response, or that unmounting mid-fetch doesn't call `setState` on an unmounted component.
**Fix:** Add a `renderHook`-based test that changes the hook's `lat`/`lng` arguments before the first `fetch` mock resolves, then resolves both mocked responses out of order, and asserts the hook's final `name` matches the *later* selection, not the later-resolving promise.

### IN-04: `writeLocationToUrl` drops any existing URL hash fragment

**File:** `src/map/useSelectedLocation.ts:100-111`
**Issue:** `writeLocationToUrl` rebuilds the URL as `` `${window.location.pathname}?${params.toString()}` ``, which silently discards `window.location.hash` if one was present. The app doesn't currently use a hash for anything, so this is latent rather than active, but it's a foot-gun for a future feature (e.g. an in-page anchor or hash-based sub-view) that assumes `replaceState` calls elsewhere preserve the fragment.
**Fix:** `` const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}` ``.

---

_Reviewed: 2026-07-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
