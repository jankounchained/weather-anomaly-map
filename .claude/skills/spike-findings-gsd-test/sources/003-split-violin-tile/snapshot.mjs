// Renders a self-contained static SVG of the 7-tile split-violin row from
// real Berlin data — the same geometry the page uses (violin.mjs), so the
// snapshot IS the spike output, not a mockup. Writes snapshot.svg.
import { buildViolinDay, sharedYDomain, makeYScale, N_MIN } from './violin.mjs'
import { mean } from './kde.mjs'
import { writeFileSync } from 'node:fs'

const HALF = 5, RS = 2021, RE = 2025, PS = 1996, PE = 2020
const TILE_W = 104, PLOT_H = 260, PAD_T = 14, PAD_B = 26, AXIS_W = 46
const CX = TILE_W / 2, MAX_HALF = TILE_W / 2 - 8
const BW = process.argv.includes('--shared') ? 'shared' : 'perHalf'
const THIN = process.argv.includes('--thin') ? 12 : 55 // force a rug row to snapshot the fallback

function wb(y, m, d, hw) { const sd = m === 2 && d === 29 ? 28 : d; const a = Date.UTC(y, m - 1, sd); return { start: new Date(a - hw * 864e5).toISOString().slice(0, 10), end: new Date(a + hw * 864e5).toISOString().slice(0, 10) } }
function ws(daily, m, d, y0, y1) { const r = []; for (let y = y0; y <= y1; y++) r.push(wb(y, m, d, HALF)); const o = []; for (let i = 0; i < daily.time.length; i++) { const v = daily.values[i]; if (v != null && r.some(x => daily.time[i] >= x.start && daily.time[i] <= x.end)) o.push(v) } return o }
function lookup(daily, iso) { const i = daily.time.indexOf(iso); return i >= 0 ? daily.values[i] : null }

const url = `https://archive-api.open-meteo.com/v1/archive?latitude=52.52&longitude=13.41&start_date=${PS}-01-01&end_date=${RE}-12-31&daily=temperature_2m_mean&timezone=auto`
const j = await (await fetch(url)).json()
const daily = { time: j.daily.time, values: j.daily.temperature_2m_mean }

const DAYS = []
for (let i = 6; i >= 0; i--) {
  const dt = new Date(Date.UTC(RE, 6, 23) - i * 864e5)
  const m = dt.getUTCMonth() + 1, d = dt.getUTCDate(), iso = dt.toISOString().slice(0, 10)
  let recent = ws(daily, m, d, RS, RE)
  if (THIN < 55) recent = recent.slice(0, THIN)
  DAYS.push({ iso, label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }), isToday: i === 0, recent, prior: ws(daily, m, d, PS, PE), actual: lookup(daily, iso) })
}

const [yMin, yMax] = sharedYDomain(DAYS)
const yScale = makeYScale(yMin, yMax, PAD_T, PLOT_H - PAD_T - PAD_B)
const totalW = AXIS_W + TILE_W * 7 + 20
const H = PLOT_H + 30

const C = { priorFill: 'rgba(124,134,152,0.28)', prior: '#7c8698', recentFill: 'rgba(249,115,22,0.32)', recent: '#f97316', meanPrior: '#cbd5e1', meanRecent: '#fed7aa', actual: '#ea580c' }

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${H}" viewBox="0 0 ${totalW} ${H}" font-family="system-ui,sans-serif"><rect width="${totalW}" height="${H}" fill="#0f1115"/>`
// axis
svg += `<text x="${AXIS_W - 8}" y="10" fill="#8b93a1" font-size="10" text-anchor="end">°C</text>`
for (let i = 0; i <= 6; i++) { const t = yMin + (yMax - yMin) * i / 6, yy = yScale(t); svg += `<line x1="${AXIS_W - 4}" y1="${yy.toFixed(1)}" x2="${totalW - 10}" y2="${yy.toFixed(1)}" stroke="#1c222c"/><text x="${AXIS_W - 8}" y="${(yy + 4).toFixed(1)}" fill="#6b7280" font-size="11" text-anchor="end">${t.toFixed(0)}°</text>` }

function half(geo, side, fill, stroke, meanColor) {
  let s = ''
  if (geo.kind === 'curve') s += `<path d="${geo.path}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
  else s += geo.points.map((p, i) => `<circle cx="${(side > 0 ? 0 : 0) + 0 + (0) + (0)}" cy="0" r="0"/>`).join('') // placeholder replaced below
  return s
}

let gaps = []
DAYS.forEach((d, idx) => {
  const ox = AXIS_W + idx * TILE_W
  const geo = buildViolinDay(d.recent, d.prior, { yMin, yMax, plotTop: PAD_T, plotHeight: PLOT_H - PAD_T - PAD_B, cx: CX, maxHalfWidth: MAX_HALF, bandwidthMode: BW })
  svg += `<g transform="translate(${ox},0)">`
  svg += `<line x1="${CX}" y1="${PAD_T}" x2="${CX}" y2="${PLOT_H - PAD_B}" stroke="#232a35"/>`
  for (const [g, side, fill, stroke, mc] of [[geo.prior, -1, C.priorFill, C.prior, C.meanPrior], [geo.recent, +1, C.recentFill, C.recent, C.meanRecent]]) {
    if (g.kind === 'curve') svg += `<path d="${g.path}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
    else svg += g.points.map((p, i) => `<circle cx="${(CX + side * (6 + (i % 3) * 5)).toFixed(1)}" cy="${p.y.toFixed(1)}" r="2" fill="${stroke}" opacity="0.55"/>`).join('')
    if (g.mean != null) { const my = yScale(g.mean); svg += `<line x1="${CX}" y1="${my.toFixed(1)}" x2="${(CX + side * MAX_HALF * 0.8).toFixed(1)}" y2="${my.toFixed(1)}" stroke="${mc}" stroke-width="2"/>` }
  }
  if (d.actual != null) { const ay = yScale(d.actual); svg += `<polygon points="${CX},${(ay - 5).toFixed(1)} ${CX + 5},${ay.toFixed(1)} ${CX},${(ay + 5).toFixed(1)} ${CX - 5},${ay.toFixed(1)}" fill="${C.actual}" stroke="#fff" stroke-width="1"/>` }
  svg += `<text x="${CX}" y="${PLOT_H + 14}" fill="${d.isToday ? '#e7e9ee' : '#8b93a1'}" font-size="11" text-anchor="middle" ${d.isToday ? 'font-weight="600"' : ''}>${d.isToday ? 'Today' : d.label}</text>`
  svg += `</g>`
  if (geo.prior.mean != null && geo.recent.mean != null) gaps.push(geo.recent.mean - geo.prior.mean)
})
svg += `</svg>`
writeFileSync(new URL('./snapshot.svg', import.meta.url), svg)
console.log(`snapshot.svg written — bandwidth=${BW}, recent n=${THIN}, mean-gap avg ${gaps.length ? (mean(gaps) >= 0 ? '+' : '') + mean(gaps).toFixed(2) + '°C' : 'n/a'}, yDomain ${yMin.toFixed(1)}…${yMax.toFixed(1)}`)
