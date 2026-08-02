# write-weekly.com

The Weekly marketing site. Plain static HTML, assembled by [Eleventy](https://www.11ty.dev/) and published by Netlify.

**You never run a build yourself.** Edit a file, commit, and Netlify assembles and publishes the finished site.

---

## The one thing to understand

Shared parts of the site — the header, the footer, the `<head>`, the Meta Pixel — exist in **exactly one place each**. Change them once and every page updates.

| To change… | Edit this |
|---|---|
| Nav links, footer links, contact details, promo bar, Pixel ID | `src/_data/site.json` |
| Header markup | `src/_includes/partials/nav.njk` |
| Footer markup | `src/_includes/partials/footer.njk` |
| `<head>`, meta tags, tracking | `src/_includes/base.njk` |
| Colours, fonts, header/footer styling | `src/css/site.css` |
| The content of one page | `src/<page>.html` |
| The styling of one page | `src/_includes/css/pages/<page>.css` |

Do **not** paste a header or footer into a page file. It comes from the layout automatically.

---

## Pages

| File | Live URL | Layout |
|---|---|---|
| `src/index.html` | `/` | marketing |
| `src/about.html` | `/about/` | marketing |
| `src/faq.html` | `/faq/` | marketing |
| `src/sample.html` | `/sample/` | marketing |
| `src/interactivesample.html` | `/interactive-sample/` | marketing |
| `src/rmform.html` | `/returned-missionary/` | marketing |
| `src/checkout.html` | `/checkout/` | funnel + footer |
| `src/freetrial.html` | `/free-trial/` | funnel |
| `src/onboarding.html` | `/onboarding/` | funnel, noindex |
| `src/setup.html` | `/setup/` | funnel, noindex |

**marketing** = full nav + full footer.
**funnel** = logo-only nav, no exits mid-conversion.

Old `.html` URLs redirect to the new ones — see `netlify.toml`. Existing ad links keep working.

---

## Page front matter

The block at the top of each page between `---` lines controls that page:

```yaml
---
layout: marketing.njk        # marketing.njk or funnel.njk
title: "FAQ — Weekly"        # browser tab + Google result + social card
description: "..."           # Google result snippet + social card
permalink: "/faq/"           # the live URL
pageCss: faq.css             # its stylesheet in _includes/css/pages/
---
```

Optional extras:

| Key | Effect |
|---|---|
| `usePromoBar: true` | Shows the founding-offer bar from `site.json` |
| `topBar: "..."` | Shows a custom bar instead |
| `navTag: "Step 2 of 2"` | Progress label in the funnel nav |
| `funnelCta: {label, url}` | Single button in the funnel nav |
| `showFooter: true` | Adds the full footer to a funnel page |
| `noindex: true` | Hides the page from Google and the sitemap |
| `ogImage: "/img/x.jpg"` | Custom social share image |

---

## Adding a new page

1. Create `src/newpage.html`
2. Copy a front matter block from an existing page, change `title`, `description`, `permalink`
3. Write the page content — no header, no footer, no `<head>`
4. If it needs its own styles, create `src/_includes/css/pages/newpage.css` and set `pageCss: newpage.css`

It automatically gets the current header, footer, Pixel, and meta tags.

---

## Publishing

1. Make the change (via Claude, or by editing a file on github.com)
2. Open a pull request
3. Netlify posts a **Deploy Preview** link on the PR — open it and look at the real page
4. Merge. Live in about a minute.

Never commit straight to `main` if you can avoid it. The preview is what stops mistakes reaching customers.

---

## Running it locally (optional)

Not required, but if you want a live preview on your own machine:

```bash
npm install
npm start          # → http://localhost:8080
```

`dist/` is generated output. It is gitignored and should never be edited by hand.

---

## To do

- **Privacy policy.** There is no privacy policy page. Meta's ad policy requires one. Write `src/privacy.html`, then add the link back into `footerColumns` in `src/_data/site.json`.
- **Social share image.** `src/img/og-default.jpg` is a plain text placeholder. Replace it with a photo of a real book (1200×630).
- **Favicon.** `src/static/favicon.ico` and `src/img/apple-touch-icon.png` are placeholders.
