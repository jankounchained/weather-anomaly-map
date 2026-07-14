# Phase 3: Historical Trend Charts & Edge Cases - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 3-Historical Trend Charts & Edge Cases
**Areas discussed:** Distribution chart style, Small-multiples layout, No-historical-data experience, Recent-day data gaps

---

## Distribution chart style

| Option | Description | Selected |
|--------|-------------|----------|
| Dot/strip plot | Each year's value as its own point, bright mean overlaid | ✓ |
| Range band + average line | Shaded min-max band with a bright mean line | |
| Band + points combined | Both shaded band and individual points | |

**User's choice:** Dot/strip plot
**Notes:** Recharts has no native box-plot primitive; dot/strip composes naturally from `Scatter` + `ReferenceLine`.

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct marker overlaid on the strip | Different shape/color marker at the actual value's position | ✓ |
| Separate readout beside the chart | Actual value shown as text/number next to the chart | |
| You decide | Claude picks based on what reads cleanest | |

**User's choice:** Distinct marker overlaid on the strip

| Option | Description | Selected |
|--------|-------------|----------|
| Bright solid horizontal line | Solid saturated line/tick at the mean's y-position | ✓ |
| Larger bright dot | Mean as one larger, brighter dot | |

**User's choice:** Bright solid horizontal line

| Option | Description | Selected |
|--------|-------------|----------|
| Jitter for readability | Dots spread randomly left/right to reduce overlap | ✓ |
| No jitter, single vertical column | All dots stack in one vertical line | |

**User's choice:** Jitter for readability

---

## Small-multiples layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal row | All 7 mini-charts side by side, reads like a week strip | ✓ |
| Grid (wrap into rows) | Charts wrap into e.g. 4+3 | |
| Vertical stacked list | One day per row, stacked top to bottom | |

**User's choice:** Horizontal row

| Option | Description | Selected |
|--------|-------------|----------|
| Shared scale across all 7 | Same temperature axis range for every day | ✓ |
| Independent scale per day | Each day auto-scales to its own range | |

**User's choice:** Shared scale across all 7

| Option | Description | Selected |
|--------|-------------|----------|
| Below the AnomalyCard | Trend row as supporting detail underneath today's headline | ✓ |
| Beside the AnomalyCard | Two-column layout | |
| You decide | Claude picks based on final layout | |

**User's choice:** Below the AnomalyCard

| Option | Description | Selected |
|--------|-------------|----------|
| Today + 6 prior days | 7 total, today rightmost/most recent | ✓ |
| 7 days strictly before today | Today excluded, only the preceding week | |

**User's choice:** Today + 6 prior days

---

## No-historical-data experience

| Option | Description | Selected |
|--------|-------------|----------|
| Fewer than 2 samples in that day's window | Reuse Phase 2's existing anomaly threshold | |
| A stricter minimum (e.g. at least half the ~30 years present) | Avoids sparse/misleading strips | ✓ |

**User's choice:** A stricter minimum (at least half the ~30 years present)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-day | Each of the 7 mini-charts independently evaluated | ✓ |
| Whole-location, all-or-nothing | Single gate for the entire trend section | |

**User's choice:** Per-day

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, apply the same stricter threshold everywhere | AnomalyCard + all 7 trend days share one rule | ✓ |
| No, keep Phase 2's threshold as-is for today | Only new trend charts use the stricter rule | |

**User's choice:** Yes, apply the same stricter threshold everywhere
**Notes:** This touches Phase 2's `AnomalyCard`/`anomaly.ts` code — confirmed in-scope as ROBU-01 robustness tightening, not scope creep.

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder card with a short message | That day's slot shows a small "not enough history" card | ✓ |
| Collapse/omit that day's slot | Row shows fewer than 7 charts | |

**User's choice:** Placeholder card with a short message

---

## Recent-day data gaps

| Option | Description | Selected |
|--------|-------------|----------|
| Use the forecast API's recent-past data for actuals | Avoids archive lag for the actual-value side | ✓ |
| Show a pending/placeholder state for lagged days | Distinct "pending" placeholder if truly unavailable | |

**User's choice:** Use the forecast API's recent-past data for actuals

| Option | Description | Selected |
|--------|-------------|----------|
| Same placeholder for both | One code path/visual state regardless of cause | ✓ |
| You decide | Claude picks based on feasibility | |

**User's choice:** Same placeholder for both

---

## Claude's Discretion

- Exact pixel/spacing/visual polish of the trend row's placement below AnomalyCard.

## Deferred Ideas

None — discussion stayed within phase scope.
