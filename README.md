# DMGN — Creative Agency

Production website for **Deeni Maiyaki Global Network**, rebuilt from the previous WordPress site
as a static site for Cloudflare Pages.

> We Create Brands That Move People.

- **[AUDIT.md](AUDIT.md)** — what the old site contained, the migration map, service
  classification, and the content that needs a decision from DMGN.
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Cloudflare Pages, DNS (including how not to break email),
  SSL, caching, the form backend, and rollback.

## Quick start

```bash
npm run build     # src/ -> public/
npm run serve     # static preview on :8787
npm run dev       # wrangler: Functions + _headers + _redirects on :8788
npm run audit -- http://localhost:8788 ./shots
```

Node 18+. The build itself has zero dependencies; `playwright` and `wrangler` are dev-only.

## How it fits together

| Path | Purpose |
|---|---|
| `src/layout.html` | The shared page shell. Edit the nav or footer here, once. |
| `src/pages/*.html` | Page bodies. Plain HTML — no template language beyond the layout's `{{…}}` slots. |
| `scripts/build.js` | Page manifest (titles, descriptions, schema), assembly, `sitemap.xml`, `feed.xml`, `robots.txt`, `_redirects`. **Add a new page here.** |
| `public/assets/css/main.css` | The whole design system, in 17 commented sections. |
| `public/assets/js/site.js` | Sticky nav, mobile menu, scroll reveal. 2.7 KB. |
| `functions/api/contact.js` | Project enquiry endpoint. |
| `scripts/build-images.sh` | Regenerates responsive WebP from the original source images. |
| `scripts/audit.js` | Accessibility / SEO / layout / link gate. |

### Adding a page

1. Write the body in `src/pages/<name>.html`.
2. Add an entry to `PAGES` in `scripts/build.js` (`file`, `dir`, `title`, `description`, `schema`).
3. `npm run build && npm run audit`.

It is picked up by `sitemap.xml` automatically. Add it to `NAV` only if it belongs in the primary
navigation — that menu is deliberately six items.

### Adding an Insights article

1. Write it in `src/pages/insights/<slug>.html`.
2. Add an entry to `POSTS` in `scripts/build.js`, including `legacy` if an old WordPress URL
   should redirect to it.

`Article` schema, the RSS feed and the redirect are generated from that entry.

## Conventions worth knowing

- **No inline `style` attributes.** The Content Security Policy is `style-src 'self'`, so an inline
  style is silently dropped in production. One-off styles live as utility classes in §17 of
  `main.css`.
- **Every image carries `width`/`height`** (or sits in an `aspect-ratio` box) so nothing shifts on
  load, and a `srcset`/`sizes` pair.
- **Scroll reveal is an enhancement.** Content is visible by default; it is only hidden under
  `@media (scripting: enabled)`, and `site.js` has a 2.5 s failsafe that reveals everything if the
  observer never fires. Never make content depend on it.
- **Motion respects `prefers-reduced-motion`.**
- **Dark theme, committed.** `color-scheme: dark`; colours come from tokens at the top of
  `main.css`. Glass surfaces are used only where something sits over imagery or the ambient
  gradient field — navigation, overlays, capability cards, CTA bands.
- **No third-party origins.** Fonts are self-hosted and subset. Keep it that way; the CSP forbids
  anything else without an explicit change.
- **Do not invent content.** Client names, testimonials, statistics and results go on the site only
  when DMGN has supplied and approved them. See `AUDIT.md` §4.

## Status

`npm run audit` passes across all 14 routes with no problems. Not yet deployed; see
`DEPLOYMENT.md`.
