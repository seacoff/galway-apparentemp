# Galway Apparent Temperature - Cloudflare Worker

This package is for a Cloudflare **Worker** deployment using a `workers.dev` address. It combines Worker API logic and static web assets in one deployment.

## Repository structure

- `src/index.js` handles `/api/weather` and `/api/health`.
- `public/` contains the embedded weather display.
- `wrangler.jsonc` connects the Worker to the static assets.
- `package.json` provides the Cloudflare build and deploy commands.

## Cloudflare Git deployment settings

Connect this GitHub repository to a Cloudflare Worker and use:

- Build command: `npm install`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

The Worker configuration is already in `wrangler.jsonc`.

## Test after deployment

1. Open `/api/health`. It should return JSON containing `"ok": true`.
2. Open `/api/weather`. It should return weather JSON or a clear JSON error.
3. Open the root Worker address to view the weather app.

## Formula

`e = (rh / 100) * 6.105 * exp((17.27 * Ta) / (237.7 + Ta))`

`AT = Ta + (0.33 * e) - (0.70 * ws) - 4.00`

## Maintenance note

The retrieval code parses a public webpage rather than a documented API. If the University changes the page labels or structure, `src/index.js` may require an update.
