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
    file: "test_inview-scrollend.html",
    name: "inview-scrollend",
    mode: "slides",
    scroller: `${FLEX_ROW}
    overflow: hidden;`,
    slide: FLEX_SLIDE,
    css: `  .scroller.is-live {
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
  }`,
    // The observer only records; the classes are applied once scrolling has
    // stopped, so no style or layout work lands in the middle of a gesture.
    extra: `  const pending = new Map();
  let primed = false;

  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) pending.set(entry.target, entry.isIntersecting);
      /* The first report is what the page opens on, and no scroll has happened
         yet to flush it. Everything after that waits for scrolling to stop. */
      if (!primed) {
        primed = true;
        requestIdleCallback(flush);
      }
    },
    { rootMargin: window.innerHeight * 2 + "px" },
  );

  const flush = () => {
    requestAnimationFrame(() => {
      for (const [tile, isInView] of pending) {
        tile.querySelector(".scroller")?.classList.toggle("is-live", isInView);
      }
      pending.clear();
    });
  };

  for (const tile of document.querySelectorAll(".tile")) watcher.observe(tile);

  window.addEventListener("scrollend", flush, { passive: true });`,
  },
];

/* Appended experiments — deleted once measured. */

const BASE_SCROLLER = `    display: flex;
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: hidden;
    overflow-x: auto;
    overscroll-behavior-inline: contain;`;

VARIANTS.push(
  {
    // Declares a scroll container whose content fits exactly, so it never gains
    // scrollable overflow. Same DOM and same declaration as `full`.
    file: "test_auto-no-overflow.html",
    name: "auto-no-overflow",
    mode: "slides",
    scroller: `${BASE_SCROLLER}
    gap: 0;`,
    slide: `    flex: 0 0 10%;
    display: flex;
    align-items: center;
    justify-content: center;`,
    css: `  .box { width: 100%; height: 200px }`,
  },
  {
    // One oversized slide holding a 4px box: scrollable, with almost nothing in
    // it. Run with ?slides=1.
    file: "test_empty-scrollers.html",
    name: "empty-scrollers",
    mode: "slides",
    scroller: `${BASE_SCROLLER}
    gap: 0;`,
    slide: `    flex: 0 0 200%;`,
    css: `  .box { width: 4px; height: 4px }`,
  },
  {
    // The same construction turned ninety degrees, to see whether the inline
    // axis is what costs.
    file: "test_vertical.html",
    name: "vertical",
    mode: "slides",
    scroller: `    display: flex;
    flex-direction: column;
    gap: 16px;
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: hidden;
    overflow-y: auto;
    overscroll-behavior-block: contain;`,
    slide: `    flex: 0 0 100%;
    display: flex;
    align-items: center;
    justify-content: center;`,
  },
);

VARIANTS.push(
  {
    // `scroll` rather than `auto`: the scrollbar is always live, so this asks
    // whether the cost follows the keyword or the scrollable overflow.
    file: "test_overflow-scroll.html",
    name: "overflow-scroll",
    mode: "slides",
    scroller: `    display: flex;
    gap: 16px;
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: hidden;
    overflow-x: scroll;
    overscroll-behavior-inline: contain;`,
    slide: `    flex: 0 0 100%;
    display: flex;
    align-items: center;
    justify-content: center;`,
  },
  {
    // Scrollable on both axes at once.
    file: "test_overflow-both.html",
    name: "overflow-both",
    mode: "slides",
    scroller: `    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: auto;
    overscroll-behavior: contain;`,
    slide: `    flex: 0 0 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;`,
  },
);

/* Same scroller, same overflow, different formatting context. */

const SCROLL_RULES = `    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: hidden;
    overflow-x: auto;
    overscroll-behavior-inline: contain;`;

VARIANTS.push(
  {
    file: "test_display-block.html",
    name: "display-block",
    mode: "slides",
    scroller: `    display: block;
    white-space: nowrap;
${SCROLL_RULES}`,
    slide: `    display: inline-block;
    width: 100%;
    height: 100%;
    text-align: center;`,
  },
  {
    file: "test_display-grid.html",
    name: "display-grid",
    mode: "slides",
    scroller: `    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    gap: 16px;
${SCROLL_RULES}`,
    slide: `    display: flex;
    align-items: center;
    justify-content: center;`,
  },
  {
    file: "test_display-inline-block.html",
    name: "display-inline-block",
    mode: "slides",
    // No nowrap: the slides are floated instead, so the line box plays no part.
    scroller: `    display: block;
${SCROLL_RULES}`,
    slide: `    float: left;
    width: 100%;
    height: 100%;`,
  },
);
