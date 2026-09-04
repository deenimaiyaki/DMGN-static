#!/usr/bin/env node
/**
 * DMGN static site build.
 *
 *   node scripts/build.js
 *
 * Reads src/layout.html + src/pages/*.html, writes pretty-URL directories into
 * public/, and generates sitemap.xml plus the Insights RSS feed. No bundler,
 * no dependencies — the whole site is hand-authored HTML/CSS/JS and the build
 * exists only to keep the shared chrome in one file.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "public");
const ORIGIN = "https://www.deenimaiyaki.name.ng";

/* ------------------------------------------------------------------ pages */

const NAV = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work/" },
  { label: "Services", href: "/services/" },
  { label: "About", href: "/about/" },
  { label: "Insights", href: "/insights/" },
  { label: "Contact", href: "/contact/" }
];

/** Insight articles migrated from the WordPress export. */
const POSTS = [
  {
    slug: "opay-shutdown-rumour",
    dir: "insights/opay-shutdown-rumour",
    title: "OPay debunks viral shutdown rumour: “We're going nowhere”",
    description:
      "Fintech OPay dismissed a viral post claiming it would suspend operations from 1 September 2026. What the episode says about misinformation and brand trust.",
    pillar: "Business & Strategy",
    date: "2026-08-31",
    readable: "31 August 2026",
    image: "insight-opay",
    alt: "Key art reading “Shutdown rumour? OPay: we're not shutting down.”",
    legacy: "/2026/08/31/opay-debunks-viral-shutdown-rumour-assures-customers-were-going-nowhere/"
  },
  {
    slug: "founder-message",
    dir: "insights/founder-message",
    title: "A message from our founder",
    description:
      "Zahradeen Aliyu Maiyaki on why DMGN exists — empowerment, innovation and community — and where the network is heading.",
    pillar: "DMGN Insights",
    date: "2026-08-24",
    readable: "24 August 2026",
    image: "consultation",
    alt: "A DMGN consultation session in progress around a meeting table.",
    legacy: "/2026/08/24/%E2%9C%8D%EF%B8%8F-a-message-from-our-founderby-zahradeen-aliyu-maiyaki/"
  },
  {
    slug: "one-network-one-vision",
    dir: "insights/one-network-one-vision",
    title: "One network. One vision. One global family.",
    description:
      "The values behind Deeni Maiyaki Global Network: how we work with colleagues, partners and communities, and the humanitarian commitments we hold ourselves to.",
    pillar: "DMGN Insights",
    date: "2026-08-22",
    readable: "22 August 2026",
    image: "mural-minna",
    alt: "Two people standing in front of a DMGN community mural in Minna.",
    legacy: "/2026/08/22/dmgn-family/"
  },
  {
    slug: "sweatcoin-dmgn-lifestyle",
    dir: "insights/sweatcoin-dmgn-lifestyle",
    title: "Sweatcoin + DMGN Lifestyle",
    description:
      "How a step-tracking app connects to travel, creative work and community projects across the DMGN network.",
    pillar: "Technology & Digital",
    date: "2026-08-25",
    readable: "25 August 2026",
    image: "insight-social",
    alt: "Illustration of a connected global social and messaging network.",
    legacy: "/2026/08/25/sweatcoin-dmgn-lifestyle/"
  },
  {
    slug: "walk-more-earn-more",
    dir: "insights/walk-more-earn-more",
    title: "Walk more, earn more with Sweatcoin",
    description:
      "A short explainer on Sweatcoin — how step tracking works, what the rewards are, and why DMGN shares it with the community.",
    pillar: "Technology & Digital",
    date: "2026-08-25",
    readable: "25 August 2026",
    image: "editorial-illustration",
    alt: "Editorial illustration of a team reviewing charts and reports together.",
    legacy: "/2026/08/25/walk-more-earn-more-with-sweatcoin/"
  }
];

const PAGES = [
  {
    file: "home.html",
    dir: "",
    title: "DMGN — Creative Agency | We Create Brands That Move People",
    description:
      "DMGN is a creative agency helping ambitious brands turn ideas into distinctive identities, digital experiences, content and campaigns. Based in Minna, Nigeria; working worldwide.",
    schema: ["organization", "website"]
  },
  {
    file: "work.html",
    dir: "work",
    title: "Work — Selected projects | DMGN Creative Agency",
    description:
      "Selected DMGN work: brand identity systems, campaign key visuals, community murals and creative production. Ideas brought to life through strategy, design and execution.",
    schema: ["breadcrumb"]
  },
  {
    file: "services.html",
    dir: "services",
    title: "Services — Creative capabilities | DMGN Creative Agency",
    description:
      "Creative strategy, branding and identity, digital experiences, content and media, campaigns and marketing, and creative production — the six capabilities DMGN offers.",
    schema: ["breadcrumb", "services"]
  },
  {
    file: "about.html",
    dir: "about",
    title: "About — A creative agency built around ideas | DMGN",
    description:
      "DMGN combines strategy, design, technology, content and culture to help brands communicate clearly and stand out. Read our story, our process and how we work.",
    schema: ["breadcrumb"]
  },
  {
    file: "insights.html",
    dir: "insights",
    title: "Insights — Brand, technology, marketing and strategy | DMGN",
    description:
      "Writing from the DMGN team on brand and design, technology and digital, marketing, and business and strategy.",
    schema: ["breadcrumb"]
  },
  {
    file: "contact.html",
    dir: "contact",
    title: "Start a Project — Project enquiry | DMGN Creative Agency",
    description:
      "Tell us about your brand, your challenge and your timeline. We reply to every project enquiry within two working days.",
    schema: ["breadcrumb", "contact"],
    scripts: ['<script src="/assets/js/contact-form.js" defer></script>']
  },
  {
    file: "ventures.html",
    dir: "ventures",
    title: "DMGN Ventures — Connect, Travel and Creative Hub",
    description:
      "Beyond the agency, DMGN operates a small group of ventures: DMGN Connect, DMGN Travel and DMGN Creative Hub.",
    schema: ["breadcrumb"]
  },
  {
    file: "thank-you.html",
    dir: "contact/thank-you",
    crumb: "Thank you",
    title: "Thank you — enquiry received | DMGN Creative Agency",
    description: "Your project enquiry has reached DMGN. We reply to every brief within two working days.",
    noindex: true,
    schema: []
  },
  {
    file: "404.html",
    dir: null,
    out: "404.html",
    title: "Page not found | DMGN Creative Agency",
    description: "The page you're looking for doesn't exist or has moved.",
    noindex: true,
    schema: []
  }
];

/* ----------------------------------------------------------------- schema */

const ORG = {
  "@type": "Organization",
  "@id": ORIGIN + "/#organization",
  name: "Deeni Maiyaki Global Network",
  alternateName: "DMGN",
  url: ORIGIN + "/",
  logo: ORIGIN + "/assets/img/dmgn-logo-256.webp",
  description:
    "DMGN is a creative agency working across strategy, brand identity, digital experiences, content and campaigns.",
  email: "contactdmgn@gmail.com",
  telephone: "+234-906-762-8213",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ZB 76 Aliyu Maiyaki Street, Fadukpe",
    addressLocality: "Minna",
    addressRegion: "Niger State",
    addressCountry: "NG"
  },
  founder: { "@type": "Person", name: "Zahradeen Aliyu Maiyaki" }
};

const SERVICE_NAMES = [
  "Creative Strategy",
  "Branding & Identity",
  "Digital Experiences",
  "Content & Media",
  "Campaigns & Marketing",
  "Creative Production"
];

function buildSchema(page, url) {
  const graph = [];
  const kinds = page.schema || [];

  if (kinds.includes("organization")) graph.push(ORG);
  if (kinds.includes("website")) {
    graph.push({
      "@type": "WebSite",
      "@id": ORIGIN + "/#website",
      url: ORIGIN + "/",
      name: "DMGN — Creative Agency",
      publisher: { "@id": ORIGIN + "/#organization" },
      inLanguage: "en-NG"
    });
  }
  if (kinds.includes("breadcrumb")) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: page.crumb || titleCase(page.dir), item: url }
      ]
    });
  }
  if (kinds.includes("services")) {
    SERVICE_NAMES.forEach((name) =>
      graph.push({
        "@type": "Service",
        name,
        serviceType: name,
        provider: { "@id": ORIGIN + "/#organization" },
        areaServed: "Worldwide"
      })
    );
  }
  if (kinds.includes("contact")) {
    graph.push({
      "@type": "ContactPage",
      url,
      name: "Start a Project",
      about: { "@id": ORIGIN + "/#organization" }
    });
  }
  if (kinds.includes("article")) {
    graph.push({
      "@type": "Article",
      headline: page.articleTitle,
      description: page.description,
      datePublished: page.date,
      dateModified: page.date,
      image: ORIGIN + "/assets/img/" + page.image + "-1024.webp",
      author: { "@id": ORIGIN + "/#organization" },
      publisher: { "@id": ORIGIN + "/#organization" },
      mainEntityOfPage: url,
      articleSection: page.pillar
    });
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: "Insights", item: ORIGIN + "/insights/" },
        { "@type": "ListItem", position: 3, name: page.articleTitle, item: url }
      ]
    });
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

/* ------------------------------------------------------------------ utils */

const titleCase = (s) => (s || "").replace(/(^|-)([a-z])/g, (_, d, c) => (d ? " " : "") + c.toUpperCase());
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function navHtml(current) {
  return NAV.map((item) => {
    const active = item.href === current ? ' aria-current="page"' : "";
    return `<li><a href="${item.href}"${active}>${item.label}</a></li>`;
  }).join("");
}

function render(page, body) {
  const layout = fs.readFileSync(path.join(SRC, "layout.html"), "utf8");
  const href = page.dir === null ? "/404.html" : page.dir ? `/${page.dir}/` : "/";
  const url = ORIGIN + href;

  return layout
    .replace(/\{\{title\}\}/g, esc(page.title))
    .replace(/\{\{description\}\}/g, esc(page.description))
    .replace(/\{\{canonical\}\}/g, url)
    .replace(/\{\{origin\}\}/g, ORIGIN)
    .replace(/\{\{ogType\}\}/g, page.ogType || "website")
    .replace(/\{\{schema\}\}/g, buildSchema(page, url))
    .replace(/\{\{navLinks\}\}/g, navHtml(href))
    .replace(/\{\{navLinksMobile\}\}/g, navHtml(href))
    .replace(/\{\{year\}\}/g, String(new Date().getFullYear()))
    .replace(/\{\{pageScripts\}\}/g, (page.scripts || []).join("\n"))
    .replace(
      '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">',
      page.noindex ? '<meta name="robots" content="noindex, follow">' : "$&"
    )
    .replace(/\{\{body\}\}/g, () => body);
}

function write(relPath, contents) {
  const target = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  return target;
}

/* ------------------------------------------------------------------ build */

const written = [];

for (const page of PAGES) {
  const body = fs.readFileSync(path.join(SRC, "pages", page.file), "utf8");
  const out = page.out || path.join(page.dir, "index.html");
  write(out, render(page, body));
  written.push(out);
}

for (const post of POSTS) {
  const body = fs.readFileSync(path.join(SRC, "pages", "insights", post.slug + ".html"), "utf8");
  const page = {
    dir: post.dir,
    title: post.title + " | DMGN Insights",
    articleTitle: post.title,
    description: post.description,
    ogType: "article",
    date: post.date,
    image: post.image,
    pillar: post.pillar,
    schema: ["article"]
  };
  const out = path.join(post.dir, "index.html");
  write(out, render(page, body));
  written.push(out);
}

/* sitemap */
const urls = [
  ...PAGES.filter((p) => !p.noindex).map((p) => ({ loc: p.dir ? `/${p.dir}/` : "/", pri: p.dir ? "0.8" : "1.0" })),
  ...POSTS.map((p) => ({ loc: `/${p.dir}/`, pri: "0.6", lastmod: p.date }))
];
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${ORIGIN}${u.loc}</loc>` +
          (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "") +
          `<priority>${u.pri}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>\n`
);

/* RSS */
const rssDate = (d) => new Date(d + "T09:00:00Z").toUTCString();
write(
  "insights/feed.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n` +
    `<title>DMGN Insights</title>\n<link>${ORIGIN}/insights/</link>\n` +
    `<description>Writing from DMGN on brand, technology, marketing and strategy.</description>\n` +
    `<language>en-NG</language>\n` +
    POSTS.map(
      (p) =>
        `<item><title>${esc(p.title)}</title><link>${ORIGIN}/${p.dir}/</link>` +
        `<guid>${ORIGIN}/${p.dir}/</guid><pubDate>${rssDate(p.date)}</pubDate>` +
        `<category>${esc(p.pillar)}</category>` +
        `<description>${esc(p.description)}</description></item>`
    ).join("\n") +
    `\n</channel></rss>\n`
);

/* robots.txt */
write(
  "robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`
);

/* Legacy WordPress URLs → new Insights URLs, plus host canonicalisation. */
/* Cloudflare evaluates _redirects top to bottom and only accepts
   200/301/302/303/307/308, so exact paths come before any splat rule. */
write(
  "_redirects",
  [
    "# Exact paths first — Cloudflare matches in file order.",
    ...POSTS.map((p) => `${p.legacy}  /${p.dir}/  301`),
    "/wp-login.php     /            301",
    "/xmlrpc.php       /            301",
    "",
    "# Retired WordPress surfaces (wildcards).",
    "/testing/*        /                   301",
    "/wp-admin/*       /                   301",
    "/wp-json/*        /                   301",
    "/feed/*           /insights/feed.xml  301",
    "/comments/feed/*  /insights/feed.xml  301",
    "/category/*       /insights/          301",
    "/tag/*            /insights/          301",
    "/2026/*           /insights/          301",
    ""
  ].join("\n")
);

console.log(`Built ${written.length} pages + sitemap.xml, feed.xml, robots.txt, _redirects`);
written.forEach((f) => console.log("  public/" + f));
