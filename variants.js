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
