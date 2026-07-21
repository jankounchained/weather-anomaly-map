# Project Research Summary

**Project:** Weather Anomaly Dashboard — v1.2 (UI Layout Redesign & Explanatory Legend)
**Domain:** Client-rendered, self-explanatory statistical dashboard (interactive map + distribution visualization)
**Researched:** 2026-07-21
**Confidence:** MEDIUM-HIGH

## Executive Summary

The v1.2 milestone adds three interconnected features to make weather anomalies self-explanatory at a glance: (1) **panel restructuring** splitting the combined hero into four headlined sections (Location, Current Conditions, Delta, History) with inline micro-copy explanations; (2) a **collapsible methodology disclosure** (collapsed by default) for users who want to verify the statistical approach; and (3) a **split-violin trend visualization** showing how each day's recent 5-year distribution differs from the prior 25-year distribution to surface a climate-shift signal.

**Critical finding:** All three features require **zero new npm dependencies**. Hand-rolled code (~25–40 lines per feature) using the existing Recharts, native HTML `<details>`/`<summary>`, and Tailwind v4 continues the project's established "hand-roll, don't add a dependency" philosophy.

**Key risks and mitigation:** The panel split must preserve the delta-as-hero visual hierarchy (the Δ number can no longer rely on being the biggest thing in a single card), and the split-violin must gracefully handle sparse per-half samples without inventing false statistical confidence. The mitigation is a **three-phase sequence that isolates risk** — panel restructure (layout/extraction, no data change) → methodology disclosure (static, fully independent) → split-violin (data-shape change + new math, highest risk, built last on a stable foundation).

## Key Findings

### Recommended Stack

No new runtime dependencies. Every v1.2 feature extends a pattern already shipped in this repo.

**Core technologies:**
- **Hand-rolled Gaussian KDE** (`src/anomaly/kde.ts`, ~25 lines, Silverman bandwidth `h = 1.06·σ·n^(-1/5)`) — pure, Vitest-unit-testable, matches the existing hand-rolled stats layer. No `d3`/`simple-statistics` dependency (Recharts 3.x no longer bundles d3-shape, so there's no free ride).
- **Recharts custom `shape` prop** (single-point `<Scatter shape={...}>` drawing a hand-built SVG `<path>` inside the existing `ComposedChart`) — mirrors the shipped `historicalDotShape`/`makeActualShape` pattern in `TrendDayChart.tsx`. Explicitly avoid Recharts `<Customized>` (its 3.0 migration guide confirms it no longer exposes stable internal scale state).
- **Native `<details>`/`<summary>`** for the methodology disclosure — free keyboard/ARIA semantics; Tailwind v4 `group-open:` / `::details-content` utilities style it with no JS and no dependency.
- **Hand-rolled `<InfoTooltip>`** (~30–40 lines, hover + focus, `react-dom` `createPortal` only if a glass panel clips it) for per-panel info affordances. Radix/Headless UI explicitly not warranted at this scope.

### Expected Features

**Must have (table stakes for v1.2):**
- Four headlined panels (Location / Current Conditions / Delta / History) each with a "Last 7 days"-style headline
- Inline info affordances / micro-copy so the current temp, the delta, and the z-score are each self-explanatory in place
- Collapsible methodology section (collapsed by default, single-level, general methodology only)
- Split-violin trend tiles (recent-5yr vs prior-25yr halves) on a shared scale, with a per-half data-sufficiency gate

**Should have (differentiators, add after base validation):**
- Percentile framing ("warmer than 98% of years") layered alongside the existing z-score badge
- An explicit climate-shift callout on the violin when recent vs prior distributions have visibly diverged

**Defer (v2+ / anti-features):**
- Dynamic/location-specific tooltip copy
- A dedicated anomaly color-scale legend — explicitly scoped out this milestone (would compete with the reviewer-locked trend legend)
- Nested/multi-level disclosure (UX guidance warns against 3+ disclosure levels)

### Architecture Approach

The resolved view restructures cleanly: `AnomalyCard.tsx` is retired and its resolved branch splits into a `CurrentConditionsCard` (temp + info) and a `DeltaCard` (Δ hero + verdict + z-score), both keeping the existing D-09 combined-loading gate. A shared `PanelShell`/`PanelHeadline` primitive is extracted once (generalizing TrendRow's existing "Last 7 Days" eyebrow) and reused four times. Hero dominance moves from typography-inside-one-card to an **asymmetric `LocationPanel` grid** (compact Location + Current-Conditions row, full-width Delta hero row, full-width History row). The violin's only data change is isolated to the pure-math layer — `computeTrendDay()` returns `{ recentSamples, priorSamples, ... }` instead of a flat `samples[]`; the fetch layer and 30-year archive call are unchanged.

**Major components:**
1. `PanelShell` / `PanelHeadline` — shared glass-card + eyebrow-headline primitive (new, reused ×4)
2. `CurrentConditionsCard` + `DeltaCard` — the split hero (new, replace `AnomalyCard`)
3. `MethodologySection` + `InfoTooltip` — collapsible explainer + info affordance (new, independent)
4. `kde.ts` (stats) → `trend.ts buildViolinPaths()` (geometry) → `TrendDayChart.tsx violinShape()` (render) — the three-layer split-violin pipeline

### Critical Pitfalls

1. **KDE fabricates confidence below ~15–20 samples per half** — day-of-year-windowed 5yr/25yr samples are thin. Use Silverman bandwidth, enforce a per-half floor, and fall back to a rug/dot strip rather than a smooth curve when sparse.
2. **Unequal sample sizes (5yr vs 25yr) mislead if violin widths aren't normalized** — decide equal-width (shape comparison) vs n-scaled up front; equal-width recommended so the smaller recent sample doesn't visually recede. Document and verify in visual review.
3. **The shared `hasUsableSampleCount` gate only checks the combined 30-year total, not each half** — add an explicit per-half sufficiency check and decide the one-half-passes fallback (render available half vs drop the tile).
4. **The reviewer-locked trend legend describes dot/line/diamond marks the violin replaces** — requires an explicit reviewer round-trip, not a silent rewrite or a silent leave-as-is.
5. **Splitting one hero into four equal-headline panels dilutes delta-as-hero** — use an asymmetric grid where Delta is the sole owner of the oversized type + anomaly color + Δ glyph (concrete criterion: Delta headline/number ≥ ~1.5–2× the Current-conditions scale).

Additional: panels reading as disconnected boxes (use the shared backdrop as connective tissue); disclosure/tooltip keyboard+ARIA gaps (native `<details>`, real `<button>`s); reflow reintroducing blur-over-map or Leaflet's `invalidateSize()` gray-tile bug; any new motion bypassing `prefers-reduced-motion` (CSS `grid-template-rows` trick, `isAnimationActive={false}`).

## Implications for Roadmap

Suggested phase structure: **3 phases.**

### Phase 1: Panel Restructure & Hierarchy
**Rationale:** Lowest technical risk (no data change, no new math); establishes the shared `PanelShell`/`PanelHeadline`/`InfoTooltip` primitives that Phases 2 and 3 both reuse. Mechanical extraction of the existing `AnomalyCard` branches.
**Delivers:** Four headlined panels; Delta preserved as visual hero via asymmetric sizing/placement/color; inline info affordances; `PanelShell`, `CurrentConditionsCard`, `DeltaCard`; the new `LocationPanel` grid.
**Addresses:** Headlined-panels + inline-affordance + delta-hierarchy table stakes.
**Avoids:** Pitfalls 5 (delta hierarchy), 6 (disconnected panels), 10 (Leaflet sizing on reflow).

### Phase 2: Methodology Section & Explainers
**Rationale:** Fully independent (static copy, zero data dependency); reuses Phase 1's headline/glass primitives; keeps the highest-risk work isolated to Phase 3.
**Delivers:** Collapsible `<details>`/`<summary>` methodology disclosure — collapsed by default, general methodology only, mounted at the foot of `LocationPanel`.
**Uses:** Native `<details>`/`<summary>` + Tailwind v4 disclosure utilities (no dependency).
**Implements:** `MethodologySection`; finalizes the per-panel `InfoTooltip` copy.
**Avoids:** Pitfalls 7 (keyboard/ARIA), 8 (burying reading-specific content), 9 (animation vs reduced-motion).

### Phase 3: Split-Violin Trend View
**Rationale:** Highest technical risk — the only phase with a data-shape change (`computeTrendDay`), new KDE math, and a rendering rewrite. Sequenced last so it lands on a stable, already-settled panel/layout foundation. Build bottom-up: KDE math → geometry → rendering → legend.
**Delivers:** Per-day split-violin tiles (recent-5yr vs prior-25yr density halves), shared Y-axis scale preserved, per-half data-sufficiency gate + sparse fallback, updated legend, retained actual-value marker.
**Implements:** `src/anomaly/kde.ts` (unit-tested Gaussian KDE), `trend.ts buildViolinPaths()` geometry helper, `TrendDayChart.tsx violinShape()` custom Recharts shape, `computeTrendDay()` two-sample return shape, per-half gate logic.
**Avoids:** Pitfalls 1 (KDE confidence), 2 (unequal widths), 3 (per-half gate), 4 (orphaned legend), 9 (chart animation).

### Phase Ordering Rationale

- Phase 1 establishes shared primitives (PanelShell, headline style, glass chrome) that Phases 2 and 3 both depend on — building it first avoids duplicated Tailwind class chains across files.
- Phase 2 lands safely on the stable component foundation without touching data or rendering.
- Phase 3 lands on a settled layout and can focus entirely on statistics + chart rendering; bundling all three would make regression isolation impossible.

### Research Flags

Phases likely needing deeper research/spike during planning:
- **Phase 1:** light design spike — a low-fi layout mock confirming the eye lands on Delta first (concrete acceptance: Delta scale ≥ ~1.5–2× Current-conditions).
- **Phase 3:** dedicated statistics/design spike before full implementation — validate Silverman bandwidth on this app's per-half sample sizes; pick the n_min threshold for curve-vs-rug fallback; decide width-normalization (equal-width vs n-scaled); settle per-half gate + one-half-passes behavior; get reviewer sign-off on which locked-legend marks survive as a violin overlay.

Phases with standard patterns (skip research-phase):
- **Phase 2:** native `<details>`/ARIA disclosure is a well-established pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against `package.json`, npm registry, and this repo's own `TrendDayChart.tsx`/Tailwind v4 setup; zero new deps, all hand-rolled patterns match existing conventions |
| Features | MEDIUM-HIGH | Cross-corroborated dashboard-UX / z-score-percentile / split-violin conventions; no single canonical spec |
| Architecture | HIGH | Grounded in direct `src/` inspection; build order and data-shape change fully mapped and non-blocking |
| Pitfalls | MEDIUM | Cross-corroborated web sources (violin docs, WAI-ARIA, Recharts caveats, Leaflet issues); each pitfall has a documented prevention |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Exact per-half KDE sample-size floor (n_min):** research bounds the problem (~15–20) but not the exact number — pin it empirically in the Phase 3 spike against sample locations with known sparse/dense history.
- **Legend copy decision:** which locked marks (mean line, actual-value diamond) survive as a violin overlay — a product decision resolved via an explicit reviewer round-trip in Phase 3.
- **Width-normalization choice:** equal-width vs proportional for the 5yr/25yr halves — mock both, decide in the Phase 3 spike.
- **Per-half gate fallback:** render the one passing half vs drop the whole tile — UX sign-off in Phase 3.
- **Reduced-motion verification:** Phases 2 and 3 add motion (disclosure expand, chart entrance) — verify by toggling the OS reduced-motion setting, not just by reading the CSS.

## Sources

- Direct inspection of this repo: `.planning/PROJECT.md`, `package.json`, and `src/` (`TrendDayChart.tsx`, `TrendRow.tsx`, `AnomalyCard.tsx`, `useHistoricalBaseline`, anomaly/trend math) — HIGH confidence, ground truth for stack + architecture claims
- npm registry — current package versions and Recharts 3.x dependency surface (no d3-shape re-export)
- Recharts 3.0 migration guide (via WebFetch) — `<Customized>`/internal-scale-hook instability
- W3C WAI-ARIA Authoring Practices + MDN — native `<details>`/disclosure accessibility
- Cross-corroborated dataviz sources (R vioplot/CRAN, Python/seaborn, Mode/Domo) — split-violin reading, labeling, and width-normalization conventions
- Full detail in companion files: `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`
