# Phase 2: Current Conditions & Anomaly Engine - Research

**Researched:** 2026-07-14
**Domain:** Open-Meteo forecast/archive API integration + client-side climatological anomaly statistics (React hooks, pure TS math)
**Confidence:** HIGH (all Open-Meteo endpoint/param/response-shape claims below were verified against the live production API via direct HTTPS requests during this research session, not just documentation — see Sources)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Baseline Window & Feb 29**
- **D-01:** Use a ±5-day day-of-year window around the target calendar day, across 30 years (~330 samples) — matches NOAA/ETCCDI climatological-normal conventions, smooths outlier years without blurring the season. Satisfies ANOM-04 (day-of-year window, not single-day sample).
- **D-02:** Feb 29 is folded into the window centered on Feb 28 — no special-case branch. It naturally inherits the same samples as late Feb/early Mar, matching NOAA's own approach to leap-day normals.

**Verdict Wording & Thresholds**
- **D-03:** 5 verdict tiers, driven by z-score: Much colder than usual / Slightly colder than usual / Typical for today / Slightly warmer than usual / Much warmer than usual (ANOM-03).
- **D-04:** Tone is neutral/clinical, not conversational — matches PROJECT.md's framing as a practical daily-check tool, not a climate-research report or a playful app.
- **D-05:** Tier cutoffs, symmetric around 0: |z| < 0.5 → typical; 0.5 ≤ |z| < 1.5 → slight; |z| ≥ 1.5 → much.

**Precision & Data-Quality Framing**
- **D-06:** Delta (°C) is displayed as a whole number (no decimals); z-score is displayed to 1 decimal place. Avoids implying station-level precision from what is actually modeled/reanalysis data (research PITFALLS.md Pitfall 4).
- **D-07:** Show a lightweight info-icon/tooltip near the anomaly card disclosing: "Based on modeled climate data for this area (~9-25km resolution)". Not an always-visible caption, not omitted — present but unobtrusive.

**Anomaly Card Layout & Loading**
- **D-08:** Visual hierarchy: the delta number is large/hero-sized, paired with the verdict as a headline underneath it (they read together at a glance). The z-score appears as a small supporting badge/chip off to the side — clearly secondary, matching REQUIREMENTS.md's "delta primary, z-score secondary" mandate.
- **D-09:** Single combined loading state for the whole anomaly card — wait for BOTH the current-conditions call and the 30-year baseline call to resolve before revealing delta + z-score + verdict together. No progressive/partial reveal (avoids current-temp popping in, then a beat of "calculating..." before the anomaly appears).

### Claude's Discretion
- Exact component/file structure for the weather client, anomaly engine, and current-conditions/anomaly-card components (implementation detail, not a user-facing decision).
- Exact "today" derivation and timezone handling for the pin's location (research PITFALLS.md Pitfall 5 already specifies `timezone=auto` + location-local date — an engineering correctness requirement, not a UX choice).
- Data source split between Open-Meteo's forecast (`current`) endpoint for live temperature vs. the archive endpoint for the 30-year baseline (research PITFALLS.md Pitfall 3 already specifies this split — the archive endpoint has a multi-day data lag and cannot serve "today").
- Generic network/API-failure handling (as opposed to the "no historical data for this location" case, which is explicitly Phase 3's ROBU-01) — reasonable retry/error messaging left to implementation.
- Exact wording of the info-icon tooltip trigger (hover vs. tap target) and its precise placement within the card.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. The last-7-days trend chart (VIZ-01/VIZ-02) and no-historical-data messaging (ROBU-01) were not discussed here since they are explicitly Phase 3's scope per ROADMAP.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CURR-01 | User can see the current temperature for the selected location | `/v1/forecast?current=temperature_2m&timezone=auto` — verified live response shape below (Code Examples: `getCurrentWeather`) |
| ANOM-01 | Delta (°C) vs. 30-year historical average, primary/most prominent | `anomaly.ts` `computeDelta()` = today − baseline mean (Code Examples) |
| ANOM-02 | Z-score vs. 30-year average, secondary/supporting stat | `anomaly.ts` `computeZScore()` using sample stddev (Code Examples) |
| ANOM-03 | Plain-language verdict translating the anomaly | `classifyVerdict()` using D-03/D-05 tier table (Code Examples) |
| ANOM-04 | Baseline from day-of-year window (not single sample) across 30 years, sample stddev | `getHistoricalBaseline()` — one wide `/v1/archive` call over 30 *complete past* years + client-side day-of-year-window filter + `sampleStdDev()` (Architecture Patterns, Pitfall 1 below) |
</phase_requirements>

## Summary

This phase wires two Open-Meteo endpoints into the existing hook conventions from Phase 1 (`useReverseGeocode`'s idle/loading/resolved, request-id-ref, AbortController pattern) and adds a pure, dependency-free `anomaly.ts` module. Both endpoints were hit directly against production during this research session (not just read from docs) to lock down exact param names and response shapes: `GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m&timezone=auto` for CURR-01, and `GET https://archive-api.open-meteo.com/v1/archive?latitude=..&longitude=..&start_date=..&end_date=..&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min&timezone=auto` for the ANOM-* baseline. One important refinement beyond the project-level ARCHITECTURE.md: the archive baseline query should span the **30 complete past calendar years** (e.g. `2026-07-14` "today" → `start_date=1996-01-01&end_date=2025-12-31`), not "30 years back from today." This avoids two problems at once — comparing today's reading against a baseline that (partially) includes today itself (statistical leakage), and any residual archive-API recency lag — without needing a separate lag-detection code path.

The z-score/delta math is ~10 lines of pure TS (mean, sample stddev with n-1, z-score, delta) matching STACK.md's "hand-roll, don't add a dependency" call, gated by an explicit `stdDev === 0` guard (an edge case not covered in project-level research: a baseline window where every historical sample happens to be numerically identical would otherwise produce `Infinity`/`NaN`). Verdict classification is a pure lookup against D-05's three cutoffs. "Today" in the pin's local timezone comes directly from the forecast response's `current.time` field when `timezone=auto` is set — confirmed empirically against three live cross-timezone test locations (Berlin, Auckland, Honolulu) that this field is already shifted to the location's local clock, so no manual UTC-offset arithmetic is needed; just split on `'T'` and take the date portion.

**Primary recommendation:** One `weather/client.ts` fetch wrapper per endpoint (`getCurrentWeather`, `getHistoricalBaseline`), each backed by a hook (`useCurrentWeather`, `useHistoricalBaseline`) following `useReverseGeocode`'s exact idle/loading/resolved + AbortController + request-id-ref shape; a pure `anomaly/anomaly.ts` with `mean`, `sampleStdDev`, `computeZScore`, `computeDelta`, `classifyVerdict`; and a single `AnomalyCard` component in `src/app/` (matching the existing `LocationPanel` precedent) that combines both hook statuses per D-09 before rendering anything.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Current temperature fetch (CURR-01) | Browser / Client | External API (Open-Meteo forecast) | Static SPA, no backend (PROJECT.md constraint); direct browser `fetch()` to a CORS-enabled, keyless API |
| 30-year baseline fetch (ANOM-04 data) | Browser / Client | External API (Open-Meteo archive) | Same — one wide client-side request, filtered/aggregated in-browser |
| Day-of-year window filtering + stats (mean, sample stddev) | Browser / Client (pure module) | — | Pure computation, no I/O; belongs in a framework-free `anomaly.ts` per ARCHITECTURE.md so it's independently unit-testable and reusable if a backend is ever added |
| Z-score / delta computation (ANOM-01, ANOM-02) | Browser / Client (pure module) | — | Same pure-function tier as above |
| Verdict classification (ANOM-03) | Browser / Client (pure module) | — | Pure lookup against z-score, no side effects |
| Combined loading-state orchestration (D-09) | Browser / Client (React component) | — | UI-tier concern: two hook statuses combined into one gate before render |
| "Today" timezone resolution (Pitfall 5) | External API (Open-Meteo, via `timezone=auto`) | Browser / Client (date-string parsing only) | The API does the timezone resolution server-side; the client only needs to read `current.time`'s date portion, not compute it |

## Standard Stack

### Core
No new runtime dependencies. This phase extends the existing Phase 1 stack (React 19.2.7, TypeScript, Vite, Vitest) — confirmed already installed via `package.json` (`react@^19.2.7`, `typescript@^6.0.3`, `vitest@^4.1.10`).

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none — native `fetch`) | — | HTTP calls to Open-Meteo | Always — CORS-enabled, keyless, matches Phase 1's `useReverseGeocode` precedent exactly |
| (none — hand-rolled `anomaly.ts`) | — | mean/sample-stddev/z-score/delta | Always — ~10 lines, zero edge cases beyond the `stdDev===0` guard; STACK.md and CLAUDE.md both explicitly reject `simple-statistics` for this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled stats module | `simple-statistics` | Rejected per STACK.md/CLAUDE.md — unjustified dependency for ~10 lines of math with no additional statistical operations planned for v1 |
| Two separate hooks (`useCurrentWeather` + `useHistoricalBaseline`) | One combined `useAnomaly(lat,lng)` hook doing both fetches internally | STACK.md explicitly names the two-hook shape (`useCurrentWeather(lat,lon)`, `useHistoricalBaseline(lat,lon,variable)`); keeping them separate also lets Phase 3's trend chart reuse `useCurrentWeather`-style fetching independently without pulling in baseline logic it doesn't need yet |

**Installation:** None required — no `npm install` needed for this phase.

**Version verification:** N/A — no new packages.

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** All work is native `fetch()` + hand-rolled pure TypeScript, consistent with CLAUDE.md's "no data-fetching library, no stats library" directives. No `package-legitimacy check` run was needed.

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                            BROWSER (client)                            │
│                                                                          │
│  useSelectedLocation() → { lat, lng }  (Phase 1, unchanged)            │
│         │                                                               │
│         ├──────────────────────────────┬───────────────────────────┐  │
│         ▼                              ▼                           │  │
│  useCurrentWeather(lat,lng)   useHistoricalBaseline(lat,lng,var)    │  │
│    (gated: null until          (gated: null until hasSelection)    │  │
│     hasSelection, like               │                              │  │
│     useReverseGeocode)               │                              │  │
│         │                            │                              │  │
│         ▼                            ▼                              │  │
│  weather/client.ts             weather/client.ts                    │  │
│  getCurrentWeather()           getHistoricalBaseline()               │  │
│    GET /v1/forecast              GET /v1/archive (30 complete       │  │
│    current=temperature_2m        past years, one wide call)         │  │
│    timezone=auto                 timezone=auto                      │  │
│         │                            │                               │  │
│         │                            ▼                               │  │
│         │                     anomaly/anomaly.ts                     │  │
│         │                     filterDayOfYearWindow() (±5d, D-01/02) │  │
│         │                     mean() / sampleStdDev()  → BaselineStats│  │
│         │                            │                               │  │
│         └──────────────┬─────────────┘                               │  │
│                         ▼                                            │  │
│                anomaly/anomaly.ts                                    │  │
│                computeDelta() / computeZScore() / classifyVerdict()  │  │
│                         │                                            │  │
│                         ▼                                            │  │
│         AnomalyCard (src/app/) — combined loading gate (D-09)        │  │
│         renders: hero delta + verdict headline, z-score badge,       │  │
│         info tooltip (D-06/D-07/D-08)                                │  │
└──────────────────────────────────────────────────────────────────────┘
                          │ HTTPS, CORS-enabled, keyless
                          ▼
        api.open-meteo.com/v1/forecast   archive-api.open-meteo.com/v1/archive
```

### Recommended Project Structure
```
src/
├── weather/
│   ├── client.ts               # getCurrentWeather(), getHistoricalBaseline()
│   ├── useCurrentWeather.ts    # hook: idle/loading/resolved (mirrors useReverseGeocode)
│   ├── useHistoricalBaseline.ts# hook: idle/loading/resolved, same shape
│   └── types.ts                 # CurrentWeatherResponse, ArchiveDailyResponse
├── anomaly/
│   ├── anomaly.ts               # pure: mean, sampleStdDev, computeZScore,
│   │                             #   computeDelta, classifyVerdict,
│   │                             #   filterDayOfYearWindow
│   ├── anomaly.test.ts          # Vitest, hand-computed reference values
│   └── types.ts                 # BaselineStats, AnomalyResult, VerdictTier
└── app/
    └── AnomalyCard.tsx           # combines both hooks (D-09), renders D-06/D-07/D-08
```

**Adaptation from project-level ARCHITECTURE.md:** ARCHITECTURE.md's greenfield suggestion put UI composition in a new top-level `dashboard/` folder. The actual Phase 1 codebase instead put composition components (`LocationPanel.tsx`, `LocationDisplay.tsx`) directly in `src/app/`, alongside `App.tsx`. `AnomalyCard.tsx` should follow that established precedent (`src/app/`) rather than introducing a new `dashboard/` folder, per CONTEXT.md's "one domain-per-folder" note (`weather/` for fetch+hooks, `anomaly/` for pure stats, `app/` for composition).

### Pattern 1: One archive call over 30 *complete past* years, not "30 years back from today"

**What:** Query `/v1/archive` with `start_date = ${currentYear - 30}-01-01`, `end_date = ${currentYear - 1}-12-31` — i.e. the last 30 fully-elapsed calendar years, excluding the current (partial) year entirely. Filter the returned flat daily series client-side to the target day-of-year ±5-day window (D-01), computed per-year with real `Date` arithmetic so windows near Dec 31/Jan 1 correctly span two calendar years (verified below).

**When to use:** Always, for the ANOM-04 baseline.

**Why this refines ARCHITECTURE.md's Pattern 1 (which used `endDate = today`):** Two correctness issues are avoided at once:
1. **Data leakage:** If the archive range extended through "today," the day-of-year window (centered on today) would include today's own not-yet-final value inside the very baseline "today" is being compared against — inflating apparent "normalcy."
2. **Archive recency lag:** PITFALLS.md documents a historical 2–7 day archive lag for the most recent days. Excluding the current year's data from the baseline entirely sidesteps needing a lag-detection code path — the baseline query never touches dates close to "now," regardless of how the archive currently behaves for recent days.

`[VERIFIED: archive-api.open-meteo.com live response, 2026-07-14]` — direct test of `daily=temperature_2m_mean` for `2026-07-13..2026-07-14` (yesterday/today) unexpectedly returned real, non-null values with no gap, contradicting the "5-7 day lag" figure PITFALLS.md cites from older GitHub issue reports — Open-Meteo's archive API appears to now backfill very recent days (likely with a forecast-model blend) rather than leaving them null. This doesn't change the recommendation (CONTEXT.md's Claude's Discretion still specifies forecast API for "today," archive only for the baseline; excluding the current year from the baseline is correct regardless of whether the lag is 0 or 7 days, purely for the data-leakage reason above) — but it means the "warning sign: archive returns null/missing for last week" from PITFALLS.md may not currently reproduce. Treat that specific pitfall's *symptom* as possibly stale; the *recommended architecture* (two-endpoint split, current-year excluded from baseline) still holds and should not be weakened based on this one observation.

**Example:**
```typescript
// weather/client.ts
export async function getHistoricalBaseline(
  lat: number,
  lng: number,
  variable: string = 'temperature_2m_mean',
): Promise<ArchiveDailyResponse> {
  const now = new Date()
  const endYear = now.getUTCFullYear() - 1
  const startYear = endYear - 29 // 30 complete years inclusive
  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('start_date', `${startYear}-01-01`)
  url.searchParams.set('end_date', `${endYear}-12-31`)
  url.searchParams.set('daily', variable)
  url.searchParams.set('timezone', 'auto')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`archive fetch failed: ${res.status}`)
  return res.json() as Promise<ArchiveDailyResponse>
}
```

### Pattern 2: Day-of-year window filtering with year-boundary wraparound (verified)

**What:** For each of the 30 target years, anchor a `Date.UTC(year, month, day)` timestamp for the target calendar day (with Feb 29 folded to Feb 28 per D-02 — never construct `Date.UTC(year, 1, 29)` for a non-leap year), then compute `[anchor - 5d, anchor + 5d]` using millisecond arithmetic. Because this uses real `Date` objects (not string month/day comparison), a window anchored near Jan 1 or Dec 31 automatically and correctly spans into the adjacent calendar year — no special-case branch needed.

**When to use:** Always, when building the day-of-year window filter for ANOM-04.

**Verified via direct computation (this research session):**
```
Jan 2  ±5d → 2019-12-28 .. 2020-01-07   (correctly spans into prior year)
Dec 30 ±5d → 2020-12-25 .. 2021-01-04   (correctly spans into next year)
Feb 28 ±5d, leap year (2020)     → 2020-02-23 .. 2020-03-04  (includes Feb 29)
Feb 28 ±5d, non-leap year (2021) → 2021-02-23 .. 2021-03-05  (Feb 29 doesn't exist, window still valid)
```
This confirms D-02's "fold Feb 29 into the Feb-28-centered window, no special case" works correctly with plain `Date` arithmetic — a leap year's window naturally includes Feb 29 as one more sample; a non-leap year's window simply has no Feb 29 to include, with no branching required.

**Example:**
```typescript
// anomaly/anomaly.ts
export function windowBounds(
  year: number,
  month: number, // 1-12
  day: number,
  halfWidthDays: number,
): { start: string; end: string } {
  // Fold Feb 29 -> Feb 28 (D-02) before constructing the anchor.
  const safeDay = month === 2 && day === 29 ? 28 : day
  const anchor = Date.UTC(year, month - 1, safeDay)
  const start = new Date(anchor - halfWidthDays * 86_400_000)
  const end = new Date(anchor + halfWidthDays * 86_400_000)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export function filterDayOfYearWindow(
  daily: { time: string[]; values: number[] },
  targetMonth: number,
  targetDay: number,
  startYear: number,
  endYear: number,
  halfWidthDays = 5,
): number[] {
  const ranges = []
  for (let y = startYear; y <= endYear; y++) {
    ranges.push(windowBounds(y, targetMonth, targetDay, halfWidthDays))
  }
  const result: number[] = []
  for (let i = 0; i < daily.time.length; i++) {
    const t = daily.time[i]
    if (ranges.some((r) => t >= r.start && t <= r.end) && daily.values[i] != null) {
      result.push(daily.values[i])
    }
  }
  return result
}
```

### Pattern 3: "Today" derivation from `current.time`, no manual timezone math (verified)

**What:** When `timezone=auto` is set on the forecast request, the response's `current.time` field (format `"YYYY-MM-DDTHH:mm"`) is already expressed in the pin location's local time — not UTC. Split on `'T'` and take the date portion (`current.time.split('T')[0]`) to get "today" for both the current-conditions display and as the target day-of-year for the baseline lookup. Do not use `new Date()` (browser-local) or manual `utc_offset_seconds` arithmetic — the API has already done the timezone resolution.

**When to use:** Always, for deriving "today" per Pitfall 5.

**Verified via 3 live cross-timezone test requests (this research session, run at UTC 18:34 on 2026-07-14):**
| Location | `timezone` resolved | `utc_offset_seconds` | `current.time` returned | Correct local date? |
|----------|---------------------|----------------------|--------------------------|----------------------|
| Berlin (52.52, 13.41) | Europe/Berlin | 7200 | `2026-07-14T20:30` | Yes — 18:34 UTC + 2h = 20:34 local |
| Auckland (-36.8, 174.76) | Pacific/Auckland | 43200 | `2026-07-15T06:30` | Yes — rolls into the *next* UTC calendar day, as Pitfall 5 predicted |
| Honolulu (21.3, -157.85) | Pacific/Honolulu | -36000 | `2026-07-14T08:30` | Yes — 18:34 UTC - 10h = 08:34 local, same UTC calendar day |

This directly confirms Pitfall 5's exact warning scenario (a pin near the international date line shows a different calendar day than UTC) and confirms the fix (`timezone=auto` + reading `current.time`'s date portion) works correctly without any client-side offset math.

### Anti-Patterns to Avoid
- **Fetching `temperature_2m_mean` via `hourly=` and averaging client-side:** Open-Meteo's archive API already exposes `temperature_2m_mean` as a first-class `daily=` aggregate (confirmed live) — never request `hourly` for a 30-year range (ARCHITECTURE.md Anti-Pattern 1).
- **Looping 30 separate one-year archive requests:** One wide range call, filtered client-side, is both simpler and cheaper (ARCHITECTURE.md Anti-Pattern 2).
- **Using `/v1/archive` for "today's" temperature:** Even though this research found the archive API currently returns non-null values for very recent days (see Pattern 1 note), CONTEXT.md's locked architecture still requires CURR-01 to come from `/v1/forecast`'s `current=` param — the archive endpoint is reserved for the baseline only.
- **Synchronous `setState` inside the fetch effect body:** Violates `eslint-plugin-react-hooks` 7.x's set-state-in-effect rule (already hit and fixed in Phase 1, see STATE.md decisions). Both new hooks must derive status/data at render time from a resolved-lookup object set inside an async `.then()` continuation, exactly like `useReverseGeocode`.
- **Computing z-score without guarding `stdDev === 0`:** Not covered by project-level PITFALLS.md — if every sample in a day-of-year window happens to be numerically identical (extremely rare but possible for a very stable microclimate + narrow window), `(today - mean) / 0` produces `Infinity`/`NaN`. Guard explicitly and treat as "insufficient variance to compute a meaningful z-score" (distinct from ROBU-01's "no data at all," which is Phase 3's concern — this phase should at minimum not crash or render `NaN`/`Infinity` to the UI).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetching/deduping current + baseline requests | Custom request-dedup cache, TanStack Query | Plain `fetch()` + the existing `useReverseGeocode`-style hook pattern | STACK.md: two calls total, no non-trivial caching/dedupe logic needed yet; a data-fetching library is explicitly deferred until real complexity appears |
| Z-score / mean / stddev math | `simple-statistics` or similar | Hand-rolled `mean`/`sampleStdDev`/`computeZScore` in `anomaly.ts` | ~10 lines, zero real edge cases beyond one `stdDev===0` guard; CLAUDE.md and STACK.md both explicitly reject a dependency here |
| Timezone-aware "today" resolution | Client-side timezone library (`date-fns-tz`, `luxon`, manual `Intl` timezone lookups) | Open-Meteo's own `timezone=auto` + reading `current.time`'s date portion | The API already resolves lat/lng → IANA timezone → local time server-side; verified empirically this session — no client library needed |

**Key insight:** Every piece of "hard" logic in this phase (timezone resolution, historical aggregation) is already done server-side by Open-Meteo when the right query params are used. The client-side work that remains — day-of-year windowing and z-score math — is small enough that a dependency would cost more (bundle weight, API surface to learn) than it saves.

## Common Pitfalls

### Pitfall 1: Baseline includes the current (partial) year, leaking "today" into its own comparison set
**What goes wrong:** If the archive query's `end_date` is "today" (as project-level ARCHITECTURE.md's example does), the day-of-year window for the current year includes dates very close to today — potentially including today's own not-yet-final reading — inside the baseline "today" is measured against.
**Why it happens:** "30 years back from today" sounds like the natural date-range boundary, but it silently includes a 31st, partial year.
**How to avoid:** Bound the archive query to `[currentYear - 30, currentYear - 1]` — 30 *complete* past years, never touching the current year (Pattern 1 above).
**Warning signs:** Z-score for "today" is suspiciously close to 0 more often than it should be; baseline mean shifts noticeably day-to-day as the current year's partial data rolls in.

### Pitfall 2: `stdDev === 0` producing `Infinity`/`NaN` in the z-score
**What goes wrong:** A day-of-year window where all sampled historical values are numerically identical (or a window that resolves to zero valid samples due to a filtering bug) produces a divide-by-zero.
**Why it happens:** Real-world weather data essentially never has zero variance, so this is easy to omit from testing — until a bug elsewhere silently narrows the sample set to 0 or 1 points.
**How to avoid:** Explicit guard in `computeZScore`: if `stdDev === 0` or `n < 2`, return a sentinel (e.g. `null`) rather than computing, and have the calling component treat that as "cannot compute a meaningful anomaly" rather than rendering `NaN`/`Infinity`.
**Warning signs:** UI shows "Infinity" or "NaN" anywhere in the anomaly card; unit test suite has no case for a degenerate/empty sample set.

### Pitfall 3 (inherited from project-level PITFALLS.md, reconfirmed): Sample vs. population standard deviation
**What goes wrong:** Using `/n` instead of `/(n-1)` produces a systematically-too-small stddev, inflating z-scores.
**How to avoid:** `variance = sum((x - mean) ** 2) / (n - 1)` — write the Vitest case against a hand-computed reference value before/alongside the implementation (see Code Examples).
**Warning signs:** No unit test pins the exact formula against a known expected value.

## Code Examples

### Current weather fetch (CURR-01)
```typescript
// weather/client.ts
// Source: verified live 2026-07-14 against api.open-meteo.com/v1/forecast
export interface CurrentWeatherResponse {
  utc_offset_seconds: number
  timezone: string
  current: {
    time: string // "YYYY-MM-DDTHH:mm", already location-local when timezone=auto
    temperature_2m: number
  }
  current_units: { temperature_2m: string }
}

export async function getCurrentWeather(
  lat: number,
  lng: number,
): Promise<CurrentWeatherResponse> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('current', 'temperature_2m')
  url.searchParams.set('timezone', 'auto')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`forecast fetch failed: ${res.status}`)
  return res.json() as Promise<CurrentWeatherResponse>
}

/** "Today" in the pin's local calendar, per Pitfall 5 / Pattern 3 above. */
export function localDateFrom(currentTime: string): string {
  return currentTime.split('T')[0]! // "YYYY-MM-DD"
}
```

### Anomaly math (ANOM-01, ANOM-02, ANOM-04)
```typescript
// anomaly/anomaly.ts
export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Sample standard deviation (n-1 denominator) — ANOM-04, project PITFALLS.md Pitfall 2. */
export function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export interface AnomalyResult {
  delta: number
  zScore: number | null // null when stdDev is 0 or n < 2 (Pitfall 2 above)
}

export function computeAnomaly(today: number, baseline: number[]): AnomalyResult {
  const m = mean(baseline)
  const sd = sampleStdDev(baseline)
  const delta = today - m
  const zScore = sd === 0 || baseline.length < 2 ? null : delta / sd
  return { delta, zScore }
}
```

### Verdict classification (ANOM-03, D-03/D-05)
```typescript
// anomaly/anomaly.ts
export type VerdictTier =
  | 'much-colder'
  | 'slightly-colder'
  | 'typical'
  | 'slightly-warmer'
  | 'much-warmer'

const VERDICT_LABEL: Record<VerdictTier, string> = {
  'much-colder': 'Much colder than usual',
  'slightly-colder': 'Slightly colder than usual',
  typical: 'Typical for today',
  'slightly-warmer': 'Slightly warmer than usual',
  'much-warmer': 'Much warmer than usual',
}

/** D-05: |z| < 0.5 -> typical; 0.5 <= |z| < 1.5 -> slight; |z| >= 1.5 -> much. */
export function classifyVerdict(zScore: number): VerdictTier {
  const abs = Math.abs(zScore)
  const sign = zScore >= 0 ? 'warmer' : 'colder'
  if (abs < 0.5) return 'typical'
  if (abs < 1.5) return `slightly-${sign}` as VerdictTier
  return `much-${sign}` as VerdictTier
}

export function verdictLabel(tier: VerdictTier): string {
  return VERDICT_LABEL[tier]
}
```

### Unit test skeleton matching the hand-computed reference convention
```typescript
// anomaly/anomaly.test.ts
import { describe, it, expect } from 'vitest'
import { mean, sampleStdDev, computeAnomaly, classifyVerdict } from './anomaly'

describe('sampleStdDev', () => {
  it('matches a hand-computed sample stddev (n-1), e.g. spreadsheet STDEV.S', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9]: mean=5, sample variance=32/7≈4.571, stdDev≈2.138
    const values = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(sampleStdDev(values)).toBeCloseTo(2.138, 2)
  })

  it('returns 0 for fewer than 2 samples (guard, Pitfall 2)', () => {
    expect(sampleStdDev([5])).toBe(0)
  })
})

describe('computeAnomaly', () => {
  it('returns null zScore (not Infinity/NaN) when stdDev is 0', () => {
    const result = computeAnomaly(10, [5, 5, 5])
    expect(result.zScore).toBeNull()
    expect(result.delta).toBe(5)
  })
})

describe('classifyVerdict', () => {
  it('classifies the D-05 boundary cases correctly', () => {
    expect(classifyVerdict(0.49)).toBe('typical')
    expect(classifyVerdict(0.5)).toBe('slightly-warmer')
    expect(classifyVerdict(1.49)).toBe('slightly-warmer')
    expect(classifyVerdict(1.5)).toBe('much-warmer')
    expect(classifyVerdict(-1.5)).toBe('much-colder')
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| N/A | Open-Meteo API param/response shapes as documented and verified live 2026-07-14 | — | This is a single-vendor API integration; no legacy-vs-current split beyond `current_weather` (deprecated legacy param) vs. `current` (current param) — confirmed the docs and live responses both use `current`, not `current_weather` |

**Deprecated/outdated:** Open-Meteo's older `current_weather=true` boolean param still works on some historical integration guides but has been superseded by the more flexible `current=temperature_2m,...` array param used throughout this research — use `current=`, not `current_weather=`.

## Assumptions Log

> All Open-Meteo endpoint/param/response-shape claims in this document were verified directly against the live production API this session (curl requests, see Sources) — none are `[ASSUMED]`. The items below are the only claims not independently re-verified.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Open-Meteo's archive API "5-7 day lag" (from project PITFALLS.md, sourced from a 2023-era GitHub issue) may no longer reflect current behavior — live testing this session found no gap for the most recent 2 days | Pattern 1 note | Low — the recommended architecture (exclude current year from baseline; forecast API for "today") is correct regardless of whether the lag is 0 or 7 days, so this doesn't change any implementation decision, only the accuracy of one pitfall's stated symptom |
| A2 | Open-Meteo's documented rate limits (10k/day, 5k/hour, 600/min, from project STACK.md/PITFALLS.md, sourced from open-meteo.com/en/pricing and an HN comment) were not re-verified this session | Not directly used in this phase's implementation | Low for Phase 2 — a single pin-drop costs exactly 2 requests (current + baseline); rate-limit exposure only matters at real traffic scale, out of scope for this phase |

**If this table is empty:** N/A — see notes above; both entries are low-risk clarifications, not blocking assumptions requiring user confirmation before planning.

## Open Questions

1. **Should the historical baseline response be cached (e.g. `localStorage`) in this phase, or deferred?**
   - What we know: Project-level ARCHITECTURE.md recommends a read-through `localStorage` cache keyed by rounded lat/lng + day-of-year; PITFALLS.md flags un-cached fetching as technical debt "before sharing the URL publicly."
   - What's unclear: Neither REQUIREMENTS.md (CURR-01/ANOM-01..04) nor CONTEXT.md's Decisions/Discretion sections mention caching for Phase 2 specifically — it isn't a stated success criterion for this phase.
   - Recommendation: Treat caching as **out of scope for Phase 2** (each pin-drop already costs exactly 2 total Open-Meteo requests, not the 3 ARCHITECTURE.md envisioned when it also included the recent-trend fetch, which is Phase 3's scope) and revisit if/when Phase 3's trend chart adds a third per-pin-drop request or real usage data suggests it's needed. The planner should confirm this scoping call rather than silently add or silently omit a caching layer.

2. **Does `getHistoricalBaseline` need a request-id-ref + AbortController exactly like `useReverseGeocode`, given the archive call can take noticeably longer (30-year range)?**
   - What we know: `useReverseGeocode` uses a 3000ms timeout tuned for a small reverse-geocode lookup; the archive call returns a much larger payload (~30 years × ~11 days/year for the filtered window, but the raw response before filtering is up to ~30 years × 365 rows for the requested variable).
   - What's unclear: Whether 3000ms is an appropriate timeout for the archive call, or whether it needs a longer timeout / no timeout with only cancellation-on-unmount.
   - Recommendation: Reuse the request-id-ref + AbortController *cancellation* pattern (to correctly ignore stale responses on rapid pin changes) but let the planner pick a timeout value appropriate to the larger payload (e.g. 8-10s) rather than reusing the 3000ms geocoding timeout verbatim.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `api.open-meteo.com` (forecast endpoint) | CURR-01 | ✓ (verified live, HTTPS, no auth) | — | — |
| `archive-api.open-meteo.com` (archive endpoint) | ANOM-04 baseline | ✓ (verified live, HTTPS, no auth) | — | — |
| Vitest | ANOM-04 unit tests (sample stddev, verdict tiers) | ✓ (already installed, `vitest@^4.1.10`) | 4.1.10 | — |
| Node/npm toolchain | Build/dev | ✓ (confirmed working in Phase 1) | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None — both required external endpoints are live, keyless, and CORS-enabled; no proxy or fallback needed.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Open-Meteo is keyless; no auth surface introduced by this phase |
| V3 Session Management | No | No sessions; stateless SPA |
| V4 Access Control | No | No access-control surface — public, unauthenticated read-only API calls |
| V5 Input Validation | Yes | (a) lat/lng are already validated/clamped upstream by Phase 1's `coords.ts` before reaching this phase's hooks — no new raw user-input surface introduced; (b) new surface this phase adds: **Open-Meteo API response validation** — guard against missing/malformed fields (`current?.temperature_2m`, empty `daily.time`/`daily.temperature_2m_mean` arrays) before feeding them into `anomaly.ts`, so a malformed or unexpected API response fails gracefully rather than propagating `undefined`/`NaN` into the UI |
| V6 Cryptography | No hand-rolled crypto | All requests use `https://` — never construct a plain `http://` URL to either Open-Meteo host |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Malformed/unexpected upstream API response (Open-Meteo outage, schema change, partial response) | Tampering / DoS (availability) | Defensive parsing in `weather/client.ts` — check `res.ok` and validate expected fields exist before returning; the hook surfaces a distinct error/failed state (Claude's Discretion per CONTEXT.md: "generic network/API-failure handling") rather than letting `anomaly.ts` receive `undefined` |
| Divide-by-zero / degenerate statistics (`stdDev === 0`) fed silently into the UI | Tampering (data integrity, not an attacker-controlled vector but a correctness/availability concern) | Explicit `stdDev === 0`/`n < 2` guard in `computeZScore`/`computeAnomaly`, returning `null` rather than `Infinity`/`NaN` (Pitfall 2 above) |
| Mixed-protocol requests (accidental `http://` to either Open-Meteo host) | Tampering (MITM on unencrypted request) | Both endpoint constants in `weather/client.ts` must be `https://` literals, never derived from user input |

## Sources

### Primary (HIGH confidence — verified via direct tool call against live production API, 2026-07-14)
- `GET https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m&timezone=auto` — confirmed response shape, `current.time` local-time behavior
- `GET https://api.open-meteo.com/v1/forecast?...&timezone=UTC` — confirmed `timezone=auto` vs explicit `UTC` produce different `current.time` values (offset math verified against `date -u` wall clock)
- `GET https://api.open-meteo.com/v1/forecast?latitude=-36.8&longitude=174.76...` (Auckland) and `latitude=21.3&longitude=-157.85...` (Honolulu) — confirmed cross-timezone "today" resolution (Pitfall 5)
- `GET https://archive-api.open-meteo.com/v1/archive?...&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min&timezone=auto` — confirmed `temperature_2m_mean` is a valid daily param (contra one doc-scrape result that omitted it), confirmed response shape
- `GET https://archive-api.open-meteo.com/v1/archive?...&start_date=1996-01-01&end_date=2026-01-01...` — confirmed a full 30-year range request succeeds in one call
- `GET https://archive-api.open-meteo.com/v1/archive?...&start_date=<today-1>&end_date=<today>...` — found non-null data for the most recent 2 days (see Assumption A1)
- Direct Node computation of `windowBounds()` — confirmed year-boundary wraparound and Feb-29-fold behavior with plain `Date.UTC` arithmetic (Pattern 2)
- `/Users/janko/Repositories/gsd-test/src/geocoding/useReverseGeocode.ts`, `useReverseGeocode.test.ts`, `src/map/useSelectedLocation.ts`, `src/lib/coords.ts`, `src/app/App.tsx` — existing codebase, hook/pure-module conventions to follow

### Secondary (MEDIUM confidence)
- [open-meteo.com/en/docs](https://open-meteo.com/en/docs) — official forecast API docs, param list, `current` vs legacy `current_weather` naming
- [open-meteo.com/en/docs/historical-weather-api](https://open-meteo.com/en/docs/historical-weather-api) — official archive API docs, ERA5 coverage (back to 1940), documented lag figure (see Assumption A1 re: whether this figure is current)

### Tertiary (LOW confidence)
- None used directly in this document beyond what's captured in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, extends an already-verified Phase 1 stack
- Architecture (endpoint URLs, params, response shapes, timezone behavior): HIGH — directly verified against live production API this session, cross-checked across 5 distinct real requests including 3 different timezones
- Pitfalls: HIGH for the two new pitfalls identified this session (baseline data-leakage, stdDev=0 guard); MEDIUM for the inherited archive-lag pitfall's exact symptom (live behavior didn't reproduce the documented lag at test time, see Assumption A1)

**Research date:** 2026-07-14
**Valid until:** 30 days (stable, keyless public API; re-verify param/response shapes if Open-Meteo ships a breaking API change or if the archive-lag behavior noted in Assumption A1 needs re-confirming closer to implementation)
