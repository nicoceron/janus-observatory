import { chromium } from '@playwright/test';
const b = await chromium.launch();
try {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await p.addInitScript(() => {
    window.draws = 0;
    window.triangles = 0;
    window.renders = 0;
    const proto = WebGL2RenderingContext.prototype;
    for (const n of [
      'drawElements',
      'drawArrays',
      'drawElementsInstanced',
      'drawArraysInstanced',
      'clear',
    ]) {
      const f = proto[n];
      proto[n] = function (...args) {
        if (n === 'clear') window.renders++;
        else {
          window.draws++;
          window.triangles +=
            (n.includes('Instanced') ? args[n === 'drawElementsInstanced' ? 4 : 3] : 1) *
            (args[n.includes('Elements') ? 1 : 2] / 3);
        }
        return f.apply(this, args);
      };
    }
  });
  for (const route of ['atlas', 'story']) {
    await p.goto('http://localhost:3000/' + (route === 'atlas' ? 'atlas' : ''));
    if (route === 'atlas') await p.locator('canvas').scrollIntoViewIfNeeded();
    else {
      await p.locator('[data-stage-status="ready"]').waitFor();
      await p.getByRole('button', { name: 'Index +', exact: true }).click();
      await p.getByRole('button', { name: '04 S3 ↗', exact: true }).click();
    }
    await p.waitForTimeout(10000);
    console.log(
      route,
      await p.evaluate(async () => {
        const start = { draws, triangles, renders };
        await new Promise((r) => setTimeout(r, 3000));
        const frames = renders - start.renders;
        const c = document.querySelector('canvas');
        return {
          fps: frames / 3,
          draws: (draws - start.draws) / frames,
          triangles: (triangles - start.triangles) / frames,
          buffer: [c.width, c.height],
          css: [c.clientWidth, c.clientHeight],
        };
      }),
    );
  }
} finally {
  await b.close();
}
