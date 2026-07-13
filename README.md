# Weather Anomaly Dashboard

A web dashboard where you drop a pin anywhere on a map and instantly see how anomalous today's weather is at that spot — how today's temperature compares to the 30-year historical average for that calendar day. Built on free Open-Meteo data, shareable via URL, no login required.

## Development

```bash
npm install
npm run dev      # local dev server with HMR
npm run build    # type-check (tsc -b) + production build to dist/
npm run test     # Vitest unit tests
npm run lint     # ESLint
```

## Deployment

This app is a pure static SPA — there is no backend, API layer, or serverless function anywhere in this project (see `.claude/CLAUDE.md` constraints). It deploys to **Cloudflare Pages** on the free tier.

### Build configuration

| Setting | Value |
|---|---|
| Framework preset | Vite (or React) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variables | None required |

**Why no environment variables/secrets:** both external APIs the app calls — BigDataCloud's reverse-geocoding endpoint and the CARTO map tile CDN — are keyless and CORS-enabled for direct browser `fetch()`. Nothing sensitive is ever bundled into or read at build time.

**Why no `_redirects` / SPA-rewrite rule:** all app state (selected location: `lat`, `lng`, `zoom`) lives in query params on a single path, `/`. There is no client-side path-based routing, so a plain static host serving `index.html` at `/` correctly handles every shared link — no rewrite rule is needed, and none should be added.

### One-time setup: connect this repo to Cloudflare Pages

1. Push this repository to your git host (GitHub/GitLab) if it isn't already.
2. In the Cloudflare Dashboard: **Workers & Pages → Create → Pages → Connect to Git**, and select this repository.
3. Set the build command to `npm run build` and the build output directory to `dist`, using the Vite (or React) framework preset. Leave environment variables empty — none are needed.
4. Deploy. Every subsequent push triggers an automatic redeploy.

Once connected, the project is reachable at its assigned `*.pages.dev` URL with no account or login required for visitors.
