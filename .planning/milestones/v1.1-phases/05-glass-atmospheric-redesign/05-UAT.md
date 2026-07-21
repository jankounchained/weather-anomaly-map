---
status: complete
phase: 05-glass-atmospheric-redesign
source:
  - 05-01-SUMMARY.md
  - 05-02-SUMMARY.md
  - 05-03-SUMMARY.md
started: 2026-07-17T10:43:38Z
updated: 2026-07-17T10:43:38Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 5
name: Hero hierarchy & cohesive glass system
result: complete — all manual checkpoints done
awaiting: nothing (session complete)

## Tests

### 1. App loads & glass redesign renders
expected: Dev server boots without errors; the redesigned glass UI renders — translucent LocationPanel, crisp (unblurred) map, and a dropped pin loads conditions + trend into glassy cards.
result: pass

### 2. Long place-name wrap in the glass card
expected: With a pin on a location with an unusually long place name, the name wraps to 2-3 lines and stays inside the glass card's padding/radius — not cramped or clipped against the edge.
result: pass

### 3. In-flight neutral gradient & color transition
expected: While a pin's data is still loading (hasSelection true, data in flight), the neutral gradient does NOT read as a false "normal weather" claim; when data resolves, the entrance transition into the anomaly-coded color reads smoothly (no jarring flash/jump).
result: issue
severity: low
note: Neutral in-flight gradient reads correctly (no false-normal claim) and the anomaly color coding is correct. However, the entrance transition into the anomaly-coded color reads a little abrupt — the color-in "jump" is not as smooth as intended. Cosmetic polish gap, not a functional failure.

### 4. Error-branch text contrast on glass
expected: When the AnomalyCard hits its error branch, the red (#dc2626) error copy stays legibly high-contrast against the translucent glass surface — readable, not washed out.
result: pass

### 5. Hero hierarchy & cohesive glass system
expected: The color-coded, bold anomaly delta reads as the unmistakable focal point at a glance, and the recharts trend + panel surfaces read as one cohesive glassy visual system (not mismatched styles).
result: issue
severity: medium
note: Hero hierarchy is clear (delta is the unmistakable focal point) and the glass system reads as unified — both core criteria met. Two distinct gaps surfaced: (a) the bold delta number can be misread as the CURRENT temperature rather than the anomaly delta — a leading delta/sign symbol (e.g. Δ or explicit +/−) would disambiguate; (b) the recharts trend chart is horizontally offset to the right instead of centered within its glass card.

### 6. anomalyColor pure function (anchors, clamping, midpoint lerp)
expected: anomalyColor(zScore) returns exact anchor hex at z=-3/0/null/+3, clamps beyond [-3,3], and lerps midpoints correctly.
result: pass
source: automated

### 7. isDaytime half-open [6,20) boundary
expected: isDaytime(localHour) treats the [6,20) window as half-open at both boundaries.
result: pass
source: automated

### 8. localHourFrom pin-local hour parsing (zero new fetches)
expected: localHourFrom parses pin-local hour from Open-Meteo current.time with no new fetches; localHour is exposed across all lifecycle branches.
result: pass
source: automated

### 9. VERDICT_LABEL.typical copy fix
expected: VERDICT_LABEL.typical reads "Right on the 30-year average" so a zero/near-normal delta never renders a bare ambiguous 0.
result: pass
source: automated

### 10. Glass/anomaly @theme tokens, @property, backdrop classes present + build compiles
expected: New @theme glass/anomaly tokens, @property --anomaly-color, .panel-backdrop/.is-night::before, and --color-chart-historical re-theme are all present; production build compiles.
result: pass
source: automated

### 11. App threads anomaly color + night signal with safe noon default
expected: App computes anomalyColorValue and isNight, threading both to LocationPanel; the ?? 12 noon default prevents a night-wash flash before data resolves.
result: pass
source: automated

### 12. Map region carries no glass/blur class (PERF-01)
expected: The map region (flex-auto div + MapView) has no atmospheric/glass/blur class — PERF-01 satisfied by construction.
result: pass
source: automated

### 13. LocationPanel backdrop + --anomaly-color bridge gated on selection
expected: LocationPanel applies .panel-backdrop + conditional .is-night + motion-safe transition only when hasSelection, bridging --anomaly-color via the single sanctioned inline style; falls back to flat bg-secondary with no inline var before a pin.
result: pass
source: automated

### 14. No JS animation loop; motion is one-time CSS behind motion-safe
expected: No rAF/setInterval/canvas loop in App/LocationPanel/LocationDisplay; motion is a one-time CSS transition behind motion-safe:.
result: pass
source: automated

### 15. All four LocationDisplay branches share the glass card
expected: All four LocationDisplay branch roots (empty, loading, resolved-name, coordinate fallback) render the shared translucent glass card; copy and branch structure unchanged.
result: pass
source: automated

### 16. All four AnomalyCard branches carry hero glass card + color-coded delta
expected: All four AnomalyCard branch roots carry the hero glass card; the resolved hero delta is color-coded via var(--anomaly-color) with a motion-safe transition and unchanged font size; z-score chip and copy untouched.
result: pass
source: automated

### 17. TrendRow root is a translucent glass card (layout unchanged)
expected: TrendRow section root is a translucent glass card; null/empty guard, shared Y-axis layout, 7-tile mapping, and TrendLegend all unchanged.
result: pass
source: automated

### 18. TrendDayChart placeholder restyled to glass (no nested blur)
expected: TrendDayChart "not enough data" placeholder restyled to glass tokens with no nested backdrop-blur; all var(--color-chart-*) SVG call sites and copy unchanged.
result: pass
source: automated

### 19. Zero/near-normal delta renders framed 0, never a bare ambiguous 0
expected: Zero/near-normal delta renders big "0°C" immediately followed by "Right on the 30-year average" — never a bare ambiguous 0.
result: pass
source: automated

## Summary

total: 19
passed: 19
issues: 0
pending: 0
gaps_resolved: 3 (quick task 260721-dju, verified in-app 2026-07-21)
skipped: 0

## Gaps

> **RESOLUTION (2026-07-21, quick task `260721-dju`):** All 3 gaps fixed and re-verified in-app by the user ("all three good"). Commits: `654302b` (Gap 2), `a67654d` (Gap 3), `4f18cfc` (Gap 1). Tests 99/99 + build green.

### Gap 1 (low severity) — Abrupt anomaly-color entrance transition — ✅ RESOLVED (4f18cfc)
- **From:** Test 3
- **Observed:** When a pin's data resolves, the transition from the neutral in-flight gradient into the anomaly-coded color reads a little abrupt — the color-in is not as smooth as the "no jarring flash/jump" intent.
- **Not affected:** In-flight neutral gradient (no false-normal claim) and the final anomaly color coding are both correct.
- **Likely area:** The motion-safe CSS transition on `--anomaly-color` / the LocationPanel backdrop (transition duration/easing, or the value snapping in because `@property --anomaly-color` interpolation isn't applying to the in-flight → resolved swap).
- **Classification:** Cosmetic polish, non-blocking for milestone functionality.

### Gap 2 (medium severity) — Delta can be misread as current temperature — ✅ RESOLVED (654302b)
- **From:** Test 5
- **Observed:** The bold hero number reads as the focal point (good), but with no leading sign/symbol it can be misread as the *current temperature* rather than the *anomaly delta*.
- **Suggested fix:** Add a leading delta indicator — a Δ glyph and/or an explicit `+`/`−` sign in front of the hero number — so it unambiguously reads as "difference from normal." Touches the core value ("interpret how unusual today is at a glance"), so higher priority than the cosmetic gaps.
- **Likely area:** AnomalyCard hero delta render (the resolved branch that formats the delta value).
- **Classification:** Clarity / interpretability — not a crash, but affects the app's core promise.

### Gap 3 (low severity) — Trend chart offset right instead of centered — ✅ RESOLVED (a67654d)
- **From:** Test 5
- **Observed:** The recharts trend chart is horizontally offset to the right within its glass card rather than centered.
- **Likely area:** TrendRow / TrendDayChart layout — shared Y-axis column offset or the chart container's horizontal alignment/margins.
- **Classification:** Cosmetic layout, non-blocking.
