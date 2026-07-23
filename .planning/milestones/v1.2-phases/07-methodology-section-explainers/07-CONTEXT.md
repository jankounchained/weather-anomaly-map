# Phase 7: Methodology Section & Explainers - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

> **Decision numbering:** Phase-context decisions below are prefixed `PD-`
> (Phase Decision) to avoid colliding with the codebase's own `D-NN` decision
> ids (e.g. `D-09` combined-gate, `D-05` verdict cutoffs) and with Phase 6's
> `PD-NN` set. Phase 7's `PD-` ids start fresh at `PD-01`.
>
> **Gate note (carried from Phase 6):** the decision-coverage plan gate only
> recognizes `D-NN` ids, so it will again report 0/0 against these `PD-` ids
> (a known false positive — see STATE.md Blockers). The plan-checker verifies
> `PD-` citation coverage independently; do not treat the gate's 0/0 as a
> dropped decision.

<domain>
## Phase Boundary

Give users who want to understand or trust the anomaly two additions, without
cluttering the at-a-glance view:

1. **A collapsible methodology section** (EXPLAIN-03) — collapsed by default,
   single-level flat disclosure, explaining what the tool is for and how the
   anomaly is computed (30-year baseline, ±5-day day-of-year window, mean,
   delta, z-score, percentile).
2. **A plain-language percentile framing** of the score (EXPLAIN-04) —
   e.g. "Warmer than 91% of years for this date" — presented alongside the
   existing z-score in the Delta panel.

**In scope:**
- Compute an **empirical** percentile (share of the ~30-year day-of-year
  baseline window below today's reading) and render it as a plain-language
  line in `DeltaPanel.tsx`, between the verdict and the z-score chip.
- Add a bottom-of-column **Methodology** panel: a collapsed native
  `<details>`/`<summary>` inside a shared `PanelShell`, `<summary>` styled with
  `PanelHeadline`, visible in every state (including before a pin is dropped).
- Static/general explainer copy: "What this shows" + "How it's computed"
  subsections, plus data-source credit, a reanalysis caveat, and a sparse-data
  note.

**Out of scope (carried from REQUIREMENTS.md):**
- Location-specific/dynamic methodology or tooltip copy (copy is static/general).
- Nested/multi-level disclosure (single flat level only).
- A separate onboarding/intro screen (the always-visible methodology serves the
  "what/how/why").
- A color-scale legend; mobile-responsive layout (PLAT-03, deferred).
- Anything in the split-violin (Phase 8) scope.

**Note:** Phase 7 is UI-hinted (`/gsd-ui-phase` may produce a `07-UI-SPEC.md`
that locks final copy, spacing, and the disclosure visual treatment). The
decisions below fix the **strategic/engineering** calls — especially the
percentile math — and the structural shape; a later UI-SPEC may refine exact
wording and visuals within these bounds.

</domain>

<decisions>
## Implementation Decisions

### Percentile Math (EXPLAIN-04)
- **PD-01:** **Empirical rank, not a normal-curve CDF.** The percentile is the
  share of the baseline day-of-year window samples (the same ~330 values —
  ±5-day window × ~30 years — already produced by `computeWindowSamples` /
  `filterDayOfYearWindow`) that fall **below** today's reading. Distribution-free,
  honest on skewed climates, and consistent with the app's existing "show the
  real distribution" ethos. Chosen over Φ(z) which assumes a bell curve and
  overstates confidence at the extremes.
- **PD-02:** **Hazen / midrank tie convention.** Count-below + half of exact
  ties (i.e. `(below + ties/2) / n`), so an exact match doesn't read as 0% or
  100%.
- **PD-03:** **Clamp the displayed integer to 1–99%.** A finite ~30-year sample
  must never claim "warmer/colder than 100% of years"; the top/bottom of range
  reads as the clamped bound (e.g. ">99%" phrasing acceptable, but the stored
  value is clamped).
- **PD-04:** **Suppress the percentile line when variance is ~0 / z is null.**
  Reuse the existing degenerate-variance signal (`zScore === null` from
  `computeAnomaly`) — when the baseline can't support a meaningful percentile,
  render **no** percentile line rather than a misleading number. (This is the
  same null-variance case the z-chip already handles with its "too little
  variance to compute" copy.)
- **PD-05:** Implement as a **pure helper in `src/anomaly/anomaly.ts`**
  (hand-rolled, no stats dependency — CLAUDE.md), unit-tested with Vitest,
  matching the existing `computeAnomaly` / `hasUsableSampleCount` style. It
  should reuse the already-computed window samples so today's percentile and
  today's z-score/delta can never drift apart on which samples they use
  (mirrors the `computeWindowSamples` "one shared definition" discipline).

### Percentile Display (EXPLAIN-04)
- **PD-06:** **Plain-language line between the verdict and the z-chip.** Delta
  panel populated order becomes: Δ number → micro-copy → verdict → **percentile
  line** → z-score chip. The percentile leads as the lay-friendly framing; the
  `z 1.3` chip stays below as the precise technical footnote.
- **PD-07:** **Flip warmer/colder at the median.** Above median →
  "Warmer than {p}% of years for this date"; below median →
  "Colder than {100−p}% of years for this date"; right around the middle →
  "Around the middle for this date" (exact copy TBD, may be refined by UI-SPEC).
  Phrase toward the majority side so a cold day never reads "warmer than 8%".
- **PD-08:** Percentile renders as an **ordinary JSX text node** only — never
  through a raw-HTML sink (preserve the T-01-02 / T-02-07 / T-06-05 security
  invariant across the new copy).

### Methodology Placement (EXPLAIN-03)
- **PD-09:** **Own full-width `PanelShell` at the very bottom of the column,**
  after `TrendRow` (History). Same glass-card system as the four Phase 6 panels
  — "last, below the fold" keeps it out of the at-a-glance view.
- **PD-10:** **Native `<details>`/`<summary>`, collapsed by default,
  single-level flat disclosure.** `<summary>` styled with `PanelHeadline`
  (e.g. "How this works" / "Methodology") plus a disclosure chevron. Expand
  animation (if any) MUST respect `prefers-reduced-motion` — verify by toggling
  the OS setting, not just reading CSS (ROADMAP research flag).
- **PD-11:** **Always visible, in every state** (idle/empty/loading/error/
  resolved) — it does not gate on `hasSelection` or on the anomaly resolving.
  Its static copy covers "what this tool is for," which is why REQUIREMENTS
  dropped the separate intro screen; a first-time visitor can expand it before
  clicking the map.

### Methodology Content (EXPLAIN-03)
- **PD-12:** **Two labeled, flat subsections.** "What this shows" (short
  purpose paragraph) + "How it's computed" (plain-language pipeline: 30-year
  Open-Meteo baseline → ±5 days around today's date → mean → today vs that
  average → Δ°C & z-score → percentile = rank among those years). A few short
  sentences / bullets each; no nesting.
- **PD-13:** **Include all three trust/limitation notes:**
  - **Data-source credit** — name Open-Meteo (current + archive/ERA5).
  - **Reanalysis caveat** — the baseline is modeled/reanalysis data, not a
    single weather station, which is *why* the delta is shown in whole degrees
    (ties back to `formatDelta`'s rounding, Pitfall 4).
  - **Sparse-data note** — some remote spots (oceans, deserts) lack enough
    history, so the anomaly and percentile may be unavailable there (mirrors
    the existing "couldn't compute" panel states).

### Claude's Discretion
- **Exact copy wording** for the methodology body, the percentile sentence, and
  the "around the middle" case — may be finalized by a `07-UI-SPEC.md`. Lock
  only the structure/behavior above.
- **New component vs. inline** — whether the methodology panel is a new
  `MethodologyPanel.tsx` (lean toward this — one-component-per-file, flat
  `src/app/` convention) or composed inline in `App.tsx`. Not product-visible.
- **Chevron / disclosure affordance styling** and whether the percentile line
  reuses a chip vs. plain text — within the UI-SPEC's / Phase 6 primitive
  system.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Explainers (EXPLAIN-03, EXPLAIN-04) + §Out of
  Scope — this phase's requirements and the static-copy / single-level-disclosure
  / no-intro-screen boundaries.
- `.planning/ROADMAP.md` §"Phase 7: Methodology Section & Explainers" — goal,
  success criteria, and the research flag (skip research; native `<details>`;
  verify `prefers-reduced-motion` by toggling the OS setting).

### Design contract & primitives (reused from Phase 6 — read first)
- `.planning/phases/06-panel-restructure-hierarchy/06-UI-SPEC.md` — **APPROVED**
  Phase 6 design contract. Defines the `PanelShell` / `PanelHeadline` /
  `InfoTooltip` primitive responsibilities, the color/typography/spacing system,
  and the Delta panel's internal order that PD-06 extends. Do not contradict it.
- `.planning/phases/06-panel-restructure-hierarchy/06-CONTEXT.md` — Phase 6
  decisions (esp. PD-07 Delta panel order, PD-08 primitive migration) that this
  phase builds on.

### Existing code (touch points — see Code Context)
- `src/anomaly/anomaly.ts` · `src/anomaly/types.ts` · `src/app/DeltaPanel.tsx` ·
  `src/app/LocationPanel.tsx` · `src/app/App.tsx` · `src/app/PanelShell.tsx` ·
  `src/app/PanelHeadline.tsx` · `src/index.css`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/anomaly/anomaly.ts`** — the percentile helper (PD-01/05) plugs in here.
  `computeWindowSamples(daily, dateStr)` already returns the exact
  `{ samples, totalYears }` the percentile needs; `computeAnomalyForToday`
  already calls it. Add an empirical-percentile function that takes the same
  samples + today's temp, and fold its result into `AnomalyForToday` (extend the
  interface) or compute it beside the anomaly — so the Delta panel gets it via
  the same `anomaly` prop it already receives.
- **`src/app/DeltaPanel.tsx`** — the percentile line (PD-06) inserts into the
  populated branch between the verdict `<p>` (line 98) and the z-score chip
  `<p>` (lines 99–103). The panel already receives `anomaly: AnomalyForToday |
  null` and self-gates via `isAnomalyReady`.
- **`src/app/PanelShell.tsx` + `PanelHeadline.tsx`** — the Methodology panel
  (PD-09/10) composes these verbatim: `PanelShell` wraps the `<details>`,
  `<summary>` carries `PanelHeadline` styling. `PanelShell` already forwards
  `id`/`role`/`aria-label` (06-01) if needed for the disclosure.
- **`src/app/LocationPanel.tsx`** — its `<div className="flex flex-col gap-md">`
  children slot (line 37) is where the Methodology panel appends, after
  `TrendRow`. Children render in **every** state, so PD-11 "always visible"
  needs no new gating.
- **`src/anomaly/anomaly.ts` `formatDelta`** — the whole-degree rounding the
  reanalysis caveat (PD-13) explains; reference it, don't restate the precision.

### Established Patterns
- One-component-per-file, flat in `src/app/`; pure hand-rolled math helpers in
  `src/anomaly/`, unit-tested with Vitest (no stats dependency — CLAUDE.md).
- Sequential early-return state branching in panels (Empty → Loading → Error →
  Populated); the Delta panel's populated branch is the only one touched.
- All dynamic text rendered as JSX text nodes only — no raw-HTML sink
  (T-01-02 / T-02-07 security invariant); preserve for the new percentile +
  methodology copy (PD-08).
- Combined-gate discipline: the percentile is a property of the resolved
  anomaly, so it rides the existing `isAnomalyReady` gate — it never appears
  before the anomaly resolves. The **methodology** panel is the deliberate
  exception (PD-11): static copy, always shown.
- Motion gated behind `prefers-reduced-motion` (PERF-02); the disclosure
  animation must follow this (PD-10).

### Integration Points
- `App.tsx` computes `anomaly` (line 50) and passes it to `DeltaPanel`; if the
  percentile is folded into `AnomalyForToday`, no new prop threading is needed.
- The new Methodology panel mounts inside `LocationPanel`'s children, after
  `TrendRow` (App.tsx lines 127–133) — a sibling of the existing panels.

</code_context>

<specifics>
## Specific Ideas

- **Percentile example framing (locked behavior, copy TBD):**
  - hot day → "Warmer than 91% of years for this date"
  - cold day → "Colder than 88% of years for this date"
  - median → "Around the middle for this date"
- **Delta panel populated order (extends Phase 6 PD-07):**
  Δ number → micro-copy → verdict → **percentile line** → z-score chip.
- **Methodology layout sketch:**
  Location → [Current | Delta] → History/Last-7-days → ▸ "How this works"
  (collapsed panel, bottom of column, always present).
- **Visual system:** no new design tokens, no shadcn, no icon library — extend
  the existing hand-rolled glass/atmospheric system and Phase 6 primitives.

</specifics>

<deferred>
## Deferred Ideas

- **Show both percentile framings (empirical + normal-CDF) side by side** —
  raised as a "blend later" option during discussion; not needed for v1.2.
  Empirical is the sole framing this phase. Revisit only if a later phase wants
  a dual view.

*(No scope-creep ideas surfaced beyond the above; discussion stayed within the
EXPLAIN-03 / EXPLAIN-04 boundary.)*

</deferred>

---

*Phase: 7-methodology-section-explainers*
*Context gathered: 2026-07-22*
