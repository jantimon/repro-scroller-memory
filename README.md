# Scroller memory repro

Pages rendering 1000 flex rows of 10 full-width slides, each holding a 200×200 box.
No images, no libraries, ~21,000 elements. They differ only in how the row is made
scrollable.

| page | CSS on the row | iPhone |
| --- | --- | --- |
| `noscroller.html` | `overflow: hidden` | renders, stays flat |
| `content-visibility.html` | `overflow-x: auto` + `content-visibility: auto` | renders, stays flat |
| `inview.html` | `overflow-x: auto` only while near the viewport | renders, stays flat |
| `full.html` | `overflow-x: auto` | **killed** |

The scroll container alone is enough. Snapping, flex, the slide wrapper, `contain` in
every form, `will-change`, `translateZ` and every other `overflow` flavour were each
tested and changed nothing. The only thing that helps is having fewer rows that are
scroll containers at any moment.

Two further variants, not linked from the index:

| page | |
| --- | --- |
| `test_inview-scrollend.html` | as `inview`, but the classes are applied on `scrollend` so nothing mutates mid-gesture |
| `test_inview-timeline.html` | as `inview`, with a scroll timeline reading each row and one timeline name per row |

## Running them

`?tiles=` and `?slides=` size the page. `?scroll-down` walks it to the bottom and
records the frame timing on the way.

Every page writes its progress to `document.title` and to `localStorage` — `start`
before building, `built` once the rows are in the document, `scrolled` on reaching the
bottom. Storage outlives a killed web view, so `report.html` reads back what the last
run reached even when the page itself did not survive.

Each page is standalone, with inline CSS and inline JS, so a single file is the whole
reproduction. `build.js` generates them from `variants.js`; run `node build.js` after
editing either.

## Measured

iPhone, iOS 26, mobile Safari. Kernel log read with `idevicesyslog`:

```
memorystatus: com.apple.WebKit.WebContent [21005] exceeded mem limit: ActiveSoft 1536 MB (non-fatal)
memorystatus: killing_highwater_process pid 21005 [com.apple.WebKit.WebContent] (highwater 100 17s) 8579568KB
```

`full` reaches 8.2 GB in 17 seconds and is killed at WebContent's 1536 MB limit.
`noscroller` renders the same boxes and stays flat.

The iOS Simulator reaches ~0.96 GB on the same page and survives — roughly 8.5x cheaper
than the device for identical markup. This does not reproduce there.

Found while tracing WKWebView content-process kills on a long list where every row
carried its own horizontally scrollable gallery.
