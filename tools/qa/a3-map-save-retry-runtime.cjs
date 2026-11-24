'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const base = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results', 'a3-map-save-retry');
const mapKey = 'seven-sins-3d-map-v4';
const eventsKey = '__a3_map_save_events';
const failKey = '__a3_map_save_fail_once';
const viewport = { width: 393, height: 852 };
const report = {
  schema: 1,
  agent: 'A3',
  scenario: 'runtime-real / map save quota retry + reload',
  renderer: 'Chromium headless + SwiftShader (CPU); não representa FPS Android',
  requestedSha: process.env.PR_HEAD_SHA || process.env.GITHUB_SHA || null,
  workflowSha: process.env.GITHUB_SHA || null,
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || null,
  testedSha: null,
  viewport,
  firstPage: null,
  afterReload: null,
  pageErrors: [],
  consoleErrors: [],
  requestFailures: [],
  status: 'PENDING',
  fatal: null,
  limitations: ['Teste real do runtime e reload em Chromium; não substitui aparelho Android físico.']
};

let browser;
let context;
let page;
let fatal = null;

async function waitForWorld() {
  await page.waitForFunction(() => {
    const loading = document.getElementById('loading');
    return !!window.SevenSinsDebug3D && !!document.querySelector('canvas#scene') &&
      (!loading || loading.classList.contains('hidden'));
  }, null, { timeout: 240000 });
}

async function captureMap(label) {
  const toggle = page.locator('#map-toggle-3d');
  await toggle.waitFor({ state: 'visible' });
  await toggle.tap();
  const panel = page.locator('#world-map');
  await panel.waitFor({ state: 'visible' });
  const canvas = page.locator('#world-map-canvas');
  await canvas.waitFor({ state: 'visible' });
  const dimensions = await canvas.evaluate(element => ({ width: element.width, height: element.height }));
  await page.screenshot({ path: path.join(out, `map-${label}.png`), fullPage: true });
  await page.locator('#world-map-close').tap();
  await panel.waitFor({ state: 'hidden' });
  return dimensions;
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  report.testedSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(report.testedSha, report.requestedSha, 'o relatório precisa corresponder ao SHA solicitado');

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.pageErrors.push(String(error.message || error).slice(0, 500)));
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push(message.text().slice(0, 500));
  });
  page.on('requestfailed', request => report.requestFailures.push({
    url: request.url(),
    error: (request.failure() || {}).errorText || 'request failed'
  }));

  await page.addInitScript(({ mapKey, eventsKey, failKey }) => {
    const originalSetItem = Storage.prototype.setItem;
    if (!localStorage.getItem(mapKey)) {
      originalSetItem.call(localStorage, mapKey, JSON.stringify({
        cells: '',
        pois: ['vila'],
        waystones: ['abrigo-vila']
      }));
    }
    originalSetItem.call(localStorage, 'seven-sins-3d-prologo-ceu', '1');
    originalSetItem.call(localStorage, 'seven-sins-3d-graphics', 'low');
    originalSetItem.call(localStorage, 'sevenSins3DCampaignV6', JSON.stringify({
      version: 6,
      act1Rev: 2,
      questStep: 1,
      awakeningSeen: true,
      playerName: 'A3 QA',
      actCardSeen: true
    }));

    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage && key === mapKey) {
        const events = JSON.parse(sessionStorage.getItem(eventsKey) || '[]');
        if (sessionStorage.getItem(failKey) !== '1') {
          originalSetItem.call(sessionStorage, failKey, '1');
          events.push({ attempt: events.length + 1, outcome: 'quota', key });
          originalSetItem.call(sessionStorage, eventsKey, JSON.stringify(events));
          throw new DOMException('A3 injected quota failure', 'QuotaExceededError');
        }
        const snapshot = JSON.parse(value);
        const result = originalSetItem.call(this, key, value);
        events.push({
          attempt: events.length + 1,
          outcome: 'stored',
          key,
          pois: snapshot.pois,
          waystones: snapshot.waystones,
          cellsLength: snapshot.cells ? snapshot.cells.length : 0
        });
        originalSetItem.call(sessionStorage, eventsKey, JSON.stringify(events));
        return result;
      }
      return originalSetItem.call(this, key, value);
    };
  }, { mapKey, eventsKey, failKey });

  await page.goto(base + '/mundo-3d-prototype.html?debug3d=1&a3MapSaveRetryQA=1', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await waitForWorld();
  await page.waitForFunction(({ eventsKey }) => {
    const events = JSON.parse(sessionStorage.getItem(eventsKey) || '[]');
    return events.some(event => event.outcome === 'quota') &&
      events.some(event => event.outcome === 'stored');
  }, { eventsKey }, { timeout: 45000 });

  report.firstPage = await page.evaluate(({ mapKey, eventsKey }) => ({
    events: JSON.parse(sessionStorage.getItem(eventsKey) || '[]'),
    snapshot: JSON.parse(localStorage.getItem(mapKey) || 'null')
  }), { mapKey, eventsKey });
  assert.equal(report.firstPage.events[0]?.outcome, 'quota', 'a primeira escrita deve falhar por quota');
  assert.ok(report.firstPage.events.some(event => event.outcome === 'stored'), 'a tentativa periódica seguinte deve gravar');
  assert.ok(report.firstPage.snapshot?.pois?.includes('vila'), 'o POI precisa permanecer no snapshot');
  assert.ok(report.firstPage.snapshot?.waystones?.includes('abrigo-vila'), 'o abrigo precisa permanecer no snapshot');
  assert.ok(report.firstPage.snapshot?.cells?.length > 0, 'a névoa revelada precisa ser persistida');
  report.firstPage.mapCanvas = await captureMap('before-reload');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForWorld();
  report.afterReload = await page.evaluate(({ mapKey, eventsKey }) => ({
    events: JSON.parse(sessionStorage.getItem(eventsKey) || '[]'),
    snapshot: JSON.parse(localStorage.getItem(mapKey) || 'null')
  }), { mapKey, eventsKey });
  assert.ok(report.afterReload.snapshot?.pois?.includes('vila'), 'o POI deve continuar após recarregar o mundo');
  assert.ok(report.afterReload.snapshot?.waystones?.includes('abrigo-vila'), 'o abrigo deve continuar após recarregar o mundo');
  assert.ok(report.afterReload.snapshot?.cells?.length > 0, 'a névoa deve continuar após recarregar o mundo');
  report.afterReload.mapCanvas = await captureMap('after-reload');
  assert.deepEqual(report.pageErrors, [], 'o runtime não pode lançar exceções');
  report.visualEvidence = ['map-before-reload.png', 'map-after-reload.png'];
  report.status = 'PASS';
}

(async () => {
  try {
    await main();
  } catch (error) {
    fatal = String(error && error.stack || error);
    report.status = 'FAIL';
    report.fatal = String(error && error.message || error);
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    report.finishedAt = new Date().toISOString();
    report.fatal = report.fatal || fatal;
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('A3 map save runtime: ' + report.status + ' · events=' +
      (report.firstPage?.events?.length || 0) + ' · artifact=' + out);
  }
  if (fatal) process.exitCode = 1;
})();
