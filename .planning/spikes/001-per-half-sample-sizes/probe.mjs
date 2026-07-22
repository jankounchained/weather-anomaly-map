// Spike 001 — per-half sample-size reconnaissance.
//
// Question: when the SAME 30-year Open-Meteo archive series is split into a
// recent-5yr half and a prior-25yr half using the app's real ±5-day
// day-of-year window, what are the ACTUAL per-half sample counts across
// diverse latitudes — and does the recent half ever realistically fall
// below the ~15-20 curve-vs-rug floor (PD-04 gate 2)?
//
// Ports the app's windowing (filterDayOfYearWindow / windowBounds) verbatim
// so the numbers match what computeTrendDay will really see. No deps; run:
//   node probe.mjs [--json]

// --- recent/prior split (locked 5/25 per roadmap/backlog provenance) -------
const RECENT_YEARS = 5
const PRIOR_YEARS = 25
const TOTAL_YEARS = RECENT_YEARS + PRIOR_YEARS // 30
const HALF_WIDTH_DAYS = 5 // ±5 → 11 calendar days/year (matches anomaly.ts)

// "recent = last 5 COMPLETE years; prior = the 25 before that." Anchored to
// the most recent complete calendar year (today is mid-2026 → 2025 complete).
const LAST_COMPLETE_YEAR = 2025
const RECENT_START = LAST_COMPLETE_YEAR - RECENT_YEARS + 1 // 2021
const RECENT_END = LAST_COMPLETE_YEAR // 2025
const PRIOR_END = RECENT_START - 1 // 2020
const PRIOR_START = PRIOR_END - PRIOR_YEARS + 1 // 1996
const ARCHIVE_START = `${PRIOR_START}-01-01`
const ARCHIVE_END = `${RECENT_END}-12-31`

// Diverse locations chosen to stress the sample-size claim across latitude
// bands and land/ocean/ice regimes (RESEARCH.md Pitfall 1: does ocean/desert
// read as a data desert?).
const LOCATIONS = [
  { name: 'Berlin (mid-lat land)', lat: 52.52, lon: 13.41 },
  { name: 'Singapore (equatorial)', lat: 1.35, lon: 103.82 },
  { name: 'Reykjavík (subarctic maritime)', lat: 64.15, lon: -21.94 },
  { name: 'Longyearbyen, Svalbard (high Arctic)', lat: 78.22, lon: 15.63 },
  { name: 'Sahara interior (hot desert)', lat: 23.42, lon: 25.0 },
  { name: 'Mid-Pacific open ocean', lat: 0.0, lon: -140.0 },
  { name: 'McMurdo, Antarctica', lat: -77.85, lon: 166.67 },
]

// --- ported windowing (mirrors src/anomaly/anomaly.ts) ---------------------
function windowBounds(year, month, day, halfWidthDays) {
  const safeDay = month === 2 && day === 29 ? 28 : day
  const anchor = Date.UTC(year, month - 1, safeDay)
  const start = new Date(anchor - halfWidthDays * 86_400_000)
  const end = new Date(anchor + halfWidthDays * 86_400_000)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

function filterDayOfYearWindow(daily, targetMonth, targetDay, startYear, endYear, halfWidthDays = HALF_WIDTH_DAYS) {
  const ranges = []
  for (let y = startYear; y <= endYear; y++) ranges.push(windowBounds(y, targetMonth, targetDay, halfWidthDays))
  const out = []
  for (let i = 0; i < daily.time.length; i++) {
    const t = daily.time[i]
    const v = daily.values[i]
    if (v != null && ranges.some((r) => t >= r.start && t <= r.end)) out.push(v)
  }
  return out
}

async function fetchArchive(lat, lon) {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${ARCHIVE_START}&end_date=${ARCHIVE_END}` +
    `&daily=temperature_2m_mean&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${lat},${lon}`)
  const json = await res.json()
  return { time: json.daily.time, values: json.daily.temperature_2m_mean }
}

// Last 7 calendar days ending today (the tiles the real trend row renders).
function lastSevenDates() {
  const dates = []
  const now = new Date('2026-07-23T00:00:00Z')
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    dates.push({ month: d.getUTCMonth() + 1, day: d.getUTCDate(), iso: d.toISOString().slice(0, 10) })
  }
  return dates
}

async function main() {
  const asJson = process.argv.includes('--json')
  const dates = lastSevenDates()
  const report = []

  for (const loc of LOCATIONS) {
    let daily
    try {
      daily = await fetchArchive(loc.lat, loc.lon)
    } catch (e) {
      report.push({ location: loc.name, error: String(e.message) })
      continue
    }
    const nonNull = daily.values.filter((v) => v != null).length
    const perDay = dates.map((dt) => {
      const recent = filterDayOfYearWindow(daily, dt.month, dt.day, RECENT_START, RECENT_END)
      const prior = filterDayOfYearWindow(daily, dt.month, dt.day, PRIOR_START, PRIOR_END)
      return { date: dt.iso, nRecent: recent.length, nPrior: prior.length }
    })
    report.push({
      location: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      totalDays: daily.time.length,
      nonNullDays: nonNull,
      coverage: `${((nonNull / daily.time.length) * 100).toFixed(1)}%`,
      perDay,
      minRecent: Math.min(...perDay.map((d) => d.nRecent)),
      maxRecent: Math.max(...perDay.map((d) => d.nRecent)),
      minPrior: Math.min(...perDay.map((d) => d.nPrior)),
      maxPrior: Math.max(...perDay.map((d) => d.nPrior)),
    })
  }

  if (asJson) {
    console.log(JSON.stringify({ meta: { RECENT_START, RECENT_END, PRIOR_START, PRIOR_END, HALF_WIDTH_DAYS }, report }, null, 2))
    return
  }

  console.log(`\nSpike 001 — per-half sample sizes (±${HALF_WIDTH_DAYS}-day window)`)
  console.log(`recent = ${RECENT_START}–${RECENT_END} (${RECENT_YEARS}yr) · prior = ${PRIOR_START}–${PRIOR_END} (${PRIOR_YEARS}yr)`)
  console.log(`theoretical max per half: recent ${RECENT_YEARS * 11}, prior ${PRIOR_YEARS * 11}\n`)
  for (const r of report) {
    if (r.error) { console.log(`✗ ${r.location}: ${r.error}\n`); continue }
    console.log(`◆ ${r.location}  [${r.lat}, ${r.lon}]  coverage ${r.coverage} (${r.nonNullDays}/${r.totalDays})`)
    console.log(`  recent n: ${r.minRecent}–${r.maxRecent}   prior n: ${r.minPrior}–${r.maxPrior}`)
    const flag = r.minRecent < 20 ? '  ⚠ recent half dips below 20' : '  ✓ recent half ≥ 20 every day'
    console.log(flag + '\n')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
