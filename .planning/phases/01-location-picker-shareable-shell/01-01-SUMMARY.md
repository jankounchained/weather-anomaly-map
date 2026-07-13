---
phase: 01-location-picker-shareable-shell
plan: 01
subsystem: ui
tags: [react, vite, typescript, react-leaflet, leaflet, vitest, url-state]

# Dependency graph
requires: []
provides:
  - "Vite + React 19 + TypeScript 6.0.3 app scaffold with pinned stack (react-leaflet 5.0.0, leaflet 1.9.4, vitest+jsdom)"
  - "src/lib/coords.ts: round4, clampLat/Lng/Zoom, formatCoords, DEFAULT_CENTER/ZOOM (Czech Republic, D-05)"
  - "src/map/useSelectedLocation.ts: readLocationFromUrl/writeLocationToUrl + useSelectedLocation hook - URL query string as the single source of truth for lat/lng/zoom"
  - "src/map/MapView.tsx: CARTO voyager map with click-to-place + drag-to-adjust pin, no auto-recenter"
  - "src/app/App.tsx composition root + src/app/LocationPanel.tsx docked shell (empty, content in Plan 02)"
  - "Design-token CSS custom properties in src/index.css per UI-SPEC"
affects: [01-02-PLAN, 01-03-PLAN]

# Tech tracking
tech-stack:
  added: [react@19.2.7, react-dom@19.2.7, vite@8.1.4, typescript@6.0.3, react-leaflet@5.0.0, leaflet@1.9.4, "@types/leaflet@1.9.21", vitest@4.1.10, jsdom]
  patterns:
    - "URL query string as the sole persistence layer (replaceState, never pushState/location assignment)"
    - "MapContainer center/zoom read once at mount only, never updated reactively (react-leaflet immutability constraint + D-07 no-recenter)"
    - "Per-field V5 validation: Number.isFinite + clamp-equality check, malformed/out-of-range field falls back to its own Czech Republic default"
    - "Feature-boundary folders under src/: app/, map/, lib/ (geocoding/ added in Plan 02)"

key-files:
  created:
    - src/lib/coords.ts
    - src/lib/coords.test.ts
    - src/map/useSelectedLocation.ts
    - src/map/useSelectedLocation.test.ts
    - src/map/MapView.tsx
    - src/app/App.tsx
    - src/app/App.css
    - src/app/LocationPanel.tsx
    - src/main.tsx
    - src/index.css
    - vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json, eslint.config.js, index.html, package.json
  modified: []

key-decisions:
  - "TypeScript explicitly pinned to 6.0.3 via npm install -D typescript@6.0.3 after scaffold, overriding the ^ range vite scaffold installs by default (Pitfall 4)"
  - "Pin presence (hasSelection) derived independently from useSelectedLocation - App.tsx checks whether the URL literally carried both lat and lng params at mount, so a fresh visit shows the default view with no pin while a shared URL immediately reproduces the pin, without adding a field to useSelectedLocation's return shape (kept Task 2's already-tested return contract stable)"
  - "readLocationFromUrl falls back per-field to its own default rather than an all-or-nothing default object - matches RESEARCH.md's reference implementation extended with V5 range validation"

patterns-established:
  - "Pin visibility gated on hasUrlSelection() check, separate from location state itself"
  - "Vitest config lives in vite.config.ts (test.environment: 'jsdom') rather than a separate vitest.config.ts"

requirements-completed: [LOC-01, LOC-03]

coverage:
  - id: D1
    description: "User can place a pin by clicking anywhere on the map and adjust it by dragging"
    requirement: "LOC-01"
    verification:
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts (writeLocationToUrl + round-trip tests cover the setter path click/drag both call through)"
        status: pass
      - kind: manual_procedural
        ref: "Deferred to Plan 03 deploy checkpoint per plan's <verification> note - visual map/pin behavior confirmed there"
        status: unknown
    human_judgment: true
    rationale: "Actual click/drag interaction on a live Leaflet map requires visual/browser confirmation; the plan explicitly defers this to the Plan 03 deploy checkpoint. Unit tests cover the underlying URL-state contract but not the DOM interaction itself."
  - id: D2
    description: "Selected lat/lng/zoom are encoded in the URL, rounded to 4 decimals, and reload-reproducible"
    requirement: "LOC-03"
    verification:
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts#writeLocationToUrl rounds lat/lng to 4 decimals and sets zoom in the URL"
        status: pass
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts#writeLocationToUrl round-trips through readLocationFromUrl with rounded values"
        status: pass
    human_judgment: false
  - id: D3
    description: "Malformed or out-of-range lat/lng/zoom URL values fall back to the Czech Republic default"
    verification:
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts#readLocationFromUrl falls back to the default lat on a non-numeric lat value"
        status: pass
      - kind: unit
        ref: "src/map/useSelectedLocation.test.ts#readLocationFromUrl falls back to the default lat on an out-of-range lat value"
        status: pass
    human_judgment: false
  - id: D4
    description: "TypeScript pinned to 6.0.3, not the 7.x npm latest"
    verification:
      - kind: other
        ref: "npx tsc --version reports 6.0.3"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-13
status: complete
---

# Phase 1 Plan 1: Scaffold, URL-State Module, and Map+Pin Wiring Summary

**Vite + React 19 + TypeScript 6.0.3 app shell with a CARTO-tiled Leaflet map, click/drag pin interaction, and a unit-tested URL query string acting as the sole persistence layer for lat/lng/zoom (Czech Republic default, D-05).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-13T22:20:00Z (approx.)
- **Completed:** 2026-07-13T22:38:00Z
- **Tasks:** 3 completed
- **Files modified:** 20 files created (0 pre-existing files modified - greenfield phase)

## Accomplishments
- Scaffolded the entire greenfield app (Vite + React 19.2.7 + TypeScript 6.0.3, react-leaflet 5.0.0 + Leaflet 1.9.4, Vitest + jsdom) with design-token CSS custom properties from UI-SPEC
- Built and unit-tested (RED then GREEN) a pure URL-state module: `round4`/`clampLat`/`clampLng`/`clampZoom`/`formatCoords` plus `readLocationFromUrl`/`writeLocationToUrl`/`useSelectedLocation`, with per-field V5 validation falling back to the Czech Republic default on any malformed or out-of-range input
- Implemented `MapView` with a CARTO voyager `TileLayer` (verbatim OSM+CARTO attribution), click-to-place `ClickHandler`, and drag-to-adjust `DraggablePin`, wired into `App.tsx` so pin placement/drag writes through `useSelectedLocation` to the URL, with no pin shown until a location is actually selected

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite + React + TypeScript app with pinned stack and design tokens** - `22cecce` (feat)
2. **Task 2: URL-state module (coords + useSelectedLocation) with tests first** - `c632cd3` (test, RED) then `b14d227` (feat, GREEN)
3. **Task 3: MapView (CARTO tiles + click/drag pin) wired to useSelectedLocation in App** - `d3c012c` (feat)

_TDD gate for Task 2: `c632cd3` (test) confirmed failing (module-not-found) before `b14d227` (feat) made it pass - both gate commits present._

## Files Created/Modified
- `package.json`, `package-lock.json` - pinned deps (react 19.2.7, react-dom 19.2.7, vite 8.1.4, react-leaflet 5.0.0, leaflet 1.9.4, @types/leaflet 1.9.21, typescript 6.0.3, vitest, jsdom); `test` script added
- `vite.config.ts` - Vitest config (`test.environment: 'jsdom'`) alongside the React plugin
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `index.html`, `.gitignore` - standard Vite react-ts scaffold config
- `src/main.tsx` - imports `leaflet/dist/leaflet.css`, patches `L.Icon.Default` marker-icon asset URLs for Vite's bundler, mounts `App`
- `src/index.css` - spacing/color/typography CSS custom properties (UI-SPEC design tokens), full-viewport reset
- `src/lib/coords.ts` / `src/lib/coords.test.ts` - pure coordinate helpers, 8 passing tests
- `src/map/useSelectedLocation.ts` / `src/map/useSelectedLocation.test.ts` - URL read/write + hook, 9 passing tests
- `src/map/MapView.tsx` - `MapContainer` + CARTO `TileLayer` + `ClickHandler` + `DraggablePin`
- `src/app/App.tsx` - composition root, `hasUrlSelection()` gate for pin visibility
- `src/app/App.css` - full-viewport flex-row layout, 360px docked `LocationPanel`
- `src/app/LocationPanel.tsx` - empty docked container shell (content arrives in Plan 02)

## Decisions Made
- Scaffolded into a scratch directory first (`npm create vite@latest . --overwrite` would have required wiping the existing `.planning`/`.git`/`.claude` directories), then copied only the needed files into the repo root - avoids any risk to existing planning/git state
- `hasSelection` (whether a pin should render) is tracked locally in `App.tsx` via `hasUrlSelection()`, not added to `useSelectedLocation`'s return shape - keeps Task 2's already-committed-and-tested hook contract stable while still satisfying "no pin on first load" / "shared URL reproduces the pin" (UI-SPEC, LOC-03)
- `readLocationFromUrl` falls back **per field** to its own default (not all-or-nothing) when a field is malformed/out-of-range, extending RESEARCH.md Pattern 2's reference implementation with V5 range validation (`Number.isFinite` + clamp-equality check)
- vitest jsdom config lives inline in `vite.config.ts` rather than a separate `vitest.config.ts`, since only one config surface exists for this greenfield app

## Deviations from Plan

None - plan executed as written. `jsdom` was installed as a devDependency (not explicitly named in the plan's artifact list) to satisfy the plan's own instruction to configure "a Vitest config (jsdom environment for later DOM-touching tests)" - this is implementation of an already-specified requirement, not new scope.

## Issues Encountered
- `npm create vite@latest . -- --template react-ts` prompted to confirm overwriting the non-empty target directory and was auto-cancelled in the non-interactive shell (the directory has `.git`/`.planning`/`.claude` in it). Resolved by scaffolding into a scratch temp directory instead and copying only the intended files into the repo root - no plan files or planning state were touched.

## User Setup Required

None - no external service configuration required. (BigDataCloud reverse-geocoding setup, if any, belongs to Plan 02; Cloudflare Pages deploy config belongs to Plan 03.)

## Known Stubs

- `src/app/LocationPanel.tsx` renders an empty `<div className="location-panel__content" />` with no location content. This is intentional per the plan's own scope ("empty content section — no location content yet — that arrives in Plan 02") and is not a regression or oversight; Plan 02 adds the `LocationDisplay` component (Empty/Loading/Resolved/Fallback states per UI-SPEC) into this container.

## Next Phase Readiness

- `useSelectedLocation()` is ready for Plan 02 to consume (`lat`, `lng`, `zoom`) to drive the reverse-geocoding fetch
- `LocationPanel` container is ready to receive Plan 02's `LocationDisplay` content
- All automated checks pass: `npx tsc --version` reports 6.0.3, `tsc --noEmit`/`npm run build`/`npm run lint` exit 0, `npx vitest run` passes all 17 tests
- No blockers for Plan 02 (BigDataCloud reverse geocoding + location panel states)

---
*Phase: 01-location-picker-shareable-shell*
*Completed: 2026-07-13*

## Self-Check: PASSED

All 12 created files verified present on disk; all 4 commit hashes (22cecce, c632cd3, b14d227, d3c012c) verified present in git log.
