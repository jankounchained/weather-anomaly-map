# Phase 7: Methodology Section & Explainers - Research

**Researched:** 2026-07-22
**Domain:** Client-side pure-function statistics (empirical percentile) + native HTML disclosure widget (Tailwind v4), inside an existing React 19 SPA
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Percentile Math (EXPLAIN-04)**
- **PD-01:** Empirical rank, not a normal-curve CDF — percentile is the share of the baseline day-of-year window samples (~330 values, same as `computeWindowSamples`/`filterDayOfYearWindow`) that fall below today's reading.
- **PD-02:** Hazen / midrank tie convention — `(below + ties/2) / n`.
- **PD-03:** Clamp the displayed integer to 1–99%.
- **PD-04:** Suppress the percentile line when variance is ~0 / z is null — reuse the existing degenerate-variance signal (`zScore === null` from `computeAnomaly`); render no percentile line.
- **PD-05:** Implement as a pure helper in `src/anomaly/anomaly.ts` (hand-rolled, no stats dependency), unit-tested with Vitest, matching the existing `computeAnomaly`/`hasUsableSampleCount` style; reuse the already-computed window samples.

**Percentile Display (EXPLAIN-04)**
- **PD-06:** Plain-language line between the verdict and the z-chip. Delta panel populated order: Δ number → micro-copy → verdict → percentile line → z-score chip.
- **PD-07:** Flip warmer/colder at the median. Above median → "Warmer than {p}% of years for this date"; below median → "Colder than {100−p}% of years for this date"; near the middle → "Around the middle for this date."
- **PD-08:** Percentile renders as an ordinary JSX text node only — never through a raw-HTML sink (T-01-02/T-02-07/T-06-05).

**Methodology Placement (EXPLAIN-03)**
- **PD-09:** Own full-width `PanelShell` at the very bottom of the column, after `TrendRow` (History).
- **PD-10:** Native `<details>`/`<summary>`, collapsed by default, single-level flat disclosure. `<summary>` styled with `PanelHeadline` plus a disclosure chevron. Expand animation (if any) MUST respect `prefers-reduced-motion` — verify by toggling the OS setting, not just reading CSS.
- **PD-11:** Always visible, in every state (idle/empty/loading/error/resolved) — no gating on `hasSelection` or anomaly resolution.

**Methodology Content (EXPLAIN-03)**
- **PD-12:** Two labeled, flat subsections — "What this shows" + "How it's computed" (30-year baseline → ±5 days → mean → today vs average → Δ°C & z-score → percentile).
- **PD-13:** Include all three trust/limitation notes — data-source credit (Open-Meteo), reanalysis caveat (ties to `formatDelta`'s whole-degree rounding), sparse-data note.

### Claude's Discretion
- Exact copy wording for the methodology body, the percentile sentence, and the "around the middle" case — finalized by `07-UI-SPEC.md` (already APPROVED, locked below).
- New component vs. inline — whether the methodology panel is a new `MethodologyPanel.tsx` (leans toward this — one-component-per-file convention) or composed inline in `App.tsx`. Not product-visible.
- Chevron/disclosure affordance styling and whether the percentile line reuses a chip vs. plain text — within the UI-SPEC's/Phase 6 primitive system (UI-SPEC already resolved: plain text, hand-rolled `▸` glyph).

### Deferred Ideas (OUT OF SCOPE)
- Show both percentile framings (empirical + normal-CDF) side by side — "blend later" option raised during discussion; not needed for v1.2. Empirical is the sole framing this phase.
- Location-specific/dynamic methodology or tooltip copy (copy is static/general) — REQUIREMENTS.md Out of Scope.
- Nested/multi-level disclosure (single flat level only) — REQUIREMENTS.md Out of Scope.
- A separate onboarding/intro screen — REQUIREMENTS.md Out of Scope.
- A color-scale legend; mobile-responsive layout (PLAT-03, deferred) — REQUIREMENTS.md Out of Scope.
- Anything in the split-violin (Phase 8) scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXPLAIN-03 | User can expand a collapsed-by-default methodology section that briefly explains how the anomaly is computed (30-year baseline, day-of-year window, z-score, delta) and what the tool is for. | Pattern 3 (`MethodologyPanel.tsx` composition, exact mount point in `App.tsx`), Pitfall 2/3/5 (summary styling, `group-open:` chevron, jsdom disclosure toggle confirmed working) |
| EXPLAIN-04 | User sees a plain-language percentile framing (e.g. "warmer than 98% of years for this date") presented alongside the z-score. | Pattern 1 (`computePercentileRank`/`percentileLabel` pure helpers, `AnomalyForToday` extension), Pattern 2 (exact `DeltaPanel.tsx` insertion point), Pitfall 1 (Hazen tie-handling is a real case with this data) |
</phase_requirements>

## Summary

This phase is almost entirely de-risked by `07-CONTEXT.md` (13 locked PD-decisions) and the APPROVED `07-UI-SPEC.md` (exact copy, classes, and a resolved 9/5/0/0 state-coverage table). There is no new library, no new architectural pattern, and no external API change. The only genuine planning-relevant gaps were: (1) the precise current shape of `src/anomaly/anomaly.ts`/`types.ts` so a percentile helper and its `AnomalyForToday` extension can be planned as concrete diffs rather than descriptions, (2) the exact `DeltaPanel.tsx` insertion point, (3) the exact `LocationPanel`/`App.tsx` mount point for a new `MethodologyPanel`, and (4) a concrete, verified Tailwind v4 pattern for the `group-open:` chevron rotation the UI-SPEC leaves as "an equivalent `group-open:` Tailwind pattern." All four are now resolved below with real code line references and a confirmed-in-this-project Tailwind v4 mechanism.

Two things worth flagging to the planner: first, jsdom (the project's already-installed 29.1.1, matching `vite.config.ts`'s `environment: 'jsdom'`) **natively toggles `<details>`/`<summary>` on click** — verified in this session — so the Vitest+RTL disclosure tests DeltaPanel/PanelShell already use (`fireEvent.click`, `getByText`) will work unmodified for the new panel, no polyfill needed. Second, the `group-open:` chevron rotation the UI-SPEC sketches requires `className="group"` on the `<details>` element itself (not just the presence of an `open:` variant) — this is the one concrete implementation detail the UI-SPEC leaves ambiguous and is worth a plan task calling it out explicitly.

**Primary recommendation:** Extend `computeAnomalyForToday`'s return shape with a new pure `computePercentileRank`/`percentileLabel` pair in `src/anomaly/anomaly.ts` (mirrors the existing `verdictLabel` pattern exactly), suppress via the already-existing `zScore === null` signal per PD-04, insert the percentile `<p>` between `DeltaPanel.tsx` lines 98 and 99, and add a new `MethodologyPanel.tsx` composed with `PanelShell` + a `<details className="group">`/`<summary>` reusing `PanelHeadline`'s exact class string, mounted as the last child in `App.tsx` after `<TrendRow />` (line 133).

## Architectural Responsibility Map

This is a pure static SPA with no backend (per CLAUDE.md/PROJECT.md) — every capability in this phase lives entirely in the Browser/Client tier. The table below distinguishes the two client-side sub-layers this codebase already separates (pure domain module vs. React composition), since that split is exactly what the planner must preserve.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Empirical percentile computation (rank, Hazen tie handling, 1–99 clamp) | Browser/Client — pure domain module (`src/anomaly/anomaly.ts`) | — | No network/backend involved; must be a hand-rolled pure function per CLAUDE.md, unit-tested with Vitest, sharing `computeWindowSamples`' already-fetched samples (no new fetch) |
| Percentile-to-copy mapping (warmer/colder/median framing) | Browser/Client — pure domain module | — | Same reasoning as `verdictLabel` — a pure lookup/format function, not a rendering concern, so it is independently unit-testable without React |
| Percentile line rendering in Delta panel | Browser/Client — React component (`DeltaPanel.tsx`) | — | Consumes the already-computed `AnomalyForToday.percentile`; no new data flow, rides the existing `isAnomalyReady` gate |
| Methodology disclosure (`<details>`/`<summary>`) | Browser/Client — React component (new `MethodologyPanel.tsx`) + native HTML | — | Native browser widget handles all open/close state and keyboard behavior; React only supplies static JSX children, no `useState` needed |
| `prefers-reduced-motion` chevron gating | Browser/Client — CSS (`motion-safe:` Tailwind variant, browser media query) | — | No JS reduced-motion detection needed (unlike the existing `--anomaly-color` transition in `index.css`, which is also purely CSS-gated) |

## Standard Stack

No new libraries this phase. Everything reuses what Phase 6 already installed and locked.

### Core (reused, unchanged)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.7 (confirmed in `package.json`) | UI framework | Already the project's framework; `MethodologyPanel` is a stateless function component, no new React API surface |
| Tailwind CSS | 4.3.2 (confirmed in `package.json`, via `@tailwindcss/vite`) | Styling | Already the project's only styling mechanism; the `open`/`group-open` variants used here are Tailwind v4 built-ins (verified below), no plugin needed |
| Vitest | ^4.1.10 | Unit tests for the new percentile math + `@testing-library/react` for the new component | Already the project's test runner; `jsdom` 29.1.1 is already the configured `environment` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | No stats dependency (CLAUDE.md "hand-roll, don't add a dependency"); no icon package (chevron is a `▸` glyph, matching the existing Δ-glyph/`i`-character precedent) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<details>`/`<summary>` | A custom `useState`-driven disclosure (like `InfoTooltip`'s popover) | Rejected — `InfoTooltip` needed custom state because it's a floating/portaled popover with hover/focus/dismiss semantics (WCAG 1.4.13). A flat collapsible section has none of those requirements; native `<details>` gives keyboard/ARIA support for free (`06-PATTERNS.md` "No Analog Found" for popovers does not apply here — this is a genuinely simpler, well-trodden pattern) |
| Hand-rolled `group-open:` Tailwind rotation | Raw CSS `details[open] & { transform: rotate(90deg) }` in `index.css` | Either works (UI-SPEC allows both); `group-open:` keeps the whole component self-contained in the `.tsx` file, matching every other hand-rolled Tailwind class in this codebase (no new `index.css` rule needed) — recommended over touching `index.css` |

**Installation:** none — no `npm install` needed this phase.

**Version verification:** `package.json` confirms `tailwindcss@4.3.2`, `react@^19.2.7`, `vitest@^4.1.10`, `jsdom@^29.1.1`, `@testing-library/react@^16.3.2` are already installed; no version bump needed.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new packages — it extends `src/anomaly/anomaly.ts` (pure functions), `src/app/DeltaPanel.tsx`, and adds one new file `src/app/MethodologyPanel.tsx`, all composed from already-installed dependencies and existing primitives (`PanelShell`, `PanelHeadline`). No `npm install` step belongs in this phase's plan.

## Architecture Patterns

### System Architecture Diagram

```
useHistoricalBaseline (already fetched)         useCurrentWeather (already fetched)
        │  daily: {time[], values[]}                    │  tempC, localDate
        │                                                │
        ▼                                                ▼
        └──────────────► computeAnomalyForToday(daily, localDate, tempC) ◄──────────
                                   │  (src/anomaly/anomaly.ts, unchanged entry point)
                                   ▼
                    computeWindowSamples(daily, localDate)
                       { samples, totalYears }  ── ONE shared sample set ──┐
                                   │                                       │
                                   ▼                                       ▼
                       computeAnomaly(tempC, samples)        computePercentileRank(tempC, samples)
                         { delta, zScore }                       (NEW — only called when zScore !== null)
                                   │                                       │
                                   └──────────────┬────────────────────────┘
                                                   ▼
                                   AnomalyForToday { delta, zScore, verdictTier, percentile }
                                                   │
                              ┌────────────────────┴─────────────────────┐
                              ▼                                           ▼
                   DeltaPanel.tsx (populated branch)         percentileLabel(percentile)
                   Δ → micro-copy → verdict →                (NEW pure copy helper, mirrors
                   percentileLabel(anomaly.percentile) →       verdictLabel)
                   z-chip

                                   (independent, always-mounted, no data dependency)
                   App.tsx → LocationPanel children → ... → TrendRow → MethodologyPanel (NEW)
                                                                          <PanelShell>
                                                                            <details className="group">
                                                                              <summary>…chevron…</summary>
                                                                              <div>…static copy…</div>
                                                                            </details>
                                                                          </PanelShell>
```

A reader can trace both paths: (1) the two already-fetched hooks feed `computeAnomalyForToday`, which now also derives `percentile` from the same window samples used for `zScore`, flowing into `DeltaPanel`'s existing render tree with one new line; (2) `MethodologyPanel` has no data dependency at all — it is a sibling leaf mounted unconditionally, independent of the fetch/anomaly pipeline entirely.

### Recommended Project Structure

No new directories. One new file:

```
src/
├── anomaly/
│   ├── anomaly.ts        # extend: computePercentileRank, percentileLabel, AnomalyForToday.percentile
│   ├── anomaly.test.ts   # extend: new describe blocks for the two new pure functions
│   └── types.ts          # unchanged (AnomalyForToday lives in anomaly.ts, not types.ts — see Code Context)
└── app/
    ├── DeltaPanel.tsx           # extend: one new <p> in the populated branch
    ├── DeltaPanel.test.tsx      # extend: percentile-line assertions (present/suppressed/ordering)
    ├── MethodologyPanel.tsx     # NEW
    ├── MethodologyPanel.test.tsx # NEW
    └── App.tsx                  # extend: mount <MethodologyPanel /> after <TrendRow />
```

### Pattern 1: Pure percentile helper mirrors `verdictLabel`'s lookup/format split

**What:** Two pure functions — `computePercentileRank(today, samples): number` (math) and `percentileLabel(percentile: number | null): string | null` (copy) — kept separate exactly as `classifyVerdict`/`verdictLabel` already are in this file. This lets the planner write independent Vitest `describe` blocks for the math (ties, clamp boundaries) and the copy (three phrasing branches + suppression), matching the existing `anomaly.test.ts` structure.

**When to use:** Any time a numeric domain result needs a display string — this codebase's established convention (see `formatDelta`, `verdictLabel`).

**Example (exact current insertion point — after `computeAnomaly`, before `VERDICT_LABEL`, or colocated near `classifyVerdict`/`verdictLabel` for readability):**
```typescript
// Source: pattern extrapolated from this file's own classifyVerdict/verdictLabel split (lines 41-63)

/** PD-01/PD-02/PD-05: empirical (Hazen/midrank) percentile rank of `today`
 * within the SAME window `samples` computeAnomaly used - so today's
 * percentile and today's z-score can never drift apart on which samples
 * they rank against. Callers MUST only invoke this when the caller's own
 * zScore is non-null (PD-04) - a zero-variance/all-tied sample set makes
 * "below + ties/2" degenerate to a meaningless 50, so this function does
 * NOT re-derive its own degeneracy check; it reuses computeAnomaly's
 * existing signal instead (one shared definition, no duplicated guard). */
export function computePercentileRank(today: number, samples: number[]): number {
  const below = samples.filter((s) => s < today).length
  const ties = samples.filter((s) => s === today).length
  const raw = ((below + ties / 2) / samples.length) * 100
  return Math.max(1, Math.min(99, Math.round(raw)))
}

/** PD-07: plain-language framing, symmetric +/-5-point median band per
 * 07-UI-SPEC.md's Copywriting Contract. Returns null (render nothing) when
 * `percentile` itself is null - PD-04 suppression, propagated one level up
 * from computeAnomalyForToday. */
export function percentileLabel(percentile: number | null): string | null {
  if (percentile === null) return null
  if (percentile > 55) return `Warmer than ${percentile}% of years for this date.`
  if (percentile < 45) return `Colder than ${100 - percentile}% of years for this date.`
  return 'Around the middle for this date.'
}
```

And the `AnomalyForToday` extension + `computeAnomalyForToday` wiring:
```typescript
// Source: src/anomaly/anomaly.ts lines 242-269, extended
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

This requires **zero changes** to `App.tsx`'s `anomaly` computation (lines 50-56) or prop threading — `DeltaPanel` already receives the whole `AnomalyForToday` object via its existing `anomaly` prop.

### Pattern 2: `DeltaPanel.tsx` insertion — exact current line anchors

**What:** The populated branch's current order (verbatim from the file read this session, lines 76-105):
1. `<PanelHeadline>Delta</PanelHeadline>` (line 78)
2. Δ number row + `InfoTooltip` (lines 79-94)
3. Micro-copy `<p>` (lines 95-97)
4. Verdict `<p className="m-0 text-heading font-heading">` (line 98)
5. z-score chip `<p className="mt-xs inline-block …">` (lines 99-103)

**Exact insertion (per PD-06 and UI-SPEC Component Inventory):**
```typescript
// Source: src/app/DeltaPanel.tsx, insert between the existing lines 98 and 99
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
Import additions needed at the top of `DeltaPanel.tsx`: `percentileLabel` alongside the existing `formatDelta, isAnomalyReady, verdictLabel` import from `'../anomaly/anomaly'` (line 17-21). `anomaly.percentile !== null` reuses the field already present on the `anomaly` prop's type — no new prop, no new gate.

### Pattern 3: `MethodologyPanel.tsx` — new file, mount point, and `group-open:` chevron

**What:** A new leaf component composed exactly as the UI-SPEC's Component Inventory specifies, using `PanelShell` + a native `<details>`/`<summary>` carrying `PanelHeadline`'s exact class string (not the `PanelHeadline` component itself, since `<summary>` needs additional flex/interaction classes appended — UI-SPEC's exact string: `text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]` + the interaction classes).

**Concrete gotcha resolved this session (Tailwind v4 `group-open:`):** Grepped this project's installed `node_modules/tailwindcss/dist/lib.js` and confirmed Tailwind v4 registers a built-in `open` variant compiling to `&:is([open], :popover-open, :open)` `[VERIFIED: tailwindcss 4.3.2 package source]`. Tailwind v4's `group-*`/`peer-*` composition is generic — any registered variant (including `open`) automatically gets a `group-*` counterpart without extra config `[CITED: tailwindcss.com/blog/tailwindcss-v4]`. This means:
- The `<details>` element itself **must carry `className="group"`** — this is the one concrete detail the UI-SPEC's "an equivalent `group-open:` Tailwind pattern" phrasing leaves implicit. Without `group` on `<details>`, `group-open:rotate-90` on the descendant chevron span will never match.
- The chevron span then uses `group-open:rotate-90` — no custom CSS, no `[open] &` arbitrary selector needed, keeping the whole component self-contained in the `.tsx` file (consistent with every other hand-rolled class in this codebase; no new `index.css` rule required).

**Example:**
```typescript
// Source: composed from 07-UI-SPEC.md "Component Inventory" + "Disclosure visual/interaction spec"
// (exact copy from 07-UI-SPEC.md "Copywriting Contract" — do not paraphrase)
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

**Mount point — exact current line anchor:** `App.tsx`'s `LocationPanel` children (lines 107-134). `TrendRow` closes at line 133; `MethodologyPanel` mounts as the next (and final) sibling immediately before `</LocationPanel>` (line 134):
```typescript
// Source: src/app/App.tsx, insert after line 133 (</TrendRow>), before line 134 (</LocationPanel>)
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
No props needed — `MethodologyPanel` takes none, per PD-11 (always visible, static copy, no `hasSelection`/`isAnomalyReady` gating). `LocationPanel`'s children slot (its own line 39, `{children}`) already renders unconditionally in both the `hasSelection`/empty-state class branches (lines 27-29), so no new gating logic is needed anywhere in `LocationPanel.tsx` itself.

### Anti-Patterns to Avoid
- **Re-deriving a second degenerate-variance check inside `computePercentileRank`:** PD-04 explicitly says reuse the existing `zScore === null` signal. Don't add an internal `stdDev === 0` guard inside the percentile helper itself — that would create a second, potentially-drifting definition of "degenerate baseline" (the same anti-pattern `hasUsableSampleCount`'s doc comment warns against for sample-count floors).
- **Wrapping the percentile `<p>` in a new chip/pill:** UI-SPEC Component Inventory is explicit — "Plain `<p className="m-0 text-body font-body">` — no new wrapper, no chip." Only the z-score line below it is a chip; don't make the percentile line visually compete with it.
- **Adding a raw-HTML sink for the methodology body copy:** PD-08 and the codebase's T-01-02/T-02-07/T-06-05 invariant require ordinary JSX text nodes only. All the copy above is static/authored — never route it through `dangerouslySetInnerHTML` even for convenience formatting (e.g., bolding "30-year").
- **Height-animating the `<details>` open/close:** UI-SPEC explicitly rejects this ("No expand/collapse height animation... disproportionate engineering for a single flat disclosure"). Don't add a `max-height` transition or JS-measured height — the native instant toggle is the locked behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible section open/close state + keyboard support | A `useState` + `onClick`/`onKeyDown` disclosure (like `InfoTooltip`'s popover) | Native `<details>`/`<summary>` | Browser gives Enter/Space toggling, `aria-expanded`-equivalent semantics, and `:is([open])` CSS styling for free — zero JS. `InfoTooltip` needed custom JS because it's a floating/portaled/hover-dismissible popover (WCAG 1.4.13); a flat static disclosure has none of those requirements |
| Percentile/rank statistics | A stats library (`simple-statistics`, `d3-array`'s `rank`, etc.) | Hand-rolled `computePercentileRank` (6 lines: filter-below, filter-ties, Hazen formula, clamp) | CLAUDE.md "Hand-roll, don't add a dependency" — the exact same reasoning that already justified hand-rolling `mean`/`sampleStdDev` in this file applies verbatim to percentile rank |
| Reduced-motion detection | A `useMediaQuery`/`matchMedia` React hook | Tailwind's `motion-safe:` variant (already used 3x in this codebase: `LocationPanel.tsx`, `DeltaPanel.tsx`, `index.css`) | Pure CSS, no JS, no re-render on OS setting change mid-session (which a JS hook would need extra listener code to handle) — and it is the established pattern here |

**Key insight:** every "don't hand-roll" temptation in this phase (a disclosure library, a stats package, a motion-detection hook) already has a precedent-set answer inside this exact codebase — the discipline is to extend the existing pattern, not introduce a new one.

## Common Pitfalls

### Pitfall 1: Exact floating-point ties are a real, not theoretical, case here
**What goes wrong:** A naive `below/total` percentile (no midrank handling) will read today's z=0 typical day as "warmer than 0%" or "100%" depending on strict `<`/`<=` choice, when it should read ~50%.
**Why it happens:** Open-Meteo's `temperature_2m_mean` archive values are decimal (not arbitrary-precision floats from independent sensors) — repeated exact values across different years for the same day-of-year window are plausible, not a contrived edge case. A same-value comparison (`today === s`) will fire more often than intuition suggests for a ~330-sample window of a bounded physical quantity.
**How to avoid:** Use the Hazen/midrank formula from PD-02 exactly as specified: `(below + ties/2) / n`. Test with a synthetic sample set containing an exact match to `today` and confirm the result is `~50` for a matched-median case, not `0`/`100`.
**Warning signs:** A percentile test asserting an exact-tie case returns `0` or `100` instead of a mid-value — this is the bug PD-02 exists to prevent.

### Pitfall 2: `PanelHeadline` component vs. `PanelHeadline`'s class string
**What goes wrong:** Reusing the `<PanelHeadline>` component directly inside `<summary>` seems natural but `PanelHeadline` renders a `<p>` (see `src/app/PanelHeadline.tsx` line 12) — nesting a `<p>` inside a `<summary>` (which itself has an implicit accessible-name/content model that browsers treat specially, and UI-SPEC's `<summary>` needs additional `flex items-center justify-between` classes the `<p>` doesn't have) produces invalid/confusing markup and loses the chevron's `justify-between` layout.
**Why it happens:** "carries `PanelHeadline` styling" (PD-10, UI-SPEC) is easy to misread as "renders the `PanelHeadline` component."
**How to avoid:** Copy `PanelHeadline`'s exact class string onto the `<summary>` element directly (as shown in Pattern 3 above) — UI-SPEC's Typography table explicitly gives the full string precisely because it must be applied to a different element, not through the component.
**Warning signs:** A `<p>` nested inside `<summary>`, or the chevron not right-aligned.

### Pitfall 3: Forgetting `className="group"` on `<details>`
**What goes wrong:** `group-open:rotate-90` on the chevron span silently does nothing — no error, chevron just never rotates.
**Why it happens:** Tailwind's `group-*` variants only activate relative to the nearest ancestor carrying the literal `group` class (or a named `group/name` if scoped) — this is easy to omit since the UI-SPEC's CSS-first phrasing (`details[open] & { ... }`) doesn't mention it, and the "equivalent group-open: Tailwind pattern" note leaves the `group` placement implicit.
**How to avoid:** Put `className="group"` on the `<details>` element itself (verified in this session — see Pattern 3).
**Warning signs:** Visual QA shows the panel expands/collapses correctly but the `▸` glyph stays static.

### Pitfall 4: Verifying `prefers-reduced-motion` — nothing to check but the chevron
**What goes wrong:** Spending time building a height-animation reduced-motion test harness that doesn't apply to this phase.
**Why it happens:** The ROADMAP research flag says "verify the expand animation respects `prefers-reduced-motion` by toggling the OS setting, not just reading the CSS" — but per the locked UI-SPEC there IS no expand/collapse height animation (deliberate simplicity choice). The only motion in this feature is the chevron's `motion-safe:transition-transform duration-200` rotation.
**How to avoid:** The verification task should be scoped narrowly: toggle the OS/browser "reduce motion" setting (e.g. Chrome DevTools Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce", or macOS System Settings → Accessibility → Display → Reduce Motion) and confirm the chevron snaps instantly instead of rotating smoothly — that is the entire scope of this check. Automated Vitest/jsdom cannot emulate `prefers-reduced-motion` media-query changes reliably (jsdom's `matchMedia` support for this feature is inconsistent across versions) — treat this specifically as a manual/`checkpoint:human-verify` step, not an automated test.
**Warning signs:** A plan task that tries to assert `motion-safe:` behavior in a Vitest unit test — Tailwind's `motion-safe:` compiles to a `@media` query wrapper that jsdom's CSSOM does not evaluate at all (jsdom doesn't execute media queries), so any such assertion would be a false-positive no-op, not a real check.

### Pitfall 5 (already resolved, note for confidence): jsdom `<details>` toggle — confirmed working
**What goes wrong:** Assuming jsdom needs a `HTMLDetailsElement` polyfill or that `fireEvent.click` on `<summary>` won't flip `details.open` in tests.
**Why it happens:** Some older jsdom versions had incomplete `<details>` support; this is a legitimate historical concern for RTL-based disclosure tests.
**How to avoid:** Not needed — verified in this session against the project's actual installed `jsdom@29.1.1`: clicking `<summary>` correctly toggles the parent `<details>`'s `open` property with zero extra setup `[VERIFIED: jsdom 29.1.1, this project's installed version]`. Plan the `MethodologyPanel.test.tsx` disclosure test exactly like `InfoTooltip.test.tsx`'s `fireEvent.click` pattern — `fireEvent.click(getByText('How This Works'))` then assert the body copy is present/absent, no mocking required.
**Warning signs:** N/A — this is a confirmed non-issue, listed here only so the planner doesn't budget defensive/polyfill work for it.

## Code Examples

See **Architecture Patterns** above (Patterns 1-3) — all three code examples are the actual diffs to apply, sourced from this session's direct reads of `src/anomaly/anomaly.ts`, `src/app/DeltaPanel.tsx`, `src/app/App.tsx`, `src/app/PanelHeadline.tsx`, and `07-UI-SPEC.md`'s locked Component Inventory / Copywriting Contract.

### Existing Vitest test pattern to extend (percentile math)
```typescript
// Source: src/anomaly/anomaly.test.ts lines 1-54 (existing style — mirror exactly)
describe('computePercentileRank', () => {
  it('ranks a value strictly below all samples near the bottom, clamped to 1 (PD-03)', () => {
    expect(computePercentileRank(0, [10, 11, 12, 13])).toBe(1)
  })
  it('ranks a value strictly above all samples near the top, clamped to 99 (PD-03)', () => {
    expect(computePercentileRank(100, [10, 11, 12, 13])).toBe(99)
  })
  it('applies the Hazen/midrank tie convention for an exact match (PD-02)', () => {
    // today=10 matches exactly one of four samples: below=0, ties=1 -> (0+0.5)/4=12.5% -> round to 13
    expect(computePercentileRank(10, [10, 20, 30, 40])).toBe(13)
  })
  it('reads ~50 for a value at the sample median (no ties)', () => {
    expect(computePercentileRank(25, [10, 20, 30, 40])).toBe(50)
  })
})

describe('percentileLabel', () => {
  it('returns null (suppressed) when percentile is null (PD-04)', () => {
    expect(percentileLabel(null)).toBeNull()
  })
  it('uses warmer framing above the 55 band boundary (PD-07)', () => {
    expect(percentileLabel(56)).toBe('Warmer than 56% of years for this date.')
  })
  it('uses colder framing below the 45 band boundary (PD-07)', () => {
    expect(percentileLabel(44)).toBe('Colder than 56% of years for this date.')
  })
  it('reads "around the middle" at both inclusive band boundaries (45 and 55)', () => {
    expect(percentileLabel(45)).toBe('Around the middle for this date.')
    expect(percentileLabel(55)).toBe('Around the middle for this date.')
  })
})
```

## State of the Art

Not applicable — no framework/library version drift is relevant here. This phase's only "current vs. old approach" axis is Tailwind v4's native `group-*`/`open` variant generality (already the installed version) vs. pre-v4 Tailwind, which required per-variant explicit group config — moot since the project is already on 4.3.2.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `group-open:rotate-90` on a descendant span, with `className="group"` on the ancestor `<details>`, compiles and behaves as expected in this project's exact Tailwind 4.3.2 build (not just generically true of Tailwind v4) | Pattern 3 / Pitfall 3 | Low — the `open` variant's selector was directly grepped from the installed package's compiled output (`[VERIFIED: tailwindcss 4.3.2 package source]`), and `group-*` generic composition is corroborated by official Tailwind v4 blog content (`[CITED]`), but a live `npm run dev` visual check of the chevron rotation is still worth a quick manual pass during implementation, since a full end-to-end compile wasn't executed in this research session (an isolated `compile()` API call hit an unrelated tooling error, not a variant-syntax error) |

**All other claims in this research were verified directly against the repository's own source files this session (code reads) or the installed `package.json`/`node_modules` — no other assumption needs user confirmation before planning.**

## Open Questions

None blocking. One minor implementation-detail choice left to the planner/implementer within already-locked bounds:

1. **Where exactly to place `computePercentileRank`/`percentileLabel` inside `anomaly.ts`**
   - What we know: PD-05 locks it as "a pure helper in `src/anomaly/anomaly.ts`... matching the existing `computeAnomaly`/`hasUsableSampleCount` style."
   - What's unclear: Whether to colocate immediately after `computeAnomaly`/`classifyVerdict`/`verdictLabel` (thematic grouping — recommended, shown in Pattern 1) or near `computeAnomalyForToday` where it's consumed.
   - Recommendation: Colocate with `classifyVerdict`/`verdictLabel` (same "math function + copy function" pairing pattern) — purely a file-organization call, no functional impact, safe for the planner to decide without another round-trip.

## Environment Availability

No new external dependencies this phase (no new packages, no new CLI tools, no new services). All tooling needed is already installed and configured:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `tailwindcss` (`open`/`group-open` variants) | Chevron rotation, `<summary>` styling | Yes | 4.3.2 | — |
| `jsdom` (`<details>`/`<summary>` native toggle) | `MethodologyPanel.test.tsx` disclosure assertions | Yes | 29.1.1 | — |
| `@testing-library/react` (`fireEvent`, `render`) | Same test file | Yes | 16.3.2 | — |
| OS-level "reduce motion" toggle | Manual verification of chevron `motion-safe:` gating (ROADMAP flag) | N/A (manual step, not a package) | — | None needed — this is inherently a manual/`checkpoint:human-verify` step; automated jsdom cannot emulate `prefers-reduced-motion` media-query changes (Pitfall 4) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — the "reduce motion" OS toggle isn't a missing dependency, it's an inherently manual verification step; the planner should add a `checkpoint:human-verify` task for it rather than trying to automate it.

## Security Domain

`security_enforcement` is enabled (`.planning/config.json` `workflow.security_enforcement: true`, ASVS level 1, block on `high`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Stateless SPA, no accounts (PROJECT.md constraint) |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No privileged actions, no auth boundary |
| V5 Input Validation | Yes (narrow) | The percentile is a derived number (`computePercentileRank`'s own `Math.max(1, Math.min(99, Math.round(raw)))` clamp) — no external/user-supplied input reaches this phase's new code paths at all (the samples come from the already-validated `baseline.daily` fetch, `today` from the already-validated current-weather fetch); the clamp itself is the only "input validation"-shaped control and it's already specified by PD-03 |
| V6 Cryptography | No | No crypto surface |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reflected/stored XSS via dynamic text interpolation (percentile number, methodology copy) | Tampering / Information Disclosure | Render exclusively as ordinary JSX text nodes (`{percentileLabel(anomaly.percentile)}`, static string literals for methodology copy) — **never** `dangerouslySetInnerHTML` — continuing the codebase's existing T-01-02/T-02-07/T-06-05 invariant (PD-08 explicitly re-affirms this for the new copy). The percentile number itself is a computed integer (1-99), not string-concatenated into any HTML-producing context, so there is no injection surface even in principle |
| DoM-based data exposure via the methodology panel's static copy | N/A | Not applicable — the methodology copy is 100% static/authored (no location-specific or user-supplied content per REQUIREMENTS.md "Out of Scope: dynamic methodology copy"), so there is no per-user or per-location data to leak through this surface |

No new threat surface is introduced by this phase — it is copy/computation-only, riding entirely on already-established rendering and data-fetching paths.

## Sources

### Primary (HIGH confidence)
- Direct reads this session: `src/anomaly/anomaly.ts`, `src/anomaly/types.ts`, `src/app/DeltaPanel.tsx`, `src/app/DeltaPanel.test.tsx`, `src/app/LocationPanel.tsx`, `src/app/App.tsx`, `src/app/PanelShell.tsx`, `src/app/PanelHeadline.tsx`, `src/app/PanelHeadline.test.tsx`, `src/app/InfoTooltip.tsx`, `src/index.css`, `package.json`, `vite.config.ts`, `.planning/config.json` — exact current code, not paraphrased
- `.planning/phases/07-methodology-section-explainers/07-CONTEXT.md` — locked PD-01..PD-13 decisions (APPROVED, do not re-derive)
- `.planning/phases/07-methodology-section-explainers/07-UI-SPEC.md` — locked copy/classes/state-coverage table (APPROVED, 6/6 dimensions passed)
- `.planning/REQUIREMENTS.md` — EXPLAIN-03/EXPLAIN-04 acceptance criteria and Out-of-Scope boundaries
- `node_modules/tailwindcss/dist/lib.js` (grepped directly, this project's installed 4.3.2) — confirmed `open` variant compiles to `&:is([open], :popover-open, :open)` `[VERIFIED: tailwindcss 4.3.2 package source]`
- Direct `node -e` execution against this project's installed `jsdom@29.1.1` — confirmed `<summary>` click toggles parent `<details>.open` with zero setup `[VERIFIED: jsdom 29.1.1]`

### Secondary (MEDIUM confidence)
- WebSearch, Tailwind CSS v4 official blog (`tailwindcss.com/blog/tailwindcss-v4`) — `group-*`/`peer-*` variant composition is generic across all registered variants including `open`, and a v4.1 `details-content` variant exists (not used here, UI-SPEC already locks a plain div wrapper) `[CITED: tailwindcss.com/blog/tailwindcss-v4]`

### Tertiary (LOW confidence)
- None — this phase required no exploratory/unverified web research given the extent of locked CONTEXT.md/UI-SPEC content and the small, directly-readable codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all versions confirmed via `package.json`
- Architecture: HIGH — every insertion point is a direct code read with exact line anchors, not inferred
- Pitfalls: HIGH — the two most concrete implementation risks (`group` class placement, jsdom `<details>` support) were verified by direct execution/grep in this session, not assumed from training knowledge

**Research date:** 2026-07-22
**Valid until:** Stable for the remainder of this milestone (v1.2) — re-verify only if `tailwindcss`, `jsdom`, or the `src/anomaly/anomaly.ts`/`src/app/DeltaPanel.tsx`/`src/app/App.tsx` files change materially before Phase 7 is planned/executed.
