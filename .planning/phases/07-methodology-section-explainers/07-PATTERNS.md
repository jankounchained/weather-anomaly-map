# Phase 7: Methodology Section & Explainers - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 7
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/MethodologyPanel.tsx` | component (panel, static disclosure) | request-response (none — pure static render) | `src/app/DeltaPanel.tsx` (composition) + `src/app/PanelShell.tsx`/`PanelHeadline.tsx` (primitives) | role-match (new leaf, but composition pattern is exact) |
| `src/app/MethodologyPanel.test.tsx` | test (component) | request-response | `src/app/DeltaPanel.test.tsx` | exact (RTL + Vitest pattern, same `afterEach(cleanup)` convention) |
| `src/anomaly/anomaly.ts` (modify — add `computePercentileRank`, `percentileLabel`, extend `AnomalyForToday`) | utility (pure domain math + copy helper) | transform (CRUD-free, pure function) | same file's `computeAnomaly`/`classifyVerdict`/`verdictLabel` pair | exact |
| `src/anomaly/anomaly.test.ts` (modify — add `describe` blocks) | test (unit, pure function) | transform | same file's `describe('computeAnomaly', ...)` / `describe('classifyVerdict', ...)` blocks | exact |
| `src/anomaly/types.ts` | model (shared type — NOT touched; `AnomalyForToday` actually lives in `anomaly.ts`, not `types.ts`) | n/a | `AnomalyForToday` interface in `anomaly.ts` lines 242-246 | exact (correcting an assumption in the phase brief — see note below) |
| `src/app/DeltaPanel.tsx` (modify — insert percentile `<p>`) | component (panel, populated branch) | request-response | same file's existing micro-copy/verdict `<p>` lines (95-98) | exact |
| `src/app/App.tsx` (modify — mount `<MethodologyPanel />`) | component (composition root) | request-response | same file's existing `<TrendRow />` mount (lines 127-133) | exact |

**Correction to phase brief:** `src/anomaly/types.ts` does NOT need modification. `AnomalyForToday` is defined and exported directly from `src/anomaly/anomaly.ts` (lines 242-246), not from `types.ts`. `types.ts` only holds `BaselineStats`, `AnomalyResult`, `VerdictTier`, `TrendDayResult` — none of which need a `percentile` field. The interface to extend is the one in `anomaly.ts`.

## Pattern Assignments

### `src/anomaly/anomaly.ts` (utility, transform) — add `computePercentileRank` + `percentileLabel`, extend `AnomalyForToday`

**Analog:** same file, `classifyVerdict`/`verdictLabel` pair (lines 52-63) and `computeAnomaly` (lines 26-35)

**Existing math/copy split to mirror** (lines 52-63):
```typescript
export function classifyVerdict(zScore: number): VerdictTier {
  const abs = Math.abs(zScore)
  const sign = zScore >= 0 ? 'warmer' : 'colder'
  if (abs < 0.5) return 'typical'
  if (abs < 1.5) return `slightly-${sign}` as VerdictTier
  return `much-${sign}` as VerdictTier
}

export function verdictLabel(tier: VerdictTier): string {
  return VERDICT_LABEL[tier]
}
```

**New code to add** (colocate near `classifyVerdict`/`verdictLabel`, per RESEARCH.md Open Questions recommendation):
```typescript
/** PD-01/PD-02/PD-05: empirical (Hazen/midrank) percentile rank of `today`
 * within the SAME window `samples` computeAnomaly used - so today's
 * percentile and today's z-score can never drift apart on which samples
 * they rank against. Callers MUST only invoke this when the caller's own
 * zScore is non-null (PD-04) - this function does NOT re-derive its own
 * degeneracy check; it reuses computeAnomaly's existing signal instead. */
export function computePercentileRank(today: number, samples: number[]): number {
  const below = samples.filter((s) => s < today).length
  const ties = samples.filter((s) => s === today).length
  const raw = ((below + ties / 2) / samples.length) * 100
  return Math.max(1, Math.min(99, Math.round(raw)))
}

/** PD-07: plain-language framing, symmetric +/-5-point median band per
 * 07-UI-SPEC.md's Copywriting Contract. Returns null (render nothing) when
 * `percentile` is null - PD-04 suppression, propagated from computeAnomalyForToday. */
export function percentileLabel(percentile: number | null): string | null {
  if (percentile === null) return null
  if (percentile > 55) return `Warmer than ${percentile}% of years for this date.`
  if (percentile < 45) return `Colder than ${100 - percentile}% of years for this date.`
  return 'Around the middle for this date.'
}
```

**`AnomalyForToday` extension + `computeAnomalyForToday` wiring** (current shape, lines 242-269 — extend both):
```typescript
export interface AnomalyForToday {
  delta: number
  zScore: number | null
  verdictTier: VerdictTier
  percentile: number | null   // NEW
}

export function computeAnomalyForToday(
  daily: { time: string[]; values: (number | null)[] },
  localDate: string,
  todayTemp: number,
  halfWidthDays = 5,
): AnomalyForToday | null {
  const window = computeWindowSamples(daily, localDate, halfWidthDays)
  if (window === null) return null
  const { samples, totalYears } = window
  if (!hasUsableSampleCount(samples, totalYears)) return null

  const { delta, zScore } = computeAnomaly(todayTemp, samples)
  const verdictTier = classifyVerdict(zScore ?? 0)
  const percentile = zScore === null ? null : computePercentileRank(todayTemp, samples) // NEW
  return { delta, zScore, verdictTier, percentile }
}
```

No changes needed to `computeTrendDay`, `computeWindowSamples`, `hasUsableSampleCount`, or `isAnomalyReady` — all reused as-is.

---

### `src/anomaly/anomaly.test.ts` (test) — add `describe('computePercentileRank', ...)` + `describe('percentileLabel', ...)`

**Analog:** same file, `describe('computeAnomaly', ...)` (lines 37-54) and `describe('classifyVerdict', ...)`

**Import block to extend** (line 1-17 — add `computePercentileRank, percentileLabel` to the existing named import from `./anomaly`):
```typescript
import { describe, it, expect } from 'vitest'
import {
  mean,
  sampleStdDev,
  computeAnomaly,
  classifyVerdict,
  verdictLabel,
  formatDelta,
  windowBounds,
  filterDayOfYearWindow,
  hasUsableSampleCount,
  computeAnomalyForToday,
  computeTrendDay,
  anomalyColor,
  isDaytime,
  isAnomalyReady,
  computePercentileRank,  // NEW
  percentileLabel,        // NEW
} from './anomaly'
```

**Test style to mirror** (existing `describe('computeAnomaly', ...)` block, lines 37-54 — plain `expect(...).toBe(...)`, one behavior per `it`, comments cite PD-numbers where relevant):
```typescript
describe('computeAnomaly', () => {
  it('returns delta = today - mean and zScore = delta / sampleStdDev (ANOM-01, ANOM-02)', () => {
    const result = computeAnomaly(9, [2, 4, 4, 4, 5, 5, 7, 9])
    expect(result.delta).toBe(4)
    expect(result.zScore).toBeCloseTo(4 / 2.138, 2)
  })

  it('returns null zScore (not Infinity/NaN) when stdDev is 0 (Pitfall 2)', () => {
    const result = computeAnomaly(10, [5, 5, 5])
    expect(result.zScore).toBeNull()
    expect(result.delta).toBe(5)
  })
})
```

RESEARCH.md already provides the exact new `describe` blocks to add (Hazen tie-convention, clamp boundaries, null-suppression, 3 phrasing branches) — copy verbatim, matching this file's existing style (no `beforeEach`, no mocking, plain arrays as fixtures).

---

### `src/app/DeltaPanel.tsx` (component, request-response) — insert percentile line

**Analog:** same file's populated branch (lines 76-105)

**Imports to extend** (lines 16-21 — add `percentileLabel` to the existing named import from `'../anomaly/anomaly'`):
```typescript
import {
  formatDelta,
  isAnomalyReady,
  verdictLabel,
  percentileLabel,          // NEW
  type AnomalyForToday,
} from '../anomaly/anomaly'
```

**Exact insertion point** — between the verdict `<p>` (line 98) and the z-score chip `<p>` (lines 99-103):
```typescript
<p className="m-0 text-heading font-heading">{verdictLabel(anomaly.verdictTier)}</p>
{anomaly.percentile !== null && (
  <p className="m-0 text-body font-body">{percentileLabel(anomaly.percentile)}</p>
)}
<p className="mt-xs inline-block w-fit text-label font-label text-muted bg-secondary rounded-full py-[2px] px-sm">
  {anomaly.zScore === null
    ? 'z — (too little variance to compute)'
    : `z ${anomaly.zScore.toFixed(1).replace('-0.0', '0.0')}`}
</p>
```
No new prop — `anomaly.percentile` is already present on the `AnomalyForToday` type once `anomaly.ts` is extended (`DeltaPanel` imports the type, doesn't redeclare it).

**Micro-copy `<p>` styling to match** (line 95-97, this is the exact `text-body font-body` class the percentile line copies):
```typescript
<p className="m-0 text-body font-body">
  How today compares to the 30-year average for this date.
</p>
```

---

### `src/app/DeltaPanel.test.tsx` — extend the populated-state test (not a new file, but the analog for `MethodologyPanel.test.tsx` below)

**Existing populated-state assertion pattern to extend** (lines 57-84 — ordering assertions via `container.innerHTML.indexOf(...outerHTML)`):
```typescript
it('populated state: renders the dominant Δ number in var(--anomaly-color), with micro-copy before the verdict (PD-07 order)', () => {
  const { getByText, container } = render(
    <DeltaPanel
      hasSelection={true}
      currentStatus="resolved"
      baselineStatus="resolved"
      anomaly={{ delta: 3.2, zScore: 1.8, verdictTier: 'slightly-warmer', percentile: 91 }}
    />,
  )
  // ... existing assertions, extend fixture with `percentile` field
  // add: const percentileLine = getByText('Warmer than 91% of years for this date.')
  // assert html.indexOf(verdict.outerHTML) < html.indexOf(percentileLine.outerHTML)
  //        html.indexOf(percentileLine.outerHTML) < html.indexOf(zScoreChip.outerHTML)
})
```
**Note for planner:** every existing `anomaly={{ delta, zScore, verdictTier }}` fixture in this file (lines 63, 92, 105, 118) needs a `percentile` field added once the type is extended, or TypeScript will fail the build — this is a required incidental edit, not optional.

---

### `src/app/MethodologyPanel.tsx` (NEW component)

**Analog:** `src/app/DeltaPanel.tsx` for the `PanelShell`/`PanelHeadline` composition pattern; `src/app/PanelShell.tsx` + `src/app/PanelHeadline.tsx` for the primitives themselves.

**`PanelShell` composition pattern to mirror** (from `DeltaPanel.tsx` lines 76-78 and `PanelShell.tsx` lines 25-44):
```typescript
// PanelShell base classes (verbatim, PanelShell.tsx line 26):
// 'flex flex-col gap-sm bg-glass-surface border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg px-md py-md'
<PanelShell>
  <PanelHeadline>Delta</PanelHeadline>
  {/* ...panel body... */}
</PanelShell>
```

**`PanelHeadline`'s exact class string** (must be copied onto `<summary>` directly, NOT via the `<PanelHeadline>` component — see RESEARCH.md Pitfall 2, since `<summary>` needs additional flex/interaction classes `PanelHeadline`'s `<p>` doesn't carry):
```typescript
// Source: src/app/PanelHeadline.tsx line 13
'm-0 text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]'
```

**Full new-file pattern** (composed from PanelShell/PanelHeadline classes + 07-UI-SPEC.md's locked Component Inventory and Copywriting Contract — copy is final/approved, do not paraphrase):
```typescript
import { PanelShell } from './PanelShell'

const SUMMARY_CLASSES =
  'text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]' +
  ' flex items-center justify-between gap-sm cursor-pointer list-none' +
  ' [&::-webkit-details-marker]:hidden' +
  ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'

export function MethodologyPanel() {
  return (
    <PanelShell>
      <details className="group">
        <summary className={SUMMARY_CLASSES}>
          How This Works
          <span
            aria-hidden="true"
            className="text-muted motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-90"
          >
            ▸
          </span>
        </summary>
        <div className="flex flex-col gap-sm pt-sm">
          <div>
            <p className="m-0 text-label font-label">What This Shows</p>
            <p className="m-0 text-body font-body">
              This tool shows how unusual today&apos;s temperature is at any location,
              compared to what&apos;s typical for that exact calendar day over the past 30 years.
            </p>
          </div>
          <div>
            <p className="m-0 text-label font-label">How It&apos;s Computed</p>
            <p className="m-0 text-body font-body">
              We pull a 30-year historical baseline for this spot from Open-Meteo&apos;s
              archive — temperatures within 5 days of today&apos;s date, every year. We average
              those readings to get a &apos;typical&apos; value for this date. Today&apos;s reading minus
              that average gives the delta (Δ) in °C. The z-score expresses that same gap in
              standard deviations, so it stays comparable across places with different
              day-to-day variability. The percentile shows where today ranks among those
              historical years for this date.
            </p>
          </div>
          <p className="m-0 text-body font-body">
            Current and historical data comes from Open-Meteo, using ERA5 reanalysis for
            the 30-year baseline — modeled climate data, not a single weather station, which
            is why the delta is shown in whole degrees rather than decimals. Some remote
            locations (oceans, deserts) don&apos;t have enough historical coverage, so the
            anomaly and percentile may be unavailable there.
          </p>
        </div>
      </details>
    </PanelShell>
  )
}
```

**Critical gotcha (verified against installed `tailwindcss@4.3.2`):** `className="group"` MUST be on the `<details>` element itself, or `group-open:rotate-90` on the chevron span silently no-ops (Tailwind's `group-*` variants only activate relative to the nearest ancestor literally carrying `group`).

**No `useState` needed** — unlike `InfoTooltip.tsx` (which needs `useState`/`useRef`/portal because it's a floating hover/focus-dismissible popover), the native `<details>`/`<summary>` element handles all open/close state and keyboard behavior with zero JS.

---

### `src/app/MethodologyPanel.test.tsx` (NEW test)

**Analog:** `src/app/DeltaPanel.test.tsx` (RTL + Vitest structure, `afterEach(cleanup)` convention) combined with `InfoTooltip`'s `fireEvent.click` disclosure-toggle pattern (line 122 of `DeltaPanel.test.tsx`, which tests `InfoTooltip`'s open/close via the same `DeltaPanel` render).

**File-level setup to mirror** (`DeltaPanel.test.tsx` lines 1-8):
```typescript
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { MethodologyPanel } from './MethodologyPanel'

afterEach(cleanup)
```

**Disclosure-toggle test pattern to mirror** (verified in RESEARCH.md session: jsdom 29.1.1 natively toggles `<details>`/`<summary>` on click, zero polyfill needed — mirror `DeltaPanel.test.tsx`'s `InfoTooltip` toggle test, lines 112-128):
```typescript
describe('MethodologyPanel', () => {
  it('renders collapsed by default with the summary headline visible', () => {
    const { getByText } = render(<MethodologyPanel />)
    expect(getByText('How This Works')).toBeTruthy()
    // body copy not asserted absent here (details content is technically
    // in the DOM but hidden — see RTL/jsdom <details> semantics) — assert
    // the summary is present and (optionally) `details.open === false`.
  })

  it('reveals the body copy when the summary is clicked', () => {
    const { getByText } = render(<MethodologyPanel />)
    fireEvent.click(getByText('How This Works'))
    expect(getByText('What This Shows')).toBeTruthy()
    expect(getByText("How It's Computed")).toBeTruthy()
  })

  it('renders unconditionally with no props (PD-11: always visible, no gating)', () => {
    // MethodologyPanel takes no props — this test simply confirms it
    // mounts without a hasSelection/status gate, unlike every other panel.
    const { getByText } = render(<MethodologyPanel />)
    expect(getByText('How This Works')).toBeTruthy()
  })
})
```

---

### `src/app/App.tsx` (modify — mount `<MethodologyPanel />`)

**Analog:** same file's existing `<TrendRow />` mount (lines 127-133), inside `<LocationPanel>`'s children.

**Import to add** (alongside the file's other panel imports, not shown in the read range above but follows the same `./ComponentName` pattern as `DeltaPanel`/`TrendRow`):
```typescript
import { MethodologyPanel } from './MethodologyPanel'
```

**Exact insertion** — after `<TrendRow />` closes (line 133), still inside `<LocationPanel>` (before its closing tag, line 134):
```typescript
        <TrendRow
          hasSelection={hasSelection}
          currentStatus={current.status}
          baselineStatus={baseline.status}
          days={trendDays}
          units={current.units}
        />
        <MethodologyPanel />
      </LocationPanel>
```
No props threaded — `MethodologyPanel` takes none (PD-11: always visible, static copy). `LocationPanel`'s `{children}` slot already renders unconditionally in every state, so no new gating logic is needed in `LocationPanel.tsx` itself.

## Shared Patterns

### `PanelShell` + `PanelHeadline` composition
**Source:** `src/app/PanelShell.tsx` (lines 25-44), `src/app/PanelHeadline.tsx` (lines 11-17)
**Apply to:** `MethodologyPanel.tsx` (new panel wrapper)
```typescript
// PanelShell base classes (verbatim):
'flex flex-col gap-sm bg-glass-surface border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg px-md py-md'
// PanelHeadline exact class string (copy onto <summary>, do not nest the <PanelHeadline> component itself):
'm-0 text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]'
```

### No-raw-HTML-sink invariant (T-01-02/T-02-07/T-06-05)
**Source:** codebase-wide convention, visible in every panel (`DeltaPanel.tsx` lines 83-103, `InfoTooltip.tsx` comment block lines 6-9)
**Apply to:** the new percentile `<p>{percentileLabel(anomaly.percentile)}</p>` in `DeltaPanel.tsx` and every static copy block in `MethodologyPanel.tsx` — all dynamic/static text renders as ordinary JSX text nodes, never `dangerouslySetInnerHTML`.

### Vitest + Testing Library test file convention
**Source:** `src/app/DeltaPanel.test.tsx` lines 1-8
**Apply to:** `MethodologyPanel.test.tsx`
```typescript
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
// ...component import
afterEach(cleanup)  // this project has no global RTL cleanup config — scope locally per test file
```

### Pure math/copy split
**Source:** `src/anomaly/anomaly.ts` — `classifyVerdict`/`verdictLabel` (lines 52-63), `computeAnomaly` (lines 26-35)
**Apply to:** `computePercentileRank`/`percentileLabel` — same file, same pairing discipline (one function computes, a separate function formats copy), independently unit-testable without React.

### `motion-safe:` reduced-motion gating
**Source:** `DeltaPanel.tsx` line 82 (`motion-safe:transition-colors motion-safe:duration-300`)
**Apply to:** `MethodologyPanel.tsx`'s chevron rotation (`motion-safe:transition-transform motion-safe:duration-200`) — same Tailwind variant, no JS media-query hook.

## No Analog Found

None — all 7 files have a direct or near-direct analog already in the codebase. This phase introduces no new architectural pattern (confirmed by RESEARCH.md: "no new library, no new architectural pattern, no external API change").

## Metadata

**Analog search scope:** `src/anomaly/`, `src/app/` (full directory, both directly read this session)
**Files scanned:** `anomaly.ts`, `anomaly.test.ts`, `types.ts`, `DeltaPanel.tsx`, `DeltaPanel.test.tsx`, `PanelShell.tsx`, `PanelHeadline.tsx`, `InfoTooltip.tsx`, `App.tsx` (lines 95-138)
**Pattern extraction date:** 2026-07-22
