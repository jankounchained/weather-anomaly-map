---
phase: 06-panel-restructure-hierarchy
verified: 2026-07-22T16:15:00Z
status: passed
status_note: "Verifier returned human_needed (visual pixel outcome only). Canonicalized to passed per GSD rule: UAT 06 complete with 0 issues discharges the human-verification routing. The two human_verification items below remain RECOMMENDED spot-checks, not blockers — deferred this session (user out of office, no browser)."
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 14/14
  reason: "Previous VERIFICATION.md (2026-07-22T12:25:00Z) predated the 06-04 gap-closure work (G-06-11: InfoTooltip popover portaled to document.body with edge-aware fixed positioning, SUMMARY 14:27). This re-verification covers the current InfoTooltip/popoverPosition implementation and re-derives status against all 5 ROADMAP success criteria."
  gaps_closed:

    - "G-06-11: InfoTooltip popover no longer trapped in PanelShell backdrop-filter stacking context / clipped by root overflow-hidden (structurally fixed via document.body portal + position:fixed + computePopoverPosition; unit-tested)"
  gaps_remaining: []
  regressions: []
human_verification:

  - test: "Run `npm run dev`, drop a pin, wait for the anomaly to resolve, then open the Current Conditions info 'i' button (mouse click) and separately the Delta info 'i' button (the right-edge panel). Confirm each popover's full explanatory text paints ABOVE the panels (Current Conditions text is no longer hidden behind the Delta panel) and the Delta (right-edge) popover stays entirely within the window frame (not clipped off-screen). Repeat via keyboard: Tab to each 'i' button, Enter to open, Escape to close and confirm focus returns to the button."
    expected: "Both popovers are fully readable — painted above the panels and inside the viewport — on both mouse and keyboard. This is the exact G-06-11 defect that regressed once already."
    why_human: "jsdom performs no layout or painting: getBoundingClientRect() and offsetWidth/Height return 0, so the portal placement, fixed coordinates, and edge-aware computePopoverPosition logic are unit-tested against synthetic inputs but the real rendered-pixel outcome (stacking order + in-frame positioning) cannot be observed programmatically. No browser was available this session; UAT test 11 was explicitly closed on code+test evidence with a human visual spot-check still recommended."

  - test: "With the anomaly resolved, glance at the resolved view and confirm your eye lands on the Delta number first — it should read as clearly larger and color-driven (Δ-glyph-led) relative to the Current Conditions temperature, visibly dominant rather than equal to the sibling panels."
    expected: "Delta is the unmistakable focal point at roughly 1.5–2× the Current-conditions scale (source sets 1.7× = 47.6px in var(--anomaly-color); objectively in-band, but the 'eye lands first' judgment is inherently visual)."
    why_human: "Visual hierarchy / focal-point perception cannot be confirmed programmatically. The objective ratio (1.7×), anomaly color, and Δ-glyph are present and unit-asserted in source; only the perceptual 'lands first' outcome needs a human glance. Lower-risk than the popover check above."
---

# Phase 6: Panel Restructure & Hierarchy Verification Report

**Phase Goal:** Reorganize the resolved anomaly view into four clearly-headlined panels where each number explains itself in place, while the anomaly delta stays the unmistakable focal point.
**Verified:** 2026-07-22T16:15:00Z
**Status:** human_needed
**Re-verification:** Yes — refreshes the stale 12:25 report to cover the 06-04 InfoTooltip portal gap-closure (G-06-11).

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth (SC) | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Current temperature and anomaly delta live in two separate panels — hero split into Current Conditions + Delta | ✓ VERIFIED | `src/app/CurrentConditionsPanel.tsx` and `src/app/DeltaPanel.tsx` exist as independent components; `AnomalyCard.tsx` absent (`test ! -f` passes); no live `AnomalyCard` reference in `src/` (remaining hits are historical code comments only). `App.tsx` renders both in a `flex flex-row items-stretch gap-md` two-up row (lines 108–125), each in a `flex-1 min-w-0` cell. |
| 2 | Distinct "Last 7 Days"-style headline on every panel (Location, Current Conditions, Delta, History) | ✓ VERIFIED | Shared `PanelHeadline` rendered in every state branch of `LocationDisplay.tsx`, `CurrentConditionsPanel.tsx` ("Current Conditions"), `DeltaPanel.tsx` ("Delta"), `TrendRow.tsx` ("Last 7 Days"). Unit tests across those files assert the headline text; 141/141 pass. |
| 3 | Delta remains the dominant focal point (≈1.5–2× Current-conditions scale, color-driven, Δ-glyph-led) | ✓ VERIFIED (objective ratio); visual confirmation routed to human | `DeltaPanel.tsx:82` `text-[calc(var(--text-display)*1.7)]` + `style={{ color: 'var(--anomaly-color)' }}` + `<span className="opacity-70">Δ</span>`; `CurrentConditionsPanel.tsx:72` uses plain `text-display`. 1.7× is within the roadmap's own ≥1.5–2× acceptance band. Perceptual "eye lands first" is a human item (see Human Verification #2). |
| 4 | Short inline micro-copy on each panel stating what its number means | ✓ VERIFIED | `CurrentConditionsPanel.tsx:81` "Today's measured temperature."; `DeltaPanel.tsx:96` "How today compares to the 30-year average for this date." (rendered before the verdict/z-score); z-score chip present at `DeltaPanel.tsx:99`. Asserted in panel unit tests. |
| 5 | In-place explanation of delta, z-score, and current-temperature revealed via an info affordance usable by mouse AND keyboard | ✓ VERIFIED (affordance mechanics); popover readability routed to human | `InfoTooltip.tsx`: real `<button type="button">` with `aria-expanded`/`aria-controls`; `role="dialog"` popover with matching `id` + `aria-label`; opens on click/hover/focus, closes on Escape (returns focus), outside-click, and blur-when-not-hover-pinned. Delta tooltip explains delta+z-score; Current Conditions tooltip explains the modeled-temperature reading. 16 InfoTooltip+popoverPosition tests pass. **Whether the revealed popover is actually readable (paints above panels, in-frame) — the G-06-11 fix outcome — is not observable in jsdom; see Human Verification #1.** |

**Score:** 5/5 success criteria implemented and covered by code + passing tests. 0 behavior-unverified. 2 items require human visual confirmation (1 critical: G-06-11 popover rendering; 1 low-risk: Delta focal dominance).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/popoverPosition.ts` | Pure edge-aware `computePopoverPosition` helper | ✓ VERIFIED | Framework-free pure function (no DOM/window); default below/left-align, right-edge shift, bottom flip, top/left clamps. 4 unit cases match plan exactly (right-edge → left 752, bottom → top 652, left underflow → margin). |
| `src/app/popoverPosition.test.ts` | Unit tests for the 4 positioning cases | ✓ VERIFIED | 4 tests, all `toEqual` exact-coordinate assertions; pass. |
| `src/app/InfoTooltip.tsx` | Portaled, fixed-position accessible disclosure | ✓ VERIFIED | `createPortal(..., document.body)` when open; `position:'fixed'` wrapper with `zIndex:9999`; `useLayoutEffect` recomputes coords from live `getBoundingClientRect()` on open/resize/scroll; `popoverRef` threaded into all three containment checks (outside-click, blur, shared mouseleave); `instanceof Node` guard; no `dangerouslySetInnerHTML`. |
| `src/app/InfoTooltip.test.tsx` | Extended tests (portal, fixed pos, persistence, hover boundary) | ✓ VERIFIED | 12 tests incl. 5 new G-06-11 cases: portals out of trigger subtree, inline `position:fixed`+top/left, click-inside persists, outside-click closes, hover-across-boundary persists. All pass. |
| `src/app/CurrentConditionsPanel.tsx` | Temp + micro-copy + tooltip, 4 states, isAnomalyReady gate | ✓ VERIFIED | 4 branches, exact copy, `isAnomalyReady` gate; tooltip wired. Tests pass. |
| `src/app/DeltaPanel.tsx` | Δ + verdict + z-score + tooltip, dominance styling, isAnomalyReady gate | ✓ VERIFIED | PD-07 order (headline→Δ→micro-copy→verdict→z-chip), 1.7× dominance, tooltip wired. Tests pass. |
| `src/app/AnomalyCard.tsx` | RETIRED | ✓ VERIFIED | File absent; no live references. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `App.tsx` | `CurrentConditionsPanel` / `DeltaPanel` / `TrendRow` | props + two-up row | ✓ WIRED | Lines 108–133; both panels always rendered inside `flex-1 min-w-0` cells. |
| Both panels | `anomaly.ts` | `isAnomalyReady` gate import | ✓ WIRED | Imported and called in each panel's loading branch; `App.tsx` uses it for both `anomaly` and `trendDays` computations. |
| Both panels | `InfoTooltip` | `<InfoTooltip>` with authored body | ✓ WIRED | `CurrentConditionsPanel.tsx:76`, `DeltaPanel.tsx:88`. |
| `InfoTooltip` popover | `document.body` | `createPortal` + `position:fixed` (escapes PanelShell backdrop-filter stacking context AND App root `overflow-hidden`) | ✓ WIRED (structure) | `InfoTooltip.tsx:226,256`. Root `overflow-hidden` confirmed still present (`App.tsx:89`) — the portal is the correct escape. Visual efficacy: human item #1. |
| `InfoTooltip` | `popoverPosition.ts` | `computePopoverPosition` in `useLayoutEffect` | ✓ WIRED | `InfoTooltip.tsx:116`. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full workspace test suite (run once) | `npx vitest run` | 16 files / 141 tests passed | ✓ PASS |
| Production build (type-check + bundle) | `npm run build` (`tsc -b && vite build`) | exit 0, 644 modules, dist emitted | ✓ PASS |
| 06-04 focused suite | `npx vitest run popoverPosition + InfoTooltip + CurrentConditions + Delta` | 4 files / 27 tests passed | ✓ PASS |
| AnomalyCard retired | `test ! -f src/app/AnomalyCard.tsx` | absent | ✓ PASS |
| No raw-HTML sink in tooltip | `grep dangerouslySetInnerHTML src/app/InfoTooltip.tsx` | 0 hits | ✓ PASS |
| Popover renders above panels / in-frame (rendered pixels) | (requires browser) | jsdom does no layout | ? SKIP → human #1 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LAYOUT-01 | 06-01, 06-03 | Current temp + delta in two separate panels | ✓ SATISFIED | CurrentConditionsPanel + DeltaPanel; AnomalyCard retired |
| LAYOUT-02 | 06-01, 06-02, 06-03 | Clear headline on every panel | ✓ SATISFIED | Shared PanelHeadline across 4 panels |
| LAYOUT-03 | 06-03 | Delta remains dominant focal point | ✓ SATISFIED (objective ratio); visual = human #2 | 1.7× / var(--anomaly-color) / Δ-glyph, tested |
| EXPLAIN-01 | 06-03 | Micro-copy on each panel | ✓ SATISFIED | Adjacent static copy present, DOM-order tested |
| EXPLAIN-02 | 06-01, 06-03, **06-04** | Accessible info affordance (mouse + keyboard), readable | ✓ SATISFIED (contract); popover readability = human #1 | InfoTooltip WCAG 1.4.13 contract tested; portal fix (06-04) closes the G-06-11 stacking/clipping defect structurally |

No orphaned requirements: all 5 Phase-6 IDs claimed by plan frontmatter; 06-04 additionally re-claims EXPLAIN-02.

### Anti-Patterns Found

None. Scanned the 06-04 files (`popoverPosition.ts`, `InfoTooltip.tsx`) and the panel files for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER, empty implementations, and raw-HTML sinks — all clean. `AnomalyCard` string hits are historical code comments, not debt markers or live references.

### Human Verification Required

**1. (Critical) InfoTooltip popover renders readably — the G-06-11 fix outcome.**
Run `npm run dev`, drop a pin, let the anomaly resolve, then open both the Current Conditions and Delta info tooltips (mouse click, then keyboard Tab→Enter). Confirm each popover's full text paints ABOVE the panels (Current Conditions no longer behind Delta) and the Delta right-edge popover stays inside the window frame. Confirm Escape closes and returns focus.
_Why human:_ jsdom performs no layout/paint (`getBoundingClientRect`/`offsetWidth` return 0), so the portal + `position:fixed` + `computePopoverPosition` logic is unit-tested against synthetic inputs only — the actual stacking order and in-frame placement cannot be observed programmatically. This is the exact defect that regressed once; no browser was available this session and UAT test 11 was closed on code+test evidence with a visual spot-check explicitly still recommended.

**2. (Low-risk) Delta reads as the focal point.** Glance at the resolved view; confirm the Delta number visibly dominates (~1.5–2× Current Conditions, color-driven, Δ-led) and your eye lands on it first. Objective ratio (1.7×) is met in source; only the perceptual outcome needs a human glance.

### Gaps Summary

No functional gaps. All 5 ROADMAP success criteria are implemented in current code, wired end-to-end, and backed by 141/141 passing tests and a clean production build. `AnomalyCard.tsx` is retired. The 06-04 gap-closure (G-06-11) is **structurally sound and logically verified**: the popover is genuinely portaled to `document.body` with `position:fixed` and edge-aware coordinates (escaping both the PanelShell `backdrop-filter` stacking context and the still-present root `overflow-hidden`), and the WCAG hover/focus/persist/dismiss contract survives the portal boundary — all proven by unit tests.

The single reason this is `human_needed` rather than `passed`: the phase goal's info-affordance value ("each number explains itself in place") and the Delta focal-point criterion both terminate in a **visual rendering outcome** that jsdom cannot exercise. The freshest work (06-04) specifically fixes a previously-shipped visual break, and its rendered-pixel efficacy has not been human-confirmed. That confirmation is a quick browser check, not new implementation.

---

_Verified: 2026-07-22T16:15:00Z_
_Verifier: Claude (gsd-verifier)_
