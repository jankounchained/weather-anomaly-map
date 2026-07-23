---
phase: 07
slug: methodology-section-explainers
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-23
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| already-fetched Open-Meteo data → derived percentile integer → DOM | Window samples come from the already-validated `baseline.daily` archive fetch and `today` from the already-validated current-weather fetch; the only value crossing into new render code is a clamped 1–99 integer. No user-supplied input reaches this phase's new code paths. | Clamped 1–99 integer (`computePercentileRank`) |
| (none) — MethodologyPanel | Methodology copy is 100% static/authored, compiled into the bundle. No data source, no user-supplied or per-location content, no network fetch. | None (static authored literals) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-01 | Tampering / Information Disclosure | `DeltaPanel` percentile `<p>` + `percentileLabel` | low | mitigate | Percentile rendered exclusively as an ordinary JSX text node (`DeltaPanel.tsx:101` `{percentileLabel(anomaly.percentile)}`) — no raw-HTML sink. Only dynamic value is a clamped 1–99 integer (`anomaly.ts:77` `Math.max(1, Math.min(99, Math.round(raw)))`). Preserves the T-01-02 / T-02-07 / T-06-05 JSX-text-node invariant (PD-08). | closed |
| T-07-02 | Tampering | `MethodologyPanel` static copy | low | mitigate | All methodology copy is authored string literals rendered as ordinary JSX text nodes — no raw-HTML sink (verified: no `dangerouslySetInnerHTML`/`innerHTML`/`eval` in `MethodologyPanel.tsx`). No dynamic, per-location, or user-supplied content (REQUIREMENTS.md Out of Scope). | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Package installs this phase:** none — no supply-chain (`T-07-SC`) threat surface.
**ASVS L1, block-on high:** no high-severity threats. Both low threats mitigated by the existing JSX-text-node rendering discipline. Register authored at plan time; L1 grep-depth verification sufficient (short-circuit rule).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-23 | 2 | 2 | 0 | gsd-secure-phase (Claude) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-23
