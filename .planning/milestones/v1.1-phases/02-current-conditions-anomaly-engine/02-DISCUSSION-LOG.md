# Phase 2: Current Conditions & Anomaly Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 2-Current Conditions & Anomaly Engine
**Areas discussed:** Baseline window & Feb 29, Verdict wording & thresholds, Precision & data-quality framing, Anomaly card layout & loading

---

## Baseline Window & Feb 29

**Q: How wide should the day-of-year window be for the 30-year baseline?**

| Option | Description | Selected |
|--------|-------------|----------|
| ±5 days | ~330 samples; middle-of-the-road per NOAA/ETCCDI conventions | ✓ |
| ±3 days | ~210 samples; more specific to the exact day, noisier |  |
| ±7 days | ~450 samples; smoother, risks blurring fast-changing seasons |  |

**User's choice:** ±5 days (Recommended)

**Q: How should Feb 29 be handled?**

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into Feb 28/Mar 1 window | Day-of-year based, no special-case branch, matches NOAA's approach | ✓ |
| Widen the window just for Feb 29 | e.g. ±10 days only on Feb 29, one-off branch |  |

**User's choice:** Fold into Feb 28/Mar 1 window (Recommended)

---

## Verdict Wording & Thresholds

**Q: How many verdict tiers, and what drives the boundaries?**

| Option | Description | Selected |
|--------|-------------|----------|
| 5 tiers, z-score driven | Much colder / Slightly colder / Typical / Slightly warmer / Much warmer | ✓ |
| 3 tiers, z-score driven | Colder / Typical / Warmer — simpler, loses "much vs slightly" nuance |  |
| Tiers driven by °C delta | Same structure but degree-based cutoffs, less comparable across climates |  |

**User's choice:** 5 tiers, z-score driven (Recommended)

**Q: What tone should the verdict copy use?**

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral/clinical | Matches PROJECT.md's practical daily-check framing | ✓ |
| Conversational/friendly | More casual, approachable voice |  |

**User's choice:** Neutral/clinical (Recommended)

**Q: Confirm exact z-score cutoffs for the 5 tiers?**

| Option | Description | Selected |
|--------|-------------|----------|
| \|z\| < 0.5 typical, 0.5–1.5 slight, > 1.5 much | Matches common climatology "near normal" practice | ✓ |
| You decide | Claude picks reasonable cutoffs during planning |  |

**User's choice:** |z| < 0.5 typical, 0.5–1.5 slight, > 1.5 much (Recommended)

---

## Precision & Data-Quality Framing

**Q: How much decimal precision for delta and z-score?**

| Option | Description | Selected |
|--------|-------------|----------|
| Delta: whole °C, z-score: 1 decimal | Avoids false precision from modeled/reanalysis data | ✓ |
| Both to 1 decimal | More precise-looking but risks implying station-level accuracy |  |

**User's choice:** Delta: whole °C, z-score: 1 decimal (Recommended)

**Q: Should the UI disclose the modeled/reanalysis data caveat?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, lightweight tooltip/info icon | Present but unobtrusive | ✓ |
| Yes, always-visible caption | More prominent, costs visual space |  |
| No disclosure | Cleaner card, skip for v1 |  |

**User's choice:** Yes, lightweight tooltip/info icon (Recommended)

---

## Anomaly Card Layout & Loading

**Q: How should delta, z-score, and verdict be visually arranged?**

| Option | Description | Selected |
|--------|-------------|----------|
| Big delta + verdict headline, z-score as small badge | Delta+verdict read together, z-score clearly secondary | ✓ |
| Big delta only, verdict+z-score grouped as secondary text | Simpler hierarchy, verdict and z-score grouped together |  |

**User's choice:** Big delta + verdict headline, z-score as small badge (Recommended)

**Q: What should the anomaly card show while current-conditions and baseline calls are in flight?**

| Option | Description | Selected |
|--------|-------------|----------|
| Single combined loading state | Wait for both calls, reveal together — avoids jarring partial reveal | ✓ |
| Progressive reveal | Show current temp first, then "computing anomaly..." for the rest |  |

**User's choice:** Single combined loading state (Recommended)

---

## Claude's Discretion

- Exact component/file structure for the weather client, anomaly engine, and current-conditions/anomaly-card components.
- "Today" derivation and timezone handling (`timezone=auto`, location-local date) — already specified as an engineering correctness requirement in research/PITFALLS.md, not re-litigated as a UX choice.
- Data source split (forecast `current` endpoint for live temp vs. archive endpoint for baseline) — already specified in research/PITFALLS.md Pitfall 3.
- Generic network/API-failure handling (distinct from the Phase 3 "no historical data for this location" case).
- Exact tooltip trigger behavior (hover vs. tap) and placement within the card.

## Deferred Ideas

None — discussion stayed within phase scope. The last-7-days trend chart (VIZ-01/VIZ-02) and no-historical-data messaging (ROBU-01) were not discussed since they are explicitly Phase 3's scope.
