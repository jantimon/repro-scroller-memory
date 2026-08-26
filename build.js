/**
 * Generates the demo pages and the index.
 *
 * Each demo is standalone — inline CSS and inline JS, no shared files — so a single
 * page can be handed to someone as the whole reproduction.
 */
import { writeFileSync } from "node:fs";
import { VARIANTS } from "./variants.js";

const REPO = "https://github.com/jantimon/repro-scroller-memory";

const DEMOS = [
  {
    file: "noscroller.html",
    name: "noscroller",
    about:
      "Baseline. The same boxes in the same flex layout, with nothing scrollable. Renders and stays flat.",
    css: `overflow: hidden;`,
    rules: null,
  },
  {
    file: "content-visibility.html",
    name: "content-visibility",
    about:
      "The same scroll containers, with the row opted out of rendering while offscreen. Survives where full does not.",
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
    about:
      "An IntersectionObserver makes a row a scroll container only while it is near the viewport, and takes it back on the way out. Survives, and swipes normally.",
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
    file: "full.html",
    name: "full",
    about:
      "Every row is its own scroll container. This alone is enough to kill the page — snapping is not required.",
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
  document.getElementById("bar").textContent =
    NAME + " \u2014 " + TILES + " rows \u00d7 " + SLIDES + " slides, " + elements + " elements";

  if (params.has("scroll-down")) {
    let previous = -1;
    let stalled = 0;
    /* Frame intervals while the page drives itself down at a fixed step, so the
       number describes the page rather than how fast a finger moved. */
    const frames = [];
    let last = performance.now();

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

    const step = () => {
      const now = performance.now();
      frames.push(now - last);
      last = now;

      const bottom = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= bottom - 2) {
        record("scrolled", { elements, ...timing() });
        return;
      }
      if (window.scrollY === previous) {
        stalled++;
        if (stalled > 180) {
          record("stalled", { elements, at: window.scrollY, ...timing() });
          return;
        }
      } else {
        stalled = 0;
      }
      previous = window.scrollY;
      window.scrollBy(0, window.innerHeight);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
<\/script>
`;

const demoPage = ({ name, rules, tile, style, extra }) => `<!doctype html>
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

<div id="bar"></div>
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

const card = ({ file, name, about, css, danger }) => `  <li>
    <div class="head">
      <h2>${name}</h2>
      <p class="about">${about}</p>
    </div>
    <a class="source" href="${REPO}/blob/main/${file}" target="_blank" rel="noopener"
       aria-label="Source code for ${name} on GitHub"><span>Source code</span>
      <svg class="gh" aria-hidden="true"><use href="#github"></use></svg></a>
    <pre class="css">${css}</pre>
    <a class="run${danger ? " is-danger" : ""}" href="${file}" target="_blank" rel="noopener">Run ${name}</a>
  </li>`;

const index = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Scroller memory repro</title>
<link rel="stylesheet" href="https://unpkg.com/@speed-highlight/core@2.1.0/dist/themes/github-light.css">
<style>
  body {
    font: 16px/1.5 system-ui, sans-serif;
    max-width: 62rem;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #222;
  }

  h1 { font-size: 1.5rem; margin-bottom: 0.25rem }
  header p { margin-top: 0; color: #666; max-width: 44rem }
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
    grid-row: span 3;
    row-gap: 0;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 0 0 1px rgb(16 24 40 / 0.06),
                0 1px 2px rgb(16 24 40 / 0.06),
                0 12px 28px -10px rgb(16 24 40 / 0.22);
  }

  h2 { font-size: 1rem; margin: 0 }
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

  /* The one that kills the tab. */
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

  .results { margin-top: 1.5rem; border-radius: 12px; overflow: hidden; background: #fff;
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

  footer { margin-top: 2.5rem; color: #666; font-size: 0.9375rem; max-width: 44rem }
</style>

<svg width="0" height="0" style="position: absolute" aria-hidden="true">
  <symbol id="github" viewBox="0 0 48 48">
    <path d="M24,1.9a21.6,21.6,0,0,0-6.8,42.2c1,.2,1.8-.9,1.8-1.8V39.4c-6,1.3-7.9-2.9-7.9-2.9a6.5,6.5,0,0,0-2.2-3.2C6.9,31.9,9,32,9,32a4.3,4.3,0,0,1,3.3,2c1.7,2.9,5.5,2.6,6.7,2.1a5.4,5.4,0,0,1,.5-2.9C12.7,32,9,28,9,22.6A10.7,10.7,0,0,1,11.9,15a6.2,6.2,0,0,1,.3-6.4,8.9,8.9,0,0,1,6.4,2.9,15.1,15.1,0,0,1,5.4-.8,17.1,17.1,0,0,1,5.4.7,9,9,0,0,1,6.4-2.8,6.5,6.5,0,0,1,.4,6.4A10.7,10.7,0,0,1,39,22.6C39,28,35.3,32,28.5,33.2a5.4,5.4,0,0,1,.5,2.9v6.2a1.8,1.8,0,0,0,1.9,1.8A21.7,21.7,0,0,0,24,1.9Z"></path>
  </symbol>
</svg>

<header>
  <h1>Scroller memory repro</h1>
  <p>Three pages rendering 1000 flex rows of 10 full-width slides, each holding a
  200×200 box. No images, no libraries, ~21,000 elements. They differ only in whether
  the row is a scroll container, and whether it is opted out of rendering offscreen.</p>
  <p>On an iPhone (iOS 26), <code>full</code> reaches 8.2 GB in 17 seconds and the
  WebContent process is killed at its 1536 MB limit. <code>noscroller</code> renders the
  same boxes and stays flat, and <code>content-visibility</code> keeps the scroll
  containers but survives. The iOS Simulator shows no difference between any of them.</p>
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

<ul class="demos">
${DEMOS.map(card).join("\n")}
</ul>

<section class="results">
  <div class="head">
    <h2>Where <code>full</code> stops rendering</h2>
    <p class="about">Highest row count that still built the page, walking 50 → 100 → 200
    → 500 → 1000 and stopping at the first count that failed.</p>
  </div>
  <table>
    <thead>
      <tr><th>Device</th><th>iOS</th><th>RAM</th><th>Highest rendered</th></tr>
    </thead>
    <tbody>
      <tr><td>iPhone 17 Pro</td><td>26</td><td>12 GB</td><td>100</td></tr>
      <tr><td>iPhone 15 Pro Max</td><td>26</td><td>8 GB</td><td>100</td></tr>
      <tr><td>iPhone 14</td><td>26</td><td>6 GB</td><td>200</td></tr>
      <tr><td>iPhone 12 Pro</td><td>18</td><td>6 GB</td><td>200</td></tr>
      <tr><td>iPhone 13</td><td>18</td><td>4 GB</td><td>100</td></tr>
      <tr><td>iPhone SE 2022</td><td>15</td><td>4 GB</td><td>1000</td></tr>
    </tbody>
  </table>
  <p class="caveat">Measured on BrowserStack real devices. More RAM did not help, and the
  oldest and weakest device was the only one to render every row — so the variable looks
  like the iOS version rather than the hardware. Failures were reported as socket
  timeouts, which cannot always be told apart from a killed web view, so read these as a
  floor rather than an exact limit.</p>
</section>

<section class="markup">
  <div class="head">
    <h2>One row</h2>
    <p class="about">What every row on these pages is built from. Only the two marked
    declarations differ between the demos.</p>
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
      link.setAttribute("href", base[index] + "?tiles=" + tiles.value);
    });
  };

  tiles.addEventListener("change", apply);
  apply();
</script>

<footer>
  <p>Found while tracing WKWebView content-process kills on a long list where every row
  carried its own horizontally scrollable gallery. Decoded images accounted for under
  10% of the footprint; the scroll containers accounted for most of the rest.</p>
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
  writeFileSync(new URL(demo.file, import.meta.url), demoPage(demo));
}
for (const scenario of TESTS) {
  writeFileSync(new URL(scenario.file, import.meta.url), testPage(scenario));
}
writeFileSync(new URL("report.html", import.meta.url), reporter);
writeFileSync(new URL("index.html", import.meta.url), index);
console.log(`generated ${DEMOS.length} demos, ${TESTS.length} tests + index`);
