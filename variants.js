/**
 * Constructions that still scroll horizontally, each betting on a different reason
 * the memory might be avoided. `scroller` replaces the row's rules, `css` appends
 * raw rules, `extra` appends a script that runs after the rows exist.
 */

const FLEX_ROW = `    display: flex;
    gap: 16px;
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;`;

const FLEX_SLIDE = `    flex: 0 0 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;`;

const scrollable = (extra = "") => `${FLEX_ROW}
    overflow: hidden;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;${extra ? `\n${extra}` : ""}`;

export const VARIANTS = [
  {
    file: "test_snap.html",
    name: "snap",
    mode: "slides",
    // Kept for the record: snapping on top of a scroll container changes nothing.
    scroller: scrollable(),
    slide: FLEX_SLIDE,
  },
  // ---- different ways of being scrollable ----
  {
    file: "test_overflow-scroll.html",
    name: "overflow-scroll",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow-x: scroll;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_overflow-y-visible.html",
    name: "overflow-y-visible",
    mode: "slides",
    // `visible` alongside a scrolling x axis is promoted to `auto` by the spec;
    // this checks whether starting from `visible` costs the same as `hidden`.
    scroller: `${FLEX_ROW}
    overflow-x: auto;
    overflow-y: visible;
    scroll-snap-type: x mandatory;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_overflow-clip.html",
    name: "overflow-clip",
    mode: "slides",
    // `clip` is specified as not creating a scroll container at all.
    scroller: `${FLEX_ROW}
    overflow-x: clip;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_overflow-anchor.html",
    name: "overflow-anchor",
    mode: "slides",
    scroller: scrollable(`    overflow-anchor: none;`),
    slide: FLEX_SLIDE,
  },
  {
    file: "test_scrollbar-auto.html",
    name: "scrollbar-auto",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow: hidden;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: auto;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_position-absolute.html",
    name: "position-absolute",
    mode: "slides",
    tile: `    position: relative;
    height: 400px;`,
    scroller: `${scrollable()}
    position: absolute;
    inset: 8px 16px 24px;`,
    slide: FLEX_SLIDE,
  },

  // ---- containment and rendering hints ----
  {
    file: "test_cv-scroller.html",
    name: "cv-scroller",
    mode: "slides",
    scroller: `${scrollable()}
    content-visibility: auto;
    contain-intrinsic-size: auto 400px;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_contain-slp.html",
    name: "contain-slp",
    mode: "slides",
    scroller: `${scrollable()}
    contain: size layout paint;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_contain-content.html",
    name: "contain-content",
    mode: "slides",
    tile: `    contain: content;`,
    scroller: scrollable(),
    slide: FLEX_SLIDE,
  },
  {
    file: "test_cv-hidden.html",
    name: "cv-hidden",
    mode: "slides",
    scroller: scrollable(),
    slide: FLEX_SLIDE,
    css: `  .tile.is-away { content-visibility: hidden; contain-intrinsic-size: auto 400px }`,
    extra: `  // Hide every row outside a two-viewport window, and reveal it on approach.
  const margin = window.innerHeight * 2 + "px";
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("is-away", !entry.isIntersecting);
      }
    },
    { rootMargin: margin },
  );
  for (const tile of document.querySelectorAll(".tile")) watcher.observe(tile);`,
  },
  {
    file: "test_will-change.html",
    name: "will-change",
    mode: "slides",
    scroller: `${scrollable()}
    will-change: scroll-position;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_translatez.html",
    name: "translatez",
    mode: "slides",
    scroller: `${scrollable()}
    transform: translateZ(0);`,
    slide: FLEX_SLIDE,
  },

  // ---- fewer scrollers ----
  {
    file: "test_touch-upgrade.html",
    name: "touch-upgrade",
    mode: "slides",
    // Rows are inert until touched. This is the shape a real listing could ship.
    scroller: `${FLEX_ROW}
    overflow: hidden;`,
    slide: FLEX_SLIDE,
    css: `  .scroller.is-live {
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
  }`,
    extra: `  // touchstart lands before the scroll gesture is recognised, so upgrading here
  // still lets the first swipe through.
  document.addEventListener(
    "touchstart",
    (event) => {
      const scroller = event.target.closest?.(".scroller");
      scroller?.classList.add("is-live");
    },
    { passive: true },
  );`,
  },
  {
    file: "test_io-window.html",
    name: "io-window",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow: hidden;`,
    slide: FLEX_SLIDE,
    css: `  .scroller.is-live {
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
  }`,
    extra: `  // Only rows within two viewports are scroll containers; the rest give it back.
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target
          .querySelector(".scroller")
          ?.classList.toggle("is-live", entry.isIntersecting);
      }
    },
    { rootMargin: window.innerHeight * 2 + "px" },
  );
  for (const tile of document.querySelectorAll(".tile")) watcher.observe(tile);`,
  },
  {
    file: "test_first-20.html",
    name: "first-20",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow: hidden;`,
    slide: FLEX_SLIDE,
    css: `  .scroller.is-live {
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
  }`,
    // Separates the count of scroll containers from everything else: same rows,
    // same boxes, twenty scrollers.
    extra: `  for (const scroller of [...document.querySelectorAll(".scroller")].slice(0, 20)) {
    scroller.classList.add("is-live");
  }`,
  },
  {
    file: "test_one-live.html",
    name: "one-live",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow: hidden;`,
    slide: FLEX_SLIDE,
    css: `  .scroller.is-live {
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
  }`,
    extra: `  // Exactly one scroll container exists at a time — the row under the finger.
  let live = null;
  document.addEventListener(
    "touchstart",
    (event) => {
      const scroller = event.target.closest?.(".scroller");
      if (!scroller || scroller === live) return;
      live?.classList.remove("is-live");
      scroller.classList.add("is-live");
      live = scroller;
    },
    { passive: true },
  );`,
  },

  // ---- no scroll container at all ----
  {
    file: "test_transform-swipe.html",
    name: "transform-swipe",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow: hidden;
    touch-action: pan-y;`,
    slide: FLEX_SLIDE,
    extra: `  // Swipe by moving the row, so nothing is ever a scroll container.
  let start = 0;
  let offset = 0;
  let row = null;

  document.addEventListener("touchstart", (event) => {
    row = event.target.closest?.(".scroller");
    if (!row) return;
    start = event.touches[0].clientX;
    offset = Number(row.dataset.offset ?? 0);
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (!row) return;
    const moved = offset + event.touches[0].clientX - start;
    row.style.transform = "translate3d(" + moved + "px,0,0)";
    row.dataset.offset = String(moved);
  }, { passive: true });

  document.addEventListener("touchend", () => { row = null; }, { passive: true });`,
  },
  {
    file: "test_transform-snap.html",
    name: "transform-snap",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow: hidden;
    touch-action: pan-y;`,
    slide: FLEX_SLIDE,
    css: `  .scroller.is-settling { transition: transform 200ms ease-out }`,
    extra: `  // As above, but the offset settles onto a slide when the finger lifts.
  let start = 0;
  let index = 0;
  let row = null;

  const width = () => window.innerWidth - 32 + 16;

  document.addEventListener("touchstart", (event) => {
    row = event.target.closest?.(".scroller");
    if (!row) return;
    row.classList.remove("is-settling");
    start = event.touches[0].clientX;
    index = Number(row.dataset.index ?? 0);
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (!row) return;
    const moved = event.touches[0].clientX - start - index * width();
    row.style.transform = "translate3d(" + moved + "px,0,0)";
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    if (!row) return;
    const moved = event.changedTouches[0].clientX - start;
    const next = Math.max(0, index - Math.sign(moved) * (Math.abs(moved) > 40 ? 1 : 0));
    row.dataset.index = String(next);
    row.classList.add("is-settling");
    row.style.transform = "translate3d(" + -next * width() + "px,0,0)";
    row = null;
  }, { passive: true });`,
  },
  {
    file: "test_sticky.html",
    name: "sticky",
    mode: "slides",
    // Vertical scroll drives the horizontal position, so no horizontal scroller.
    tile: `    height: 400px;`,
    scroller: `${FLEX_ROW}
    overflow: hidden;
    position: sticky;
    top: 34px;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_css-carousel.html",
    name: "css-carousel",
    mode: "slides",
    // The CSS carousel primitives added in Safari 26.
    scroller: `${scrollable()}
    scroll-marker-group: after;`,
    slide: `${FLEX_SLIDE}
    &::scroll-marker { content: ""; width: 6px; height: 6px }`,
  },

  // ---- the first five, kept ----
  {
    file: "test_inline-block.html",
    name: "inline-block",
    mode: "slides",
    scroller: `    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
    white-space: nowrap;
    aspect-ratio: 1 / 1;`,
    slide: `    display: inline-block;
    width: 100%;
    text-align: center;
    scroll-snap-align: center;`,
  },
  {
    file: "test_overflow-auto.html",
    name: "overflow-auto",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_contain.html",
    name: "contain",
    mode: "slides",
    scroller: `${scrollable()}
    contain: strict;`,
    slide: FLEX_SLIDE,
  },
  {
    file: "test_absolute.html",
    name: "absolute",
    mode: "boxes",
    scroller: `    width: 2000px;
    height: 2000px;
    position: relative;
    overflow-x: auto;`,
    slide: null,
  },
];
