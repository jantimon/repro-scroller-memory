# Scroller memory repro

These pages reproduce a Safari crash on iOS: a long list where every row is its own
horizontal scroller. 1000 flex rows of 10 full-width slides, no images, no libraries,
~21,000 elements. They differ only in how the row is made scrollable.

| page | CSS on the row | iPhone |
| --- | --- | --- |
| `noscroller.html` | `overflow: hidden` | renders, stays flat |
| `content-visibility.html` | `overflow-x: auto` + `content-visibility: auto` | renders, stays flat |
| `inview.html` | `overflow-x: auto` only while near the viewport | renders, stays flat |
| `inview-timeline.html` | as `inview`, plus a scroll timeline per row | renders, but scrolls at 24 fps |
| `full.html` | `overflow-x: auto` | **killed** |

The scroll container alone is enough. Snapping, flex, the slide wrapper, `contain` in
every form, `will-change`, `translateZ` and every other `overflow` flavour were each
tested and changed nothing. The only thing that helps is having fewer rows that are
scroll containers at any moment.

<img width="315" height="684" alt="safari showing a memory error" src="https://github.com/user-attachments/assets/a6e6b932-4980-4ebd-97d5-3f886dfbd8b0" />

One further variant, not linked from the index:

| page | |
| --- | --- |
| `test_inview-scrollend.html` | as `inview`, but the classes are applied on `scrollend` so nothing mutates mid-gesture |

## Running them

`?tiles=` and `?slides=` size the page. `?scroll-down` walks it to the bottom and
records the frame timing on the way.

Every page writes its progress to `document.title` and to `localStorage`: `start`
before building, `built` once the rows are in the document, `scrolled` on reaching the
bottom. Storage outlives a killed web view, so `report.html` reads back what the last
run reached even when the page itself did not survive.

Each page is standalone, with inline CSS and inline JS, so a single file is the whole
reproduction. `build.js` generates them from `variants.js`; run `node build.js` after
editing either.

## Scrolling

`?scroll-down` drives the page to the bottom at a fixed step per frame and records the
frame intervals, so the numbers describe the page rather than how fast a finger moved.
iPhone 17 Pro, iOS 26, 1000 rows:

| page | fps | median | p90 | frames over 50 ms |
| --- | --- | --- | --- | --- |
| `content-visibility.html` | 59 | 17 ms | 17 ms | 1 |
| `inview.html` | 59 | 17 ms | 17 ms | 1 |
| `test_inview-scrollend.html` | 59 | 17 ms | 17 ms | 1 |
| `inview-timeline.html` | **24** | **41 ms** | **65 ms** | **189** |

Holding the scroll containers back costs nothing in frame time. A scroll timeline
reading those containers costs half the frame rate, and `inview` does not rescue it.
The timeline is the expense, not the container.

https://github.com/user-attachments/assets/5f00b79b-7d54-4cf8-9525-3df6474cd06f

## Measured

iPhone, iOS 26, mobile Safari. Kernel log read with `idevicesyslog`:

```
memorystatus: com.apple.WebKit.WebContent [21005] exceeded mem limit: ActiveSoft 1536 MB (non-fatal)
memorystatus: killing_highwater_process pid 21005 [com.apple.WebKit.WebContent] (highwater 100 17s) 8579568KB
```

`full` reaches 8.2 GB in 17 seconds and is killed at WebContent's 1536 MB limit.
`noscroller` renders the same boxes and stays flat.

The iOS Simulator reaches ~0.96 GB on the same page and survives, roughly 8.5x cheaper
than the device for identical markup. This does not reproduce there.

Found while tracing WKWebView content-process kills on a long list where every row
carried its own horizontally scrollable gallery.
