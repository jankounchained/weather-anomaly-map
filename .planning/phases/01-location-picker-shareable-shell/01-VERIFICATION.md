---
phase: 01-location-picker-shareable-shell
verified: 2026-07-14T09:35:00Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 11/12
  gaps_closed:
    - "Shared URL reproduces the exact same location for anyone, on the actual live public app (LOC-03 end-to-end, PLAT-01) — the CR-01 fix has now been pushed to origin/main and Cloudflare's git-connected auto-deploy has shipped it: the live URL's served JS bundle (assets/index-CIwwHWGB.js) is byte-for-byte identical (matching sha256) to a fresh local `npm run build` of the current working tree"
  gaps_remaining: []
  regressions: []
---

# Phase 1: Location Picker & Shareable Shell Verification Report (Re-verification)

**Phase Goal:** Users can pick any location on an interactive map, see it identified by place name, and share that exact view via URL — with the app publicly reachable, free to host, and requiring no login.
**Verified:** 2026-07-14T09:35:00Z
**Status:** passed
**Re-verification:** Yes — after confirming the local fix from gap-closure plan 01-04 was pushed to origin and deployed to production

## Summary

The prior verification pass (recorded in this file's previous revision) found 11/12 must-haves genuinely fixed at the code level but flagged one real production gap: the CR-01 fix existed only in the local working tree — local `main` was 10 commits ahead of `origin/main`, so the live Cloudflare deployment was still serving a pre-fix bundle.

Since then, `git push origin main` shipped commits `891195a..6353c33` (10 commits, including all of Plan 01-04's fix commits and the code-review commit). This re-verification independently re-confirms, rather than trusts, that the push closed the gap:

- `git rev-list --left-right --count main...origin/main` → `0	0` — local `main` and `origin/main` are now identical (HEAD `6353c33` on both).
- A fresh `npm run build` in the current working tree produces `dist/assets/index-CIwwHWGB.js` and `dist/assets/index-Bvr-vwSJ.css`.
- `curl`-fetching the live production HTML (`https://weather-anomaly-map.honza-anfas.workers.dev/`) references the identical asset filenames: `assets/index-CIwwHWGB.js`, `assets/index-Bvr-vwSJ.css`.
- Downloading the live `index-CIwwHWGB.js` and comparing its sha256 against the fresh local build's `dist/assets/index-CIwwHWGB.js` shows they are **byte-for-byte identical** (`8f577d2273431567f15b2a2cf7b10c62efb470b186e6e749f7c518ea98f2ed14` on both sides). This is direct proof the deployed bundle is the exact fixed build, not just a hash-name coincidence.
- `cf-cache-status: HIT` on the live response confirms Cloudflare's edge is serving this exact (fresh) asset, not an intermediate stale cache.

The underlying code fix was also re-read directly (not re-trusted from the prior report or from SUMMARY.md): `src/map/useSelectedLocation.ts`'s `setLocation` still computes `clampLat(round4(lat))` and `round4(wrapLng(lng))` before both the URL write and the state update, with the side effect outside the state updater; `src/lib/coords.ts`'s `wrapLng` still performs the cyclic (non-clamping) wrap; `App.tsx` still uses `isValidUrlSelection` as its `hasSelection` initializer; `useReverseGeocode.ts` still types its parsed response as `ReverseGeocodeResult`; `index.css` still documents `--color-destructive` as a reserved token. All automated checks were re-run fresh in this session: `npx tsc --noEmit` (exit 0, TS 6.0.3), `npm run lint` (exit 0), `npm run build` (exit 0), `npx vitest run` (3 files, 38/38 tests passed). No debt markers (`TBD`/`FIXME`/`XXX`) or `dangerouslySetInnerHTML`/`innerHTML` usage found anywhere in `src/`. No `functions/` directory or `dist/_redirects` exists (still a pure static SPA, PLAT-02).

All 12 must-haves from the original goal-backward derivation now hold, including the one previously-failing production-freshness truth. Phase 1's goal — pick a location, see its place name, share the exact view via a public, login-free, free-hosted URL — is achieved end-to-end in the live, deployed application.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can select a location by clicking or dragging a pin on an interactive map (LOC-01) | ✓ VERIFIED (regression check) | `src/map/MapView.tsx` ClickHandler + DraggablePin unchanged since Plan 01-01 (`git log` shows no commits touching this file since `d3c012c`); still wired to `setLocation` |
| 2 | Map uses CARTO tiles + verbatim attribution, centers on Czech Republic default, never auto-recenters | ✓ VERIFIED (regression check) | `src/map/MapView.tsx` unchanged; Plan 01-04 explicitly scoped "Do NOT modify MapView.tsx" |
| 3 | Panel resolves the reverse-geocoded place name after a pin is placed (LOC-02) | ✓ VERIFIED (regression check) | `src/geocoding/useReverseGeocode.ts` fallback/status logic unchanged; response now typed (`ReverseGeocodeResult`) but same fields read |
| 4 | Geocode failure/non-2xx/timeout falls back silently to coordinates | ✓ VERIFIED (regression check) | `reverseGeocode()` still returns `null` on `!res.ok`, network error, or abort/timeout; `LocationPanel` renders coordinate fallback when `name` is null |
| 5 | Geocoded place-name text renders safely as plain text | ✓ VERIFIED | `grep -rn "dangerouslySetInnerHTML\|innerHTML" src/` — no matches (re-confirmed this session) |
| 6 | Selected lat/lng/zoom are encoded in the URL, rounded to 4 decimals, reload-reproducible for valid inputs | ✓ VERIFIED | `readLocationFromUrl`/`writeLocationToUrl` round-trip tests pass (part of the 38/38 green suite) |
| 7 | **Shared URL reproduces the same location for anyone, including reachable edge-case interactions, on the live production app (LOC-03 end-to-end, PLAT-01)** | ✓ VERIFIED (gap closed) | Code re-read directly: `src/map/useSelectedLocation.ts:132-145` computes `clampLat(round4(lat))`/`round4(wrapLng(lng))` before every write; 3 renderHook tests exercise this exact path and pass. **Deployment freshness independently re-confirmed**: `git rev-list --left-right --count main...origin/main` → `0 0`; live bundle `assets/index-CIwwHWGB.js` downloaded and sha256-compared byte-for-byte identical to the current local `npm run build` output |
| 8 | Malformed/out-of-range lat/lng/zoom on load fall back to default | ✓ VERIFIED | `isValidUrlSelection` shares `parseGuarded` with `readLocationFromUrl`; `App.tsx` uses `useState(isValidUrlSelection)` as its `hasSelection` initializer (re-read directly, line 17) |
| 9 | TypeScript pinned to 6.0.3 | ✓ VERIFIED | `npx tsc --version` → `Version 6.0.3` (re-run this session) |
| 10 | App is live on a public Cloudflare URL, no account/login required (PLAT-01) | ✓ VERIFIED | `curl -s -o /dev/null -w "%{http_code}"` → `200` (re-run this session); no login/auth wall in HTML |
| 11 | Production build emits a static `dist/` with no backend/serverless tier (PLAT-02) | ✓ VERIFIED | `npm run build` exits 0; no `functions/` dir, no `dist/_redirects` (re-checked this session) |
| 12 | Deploy configuration documented in README | ✓ VERIFIED | `README.md` "## Deployment" section present and describes the Cloudflare Pages static-SPA setup |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/coords.ts` | `wrapLng(lng)` cyclic normalizer | ✓ VERIFIED | Re-read: present with in-range short-circuit to avoid float drift; matches CR-01 rationale |
| `src/map/useSelectedLocation.ts` | `setLocation` clamps lat / wraps lng before write; side effect outside updater; `isValidUrlSelection` exported | ✓ VERIFIED | Re-read lines 86-93 (`isValidUrlSelection`), 132-145 (`setLocation`) — all present and correct |
| `src/map/useSelectedLocation.test.ts` | renderHook coverage of setLocation clamp/wrap + isValidUrlSelection cases | ✓ VERIFIED | `npx vitest run` includes this file; 38/38 tests pass overall |
| `src/app/App.tsx` | `hasUrlSelection` replaced by `isValidUrlSelection` | ✓ VERIFIED | Re-read: import present (line 4), `useState(isValidUrlSelection)` (line 17), no local key-presence function remains |
| `src/geocoding/useReverseGeocode.ts` | Typed geocode response (`ReverseGeocodeResult`) | ✓ VERIFIED | Re-read line 38: `(await res.json()) as ReverseGeocodeResult` |
| `src/index.css` | `--color-destructive` documented as reserved | ✓ VERIFIED | `grep -n "reserved" src/index.css` → line 15 match |
| `package.json` | `@testing-library/react` dev dependency | ✓ VERIFIED | `"@testing-library/react": "^16.3.2"` present in devDependencies; no runtime/bundle dependency added |
| Vitest suite | All passing | ✓ VERIFIED | `npx vitest run` → 3 files, 38/38 tests pass (re-run this session) |
| Live public URL | Reachable, no login | ✓ VERIFIED | HTTP 200 (re-run this session) |
| **Live public URL — content freshness** | Must serve the CR-01-fixed build | ✓ **VERIFIED (gap closed)** | Live `assets/index-CIwwHWGB.js` sha256 `8f577d2273431567f15b2a2cf7b10c62efb470b186e6e749f7c518ea98f2ed14` matches a fresh local `npm run build`'s `dist/assets/index-CIwwHWGB.js` sha256 exactly — byte-for-byte identical, not just matching filenames |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `setLocation` | `writeLocationToUrl` + state | `clampLat(round4(lat))`/`round4(wrapLng(lng))` computed, then write, then state update — outside the updater | ✓ WIRED | Re-confirmed lines 132-145; renderHook-tested |
| `App.tsx` `hasSelection` init | `isValidUrlSelection` | `useState(isValidUrlSelection)` | ✓ WIRED | Re-confirmed line 17 |
| `readLocationFromUrl` / `isValidUrlSelection` | shared `parseGuarded` | Both call the same per-field validator | ✓ WIRED | Re-confirmed — no duplicated numeric logic |
| Local git history | `origin/main` / Cloudflare auto-deploy | `git push` (already executed with explicit user approval between verification passes) | ✓ **WIRED (gap closed)** | `git rev-list --left-right --count main...origin/main` → `0 0`; both HEAD `6353c33`. Cloudflare's git-connected auto-deploy picked up the push and shipped the fix — confirmed by byte-identical live bundle, not by trusting the deploy log |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript pinned to 6.0.3 | `npx tsc --version` | `Version 6.0.3` | ✓ PASS |
| Type-check clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Production build clean | `npm run build` | exit 0 | ✓ PASS |
| Lint clean | `npm run lint` | exit 0 | ✓ PASS |
| Unit test suite | `npx vitest run` | 3 files, 38/38 tests passed | ✓ PASS |
| Local repo in sync with remote | `git rev-list --left-right --count main...origin/main` | `0	0` | ✓ PASS (was `[ahead 10]` in prior verification) |
| Live bundle content-identical to fresh local build | sha256 of downloaded live `index-CIwwHWGB.js` vs. local `dist/assets/index-CIwwHWGB.js` | Both `8f577d2273431567f15b2a2cf7b10c62efb470b186e6e749f7c518ea98f2ed14` | ✓ PASS (was FAIL — hash mismatch — in prior verification) |
| Live HTML references fixed-build asset names | `curl` live URL, grep `assets/index-*.js/css` | `index-CIwwHWGB.js`, `index-Bvr-vwSJ.css` (matches local build output) | ✓ PASS |
| Live app reachable | `curl -s -o /dev/null -w "%{http_code}"` | `200` | ✓ PASS |
| No debt markers in source | `grep -rnE "TBD\|FIXME\|XXX" src/` | no matches | ✓ PASS |
| No unsafe HTML injection | `grep -rn "dangerouslySetInnerHTML\|innerHTML" src/` | no matches | ✓ PASS |
| No backend/serverless tier | `find . -maxdepth 2 -iname functions`, `ls dist/_redirects` | neither exists | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| LOC-01 | 01-01 | Pick location by click/drag | ✓ SATISFIED | Unchanged, regression-checked |
| LOC-02 | 01-02 | Reverse-geocoded name, fallback to coords | ✓ SATISFIED | Unchanged, regression-checked |
| LOC-03 | 01-01, 01-03, 01-04 | Selected location encoded in URL, shareable | ✓ **SATISFIED (gap closed)** | Write-path fix present, tested, AND now live in production (byte-identical bundle confirmed) |
| PLAT-01 | 01-03, 01-04 | Publicly reachable via shared URL, no login | ✓ **SATISFIED (gap closed)** | Live URL 200, no login prompt; "anyone with the link sees the same location" now true in production |
| PLAT-02 | 01-03 | Free-tier hosting, no backend | ✓ SATISFIED | Static `dist/`, no functions dir |

No orphaned requirements: {LOC-01, LOC-02, LOC-03, PLAT-01, PLAT-02} all appear across plan frontmatter (01-01: LOC-01, LOC-03; 01-02: LOC-02; 01-03: PLAT-01, PLAT-02; 01-04: LOC-03, PLAT-01) and all map to Phase 1 in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/map/MapView.tsx:17-24` | `ClickHandler` passes a new handlers object to `useMapEvents` every render (01-REVIEW.md `WR-01`) | ⚠️ Warning | Listener churn on every re-render; not user-visible, a robustness nit; carried forward, non-blocking |
| `src/map/useSelectedLocation.ts:132-145` | `setLocation` doesn't guard against non-finite `lat`/`lng` before clamp/wrap (01-REVIEW.md `WR-02`) | ⚠️ Warning | `NaN` currently unreachable (only real numeric callers exist today); asymmetry vs. read path's `Number.isFinite` guard; carried forward, non-blocking |
| `src/map/useSelectedLocation.ts:24-41,64-68` | Zoom URL param accepts and truncates decimal strings instead of rejecting (01-REVIEW.md `WR-03`) | ⚠️ Warning | `?zoom=7.9` silently becomes `7`; carried forward, non-blocking |
| `src/map/MapView.tsx` (no handler) | Zoom never captured from user zoom interaction (`WR-04`, explicitly deferred by Plan 01-04 with documented rationale) | ⚠️ Warning | Shared URL reflects only initial zoom; explicit, non-blocking scope decision, not a phase gap |
| `src/geocoding/useReverseGeocode.test.ts` | Hook's stale-response race guard (`requestIdRef`) still untested — only the extracted pure function is (`IN-03`, partial) | ℹ️ Info | Out of Plan 01-04's scope; informational only |
| `src/index.css:35-37` | Unused `--font-size-display`/`--font-weight-display`/`--line-height-display` tokens, undocumented (`IN-02`) | ℹ️ Info | Minor, cosmetic |
| `src/map/useSelectedLocation.ts:100-111` | `writeLocationToUrl` drops any existing URL hash fragment (`IN-04`) | ℹ️ Info | Latent; app doesn't use hash fragments today |
| `src/app/App.tsx:26-29` | `handleSelect` unmemoized, defeats `DraggablePin`'s `useMemo` (`IN-01`) | ℹ️ Info | Functionally harmless today |

No `TBD`/`FIXME`/`XXX` debt markers found in any phase-modified file (grep-confirmed this session, whole `src/` tree). All warning/info items above are pre-existing, non-blocking hardening opportunities explicitly noted in `01-REVIEW.md`/`01-04-PLAN.md`, not phase-goal blockers.

### Human Verification Required

None. All 12 must-haves resolved deterministically via source inspection, automated test/build/lint runs, `git` state comparison, and a byte-for-byte content hash comparison between the live production bundle and a fresh local build. No visual, real-time, or subjective judgment was required to close the remaining gap — it was a mechanical deployment-freshness question, now directly and conclusively answered.

### Gaps Summary

No gaps remain. The single gap from the prior verification pass — the CR-01 code fix existing only in the local working tree, unpushed to the git remote Cloudflare's auto-deploy watches — has been closed and independently re-confirmed in this session:

1. `git rev-list --left-right --count main...origin/main` returns `0 0`: local `main` and `origin/main` are identical, both at `6353c33`.
2. A fresh `npm run build` in this exact working tree reproduces the same asset filenames (`index-CIwwHWGB.js`, `index-Bvr-vwSJ.css`) referenced by the live production HTML.
3. Downloading the live JS bundle and computing its sha256 shows it is **byte-for-byte identical** to the local build's output — not merely a filename/hash-in-name coincidence, but the literal same bytes.
4. `cf-cache-status: HIT` confirms Cloudflare's edge is actively serving this fresh asset.

Combined with the unchanged conclusion that the underlying code fix (`clampLat`/`wrapLng` in `setLocation`, `isValidUrlSelection` in `App.tsx`, `parseGuarded`'s trailing-garbage rejection) is correct and test-covered — re-verified by direct source reading this session, not by trusting `01-04-SUMMARY.md` or the prior VERIFICATION.md — Phase 1's goal is now fully achieved end-to-end in the live, publicly deployed application. All 5 requirements (LOC-01, LOC-02, LOC-03, PLAT-01, PLAT-02) are satisfied.

---

_Verified: 2026-07-14T09:35:00Z_
_Verifier: Claude (gsd-verifier)_
