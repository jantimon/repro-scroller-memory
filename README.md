# Scroller memory repro

A long list where every row is its own scroller kills the tab on iOS 18 and
later. Around 200 rows is enough. The same phone on iOS 17 renders 5000.

Demo: https://jantimon.github.io/repro-scroller-memory/

⚠️ Crashes only happen on real iPhones, not in the Simulator

## Scroll containers and memory

Every page is 1000 flex rows of 10 full-width slides, each holding a 200x200
box. No images, no libraries. They differ only in how the row is made scrollable.

| page | what it is | result |
| --- | --- | --- |
| `noscroller.html` | Baseline (not scroll containers) | ✅ no crash, tested to 5000 rows |
| `content-visibility.html` | Baseline with `overflow-x: auto` and css `content-visibility` | ✅ no crash, tested to 5000 rows |
| `inview.html` | An IntersectionObserver turns a row a scroll container with `overflow-x: auto` only as long it is in view | ✅ no crash, tested to 5000 rows |
| `full.html` | Same as baseline but `overflow-x: auto` | ☠️ crashes at 200 rows |

`full.html` on iOS 15, 16 and 17 does not crash either, tested to 5000 rows.

## Experiments ran

In addition to the example cases above the following cases were also tested:

| CSS on the row | what happens |
| --- | --- |
| `overflow-x: auto` | ☠️ tab crashes at 250 rows |
| `overflow-y: auto` | ☠️ tab crashes at 250 rows |
| `overflow: auto` | ☠️ tab crashes at 250 rows |
| `overflow-x: scroll` | ☠️ tab crashes at 250 rows |
| `display: grid` + `overflow-x: auto` | ☠️ tab crashes at 250 rows |
| `display: block` + `overflow-x: auto` | ☠️ tab crashes at 250 rows |
| `overflow-x: auto`, 100 slides per row | ☠️ tab crashes at 250 rows |
| `overflow-x: auto`, 2 slides per row | ✅ 5000 rows, no crash |
| `overflow-x: auto`, slides narrow enough to fit | ✅ 5000 rows, no crash |
| `overflow: hidden` | ✅ 5000 rows, no crash |

Snapping, the slide wrapper, `contain` in every form, `will-change` and
`translateZ` were each tested and changed nothing.

## By iOS version

iPhone 13 and iPhone 15, hardware held constant.

| iOS | rows |
| --- | --- |
| 15 | 5000+ |
| 16 | 1000+ |
| 17 | 5000+ |
| 18 | 150 |
| 26 | 200 |
| 27 Beta | 200 |

Chrome and Firefox on Android or desktop are unaffected.

## Scroll timelines and frame rate

A separate problem, on a page that survives.

| page | what it is | result |
| --- | --- | --- |
| `inview.html` | The same page, without any scroll timeline | ✅ 59 fps at 500 and 1000 rows |
| `inview-timeline.html` | As inview, with a scroll timeline reading each row and one timeline name per row | ✅ 50 to 59 fps at 500 rows · ☠️ 17 to 27 fps at 1000 rows on iOS 26 · ☠️ 11 fps at 1000 rows on iOS 27 Beta |

Building the page also takes three to four times as long once the timelines are
there. That cost tracks the height of the row rather than the number of
timelines: with 24px rows the same 1000 timelines add 0.2 s instead of 15 s.

CSS scroll-driven animations shipped in Safari 26.0, so there is no earlier
version to compare against.

## One row

What every row on these pages is built from.

```html
<div class="tile">
  <div class="scroller">
    <div class="slide"><div class="box"></div></div>
    <!-- ...10 slides -->
  </div>
</div>
```

```css
.scroller {
  display: flex;
  gap: 16px;
  width: round(down, 100%, 1px);
  aspect-ratio: 1 / 1;
  overflow: hidden;

  overflow-x: auto;                  /* full only */
}

.slide { flex: 0 0 100% }
.box   { width: 200px; height: 200px }
```

## Running them

`?tiles=` and `?slides=` size the page. `?scroll-down` walks it to the bottom and
records the frame timing on the way.

Every page writes its progress to `document.title` and to `localStorage`: `start`
before building, `built` once the rows are in the document, `scrolled` on
reaching the bottom. Storage outlives a killed web view, so `report.html` reads
back what the last run reached even when the page itself did not survive.

Each page is standalone, with inline CSS and inline JS, so a single file is the
whole reproduction. `build.js` generates them from `variants.js`; run
`node build.js` after editing either.

## Measured on BrowserStack

The experiments ran on a real BrowserStack test device. Each experiment ran 3
times to verify the results:

```
memorystatus: com.apple.WebKit.WebContent exceeded mem limit: ActiveSoft 1536 MB (non-fatal)
memorystatus: killing_highwater_process [com.apple.WebKit.WebContent] (highwater 100 17s) 8579568KB
```

Devices: iPhone SE 2022, 12 Pro, 13, 14, 15, 15 Pro Max, 17 Pro. OS versions:
iOS 15, 16, 17, 18, 26, 27 Beta.

Found while tracing WKWebView content-process kills on a long list where every
row carried its own horizontally scrollable gallery. Decoded images accounted for
under 10% of the footprint; the scroll containers accounted for most of the rest.
