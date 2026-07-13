# Walking Skeleton — Weather Anomaly Dashboard

**Phase:** 1
**Generated:** 2026-07-13

## Capability Proven End-to-End

A visitor loads the deployed public app, drops a pin on a Czech-Republic-centered map, sees the pin's reverse-geocoded place name (or its coordinates on lookup failure), and shares the exact view via a URL that reproduces the same location and pin for anyone else — with no login and no backend.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React 19.2.7 + Vite 8.1.4 (static SPA, `react-ts` template) | STACK.md/CLAUDE.md pinned; Vite produces the pure static `dist/` a free static host wants; React Compiler removes most manual memoization for the map+panel re-render surface |
| Language | TypeScript **6.0.3** (explicitly NOT 7.x) | CLAUDE.md/RESEARCH.md Pitfall 4 — TS 7.0's programmatic API is unstable until ~7.1 (Oct 2026); scaffold must override the npm `latest` back to 6.0.3 |
| Map | react-leaflet 5.0.0 wrapping Leaflet 1.9.4, CARTO voyager raster tiles (D-03), Leaflet built-in attribution (D-04) | MapLibre GL explicitly out of scope; CARTO avoids the bare-OSM tile-usage-policy risk |
| Data layer (READ) | Client-side `fetch()` to BigDataCloud reverse-geocode (keyless, CORS-enabled, D-01) — **this is the DB-read substitute** | PROJECT.md forbids a backend/DB; the one real external read is the geocode call, timeout-guarded with a coordinate fallback (D-02) |
| Persistence (WRITE/READ) | **URL query string** `?lat=&lng=&zoom=` via History API `replaceState` (D-09), lat/lng rounded to 4 decimals (D-10) — **this is the DB-write substitute** | PROJECT.md: stateless, no server-side persistence; the URL is the single source of truth and the shareability mechanism |
| Auth | None — public, unauthenticated (PLAT-01) | No accounts/login by design; there is no auth/session/access-control tier anywhere in the project |
| State management | `useState` + small custom hooks (`useSelectedLocation`, `useReverseGeocode`) — no Redux/Zustand/Jotai, no TanStack Query | CLAUDE.md forbids a state manager and a data-fetching library for a single-view app |
| Deployment target | Cloudflare Pages, free tier, git-connected auto-deploy (D-08) | Most generous free tier, commercial-use allowed; no `_redirects` needed (single path `/`, state in query params); no serverless function |
| Directory layout | Feature-boundary folders under `src/`: `map/`, `geocoding/`, `app/`, `lib/` | Mirrors the project-wide "one integration module per external service" boundary ARCHITECTURE.md sets up for later phases (`weather/` slots in alongside `geocoding/` in Phase 2) |

## Stack Touched in Phase 1

- [x] Project scaffold (Vite + React + TS 6.0.3, ESLint/typescript-eslint, Vitest test runner) — Plan 01 Task 1
- [x] Routing — a single real route `/`; view state carried in query params (no router dependency by design) — Plan 01 Tasks 2–3
- [x] Persistence substitute (no DB in this project) — one real **write** (pin → URL via `replaceState`) AND one real **read** (URL → initial map/pin at mount): Plan 01 Task 2 (unit-tested round-trip). One real **external read** (BigDataCloud reverse-geocode fetch): Plan 02 Task 1 (unit-tested success/failure/timeout).
- [x] UI — interactive Leaflet map: click-to-place + drag-to-adjust pin wired through `useSelectedLocation`; location panel with Empty/Loading/Resolved/Fallback states — Plan 01 Task 3, Plan 02 Task 2
- [x] Deployment — live on Cloudflare Pages free tier, public, no login; documented redeploy config — Plan 03

> Note: the generic skeleton checklist's "Database — one real read AND one real write" does not apply — this project has no database or backend by design (PROJECT.md, RESEARCH.md Architectural Responsibility Map). The URL query string is the persistence substitute and the BigDataCloud fetch is the external-read substitute, as recorded above.

## Out of Scope (Deferred to Later Slices)

Explicitly NOT in this skeleton — do not re-litigate Phase 1's minimalism:

- Any weather / temperature / anomaly data or display (Phase 2)
- Historical baselines, z-scores, deltas, verdicts, day-of-year windows (Phase 2)
- Historical trend charts / last-7-days range visualization (Phase 3, uses Recharts)
- "No usable historical data" graceful messaging (Phase 3, ROBU-01)
- localStorage "last location" recall (explicitly deferred — D-05: always default to Czech Republic this phase)
- Address/text search for location picking (CONTEXT.md notes this is a possible future capability, not v1)
- Current-location geolocation button (v2, LOC-04)
- Mobile-responsive layout (v2, PLAT-03 — Phase 1 is desktop-only per UI-SPEC)
- Any backend, serverless function, proxy, state-management library, or data-fetching library (all forbidden by CLAUDE.md)
- react-router (single path `/`; adds nothing until path-based routing is needed)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions (framework, no-backend, URL-as-state, Cloudflare Pages):

- **Phase 2 — Current Conditions & Anomaly Engine:** add a `weather/` integration module (Open-Meteo current + 30-year archive fetch, keyless, client-side) alongside `geocoding/`; hand-rolled z-score/delta math (unit-tested with Vitest); stack temperature + anomaly (delta primary, z-score secondary, plain-language verdict) into the existing `LocationPanel` below the location display.
- **Phase 3 — Historical Trend Charts & Edge Cases:** add Recharts; render last ~7 days each against its own historical distribution (average emphasized, spread visible) stacked below the anomaly panel; add the graceful "no usable historical data" message for ocean/remote locations (ROBU-01).
