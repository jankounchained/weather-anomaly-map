# Phase 1: Location Picker & Shareable Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 1-Location Picker & Shareable Shell
**Areas discussed:** Reverse geocoding provider, Tile provider & attribution, Initial map state & pin interaction, Deployment target & URL shareability

---

## Reverse Geocoding Provider

| Option | Description | Selected |
|--------|-------------|----------|
| BigDataCloud client-side reverse geocode | Free, keyless, CORS-enabled, purpose-built for browser-only reverse lookups | ✓ |
| Nominatim (OpenStreetMap) reverse endpoint | Free, but usage policy discourages heavy client-side/production use | |
| Open-Meteo Geocoding API | Single-provider consistency, but reverse support unverified (primarily forward search) | |

**User's choice:** BigDataCloud client-side reverse geocode
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Short timeout (~3s), then show coordinates | Keeps app feeling instant, never blocks on a third-party service | ✓ |
| Wait indefinitely with a loading spinner | Simpler but risks a stuck-feeling UI | |

**User's choice:** Short timeout (~3s), then show coordinates
**Notes:** None

---

## Tile Provider & Attribution

| Option | Description | Selected |
|--------|-------------|----------|
| CARTO free raster tiles | Free for low-traffic use, minimal styling, avoids OSM bare-tile-usage risk | ✓ |
| Stadia Maps free tier | Free-friendly but requires API key/domain allowlist registration | |
| Raw OpenStreetMap tile servers | Simplest, but OSM policy discourages direct production use | |

**User's choice:** CARTO free raster tiles
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Leaflet attribution control (bottom-right) | Expected convention, satisfies attribution requirement with no custom work | ✓ |
| Custom-styled attribution bar | More design control, but unnecessary v1 work | |

**User's choice:** Standard Leaflet attribution control (bottom-right)
**Notes:** None

---

## Initial Map State & Pin Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Last-used location from localStorage, else a default center | Matches "recurring check of a go-to location" usage pattern | |
| Always a fixed default center (e.g. world view) | Simpler, no localStorage read needed | ✓ |
| Blank/empty state prompting the user to click the map | Cleanest but slower for repeat-user case | |

**User's choice:** Always a fixed default center
**Notes:** User chose the simpler fixed-default approach over the recommended localStorage-recall option.

| Option | Description | Selected |
|--------|-------------|----------|
| Click anywhere to place, then drag to fine-tune | Matches LOC-01 wording, covers fast pick + precise adjustment | ✓ |
| Click only (no drag-to-adjust) | Simpler but less forgiving | |

**User's choice:** Click anywhere to place, then drag to fine-tune
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — smoothly recenter and zoom in on pick | Clear visual confirmation of selection | |
| No — keep the current map view unchanged | Less motion/disruption | ✓ |

**User's choice:** No — keep the current map view unchanged
**Notes:** User chose against the recommended auto-zoom-on-pick behavior.

| Option | Description | Selected |
|--------|-------------|----------|
| World view (zoomed out, no specific city) | Neutral, doesn't favor any region | |
| A specific starting city/region | Friendlier, more zoomed-in starting point | ✓ |

**User's choice:** A specific starting city/region

| Option | Description | Selected |
|--------|-------------|----------|
| London, UK | Neutral, well-known global reference point | |
| New York City, USA | Common neutral default | |
| Other (free text) | — | ✓ |

**User's choice:** Czech Republic (free text)
**Notes:** User specified a custom default region not among the presented city options.

---

## Deployment Target & URL Shareability

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare Pages | Most generous free tier, explicit commercial-use allowance | ✓ |
| Netlify | Equally viable, slightly less generous limits | |

**User's choice:** Cloudflare Pages
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Lat/lng only, e.g. ?lat=&lng= | Minimal, place name re-derived on load | |
| Lat/lng + zoom level, e.g. ?lat=&lng=&zoom= | Reproduces exact shared zoom, slightly longer URL | ✓ |

**User's choice:** Lat/lng + zoom level
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 4 decimal places (~11m precision) | Sufficient precision, clean URLs | ✓ |
| 6 decimal places (~11cm precision) | Full click-precision, longer URL, no real benefit | |

**User's choice:** 4 decimal places (~11m precision)
**Notes:** None

---

## Claude's Discretion

- Exact wording/styling of the loading/fallback state during the geocoding timeout
- Exact default zoom level to pair with the Czech Republic default center
- Component/file structure for the map, pin, and URL-sync logic

## Deferred Ideas

None — discussion stayed within phase scope.
