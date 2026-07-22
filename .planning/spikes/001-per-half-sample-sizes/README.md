---
spike: 001
name: per-half-sample-sizes
type: standard
validates: "Given real Open-Meteo 30-yr data across diverse latitudes, when split into recent-5yr/prior-25yr ±5-day windows, then the actual per-half sample counts are known — and we learn whether the recent half ever realistically falls below the ~15-20 curve-vs-rug floor"
verdict: VALIDATED
related: [002]
tags: [statistics, open-meteo, sampling, kde, gate, phase-8]
---

# Spike 001: Per-Half Sample Sizes

## What This Validates

**Given** the same single 30-year Open-Meteo archive series the app already fetches,
**when** it is split into a recent-5yr half and a prior-25yr half using the app's real
±5-day day-of-year window (`filterDayOfYearWindow`), **then** we know the actual per-half
sample counts — and specifically whether the recent half ever realistically drops below the
~15–20 curve-vs-rug floor (PD-04 gate 2), which decides whether the sparse-half rug fallback
(PD-01/02) is a common render path or a rare defensive guard.

## Research

- **Split provenance (locked):** recent = last 5 complete years, prior = the 25 before.
  Anchored to the last complete year (2025 → recent 2021–2025, prior 1996–2020).
- **Window (from `anomaly.ts`):** ±5 days ⇒ 11 calendar days/year. Theoretical max per half:
  recent 5×11 = **55**, prior 25×11 = **275**.
- **Data source:** `archive-api.open-meteo.com/v1/archive`, `daily=temperature_2m_mean`,
  keyless + CORS-enabled (confirmed by direct browser `fetch` and Node fetch). ERA5 reanalysis.

## How to Run

```bash
# Real-data probe across 7 diverse locations (prints a table):
node probe.mjs
node probe.mjs --json      # machine-readable

# Interactive page — click any preset or type coordinates, watch the two
# counts land against the n_min floor (live Open-Meteo fetch):
python3 -m http.server 8001    # then open http://localhost:8001/
```

## What to Expect

- `probe.mjs` prints per-location recent/prior sample ranges. Expectation going in: recent ≈ 55.
- The page lets you probe *any* coordinate and shows recent vs prior as bars against the
  n_min≈20 floor line, plus a per-day breakdown and a coverage %.

## Investigation Trail

1. **Ported the exact windowing** (`windowBounds` + `filterDayOfYearWindow`) from
   `src/anomaly/anomaly.ts` verbatim so the numbers match what `computeTrendDay` will see —
   not an approximation.
2. **Fetched real 30-yr data for 7 stress-test locations** spanning every latitude band and
   land/ocean/ice regime: mid-latitude land, equatorial, subarctic maritime, high Arctic
   (Svalbard 78°N), hot desert (Sahara), open ocean (mid-Pacific), and Antarctica (McMurdo).
   The ocean/desert points directly test RESEARCH.md Pitfall 1's "data desert" concern.
3. **Result was uniform and unambiguous** — see Results.
4. **Followed the surprise:** since every real location is saturated at 55/275, the only way to
   *produce* a sparse half is synthetic thinning. That is exactly the experiment spike 002 needs
   to pin `n_min` — so the sparse-half question is deliberately handed off, not left open.

## Results

**VALIDATED — with a load-bearing finding that reshapes the fallback story.**

Every one of the 7 locations returned **exactly 55 recent / 275 prior** samples per day, at
**100.0% coverage** (10958/10958 days non-null):

| Location | recent n | prior n | coverage |
|----------|---------:|--------:|---------:|
| Berlin (mid-lat land) | 55 | 275 | 100% |
| Singapore (equatorial) | 55 | 275 | 100% |
| Reykjavík (subarctic maritime) | 55 | 275 | 100% |
| Longyearbyen, Svalbard (high Arctic) | 55 | 275 | 100% |
| Sahara interior (hot desert) | 55 | 275 | 100% |
| Mid-Pacific open ocean | 55 | 275 | 100% |
| McMurdo, Antarctica | 55 | 275 | 100% |

**Key findings:**

1. **The recent half is always ~55 samples** — ~2.75× above a 20-floor, ~3.7× above a 15-floor.
   At real coordinates it is *never* sparse.
2. **ERA5 has no data deserts.** The "ocean/desert returns near-zero samples" worry (RESEARCH.md
   Pitfall 1) does **not** manifest — open ocean and Antarctic ice both read at 100% coverage.
   ERA5 is a complete, gap-free global reanalysis grid. The whole-tile `hasUsableSampleCount`
   gate (PD-03/PD-04 gate 1) therefore effectively never fires for a real lat/lon either.
3. **⇒ The per-half rug fallback (PD-01/02) is a defensive guard, not a common path.** It must
   still be built (honest degradation is cheap and correct), but it will essentially only ever
   fire in synthetic/pathological inputs — so `n_min` can be set conservatively (a safety net),
   and design effort should weight the *curve* path far more than the *rug* path.
4. **The recent/prior asymmetry is the real design constraint** — not sparsity. n=55 vs n=275
   means Silverman bandwidth differs ~1.4× between halves (55^-0.2 vs 275^-0.2). That asymmetry,
   and how it interacts with the shared-density-peak normalization (PD-06), is the thing spike
   002 must actually scrutinize.

**Surprise:** going in, the sparse-half fallback felt like a core feature to calibrate. The data
says it's an edge guard. The genuine risk moved from "will thin halves break the curve?" to
"does a 55-sample recent half smooth into a *believable* curve, or a lumpy one?" — spike 002.

**Impact on remaining spikes:**
- 002 must **synthetically thin** samples (55 → 30 → 20 → 15 → 10) to find where the KDE goes
  lumpy, since real data never gets there on its own.
- 003 should present the curve/curve case as the *default* tile and treat the rug as the rare
  branch, not co-equal.
