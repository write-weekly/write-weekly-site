# Notes for Claude

Static marketing site for write-weekly.com. Eleventy → Netlify. Read `README.md` first.

## Hard rules

1. **Never duplicate shared chrome.** The header, footer, `<head>`, and Meta Pixel live in exactly one file each. If a task looks like "edit the nav on every page," it is a one-file change — usually `src/_data/site.json`. Editing more than one page file for a site-wide change is a mistake.

2. **Never edit `dist/`.** It is generated. Edit `src/`.

3. **Page files contain page content only** — no `<html>`, `<head>`, `<body>`, `<nav>`, or `<footer>` tags. The layout supplies those.

4. **Keep the Meta Pixel intact.** It is in `src/_includes/base.njk` and fires on every page. Page-specific conversion events (e.g. the `Lead` event on `/interactive-sample/`) live in that page's own script and must be preserved.

5. **Don't change a page's `permalink`** without adding a 301 redirect in `netlify.toml`. Live ads point at these URLs.

6. **Verify before finishing.** Run `npx eleventy` and confirm it builds with no errors.

## Where things are

- `src/_data/site.json` — nav, footer, contact, promo bar, Pixel ID. Most content edits belong here.
- `src/_includes/base.njk` — the `<head>`, meta/OG tags, Pixel, page shell
- `src/_includes/marketing.njk` / `funnel.njk` — the two page layouts
- `src/_includes/partials/` — nav, funnel nav, footer markup
- `src/css/site.css` — design tokens and all shared chrome styling
- `src/_includes/css/pages/<page>.css` — styling for one page only
- `src/js/site.js` — mobile menu, footer accordion, active-link highlighting

## Conventions

- Internal links are absolute clean paths with a trailing slash: `/checkout/`, not `checkout.html`.
- Colours come from CSS custom properties in `src/css/site.css`. Don't hardcode hex values in page CSS.
- `--parchment` and `--cream` are the same colour, kept as aliases for historical reasons.
