'use strict';
/** Controlled A/B of the production Zarkhael arena on base and PR HEAD. */
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const baseUrl = process.env.VISUAL_BASELINE_URL;
const headUrl = process.env.VISUAL_BASE_URL;
const out = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results/zarkhael-lighting');
fs.mkdirSync(out, { recursive: true });
assert.ok(baseUrl && headUrl, 'VISUAL_BASELINE_URL and VISUAL_BASE_URL are required');

function regionStats(file, box) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { x, y, w, h } = box;
  let sum = 0, bright = 0, clipped = 0, count = 0;
  for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
    const i = (py * png.width + px) * 4;
    const luma = .2126 * png.data[i] + .7152 * png.data[i + 1] + .0722 * png.data[i + 2];
    sum += luma; if (luma > 32) bright++; if (luma > 245) clipped++; count++;
  }
  return { mean: +(sum / count).toFixed(3), above32: +(bright / count).toFixed(4), clipped: +(clipped / count).toFixed(4) };
}

async function capture(browser, label, url) {
  const dir = path.join(out, label);
  const videoDir = path.join(dir, 'video');
  fs.mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 852, height: 480 }, deviceScaleFactor: 1, hasTouch: true,
    recordVideo: { dir: videoDir, size: { width: 852, height: 480 } }
  });
  const page = await context.newPage();
  const errors = [], failedResponses = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && /shader|WebGL|INVALID|compile/i.test(m.text())) errors.push(m.text());
  });
  page.on('response', r => {
    if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) failedResponses.push({ status: r.status(), url: r.url() });
  });
  const screenshot = path.join(dir, 'combat-arena.png');
  const video = page.video();
  try {
    await page.goto(url + '/mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1', {
      waitUntil: 'domcontentloaded', timeout: 60000
    });
    await page.waitForFunction(() => window.SevenSinsDebug3D, null, { timeout: 180000 });
    await page.waitForFunction(() => {
      const d = window.SevenSinsDebug3D;
      const s = d.dimState();
      if (s.vs) d.vsGo();
      const next = d.dimState();
      return next.battle?.active && !next.vs && next.voidMode && d.dimensionVisualState()?.visible;
    }, null, { timeout: 180000, polling: 250 });
    await page.waitForFunction(() => !document.querySelector('#portal-veil')?.classList.contains('on'), null, { timeout: 30000 });
    await page.evaluate(() => {
      const d = window.SevenSinsDebug3D;
      d.god(); d.fly(null); d.view(.4, .12, 7); d.speed(1);
    });
    await page.waitForTimeout(2500);
    const snapshot = await page.evaluate(() => ({
      state: SevenSinsDebug3D.state(),
      visual: SevenSinsDebug3D.dimensionVisualState(),
      camera: SevenSinsDebug3D.cam(),
      renderer: SevenSinsDebug3D.rinfo()
    }));
    await page.screenshot({ path: screenshot, timeout: 60000 });
    // Keep a short real-gameplay recording after the controlled still frame.
    await page.waitForTimeout(4500);
    assert.equal(snapshot.visual?.visible, true, label + ': arena must be visible');
    assert.deepEqual(errors, [], label + ': browser/WebGL errors');
    assert.deepEqual(failedResponses, [], label + ': failed network responses');
    return { label, screenshot, snapshot, errors, failedResponses, video, context, videoPath: path.join(dir, 'combat.webm') };
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']
  });
  const report = { renderer: 'Chromium / SwiftShader — not Android FPS', baseline: null, head: null, metrics: {}, ok: false };
  try {
    report.baseline = await capture(browser, 'baseline', baseUrl);
    report.head = await capture(browser, 'head', headUrl);
    const boxes = {
      combatCenter: { x: 300, y: 140, w: 300, h: 230 },
      darkHorizon: { x: 350, y: 24, w: 150, h: 72 },
      floor: { x: 300, y: 365, w: 220, h: 80 }
    };
    for (const [name, box] of Object.entries(boxes)) {
      report.metrics[name] = {
        baseline: regionStats(report.baseline.screenshot, box),
        head: regionStats(report.head.screenshot, box)
      };
    }
    report.metrics.combatCenter.deltaMean = +(report.metrics.combatCenter.head.mean - report.metrics.combatCenter.baseline.mean).toFixed(3);
    report.metrics.darkHorizon.deltaMean = +(report.metrics.darkHorizon.head.mean - report.metrics.darkHorizon.baseline.mean).toFixed(3);
    assert.ok(report.metrics.combatCenter.deltaMean > .25,
      'combat-center luminance did not measurably increase: ' + report.metrics.combatCenter.deltaMean);
    assert.ok(report.metrics.darkHorizon.deltaMean < 4,
      'distant dark horizon lifted too much: ' + report.metrics.darkHorizon.deltaMean);
    assert.ok(report.metrics.combatCenter.head.clipped < .02, 'combat-center highlights clipped');
    report.ok = true;
  } finally {
    for (const item of [report.baseline, report.head]) {
      if (!item) continue;
      await item.context.close().catch(() => {});
      if (item.video) await item.video.saveAs(item.videoPath).catch(() => {});
      item.video = undefined; item.context = undefined;
    }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
