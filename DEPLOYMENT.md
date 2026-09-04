# DMGN — Cloudflare deployment

Everything below has been verified locally against `wrangler pages dev`, which runs the same
Workers runtime, `_headers` and `_redirects` parser that Pages uses in production. Nothing has
been deployed and no DNS has been touched — both need your explicit go-ahead.

---

## 1. Architecture

```
Browser ──► Cloudflare Pages (CDN edge) ──► static HTML / CSS / JS / images
```

That is the whole architecture. **There is no server-side runtime** — no Worker, no Pages
Functions, no API routes, no Node server, no database, no backend of any kind. Cloudflare serves
the contents of `public/` as files and nothing executes on request.

Hand-authored static HTML. No framework, no bundler, no runtime dependencies. The build step
exists only to share the header/footer across pages and to generate `sitemap.xml`, the RSS feed,
`robots.txt` and `_redirects`.

```
dmgn-agency/
├── src/                  authoring source
│   ├── layout.html       shared chrome (head, nav, footer)
│   └── pages/            page bodies, incl. pages/insights/*.html
├── public/               ← BUILD OUTPUT, this is what Pages serves
│   ├── assets/{css,js,fonts,img}
│   ├── _headers          security + caching headers
│   └── _redirects        legacy WordPress URL map
└── scripts/{build,build-images,audit}.js
```

## 2. Build command

```
npm run build
```

(= `node scripts/build.js`. Node 18+. No dependencies — Pages will run it with no install step.)

Image optimisation is **not** part of the deploy build; `public/assets/img` is committed. Re-run
`npm run build:images` locally only when source imagery changes (needs macOS `sips` + `cwebp`).

## 3. Output directory

```
public
```

## 4. Environment variables

**None.** The site is static and holds no credentials, so there is nothing to configure.

Specifically, none of these are used any more:

| Name | Status |
|---|---|
| `RESEND_API_KEY` | **Not used.** Removed with the server-side contact endpoint. |
| `ENQUIRY_TO` | **Not used.** The recipient is the `mailto:` address in the form markup. |
| `ENQUIRY_FROM` | **Not used.** The visitor's own mail client sends the message. |
| `MAIL_ENDPOINT` | **Not used.** Existed only to point local dev at a mock. |
| `CLOUDFLARE_API_TOKEN` | **Not used, and must not be set.** Pages Git integration authenticates itself; a token variable here overrides Cloudflare's own build credentials and breaks the deploy. |

If any of these are still set on the Cloudflare project, delete them.

No key, token or credential appears anywhere in `public/`. Verify with
`grep -ri "api[_-]key\|secret\|token" public/`.

## 5. Cloudflare Pages setup

Deployment is handled by the **Pages Git integration**. Cloudflare clones the repo, runs the
build, and publishes `public/` itself. There is **no deploy command and no API token** in this
path — do not add one.

```
GitHub main → Cloudflare Pages Git integration → npm install → npm run build → public/ → deploy
```

1. Workers & Pages → **Create** → **Pages** tab → **Connect to Git** → select
   `deenimaiyaki/DMGN`. Use the *Pages* tab: the *Workers* "Import a repository" flow creates a
   **Workers Build**, which is a different product — see §5.1.
2. Project name **`dmgn`**. It must equal `name` in `wrangler.toml`, or the build fails with a
   project-name mismatch.
3. Production branch **`main`**. Framework preset **None**.
   Build command `npm run build`. Build output directory `public`. Root directory `/`.
4. Deploy. You get `dmgn.pages.dev`.
5. **Test on the `.pages.dev` URL before touching DNS** — the whole site works there.
6. Custom domains → add `www.deenimaiyaki.name.ng`, then add `deenimaiyaki.name.ng`.

`wrangler.toml` is read by the Pages build and supplies `pages_build_output_dir`, so the output
directory is declared in the repo as well as in the dashboard. Keep the two in agreement.

### 5.1 If the dashboard shows a *Deploy command* / *Version command*

Those fields belong to **Workers Builds**, not Pages. A project created through the Workers
"Import a repository" flow builds the repo and then runs `npx wrangler deploy`, which fails here
with *"Missing entry-point to Worker script or to assets directory"* — correctly, because this
repository has no Worker entry point.

Replacing that deploy command with `npx wrangler pages deploy public --project-name dmgn` invokes
the right product, but it then needs an API token, and a `CLOUDFLARE_API_TOKEN` build variable
overrides the credentials Cloudflare injects for the build. If that token lacks
**Account → Cloudflare Pages → Edit** the deploy fails with `Authentication error [code: 10000]`.

The fix is not a broader token. **Delete the Workers Builds project and create a Pages project as
in §5.** Pages Git integration deploys with no token at all — simpler and strictly more secure.
Also remove any `CLOUDFLARE_API_TOKEN` variable from the project's build environment; nothing in
this repository needs it.

A manual `wrangler pages deploy` from a laptop remains available as a break-glass path; it uses
`wrangler login` (OAuth), not a stored token.

## 6. DNS configuration — read this before changing anything

**Do not paste a new zone file and do not delete records you did not add.** The domain almost
certainly carries live email. Deleting MX/SPF/DKIM/DMARC records silently stops mail delivery.

### Step 1 — inventory the current zone first

```bash
for t in A AAAA CNAME MX TXT NS; do echo "== $t"; dig +short $t deenimaiyaki.name.ng; done
dig +short CNAME www.deenimaiyaki.name.ng
dig +short TXT _dmarc.deenimaiyaki.name.ng
dig +short TXT default._domainkey.deenimaiyaki.name.ng
```

Save that output. It is your rollback reference.

### Step 2 — classify every record

| Record | Belongs to | Action |
|---|---|---|
| `A` / `AAAA` on the apex pointing at the old web host | Website | **Change** (step 3) |
| `CNAME www` pointing at the old web host | Website | **Change** (step 3) |
| `MX` | **Email** | **Leave untouched** |
| `TXT` starting `v=spf1` | **Email (SPF)** | **Leave untouched** |
| `TXT` on `*._domainkey` | **Email (DKIM)** | **Leave untouched** |
| `TXT` on `_dmarc` | **Email (DMARC)** | **Leave untouched** |
| `TXT` domain-verification strings (Google, Microsoft…) | Verification | **Leave untouched** |
| `CNAME` for `autodiscover`, `mail`, `webmail`, `imap`, `smtp` | **Email** | **Leave untouched** |

Only the rows marked **Change** are website records.

### Step 3 — the only records to change

Adding the custom domain in Pages creates these for you when the zone is already on Cloudflare;
confirm they match:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `www` | `dmgn.pages.dev` | Proxied (orange) |
| CNAME | `@` | `dmgn.pages.dev` | Proxied (orange) — Cloudflare flattens this at the apex |

Delete the old website `A`/`AAAA`/`CNAME` records **only after** the new ones resolve and the site
loads. If the old host also served mail, note that MX records are independent of A records — moving
the web A record does not move mail, which is exactly why the MX rows above stay as they are.

### Step 4 — verify mail still flows

After the change, send a test message to and from an address on the domain, and re-run:

```bash
dig +short MX deenimaiyaki.name.ng
dig +short TXT deenimaiyaki.name.ng | grep spf1
```

Both must return exactly what you saved in step 1.

## 7. SSL/TLS

- SSL/TLS → Overview → **Full (strict)**.
- Edge Certificates → **Always Use HTTPS: On**.
- Edge Certificates → **Minimum TLS Version: 1.2**.
- HSTS is already sent by `_headers`
  (`max-age=31536000; includeSubDomains; preload`). Because it includes `includeSubDomains` and
  `preload`, only enable it once every subdomain you use is HTTPS-capable.

Pages issues and renews the certificate automatically; Full (strict) is correct because the
origin is Cloudflare itself.

## 8. Redirects

`public/_redirects` is generated by the build and contains 15 rules — legacy post permalinks to
their new Insights URLs, and every retired WordPress surface to `/`. Cloudflare parses the file
top-to-bottom, so exact paths are emitted before wildcards. All 15 were accepted by Cloudflare's
own parser (`✨ Parsed 15 valid redirect rules`).

**Host canonicalisation** is not in `_redirects` — Pages serves both hostnames. Add a Redirect
Rule so the apex sends visitors to `www`, which is the canonical host used in every
`<link rel="canonical">` and in `sitemap.xml`:

> Rules → Redirect Rules → Create
> **If** `http.host eq "deenimaiyaki.name.ng"`
> **Then** Dynamic redirect → `concat("https://www.deenimaiyaki.name.ng", http.request.uri.path)`
> Status **301**, Preserve query string **on**

There is no loop risk: the rule fires only on the bare apex, and its target is a different host.

## 9. Caching

`public/_headers` sets the policy. Fonts are `immutable` for a year; images 30 days; CSS/JS one day
with `stale-while-revalidate`.

CSS and JS are deliberately **not** on a one-year cache because their filenames are not
fingerprinted. If you later add content hashes to those filenames, raise them to
`max-age=31536000, immutable` at the same time — not before.

No caching is applied to `/api/*` (`no-store`).

After a deploy that changes CSS or JS, either wait out the one-day TTL or **Caching → Configuration
→ Purge Everything**.

## 10. Contact form — static, no backend

The enquiry form composes an email in the visitor's own mail client. Nothing is posted to a
server, because there is no server.

- **Markup:** `src/pages/contact.html` — `<form action="mailto:contactdmgn@gmail.com"
  method="post" enctype="text/plain">`.
- **Enhancement:** `public/assets/js/contact-form.js` — client-side only. It keeps the existing
  inline validation and status messaging, then builds a `mailto:` URL with a readable subject
  and a labelled body and navigates to it.
- **Without JavaScript:** the form's native `mailto:` action still opens the mail client. The
  body is less tidy, but nothing is lost.

`_headers` allows this: the CSP `form-action` directive is `'self' mailto:`.

### What this costs

Be aware of the trade-off, because it is real:

| | Behaviour |
|---|---|
| Delivery | **Not guaranteed.** The visitor must have a working mail client and must press send themselves. |
| Webmail users | A browser with no registered `mailto:` handler does nothing visible. The form text and the sidebar both give the address and phone number for exactly this case. |
| Address exposure | `contactdmgn@gmail.com` is in the page source and can be scraped. It was already published in the sidebar, so this is not a new exposure. |
| Delivery record | None. There is no log of attempted enquiries. |

This is inherent to a static site with no external form service. If reliable delivery matters
later, the options are a third-party form endpoint (Formspree, Netlify Forms, Basin — an external
account, no code) or restoring a Pages Function. Both are decisions for DMGN, not defaults.

**`/contact/thank-you/` still builds and is still a valid route**, but nothing links to it now
that there is no form POST to redirect. It is harmless; deleting it is a content decision.

## 11. Rollback

- **Application:** Pages → Deployments → any previous deployment → **Rollback**. Instant, no rebuild.
- **DNS:** restore the records saved in §6 step 1. Propagation follows the record TTL.
- **The old WordPress site is untouched.** Nothing in this project modifies it. If you need to go
  back entirely, point the website DNS records back at the original host.

## 12. Future deployments

```bash
npm run build          # regenerate public/
npm run serve          # http://localhost:8787 — static check
npm run dev            # http://localhost:8788 — wrangler, with _headers/_redirects
npm run audit -- http://localhost:8788 ./shots
git commit -am "..." && git push     # Pages builds and deploys the branch
```

`npm run audit` is the gate: it walks every route and fails on console errors, failed requests,
broken internal links, missing/duplicate `h1`, skipped heading levels, images without `alt` or
without dimensions, unlabelled form controls, links with no accessible name, missing
title/description/canonical, invalid JSON-LD, and horizontal overflow at 1440/1280/1024/768/390/375.
It currently reports **no problems** across all 14 routes.

Push to a non-production branch to get a preview deployment first.

---

## Post-launch checklist

- [ ] Set the three environment variables and submit a real test enquiry.
- [ ] Google Search Console: add the property, submit `https://www.deenimaiyaki.name.ng/sitemap.xml`.
- [ ] Search Console → Removals: request removal of any indexed `/testing/` URL (it now 301s, but
      removal is faster).
- [ ] Confirm mail still flows (§6 step 4).
- [ ] Decide on the open content questions in `AUDIT.md` §4 — testimonials, client logos,
      social profile URLs, and the "Liana Potmen" team entry.
- [ ] Analytics: enable **Cloudflare Web Analytics** (Pages → project → Web Analytics) — it is
      cookieless and needs no consent banner, so nothing was added to the pages. If you specifically
      need GA4 instead, that requires a consent mechanism and a CSP change; ask before adding it.
