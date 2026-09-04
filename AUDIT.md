# DMGN — audit of the existing site and migration map

Source audited: `www.deenimaiyaki.name.ng` (SiteSucker export of the live WordPress site).
277 files, 57 MB on disk.

---

## 1. What was there

| Area | Finding |
|---|---|
| Platform | WordPress 7.1, theme `fotawp`, plugins incl. `cozy-addons`, `cookieadmin-pro`, `sharemypost`, Contact Form 7 |
| Pages | Home (one long page), `/testing/`, 5 blog posts, 3 category archives, 11 tag archives |
| Homepage weight | **849 KB HTML**, ~507 KB inline JS, ~102 KB inline CSS |
| Images | 104 files in `wp-content/uploads/2026/08`; largest single PNG 1.82 MB; many duplicate WordPress size variants |
| Fonts | 5 separate Google Fonts families loaded from `fonts.googleapis.com` (render-blocking), plus 11 unused font families shipped in the theme |
| Metadata | Single description "Your Global Partner for Global Success."; **canonical was the relative string `index.html`** on both `/` and `/testing/` |
| Development artifacts | `.DS_Store`, `__MACOSX/`, `/testing/`, `xmlrpc.php?rsd.xml`, `wp-json/` REST dumps |
| Forms | Contact Form 7 (name, email, subject, message) |
| Third party | Cookie consent SDK, share-to-social SDK (7 networks), plugin CDN images pulled from `plugins.cozythemes.com` |

### Broken and misleading content found

- **Canonical URL bug** — `/` and `/testing/` both declared `<link rel="canonical" href="index.html">`, a relative
  value that resolves per-directory. `/testing/` was publicly reachable and indexable.
- **Footer typos** — "Careers" rendered as `Career` + stray `s`; "Contact Us" as `Conatct Us`;
  "Terms & Conditions" as `Teram & Conditions`.
- **Dead social links** — every social icon in the header and footer was `href="#"`. See §4.
- **"0+ Trusted Customers"** — a counter animating to zero.
- **"Recognized and Trusted by Top Companies"** — the ten logos were `brand-1.png` … `brand-10.png`
  served from the theme vendor's own CDN. They are demo assets, not DMGN clients.

---

## 2. Migration map

| Old | New | Note |
|---|---|---|
| `/` (single long page) | `/` + `/work/` `/services/` `/about/` `/contact/` | Split into a real IA |
| Hero "Your Global Partner for Global Success" | Hero "We Create Brands That Move People." | Repositioned as a creative agency |
| "Our Services" (7 unrelated items) | `/services/` — six creative capabilities | See §3 |
| "Portfolio" (3 theme stock images) | `/work/` — six real DMGN projects | Stock images dropped entirely |
| "How It Work" (3 steps) | Process — 5 stages (Discover → Grow) | On `/`, `/services/`, `/about/` |
| "Flexible Plans" (Connect / Travel / Creative Hub) | `/ventures/` | Moved off the agency message |
| "Meet Our Team" | `/about/` § "Who you'll work with" | Two named people retained; see §4 |
| "Testimonials" | **removed** | See §4 |
| "Blogs & Articles" | `/insights/` with four content pillars | All 5 posts migrated, 301s in place |
| FAQ | folded into `/about/` and `/contact/` "What happens next" | |
| Contact form (4 fields) | `/contact/` project enquiry (9 fields) | Static `mailto:` compose |
| `/testing/` | **deleted**, 301 → `/` | |
| `/category/*`, `/tag/*`, `/2026/*` | 301 → `/insights/` (posts 301 to their new URLs) | |
| `/feed/`, `/comments/feed/` | 301 → `/insights/feed.xml` | |
| `/wp-json/*`, `/wp-admin/*`, `/xmlrpc.php`, `/wp-login.php` | 301 → `/` | No WordPress surface remains |

---

## 3. Classification of the existing services

| Service | Verdict | Where it went |
|---|---|---|
| Website & App Development | **REPOSITION** | Digital Experiences capability |
| Graffiti & Wall Art | **KEEP** | Creative Production — and it is now the lead portfolio piece |
| Social Media & Networking Solutions | **REPOSITION** | Content & Media + Campaigns & Marketing |
| Digital Marketing & Advertising | **REPOSITION** | Campaigns & Marketing |
| Business & Technology Consulting | **REPOSITION** | Creative Strategy (brand/campaign strategy only) |
| DMGN Creative Hub | **MOVE** | `/ventures/` — it is the production arm, not the agency offer |
| DMGN Connect | **MOVE** | `/ventures/` |
| DMGN Travel | **MOVE** | `/ventures/` |
| Music Distribution & Artist Services | **MOVE (flagged)** | Not represented as an agency capability. `/ventures/` carries a line pointing enquirers to ask directly. **Confirm whether this is still offered.** |
| Start-up Ideas / incubation | **MOVE (flagged)** | Same treatment. **Confirm.** |
| DMGN Data Plans, DMGN Business Network | **MOVE (flagged)** | Listed in the old footer only. Folded into DMGN Connect on `/ventures/`. **Confirm.** |
| "WooCommerce Posts", "Advanced Gallery", "Portfolio Builder" | **REMOVE** | These were theme feature names left in the footer by mistake, not DMGN products. |

---

## 4. Content deliberately NOT carried over — needs your decision

Nothing in this list was rewritten or replaced with invented material. It was removed because it
could not be verified, per the "do not invent content" rule.

1. **Testimonials.** "Patrick Loy — Blogger", "Liyana Pepp — Traveller", "Lexy Andrew — Writer"
   used the `fotawp` theme's own demo avatars (`fota_testimonial_1-3.png`). They are template
   placeholder content. **The testimonials section is not on the new site.** Send real, attributable
   quotes and it goes back in.
2. **Client logo wall.** "Recognized and Trusted by Top Companies" used the theme vendor's demo
   logos. Removed. Re-add only with real clients who have agreed to be named.
3. **"0+ Trusted Customers".** Removed. No invented figure was substituted.
4. **Team — "Liana Potmen, Manager".** The photo was the theme's stock `team_3.jpg` and the name
   does not appear anywhere else in the site or content. Not carried over. Zahradeen Aliyu Maiyaki
   (Founder) and Bashir Abbas Bichi (CEO) are retained — both are corroborated in the site's own
   editorial content. **Confirm whether Liana Potmen is a real colleague.**
5. **Social channels.** The only outbound social destinations that actually existed in the source
   are **Discord** (`discord.gg/EV6gJRPthb`) and **WhatsApp** (`wa.me/message/H3LS7DGKO65VM1`).
   Facebook, X, Instagram, YouTube, TikTok and Pinterest icons were all `href="#"`. Only Discord and
   WhatsApp are linked in the new footer. **Send the real profile URLs and they will be added.**
6. **Case-study results.** No measured outcome, budget or client-approved result exists anywhere in
   the source, so no project claims a result. `/work/` states this openly rather than implying it.
7. **Sweatcoin posts.** Retained, with an added line noting Sweatcoin is a third-party app not
   operated by DMGN. The founder's referral link is shown as plain text, not a live affiliate link.
8. **Insights pillars.** "Brand & Design" and "Marketing" have no articles yet. The page says so
   instead of being padded with unrelated SEO content.

---

## 5. Assets

Twelve source images were kept, optimised and given responsive variants. Everything else
(92 upload files — WordPress duplicate size variants, theme stock photography, plugin CDN images)
was dropped.

| Kept | Used as |
|---|---|
| `1000069908.png` | Community mural, Minna — lead portfolio piece |
| `IMG-20250211-WA0015/0024.jpg` | Mural detail shots |
| `file_…09d88210….png` | DMGN Creative Hub key visual |
| `file_…948081f4….png` | DMGN Connect key visual |
| `file_…2600820a….png` | DMGN Travel identity |
| `file_…f13c8210….png` | Reporting & collateral |
| `file_…12f48246….png` | Growth strategy campaign |
| `1000069702-1.png` | Consultation — About + founder article |
| `file_…35ac8210….png` | Editorial illustration |
| `InShot_20260901_080557937.jpg` | OPay article key art |
| `InShot_20260822_173144578.jpg` | Sweatcoin article |
| `cropped-Dmgn7.png` | Logo, favicon, Apple touch icon, OG card |

Six `InShot_*` images were generic stock illustrations with no DMGN branding and were dropped.

---

## 6. Before / after

| | Old | New |
|---|---|---|
| Homepage HTML | 849 KB | **25 KB** (5.9 KB gzipped) |
| CSS | ~102 KB inline + theme/plugin sheets | **28 KB** (6.9 KB gzipped), one file |
| JavaScript | ~507 KB inline + jQuery + plugin bundles | **2.7 KB** site-wide (1.1 KB gzipped); +3.8 KB on `/contact/` only |
| Fonts | 5 Google Fonts families, third-party, render-blocking | **2 self-hosted subset variable fonts, 59 KB total** |
| Requests (homepage) | many dozens | **12** |
| Third-party origins | 3 (Google Fonts, cozythemes CDN, cookie SDK) | **0** |
| Total site | 57 MB | **3.7 MB** |
