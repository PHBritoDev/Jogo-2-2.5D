const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') failures.push(message.text());
    });
    const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..');
    const prefix = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
    await page.route(prefix + '**', route => route.fulfill({
      path: path.join(threeRoot, new URL(route.request().url()).pathname.split('three@0.160.0/')[1]),
      contentType: 'text/javascript'
    }));
    const origin = process.env.GAME_URL || 'http://127.0.0.1:4263';
    await page.goto(new URL('/tools/qa/volcano-cave.html', origin).href);
    await page.waitForFunction(() => window.volcanoAudit instanceof Promise);
    const cycles = await page.evaluate(() => window.volcanoAudit);
    if (failures.length) throw Error(failures.join('\n'));
    console.log(JSON.stringify(cycles));
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
