/**
 * Generates the demo pages and the index.
 *
 * Each demo is standalone — inline CSS and inline JS, no shared files — so a single
 * page can be handed to someone as the whole reproduction.
 */
import { writeFileSync } from "node:fs";

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
    file: "nosnap.html",
    name: "nosnap",
    about:
      "Scrollable, nothing snaps. Breaks on its own \u2014 the scroll container is enough, snapping is not required.",
    css: `overflow-x: auto;`,
    rules: `    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: none;
  }

  .scroller::-webkit-scrollbar {
    display: none;`,
  },
  {
    file: "full.html",
    name: "full",
    about:
      "Scrollable and snapping. The shape a list takes when every row carries its own gallery.",
    css: `overflow-x: auto;\nscroll-snap-type: x mandatory;`,
    rules: `    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .scroller::-webkit-scrollbar {
    display: none;
  }

  .slide {
    scroll-snap-align: center;
    scroll-snap-stop: always;`,
  },
];

const demoPage = ({ name, rules }) => `<!doctype html>
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

  .tile { padding: 8px 16px 24px; }

  .scroller {
    display: flex;
    gap: 16px;
    /* Whole pixels: at a fractional width a snapped slide stops a fraction short. */
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
</style>

<div id="bar"></div>
<div id="list"></div>

<script>
  const params = new URLSearchParams(location.search);
  const size = (key, fallback) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const TILES = size("tiles", 1000);
  const SLIDES = size("slides", 10);

  const fragment = document.createDocumentFragment();

  for (let tile = 0; tile < TILES; tile++) {
    const row = document.createElement("div");
    row.className = "tile";

    const scroller = document.createElement("div");
    scroller.className = "scroller";

    for (let slide = 0; slide < SLIDES; slide++) {
      const cell = document.createElement("div");
      cell.className = "slide";
      const box = document.createElement("div");
      box.className = "box";
      cell.appendChild(box);
      scroller.appendChild(cell);
    }

    row.appendChild(scroller);
    fragment.appendChild(row);
  }

  document.getElementById("list").appendChild(fragment);
  document.getElementById("bar").textContent =
    "${name} \\u2014 " + TILES + " rows \\u00d7 " + SLIDES + " slides, " +
    document.getElementsByTagName("*").length + " elements";
</script>
`;


/**
 * Scenarios probing whether a different construction avoids the cost. Prefixed
 * `test_` and deliberately not linked from the index — they are experiments, not
 * part of the reproduction.
 *
 * `mode` picks the markup: "slides" nests a box in a slide, "boxes" puts the
 * boxes straight in the scroller.
 */
const TESTS = [
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
    scroller: `    display: flex;
    gap: 16px;
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;`,
    slide: `    flex: 0 0 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;`,
  },
  {
    file: "test_content-visibility.html",
    name: "content-visibility",
    mode: "slides",
    tile: `    content-visibility: auto;
    contain-intrinsic-size: auto 400px;`,
    scroller: `    display: flex;
    gap: 16px;
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: hidden;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;`,
    slide: `    flex: 0 0 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;`,
  },
  {
    file: "test_contain.html",
    name: "contain",
    mode: "slides",
    scroller: `    display: flex;
    gap: 16px;
    width: round(down, 100%, 1px);
    aspect-ratio: 1 / 1;
    overflow: hidden;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
    contain: strict;`,
    slide: `    flex: 0 0 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;`,
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

const testPage = ({ name, mode, tile, scroller, slide }) => `<!doctype html>
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
${mode === "boxes" ? Array.from({ length: 10 }, (_, index) => `
  .box:nth-child(${index + 1}) { position: absolute; left: ${index * 216}px; top: 0 }`).join("") : ""}
</style>

<div id="bar"></div>
<div id="list"></div>

<script>
  const params = new URLSearchParams(location.search);
  const size = (key, fallback) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const TILES = size("tiles", 1000);
  const SLIDES = size("slides", 10);
  const NESTED = ${mode === "slides"};

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
  document.getElementById("bar").textContent =
    "${name} \u2014 " + TILES + " rows \u00d7 " + SLIDES + " slides, " +
    document.getElementsByTagName("*").length + " elements";
</script>
`;

const card = ({ file, name, about, css }) => `  <li>
    <div class="head">
      <h2>${name}</h2>
      <p class="about">${about}</p>
    </div>
    <a class="source" href="${REPO}/blob/main/${file}" target="_blank" rel="noopener"
       aria-label="Source code for ${name} on GitHub"><span>Source code</span>
      <svg class="gh" aria-hidden="true"><use href="#github"></use></svg></a>
    <pre class="css">${css}</pre>
    <a class="run" href="${file}" target="_blank" rel="noopener">Run ${name}</a>
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
    grid-template-columns: repeat(auto-fill, minmax(min(18rem, 100%), 1fr));
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

  /* Right padding keeps the heading clear of the tab above it. */
  .head { padding: 0.875rem 1rem; padding-right: 9.5rem }

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
    .head { padding-right: 3.75rem }
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
  the row is a scroll container and whether it snaps.</p>
  <p>On an iPhone (iOS 26), <code>full</code> reaches 8.2 GB in 17 seconds and the
  WebContent process is killed at its 1536 MB limit. <code>noscroller</code> renders the
  same boxes and stays flat. The iOS Simulator shows no difference between them.</p>
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
      <div class="shj-lang-css">.scroller {
  display: flex;
  gap: 16px;
  width: round(down, 100%, 1px);
  aspect-ratio: 1 / 1;
  overflow: hidden;

  overflow-x: auto;              /* nosnap + full */
  scroll-snap-type: x mandatory; /* full only */
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

for (const demo of DEMOS) {
  writeFileSync(new URL(demo.file, import.meta.url), demoPage(demo));
}
for (const scenario of TESTS) {
  writeFileSync(new URL(scenario.file, import.meta.url), testPage(scenario));
}
writeFileSync(new URL("index.html", import.meta.url), index);
console.log(`generated ${DEMOS.length} demos, ${TESTS.length} tests + index`);
