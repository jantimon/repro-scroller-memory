# Scroller memory repro

Three pages rendering 1000 flex rows of 10 full-width slides, each holding a 200×200
box. No images, no libraries, ~21,000 elements. They differ only in whether the row is
a scroll container and whether it snaps.

| page | CSS on the row | iPhone |
| --- | --- | --- |
| `noscroller.html` | `overflow: hidden` | renders, stays flat |
| `nosnap.html` | `overflow-x: auto` | killed |
| `full.html` | `overflow-x: auto` + `scroll-snap-type: x mandatory` | killed |

`nosnap` breaking on its own is the point: the scroll container is enough, snapping is
not required.

Size them with `?tiles=` and `?slides=`.

Each page is standalone — inline CSS and inline JS — so one file is the whole
reproduction. `build.js` generates them; run `node build.js` after editing it.

## Measured

iPhone, iOS 26, mobile Safari. Kernel log read with `idevicesyslog`:

```
memorystatus: com.apple.WebKit.WebContent [21005] exceeded mem limit: ActiveSoft 1536 MB (non-fatal)
memorystatus: killing_highwater_process pid 21005 [com.apple.WebKit.WebContent] (highwater 100 17s) 8579568KB
```

`full` reaches 8.2 GB in 17 seconds and is killed. `noscroller` renders the same boxes
and stays flat.

The iOS Simulator reaches ~0.96 GB on the same page and survives — roughly 8.5x cheaper
than the device for identical markup. This does not reproduce there.

Found while tracing WKWebView content-process kills on a long list where every row
carried its own horizontally scrollable gallery.
