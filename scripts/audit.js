#!/usr/bin/env node
/**
 * Local validation pass. Serve public/ first, then:
 *   node scripts/audit.js [baseURL] [outDir]
 *
 * Checks every page for console errors, failed requests, heading order, images
 * without alt, unlabelled form controls, horizontal overflow at each breakpoint,
 * and transferred page weight. Writes screenshots for visual review.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:8787";
const OUT = process.argv[3] || path.join(require("os").tmpdir(), "dmgn-shots");

const ROUTES = [
  "/", "/work/", "/services/", "/about/", "/insights/", "/contact/",
  "/ventures/", "/404.html",
  "/insights/opay-shutdown-rumour/", "/insights/founder-message/",
  "/insights/one-network-one-vision/", "/insights/sweatcoin-dmgn-lifestyle/",
  "/insights/walk-more-earn-more/", "/contact/thank-you/"
];

const WIDTHS = [1440, 1280, 1024, 768, 390, 375];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  let failures = 0;

  for (const route of ROUTES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();

    const errors = [];
    const failed = [];
    let bytes = 0;

    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("requestfailed", (r) => failed.push(r.url() + " — " + (r.failure() || {}).errorText));
    page.on("response", async (r) => {
      const len = Number(r.headers()["content-length"] || 0);
      if (len) bytes += len;
    });

    const res = await page.goto(BASE + route, { waitUntil: "networkidle" });
    const status = res ? res.status() : 0;

    const report = await page.evaluate(() => {
      const out = {};
      const heads = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
        .map((h) => ({ level: +h.tagName[1], text: h.textContent.trim().slice(0, 40) }));
      out.h1Count = heads.filter((h) => h.level === 1).length;
      out.headingSkips = [];
      let prev = 0;
      heads.forEach((h) => {
        if (prev && h.level > prev + 1) out.headingSkips.push(`h${prev} -> h${h.level}: ${h.text}`);
        prev = h.level;
      });
      out.imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute("alt")).map((i) => i.currentSrc || i.src);
      out.imgsNoDims = [...document.images]
        .filter((i) => !(i.getAttribute("width") && i.getAttribute("height")))
        .map((i) => i.src);
      out.unlabelled = [...document.querySelectorAll("input,select,textarea")]
        .filter((el) => {
          if (el.type === "hidden") return false;
          if (el.closest(".hp")) return false;
          return !(
            el.labels && el.labels.length ||
            el.getAttribute("aria-label") ||
            el.getAttribute("aria-labelledby")
          );
        })
        .map((el) => el.name || el.id || el.tagName);
      out.emptyLinks = [...document.querySelectorAll("a")]
        .filter((a) => !a.textContent.trim() && !a.getAttribute("aria-label") && !a.querySelector("img[alt]:not([alt=''])"))
        .map((a) => a.getAttribute("href"));
      out.title = document.title;
      out.metaDesc = (document.querySelector('meta[name="description"]') || {}).content || "";
      out.canonical = (document.querySelector('link[rel="canonical"]') || {}).href || "";
      const ld = document.querySelector('script[type="application/ld+json"]');
      try { out.schemaValid = ld ? !!JSON.parse(ld.textContent) : false; } catch { out.schemaValid = false; }
      out.internalLinks = [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute("href"));
      return out;
    });

    // Horizontal overflow across breakpoints
    const overflow = [];
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(120);
      const scrollW = await page.evaluate(() =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      );
      if (scrollW > w + 1) overflow.push(`${w}px -> scrollWidth ${scrollW}`);
    }

    // Screenshots at the two key widths
    const slug = route.replace(/[\/.]/g, "_") || "_home";
    for (const w of [1440, 390]) {
      await page.setViewportSize({ width: w, height: 950 });
      await page.waitForTimeout(200);
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = "auto";
        document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
        // Force lazy images in, or the capture records blank tiles.
        document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
        for (let y = 0; y < document.body.scrollHeight; y += 800) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 100));
        }
        window.scrollTo(0, 0);
        await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
      });
      await page.screenshot({ path: path.join(OUT, `${slug}-${w}.png`), fullPage: true });
    }

    const problems = [];
    if (status !== 200 && route !== "/404.html") problems.push("status " + status);
    if (errors.length) problems.push("console: " + errors.join(" | "));
    if (failed.length) problems.push("failed requests: " + failed.join(" | "));
    if (report.h1Count !== 1) problems.push("h1 count = " + report.h1Count);
    if (report.headingSkips.length) problems.push("heading skips: " + report.headingSkips.join(" | "));
    if (report.imgsNoAlt.length) problems.push("img without alt: " + report.imgsNoAlt.join(" | "));
    if (report.imgsNoDims.length) problems.push("img without width/height: " + report.imgsNoDims.join(" | "));
    if (report.unlabelled.length) problems.push("unlabelled control: " + report.unlabelled.join(", "));
    if (report.emptyLinks.length) problems.push("link without accessible name: " + report.emptyLinks.join(", "));
    if (!report.title) problems.push("missing title");
    if (!report.metaDesc) problems.push("missing meta description");
    if (!report.canonical) problems.push("missing canonical");
    if (!report.schemaValid && route !== "/404.html") problems.push("invalid or missing JSON-LD");
    if (overflow.length) problems.push("horizontal overflow: " + overflow.join(", "));

    failures += problems.length;
    console.log(
      `${problems.length ? "FAIL" : " ok "}  ${route.padEnd(42)} ${(bytes / 1024).toFixed(0).padStart(5)} KB`
    );
    problems.forEach((p) => console.log("        - " + p));

    global.__links = (global.__links || new Set());
    report.internalLinks.forEach((l) => global.__links.add(l.split("#")[0]));

    await context.close();
  }

  // Internal link check
  console.log("\nInternal links:");
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const link of [...global.__links].sort()) {
    if (!link || link.startsWith("//")) continue;
    const r = await page.goto(BASE + link, { waitUntil: "domcontentloaded" }).catch(() => null);
    const code = r ? r.status() : 0;
    if (code !== 200) { failures++; console.log(`  BROKEN ${code}  ${link}`); }
  }
  console.log("  (all other internal links resolved 200)");
  await context.close();

  await browser.close();
  console.log(`\nScreenshots: ${OUT}`);
  console.log(failures ? `\n${failures} problem(s) found.` : "\nNo problems found.");
  process.exit(failures ? 1 : 0);
})();
