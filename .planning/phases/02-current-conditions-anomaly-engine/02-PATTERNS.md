# Phase 2: Current Conditions & Anomaly Engine - Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 9 (new)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/weather/types.ts` | model (types) | request-response | `src/geocoding/types.ts` | exact |
| `src/weather/client.ts` | service (fetch wrapper) | request-response | `src/geocoding/useReverseGeocode.ts` (top `reverseGeocode` fn) | exact |
| `src/weather/useCurrentWeather.ts` | hook | request-response | `src/geocoding/useReverseGeocode.ts` (hook portion) | exact |
| `src/weather/useHistoricalBaseline.ts` | hook | request-response | `src/geocoding/useReverseGeocode.ts` (hook portion) | exact |
| `src/anomaly/types.ts` | model (types) | transform | `src/geocoding/types.ts` | role-match |
| `src/anomaly/anomaly.ts` | utility (pure) | transform | `src/lib/coords.ts` | exact |
| `src/anomaly/anomaly.test.ts` | test | transform | `src/lib/coords.test.ts` | exact |
| `src/app/AnomalyCard.tsx` | component | request-response | `src/app/LocationDisplay.tsx` + `src/app/LocationPanel.tsx` | exact |
| `src/app/App.tsx` (modified) | component (composition) | request-response | itself (existing wiring of `useReverseGeocode` + `hasSelection` gating) | exact |

## Pattern Assignments

### `src/weather/types.ts` (model, request-response)

**Analog:** `src/geocoding/types.ts`

**Pattern to copy** (full file, lines 1-24): a small file of narrowly-scoped interfaces/types, each with a one-line doc comment explaining *why only this subset of the upstream API's fields is modeled*. Follow the same shape for `CurrentWeatherResponse`, `ArchiveDailyResponse`, hook status unions (`WeatherStatus = 'idle' | 'loading' | 'resolved'`), and hook return contracts (`UseCurrentWeatherResult`, `UseHistoricalBaselineResult`). Keep dependency-free, matching the `types.ts` file header comment convention ("kept dependency-free per CLAUDE.md").

```typescript
// src/geocoding/types.ts, lines 6-23 — the exact shape to mirror
export interface ReverseGeocodeResult {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
}

export type ReverseGeocodeStatus = 'idle' | 'loading' | 'resolved'

export interface UseReverseGeocodeResult {
  status: ReverseGeocodeStatus
  name: string | null
}
```

---

### `src/weather/client.ts` (service, request-response)

**Analog:** `src/geocoding/useReverseGeocode.ts` — specifically the standalone `reverseGeocode()` fetch function (lines 21-48), NOT the hook portion (that maps to the hook files below).

**Imports pattern** (lines 8-13):
```typescript
import { useEffect, useRef, useState } from 'react'
import type {
  ReverseGeocodeResult,
  ReverseGeocodeStatus,
  UseReverseGeocodeResult,
} from './types'
```
For `client.ts` itself, only the `URL`/`fetch` usage is relevant (no React import needed — client.ts is pure fetch, hooks live in separate files per RESEARCH.md's recommended structure).

**Core fetch pattern** (lines 21-48, adapt AbortController/timeout to research's 8-10s recommendation for the archive call vs ~3s for the current-weather call):
```typescript
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lng))
    url.searchParams.set('localityLanguage', 'en')

    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null // includes 402 fair-use ban -> fall back

    const data = (await res.json()) as ReverseGeocodeResult
    // ...parse/shape response
  } catch {
    return null // network error or abort/timeout -> fall back
  } finally {
    clearTimeout(timeoutId)
  }
}
```
Apply this exact `URL` + `searchParams.set(...)` + try/catch/finally + AbortController shape to `getCurrentWeather(lat, lng)` and `getHistoricalBaseline(lat, lng, variable)`. RESEARCH.md's Code Examples section (lines 305-337 of 02-RESEARCH.md) provides the exact Open-Meteo param names/URLs — combine those params with this codebase's existing `URL`/`searchParams` idiom rather than template-literal URL building.

**Error handling difference to note:** `reverseGeocode` swallows all failures into `null` (a UI fallback is acceptable for a place name). Per RESEARCH.md's Security Domain (V5), `weather/client.ts` should instead `throw` on `!res.ok` or malformed response shape (`res.ok` check + field-existence guard), since a current-weather/baseline fetch failure needs a distinct error state, not a silent fallback — CONTEXT.md's Claude's-Discretion note on "generic network/API-failure handling" applies here. RESEARCH.md's own example already reflects this:
```typescript
// 02-RESEARCH.md lines 328-330
const res = await fetch(url)
if (!res.ok) throw new Error(`forecast fetch failed: ${res.status}`)
return res.json() as Promise<CurrentWeatherResponse>
```

---

### `src/weather/useCurrentWeather.ts` and `src/weather/useHistoricalBaseline.ts` (hook, request-response)

**Analog:** `src/geocoding/useReverseGeocode.ts`, hook portion (lines 50-99)

**Full hook pattern to copy** (lines 67-99):
```typescript
interface ResolvedLookup {
  lat: number
  lng: number
  name: string | null
}

export function useReverseGeocode(
  lat: number | null,
  lng: number | null,
): UseReverseGeocodeResult {
  const [resolved, setResolved] = useState<ResolvedLookup | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (lat === null || lng === null) return
    const requestId = ++requestIdRef.current
    let cancelled = false

    reverseGeocode(lat, lng).then((name) => {
      // Ignore stale responses from a superseded/cancelled lat/lng change.
      if (cancelled || requestIdRef.current !== requestId) return
      setResolved({ lat, lng, name })
    })

    return () => {
      cancelled = true
    }
  }, [lat, lng])

  if (lat === null || lng === null) {
    return { status: 'idle', name: null }
  }
  if (resolved && resolved.lat === lat && resolved.lng === lng) {
    return { status: 'resolved', name: resolved.name }
  }

  const status: ReverseGeocodeStatus = 'loading'
  return { status, name: null }
}
```

**Key structural elements to replicate exactly** (this is the codebase's canonical async-hook idiom, referenced explicitly in RESEARCH.md's Anti-Patterns section):
1. `resolved` state holds the *last completed lookup's key* (here `lat`/`lng`) alongside its result, not just the result — this lets render-time comparison decide `loading` vs `resolved` without a separate `isLoading` flag.
2. `requestIdRef` + `cancelled` local flag together guard against stale async responses from rapid input changes (rapid pin drags).
3. **No `setState` call happens synchronously in the effect body** — only inside the `.then()` continuation. This satisfies `eslint-plugin-react-hooks`' set-state-in-effect rule (RESEARCH.md Anti-Patterns explicitly calls this out as "already hit and fixed in Phase 1").
4. Status is *derived* at render time (`idle` when lat/lng null, `resolved` when the resolved key matches current lat/lng, else `loading`) rather than stored as its own state variable.
5. Early-return gate: `if (lat === null || lng === null) return` inside the effect — mirrors the `hasSelection ? lat : null` gating pattern used at the call site in `App.tsx`.

For `useHistoricalBaseline`, add a third parameter (`variable: string = 'temperature_2m_mean'`) per STACK.md's hook-shape convention referenced in CONTEXT.md, and extend the `useEffect` dependency array and the `ResolvedLookup`-equivalent key to include it.

**Timeout differs per hook:** `useReverseGeocode`'s fetch function uses `TIMEOUT_MS = 3000`; RESEARCH.md's Open Questions #2 recommends 8-10s for `getHistoricalBaseline` given the larger 30-year payload, while `getCurrentWeather` can reuse ~3000ms like the geocode call.

---

### `src/anomaly/types.ts` (model, transform)

**Analog:** `src/geocoding/types.ts` (structural convention only — no direct analog for the specific shapes, which come from RESEARCH.md)

Follow the same "narrow interfaces + one-line rationale comments" convention. Define `BaselineStats`, `AnomalyResult`, `VerdictTier` per RESEARCH.md's Recommended Project Structure (`anomaly/types.ts`) and Code Examples (`AnomalyResult { delta: number; zScore: number | null }`, `VerdictTier` union of 5 string literals).

---

### `src/anomaly/anomaly.ts` (utility, pure/transform)

**Analog:** `src/lib/coords.ts` — this is the codebase's established "pure, dependency-free, unit-tested math module" pattern, and RESEARCH.md explicitly names it as the precedent (CONTEXT.md line 74: "`src/lib/coords.ts` ... is the existing precedent for the ... pattern research recommends for `anomaly.ts`").

**File header comment pattern** (lines 1-3):
```typescript
// Pure coordinate helpers shared by the map, the URL-state module, and the
// (Plan 02) location display fallback. Kept dependency-free per CLAUDE.md
// ("hand-roll, don't add a dependency" for a handful of lines of math).
```
Use an equivalent header for `anomaly.ts` explaining it is pure/dependency-free math per CLAUDE.md's "hand-roll" directive and STACK.md.

**Function style** (lines 16-55): each function is a short, single-purpose pure function with a one-line doc comment stating the *why* (e.g. precision rationale, requirement ID reference like `D-10`, `CR-01`). Example:
```typescript
/** Round a coordinate to 4 decimal places (~11m precision, D-10). */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
```
Apply this exact style — doc comment referencing the relevant decision ID (D-01, D-02, D-05, ANOM-04) — to `mean`, `sampleStdDev`, `computeAnomaly` (or `computeZScore`/`computeDelta` if split), `classifyVerdict`, `windowBounds`, `filterDayOfYearWindow`. RESEARCH.md's Code Examples section (02-RESEARCH.md lines 340-399) already provides working reference implementations matching this exact granularity and commenting style — use them directly, adapting comments to this repo's doc-comment convention.

**Guard-clause style** (`wrapLng`'s early-return, lines 43-44, and `sampleStdDev`'s `n < 2` guard in RESEARCH.md) — prefer an explicit early return over nested conditionals for edge cases (e.g. `stdDev === 0` guard from Pitfall 2).

---

### `src/anomaly/anomaly.test.ts` (test, transform)

**Analog:** `src/lib/coords.test.ts` (full file, lines 1-98)

**Structure to copy:**
```typescript
import { describe, it, expect } from 'vitest'
import { round4, clampLat, /* ... */ } from './coords'

describe('round4', () => {
  it('rounds to 4 decimal places', () => {
    expect(round4(49.817499)).toBe(49.8175)
  })
})
```
- One `describe` block per exported function.
- Each `it` title names the specific behavior/edge case being pinned (boundary values, idempotency, defaults tied to a decision ID — e.g. `coords.test.ts` line 87: `it('defaults to the Czech Republic (D-05)'`).
- Include an explicit edge-case test per guard clause (mirrors `wrapLng`'s 5 tests covering wraparound, multi-cycle, idempotency, and boundary value).

RESEARCH.md's own test skeleton (02-RESEARCH.md lines 401-436) is already written in a near-identical `describe`/`it` style with hand-computed reference values (e.g. `sampleStdDev` against a known `STDEV.S` result) — use it as the literal starting point, folding in this repo's convention of referencing decision IDs in test titles where applicable (e.g. `it('returns null zScore, not Infinity/NaN, when stdDev is 0 (Pitfall 2)', ...)`).

---

### `src/app/AnomalyCard.tsx` (component, request-response)

**Analog:** `src/app/LocationDisplay.tsx` (state-branching pattern) + `src/app/LocationPanel.tsx` (container/shell pattern)

**Multi-state branching pattern** (`LocationDisplay.tsx`, lines 18-64) — render exactly one of several mutually-exclusive states via sequential early returns, each as its own JSX block with a distinct BEM-style modifier class:
```typescript
export function LocationDisplay({ hasSelection, status, name, lat, lng }: LocationDisplayProps) {
  if (!hasSelection) {
    return (
      <div className="location-display location-display--empty">
        {/* ... */}
      </div>
    )
  }

  if (status !== 'resolved') {
    return (
      <div className="location-display location-display--loading" role="status">
        <span className="location-display__spinner" aria-hidden="true" />
        <p className="location-display__body">Looking up place name…</p>
      </div>
    )
  }

  if (name) {
    return (
      <div className="location-display location-display--resolved">
        <h2 className="location-display__heading">{name}</h2>
      </div>
    )
  }

  return (
    <div className="location-display location-display--fallback">
      <p className="location-display__label">{formatCoords(lat, lng)}</p>
    </div>
  )
}
```
**Apply directly to `AnomalyCard`'s D-09 combined-loading-gate requirement:** branch on `!hasSelection` (empty state), then on `currentStatus !== 'resolved' || baselineStatus !== 'resolved'` (single combined loading state — both hooks must resolve together, per D-09, rather than two independent `status !== 'resolved'` checks), then the resolved/error state, then render delta/verdict/z-score per D-06/D-08. Use `role="status"` + `aria-hidden` spinner exactly as `LocationDisplay`'s loading branch does.

**Naked text-node rendering discipline** (file header comment, lines 1-5): "All dynamic text ... renders as ordinary JSX text nodes only — never through a raw-HTML sink" — apply the same discipline to the delta number, verdict label, and z-score value (all attacker-adjacent in the sense of being derived from upstream API data, per RESEARCH.md's V5 input-validation note).

**Container/shell pattern** (`LocationPanel.tsx`, full file, lines 1-17):
```typescript
import { LocationDisplay, type LocationDisplayProps } from './LocationDisplay'

export type LocationPanelProps = LocationDisplayProps

export function LocationPanel(props: LocationPanelProps) {
  return (
    <aside className="location-panel">
      <div className="location-panel__content">
        <LocationDisplay {...props} />
      </div>
    </aside>
  )
}
```
`LocationPanel.tsx`'s own header comment ("reserves the space below for the anomaly/chart content stacked in Phase 2/3") confirms `AnomalyCard` is meant to be composed inside `LocationPanel`'s content area, below/alongside `LocationDisplay` — not a competing top-level layout region.

---

### `src/app/App.tsx` (modified — composition/wiring)

**Analog:** itself, existing `useReverseGeocode` wiring (lines 1-51)

**Gating pattern to replicate for the two new hooks** (lines 17-24):
```typescript
const [hasSelection, setHasSelection] = useState(isValidUrlSelection)
const { status, name } = useReverseGeocode(
  hasSelection ? lat : null,
  hasSelection ? lng : null,
)
```
Wire `useCurrentWeather(hasSelection ? lat : null, hasSelection ? lng : null)` and `useHistoricalBaseline(hasSelection ? lat : null, hasSelection ? lng : null, 'temperature_2m_mean')` the same way — same `hasSelection` gate, same ternary-null pattern — so no wasted fetch fires against the default Czech Republic center before a pin exists (CONTEXT.md line 73 confirms this exact pattern is the intended reuse).

**Render wiring:** pass the combined props down into `LocationPanel`/`AnomalyCard` the same way `status`/`name`/`lat`/`lng` currently flow into `LocationPanel` (lines 42-48).

## Shared Patterns

### Async hook lifecycle (idle/loading/resolved + stale-response guarding)
**Source:** `src/geocoding/useReverseGeocode.ts` lines 67-99
**Apply to:** `useCurrentWeather.ts`, `useHistoricalBaseline.ts`
Render-derived status (not stored state), `requestIdRef` + `cancelled` flag to ignore stale async responses, `setState` only inside `.then()` continuation (never synchronously in effect body — required by `eslint-plugin-react-hooks`'s set-state-in-effect rule per RESEARCH.md Anti-Patterns), null-gated early return when lat/lng are `null`.

### Pure, dependency-free, unit-tested math modules
**Source:** `src/lib/coords.ts` + `src/lib/coords.test.ts`
**Apply to:** `src/anomaly/anomaly.ts` + `src/anomaly/anomaly.test.ts`
Small single-purpose functions with a one-line "why" doc comment referencing a decision ID; `describe`/`it` per function with named edge-case tests; explicit early-return guards for degenerate inputs (matches `wrapLng`'s idempotency guard → `computeAnomaly`'s `stdDev === 0` guard).

### `hasSelection` gating before any fetch fires
**Source:** `src/app/App.tsx` lines 17-24
**Apply to:** All new hook call sites in `App.tsx`
Ternary-null (`hasSelection ? lat : null`) passed into every location-dependent hook — prevents a wasted request against the default map center.

### Multi-state sequential-branch rendering with BEM-style modifier classes
**Source:** `src/app/LocationDisplay.tsx` lines 18-64
**Apply to:** `AnomalyCard.tsx`
Empty → loading (combined, D-09) → resolved → fallback/error, each an early return with its own `--modifier` class; dynamic values always rendered as plain JSX text nodes, never raw HTML.

### `URL` + `searchParams.set(...)` request building
**Source:** `src/geocoding/useReverseGeocode.ts` lines 28-34
**Apply to:** `src/weather/client.ts`'s `getCurrentWeather` and `getHistoricalBaseline`
```typescript
const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
url.searchParams.set('latitude', String(lat))
url.searchParams.set('longitude', String(lng))
```
Combine with the exact Open-Meteo param names from 02-RESEARCH.md's Code Examples section (`current=temperature_2m`, `timezone=auto`, `daily=temperature_2m_mean`, `start_date`/`end_date`) — always `https://`, never derived from user input (RESEARCH.md Security Domain V6).

## No Analog Found

None — every new file for this phase has a strong existing analog in the Phase 1 codebase (`useReverseGeocode.ts`, `coords.ts`/`coords.test.ts`, `LocationDisplay.tsx`/`LocationPanel.tsx`, `types.ts`, `App.tsx`). Where the codebase has no precedent for a specific detail (exact Open-Meteo param/response shapes, z-score/verdict math), RESEARCH.md's Code Examples section (already verified live against the production API) is the fallback source — referenced inline above per file.

## Metadata

**Analog search scope:** `src/` (all existing files — `geocoding/`, `map/`, `lib/`, `app/`)
**Files scanned:** 12 existing source files (`App.tsx`, `LocationPanel.tsx`, `LocationDisplay.tsx`, `useReverseGeocode.ts`, `useReverseGeocode.test.ts`, `types.ts` (geocoding), `coords.ts`, `coords.test.ts`, `useSelectedLocation.ts`, `useSelectedLocation.test.ts`, `MapView.tsx`, `App.css`)
**Pattern extraction date:** 2026-07-14
