---
status: diagnosed
phase: 06-panel-restructure-hierarchy
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md]
started: 2026-07-22T11:37:17Z
updated: 2026-07-22T11:42:00Z
---

## Current Test

[testing complete — 1 issue diagnosed]

## Tests

### 1. isAnomalyReady combined gate
expected: isAnomalyReady(currentStatus, baselineStatus) exported from src/anomaly/anomaly.ts, returns true only when both statuses are 'resolved'
result: pass
source: automated
coverage_id: 06-01-D1

### 2. PanelShell glass-card
expected: PanelShell renders children in a tokenized glass-card element (div/section/aside via `as`) with optional className append
result: pass
source: automated
coverage_id: 06-01-D2

### 3. PanelHeadline eyebrow
expected: PanelHeadline renders the TrendRow-verbatim eyebrow <p> with the passed headline text
result: pass
source: automated
coverage_id: 06-01-D3

### 4. InfoTooltip accessible disclosure
expected: Accessible button+dialog meeting WCAG 1.4.13 (aria-expanded/aria-controls, role=dialog popover, Escape closes + returns focus, no raw-HTML sink)
result: pass
source: automated
coverage_id: 06-01-D4
note: DOM/aria contract passes; visual rendering defect captured in test 11

### 5. LocationDisplay in PanelShell
expected: LocationDisplay renders inside PanelShell with a 'Location' eyebrow across all four branches (empty/loading/resolved-name/coordinate-fallback); no raw glass classes remain
result: pass
source: automated
coverage_id: 06-02-D1

### 6. TrendRow in PanelShell
expected: TrendRow renders inside PanelShell(as='section') with a 'Last 7 Days' headline in every state (empty/loading/error/populated); chart internals byte-for-byte unchanged
result: pass
source: automated
coverage_id: 06-02-D2

### 7. Hero split into two panels
expected: AnomalyCard split into CurrentConditionsPanel + DeltaPanel, each its own PanelShell; AnomalyCard.tsx no longer exists; build succeeds with no dangling reference
result: pass
source: automated
coverage_id: 06-03-D1

### 8. 50/50 side-by-side layout
expected: Current Conditions + Delta in a 50/50 equal-width/height two-up row that stays side-by-side in every state; order Location -> [Current | Delta] -> Last 7 Days
result: pass
source: automated
coverage_id: 06-03-D2

### 9. Delta dominance ratio
expected: Delta Δ number renders at calc(--text-display*1.7)=47.6px in --anomaly-color, ~1.7x the Current Conditions 28px temperature — inside the 1.5-2x dominance band
result: pass
source: automated
coverage_id: 06-03-D3

### 10. Always-visible micro-copy
expected: Each panel shows micro-copy under its number: "Today's measured temperature." (Current) and "How today compares to the 30-year average for this date." (Delta, before the verdict)
result: pass
source: automated
coverage_id: 06-03-D4

### 11. InfoTooltip authored bodies
expected: Both panels expose an accessible InfoTooltip with the exact authored bodies (modeled-data caveat for Current; delta+z-score methodology for Delta)
result: issue
reported: "The info hover texts are broken. Current condition hover text renders behind the panels, so it's unreadable. Delta hover text renders out of the frame, so it's also unreadable."
severity: major

### 12. Single-source anomaly gate
expected: Both panels self-gate through isAnomalyReady; App.tsx's anomaly/trendDays computations call isAnomalyReady instead of an inline status literal — gate lives in one place
result: pass
source: automated
coverage_id: 06-03-D6

## Summary

total: 12
passed: 11
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-06-11
  truth: "Both panels' InfoTooltip popover is fully readable when opened — appears above the panels and stays within the viewport"
  status: failed
  reason: "User reported: info hover texts are broken. Current Conditions popover renders behind the panels (unreadable); Delta popover renders out of the frame (unreadable)."
  severity: major
  test: 11
  root_cause: "InfoTooltip popover is a descendant of PanelShell, whose `backdrop-blur-lg` (backdrop-filter) creates a new stacking context per panel. The popover's `absolute z-10` is confined to its own panel's stacking context, so (a) the Current Conditions popover is painted beneath the later-sibling Delta panel (its own stacking context, painted on top) — 'behind the panels'; and (b) the popover is left-anchored to its trigger with no viewport-edge flip, while App's root is `overflow-hidden`, so the right-edge Delta popover extends past the frame and is clipped — 'out of the frame'. z-index alone cannot escape an ancestor backdrop-filter stacking context."
  artifacts:
    - path: "src/app/InfoTooltip.tsx"
      issue: "Popover rendered as an in-flow `absolute z-10` descendant of PanelShell (line 164-175); trapped in the panel's backdrop-filter stacking context and left-anchored with no edge-flip. Note the hover/focus/outside-click logic (handleMouseLeave line 107, handleBlur line 134, outside-click useEffect line 67) relies on containerRef.contains(popover) — any fix that relocates the popover in the DOM must preserve these relationships."
    - path: "src/app/PanelShell.tsx"
      issue: "BASE_CLASSES includes `backdrop-blur-lg` (line 26) — the backdrop-filter that establishes the per-panel stacking context trapping the popover. Shared by every panel AND the popover itself."
    - path: "src/app/App.tsx"
      issue: "Root wrapper `overflow-hidden` (line 89) clips any popover extending past the viewport; the two-up row (line 108) makes Current/Delta sibling stacking contexts where the later (Delta) paints over the earlier's popover."
  missing:
    - "Lift the popover out of the panel's backdrop-filter stacking context and the root overflow-hidden clip — render it in the top layer (native Popover API) or via a portal to document.body with position: fixed computed from the trigger's getBoundingClientRect."
    - "Add viewport-edge-aware positioning (flip/shift) so the right-edge Delta popover stays within the frame."
    - "Preserve the existing WCAG 1.4.13 hover/focus/persist/outside-click contract and all passing InfoTooltip tests — the popover must still be reachable for containerRef containment checks (or those checks updated to include a popover ref)."
  debug_session: ""
