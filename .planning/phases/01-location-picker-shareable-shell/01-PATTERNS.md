# Phase 1: Location Picker & Shareable Shell - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 9 (new — no modified files, greenfield repo)
**Analogs found:** 0 / 9

## Greenfield Repository — No Codebase Analogs Exist

This is the **first phase of a greenfield project**. Confirmed by direct filesystem inspection: outside `.planning/` and `.claude/` (settings + CLAUDE.md), the repository contains no application code — no `src/`, no `package.json`, no scaffold of any kind. There are zero existing controllers, components, hooks, services, or tests to search for analogs.

Because there is nothing to copy patterns *from* within this codebase, this document does not force weak/fabricated analog matches. Instead, every file below is marked "No analog — use RESEARCH.md," and the concrete code to follow is the verified, live-tested code already produced by `01-RESEARCH.md` (Patterns 1-4, Standard Stack, Code Examples sections). The planner should treat `01-RESEARCH.md` as the primary source of implementation-ready code for this phase, not this document.

This PATTERNS.md instead documents:
1. The file list this phase will create (from CONTEXT.md + RESEARCH.md's Recommended Project Structure)
2. Role/data-flow classification for each
3. Cross-file shared conventions the planner should hold constant across all of them (since there's no existing codebase convention to inherit, this phase **establishes** the conventions future phases will need to match)

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|-----------------|----------------|
| `src/main.tsx` | config/entrypoint | — | none (greenfield) | no analog |
| `src/app/App.tsx` | component (composition root) | request-response (composes hooks → render) | none (greenfield) | no analog |
| `src/app/LocationPanel.tsx` | component | request-response (display-only) | none (greenfield) | no analog |
| `src/map/MapView.tsx` | component | event-driven (click/drag → state) | none (greenfield) | no analog |
| `src/map/useSelectedLocation.ts` | hook/store | CRUD (read/write URL state) | none (greenfield) | no analog |
| `src/geocoding/useReverseGeocode.ts` | hook/service | request-response (fetch + timeout) | none (greenfield) | no analog |
| `src/geocoding/types.ts` | model (types) | — | none (greenfield) | no analog |
| `src/lib/coords.ts` | utility | transform | none (greenfield) | no analog |
| `src/lib/coords.test.ts` | test | transform | none (greenfield) | no analog |

**Note on file structure:** CONTEXT.md explicitly leaves "component/file structure for the map, pin, and URL-sync logic" to Claude's discretion (see `01-CONTEXT.md` line 37). RESEARCH.md's "Recommended Project Structure" (lines 190-204) is a research recommendation, not a locked decision — the planner may adjust file boundaries as long as the `map/`, `geocoding/`, `app/`, `lib/` separation-of-concerns rationale (RESEARCH.md lines 206-210) is preserved, since this mirrors the project-wide boundary pattern ARCHITECTURE.md sets up for later phases (`weather/` module, etc.).

## Pattern Assignments

Since no in-repo analog exists for any file, each entry below points directly to the verified RESEARCH.md pattern to implement from, with concrete code already extracted there (no need to re-derive).

### `src/map/MapView.tsx` (component, event-driven)
**Source:** `01-RESEARCH.md` Pattern 1 "Click-to-place + drag-to-adjust pin" (lines 212-259) and Pattern 4 "CARTO tile layer with attribution" (lines 335-350).
- Click handler: `useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng) } })`
- Draggable marker: `useRef<LeafletMarker>` + `useMemo`-built `eventHandlers.dragend` reading `marker.getLatLng()`
- Tile layer: CARTO voyager URL + dual OSM/CARTO attribution string (copy verbatim — attribution text is a legal/ToS requirement, not a style choice)
- **Anti-pattern to avoid** (RESEARCH.md lines 352-357): do not attempt to move `MapContainer` via changing `center`/`zoom` props post-mount — they are init-only. Per D-07, this phase never needs `useMap()`/`setView()` at all.

### `src/map/useSelectedLocation.ts` (hook, CRUD on URL state)
**Source:** `01-RESEARCH.md` Pattern 2 "URL as source of truth" (lines 261-297), full `readLocationFromUrl`/`writeLocationToUrl` example given.
- Read `URLSearchParams` once at mount only (`MapContainer`'s center/zoom are immutable after mount, per Pitfall 1, lines 371-375)
- Write via `history.replaceState` on `dragend`/`click` only — never on continuous `drag` events (Pitfall 2, lines 377-381)
- Round to 4 decimals via `round4()` (D-10) before writing
- **Security requirement** (RESEARCH.md V5, lines 461 and Known Threat Patterns line 468): validate/clamp on read — `Number.isFinite` checks, reject `lat` outside [-90,90] / `lng` outside [-180,180], fall back to `DEFAULT_CENTER`/`DEFAULT_ZOOM` (Czech Republic, D-05) rather than passing malformed query-param values through.

### `src/geocoding/useReverseGeocode.ts` (hook/service, request-response)
**Source:** `01-RESEARCH.md` Pattern 3 "Reverse geocode with timeout and graceful fallback" (lines 299-333), full implementation given.
- `AbortController` + `setTimeout(..., 3000)` per D-02
- Treat every non-2xx (including documented `402` fair-use ban) identically to a network error — fall back to coordinates, no special-cased branching (Pitfall 3, lines 383-387)
- Endpoint: `https://api.bigdatacloud.net/data/reverse-geocode-client` — live-verified CORS-enabled, no proxy/backend needed (confirms PLAT-02)
- Never use `dangerouslySetInnerHTML` on the returned place-name string — render as plain text (Known Threat Patterns, line 468)

### `src/geocoding/types.ts` (model)
**Source:** No RESEARCH.md example given verbatim; derive shape from Pattern 3's parsed fields (`city`/`locality`, `principalSubdivision`, `countryName`) and the hook's return contract (`string | null`, resolving to place-name string or `null` on fallback).

### `src/lib/coords.ts` (utility, transform)
**Source:** `01-RESEARCH.md` "Code Examples" section (lines 399-412): `round4(n)` and `DEFAULT_CENTER`/`DEFAULT_ZOOM` constants, copy verbatim.

### `src/lib/coords.test.ts` (test, transform)
**Source:** No existing Vitest analog in repo (greenfield). Standard Vitest unit-test shape applies: `import { describe, it, expect } from 'vitest'`, test `round4` boundary cases (e.g. `round4(49.81749999)` truncation/rounding behavior) and coordinate formatting. RESEARCH.md flags this file as worth testing directly (line 109: "small, pure, easy to regress silently if untested").

### `src/app/App.tsx` / `src/app/LocationPanel.tsx` (components)
**Source:** No RESEARCH.md code example (composition-only, app-specific). Follow the System Architecture Diagram (RESEARCH.md lines 149-188): `App` composes `useSelectedLocation()` → passes `lat/lng` to both `MapView` and `useReverseGeocode(lat, lng)` → `LocationPanel` renders the resolved place name or coordinate fallback as plain text.

## Shared Patterns

### No backend / no proxy
**Source:** RESEARCH.md "Architectural Responsibility Map" (lines 79-89) and Anti-Patterns (line 357)
**Apply to:** All files — no file in this phase may introduce a Cloudflare Pages Function, API route, or fetch proxy. Both external calls (BigDataCloud, CARTO) go directly from the browser.

### No state management library
**Source:** CLAUDE.md "No state manager" constraint; RESEARCH.md confirms (line 58)
**Apply to:** `useSelectedLocation.ts`, `useReverseGeocode.ts`, `App.tsx` — `useState`/`useEffect`/plain hooks only, no Redux/Zustand/Jotai.

### Input validation / clamping on all external and URL-derived values
**Source:** RESEARCH.md Security Domain V5 (lines 461, 465-469)
**Apply to:** `useSelectedLocation.ts` (URL params) and `useReverseGeocode.ts` (rendered geocode result — text-only, never `dangerouslySetInnerHTML`).

### TypeScript version pin
**Source:** RESEARCH.md Pitfall 4 (lines 389-393)
**Apply to:** Initial scaffold/config file (`package.json`) — explicitly `npm install -D typescript@6.0.3` after `npm create vite@latest`, do not let the scaffold default to `7.0.x`.

## No Analog Found

All 9 files listed above have no existing codebase analog — this is expected and correct for a greenfield first phase. Reason: repository contains no application source code prior to this phase.

## Metadata

**Analog search scope:** Entire repository (excluding `.planning/`, `.git/`, `node_modules/`) — confirmed via `find` that only `.claude/settings.local.json` and `.claude/CLAUDE.md` exist outside `.planning/`.
**Files scanned:** 2 non-planning files (both config/instructions, not source code)
**Pattern extraction date:** 2026-07-13
