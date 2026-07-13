---
phase: 01-location-picker-shareable-shell
plan: 02
subsystem: ui
tags: [react, vitest, fetch, bigdatacloud, reverse-geocoding]

# Dependency graph
requires:
  - phase: 01-01
    provides: "src/lib/coords.ts (formatCoords), src/map/useSelectedLocation.ts (lat/lng), LocationPanel shell, App.tsx composition root"
provides:
  - "src/geocoding/useReverseGeocode.ts: reverseGeocode(lat,lng) + useReverseGeocode(lat,lng) hook with AbortController ~3s timeout and coordinate fallback (D-01, D-02, LOC-02)"
  - "src/geocoding/types.ts: ReverseGeocodeResult / ReverseGeocodeStatus / UseReverseGeocodeResult display contract"
  - "src/app/LocationDisplay.tsx: Empty / Loading / Resolved / coordinate-Fallback states per UI-SPEC"
  - "LocationPanel populated with LocationDisplay; App wired to gate the lookup on hasSelection"
affects: [01-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useReverseGeocode(lat, lng) accepts nullable lat/lng so no fetch fires before hasSelection is true - avoids a wasted lookup against the default map center"
    - "Hook status/name derived at render time by comparing the resolved lookup's lat/lng against the current lat/lng, rather than set synchronously in the effect body (react-hooks/set-state-in-effect compliance) - only the async .then continuation calls setState"
    - "Every non-2xx response (incl. 402) and every abort/network error resolve reverseGeocode to null via the same code path - no special-case branching (Pitfall 3)"

key-files:
  created:
    - src/geocoding/useReverseGeocode.ts
    - src/geocoding/useReverseGeocode.test.ts
    - src/geocoding/types.ts
    - src/app/LocationDisplay.tsx
  modified:
    - src/app/LocationPanel.tsx
    - src/app/App.tsx
    - src/app/App.css

key-decisions:
  - "useReverseGeocode signature takes lat/lng as number | null (not App.tsx passing an extra flag into the hook itself) - App passes null until hasSelection is true, so idle status is meaningful and the default Czech Republic center never triggers an unnecessary BigDataCloud call"
  - "Hook state derived from a single resolved-lookup object compared against current lat/lng at render time, instead of a synchronous setStatus('loading') call at the top of the effect - required to satisfy eslint-plugin-react-hooks' set-state-in-effect rule (react-hooks 7.x)"
  - "Test file's timer-clearing assertion spies on globalThis.setTimeout/clearTimeout rather than Node's global - global is undeclared under tsconfig.app.json's types:[\"vite/client\"] scope, which tsc -b (npm run build) checks but tsc --noEmit alone did not initially catch"

patterns-established:
  - "geocoding/ hooks follow the same nullable-input-gates-fetch pattern any future Phase 2 useCurrentWeather(lat, lng)/useHistoricalBaseline(lat, lon, variable) hooks should reuse to avoid fetching before a location is actually selected"

requirements-completed: [LOC-02]

coverage:
  - id: D1
    description: "reverseGeocode resolves a joined place-name string ('city, subdivision, country') on a 200 response with usable fields"
    requirement: "LOC-02"
    verification:
      - kind: unit
        ref: "src/geocoding/useReverseGeocode.test.ts#reverseGeocode > resolves to a joined place-name string on a 200 response with usable fields"
        status: pass
    human_judgment: false
  - id: D2
    description: "A generic 500 and the documented 402 fair-use response both resolve to null via the identical code path (no special-case branch)"
    requirement: "LOC-02"
    verification:
      - kind: unit
        ref: "src/geocoding/useReverseGeocode.test.ts#reverseGeocode > resolves to null on a generic 500 non-2xx response"
        status: pass
      - kind: unit
        ref: "src/geocoding/useReverseGeocode.test.ts#reverseGeocode > resolves to null on the documented 402 fair-use response (no special-case branch)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Abort/timeout and thrown network errors both resolve to null; timer is always cleared (no leaked timeout)"
    requirement: "LOC-02"
    verification:
      - kind: unit
        ref: "src/geocoding/useReverseGeocode.test.ts#reverseGeocode > resolves to null when the request aborts/times out"
        status: pass
      - kind: unit
        ref: "src/geocoding/useReverseGeocode.test.ts#reverseGeocode > resolves to null on a thrown network error"
        status: pass
      - kind: unit
        ref: "src/geocoding/useReverseGeocode.test.ts#reverseGeocode > wires the timeout via AbortController + ~3000ms setTimeout and always clears the timer"
        status: pass
    human_judgment: false
  - id: D4
    description: "A response with no usable name fields resolves to null (not an empty string)"
    requirement: "LOC-02"
    verification:
      - kind: unit
        ref: "src/geocoding/useReverseGeocode.test.ts#reverseGeocode > returns null (not an empty string) when the response has no usable name fields"
        status: pass
    human_judgment: false
  - id: D5
    description: "LocationDisplay renders Empty state before any pin, Loading state with Accent indicator while a lookup is in flight, Resolved place name, or silent coordinate fallback on failure/timeout - matching UI-SPEC's copywriting contract verbatim, rendered as plain text (T-01-02)"
    verification:
      - kind: manual_procedural
        ref: "Deferred to Plan 03 deploy checkpoint per this plan's <verification> note - visual state confirmation happens there"
        status: unknown
    human_judgment: true
    rationale: "Actual state transitions on a live map+panel (empty -> loading -> resolved/fallback) require visual/browser confirmation; the plan explicitly defers this to the Plan 03 deploy checkpoint. tsc/build/lint and the unit-tested fetch/timeout/fallback logic are automated, but the rendered UI states themselves are not."

duration: 15min
completed: 2026-07-13
status: complete
---

# Phase 1 Plan 2: Reverse Geocoding + Location Panel States Summary

**BigDataCloud reverse-geocoding hook with an AbortController ~3s timeout and coordinate fallback, wired into an Empty/Loading/Resolved/Fallback LocationDisplay panel.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-13T22:43:00Z (approx.)
- **Completed:** 2026-07-13T22:48:08Z
- **Tasks:** 2 completed
- **Files modified:** 4 created, 3 modified

## Accomplishments
- Built and unit-tested (RED then GREEN) `reverseGeocode(lat, lng)`: BigDataCloud fetch with a ~3s `AbortController` timeout, every non-2xx (including the documented 402 fair-use ban) and every abort/network error resolving to `null` via the identical path, and a joined place-name string on success
- Implemented `useReverseGeocode(lat, lng)` exposing `idle`/`loading`/`resolved` status, gated so no fetch fires before a pin exists (nullable lat/lng input) - avoids a wasted lookup against the default Czech Republic center
- Built `LocationDisplay` rendering exactly one of Empty / Loading (Accent spinner) / Resolved (Heading place name) / Fallback (Label-styled rounded coordinates, no error banner) per the UI-SPEC copywriting contract verbatim
- Wired `LocationPanel` and `App.tsx` so pin placement drives the panel through Empty → Loading → Resolved-or-Fallback with no map recenter (D-07)

## Task Commits

Each task was committed atomically:

1. **Task 1: useReverseGeocode hook with 3s timeout and coordinate fallback (tests first)** - `de1e119` (test, RED) then `b73fdde` (feat, GREEN)
2. **Task 2: LocationDisplay states + LocationPanel population + App wiring** - `010ee7d` (feat)

_TDD gate for Task 1: `de1e119` (test) confirmed failing (module-not-found) before `b73fdde` (feat) made it pass - both gate commits present._

## Files Created/Modified
- `src/geocoding/types.ts` - `ReverseGeocodeResult`, `ReverseGeocodeStatus`, `UseReverseGeocodeResult` contract types
- `src/geocoding/useReverseGeocode.ts` - `reverseGeocode(lat,lng)` fetch/timeout/fallback + `useReverseGeocode(lat,lng)` hook (nullable-input-gated)
- `src/geocoding/useReverseGeocode.test.ts` - 7 passing tests covering success/500/402/abort/network-error/no-usable-fields/timer-clearing
- `src/app/LocationDisplay.tsx` - Empty/Loading/Resolved/Fallback states, plain-text rendering only
- `src/app/LocationPanel.tsx` - now renders `LocationDisplay` in its content section
- `src/app/App.tsx` - calls `useReverseGeocode` gated on `hasSelection`, passes status/name/lat/lng to `LocationPanel`
- `src/app/App.css` - `.location-display*` styles (Heading/Body/Label typography tokens, Accent spinner animation)

## Decisions Made
- `useReverseGeocode` takes `lat: number | null, lng: number | null` rather than always-real numbers, so `App.tsx` can pass `null` until `hasSelection` is true - keeps the `idle` status meaningful and prevents an unnecessary BigDataCloud call against the default map center before any pin exists
- Hook derives `status`/`name` from comparing a single `resolved` lookup object against the current `lat`/`lng` at render time, instead of calling `setStatus('loading')` synchronously at the top of the effect - required to pass `eslint-plugin-react-hooks`' `set-state-in-effect` rule; only the async `.then` continuation ever calls `setState`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed synchronous setState-in-effect that failed lint**
- **Found during:** Task 1 (`npm run lint` after initial GREEN implementation)
- **Issue:** The first hook implementation called `setStatus('loading')`/`setName(null)` synchronously at the top of the effect body, which `eslint-plugin-react-hooks`' `set-state-in-effect` rule flags as an error (cascading-render risk)
- **Fix:** Restructured the hook to derive `status`/`name` at render time from a single `resolved` lookup object (compared against the current `lat`/`lng`), so only the async `.then` continuation calls `setState`
- **Files modified:** `src/geocoding/useReverseGeocode.ts`
- **Verification:** `npm run lint` exits 0; all 7 hook tests still pass
- **Committed in:** `010ee7d` (Task 2 commit, alongside the wiring work where the lint issue surfaced during full-suite verification)

**2. [Rule 3 - Blocking] Test file used Node's `global`, undeclared under the app tsconfig scope**
- **Found during:** Task 2 (`npm run build` full verification)
- **Issue:** `useReverseGeocode.test.ts`'s timer-clearing assertion called `vi.spyOn(global, ...)`. `global` is a Node.js ambient, but `tsconfig.app.json` (which `tsc -b`/`npm run build` type-checks against) only declares `types: ["vite/client"]` with no `@types/node` - so `tsc -b` failed with `Cannot find name 'global'` even though `tsc --noEmit` and `vitest run` (which use different/looser resolution) did not initially catch it
- **Fix:** Switched both spies to `globalThis`, the standard cross-environment global already covered by the DOM lib
- **Files modified:** `src/geocoding/useReverseGeocode.test.ts`
- **Verification:** `npm run build` (`tsc -b && vite build`) now exits 0; tests still pass
- **Committed in:** `010ee7d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug/lint-compliance, 1 blocking build error)
**Impact on plan:** Both fixes were required for the plan's own verification gates (`npm run lint`, `npm run build`) to pass as specified. No scope creep - no new files, no new dependencies.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required

None - no external service configuration required. BigDataCloud's `reverse-geocode-client` endpoint is keyless and CORS-enabled; no API key or account setup needed.

## Known Stubs

None. `LocationDisplay` is fully wired to live hook state; no hardcoded/placeholder data paths remain in this plan's scope.

## Threat Flags

None. Both threats identified in this plan's `<threat_model>` (T-01-02 rendering, T-01-03 DoS/timeout) were mitigated directly as specified - no new, unmitigated surface was introduced.

## Next Phase Readiness

- `useReverseGeocode` and `LocationDisplay` are fully wired end-to-end: pin placement -> URL write (Plan 01) -> reverse-geocode lookup -> panel render
- All automated checks pass: `npx tsc --noEmit`, `npm run build`, `npm run lint`, `npm run test` (24/24 tests, 3 files) all exit 0
- Visual confirmation of the Empty -> Loading -> Resolved/Fallback transitions on a live map is deferred to the Plan 03 deploy checkpoint, per this plan's own `<verification>` note
- No blockers for Plan 03 (Cloudflare Pages deploy + public shareable URL verification)

---
*Phase: 01-location-picker-shareable-shell*
*Completed: 2026-07-13*

## Self-Check: PASSED

All 8 files verified present on disk (4 created this plan, 3 modified, plus this SUMMARY); all 4 commit hashes (de1e119, b73fdde, 010ee7d, 99bc212) verified present in git log.
