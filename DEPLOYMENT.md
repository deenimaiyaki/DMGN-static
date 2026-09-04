# DMGN — Cloudflare deployment

Everything below has been verified locally against `wrangler pages dev`, which runs the same
Workers runtime, `_headers` and `_redirects` parser that Pages uses in production. Nothing has
been deployed and no DNS has been touched — both need your explicit go-ahead.

---

## 1. Architecture

```
Browser
  │
  ├── static HTML/CSS/JS/images ──► Cloudflare Pages (CDN edge)
  │
  └── POST /api/contact ──────────► Pages Function (Worker)
                                        │
                                        └──► transactional email provider (Resend)
                                                  │
                                                  └──► contactdmgn@gmail.com
```

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
├── functions/api/contact.js   Pages Function (form endpoint)
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

Set in **Pages → Settings → Environment variables**, for both Production and Preview.

| Name | Type | Value |
|---|---|---|
| `RESEND_API_KEY` | **Secret** | API key from resend.com |
| `ENQUIRY_TO` | Plaintext | `contactdmgn@gmail.com` |
| `ENQUIRY_FROM` | Plaintext | A verified sender on your domain, e.g. `website@deenimaiyaki.name.ng` |

`MAIL_ENDPOINT` is optional and exists only to point local development at a mock. **Do not set it
in production.**

Until these are set the endpoint returns `500 {"error":"The enquiry service is not configured yet."}`
and the form shows the fallback message with the phone number and email address. Nothing crashes,
but **no enquiry is delivered** — set them before announcing the site.

No key, token or credential appears anywhere in `public/`. Verify with
`grep -ri "api[_-]key\|secret\|token" public/`.

## 5. Cloudflare Pages setup

1. Pages → **Create a project** → Connect to Git → select the repository.
2. Framework preset **None**. Build command `npm run build`. Output directory `public`.
3. Deploy. You get `dmgn-agency.pages.dev`.
4. **Test on the `.pages.dev` URL before touching DNS** — the whole site works there.
5. Custom domains → add `www.deenimaiyaki.name.ng`, then add `deenimaiyaki.name.ng`.

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
| CNAME | `www` | `dmgn-agency.pages.dev` | Proxied (orange) |
| CNAME | `@` | `dmgn-agency.pages.dev` | Proxied (orange) — Cloudflare flattens this at the apex |

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

## 10. Form / backend

`functions/api/contact.js`. Verified locally end to end against a mock provider:

| Case | Result |
|---|---|
| Valid JSON submission | `200 {"ok":true}`, provider received correct `to`/`reply_to`/`subject`/`html` |
| Valid form post without JavaScript | `303` → `/contact/thank-you/`, email sent |
| Missing/invalid fields | `422` with the offending field names |
| Honeypot filled | `200` and silently discarded, nothing sent |
| Env vars unset | `500`, clear message, page falls back to phone/email |
| `GET /api/contact` | `405` |

Client behaviour verified in a real browser: validation on blur (not keystroke), errors rendered
below their field with `aria-invalid`, focus moved to the first invalid field, status announced via
`role="status"`, form reset on success.

To use a provider other than Resend, replace `sendEmail()` — nothing else changes.

## 11. Rollback

- **Application:** Pages → Deployments → any previous deployment → **Rollback**. Instant, no rebuild.
- **DNS:** restore the records saved in §6 step 1. Propagation follows the record TTL.
- **The old WordPress site is untouched.** Nothing in this project modifies it. If you need to go
  back entirely, point the website DNS records back at the original host.

## 12. Future deployments

```bash
npm run build          # regenerate public/
npm run serve          # http://localhost:8787 — static check
npm run dev            # http://localhost:8788 — wrangler, with _headers/_redirects/Functions
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
