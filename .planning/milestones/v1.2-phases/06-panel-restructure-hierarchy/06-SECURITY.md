---
phase: 06
slug: panel-restructure-hierarchy
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-22
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Built from artifacts (State B) — no prior SECURITY.md. Register assembled from the
`<threat_model>` blocks in 06-01/06-02/06-03/06-04-PLAN.md (all authored at plan
time). ASVS L1, block-on: high. All mitigations verified by L1 grep-depth checks
against the implementation; no open threats at or above the block threshold.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| authored copy → InfoTooltip popover DOM | Static explainer prose passed as `children` and rendered into a `role="dialog"` element (portaled to `document.body` since 06-04). Developer-authored, no user/network input. | Static developer text (no secrets, no user data) |
| reverse-geocode response → LocationDisplay DOM | Place name from external BigDataCloud reverse-geocode, rendered into the Location panel. | External string (untrusted) |
| Open-Meteo archive/forecast data → TrendRow / panel DOM | Historical/recent daily values + temperature/delta/verdict/z-score derived from external Open-Meteo responses (consumed upstream in App.tsx), rendered as chart marks / panel text. | External numeric/text (untrusted) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-06-01 | Tampering | InfoTooltip / PanelShell / PanelHeadline children rendering | low | mitigate | Children rendered as plain JSX text nodes only; no `dangerouslySetInnerHTML`. Verified: no raw-HTML sink in `src/`. | closed |
| T-06-02 | Denial of Service | InfoTooltip outside-click / Escape listeners | low | accept | Listeners attached only while open, removed on close/unmount. Below ASVS L1 high-block threshold. | closed |
| T-06-03 | Tampering | LocationDisplay place-name / coordinate rendering | low | mitigate | Place name + coordinates render as plain JSX text nodes only (T-01-02 invariant preserved through PanelShell migration). No raw-HTML sink. | closed |
| T-06-04 | Tampering | TrendRow state-copy + unchanged chart internals | low | mitigate | Static authored copy; chart values render through unchanged TrendDayChart SVG/text marks. No raw-HTML sink. | closed |
| T-06-05 | Tampering | CurrentConditionsPanel / DeltaPanel dynamic text (temp, delta, verdict, z-score) | low | mitigate | All dynamic values render as plain JSX text nodes only; no `dangerouslySetInnerHTML` in either panel. Verified by grep. | closed |
| T-06-06 | Information Disclosure | InfoTooltip explainer bodies | low | accept | Static, general, developer-authored methodology copy — no secrets/user/location-specific data. Below ASVS L1 high-block threshold. | closed |
| T-06-07 | Spoofing | Partial-reveal of temperature before anomaly resolves (gate drift) | medium | mitigate | Both panels + App.tsx route the loading gate through the single shared `isAnomalyReady` predicate (PD-10). Verified: no inline `=== 'resolved'` in panels/App code (only in explanatory comments); all sites call `isAnomalyReady()`. | closed |
| T-06-11-01 | Tampering (injection) | InfoTooltip popover body (portaled) | low | mitigate | `children` still rendered as plain JSX text nodes across the 06-04 portal relocation; no raw-HTML sink introduced. Verified by grep + existing test. | closed |
| T-06-11-02 | Denial of Service | outside-click / resize / scroll listeners | low | accept | Listeners attached only while open, removed on close/unmount; no amplification (same accepted surface as T-06-02). Below threshold. | closed |
| T-06-11-SC | Tampering (supply chain) | npm installs | n/a | accept | No new packages — `createPortal` ships with the already-present `react-dom` (^19.2.7). Package Legitimacy Gate not triggered. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above high count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-02 | Single lightweight disclosure; listeners scoped to open state. No realistic DoS surface in a client-only SPA. | jankounchained | 2026-07-22 |
| AR-06-02 | T-06-06 | Explainer bodies are static developer-authored methodology copy — no secrets or user data disclosed. | jankounchained | 2026-07-22 |
| AR-06-03 | T-06-11-02 | Resize/scroll/outside-click listeners scoped to open state; no amplification over the existing T-06-02 surface. | jankounchained | 2026-07-22 |
| AR-06-04 | T-06-11-SC | No new dependency installed; `createPortal` is part of the existing `react-dom`. | jankounchained | 2026-07-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-22 | 10 | 10 | 0 | gsd-secure-phase (L1 grep verification) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-22
