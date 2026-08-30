/**
 * Generates the demo pages and the index.
 *
 * Each demo is standalone — inline CSS and inline JS, no shared files — so a single
 * page can be handed to someone as the whole reproduction.
 */
import { writeFileSync } from "node:fs";
import { VARIANTS } from "./variants.js";

const REPO = "https://github.com/jantimon/repro-scroller-memory";
const SITE = "https://jantimon.github.io/repro-scroller-memory/";
const BUG = (id) => `https://bugs.webkit.org/show_bug.cgi?id=${id}`;

const DEMOS = [
  {
    file: "noscroller.html",
    name: "noscroller",
    about:
      "Baseline (not scroll containers)",
    css: `overflow: hidden;`,
    rules: null,
    stats: [
      { verdict: "ok", label: "no crash", note: "tested to 5000 rows",
        os: "iOS 26, iOS 27 Beta", devices: "iPhone 15 and 17 Pro" },
    ],
  },
  {
    file: "content-visibility.html",
    name: "content-visibility",
    about:
      "Baseline with overflow-x: auto and css content-visibility",
    stats: [
      { verdict: "ok", label: "no crash", note: "tested to 5000 rows",
        os: "iOS 26, iOS 27 Beta", devices: "iPhone 15 and 17 Pro" },
    ],
    css: `overflow-x: auto;

/* on the row */
content-visibility: auto;`,
    tile: `    content-visibility: auto;
    contain-intrinsic-size: auto 400px;`,
    rules: `    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: none;
  }

  .scroller::-webkit-scrollbar {
    display: none;`,
  },
  {
    file: "inview.html",
    name: "inview",
    fpsButton: true,
    about:
      "An IntersectionObserver turns a row a scroll container with overflow-x: auto only as long it is in view",
    stats: [
      { verdict: "ok", label: "no crash", note: "tested to 5000 rows",
        os: "iOS 26", devices: "iPhone 17 Pro" },
    ],
    css: `overflow-x: auto;\n/* only while near the viewport */`,
    rules: null,
    style: `  .scroller.is-live {
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: none;
  }

  .scroller.is-live::-webkit-scrollbar {
    display: none;
  }`,
    extra: `  // One observer, every row as a target. Only rows within two viewports are
  // scroll containers.
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
    file: "inview.html",
    name: "inview",
    group: "timeline",
    cardOnly: true,
    about: "The same page, without any scroll timeline",
    alsoRun: "scroll-down=1",
    css: `overflow-x: auto;\n/* only while near the viewport */`,
    rules: null,
    stats: [
      { verdict: "ok", label: "59 fps", note: "500 and 1000 rows",
        os: "iOS 26, iOS 27 Beta", devices: "iPhone 14, 15, 15 Pro Max, 17 Pro" },
    ],
  },
  {
    file: "inview-timeline.html",
    name: "inview-timeline",
    fpsButton: true,
    group: "timeline",
    alsoRun: "scroll-down=1",
    alsoRunDanger: true,
    about:
      "As inview, with a scroll timeline reading each row and one timeline name per row",
    stats: [
      { verdict: "ok", label: "50 to 59 fps", note: "500 rows, shorter rows land at the lower end",
        os: "iOS 26", devices: "iPhone 14, 15, 15 Pro Max, 17 Pro" },
      { verdict: "bad", label: "low, 17 to 27 fps", note: "1000 rows",
        os: "iOS 26", devices: "iPhone 14, 15, 15 Pro Max, 17 Pro" },
      { verdict: "bad", label: "low, 11 fps", note: "1000 rows",
        os: "iOS 27 Beta", devices: "iPhone 15" },
    ],
    css: `overflow-x: auto;\nscroll-timeline: var(--row) inline;`,
    tile: `    timeline-scope: var(--row);`,
    rules: null,
    style: `  .scroller.is-live {
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: none;
    scroll-timeline: var(--row) inline;
  }

  .scroller.is-live::-webkit-scrollbar {
    display: none;
  }

  .tile::after {
    content: "";
    display: block;
    height: 4px;
    margin-top: 8px;
    background: #8a94a6;
    animation: sweep linear both;
    animation-timeline: var(--row);
  }

  @keyframes sweep {
    from { width: 10% }
    to { width: 100% }
  }`,
    extra: `  // A name per row: WebKit resolves a single name shared across hundreds of
  // elements very slowly.
  document.querySelectorAll(".tile").forEach((tile, index) => {
    tile.style.setProperty("--row", "--row" + index);
  });

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
    file: "full.html",
    name: "full",
    about:
      "Same as baseline but overflow-x: auto. This example crashes the page because out of memory",
    stats: [
      { verdict: "ok", label: "no crash", note: "tested to 5000 rows",
        os: "iOS 15, iOS 16, iOS 17", devices: "iPhone SE 2022, 13 and 15" },
      { verdict: "bad", label: "crashes", note: "at 200 rows",
        os: "iOS 18, iOS 26, iOS 27 Beta",
        devices: "iPhone 12 Pro, 13, 14, 15, 15 Pro Max, 17 Pro" },
    ],
    footnote: "\u26A0\uFE0F Crashes only happen on real iPhones, not in the Simulator",
    css: `overflow-x: auto;`,
    danger: true,
    rules: `    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: none;
  }

  .scroller::-webkit-scrollbar {
    display: none;`,
  },
];


/**
 * The script every page runs. Progress is written to `document.title` and to
 * `localStorage`, because a killed web view takes the console and the socket with
 * it but leaves storage intact — so the run can still be read back afterwards.
 *
 * `?scroll-down` walks the page to the bottom and records that it got there.
 */
const runtime = (name, nested) => `<script>
  const params = new URLSearchParams(location.search);
  const size = (key, fallback) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const TILES = size("tiles", 1000);
  const SLIDES = size("slides", 10);
  const NESTED = ${nested};
  const NAME = ${JSON.stringify(name)};

  const record = (phase, extra) => {
    const state = { page: NAME, rows: TILES, phase, ...extra };
    document.title = NAME + " " + TILES + " " + phase;
    try {
      localStorage.setItem("run", JSON.stringify(state));
    } catch {}
    return state;
  };

  record("start");

  const fragment = document.createDocumentFragment();

  for (let tile = 0; tile < TILES; tile++) {
    const row = document.createElement("div");
    row.className = "tile";

    const scroller = document.createElement("div");
    scroller.className = "scroller";

    for (let slide = 0; slide < SLIDES; slide++) {
      const box = document.createElement("div");
      box.className = "box";
      if (NESTED) {
        const cell = document.createElement("div");
        cell.className = "slide";
        cell.appendChild(box);
        scroller.appendChild(cell);
      } else {
        scroller.appendChild(box);
      }
    }

    row.appendChild(scroller);
    fragment.appendChild(row);
  }

  document.getElementById("list").appendChild(fragment);

  const elements = document.getElementsByTagName("*").length;
  record("built", { elements });
  const out = document.getElementById("out") ?? document.getElementById("bar");
  out.textContent =
    NAME + " \u2014 " + TILES + " rows \u00d7 " + SLIDES + " slides, " + elements + " elements";

  /* Walks the page down a viewport per frame and records the frame intervals,
     so the number describes the page rather than how fast a finger moved. */
  const walkDown = (done) => {
    const frames = [];
    let last = performance.now();
    let previous = -1;
    let stalled = 0;

    const timing = () => {
      if (frames.length < 2) return {};
      const sorted = [...frames].sort((a, b) => a - b);
      const at = (share) => sorted[Math.floor(sorted.length * share)];
      return {
        frames: frames.length,
        fps: Math.round(1000 / at(0.5)),
        medianMs: Math.round(at(0.5)),
        p90Ms: Math.round(at(0.9)),
        worstMs: Math.round(sorted[sorted.length - 1]),
        longFrames: sorted.filter((ms) => ms > 50).length,
      };
    };

    const finish = (phase, extra) => {
      const state = record(phase, { elements, ...timing(), ...extra });
      if (state.fps) {
        out.textContent =
          state.fps + " fps, median " + state.medianMs + " ms, p90 " +
          state.p90Ms + " ms, " + state.longFrames + " of " + state.frames +
          " frames over 50 ms";
      }
      done?.();
    };

    const step = () => {
      const now = performance.now();
      frames.push(now - last);
      last = now;

      const bottom = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= bottom - 2) return finish("scrolled");

      /* scrollY is updated off the main thread, so the frame after a scrollBy
         often still reads the old position. Only give up once it has not moved
         for three seconds. */
      if (window.scrollY === previous) {
        if (++stalled > 180) return finish("stalled", { at: window.scrollY });
      } else {
        stalled = 0;
      }

      previous = window.scrollY;
      window.scrollBy(0, window.innerHeight);
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (params.has("scroll-down")) walkDown();

  const button = document.getElementById("run");
  button?.addEventListener("click", () => {
    button.disabled = true;
    document.getElementById("out").textContent = "scrolling\u2026";
    walkDown(() => { button.disabled = false; });
  });
<\/script>
`;

const demoPage = ({ name, rules, tile, style, extra, fpsButton }) => `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${name}</title>
<style>
  :root { color-scheme: light dark; }

  body {
    margin: 0;
    font: 13px/1.4 system-ui, sans-serif;
  }

  #bar {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: #111;
    color: #eee;
    font-variant-numeric: tabular-nums;
  }
${fpsButton ? `
  #run {
    flex: none;
    padding: 6px 12px;
    border: 0;
    border-radius: 6px;
    background: #eee;
    color: #111;
    font: inherit;
  }

  #run:disabled { opacity: 0.5 }
` : ""}
  #list { padding-top: 34px; }

  .tile {
    padding: 8px 16px 24px;${tile ? `\n${tile}` : ""}
  }

  .scroller {
    display: flex;
    gap: 16px;
    /* Whole pixels: at a fractional width a slide would otherwise stop a fraction short. */
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: hidden;${rules ? `\n${rules}` : ""}
  }

  .slide {
    flex: 0 0 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .box {
    width: 200px;
    height: 200px;
    background: #c0c6d0;
  }
${style ? `\n${style}\n` : ""}</style>

<div id="bar">${fpsButton ? `<button id="run">scroll to bottom</button><span id="out"></span>` : ""}</div>
<div id="list"></div>

${runtime(name, true)}${extra ? `\n<script>\n${extra}\n<\/script>\n` : ""}`;


/**
 * Scenarios probing whether a different construction avoids the cost. Prefixed
 * `test_` and deliberately not linked from the index — they are experiments, not
 * part of the reproduction.
 *
 * `mode` picks the markup: "slides" nests a box in a slide, "boxes" puts the
 * boxes straight in the scroller.
 */
const TESTS = VARIANTS;

const testPage = ({ name, mode, tile, scroller, slide, css, extra }) => `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${name}</title>
<style>
  :root { color-scheme: light dark; }

  body {
    margin: 0;
    font: 13px/1.4 system-ui, sans-serif;
  }

  #bar {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: #111;
    color: #eee;
    font-variant-numeric: tabular-nums;
  }
  #list { padding-top: 34px; }

  .tile {
    padding: 8px 16px 24px;${tile ? `\n${tile}` : ""}
  }

  .scroller {
    scrollbar-width: none;
${scroller}
  }

  .scroller::-webkit-scrollbar { display: none; }
${slide ? `\n  .slide {\n${slide}\n  }\n` : ""}
  .box {
    width: 200px;
    height: 200px;
    background: #c0c6d0;
  }
${css ? `\n${css}\n` : ""}${mode === "boxes" ? Array.from({ length: 10 }, (_, index) => `
  .box:nth-child(${index + 1}) { position: absolute; left: ${index * 216}px; top: 0 }`).join("") : ""}
</style>

<div id="bar"></div>
<div id="list"></div>

${runtime(name, mode === "slides")}${extra ? `\n<script>\n${extra}\n<\/script>\n` : ""}`;

/**
 * Measured outcome per demo. The number carries the weight, the device list
 * shows the spread, and the repeated figure across cards is the finding.
 */
const statLine = ({ verdict, label, note, os, devices }) => `      <div class="stat is-${verdict}">
        <div class="where">
          <span class="os">${os}</span>
          <span class="devices">${devices}</span>
        </div>
        <span class="verdict">${verdict === "ok" ? "\u2705" : "\uD83D\uDCA5"} ${label}</span>
        <span class="note">${note}</span>
      </div>`;

const card = ({ file, name, about, css, danger, stats, footnote, alsoRun, alsoRunDanger }) => `  <li>
    <div class="head">
      <h2>${name}</h2>
      <p class="about">${about}</p>
    </div>
    <a class="source" href="${REPO}/blob/main/${file}" target="_blank" rel="noopener"
       aria-label="Source code for ${name} on GitHub"><span>Source code</span>
      <svg class="gh" aria-hidden="true"><use href="#github"></use></svg></a>
    <pre class="css">${css}</pre>
    <div class="stats">
${(stats ?? []).map(statLine).join("\n")}${footnote ? `\n      <p class="footnote">${footnote}</p>` : ""}
    </div>
    <div class="runs">
      <a class="run${alsoRun ? " is-secondary" : danger ? " is-danger" : ""}" href="${file}" target="_blank" rel="noopener">${alsoRun ? "Open" : "Run"} ${name}</a>${
        alsoRun
          ? `\n      <a class="run${alsoRunDanger ? " is-danger" : ""}" href="${file}?${alsoRun}" target="_blank" rel="noopener">Run ${name} (auto scroll)</a>`
          : ""
      }
    </div>
  </li>`;

const index = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Scroller memory repro</title>
<meta name="description" content="A long list where every row is its own scroller kills the tab on iOS 18 and later. Around 200 rows is enough. The same phone on iOS 17 renders 5000.">

<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}">
<meta property="og:title" content="200 scroll containers crash the tab on iOS">
<meta property="og:description" content="overflow-x: auto on 200 rows kills the WebContent process on iOS 18 and later. The same phone on iOS 17 renders 5000. Not fixed in iOS 27 Beta.">
<meta property="og:image" content="${SITE}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="iOS 15, 16 and 17 render 5000 rows without crashing. iOS 18, 26 and 27 Beta crash at 200 rows.">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="200 scroll containers crash the tab on iOS">
<meta name="twitter:description" content="overflow-x: auto on 200 rows kills the WebContent process on iOS 18 and later. The same phone on iOS 17 renders 5000. Not fixed in iOS 27 Beta.">
<meta name="twitter:image" content="${SITE}og.png">

<link rel="stylesheet" href="https://unpkg.com/@speed-highlight/core@2.1.0/dist/themes/github-light.css">
<style>
  body {
    font: 16px/1.5 system-ui, sans-serif;
    max-width: 62rem;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #222;
  }

  h1 { font-size: 1.5rem; margin: 0 }
  header p { margin-top: 0; color: #666; max-width: 44rem }

  .title { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap;
       margin-bottom: 0.25rem }
  .repo { display: inline-flex; align-items: center; gap: 0.35rem; color: #475467;
       text-decoration: none; font-size: 0.875rem; font-weight: 600 }
  .repo:hover { color: #101828 }
  .repo .gh { align-self: center }

  code { font-size: 0.9em; background: #f2f4f7; padding: 0.1em 0.35em; border-radius: 4px }

  /* min() so a narrow phone can't push a 18rem column past the viewport */
  .demos {
    display: grid;
    gap: 1.5rem;
    list-style: none;
    padding: 0;
    margin: 2rem 0 0;
    /* Wide enough that four cards land as two rows of two rather than three
       and a stranded one. */
    grid-template-columns: repeat(auto-fill, minmax(min(26rem, 100%), 1fr));
  }

  /* Each card takes its rows from the parent grid, so headings of one and two
     lines still leave every snippet and button starting on the same line. */
  .demos li {
    position: relative;
    display: grid;
    grid-template-rows: subgrid;
    grid-row: span 4;
    row-gap: 0;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 0 0 1px rgb(16 24 40 / 0.06),
                0 1px 2px rgb(16 24 40 / 0.06),
                0 12px 28px -10px rgb(16 24 40 / 0.22);
  }

  h2 { font-size: 1rem; margin: 0 }

  .group { font-size: 1.125rem; margin: 2.5rem 0 0.25rem }
  .group-about { margin: 0; color: #666; max-width: 44rem; font-size: 0.9375rem }
  .filed { margin: 0.35rem 0 0; font-size: 0.875rem; color: #667085 }
  .filed a { color: #b42318; font-weight: 600 }
  .group + .group-about + .demos { margin-top: 1rem }
  .about { margin: 0.25rem 0 0; color: #666; font-size: 0.875rem }

  .head { padding: 0.875rem 1rem }
  /* Only the heading shares a line with the tab; the description below it runs
     the full width of the card. */
  .head h2 { padding-right: 8.5rem }

  /* Sits in the card's own top-right corner, folder-tab style. */
  .source {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.85rem;
    border-left: 1px solid #eaecf0;
    border-bottom: 1px solid #eaecf0;
    border-bottom-left-radius: 12px;
    color: #475467;
    text-decoration: none;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .source:hover { color: #101828; background: #f9fafb }
  .gh { width: 1.125rem; height: 1.125rem; fill: currentColor }

  /* Too narrow for the words — the mark alone still says where it goes. */
  @media (max-width: 26rem) {
    .source span { display: none }
    .head h2 { padding-right: 3rem }
  }

  .css {
    margin: 0;
    padding: 0.75rem 1rem;
    border-top: 1px solid #eaecf0;
    background: #fcfcfd;
    font: 0.8125rem/1.5 ui-monospace, monospace;
    color: #475467;
    white-space: pre;
    overflow-x: auto;
  }

  .stats {
    padding: 0.875rem 1rem;
    border-top: 1px solid #eaecf0;
    display: grid;
    align-content: start;
    gap: 0.875rem;
  }

  /* Where it was tested on the left, what happened on the right, centred
     against it. The verdict is the only part that needs no context. */
  .stat {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: 1rem;
  }

  .where { display: grid; gap: 0.125rem; min-width: 0 }
  .os,
  .devices { font-size: 0.8125rem; font-weight: 600; color: #475467 }

  .verdict {
    font-size: 0.9375rem;
    font-weight: 700;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  .is-ok .verdict { color: #067647 }
  .is-bad .verdict { color: #b42318 }

  /* Sits under both columns, so it reads as an aside rather than a claim. */
  .note {
    grid-column: 1 / -1;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #98a2b3;
    font-variant-numeric: tabular-nums;
  }

  .footnote { margin: 0; font-size: 0.8125rem; color: #667085 }

  .runs { display: grid }

  .run {
    display: block;
    padding: 0.875rem 1rem;
    border-top: 1px solid #eaecf0;
    background: #101828;
    color: #fff;
    text-align: center;
    text-decoration: none;
    font-weight: 600;
  }

  .run:hover { background: #344054 }
  .run + .run { border-top: 1px solid rgb(255 255 255 / 0.15) }

  /* The one that kills the tab. */
  .run.is-secondary { background: #f2f4f7; color: #344054 }
  .run.is-secondary:hover { background: #eaecf0 }

  .run.is-danger { background: #b42318 }
  .run.is-danger:hover { background: #912018 }

  .size { display: flex; align-items: center; gap: 0.5rem; margin: 1.25rem 0 0 }
  .size label { color: #666 }
  .size select { font: inherit; padding: 0.35rem 0.5rem; border: 1px solid #d0d5dd;
       border-radius: 8px; background: #fff; color: inherit }

  /* On a phone the control scrolls away before the buttons it configures are
     reachable, so it follows instead. The shadow only appears once it has left
     its place in the flow. */
  @media (max-width: 40rem) {
    .size {
      position: sticky;
      top: 0;
      z-index: 5;
      margin: 1.25rem -1rem 0;
      padding: 0.625rem 1rem;
      background: #fff;
      box-shadow: 0 1px 0 rgb(16 24 40 / 0.08), 0 6px 16px -8px rgb(16 24 40 / 0.28);
    }
  }

  .results { margin-top: 2.5rem; border-radius: 12px; overflow: hidden; background: #fff;
       box-shadow: 0 0 0 1px rgb(16 24 40 / 0.06),
                   0 1px 2px rgb(16 24 40 / 0.06),
                   0 12px 28px -10px rgb(16 24 40 / 0.22) }
  .results .head { padding-right: 1rem }
  .results table { width: 100%; border-collapse: collapse; border-top: 1px solid #eaecf0 }
  .results th, .results td { padding: 0.5rem 1rem; text-align: left; font-size: 0.875rem;
       border-top: 1px solid #f2f4f7 }
  .results th { background: #fcfcfd; color: #667085; font-size: 0.75rem; font-weight: 600;
       letter-spacing: 0.04em; text-transform: uppercase; border-top: 0 }
  .results td:last-child { font-variant-numeric: tabular-nums }
  .verdicts td:first-child { width: 55% }
  .verdicts .bad { color: #b42318; font-weight: 600 }
  .verdicts .ok { color: #067647; font-weight: 600 }
  .caveat { margin: 0; padding: 0.875rem 1rem; border-top: 1px solid #eaecf0;
       background: #fcfcfd; color: #667085; font-size: 0.8125rem; max-width: none }

  .markup { margin-top: 1.5rem; border-radius: 12px; overflow: hidden; background: #fff;
       box-shadow: 0 0 0 1px rgb(16 24 40 / 0.06),
                   0 1px 2px rgb(16 24 40 / 0.06),
                   0 12px 28px -10px rgb(16 24 40 / 0.22) }
  .markup .head { padding-right: 1rem }
  .markup .panes { display: grid; gap: 0; border-top: 1px solid #eaecf0;
       grid-template-columns: repeat(auto-fit, minmax(min(22rem, 100%), 1fr)) }
  /* Rows so the code block can stretch to the tallest pane. */
  .markup .pane { min-width: 0; border-left: 1px solid #eaecf0;
       display: grid; grid-template-rows: auto 1fr }
  .markup .pane:first-child { border-left: 0 }
  .markup h3 { margin: 0; padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 600;
       letter-spacing: 0.04em; text-transform: uppercase; color: #667085;
       background: #fcfcfd; border-bottom: 1px solid #eaecf0 }
  /* The highlighter sets its own colours; this only controls the box. Its own
     border and radius would draw a second card inside this one. */
  .markup [class*="shj-lang-"] { margin: 0; padding: 0.875rem 1rem; overflow-x: auto;
       font: 0.8125rem/1.6 ui-monospace, monospace; background: none;
       border: 0; border-radius: 0; height: 100%; box-sizing: border-box }

  .method { margin-top: 1.5rem; border-radius: 12px; overflow: hidden; background: #fff;
       box-shadow: 0 0 0 1px rgb(16 24 40 / 0.06),
                   0 1px 2px rgb(16 24 40 / 0.06),
                   0 12px 28px -10px rgb(16 24 40 / 0.22) }
  .method .head { padding: 0.875rem 1rem }
  .method .body { padding: 0 1rem 1rem; border-top: 1px solid #eaecf0 }
  .method p { margin: 1rem 0 0; color: #475467; font-size: 0.875rem; max-width: 44rem }
  .log { margin: 1rem 0 0; padding: 0.75rem 1rem; overflow-x: auto; background: #fcfcfd;
       border: 1px solid #eaecf0; border-radius: 8px;
       font: 0.75rem/1.5 ui-monospace, monospace; color: #475467 }

  footer { margin-top: 2.5rem; color: #666; font-size: 0.9375rem; max-width: 44rem }
</style>

<svg width="0" height="0" style="position: absolute" aria-hidden="true">
  <symbol id="github" viewBox="0 0 48 48">
    <path d="M24,1.9a21.6,21.6,0,0,0-6.8,42.2c1,.2,1.8-.9,1.8-1.8V39.4c-6,1.3-7.9-2.9-7.9-2.9a6.5,6.5,0,0,0-2.2-3.2C6.9,31.9,9,32,9,32a4.3,4.3,0,0,1,3.3,2c1.7,2.9,5.5,2.6,6.7,2.1a5.4,5.4,0,0,1,.5-2.9C12.7,32,9,28,9,22.6A10.7,10.7,0,0,1,11.9,15a6.2,6.2,0,0,1,.3-6.4,8.9,8.9,0,0,1,6.4,2.9,15.1,15.1,0,0,1,5.4-.8,17.1,17.1,0,0,1,5.4.7,9,9,0,0,1,6.4-2.8,6.5,6.5,0,0,1,.4,6.4A10.7,10.7,0,0,1,39,22.6C39,28,35.3,32,28.5,33.2a5.4,5.4,0,0,1,.5,2.9v6.2a1.8,1.8,0,0,0,1.9,1.8A21.7,21.7,0,0,0,24,1.9Z"></path>
  </symbol>
</svg>

<header>
  <div class="title">
    <h1>Scroller memory repro</h1>
    <a class="repo" href="${REPO}"
       target="_blank" rel="noopener">
      <svg class="gh" aria-hidden="true"><use href="#github"></use></svg>
      <span>jantimon/repro-scroller-memory</span></a>
  </div>
  <p>A long list where every row is its own scroller kills the tab on iOS 18 and
  later. Around 200 rows is enough. The same phone on iOS 17 renders 5000</p>
  <p>The pages below are the same 1000 flex rows of 10 full-width slides, no images
  and no libraries. They differ only in how the row is made scrollable</p>
</header>

  <div class="size">
    <label for="tiles">Rows per page</label>
    <select id="tiles">
      <option>50</option>
      <option>100</option>
      <option>200</option>
      <option>300</option>
      <option>400</option>
      <option>500</option>
      <option selected>1000</option>
      <option>2000</option>
      <option>5000</option>
      <option>10000</option>
    </select>
  </div>

<h2 class="group">Scroll containers and memory</h2>
<p class="group-about">Five pages, the same 1000 rows of ten slides. They differ
only in how the row is made scrollable</p>
<p class="filed">Filed as <a href="${BUG(322930)}" target="_blank" rel="noopener">WebKit bug 322930</a></p>

<ul class="demos">
${DEMOS.filter((demo) => demo.group !== "timeline").map(card).join("\n")}
</ul>

<h2 class="group">Scroll timelines and frame rate</h2>
<p class="group-about">A separate problem, on a page that survives. The
<code>inview</code> page above is its control: same rows, same scroll
containers, no timelines</p>
<p class="filed">Filed as <a href="${BUG(322931)}" target="_blank" rel="noopener">WebKit bug 322931</a>, alongside the earlier <a href="${BUG(322283)}" target="_blank" rel="noopener">322283</a> on shared timeline names</p>

<ul class="demos">
${DEMOS.filter((demo) => demo.group === "timeline").map(card).join("\n")}
</ul>

<section class="results">
  <div class="head">
    <h2>Experiments ran</h2>
    <p class="about">In addition to the example cases above the following cases were also tested:</p>
  </div>
  <table class="verdicts">
    <thead>
      <tr><th>CSS on the row</th><th>What happens</th></tr>
    </thead>
    <tbody>
      <tr><td><code>overflow-x: auto</code></td>
          <td class="bad">☠️ tab crashes at 250 rows</td></tr>
      <tr><td><code>overflow-y: auto</code></td>
          <td class="bad">☠️ tab crashes at 250 rows</td></tr>
      <tr><td><code>overflow: auto</code></td>
          <td class="bad">☠️ tab crashes at 250 rows</td></tr>
      <tr><td><code>overflow-x: scroll</code></td>
          <td class="bad">☠️ tab crashes at 250 rows</td></tr>
      <tr><td><code>display: grid</code> + <code>overflow-x: auto</code></td>
          <td class="bad">☠️ tab crashes at 250 rows</td></tr>
      <tr><td><code>display: block</code> + <code>overflow-x: auto</code></td>
          <td class="bad">☠️ tab crashes at 250 rows</td></tr>
      <tr><td><code>overflow-x: auto</code>, 100 slides per row</td>
          <td class="bad">☠️ tab crashes at 250 rows</td></tr>
      <tr><td><code>overflow-x: auto</code>, 2 slides per row</td>
          <td class="ok">✅ 5000 rows, no crash</td></tr>
      <tr><td><code>overflow-x: auto</code>, slides narrow enough to fit</td>
          <td class="ok">✅ 5000 rows, no crash</td></tr>
      <tr><td><code>overflow: hidden</code></td>
          <td class="ok">✅ 5000 rows, no crash</td></tr>
    </tbody>
  </table>
</section>

<section class="markup">
  <div class="head">
    <h2>One row</h2>
    <p class="about">What every row on these pages is built from. Only the two marked
    declarations differ between the demos</p>
  </div>
  <div class="panes">
    <div class="pane">
      <h3>HTML</h3>
      <div class="shj-lang-html">&lt;div class="tile"&gt;
  &lt;div class="scroller"&gt;
    &lt;div class="slide"&gt;&lt;div class="box"&gt;&lt;/div&gt;&lt;/div&gt;
    &lt;!-- ...10 slides --&gt;
  &lt;/div&gt;
&lt;/div&gt;</div>
    </div>
    <div class="pane">
      <h3>CSS</h3>
      <div class="shj-lang-css">.tile {
  padding: 8px 16px 24px;

  content-visibility: auto;          /* content-visibility only */
  contain-intrinsic-size: auto 400px;
}

.scroller {
  display: flex;
  gap: 16px;
  width: round(down, 100%, 1px);
  aspect-ratio: 1 / 1;
  overflow: hidden;

  overflow-x: auto;                  /* full + content-visibility */
}

.slide {
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.box {
  width: 200px;
  height: 200px;
}</div>
    </div>
  </div>
</section>

<script type="module">
  import { highlightAll } from "https://unpkg.com/@speed-highlight/core@2.1.0/dist/index.js";
  highlightAll();
</script>

<script>
  const tiles = document.getElementById("tiles");
  const links = [...document.querySelectorAll(".run")];
  const base = links.map((link) => link.getAttribute("href"));

  const apply = () => {
    links.forEach((link, index) => {
      const url = new URL(base[index], location.href);
      url.searchParams.set("tiles", tiles.value);
      link.setAttribute("href", url.pathname.split("/").pop() + url.search);
    });
  };

  tiles.addEventListener("change", apply);
  apply();
</script>

<section class="method">
  <div class="head">
    <h2>Measured on BrowserStack</h2>
  </div>
  <div class="body">
  <p>The experiments ran on a real BrowserStack test device. Each experiment ran
  3 times to verify the results:</p>
  <pre class="log">memorystatus: com.apple.WebKit.WebContent exceeded mem limit: ActiveSoft 1536 MB (non-fatal)
memorystatus: killing_highwater_process [com.apple.WebKit.WebContent] (highwater 100 17s) 8579568KB</pre>
  <p>Devices: iPhone SE 2022, 12 Pro, 13, 14, 15, 15 Pro Max, 17 Pro. OS
  versions: iOS 15, 16, 17, 18, 26, 27 Beta</p>
  </div>
</section>

<footer>
  <p>Found while tracing WKWebView content-process kills on a long list where every row
  carried its own horizontally scrollable gallery. Decoded images accounted for under
  10% of the footprint; the scroll containers accounted for most of the rest</p>
</footer>
`;


/**
 * Reads back what the last run recorded. Deliberately tiny: it has to load in a
 * web view that may have just been killed.
 */
const reporter = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>report</title>
<body style="font: 14px/1.5 ui-monospace, monospace; padding: 1rem">
<pre id="result">no run recorded</pre>
<script>
  try {
    const raw = localStorage.getItem("run");
    if (raw) {
      document.getElementById("result").textContent = raw;
      document.title = "report " + JSON.parse(raw).phase;
    }
  } catch (error) {
    document.getElementById("result").textContent = "unreadable: " + error;
  }
<\/script>
`;

for (const demo of DEMOS) {
  /* A page can appear as more than one card — inview is shown again beside the
     timeline demo — but only the entry that owns it writes the file. */
  if (demo.cardOnly) continue;
  writeFileSync(new URL(demo.file, import.meta.url), demoPage(demo));
}
for (const scenario of TESTS) {
  writeFileSync(new URL(scenario.file, import.meta.url), testPage(scenario));
}
writeFileSync(new URL("report.html", import.meta.url), reporter);
writeFileSync(new URL("index.html", import.meta.url), index);
console.log(`generated ${DEMOS.length} demos, ${TESTS.length} tests + index`);
