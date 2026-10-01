# Galway Apparent Temperature - Cloudflare Pages edition

This version needs no Azure service. The static page and its small server-side fetch function live in one Cloudflare Pages project.

## Formula
`e = (rh / 100) * 6.105 * exp((17.27 * Ta) / (237.7 + Ta))`

`AT = Ta + (0.33 * e) - (0.70 * ws) - 4.00`

## Deployment
Cloudflare's current Pages documentation says a Pages Function belongs in a `/functions` directory at the root of the Pages project. It also states that Functions deployment uses either a connected Git provider or Wrangler, and that dashboard Direct Upload is not supported with Functions.

### Simplest deployment path
1. Unzip this package.
2. Create a GitHub repository and put the contents of this folder at the repository root. The `functions` folder must remain at the root.
3. In Cloudflare Dashboard open Workers & Pages.
4. Select Create application > Pages > Import an existing Git repository.
5. Select your repository.
6. For a plain HTML Pages deployment, Cloudflare's Static HTML guide recommends `exit 0` as the build command where Pages Functions are used.
7. Set the build output directory to `/` because this package's index.html is at repository root.
8. Deploy. Cloudflare provides the Pages project with a `*.pages.dev` address.
9. Test that address. The weather cards should fill automatically when the source station exposes all three readings.
10. Add the resulting HTTPS URL to a SharePoint Embed web part.

## Important
The weather parser reads the public University webpage because no documented API endpoint has been supplied. If that HTML page changes significantly, `functions/api/weather.js` may require adjustment.
