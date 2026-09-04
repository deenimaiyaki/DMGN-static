/* DMGN — site behaviour. ~1.5 KB, no dependencies, deferred. */
(function () {
  "use strict";

  /* Sticky nav background ------------------------------------------------ */
  var nav = document.querySelector(".nav");
  if (nav) {
    var setStuck = function () {
      nav.dataset.stuck = window.scrollY > 8 ? "true" : "false";
    };
    setStuck();
    window.addEventListener("scroll", setStuck, { passive: true });
  }

  /* Mobile navigation ---------------------------------------------------- */
  var toggle = document.querySelector(".nav__toggle");
  var panel = document.getElementById("nav-panel");
  if (toggle && panel) {
    var close = function () {
      toggle.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      document.documentElement.style.removeProperty("overflow");
    };
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      if (open) return close();
      toggle.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      document.documentElement.style.overflow = "hidden";
      var first = panel.querySelector("a, button");
      if (first) first.focus();
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        close();
        toggle.focus();
      }
    });
    // A resize into the desktop breakpoint must not leave the panel latched open.
    window.matchMedia("(min-width: 62rem)").addEventListener("change", function (m) {
      if (m.matches) close();
    });
  }

  /* Scroll reveal -------------------------------------------------------- */
  var targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;
  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  targets.forEach(function (el) { io.observe(el); });

  // Safety net: content must never stay invisible because the observer did not
  // run (background tab, print, restored session, prerender).
  window.setTimeout(function () {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
    io.disconnect();
  }, 2500);
})();
