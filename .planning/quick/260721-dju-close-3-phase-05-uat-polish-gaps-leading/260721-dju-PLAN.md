---
phase: quick-260721-dju
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/AnomalyCard.tsx
  - src/app/TrendDayChart.tsx
  - src/app/TrendRow.tsx
  - src/index.css
autonomous: true
requirements: [DESIGN-04, DESIGN-05, DESIGN-01, PERF-02]
must_haves:
  truths:
    - "The resolved AnomalyCard hero reads unambiguously as an anomaly delta (leading Δ), never mistakable for the current temperature — across +, −, and 0 cases."
    - "The 7-tile trend strip and its shared Y-axis read as horizontally centered/balanced within the TrendRow glass card, with no clipped tick labels."
    - "When a pin's data resolves, the panel gradient fades smoothly from the neutral in-flight color into the anomaly-coded color; with prefers-reduced-motion set, the swap is instant with no JS animation."
  artifacts:
    - "src/app/AnomalyCard.tsx — leading Δ indicator on the resolved hero delta"
    - "src/app/TrendDayChart.tsx — hidden per-tile YAxis reserves zero horizontal width"
    - "src/index.css — --anomaly-color transition behind prefers-reduced-motion"
  key_links:
    - "formatDelta stays untouched in src/anomaly/anomaly.ts so its unit tests and TrendDayChart's tooltip format remain green."
    - "@property --anomaly-color registration in src/index.css is what makes the new transition interpolate rather than snap."
    - "TrendYAxisColumn's visible axis width and TrendLegend layout/wording remain byte-unchanged (Phase-3 locked)."
---

<objective>
Close the three Phase-05 glass/atmospheric-redesign UAT polish gaps (05-UAT.md ## Gaps): (1) a leading Δ so the hero delta can't be misread as the current temperature, (2) center the trend chart within its glass card, (3) smooth the anomaly-color entrance transition. All three are atomic, styling-only, no behavior/feature changes, no new dependencies.

Purpose: Sharpen the app's core promise — "tell how unusual today is at a glance" — and finish the glass system's visual polish without touching any locked v1.0/Phase-3 constraint.
Output: Three focused edits across four files; existing Vitest suite (`npm test`) and `npm run build` stay green.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/05-glass-atmospheric-redesign/05-UAT.md

# The three gaps live in these source files:
@src/app/AnomalyCard.tsx
@src/app/TrendRow.tsx
@src/app/TrendDayChart.tsx
@src/index.css

# Do NOT modify (referenced for constraint awareness only):
# - src/anomaly/anomaly.ts (formatDelta is unit-tested AND reused by TrendDayChart's tooltip)
# - src/app/TrendLegend.tsx (Phase-3 locked wording/layout)
# - src/app/LocationPanel.tsx (bridges --anomaly-color; unchanged by these fixes)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add a leading Δ delta indicator to the AnomalyCard hero (Gap 2 / DESIGN-04)</name>
  <files>src/app/AnomalyCard.tsx</files>
  <action>
In the resolved branch of AnomalyCard, the hero delta paragraph (the `<p style={{ color: 'var(--anomaly-color)' }}` element with `text-[calc(var(--text-display)*1.7)] font-bold leading-[1.1]` that renders `{formatDelta(anomaly.delta)}°C`) has no leading indicator, so it can be misread as the current temperature rather than the difference-from-normal. Prepend a leading Δ (Greek capital delta, U+0394) glyph immediately before the formatted delta so it unambiguously reads as an anomaly delta.

Do NOT modify formatDelta in src/anomaly/anomaly.ts — it is unit-tested (src/anomaly/anomaly.test.ts) and reused by TrendDayChart's tooltip; it already emits the explicit sign (`+N` / `−N` / `0`). The Δ is a presentation-only prefix added in this JSX only.

Preserve the v1.0 hierarchy exactly: the delta stays the hero — unchanged font size (`text-[calc(var(--text-display)*1.7)]`), `font-bold`, color via `var(--anomaly-color)`, and the existing `motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out`; the z-score stays the secondary pill (`text-muted bg-secondary` chip) — do not restyle either, and do not touch the current-temperature `<p>` above (`{Math.round(tempC)}{units}`) or the info button.

Zero/near-normal case: formatDelta(0) returns "0", so the hero renders "Δ0°C" — confirm no stray "+"/"−" is introduced onto the zero case; the framed copy "Right on the 30-year average" below remains the disambiguator. The Δ prefix reads correctly for all three cases (Δ+N, Δ−N, Δ0).

Optional polish (executor discretion, same inherited color/size): wrap the Δ in a `<span className="opacity-70">` so it reads as a qualifier without competing with the magnitude; and/or add an `aria-label` on the hero `<p>` naming it as the anomaly delta versus the 30-year average for screen readers.
  </action>
  <verify>
    <automated>grep -c 'Δ' src/app/AnomalyCard.tsx | grep -qv '^0$' && npm test && npm run build</automated>
    <human-check>Drop a pin and let it resolve: the big colored number reads clearly as a difference-from-normal (leading Δ), not the current temperature; the near-normal case shows "Δ0°C" with no misleading + or −.</human-check>
  </verify>
  <done>Resolved hero delta carries a leading Δ across positive/negative/zero deltas; formatDelta untouched; hero font size, weight, color-coding, and the z-score pill preserved; `npm test` and `npm run build` green.</done>
</task>

<task type="auto">
  <name>Task 2: Center the trend chart within its glass card (Gap 3 / DESIGN-05, VIZ-02)</name>
  <files>src/app/TrendDayChart.tsx, src/app/TrendRow.tsx</files>
  <action>
The 7-tile trend strip renders horizontally offset (not centered) within its glass card. Primary cause: each per-tile `<YAxis>` is hidden (`hide={!showYAxis}`, and TrendRow always passes `showYAxis={false}` to tiles) but still passes `width={AXIS_WIDTH}` (40px), so Recharts reserves 40px on the left of every 88px tile and squeezes each tile's plot area into its right ~48px — pushing the historical dot-cloud, the mean ReferenceLine, and the actual diamond right-of-center in every tile.

Primary fix (src/app/TrendDayChart.tsx): make the hidden per-tile axis reserve zero horizontal width. Change the tile's `<YAxis ... width={AXIS_WIDTH} />` to `width={showYAxis ? AXIS_WIDTH : 0}` so each tile's plot area fills the full 88px (CHART_WIDTH) and its marks center within the tile. Leave the shared visible axis in TrendYAxisColumn (its own `width={AXIS_WIDTH}` ComposedChart) completely unchanged. Do not change CHART_WIDTH (88), CHART_HEIGHT (120), the yDomain, the 7-tile mapping, `isAnimationActive={false}`, `ifOverflow="visible"`, or the isToday logic. Vertical scale (yDomain, height, default margins) is unchanged, so tick-label alignment with the shared Y-axis column is preserved; only the horizontal plot area widens.

Secondary safeguard (src/app/TrendRow.tsx) — apply ONLY if, after the primary fix, the [Y-axis column + 7-tile group] still sits visually unbalanced within the card: add `justify-center` to the chart-group flex row (the `<div className="flex flex-row items-start gap-sm">` that wraps the Y-axis column `<div>` and the tile-group `<div>`) so the group centers horizontally. Guard it: if centering would clip the leftmost Y-axis tick labels (group wider than the card content box), leave that row start-aligned and rely on the per-tile fix alone.

Do NOT change the "Last 7 Days" eyebrow's left alignment, the TrendYAxisColumn layout, or the TrendLegend wording/layout — all locked from Phase 3.
  </action>
  <verify>
    <automated>grep -q 'showYAxis ? AXIS_WIDTH : 0' src/app/TrendDayChart.tsx && npm test && npm run build</automated>
    <human-check>The 7-tile trend strip plus its Y-axis read as horizontally centered/balanced within the glass card; each tile's dots/mean line/diamond sit centered within the tile; no leftmost tick labels are clipped; Y-axis alignment and the legend are unchanged.</human-check>
  </verify>
  <done>Hidden per-tile axis reserves no horizontal width; each tile's marks center within its 88px tile; the group reads balanced within the card; TrendYAxisColumn, TrendLegend, and the eyebrow untouched; TrendDayChart.test.tsx (both showYAxis branches) and the full suite pass; `npm run build` green.</done>
</task>

<task type="auto">
  <name>Task 3: Smooth the anomaly-color entrance transition (Gap 1 / PERF-02, DESIGN-01)</name>
  <files>src/index.css</files>
  <action>
The anomaly-color entrance reads abrupt because the panel gradient's driver — the registered `@property --anomaly-color` — is never included in any transition. The aside's Tailwind `motion-safe:transition-colors` transitions `color`/`background-color`, but neither the custom property nor the gradient `background-image`, so `--anomaly-color` snaps from the in-flight neutral (#57534e) to the resolved anomaly hue when data resolves.

Fix: add a transition on the custom property itself to the `.panel-backdrop` rule, gated behind `@media (prefers-reduced-motion: no-preference)`. Add a block such as:

`@media (prefers-reduced-motion: no-preference) { .panel-backdrop { transition: --anomaly-color 400ms ease-out; } }`

Because `--anomaly-color` is already registered via `@property` with `syntax: '<color>'; inherits: true`, the browser will now interpolate it, so the `linear-gradient(...)` / `color-mix(...)` in `.panel-backdrop` (and the inherited hero `color: var(--anomaly-color)`) recompute each frame → a smooth color-in instead of a snap. Keep it subtle: ~350–450ms, ease-out.

This unlayered `.panel-backdrop` rule takes precedence over the Tailwind `transition-colors` utility on the aside (Tailwind utilities live in the `utilities` @layer; unlayered rules win the cascade), so the effective transition becomes the custom-property interpolation — this is intended and requires no change to LocationPanel.tsx.

Constraints: do NOT add any JS/rAF/setInterval/canvas animation loop (PERF-02); do NOT remove or weaken the `prefers-reduced-motion` gate (no motion when reduced-motion is set); do NOT change the anomalyColor anchors, the gradient color stops, the `--color-atmosphere-night-wash` value, or the `.panel-backdrop.is-night::before` wash. Leave LocationPanel.tsx and AnomalyCard.tsx untouched.
  </action>
  <verify>
    <automated>grep -q 'prefers-reduced-motion: no-preference' src/index.css && grep -q 'transition: --anomaly-color' src/index.css && npm run build && npm test</automated>
    <human-check>Drop a pin and let data resolve: the panel gradient fades smoothly from the neutral in-flight color into the anomaly-coded color (no jarring flash/jump). Enable OS "reduce motion": the color swaps instantly with no animation.</human-check>
  </verify>
  <done>`--anomaly-color` interpolates on resolve behind `prefers-reduced-motion: no-preference`; the gradient color-in reads smooth; the reduced-motion path swaps instantly with no JS loop; anchors, gradient stops, and night-wash unchanged; `npm run build` and `npm test` green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new) | All three changes are presentational: a JSX text glyph, a Recharts layout prop, and a CSS transition property. No new input crosses any boundary; no new data flow, network call, or persistence. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-dju-01 | Tampering | npm/pip/cargo installs | low | accept | No package installs and no new dependencies in this quick task — nothing to audit; supply-chain surface unchanged. |
| T-dju-02 | Injection | AnomalyCard hero / trend text | low | accept | The Δ prefix is a static JSX text node and all dynamic text remains ordinary JSX text nodes (no raw-HTML sink), preserving the existing T-02-07 / T-03-02 posture. No new injection surface. |
</threat_model>

<verification>
- `npm test` (vitest run) stays green — the existing suite (incl. anomaly.test.ts formatDelta anchors and TrendDayChart.test.tsx both showYAxis branches) is unchanged; no hex anchor edits.
- `npm run build` (`tsc -b && vite build`) compiles with no type or build errors.
- Grep gates: Δ present in AnomalyCard.tsx; `showYAxis ? AXIS_WIDTH : 0` present in TrendDayChart.tsx; `transition: --anomaly-color` present behind `prefers-reduced-motion: no-preference` in index.css.
- Locked-constraint audit: formatDelta unchanged; TrendYAxisColumn visible-axis width unchanged; TrendLegend wording/layout unchanged; anomalyColor anchors and gradient stops unchanged; no JS animation loop introduced.
</verification>

<success_criteria>
- Hero delta carries a leading Δ that disambiguates it from the current temperature, correct across +, −, and 0 (renders "Δ0°C" for near-normal, no misleading sign).
- Trend chart + Y-axis read horizontally centered/balanced within the glass card, no clipped tick labels, Y-axis + legend untouched.
- Anomaly-color entrance interpolates smoothly on resolve behind prefers-reduced-motion; reduced-motion users get an instant, animation-free swap.
- `npm test` and `npm run build` both green; no new dependencies; no locked v1.0/Phase-3 constraint disturbed.
</success_criteria>

<output>
Create `.planning/quick/260721-dju-close-3-phase-05-uat-polish-gaps-leading/260721-dju-SUMMARY.md` when done.
</output>
