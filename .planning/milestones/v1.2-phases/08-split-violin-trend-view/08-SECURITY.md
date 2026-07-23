---
phase: 08
slug: split-violin-trend-view
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-23
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Open-Meteo archive → client | Already-fetched `baseline.daily` values re-windowed client-side; no new ingress this phase | Numbers / nulls (non-sensitive public climate data) |
| pure math → geometry | `kde.ts` outputs shaped into SVG path strings / pixel points in `trend.ts` | Finite numbers (densities, coordinates) |
| geometry → SVG render | `ViolinHalf` paths/points + formatted temperature strings become DOM SVG marks and `<title>` text | Numeric `d` attributes + formatted temperature strings |
| render → user (DOM) | Tooltip / label / legend strings are the only dynamic text surface | Static copy + rounded/guarded numeric strings |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-01 | Tampering / DoS | `silvermanBandwidth` / `kdeAt` on degenerate input (n<2, all-equal, empty) | medium | mitigate | `kde.ts`: `n<2 → 1e-6`, `h>0 ? h : 1e-6`, `kdeAt` returns 0 when `n===0 \|\| h<=0` — never NaN/Infinity/throw; unit-tested | closed |
| T-08-02 | Information disclosure | none — stateless SPA, no user data / secrets / persistence | low | accept | No PII or credentials in scope (see Accepted Risks) | closed |
| T-08-03 | Tampering | `buildViolinPaths` density normalization (divide by `sharedMax`) | medium | mitigate | `trend.ts:172` `... \|\| 1` guard prevents divide-by-zero; densities are finite (T-08-01 guards); unit-tested | closed |
| T-08-04 | Spoofing (visual misrepresentation) | per-half vs pooled bandwidth choice | medium | mitigate | ONE shared pooled Silverman bandwidth `h` (`trend.ts:151`); mirror-symmetry tests assert shape reflects data, not sample-size artifact | closed |
| T-08-05 | Tampering (malformed DOM) | temperature formatting (NaN/undefined into `<title>`) | medium | mitigate | `TrendDayChart.tsx:98` `!Number.isFinite(value) → '—°'`; tests assert no `<title>` contains "NaN"/"undefined" | closed |
| T-08-06 | DoS (render throw) | `buildViolinPaths` on empty/degenerate half under jsdom | low | mitigate | Finite-density guards (T-08-01/03) + rug fallback for n<20; explicit width/height (no ResizeObserver) | closed |
| T-03-07 | Injection (raw-HTML sink) | violin/mean-tick/diamond `<title>` tooltips, legend labels + swatches | high | mitigate | Zero raw-HTML sinks in `src/` (grep-verified); every dynamic string is a JSX text node / native SVG `<title>`; `TrendLegend`/`DeltaPanel` tests assert no `dangerouslySetInnerHTML` | closed |
| T-08-07 | Repudiation (unauthorized copy change) | final legend wording | low | mitigate | PD-10 blocking reviewer checkpoint recorded explicit sign-off; legend recolor/copy landed via tracked commits (quick-260723-ju7) | closed |
| T-08-SC | Tampering (supply chain) | npm installs | low | accept | No new packages added — KDE/statistics, violin geometry, and SVG swatches hand-rolled per CLAUDE.md (see Accepted Risks) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-01 | T-08-02 | Stateless SPA with no accounts, no server-side persistence, no secrets — no information-disclosure surface exists (per PROJECT.md scope). | jankounchained | 2026-07-23 |
| AR-08-02 | T-08-SC | No new dependencies introduced this phase; KDE/statistics + violin geometry + SVG swatches are hand-rolled per CLAUDE.md ("hand-roll, don't add a dependency"), so no new supply-chain surface. | jankounchained | 2026-07-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-23 | 9 | 9 | 0 | gsd-secure-phase (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-23
