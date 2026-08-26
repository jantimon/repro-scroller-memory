# Scroller memory repro

Three pages rendering 1000 flex rows of 10 full-width slides, each holding a 200×200
box. No images, no libraries, ~21,000 elements. They differ only in whether the row is
a scroll container and whether it snaps.

| page | CSS on the row |
| --- | --- |
| `full.html` | `overflow-x: auto` + `scroll-snap-type: x mandatory` |
| `nosnap.html` | `overflow-x: auto` |
| `noscroller.html` | `overflow: hidden` |

Size them with `?tiles=` and `?slides=`.

Each page is standalone — inline CSS and inline JS — so one file is the whole
reproduction. `build.js` generates them; run `node build.js` after editing it.

## Measured

iPhone 13 Pro, iOS 26, mobile Safari. Kernel log read with `idevicesyslog`:

```
memorystatus: com.apple.WebKit.WebContent [21005] exceeded mem limit: ActiveSoft 1536 MB (non-fatal)
memorystatus: killing_highwater_process pid 21005 [com.apple.WebKit.WebContent] (highwater 100 17s) 8579568KB
```

`full` reaches 8.2 GB in 17 seconds and is killed. `noscroller` renders the same boxes
and stays flat.

The same comparison in the iOS Simulator shows no difference, so this does not reproduce
there.

Found while tracing WKWebView content-process kills on a long list where every row
carried its own horizontally scrollable gallery.
