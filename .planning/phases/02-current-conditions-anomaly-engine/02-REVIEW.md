---
phase: 02-current-conditions-anomaly-engine
reviewed: 2026-07-14T19:35:36Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/anomaly/anomaly.test.ts
  - src/anomaly/anomaly.ts
  - src/anomaly/types.ts
  - src/app/AnomalyCard.tsx
  - src/app/App.css
  - src/app/App.tsx
  - src/app/LocationPanel.tsx
  - src/weather/client.test.ts
  - src/weather/client.ts
  - src/weather/types.ts
  - src/weather/useCurrentWeather.ts
  - src/weather/useHistoricalBaseline.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-14T19:35:36Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the current-conditions/anomaly-engine slice: the hand-rolled statistics module (`anomaly.ts` + its unit tests), the Open-Meteo forecast/archive fetch client, the two async lifecycle hooks (`useCurrentWeather`, `useHistoricalBaseline`), and the `AnomalyCard`/`App`/`LocationPanel` composition layer.

The core math (`mean`, `sampleStdDev`, `computeAnomaly`, `classifyVerdict`, `windowBounds`, `filterDayOfYearWindow`) was traced by hand against the unit tests, including leap-day folding and year-boundary wraparound — all verified correct, including the degenerate-variance (`zScore: null`) and insufficient-sample (`null` result) guards. No SQL/command injection, `eval`, `innerHTML`, hardcoded secrets, or empty catch blocks were found. All dynamic values render as JSX text nodes.

No blocking defects were found. There is a real CSS/visual bug (the z-score chip's background color is identical to its parent panel's background, defeating its "de-emphasized pill" design intent), a data-integrity gap in the archive-response validation (array-length parity between `time` and the value series is never checked), silent error-swallowing in both weather hooks (no logging, so all failure modes are indistinguishable in production), and an inert info button that relies solely on `title` for its content (inaccessible on touch, unreliable for keyboard/AT users). These are flagged as warnings below, along with a few minor code-quality items.

## Warnings

### WR-01: Z-score chip background is invisible against its own panel

**File:** `src/app/App.css:171-182` (`.anomaly-card__zscore`)
**Issue:** The comment above this rule states the z-score chip is meant to be a "clearly de-emphasized" secondary pill (D-08). It sets `background: var(--color-secondary)`, but `.location-panel` (the chip's ancestor, `src/app/App.css:25`) already uses `background: var(--color-secondary)` for the entire panel, and `.anomaly-card`/`.anomaly-card--resolved` never set their own background. `--color-secondary` resolves to `#f4f5f7` in both places (`src/index.css:13`). The result: the "pill" background is the exact same color as the page behind it, so no chip/pill affordance is visible — only the text and padding remain, undermining the documented visual hierarchy.
**Fix:**
```css
.anomaly-card__zscore {
  /* use a token that actually contrasts with --color-secondary, e.g. */
  background: var(--color-dominant); /* #ffffff, or a dedicated --color-chip token */
}
```

### WR-02: Archive response is not validated for array-length parity or element type

**File:** `src/weather/client.ts:99-109`
**Issue:** `getHistoricalBaseline` validates that `data.daily.time` and `series` are both non-empty arrays, but never checks that `series.length === data.daily.time.length`, nor that `series` elements are actually `number | null` (it's accepted purely on the strength of a type assertion). The file's own header comment states "an empty/malformed series must never reach anomaly.ts" (V5 defensive parsing) — a length-mismatched or type-mismatched series currently *does* reach `anomaly.ts`; it happens to fail safely today only because `filterDayOfYearWindow`'s `v != null` check treats out-of-bounds `undefined` the same as `null` (loose equality), which is incidental, not an explicit guarantee.
**Fix:**
```ts
if (
  !data.daily ||
  !Array.isArray(data.daily.time) ||
  data.daily.time.length === 0 ||
  !Array.isArray(series) ||
  series.length === 0 ||
  series.length !== data.daily.time.length
) {
  throw new Error('archive fetch failed: malformed daily series')
}
```

### WR-03: Fetch failures are silently swallowed with no logging

**File:** `src/weather/useCurrentWeather.ts:55-58`, `src/weather/useHistoricalBaseline.ts:59-62`
**Issue:** Both hooks' `.catch(() => { ... })` discard the actual `Error` entirely — a request timeout, a 5xx from Open-Meteo, and a malformed-payload validation error (thrown explicitly in `client.ts`) all collapse to the exact same silent `null`/`resolved-with-nulls` state with zero trace left anywhere (no `console.error`, no telemetry hook). This makes production failures effectively undiagnosable — there is no way to tell from the running app (or logs) why a given pin drop produced "Couldn't compute an anomaly here."
**Fix:**
```ts
.catch((err) => {
  if (cancelled || requestIdRef.current !== requestId) return
  console.error('useHistoricalBaseline: fetch failed', err)
  setResolved({ lat, lng, variable, daily: null })
})
```

### WR-04: Info button is inert and inaccessible — relies solely on `title`

**File:** `src/app/AnomalyCard.tsx:72-79`
**Issue:** The `<button aria-label="Data quality info" title="...">i</button>` has no `onClick` handler; its only content-delivery mechanism is the native `title` tooltip. `title` tooltips require mouse hover, don't reliably fire for keyboard-focused elements across browsers, are not consistently announced by screen readers, and never appear at all on touch devices (the primary input for a map-and-pin app). As implemented, this is a focusable, semantically "interactive" control that does nothing on click/tap/Enter for a large share of users, while claiming (via `aria-label`) to be a real information affordance.
**Fix:** Add a click handler that reveals the same text in an accessible, dismissible element (e.g., a popover/tooltip component or an inline expanding `<p>`), so the info is reachable via click/tap and announced by AT — not gated behind hover-only `title`.

## Info

### IN-01: `BaselineStats` interface is dead code

**File:** `src/anomaly/types.ts:5-9`
**Issue:** `BaselineStats` is exported but never imported or used anywhere in the codebase (verified via project-wide grep). None of `anomaly.ts`'s functions return or accept this shape — `computeAnomaly`/`computeAnomalyForToday` use ad hoc/`AnomalyResult` shapes instead.
**Fix:** Remove `BaselineStats`, or wire it in as the actual return type of a summary-stats helper if one was intended.

### IN-02: `AnomalyCard`'s anomaly prop type duplicates `computeAnomalyForToday`'s return shape

**File:** `src/app/AnomalyCard.tsx:20`, `src/anomaly/anomaly.ts:129`
**Issue:** `AnomalyCardProps.anomaly` is hand-inlined as `{ delta: number; zScore: number | null; verdictTier: VerdictTier } | null`, structurally copy-pasted from `computeAnomalyForToday`'s inline return type in `anomaly.ts`. Neither is a named, exported type, so the two will silently drift out of sync if one is changed without the other.
**Fix:** Extract a shared `AnomalyOutcome` (or similar) type in `src/anomaly/types.ts`, export it from `anomaly.ts`'s return signature, and import it in `AnomalyCard.tsx`.

### IN-03: Delta unit is hardcoded to `°C`, ignoring the already-available `units` value

**File:** `src/app/AnomalyCard.tsx:81`
**Issue:** `<p className="anomaly-card__delta">{formatDelta(anomaly.delta)}°C</p>` hardcodes the `°C` suffix, while the temperature line just above it (`{Math.round(tempC)}{units}`) correctly uses the dynamic `units` prop returned by the forecast API. Today this is harmless because `getCurrentWeather`/`getHistoricalBaseline` never request a non-Celsius unit, but if that ever changes (e.g. a future `temperature_unit=fahrenheit` param), the delta would silently mislabel its unit while the current-temperature line would not.
**Fix:** Reuse `units` for the delta suffix instead of the literal `°C`.

---

_Reviewed: 2026-07-14T19:35:36Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
