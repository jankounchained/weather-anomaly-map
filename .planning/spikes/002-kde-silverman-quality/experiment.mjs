// Spike 002 — quantitative KDE quality + n_min thinning sweep on REAL data.
//
// Two questions:
//   (a) At the recent half's real n≈55, does Silverman produce a believable
//       (~unimodal, non-lumpy) curve?
//   (b) Thin the sample 55→…→5 and find where the curve stops being a
//       trustworthy density — that pins the per-half n_min curve-vs-rug floor.
//
// Because spike 001 proved real halves are never sparse, we MUST synthesize
// sparsity by random subsampling. To avoid one lucky/unlucky draw we average
// mode-count over many random subsamples at each n.

import { silvermanBandwidth, kdeCurve, countModes, stdDev, mean } from './kde.mjs'

const HALF = 5, RECENT_START = 2021, RECENT_END = 2025, PRIOR_START = 1996, PRIOR_END = 2020
const TRIALS = 200 // random subsamples averaged per n

// A few climatically different locations so the finding isn't Berlin-specific.
const LOCATIONS = [
  { name: 'Berlin', lat: 52.52, lon: 13.41 },      // strong seasonal, wide spread
  { name: 'Singapore', lat: 1.35, lon: 103.82 },   // tight, low-variance tropical
  { name: 'Reykjavík', lat: 64.15, lon: -21.94 },  // maritime, moderate
]
const TARGET = { month: 7, day: 23 } // one representative day

function windowBounds(year, month, day, hw) {
  const safeDay = month === 2 && day === 29 ? 28 : day
  const anchor = Date.UTC(year, month - 1, safeDay)
  const s = new Date(anchor - hw * 86400000), e = new Date(anchor + hw * 86400000)
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) }
}
function windowSamples(daily, m, d, y0, y1) {
  const ranges = []
  for (let y = y0; y <= y1; y++) ranges.push(windowBounds(y, m, d, HALF))
  const out = []
  for (let i = 0; i < daily.time.length; i++) {
    const v = daily.values[i]
    if (v != null && ranges.some(r => daily.time[i] >= r.start && daily.time[i] <= r.end)) out.push(v)
  }
  return out
}
async function fetchArchive(lat, lon) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${PRIOR_START}-01-01&end_date=${RECENT_END}-12-31&daily=temperature_2m_mean&timezone=auto`
  const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status)
  const j = await r.json()
  return { time: j.daily.time, values: j.daily.temperature_2m_mean }
}
function sample(xs, k) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]] }
  return a.slice(0, k)
}

// Normalized L1 distance between two density curves (same grid), expressed as
// a % of the reference curve's total mass. This is the "reliability" metric:
// how far does an n-sample KDE stray from the true (full-pool) distribution
// it is trying to depict? Pure sampling noise — the controlled quantity.
function curveError(curve, refCurve) {
  let diff = 0, refMass = 0
  for (let i = 0; i < curve.length; i++) {
    diff += Math.abs(curve[i].density - refCurve[i].density)
    refMass += refCurve[i].density
  }
  return (diff / refMass) * 100
}

async function main() {
  const ns = [275, 55, 40, 30, 25, 20, 18, 15, 12, 10, 8, 5]
  for (const loc of LOCATIONS) {
    const daily = await fetchArchive(loc.lat, loc.lon)
    const full = windowSamples(daily, TARGET.month, TARGET.day, PRIOR_START, RECENT_END) // 30yr pool
    const dMin = Math.min(...full), dMax = Math.max(...full)
    const pad = (dMax - dMin) * 0.15
    const lo = dMin - pad, hi = dMax + pad
    // Reference "truth" = KDE of the entire pool.
    const refCurve = kdeCurve(full, silvermanBandwidth(full), lo, hi, 128)

    console.log(`\n◆ ${loc.name}  (day 07-23, pool n=${full.length}, spread ${dMin.toFixed(1)}…${dMax.toFixed(1)}°C, σ=${stdDev(full).toFixed(2)})`)
    console.log('    n   avg_h   err_vs_truth   note')
    for (const n of ns) {
      if (n > full.length) continue
      let sumH = 0, sumErr = 0
      for (let t = 0; t < TRIALS; t++) {
        const s = sample(full, n)
        const h = silvermanBandwidth(s)
        const curve = kdeCurve(s, h, lo, hi, 128)
        sumH += h; sumErr += curveError(curve, refCurve)
      }
      const avgH = sumH / TRIALS, avgErr = sumErr / TRIALS
      let note = ''
      if (n === 275) note = 'prior-half regime (truth)'
      else if (n === 55) note = 'recent-half regime ← real n'
      else if (avgErr <= 15) note = 'reliable curve'
      else if (avgErr <= 22) note = 'borderline'
      else note = 'unreliable → degrade to rug'
      console.log(`  ${String(n).padStart(3)}   ${avgH.toFixed(2).padStart(5)}       ${avgErr.toFixed(1).padStart(4)}%     ${note}`)
    }
  }
  console.log('\n(err_vs_truth = mean normalized L1 distance of an n-sample KDE from the full-pool')
  console.log(' KDE, over ' + TRIALS + ' random draws — pure sampling noise; lower = more trustworthy.)')
}
main().catch(e => { console.error(e); process.exit(1) })
