# Phase 1: Location Picker & Shareable Shell - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can pick any location on an interactive map (click or drag a pin), see it identified by a reverse-geocoded place name (falling back to coordinates on failure), and share that exact view via URL. The app is publicly reachable, free to host, and requires no login. This phase delivers the shareable foundation everything else builds on — no weather/anomaly data is fetched or displayed yet.

</domain>

<decisions>
## Implementation Decisions

### Reverse Geocoding
- **D-01:** Use BigDataCloud's client-side reverse geocode endpoint (free, keyless, CORS-enabled, purpose-built for browser-only reverse lookups) — chosen over Nominatim (usage policy discourages "heavy" client-side/production use without self-hosting) and Open-Meteo's geocoding API (unverified reverse support, primarily a forward name-search endpoint).
- **D-02:** On geocoding failure or slow response, wait a short timeout (~3s) then fall back to showing raw coordinates (per LOC-02). Do not block the UI on an indefinite spinner.

### Map Tiles & Attribution
- **D-03:** Use CARTO's free raster tile set as the basemap — free for this app's traffic level, minimal styling fits a data-focused dashboard, avoids the bare-OSM-tile-usage-policy risk flagged in research.
- **D-04:** Show attribution via Leaflet's standard built-in attribution control (bottom-right corner) — satisfies CARTO's attribution requirement with no custom UI work.

### Initial Map State & Pin Interaction
- **D-05:** On first load (and on every subsequent load — no "last used" persistence for this phase), the map always centers on a fixed default: **Czech Republic**. No localStorage-based "last location" recall in this phase.
- **D-06:** Pin placement is click-anywhere-to-place, then drag-to-adjust — matches LOC-01's "clicking or dragging" wording, covering both fast pick and precise adjustment.
- **D-07:** After a pin is placed, the map does NOT auto-zoom or recenter — the current view stays as-is. This is a deliberate choice against the initially-recommended auto-zoom-on-pick behavior.

### Deployment & URL Shareability
- **D-08:** Deploy to Cloudflare Pages (most generous free tier, explicit commercial-use allowance, matches STACK.md recommendation).
- **D-09:** The shareable URL encodes lat, lng, AND the current map zoom level (e.g. `?lat=&lng=&zoom=`) — so a shared link reproduces both the picked location and the sharer's zoomed view, not just the coordinates.
- **D-10:** Lat/lng in the URL are rounded to 4 decimal places (~11m precision) — far more precision than the weather use case needs, keeps URLs clean, and aligns with the rounding precision research recommended for the future localStorage baseline-cache key (Phase 2+).

### Claude's Discretion
- Exact wording/styling of the loading/fallback state during the geocoding timeout.
- Exact default zoom level to pair with the Czech Republic default center.
- Component/file structure for the map, pin, and URL-sync logic (implementation detail, not a user-facing decision).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — core value, constraints, out-of-scope list
- `.planning/REQUIREMENTS.md` — LOC-01, LOC-02, LOC-03, PLAT-01, PLAT-02 (this phase's requirements)
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria

### Research (informs this phase's implementation choices)
- `.planning/research/SUMMARY.md` — flagged reverse-geocoding provider and tile-provider as open gaps for Phase 1 planning; both resolved in this discussion (D-01, D-03)
- `.planning/research/ARCHITECTURE.md` — Map + Pin Picker component owning selected-location state, synced to URL as single source of truth
- `.planning/research/PITFALLS.md` — pitfall #7 (bare OSM tile attribution/policy risk), addressed by D-03/D-04
- `.planning/research/STACK.md` — react-leaflet 5 + Leaflet 1.9.4, Cloudflare Pages hosting recommendation (confirmed in D-08)

</canonical_refs>

<code_context>
## Existing Code Insights

This is a greenfield project — no application code exists yet (repo contains only `.planning/` and tooling config). No reusable assets, established patterns, or integration points to note. This phase establishes the first code in the repo.

</code_context>

<specifics>
## Specific Ideas

- Default map center is explicitly **Czech Republic** — not a generic "world view" or another city. Use a reasonable default zoom level that frames the country (Claude's discretion on exact zoom value).
- No auto-zoom/recenter animation on pin placement — keep this interaction quiet/minimal per D-07.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Address-search/text-input for location picking was considered but not raised as scope creep since LOC-01 explicitly scopes location picking to map click/drag only; a search box would be a new capability for a future phase if desired.)

</deferred>

---

*Phase: 1-Location Picker & Shareable Shell*
*Context gathered: 2026-07-13*
