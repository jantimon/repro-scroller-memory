# Preview image

`og.html` is the source of `../og.png`, the image link previews use.

To regenerate after editing it:

```
node -e "
const {chromium} = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  await p.goto('file://' + process.cwd() + '/.og/og.html');
  await p.screenshot({ path: 'og.png' });
  await b.close();
})();"
```
