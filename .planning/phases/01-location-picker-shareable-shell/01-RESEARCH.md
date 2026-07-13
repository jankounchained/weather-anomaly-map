# Phase 1: Location Picker & Shareable Shell - Research

**Researched:** 2026-07-13
**Domain:** React + Leaflet map interaction, client-side reverse geocoding, URL-as-state SPA pattern, static-site deployment (Cloudflare Pages)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Reverse Geocoding**
- D-01: Use BigDataCloud's client-side reverse geocode endpoint (free, keyless, CORS-enabled, purpose-built for browser-only reverse lookups) — chosen over Nominatim (usage policy discourages "heavy" client-side/production use without self-hosting) and Open-Meteo's geocoding API (unverified reverse support, primarily a forward name-search endpoint).
- D-02: On geocoding failure or slow response, wait a short timeout (~3s) then fall back to showing raw coordinates (per LOC-02). Do not block the UI on an indefinite spinner.

**Map Tiles & Attribution**
- D-03: Use CARTO's free raster tile set as the basemap — free for this app's traffic level, minimal styling fits a data-focused dashboard, avoids the bare-OSM-tile-usage-policy risk flagged in research.
- D-04: Show attribution via Leaflet's standard built-in attribution control (bottom-right corner) — satisfies CARTO's attribution requirement with no custom UI work.

**Initial Map State & Pin Interaction**
- D-05: On first load (and on every subsequent load — no "last used" persistence for this phase), the map always centers on a fixed default: Czech Republic. No localStorage-based "last location" recall in this phase.
- D-06: Pin placement is click-anywhere-to-place, then drag-to-adjust — matches LOC-01's "clicking or dragging" wording, covering both fast pick and precise adjustment.
- D-07: After a pin is placed, the map does NOT auto-zoom or recenter — the current view stays as-is. This is a deliberate choice against the initially-recommended auto-zoom-on-pick behavior.

**Deployment & URL Shareability**
- D-08: Deploy to Cloudflare Pages (most generous free tier, explicit commercial-use allowance, matches STACK.md recommendation).
- D-09: The shareable URL encodes lat, lng, AND the current map zoom level (e.g. `?lat=&lng=&zoom=`) — so a shared link reproduces both the picked location and the sharer's zoomed view, not just the coordinates.
- D-10: Lat/lng in the URL are rounded to 4 decimal places (~11m precision) — far more precision than the weather use case needs, keeps URLs clean, and aligns with the rounding precision research recommended for the future localStorage baseline-cache key (Phase 2+).

### Claude's Discretion
- Exact wording/styling of the loading/fallback state during the geocoding timeout.
- Exact default zoom level to pair with the Czech Republic default center.
- Component/file structure for the map, pin, and URL-sync logic (implementation detail, not a user-facing decision).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Address-search/text-input for location picking was considered but not raised as scope creep since LOC-01 explicitly scopes location picking to map click/drag only; a search box would be a new capability for a future phase if desired.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|--------------------|
| LOC-01 | User can pick a location by clicking or dragging a pin on an interactive map | Pattern 1 (Click-to-place + drag-to-adjust pin) — `useMapEvents` for click, draggable `Marker` with `eventHandlers.dragend` for drag adjustment |
| LOC-02 | User sees the selected location's place name (reverse-geocoded), falling back to coordinates if lookup fails | Pattern 3 (Reverse geocode with timeout and graceful fallback) — BigDataCloud endpoint live-verified, ~3s `AbortController` timeout, non-2xx/timeout falls back to rounded coordinates |
| LOC-03 | Selected location is encoded in the URL so a specific view can be shared with others | Pattern 2 (URL as source of truth) — `URLSearchParams` read once at mount, `history.replaceState` on pin place/drag, 4-decimal rounding |
| PLAT-01 | Dashboard is usable by anyone via a shared URL — no accounts, no login required | Architectural Responsibility Map confirms no auth/session tier exists anywhere in this phase's design |
| PLAT-02 | App runs entirely on free hosting tiers (frontend and any backend/API layer) | Standard Stack + deployment guidance — Cloudflare Pages static hosting, no backend/serverless function introduced; Environment Availability confirms no paid tooling required |
</phase_requirements>

<claude_md_constraints>
## Project Constraints (from CLAUDE.md)

The following directives from `.claude/CLAUDE.md` are binding for this phase's plan:

- **Stack pin:** React 19.2.7, Vite 8.1.4, react-leaflet 5.0.0 (wraps Leaflet 1.9.4), TypeScript 5.9.x/6.x — explicitly NOT 7.0 (ecosystem tooling lag until ~7.1, Oct 2026).
- **Map library:** react-leaflet + Leaflet only — MapLibre GL JS is explicitly out of scope for this project ("solves problems this app doesn't have").
- **No state manager:** Redux/Zustand/Jotai are explicitly forbidden for v1 — `useState` + small custom hooks only.
- **No data-fetching library:** TanStack Query/SWR explicitly deferred — plain `fetch()` + custom hooks only.
- **No backend/serverless "just in case":** explicitly listed under "What NOT to Use" — this phase must not introduce a Cloudflare Pages Function, proxy, or any server-side code.
- **Hosting:** Cloudflare Pages required (Vercel Hobby explicitly forbidden due to non-commercial ToS restriction).
- **Tile provider:** CARTO's free raster tiles required — bare `tile.openstreetmap.org` explicitly forbidden ("solves problems... steeper API... often needs a third-party vector style provider").
- **Dev tooling:** ESLint + `typescript-eslint`, Vitest for unit tests — verify `typescript-eslint` compatibility with the pinned TypeScript version before any upgrade.
- **GSD Workflow Enforcement:** All file-changing work for this phase must go through a GSD command (`/gsd-execute-phase` for planned phase work) — no direct repo edits outside the GSD workflow.

No conflicts were found between these constraints and the locked decisions in CONTEXT.md (D-01 through D-10) or the recommendations in this research — they are mutually reinforcing.
</claude_md_constraints>

## Summary

This is the first phase of a greenfield project — no application code exists yet. It establishes the entire app shell: a Vite + React 19 + TypeScript scaffold, a single-pin Leaflet map centered on the Czech Republic, click-to-place + drag-to-adjust pin interaction, BigDataCloud reverse geocoding with a coordinate fallback, lat/lng/zoom encoded in the URL query string as the single source of truth, and a live deploy on Cloudflare Pages. Every implementation decision that could have been ambiguous (tile provider, geocoding provider, URL shape, hosting target, pin interaction model, default center) was already locked in `01-CONTEXT.md` (D-01 through D-10) — this research focuses on **how** to implement those decisions correctly, not on re-opening them.

Two react-leaflet-specific facts materially shape the plan. First, `MapContainer`'s `center`/`zoom` props are **immutable after mount** — changing them later has no effect on the live map (confirmed in react-leaflet's own core-architecture docs and multiple `PaulLeCam/react-leaflet` GitHub issues). This is not a problem here: the plan only needs to read the initial center/zoom from the URL once at mount, and per D-07 the map must never recenter after a pin is placed — so no `useMap()` + `setView()`/`flyTo()` machinery is needed at all for this phase. Second, because the shareable URL encodes state purely as query params on the root path (`?lat=&lng=&zoom=`) rather than through path-based routing, **no SPA-redirect (`_redirects`) configuration is needed on Cloudflare Pages** — a plain static site serving `index.html` at `/` handles every shared link correctly. Both of these findings simplify the phase considerably; the planner should not add complexity (imperative map recentering, `react-router`, `_redirects` rewrites) that the locked decisions and the platform don't require.

The BigDataCloud reverse-geocode endpoint (`https://api.bigdatacloud.net/data/reverse-geocode-client`) was live-tested in this research session (not just read about) and confirmed to return `access-control-allow-origin: *`, meaning it is directly callable from the browser with plain `fetch()` — no proxy needed, consistent with the project's no-backend constraint. The CARTO tile URL was likewise live-tested and confirmed to serve valid PNG tiles.

**Primary recommendation:** Scaffold with `npm create vite@latest -- --template react-ts`, pin TypeScript to `6.0.3` (not the just-GA'd 7.0.2), install `react-leaflet@5.0.0` + `leaflet@1.9.4` + `@types/leaflet`, build the map/pin/URL-sync logic as three small, well-separated pieces (`MapView`, a `useSelectedLocation` hook owning URL read/write, a `useReverseGeocode(lat, lng)` hook with an AbortController-based ~3s timeout), and deploy to Cloudflare Pages via git-connected auto-deploy with build command `npm run build` / output directory `dist` — no redirects file, no serverless function, no state management library.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Map rendering & pin interaction (click/drag) | Browser / Client | — | Leaflet is a client-side DOM/canvas library; no server involvement possible or needed |
| Reverse geocoding (lat/lng → place name) | Browser / Client | — | BigDataCloud's `reverse-geocode-client` endpoint is CORS-enabled and designed for direct browser `fetch()`; project constraint forbids a backend |
| URL state sync (lat/lng/zoom ⇄ query params) | Browser / Client | — | History API (`pushState`/`replaceState`) is a pure browser-side concern; no routing framework or server needed since there's only one path (`/`) |
| Map tile delivery | CDN / Static | — | CARTO's `basemaps.cartocdn.com` is a third-party CDN; the app only references tile URLs, it doesn't proxy or cache them |
| App shell hosting | CDN / Static | — | Cloudflare Pages serves the built `dist/` as static assets from its edge CDN; zero app-owned server tier exists in this project |

**No API/Backend tier exists in this project's architecture** — this is a deliberate, locked decision (PLAT-01/PLAT-02, STACK.md "Backend: None required"). Every capability in this phase lives in the Browser/Client or CDN/Static tier. Any plan or task that introduces a server-side call, proxy, or serverless function for this phase would be a tier misassignment.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.7 | UI framework | `[VERIFIED: npm registry]` — confirmed via `npm view react version` this session; matches CLAUDE.md/STACK.md pin |
| react-dom | 19.2.7 | React DOM renderer | `[VERIFIED: npm registry]` — confirmed via `npm view react-dom version` this session |
| vite | 8.1.4 | Build tool / dev server | `[VERIFIED: npm registry]` — confirmed via `npm view vite version` this session; produces the static `dist/` Cloudflare Pages needs |
| typescript | **6.0.3** (not 7.0.2) | Type safety | `[VERIFIED: npm registry]` — confirmed `6.0.3` is the latest pre-7.0 stable release via `npm view typescript versions`. TypeScript 7.0.2 is now the npm `latest` tag (GA'd 2026-07-08), but CLAUDE.md and STACK.md explicitly pin to 6.x/5.9.x until 7.1 ships a stable programmatic API (~Oct 2026) — **do not let `npm create vite@latest` install the `latest` tag for TypeScript without pinning it down to `6.0.3` explicitly.** |
| react-leaflet | 5.0.0 | Interactive map, click/drag pin | `[VERIFIED: npm registry]` — confirmed via `npm view react-leaflet version`; peer deps `react ^19.0.0`, `react-dom ^19.0.0`, `leaflet ^1.9.0` all satisfied |
| leaflet | 1.9.4 | Core map engine (required peer of react-leaflet) | `[VERIFIED: npm registry]` — confirmed via `npm view leaflet version` |
| @types/leaflet | 1.9.21 | TypeScript types for Leaflet | `[VERIFIED: npm registry]` — confirmed via `npm view @types/leaflet version`; Leaflet itself ships without types |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | latest (7.x) | Unit tests for pure URL-encode/decode and coordinate-rounding functions | Recommended for this phase's `lib/urlState.ts` (rounding to 4 decimals per D-10, parsing/serializing query params) — small, pure, easy to regress silently if untested |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native History API for URL sync | `react-router`'s `useSearchParams` | Only worth adding if the app later needs path-based routes; this phase has exactly one path (`/`), so a router dependency buys nothing yet — CONTEXT.md's Claude's-Discretion note on file structure supports keeping this minimal |
| BigDataCloud reverse geocoding | Nominatim (OSM) | Nominatim's usage policy discourages "heavy" client-side/production use without self-hosting — already rejected in D-01, don't reconsider |
| CARTO raster tiles | Bare `tile.openstreetmap.org` | OSM's tile usage policy prohibits bulk/production traffic without a dedicated arrangement — already rejected in D-03, don't reconsider |

**Installation:**
```bash
npm create vite@latest . -- --template react-ts
npm install react-leaflet@5.0.0 leaflet@1.9.4
npm install -D @types/leaflet@1.9.21 vitest
npm install -D typescript@6.0.3   # override whatever create-vite scaffolds by default
```

**Version verification:** All core package versions above were verified live against the npm registry on 2026-07-13 (`npm view <pkg> version`). No package version claim in this table is stale training-data knowledge.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| react | npm | est. 2013, latest publish 2026-06-01 | 153.3M/wk | github.com/facebook/react | OK | Approved |
| react-dom | npm | est. 2013, latest publish 2026-06-01 | 121.3M/wk | github.com/facebook/react | OK | Approved |
| vite | npm | est. 2020, latest publish 2026-07-09 | 129.8M/wk | github.com/vitejs/vite | SUS ("too-new") | Approved — flag is a false positive from the heuristic; "too-new" reflects a very recent version bump on a well-established, extremely high-download, officially maintained project, not a supply-chain risk. No `checkpoint:human-verify` needed. |
| typescript | npm | est. 2012, latest publish 2026-07-08 | 226.1M/wk | github.com/microsoft/TypeScript | SUS ("too-new") | Approved — same false-positive pattern as vite (7.0.2 just GA'd). We are pinning to `6.0.3` anyway (published earlier, not flagged), which sidesteps the concern entirely. |
| react-leaflet | npm | est. 2017, latest publish 2024-12-14 | 2.5M/wk | github.com/PaulLeCam/react-leaflet | OK | Approved |
| leaflet | npm | est. 2011, latest publish 2023-05-18 | 4.6M/wk | github.com/Leaflet/Leaflet | OK | Approved |
| @types/leaflet | npm | latest publish 2025-10-11 | 3.7M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |
| vitest | npm | est. 2021, latest publish 2026-07-06 | 76.5M/wk | github.com/vitest-dev/vitest | SUS ("too-new") | Approved — same false-positive pattern; extremely high download count and an official, well-known repo. |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** vite, typescript, vitest — all three flagged solely because their most recent published version is very recent ("too-new" heuristic), not because of any supply-chain red flag (all have 70M+ weekly downloads and long-established official GitHub repos). No `checkpoint:human-verify` task is warranted for these three; the planner may install them directly. If the planner's tooling requires a checkpoint for any `SUS` verdict regardless of cause, add a lightweight one, but note in the checkpoint text that this is a version-recency false positive, not a legitimacy concern.

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (client)                             │
│                                                                        │
│   URL query string (?lat=&lng=&zoom=)                                 │
│        │ read once on mount                    ▲ written on          │
│        ▼                                        │ pin place/drag     │
│   ┌─────────────────────────┐                   │ or map move        │
│   │ useSelectedLocation()   │───────────────────-┘                    │
│   │ (parses/rounds/writes    │                                        │
│   │  URL via History API)    │                                        │
│   └───────────┬───────────--┘                                        │
│               │ lat, lng, zoom                                        │
│               ▼                                                       │
│   ┌───────────────────────┐        ┌─────────────────────────────┐   │
│   │ MapView (react-leaflet)│        │ useReverseGeocode(lat,lng)  │   │
│   │ - MapContainer(initial │        │ - fetch on lat/lng change   │   │
│   │   center/zoom from URL,│───────▶│ - ~3s timeout via Abort     │   │
│   │   read once)           │  lat,  │   Controller                │   │
│   │ - TileLayer (CARTO)     │  lng   │ - fallback: raw coords      │   │
│   │ - Marker (draggable,    │        └───────────┬─────────────---┘   │
│   │   click-to-place via    │                    │ place name or      │
│   │   useMapEvents)         │                    │ fallback coords    │
│   └────────────┬───────────-┘                    ▼                   │
│                │                        ┌────────────────────────┐   │
│                └───────────────────────▶│ Location display panel │   │
│                                          │ (place name or coords) │   │
│                                          └────────────────────────┘   │
└─────────────────┬───────────────────────────────────┬────────────────┘
                   │ HTTPS, CORS, no key                │ HTTPS tile fetch
                   ▼                                     ▼
     ┌───────────────────────────────┐     ┌──────────────────────────┐
     │ api.bigdatacloud.net           │     │ basemaps.cartocdn.com    │
     │ /data/reverse-geocode-client   │     │ /rastertiles/voyager/... │
     └────────────────────────────────┘     └──────────────────────────┘

Deployed as a static build (dist/) to Cloudflare Pages — no server tier.
Shared URL loads the same page at "/" with the same query string;
no path-based routing, so no SPA redirect rules are needed.
```

### Recommended Project Structure
```
src/
├── map/
│   ├── MapView.tsx           # MapContainer + TileLayer + Marker, click/drag handling
│   └── useSelectedLocation.ts # reads/writes ?lat=&lng=&zoom= via History API, rounds to 4dp
├── geocoding/
│   ├── useReverseGeocode.ts  # fetch BigDataCloud, ~3s AbortController timeout, coord fallback
│   └── types.ts              # ReverseGeocodeResult shape
├── app/
│   ├── App.tsx                # composes MapView + location display panel
│   └── LocationPanel.tsx       # renders place name or "lat, lng" fallback
└── lib/
    └── coords.ts               # round(lat/lng, 4), formatCoords()
```

### Structure Rationale

- **`map/` and `geocoding/` are separate boundaries** even though this phase is small — `map/` owns Leaflet/DOM concerns, `geocoding/` owns a single external fetch. This mirrors the project-wide `weather/` boundary pattern already established in ARCHITECTURE.md for later phases (one integration module per external service), so the codebase stays consistent as Phase 2/3 add `weather/client.ts` alongside these.
- **`useSelectedLocation` is the single source of truth**, per ARCHITECTURE.md's "Selected location lives in URL query params" pattern — no duplicate React state for lat/lng exists elsewhere; components read from this hook, and the map's `Marker`/`useMapEvents` write back through it.
- **No `map/useLocationParam.ts` + separate `weather` split needed yet** — that split is ARCHITECTURE.md's cross-phase recommendation for the full app; this phase only needs the map/geocoding pieces.

### Pattern 1: Click-to-place + drag-to-adjust pin (react-leaflet 5)

**What:** A single controlled `Marker` whose position comes from `useSelectedLocation()`. A child component uses `useMapEvents` to catch `click` and call the location setter with the clicked `LatLng`. The `Marker` itself is `draggable`, with an `eventHandlers` object (built via `useMemo`) whose `dragend` handler reads the marker's final position via a `ref` and calls the same location setter.

**When to use:** This is the exact interaction D-06 specifies (click-anywhere-to-place, then drag-to-adjust) — implement both handlers against the same setter so click and drag are two paths to the same state update.

**Example:**
```tsx
// Source: react-leaflet.js.org/docs/example-events/ and /docs/example-draggable-marker/ (official examples)
import { useMemo, useRef } from 'react';
import { Marker, useMapEvents } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function DraggablePin({
  lat, lng, onSelect,
}: { lat: number; lng: number; onSelect: (lat: number, lng: number) => void }) {
  const markerRef = useRef<LeafletMarker>(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const { lat, lng } = marker.getLatLng();
          onSelect(lat, lng);
        }
      },
    }),
    [onSelect],
  );
  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      ref={markerRef}
    />
  );
}
```

### Pattern 2: URL as source of truth — read once on mount, write on every change

**What:** `MapContainer`'s `center`/`zoom` props are **immutable after first mount** (confirmed via react-leaflet's own core-architecture docs and `PaulLeCam/react-leaflet` issues #796 and #1101 — "MapContainer props are immutable... changing them after they have been set a first time will have no effect on the Map instance"). So: read `lat`/`lng`/`zoom` from `URLSearchParams` **once**, on first render, to set `MapContainer`'s initial `center`/`zoom`. On every pin place/drag, write the new `lat`/`lng` back to the URL via `history.replaceState` (not `pushState`, to avoid flooding browser history on every drag frame — use `pushState` only if "back button steps through pin history" is a desired UX, which is not specified as a requirement here). Do NOT attempt to programmatically recenter the map when the URL changes — D-07 explicitly forbids auto-recenter/zoom on pin placement, which conveniently means this phase never needs the `useMap()` + `setView()` workaround that would otherwise be required to sync a changed `center` prop back into the live map.

**When to use:** Always, for this phase's URL sync — this is both the correct pattern given the react-leaflet API's constraints and the pattern D-09 requires.

**Example:**
```tsx
// lib/urlState.ts
const DEFAULT_CENTER = { lat: 49.8175, lng: 15.4730 }; // Czech Republic
const DEFAULT_ZOOM = 7; // frames the whole country

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function readLocationFromUrl(): { lat: number; lng: number; zoom: number } {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat') ?? '');
  const lng = parseFloat(params.get('lng') ?? '');
  const zoom = parseInt(params.get('zoom') ?? '', 10);
  return {
    lat: Number.isFinite(lat) ? lat : DEFAULT_CENTER.lat,
    lng: Number.isFinite(lng) ? lng : DEFAULT_CENTER.lng,
    zoom: Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM,
  };
}

export function writeLocationToUrl(lat: number, lng: number, zoom: number): void {
  const params = new URLSearchParams(window.location.search);
  params.set('lat', String(round4(lat)));
  params.set('lng', String(round4(lng)));
  params.set('zoom', String(zoom));
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
}
```

### Pattern 3: Reverse geocode with timeout and graceful fallback

**What:** On every `lat`/`lng` change, fire a `fetch` to BigDataCloud with an `AbortController` timeout (~3s per D-02). On success, parse `city`/`locality`/`principalSubdivision`/`countryName` into a display string. On failure (network error, non-200 including the documented `402` fair-use response, or timeout abort), fall back to showing the rounded coordinates — never leave the UI on an indefinite spinner.

**When to use:** Always, for the location display panel — this satisfies LOC-02 exactly as specified (fallback to coordinates on failure).

**Example:**
```typescript
// geocoding/useReverseGeocode.ts
// Endpoint and CORS support confirmed live 2026-07-13 via direct curl test:
// GET https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=..&longitude=..&localityLanguage=en
// returned HTTP 200 with `access-control-allow-origin: *`.
const TIMEOUT_MS = 3000;

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('localityLanguage', 'en');
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null; // includes 402 fair-use ban -> fall back
    const data = await res.json();
    const parts = [data.city || data.locality, data.principalSubdivision, data.countryName]
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  } catch {
    return null; // network error or abort/timeout -> fall back
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Pattern 4: CARTO tile layer with attribution

**What:** Use CARTO's `voyager` raster style (a reasonable, minimally-styled default for a data-focused dashboard) via a standard Leaflet `TileLayer`. Attribution must credit both OpenStreetMap (CARTO's underlying data source) and CARTO. Leave Leaflet's default attribution control visible and unmodified (bottom-right) — this is D-04, and satisfies pitfall #7 from PITFALLS.md.

**When to use:** Always, as the single `TileLayer` in `MapView`.

**Example:**
```tsx
// Tile URL and attribution live-tested 2026-07-13: GET a tile returns HTTP 200, image/png
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  subdomains="abcd"
  maxZoom={20}
/>
```

### Anti-Patterns to Avoid

- **Trying to change `MapContainer`'s `center`/`zoom` props after mount and expecting the map to move:** it won't — these props are immutable after first render. Since D-07 forbids auto-recenter anyway, this phase should never need to move the map programmatically after mount at all; don't build `useMap()`/`setView()` machinery pre-emptively for a need that doesn't exist in this phase's scope.
- **Using `window.location.search = ...` or `window.location.href = ...` to update the URL:** both trigger a full page reload, destroying SPA state and defeating the purpose of syncing to the URL. Always use `history.pushState`/`replaceState`.
- **Adding `react-router` "to have it ready for later":** this phase has exactly one route (`/`); a router adds a dependency and complexity for zero benefit at this scope. Revisit only if a future phase needs actual path-based navigation.
- **Adding a Cloudflare Pages Function or any proxy in front of BigDataCloud/CARTO "to be safe":** both are CORS-enabled and keyless; a proxy adds hosting complexity and concentrates rate-limit exposure onto one shared IP for zero benefit (same reasoning PITFALLS.md #6 documents for Open-Meteo, applies identically here).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Map pan/zoom/tile-loading/marker drag physics | A custom Canvas/SVG map renderer | Leaflet (via react-leaflet) | Leaflet has handled cross-browser touch/mouse drag, tile caching, and zoom-level math for over a decade; reimplementing any of it is pure waste for a single-pin picker |
| URL query-string parsing/serialization edge cases (encoding, multiple params, empty values) | Manual string splitting on `?`/`&`/`=` | `URLSearchParams` (built into every evergreen browser) | Native API already handles encoding/decoding correctly; no dependency needed |
| Debouncing/timeout-guarding a fetch call | A custom `Promise.race` + `setTimeout` combo | `AbortController` + `signal` passed to `fetch` | Standard, cancels the actual in-flight request (not just the promise), avoids a dangling network call after the UI has already fallen back |

**Key insight:** Every piece of this phase — map interaction, URL sync, HTTP timeout — has a well-established native or de-facto-standard solution (Leaflet, `URLSearchParams`, `AbortController`). There is no domain-specific logic novel enough in this phase to justify hand-rolling anything; the only "custom" code is thin glue (a few hooks) wiring these standard primitives to the locked product decisions (Czech Republic default, 4-decimal rounding, 3s timeout).

## Common Pitfalls

### Pitfall 1: Assuming `MapContainer`'s `center` prop is reactive
**What goes wrong:** A developer changes the `center`/`zoom` state and expects the map to move, matching typical React "props flow down" mental models.
**Why it happens:** react-leaflet renders `MapContainer` like any other React component, but internally it constructs the underlying Leaflet `Map` instance only once and treats most `MapContainer` props (except `children`) as init-only.
**How to avoid:** Read the URL once at mount for the initial `center`/`zoom`; never rely on prop changes to move the map. Since D-07 forbids programmatic recentering in this phase anyway, there's no code path that needs to move the map after mount at all — treat this as confirmation the locked decision is implementation-compatible, not as a gap to engineer around.
**Warning signs:** Code that sets `center={[lat, lng]}` on `MapContainer` from changing React state and expects visual movement; the map will silently stay put.

### Pitfall 2: `pushState` on every pixel of marker drag
**What goes wrong:** If the drag handler calls `history.pushState` on every intermediate drag event (rather than only on `dragend`), the browser history fills with dozens of entries per drag gesture, breaking the back button.
**Why it happens:** Leaflet's `Marker` fires `drag` continuously during a drag gesture, not just once at the end; wiring the URL-writer to the wrong event is an easy mistake.
**How to avoid:** Only write to the URL on `dragend` (final position) and on `click` (single discrete event) — never on the continuous `drag` event. Prefer `replaceState` over `pushState` for both, since "one entry per pin placement" (not "one entry per gesture") is the desired granularity and this app has no requirement for back-button pin history.
**Warning signs:** Clicking the browser back button after dragging a pin steps through many intermediate positions instead of returning to the previous page.

### Pitfall 3: Treating BigDataCloud's `402` fair-use response as a generic error requiring special handling
**What goes wrong:** A developer writes explicit branching for the documented `402` response (temporary IP-level ban for fair-use violations), when the correct behavior is identical to any other geocoding failure: fall back to coordinates.
**Why it happens:** Seeing a documented, named error condition invites over-engineering a specific handler for it.
**How to avoid:** Treat any non-2xx response (including 402) exactly like a network error or timeout — fall back to coordinates, per D-02. No special-cased UI or retry logic is needed or specified.
**Warning signs:** A `switch` or `if (status === 402)` branch in the geocoding hook that does something different from the generic failure path.

### Pitfall 4: Forgetting to override TypeScript's version after `npm create vite@latest`
**What goes wrong:** The Vite React-TS scaffold installs whatever `typescript` version is current on npm's `latest` tag at scaffold time — which as of this research is `7.0.2`, explicitly flagged by CLAUDE.md/STACK.md as premature (no stable programmatic API until ~Oct 2026).
**Why it happens:** `npm create vite@latest` doesn't know about this project's pinning decision; it just installs the newest stable release.
**How to avoid:** After scaffolding, explicitly `npm install -D typescript@6.0.3` to override whatever version was installed, and verify `package.json`'s `typescript` entry reflects `6.0.3` before continuing.
**Warning signs:** `npx tsc --version` reports `7.0.x` after scaffold.

## Code Examples

Verified patterns from official sources — see Pattern 1-4 above for full code. Key snippets:

### Rounding lat/lng to 4 decimal places (D-10)
```typescript
// Source: standard JS rounding, no library needed
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
```

### Reading the default Czech Republic center (D-05)
```typescript
// Center chosen to frame the whole country at zoom 7 (Claude's discretion per CONTEXT.md)
const DEFAULT_CENTER = { lat: 49.8175, lng: 15.4730 }; // geographic center of Czechia
const DEFAULT_ZOOM = 7;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Create React App scaffolding | Vite scaffolding | CRA deprecated Feb 2025 | N/A for this greenfield project — always use Vite, never CRA |
| Bare `tile.openstreetmap.org` for production apps | Dedicated free-tier tile provider (CARTO/Stadia/MapTiler) | Ongoing OSM Foundation policy enforcement | Already resolved by D-03; avoids traffic-based blocking risk |

**Deprecated/outdated:**
- TypeScript 7.0.x: technically current/GA, but explicitly avoided per CLAUDE.md/STACK.md pin until 7.1's stable programmatic API ships (~Oct 2026).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | BigDataCloud's `reverse-geocode-client` endpoint has no documented numeric rate limit for client-side usage (beyond the fair-use policy's IP-ban trigger) | Standard Stack / Pattern 3 | If a hidden rate limit exists, heavy testing/dev traffic could trigger a temporary 402 ban during development; mitigate by not hammering the endpoint in a loop during dev/testing |
| A2 | 4th-decimal rounding (D-10, already locked) combined with `replaceState`-on-`dragend` produces URLs stable enough for sharing without a "confirm/apply" step | Pattern 2 | Low risk — this is a direct implementation of an already-locked decision, not new territory |

**All claims not in this table were either verified via a live tool call this session (npm registry queries, direct curl tests against api.bigdatacloud.net and basemaps.cartocdn.com) or cited from official react-leaflet/Cloudflare documentation.**

## Open Questions

1. **Exact default zoom level for the Czech Republic view**
   - What we know: CONTEXT.md leaves this to Claude's discretion; zoom 7 is a reasonable value that frames the whole country in a typical viewport (verified informally against Leaflet's standard zoom-level-to-scale table, not tool-verified against an actual rendered viewport).
   - What's unclear: The ideal value depends on the actual viewport/container size chosen in the UI design, which isn't finalized yet.
   - Recommendation: Use zoom 7 as a starting value in the plan; treat as adjustable during implementation/visual QA rather than a hard requirement.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Node.js | Vite dev server, build | ✓ | v24.18.0 | — (satisfies Vite 8's `^20.19.0 \|\| >=22.12.0` requirement) |
| npm | Package install/scripts | ✓ | 11.16.0 | — |
| git | Version control, Cloudflare Pages git-connected deploy | ✓ | 2.54.0 | — |
| wrangler CLI | Optional: CLI-based Cloudflare Pages deploy | ✗ | — | Use Cloudflare Pages' git-connected auto-deploy (dashboard-configured, no CLI required) — this is STACK.md's recommended path anyway ("Connect the git repo for auto-deploy on push — zero-config") |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** wrangler CLI — not required; git-connected Cloudflare Pages deploy is the primary recommended path and needs no local CLI tool.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | No | App has no accounts/login (PLAT-01) — not applicable |
| V3 Session Management | No | No sessions; stateless SPA |
| V4 Access Control | No | No authorization boundaries — public, unauthenticated app |
| V5 Input Validation | Yes | URL query params (`lat`, `lng`, `zoom`) must be validated/clamped before use — `parseFloat`/`parseInt` with `Number.isFinite` checks and fallback to defaults (see Pattern 2 code example); reject/ignore out-of-range values (`lat` outside [-90,90], `lng` outside [-180,180]) rather than passing them straight to the map or the geocoding fetch |
| V6 Cryptography | No | No secrets, no crypto operations — both external APIs (BigDataCloud, CARTO) are keyless |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Malicious/malformed URL query params (e.g. `?lat=<script>` or absurd numeric values) shared to trick a victim into loading a crafted URL | Tampering | Validate and clamp `lat`/`lng`/`zoom` on read (Pattern 2's `Number.isFinite` + range checks); never interpolate raw query-param strings into HTML — React's JSX escaping already prevents XSS via text content, but the geocoded place-name string returned from BigDataCloud should also be rendered as text (never `dangerouslySetInnerHTML`) |
| Open redirect via crafted `lat`/`lng` values used to construct a URL passed elsewhere | Tampering | Not applicable in this phase — the app never redirects or navigates based on these values, only renders/fetches with them |
| Third-party endpoint (BigDataCloud/CARTO) outage or malicious response tampering | Denial of Service / Tampering | Timeout + fallback (Pattern 3) already covers outage/latency; both responses are read-only display data (place name, map tiles), never executed as code or used to construct further navigation, so a malicious response has no code-execution path |

## Sources

### Primary (HIGH confidence)
- npm registry direct queries (`npm view <pkg> version`, `npm view typescript versions`) — exact current versions of react, react-dom, vite, typescript, react-leaflet, leaflet, @types/leaflet, confirmed 2026-07-13
- Live curl test against `https://api.bigdatacloud.net/data/reverse-geocode-client` — confirmed HTTP 200, `access-control-allow-origin: *`, actual JSON response shape for a Prague coordinate, 2026-07-13
- Live curl test against `https://a.basemaps.cartocdn.com/rastertiles/voyager/...` — confirmed HTTP 200, `image/png` content type, 2026-07-13
- Local environment probe (`node --version`, `npm --version`, `git --version`, `command -v wrangler`) — confirmed available toolchain, 2026-07-13

### Secondary (MEDIUM confidence)
- [react-leaflet Draggable Marker example](https://react-leaflet.js.org/docs/example-draggable-marker/) — official docs, drag-to-adjust pattern
- [react-leaflet Events example](https://react-leaflet.js.org/docs/example-events/) — official docs, `useMapEvents` click pattern
- [react-leaflet Core architecture docs](https://react-leaflet.js.org/docs/core-architecture/) and [PaulLeCam/react-leaflet issue #796](https://github.com/PaulLeCam/react-leaflet/issues/796), [#1101](https://github.com/PaulLeCam/react-leaflet/issues/1101) — `MapContainer` prop immutability after mount
- [BigDataCloud Free Reverse Geocode to City API docs](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api) — endpoint shape, fair-use policy, 402 ban behavior
- [Cloudflare Pages Build configuration docs](https://developers.cloudflare.com/pages/configuration/build-configuration/) — build command `npm run build`, output directory `dist` for the React (Vite) preset
- [CARTO basemap tile URL structure — cross-corroborated web search across CARTO docs, Leaflet-provider demo, MapTiler docs] — `basemaps.cartocdn.com` URL pattern and attribution text

### Tertiary (LOW confidence)
- None — all findings this session were either tool-verified or cited from official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version tool-verified against npm registry this session
- Architecture: HIGH — no backend tier exists by design (already established project-wide in STACK.md/ARCHITECTURE.md); this phase's tier map is a direct application of that locked decision
- Pitfalls: HIGH — react-leaflet's prop-immutability behavior and BigDataCloud's endpoint behavior were both confirmed via official docs / GitHub issues / live tool tests, not inferred

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (30 days — stable domain: Leaflet/react-leaflet, BigDataCloud, and Cloudflare Pages configuration change infrequently; re-verify TypeScript pin sooner if TS 7.1 ships before then, since CLAUDE.md flags that as a revisit trigger)
