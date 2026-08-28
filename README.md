# Scroller memory repro

A long list where every row is its own scroller kills the tab on iOS 18 and
later. Around 200 rows is enough. The same phone on iOS 17 renders 5000.

Demo: https://jantimon.github.io/repro-scroller-memory/

Every page is 1000 flex rows of 10 full-width slides, each holding a 200x200
box. No images, no libraries. They differ only in how the row is made scrollable.

| page | CSS on the row | rows before the tab dies |
| --- | --- | --- |
| `noscroller.html` | `overflow: hidden` | 5000+ |
| `content-visibility.html` | `overflow-x: auto` + `content-visibility: auto` | 5000+ |
| `inview.html` | `overflow-x: auto` only while near the viewport | 5000+ |
| `inview-timeline.html` | as `inview`, plus a scroll timeline per row | 5000+, but 11 to 27 fps |
| `full.html` | `overflow-x: auto` | **200** |

## What changes the count

Measured on an iPhone 17 Pro running iOS 26. Each row is the `full` page with
one thing altered.

| changed | rows |
| --- | --- |
| nothing | 200 |
| `overflow-y` instead of `overflow-x` | 200 |
| `overflow: auto`, both axes at once | 200 |
| `overflow-x: scroll` instead of `auto` | 200 |
| `display: grid` instead of flex | 200 |
| `display: block` with inline-block slides | 200 |
| 100 slides per row instead of 10 | 200 |
| 2 slides per row, one viewport of overflow | 500+ |
| slides narrow enough that nothing overflows | 5000+ |

The count follows the number of boxes that have gained scrollable overflow. Not
the axis, not the display type, not the element count: 40,410 elements across
200 scrollers render, while 3,010 elements across 250 scrollers do not. A box
that declares `overflow: auto` and whose content fits costs nothing.

Snapping, flex, the slide wrapper, `contain` in every form, `will-change` and
`translateZ` were each tested and changed nothing.

## Two more ways to spend the count

| | rows |
| --- | --- |
| a page opened in a fresh tab | 200 |
| a page opened after another one in the same tab | 125 |
| 1000 cheap scrollers, built but never scrolled | renders |
| the same page, scrolled to the bottom | 200 |

Memory is not returned when a page is left, and not returned when a row leaves
the viewport.

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

Real iPhones reproduce this. The iOS Simulator renders every row, reaching about
0.96 GB on a page that takes 8.2 GB on a device. Chrome and Firefox on Android
or desktop are unaffected.

## Scroll timelines

`inview-timeline.html` adds one scroll timeline per row, each with its own name,
to the `inview` page. It survives, but scrolling degrades past about 600 rows.

| rows | fps |
| --- | --- |
| 500 | 59 |
| 750 | 20 to 43 |
| 1000 | 11 to 27 |

The same page without the timeline holds 59 fps at 1000 rows on every device
tested, so the timelines are the whole difference. Building the page also takes
three to four times as long.

On one iPhone 15 the frame rate drops from 17 fps on iOS 26 to 11 fps on iOS 27
Beta, while the version without timelines holds 59 fps on both.

CSS scroll-driven animations shipped in Safari 26.0, so there is no earlier
version to compare against.

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

## How this was measured

Real devices on BrowserStack. Each row count is loaded in its own fresh browser
session and repeated three times; a count is only reported once every run
agrees. A kill shows up as the automation socket going quiet, which is also what
the device log records:

```
memorystatus: com.apple.WebKit.WebContent exceeded mem limit: ActiveSoft 1536 MB (non-fatal)
memorystatus: killing_highwater_process [com.apple.WebKit.WebContent] (highwater 100 17s) 8579568KB
```

8.58 GB against a 1536 MB limit, in 17 seconds. Against a 200-row ceiling that is
roughly 7 MB for each scroll container.

Two things skewed earlier numbers and were corrected. Walking row counts inside
one browser session measures the accumulated total rather than the page, because
memory is not released between navigations. Running five sessions at once against
one device model produces sporadic kills well below the real ceiling, so those
runs were repeated one at a time.

Devices: iPhone SE 2022, 12 Pro, 13, 14, 15, 15 Pro Max, 17 Pro. OS versions:
iOS 15, 16, 17, 18, 26, 27 Beta.

Found while tracing WKWebView content-process kills on a long list where every
row carried its own horizontally scrollable gallery. Decoded images accounted for
under 10% of the footprint; the scroll containers accounted for most of the rest.
