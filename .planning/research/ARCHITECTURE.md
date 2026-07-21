# Architecture Research

**Domain:** v1.2 integration architecture — restructuring an existing React SPA's resolved view into four headlined panels + methodology disclosure + per-day split-violin trend chart
**Researched:** 2026-07-21
**Confidence:** HIGH (based on direct inspection of `src/`, not general domain conventions)

## Current Architecture (as-built, verified against src/)

### Component Tree

```
App.tsx
 ├─ MapView                                  (unchanged by v1.2)
 └─ LocationPanel  (<aside>, owns --anomaly-color CSS var + isNight wash)
     └─ children stack (flex flex-col gap-md):
         ├─ LocationDisplay   (4-branch: no-selection / loading / resolved-name / resolved-coords-fallback)
         ├─ AnomalyCard       (4-branch: no-selection / loading / error / resolved)
         │     resolved branch renders, TOP-TO-BOTTOM, THREE conceptually
         │     distinct things in one card:
         │       1. current temp (text-display) + "i" data-quality info button
         │       2. Δ delta hero (text-display*1.7, --anomaly-color, motion-safe transition)
         │       3. verdict label + z-score pill
         └─ TrendRow
               ├─ "Last 7 Days" eyebrow headline   ← the ONE existing headline pattern in the app
               ├─ TrendYAxisColumn (shared Y axis, rendered once)
               ├─ TrendDayChart × 7 (each: label + Recharts ComposedChart;
               │     dot-strip Scatter (30yr samples, jittered x) +
               │     mean ReferenceLine + diamond actual-value Scatter)
               └─ TrendLegend (3 static swatches: dot / line / diamond)
```

### Data Flow (as-built)

```
useSelectedLocation(lat,lng) ─┬─→ useReverseGeocode(lat,lng)      → LocationDisplay
                               ├─→ useCurrentWeather(lat,lng)      → tempC, recentDaily (7-day forecast-API series)
                               └─→ useHistoricalBaseline(lat,lng,  → daily: DailySeries { time[], values[] }
                                     'temperature_2m_mean')             (FULL 30-complete-year archive series,
                                                                          every element individually dated)

App.tsx combines both resolved hooks (D-09 gate) →
  computeAnomalyForToday(baseline.daily, current.localDate, current.tempC) → anomaly {delta, zScore, verdictTier}
  computeTrendDay(baseline.daily, dateStr, actualTemp) × 7                 → TrendDayResult[]

Both computeAnomalyForToday and computeTrendDay funnel through the SAME
filterDayOfYearWindow(daily, month, day, startYear, endYear, halfWidthDays=5)
which FLATTENS matching dates across ALL requested years into one
`number[]` — per-sample year/date is discarded at this step.
```

**Critical fact for this milestone:** `useHistoricalBaseline`'s `DailySeries` already carries the full-resolution archive (`time: string[]` with real `YYYY-MM-DD` dates, one entry per day across all ~30 years) — nothing about the *fetch* layer is a bottleneck. The flattening (and loss of per-sample year) happens one layer up, in `filterDayOfYearWindow`/`computeTrendDay` inside `anomaly.ts`. This distinction drives the violin data-shape answer below.

## New Architecture (v1.2 target)

### Component Tree (target)

```
App.tsx                                      (unchanged: still owns the 3 hooks + the two compute calls)
 └─ LocationPanel  (<aside>, still owns --anomaly-color + isNight; layout reflows to a panel grid)
     ├─ PanelHeadline / PanelShell (NEW, shared)  — generalizes TrendRow's existing
     │     "Last 7 Days" eyebrow-label pattern into one reusable wrapper so all
     │     four panels get consistent headline + glass-surface chrome without
     │     re-copy-pasting the `bg-glass-surface border ... rounded-glass-lg
     │     shadow-glass backdrop-blur-lg` class soup a 5th time.
     │
     ├─ LocationDisplay        (MODIFIED — gains a "Location" eyebrow via PanelShell;
     │                           4-branch logic unchanged)
     │
     ├─ CurrentConditionsCard  (NEW — extracted from AnomalyCard's resolved branch,
     │                           part 1: today's temp + existing "i" info button.
     │                           "Current conditions" eyebrow headline.)
     │
     ├─ DeltaCard              (NEW — extracted from AnomalyCard's resolved branch,
     │                           parts 2+3: Δ hero + verdict + z-score pill.
     │                           "Delta" eyebrow headline. THIS is where the
     │                           hero visual hierarchy must be preserved — see
     │                           "Preserving hero hierarchy" below.)
     │
     ├─ MethodologySection     (NEW — collapsible, collapsed by default;
     │                           native <details>/<summary> preferred over a
     │                           hand-rolled disclosure, see Patterns below)
     │
     └─ TrendRow               (MODIFIED — "Last 7 Days" eyebrow becomes the
           │                     "History" panel's headline, now delegates to
           │                     the shared PanelShell instead of its own
           │                     bespoke <section> markup; internal composition
           │                     otherwise unchanged)
           ├─ TrendYAxisColumn  (UNCHANGED — still one shared Y-axis column;
           │                     yDomain math in trend.ts needs a small update,
           │                     see Data Flow below, but the component itself
           │                     doesn't change)
           ├─ TrendDayChart × 7 (MODIFIED — internals rewritten: dot-strip
           │                     Scatter + single mean ReferenceLine replaced
           │                     by a mirrored split-violin custom shape, built
           │                     from two KDE curves. Props stay similar in
           │                     spirit (day, yDomain, units, isToday,
           │                     showYAxis) but `day.samples` becomes two
           │                     sub-period sample arrays — see Data Flow.)
           └─ TrendLegend       (MODIFIED — swatches/copy must describe the two
                                  violin halves instead of dot/line/diamond;
                                  this is a content decision to flag for
                                  planning, not an architecture decision — see
                                  Open Questions.)

DELETED: AnomalyCard.tsx (split into CurrentConditionsCard + DeltaCard)
```

### New vs Modified — quick reference

| Component | Status | Change |
|---|---|---|
| `App.tsx` | Modified (minor) | Same 3 hooks, same 2 compute calls; renders the new panel set instead of `<AnomalyCard>`; passes MethodologySection static copy |
| `LocationPanel.tsx` | Modified | Layout reflows from a flat stack to a panel grid that preserves Delta-as-hero (see below); still the sole owner of `--anomaly-color`/`isNight` |
| `PanelShell` / `PanelHeadline` | **New** | Shared eyebrow-headline + glass-card chrome, generalized from `TrendRow`'s existing "Last 7 Days" label pattern |
| `InfoAffordance` (button) | **New** (extracted) | Generalizes the existing inline `AnomalyCard` "i" button (title/aria-label tooltip) into one reusable component — now needed on 2-3 panels, not 1 |
| `LocationDisplay.tsx` | Modified (light) | Adopts `PanelShell` headline wrapper; 4-branch logic untouched |
| `AnomalyCard.tsx` | **Deleted** | Logic distributed into `CurrentConditionsCard` + `DeltaCard` |
| `CurrentConditionsCard.tsx` | **New** | Today's temp + info button; reuses the SAME combined current+baseline loading/error gate `AnomalyCard` used (D-09) |
| `DeltaCard.tsx` | **New** | Δ hero + verdict + z-score pill; same D-09 gate; owns the large hero typography |
| `MethodologySection.tsx` | **New** | Collapsible, collapsed by default, static copy — no data dependency |
| `TrendRow.tsx` | Modified (light) | Delegates its outer chrome to `PanelShell`; internal composition (axis column + 7 tiles + legend) unchanged |
| `TrendDayChart.tsx` | Modified (major) | Rendering swapped from dot-strip Scatter to split-violin custom shape |
| `TrendYAxisColumn` | Unchanged | Still a bare shared Y-axis; only the *domain* calculation it's fed changes |
| `TrendLegend.tsx` | Modified (content) | New swatches/copy describing violin halves |
| `src/app/trend.ts` | Modified (major) | Gains violin geometry helpers; `computeSharedYDomain` needs to flatten two sub-period arrays instead of one |
| `src/anomaly/anomaly.ts` | Modified (major) | Gains a recent/prior sample-partitioning function; `computeTrendDay`'s return shape changes |
| `src/anomaly/types.ts` | Modified | `TrendDayResult`'s `usable: true` variant gains `recentSamples`/`priorSamples` (see Data Flow) |
| **New pure module** (e.g. `src/anomaly/kde.ts`) | **New** | Hand-rolled Gaussian KDE — pure math, no component/chart knowledge |

## Panel Restructuring: Preserving Delta-as-Hero Across the Split

The current single `AnomalyCard` gets its hero effect for free from typography alone (the Δ line is `text-display * 1.7`, sitting directly below the current-temp line, inside one card). Splitting into two sibling panels removes that automatic "biggest number in the card" effect — hierarchy now has to be established at the **layout** level, not just the type-scale level.

Recommended approach (a `LocationPanel` layout concern, not a new component behavior):

- Arrange the panel grid asymmetrically, not as four equal tiles:
  - **Top row (compact, "meta" tier):** Location + Current Conditions, side by side, standard panel sizing (same as today's `LocationDisplay`/pre-split card sizing).
  - **Hero row:** Delta panel, full-width (or clearly larger), keeping its existing oversized `text-display*1.7` Δ number, the `--anomaly-color` text color, and the Δ glyph — i.e., carry every existing hero-affirming visual choice (see PROJECT.md Key Decisions: "Hero delta led with a Δ glyph") over unchanged into `DeltaCard`, just now as its own panel rather than a sub-section.
  - **Bottom row:** History (TrendRow), full-width, as today.
- The panel-level `--anomaly-color` wash on the whole `<aside>` backdrop still ties all four panels together as "about this one anomaly," so hero-ness isn't lost even though Delta is now a sibling — the shared backdrop plus the oversized/colored Delta panel together preserve the hierarchy that used to live inside one card.
- Do **not** try to preserve hierarchy by shrinking `CurrentConditionsCard`'s font below its current size — its current-temp number should stay legible; hierarchy comes from **panel size/placement**, not from making the secondary panel illegible.

This is a layout decision for `LocationPanel.tsx` (and possibly a light CSS grid `grid-template-areas`), not a new data flow — no hook or compute-layer change is implied by the panel split itself.

## Methodology Section & Info Affordances: Mount Points

- **Info affordances** (per-panel micro-copy): each lives *inside* the panel it explains — this is already the established pattern (`AnomalyCard`'s existing "i" button lives inside the card it annotates, wired to a native `title`/`aria-label`, no tooltip library). Extend the same inline-button pattern to `CurrentConditionsCard` (data-quality copy, already exists — carries over verbatim) and `DeltaCard` (new copy explaining delta vs. z-score). No new mount point needed — this is purely "more of the same pattern, in more places."
- **Methodology section**: this is page-level, not panel-level — it explains the whole anomaly computation, not one stat. Mount it as the **last child** in `LocationPanel`'s children stack, below `TrendRow`/History — i.e., a closing disclosure at the foot of the panel column, consistent with "collapsed by default" (it shouldn't compete with or push down the four headlined panels on first paint). It has **no data dependency** — static copy only — so it can be built and tested in complete isolation from the hooks/compute layer, and doesn't block or get blocked by anything else in this milestone.
- Prefer a native `<details>`/`<summary>` element for the collapsible behavior over a hand-rolled `useState` toggle + conditional render: it's free accessibility (keyboard toggle, screen-reader state, no JS state to wire), matches the project's existing "hand-roll only what needs custom behavior" ethos, and Tailwind can style `<summary>`'s marker via `[&::-webkit-details-marker]` / `list-none` utilities without a dependency.

## Split-Violin: Where KDE/Geometry Computation Lives

The project already has an established two-layer separation for chart logic, and the violin work should extend it rather than invent a third pattern:

| Layer | Existing example | New responsibility for violins |
|---|---|---|
| **Pure statistics** — `src/anomaly/anomaly.ts` (+ new `src/anomaly/kde.ts`) | `mean`, `sampleStdDev`, `computeAnomaly`, `filterDayOfYearWindow` | A **hand-rolled Gaussian KDE** function (`estimateDensity(samples, evalPoints, bandwidth)` or similar) — pure math, no knowledge of pixels/SVG/Recharts. Also a new **sample-partitioning** step (recent-5yr vs prior-25yr), see below. |
| **Chart geometry** — `src/app/trend.ts` | `jitterX`, `buildHistoricalPoints`, `computeSharedYDomain`, `formatSlotLabel` | A new `buildViolinPaths(recentDensity, priorDensity, yDomain, chartWidth)`-style helper that turns two density curves into mirrored SVG polygon/path coordinates ready for Recharts' custom-shape prop — the exact same "raw stats in, pixel-ready shape out" contract `buildHistoricalPoints` already fulfills for the dot-strip today. |
| **Rendering** — `TrendDayChart.tsx` | `historicalDotShape`, `makeActualShape` (custom Recharts `shape` functions) | A new `violinShape`/`splitViolinShape` custom shape function that receives already-computed path data and renders `<polygon>`/`<path>` — mirrors the existing pattern exactly; **no KDE math or partitioning logic belongs in this file.** |

**Do not add a violin-plot or KDE npm dependency.** This mirrors the project's existing "hand-roll, don't add a dependency" stance (already applied to `mean`/`sampleStdDev` instead of `simple-statistics`, per CLAUDE.md/STACK.md) and Recharts has no built-in violin chart type — a custom SVG shape fed by hand-rolled KDE is the natural, lowest-risk extension of a pattern that's already proven twice in this codebase (`historicalDotShape`, `makeActualShape`).

### Data-Shape Assessment: Is a Change Needed?

**Two different layers, two different answers:**

- **The data-*fetching* layer (`useHistoricalBaseline`, `client.ts`, `DailySeries`) needs NO change.** The archive endpoint already returns, and the hook already exposes, the complete un-flattened 30-year daily series with real per-day date strings in `daily.time` — every sample's year is recoverable today, with zero new fetches. This matches CLAUDE.md's own note that "the Open-Meteo archive endpoint already returns the full daily series used for the 30-year baseline."

- **The pure-math layer (`anomaly.ts`/`types.ts`) DOES need a shape change**, specifically:
  - `filterDayOfYearWindow(daily, month, day, startYear, endYear, halfWidthDays)` itself needs **no signature change** — it already accepts an arbitrary `[startYear, endYear]` sub-range and can be called twice (once for `[endYear-4, endYear]`, once for `[startYear, endYear-5]`) to get the two sub-period sample arrays. This is the cheapest possible path — reuse, don't rewrite, the existing windowing function.
  - `computeTrendDay`'s return shape **does need to change**: today it collapses everything into one flat `samples: number[]`. It needs to instead produce two arrays — e.g. `recentSamples: number[]` (last 5 years) and `priorSamples: number[]` (prior 25 years) — while the existing `hasUsableSampleCount` gate should still evaluate against the *combined* sample count (today's usability threshold shouldn't get stricter just because the display changed).
  - `TrendDayResult` (`types.ts`)'s `usable: true` variant needs the same shape change: `samples: number[]` → `recentSamples: number[]; priorSamples: number[]` (keep `mean`/`actual` as-is for the overall 30-yr reference, or add per-half means if the violin wants a peak/median tick per half — a planning-time call, not an architecture blocker).
  - Downstream, `computeSharedYDomain` (`trend.ts`) currently does `day.usable ? [...day.samples, day.actual, day.mean] : []` — this needs to flatten `[...day.recentSamples, ...day.priorSamples, day.actual, day.mean]` instead. Small, mechanical, but a required ripple.

**Bottom line for planning:** this is a real, contained data-shape change confined entirely to the pure-math layer (`anomaly.ts`, `types.ts`) plus one line in `trend.ts` — it does not require touching `useHistoricalBaseline`, `useCurrentWeather`, or any network/client code, and does not require a second API fetch. The existing 30-year archive fetch is already sufficient; only how it's *sliced* changes.

## Data Flow (target)

```
useHistoricalBaseline(lat,lng,'temperature_2m_mean') → daily: DailySeries  (UNCHANGED)
                                                            │
                              ┌─────────────────────────────┴─────────────────────────────┐
                              │                                                             │
                  computeAnomalyForToday(daily, ...)                          computeTrendDay(daily, dateStr, actual) × 7
                  (UNCHANGED — still one flat 30yr window       (MODIFIED — internally calls filterDayOfYearWindow
                   via filterDayOfYearWindow, for the Delta       TWICE per day: once for [endYear-4,endYear]
                   panel's single z-score/delta)                 → recentSamples, once for [startYear,endYear-5]
                              │                                   → priorSamples; still gates on combined
                              │                                   hasUsableSampleCount)
                              ▼                                             ▼
                       DeltaCard                              TrendDayResult{ recentSamples, priorSamples, mean, actual }
                                                                             │
                                                          estimateDensity(recentSamples) / estimateDensity(priorSamples)
                                                                     (NEW — src/anomaly/kde.ts)
                                                                             │
                                                          buildViolinPaths(recentDensity, priorDensity, yDomain, width)
                                                                     (NEW — src/app/trend.ts)
                                                                             │
                                                                    TrendDayChart's violinShape
                                                                     (MODIFIED — src/app/TrendDayChart.tsx)
```

## Patterns to Follow

### Pattern 1: Shared eyebrow-headline wrapper, generalized from an existing pattern

**What:** `TrendRow` already has exactly the "Last 7 days"-style headline this milestone wants everywhere else (`<p className="...uppercase tracking-[0.05em]">Last 7 Days</p>`). Extract it into a small shared `PanelShell`/`PanelHeadline` component (headline text + glass-card chrome classes) rather than copy-pasting the Tailwind class string into 4 different files.
**When to use:** Any of the four resolved-view panels (Location, Current Conditions, Delta, History).
**Trade-offs:** One more small component to maintain, but removes ~4x duplication of the same `bg-glass-surface border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg` class chain, and guarantees visual consistency automatically instead of by convention.

### Pattern 2: Statistics / geometry / rendering three-layer separation

**What:** Pure stats (`anomaly/`) → pixel-ready geometry (`app/trend.ts`) → SVG rendering (`app/TrendDayChart.tsx`'s custom `shape` functions). Already established for the dot-strip; extend it for violins rather than computing KDE inline inside the component.
**When to use:** Any new chart-geometry work in this codebase.
**Trade-offs:** Slightly more indirection than "just compute it in the component," but keeps the math independently unit-testable with Vitest (matching the project's existing `anomaly.test.ts`/`trend.test.ts` split) without needing a DOM/jsdom render.

### Pattern 3: Shared usability gate stays shared

**What:** `hasUsableSampleCount` is deliberately the ONE place the "enough history?" threshold is defined, used by both today's-anomaly and every trend day (D-10 in the existing codebase). When adding recent/prior sub-sampling, keep evaluating usability against the **combined** sample count, not two independent (and now stricter) per-half thresholds — a day shouldn't newly become "not enough data" just because it was reorganized into two buckets.
**When to use:** `computeTrendDay`'s modified return logic.
**Trade-offs:** None — this is a straightforward continuation of an existing, already-validated decision (D-09/D-10), not a new trade-off.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Computing KDE inside `TrendDayChart.tsx`

**What people do:** Reach for `useMemo` inside the component and compute the density curve right where it's rendered, since "it's just for this chart anyway."
**Why it's wrong:** Breaks the project's own established stats/geometry/render separation, makes the KDE math untestable without mounting a component (the project's existing `trend.test.ts` tests pure functions directly, no render needed), and couples statistical correctness to a file whose current header comment explicitly says "no auto-sizing container... jsdom has no ResizeObserver" — i.e., this file is already carrying rendering-environment constraints and shouldn't also carry math correctness risk.
**Do this instead:** KDE math in `src/anomaly/kde.ts` (or extending `anomaly.ts`), unit-tested with Vitest exactly like `sampleStdDev`/`computeAnomaly` are today.

### Anti-Pattern 2: Re-deriving "enough data" per sub-period

**What people do:** Since the violin needs two sample arrays, gate each one (`recentSamples.length >= threshold`, `priorSamples.length >= threshold`) independently.
**Why it's wrong:** Silently makes more days show "not enough data" than today (5 years' worth of daily samples in a ±5-day window is a much smaller pool than 30 years' worth), regressing a validated requirement (the existing 7-day trend row's usability gate, Validated in Phase 3) without anyone deciding to change that bar.
**Do this instead:** Keep one combined `hasUsableSampleCount(recentSamples.length + priorSamples.length, totalYears)` gate for "is this day usable at all," matching the existing D-09/D-10 shared-gate decision; the KDE per half can still render on the visualization even if one half is thin, since a KDE degrades gracefully with fewer points (wider effective bandwidth) whereas the current dot-strip has no such graceful-degradation path.

### Anti-Pattern 3: Building the four-panel split and the violin rewrite as one big change

**What people do:** Since both touch "the resolved view," combine them into a single phase/PR for efficiency.
**Why it's wrong:** They are architecturally independent subtrees (`LocationDisplay`/`CurrentConditionsCard`/`DeltaCard`/`MethodologySection` vs. `TrendRow`/`TrendDayChart`/`trend.ts`/`anomaly.ts`) with very different risk profiles — the panel split is a layout/extraction exercise with no data-shape change, while the violin work has a genuine data-shape change plus new math plus a rendering rewrite. Bundling them makes it hard to isolate which change caused a regression, and forces reviewers to evaluate a visual redesign and new chart math in the same pass.
**Do this instead:** Sequence them as separate phases (see Build Order below).

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `App.tsx` ↔ new panel components | Props only (same shape as today's `AnomalyCard` props, split across `CurrentConditionsCard`/`DeltaCard`) | `App.tsx`'s hook/compute logic is untouched by the panel split — only which components it renders changes |
| `LocationPanel.tsx` ↔ `--anomaly-color` | CSS custom property, unchanged | Still the single bridge point; `DeltaCard`'s hero text continues to read `var(--anomaly-color)` directly, exactly as `AnomalyCard` does today |
| `anomaly.ts` ↔ `trend.ts` | Pure function calls, return-shape change | `computeTrendDay`'s new return shape (`recentSamples`/`priorSamples`) is the one contract change that ripples into `trend.ts` and `TrendDayChart.tsx` |
| `trend.ts` ↔ `TrendDayChart.tsx` | Pure geometry data → custom Recharts `shape` prop | Same contract shape as today's `buildHistoricalPoints` → `historicalDotShape`, just carrying violin path data instead of jittered dot coordinates |

## Recommended Build Order

Given the dependency analysis above, sequence as three phases:

1. **Panel restructuring** (Location / Current Conditions / Delta / History split + hero-hierarchy layout + info affordances)
   - Lowest technical risk: no data-shape change, no new math, mechanical extraction of `AnomalyCard`'s existing branches into two components plus a new shared headline wrapper.
   - Establishes the shared `PanelShell`/`PanelHeadline`/`InfoAffordance` primitives that the History panel (Phase 3) and Methodology section (Phase 2) both then adopt, so building this first avoids two later phases each inventing their own headline treatment.

2. **Methodology section**
   - Fully independent of Phases 1 and 3 (static copy, no data dependency) — could technically run in parallel with either, but sequencing it right after Phase 1 lets it reuse the collapsible/disclosure visual language established there, and keeps it out of the highest-risk phase (3).

3. **Split-violin trend**
   - Highest technical risk and the only phase with a real data-shape change (`computeTrendDay`/`TrendDayResult`) plus new pure math (KDE) plus a rendering rewrite (`TrendDayChart`). Sequencing it last means it lands on top of an already-settled panel shell (`TrendRow` just adopts `PanelShell` from Phase 1) rather than the panel work and the violin work touching overlapping files in the same window.
   - Internally, build bottom-up: (a) `anomaly/kde.ts` density function + partitioning helper, unit-tested in isolation; (b) `trend.ts`'s `buildViolinPaths` geometry helper, unit-tested against known density inputs; (c) `TrendDayChart.tsx`'s new `violinShape` renderer; (d) `TrendLegend.tsx` content update last, once the actual visual marks it needs to describe exist.

## Open Questions for Planning (not architecture blockers)

- **TrendLegend copy:** PROJECT.md's v1.2 scope decisions note "the existing trend legend copy is reviewer-locked" — but the dot/line/diamond marks the current legend describes are exactly what the split-violin replaces. This is a content/product decision (what the new legend should say), not an architecture question; flag it for the phase that builds the violin so the new copy goes through the same reviewer round-trip the original legend copy did (per Key Decisions history).
- **Per-half reference marks:** whether the violin needs a mean/median tick per half (recent vs. prior) in addition to the existing single 30-yr `mean` field, or whether the overall mean alone remains the reference line — affects `TrendDayResult`'s exact final field list but not the layer placement decided above.

## Sources

- Direct inspection of `.planning/PROJECT.md` (Current Milestone v1.2 requirements, Anomaly methodology, Trend view, Key Decisions) — HIGH confidence, ground truth for this project
- Direct inspection of `src/app/App.tsx`, `LocationPanel.tsx`, `AnomalyCard.tsx`, `LocationDisplay.tsx`, `TrendRow.tsx`, `TrendDayChart.tsx`, `TrendLegend.tsx`, `trend.ts`, `trend.test.ts` — HIGH confidence, current component tree and rendering logic
- Direct inspection of `src/anomaly/anomaly.ts`, `src/anomaly/types.ts` — HIGH confidence, confirms `filterDayOfYearWindow`'s flattening behavior and the exact data-shape gap for recent/prior partitioning
- Direct inspection of `src/weather/useHistoricalBaseline.ts`, `client.ts`, `types.ts` — HIGH confidence, confirms the archive fetch already returns the full-resolution dated series (no fetch-layer change needed)
- `package.json` — HIGH confidence, confirms no existing KDE/violin/statistics dependency, consistent with the project's "hand-roll, don't add a dependency" convention (CLAUDE.md)

---
*Architecture research for: Weather Anomaly Dashboard v1.2 (UI Layout Redesign & Explanatory Legend)*
*Researched: 2026-07-21*
