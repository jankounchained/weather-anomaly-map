---
phase: 01-location-picker-shareable-shell
plan: 04
subsystem: ui
tags: [react, vitest, testing-library, url-state, coords]

# Dependency graph
requires:
  - phase: 01-location-picker-shareable-shell (01-01, 01-02, 01-03)
    provides: A deployed Vite/React SPA with map, pin, reverse-geocoded panel, and URL-encoded location state (useSelectedLocation, readLocationFromUrl/writeLocationToUrl)
provides:
  - wrapLng(lng) - cyclic longitude normalizer in src/lib/coords.ts, wraps out-of-range longitude instead of clamping (200 -> -160), exactly idempotent for in-range values
  - Rewritten setLocation write path (src/map/useSelectedLocation.ts) that clamps latitude and wraps longitude before every URL write and state update, closing the CR-01 shareable-URL round-trip blocker
  - isValidUrlSelection(search) - exported per-field URL validation helper shared between the hook's read path and App's pin-existence gate
  - Tightened parseGuarded rejecting trailing-garbage numeric strings (IN-01)
  - renderHook-based test coverage of the setLocation clamp/wrap path (IN-03), plus wrapLng and isValidUrlSelection unit tests
  - Typed BigDataCloud geocode response (ReverseGeocodeResult) in useReverseGeocode.ts (WR-03)
  - Documented reserved --color-destructive CSS token (IN-02)
affects: [phase-02, phase-03]

# Tech tracking
tech-stack:
  added: ["@testing-library/react@16.3.2 (dev-only, renderHook infrastructure; @testing-library/dom resolved as its own transitive dependency)"]
  patterns:
    - "Single write boundary: setLocation is the only place that writes to the shared URL, and now normalizes (clampLat + wrapLng) before every write, so the read path (readLocationFromUrl) and write path enforce the identical [-90,90]/[-180,180] invariant regardless of input source"
    - "Ref-mirrors-state, updated in an effect (not during render): a locationRef lets setLocation stay a stable, dependency-free useCallback while still reading the current zoom, without violating the react-hooks refs-during-render lint rule"
    - "Shared per-field validation: isValidUrlSelection reuses the same parseGuarded calls readLocationFromUrl uses, so 'a pin exists' (App) and 'the coordinates are valid' (the hook) can never disagree"

key-files:
  created:
    - src/lib/coords.test.ts (wrapLng cases added to existing file)
  modified:
    - src/lib/coords.ts
    - src/map/useSelectedLocation.ts
    - src/map/useSelectedLocation.test.ts
    - src/app/App.tsx
    - src/geocoding/useReverseGeocode.ts
    - src/index.css
    - package.json
    - package-lock.json

key-decisions:
  - "wrapLng short-circuits and returns the input unchanged when it is already in [-180,180], rather than always running the modulo formula - the plan's literal formula (((lng+180)%360+360)%360)-180 introduces ~1e-13 floating-point drift for in-range values (14.42 -> 14.419999999999959), which would silently violate the round4-then-write invariant tests depend on; the short-circuit keeps wrapLng exactly idempotent for the common case while still correctly wrapping genuinely out-of-range input"
  - "locationRef (mirroring current location for setLocation's zoom default) is updated inside a useEffect rather than assigned directly during render - eslint-plugin-react-hooks 7.x's refs-during-render rule flags mutating ref.current in the render body; the effect-based update preserves the plan's 'ref mirrors state, callback stays stable/dependency-free' design without the lint violation"
  - "@testing-library/react installed via `npm install -D` only after the Task 1 blocking-human checkpoint was explicitly approved (official testing-library org package, React 19-compatible v16.3.2, @testing-library/dom resolved automatically as its transitive peer, no runtime/bundle dependency added)"

patterns-established:
  - "Wrap vs. clamp: longitude is cyclic (wrap), latitude is not (clamp) - any future coordinate-normalization code should follow this same distinction rather than clamping both axes uniformly"

requirements-completed: [LOC-03, PLAT-01]

coverage:
  - id: D1
    description: "setLocation normalizes out-of-range lat/lng (clampLat + wrapLng) before every URL write and state update, so a click after world-copy panning writes an in-range value and the shared link reproduces the same real-world location (closes CR-01, the phase BLOCKER)"
    requirement: LOC-03
    verification:
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts#useSelectedLocation > wraps an out-of-range longitude (not clamps) when setLocation is called"
        status: pass
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts#useSelectedLocation > clamps an out-of-range latitude when setLocation is called"
        status: pass
      - kind: unit
        ref: "src/lib/coords.test.ts#wrapLng"
        status: pass
    human_judgment: false
  - id: D2
    description: "A longitude past the antimeridian wraps (200 -> -160) rather than clamping to 180, keeping distinct real-world points distinct"
    requirement: LOC-03
    verification:
      - kind: unit
        ref: "src/lib/coords.test.ts#wrapLng > wraps a longitude past the antimeridian instead of clamping to 180"
        status: pass
    human_judgment: false
  - id: D3
    description: "A malformed shared link (?lat=abc&lng=999, or a single valid field) is treated as no-selection: no phantom pin, no wasted reverse-geocode fetch"
    requirement: PLAT-01
    verification:
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts#isValidUrlSelection"
        status: pass
    human_judgment: false
  - id: D4
    description: "useSelectedLocation's setter has direct renderHook test coverage asserting out-of-range lat/lng is clamped/wrapped before it reaches state and the URL (closes the IN-03 test-coverage gap)"
    requirement: LOC-03
    verification:
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts#useSelectedLocation (3 renderHook cases: wrap, clamp, round-trip)"
        status: pass
    human_judgment: false
  - id: D5
    description: "@testing-library/react (dev-only) added after human legitimacy verification (T-01-SC, ASVS L1 blocks on high)"
    verification: []
    human_judgment: true
    rationale: "Package legitimacy on npmjs.com was confirmed by the human at the Task 1 blocking-human checkpoint in a prior session before any install ran; not independently re-verifiable by this continuation agent."
  - id: D6
    description: "App's hasSelection gate is derived from isValidUrlSelection (WR-01); geocode response is typed via ReverseGeocodeResult (WR-03); --color-destructive is documented as a reserved token (IN-02)"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit && npm run lint && npm run build (all exit 0); grep checks for isValidUrlSelection/ReverseGeocodeResult/reserved"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-07-14
status: complete
---

# Phase 1 Plan 4: Location Write-Path Normalization Summary

**setLocation now clamps latitude and wraps longitude before every URL write, closing the shareable-URL round-trip blocker (CR-01) with direct renderHook test coverage.**

## Performance

- **Duration:** ~15 min (continuation from a prior session's approved Task 1 checkpoint)
- **Started:** 2026-07-14T08:50:00Z
- **Completed:** 2026-07-14T09:02:12Z
- **Tasks:** 3 (1 human checkpoint resolved in a prior session, 2 automated tasks executed this session)
- **Files modified:** 8 (6 source/test files, package.json, package-lock.json)

## Accomplishments
- Added `wrapLng(lng)` to `src/lib/coords.ts`: a cyclic longitude normalizer that wraps out-of-range input (200 -> -160, -200 -> 160, 380 -> 20) instead of clamping, so distinct real-world points past the antimeridian stay distinct — with a short-circuit that keeps it exactly idempotent for already-in-range values (avoiding floating-point drift in the raw modulo formula)
- Rewrote `setLocation` in `src/map/useSelectedLocation.ts` to compute `clampLat(round4(lat))` and `round4(wrapLng(lng))` before both the URL write and the state update — the write path now enforces the identical `[-90,90]`/`[-180,180]` invariant the read path (`readLocationFromUrl`) already enforced, closing CR-01 (the Phase 1 verification BLOCKER)
- Moved the `writeLocationToUrl` side effect out of the state updater (WR-02) — `setLocation` now performs the URL write as a plain statement, then calls `setLocationState`, reading the current zoom via a `locationRef` mirrored in a `useEffect` (not during render, to satisfy the `react-hooks` refs-during-render lint rule) so the callback stays stable and dependency-free
- Tightened `parseGuarded` to reject trailing-garbage numeric strings (`50.1garbage`) via a strict signed-decimal regex before parsing, so such values fall back to the field default instead of silently parsing the numeric prefix (IN-01)
- Added and exported `isValidUrlSelection(search)`, reusing the same `parseGuarded` calls `readLocationFromUrl` uses; wired `App.tsx`'s `hasSelection` initializer to it, replacing the old key-presence-only `hasUrlSelection()` — a malformed shared link (`?lat=abc&lng=999`, or a single valid field) is now uniformly treated as no-selection (no phantom pin, no wasted BigDataCloud fetch), closing WR-01
- Added `@testing-library/react` as a dev-only dependency (approved via the Task 1 blocking-human legitimacy checkpoint) and wrote `renderHook`/`act`-based tests directly exercising `setLocation`'s clamp/wrap behavior — closing the IN-03 coverage gap that let CR-01 ship undetected — plus `wrapLng` and `isValidUrlSelection` unit tests and the IN-01 trailing-garbage `readLocationFromUrl` case
- Typed the BigDataCloud geocode response in `useReverseGeocode.ts` as `ReverseGeocodeResult` (WR-03) and documented `--color-destructive` in `src/index.css` as a reserved UI-SPEC token for a future error state (IN-02)

## Task Commits

Each automated task was committed atomically (Task 1 was a checkpoint that produced no code changes — approved by the human in the prior session):

1. **Task 1: Package legitimacy gate for @testing-library/react** - checkpoint, no commit (resolved: human approved in a prior session)
2. **Task 2: Normalize the location write path + validation, with renderHook tests** - `3188061` (feat)
3. **Task 3: Wire App to shared validation + fold in co-located hardening** - `0929d54` (feat)

**Plan metadata:** (this commit)

_Note: Task 2 followed TDD (tests written first and confirmed RED via `npx vitest run`, then implementation made them GREEN) but is recorded as a single `feat` commit per the plan's task-commit boundary, not separate `test`/`feat` commits._

## Files Created/Modified
- `src/lib/coords.ts` - Added `wrapLng(lng)`, a cyclic longitude normalizer with an in-range short-circuit for exact idempotence
- `src/lib/coords.test.ts` - Added a `wrapLng` describe block covering wrap-past-antimeridian, wrap-past-negative-antimeridian, multi-cycle wrap, and idempotence
- `src/map/useSelectedLocation.ts` - Rewrote `setLocation` to clamp/wrap before writing; moved the URL-write side effect outside the state updater; tightened `parseGuarded` against trailing-garbage strings; added and exported `isValidUrlSelection`
- `src/map/useSelectedLocation.test.ts` - Added `renderHook`/`act`-based `useSelectedLocation` describe block (wrap, clamp, round-trip cases), an `isValidUrlSelection` describe block, and the IN-01 trailing-garbage `readLocationFromUrl` case
- `src/app/App.tsx` - Replaced the local key-presence-only `hasUrlSelection()` with the imported `isValidUrlSelection` as the `hasSelection` state initializer
- `src/geocoding/useReverseGeocode.ts` - Cast the parsed fetch response to `ReverseGeocodeResult`
- `src/index.css` - Documented `--color-destructive` as a reserved, not-yet-consumed UI-SPEC token
- `package.json` / `package-lock.json` - Added `@testing-library/react@16.3.2` as a dev dependency

## Decisions Made
- `wrapLng` short-circuits for already-in-range input rather than always running the modulo formula, to avoid floating-point drift (~1e-13) that the plan's literal formula introduces for in-range values — a Rule 1 auto-fix discovered while confirming the pure-helper idempotence test
- `locationRef` (mirroring `location` for `setLocation`'s zoom default) is updated inside a `useEffect`, not assigned during render, to satisfy `eslint-plugin-react-hooks`' refs-during-render rule — a Rule 1 auto-fix discovered via `npm run lint`
- `@testing-library/react` installed as dev-only after explicit human approval of the Task 1 blocking-human legitimacy checkpoint (official `testing-library` org package, React 19-compatible `v16.3.2`, `@testing-library/dom` resolved automatically as its own transitive dependency, no runtime/bundle dependency added)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Floating-point drift in the plan's literal wrapLng formula**
- **Found during:** Task 2, confirming GREEN for the `wrapLng` idempotence case
- **Issue:** The plan's specified formula `((((lng + 180) % 360) + 360) % 360) - 180` returns `14.419999999999959` for input `14.42` instead of `14.42` exactly, due to floating-point error introduced by the intermediate `+180`/`-180` shift — this would have made `wrapLng` non-idempotent for in-range values and failed the explicit `wrapLng(14.42) === 14.42` acceptance case
- **Fix:** Added an early-return short-circuit (`if (lng >= -180 && lng <= 180) return lng`) before the modulo arithmetic, so in-range values pass through exactly unchanged and only genuinely out-of-range input runs the wrap formula
- **Files modified:** `src/lib/coords.ts`
- **Verification:** `npx vitest run src/lib/coords.test.ts` — all 5 `wrapLng` cases pass, including the idempotence case
- **Committed in:** `3188061` (Task 2 commit)

**2. [Rule 1 - Bug] react-hooks lint violation: ref mutated during render**
- **Found during:** Task 2, running `npm run lint` after implementing `setLocation`'s ref-mirrors-state pattern
- **Issue:** Assigning `locationRef.current = location` directly in the hook's render body (as the plan's action text literally describes: "a ref that mirrors state...assigned each render") triggers `eslint-plugin-react-hooks`' "Cannot access refs during render" error — a hard lint failure, not a style nit
- **Fix:** Moved the ref assignment into a `useEffect(() => { locationRef.current = location }, [location])`, which still keeps `locationRef` in sync with the latest `location` (effects run after every commit, before the next user-initiated `setLocation` call) while satisfying the lint rule
- **Files modified:** `src/map/useSelectedLocation.ts`
- **Verification:** `npm run lint` exits 0; all 38 tests still pass; `npx tsc --noEmit` exits 0
- **Committed in:** `3188061` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs discovered while verifying the plan's own acceptance criteria)
**Impact on plan:** Both fixes were necessary for the plan's own stated behavior/acceptance criteria to hold (exact idempotence, clean lint) and touch only the two lines directly implicated. No scope creep.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required

None - no external service configuration required. `@testing-library/react` is a dev-only test dependency, already installed and verified in this session.

## Next Phase Readiness

Phase 1's shareable-URL round-trip is now provably correct for the previously-broken case (a pin placed after world-copy panning). The write path (`setLocation`) and read path (`readLocationFromUrl`) both enforce the same `[-90,90]`/`[-180,180]` invariant, with direct `renderHook` test coverage of the clamp/wrap behavior. All five findings this plan targeted are closed: CR-01 (blocker), WR-01, WR-02, WR-03, IN-01, IN-02, IN-03. WR-04 (zoom never captured from user zoom/pan interaction) remains explicitly deferred — it is a feature enhancement (capturing user-driven zoom into the URL), not a correctness fix for the shareable-URL blocker, and would reopen the human-verified Plan 03 map-interaction surface; tracked as a follow-up for a future phase if share-my-zoom fidelity is wanted.

Re-verification should re-check the previously-FAILED truth #7 (world-copy-panning round-trip) — this plan's automated tests directly assert the previously-uncovered behavior, but a live browser re-check (pan past the antimeridian, click, confirm the URL's `lng` is in-range and the reopened link reproduces the same pin) was not performed by this executor and may still be warranted before closing out Phase 1's re-verification.

No blockers or concerns carried forward from this plan.

---
*Phase: 01-location-picker-shareable-shell*
*Completed: 2026-07-14*

## Self-Check: PASSED
- FOUND: src/lib/coords.ts
- FOUND: src/lib/coords.test.ts
- FOUND: src/map/useSelectedLocation.ts
- FOUND: src/map/useSelectedLocation.test.ts
- FOUND: src/app/App.tsx
- FOUND: src/geocoding/useReverseGeocode.ts
- FOUND: src/index.css
- FOUND: commit 3188061
- FOUND: commit 0929d54
