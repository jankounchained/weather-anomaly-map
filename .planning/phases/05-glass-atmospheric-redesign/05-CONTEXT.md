# Phase 5: Glass / Atmospheric Redesign - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

On the stable Tailwind v4 base (delivered by Phase 4), layer a cohesive glassy/atmospheric design language over the existing app **without any feature or behavior change**:

- a condition/anomaly-driven CSS gradient **backdrop** (DESIGN-02),
- **translucent depth surfaces** for the anomaly card, location panel, and trend area (DESIGN-03),
- a **strengthened anomaly hero** (delta as the focal point) that also fixes the bare zero-delta case (DESIGN-04, DESIGN-06),
- a **re-themed recharts trend** matching the new palette (DESIGN-05),
- all within the **disciplined-glass performance policy**: real `backdrop-blur` only on static backdrops, faux-frosted translucency over the live map, all motion behind `prefers-reduced-motion`, no JS/canvas animation loops (PERF-01, PERF-02).

**Requirements:** DESIGN-01..06, PERF-01, PERF-02.

**Design contract note:** This phase is flagged `UI hint: yes` in ROADMAP.md — a formal **UI-SPEC** (`/gsd-ui-phase 5`) is produced *before* build. This discussion locks **founder-level direction**; the UI-SPEC turns that direction into the pixel-level contract. Several decisions below are deliberately handed to the UI-SPEC as "discretion within a constraint" rather than pinned here.

**Explicitly out of scope:** any feature/behavior change; new data fetches (no new Open-Meteo calls); changing the trend's shared-Y-axis layout or the reviewer-exact legend copy locked in Phase 3; JS/canvas animation.

</domain>

<decisions>
## Implementation Decisions

### Backdrop signal (DESIGN-02)
- **D-01:** The gradient backdrop is **anomaly-driven hue + a day/night atmosphere layer**. Anomaly magnitude sets the temperature of the color (cool for cold-anomaly, warm for hot-anomaly, neutral near normal); a separate day/night luminosity layer adds atmosphere.
- **D-02:** The anomaly→color mapping is **continuous by z-score/delta** (smooth interpolation across the magnitude), NOT discrete verdict-tier buckets. Consequence for research/planning: this needs a **defined set of anchor colors** (e.g. coldest → near-normal → hottest) and a **pure, testable mapping function** (magnitude → color), so the many intermediate states are reproducible and unit-testable rather than hand-eyeballed. Keep the mapping a pure function (mirrors the existing `anomaly.ts` pure-function-then-unit-test pattern).
- **D-03:** The day/night atmosphere layer keys off the **pinned location's local time**, not the viewer's browser clock — correct for the "check somewhere before travel" use case (a night pin should look like night). Open-Meteo already returns the pin's local date/time (`current.localDate`), so no new fetch is required; confirm the local-time signal is available from existing hook data.

### Glass & layout (DESIGN-03, PERF-01)
- **D-04:** Glass **intensity is "subtle & refined"** — gentle translucency, soft depth, light borders/shadows; premium and understated. The anomaly hero number and the trend chart must stay unmistakably legible over any glass. Glass is a supporting texture, not the star.
- **D-05:** The exact **composition** — docked translucent panel over a static backdrop vs. a frosted panel floating over the live map vs. a hybrid — is **handed to the UI-SPEC**, with **PERF-01 as the hard, non-negotiable constraint**. See Claude's Discretion for the recommended default.

### Anomaly hero (DESIGN-04, DESIGN-06)
- **D-06:** The delta hero is **color-coded to the backdrop palette** — the big delta number takes a warm/cool color consistent with the anomaly-driven backdrop (hot = warm, cold = cool), so hero and mood reinforce each other as one system. **Legibility/contrast over glass is a hard requirement** — if a palette color can't hold contrast on the glass surface, adjust the treatment (the number must stay readable). Preserve the locked hierarchy: **delta is the hero, z-score stays a secondary badge** (Phase 2 decision — strengthen it, don't disturb it).
- **D-07:** The **zero-delta case** reads as **"right on the 30-year average" with a framed 0** (e.g. `0.0°C — right on the 30-year average`), carried by the verdict copy so the number is **never a bare, ambiguous "0"**. This closes the known v1.0 UX gap (PROJECT.md "Known deferred UX gap"). The founder chose the exact/true-zero framing option; the intent to honor is "never a bare ambiguous number" — planning may reasonably extend the same worded framing across the near-normal band if that reads better, but the requirement anchors on the zero case.

### Chart re-theme (DESIGN-05)
- **D-08:** Re-theme is **recolor to the new palette + light finish polish** — swap the `--color-chart-*` token *values* to the new palette AND make small finish tweaks (dot opacity, marker weight, axis/tick color) so the chart sits well on the glass surface and reads as one system with the redesign. **The Phase-3 layout is locked**: the shared Y-axis column (`TrendYAxisColumn`) and the reviewer-exact `TrendLegend` copy are **not** touched — colors/finish only. Because the legend explains the three marks, any finish change must keep the legend's description true.
- **D-09:** The **actual-value marker's reserved standout hue** (today `--color-chart-actual` = orange `#ea580c`, distinct from accent) is **handed to the UI-SPEC**, with the constraint that the actual-value diamond must **stay clearly distinguishable** from the historical dots and the mean line (Phase-3 encoding intent). See Claude's Discretion.

### Motion (PERF-02)
- **D-10:** Motion is a **one-time entrance transition** — a brief fade/ease when the backdrop or hero updates on a **new pin** — **not** a continuous loop. **No JS/canvas animation loop at any point**, and the transition is **fully disabled under `prefers-reduced-motion`**. This satisfies success criterion #5 (with reduced-motion set, all motion disabled and no animation loop runs).

### Claude's Discretion
- **Composition / where glass lives (D-05):** User said "You decide," holding PERF-01 as the hard constraint. **Recommended default for UI-SPEC/researcher:** keep the info panel **docked** and make it a **translucent glass surface over a static anomaly-gradient backdrop** — because the glass then sits over a STATIC gradient, **real `backdrop-blur` is safe by construction** (PERF-01 satisfied without risk). Anything floating over the *live map* must use **faux-frosted translucency only** (no real `backdrop-blur`) and must be verified not to degrade map pan/zoom. Today's layout is already a docked opaque sidebar beside the map, so this is also the lowest-diff path.
- **Actual-value marker hue (D-09):** User said "You decide." Default: **keep a reserved standout hue** re-picked to fit the new palette (preserves Phase-3 "today's reading pops" intent); folding it into the palette family is acceptable only if the diamond shape alone keeps it clearly distinguishable.
- **Static-vs-subtle backdrop life:** Resolved to a one-time entrance transition (D-10) — no continuous drift.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition & requirements
- `.planning/ROADMAP.md` — Phase 5 goal, the five success criteria (esp. #4 blur-only-on-static-backdrops and #5 reduced-motion/no-animation-loop), and the `UI hint: yes` flag (UI-SPEC precedes build).
- `.planning/REQUIREMENTS.md` — DESIGN-01..06 and PERF-01/PERF-02 (the eight requirements this phase closes), plus the "Rejected" notes (heavy glassmorphism over the live map rejected on perf grounds; JS/canvas weather animation rejected — atmosphere comes from cheap CSS gradients, not animation loops).
- `.planning/PROJECT.md` — v1.0/v1.1 state, stack versions (React 19 + recharts@3.9.2 + react-leaflet), the Key Decisions table (why delta-is-hero and the trend encoding look the way they do), and the "Known deferred UX gap" (bare-0 hero) that DESIGN-06 closes.

### Prior-phase context that constrains this phase
- `.planning/phases/04-tailwind-foundation-migration/04-CONTEXT.md` — Tailwind v4 CSS-first shape: tokens live in an `@theme` block in `src/index.css`; recharts colors are consumed as inline `var(--color-chart-*)` SVG props (so re-theme = change token VALUES, names/consumers untouched); Preflight is applied globally and the Leaflet interaction is already resolved.

### Files this phase will touch
- `src/index.css` — the Tailwind entry: `@theme` tokens (add/adjust palette + new backdrop/glass tokens here), plus any irreducible CSS (keyframe already present). Home for the new anomaly-palette anchor tokens.
- `src/app/App.tsx` — two-column shell (`flex-row`): live map region (left, `flex-auto`) + docked `LocationPanel`. The backdrop and glass composition wire in here.
- `src/app/LocationPanel.tsx` — docked sidebar shell (`bg-secondary`, fixed 760px) — the surface most likely to become translucent glass.
- `src/app/AnomalyCard.tsx` — the hero: delta at `text-[calc(var(--text-display)*1.7)] font-bold`, verdict, z-score chip. Hero color-coding (D-06) and zero-delta framing (D-07) land here.
- `src/app/TrendDayChart.tsx` — recharts tiles + `TrendYAxisColumn`; consumes `var(--color-chart-historical/mean/actual)`, `var(--color-muted)`. Re-theme (D-08) changes token values + light finish; **layout locked**.
- `src/app/TrendLegend.tsx` — consumes `var(--color-chart-*)`; **legend copy locked** (Phase 3, reviewer-exact).
- `src/anomaly/anomaly.ts` / `src/anomaly/types.ts` — `verdictTier`, `formatDelta`, `verdictLabel`; the anomaly→color mapping function (D-02) and zero-delta copy (D-07) build on these.

### Data signals already available (no new fetch)
- `src/weather/useCurrentWeather.ts` / `src/weather/types.ts` — provides `tempC`, `units`, and `localDate` (pinned-location local time for the day/night layer, D-03). Verify the local-time signal is sufficient before adding anything.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@theme` token system** (`src/index.css`): the existing color/spacing/typography scale is the home for the new anomaly-palette anchor tokens and glass/backdrop tokens. Adding tokens here both generates utilities and emits `:root` custom properties that the inline `var(--color-chart-*)` SVG props already read.
- **`verdictTier` + `formatDelta` + `verdictLabel`** (`src/anomaly/`): the anomaly magnitude and sign are already computed and formatted — the continuous color mapping (D-02) and the zero-delta framing (D-07) extend these, they don't recompute anomaly logic.
- **Pure-function-then-unit-test pattern** (`anomaly.ts` + `anomaly.test.ts`, `trend.ts` + `trend.test.ts`): the anomaly→color mapping (D-02) should follow it — a pure `magnitude → color` function with unit tests at anchor points.

### Established Patterns
- **No inline `style={{}}`, no `getComputedStyle`** anywhere (confirmed in Phase 4) — styling stays className/token-driven; recharts colors stay inline `var(--token)` SVG props. Re-theme = change token values, not consumers.
- **Two-column shell, docked opaque sidebar** (`App.tsx` + `LocationPanel.tsx`): the info panel currently sits *beside* the live map (`bg-secondary`, fixed 760px `flex-[0_0_760px]`), NOT over it — so "glass over a static backdrop" (real blur safe) is a natural, low-diff fit; "glass over the live map" would be a new floating layer needing faux-frost (PERF-01).
- **Trend tests query by SVG element type** (`container.querySelector('svg'|'circle'|'rect'|'polygon')`), not by class/color — so recolor/finish changes won't break the suite, but the whole suite + `vite build` must stay green (carried STYLE-04 discipline).
- **Combined loading gate / single-render-branch** components (`AnomalyCard`, `TrendDayChart` early returns): the hero redesign must preserve the exact loading/error/empty branches; only the resolved-state presentation changes.

### Integration Points
- **Backdrop + glass composition** wires in at `App.tsx` (shell) and `LocationPanel.tsx` (the surface), with tokens defined in `src/index.css`.
- **Hero color-coding** connects the anomaly value (App-computed `anomaly.delta` / `zScore` / `verdictTier`) to the AnomalyCard presentation and to the same palette that drives the backdrop — one shared color source.

</code_context>

<specifics>
## Specific Ideas

- "Noticeably sharper, hero-first, design-studio" is the acceptance bar — an intentional uplift, **not pixel-identical** to v1.0 (contrast with Phase 4's "visually equivalent" bar).
- The atmosphere must come from **cheap CSS gradients**, not animation — explicitly reaffirmed by REQUIREMENTS.md's rejected-alternatives (no JS/canvas weather animation; no heavy glassmorphism over the live map).
- The backdrop and the hero delta should read as **one color system** (same anomaly palette driving both), reinforcing the app's core "is today unusual" message.
- Legibility of the hero number and trend chart is a hard line — subtle-and-refined glass must never win over readability.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Backlog items already tracked elsewhere: the split-violin trend plot and coloring historical dots by decade remain v2/backlog per ROADMAP.md and STATE.md, and are NOT part of this re-theme.)

</deferred>

---

*Phase: 5-Glass / Atmospheric Redesign*
*Context gathered: 2026-07-16*
